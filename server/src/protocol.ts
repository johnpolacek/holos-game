// Wire protocol shared between server and client.
// The client imports these types via the `@holos/protocol` alias.

/** Positions are normalized to [0, 1] in both axes; clients map them to their viewport. */
export interface PlayerState {
  id: string;
  x: number;
  y: number;
  color: number;
}

/** Sent by a client to request moving its own dot. */
export interface MoveMessage {
  type: "move";
  x: number;
  y: number;
}

export type ClientMessage = MoveMessage;

export type ServerMessage =
  | { type: "sync"; self: string; players: PlayerState[] }
  | { type: "join"; player: PlayerState }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "leave"; id: string };

export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (
    msg["type"] === "move" &&
    typeof msg["x"] === "number" &&
    Number.isFinite(msg["x"]) &&
    typeof msg["y"] === "number" &&
    Number.isFinite(msg["y"])
  ) {
    return { type: "move", x: msg["x"], y: msg["y"] };
  }
  return null;
}

export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as { type?: unknown };
  switch (msg.type) {
    case "sync":
    case "join":
    case "move":
    case "leave":
      return data as ServerMessage;
    default:
      return null;
  }
}

// ── Act 3 / Cohort wire (A1) ────────────────────────────────────────────
// Type-only imports → erased from the client bundle (no truth code ships).
import type { CivSeed } from "./civseed";
import type { ObservedCiv, ObservedSignal, SignalClass } from "./knowledge";
import type { Star, Vec3Ly } from "./galaxy";
import type { CostClass } from "./projects";
import type { QuestionId } from "./questions";
import type {
  CharterClauseDef,
  CharterClauseId,
  WorkState,
  MissionKind,
  MissionKindDef,
} from "./missions";
import type { TendRow } from "./tend";
// The tripwire vocabulary is studies.ts's (it owns the conditions and the
// stored record); the wire borrows the id set, the TendRow precedent exactly.
import type { TripwireKind } from "./studies";
// A2.4: same borrowing, one more time — contact.ts owns the act vocabulary
// and the stored ContactAct; the wire takes the id set only.
import type { ContactKind } from "./contact";

// Re-exports the client needs to render. Types are erased; DIAL_AXES is the
// ONE runtime value the client genuinely needs (in-world dial pole labels),
// and dials.ts imports nothing and carries no truth.
export { DIAL_AXES } from "./dials";
export type { DialAxisId, DialSetting, DialSheet, DialAxis } from "./dials";
// The name lexicon is presentational vocabulary in the dials.ts mold (its
// module imports nothing at runtime): the ceremony's suggestion chips
// compose from the same word lists the seed generator uses.
export { NAME_HEADS, NAME_TAILS } from "./names";
export type { CivSeed, EmissionEpoch } from "./civseed";
export type { ObservedSignal, SignalClass } from "./knowledge";
export type { Star, SpectralClass, Vec3Ly } from "./galaxy";
// Catalog id string-sets, for the content-art resolver (client/src/art.ts).
// Type-only: the id vocabulary, not the catalogs — no cradles.ts/minds.ts
// runtime or data ships, and archetypeName stays the server-resolved wire field.
export type { LineageId } from "./cradles";
export type { ArchetypeId } from "./minds";
export type { CostClass } from "./projects";
export type { QuestionId } from "./questions";
export type {
  CharterClauseDef,
  CharterClauseId,
  WorkState,
  MissionKind,
  MissionKindDef,
} from "./missions";
// The work-list row shape rides inside `sky`; the client renders it directly, so
// it is named here rather than reached for through the message union.
export type { TendRow } from "./tend";
export type { TripwireKind } from "./studies";
export type { ContactKind } from "./contact";

/** Clock anchor; the client computes nowYear locally (no time polling). */
export interface ClockWire {
  readonly epochRealMs: number;
  readonly epochGameYear: number;
  // The anchor is self-describing so a client never compiles in a constant
  // that can disagree with a re-anchored server.
  readonly realMsPerGameYear: number;
}

/**
 * The ONLY remote-civ shape on the wire: a strict narrowing of ObservedCiv
 * (Omit ties it to ObservedCiv so extending the boundary means extending
 * ObservedCiv, never reaching into truth). observerId/targetId dropped;
 * signal guaranteed non-null (undetected civs are withheld entirely).
 */
export type DetectedSource =
  Omit<ObservedCiv, "observerId" | "targetId" | "signal"> & {
    readonly signal: ObservedSignal;
  };

/** The only producer of a DetectedSource — input is an already-observed civ. */
export function toWireSource(
  o: ObservedCiv & { signal: ObservedSignal },
): DetectedSource {
  return {
    starId: o.starId,
    designation: o.designation,
    distanceLy: o.distanceLy,
    lightAgeYears: o.lightAgeYears,
    asOfYear: o.asOfYear,
    signal: o.signal,
  };
}

/** An inheritance candidate / the player's own civ — theirs to see in full. */
export interface CivCard {
  readonly candidateId: string;
  readonly seed: CivSeed;         // the whole record (yours; no leak)
  readonly archetypeName: string; // resolved server-side (keeps minds.ts off client)
  readonly archetypeFirstRead: string;
}

