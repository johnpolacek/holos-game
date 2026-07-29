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
  DEFAULT_GALAXY_CONFIG,
  distanceLy,
  generateGalaxy,
  pickPlayerHome,
  starById,
  type Galaxy,
  type GalaxyConfig,
  type PlacedCiv,
  type Star,
} from "./galaxy";
import { emissionAt, lightConeFor, observeCiv, observeSky, visibleSky } from "./knowledge";
import { createRng } from "./rng";
import { generateCivSeed, type CivSeed } from "./civseed";
import { archetypeById } from "./minds";
import { arrivalLine, ageChipLine, computeLine, clockLine, epochLine, silenceLine } from "./voice";
import {
  buildStudySnapshot,
  hypothesisMenus,
  migrateStudyState,
  newStudyState,
  type StoredStudy,
  type StudyMove,
  type StudyState,
  type StoredStudyState,
} from "./studies";
import {
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
import {
  answersYearFor,
  effectiveCostFor,
  questionById,
  type BoughtQuestion,
} from "./questions";
import { buildTendList } from "./tend";
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
  type VoiceKey,
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
  readonly kind: "dev-ping" | "wake";
  readonly note: string;
  readonly token?: string; // wake only
  readonly missionId?: string; // wake only, so a sentinel can re-arm
}

interface FiredEvent extends ScheduledEvent {
  readonly firedAtYear: number;
}

/** Bounds the stored queue, dropping the farthest-future first. */
const MAX_PENDING_EVENTS = 256;

/** Slop on year comparisons, so a float-adjacent stamp never decides a
 *  lifecycle question (A2.2b's grounded exit compares arrival against the
 *  year a study was opened). */
const YEAR_EPS = 1e-6;

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
export interface CohortEnv extends VoiceGenEnv {
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
 */
interface RunRecord {
  readonly token: string;
  readonly civId: string;
  readonly starId: string;
  readonly localNames: Record<string, string>;
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

/** Live connection tracking: the socket, its token, and (once placed) civ. */
interface ConnState {
  readonly conn: Connection;
  readonly token: string;
  civId: string | null;
  /** AV2: the lastServedYear the placement-path report was built against.
   *  A requestReport refresh in the same session rebuilds against THIS, not
   *  the stored (already-advanced) marker — so the session's header and
   *  promoted remark survive a reopen instead of vanishing on the first
   *  refresh (the design's "a refresh reuses the same header"). */
  reportBaselineYear: number | null;
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
  private galaxy: Galaxy | null = null;
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

  async onStart(): Promise<void> {
    const clock = await this.ctx.storage.get<ClockState>("clock");
    this.clock = clock ?? null;
    const meta = await this.ctx.storage.get<GalaxyMeta>("galaxy:meta");
    const stars = await this.ctx.storage.get<Star[]>("galaxy:stars");
    const civs = await this.ctx.storage.get<PlacedCiv[]>("galaxy:civs");
    this.galaxy =
      meta !== undefined && stars !== undefined && civs !== undefined
        ? { seedKey: meta.seedKey, config: meta.config, stars, civs }
        : null;
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
        await this.onHello(conn, msg.token);
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
      case "voiceSeen":
        await this.onVoiceSeen(conn, msg.key);
        return;
      case "requestReport":
        await this.onRequestReport(conn);
        return;
      case "declineProposal":
        await this.onDeclineProposal(conn, msg.id);
        return;
    }
  }

  onClose(conn: Connection): void {
    this.conns.delete(conn.id);
  }

