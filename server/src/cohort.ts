// The Cohort — one Durable Object per cohort neighborhood, holding TRUTH.
//
// Shard topology decision (roadmap.md § Open build decisions, resolved
// for A0): a single DO per cohort owns the galaxy, the shared clock, and
// the light-delay computation, with per-civ state hanging off it. v1
// cohorts are small; revisit at scale.
//
// Everything player-facing must read through the knowledge layer
// (knowledge.ts): this object never hands out another civilization's
// present. In A0 it exposes DEV endpoints only (no wire messages yet —
// those land per-slice from A1 on), gated to local development hosts so
// every commit stays shippable to production.
//
// THE DERIVED-ROSTER RULE (A4, a4-synthesis.md R1), beside the presence rule
// because it is the same kind of claim about what may be written down:
//
//   A COLONY IS NEVER PERSISTED. `galaxy:civs` holds the seeded civilizations
//   and the players who inherited, and nothing else, ever. A founded child is
//   a pure function of (the stored galaxy, the voyage record, the year) —
//   voyages.ts's `galaxyWithLandfalls` is its only producer, `requireGalaxy()`
//   is the only way anything in this object reaches it, and
//   `saveGalaxyCivs()` throws if a `civ-v-` id ever reaches storage. Wipe the
//   wake queue, restart the object, re-derive from disk: every colony is still
//   there, on the same star, with the same history, because nothing about it
//   was ever a stored fact.
//
//   A5 EXTENDS THE SAME RULE TO LIGHT. An AI civilization's emission history
//   is grown at read time too (behavior.ts's `galaxyWithBehavior`, called from
//   `derivedFold` right after the landfall fold), so `galaxy:civs` holds the
//   light every seed was GENERATED with and never the light the sky is
//   currently showing. There are two derived-only flags on `PlacedCiv` that
//   must never reach disk — `civ-v-` ids and `behaviorGrown` — and
//   `saveGalaxyCivs()` throws on both. `answersNothing` and `walkedDials` need
//   no assertion of their own: only a colony carries them, and a colony can
//   never get that far.
//
// Its greppable form:
//
//   grep -rn "storedGalaxy\|requireStoredGalaxy" server/src/cohort.ts
//
// must show the field, its accessor, and EXACTLY FOUR write sites — the civs
// splice in `onBecome`, the broadcast residue in `onCommitContact`, the
// departure light in `onLaunchVoyage`, and the reset in `devForget` — plus the
// seed paths that write a freshly generated galaxy. Every other reference to
// the roster in this file is `requireGalaxy()`.
//
// THE STANDING-ORDER INVARIANT (A4, a4-ledger-note.md §3.5), here beside the
// presence rule because it is the presence rule's one deliberate exception and
// has to be read against it:
//
//   A standing order may commit only acts the mind is already licensed to
//   commit in absence: a reversible-in-consequence, Ambient-class dispatch
//   that reveals nothing and asks nothing. It may never produce a ContactAct,
//   never call applyBroadcast, never start an Investment-class or higher
//   spend, never answer a first contact, and never write a dial. Arming is the
//   consent, bounded three ways: one fire per arming (re-arming is a fresh,
//   present act); the armable catalog is the bound, not a budget; and a fire
//   that cannot be paid for never becomes a debt — it fizzles and says so.
//
// Its greppable form is the mission record's one writer:
//
//   grep -rn "saveMissionState" server/src
//
// must return EXACTLY THREE sites — the definition, `onLaunchMission` (a live
// socket), and `settleStandingOrders`' caller inside `assembleSkyState`. A
// fourth is either a second way to launch a mission or an order doing
// something an order may not do.
//
// HTTP surface, under /parties/cohort/:name . Every route below is gated to
// local development (a local hostname, or HOLOS_DEV_ENDPOINTS=on in
// `.dev.vars` — see devEndpointsOpen) EXCEPT /dev/forget, which ships to
// production too — see onRequest for why:
//   POST /dev/forget   {token}                         erase one run (prod too)
//   POST /dev/seed     {seedKey?, radiusLy?, aiCivs?}  create + persist a galaxy
//   GET  /dev/state                                    truth overview (dev eyes only)
//   GET  /dev/observe?observer=ID&target=ID            the light-delayed view
//   GET  /dev/sky?observer=ID                          all views for an observer
//   POST /dev/event    {inYears, note}                 schedule an alarm-driven event
//   GET  /dev/events                                   pending + fired events
//   POST /dev/skip     {years}                         skip the clock forward (testing)
//   GET  /dev/push?token=…                             one seat's push record
//   POST /dev/watch    {token}                         evaluate the watch, send NOTHING
//   GET  /dev/vapid?aud=…                              the Authorization we would send

import { Server, type Connection, type WSMessage } from "partyserver";
import {
  gameYearAt,
  newClock,
  realMsAtGameYear,
  REAL_MS_PER_GAME_YEAR,
  type ClockState,
} from "./clock";
import {
  civAtStar,
  civById,
  civDistanceLy,
  DEFAULT_GALAXY_CONFIG,
  distanceLy,
  generateGalaxy,
  pickPlayerHome,
  reservedStarIds,
  starById,
  type Galaxy,
  type GalaxyConfig,
  type PlacedCiv,
  type Star,
} from "./galaxy";
import { emissionAt, lightConeFor, observeCiv, observeSky, visibleSky } from "./knowledge";
import {
  actsFrom,
  appendAct,
  applyBroadcast,
  applyEpisode,
  broadcastInFlight,
  buildContactWire,
  hasHailed,
  resistanceFor,
  MAX_ACTS_PER_CIV,
  MAX_SIGNALS_PER_THREAD,
  MIN_DELIBERATION_YEARS,
  SIGNAL_COOLDOWN_YEARS,
  type CeremonyKind,
  type ContactAct,
} from "./contact";
// A2.5. Every symbol here is READ-SIDE: `buildThreads` feeds the sky and
// `deriveAiSignals` feeds the wake queue, and neither appears inside a
// handler that mutates `this.storedGalaxy` (traffic.ts's derivation rule).
import { buildThreads, deriveAiSignals, threadRefRowsFor } from "./traffic";
// A2.6: the composed-signal grammar. `materializeParts` is the ONE place a
// selector becomes a part, and its only caller is `onSendSignal`.
import {
  deriveAccord,
  materializeParts,
  parsePartRefs,
  parseTone,
  MAX_PARTS_PER_SIGNAL,
} from "./signalparts";
// A2.6, durable identity. accounts.ts owns the table, the key alphabet and the
// rate limiters; this module owns the flows. Every function below is either an
// index probe or a mint, and none of them is ever handed to a log.
import {
  AttemptLimiter,
  createAccount,
  ensureAccountSchema,
  findAccountByKey,
  findAccountByRunToken,
  normalizeAccountKey,
} from "./accounts";
import { createRng } from "./rng";
import { generateCivSeed, type CivSeed } from "./civseed";
import { archetypeById } from "./minds";
import { arrivalLine, ageChipLine, computeLine, clockLine, epochLine, silenceLine } from "./voice";
import {
  buildStudySnapshot,
  hypothesisMenus,
  isClosed,
  leadHypothesisOf,
  migrateStudyState,
  newStudyState,
  tripwireHolds,
  TRIPWIRE_KINDS,
  type OvertakingTrigger,
  type TripwireKind,
  type StoredStudy,
  type StoredTripwire,
  type StudyMove,
  type StudyState,
  type StoredStudyState,
} from "./studies";
import {
  attentionCapAt,
  confidenceLiftAt,
  freeComputeAt,
  hasLanded,
  landedProbeCruiseFractionAt,
  landedYear,
  commitCompute,
  migrateProjectState,
  newProjectState,
  projectById,
  ratePerYearAt,
  PROJECTS,
  type ProjectState,
  type StartedProject,
  type StoredProjectState,
} from "./projects";
import {
  expectedArrivals,
  missionArrivalYear,
  missionFirstWordYear,
  missionKindById,
  missionProseName,
  deriveStudyMoves,
  migrateMissionState,
  newMissionState,
  resolveMissionPlan,
  toMissionSnapshot,
  validateCharter,
  CHARTER_CLAUSES,
  MAX_MISSIONS_PER_TOKEN,
  MIN_CHARTER_CLAUSES,
  MAX_CHARTER_CLAUSES,
  MISSION_KINDS,
  PROBE_C_FRACTION,
  SENTINEL_CADENCE_YEARS,
  type MissionState,
  type StoredMission,
} from "./missions";
import { effectiveCostFor, questionById, type BoughtQuestion } from "./questions";
import { buildTendList } from "./tend";
// A5, WEB PUSH. Every symbol here is TRANSPORT: base64url, a VAPID signature,
// one bodyless POST, and the record of which devices asked to be told. push.ts
// imports nothing from this file or any other module of the game and therefore
// cannot see a fact, which is the whole no-leak argument for the payload-free
// design (a5-push-note.md §2).
import {
  deliverWatch,
  keyIdFor,
  newPushState,
  subIdFor,
  validatePushEndpoint,
  vapidAuthorization,
  vapidPublicKey,
  warnPushUnconfigured,
  withNotified,
  withoutSub,
  withSub,
  type PushEnv,
  type PushState,
} from "./push";
// A5. The behavior fold is READ-SIDE and has exactly one call site, inside
// `derivedFold` below (behavior.ts's greppable form). It rewrites emission
// histories and nothing else, and `saveGalaxyCivs` refuses to persist a civ
// that carries the flag it sets.
import { galaxyWithBehavior, BEHAVIOR_ERA_YEARS } from "./behavior";
// A4. `galaxyWithLandfalls` does not appear here by name and must not: this
// object reaches the derived roster through `foldLandfalls`, which produces
// the same civs AND the per-voyage outcomes the snapshot needs, in one pass.
// A4 S2, the aftermath. `buildLedger` is the only producer of a LedgerRow and
// it reads truth through `observeCiv` alone; `settleStandingOrders` is the only
// thing in the server that fires an order, and it is called from exactly one
// place (assembleSkyState, after the sources and before the missions) so an
// order can never fire from an alarm.
import {
  buildLedger,
  migrateLedgerState,
  newLedgerState,
  type LedgerState,
  type LedgerVoyageInput,
} from "./lineage";
import {
  orderClassById,
  newOrderState,
  migrateOrderState,
  settleStandingOrders,
  toWireOrders,
  warmMovementTarget,
  ORDER_CLASSES,
  type OrderCandidate,
  type OrderState,
  type StoredOrder,
} from "./orders";
import {
  buildSurvey,
  charterLineFor,
  charterPosture,
  childCivIdFor,
  departureLightFor,
  foldLandfalls,
  migrateVoyageState,
  newVoyageState,
  toVoyageSnapshot,
  validateCharterDials,
  validateVoyageCharter,
  voyageArrivalLightYear,
  voyageFirstWordYear,
  voyageKindById,
  voyageLandfallYear,
  CHARTER_DIAL_STEPS,
  CHILD_ID_PREFIX,
  MAX_VOYAGES_PER_TOKEN,
  MAX_VOYAGE_CLAUSES,
  MIN_VOYAGE_CLAUSES,
  OCCUPIED_RISK_LINE,
  VOYAGE_CLAUSES,
  VOYAGE_KINDS,
  type LandfallOutcome,
  type StoredVoyage,
  type VoyageCharter,
  type VoyageState,
} from "./voyages";
import {
  buildReportPayload,
  deriveReportEntries,
  mergeReportEntries,
  newReportState,
  type DeriveReportEntriesInput,
  type ReportFamily,
  type ReportState,
  type StoredReportEntry,
} from "./report";
import {
  DECLINE_CAP,
  enumerateProposals,
  serveProposals,
  type ProposalState,
} from "./proposals";
import {
  parseCohortClientMessage,
  toWireSource,
  validateName,
  type StudyGrounding,
  type StudySnapshot,
  type CivCard,
  type ClockWire,
  type CohortServerMessage,
  type DetectedSource,
  type ComputeBudget,
  type MissionCatalog,
  type MissionSnapshot,
  type ProjectSnapshot,
  type ReportEntry,
  type ReportPayload,
  type SelfView,
  isVoiceKey,
  type ContactWire,
  type LedgerWire,
  type SurveyRow,
  type VoiceKey,
  type VoyageCatalog,
  type VoyageSnapshot,
} from "./protocol";
// AV4: the generated voice. Imported ONLY here — the client never imports
// cohort.ts, so not one byte of the SDK reaches a phone. With both flags off
// (the production default) every call below returns its input by identity.
import {
  VoiceGen,
  counselEnabled,
  remarksEnabled,
  type GenDeps,
  type MindSurface,
  type VoiceGenEnv,
} from "./voicegen";
import { DIAL_AXES } from "./dials";
import type { RemarkFamily } from "./voice";

/**
 * A clock-scheduled event, driven by the Durable Object alarm. A0 proved
 * the plumbing with dev pings; A2.2 adds "wake": a bought question's
 * answer or a mission's first word, landing while nobody is necessarily
 * connected. `onAlarm`'s ONLY job for a wake is to resend the sky to every
 * placed connection — the alarm queue is not a source of truth and cannot
 * become one (systems-a.md §7). If the DO sleeps through a wake or the
 * queue is wiped, the only consequence is a connected client not being
 * PUSHED a sky it would compute correctly on its next `requestSky`.
 * Nothing fires, nothing lands, nothing is recorded here.
 */
interface ScheduledEvent {
  readonly id: string;
  readonly atYear: number;
  /**
   * A5 adds "watch": the wake that runs when NOBODY is in the room, so an
   * armed tripwire can reach a phone. It is still a wake-up and still never
   * truth — `runWatch` derives, decides and sends, and the only key it may
   * write is `push:${token}`. The firing itself is recorded, as it always
   * was, by the sky the player comes back to.
   */
  readonly kind: "dev-ping" | "wake" | "watch";
  readonly note: string;
  readonly token?: string; // wake and watch
  readonly missionId?: string; // wake only, so a sentinel can re-arm
}

interface FiredEvent extends ScheduledEvent {
  readonly firedAtYear: number;
}

/**
 * A5: one tripwire that became true, and the year it became true in.
 *
 * `firedYear` is a CHANGE POINT, never "now": the whole point of the catch-up
 * walk is that a condition holds when it holds, whether or not anybody was
 * looking. `armedYear` is on the key because re-arming is a fresh order, so a
 * genuinely new arming is notifiable again.
 */
interface Firing {
  readonly starId: string;
  readonly kind: TripwireKind;
  readonly armedYear: number;
  readonly firedYear: number;
}

/**
 * Every component of the key is STORED TRUTH, which is what makes the
 * once-only guarantee idempotent rather than merely unlikely to double-fire:
 * re-derivation, a Durable Object restart and a re-armed alarm all produce the
 * same string.
 */
function firingKey(f: Firing): string {
  return `${f.starId}/${f.kind}/${f.armedYear}`;
}

/**
 * A5: the three per-seat records a watch reads, MIGRATED IN MEMORY AND NEVER
 * WRITTEN BACK. The ordinary loaders persist a migration as they go, which is
 * right on a live socket and wrong on the alarm path: `runWatch` may write
 * `push:${token}` and nothing else, so it reads through here instead.
 */
interface WatchInputs {
  readonly studies: Readonly<Record<string, StoredStudy>>;
  readonly missions: readonly StoredMission[];
  readonly projectState: ProjectState;
}

/** Why a watch did or did not push. The dev route reports these verbatim, so
 *  they are the vocabulary the runbook in docs/playtest.md names. */
type WatchReason =
  | "not subscribed"
  | "not placed"
  | "connection live"
  | "pushed this absence"
  | "absent too long"
  | "no firing"
  | "already notified"
  | "send";

interface WatchVerdict {
  readonly reason: WatchReason;
  readonly firings: readonly Firing[];
  /** The year to re-arm at, or null when the watch stops existing for this
   *  absence (the biggest saving in the design: after one push the object
   *  stops waking for this seat until the player comes back). */
  readonly rearmYear: number | null;
  readonly state: PushState | null;
}

/** Bounds the stored queue, dropping the farthest-future first. */
const MAX_PENDING_EVENTS = 256;

/** Slop on year comparisons, so a float-adjacent stamp never decides a
 *  lifecycle question (A2.2b's grounded exit compares arrival against the
 *  year a study was opened). */
const YEAR_EPS = 1e-6;

/** A2.4: a hair past an arrival year, so the wake that resends a sky lands
 *  on the far side of the comparison it exists to reveal. About three real
 *  seconds at the shipped clock ratio. */
const WAKE_SLOP_YEARS = 0.01;

/** A2.5: how far ahead the per-sky horizon pass queues derived arrivals.
 *  Two hundred game years is well past any thread's round trip in a 25 ly
 *  neighborhood, and bounding it is what keeps the pass from filling the
 *  queue with a lantern's hail scheduled for the deep future. */
const WAKE_HORIZON_YEARS = 200;

// ── A5: the watch (a5-push-note.md §14) ────────────────────────────────────

/** How far ahead a watch re-arms when no change point is in sight. Twenty
 *  four real hours at the shipped clock ratio. It covers everything the
 *  change-point enumeration cannot see (a retuned behavior rule, a change
 *  point past a study's own horizon, a bug) and costs one wake per day per
 *  push-enabled ABSENT seat, which is the whole bill for being self-healing. */
const WATCH_BACKSTOP_YEARS = 288;

/** How far back the catch-up walk looks. About fourteen real days: a player
 *  gone longer than this may lose the oldest firings from the scan, and still
 *  gets today's fire-if-it-holds-now behavior on top. Stated rather than
 *  hidden — the watch had already pushed at the time. */
const WATCH_SCAN_YEARS = 4000;

/** Per study, oldest-first, so a later scan finds the same first firing. */
const MAX_CHANGE_POINTS = 24;

/** The watch's own liveness bound, the analogue of the sentinel re-arm rule:
 *  an absent player's watch must not re-arm forever. The next connect
 *  restarts it. */
const WATCH_MAX_REAL_MS = 30 * 24 * 3600e3;

/** Hysteresis on the `seenRealMs` write, so a chatty session does not pay a
 *  put per sky send. */
const SEEN_WRITE_GAP_MS = 60e3;

interface GalaxyMeta {
  readonly seedKey: string;
  readonly config: GalaxyConfig;
}

/**
 * AV4: one description of the runtime object, extended rather than
 * duplicated. `index.ts`'s `Env` extends this in turn, so the Worker's two
 * views of its own bindings cannot drift apart — the generation flags and the
 * key are declared once, in voicegen.ts, where they are read.
 */
export interface CohortEnv extends VoiceGenEnv, PushEnv {
  Cohort: DurableObjectNamespace;
  /** Opens the local-only half of the dev HTTP surface. "on" enables;
   *  anything else, absence included, is off. Belongs in `.dev.vars` and
   *  nowhere else — see devEndpointsOpen. */
  readonly HOLOS_DEV_ENDPOINTS?: string;
}

/**
 * A placed player's per-run record. `localNames` are the owner's private
 * labels for sky sources — echoed only back to this owner, never attached
 * to any DetectedSource and never broadcast.
 *
 * A2.6, DURABLE IDENTITY: `token` IS A SEAT ID. It was minted in A1 as a
 * credential and it is still the credential of an UNCLAIMED run, but once a
 * run is claimed the account key is the credential and this is only the name
 * of the seat — the key under which every piece of that player's state lives
 * (`run:`, `studies:`, `missions:`, `projects:`, `proposals:`, `report:`,
 * `voice:`, `offerYear:`) and the string `onBecome` derives the civ id from.
 * Accounts are indirection ONTO this id and never rebind it; a claimed token
 * presented on its own is refused at `hello` (`token-claimed`). Do not rename
 * these references and do not rotate this value: rotate the account key.
 */
interface RunRecord {
  readonly token: string;
  readonly civId: string;
  readonly starId: string;
  readonly localNames: Record<string, string>;
  /**
   * A2.6: civilizations this player has gone dark to. OPTIONAL, so every
   * record written before this field existed reads as an empty list with no
   * migration (the `ContactAct.inReplyTo` precedent).
   *
   * ONE-SIDED AND SILENT. It filters the muted player's OWN thread list in
   * `buildThreads` and nothing else: the sender's send still commits, their
   * thread still renders on their rack, their beam still lands and still
   * lights the sky. There is no notification, because a notification would
   * tell the sender they had been muted, and the deniability is the point.
   */
  readonly muted?: readonly string[];
}

// A player's observatory state (StoredStudy/StudyState) is stored SEPARATELY
// from RunRecord — RunRecord is rewritten wholesale on every nameSource,
// while studies accrete A2.2 purchases and must not ride along on that
// rewrite. The shape and its migration now live in studies.ts (matching
// projects.ts's precedent); this module only reads/writes the DO key.

/**
 * AV1: which one-time voice lines this player has already been shown.
 * One record per concern, the studies/missions/projects precedent — its
 * own key (`voice:${token}`) rather than a field bolted onto RunRecord, so
 * a `voiceSeen` write never touches (or races) the name-echo state.
 */
interface VoiceState {
  readonly version: 1;
  readonly seen: readonly VoiceKey[];
}

/** Live connection tracking: the socket, its seat, and (once placed) civ. */
interface ConnState {
  readonly conn: Connection;
  /** THE SEAT ID — see RunRecord.token. Whether this connection proved it by
   *  presenting the token itself or by presenting an account key, everything
   *  downstream reads exactly this string, which is why the account layer
   *  needed no handler below `hello` to know it exists. */
  readonly token: string;
  /**
   * A2.6: the account this connection authenticated as, or that it minted by
   * claiming during this session. Null on an anonymous run. Its ONLY uses are
   * `showAccountKey`'s permission test and the hub row's state; nothing about
   * it is derived from, and nothing about it reaches, another player's wire.
   */
  accountId: string | null;
  civId: string | null;
  /** AV2: the lastServedYear the placement-path report was built against.
   *  A requestReport refresh in the same session rebuilds against THIS, not
   *  the stored (already-advanced) marker — so the session's header and
   *  promoted remark survive a reopen instead of vanishing on the first
   *  refresh (the design's "a refresh reuses the same header"). */
  reportBaselineYear: number | null;
  /** A2.5: which thread this CONNECTION has open, so `sky` can carry its
   *  detail. Per-connection UI state with NO DO KEY behind it — two tabs may
   *  read different threads, and a reconnect re-sends `openThread`. Storing
   *  it would make a scroll position into durable truth, which it is not. */
  openThreadStarId: string | null;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

/**
 * CORS for /dev/forget, and only for it.
 *
 * In production the client is same-origin and none of this is consulted.
 * In development it is load-bearing: `npm run dev:client` serves the client
 * from :5173 while the Worker answers on :8787, and the documented phone
 * setup moves both onto a LAN IP — so there is no origin allowlist that
 * would hold, which is why this is `*`. It costs nothing: the token in the
 * body is the credential, and a page that cannot read this browser's
 * localStorage cannot produce one.
 *
 * The gated endpoints get none of this. They are reachable only from a
 * local hostname or behind an operator's flag, and nothing in a browser
 * needs to call them.
 */
const FORGET_CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

/** The request arrived at a hostname only a local wrangler dev serves. */
function isLocalDev(url: URL): boolean {
  return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname);
}

/**
 * Whether the local-only dev endpoints answer at all.
 *
 * The hostname check above used to be the whole gate, and it stopped
 * firing the day the playholos.com routes went live: `wrangler dev`
 * rewrites the request URL to the route it matched, so a request typed at
 * localhost:8787 reaches this Worker as http://playholos.com/… . The gate
 * kept doing its job in production and silently 404'd the entire dev
 * surface on the dev machine it exists for.
 *
 * So the gate takes either signal. The hostname stays because it is still
 * true wherever wrangler is not rewriting (no routes configured, a
 * different config, `--host` overridden) and can never be true in
 * production, where the hostname IS the route. `HOLOS_DEV_ENDPOINTS=on` is
 * the one that fires today.
 *
 * That flag belongs in `.dev.vars` (gitignored) and NOWHERE else. In
 * wrangler.jsonc's `vars` it would ship, and what it unlocks is precisely
 * the truth the knowledge layer exists to withhold — /dev/state and
 * /dev/observe hand out other civilizations' present. Deny by default:
 * absence, "true", "1", and every other value read as off.
 *
 * Config rather than a request header, because a header would be a
 * client's claim about itself. `url.hostname` is Cloudflare's routing
 * decision and an env var is the operator's; neither is the caller's.
 * (/dev/forget sits above this gate — it ships on purpose. See onRequest.)
 */