/** The one present-tense civ in the universe: your own, cyan HOME. */
export interface SelfView {
  readonly civId: string;
  readonly seed: CivSeed;
  readonly starId: string;
  readonly designation: string;
  readonly position: Vec3Ly;      // HOME mote location in the Model
}

// ── A2.1: the vigil's observatory ───────────────────────────────────────
// Belief shapes only — everything below is derived from delayed light
// (studies.ts), never truth. A study attaches to a DetectedSource by starId.

/** The full A2 hypothesis catalog (all five signal classes' menus). */
export type HypothesisId =
  | "brown-dwarf" | "rogue-world" | "cooled-remnant" | "somebodys-heart"
  | "debris-and-rings" | "natural-transits" | "construction-under-way"
  | "young-and-sloppy" | "deliberate-shine" | "a-performance"
  | "stable-biosphere" | "biosphere-in-crisis" | "pre-industrial" | "industrial-rise"
  | "meant-for-us" | "meant-for-someone-near-us" | "a-repeat";

/** One reading on the observatory. share is a proper distribution over the
 *  study's menu (sums to 1); each share sits strictly inside (0,1) — watching
 *  alone never settles a hypothesis. */
export interface Hypothesis {
  readonly id: HypothesisId;
  readonly label: string;
  /** One short plain-language phrase saying what this reading would MEAN,
   *  so the label never has to be decoded (studies.ts owns the wording). */
  readonly gloss: string;
  readonly share: number;
}

/**
 * One light arrival's read. Derived ONLY from the source's lightHistory —
 * a belief, never truth. `moved` is descriptive attribution in A2.1 (which
 * stories this arrival spoke to); it does not feed shares until A2.2's
 * bought answers do.
 *
 * The trail is a story: studies.ts returns it OLDEST-FIRST and the client
 * renders it in that order. `ordinal` is the 1-based position in the record
 * and `latest` marks the newest arrival, so a renderer needs no sort.
 */
export interface EvidenceEntry {
  readonly id: string;
  readonly ordinal: number;
  readonly latest: boolean;
  readonly asOfYear: number;
  readonly lightAgeYears: number;
  readonly annotation: string;
  readonly moved: readonly HypothesisId[];
  /** A2.2: which channel this entry arrived on — a light-history epoch, a
   *  bought question's finding, or a mission report. studies.ts cannot tell
   *  a bought answer from a probe report and does not need to; the client
   *  can still badge them differently. */
  readonly kind: "arrival" | "answer" | "report";
}

/**
 * The five states a vigil can be in. `grounded` is A2.2b's: a mission report
 * that arrived after the study was last opened closed it, and the belief it
 * settled came back from the ground rather than from the light. A2.3 adds
 * the other two exits — `called`, the player deciding they are done arguing,
 * and `overtaken`, the source ceasing to be the kind of thing the study was
 * opened on. All three are CLOSED (studies.ts's `isClosed`); `shelved` is
 * merely paused.
 */
export type StudyStatus = "open" | "shelved" | "grounded" | "called" | "overtaken";

/**
 * What grounded a study, for the board to name. Ids and dates only — the
 * report itself is already in the evidence trail (kind: "report"), and the
 * mission is already on the wire as a MissionSnapshot; this says which
 * report of which mission closed the study, and how old that reading is.
 */
export interface StudyGrounding {
  readonly missionId: string;
  readonly reportId: string;
  /** Sentence-case mission name for prose: "The Assay" / "The Sentinel". */
  readonly missionName: string;
  /** The target year the report speaks to — never newer than the sky. */
  readonly asOfYear: number;
  readonly lightAgeYears: number;
  /** The year the report reached home: asOfYear + distanceLy. */
  readonly arrivedYear: number;
}

/** One reading a study could tell apart, before any study exists — the same
 *  label and plain-language gloss Hypothesis carries, without the share. */
export interface HypothesisMenuEntry {
  readonly label: string;
  readonly gloss: string;
}

/**
 * Per signal class, the opening hypothesis menu in menu order — what a study
 * on such a source could tell apart, before one exists. Sent once on
 * `welcome` so the briefing screen names the readings without the client
 * keeping its own copy of the menus (studies.ts stays the one source of
 * truth). Wording only: no shares, nothing source-specific.
 */
export type HypothesisMenus = Readonly<
  Record<SignalClass, readonly HypothesisMenuEntry[]>
>;

/** offered: not yet bought. pending: bought, integration still running.
 *  answered: the finding has landed. */
export type QuestionState = "offered" | "pending" | "answered";

/**
 * The answer as the board shows it. Carries prose and dates only — no
 * truth field, no level, no ladder, nothing a caller could fill from the
 * wrong year (questions.ts's Finding is the server-side twin this derives
 * from; Finding itself never crosses the wire).
 */
export interface QuestionFinding {
  readonly id: string;
  readonly asOfYear: number; // = answersYear − distanceLy
  readonly lightAgeYears: number; // nowYear − asOfYear
  readonly annotation: string;
  readonly moved: readonly HypothesisId[];
  /** A2.3 adds `regress`: the answer landed and moved no share toward
   *  anything, but took definition out of the whole board. `moved` is empty
   *  on a regress, exactly as it is on a plateau. */
  readonly shape: "sharpen" | "plateau" | "regress";
}

