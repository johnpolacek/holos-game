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

/** "called" | "overtaken" join in A2.3. `grounded` is A2.2b's: a mission
 *  report that arrived after the study was last opened closed it, and the
 *  belief it settled came back from the ground rather than from the light. */
export type StudyStatus = "open" | "shelved" | "grounded";

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
  readonly shape: "sharpen" | "plateau";
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
 * what is not already committed, never a store of value.
 */
export interface ComputeBudget {
  readonly free: number; // uncommitted as of asOfYear
  readonly ratePerYear: number; // compute per GAME year
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
  | { type: "launchMission"; starId: string; kind: string; charter: readonly string[] };

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
      probeFlightYearsPerLy: number }
  | { type: "sourceNamed"; starId: string; name: string }
  | { type: "error"; code: CohortErrorCode; message: string };

export type CohortErrorCode =
  | "bad-name" | "unknown-candidate" | "cohort-full" | "not-placed" | "bad-message"
  | "unknown-project" | "already-running" | "insufficient-compute"
  // ── A2.2 ──
  | "unknown-question" // no such question id
  | "question-unavailable" // not offered on this class, or already bought
  | "unknown-mission-kind" // no such mission kind
  | "bad-charter" // wrong count, unknown clause, two from one group, wrong kind
  | "mission-unavailable"; // a live mission of this kind already runs on this star

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

  if (msg["type"] === "requestSky") {
    return { type: "requestSky" };
  }

  return null;
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
    case "sky":
    case "sourceNamed":
    case "error":
      return data as CohortServerMessage;
    default:
      return null;
  }
}