  /** hello: resolve/mint a token, register, and send welcome + first payload. */
  private async onHello(conn: Connection, tokenIn: string | null): Promise<void> {
    await this.ensureSeeded();
    const galaxy = this.requireGalaxy();
    // Mint only when the client had no token; a non-null unknown token is a
    // choosing-phase / storage-evicted token and is reused as-is.
    const token = tokenIn ?? crypto.randomUUID();
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    if (run !== undefined) {
      this.conns.set(conn.id, { conn, token, civId: run.civId, reportBaselineYear: null });
      this.sendMsg(conn, {
        type: "welcome",
        token,
        phase: "placed",
        clock: this.toClockWire(),
        catalog: galaxy.stars,
        menus: hypothesisMenus(),
        missionCatalog: this.missionCatalog(),
      });
      await this.sendVoice(conn, token, run.civId);
      await this.sendReport(conn, token, run.civId, { advance: true });
      await this.sendSky(conn, token, run.civId);
      return;
    }
    this.conns.set(conn.id, { conn, token, civId: null, reportBaselineYear: null });
    this.sendMsg(conn, {
      type: "welcome",
      token,
      phase: "choosing",
      clock: this.toClockWire(),
      catalog: galaxy.stars,
      menus: hypothesisMenus(),
      missionCatalog: this.missionCatalog(),
    });
    const offerYear = await this.getOfferYear(token);
    this.sendMsg(conn, { type: "offer", candidates: this.makeCandidates(token, offerYear) });
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
    const galaxy = this.requireGalaxy();
    const civId = `civ-p-${token.slice(0, 12)}`;
    // Same-token race (two tabs committing at once): if this token's civ
    // landed while we awaited above, treat this as the idempotent path.
    const already = galaxy.civs.find((c) => c.seed.id === civId);
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
    this.galaxy = { ...galaxy, civs: [...galaxy.civs, placed] };
    await this.ctx.storage.put("galaxy:civs", this.galaxy.civs);

    const run: RunRecord = { token, civId, starId: star.id, localNames: {} };
    await this.ctx.storage.put(`run:${token}`, run);
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
    await this.sendSky(conn, state.token, state.civId);
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
    await this.sendSky(conn, state.token, state.civId);
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
    if (!visible.some((o) => o.starId === starId)) {
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
    const existing = studyState.studies[starId];
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: {
        ...existing,
        starId,
        status: "open",
        bought: existing?.bought ?? [],
        openedYear: nowYear,
      },
    };
    await this.saveStudyState(state.token, { version: 3, studies });
    await this.sendSky(conn, state.token, state.civId);
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
    await this.saveStudyState(state.token, { version: 3, studies });
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * buyQuestion: commission one inference against free compute. Requires a
   * visible source (so the class is known); it does NOT require an open
   * study — the spend is the statement of intent, so it opens the study
   * when none exists and reopens a shelved one (stamping `openedYear`
   * exactly as onOpenStudy would). The one status a spend does not override
   * is grounded: grounded is closed until the player deliberately reopens
   * it, because reopening restamps `openedYear` and with it what the
   * grounded exit measures against (observatory-design.md § The exits).
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
    if (existing !== undefined && existing.status === "grounded") {
      this.sendMsg(conn, {
        type: "error",
        code: "question-unavailable",
        message: "the study is grounded",
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
              starId,
              status: "open",
              bought: [...(existing?.bought ?? []), bought],
              openedYear: nowYear,
            },
    };
    await this.saveStudyState(state.token, { version: 3, studies });

    const updatedProjectState = commitCompute(projectState, cost);
    await this.saveProjectState(state.token, updatedProjectState);

    const answersYear = answersYearFor(def, bought, projectState);
    await this.pushWakeEvent({
      token: state.token,
      atYear: answersYear,
      key: `q/${starId}/${def.id}`,
    });

    await this.sendSky(conn, state.token, state.civId);
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

    const updatedProjectState = commitCompute(projectState, kindDef.costCompute);
    await this.saveProjectState(state.token, updatedProjectState);

    await this.pushWakeEvent({
      token: state.token,
      atYear: missionFirstWordYear(mission),
      missionId: mission.id,
      key: `m/${mission.id}/0`,
    });

    await this.sendSky(conn, state.token, state.civId);
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
    const updated: ProjectState = {
      ...projectState,
      started,
      committedCompute: projectState.committedCompute + def.costCompute,
    };
    await this.saveProjectState(state.token, updated);
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * Key changed from `cases:${token}` at the case→study rename (A2.1 had
   * just shipped and the tap bug meant no studies were ever opened in
   * production, so no migration shim is needed for THAT rename). A2.2 adds
   * a real v1→v2 migration (studies.ts's migrateStudyState, loadProjectState's
   * exact idiom): every study gains an empty `bought[]`.
   */
  private async loadStudyState(token: string, nowYear: number): Promise<StudyState> {
    const stored = await this.ctx.storage.get<StoredStudyState>(`studies:${token}`);
    if (stored === undefined) return newStudyState();
    if (stored.version === 3) return stored;
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
      if (stored.version === 2) return stored;
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
    if (this.galaxy !== null) return;
    const seedKey = `cohort-${this.name}`;
    const config: GalaxyConfig = {
      radiusLy: Math.min(30, DEFAULT_GALAXY_CONFIG.radiusLy),
      aiCivCount: DEFAULT_GALAXY_CONFIG.aiCivCount,
    };
    const clock = newClock(Date.now());
    const galaxy = generateGalaxy(createRng(seedKey), seedKey, config, 0);
    this.clock = clock;
    this.galaxy = galaxy;
    await this.ctx.storage.put("clock", clock);
    await this.ctx.storage.put("galaxy:meta", { seedKey, config } satisfies GalaxyMeta);
    await this.ctx.storage.put("galaxy:stars", galaxy.stars);
    await this.ctx.storage.put("galaxy:civs", galaxy.civs);
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
      projects,
      projectState,
      designations,
    } = await this.assembleSkyState(token, civId, nowYear);

    const budget: ComputeBudget = {
      free: freeComputeAt(projectState, nowYear),
      ratePerYear: ratePerYearAt(projectState, nowYear),
      asOfYear: nowYear,
    };
    const tend = buildTendList({
      nowYear,
      projectState,
      studies,
      missions,
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
   * The wire-snapshot assembly `sendSky` sends and AV2's `materializeReport`
   * derives from — split out so both can reach it without either depending
   * on the other having already run this turn. Owns the one A2.2b side
   * effect in this whole pipeline (`groundedWrites`: a study transitioning
   * to `status: "grounded"` is a write, not a pure derivation — see the
   * comment at that block).
   */
  private async assembleSkyState(
    token: string,
    civId: string,
    nowYear: number,
  ): Promise<{
    readonly self: SelfView;
    readonly sources: readonly DetectedSource[];
    readonly localNames: Readonly<Record<string, string>>;
    readonly studies: readonly StudySnapshot[];
    readonly missions: readonly MissionSnapshot[];
    readonly projects: readonly ProjectSnapshot[];
    readonly projectState: ProjectState;
    readonly designations: Readonly<Record<string, string>>;
  }> {
    const galaxy = this.requireGalaxy();
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
    const sources: DetectedSource[] = visibleSky(galaxy, civId, nowYear).map((o) =>
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
    let groundedWrites: Record<string, StoredStudy> | null = null;
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
        const settled: StoredStudy = grounds ? { ...stored, status: "grounded" } : stored;
        if (grounds) {
          groundedWrites = { ...(groundedWrites ?? studyState.studies), [stored.starId]: settled };
        }
        return buildStudySnapshot(
          galaxy,
          cone,
          source,
          settled,
          nowYear,
          projectState,
          missionMoves,
          settled.status === "grounded" ? grounding : null,
        );
      })
      .filter((s): s is StudySnapshot => s !== null)
      .sort((a, b) => a.starId.localeCompare(b.starId));

    if (groundedWrites !== null) {
      await this.saveStudyState(token, { version: 3, studies: groundedWrites });
    }

    const missions: MissionSnapshot[] = missionState.missions
      .map((m) => {
        const cone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
        return toMissionSnapshot(galaxy, cone, m, nowYear);
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const projects: ProjectSnapshot[] = PROJECTS.map((def) => {
      const runningEntry = projectState.started.find((p) => p.id === def.id);
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

    const relevantStarIds = new Set<string>([
      ...studies.map((s) => s.starId),
      ...missions.map((m) => m.starId),
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

    return { self, sources, localNames, studies, missions, projects, projectState, designations };
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
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const event = this.buildWakeEvent(input);
    const withoutDup = pending.filter((e) => e.id !== event.id);
    let queue = [...withoutDup, event];
    if (queue.length > MAX_PENDING_EVENTS) {
      queue = queue.sort((a, b) => a.atYear - b.atYear).slice(0, MAX_PENDING_EVENTS);
    }
    await this.ctx.storage.put("events", queue);
    await this.armAlarm(queue);
  }

  private requireGalaxy(): Galaxy {
    if (this.galaxy === null) throw new Error("cohort not seeded");
    return this.galaxy;
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
    this.galaxy = galaxy;
    await this.ctx.storage.put("clock", clock);
    await this.ctx.storage.put("galaxy:meta", {
      seedKey,
      config,
    } satisfies GalaxyMeta);
    await this.ctx.storage.put("galaxy:stars", galaxy.stars);
    await this.ctx.storage.put("galaxy:civs", galaxy.civs);
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

  private devState(): Response {
    const nowYear = this.nowYear();
    if (this.galaxy === null || nowYear === null) {
      return json({ error: "not seeded: POST /dev/seed first" }, 404);
    }
    return json({
      nowYear,
      clock: this.clock,
      seedKey: this.galaxy.seedKey,
      config: this.galaxy.config,
      starCount: this.galaxy.stars.length,
      civs: this.civOverview(this.galaxy, nowYear),
    });
  }

  private devObserve(url: URL): Response {
    const nowYear = this.nowYear();
    if (this.galaxy === null || nowYear === null) {
      return json({ error: "not seeded: POST /dev/seed first" }, 404);
    }
    const observer = url.searchParams.get("observer");
    const target = url.searchParams.get("target");
    if (observer === null || target === null) {
      return json({ error: "observer and target query params required" }, 400);
    }
    try {
      return json({ nowYear, view: observeCiv(this.galaxy, observer, target, nowYear) });
    } catch (err) {
      return json({ error: String(err) }, 404);
    }
  }

  private devSky(url: URL): Response {
    const nowYear = this.nowYear();
    if (this.galaxy === null || nowYear === null) {
      return json({ error: "not seeded: POST /dev/seed first" }, 404);
    }
    const observer = url.searchParams.get("observer");
    if (observer === null) return json({ error: "observer query param required" }, 400);
    try {
      return json({ nowYear, sky: observeSky(this.galaxy, observer, nowYear) });
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
    ]);

    const civId = run?.civId ?? `civ-p-${token.slice(0, 12)}`;
    const galaxy = this.requireGalaxy();
    const civs = galaxy.civs.filter((c) => c.seed.id !== civId);
    const removed = civs.length !== galaxy.civs.length;
    if (removed) {
      this.galaxy = { ...galaxy, civs };
      await this.ctx.storage.put("galaxy:civs", civs);
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