/**
 * One question on a study: what it costs, what it would separate, and —
 * once bought — where its clock stands and what it found. `costCompute` /
 * `integrationYears` reflect any landed discount/haste project: a LIVE
 * preview while `offered`, frozen at `boughtYear` once bought
 * (synthesis.md §4 — effects never apply retroactively).
 */
export interface OpenQuestion {
  readonly id: QuestionId;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass; // "investment"
  readonly costCompute: number;
  readonly integrationYears: number;
  /**
   * The receipt behind a discounted `costCompute`: the catalog base and
   * the landed project(s) that granted the reduction, composed server-side
   * (ProjectSnapshot's effectLine precedent) — e.g. "DOWN FROM 90 COMPUTE
   * · GRANTED BY THE SPECTROGRAPH BANK". Null when no discount has landed,
   * which is the common case. Live while `offered`, frozen at `boughtYear`
   * once bought, exactly like the numbers it explains.
   */
  readonly costProvenance: string | null;
  /** Same receipt for a hastened `integrationYears`, or null. */
  readonly hasteProvenance: string | null;
  readonly separates: readonly HypothesisId[]; // derived per class at snapshot time
  readonly state: QuestionState;
  readonly boughtYear: number | null; // null iff offered
  readonly answersYear: number | null; // null iff offered; boughtYear + integrationYears
  readonly finding: QuestionFinding | null; // non-null iff answered
}

/**
 * The vigil's study for one source, keyed by starId. Adds nothing about the
 * remote civ beyond these belief shapes — signalClass mirrors the source's
 * classification, the rest is the board (studies.ts derives it all).
 */
export interface StudySnapshot {
  readonly starId: string;
  readonly status: StudyStatus;
  readonly signalClass: SignalClass;
  readonly hypotheses: readonly Hypothesis[];
  readonly evidence: readonly EvidenceEntry[];
  readonly openQuestions: readonly OpenQuestion[];
  readonly annotationLine: string;
  /** Non-null iff `status === "grounded"` (A2.2b). */
  readonly grounding: StudyGrounding | null;
  /**
   * A2.3: the mind's one sentence about a study that has regressed at least
   * once, banked in voice.ts and gated by `npm run audit:voice`. Null until a
   * regression has actually been earned. It states a CAUSE, which is why it
   * lives here and not in the finding's own annotation: the answer says the
   * look got worse, and this says the one thing an instrument cannot tell
   * you. `annotationLine` is untouched by it; the two claims stay apart.
   */
  readonly contestLine: string | null;
  /** A2.3: all three kinds, always, with the state the server computed. The
   *  chrome labels are the client's; nothing here names a condition's
   *  threshold, and there is no number on this row a client could send back. */
  readonly tripwires: readonly {
    readonly kind: TripwireKind;
    readonly state: "available" | "armed" | "tripped";
    readonly firedYear: number | null;
  }[];
  /**
   * A2.3: the belief FROZEN when the player called the study, non-null iff
   * `status === "called"`. It is a belief already on the wire plus two dates.
   * It is never compared against the live board anywhere, on either side.
   */
  readonly call: {
    readonly hypothesisId: string;
    readonly label: string;
    readonly gloss: string;
    readonly share: number;
    readonly calledYear: number;
    readonly lightAgeYears: number;
  } | null;
  /** A2.3: what the source turned into and what the study had believed up to
   *  then, frozen at the transition. Non-null iff `status === "overtaken"`. */
  readonly overtaking: {
    readonly fromClass: SignalClass;
    readonly toClass: SignalClass;
    readonly atYear: number;
    readonly lightAgeYears: number;
    readonly lead: {
      readonly id: string;
      readonly label: string;
      readonly gloss: string;
      readonly share: number;
    };
  } | null;
}

// ── A2.2: the compute economy ───────────────────────────────────────────
// The server resolves the catalog + this civ's state into these shapes so
// no catalog ships to the client — the archetypeName precedent.
// The currency is Compute, economy-design.md's price of knowing: looking is
// free at this stage, and what is finite is the inference. See projects.ts.

/** One project as seen from a specific civ's current state. */
export interface ProjectSnapshot {
  readonly id: string;
  readonly label: string;
  readonly line: string;
  /** What landing it grants, said plainly — projects.ts's effectLine. The
   *  detail sheet's whole answer to "why would I buy this"; the client
   *  never sees the effect union itself. */
  readonly effectLine: string;
  readonly costClass: CostClass;
  readonly costCompute: number;
  readonly durationYears: number;
  readonly addRatePerYear: number;
  readonly status: "available" | "running" | "standing";
  readonly startedYear: number | null; // null iff available
  readonly landsYear: number | null; // null iff available
}

/**
 * The civ's compute allocation — an allocation, not a balance: `free` is
 * what is not already committed, never a store of value. Since the 2026-07
 * scarcity pass that is enforced by the attention ceiling: `free`
 * saturates at `cap`, which grows only when income projects land.
 */
