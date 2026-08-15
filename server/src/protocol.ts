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
import type { SpectralClass, Star, Vec3Ly } from "./galaxy";
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
import type { CeremonyKind, ContactKind } from "./contact";
// A2.5: the stamp is measured in traffic.ts (it is derived from the distance
// and nothing else) and rendered by the client, so it is named here the way
// ObservedSignal is — a type-only re-export, erased at build, pulling no
// truth-side runtime behind it.
import type { PhysicsStamp } from "./traffic";
// A2.6: the composed-signal grammar. Type-only on purpose — signalparts.ts
// carries the materializer and therefore imports the knowledge layer, and
// this module is the one the CLIENT imports. Types are erased at build, so
// the grammar's shapes reach a phone and not one byte of its truth code.
import type { AccordState, SignalPart, SignalTone } from "./signalparts";
// A4: the voyage vocabulary. TYPE-ONLY, and it has to be — voyages.ts reaches
// the knowledge layer and the world draw, and this module is the one the
// CLIENT imports. The catalogs themselves ride the wire inside `VoyageCatalog`
// (the MissionCatalog precedent), so no truth code follows the types onto a
// phone.
import type {
  VoyageClauseDef,
  VoyageClauseId,
  VoyageKind,
  VoyageKindDef,
  VoyageWorkState,
} from "./voyages";
import type { PriorBand, WidthChip, WorldClass } from "./worlds";
// A4: the axis id a drift reading names. dials.ts is already re-exported
// wholesale below; this is the import side of the same borrowing.
import type { DialAxisId } from "./dials";
// A4, the aftermath: the Ledger's vocabulary and the standing-order catalog's.
// Type-only for the voyage half's exact reason — lineage.ts reads the knowledge
// layer and orders.ts names the mission catalog, and this is the module the
// CLIENT imports.
import type {
  DriftBand,
  DriftVia,
  LedgerRelation,
  LedgerRowState,
  LineageThreadState,
} from "./lineage";
import type { OrderClass, OrderOutcome } from "./orders";

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
export type { CeremonyKind, ContactKind } from "./contact";
export type { PhysicsStamp } from "./traffic";
// A2.6: the grammar's shapes, re-exported for the composer and the thread
// renderer. TYPES ONLY, and `TONE_STAMP` is deliberately NOT among them —
// the stamp strings are chrome the client owns, in the same way block labels
// and class labels already are.
export type {
  AccordForm,
  AccordMove,
  AccordState,
  ArchivePart,
  ArchiveSample,
  ArchiveWindow,
  CulturePart,
  CultureSource,
  FindingDepth,
  FindingPart,
  PartKind,
  PartRef,
  RequestPart,
  RequestWant,
  SightingPart,
  SignalPart,
  SignalTone,
  VerdictPart,
  VerdictStance,
} from "./signalparts";
// A4: the launch surface's own vocabulary, re-exported the way the mission
// catalog's is. Types only; the catalog VALUES arrive on `welcome`.
export type {
  VoyageClauseDef,
  VoyageClauseGroupId,
  VoyageClauseId,
  VoyageKind,
  VoyageKindDef,
  VoyageWorkState,
} from "./voyages";
export type { PriorBand, WidthChip, WorldClass, YieldBand } from "./worlds";
// A4, the aftermath. The Ledger's own vocabulary (lineage.ts) and the
// standing-order catalog's (orders.ts), types only, exactly as the mission
// and voyage vocabularies above.
export type {
  DriftBand,
  DriftVia,
  LedgerRelation,
  LedgerRowState,
  LineageThreadState,
} from "./lineage";
export type { OrderClass, OrderClassDef, OrderOutcome } from "./orders";

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

/** offered: not yet bought. answered: bought, and the finding is in hand.
 *  There is no third state and there cannot be one — a question answers the
 *  year it is bought (physics-audit.md P0-1), so nothing about it is ever
 *  under way. */
export type QuestionState = "offered" | "answered";

/**
 * The answer as the board shows it. Carries prose and dates only — no
 * truth field, no level, no ladder, nothing a caller could fill from the
 * wrong year (questions.ts's Finding is the server-side twin this derives
 * from; Finding itself never crosses the wire).
 */
