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
}

/** "called" | "overtaken" join in A2.3. */
export type StudyStatus = "open" | "shelved";

/** Reserved for A2.2 — always [] in A2.1. */
export interface OpenQuestion {
  readonly id: string;
  readonly label: string;
  readonly costInstrumentHours: number;
  readonly integrationHours: number;
  readonly separates: readonly HypothesisId[];
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
}

// ── A2.2: the instrument-time economy ───────────────────────────────────
// The server resolves the catalog + this civ's state into these shapes so
// no catalog ships to the client — the archetypeName precedent.

/** One project as seen from a specific civ's current state. */
export interface ProjectSnapshot {
  readonly id: string;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass;
  readonly costInstrumentHours: number;
  readonly durationYears: number;
  readonly addRatePerYear: number;
  readonly status: "available" | "running" | "standing";
  readonly startedYear: number | null; // null iff available
  readonly landsYear: number | null; // null iff available
}

/** The civ's current instrument-time balance. */
export interface InstrumentBudget {
  readonly hours: number; // banked as of asOfYear
  readonly ratePerYear: number; // instrument-hours per GAME year
  readonly asOfYear: number; // so the client accrues locally
}

// client → server (UNTRUSTED — every field guarded on parse)
export type CohortClientMessage =
  | { type: "hello"; token: string | null }
  | { type: "become"; candidateId: string; name: string }
  | { type: "nameSource"; starId: string; name: string } // "" = delete
  | { type: "requestSky" }
  | { type: "openStudy"; starId: string }
  | { type: "shelveStudy"; starId: string }
  | { type: "startProject"; projectId: string };

// server → client
export type CohortServerMessage =
  | { type: "welcome"; token: string; phase: "choosing" | "placed";
      clock: ClockWire; catalog: readonly Star[] }
  | { type: "offer"; candidates: readonly CivCard[] }
  | { type: "sky"; nowYear: number; self: SelfView;
      sources: readonly DetectedSource[];
      localNames: Readonly<Record<string, string>>;
      studies: readonly StudySnapshot[];
      projects: readonly ProjectSnapshot[];
      budget: InstrumentBudget }
  | { type: "sourceNamed"; starId: string; name: string }
  | { type: "error"; code: CohortErrorCode; message: string };

export type CohortErrorCode =
  | "bad-name" | "unknown-candidate" | "cohort-full" | "not-placed" | "bad-message"
  | "unknown-project" | "already-running" | "insufficient-instrument-time";

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