export interface ComputeBudget {
  readonly free: number; // uncommitted as of asOfYear
  readonly ratePerYear: number; // compute per GAME year
  /** The attention ceiling: the client clamps its local accrual here. */
  readonly cap: number;
  readonly asOfYear: number; // so the client accrues locally
}

// ── A2.2: probe-class missions and the Tend ───────────────────────────
// Belief/prose shapes only — every truth-adjacent member is prose and
// dates, never a number (missions.ts's whole no-leak story). A mission
// attaches to a source by starId; it has no `targetCivId` on the wire, the
// same drop toWireSource already makes for observerId/targetId.

export interface CharterClauseWire {
  readonly id: CharterClauseId;
  readonly label: string;
  readonly line: string;
}

/**
 * One report, as received. STRUCTURAL INVARIANT (missions.ts's
 * deriveReports, its one producer): `arrivedYear === aboutYear +
 * distanceLy`, and a report is only ever built for `aboutYear` at or below
 * the light cone — so `aboutYear` is never newer than the sky the
 * telescope already shows. The payload is PROSE AND DATES ONLY: no level,
 * no ladder, no ascension flag.
 */
export interface MissionReport {
  readonly id: string; // `${missionId}/r/${n}`
  readonly ordinal: number;
  readonly latest: boolean;
  readonly aboutYear: number;
  readonly arrivedYear: number; // = aboutYear + distanceLy
  readonly lightAgeYears: number; // nowYear − aboutYear
  readonly headline: string; // ≤6 words, ALL-CAPS set phrase
  readonly detail: string; // one or two plain sentences
  readonly moved: readonly HypothesisId[];
}

/**
 * One mission, as its owner sees it. Every field is either arithmetic on
 * public numbers (starId and distanceLy are already public via
 * DetectedSource) or comes from `deriveReports`. `reports` is the ONLY
 * truth-derived member, and it has exactly one producer
 * (missions.ts's toMissionSnapshot).
 */
export interface MissionSnapshot {
  readonly id: string;
  readonly kind: MissionKind;
  readonly label: string;
  readonly starId: string;
  readonly costClass: CostClass;
  readonly costCompute: number;
  readonly launchedYear: number;
  readonly distanceLy: number;
  readonly horizonYear: number; // launchedYear + 9d (at this mission's frozen speed)
  readonly arrivalYear: number; // launchedYear + 10d
  readonly firstWordYear: number; // launchedYear + 11d
  readonly nextWordYear: number | null; // next expected arrival, null if none
  /** The year of the FIRST promised word that never came — non-null iff
   *  `state === "silent"`. A silence has exactly one date: the year the
   *  schedule broke. What broke it is not knowable from here. */
  readonly missedWordYear: number | null;
  readonly charter: readonly CharterClauseWire[];
  readonly state: WorkState;
  readonly reports: readonly MissionReport[];
}

/**
 * Sent once on welcome, like `menus`: the launch surface's vocabulary, so
 * no mission catalog ships in the client bundle. Wording and constants
 * only — nothing source-specific, nothing about any civ.
 */
export interface MissionCatalog {
  readonly kinds: readonly MissionKindDef[];
  readonly clauses: readonly CharterClauseDef[];
  readonly minClauses: number; // 2
  readonly maxClauses: number; // 3
}

// ── AV1: the voice ─────────────────────────────────────────────
// One-time lines the mind speaks, resolved server-side (the archetypeName
// precedent — keeps voice.ts/minds.ts off the client). Nothing here concerns
// any remote civ: these are the player's own civilization only.

export type VoiceKey = "arrival" | "age" | "compute" | "clock" | "epoch" | "silence";
export const VOICE_KEYS: readonly VoiceKey[] = ["arrival", "age", "compute", "clock", "epoch", "silence"];
export function isVoiceKey(v: unknown): v is VoiceKey {
  // Derived from VOICE_KEYS so the union, the array, and the guard cannot
  // drift apart (adding "epoch" to only two of the three cost a real bug:
  // the client-side parse dropped every voice message whole).
  return typeof v === "string" && (VOICE_KEYS as readonly string[]).includes(v);
}

/** The lines this player has NOT yet been shown. A key absent means already
 *  seen — no-replay is carried by the payload's shape. Sent once per placed
 *  connection, never on `sky`. */
export type VoiceLines = Readonly<Partial<Record<VoiceKey, string>>>;

// ── AV2: the report ─────────────────────────────────────────────
// The observatory's annal. report.ts derives, materializes, and stores
// entries server-side; only rendered strings and resolved routes cross the
// wire, exactly as VoiceLines carries lines and never voice.ts's banks.
// report.ts is never re-exported through this module — the same discipline
// this file's own comment states for voice.ts.

/**
 * Where a tap on a report row goes. `mission` carries only `missionId`
 * (never a `starId`) — a mission survives its source (missions.ts's whole
 * "missions survive their sources" story), so the route must still resolve
 * once the source has faded below the wire.
 */
export type ReportRoute =
  | { readonly kind: "study"; readonly starId: string }
  | { readonly kind: "mission"; readonly missionId: string }
  | { readonly kind: "source"; readonly starId: string }
  | { readonly kind: "project"; readonly projectId: string }
  | { readonly kind: "none" };