export interface QuestionFinding {
  readonly id: string;
  readonly asOfYear: number; // = boughtYear − distanceLy, the light-cone edge
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
 * once bought — what it found. There is no clock on this shape: the price
 * is the whole of what a question asks of a player, and the answer lands
 * the year the compute is committed. `costCompute` reflects any landed
 * discount project: a LIVE preview while `offered`, frozen at `boughtYear`
 * once bought (synthesis.md §4 — effects never apply retroactively).
 */
export interface OpenQuestion {
  readonly id: QuestionId;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass; // "investment"
  readonly costCompute: number;
  /**
   * The receipt behind a discounted `costCompute`: the catalog base and
   * the landed project(s) that granted the reduction, composed server-side
   * (ProjectSnapshot's effectLine precedent) — e.g. "DOWN FROM 90 COMPUTE
   * · GRANTED BY THE SPECTROGRAPH BANK". Null when no discount has landed,
   * which is the common case. Live while `offered`, frozen at `boughtYear`
   * once bought, exactly like the number it explains.
   */
  readonly costProvenance: string | null;
  readonly separates: readonly HypothesisId[]; // derived per class at snapshot time
  readonly state: QuestionState;
  /** null iff offered. Once set it is also the year the answer landed. */
  readonly boughtYear: number | null;
  /**
   * Non-null once `answered`. The one gap is arithmetically unreachable:
   * questions.ts still asks the light cone for the purchase year before it
   * answers, and a year at or before now is always inside the cone. The
   * field stays nullable so that guard stays a guard.
   */
  readonly finding: QuestionFinding | null;
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

// ── A4: voyages, the forecast survey, and the derived landfall ─────────────
// The mission wire's discipline, one act later. A VoyageSnapshot is PROSE AND
// DATES ONLY: no emission level, no ladder, no ascension flag, no cradle id,
// no `ownerToken`. The one truth-derived member is `report`, and it has
// exactly one producer (voyages.ts's `voyageOutcome`, which reads through a
// LightCone or a StarCone and can produce nothing above either).
//
// THE CHILD IS NOT ON THIS WIRE AT ALL. A founded colony reaches its parent
// exactly as any other civilization does: as a DetectedSource, once its light
// has crossed the distance. There is no field here that says a colony exists,
// which is why a `found-dark` founding is unknowable rather than merely
// unstated.

export interface VoyageClauseWire {
  readonly id: VoyageClauseId;
  readonly label: string;
  readonly line: string;
}

/**
 * The landfall report, as received. STRUCTURAL INVARIANT (voyages.ts's
 * `voyageOutcome`, its one producer): `arrivedYear === aboutYear + distanceLy`
 * and it is built only once `nowYear` has reached `arrivedYear`, so `aboutYear`
 * is never newer than the sky the telescope already shows.
 */
export interface VoyageReport {
  readonly id: string; // `${voyageId}/landfall`
  readonly aboutYear: number; // the landfall year
  readonly arrivedYear: number; // = aboutYear + distanceLy
  readonly lightAgeYears: number; // nowYear − aboutYear
  readonly headline: string; // ≤6 words, ALL-CAPS set phrase
  readonly detail: string; // one or two plain sentences
}

export interface VoyageSnapshot {
  readonly id: string;
  readonly kind: VoyageKind;
  readonly label: string;
  /** The colony's name, as its founders were told to call it. The one piece
   *  of player-authored text in the record, `validateName`-clean. */
  readonly childName: string;
  readonly starId: string;
  readonly costClass: CostClass;
  readonly costCompute: number;
  readonly launchedYear: number;
  readonly distanceLy: number;
  readonly horizonYear: number; // launchedYear + (F − 1)d
  readonly landfallYear: number; // launchedYear + F·d
  readonly firstWordYear: number; // launchedYear + (F + 1)d
  /** The year the promised word did not come — non-null iff `state` is
   *  "silent". A `send-no-word` charter never has one: nothing was promised. */
  readonly missedWordYear: number | null;
  readonly charter: readonly VoyageClauseWire[];
  readonly state: VoyageWorkState;
  readonly report: VoyageReport | null;
}

/** One class's share of the arrival spread, as a WORD. Bands and never
 *  percentages: the forecast is a guess about a place nobody has been, and a
 *  percentage would dress it as a measurement. */
export interface SurveyPriorWire {
  readonly worldClass: WorldClass;
  readonly band: PriorBand;
}

/** What each ship kind would cost this row in TIME. Durations, not absolute
 *  years, so the client adds its own `nowYear` and a stale row cannot show a
 *  landfall in the past. */
export interface SurveyClock {
  readonly kind: VoyageKind;
  readonly flightYears: number;
  readonly firstWordYears: number;
  /** (1 + F)·d — how old the news is at the moment the ship arrives. */
  readonly infoAgeYears: number;
}

/**
 * One star on the forecast survey. EVERY FIELD IS PUBLIC OR A PRIOR: the
 * designation, distance and spectral class already ride the star catalog the
 * client is welcomed with; the priors are conditioned on the spectral class
 * alone; and `occupied` is `visibleSky` membership, which is the same test
 * that produced this player's own `sources`. Nothing here consults a live
 * voyage, this player's or anyone else's.
 */
export interface SurveyRow {
  readonly starId: string;
  readonly designation: string;
  readonly distanceLy: number;
  readonly spectralClass: SpectralClass;
  readonly priors: readonly SurveyPriorWire[];
  readonly widthChip: WidthChip;
  readonly occupied: boolean;
  /** The age of the light this reading rests on, when there is a source
   *  there. Null when the sky shows nothing: an empty star has no light age,
   *  and a zero would be a claim. */
  readonly lightAgeYears: number | null;
  readonly clocks: readonly SurveyClock[];
}

/** Sent once on welcome beside `missionCatalog`: the launch sheet's
 *  vocabulary, so no voyage catalog ships in the client bundle. */
export interface VoyageCatalog {
  readonly kinds: readonly VoyageKindDef[];
  readonly clauses: readonly VoyageClauseDef[];
  readonly minClauses: number; // 2
  readonly maxClauses: number; // 4
  readonly dialSteps: number; // 9
  readonly maxPerToken: number; // 8
  /** The static occupied-risk line. Static on purpose: a line that varied
   *  with what is actually inbound would leak every other player's plans. */
  readonly occupiedRiskLine: string;
}

// ── A4: THE LEDGER ─────────────────────────────────────────────
// What became of the foundings, and what a standing order did while nobody
// was looking. Rides `sky` beside `voyages`, bounded by the same cap
// (MAX_VOYAGES_PER_TOKEN rows, one row per voyage this token launched).
//
// THE NO-LEAK ASSERTIONS, restated on the shapes the way the voyage half's
// are, because a field added here without reading them is how a leak ships:
//
//  - NO FIELD BELOW DERIVES FROM LIVE TRUTH. A row's `state` is parent-clock
//    arithmetic (`launchedYear`, `foundingYear`, `confirmYear` are all
//    computed from the launch record) plus `observeCiv`, which is the same
//    gate every source on this wire already came through.
//  - `readings` come only from CLIPPED `lightHistory` and from acts that have
//    ARRIVED. A child below the detection floor produces no light reading at
//    all, and a child that has said nothing produces no stated reading: the
//    band reads `unread`, which is the honest answer and not a zero.
//  - `band` is a pure function of the readings, so it can say nothing the
//    readings do not already say.
//  - `nextExchangeYear` IS YOUR OWN NEXT ARRIVAL AND NEVER A PREDICTED REPLY
//    (ThreadSummary.nextEventYear's rule, cited rather than re-argued: a
//    predicted reply is a claim about a decision that has not been made).
//  - Rows exist ONLY for voyages this token launched. A row is never news
//    about anybody else's founding.

/**
 * One dial axis the parent has actually read something about, and whether
 * what it read agrees with what the charter said. MAGNITUDE ONLY: there is no
 * "how far" here, because a disagreement is a fact and a distance would be a
 * measurement nobody took.
 */
export interface DriftReading {
  readonly axis: DialAxisId;
  /** The dial's own question (dials.ts), so the row can be read without the
   *  axis id meaning anything to the reader. */
  readonly question: string;
  /** The pole the charter wrote, in world words. */
  readonly charterPole: string;
  /** The pole the parent has actually read, in the same words. */
  readonly readPole: string;
  readonly agrees: boolean;
  readonly via: DriftVia;
  /** The target year this reading speaks to, and how old it is now. Every
   *  reading carries ITS OWN pair: a light reading is `nowYear − distance`,
   *  a stated one is the year the signal was sent. */
  readonly asOfYear: number;
  readonly lightAgeYears: number;
}

/**
 * One founding, for as long as the record lasts. KEYED ON THE VOYAGE, never
 * on a DetectedSource: missions survive their sources and so do children, and
 * a row keyed on the star would stop resolving the moment the colony fell
 * below the wire. Never deleted, never groomed.
 */
export interface LedgerRow {
  readonly voyageId: string;
  readonly relation: LedgerRelation;
  /** The colony's name, as its founders were told to call it — the one piece
   *  of player-authored text a row carries, `validateName`-clean. */
  readonly childName: string;
  readonly starId: string;
  readonly designation: string;
  readonly distanceLy: number;
  readonly launchedYear: number;
  readonly foundingYear: number; // launchedYear + F·d
  readonly confirmYear: number; // foundingYear + d
  readonly state: LedgerRowState;
  /** The headline staleness chip, off the NEWEST reading. Null before
   *  anything has come back: the client renders nothing, never a zero. */
  readonly asOfYear: number | null;
  readonly lightAgeYears: number | null;
  readonly band: DriftBand;
  /** Non-null once the band has ever been `independent`. LATCHED: a better
   *  sample afterwards cannot take it back. */
  readonly independentSinceYear: number | null;
  /** The year the CURRENT band was first entered, for the annal's crossing
   *  entry. Null while the band is `unread`. */
  readonly bandSinceYear: number | null;
  /** Non-null iff `state` is "dark": the year the grace on the first light
   *  ran out. The annal's unspoken entry stamps here. */
  readonly darkSinceYear: number | null;
  readonly observedAxes: number; // 0..5
  readonly disagreements: number;
  /** At most one per axis (≤5), for the fork detail. */
  readonly readings: readonly DriftReading[];
  readonly thread: LineageThreadState;
  readonly lastExchangeYear: number | null;
  /** YOUR OWN next arrival, and nothing else. Null when nothing of yours is
   *  in flight. */
  readonly nextExchangeYear: number | null;
  readonly muted: boolean;
  /** The charter as one sentence, derived at wire time from the clause
   *  catalog and the sheet. Not stored: it is the same charter it always was,
   *  and storing a rendering of it would be a second copy to disagree with. */
  readonly charterLine: string;
  /** The band's own sentence (voice.ts's bank), so the client renders no
   *  drift prose of its own. */
  readonly bandLine: string;
}

/**
 * One standing order, in every state it can be in. The catalog is the bound
 * on what may be armed and the wire carries the whole of it, so a client can
 * never name a class the server did not offer.
 */
export interface StandingOrderWire {
  readonly orderClass: OrderClass;
  readonly label: string;
  readonly line: string;
  readonly state: "available" | "armed" | "fired";
  readonly armedYear: number | null;
  readonly firedYear: number | null;
  /** The source that met the condition, on EVERY outcome — a fire that could
   *  not be paid for still found something, and the record says what. Null
   *  only while the order has not fired. */
  readonly firedStarId: string | null;
  readonly outcome: OrderOutcome | null;
  /** How old the light that set it off was AT THE MOMENT IT FIRED. Frozen
   *  with the firing, never recomputed against a later `nowYear`: the order
   *  acted on what it had, and what it had does not get older in the record. */
  readonly evidenceAgeYears: number | null;
  readonly charter: readonly CharterClauseId[];
  readonly costCompute: number;
  readonly radiusLy: number;
}

export interface LedgerWire {
  readonly rows: readonly LedgerRow[];
  readonly orders: readonly StandingOrderWire[];
}

// ── AV1: the voice ─────────────────────────────────────────────
// One-time lines the mind speaks, resolved server-side (the archetypeName
// precedent — keeps voice.ts/minds.ts off the client). Nothing here concerns
// any remote civ: these are the player's own civilization only.

export type VoiceKey =
  | "arrival" | "age" | "compute" | "clock" | "epoch" | "silence"
  // S0.1: the four intro beats after the ceremony's BECOME. Kept as four
  // keys, not one, so `seen` tracks each beat independently the way every
  // other frame line does — a client that dismissed beat three but dropped
  // its connection before beat four gets exactly the tail on reconnect.
  | "intro1" | "intro2" | "intro3" | "intro4";
export const VOICE_KEYS: readonly VoiceKey[] = [
  "arrival", "age", "compute", "clock", "epoch", "silence",
  "intro1", "intro2", "intro3", "intro4",
];
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
  // A4: a voyage, by id and never by star, for the same reason a mission is —
  // the undertaking outlives what it was aimed at, and a route keyed on the
  // star would stop resolving the moment the source faded.
  | { readonly kind: "voyage"; readonly voyageId: string }
  // A4: a Ledger row, by the voyage that made it. Same key as the row itself,
  // and for the same reason — a child is a relationship that outlives every
  // source it was ever visible as.
  | { readonly kind: "ledger"; readonly voyageId: string }
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
  /** CeremonyKind, not ContactKind: a signal is never contested, so there is
   *  no stance about one to render. */
  readonly kind: CeremonyKind;
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
  /**
   * A2.5 widens this to the full ContactKind and adds NOTHING else: a signal
   * already has a `starId` and an `arrivesYear`, which is the whole in-flight
   * render, so the Model's outbound pass generalizes with no new field.
   */
  readonly kind: ContactKind;
  /** Hail/signal: the star aimed at. Broadcast: null, it is aimed at nobody. */
  readonly starId: string | null;
  readonly sentYear: number;
  /** Hail/signal only: `sentYear + distanceLy`. */
  readonly arrivesYear: number | null;
  /** Broadcast only: `nowYear − sentYear`, the shell swept so far. */
  readonly shellRadiusLy: number | null;
}

// ── A2.5: threads ──────────────────────────────────────────────────────────
//
// A thread is one ordered pair (you, them) and the log's own order; it has no
// stored identity, which is why every shape below is keyed by `starId`.
//
// THE NO-LEAK AUDIT, written where the shapes are so it cannot drift from
// them:
//  - `nextEventYear` NEVER carries a pending reply. Knowing that an answer is
//    coming is knowing their present. Once your signal lands, the state is
//    `awaiting` and `nextEventYear` is null.
//  - An inbound signal reaches this wire only once `arrivesYear <= nowYear`.
//    Future-dated derived signals are legal, ordinary, and INVISIBLE.
//  - No inbound arc renders on the Model. You cannot see a beam before it
//    lands, and there is no field here that would let you.

/**
 * Where a thread stands, from YOUR side of the light.
 *
 * `silent` is a statement about your own arithmetic and not about them: the
 * window in which an answer could have arrived has passed. It leaks nothing,
 * because you computed it from the distance you already knew and a bound on
 * deliberation that is the same for every counterpart of that class.
 */
export type ThreadState =
  | "unopened"
  | "in-flight"
  | "awaiting"
  | "answered"
  | "silent"
  | "withdrawn";

export interface ThreadSignal {
  /**
   * A2.6: AN OPAQUE PER-THREAD ORDINAL, `sig/0`, `sig/1`, minted in
   * `buildThreads` and meaningful nowhere else. The underlying ids (a log
   * act's `act-N`, a derived reply's `ai/...`) NEVER REACH THE WIRE: a stored
   * act id counts the whole galaxy's log and a derived id names its own
   * derivation, and either one would say which side of the machinery a
   * signal came from. `inReplyTo` and every reference inside `parts` live in
   * this same namespace.
   */
  readonly id: string;
  readonly from: "you" | "them";
  readonly kind: ContactKind;
  readonly sentYear: number;
  readonly arrivesYear: number;
  /**
   * The rendered line. A2.6 composes it SERVER-SIDE on both paths from the
   * same two banks (voice.ts: a tone or accord clause, then the sender's
   * archetype register), so a body is never evidence about who composed it.
   * Null on a hail, which carries no payload, and on a legacy A2.5 act it is
   * that act's own player prose.
   */
  readonly body: string | null;
  /** A2.6: exactly one tone per signal. Null on a hail and on legacy acts. */
  readonly tone: SignalTone | null;
  /**
   * A2.6: the payload, materialized from the SENDER's own state at send and
   * frozen. Empty is legal and ordinary — a carrier is a beam with nothing on
   * it, arriving dated.
   */
  readonly parts: readonly SignalPart[];
  /**
   * The instrument readout, rendered ABOVE the payload. Non-null only on a
   * signal you RECEIVED: a stamp measures an arriving beam, and you have no
   * instrument at the far end of your own. Your own landing year is your own
   * arithmetic, never a receipt.
   */
  readonly stamp: PhysicsStamp | null;
  readonly inReplyTo: string | null;
}

/**
 * A2.6, THE COMPLIANCE RAIL. The mutual quiet has no stored object behind it:
 * this whole block is derived from the accord moves that have ARRIVED on this
 * side, plus one read of the counterpart's OBSERVED light.
 *
 * `theirLight` is A BELIEF ABOUT THE PAST and the wire says so by carrying
 * `asOfYear` beside it. It is `emissionAt` on the counterpart's observed
 * history since the accord year against the darkness floor, arriving on
 * delay like everything else; it is never a verdict, and a breach read here
 * ends the accord with no message from anybody, which is what keeps a thread
 * cap from locking somebody into one.
 */
export interface AccordRail {
  readonly form: "mutual-quiet";
  readonly state: AccordState;
  /** The year THIS SIDE learned the accord was accepted. Null unless held. */
  readonly heldSinceYear: number | null;
  /** Null until light from the accord era has actually arrived. */
  readonly theirLight: "below-the-floor" | "above-the-floor" | null;
  /** The target year that reading speaks to. */
  readonly asOfYear: number | null;
  // Which moves the composer may offer right now. Derived from the same view
  // the materializer validates against, so a chip the client shows is a chip
  // the server will accept.
  readonly canOffer: boolean;
  readonly canAccept: boolean;
  readonly canDecline: boolean;
  readonly canWithdraw: boolean;
}

export interface ThreadSummary {
  readonly starId: string;
  readonly state: ThreadState;
  readonly signalCount: number;
  readonly lastEventYear: number;
  /** YOUR OWN next arrival only. NEVER a predicted reply. */
  readonly nextEventYear: number | null;
  /** You have hailed them and the thread has room: the composer is live. */
  readonly canSpeak: boolean;
  /** A2.6: the mutual quiet, from this side of the light. */
  readonly accord: AccordRail;
}

export interface ThreadDetail extends ThreadSummary {
  /** Oldest to newest, by the year YOU learned of each: at most
   *  MAX_SIGNALS_ON_WIRE, newest kept. */
  readonly signals: readonly ThreadSignal[];
  readonly truncated: boolean;
}

export interface ContactWire {
  readonly hail: ContactStance;
  readonly broadcast: ContactStance;
  /** The player's own acts, in commit order. */
  readonly outbound: readonly OutboundAct[];
  // ── A2.5 ──
  /** One row per thread, list view. */
  readonly threads: readonly ThreadSummary[];
  /** The one thread this CONNECTION has open, in full. Per-connection UI
   *  state with no DO key behind it: a reconnect re-sends `openThread`. */
  readonly openThread: ThreadDetail | null;
  // ── A2.6 ──
  /**
   * Threads this player has gone dark to. They are ABSENT from `threads` and
   * can never be `openThread`; this list exists so the player can find what
   * they muted and undo it, and it carries a star id and nothing else — no
   * count, no state, no last event. A mute is not a record of a
   * conversation, it is the absence of one.
   */
  readonly mutedStarIds: readonly string[];
}

/**
 * A2.6 (durable identity): the parse-layer bound on a submitted account key,
 * in CODE POINTS, in the MAX_PART_STRING_CPS mould. The real rule is
 * `normalizeAccountKey`'s — exactly twenty symbols after folding — and this is
 * only the bound that stops an untrusted string from being walked at all. It
 * is generous on purpose: a person typing their key with the display hyphens
 * in, or with spaces, is well inside it.
 */
export const MAX_ACCOUNT_KEY_ON_WIRE = 64;

/**
 * A5: the bound on a push endpoint the parse layer will accept. Push services
 * mint long opaque URLs (FCM's run to about two hundred characters), so this
 * is generous by a wide margin and exists only so a hostile client cannot
 * spend a kilobyte of storage per message. The VOCABULARY of a legal endpoint
 * — https, a default port, an allowlisted host — belongs to push.ts's
 * `validatePushEndpoint`, which mirrors this bound as its own second gate.
 */
export const MAX_PUSH_ENDPOINT_CHARS = 1024;

// client → server (UNTRUSTED — every field guarded on parse)
export type CohortClientMessage =
  /**
   * A2.6: `hello` carries BOTH credentials, and the precedence between them is
   * the server's rule, not the client's: a non-null `account` means the token
   * is IGNORED WHOLE. That is what makes signing in on a device that already
   * holds an anonymous run a well-defined act rather than a merge.
   *
   * `account` is nullable and an ABSENT field parses as null, which is the
   * whole compatibility story: a tab left open across the deploy that
   * introduced this keeps sending `{type, token}` and keeps working.
   */
  | { type: "hello"; token: string | null; account: string | null }
  /** A2.6: claim this seat — mint an account and bind it to the run token this
   *  connection is already on. Takes no argument, because the seat it claims
   *  is the one the connection is sitting in. */
  | { type: "claimAccount" }
  /** A2.6: show me the key again. Served only to a connection that is already
   *  signed in (`not-signed-in` otherwise) — it re-reads THIS seat's key and
   *  can name no other. */
  | { type: "showAccountKey" }
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
  // S0.1: the Mind page's replay entry. No payload: there is exactly one
  // intro to ask for, and asking for it again is exactly the replay.
  | { type: "requestIntro" }
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
  | { type: "commitContact"; choice: string; starId: string | null; acknowledged: boolean }
  // ── A2.6 ──
  // THE COMPOSED SIGNAL. `tone` is a bare string and `parts` is an array of
  // bare `unknown`s: the parse layer checks SHAPE (array bound, per-string
  // bound, finite integers, no nesting) and signalparts.ts owns the
  // VOCABULARY and the error code, which is the `launchMission.kind`
  // precedent one more time.
  //
  // There is no `text` field and there is deliberately no way to add one:
  // the client sends SELECTORS, the server materializes every part from the
  // sender's own state, and no player-authored string crosses between
  // players at parse level. That sentence is the moderation posture, and it
  // is greppable from right here.
  | { type: "sendSignal"; starId: string; tone: string; parts: readonly unknown[] }
  // A2.6: go dark to one thread. A TOGGLE, and pure bookkeeping on the muted
  // player's own side — the sender's send still commits, their thread still
  // renders, their beam still lands, and nothing is notified. Deniability is
  // the whole design (conduct.md's "any player can go dark to a sender").
  | { type: "muteThread"; starId: string; muted: boolean }
  // ── A4 ──
  // THE FOUNDING. `kind` and every `charter` entry are bare strings and every
  // `dials` element is a bare `unknown`: the parse layer checks SHAPE (array
  // bounds, finite numbers, flat objects) and voyages.ts owns the VOCABULARY
  // and the error codes, which is the `launchMission.kind` precedent one more
  // time. `name` is the ONE piece of free text a voyage carries, and it goes
  // through `validateName` in the handler exactly as `become` and `nameSource`
  // do.
  //
  // An illegal star answers `bad-message`, never a code of its own: unknown
  // star, the player's own home star, and a star that could not be reached
  // must be indistinguishable from outside (A2.4's oracle rule, unchanged).
  | { type: "launchVoyage"; starId: string; kind: string;
      charter: readonly string[]; dials: readonly unknown[]; name: string }
  // A4: THE STANDING ORDER. `orderClass` is a bare string and `charter` a
  // bounded array of bare `unknown`s — the parse layer checks SHAPE and
  // orders.ts owns the vocabulary, the `launchMission.kind` precedent again.
  //
  // ARMING IS THE CONSENT AND THE CHARTER IS ITS CONTENT: the message carries
  // the charter the fire will launch under, because a player who arms an
  // order is authorizing a specific dispatch and not a blank one. It names no
  // star, and could not: what the order will find has not happened yet.
  | { type: "armOrder"; orderClass: string; charter: readonly unknown[] }
  | { type: "disarmOrder"; orderClass: string }
  // Which thread is on screen is per-CONNECTION UI state. Null closes it.
  // There is no DO key behind this and there is deliberately no error code:
  // it is bookkeeping (the declineProposal precedent), and a starId naming
  // no thread simply produces a null detail, which is also the answer for a
  // starId naming nothing at all — so it cannot be used as an oracle.
  | { type: "openThread"; starId: string | null }
  // ── A5 ──
  // WEB PUSH, and the shape is the whole no-leak argument. The endpoint is a
  // bare string: the parse layer checks SHAPE (a string, bounded) and the
  // handler owns the vocabulary (https, an allowlisted host) and the error
  // code, the `launchMission.kind` precedent again.
  //
  // There is no key material on either message and there is deliberately no
  // field for any. The server does not encrypt push payloads and must not be
  // able to: it holds no `p256dh` and no `auth`, so there is no code path that
  // could put a fact on a push service's wire even if a later change tried.
  | { type: "pushSubscribe"; endpoint: string }
  | { type: "pushUnsubscribe"; endpoint: string };

// server → client
export type CohortServerMessage =
  /**
   * A2.6 widens `token` to nullable and adds `account`.
   *
   * `token` is NULL on an account-authenticated welcome, and the client stores
   * it only when it is non-null. That is not squeamishness: the seat id is a
   * credential only while the seat is unclaimed, and handing it back to a
   * device that authenticated with a key would leave that device holding a
   * second way in that no one can revoke.
   *
   * `account` is a BOOLEAN and could not be anything else — this message goes
   * to one player about their own session, and there is no account-shaped
   * value another player could ever be told.
   */
  | { type: "welcome"; token: string | null; account: boolean;
      phase: "choosing" | "placed";
      clock: ClockWire; catalog: readonly Star[]; menus: HypothesisMenus;
      missionCatalog: MissionCatalog;
      // ── A4 ──
      voyageCatalog: VoyageCatalog;
      // ── A5 ──
      /**
       * The VAPID application server key this deployment subscribes with, or
       * null when no keypair is configured (the dev default: the client never
       * asks, the hub row never renders).
       *
       * It sits on `welcome` beside the catalogs because it is a CONSTANT OF
       * THE DEPLOYMENT, identical for every player, and therefore incapable
       * of carrying anything about anyone.
       */
      push: { publicKey: string } | null }
  /**
   * A2.6: THE ONE MESSAGE THAT CARRIES A KEY, and the greppable form of that
   * claim is that `accountKey` appears in exactly one arm of this union.
   * `fresh` distinguishes the claim ceremony (the write-it-down sheet, which
   * is mandatory because there is no recovery) from a quiet re-read.
   */
  | { type: "accountKey"; key: string; fresh: boolean }
  | { type: "offer"; candidates: readonly CivCard[] }
  | { type: "sky"; nowYear: number; self: SelfView;
      sources: readonly DetectedSource[];
      localNames: Readonly<Record<string, string>>;
      studies: readonly StudySnapshot[];
      /**
       * AS: a full board for every visible source the player holds NO stored
       * study on. The ambient half of the sky, beside `studies`' engaged
       * half, and the same type: a source is worked up from the moment it is
       * seen, and engagement is which array a board arrived in rather than a
       * flag on it.
       *
       * DISJOINT FROM `studies` BY CONSTRUCTION — membership here is the
       * absence of a record, so no starId is ever in both.
       *
       * An ambient board never carries a call, a grounding, a purchase or an
       * armed tripwire. Not by a rule applied to it: there is no record to
       * hold one. The first act that needs remembering materializes the
       * record, and the board moves to `studies` with it.
       */
      ambient: readonly StudySnapshot[];
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
      /**
       * AV4: the mind's one argued line for the home screen's strip, riding
       * the lead proposal (`proposals[0]`) rather than standing apart from
       * it — the strip is the STANCE side of the facts/stance split
       * (prose-style.md §2's new row, recorded in S0.4); `proposals[0].line`
       * stays the deadpan facts side, untouched. Composed server-side
       * (voice.ts's counsel bank, or the AV4 stance when the flag is on) so
       * no bank ships to the client. Null when there is no lead proposal —
       * an empty strip is the honest answer, never a placeholder sentence.
       */
      counsel: string | null;
      // ── A2.4 ──
      contact: ContactWire;
      // ── A4 ──
      // This player's own foundings, and the forecast over the twelve nearest
      // stars. Both are bounded (MAX_VOYAGES_PER_TOKEN, SURVEY_ROWS) and both
      // are deterministically ordered.
      voyages: readonly VoyageSnapshot[];
      survey: readonly SurveyRow[];
      // The Ledger: what became of those foundings, and what the standing
      // orders have done. Bounded by the same voyage cap the list above is.
      ledger: LedgerWire;
      // ── A5 ──
      /**
       * Whether the server currently holds at least one push subscription for
       * this seat, on any device. A fact about the reader's own account and
       * about nothing else.
       *
       * It is deliberately NOT per-device: the server does not know which
       * browser is asking, and matching endpoints on the wire would mean the
       * client telling the server which one it is on every sky. The client
       * combines this with its own `pushManager.getSubscription()` for the
       * device-local half.
       */
      pushSubscribed: boolean }
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
  | "contact-contested" // the mind objects and the client did not acknowledge it
  // ── A2.5 ──
  // The oracle discipline above is UNCHANGED and extends to these: unknown
  // star, star with no civilization, and star whose light has not reached
  // you still all answer `bad-message`. What is new is only what can be said
  // once the target has resolved through the SAME visibleSky test the
  // client's own `sources` came from.
  | "thread-unavailable" // no thread there: you have not hailed them
  // ── A2.6 ──
  // A2.5's TWO SIGNAL CODES ARE DELETED, and neither identifier survives
  // anywhere in this server — the greppable form of the claim is that a
  // search for either one returns this comment and nothing else.
  //
  // The first policed player prose, and there is no player prose. The second
  // is the oracle that forced this whole slice: it fired only when the target
  // was another player, so typing anything at all told you who your
  // counterpart was, and rejecting with `bad-message` instead would have
  // oracled just as loudly (the seeded path succeeded).
  //
  // The two replacements are BOTH DECIDABLE FROM THE SENDER'S OWN BYTES AND
  // THEIR OWN STATE, which is what keeps them off the oracle list: neither
  // one can be reached by a selector that asks a question about somebody
  // else, and everything sky-shaped still answers `bad-message`.
  | "bad-signal" // structurally illegal: count, kind, duplicate, or a reference resolving to nothing here
  | "part-unavailable" // a selector naming state the sender does not hold
  // ── A2.6, durable identity ──
  // The oracle discipline above does not reach these, and it does not need
  // to: an account is a fact about the ASKING player and nobody else, so none
  // of the five can be made to answer a question about a third party.
  | "token-claimed" // this seat now belongs to an account; the token alone is spent
  | "bad-account" // malformed OR unknown, deliberately one code for both
  | "already-claimed" // this seat already has an account; ask it for the key
  | "not-signed-in" // a key was asked for by a connection that holds none
  | "too-many-attempts" // the rate limit, and the only thing it ever says
  // ── A4 ──
  // A2.4's oracle discipline is UNCHANGED and covers the star: unknown star,
  // the player's own home, and a star naming nothing all answer `bad-message`.
  // The three below are decidable from the sender's own bytes and their own
  // state, so none of them can be made to answer a question about the sky.
  // `bad-charter` is REUSED for the clause table and the dial sheet alike.
  | "unknown-voyage-kind" // no such ship kind
  | "voyage-unavailable" // a live voyage already aims there, or the cap is spent
  | "project-required" // the ship needs a project that has not landed
  // The standing order's own refusal: no such class, already armed, or the
  // condition ALREADY HOLDS at the moment of arming (tripwire-unavailable's
  // exact contract — an order is for what happens next, and a fire on
  // something already true would be the order reading the past). It says
  // nothing about the sky: the arming names no star, so the refusal cannot
  // answer a question about one.
  | "order-unavailable"
  // ── A5 ──
  // The endpoint this device offered is one the server will not fetch: a
  // scheme, a port or a host that is not a push service. It says nothing
  // about the sky and nothing about anyone else — the client handed the
  // string over and is being told its own string was refused — and it exists
  // so the hub row can flip back instead of claiming a watch nobody holds.
  | "push-unavailable";

/** Parse-time bound on the untrusted `launchMission.charter` array (a parse
 *  concern); the 2–3 count rule and one-per-group rule are handler concerns
 *  answered with `bad-charter`. */
export const MAX_CHARTER_CLAUSES_ON_WIRE = 8;

/** A4: parse-time bound on the untrusted `launchVoyage.dials` array. The real
 *  rule — exactly one entry per axis, inside the parent's own band — is
 *  voyages.ts's, answered with `bad-charter`; this only stops an unbounded
 *  array from being walked at all. */
export const MAX_DIALS_ON_WIRE = 5;

// ── A2.6: the parse-layer bounds on a composed signal ──────────────────────
//
// All three are TOTALITY BACKSTOPS in the MAX_CHARTER_CLAUSES_ON_WIRE mould:
// they bound an untrusted payload before anything walks it. The real caps
// (four parts, per-kind limits) are the handler's, answered with
// `bad-signal`, and they are deliberately tighter than these.

/** Elements in the untrusted `parts` array. */
export const MAX_PARTS_ON_WIRE = 8;

/** Any string inside a selector, in CODE POINTS — so an astral character
 *  costs one and not two, `sanitizeSignalText`'s own reason. */
export const MAX_PART_STRING_CPS = 64;

/** The serialized selector array. Two kilobytes is far past any legal
 *  composition and far short of anything worth parsing twice. */
export const MAX_PARTS_BYTES = 2048;

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

/** LEGACY (A2.5). Max signal payload length, in CODE POINTS, after cleaning.
 *  Nothing writes a payload of this kind any more; see `sanitizeSignalText`. */
export const MAX_SIGNAL_LEN = 280;

/** How many signals one thread detail may carry. The newest are kept, and
 *  `ThreadDetail.truncated` says the older ones exist. */
export const MAX_SIGNALS_ON_WIRE = 24;

/**
 * LEGACY, A2.5 — RETAINED ONLY TO RENDER ACTS ALREADY IN THE LOG.
 *
 * A2.6 retired freeform everywhere, including with seeded counterparts (the
 * AI never read the prose: `deriveAiSignals` triggers on emission history and
 * act years, never on `act.text`). NOTHING NEW CALLS THIS. A2.5's stored acts
 * carry `ContactAct.text` and a live cohort still has to render them, so the
 * cleaner stays exactly as it shipped, and this comment is the reason it is
 * not deleted rather than an invitation to reuse it. A new call site is a bug.
 *
 * The original contract, unchanged below:
 *
 * The one door player prose comes through. Returns the cleaned signal, or
 * null if it may not be sent at all.
 *
 * `validateName`'s code-point table is the FLOOR here, not the whole of it —
 * the same controls and the same invisible/bidi block, plus a bound on
 * combining-mark stacking, which a name's 24 characters made uninteresting
 * and 280 do not.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: it strips no markup, polices no
 * punctuation, and runs no style gate. THIS IS NOT GENERATED PROSE. The gate
 * exists so no fact originates in a model; a player writing to another
 * civilization may write badly, may use a dash, and may shout, and none of
 * that is the gate's business. Two rules carry the safety instead: the
 * payload is rendered with `textContent` and never as markup, and it is
 * NEVER HANDED TO VOICEGEN — stated again in voicegen.ts beside the
 * untrusted-source-name comment, and greppable from both ends.
 */
export function sanitizeSignalText(raw: string): string | null {
  // 1. One canonical form, so the length bound and the mark scan below both
  //    measure what a reader will actually see.
  const normalized = raw.normalize("NFC");
  // 2. A SIGNAL IS ONE PARAGRAPH: every whitespace run, newlines included,
  //    collapses to a single space. This is a shape rule, not a filter — the
  //    composer suppresses newlines client-side and this is what makes that
  //    non-authoritative.
  const collapsed = normalized.replace(/\s+/g, " ").trim();
  // 3. The same controls and the same invisible/bidi block validateName
  //    rejects: a signal must be what it looks like.
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
  // 4. Combining-mark stacking: a run this long is not a language, it is a
  //    line-height attack on whoever reads the thread.
  if (/\p{M}{9,}/u.test(collapsed)) return null;
  // 5. Length in CODE POINTS, not UTF-16 units, so an astral character costs
  //    one and not two.
  const points = [...collapsed].length;
  if (points < 1 || points > MAX_SIGNAL_LEN) return null;
  // 6. That is the whole door. See the contract above for what is not here.
  return collapsed;
}

/**
 * A2.6: the shape half of the composed-signal guard. Every element must be a
 * plain object whose values are bare scalars — string (bounded in code
 * points), finite integer, boolean or null. NO ARRAYS, NO OBJECTS, NO
 * FLOATS, no prototype tricks.
 *
 * Integrality is not fussiness: every number a selector can legally carry is
 * an ordinal (a chronicle line, a dial axis, a part index), and a float there
 * is either a probe or a bug. Rejecting it here means signalparts.ts's walk
 * is over a payload that has already been proved finite and flat, and the
 * serialized bound below caps the total work whatever the element count did.
 */
function isFlatSelectorArray(parts: readonly unknown[]): boolean {
  if (JSON.stringify(parts).length > MAX_PARTS_BYTES) return false;
  for (const part of parts) {
    if (typeof part !== "object" || part === null || Array.isArray(part)) return false;
    for (const value of Object.values(part as Record<string, unknown>)) {
      if (value === null || typeof value === "boolean") continue;
      if (typeof value === "string") {
        if ([...value].length > MAX_PART_STRING_CPS) return false;
        continue;
      }
      if (typeof value === "number") {
        if (!Number.isInteger(value)) return false;
        continue;
      }
      return false;
    }
  }
  return true;
}

/**
 * A4: the shape half of the charter-dial guard, `isFlatSelectorArray`'s twin
 * one rule looser. Every element must be a plain object whose values are bare
 * scalars — string (bounded in code points), FINITE NUMBER (integral or not),
 * boolean or null. No arrays, no objects, no prototype tricks.
 *
 * The one deliberate difference is the number rule, and it is not a relaxation
 * of the discipline: a selector's every number is an ordinal, so a float there
 * is a probe or a bug, while a dial position is a fraction of a range and a
 * charter that could not carry one would be no charter at all. Finiteness is
 * still checked, which is the property that actually matters — an infinity or
 * a NaN reaching the snap arithmetic would poison every date derived from it.
 */
function isFlatDialArray(dials: readonly unknown[]): boolean {
  if (JSON.stringify(dials).length > MAX_PARTS_BYTES) return false;
  for (const dial of dials) {
    if (typeof dial !== "object" || dial === null || Array.isArray(dial)) return false;
    for (const value of Object.values(dial as Record<string, unknown>)) {
      if (value === null || typeof value === "boolean") continue;
      if (typeof value === "string") {
        if ([...value].length > MAX_PART_STRING_CPS) return false;
        continue;
      }
      if (typeof value === "number") {
        if (!Number.isFinite(value)) return false;
        continue;
      }
      return false;
    }
  }
  return true;
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

  // A2.6: `account` is OPTIONAL on the wire and absent parses as null, so a
  // client built before this stage still produces a legal `hello`. Anything
  // present and not a bounded string fails the whole message, the same way a
  // malformed `token` always has.
  if (
    msg["type"] === "hello" &&
    (msg["token"] === null || typeof msg["token"] === "string")
  ) {
    const account: unknown = msg["account"];
    if (account === undefined || account === null) {
      return { type: "hello", token: msg["token"], account: null };
    }
    if (typeof account === "string" && [...account].length <= MAX_ACCOUNT_KEY_ON_WIRE) {
      return { type: "hello", token: msg["token"], account };
    }
    return null;
  }

  // A2.6: no fields, so nothing to guard beyond the discriminant — the
  // `requestReport` shape exactly. Both are answered against the connection's
  // OWN registered seat, which is why neither needs to name one.
  if (msg["type"] === "claimAccount") {
    return { type: "claimAccount" };
  }

  if (msg["type"] === "showAccountKey") {
    return { type: "showAccountKey" };
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

  // A4. SHAPE ONLY, the `launchMission` arm one act on: a bounded array of
  // bare clause strings, a bounded array of FLAT dial objects, and a bare
  // name. The dial objects admit floats where `isFlatSelectorArray` refuses
  // them — a dial position IS a fraction, and rejecting one here would refuse
  // every legal charter — so they get their own guard rather than a widened
  // one, and flatness stays load-bearing in both.
  if (
    msg["type"] === "launchVoyage" &&
    typeof msg["starId"] === "string" &&
    typeof msg["kind"] === "string" &&
    typeof msg["name"] === "string"
  ) {
    const rawCharter: unknown = msg["charter"];
    const rawDials: unknown = msg["dials"];
    if (
      Array.isArray(rawCharter) &&
      rawCharter.length <= MAX_CHARTER_CLAUSES_ON_WIRE &&
      Array.isArray(rawDials) &&
      rawDials.length <= MAX_DIALS_ON_WIRE &&
      isFlatDialArray(rawDials)
    ) {
      const charter: string[] = [];
      let ok = true;
      for (const clause of rawCharter as readonly unknown[]) {
        if (typeof clause !== "string") {
          ok = false;
          break;
        }
        charter.push(clause);
      }
      if (ok) {
        return {
          type: "launchVoyage",
          starId: msg["starId"],
          kind: msg["kind"],
          charter,
          dials: rawDials as readonly unknown[],
          name: msg["name"],
        };
      }
    }
  }

  // A4, the standing order. SHAPE ONLY: a bare class string and a bounded
  // array whose elements stay `unknown` all the way to the handler, where
  // missions.ts's `validateCharter` owns the vocabulary and answers
  // `bad-charter`. Nothing here names a star, so there is nothing here to
  // guard against being used as an oracle.
  if (
    msg["type"] === "armOrder" &&
    typeof msg["orderClass"] === "string" &&
    Array.isArray(msg["charter"]) &&
    (msg["charter"] as readonly unknown[]).length <= MAX_CHARTER_CLAUSES_ON_WIRE
  ) {
    return {
      type: "armOrder",
      orderClass: msg["orderClass"],
      charter: msg["charter"] as readonly unknown[],
    };
  }

  if (msg["type"] === "disarmOrder" && typeof msg["orderClass"] === "string") {
    return { type: "disarmOrder", orderClass: msg["orderClass"] };
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

  // S0.1: no fields and no error code, the requestReport precedent just
  // below — a malformed one just means the replay does not start, and the
  // Mind page's replay button is still sitting right there to tap again.
  if (msg["type"] === "requestIntro") {
    return { type: "requestIntro" };
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

  // A2.6. THE PARSE LAYER CHECKS SHAPE AND NOTHING ELSE. `tone` is a bare
  // string and each part is a flat object of bare scalars; what the words
  // mean is signalparts.ts's business, answered by the handler with
  // `bad-signal` / `part-unavailable`.
  //
  // The four bounds below are what a hostile client can spend before anything
  // walks its payload: the serialized size, the element count, the per-string
  // code-point bound, and the flatness rule. Flatness is load-bearing rather
  // than tidy — every legal selector is one level deep, so refusing nesting
  // here means no later walk can be made to recurse.
  if (
    msg["type"] === "sendSignal" &&
    typeof msg["starId"] === "string" &&
    typeof msg["tone"] === "string" &&
    msg["tone"].length <= MAX_PART_STRING_CPS &&
    Array.isArray(msg["parts"]) &&
    msg["parts"].length <= MAX_PARTS_ON_WIRE &&
    isFlatSelectorArray(msg["parts"])
  ) {
    return {
      type: "sendSignal",
      starId: msg["starId"],
      tone: msg["tone"],
      parts: msg["parts"],
    };
  }

  // A2.6: a toggle, and bookkeeping — no error code, exactly like
  // `openThread` above and for the same reason (the client's global error
  // handler releases in-flight purchase flags on ANY error message, so an
  // error code here would cancel a live buy for a mute that missed).
  if (
    msg["type"] === "muteThread" &&
    typeof msg["starId"] === "string" &&
    typeof msg["muted"] === "boolean"
  ) {
    return { type: "muteThread", starId: msg["starId"], muted: msg["muted"] };
  }

  if (
    msg["type"] === "openThread" &&
    (msg["starId"] === null || typeof msg["starId"] === "string")
  ) {
    return { type: "openThread", starId: msg["starId"] };
  }

  // A5: no error code on a malformed push message, the `voiceSeen` /
  // `declineProposal` precedent. It is bookkeeping — dropping it means this
  // device's notifications stay as they were until the next boot re-sync —
  // and the client's global error handler releases in-flight purchase flags
  // on ANY "error" message, so a code here would cancel a real in-progress
  // buy for a subscription that missed. A REJECTED endpoint is a different
  // matter and does answer (`push-unavailable`), because the row has to stop
  // pretending; that decision belongs to the handler.
  if (
    msg["type"] === "pushSubscribe" &&
    typeof msg["endpoint"] === "string" &&
    msg["endpoint"].length <= MAX_PUSH_ENDPOINT_CHARS
  ) {
    return { type: "pushSubscribe", endpoint: msg["endpoint"] };
  }

  if (
    msg["type"] === "pushUnsubscribe" &&
    typeof msg["endpoint"] === "string" &&
    msg["endpoint"].length <= MAX_PUSH_ENDPOINT_CHARS
  ) {
    return { type: "pushUnsubscribe", endpoint: msg["endpoint"] };
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
    case "voyage":
      return typeof (v as { voyageId?: unknown }).voyageId === "string";
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
    // A2.6: joins the wholesale-cast group rather than getting a bespoke
    // parser. Two scalars and nothing to walk — there is no partial parse of
    // this payload that could be "best effort", and the same-origin trust the
    // group rests on is unchanged.
    case "accountKey":
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
      // AV4: the strip's line, guarded beside `proposals` for the same
      // reason — a client that renders it should never render a value that
      // was not really a string or null.
      const counsel = (data as { counsel?: unknown }).counsel;
      if (!isStringOrNull(counsel)) return null;
      // AS: `ambient` is `studies`' own type and keeps `studies`' wholesale
      // cast — two arrays of one shape parsed two ways would be a difference
      // with nothing behind it. What is guarded is that the field is THERE
      // and is an array: every reader walks it, so an absent one would fail
      // as a walk over undefined rather than as a dropped message.
      const ambient = (data as { ambient?: unknown }).ambient;
      if (!Array.isArray(ambient)) return null;
      return {
        ...(data as Record<string, unknown>),
        proposals,
        counsel,
        ambient,
      } as unknown as CohortServerMessage;
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