function devEndpointsOpen(env: CohortEnv, url: URL): boolean {
  return env.HOLOS_DEV_ENDPOINTS === "on" || isLocalDev(url);
}

/**
 * The CURRENT effective probe cruise speed, in flight-years-per-light-year:
 * the reciprocal of the fastest LANDED probe-haste project's
 * cruiseFractionOfC at `atYear`, or the canonical 10 y/ly if none has
 * landed (synthesis.md §4 — probe-haste projects take the MAXIMUM across
 * landed projects, never the sum). A mission launched at `atYear` freezes
 * this value into `StoredMission.flightYearsPerLy`; the sky message also
 * carries the live value so the launch sheet can preview a clock before
 * committing.
 */
function effectiveFlightYearsPerLy(state: ProjectState, atYear: number): number {
  const fraction = landedProbeCruiseFractionAt(state, atYear) ?? PROBE_C_FRACTION;
  return 1 / fraction;
}

function numberField(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function stringField(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
}

/**
 * AV4: report.ts's sixth family — `record`, the mute one — gets no remark and
 * therefore no pool. This is the one place the two family types meet, and it
 * narrows rather than casts.
 */
function asRemarkFamily(family: ReportFamily): RemarkFamily | null {
  return family === "record" ? null : family;
}

/** The stored family of a served entry, by id. Null when the entry is not in
 *  stored state (unreachable — every served entry came from it) or is mute. */
function remarkFamilyOf(state: ReportState, entryId: string): RemarkFamily | null {
  const stored = state.entries.find((e) => e.id === entryId);
  return stored === undefined ? null : asRemarkFamily(stored.family);
}

export class Cohort extends Server<CohortEnv> {
  private clock: ClockState | null = null;
  /**
   * THE STORED ROSTER — what is on disk, and the ONLY thing that may ever go
   * back to disk. It holds the star field, the seeded civilizations, every
   * player who has inherited, and the contact log. It holds NO COLONY: a
   * founded child is derived from the voyage record on every read
   * (`derivedFold` below) and `saveGalaxyCivs` refuses to persist one.
   *
   * Read paths do not touch this field. They call `requireGalaxy()`, which
   * returns the DERIVED roster. `requireStoredGalaxy()` exists for the write
   * sites and for nothing else, and there are exactly four of them: `onBecome`
   * (the civs splice), `onCommitContact` (the broadcast residue),
   * `onLaunchVoyage` (the departure light), and `devForget` (the reset).
   */
  private storedGalaxy: Galaxy | null = null;
  /**
   * A4: the cohort-wide voyage record (`galaxy:voyages`, the `galaxy:acts`
   * precedent). Not per token, because a founded civilization is EVERYONE'S
   * FACT — the roster every observer reads is folded from this one list.
   */
  private voyageState: VoyageState = newVoyageState();
  /**
   * The derived-roster memo. Its key is synthesis R2's: the stored galaxy's
   * identity, the voyage list's identity, the act log's identity, and the
   * COUNT OF VOYAGES THAT HAVE LANDED BY NOW. The last term is what makes a
   * clock-dependent derivation memoizable at all: within a year the fold's
   * output cannot change, and the moment a ship arrives the count moves and
   * the memo is discarded.
   *
   * A5 adds one more term, `era`, for the same kind of reason: grown behavior
   * is generated out to a horizon, and the horizon has to move eventually or a
   * cohort would run past its own last cadence epoch. One era is
   * BEHAVIOR_ERA_YEARS, which is 20 real hours, so the behavior fold re-runs
   * at most once a real work-day per cohort on top of the act, launch and
   * landfall invalidations the roster fold already pays for.
   */
  private derivedMemo: {
    readonly stored: Galaxy;
    readonly voyages: readonly StoredVoyage[];
    readonly acts: readonly ContactAct[];
    readonly landed: number;
    readonly era: number;
    readonly galaxy: Galaxy;
    readonly outcomes: ReadonlyMap<string, LandfallOutcome>;
  } | null = null;
  // In-memory only, rebuilt by each connection's `hello`. This relies on
  // partyserver's default `hibernate: false`: a DO restart closes live
  // sockets, the client reconnects and re-hellos, and the map self-heals.
  // If hibernation is ever enabled, every non-hello handler must instead
  // recover the token from the connection attachment.
  private readonly conns = new Map<string, ConnState>();
  /** AV4: the generation seam, one per DO instance. Holds the record cache,
   *  the in-flight set and the circuit breaker; every guarantee that must
   *  survive a restart lives in storage instead. */
  private readonly gen = new VoiceGen();
  /** A2.6: whether the accounts table has been created in THIS instance.
   *  `sql.exec` is synchronous, so a plain flag is a sound guard — there is no
   *  await between the test and the creation for a second call to slip into. */
  private schemaReady = false;
  /**
   * A2.6: sign-in attempts. Five per connection and then the socket closes;
   * a hundred failures across the whole object in ten rolling minutes, so a
   * guesser cannot buy budget by reconnecting. Only FAILURES are charged.
   */
  private readonly signInLimiter = new AttemptLimiter({
    perConn: 5,
    windowMax: 100,
    windowMs: 10 * 60 * 1000,
  });
  /** A2.6: claims per connection. A seat can be claimed exactly once, so any
   *  connection reaching a fourth mint is a bug or a probe; there is no
   *  object-wide window because a claim is an act on a seat you already hold. */
  private readonly claimLimiter = new AttemptLimiter({ perConn: 3 });

  /**
   * A2.6: create the accounts table if this instance has not yet. Called from
   * `onStart` and defensively at the top of every account path, because
   * `onStart` is not the only way into this object (an alarm can wake it) and
   * a table that is missing when a key is presented would be the one failure
   * with no good answer.
   */
  private ensureSchema(): void {
    if (this.schemaReady) return;
    ensureAccountSchema(this.ctx.storage.sql);
    this.schemaReady = true;
  }

  async onStart(): Promise<void> {
    this.ensureSchema();
    const clock = await this.ctx.storage.get<ClockState>("clock");
    this.clock = clock ?? null;
    const meta = await this.ctx.storage.get<GalaxyMeta>("galaxy:meta");
    const stars = await this.ctx.storage.get<Star[]>("galaxy:stars");
    const civs = await this.ctx.storage.get<PlacedCiv[]>("galaxy:civs");
    // A2.4: the contact log. An absent key IS the migration — no stored
    // shape changed, so a cohort seeded before this stage loads with an
    // empty log and behaves exactly as it did.
    const acts = await this.ctx.storage.get<ContactAct[]>("galaxy:acts");
    this.storedGalaxy =
      meta !== undefined && stars !== undefined && civs !== undefined
        ? { seedKey: meta.seedKey, config: meta.config, stars, civs, acts: acts ?? [] }
        : null;
    // A4: an absent key IS the migration, `galaxy:acts`' own story — a cohort
    // seeded before voyages loads with no voyages and folds to itself.
    this.voyageState = await this.loadVoyageState();
    this.derivedMemo = null;
  }

  // ── Act 3 WebSocket surface (A1) ──────────────────────────────────────
  // The client drives with `hello`; the server never sends unprompted. The
  // ONLY other-civ data on the wire is toWireSource(visibleSky(...)).

  onConnect(): void {
    // Intentionally empty: the client opens by sending `hello`.
  }

  async onMessage(conn: Connection, message: WSMessage): Promise<void> {
    if (typeof message !== "string") return;
    const msg = parseCohortClientMessage(message);
    if (msg === null) return; // ignore malformed, like Room
    switch (msg.type) {
      case "hello":
        await this.onHello(conn, msg.token, msg.account);
        return;
      case "claimAccount":
        await this.onClaimAccount(conn);
        return;
      case "showAccountKey":
        this.onShowAccountKey(conn);
        return;
      case "become":
        await this.onBecome(conn, msg.candidateId, msg.name);
        return;
      case "nameSource":
        await this.onNameSource(conn, msg.starId, msg.name);
        return;
      case "requestSky":
        await this.onRequestSky(conn);
        return;
      case "openStudy":
        await this.onOpenStudy(conn, msg.starId);
        return;
      case "shelveStudy":
        await this.onShelveStudy(conn, msg.starId);
        return;
      case "startProject":
        await this.onStartProject(conn, msg.projectId);
        return;
      case "buyQuestion":
        await this.onBuyQuestion(conn, msg.starId, msg.questionId);
        return;
      case "launchMission":
        await this.onLaunchMission(conn, msg.starId, msg.kind, msg.charter);
        return;
      case "launchVoyage":
        await this.onLaunchVoyage(conn, msg.starId, msg.kind, msg.charter, msg.dials, msg.name);
        return;
      case "callStudy":
        await this.onCallStudy(conn, msg.starId);
        return;
      case "armTripwire":
        await this.onArmTripwire(conn, msg.starId, msg.kind);
        return;
      case "disarmTripwire":
        await this.onDisarmTripwire(conn, msg.starId, msg.kind);
        return;
      case "armOrder":
        await this.onArmOrder(conn, msg.orderClass, msg.charter);
        return;
      case "disarmOrder":
        await this.onDisarmOrder(conn, msg.orderClass);
        return;
      case "voiceSeen":
        await this.onVoiceSeen(conn, msg.key);
        return;
      case "requestReport":
        await this.onRequestReport(conn);
        return;
      case "declineProposal":
        await this.onDeclineProposal(conn, msg.id);
        return;
      case "commitContact":
        await this.onCommitContact(conn, msg.choice, msg.starId, msg.acknowledged);
        return;
      case "sendSignal":
        await this.onSendSignal(conn, msg.starId, msg.tone, msg.parts);
        return;
      case "muteThread":
        await this.onMuteThread(conn, msg.starId, msg.muted);
        return;
      case "openThread":
        await this.onOpenThread(conn, msg.starId);
        return;
      case "pushSubscribe":
        await this.onPushSubscribe(conn, msg.endpoint);
        return;
      case "pushUnsubscribe":
        await this.onPushUnsubscribe(conn, msg.endpoint);
        return;
    }
  }

  onClose(conn: Connection): void {
    this.conns.delete(conn.id);
    // A2.6: a closed socket's per-connection budgets are not worth keeping,
    // and forgetting them is what stops the limiters' maps from growing for
    // the life of the object. The object-wide sign-in window is untouched by
    // this on purpose — see AttemptLimiter.forget.
    this.signInLimiter.forget(conn.id);
    this.claimLimiter.forget(conn.id);
  }

  /**
   * hello: resolve a SEAT, register the connection, and send welcome + first
   * payload.
   *
   * THE PRECEDENCE RULE (A2.6): a non-null `accountIn` means `tokenIn` IS
   * IGNORED WHOLE. It is not a fallback, it is not merged, and it is not even
   * looked at. Signing in on a device that already holds an anonymous run has
   * to be a decidable act with one outcome, and the alternative — preferring
   * whichever credential resolved — would make the outcome depend on storage
   * the player cannot see.
   */
  private async onHello(
    conn: Connection,
    tokenIn: string | null,
    accountIn: string | null,
  ): Promise<void> {
    await this.ensureSeeded();
    if (accountIn !== null) {
      await this.onHelloWithAccount(conn, accountIn);
      return;
    }
    this.ensureSchema();
    // A CLAIMED SEAT WILL NOT ANSWER TO ITS TOKEN. This connection is NOT
    // registered and nothing is minted: the client drops its stored token and
    // is offered the choice between signing in and beginning again. Weakening
    // this would quietly hand every device that ever held the token a way past
    // the account, which is the one thing an account is for.
    if (tokenIn !== null && findAccountByRunToken(this.ctx.storage.sql, tokenIn) !== null) {
      this.sendMsg(conn, {
        type: "error",
        code: "token-claimed",
        message: "this run belongs to an account",
      });
      return;
    }
    // Mint only when the client had no token; a non-null unknown token is a
    // choosing-phase / storage-evicted token and is reused as-is.
    const token = tokenIn ?? crypto.randomUUID();
    await this.admit(conn, token, null, token);
  }

  /**
   * A2.6: hello with an account key — the second-device path.
   *
   * The comparison is the UNIQUE INDEX PROBE and nothing else; there is no
   * string compare of a submitted key against a stored one anywhere in this
   * server. Malformed and unknown answer with the SAME code, because "that is
   * not a key" and "that is not one of ours" are two facts an attacker would
   * love to be able to tell apart.
   *
   * There is no artificial delay on failure. The limiter is the whole defence,
   * and against 100 bits it is a formality.
   */
  private async onHelloWithAccount(conn: Connection, accountIn: string): Promise<void> {
    this.ensureSchema();
    if (this.signInLimiter.exhausted(conn.id)) {
      this.sendMsg(conn, {
        type: "error",
        code: "too-many-attempts",
        message: "too many attempts",
      });
      // Only a spent CONNECTION is closed. A spent object-wide window refuses
      // the attempt and leaves the socket alone: that budget is shared, and
      // closing sockets over a shared counter would let one guesser hang up on
      // everybody else's sign-in.
      if (this.signInLimiter.connSpent(conn.id)) conn.close(4290, "too many attempts");
      return;
    }
    // FIVE TRIES ARE SPENT, NOT FOUR. The budget is charged below on failure
    // and tested above on the NEXT attempt, so a person who mistypes their key
    // five times is told five times what is wrong with it and is cut off on
    // the sixth try, rather than being hung up on mid-answer.
    const key = normalizeAccountKey(accountIn);
    const row = key === null ? null : findAccountByKey(this.ctx.storage.sql, key);
    if (row === null) {
      this.signInLimiter.record(conn.id);
      this.sendMsg(conn, {
        type: "error",
        code: "bad-account",
        message: "no account with that key",
      });
      return;
    }
    // From here on this is an ordinary session on an ordinary seat. The whole
    // difference an account makes is which string went into `admit`.
    await this.admit(conn, row.run_token, row.account_id, null);
  }

  /**
   * The ONE admission path, reached by both kinds of `hello`. Sharing it is
   * not tidiness: an account-authenticated session has to be
   * indistinguishable from an anonymous one from here down, and the cheapest
   * way to guarantee that is for there to be only one path to be
   * indistinguishable from.
   *
   * `welcomeToken` is what the client is told to store: the seat id for an
   * anonymous run, and NULL for a device that authenticated with a key — that
   * device already has a credential, and the seat id would be a second one
   * that nobody could ever revoke.
   */
  private async admit(
    conn: Connection,
    token: string,
    accountId: string | null,
    welcomeToken: string | null,
  ): Promise<void> {
    const galaxy = this.requireGalaxy();
    const account = accountId !== null;
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    if (run !== undefined) {
      this.conns.set(conn.id, {
        conn,
        token,
        accountId,
        civId: run.civId,
        reportBaselineYear: null,
        openThreadStarId: null,
      });
      await this.rememberCivToken(run.civId, token);
      this.sendMsg(conn, {
        type: "welcome",
        token: welcomeToken,
        account,
        phase: "placed",
        clock: this.toClockWire(),
        catalog: galaxy.stars,
        menus: hypothesisMenus(),
        missionCatalog: this.missionCatalog(),
        voyageCatalog: this.voyageCatalog(),
        push: this.pushWire(),
      });
      await this.sendVoice(conn, token, run.civId);
      await this.sendReport(conn, token, run.civId, { advance: true });
      await this.sendSky(conn, token, run.civId);
      return;
    }
    this.conns.set(conn.id, {
      conn,
      token,
      accountId,
      civId: null,
      reportBaselineYear: null,
      openThreadStarId: null,
    });
    this.sendMsg(conn, {
      type: "welcome",
      token: welcomeToken,
      account,
      phase: "choosing",
      clock: this.toClockWire(),
      catalog: galaxy.stars,
      menus: hypothesisMenus(),
      missionCatalog: this.missionCatalog(),
      voyageCatalog: this.voyageCatalog(),
      push: this.pushWire(),
    });
    const offerYear = await this.getOfferYear(token);
    this.sendMsg(conn, { type: "offer", candidates: this.makeCandidates(token, offerYear) });
  }

  /**
   * claimAccount: mint an account for the seat this connection is sitting in.
   *
   * WHAT DOES NOT HAPPEN HERE is most of the design. No state moves, no key is
   * rewritten, no civ is touched, and the live socket keeps working — the run
   * carries on mid-sentence, and the only difference afterwards is that a row
   * exists pointing at it. That is why a claim is legal in either phase: there
   * need not be a civilization yet for a seat to be worth keeping.
   */
  private async onClaimAccount(conn: Connection): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined) {
      // Not registered: `hello` has not been answered on this socket. Same
      // answer every handler gives to a message out of order.
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "not registered" });
      return;
    }
    this.ensureSchema();
    const sql = this.ctx.storage.sql;
    const existing = findAccountByRunToken(sql, state.token);
    if (existing !== null) {
      // A seat has one account, forever. The way back to the key is
      // `showAccountKey`, which is what the hub row offers once this is so.
      state.accountId = existing.account_id;
      this.sendMsg(conn, {
        type: "error",
        code: "already-claimed",
        message: "this run already has an account",
      });
      return;
    }
    if (this.claimLimiter.exhausted(conn.id)) {
      this.sendMsg(conn, {
        type: "error",
        code: "too-many-attempts",
        message: "too many attempts",
      });
      return;
    }
    this.claimLimiter.record(conn.id);
    const created = createAccount(sql, state.token, Date.now());
    if (created === null) {
      // The unique index refused: another connection on this same seat claimed
      // it between the SELECT above and this INSERT. The index is the
      // arbitrator, and the loser is told the truth rather than handed a
      // second key to one run.
      this.sendMsg(conn, {
        type: "error",
        code: "already-claimed",
        message: "this run already has an account",
      });
      return;
    }
    state.accountId = created.account_id;
    // The key crosses the wire HERE and in `onShowAccountKey`, and those two
    // sends are the entire exposure of a key in this server.
    this.sendMsg(conn, { type: "accountKey", key: created.account_key, fresh: true });
  }

  /**
   * showAccountKey: read this seat's key back, for a player who wants to write
   * it down again. Serves the CONNECTION'S OWN seat and can name no other —
   * there is no argument to this message and there is deliberately nowhere to
   * put one.
   *
   * This is the safety net that plaintext storage buys, and with no recovery
   * in v1 it is the only one there is.
   */
  private onShowAccountKey(conn: Connection): void {
    const state = this.conns.get(conn.id);
    if (state === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "not registered" });
      return;
    }
    if (state.accountId === null) {
      this.sendMsg(conn, {
        type: "error",
        code: "not-signed-in",
        message: "this run has no account",
      });
      return;
    }
    this.ensureSchema();
    const row = findAccountByRunToken(this.ctx.storage.sql, state.token);
    if (row === null) {
      // Unreachable in practice: `accountId` is only ever set from a row that
      // exists, and rows are never deleted. Answering rather than throwing
      // keeps a wiped table from taking a live session down with it.
      this.sendMsg(conn, {
        type: "error",
        code: "not-signed-in",
        message: "this run has no account",
      });
      return;
    }
    this.sendMsg(conn, { type: "accountKey", key: row.account_key, fresh: false });
  }

  /**
   * The game year a token's candidates are anchored to, frozen at first
   * offer and persisted. Without this, nowYear drifts between offer and
   * become (5 real min = 1 game year), shifting the candidates' dated
   * fields (ascensionYear, emission epochs) — the player must become
   * exactly the civ whose card they read.
   */
  private async getOfferYear(token: string): Promise<number> {
    const stored = await this.ctx.storage.get<number>(`offerYear:${token}`);
    if (stored !== undefined) return stored;
    const year = gameYearAt(this.requireClock(), Date.now());
    await this.ctx.storage.put(`offerYear:${token}`, year);
    return year;
  }

  /** become: commit an inheritance candidate into a placed player civ. */
  private async onBecome(conn: Connection, candidateId: string, name: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined) return; // must hello first
    const token = state.token;

    // Idempotency: already placed (this conn or a stored run) → re-send sky.
    // The ceremony re-sends `become` on reload, so this path fires on every
    // reconnect of an already-placed run — sendVoice before sendSky, same
    // as every other placement path below.
    if (state.civId !== null) {
      await this.sendVoice(conn, token, state.civId);
      await this.sendReport(conn, token, state.civId, { advance: true });
      await this.sendSky(conn, token, state.civId);
      return;
    }
    const existing = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    if (existing !== undefined) {
      state.civId = existing.civId;
      await this.sendVoice(conn, token, existing.civId);
      await this.sendReport(conn, token, existing.civId, { advance: true });
      await this.sendSky(conn, token, existing.civId);
      return;
    }

    const clean = validateName(name);
    if (clean === null) {
      this.sendMsg(conn, { type: "error", code: "bad-name", message: "name is invalid" });
      return;
    }
    const offerYear = await this.getOfferYear(token);
    const chosen = this.makeCandidates(token, offerYear).find(
      (c) => c.candidateId === candidateId,
    );
    if (chosen === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "unknown-candidate",
        message: "no such candidate",
      });
      return;
    }

    // Capture the galaxy AFTER the last await: storage reads yield, and a
    // concurrent become on another connection may have placed a civ in the
    // meantime — a stale capture here would lose that civ (and could hand
    // out its star) when we spread `civs` below.
    //
    // A4: TWO ROSTERS, DELIBERATELY. Placement is a READ of the derived one —
    // a colony occupies its star as completely as any seeded civilization
    // does, and `pickPlayerHome` over the stored roster would drop a joining
    // player onto somebody's founding. The splice is a WRITE against the
    // stored one, which by construction holds no colony to lose.
    const galaxy = this.requireGalaxy();
    const stored = this.requireStoredGalaxy();
    const civId = `civ-p-${token.slice(0, 12)}`;
    // Same-token race (two tabs committing at once): if this token's civ
    // landed while we awaited above, treat this as the idempotent path.
    const already = stored.civs.find((c) => c.seed.id === civId);
    if (already !== undefined) {
      state.civId = civId;
      await this.sendVoice(conn, token, civId);
      await this.sendReport(conn, token, civId, { advance: true });
      await this.sendSky(conn, token, civId);
      return;
    }
    const star = pickPlayerHome(galaxy);
    if (star === null) {
      this.sendMsg(conn, { type: "error", code: "cohort-full", message: "cohort is full" });
      return;
    }
    const placedSeed: CivSeed = { ...chosen.seed, id: civId, name: clean };
    const placed: PlacedCiv = { seed: placedSeed, starId: star.id, controller: "player" };
    this.storedGalaxy = { ...stored, civs: [...stored.civs, placed] };
    await this.saveGalaxyCivs(this.storedGalaxy.civs);

    const run: RunRecord = { token, civId, starId: star.id, localNames: {} };
    await this.ctx.storage.put(`run:${token}`, run);
    await this.rememberCivToken(civId, token);
    state.civId = civId;

    // This connection sees its own sky (and, this being its first placement,
    // its arrival line + frame explainers); every other placed connection
    // gets a fresh observer-relative sky only — membership changed for THEM
    // (a new warm source entered their field), but their own placement
    // didn't, so their voice state is untouched.
    await this.sendVoice(conn, token, civId);
    await this.sendReport(conn, token, civId, { advance: true });
    await this.sendSky(conn, token, civId);
    for (const [id, other] of this.conns) {
      if (id === conn.id) continue;
      if (other.civId === null) continue;
      await this.sendSky(other.conn, other.token, other.civId);
    }
  }

  /** nameSource: set/clear the owner's private label for a sky source. */
  private async onNameSource(conn: Connection, starId: string, name: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const run = await this.ctx.storage.get<RunRecord>(`run:${state.token}`);
    if (run === undefined) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // Only real catalog stars may be named: bounds the run record (a
    // hostile client could otherwise grow it without limit / oversize a
    // stored value with an arbitrary starId).
    const galaxy = this.requireGalaxy();
    if (!galaxy.stars.some((s) => s.id === starId)) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "unknown star" });
      return;
    }
    const localNames: Record<string, string> = { ...run.localNames };
    let echo: string;
    if (name === "") {
      delete localNames[starId];
      echo = "";
    } else {
      const clean = validateName(name);
      if (clean === null) {
        this.sendMsg(conn, { type: "error", code: "bad-name", message: "name is invalid" });
        return;
      }
      localNames[starId] = clean;
      echo = clean;
    }
    const updated: RunRecord = { ...run, localNames };
    await this.ctx.storage.put(`run:${state.token}`, updated);
    // Owner-only echo; never broadcast, never attached to a DetectedSource.
    this.sendMsg(conn, { type: "sourceNamed", starId, name: echo });
  }

  /** requestSky: a placed connection asks for a fresh sky. */
  private async onRequestSky(conn: Connection): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    await this.sendSkyToSeat(state);
  }

  /**
   * AV2: the report panel asks to be refreshed (e.g. reopened after the
   * client's own tab reactivated) — it does not live-append. Not placed →
   * silent return, the same bookkeeping rationale as onVoiceSeen and the
   * parse-time drop in protocol.ts (no error code). `advance: false`:
   * opening the panel again must not consume the "new since last visit"
   * marker a second time, and it reuses whatever header the last
   * advance-serve computed rather than re-triage-ing on every reopen.
   */
  private async onRequestReport(conn: Connection): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    await this.sendReport(conn, state.token, state.civId, { advance: false });
  }

  /**
   * voiceSeen: the client dismissed one one-time line — record it so it
   * never replays. Not placed → return silently, same rationale as the
   * parse-time drop in protocol.ts (no error code for bookkeeping). Nothing
   * in the sky depends on this, so no sendSky follows. Idempotent by both
   * the includes-check below and the full-value put: the DO is
   * single-threaded, so there is no read-modify-write race to guard
   * against, only a redundant write to skip.
   */
  private async onVoiceSeen(conn: Connection, key: VoiceKey): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    const voiceState = await this.loadVoiceState(state.token);
    if (voiceState.seen.includes(key)) return;
    await this.saveVoiceState(state.token, {
      version: 1,
      seen: [...voiceState.seen, key],
    });
  }

  /**
   * AV3: record a decline. Not placed → silent return (onVoiceSeen's
   * rationale, above — pure bookkeeping, no error code). The id is
   * validated by RE-ENUMERATING against an EMPTY declined set and matching:
   * an id that is not currently a candidate is a no-op, so nothing a client
   * sends can put an arbitrary string into storage. Enumerating against an
   * empty set (rather than this token's real declined set) is deliberate —
   * a candidate already declined would not appear in the real filtered
   * list, so a duplicate decline needs the unfiltered list to still find
   * it. The fingerprint recorded is the SERVER's current one for that id,
   * never a client-supplied value — the client never holds a fingerprint at
   * all (protocol.ts's Proposal carries no such field).
   */
  private async onDeclineProposal(conn: Connection, id: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const assembled = await this.assembleSkyState(state.token, state.civId, nowYear);
    const budget: ComputeBudget = {
      free: freeComputeAt(assembled.projectState, nowYear),
      ratePerYear: ratePerYearAt(assembled.projectState, nowYear),
      cap: attentionCapAt(assembled.projectState, nowYear),
      asOfYear: nowYear,
    };
    const probeFlightYearsPerLy = effectiveFlightYearsPerLy(assembled.projectState, nowYear);
    const all = enumerateProposals({
      sources: assembled.sources,
      studies: assembled.studies,
      missions: assembled.missions,
      projects: assembled.projects,
      budget,
      localNames: assembled.localNames,
      designations: assembled.designations,
      probeFlightYearsPerLy,
      declined: new Set(),
    });
    const hit = all.find((c) => c.id === id);
    if (hit === undefined) return;
    const stored = await this.loadProposalState(state.token);
    if (stored.declined.includes(hit.fingerprint)) return; // idempotent, skip the write
    const declined = [...stored.declined, hit.fingerprint].slice(-DECLINE_CAP);
    await this.saveProposalState(state.token, { version: 1, declined });
    await this.sendSkyToSeat(state);
  }

  /**
   * openStudy: open a study on a currently visible detected source (also
   * resumes a shelved study — the one verb serves both). No derivation here:
   * status flip and persistence only, then a fresh sky.
   */
  private async onOpenStudy(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // A study may only attach to a source this observer currently sees: bounds
    // the stored value AND enforces that studies only ever attach to detected
    // sources.
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const studyState = await this.loadStudyState(state.token, nowYear);
    // synthesis.md §2 (the reopen bug): SPREAD the existing record rather
    // than writing a fresh `{starId, status}` — a shelved study's `bought[]`
    // must survive a reopen, or every purchase on it would be discarded.
    //
    // A2.2b: `openedYear` is stamped on EVERY open, first or re-. It is what
    // the grounded exit measures a report's arrival against, so reopening a
    // grounded study genuinely reopens it — the report that closed it has
    // already arrived and can never close it again.
    //
    // A2.3: `openedClass` is restamped for the same reason, and the two
    // frozen exits are CLEARED. Reopening a called study drops the call
    // (there is no path that reopens one by itself, so the player has said
    // so); reopening an overtaken one starts the watch on what the source is
    // now, which is exactly what its closing line offered. `tripwires`
    // survives untouched: an order left standing is left standing.
    const existing = studyState.studies[starId];
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: {
        ...existing,
        starId,
        status: "open",
        bought: existing?.bought ?? [],
        openedYear: nowYear,
        openedClass: source.signal.classification,
        called: null,
        overtaken: null,
        tripwires: existing?.tripwires ?? [],
      },
    };
    await this.saveStudyState(state.token, { version: 4, studies });
    await this.sendSkyToSeat(state);
  }

  /**
   * shelveStudy: shelve an existing study. No visibility check — a source may
   * have faded, but the study remains theirs. No derivation here: status flip
   * and persistence only, then a fresh sky.
   */
  private async onShelveStudy(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no study there" });
      return;
    }
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: { ...existing, status: "shelved" },
    };
    await this.saveStudyState(state.token, { version: 4, studies });
    await this.sendSkyToSeat(state);
  }

  /**
   * callStudy: the player decides they are done arguing and freezes the
   * belief where it stands. Legal from open or shelved only — a study that
   * has already closed cannot be closed a second time, whatever closed it.
   *
   * The frozen belief comes from the board this send would have shown, which
   * is why this assembles the sky state rather than re-deriving anything: a
   * call must name the reading the player was looking at when they made it,
   * to the share. From here nothing reads it back. Light goes on arriving,
   * the underlying board goes on moving, and none of that touches the call
   * or is scored against it.
   */
  private async onCallStudy(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing === undefined || isClosed(existing.status)) {
      this.sendMsg(conn, {
        type: "error",
        code: "study-unavailable",
        message: "the study is not open",
      });
      return;
    }

    const assembled = await this.assembleSkyState(state.token, state.civId, nowYear);
    const snapshot = assembled.studies.find((s) => s.starId === starId);
    const lead = snapshot === undefined ? undefined : leadHypothesisOf(snapshot.hypotheses);
    if (lead === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "study-unavailable",
        message: "there is nothing on the board to call",
      });
      return;
    }

    // Re-read: `assembleSkyState` owns a write of its own (studyWrites), so
    // the record loaded above may be stale by now. Same re-fetch-before-put
    // discipline the mission and wake-queue writes use.
    const current = await this.loadStudyState(state.token, nowYear);
    const base = current.studies[starId] ?? existing;
    if (isClosed(base.status)) {
      // The assemble above closed it out from under us (a report landed, or
      // the class changed in the same breath). Those exits are the sky's and
      // they win; the player's call did not get there first.
      this.sendMsg(conn, {
        type: "error",
        code: "study-unavailable",
        message: "the study is not open",
      });
      return;
    }
    const studies: Record<string, StoredStudy> = {
      ...current.studies,
      [starId]: {
        ...base,
        status: "called",
        called: {
          hypothesisId: lead.id,
          label: lead.label,
          gloss: lead.gloss,
          share: lead.share,
          calledYear: nowYear,
          asOfYear: nowYear - source.distanceLy,
        },
      },
    };
    await this.saveStudyState(state.token, { version: 4, studies });
    await this.sendSkyToSeat(state);
  }

  /**
   * armTripwire: leave one standing condition on a study. Free — this is a
   * decision, not work, so there is no cost and no clock. At most one per
   * kind (re-arming replaces, which is also how a fired one is reset), and
   * the server REFUSES to arm a condition that already holds: arming
   * something that would fire on the same breath is not an order, it is a
   * misunderstanding, and `tripwire-unavailable` says so.
   */
  private async onArmTripwire(conn: Connection, starId: string, kind: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const tripwireKind = TRIPWIRE_KINDS.find((k) => k === kind);
    if (tripwireKind === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "tripwire-unavailable",
        message: "no such tripwire",
      });
      return;
    }
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing === undefined || isClosed(existing.status)) {
      this.sendMsg(conn, {
        type: "error",
        code: "study-unavailable",
        message: "the study is not open",
      });
      return;
    }

    // The already-holds check reads the same board a sky send would, through
    // the same predicate the firing check uses. Only `crosses` can be true at
    // the moment of arming; the other two are armed-year-relative and so are
    // false by construction here, which is the whole reason the state machine
    // needs nothing but a fired year.
    const assembled = await this.assembleSkyState(state.token, state.civId, nowYear);
    const snapshot = assembled.studies.find((s) => s.starId === starId);
    const holds =
      snapshot !== undefined &&
      tripwireHolds(tripwireKind, nowYear, {
        openQuestions: snapshot.openQuestions,
        hypotheses: snapshot.hypotheses,
        signal: source.signal,
        distanceLy: source.distanceLy,
      });
    if (holds) {
      this.sendMsg(conn, {
        type: "error",
        code: "tripwire-unavailable",
        message: "that has already happened",
      });
      return;
    }

    const current = await this.loadStudyState(state.token, nowYear);
    const base = current.studies[starId] ?? existing;
    if (isClosed(base.status)) {
      // Closed by the assemble above; a closed study evaluates no tripwires,
      // so arming one on it would be an order nothing will ever read.
      this.sendMsg(conn, {
        type: "error",
        code: "study-unavailable",
        message: "the study is not open",
      });
      return;
    }
    const tripwires: StoredTripwire[] = [
      ...base.tripwires.filter((t) => t.kind !== tripwireKind),
      { kind: tripwireKind, armedYear: nowYear, firedYear: null },
    ];
    const studies: Record<string, StoredStudy> = {
      ...current.studies,
      [starId]: { ...base, tripwires },
    };
    await this.saveStudyState(state.token, { version: 4, studies });
    await this.sendSkyToSeat(state);
  }

  /** disarmTripwire: take the order back. Idempotent — disarming a kind that
   *  is not armed is a no-op write and a fresh sky, never an error. */
  private async onDisarmTripwire(conn: Connection, starId: string, kind: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const tripwireKind = TRIPWIRE_KINDS.find((k) => k === kind);
    if (tripwireKind === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "tripwire-unavailable",
        message: "no such tripwire",
      });
      return;
    }
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no study there" });
      return;
    }
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: {
        ...existing,
        tripwires: existing.tripwires.filter((t) => t.kind !== tripwireKind),
      },
    };
    await this.saveStudyState(state.token, { version: 4, studies });
    await this.sendSkyToSeat(state);
  }

  /**
   * armOrder: leave one standing order on the SKY.
   *
   * ON THE SKY, NOT ON A STUDY, and that is the choice the whole shape rests
   * on: a study can be closed, a source can fade below the wire, and an order
   * hanging off either would quietly stop existing at the moment it was most
   * needed. There is nothing here to reconcile with study closure because
   * there is no study in it.
   *
   * ARMING IS THE CONSENT AND THE CHARTER IS ITS CONTENT. The message carries
   * the charter the eventual dispatch will fly under, validated here against
   * the mission catalog exactly as `onLaunchMission` validates one — a player
   * arming this is authorizing a specific instrument with a specific
   * contingency table, not signing a blank one.
   *
   * REFUSED WHEN THE CONDITION ALREADY HOLDS, `onArmTripwire`'s contract and
   * its exact reason: an order is a statement about what happens NEXT, and
   * one that fired on something already true would be reading the past back to
   * the player as news. The refusal names no star and cannot: the arming names
   * none either.
   */
  private async onArmOrder(
    conn: Connection,
    orderClass: string,
    charter: readonly unknown[],
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const def = orderClassById(orderClass);
    if (def === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "order-unavailable",
        message: "no such order",
      });
      return;
    }
    // The sender's own bytes first (onLaunchVoyage's order of validation):
    // every clause has to be a string before the vocabulary is consulted.
    const clauses: string[] = [];
    for (const raw of charter) {
      if (typeof raw !== "string") {
        this.sendMsg(conn, { type: "error", code: "bad-charter", message: "invalid charter" });
        return;
      }
      clauses.push(raw);
    }
    const resolved = validateCharter(def.missionKind, clauses);
    if (resolved === null) {
      this.sendMsg(conn, { type: "error", code: "bad-charter", message: "invalid charter" });
      return;
    }

    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const galaxy = this.requireGalaxy();
    const civId = state.civId;
    // The already-holds check reads the same candidates a settle would, through
    // the same predicate the firing uses — one condition, two call sites, no
    // third bit of state to keep in step.
    const held = warmMovementTarget(this.orderCandidates(galaxy, civId, nowYear), nowYear, def.radiusLy);
    if (held !== null) {
      this.sendMsg(conn, {
        type: "error",
        code: "order-unavailable",
        message: "that has already happened",
      });
      return;
    }

    const stored = await this.loadOrderState(state.token);
    const order: StoredOrder = {
      orderClass: def.orderClass,
      armedYear: nowYear,
      charter: resolved,
      firedYear: null,
      firedStarId: null,
      outcome: null,
      evidenceAgeYears: null,
    };
    // RE-ARMING IS A FRESH ACT: the previous arming, fired or not, is replaced
    // whole, so a spent order becomes a new one with a new year and a new
    // charter rather than accumulating a history nobody can read.
    await this.saveOrderState(state.token, {
      version: 1,
      orders: [...stored.orders.filter((o) => o.orderClass !== def.orderClass), order],
    });
    await this.sendSkyToSeat(state);
  }

  /** disarmOrder: take the order back. Idempotent — disarming a class that is
   *  not armed is a no-op write and a fresh sky, never an error
   *  (`onDisarmTripwire`'s contract). */
  private async onDisarmOrder(conn: Connection, orderClass: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const def = orderClassById(orderClass);
    if (def === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "order-unavailable",
        message: "no such order",
      });
      return;
    }
    const stored = await this.loadOrderState(state.token);
    await this.saveOrderState(state.token, {
      version: 1,
      orders: stored.orders.filter((o) => o.orderClass !== def.orderClass),
    });
    await this.sendSkyToSeat(state);
  }

  /**
   * buyQuestion: commission one inference against free compute. Requires a
   * visible source (so the class is known); it does NOT require an open
   * study — the spend is the statement of intent, so it opens the study
   * when none exists and reopens a shelved one (stamping `openedYear`
   * exactly as onOpenStudy would). The statuses a spend does not override
   * are the CLOSED ones: grounded, called, and overtaken all stay closed
   * until the player deliberately reopens, because reopening restamps
   * `openedYear` and `openedClass` and with them what those exits measure
   * against (observatory-design.md § The exits).
   */
  private async onBuyQuestion(conn: Connection, starId: string, questionId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing !== undefined && isClosed(existing.status)) {
      this.sendMsg(conn, {
        type: "error",
        code: "question-unavailable",
        message: "the study is closed",
      });
      return;
    }
    const def = questionById(questionId);
    if (def === undefined) {
      this.sendMsg(conn, { type: "error", code: "unknown-question", message: "no such question" });
      return;
    }
    const alreadyBought = (existing?.bought ?? []).some((b) => b.id === def.id);
    if (!def.appliesTo.includes(source.signal.classification) || alreadyBought) {
      this.sendMsg(conn, {
        type: "error",
        code: "question-unavailable",
        message: "question not available",
      });
      return;
    }
    const projectState = await this.loadProjectState(state.token, state.civId, nowYear);
    const cost = effectiveCostFor(def, nowYear, projectState);
    const free = freeComputeAt(projectState, nowYear);
    if (free < cost) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }

    const bought: BoughtQuestion = { id: def.id, boughtYear: nowYear };
    // An already-open study keeps its record (onOpenStudy's spread-don't-
    // replace rule) and its `openedYear`; a missing or shelved study opens
    // with this purchase, `openedYear` stamped now.
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]:
        existing !== undefined && existing.status === "open"
          ? { ...existing, bought: [...existing.bought, bought] }
          : {
              ...existing,
              starId,
              status: "open",
              bought: [...(existing?.bought ?? []), bought],
              openedYear: nowYear,
              // The open/reopen branch stamps `openedClass` for the same
              // reason it stamps `openedYear`: the study is being opened
              // NOW, against the class the source shows now. The two frozen
              // exits are already null here (the refusal above rejects every
              // closed status), and writing them null says so out loud.
              openedClass: source.signal.classification,
              called: null,
              overtaken: null,
              tripwires: existing?.tripwires ?? [],
            },
    };
    await this.saveStudyState(state.token, { version: 4, studies });

    const updatedProjectState = commitCompute(projectState, cost, nowYear);
    await this.saveProjectState(state.token, updatedProjectState);

    // No wake for the answer: it is already in this send. A question
    // answers the year it is bought (physics-audit.md P0-1), so there is
    // nothing later to be woken for.
    await this.sendSkyToSeat(state);
  }

  /**
   * launchMission: commit a probe-class mission to a visible source under a
   * charter written now and never patchable again (systems-a.md §5.4).
   */
  private async onLaunchMission(
    conn: Connection,
    starId: string,
    kind: string,
    charter: readonly string[],
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const kindDef = missionKindById(kind);
    if (kindDef === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "unknown-mission-kind",
        message: "no such mission kind",
      });
      return;
    }
    const resolvedCharter = validateCharter(kindDef.kind, charter);
    if (resolvedCharter === null) {
      this.sendMsg(conn, { type: "error", code: "bad-charter", message: "invalid charter" });
      return;
    }

    const missionState = await this.loadMissionState(state.token);
    const civId = state.civId;
    const conflict = missionState.missions.some((m) => {
      if (m.starId !== starId || m.kind !== kindDef.kind) return false;
      const cone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
      const snapshot = toMissionSnapshot(galaxy, cone, m, nowYear);
      return (
        snapshot.state === "in-flight" ||
        snapshot.state === "beyond-horizon" ||
        snapshot.state === "awaiting-light" ||
        snapshot.state === "standing"
      );
    });
    if (conflict || missionState.missions.length >= MAX_MISSIONS_PER_TOKEN) {
      this.sendMsg(conn, {
        type: "error",
        code: "mission-unavailable",
        message: "a live mission of this kind already runs on this star",
      });
      return;
    }

    const projectState = await this.loadProjectState(state.token, state.civId, nowYear);
    const free = freeComputeAt(projectState, nowYear);
    if (free < kindDef.costCompute) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }

    const flightYearsPerLy = effectiveFlightYearsPerLy(projectState, nowYear);
    const mission: StoredMission = {
      id: `m-${missionState.nextOrdinal}`,
      kind: kindDef.kind,
      starId,
      targetCivId: source.targetId,
      launchedYear: nowYear,
      distanceLy: source.distanceLy,
      flightYearsPerLy,
      charter: resolvedCharter,
    };
    const updatedMissionState: MissionState = {
      version: 1,
      missions: [...missionState.missions, mission],
      nextOrdinal: missionState.nextOrdinal + 1,
    };
    await this.saveMissionState(state.token, updatedMissionState);

    const updatedProjectState = commitCompute(projectState, kindDef.costCompute, nowYear);
    await this.saveProjectState(state.token, updatedProjectState);

    await this.pushWakeEvent({
      token: state.token,
      atYear: missionFirstWordYear(mission),
      missionId: mission.id,
      key: `m/${mission.id}/0`,
    });

    await this.sendSkyToSeat(state);
  }

  /**
   * launchVoyage: send a founding. THE OTHER IRREVERSIBLE ACT, and it opens
   * exactly the way the two contact verbs do — by resolving a LIVE socket from
   * `this.conns`. That is the presence rule, and a founding is squarely inside
   * it: nothing here can be undone, amended past the horizon, or recalled.
   *
   * IT IS ALSO THE ONLY APPEND TO THE VOYAGE RECORD IN THE WHOLE SERVER.
   * Alarms are wake-ups and never truth, the proposal route has no voyage arm
   * and gains none, tripwires fire beliefs, and no AI civilization has a path
   * here at any stage. Greppable as `saveVoyageState`: the definition, this
   * handler, and the two seed paths, which write the EMPTY state so a re-seed
   * cannot inherit foundings aimed at stars that no longer exist.
   *
   * THE ORDER OF THE VALIDATION TABLE IS LOAD-BEARING, and it is A2.4's order.
   * Everything decidable from the SENDER'S OWN BYTES runs first (the ship kind,
   * the clause table, the dial sheet against their own ranges, the name),
   * because such a verdict cannot be a question about anybody else. The STAR
   * test comes next and answers `bad-message` for every way of naming one that
   * cannot be launched at — unknown id, the player's own home — so the error
   * can never be used as an oracle. Then the caps, then the price.
   *
   * ANY CATALOG STAR BUT HOME. A source is a legal target: aiming a founding
   * at somebody is allowed, it simply does not root, and the ship arrives to
   * find the world taken. The survey says so in advance, in words.
   */
  private async onLaunchVoyage(
    conn: Connection,
    starId: string,
    kind: string,
    charter: readonly string[],
    dials: readonly unknown[],
    name: string,
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // (1) The sender's own bytes: the ship kind and the charter's vocabulary.
    const kindDef = voyageKindById(kind);
    if (kindDef === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "unknown-voyage-kind",
        message: "no such ship",
      });
      return;
    }
    const clauses = validateVoyageCharter(charter);
    if (clauses === null) {
      this.sendMsg(conn, { type: "error", code: "bad-charter", message: "invalid charter" });
      return;
    }
    const childName = validateName(name);
    if (childName === null) {
      this.sendMsg(conn, { type: "error", code: "bad-name", message: "name is invalid" });
      return;
    }

    const civId = state.civId;
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    // Captured AFTER the last synchronous check and BEFORE the first await
    // (onBecome's rule). Reads go through the derived roster; the one write
    // below goes through the stored one.
    const galaxy = this.requireGalaxy();
    const selfCiv = civById(galaxy, civId);
    const homeStar = starById(galaxy.stars, selfCiv.starId);

    // (2) The dial sheet, against the parent's OWN ranges. Still the sender's
    // own bytes measured against the sender's own state, so it stays above the
    // star test.
    const composed = validateCharterDials(selfCiv.seed.dials, dials);
    if (composed === null) {
      this.sendMsg(conn, { type: "error", code: "bad-charter", message: "invalid charter" });
      return;
    }

    // (3) The star. Unknown, home and RESERVED all answer the SAME code,
    // deliberately: a refusal has to be indistinguishable from a typo, or the
    // error itself tells a crafted message where the held sky is. There is no
    // `star-reserved` code and there must never be one.
    const target = galaxy.stars.find((s) => s.id === starId);
    if (
      target === undefined ||
      target.id === homeStar.id ||
      reservedStarIds(galaxy).has(target.id)
    ) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no star there" });
      return;
    }
    const distance = distanceLy(homeStar.position, target.position);

    // (4) The prerequisite. A sail is pushed from home, so the emitter has to
    // exist before the ship can leave; there is no partial credit for a
    // project still building.
    const projectState = await this.loadProjectState(state.token, civId, nowYear);
    if (kindDef.requiresProject !== null) {
      const required = projectById(kindDef.requiresProject);
      const started = projectState.started.find((p) => p.id === kindDef.requiresProject);
      if (required === undefined || started === undefined || !hasLanded(required, started, nowYear)) {
        this.sendMsg(conn, {
          type: "error",
          code: "project-required",
          message: "that ship needs a project that has not landed",
        });
        return;
      }
    }

    // (5) The caps. ONE LIVE VOYAGE PER (SEAT, STAR) and eight per seat ever.
    // There is NO cohort-wide reservation and there will not be one: two
    // players may aim at the same star, and the second to arrive finds it
    // occupied. Locking it would replace a physical race with a bookkeeping
    // one, and the physical race is the interesting version.
    const voyageState = this.voyageState;
    const mine = voyageState.voyages.filter((v) => v.ownerToken === state.token);
    const liveOnStar = mine.some(
      (v) => v.starId === starId && nowYear < voyageFirstWordYear(v) - YEAR_EPS,
    );
    if (liveOnStar || mine.length >= MAX_VOYAGES_PER_TOKEN) {
      this.sendMsg(conn, {
        type: "error",
        code: "voyage-unavailable",
        message: "a founding is already under way there",
      });
      return;
    }

    // (6) The price.
    const free = freeComputeAt(projectState, nowYear);
    if (free < kindDef.costCompute) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }

    // --- the writes -------------------------------------------------------
    const voyageCharter: VoyageCharter = {
      childName,
      sheet: composed.sheet,
      pinned: composed.pinned,
      clauses,
    };
    const voyage: StoredVoyage = {
      id: `v-${voyageState.nextOrdinal}`,
      ownerCivId: civId,
      ownerToken: state.token,
      kind: kindDef.kind,
      starId,
      launchedYear: nowYear,
      // FROZEN, both of them: every date this voyage will ever have derives
      // from these two numbers, and no later project may speed a ship already
      // gone. `probe-haste` deliberately does not reach here at all.
      distanceLy: distance,
      flightYearsPerLy: kindDef.flightYearsPerLy,
      lineageId: selfCiv.seed.lineageId,
      charter: voyageCharter,
    };
    await this.saveVoyageState({
      version: 1,
      voyages: [...voyageState.voyages, voyage],
      nextOrdinal: voyageState.nextOrdinal + 1,
    });

    await this.saveProjectState(state.token, commitCompute(projectState, kindDef.costCompute, nowYear));

    // THE DEPARTURE LIGHT — a real truth write, by a live socket, on
    // `applyBroadcast`'s exact terms and through the same code
    // (`applyEpisode`). A seedship's burn is too slow to see and writes
    // nothing; a torch flares for eight years at 0.45, a sail's battery pushes
    // for min(60, 2d) years at 0.80, and both of them are in the
    // neighborhood's echo forever after. The write goes to the STORED roster.
    //
    // THE ARRIVAL LIGHT IS NOT WRITTEN HERE and is not written by anyone: the
    // braking burn belongs to the CHILD's emission history, which is derived
    // at the fold (`foundingEmissionHistory`) along with everything else about
    // a colony that does not exist yet.
    const light = departureLightFor(kindDef, distance);
    if (light !== null) {
      const stored = this.requireStoredGalaxy();
      const storedSelf = civById(stored, civId);
      const updatedSelf: PlacedCiv = {
        ...storedSelf,
        seed: {
          ...storedSelf.seed,
          emissionHistory: applyEpisode(
            storedSelf.seed.emissionHistory,
            nowYear,
            light.years,
            light.level,
          ),
        },
      };
      const civs = stored.civs.map((c) => (c.seed.id === civId ? updatedSelf : c));
      this.storedGalaxy = { ...stored, civs };
      await this.saveGalaxyCivs(civs);
    }

    await this.scheduleVoyageWakes(voyage, light !== null);

    // This seat sees its own departure immediately. Every OTHER placed
    // connection gets a fresh sky on the same terms a commit gives them one: a
    // torch or a sail has just changed what their sky will read, and a
    // seedship has changed nothing yet, but the fan-out is UNCONDITIONAL so
    // the set of sockets a launch touches says nothing about which ship left.
    await this.sendSkyToSeat(state);
    for (const other of this.conns.values()) {
      if (other.token === state.token) continue;
      if (other.civId === null) continue;
      await this.sendSky(other.conn, other.token, other.civId);
    }
  }

  /**
   * The wakes a founding wants. ALL WAKE-UPS, NEVER TRUTH (onAlarm's
   * contract): every one of these arrivals happens whether or not anything is
   * queued for it, because the landfall is derived from the record and the
   * clock. Wipe the queue and the colony still founds, still lights up, and
   * still reaches every telescope at its own distance.
   *
   *   the owner, at landfall            the decision is made, out there
   *   the owner, at first word          the report and the first light, together
   *   every placed player, when the FAR END first reaches them
   *   every placed player, at launch + their own distance to HOME (torch/sail)
   *
   * The third is the one that matters for other people: a colony entering
   * their sky is a membership change in their field, and they should not have
   * to guess when. It is `voyageArrivalLightYear` and not the landfall year,
   * because a torch or a sail brakes in the open for years before it lands and
   * that burn is the first thing anybody sees (physics-audit.md P1-3). The
   * floor at landfall is the roster's, not the light's: the fold has no child
   * to show before the founding is decided, so an observer sitting closer to
   * that star than the burn is long simply reads the burn late.
   */
  private async scheduleVoyageWakes(
    voyage: StoredVoyage,
    hasDepartureLight: boolean,
  ): Promise<void> {
    const galaxy = this.requireGalaxy();
    const childStar = starById(galaxy.stars, voyage.starId);
    const landfallYear = voyageLandfallYear(voyage);
    const wakes: { token: string; atYear: number; key: string }[] = [
      {
        token: voyage.ownerToken,
        atYear: landfallYear + WAKE_SLOP_YEARS,
        key: `v/${voyage.id}/landfall`,
      },
      {
        token: voyage.ownerToken,
        atYear: voyageFirstWordYear(voyage) + WAKE_SLOP_YEARS,
        key: `v/${voyage.id}/word`,
      },
    ];
    for (const civ of galaxy.civs) {
      if (civ.controller !== "player") continue;
      const token = await this.ctx.storage.get<string>(`civToken:${civ.seed.id}`);
      if (token === undefined) continue; // never placed through a live socket
      const star = starById(galaxy.stars, civ.starId);
      wakes.push({
        token,
        atYear:
          Math.max(
            landfallYear,
            voyageArrivalLightYear(voyage) + distanceLy(childStar.position, star.position),
          ) + WAKE_SLOP_YEARS,
        key: `v/${voyage.id}/light/${civ.seed.id}`,
      });
      if (!hasDepartureLight || civ.seed.id === voyage.ownerCivId) continue;
      const home = starById(
        galaxy.stars,
        civById(galaxy, voyage.ownerCivId).starId,
      );
      wakes.push({
        token,
        atYear:
          voyage.launchedYear + distanceLy(home.position, star.position) + WAKE_SLOP_YEARS,
        key: `v/${voyage.id}/departure/${civ.seed.id}`,
      });
    }
    await this.pushWakeEvents(wakes);
  }

  /**
   * A2.4: the token that owns a civ, so an arrival wake can find whom to
   * push. Idempotent, and written from every placement path — which
   * back-fills every returning pre-A2.4 run on its next hello. Used for
   * nothing else; it is not a second run record.
   */
  private async rememberCivToken(civId: string, token: string): Promise<void> {
    await this.ctx.storage.put(`civToken:${civId}`, token);
  }

  /**
   * commitContact: hail one civilization, speak to everyone, or stay dark.
   *
   * PRESENCE RULE (act3-design.md, the absence charter): irreversible acts
   * require presence. This is the ONLY caller of applyBroadcast in the whole
   * server and one of exactly TWO callers of appendAct (the other is
   * `onSendSignal`), and — the invariant that actually matters — its first
   * statement resolves a LIVE socket from `this.conns`, an in-memory entry
   * deleted on close. Nothing else in this object may produce a ContactAct:
   * alarms are wake-ups and never truth, the proposal route has no contact
   * arm and gains none (the mind may not propose a hail into existence),
   * tripwires fire beliefs rather than acts, and no AI civilization has a
   * path here at any stage — its answers are DERIVED and stored nowhere
   * (traffic.ts).
   *
   * THE ORDER OF THE VALIDATION TABLE BELOW IS LOAD-BEARING. The visibility
   * test is `visibleSky` membership and nothing more — byte-identical to the
   * test that produced the client's own `sources` — and unknown star, star
   * with no civilization, and star whose light has not reached this observer
   * all answer the SAME code, so the error can never be used as an oracle
   * for what is out there. Requiring an open study instead would also price
   * the ceremony in Compute, which is the wrong altitude: a hail's price is
   * coherence and irreversibility, not inference.
   */
  private async onCommitContact(
    conn: Connection,
    choice: string,
    starId: string | null,
    acknowledged: boolean,
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    if (choice !== "hail" && choice !== "broadcast" && choice !== "stay-dark") {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no such choice" });
      return;
    }
    // Stay dark WRITES NOTHING and sends nothing (the voiceSeen /
    // declineProposal silent-bookkeeping precedent). Physics has no record
    // of a non-event, the light cone has nothing to serve, and a stored
    // `lastDarkYear` would be a fact no observer could ever read. The arm
    // exists so the ceremony's vocabulary is complete and A2.5's declined
    // answer has a home; the sky it leaves behind is byte-identical.
    if (choice === "stay-dark") return;

    const kind: CeremonyKind = choice;
    const civId = state.civId;
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    // Captured AFTER the last await, as onBecome's comment requires: no
    // storage read yields between here and the splice below, so a
    // concurrent commit on another connection cannot be lost.
    //
    // A4: the visibility and target checks below read the DERIVED roster,
    // because a colony is hailable on exactly the terms anything else is —
    // it is in the sky, or it is not. The residue write goes to the stored
    // one.
    const galaxy = this.requireGalaxy();
    const stored = this.requireStoredGalaxy();
    const selfCiv = civById(stored, civId);

    let toCivId: string | null = null;
    if (kind === "hail") {
      const visible = visibleSky(galaxy, civId, nowYear);
      const target = starId === null ? undefined : civAtStar(galaxy, starId);
      if (
        starId === null ||
        !visible.some((o) => o.starId === starId) ||
        target === undefined ||
        target.seed.id === civId
      ) {
        this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
        return;
      }
      toCivId = target.seed.id;
      if (hasHailed(galaxy.acts, civId, toCivId)) {
        this.sendMsg(conn, {
          type: "error",
          code: "contact-unavailable",
          message: "a beam is already aimed there",
        });
        return;
      }
    } else if (broadcastInFlight(galaxy.acts, civId, nowYear)) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-unavailable",
        message: "already speaking to everyone",
      });
      return;
    }
    if (actsFrom(galaxy.acts, civId).length >= MAX_ACTS_PER_CIV) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-unavailable",
        message: "too many acts committed",
      });
      return;
    }

    // The server recomputes the resistance and charges WHAT IT COMPUTES;
    // `acknowledged` only decides whether a contested commit may proceed. So
    // a client that never rendered the objection cannot silently wound the
    // mind, and a client that lies about the flag still pays this number.
    const resistance = resistanceFor(selfCiv.seed, kind);
    if (resistance.contested && acknowledged !== true) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-contested",
        message: "the mind objects",
      });
      return;
    }

    // --- the writes ------------------------------------------------------
    // A hail gets ONE append and no emission-history write: a beam is aimed,
    // and putting it in the broadband history would broadcast it to every
    // observer, which is exactly the leak the class exists to exclude. A
    // broadcast gets two writes, the act and the residue.
    const charged = Math.min(resistance.coherenceCost, selfCiv.seed.stocks.coherence);
    const act: ContactAct = {
      id: `act-${stored.acts.length}`,
      kind,
      fromCivId: civId,
      toCivId,
      sentYear: nowYear,
      coherenceCost: charged,
    };
    const updatedSelf: PlacedCiv = {
      ...selfCiv,
      seed: {
        ...selfCiv.seed,
        emissionHistory:
          kind === "broadcast"
            ? applyBroadcast(selfCiv.seed.emissionHistory, nowYear)
            : selfCiv.seed.emissionHistory,
        stocks: {
          ...selfCiv.seed.stocks,
          // Floored at zero. v1 CHARGES AND DISPLAYS only: coherence's
          // thresholds (fragmentation, wobbling endeavors) are the economy's
          // later work and nothing here presumes them.
          coherence: Math.max(0, selfCiv.seed.stocks.coherence - charged),
        },
      },
    };
    const civs = stored.civs.map((c) => (c.seed.id === civId ? updatedSelf : c));
    this.storedGalaxy = appendAct({ ...stored, civs }, act);
    await this.saveGalaxyCivs(this.storedGalaxy.civs);
    await this.ctx.storage.put("galaxy:acts", this.storedGalaxy.acts);

    // The wake pass reads the DERIVED roster: a hail aimed at a colony has to
    // resolve the colony to know how far away it is, and a broadcast's shell
    // sweeps over children exactly as it does over anything else.
    await this.scheduleContactWakes(this.requireGalaxy(), act);

    // This SEAT sees the debit and its own echo immediately, on every device
    // it is live on (the client re-derives every stamp from this sky, so the
    // seam is one round trip). Every OTHER placed connection gets a fresh sky
    // too: the membership of their sky can change on a commit, exactly as it
    // does on a placement. A2.6 skips by SEAT rather than by socket id, so a
    // second device on this account is served once by the fan-out above
    // instead of twice.
    await this.sendSkyToSeat(state);
    for (const other of this.conns.values()) {
      if (other.token === state.token) continue;
      if (other.civId === null) continue;
      await this.sendSky(other.conn, other.token, other.civId);
    }
  }

  /**
   * sendSignal: a COMPOSED follow-up inside a thread you already opened.
   *
   * PRESENCE RULE, second and final call site. Its first statement resolves a
   * LIVE socket from `this.conns`, exactly as `onCommitContact`'s does; that
   * — not a count of one — is the invariant contact.ts's header states.
   *
   * NO CEREMONY AND NO RESISTANCE. The mind objected once, at the door, and
   * does not relitigate the conversation, so a signal costs no coherence and
   * `CeremonyKind` never widened to admit it.
   *
   * NO CONTROLLER BRANCH ANYWHERE IN THIS METHOD, and that is the point of
   * the slice. A2.5 refused a human target with its own error code, which
   * made "type anything and read the reply" a perfect oracle for whether a
   * neighbor was a person. Every path below is identical for both, the parts
   * are materialized from the SENDER'S OWN state either way, and the claim is
   * greppable:
   *
   *   grep -n "controller" server/src/cohort.ts
   *
   * must show no hit inside this method.
   *
   * THE ORDER OF THE VALIDATION TABLE IS LOAD-BEARING, and it inherits A2.4's
   * oracle discipline whole. Everything decidable from the SENDER'S OWN BYTES
   * runs first (tone vocabulary, selector vocabulary), because such a verdict
   * cannot be a question about anybody else; then the visibility test, which
   * is `visibleSky` membership and nothing more, so unknown star, star with no
   * civilization and star whose light has not reached this observer all answer
   * the SAME code; then the thread's own table, and materialization last,
   * because it is the only step that reads state.
   */
  private async onSendSignal(
    conn: Connection,
    starId: string,
    toneRaw: string,
    partsRaw: readonly unknown[],
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // (1) The sender's own bytes. Both of these are pure vocabulary checks on
    // what the client sent and read no state at all, so neither can be turned
    // into a question about the sky.
    const tone = parseTone(toneRaw);
    if (tone === null) {
      this.sendMsg(conn, { type: "error", code: "bad-signal", message: "no such tone" });
      return;
    }
    const refs = parsePartRefs(partsRaw);
    if (refs === null || refs.length > MAX_PARTS_PER_SIGNAL) {
      this.sendMsg(conn, { type: "error", code: "bad-signal", message: "the signal is malformed" });
      return;
    }

    const civId = state.civId;
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    // Captured AFTER the last await (onBecome's rule): no storage read yields
    // between here and the splice below.
    const galaxy = this.requireGalaxy();
    const visible = visibleSky(galaxy, civId, nowYear);
    const target = civAtStar(galaxy, starId);
    if (
      !visible.some((o) => o.starId === starId) ||
      target === undefined ||
      target.seed.id === civId
    ) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const toCivId = target.seed.id;

    const mine = actsFrom(galaxy.acts, civId).filter(
      (a) => (a.kind === "hail" || a.kind === "signal") && a.toCivId === toCivId,
    );
    // The thread exists iff you opened it. ANSWERING SOMEONE WHO HAILED YOU
    // COSTS THE HAIL CEREMONY — the client routes there instead, which is the
    // beat, not an omission.
    if (!hasHailed(galaxy.acts, civId, toCivId)) {
      this.sendMsg(conn, {
        type: "error",
        code: "thread-unavailable",
        message: "no thread there",
      });
      return;
    }
    const last = mine[mine.length - 1];
    if (last !== undefined && nowYear - last.sentYear < SIGNAL_COOLDOWN_YEARS) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-unavailable",
        message: "too soon after the last",
      });
      return;
    }
    // THE TURNAROUND FLOOR, on every thread alike. The thread's reference view
    // is derived here (and not merely counted) because the floor, every
    // verdict reference and the mutual quiet all read the SAME merged list the
    // client is looking at — one derivation, one truth about what has landed.
    const refRows = threadRefRowsFor(galaxy, civId, toCivId, nowYear);
    const inbound = refRows.filter((r) => r.from === "them");
    const lastInbound = inbound[inbound.length - 1];
    if (
      lastInbound !== undefined &&
      nowYear - lastInbound.learnedYear < MIN_DELIBERATION_YEARS
    ) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-unavailable",
        message: "the beam is still being read",
      });
      return;
    }
    if (mine.filter((a) => a.kind === "signal").length >= MAX_SIGNALS_PER_THREAD) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-unavailable",
        message: "this thread is full",
      });
      return;
    }
    if (actsFrom(galaxy.acts, civId).length >= MAX_ACTS_PER_CIV) {
      this.sendMsg(conn, {
        type: "error",
        code: "contact-unavailable",
        message: "too many acts committed",
      });
      return;
    }

    // (2) MATERIALIZATION. Selectors in, frozen parts out, every field read
    // off this sender's own study, sky and seed state. A hostile selector
    // answers here and writes nothing at all.
    const studyState = await this.loadStudyState(state.token, nowYear);
    const materialized = materializeParts(refs, {
      galaxy,
      senderId: civId,
      nowYear,
      studies: studyState.studies,
      thread: refRows,
      accord: deriveAccord(refRows),
    });
    if (!materialized.ok) {
      this.sendMsg(conn, {
        type: "error",
        code: materialized.code,
        message: materialized.message,
      });
      return;
    }

    // --- the write -------------------------------------------------------
    // ONE append and no emission-history write, for exactly the reason a hail
    // gets none: a signal is aimed, and putting it in the broadband history
    // would broadcast it to every observer.
    //
    // `inReplyTo` is deliberately UNSET. Threading is carried by the verdict
    // part's own reference, which resolves inside this thread and is
    // re-rendered into each viewer's own namespace on the way out — and, when
    // it names a derived reply, it names an id that is append-only by
    // construction, so it cannot come to mean something else (traffic.ts's
    // header argues this where the derivation rule lives).
    //
    // `text` is deliberately UNSET, and there is no longer any code that
    // could set it.
    const act: ContactAct = {
      id: `act-${galaxy.acts.length}`,
      kind: "signal",
      fromCivId: civId,
      toCivId,
      sentYear: nowYear,
      coherenceCost: 0,
      tone,
      parts: materialized.parts,
    };
    // A4: appended to the STORED log, not the derived roster — the two share
    // an `acts` array by identity, and writing the derived one back would
    // persist a colony through the side door. Nothing else about this handler
    // changes: a colony is a counterpart like any other.
    this.storedGalaxy = appendAct(this.requireStoredGalaxy(), act);
    await this.ctx.storage.put("galaxy:acts", this.storedGalaxy.acts);

    await this.scheduleContactWakes(this.requireGalaxy(), act);

    // This seat sees its own echo immediately, on every device it is live on.
    // Every OTHER placed connection gets a fresh sky too, on the same terms a
    // commit does: the recipient may be a person, their thread list can change
    // on this write, and — the load-bearing part — the fan-out is
    // UNCONDITIONAL, so the set of sockets a send touches says nothing about
    // who was aimed at. Skipping by SEAT rather than by socket id leaves that
    // untouched: which OTHER players are served is unchanged, and a second
    // device on the sender's own account is simply not served twice.
    await this.sendSkyToSeat(state);
    for (const other of this.conns.values()) {
      if (other.token === state.token) continue;
      if (other.civId === null) continue;
      await this.sendSky(other.conn, other.token, other.civId);
    }
  }

  /**
   * muteThread: go dark to one counterpart. A TOGGLE, and pure bookkeeping —
   * no error code, the `openThread` / `declineProposal` precedent, and a
   * starId naming nothing simply resolves to nothing.
   *
   * ZERO SENDER-SIDE EFFECT, stated here because it is the whole design:
   * their send still commits, their thread still renders on their own rack,
   * their beam still lands and still lights this player's sky as a directed
   * beam. What changes is that this player's THREAD LIST stops carrying the
   * row. Nothing is notified, and nothing anywhere records that a mute
   * happened in a form the other side could ever read.
   */
  private async onMuteThread(
    conn: Connection,
    starId: string,
    muted: boolean,
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    const galaxy = this.requireGalaxy();
    const target = civAtStar(galaxy, starId);
    if (target === undefined || target.seed.id === state.civId) return;
    const run = await this.ctx.storage.get<RunRecord>(`run:${state.token}`);
    if (run === undefined) return;
    const current = run.muted ?? [];
    const next = muted
      ? current.includes(target.seed.id)
        ? current
        : [...current, target.seed.id]
      : current.filter((id) => id !== target.seed.id);
    if (next.length !== current.length) {
      const updated: RunRecord = { ...run, muted: next };
      await this.ctx.storage.put(`run:${state.token}`, updated);
    }
    // A muted thread cannot also be the open one.
    if (muted && state.openThreadStarId === starId) state.openThreadStarId = null;
    await this.sendSkyToSeat(state);
  }

  /**
   * openThread: which thread this CONNECTION is reading. Per-connection UI
   * state, no DO key, no error code — bookkeeping, the `declineProposal`
   * precedent. A starId naming no thread yields a null detail, which is also
   * what a starId naming nothing at all yields, so this cannot be used as an
   * oracle for what is out there.
   */
  private async onOpenThread(conn: Connection, starId: string | null): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    state.openThreadStarId = starId;
    await this.sendSkyToSeat(state);
  }

  /**
   * Wake the observers this act will eventually reach, at the year it
   * reaches them: the target for a hail or signal, every player-controlled
   * civ for a broadcast. A wake still only resends a sky computed through the
   * cone, so it can never surface anything early, and a dropped queue costs
   * nothing but a push the client would compute itself on its next
   * `requestSky` (onAlarm's contract).
   *
   * A2.5 extends it and does not change its nature. NO WAKE IS REQUIRED FOR
   * CORRECTNESS ANYWHERE — that sentence is the invariant, and it is why
   * calling `deriveAiSignals` from here is a read and not a write: the
   * derived arrival happens whether or not anything is queued for it, and
   * this method mutates nothing at all.
   */
  private async scheduleContactWakes(galaxy: Galaxy, act: ContactAct): Promise<void> {
    const observers: string[] =
      act.kind === "hail" || act.kind === "signal"
        ? act.toCivId === null
          ? []
          : [act.toCivId]
        : galaxy.civs
            .filter((c) => c.controller === "player" && c.seed.id !== act.fromCivId)
            .map((c) => c.seed.id);
    for (const observerId of observers) {
      const token = await this.ctx.storage.get<string>(`civToken:${observerId}`);
      if (token === undefined) continue; // never placed through a live socket
      const arrivesYear = act.sentYear + civDistanceLy(galaxy, act.fromCivId, observerId);
      await this.pushWakeEvent({
        token,
        atYear: arrivesYear + WAKE_SLOP_YEARS,
        key: `c/${act.id}/${observerId}`,
      });
    }

    // A2.5: an act aimed at a SEEDED counterpart wakes the SENDER twice over
    // — once when their own beam lands (the thread's chip flips from
    // in-flight to awaiting) and once at each derived arrival that is still
    // in the future. The counterpart itself has no token and needs none:
    // nothing is delivered to it, because nothing about it is stored.
    if (act.toCivId === null) return;
    const target = civById(galaxy, act.toCivId);
    if (target.controller !== "ai") return;
    const senderToken = await this.ctx.storage.get<string>(`civToken:${act.fromCivId}`);
    if (senderToken === undefined) return;
    const distance = civDistanceLy(galaxy, act.fromCivId, act.toCivId);
    await this.pushWakeEvents([
      {
        token: senderToken,
        atYear: act.sentYear + distance + WAKE_SLOP_YEARS,
        key: `t/${act.id}/landed`,
      },
      ...this.threadWakes(galaxy, act.fromCivId, act.toCivId, senderToken, act.sentYear),
    ]);
  }

  /**
   * The wakes one pair wants: every derived arrival still ahead of `fromYear`,
   * optionally bounded by a horizon. Idempotent by key — a derived signal's id
   * is stable across derivations, so re-pushing overwrites the entry at the
   * same id instead of growing the queue.
   *
   * PURE, and the point bears repeating: it computes a list. Its callers own
   * the single storage write, and nothing here is truth. Wipe the queue and
   * every one of these arrivals still lands, one `requestSky` later.
   */
  private threadWakes(
    galaxy: Galaxy,
    playerId: string,
    aiId: string,
    token: string,
    fromYear: number,
    horizonYears: number | null = null,
  ): { readonly token: string; readonly atYear: number; readonly key: string }[] {
    const wakes: { readonly token: string; readonly atYear: number; readonly key: string }[] = [];
    for (const signal of deriveAiSignals(galaxy, aiId, playerId)) {
      if (signal.arrivesYear <= fromYear) continue;
      if (horizonYears !== null && signal.arrivesYear > fromYear + horizonYears) continue;
      wakes.push({
        token,
        atYear: signal.arrivesYear + WAKE_SLOP_YEARS,
        key: `t/${signal.id}`,
      });
    }
    return wakes;
  }

  /**
   * The horizon pass: on every sky send, queue a wake for each derived
   * arrival within WAKE_HORIZON_YEARS. Self-healing, and the reason the queue
   * can be wiped without losing anything — the arrivals are derived, so all a
   * lost wake ever costs is a push.
   *
   * Runs over every SEEDED counterpart rather than over open threads: a
   * lantern's unprompted hail arrives before any thread exists, and a pass
   * that only looked at threads could never deliver it.
   */
  private async scheduleThreadHorizon(
    token: string,
    civId: string,
    nowYear: number,
  ): Promise<void> {
    const galaxy = this.requireGalaxy();
    const wakes = galaxy.civs
      .filter((civ) => civ.controller === "ai")
      .flatMap((civ) =>
        this.threadWakes(galaxy, civId, civ.seed.id, token, nowYear, WAKE_HORIZON_YEARS),
      );
    // ONE read-modify-write for the whole pass, and none at all when there is
    // nothing ahead.
    await this.pushWakeEvents(wakes);
  }

  // ── A5: WEB PUSH, AND THE WATCH ──────────────────────────────────────────
  //
  // THE DERIVATION DISCIPLINE IS UNCHANGED AND THIS IS THE PROOF OF IT. A
  // watch may derive the board at a year, evaluate `tripwireHolds`, decide to
  // send, send, and write down that it sent. It may NOT set `firedYear`, touch
  // `studies:${token}`, fire a standing order, or advance anything a player
  // will later read as a fact. The one key the alarm path writes is
  // `push:${token}`, which is infrastructure: a list of devices that asked to
  // be told, and the record of what they were already told about.
  //
  // The consequence that shapes the rest: THE PUSH HAPPENS BEFORE THE SETTLE.
  // The player is told a watch tripped, and only when they open the game does
  // the record of the tripping get written. That is sound only because the two
  // cannot disagree, and they cannot because `findFirings` is one function with
  // two callers — the sky settle folds its answer into `firedYear`, and the
  // watch counts it. The year on the record is the year the condition held,
  // not the year somebody looked.

  /** The constant every welcome carries: this deployment's application server
   *  key, or null when no VAPID pair is configured (the dev default, and the
   *  whole silent-absence story). */
  private pushWire(): { publicKey: string } | null {
    const publicKey = vapidPublicKey(this.env);
    return publicKey === null ? null : { publicKey };
  }

  private async loadPushState(token: string): Promise<PushState | null> {
    const stored = await this.ctx.storage.get<PushState>(`push:${token}`);
    return stored === undefined ? null : stored;
  }

  /** THE ONLY WRITER OF `push:` — and, on the alarm path, the only writer of
   *  anything at all. */
  private async savePushState(token: string, state: PushState): Promise<void> {
    await this.ctx.storage.put(`push:${token}`, state);
  }

  /**
   * pushSubscribe: this device would like to be told while its player is away.
   *
   * A REJECTED endpoint answers `push-unavailable`, because the row has to
   * flip back rather than go on claiming a watch nobody holds. A MALFORMED
   * message answers nothing at all (protocol.ts's parse layer drops it) — that
   * is bookkeeping, and an error code there would cancel a live purchase.
   */
  private async onPushSubscribe(conn: Connection, endpoint: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined) return;
    const publicKey = vapidPublicKey(this.env);
    if (publicKey === null) {
      warnPushUnconfigured();
      this.sendMsg(conn, {
        type: "error",
        code: "push-unavailable",
        message: "notifications are not configured",
      });
      return;
    }
    if (!validatePushEndpoint(endpoint)) {
      this.sendMsg(conn, {
        type: "error",
        code: "push-unavailable",
        message: "that endpoint is not a push service",
      });
      return;
    }
    const realMs = Date.now();
    const current = (await this.loadPushState(state.token)) ?? newPushState(realMs);
    const next = withSub(current, {
      id: await subIdFor(endpoint),
      endpoint,
      keyId: keyIdFor(publicKey),
      addedRealMs: realMs,
      failures: 0,
    });
    await this.savePushState(state.token, { ...next, seenRealMs: realMs });
    // The fresh sky is what flips the row: `pushSubscribed` rides `sky` and
    // only `sky`, exactly as every other piece of this seat's state does.
    if (state.civId !== null) await this.sendSkyToSeat(state);
  }

  /** pushUnsubscribe: forget this ONE endpoint. Other devices on the same seat
   *  are untouched, which is the only promise the hub row makes. Silent on an
   *  endpoint we never held: this is bookkeeping. */
  private async onPushUnsubscribe(conn: Connection, endpoint: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined) return;
    const current = await this.loadPushState(state.token);
    if (current === null) return;
    const next = withoutSub(current, await subIdFor(endpoint));
    if (next === current) return;
    await this.savePushState(state.token, next);
    if (state.civId !== null) await this.sendSkyToSeat(state);
  }

  /**
   * The three per-seat records the watch derives from, migrated in memory.
   * Null when the seat has never opened a study or started a project, which is
   * a seat with nothing to watch.
   */
  private async readWatchInputs(token: string, nowYear: number): Promise<WatchInputs | null> {
    const storedStudies = await this.ctx.storage.get<StoredStudyState>(`studies:${token}`);
    if (storedStudies === undefined) return null;
    const storedProjects = await this.ctx.storage.get<StoredProjectState>(`projects:${token}`);
    if (storedProjects === undefined) return null;
    const storedMissions = await this.ctx.storage.get<MissionState>(`missions:${token}`);
    const studyState =
      storedStudies.version === 4 ? storedStudies : migrateStudyState(storedStudies, nowYear);
    return {
      studies: studyState.studies,
      projectState:
        storedProjects.version === 3 ? storedProjects : migrateProjectState(storedProjects),
      missions: storedMissions === undefined ? [] : migrateMissionState(storedMissions).missions,
    };
  }

  /**
   * The years at which one study can change, inside `(fromYear, toYear]`.
   *
   * THE BOARD IS A STEP FUNCTION, which is the whole reason the catch-up walk
   * is cheap: between arrivals nothing about a study moves, because the
   * hypotheses move when evidence lands and evidence lands only at dated
   * years. So "was this ever true" becomes a short loop over a short list.
   *
   * Three sources, and no fourth. A landed project is deliberately NOT one: a
   * discount moves the PREVIEW of a future purchase, never a purchase already
   * made.
   */
  private studyChangePoints(
    stored: StoredStudy,
    targetCiv: PlacedCiv,
    distanceLy: number,
    missions: readonly StoredMission[],
    fromYear: number,
    toYear: number,
  ): readonly number[] {
    const points: number[] = [];
    // 1. LIGHT. The derived roster's emission epochs are already grown two
    //    eras past the present (`derivedFold`), so the future ones are
    //    computed today; an epoch reaches this observer at its own year plus
    //    the distance.
    for (const epoch of targetCiv.seed.emissionHistory) {
      points.push(epoch.fromYear + distanceLy);
    }
    // 2. ANSWERS, which are the years the questions were bought — a
    //    question answers the day it is asked (physics-audit.md P0-1).
    //    Every one of them therefore sits at or before the year the player
    //    was last here, so none can fall inside an away window; the filter
    //    below would drop them anyway, and pushing them says the step
    //    function's second source out loud.
    for (const bought of stored.bought) {
      points.push(bought.boughtYear);
    }
    // 3. REPORTS, the light-return leg already inside `expectedArrivals`.
    for (const m of missions) {
      if (m.starId !== stored.starId) continue;
      points.push(
        ...expectedArrivals(m.kind, m.launchedYear, m.distanceLy, m.flightYearsPerLy, toYear),
      );
    }

    const sorted = points
      .filter((y) => y > fromYear + YEAR_EPS && y <= toYear + YEAR_EPS)
      .sort((a, b) => a - b);
    const deduped: number[] = [];
    for (const year of sorted) {
      const last = deduped[deduped.length - 1];
      if (last !== undefined && year - last <= YEAR_EPS) continue;
      deduped.push(year);
    }
    // OLDEST-FIRST at the cap, so a later scan finds the same first firing.
    return deduped.slice(0, MAX_CHANGE_POINTS);
  }

  /** This star's mission-report moves as of `year`, and whether one of them
   *  would already have grounded the study by then. The same loop
   *  `assembleSkyState` runs, at a year that is not now. */
  private missionMovesAt(
    galaxy: Galaxy,
    civId: string,
    stored: StoredStudy,
    missions: readonly StoredMission[],
    year: number,
  ): { readonly moves: readonly StudyMove[]; readonly grounds: boolean } {
    const moves: StudyMove[] = [];
    let grounds = false;
    for (const m of missions) {
      if (m.starId !== stored.starId) continue;
      const cone = lightConeFor(galaxy, civId, m.targetCivId, year);
      const plan = resolveMissionPlan(galaxy, cone, m, year);
      if (plan === null) continue;
      const found = deriveStudyMoves(galaxy, cone, m, plan, missionArrivalYear(m), year);
      moves.push(...found);
      if (found.some((mv) => mv.arrivedYear > stored.openedYear + YEAR_EPS)) grounds = true;
    }
    return { moves, grounds };
  }

  /**
   * THE ONE FUNCTION, WITH TWO CALLERS: the sky settle (which records what it
   * finds) and the watch (which counts it). Because both walk from the arming
   * and stop at the first hit, a firing the watch observes at year Y is still
   * found by a settle at any later year Z, and the push and the record cannot
   * disagree. That property is what the whole design was for.
   *
   * PURE, and more strongly than the design asked: it touches no storage at
   * all. Everything it reads was handed in, which is how the alarm path can
   * claim, greppably, that it writes nothing but `push:`.
   */
  private findFirings(civId: string, inputs: WatchInputs, toYear: number): readonly Firing[] {
    const galaxy = this.requireGalaxy();
    const firings: Firing[] = [];

    for (const stored of Object.values(inputs.studies)) {
      // A closed study evaluates no tripwires, and a fired one is done.
      if (isClosed(stored.status)) continue;
      const armed = stored.tripwires.filter((t) => t.firedYear === null);
      if (armed.length === 0) continue;
      const targetCiv = civAtStar(galaxy, stored.starId);
      if (targetCiv === undefined) continue;
      const targetId = targetCiv.seed.id;

      const oldestArming = Math.min(...armed.map((t) => t.armedYear));
      const fromYear = Math.max(oldestArming, toYear - WATCH_SCAN_YEARS);
      const points = this.studyChangePoints(
        stored,
        targetCiv,
        civDistanceLy(galaxy, civId, targetId),
        inputs.missions,
        fromYear,
        toYear,
      );

      const remaining = new Map<TripwireKind, number>(armed.map((t) => [t.kind, t.armedYear]));
      for (const year of points) {
        if (remaining.size === 0) break;
        const observed = observeCiv(galaxy, civId, targetId, year);
        const signal = observed.signal;
        // The source is not there at that year: nothing about this study can
        // be evaluated, and nothing later can undo that.
        if (signal === null) break;
        // STOP IF THE STUDY WOULD HAVE CLOSED AT OR BEFORE THIS YEAR. A firing
        // after a closure is one the settle would refuse, so reporting it
        // would be the push claiming something the record will never carry.
        if (stored.openedClass !== null && signal.classification !== stored.openedClass) break;
        const { moves, grounds } = this.missionMovesAt(
          galaxy,
          civId,
          stored,
          inputs.missions,
          year,
        );
        if (grounds && stored.status === "open") break;

        const cone = lightConeFor(galaxy, civId, targetId, year);
        const lift = confidenceLiftAt(inputs.projectState, year);
        const source = toWireSource(
          lift > 0
            ? {
                ...observed,
                signal: { ...signal, confidence: Math.min(0.95, signal.confidence + lift) },
              }
            : { ...observed, signal },
        );
        const assembled = buildStudySnapshot(
          galaxy,
          cone,
          source,
          stored,
          year,
          inputs.projectState,
          moves,
          null,
          null,
        );

        for (const [kind, armedYear] of [...remaining]) {
          if (year <= armedYear + YEAR_EPS) continue;
          // BYTE FOR BYTE THE ARMING REFUSAL'S IDIOM (onArmTripwire): one
          // predicate serving both halves of the contract, exactly as
          // studies.ts's own comment intends.
          const holds = tripwireHolds(kind, armedYear, {
            openQuestions: assembled.snapshot.openQuestions,
            hypotheses: assembled.snapshot.hypotheses,
            signal: source.signal,
            distanceLy: cone.distanceLy,
          });
          if (!holds) continue;
          firings.push({ starId: stored.starId, kind, armedYear, firedYear: year });
          remaining.delete(kind);
        }
      }
    }
    return firings;
  }

  /** A5: `findFirings` reshaped for the settle — per star, per kind, the year
   *  the condition became true. `buildStudySnapshot` folds it in before its
   *  own now-year evaluation. */
  private firedAtMap(
    civId: string,
    inputs: WatchInputs,
    toYear: number,
  ): ReadonlyMap<string, ReadonlyMap<TripwireKind, number>> {
    const out = new Map<string, Map<TripwireKind, number>>();
    for (const firing of this.findFirings(civId, inputs, toYear)) {
      const forStar = out.get(firing.starId) ?? new Map<TripwireKind, number>();
      forStar.set(firing.kind, firing.firedYear);
      out.set(firing.starId, forStar);
    }
    return out;
  }

  /** A watch is a SINGLETON PER SEAT by construction — one id, so
   *  `pushEvents`' id-idempotency makes a reschedule a replace and the queue
   *  can never accumulate watches. */
  private buildWatchEvent(token: string, atYear: number): ScheduledEvent {
    return { id: `watch/${token}`, atYear, kind: "watch", note: "watch", token };
  }

  /**
   * The first year at which any armed, unfired tripwire could change, or the
   * backstop. Bounded by the backstop on both ends: a change point beyond a
   * real day is not worth waiting for when a wake a day costs so little.
   */
  private nextWatchYear(civId: string, inputs: WatchInputs | null, nowYear: number): number {
    const backstop = nowYear + WATCH_BACKSTOP_YEARS;
    if (inputs === null) return backstop;
    const galaxy = this.requireGalaxy();
    let soonest: number | null = null;
    for (const stored of Object.values(inputs.studies)) {
      if (isClosed(stored.status)) continue;
      if (!stored.tripwires.some((t) => t.firedYear === null)) continue;
      const targetCiv = civAtStar(galaxy, stored.starId);
      if (targetCiv === undefined) continue;
      const first = this.studyChangePoints(
        stored,
        targetCiv,
        civDistanceLy(galaxy, civId, targetCiv.seed.id),
        inputs.missions,
        nowYear,
        backstop,
      )[0];
      if (first !== undefined && (soonest === null || first < soonest)) soonest = first;
    }
    return soonest ?? backstop;
  }

  /**
   * Queue this seat's watch, on every sky send. The horizon pass's mould
   * exactly, including its self-healing property: a wiped queue costs a push
   * at most, because the next connect recreates the entry.
   *
   * THE COST GATE IS THE FIRST LINE. A player who never enables notifications
   * has no `push:` key and pays nothing at all on any sky send. Returns
   * whether this seat holds a subscription, which is what `sky` carries.
   */
  private async scheduleWatch(token: string, civId: string, nowYear: number): Promise<boolean> {
    const state = await this.loadPushState(token);
    if (state === null) return false;
    const realMs = Date.now();
    if (realMs - state.seenRealMs > SEEN_WRITE_GAP_MS) {
      await this.savePushState(token, { ...state, seenRealMs: realMs });
    }
    const inputs = await this.readWatchInputs(token, nowYear);
    await this.pushEvents([
      this.buildWatchEvent(token, this.nextWatchYear(civId, inputs, nowYear)),
    ]);
    return state.subs.length > 0;
  }

  /**
   * What a watch would do, decided and returned WITHOUT doing any of it. The
   * dev route reports this and sends nothing; `runWatch` acts on it. Sharing
   * one evaluator is what keeps the test instrument honest.
   */
  private async evaluateWatch(token: string, nowYear: number): Promise<WatchVerdict> {
    const state = await this.loadPushState(token);
    if (state === null || state.subs.length === 0) {
      // Push is off for this seat and the watch stops existing.
      return { reason: "not subscribed", firings: [], rearmYear: null, state: null };
    }
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    if (run === undefined) {
      return { reason: "not placed", firings: [], rearmYear: null, state };
    }

    // AN IN-SESSION FIRING DOES NOT PUSH. The settle runs inside the same sky
    // send that would have provoked it and flips the badge in front of them; a
    // banner over the top is the notification telling you about the thing you
    // are looking at. The permission was asked for absence, too.
    const live = [...this.conns.values()].some((c) => c.token === token && c.civId !== null);
    const inputs = await this.readWatchInputs(token, nowYear);
    const rearmYear = this.nextWatchYear(run.civId, inputs, nowYear);
    if (live) return { reason: "connection live", firings: [], rearmYear, state };

    // ONE PUSH PER ABSENCE, and the biggest saving in the design: after the
    // first push this object stops waking for this seat entirely until the
    // player comes back.
    if (state.notifiedRealMs > state.seenRealMs) {
      return { reason: "pushed this absence", firings: [], rearmYear: null, state };
    }
    // The watch's own liveness bound: an absent player's watch must not re-arm
    // forever. The next connect restarts it.
    if (Date.now() > state.seenRealMs + WATCH_MAX_REAL_MS) {
      return { reason: "absent too long", firings: [], rearmYear: null, state };
    }

    const found = inputs === null ? [] : this.findFirings(run.civId, inputs, nowYear);
    const fresh = found.filter((f) => !state.notified.includes(firingKey(f)));
    if (fresh.length === 0) {
      return {
        reason: found.length === 0 ? "no firing" : "already notified",
        firings: found,
        rearmYear,
        state,
      };
    }
    return { reason: "send", firings: fresh, rearmYear, state };
  }

  /**
   * The due watch. Returns the event to re-arm with, or null when the watch
   * stops existing for this absence.
   *
   * It RETURNS the re-arm rather than queueing it, and the caller pushes it
   * onto its own in-memory copy of the queue — the sentinel re-arm's precedent
   * at the bottom of `onAlarm`, and for the same reason: the two writes to
   * "events" in one alarm turn must not race.
   */
  private async runWatch(token: string, nowYear: number): Promise<ScheduledEvent | null> {
    const verdict = await this.evaluateWatch(token, nowYear);
    const rearm =
      verdict.rearmYear === null ? null : this.buildWatchEvent(token, verdict.rearmYear);
    if (verdict.reason !== "send" || verdict.state === null) return rearm;

    const delivered = await deliverWatch(this.env, verdict.state.subs);
    const realMs = Date.now();
    const next =
      delivered.sent > 0
        ? withNotified(
            { ...verdict.state, subs: delivered.subs },
            verdict.firings.map(firingKey),
            realMs,
          )
        : { ...verdict.state, subs: delivered.subs };
    await this.savePushState(token, next);
    console.log(
      `[cohort ${this.name}] watch pushed to ${delivered.sent} device(s) for ${verdict.firings.length} firing(s)`,
    );
    // Nothing was recorded when nothing was delivered, so a total failure
    // re-arms and the next change point is the retry. A delivered push does
    // not re-arm: one push per absence.
    return delivered.sent > 0 ? null : rearm;
  }

  /**
   * startProject: commission a project against the civ's free compute. No
   * derivation here beyond calling projects.ts functions: validate, mutate
   * state, persist, then a fresh sky.
   */
  private async onStartProject(conn: Connection, projectId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const def = projectById(projectId);
    if (def === undefined) {
      this.sendMsg(conn, { type: "error", code: "unknown-project", message: "no such project" });
      return;
    }
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const projectState = await this.loadProjectState(state.token, state.civId, nowYear);
    if (projectState.started.some((p) => p.id === def.id)) {
      this.sendMsg(conn, {
        type: "error",
        code: "already-running",
        message: "already commissioned",
      });
      return;
    }
    const free = freeComputeAt(projectState, nowYear);
    if (free < def.costCompute) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }
    const started: StartedProject[] = [
      ...projectState.started,
      { id: def.id, startedYear: nowYear },
    ];
    // Through commitCompute so the spend writes the capped-accrual anchor
    // (projects.ts v3) — the started list rides along on the same state.
    const updated: ProjectState = {
      ...commitCompute(projectState, def.costCompute, nowYear),
      started,
    };
    await this.saveProjectState(state.token, updated);
    await this.sendSkyToSeat(state);
  }

  /**
   * Key changed from `cases:${token}` at the case→study rename (A2.1 had
   * just shipped and the tap bug meant no studies were ever opened in
   * production, so no migration shim is needed for THAT rename). A2.2 adds
   * a real v1→v2 migration (studies.ts's migrateStudyState, loadProjectState's
   * exact idiom): every study gains an empty `bought[]`. A2.2b's v3 added
   * `openedYear`; A2.3's v4 adds the exit fields.
   */
  private async loadStudyState(token: string, nowYear: number): Promise<StudyState> {
    const stored = await this.ctx.storage.get<StoredStudyState>(`studies:${token}`);
    if (stored === undefined) return newStudyState();
    if (stored.version === 4) return stored;
    const migrated = migrateStudyState(stored, nowYear);
    await this.ctx.storage.put(`studies:${token}`, migrated);
    return migrated;
  }

  private async saveStudyState(token: string, state: StudyState): Promise<void> {
    await this.ctx.storage.put(`studies:${token}`, state);
  }

  /** A run placed before A2.2 has no stored mission state: lazily create one. */
  private async loadMissionState(token: string): Promise<MissionState> {
    const stored = await this.ctx.storage.get<MissionState>(`missions:${token}`);
    if (stored === undefined) return newMissionState();
    return migrateMissionState(stored);
  }

  private async saveMissionState(token: string, state: MissionState): Promise<void> {
    await this.ctx.storage.put(`missions:${token}`, state);
  }

  /**
   * A4: what a standing order is allowed to look at — this player's OWN
   * VISIBLE SKY, mapped one for one. `lightHistory` is the clipped history
   * `observeCiv` already produced, so an order can fire only on light that has
   * arrived, and `targetCivId` rides along because the dispatch has to be
   * aimed at whoever was there when it left (`StoredMission.targetCivId`'s own
   * rule). There is no other source of candidates and there is deliberately no
   * parameter that could widen this.
   */
  private orderCandidatesFrom(
    visible: ReturnType<typeof visibleSky>,
  ): readonly OrderCandidate[] {
    return visible.map((o) => ({
      starId: o.starId,
      targetCivId: o.targetId,
      distanceLy: o.distanceLy,
      lightHistory: o.signal.lightHistory,
    }));
  }

  /** The same candidates for a caller that has not already walked the sky —
   *  the arming handler, which needs the condition and nothing else. */
  private orderCandidates(
    galaxy: Galaxy,
    civId: string,
    nowYear: number,
  ): readonly OrderCandidate[] {
    return this.orderCandidatesFrom(visibleSky(galaxy, civId, nowYear));
  }

  /** A4: a run placed before this stage has armed nothing, which is the whole
   *  migration (loadVoiceState's pure-read idiom — nothing to anchor, so a
   *  missing record is simply the empty default). */
  private async loadOrderState(token: string): Promise<OrderState> {
    const stored = await this.ctx.storage.get<OrderState>(`orders:${token}`);
    return stored === undefined ? newOrderState() : migrateOrderState(stored);
  }

  private async saveOrderState(token: string, state: OrderState): Promise<void> {
    await this.ctx.storage.put(`orders:${token}`, state);
  }

  /**
   * A4: THE LATCHES, and nothing else. Everything else on a Ledger row derives
   * from the launch record and the light on every read; what is stored here is
   * the year the parent first concluded something, which no derivation can
   * recover because the conclusion is not in the light. Pure read, and the
   * write below happens only on a transition.
   */
  private async loadLedgerState(token: string): Promise<LedgerState> {
    const stored = await this.ctx.storage.get<LedgerState>(`ledger:${token}`);
    return stored === undefined ? newLedgerState() : migrateLedgerState(stored);
  }

  private async saveLedgerState(token: string, state: LedgerState): Promise<void> {
    await this.ctx.storage.put(`ledger:${token}`, state);
  }

  /**
   * AV1: a run placed before this stage has no stored voice record, which
   * means it has seen none of the one-time lines — accepted, deliberately:
   * all four fire once for a pre-AV1 run, same as a brand-new one. Pure
   * read; a missing record is NOT written back here (sendVoice writes only
   * once a line has actually been sent). Stored keys are filtered through
   * isVoiceKey for forward-compat hygiene (a future VoiceKey removal must
   * not leave a stale value crashing this read).
   */
  private async loadVoiceState(token: string): Promise<VoiceState> {
    const stored = await this.ctx.storage.get<VoiceState>(`voice:${token}`);
    if (stored === undefined) return { version: 1, seen: [] };
    return { version: 1, seen: stored.seen.filter(isVoiceKey) };
  }

  private async saveVoiceState(token: string, state: VoiceState): Promise<void> {
    await this.ctx.storage.put(`voice:${token}`, state);
  }

  /**
   * AV3: a run placed before this stage has no stored proposal record,
   * which means it has declined nothing — accepted, deliberately: a
   * pre-AV3 token sees proposals on its very next sky. Pure read, exactly
   * loadVoiceState's idiom above (not loadReportState's lazy-create-and-
   * persist): there is nothing here to anchor at first read, so a missing
   * record is simply the empty default and the first decline is the first
   * write.
   */
  private async loadProposalState(token: string): Promise<ProposalState> {
    const stored = await this.ctx.storage.get<ProposalState>(`proposals:${token}`);
    if (stored === undefined) return { version: 1, declined: [] };
    return stored;
  }

  private async saveProposalState(token: string, state: ProposalState): Promise<void> {
    await this.ctx.storage.put(`proposals:${token}`, state);
  }

  /**
   * AV2: unlike loadVoiceState's pure read, a missing report record is
   * created AND PERSISTED here, immediately (loadProjectState's
   * lazy-create-and-persist-once idiom, not loadVoiceState's). `sinceYear`
   * must be fixed the first time anything ever asks for this token's
   * report — a run that is re-queried before it first WRITES (every
   * materialize call finding nothing new yet to store) would otherwise
   * re-synthesize a fresh default anchored to the CURRENT `nowYear` on
   * every call, silently losing anything stamped between one such call and
   * the next. Pre-AV2 runs and brand-new ones are identical here: both
   * start with an empty record from the moment they are first read.
   */
  private async loadReportState(token: string, nowYear: number): Promise<ReportState> {
    const stored = await this.ctx.storage.get<ReportState>(`report:${token}`);
    if (stored !== undefined) return stored;
    const fresh = newReportState(nowYear);
    await this.ctx.storage.put(`report:${token}`, fresh);
    return fresh;
  }

  private async saveReportState(token: string, state: ReportState): Promise<void> {
    await this.ctx.storage.put(`report:${token}`, state);
  }

  /**
   * AV1: send the lines this player has not yet been shown — arrival (this
   * civ's archetype), and the frame explainers (age chip, compute, clock,
   * epoch, silence). Sent on placement only, right before that path's sendSky —
   * never from sendSky itself, which repeats on every alarm-driven resend
   * and every verb; the voice message would otherwise replay endlessly.
   * Sends `{ type: "voice", lines }` even when `lines` is empty: one
   * deterministic contract, the payload always REPLACES what the client
   * holds rather than patching it.
   */
  private async sendVoice(conn: Connection, token: string, civId: string): Promise<void> {
    const galaxy = this.requireGalaxy();
    const selfCiv = civById(galaxy, civId);
    const voiceState = await this.loadVoiceState(token);
    const seen = new Set(voiceState.seen);
    const lines: Partial<Record<VoiceKey, string>> = {};
    if (!seen.has("arrival")) lines.arrival = arrivalLine(selfCiv.seed.archetype);
    if (!seen.has("age")) lines.age = ageChipLine();
    if (!seen.has("compute")) lines.compute = computeLine();
    if (!seen.has("clock")) lines.clock = clockLine();
    // AV2: the epoch-dating explainer — the client shows it once, on the
    // first report open (the report is where "year n AE" first appears).
    if (!seen.has("epoch")) lines.epoch = epochLine();
    // The Fermi stance — shown once, on a source card, after the age-chip
    // line has been taken (act3-design.md, *The silence, kept*).
    if (!seen.has("silence")) lines.silence = silenceLine();
    this.sendMsg(conn, { type: "voice", lines });
  }

  /**
   * AV2: send this player's report. Always materializes first (via
   * `materializeReport`, self-sufficient — see its own comment) so a
   * standalone call (requestReport, or a placement path that fires before
   * `sendSky` has run this turn) still reflects everything derivable as of
   * `nowYear`, not just whatever a PRIOR sendSky call happened to persist.
   *
   * `advance` is true only on placement paths (the sendVoice precedent):
   * the payload is built against the OLD `lastServedYear` — newCount,
   * spanYears, and the promoted entry all read it — and ONLY THEN, if
   * `advance`, is the marker moved to `nowYear`. Moving it first would make
   * every report open report zero new entries against itself.
   */
  private async sendReport(
    conn: Connection,
    token: string,
    civId: string,
    opts: { readonly advance: boolean },
  ): Promise<void> {
    const galaxy = this.requireGalaxy();
    const clock = this.requireClock();
    const nowYear = gameYearAt(clock, Date.now());
    const selfCiv = civById(galaxy, civId);

    const state = await this.materializeReport(token, civId, nowYear);
    const connState = this.conns.get(conn.id);
    // A same-session refresh serves against the placement serve's baseline,
    // not the stored marker (which the placement serve already advanced) —
    // otherwise the first reopen would erase the header and remark the
    // session was just served.
    const baseline =
      !opts.advance && connState !== undefined && connState.reportBaselineYear !== null
        ? { ...state, lastServedYear: connState.reportBaselineYear }
        : state;
    const payload = buildReportPayload(baseline, nowYear, selfCiv.seed.archetype);
    // AV4: a DECORATION on an already-complete payload. Flag off, no accepted
    // pool, or any failure and this returns `payload` by identity, so what
    // ships is AV2's bytes.
    const decorated = await this.decorateReport(token, state, payload);
    this.sendMsg(conn, { type: "report", report: decorated });

    if (opts.advance) {
      if (connState !== undefined) connState.reportBaselineYear = state.lastServedYear;
      await this.saveReportState(token, { ...state, lastServedYear: nowYear });
    }
  }

  /**
   * AV2: derive report candidates, merge them into the stored record, and
   * persist ONLY IF THE STORED ID SET CHANGED (mergeReportEntries's
   * `changed` flag — the common case, a sendSky call with nothing newly
   * stampable, costs no write).
   *
   * `snapshots`, when given, lets sendSky hand in the studies/missions/
   * projects/sources it has ALREADY assembled this turn rather than paying
   * for a second `assembleSkyState` pass. When omitted (every OTHER caller
   * — sendReport's placement-path and requestReport calls), this method
   * assembles them itself via `reportDerivationSnapshots`, so it never
   * depends on sendSky having run first in the same turn: "materialize
   * inside sendReport too" from the two options the brief posed, chosen
   * over "send report after sendSky" because it keeps every call site
   * self-sufficient regardless of ordering, at the cost of that one
   * optional extra assembly pass when sendSky is NOT the caller.
   */
  private async materializeReport(
    token: string,
    civId: string,
    nowYear: number,
    snapshots?: Omit<DeriveReportEntriesInput, "nowYear" | "sinceYear">,
  ): Promise<ReportState> {
    const inputs = snapshots ?? (await this.reportDerivationSnapshots(token, civId, nowYear));
    const state = await this.loadReportState(token, nowYear);
    const derived = deriveReportEntries({ ...inputs, nowYear, sinceYear: state.sinceYear });
    const attempt = mergeReportEntries(state, derived);
    if (!attempt.changed) return state;

    // WRITE ONLY IF CHANGED, the grounding-write idiom (sendSky's
    // `groundedWrites`): re-fetch immediately before the put and re-merge
    // against whatever is ACTUALLY stored now, so a write interleaved by
    // another await earlier in this same turn is folded in rather than
    // clobbered — interleave hygiene, not a race guard (the DO itself is
    // single-threaded; nothing here is ever concurrent with itself).
    const fresh = await this.loadReportState(token, nowYear);
    const final = mergeReportEntries(fresh, derived);
    if (!final.changed) return fresh;
    await this.saveReportState(token, final.state);
    // AV4 tenant 1's kick site: an entry was actually stored, so the family it
    // belongs to may want a pool. Never awaited, and at most one call per
    // (token, family) per prompt version, ever.
    this.kickRemarkPools(token, civId, derived);
    return final.state;
  }

  // ── AV4 — the generated voice ─────────────────────────────────────────
  // Three small seams, and nothing else in this file changes. report.ts,
  // proposals.ts and voice.ts are untouched: generation is applied to a
  // payload those modules already finished, so the flag-off path is their
  // code byte for byte.

  private genDeps(): GenDeps {
    return {
      env: this.env,
      storage: this.ctx.storage,
      waitUntil: (promise) => {
        this.ctx.waitUntil(promise);
      },
    };
  }

  /**
   * This player's own civilization, in words. Assembled HERE because the two
   * catalog reads it needs — minds.ts's §8-pinned archetype name and dials.ts's
   * pinned label pairs — are off voicegen.ts's R-37 allowlist, and hand-copying
   * either into that module would fork the pinned vocabulary. The dial LEAN is
   * a word derived from the sign of the position; the position itself never
   * leaves this method.
   */
  private mindSurfaceFor(seed: CivSeed): MindSurface {
    const dialLines = DIAL_AXES.map((axis) => {
      const setting = seed.dials[axis.id];
      const pair = `${axis.left.inWorld} · ${axis.right.inWorld}`;
      if (setting.position === 0) return `${pair}, balanced`;
      const pole = setting.position < 0 ? axis.left.inWorld : axis.right.inWorld;
      return `${pair}, leans ${pole}`;
    });
    return {
      archetype: seed.archetype,
      archetypeName: archetypeById(seed.archetype).name,
      charter: seed.charter,
      posture: seed.posture,
      dialLines,
      chronicle: seed.chronicle,
    };
  }

  /**
   * The swap-in. `buildReportPayload` already attached the templated remark to
   * exactly one entry (R-31), so the entry to decorate is simply the one whose
   * `remark` is non-null; its family comes off the stored entry it was built
   * from. The pick over the generated pool is `reportRemark`'s own — the same
   * `createRng("remark/" + entryId)` draw — so a re-read is byte-identical and
   * the generated pool behaves exactly like the shipped one.
   */
  private async decorateReport(
    token: string,
    state: ReportState,
    payload: ReportPayload,
  ): Promise<ReportPayload> {
    if (!remarksEnabled(this.env)) return payload;
    const promoted = payload.entries.find((e) => e.remark !== null);
    if (promoted === undefined) return payload;
    const family = remarkFamilyOf(state, promoted.id);
    if (family === null) return payload;
    const pool = await this.gen.remarkPool(this.genDeps(), token, family);
    if (pool === null) return payload;
    const remark = createRng(`remark/${promoted.id}`).pick(pool);
    const entries: readonly ReportEntry[] = payload.entries.map((e) =>
      e.id === promoted.id ? { ...e, remark } : e,
    );
    return { ...payload, entries };
  }

  private kickRemarkPools(
    token: string,
    civId: string,
    derived: readonly StoredReportEntry[],
  ): void {
    if (!remarksEnabled(this.env)) return;
    const families: RemarkFamily[] = [];
    for (const entry of derived) {
      const family = asRemarkFamily(entry.family);
      if (family !== null) families.push(family);
    }
    if (families.length === 0) return;
    const seed = civById(this.requireGalaxy(), civId).seed;
    this.gen.kickRemarkPools(this.genDeps(), token, this.mindSurfaceFor(seed), families);
  }

  /** The report's own, self-sufficient assembly of everything
   *  `deriveReportEntries` needs, for callers that are not sendSky (which
   *  already has all of this from its own `assembleSkyState` call). */
  private async reportDerivationSnapshots(
    token: string,
    civId: string,
    nowYear: number,
  ): Promise<Omit<DeriveReportEntriesInput, "nowYear" | "sinceYear">> {
    const assembled = await this.assembleSkyState(token, civId, nowYear);
    return {
      studies: assembled.studies,
      missions: assembled.missions,
      voyages: assembled.voyages,
      ledger: assembled.ledger,
      projects: assembled.projects,
      sources: assembled.sources,
      localNames: assembled.localNames,
      designations: assembled.designations,
      ascensionYear: assembled.self.seed.ascensionYear,
    };
  }

  /**
   * A run placed before A2.2 has no stored project state: lazily create one
   * (via newProjectState, seeded from the civ's energy ladder) when absent,
   * and persist it once so the opening-allocation/base-grant clock doesn't
   * restart on every read.
   *
   * A run placed before the instrument-hours→compute rename has state in the
   * v1 shape: migrate it and persist once, so the civ keeps its exact
   * position (the rename was nominal — same numbers, same rates). A pure
   * read that finds current-shape state never writes it back.
   */
  private async loadProjectState(
    token: string,
    civId: string,
    nowYear: number,
  ): Promise<ProjectState> {
    const stored = await this.ctx.storage.get<StoredProjectState>(`projects:${token}`);
    if (stored !== undefined) {
      if (stored.version === 3) return stored;
      const migrated = migrateProjectState(stored);
      await this.ctx.storage.put(`projects:${token}`, migrated);
      return migrated;
    }
    const galaxy = this.requireGalaxy();
    const civ = civById(galaxy, civId);
    const fresh = newProjectState(nowYear, civ.seed.ladders.energy);
    await this.ctx.storage.put(`projects:${token}`, fresh);
    return fresh;
  }

  private async saveProjectState(token: string, state: ProjectState): Promise<void> {
    await this.ctx.storage.put(`projects:${token}`, state);
  }

  /**
   * Seed a fresh production cohort on first contact. Idempotent (returns if
   * already seeded); the DO is single-threaded so no lock is needed. Mirrors
   * devSeed with no request body.
   */
  private async ensureSeeded(): Promise<void> {
    if (this.storedGalaxy !== null) return;
    const seedKey = `cohort-${this.name}`;
    const config: GalaxyConfig = {
      radiusLy: Math.min(30, DEFAULT_GALAXY_CONFIG.radiusLy),
      aiCivCount: DEFAULT_GALAXY_CONFIG.aiCivCount,
    };
    const clock = newClock(Date.now());
    const galaxy = generateGalaxy(createRng(seedKey), seedKey, config, 0);
    this.clock = clock;
    this.storedGalaxy = galaxy;
    this.derivedMemo = null;
    await this.ctx.storage.put("clock", clock);
    await this.ctx.storage.put("galaxy:meta", { seedKey, config } satisfies GalaxyMeta);
    await this.ctx.storage.put("galaxy:stars", galaxy.stars);
    await this.saveGalaxyCivs(galaxy.civs);
    // A2.4: written explicitly at seed time so a re-seed cannot inherit the
    // previous galaxy's contact log. `onStart` still tolerates its absence.
    await this.ctx.storage.put("galaxy:acts", galaxy.acts);
    // A4, the same reason one act later: a re-seed must not inherit the
    // previous galaxy's foundings, whose stars no longer mean anything.
    await this.saveVoyageState(newVoyageState());
    await this.ctx.storage.put("events", []);
    await this.ctx.storage.put("eventLog", []);
  }

  /**
   * The player's whole sky in one message: their own present-tense SelfView,
   * plus the ONLY other-civ data on the wire — visibleSky mapped through
   * toWireSource, so the client sky is byte-identical to /dev/observe for the
   * same pair (same code path), except for the confidence-lift step below.
   * localNames are the owner's private labels.
   *
   * A2.2 additions: `missions`, `tend`, and `probeFlightYearsPerLy`, and a
   * confidence-lift pass over every source's signal BEFORE it feeds
   * studies/questions/wire — landed `confidence-lift` projects raise the
   * FLOOR under `confidenceFor`'s output, never the value, and the lift is
   * still clamped to ≤0.95 (synthesis.md §4). This is the one call site.
   *
   * AV2: the report is materialized right after `assembleSkyState` returns
   * — everything `deriveReportEntries` needs (studies/missions/projects/
   * sources/localNames/designations) is already in scope here, so this
   * call site hands it straight to `materializeReport` rather than paying
   * for a second assembly pass (see materializeReport's own comment on why
   * that second pass exists at all for OTHER callers).
   */
  private async sendSky(conn: Connection, token: string, civId: string): Promise<void> {
    const clock = this.requireClock();
    const nowYear = gameYearAt(clock, Date.now());
    const {
      self,
      sources,
      localNames,
      studies,
      missions,
      voyages,
      survey,
      ledger,
      projects,
      projectState,
      designations,
      contact,
    } = await this.assembleSkyState(
      token,
      civId,
      nowYear,
      this.conns.get(conn.id)?.openThreadStarId ?? null,
    );

    // A2.5, THE HORIZON PASS. Self-healing delivery: every derived arrival
    // inside WAKE_HORIZON_YEARS gets a wake on every sky send, so a player
    // returning after a week gets everything on their first sky whatever the
    // queue did or did not survive. It runs over every seeded counterpart and
    // not merely over open threads, because a lantern's unprompted hail is
    // the one arrival that exists before any thread does.
    await this.scheduleThreadHorizon(token, civId, nowYear);

    // A5, THE WATCH, beside the horizon pass and self-healing the same way:
    // every sky send recreates this seat's one watch entry, so a wiped queue
    // costs a push at most. The cost gate is inside — a seat with no `push:`
    // key returns before reading anything else.
    const pushSubscribed = await this.scheduleWatch(token, civId, nowYear);

    const budget: ComputeBudget = {
      free: freeComputeAt(projectState, nowYear),
      ratePerYear: ratePerYearAt(projectState, nowYear),
      cap: attentionCapAt(projectState, nowYear),
      asOfYear: nowYear,
    };
    const tend = buildTendList({
      nowYear,
      projectState,
      studies,
      missions,
      voyages,
      localNames,
      designations,
    });
    const probeFlightYearsPerLy = effectiveFlightYearsPerLy(projectState, nowYear);

    // AV3: enumerate + serve this player's proposals with everything else
    // this sky send has already assembled — proposals ride `sky` and only
    // `sky` (av3-design.md §4), so they can never contradict the
    // budget/studies shown beside them. loadProposalState is a pure read
    // (loadVoiceState's idiom): a pre-AV3 token has simply declined
    // nothing yet.
    const proposalState = await this.loadProposalState(token);
    const ranked = enumerateProposals({
      sources,
      studies,
      missions,
      projects,
      budget,
      localNames,
      designations,
      probeFlightYearsPerLy,
      declined: new Set(proposalState.declined),
    });
    const proposals = serveProposals(ranked);

    // AV4 tenant 2, conservative mode: the floor picked and served above,
    // untouched. This reads the cached counsel record and attaches a stance to
    // the row the floor already leads with — the row the model was told about
    // and wrote for, so the stance never speaks for a move that is not on
    // screen. It NEVER awaits the API: the read is memory or storage, and the
    // kick is fired after the message is on the wire.
    // The flag test is here rather than only inside the seam so a flag-off
    // send does not even build a payload surface it will not use.
    const counsel = counselEnabled(this.env)
      ? await this.gen.counselFor(
          this.genDeps(),
          token,
          this.mindSurfaceFor(self.seed),
          ranked,
          proposals,
          async () => {
            await this.resendSkyTo(token);
          },
        )
      : { proposals, kick: (): void => undefined };

    await this.materializeReport(token, civId, nowYear, {
      studies,
      missions,
      voyages,
      ledger,
      projects,
      sources,
      localNames,
      designations,
      ascensionYear: self.seed.ascensionYear,
    });

    this.sendMsg(conn, {
      type: "sky",
      nowYear,
      self,
      sources,
      localNames,
      studies,
      projects,
      budget,
      missions,
      tend,
      probeFlightYearsPerLy,
      proposals: counsel.proposals,
      contact,
      voyages,
      survey,
      ledger,
      pushSubscribed,
    });

    // AFTER the send, always. Generation is considered only once the message
    // has left, which is what makes "the hot path never awaits the API" a
    // property of the ordering rather than of the timing.
    counsel.kick();
  }

  /**
   * AV4's acceptance push, on `onAlarm`'s precedent: an alarm's only effect is
   * already to resend the sky, because the sky is derived at read time and a
   * resend can never be a source of truth. A counsel record that would change
   * what a live connection sees gets the same treatment — `sendSky` is
   * event-driven, so "the next sky serves it" can otherwise mean "next
   * session". Nothing else pushes: the report waits to be read.
   */
  private async resendSkyTo(token: string): Promise<void> {
    const live = [...this.conns.values()].filter((c) => c.token === token && c.civId !== null);
    for (const c of live) {
      if (c.civId === null) continue; // filtered above; re-checked for narrowing
      await this.sendSky(c.conn, c.token, c.civId);
    }
  }

  /**
   * A2.6: THE SEAT, NOT THE SOCKET. Every handler that changes a player's own
   * state ends here rather than in a bare `sendSky`, and this sends to every
   * live connection on the same seat.
   *
   * The ruling behind it is that two devices on one account BOTH STAY LIVE.
   * Kicking the older one would be the easy implementation and the hostile
   * one: two anonymous tabs have always worked, the object is single-threaded
   * so there is no state to race, and the cadence of this game is slow enough
   * that "signed in somewhere else" is not information anyone needs. What the
   * fan-out buys is that the phone in the other hand is not stale — without
   * it, device B self-heals on its next visibility change and looks broken
   * until then.
   *
   * Each connection still gets its OWN sky: `sendSky` reads that connection's
   * open thread, so per-connection view state survives the fan-out.
   */
  private async sendSkyToSeat(state: ConnState): Promise<void> {
    await this.resendSkyTo(state.token);
  }

  /**
   * The wire-snapshot assembly `sendSky` sends and AV2's `materializeReport`
   * derives from — split out so both can reach it without either depending
   * on the other having already run this turn. Owns the one side effect in
   * this whole pipeline (`studyWrites`: a study CHANGING STATE while nobody
   * asked it to is a write, not a pure derivation — see the comment at that
   * block). One merged map, one save, however many studies moved.
   */
  private async assembleSkyState(
    token: string,
    civId: string,
    nowYear: number,
    /** A2.5: which thread the ASKING CONNECTION has open. Defaults to null,
     *  so every caller that is not serving a socket (AV2's report
     *  materialization) pays for no detail it would not render. */
    openThreadStarId: string | null = null,
  ): Promise<{
    readonly self: SelfView;
    readonly sources: readonly DetectedSource[];
    readonly localNames: Readonly<Record<string, string>>;
    readonly studies: readonly StudySnapshot[];
    readonly missions: readonly MissionSnapshot[];
    readonly voyages: readonly VoyageSnapshot[];
    readonly survey: readonly SurveyRow[];
    readonly ledger: LedgerWire;
    readonly projects: readonly ProjectSnapshot[];
    readonly projectState: ProjectState;
    readonly designations: Readonly<Record<string, string>>;
    readonly contact: ContactWire;
  }> {
    // A4: ONE fold per assembly, and it carries both halves — the roster every
    // read below sees, and the per-voyage outcomes the snapshots need. Taking
    // them separately would fold twice and could, across a landfall year
    // boundary, fold two different rosters into one sky.
    const fold = this.derivedFold();
    const galaxy = fold.galaxy;
    const selfCiv = civById(galaxy, civId);
    const star = starById(galaxy.stars, selfCiv.starId);
    const self: SelfView = {
      civId,
      seed: selfCiv.seed,
      starId: star.id,
      designation: star.designation,
      position: star.position,
    };

    const projectState = await this.loadProjectState(token, civId, nowYear);
    const confidenceLift = confidenceLiftAt(projectState, nowYear);
    // ONE WALK OF THE SKY, two readers: the wire sources below, and the
    // standing order's candidates further down. The order reads the raw
    // observation (it needs the target's id to aim a dispatch) and the wire
    // reads the narrowed one, which is the boundary that has always been
    // there — `toWireSource` drops `targetId` and this does not put it back.
    const visible = visibleSky(galaxy, civId, nowYear);
    const sources: DetectedSource[] = visible.map((o) =>
      toWireSource(
        confidenceLift > 0
          ? { ...o, signal: { ...o.signal, confidence: Math.min(0.95, o.signal.confidence + confidenceLift) } }
          : o,
      ),
    );
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    const localNames = run?.localNames ?? {};

    const missionState = await this.loadMissionState(token);

    // Join this player's stored studies against the currently visible sources:
    // a stored study whose source isn't visible right now is simply omitted
    // (forward-safe default for A2.3's overtaken). Sorted by starId for a
    // deterministic payload order. Each study needs a LightCone (for
    // questions.ts's resolveQuestion) and this star's mission-report
    // StudyMoves (missions.ts's deriveStudyMoves — studies.ts never imports
    // missions.ts, so those moves are built here and handed in).
    const studyState = await this.loadStudyState(token, nowYear);
    // A2.2b: a study grounds when a mission report reaches home after the
    // study was last opened. The decision lives HERE, not in studies.ts —
    // that module still cannot tell an answer from a report (systems-a.md
    // §2.5, §11), so the one place that knows a move came from a probe is
    // the place that built it from missions.ts. The transition is a write:
    // derived grounding would re-close the study the instant it was
    // reopened, since the report never goes away.
    //
    // A2.3 widens that one write into `studyWrites` — the same map, the same
    // single save, now carrying three more kinds of state change that a sky
    // send can discover: an overtaking, a tripwire firing, and the
    // `openedClass` back-fill for studies migrated from before that field
    // existed. Every one of them has the same shape of reason as grounding:
    // it must be written, because re-deriving it later would either repeat
    // it forever or lose it entirely.
    // A5, THE CATCH-UP WALK, and it is the tripwire bullet rather than scope
    // creep: a condition that held while nobody was looking has fired, and an
    // order that only fires if you are present at the instant it holds is
    // exactly the neglect "close the tab for a week" rejects. Two of the three
    // conditions are not monotone, so before this a condition that came and
    // went across an absence was simply never recorded.
    //
    // It is also what makes the push honest. The SAME `findFirings` answers
    // both the phone and this record, so the year on `firedYear` is the year
    // the condition held, and a player who opens the game after a buzz cannot
    // find a board with nothing on it.
    //
    // Costs nothing for a study with nothing armed, which is nearly all of
    // them: the walk skips them before it derives anything.
    const firedAt = this.firedAtMap(
      civId,
      { studies: studyState.studies, missions: missionState.missions, projectState },
      nowYear,
    );

    let studyWrites: Record<string, StoredStudy> | null = null;
    const noteWrite = (settled: StoredStudy): void => {
      studyWrites = { ...(studyWrites ?? studyState.studies), [settled.starId]: settled };
    };
    const studies: StudySnapshot[] = Object.values(studyState.studies)
      .map((stored) => {
        const source = sources.find((s) => s.starId === stored.starId);
        const targetCiv = civAtStar(galaxy, stored.starId);
        if (source === undefined || targetCiv === undefined) return null;
        const cone = lightConeFor(galaxy, civId, targetCiv.seed.id, nowYear);
        const missionMoves: StudyMove[] = [];
        let grounding: StudyGrounding | null = null;
        for (const m of missionState.missions) {
          if (m.starId !== stored.starId) continue;
          const mCone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
          const plan = resolveMissionPlan(galaxy, mCone, m, nowYear);
          if (plan === null) continue;
          const moves = deriveStudyMoves(
            galaxy,
            mCone,
            m,
            plan,
            missionArrivalYear(m),
            nowYear,
          );
          missionMoves.push(...moves);
          for (const move of moves) {
            if (move.arrivedYear <= stored.openedYear + YEAR_EPS) continue;
            if (grounding !== null && move.arrivedYear <= grounding.arrivedYear) continue;
            grounding = {
              missionId: m.id,
              reportId: move.id,
              missionName: missionProseName(m.kind),
              asOfYear: move.asOfYear,
              lightAgeYears: nowYear - move.asOfYear,
              arrivedYear: move.arrivedYear,
            };
          }
        }

        // Only an OPEN study grounds: a shelved vigil is passive, and an
        // already-grounded one keeps the grounding it has.
        const grounds = stored.status === "open" && grounding !== null;

        // A2.3, the overtaken exit: the source is no longer the kind of
        // thing this study was opened on. GROUNDED WINS A TIE — a probe was
        // physically there, and the sky merely changed its mind about what
        // it is looking at, so a report landing in the same settle as a
        // class change closes the study the stronger way.
        //
        // A null `openedClass` (a study migrated from before the field) can
        // never overtake; it is back-filled to the current class just below,
        // and starts measuring from there.
        //
        // The detection-floor drop is deliberately NOT a trigger. It is
        // unreachable in v1 anyway (a dark civ's emission levels pass
        // detectableAt at every in-field distance), and the existing behavior
        // for a source that vanishes is to omit the study silently, which stays.
        const overtakes =
          !grounds &&
          stored.status === "open" &&
          stored.openedClass !== null &&
          stored.openedClass !== source.signal.classification;

        let settled: StoredStudy = stored;
        let overtaking: OvertakingTrigger | null = null;
        if (grounds) {
          settled = { ...stored, status: "grounded" };
        } else if (overtakes && stored.openedClass !== null) {
          settled = { ...stored, status: "overtaken" };
          overtaking = {
            fromClass: stored.openedClass,
            toClass: source.signal.classification,
            atYear: nowYear,
            asOfYear: nowYear - cone.distanceLy,
          };
        } else if (stored.openedClass === null && !isClosed(stored.status)) {
          // The back-fill. Not a state change and not visible anywhere: it
          // only gives a legacy study the baseline every new study is
          // stamped with, so the NEXT class change is a real one. A CLOSED
          // study is left byte-identical — it can never overtake, so it has
          // nothing to measure, and "a closed study does not change" is
          // worth more than a field it will never read.
          settled = { ...stored, openedClass: source.signal.classification };
        }

        const assembledStudy = buildStudySnapshot(
          galaxy,
          cone,
          source,
          settled,
          nowYear,
          projectState,
          missionMoves,
          settled.status === "grounded" ? grounding : null,
          overtaking,
          firedAt.get(stored.starId) ?? null,
        );

        // One write per study, merged from every transition this send found:
        // the status flip, the frozen overtaking, and any tripwire that fired
        // while the board was being assembled.
        const fired = assembledStudy.tripwires !== settled.tripwires;
        if (settled !== stored || overtaking !== null || fired) {
          noteWrite({
            ...settled,
            tripwires: assembledStudy.tripwires,
            overtaken: assembledStudy.overtaken ?? settled.overtaken,
          });
        }
        return assembledStudy.snapshot;
      })
      .filter((s): s is StudySnapshot => s !== null)
      .sort((a, b) => a.starId.localeCompare(b.starId));

    if (studyWrites !== null) {
      await this.saveStudyState(token, { version: 4, studies: studyWrites });
    }

    // ── A4: THE STANDING ORDERS, AND THE LEDGER ──────────────────────────
    //
    // SITED HERE ON PURPOSE: after the sources (an order may only fire on
    // light this send has already accepted as arrived) and before the missions
    // (a dispatch launched by an order is on this same sky, not the next one).
    //
    // THIS IS THE ONLY PLACE AN ORDER EVER FIRES. Not `onAlarm` — an alarm is
    // a wake-up and never truth, and an order firing there would be a truth
    // write performed by the queue. The cost of that choice is stated in the
    // design and accepted: an order settles on the next sky assembly rather
    // than the instant the condition held, so the record carries the light's
    // age and lets the player do the arithmetic.
    //
    // `orderWrites` and `ledgerWrites` below are `studyWrites`' mould, one
    // identity test each: the settle returns the SAME ARRAY when nothing fired
    // and `buildLedger` the SAME STATE when nothing crossed, so the ordinary
    // send — which is almost every send — costs no write at all.
    const storedOrders = await this.loadOrderState(token);
    let missionsNow = missionState;
    let projectStateNow = projectState;
    const orderMissionKinds = new Set(ORDER_CLASSES.map((c) => c.missionKind));
    const liveOnStarIds = new Set<string>(
      missionState.missions
        .filter((m) => {
          if (!orderMissionKinds.has(m.kind)) return false;
          const cone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
          const snapshot = toMissionSnapshot(galaxy, cone, m, nowYear);
          return (
            snapshot.state === "in-flight" ||
            snapshot.state === "beyond-horizon" ||
            snapshot.state === "awaiting-light" ||
            snapshot.state === "standing"
          );
        })
        .map((m) => m.starId),
    );
    const orderSettle = settleStandingOrders({
      orders: storedOrders.orders,
      candidates: this.orderCandidatesFrom(visible),
      nowYear,
      freeCompute: freeComputeAt(projectState, nowYear),
      missionCount: missionState.missions.length,
      liveOnStarIds,
    });
    const orderWrites = orderSettle.orders !== storedOrders.orders;
    if (orderWrites) {
      await this.saveOrderState(token, { version: 1, orders: orderSettle.orders });
    }
    for (const firing of orderSettle.firings) {
      // A fizzle is a whole outcome: the arming is spent, the annal says so,
      // and NOTHING is launched, queued or owed. Only a launch writes.
      if (firing.outcome !== "launched") continue;
      const mission: StoredMission = {
        id: `m-${missionsNow.nextOrdinal}`,
        kind: firing.missionKind,
        starId: firing.starId,
        targetCivId: firing.targetCivId,
        launchedYear: nowYear,
        distanceLy: firing.distanceLy,
        // The order dispatches at whatever speed this seat's landed projects
        // give it, exactly as a hand launch does. It gets no advantage for
        // having been left standing.
        flightYearsPerLy: effectiveFlightYearsPerLy(projectStateNow, nowYear),
        charter: firing.charter,
      };
      missionsNow = {
        version: 1,
        missions: [...missionsNow.missions, mission],
        nextOrdinal: missionsNow.nextOrdinal + 1,
      };
      await this.saveMissionState(token, missionsNow);
      projectStateNow = commitCompute(projectStateNow, firing.costCompute, nowYear);
      await this.saveProjectState(token, projectStateNow);
      await this.pushWakeEvent({
        token,
        atYear: missionFirstWordYear(mission),
        missionId: mission.id,
        key: `m/${mission.id}/0`,
      });
    }

    // This seat's own foundings, in launch order — the list both the Ledger
    // and the voyage snapshots below are built from.
    const myVoyages = this.voyageState.voyages.filter((v) => v.ownerToken === token);
    const muted = new Set(run?.muted ?? []);
    const ledgerVoyages: readonly LedgerVoyageInput[] = myVoyages.map((v) => ({
      voyage: v,
      childCivId: childCivIdFor(v.id),
      designation: starById(galaxy.stars, v.starId).designation,
      foundingYear: voyageLandfallYear(v),
      confirmYear: voyageFirstWordYear(v),
      charterPosture: charterPosture(v.charter),
      charterLine: charterLineFor(v.charter),
      // A MUTED CHILD KEEPS ITS ROW. The thread leaves the rack and nothing
      // is notified; the relationship the Ledger is a record of does not stop
      // existing because the parent stopped listening to it.
      muted: muted.has(childCivIdFor(v.id)),
    }));
    const storedLedger = await this.loadLedgerState(token);
    const built = buildLedger({
      galaxy,
      observerId: civId,
      voyages: ledgerVoyages,
      orders: toWireOrders(orderSettle.orders),
      stored: storedLedger,
      nowYear,
    });
    const ledgerWrites = built.state !== storedLedger;
    if (ledgerWrites) {
      await this.saveLedgerState(token, built.state);
    }
    const ledger = built.wire;

    const missions: MissionSnapshot[] = missionsNow.missions
      .map((m) => {
        const cone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
        return toMissionSnapshot(galaxy, cone, m, nowYear);
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const projects: ProjectSnapshot[] = PROJECTS.map((def) => {
      const runningEntry = projectStateNow.started.find((p) => p.id === def.id);
      const addRatePerYear = def.effect.kind === "compute-income" ? def.effect.addRatePerYear : 0;
      if (runningEntry === undefined) {
        return {
          id: def.id,
          label: def.label,
          line: def.line,
          effectLine: def.effectLine,
          costClass: def.costClass,
          costCompute: def.costCompute,
          durationYears: def.durationYears,
          addRatePerYear,
          status: "available",
          startedYear: null,
          landsYear: null,
        };
      }
      const landed = hasLanded(def, runningEntry, nowYear);
      return {
        id: def.id,
        label: def.label,
        line: def.line,
        effectLine: def.effectLine,
        costClass: def.costClass,
        costCompute: def.costCompute,
        durationYears: def.durationYears,
        addRatePerYear,
        status: landed ? "standing" : "running",
        startedYear: runningEntry.startedYear,
        landsYear: landedYear(def, runningEntry),
      };
    });

    // A4: this seat's own foundings, in launch order. `toVoyageSnapshot` is
    // the only producer, it reads truth through the two cones and nothing
    // else, and it drops `ownerToken` on the way out.
    const voyages: VoyageSnapshot[] = myVoyages
      .map((v) => toVoyageSnapshot(galaxy, civId, v, fold.outcomes.get(v.id), nowYear))
      .sort((a, b) => a.id.localeCompare(b.id));

    // The forecast survey. `occupiedStarIds` and the light ages come from the
    // sources ALREADY on this wire, which is the whole no-leak argument: the
    // survey's occupancy flag is `visibleSky` membership and nothing else, and
    // it consults no voyage, this player's or anyone else's.
    const survey = buildSurvey(
      galaxy,
      civId,
      new Set(sources.map((s) => s.starId)),
      new Map(sources.map((s) => [s.starId, s.lightAgeYears])),
    );

    const relevantStarIds = new Set<string>([
      ...studies.map((s) => s.starId),
      ...missions.map((m) => m.starId),
      ...voyages.map((v) => v.starId),
      // A4: the star a standing order fired on. Every other id here belongs to
      // something the player started; this one belongs to something that
      // happened while they were away, and the annal still has to name it.
      ...ledger.orders
        .map((o) => o.firedStarId)
        .filter((starId): starId is string => starId !== null),
      // AV3: first-watch/widen proposals name a currently-visible source
      // that has no study yet — report.ts never needed this (it only ever
      // names a study's or mission's star), but proposals.ts's nameFor
      // needs the designation fallback to cover every visible source too.
      ...sources.map((s) => s.starId),
    ]);
    const designations: Record<string, string> = {};
    for (const starId of relevantStarIds) {
      designations[starId] = starById(galaxy.stars, starId).designation;
    }

    // A2.4: the ceremony's stances, derived from this civ's own dial sheet
    // and its own acts. Nothing in either of them is about anyone else, which
    // is why they need no cone.
    //
    // A2.5: the threads are the one part of this block that IS about somebody
    // else, so they are built through traffic.ts and CALLED THROUGH — derived
    // at read time, stored nowhere, and filtered at `arrivesYear <= nowYear`
    // inside `buildThreads` so an answer in flight reaches no field here.
    //
    // A2.6: `buildThreads` now walks EVERY civilization rather than the
    // seeded ones, merging stored inbound and derived inbound into one list
    // with identical stamps, and it takes this player's mute list — the one
    // filter that drops a thread from their own rack and changes nothing at
    // all on the other side.
    const threads = buildThreads(
      galaxy,
      civId,
      nowYear,
      openThreadStarId,
      run?.muted ?? [],
    );
    const contact = buildContactWire(galaxy, selfCiv, nowYear, threads);

    return {
      self,
      sources,
      localNames,
      studies,
      missions,
      voyages,
      survey,
      ledger,
      projects,
      projectState: projectStateNow,
      designations,
      contact,
    };
  }

  /**
   * The inheritance offer — DETERMINISTIC in the token, so a mid-ceremony
   * refresh re-offers identical cards and `become` re-derives the exact seed.
   * Draws a pool of recently-ascended peers, then greedily prefers distinct
   * archetypes for legibility, topping up in pool order.
   */
  private makeCandidates(token: string, offerYear: number): CivCard[] {
    const galaxy = this.requireGalaxy();
    const nowYear = offerYear;
    const poolRng = createRng(`${galaxy.seedKey}/join/${token}`);
    const POOL = 6;
    const WANT = 3;
    const pool: { readonly i: number; readonly seed: CivSeed }[] = [];
    for (let i = 0; i < POOL; i++) {
      const seed = generateCivSeed(poolRng.fork(`cand/${i}`), {
        id: `cand-${i}`,
        ageBand: "peer",
        nowYear,
        recentlyAscended: true,
      });
      pool.push({ i, seed });
    }
    const selected: { readonly i: number; readonly seed: CivSeed }[] = [];
    const seenArchetypes = new Set<string>();
    for (const entry of pool) {
      if (selected.length >= WANT) break;
      if (seenArchetypes.has(entry.seed.archetype)) continue;
      seenArchetypes.add(entry.seed.archetype);
      selected.push(entry);
    }
    for (const entry of pool) {
      if (selected.length >= WANT) break;
      if (selected.some((s) => s.i === entry.i)) continue;
      selected.push(entry);
    }
    return selected.map((entry) => {
      const archetype = archetypeById(entry.seed.archetype);
      return {
        candidateId: String(entry.i),
        seed: entry.seed,
        archetypeName: archetype.name,
        archetypeFirstRead: archetype.firstRead,
      };
    });
  }

  private sendMsg(conn: Connection, msg: CohortServerMessage): void {
    conn.send(JSON.stringify(msg));
  }

  private toClockWire(): ClockWire {
    const clock = this.requireClock();
    return {
      epochRealMs: clock.epochRealMs,
      epochGameYear: clock.epochGameYear,
      realMsPerGameYear: REAL_MS_PER_GAME_YEAR,
    };
  }

  /** The launch surface's vocabulary — sent once on welcome, like `menus`,
   *  so no mission catalog ships in the client bundle. */
  private missionCatalog(): MissionCatalog {
    return {
      kinds: MISSION_KINDS,
      clauses: CHARTER_CLAUSES,
      minClauses: MIN_CHARTER_CLAUSES,
      maxClauses: MAX_CHARTER_CLAUSES,
    };
  }

  /** A4: the launch sheet's vocabulary, sent once on welcome beside the
   *  mission catalog and for the same reason — no voyage catalog ships in the
   *  client bundle. Wording and constants only; nothing about any star. */
  private voyageCatalog(): VoyageCatalog {
    return {
      kinds: VOYAGE_KINDS,
      clauses: VOYAGE_CLAUSES,
      minClauses: MIN_VOYAGE_CLAUSES,
      maxClauses: MAX_VOYAGE_CLAUSES,
      dialSteps: CHARTER_DIAL_STEPS,
      maxPerToken: MAX_VOYAGES_PER_TOKEN,
      occupiedRiskLine: OCCUPIED_RISK_LINE,
    };
  }

  /** Builds a wake ScheduledEvent — hygiene: `wake/${token}/${key}` so a
   *  re-push for the same purchase/launch is idempotent (same id). Pure;
   *  callers own persistence. */
  private buildWakeEvent(input: {
    readonly token: string;
    readonly atYear: number;
    readonly key: string;
    readonly missionId?: string;
  }): ScheduledEvent {
    return {
      id: `wake/${input.token}/${input.key}`,
      atYear: input.atYear,
      kind: "wake",
      note: input.key,
      token: input.token,
      ...(input.missionId !== undefined ? { missionId: input.missionId } : {}),
    };
  }

  /**
   * Push a wake event: read-modify-write the "events" queue, idempotent by
   * id (a re-push for the same purchase/launch overwrites the entry at the
   * same id). Bounds the queue at MAX_PENDING_EVENTS, dropping the
   * farthest-future entry first. Used by handlers (onBuyQuestion,
   * onLaunchMission); onAlarm appends to its own in-memory copy instead, so
   * the two writes to "events" in one alarm turn cannot race each other.
   */
  private async pushWakeEvent(input: {
    readonly token: string;
    readonly atYear: number;
    readonly key: string;
    readonly missionId?: string;
  }): Promise<void> {
    await this.pushWakeEvents([input]);
  }

  /**
   * The same write for SEVERAL wakes at once: one read, one put, one arm,
   * however many events. A2.5's horizon pass runs on every sky send and can
   * queue a wake per derived arrival per counterpart, and paying a
   * read-modify-write for each of those would put a dozen storage round trips
   * under an ordinary sky (the design note's own recorded risk: measure the
   * sky weight). An empty batch writes nothing at all.
   */
  private async pushWakeEvents(
    inputs: readonly {
      readonly token: string;
      readonly atYear: number;
      readonly key: string;
      readonly missionId?: string;
    }[],
  ): Promise<void> {
    if (inputs.length === 0) return;
    await this.pushEvents(inputs.map((input) => this.buildWakeEvent(input)));
  }

  /**
   * The queue write itself, shared by the wake batch above and A5's watch:
   * one read, one put, one arm, idempotent by id.
   *
   * THE TRIM EXEMPTION IS A5'S. Bounding the queue drops the farthest-future
   * entry first, which is almost always right and is the wrong guarantee for
   * the one event that runs while nobody is watching. A watch is near-term by
   * construction and would almost always survive; "almost always" is not a
   * liveness story, so every `kind === "watch"` entry is kept unconditionally
   * and the trim evicts from the rest. There is at most one watch per seat, so
   * the exemption cannot itself unbound the queue.
   */
  private async pushEvents(events: readonly ScheduledEvent[]): Promise<void> {
    if (events.length === 0) return;
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const ids = new Set(events.map((e) => e.id));
    let queue = [...pending.filter((e) => !ids.has(e.id)), ...events];
    if (queue.length > MAX_PENDING_EVENTS) {
      const watches = queue.filter((e) => e.kind === "watch");
      const rest = queue
        .filter((e) => e.kind !== "watch")
        .sort((a, b) => a.atYear - b.atYear)
        .slice(0, Math.max(0, MAX_PENDING_EVENTS - watches.length));
      queue = [...watches, ...rest];
    }
    await this.ctx.storage.put("events", queue);
    await this.armAlarm(queue);
  }

  /**
   * THE STORED ROSTER, for the four write sites only. Every read path calls
   * `requireGalaxy()` instead. The split is synthesis R1's choke point: a
   * writer that reaches for this cannot accidentally persist a colony, because
   * this field never holds one, and `saveGalaxyCivs` asserts it.
   */
  private requireStoredGalaxy(): Galaxy {
    if (this.storedGalaxy === null) throw new Error("cohort not seeded");
    return this.storedGalaxy;
  }

  /**
   * The stored roster PLUS every colony that has rooted by now, memoized.
   *
   * THE SIGNATURE TAKES NO YEAR, AND THAT IS A DECISION. The alternative was
   * `requireGalaxy(nowYear)` with every call site updated, and it was rejected
   * on both of the grounds that matter here. First, a good half of the call
   * sites (`admit`, `sendVoice`, `makeCandidates`, `loadProjectState`, the dev
   * routes) have no year in hand and would have had to derive one anyway —
   * from this same clock, a few microseconds apart, which is two answers to a
   * question that has one. Second, threading a year would let one turn hold
   * two different rosters, and the whole point of the derivation is that every
   * observer sees the same one. So the year comes from the clock, exactly as
   * every other derived read in this object gets it, and the memo key pins the
   * only observable consequence a year has: the count of ships that have
   * landed. Sub-year jitter between two calls in one turn is invisible by
   * construction.
   *
   * Requires the clock, which is sound: the clock and the galaxy are written
   * together at every seed path, so a cohort that has one has the other.
   *
   * A5, AND THE ORDER IS THE WHOLE OF IT (a5-synthesis.md R1): behavior runs
   * AFTER the landfall fold, never before. A colony's `base(y)` is therefore
   * `foundingEmissionHistory`'s walked curve and its archetype is the one its
   * dials actually reached, so a drifted child grows into the behavior of the
   * character it became rather than the one its charter named.
   */
  private derivedFold(): {
    readonly galaxy: Galaxy;
    readonly outcomes: ReadonlyMap<string, LandfallOutcome>;
  } {
    const stored = this.requireStoredGalaxy();
    const voyages = this.voyageState.voyages;
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const landed = voyages.filter((v) => voyageLandfallYear(v) <= nowYear + YEAR_EPS).length;
    const era = Math.floor(nowYear / BEHAVIOR_ERA_YEARS);
    const memo = this.derivedMemo;
    if (
      memo !== null &&
      memo.stored === stored &&
      memo.voyages === voyages &&
      memo.acts === stored.acts &&
      memo.landed === landed &&
      memo.era === era
    ) {
      return memo;
    }
    const fold = foldLandfalls(stored, voyages, nowYear);
    const landedGalaxy = fold.civs === stored.civs ? stored : { ...stored, civs: fold.civs };
    // Two eras out, so the horizon is always at least one full era above the
    // present: light that has to cross the neighborhood is already generated
    // by the time anybody's cone reaches it.
    const galaxy = galaxyWithBehavior(landedGalaxy, (era + 2) * BEHAVIOR_ERA_YEARS);
    this.derivedMemo = {
      stored,
      voyages,
      acts: stored.acts,
      landed,
      era,
      galaxy,
      outcomes: fold.outcomes,
    };
    return this.derivedMemo;
  }

  /**
   * THE ROSTER EVERY READ PATH SEES: stored civilizations plus derived
   * colonies. `pickPlayerHome` reads it (or a joining player would be placed
   * on an occupied star), `visibleSky` reads it, the ceremony reads it, the
   * dev routes read it.
   */
  private requireGalaxy(): Galaxy {
    return this.derivedFold().galaxy;
  }

  /**
   * PERSIST THE ROSTER, AND THE ASSERTION THAT MAKES SYNTHESIS R1 REAL: no
   * civilization whose id carries CHILD_ID_PREFIX may ever reach storage. A
   * colony exists because a voyage record says a ship arrived; writing one
   * down would make it exist twice, and the two copies would disagree the
   * first time the fold changed. Failing loudly is the point — this is not a
   * recoverable condition, it is a proof that the split above was broken.
   *
   * Every write of `galaxy:civs` in this object goes through here.
   *
   * A5's assertion is the same claim about light rather than about rosters: a
   * grown emission history is derived on every read, so writing one down would
   * freeze one derivation's answer into the record and give every source a
   * second copy of its own light, free to disagree with the fold the first
   * time a rule row is retuned. Same reasoning, same loudness.
   */
  private async saveGalaxyCivs(civs: readonly PlacedCiv[]): Promise<void> {
    for (const civ of civs) {
      if (civ.seed.id.startsWith(CHILD_ID_PREFIX)) {
        throw new Error(`refusing to persist a derived colony: ${civ.seed.id}`);
      }
      if (civ.behaviorGrown === true) {
        throw new Error(`refusing to persist a grown emission history: ${civ.seed.id}`);
      }
    }
    await this.ctx.storage.put("galaxy:civs", civs);
  }

  /** A4: a cohort seeded before this stage has no voyage record, which is the
   *  whole migration — an absent key loads as the empty state and every
   *  existing cohort behaves exactly as it did. */
  private async loadVoyageState(): Promise<VoyageState> {
    const stored = await this.ctx.storage.get<VoyageState>("galaxy:voyages");
    return stored === undefined ? newVoyageState() : migrateVoyageState(stored);
  }

  /** The ONE writer of the voyage record. `onLaunchVoyage` is its only caller
   *  (the presence rule: a founding is an irreversible act and requires a live
   *  socket), and re-pointing the field is what invalidates the derived memo. */
  private async saveVoyageState(state: VoyageState): Promise<void> {
    this.voyageState = state;
    await this.ctx.storage.put("galaxy:voyages", state);
  }

  private requireClock(): ClockState {
    if (this.clock === null) throw new Error("cohort clock not seeded");
    return this.clock;
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter((p) => p.length > 0);
    const devIdx = parts.indexOf("dev");
    const action = devIdx >= 0 ? parts.slice(devIdx + 1).join("/") : "";

    // `forget` is the one route that answers in production: production is a
    // playtest surface at this stage, and a playtester who wants to start
    // over has no other way back to the ceremony. It is safe to expose
    // because the token in the body IS the authorization — a randomUUID the
    // caller could only hold by owning that run — and every effect is scoped
    // to it. The rest stay local-only: they either hand out truth the
    // knowledge layer exists to withhold (state/observe/sky) or move the
    // shared world for everyone (seed/skip/event).
    if (action === "forget") {
      // The preflight the client's JSON POST triggers cross-origin in dev.
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: FORGET_CORS });
      }
      if (request.method === "POST") return this.devForget(request);
    }

    if (!devEndpointsOpen(this.env, url)) return json({ error: "not found" }, 404);

    if (request.method === "POST" && action === "seed") return this.devSeed(request);
    if (request.method === "GET" && action === "state") return this.devState();
    if (request.method === "GET" && action === "observe") return this.devObserve(url);
    if (request.method === "GET" && action === "sky") return this.devSky(url);
    if (request.method === "POST" && action === "event") return this.devScheduleEvent(request);
    if (request.method === "GET" && action === "events") return this.devEvents();
    if (request.method === "POST" && action === "skip") return this.devSkip(request);
    // A5's three. `/dev/watch` is the slice's test instrument: it runs the
    // whole watch evaluation and reports what it found and whether it WOULD
    // push, without sending anything and without writing anything.
    if (request.method === "GET" && action === "push") return this.devPush(url);
    if (request.method === "POST" && action === "watch") return this.devWatch(request);
    if (request.method === "GET" && action === "vapid") return this.devVapid(url);
    return json({ error: "not found" }, 404);
  }

  /**
   * Alarms are wake-ups only, never truth (systems-a.md §7): the ONLY thing
   * a due "wake" does is resend the sky to every currently-live placed
   * connection for its token. Every number in that sky is derived from the
   * clock at read time, so a sleeping DO or a wiped queue never desyncs
   * anything — it only delays a push the client would compute correctly
   * itself on its next `requestSky`.
   *
   * synthesis.md §1 (the alarm liveness rule): when a due wake would re-arm
   * a follow-up (a sentinel's next word), only push the fresh wake if at
   * least one placed connection for this token is currently live. An
   * absent player's sentinel must not re-arm forever.
   */
  async onAlarm(): Promise<void> {
    const clock = this.clock;
    if (clock === null) return;
    const nowYear = gameYearAt(clock, Date.now());
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const log = (await this.ctx.storage.get<FiredEvent[]>("eventLog")) ?? [];

    const due = pending.filter((e) => e.atYear <= nowYear + 1e-6);
    const rest = pending.filter((e) => e.atYear > nowYear + 1e-6);

    for (const event of due) {
      log.push({ ...event, firedAtYear: nowYear });
      console.log(
        `[cohort ${this.name}] event fired at year ${nowYear.toFixed(3)}: ${event.kind}: ${event.note}`,
      );

      // A5: the watch, above the wake branch. It derives, decides and may
      // send, and the only key it writes is `push:${token}`. Its re-arm is
      // appended to THIS turn's in-memory `rest` for the same reason the
      // sentinel's is, at the bottom of this loop: the two writes to "events"
      // in one alarm turn must not race.
      if (event.kind === "watch" && event.token !== undefined) {
        const next = await this.runWatch(event.token, nowYear);
        if (next !== null) rest.push(next);
        continue;
      }

      if (event.kind !== "wake" || event.token === undefined) continue;
      const token = event.token;
      const liveConns = [...this.conns.values()].filter(
        (c) => c.token === token && c.civId !== null,
      );
      for (const c of liveConns) {
        if (c.civId === null) continue; // filtered above; re-checked for the type narrowing
        await this.sendSky(c.conn, c.token, c.civId);
      }

      if (event.missionId === undefined || liveConns.length === 0) continue;
      const missionState = await this.loadMissionState(token);
      const mission = missionState.missions.find((m) => m.id === event.missionId);
      if (mission === undefined) continue;
      const nextArrivals = expectedArrivals(
        mission.kind,
        mission.launchedYear,
        mission.distanceLy,
        mission.flightYearsPerLy,
        nowYear + SENTINEL_CADENCE_YEARS + 1,
      );
      const next = nextArrivals.find((e) => e > nowYear + 1e-6);
      if (next !== undefined) {
        rest.push(
          this.buildWakeEvent({
            token,
            atYear: next,
            missionId: mission.id,
            key: `m/${mission.id}/${next}`,
          }),
        );
      }
    }

    await this.ctx.storage.put("events", rest);
    await this.ctx.storage.put("eventLog", log.slice(-100));
    await this.armAlarm(rest);
  }

  private async armAlarm(pending: readonly ScheduledEvent[]): Promise<void> {
    const clock = this.clock;
    if (clock === null || pending.length === 0) return;
    const nextYear = Math.min(...pending.map((e) => e.atYear));
    await this.ctx.storage.setAlarm(realMsAtGameYear(clock, nextYear));
  }

  private nowYear(): number | null {
    return this.clock === null ? null : gameYearAt(this.clock, Date.now());
  }

  private async devSeed(request: Request): Promise<Response> {
    const body = await parseBody(request);
    const seedKey = stringField(body, "seedKey") ?? `cohort-${this.name}`;
    const config: GalaxyConfig = {
      // Cap the radius so the star list stays comfortably inside DO
      // storage value limits (~450 stars at 30 ly).
      radiusLy: Math.min(30, numberField(body, "radiusLy") ?? DEFAULT_GALAXY_CONFIG.radiusLy),
      aiCivCount: Math.min(24, numberField(body, "aiCivs") ?? DEFAULT_GALAXY_CONFIG.aiCivCount),
    };

    const clock = newClock(Date.now());
    const galaxy = generateGalaxy(createRng(seedKey), seedKey, config, 0);
    this.clock = clock;
    this.storedGalaxy = galaxy;
    this.derivedMemo = null;
    await this.ctx.storage.put("clock", clock);
    await this.ctx.storage.put("galaxy:meta", {
      seedKey,
      config,
    } satisfies GalaxyMeta);
    await this.ctx.storage.put("galaxy:stars", galaxy.stars);
    await this.saveGalaxyCivs(galaxy.civs);
    // A2.4: written explicitly at seed time so a re-seed cannot inherit the
    // previous galaxy's contact log. `onStart` still tolerates its absence.
    await this.ctx.storage.put("galaxy:acts", galaxy.acts);
    // A4: same reason, one act later.
    await this.saveVoyageState(newVoyageState());
    await this.ctx.storage.put("events", []);
    await this.ctx.storage.put("eventLog", []);
    await this.ctx.storage.deleteAlarm();

    return json({
      seeded: true,
      seedKey,
      config,
      starCount: galaxy.stars.length,
      civs: this.civOverview(galaxy, 0),
    });
  }

  private civOverview(galaxy: Galaxy, nowYear: number): unknown[] {
    const origin = { x: 0, y: 0, z: 0 };
    return galaxy.civs.map((c) => ({
      id: c.seed.id,
      name: c.seed.name,
      controller: c.controller,
      archetype: c.seed.archetype,
      posture: c.seed.posture,
      ageBand: c.seed.ageBand,
      lineage: c.seed.lineageId,
      cradle: c.seed.cradleId,
      star: starById(galaxy.stars, c.starId).designation,
      distanceFromCenterLy:
        Math.round(distanceLy(starById(galaxy.stars, c.starId).position, origin) * 100) / 100,
      emissionNow: emissionAt(c.seed.emissionHistory, nowYear),
      ascensionYear: c.seed.ascensionYear,
      emissionHistory: c.seed.emissionHistory,
    }));
  }

  // The three dev read routes all serve the DERIVED roster (A4). A colony is
  // as real as anything else in the sky, and a truth endpoint that showed only
  // what was on disk would be a second, quieter answer to "what is out there".
  private devState(): Response {
    const nowYear = this.nowYear();
    if (this.storedGalaxy === null || nowYear === null) {
      return json({ error: "not seeded: POST /dev/seed first" }, 404);
    }
    const galaxy = this.requireGalaxy();
    return json({
      nowYear,
      clock: this.clock,
      seedKey: galaxy.seedKey,
      config: galaxy.config,
      starCount: galaxy.stars.length,
      voyages: this.voyageState.voyages.length,
      civs: this.civOverview(galaxy, nowYear),
    });
  }

  private devObserve(url: URL): Response {
    const nowYear = this.nowYear();
    if (this.storedGalaxy === null || nowYear === null) {
      return json({ error: "not seeded: POST /dev/seed first" }, 404);
    }
    const observer = url.searchParams.get("observer");
    const target = url.searchParams.get("target");
    if (observer === null || target === null) {
      return json({ error: "observer and target query params required" }, 400);
    }
    try {
      return json({ nowYear, view: observeCiv(this.requireGalaxy(), observer, target, nowYear) });
    } catch (err) {
      return json({ error: String(err) }, 404);
    }
  }

  private devSky(url: URL): Response {
    const nowYear = this.nowYear();
    if (this.storedGalaxy === null || nowYear === null) {
      return json({ error: "not seeded: POST /dev/seed first" }, 404);
    }
    const observer = url.searchParams.get("observer");
    if (observer === null) return json({ error: "observer query param required" }, 400);
    try {
      return json({ nowYear, sky: observeSky(this.requireGalaxy(), observer, nowYear) });
    } catch (err) {
      return json({ error: String(err) }, 404);
    }
  }

  private async devScheduleEvent(request: Request): Promise<Response> {
    const nowYear = this.nowYear();
    if (nowYear === null) return json({ error: "not seeded: POST /dev/seed first" }, 404);
    const body = await parseBody(request);
    const inYears = numberField(body, "inYears");
    if (inYears === undefined || inYears <= 0) {
      return json({ error: "inYears (positive number) required" }, 400);
    }
    const note = stringField(body, "note") ?? "dev ping";
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const event: ScheduledEvent = {
      id: `ev-${pending.length}-${Date.now()}`,
      atYear: nowYear + inYears,
      kind: "dev-ping",
      note,
    };
    pending.push(event);
    await this.ctx.storage.put("events", pending);
    await this.armAlarm(pending);
    return json({ scheduled: event, nowYear });
  }

  /**
   * A5: one seat's push record. HOSTS, NEVER ENDPOINTS — a push endpoint is a
   * bearer capability (anyone holding it can buzz that phone), and a dev route
   * that printed one would be a way to lift it out of storage.
   */
  private async devPush(url: URL): Promise<Response> {
    const token = url.searchParams.get("token");
    if (token === null) return json({ error: "token query param required" }, 400);
    const state = await this.loadPushState(token);
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const watch = pending.find((e) => e.id === `watch/${token}`) ?? null;
    return json({
      nowYear: this.nowYear(),
      configured: vapidPublicKey(this.env) !== null,
      state:
        state === null
          ? null
          : {
              subs: state.subs.map((s) => ({
                id: s.id,
                host: new URL(s.endpoint).host,
                keyId: s.keyId,
                addedRealMs: s.addedRealMs,
                failures: s.failures,
              })),
              notified: state.notified,
              notifiedRealMs: state.notifiedRealMs,
              seenRealMs: state.seenRealMs,
            },
      watchYear: watch?.atYear ?? null,
    });
  }

  /** A5: run the watch evaluation NOW and report it. SENDS NOTHING and writes
   *  nothing, which is what makes it safe to hit in a loop while reading the
   *  same seat's `/dev/push`. */
  private async devWatch(request: Request): Promise<Response> {
    const nowYear = this.nowYear();
    if (nowYear === null) return json({ error: "not seeded: POST /dev/seed first" }, 404);
    const body = await parseBody(request);
    const token = stringField(body, "token");
    if (token === undefined) return json({ error: "token (string) required" }, 400);
    const verdict = await this.evaluateWatch(token, nowYear);
    return json({
      nowYear,
      wouldPush: verdict.reason === "send",
      reason: verdict.reason,
      firings: verdict.firings,
      rearmYear: verdict.rearmYear,
      subs: verdict.state?.subs.length ?? 0,
    });
  }

  /** A5: the exact Authorization header the Worker would send to one
   *  audience. Local-only, and it hands out nothing about anybody: the JWT is
   *  a claim about this deployment. */
  private async devVapid(url: URL): Promise<Response> {
    const audience = url.searchParams.get("aud");
    if (audience === null) return json({ error: "aud query param required" }, 400);
    const authorization = await vapidAuthorization(this.env, audience);
    if (authorization === null) return json({ error: "no VAPID keypair configured" }, 404);
    return json({ audience, authorization, publicKey: vapidPublicKey(this.env) });
  }

  private async devEvents(): Promise<Response> {
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const log = (await this.ctx.storage.get<FiredEvent[]>("eventLog")) ?? [];
    return json({ nowYear: this.nowYear(), pending, fired: log });
  }

  /**
   * Time acceleration for testing: skip the shared clock forward `years`
   * game years by re-anchoring — ClockState is kept as an (epoch, year)
   * pair precisely so the anchor can move without rewriting history. Safe
   * because alarms are wake-ups, never truth (onAlarm's contract): every
   * number is re-derived from the clock at read time, so the skipped
   * window's due events simply fire on the re-armed alarm below.
   *
   * Forward-only: a rewind would contradict the fired-event log (events
   * marked fired at years that are now the future).
   */
  private async devSkip(request: Request): Promise<Response> {
    const clock = this.clock;
    if (clock === null) return json({ error: "not seeded: POST /dev/seed first" }, 404);
    const body = await parseBody(request);
    const years = numberField(body, "years");
    if (years === undefined || !Number.isFinite(years) || years <= 0) {
      return json({ error: "years (positive number) required: the clock only skips forward" }, 400);
    }

    const nowMs = Date.now();
    const fromYear = gameYearAt(clock, nowMs);
    const next: ClockState = { epochRealMs: nowMs, epochGameYear: fromYear + years };
    this.clock = next;
    await this.ctx.storage.put("clock", next);

    // Live clients interpolate from the anchor they were welcomed with, so
    // push the replacement, then a fresh sky to every placed connection —
    // nobody should wait on a wake event to see the post-skip world.
    const wire = this.toClockWire();
    for (const state of this.conns.values()) {
      this.sendMsg(state.conn, { type: "clock", clock: wire });
      if (state.civId !== null) await this.sendSky(state.conn, state.token, state.civId);
    }

    // Re-arm against the moved clock: anything that fell due inside the
    // skipped window now maps to a past real-time and fires immediately.
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    await this.armAlarm(pending);

    return json({
      skippedYears: years,
      fromYear,
      nowYear: gameYearAt(next, Date.now()),
      pendingEvents: pending.length,
    });
  }

  /**
   * forget: erase one token's run so a playtester can start over. Deletes
   * every per-token key, drops the token's civ out of the galaxy (which
   * returns its star to pickPlayerHome's pool rather than leaving an
   * unpiloted ghost), prunes the wakes that run armed, and sends any live
   * tab on that token back to a fresh ceremony offer.
   *
   * This is a playtest reset, not a game verb, and it does something the
   * game itself never does: it rewrites truth other players have already
   * seen. Every view is derived from the galaxy at read time, so a
   * forgotten civ's past light leaves the sky along with the civ — no
   * departure, no fading record. Nothing in the fiction works this way.
   *
   * Idempotent: forgetting an unknown token succeeds and reports
   * `hadRun: false`, so a playtester can fire it without checking first.
   * The caller still owns its own localStorage — clearing `holos.token`
   * after this call is what makes the next run a NEW identity, because a
   * reused token re-derives the same `civ-p-` id it just gave up.
   */
  private async devForget(request: Request): Promise<Response> {
    const body = await parseBody(request);
    const token = stringField(body, "token");
    if (token === undefined) return json({ error: "token (string) required" }, 400, FORGET_CORS);

    // A forget can be the first thing a cold DO ever handles; seeding here
    // keeps the offer below (and requireGalaxy) on solid ground.
    await this.ensureSeeded();
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);

    // Every prefix that hangs off a run. A token with no run still sweeps:
    // a player who quit mid-ceremony has an `offerYear:` and nothing else.
    await this.ctx.storage.delete([
      `run:${token}`,
      `offerYear:${token}`,
      `voice:${token}`,
      `report:${token}`,
      `studies:${token}`,
      `missions:${token}`,
      `projects:${token}`,
      `proposals:${token}`,
      // A4: the armings and the latches go with the run. The VOYAGE record
      // does not (see below) — a colony outlives the run that sent it, but the
      // record of what its parent concluded about it belongs to that parent.
      `orders:${token}`,
      `ledger:${token}`,
      // A5: the subscriptions go with the run. A shared device whose seat was
      // reset must not keep buzzing for a civilization that is not its
      // player's any more, and the local half (the browser's own
      // `subscription.unsubscribe()`) is startover.ts's.
      `push:${token}`,
    ]);

    // A4: the STORED roster, and the voyage record is deliberately LEFT ALONE.
    // A colony this run founded is everyone's fact and outlives the run that
    // sent it — the whole point of a cohort-wide voyage record — so a forget
    // takes the parent out of the sky and leaves the children standing, with
    // a chronicle that still names the star they came from.
    const civId = run?.civId ?? `civ-p-${token.slice(0, 12)}`;
    const stored = this.requireStoredGalaxy();
    const civs = stored.civs.filter((c) => c.seed.id !== civId);
    const removed = civs.length !== stored.civs.length;
    if (removed) {
      this.storedGalaxy = { ...stored, civs };
      await this.saveGalaxyCivs(civs);
    }

    // A wake belongs to the run that armed it; a forgotten run has none.
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const keep = pending.filter((e) => e.token !== token);
    if (keep.length !== pending.length) {
      await this.ctx.storage.put("events", keep);
      if (keep.length === 0) await this.ctx.storage.deleteAlarm();
      else await this.armAlarm(keep);
    }

    // Live tabs on this token go straight back to the ceremony — the offer
    // is re-anchored to now, since `offerYear:` went with the rest. Every
    // OTHER placed connection gets a fresh sky, the same membership-changed
    // push `become` sends, because a source just left their field.
    const offerYear = await this.getOfferYear(token);
    const candidates = this.makeCandidates(token, offerYear);
    let connectionsReset = 0;
    for (const state of this.conns.values()) {
      if (state.token === token) {
        state.civId = null;
        state.reportBaselineYear = null;
        this.sendMsg(state.conn, { type: "offer", candidates });
        connectionsReset += 1;
      } else if (state.civId !== null) {
        await this.sendSky(state.conn, state.token, state.civId);
      }
    }

    return json(
      {
        forgotten: token,
        hadRun: run !== undefined,
        civRemoved: removed ? civId : null,
        starFreed: removed ? (run?.starId ?? null) : null,
        connectionsReset,
        note: "clear localStorage 'holos.token' too: a reused token re-derives the same civ id",
      },
      200,
      FORGET_CORS,
    );
  }
}