/**
 * One row of the report: a frozen record sentence, its stamp, and at most
 * one archetype remark (report.ts's R-31 cadence — at most one per served
 * report, attached to the single highest-ranked new entry). `record` and
 * `stamp` are rendered once at materialization and never re-rendered, so a
 * re-read of the same report is byte-identical.
 */
export interface ReportEntry {
  readonly id: string;
  readonly stamp: string;
  readonly record: string;
  readonly remark: string | null;
  readonly route: ReportRoute;
}

/**
 * The served report. `header` is non-null only when report.ts's triage
 * thresholds fire (a long absence or a large batch of new entries);
 * `entries` is capped at REPORT_ON_WIRE, promoted-first when a header
 * fires, else newest-first.
 */
export interface ReportPayload {
  readonly header: string | null;
  readonly entries: readonly ReportEntry[];
}

// ── AV3: the mind proposes ─────────────────────────────────────────────
// The floor's candidate enumerator (server/src/proposals.ts) derives these
// from the same wire snapshots `sky` already assembles; only the rendered
// reason and a resolved route cross the wire — the VoiceLines/ReportEntry
// precedent, one more time. Banks (voice.ts) and fingerprints
// (proposals.ts's ProposalCandidate) never leave the server.

/** Where accepting a proposal routes. Every arm names an EXISTING client
 *  entry point; no arm opens anything AV3 builds. */
export type ProposalRoute =
  | { readonly kind: "study-brief"; readonly starId: string }
  | { readonly kind: "question"; readonly starId: string; readonly questionId: string }
  | { readonly kind: "launch"; readonly starId: string }
  | { readonly kind: "project"; readonly projectId: string };

/**
 * One proposal, resolved server-side. `line` is the deadpan reason (facts
 * pinned); `verb` is the accept label; `stance` is the mind's own
 * free-standing sentence and is ALWAYS null at the AV3 floor — AV4's
 * counsel seam is the only thing that ever fills it (ReportEntry.remark's
 * exact shape, above).
 */
export interface Proposal {
  readonly id: string;
  readonly line: string;
  readonly verb: string;
  readonly stance: string | null;
  readonly route: ProposalRoute;
}

// ── A2.4: the choice ceremony ──────────────────────────────────────────
// Hail one, speak to everyone, or stay dark. Everything rides `sky`: there
// is no new server message and no commit acknowledgment, because the commit
// handler sends a fresh sky immediately and that sky is the truth the client
// re-derives its stamps from. Nothing in this block is about anyone else —
// both stances are functions of the player's OWN dial sheet, and `outbound`
// is the player's own acts.

/**
 * Whether the mind objects to one kind of act, and what forcing it anyway
 * would cost. PUSHED, NEVER PREFLIGHTED: `contested` and `coherenceCost` are
 * pure functions of the civ's own dials, so the client can render the
 * objection before the ceremony arms, with no round trip and no staleness.
 *
 * `coherenceCost` is a number and the client renders the chip (the
 * `OpenQuestion.costCompute` precedent). `line` carries no numeral and could
 * not: the mind's sentence is fact-free prose, and the style gate rejects
 * digits in it.
 */
export interface ContactStance {
  readonly kind: ContactKind;
  readonly contested: boolean;
  /** The archetype's objection. Non-null iff `contested`. */
  readonly line: string | null;
  /** What the server will charge. 0 iff uncontested. */
  readonly coherenceCost: number;
}

/**
 * One of the player's own committed acts — the "your echo" view. It crosses
 * nothing new: a hail's `starId` is a source the player aimed at and already
 * sees, and `distanceLy` is already on the matching DetectedSource, so the
 * client computes every per-source arrival stamp locally.
 */
export interface OutboundAct {
  readonly id: string;
  readonly kind: ContactKind;
  /** Hail: the star aimed at. Broadcast: null, it is aimed at nobody. */
  readonly starId: string | null;
  readonly sentYear: number;
  /** Hail only: `sentYear + distanceLy`. */
  readonly arrivesYear: number | null;
  /** Broadcast only: `nowYear − sentYear`, the shell swept so far. */
  readonly shellRadiusLy: number | null;
}

export interface ContactWire {
  readonly hail: ContactStance;
  readonly broadcast: ContactStance;
  /** The player's own acts, in commit order. */
  readonly outbound: readonly OutboundAct[];
}

// client → server (UNTRUSTED — every field guarded on parse)
export type CohortClientMessage =
  | { type: "hello"; token: string | null }
  | { type: "become"; candidateId: string; name: string }
  | { type: "nameSource"; starId: string; name: string } // "" = delete
  | { type: "requestSky" }
  | { type: "openStudy"; starId: string }
  | { type: "shelveStudy"; starId: string }
  | { type: "startProject"; projectId: string }
  // ── A2.2 ──
  | { type: "buyQuestion"; starId: string; questionId: string }
  | { type: "launchMission"; starId: string; kind: string; charter: readonly string[] }
  // ── A2.3 ──
  // `kind` is parsed as a bare string and validated in the handler, the
  // `launchMission.kind` precedent: the parse layer checks types, the
  // handler owns the vocabulary and the error code.
  | { type: "callStudy"; starId: string }
  | { type: "armTripwire"; starId: string; kind: string }
  | { type: "disarmTripwire"; starId: string; kind: string }
  // ── AV1 ──
  | { type: "voiceSeen"; key: VoiceKey }
  // ── AV2 ──
  | { type: "requestReport" }
  // ── AV3 ──
  | { type: "declineProposal"; id: string }
  // ── A2.4 ──
  // `choice` is parsed as a bare string and validated in the handler, the
  // `launchMission.kind` precedent again. `acknowledged` is CONSENT, NEVER
  // PRICE: the server recomputes the resistance at commit and charges what
  // it computes, so a client that lies about this flag still pays the
  // server's number and a client that never rendered the objection cannot
  // silently wound the mind.
  | { type: "commitContact"; choice: string; starId: string | null; acknowledged: boolean };

// server → client
export type CohortServerMessage =
  | { type: "welcome"; token: string; phase: "choosing" | "placed";
      clock: ClockWire; catalog: readonly Star[]; menus: HypothesisMenus;
      missionCatalog: MissionCatalog }
  | { type: "offer"; candidates: readonly CivCard[] }
  | { type: "sky"; nowYear: number; self: SelfView;
      sources: readonly DetectedSource[];
      localNames: Readonly<Record<string, string>>;
      studies: readonly StudySnapshot[];
      projects: readonly ProjectSnapshot[];
      budget: ComputeBudget;
      missions: readonly MissionSnapshot[];
      tend: readonly TendRow[];
      /** The CURRENT effective probe speed (years per light-year), derived
       *  from landed probe-haste projects at nowYear — lets the launch
       *  sheet preview a mission's clock before committing. */
      probeFlightYearsPerLy: number;
      // ── AV3 ──
      proposals: readonly Proposal[];
      // ── A2.4 ──
      contact: ContactWire }
  | { type: "sourceNamed"; starId: string; name: string }
  /** A re-anchored clock, pushed when the server moves the anchor under a
   *  live connection (today only the dev time-skip; a future ratio retune
   *  would ride the same message). Clients replace their anchor wholesale. */
  | { type: "clock"; clock: ClockWire }
  // ── AV1 ──
  | { type: "voice"; lines: VoiceLines }
  // ── AV2 ──
  | { type: "report"; report: ReportPayload }
  | { type: "error"; code: CohortErrorCode; message: string };

export type CohortErrorCode =
  | "bad-name" | "unknown-candidate" | "cohort-full" | "not-placed" | "bad-message"
  | "unknown-project" | "already-running" | "insufficient-compute"
  // ── A2.2 ──
  | "unknown-question" // no such question id
  | "question-unavailable" // not offered on this class, or already bought
  | "unknown-mission-kind" // no such mission kind
  | "bad-charter" // wrong count, unknown clause, two from one group, wrong kind
  | "mission-unavailable" // a live mission of this kind already runs on this star
  // ── A2.3 ──
  | "study-unavailable" // not open or shelved: a closed study cannot be closed again
  | "tripwire-unavailable" // no such kind, or the condition already holds
  // ── A2.4 ──
  // Two codes, not five. Every way of naming a star that cannot be hailed
  // answers `bad-message` instead, deliberately: "unknown star", "star with
  // no civilization on it" and "star whose light has not reached you" must
  // be indistinguishable from outside, or the error code becomes an oracle.
  | "contact-unavailable" // already hailing them, already shouting, or the log is full
  | "contact-contested"; // the mind objects and the client did not acknowledge it

/** Parse-time bound on the untrusted `launchMission.charter` array (a parse
 *  concern); the 2–3 count rule and one-per-group rule are handler concerns
 *  answered with `bad-charter`. */
export const MAX_CHARTER_CLAUSES_ON_WIRE = 8;

/** Max civilization / local-source name length (post-trim). */
export const MAX_NAME_LEN = 24;

/**
 * Authoritative name validation (server calls this; client may pre-check).
 * Trims, collapses internal whitespace, rejects control chars, enforces
 * 1..MAX_NAME_LEN. Returns the cleaned name, or null if invalid.
 */
export function validateName(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length < 1 || collapsed.length > MAX_NAME_LEN) return null;
  // Reject C0/C1 controls and invisible/bidi format characters (zero-width
  // spaces, direction overrides, word joiners, BOM) — names must be what
  // they look like.
  for (const ch of collapsed) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return null;
    if (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2060 && code <= 0x206f) ||
      code === 0xfeff
    ) {
      return null;
    }
  }
  return collapsed;
}

/** Untrusted client→server parse. Mirror parseClientMessage's exact style:
 *  JSON.parse in try/catch, object/null checks, per-field typeof guards,
 *  return null on any mismatch. Do NOT validate name length here (the handler
 *  calls validateName and returns a specific error code); only check types. */
export function parseCohortClientMessage(raw: string): CohortClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (
    msg["type"] === "hello" &&
    (msg["token"] === null || typeof msg["token"] === "string")
  ) {
    return { type: "hello", token: msg["token"] };
  }

  if (
    msg["type"] === "become" &&
    typeof msg["candidateId"] === "string" &&
    typeof msg["name"] === "string"
  ) {
    return { type: "become", candidateId: msg["candidateId"], name: msg["name"] };
  }

  if (
    msg["type"] === "nameSource" &&
    typeof msg["starId"] === "string" &&
    typeof msg["name"] === "string"
  ) {
    return { type: "nameSource", starId: msg["starId"], name: msg["name"] };
  }

  if (msg["type"] === "openStudy" && typeof msg["starId"] === "string") {
    return { type: "openStudy", starId: msg["starId"] };
  }

  if (msg["type"] === "shelveStudy" && typeof msg["starId"] === "string") {
    return { type: "shelveStudy", starId: msg["starId"] };
  }

  if (msg["type"] === "startProject" && typeof msg["projectId"] === "string") {
    return { type: "startProject", projectId: msg["projectId"] };
  }

  if (
    msg["type"] === "buyQuestion" &&
    typeof msg["starId"] === "string" &&
    typeof msg["questionId"] === "string"
  ) {
    return { type: "buyQuestion", starId: msg["starId"], questionId: msg["questionId"] };
  }

  if (
    msg["type"] === "launchMission" &&
    typeof msg["starId"] === "string" &&
    typeof msg["kind"] === "string"
  ) {
    const raw: unknown = msg["charter"];
    if (Array.isArray(raw) && raw.length <= MAX_CHARTER_CLAUSES_ON_WIRE) {
      const charter: string[] = [];
      let ok = true;
      for (const clause of raw as readonly unknown[]) {
        if (typeof clause !== "string") {
          ok = false;
          break;
        }
        charter.push(clause);
      }
      if (ok) {
        return { type: "launchMission", starId: msg["starId"], kind: msg["kind"], charter };
      }
    }
  }

  if (msg["type"] === "callStudy" && typeof msg["starId"] === "string") {
    return { type: "callStudy", starId: msg["starId"] };
  }

  if (
    msg["type"] === "armTripwire" &&
    typeof msg["starId"] === "string" &&
    typeof msg["kind"] === "string"
  ) {
    return { type: "armTripwire", starId: msg["starId"], kind: msg["kind"] };
  }

  if (
    msg["type"] === "disarmTripwire" &&
    typeof msg["starId"] === "string" &&
    typeof msg["kind"] === "string"
  ) {
    return { type: "disarmTripwire", starId: msg["starId"], kind: msg["kind"] };
  }

  if (msg["type"] === "requestSky") {
    return { type: "requestSky" };
  }

  // AV1: no error code on a malformed voiceSeen. It is pure bookkeeping —
  // dropping it silently just means that one line replays next session — and
  // the client's global error handler releases in-flight purchase flags on
  // ANY "error" message, so an error code here would cancel a real
  // in-progress buy/launch for a bookkeeping miss. Fall through to null like
  // every other malformed message.
  if (msg["type"] === "voiceSeen" && isVoiceKey(msg["key"])) {
    return { type: "voiceSeen", key: msg["key"] };
  }

  // AV2: no fields, so nothing to guard beyond the discriminant. Same
  // silent-drop-on-mismatch story as everything above (bad-message isn't
  // wired for this — the panel just requests again).
  if (msg["type"] === "requestReport") {
    return { type: "requestReport" };
  }

  // AV3: no error code on a malformed declineProposal, and none on an
  // unknown id at the handler either. It is pure bookkeeping — dropping it
  // means the proposal shows once more — and the client's global error
  // handler releases in-flight purchase flags on ANY "error" message
  // (studyboard.ts's global error handler), so an error code here would
  // cancel a real in-progress buy/launch for a bookkeeping miss.
  if (msg["type"] === "declineProposal" && typeof msg["id"] === "string") {
    return { type: "declineProposal", id: msg["id"] };
  }

  // A2.4: the parse layer checks TYPES; the handler owns the vocabulary and
  // the error code (the `launchMission.kind` precedent). `starId` is
  // nullable on the wire because a broadcast is aimed at nobody and stay
  // dark aims at nothing at all.
  if (
    msg["type"] === "commitContact" &&
    typeof msg["choice"] === "string" &&
    (msg["starId"] === null || typeof msg["starId"] === "string") &&
    typeof msg["acknowledged"] === "boolean"
  ) {
    return {
      type: "commitContact",
      choice: msg["choice"],
      starId: msg["starId"],
      acknowledged: msg["acknowledged"],
    };
  }

  return null;
}

/** AV2: `route`'s discriminant against the closed ReportRoute set, each
 *  kind's own id field checked by name. A malformed route is a dead tap —
 *  better to drop the whole message (parseCohortServerMessage's `report`
 *  case) than hand the client a row it cannot act on. */
function isReportRoute(v: unknown): v is ReportRoute {
  if (typeof v !== "object" || v === null) return false;
  const r = v as { kind?: unknown };
  switch (r.kind) {
    case "study":
    case "source":
      return typeof (v as { starId?: unknown }).starId === "string";
    case "mission":
      return typeof (v as { missionId?: unknown }).missionId === "string";
    case "project":
      return typeof (v as { projectId?: unknown }).projectId === "string";
    case "none":
      return true;
    default:
      return false;
  }
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

/** AV3: the twin of isReportRoute above — discriminant against the closed
 *  ProposalRoute set, each kind's own id field checked by name. */
function isProposalRoute(v: unknown): v is ProposalRoute {
  if (typeof v !== "object" || v === null) return false;
  const r = v as { kind?: unknown };
  switch (r.kind) {
    case "study-brief":
    case "launch":
      return typeof (v as { starId?: unknown }).starId === "string";
    case "question":
      return (
        typeof (v as { starId?: unknown }).starId === "string" &&
        typeof (v as { questionId?: unknown }).questionId === "string"
      );
    case "project":
      return typeof (v as { projectId?: unknown }).projectId === "string";
    default:
      return false;
  }
}

/** AV3: field-by-field like parseReportPayload above, not the wholesale
 *  A1-era cast — a malformed proposal would render as a bogus row rather
 *  than a dropped message. Any mismatch anywhere drops the whole array (and
 *  its caller drops the whole `sky`). */
function parseProposals(v: unknown): readonly Proposal[] | null {
  if (!Array.isArray(v)) return null;
  const out: Proposal[] = [];
  for (const raw of v as readonly unknown[]) {
    if (typeof raw !== "object" || raw === null) return null;
    const p = raw as {
      id?: unknown;
      line?: unknown;
      verb?: unknown;
      stance?: unknown;
      route?: unknown;
    };
    if (typeof p.id !== "string") return null;
    if (typeof p.line !== "string") return null;
    if (typeof p.verb !== "string") return null;
    if (!isStringOrNull(p.stance)) return null;
    if (!isProposalRoute(p.route)) return null;
    out.push({ id: p.id, line: p.line, verb: p.verb, stance: p.stance, route: p.route });
  }
  return out;
}

/** AV2: field-by-field like `voice` above, not a wholesale cast — a
 *  malformed entry here would read as a bogus report row rather than a
 *  dropped message. Any mismatch anywhere in the payload drops the whole
 *  message (report.ts's frozen entries mean a partial parse could only ever
 *  be wrong, never a "best effort"). */
function parseReportPayload(v: unknown): ReportPayload | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as { header?: unknown; entries?: unknown };
  if (!isStringOrNull(p.header)) return null;
  if (!Array.isArray(p.entries)) return null;

  const entries: ReportEntry[] = [];
  for (const raw of p.entries as readonly unknown[]) {
    if (typeof raw !== "object" || raw === null) return null;
    const e = raw as {
      id?: unknown;
      stamp?: unknown;
      record?: unknown;
      remark?: unknown;
      route?: unknown;
    };
    if (typeof e.id !== "string") return null;
    if (typeof e.stamp !== "string") return null;
    if (typeof e.record !== "string") return null;
    if (!isStringOrNull(e.remark)) return null;
    if (!isReportRoute(e.route)) return null;
    entries.push({ id: e.id, stamp: e.stamp, record: e.record, remark: e.remark, route: e.route });
  }
  return { header: p.header, entries };
}

/** Server→client parse, client side. Mirror parseServerMessage exactly:
 *  JSON.parse, object/null check, switch on the discriminant tags above,
 *  cast to CohortServerMessage on match, else null. (Same-origin trust; the
 *  heavy payloads originate from our own server, as with parseServerMessage.) */
export function parseCohortServerMessage(raw: string): CohortServerMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as { type?: unknown };
  switch (msg.type) {
    case "welcome":
    case "offer":
    case "sourceNamed":
    case "error":
      return data as CohortServerMessage;
    // AV3: validate `proposals` field-by-field rather than trusting the
    // whole `sky` payload wholesale — a proposal row carries a tap that
    // navigates, so a malformed one should drop the message rather than
    // render a bogus row. Every other `sky` field keeps the A1-era
    // wholesale cast, the same two-tier discipline `report` below already
    // set: new payloads get real parsing, old ones keep their cast.
    case "sky": {
      const proposals = parseProposals((data as { proposals?: unknown }).proposals);
      if (proposals === null) return null;
      return { ...(data as Record<string, unknown>), proposals } as unknown as CohortServerMessage;
    }
    // AV1: unlike the cases above, validate `lines` field-by-field rather
    // than trusting the shape wholesale — the payload's whole contract is
    // "a key present means unseen," so a malformed key/value here would
    // read as a bogus voice line rather than a dropped message.
    case "voice": {
      const raw = data as { type: "voice"; lines?: unknown };
      if (typeof raw.lines !== "object" || raw.lines === null) return null;
      const lines: Partial<Record<VoiceKey, string>> = {};
      for (const [key, value] of Object.entries(raw.lines)) {
        if (!isVoiceKey(key) || typeof value !== "string") return null;
        lines[key] = value;
      }
      return { type: "voice", lines };
    }
    // AV2: same field-by-field discipline as `voice` just above, not the
    // wholesale cast the A1-era cases use — see parseReportPayload.
    case "report": {
      const raw = data as { type: "report"; report?: unknown };
      const report = parseReportPayload(raw.report);
      if (report === null) return null;
      return { type: "report", report };
    }
    default:
      return null;
  }
}
