// The vigil's observatory — derivation module for A2.1, extended in A2.2
// with bought questions (questions.ts) and mission reports (missions.ts,
// arriving here only as the neutral `StudyMove`).
//
// This module owns the hypothesis menus (observatory-design.md §
// Hypotheses), the confidence distribution, the evidence trail, and — as
// of A2.2 — the study's persisted purchase record (`StoredStudy` /
// `StudyState`, moved in from cohort.ts to match projects.ts's precedent)
// and the OpenQuestion snapshot assembly. ALL study derivation lives here,
// never in handlers.
//
// Everything this module produces is belief derived from delayed light
// (ObservedSignal/lightHistory) plus delivered inferences (StudyMove) —
// never truth directly. It reads the same shapes knowledge.ts already
// serves and reshapes them into the board the client renders; it does not
// touch CivTruth or anything server-truth-side. `resolveQuestion`
// (questions.ts) is the one function in this pipeline that DOES read truth,
// gated by a LightCone it is handed — this module never mints one itself.
//
// STUDIES.TS NEVER IMPORTS MISSIONS.TS. A mission report reaches a study
// only as a `StudyMove` (kind: "report") that cohort.ts builds via
// missions.ts and hands in — this module cannot tell a bought answer from
// a probe report and does not need to (systems-a.md §2.5, §11).
//
// Player-facing register: observatory deadpan, wit 0. Every string here is
// written to be understood by someone who has read no design doc: plain
// words, concrete claims, no instrument jargon and no bare numbers standing
// in for meaning.

import type { EmissionEpoch } from "./civseed";
import type { Galaxy } from "./galaxy";
import type {
  StudySnapshot,
  StudyStatus,
  DetectedSource,
  EvidenceEntry,
  Hypothesis,
  HypothesisId,
  HypothesisMenuEntry,
  OpenQuestion,
  QuestionFinding,
} from "./protocol";
import type { LightCone, ObservedSignal, SignalClass } from "./knowledge";
import {
  answersYearFor,
  effectiveCostFor,
  effectiveIntegrationYearsFor,
  possibleShiftsFor,
  questionsFor,
  resolveQuestion,
  QUESTION_COST_CLASS,
  type BoughtQuestion,
  type QuestionDef,
  type RoleShift,
} from "./questions";
import type { ProjectState } from "./projects";

// ---------------------------------------------------------------------------
// Persistence — `studies:${token}`, v1 → v2 (moved in from cohort.ts to
// match projects.ts's precedent: the module that derives from a stored
// shape owns its migration).
// ---------------------------------------------------------------------------

export interface StoredStudy {
  readonly starId: string;
  readonly status: StudyStatus;
  /** A2.2: the purchases, in buy order. NOT the answer — that derives
   *  (questions.ts's resolveQuestion), so a finding cannot go stale and
   *  cannot be forged by editing storage. */
  readonly bought: readonly BoughtQuestion[];
}

export interface StudyState {
  readonly version: 2;
  readonly studies: Record<string, StoredStudy>; // keyed by starId
}

/** The pre-A2.2 shape. Retained solely for migrateStudyState. */
interface StudyStateV1 {
  readonly version: 1;
  readonly studies: Record<string, { readonly starId: string; readonly status: StudyStatus }>;
}

export type StoredStudyState = StudyState | StudyStateV1;

/** A fresh v2 state: no studies yet. */
export function newStudyState(): StudyState {
  return { version: 2, studies: {} };
}

/**
 * Bring a persisted state up to the current shape: every study gains an
 * empty purchase list. Nothing else changes; callers persist the result so
 * the migration happens once (loadStudyState's exact idiom in cohort.ts,
 * matching loadProjectState).
 */
export function migrateStudyState(stored: StoredStudyState): StudyState {
  if (stored.version === 2) return stored;
  const studies: Record<string, StoredStudy> = {};
  for (const [starId, s] of Object.entries(stored.studies)) {
    studies[starId] = { starId: s.starId, status: s.status, bought: [] };
  }
  return { version: 2, studies };
}

/** Shares never fall below this — even the least-favored reading stays live. */
export const SHARE_FLOOR = 0.02;
/** Shares never rise above this — watching alone never fully settles a study. */
export const SHARE_CEIL = 0.9;
/**
 * A reading is named in the annotation only if it holds at least this much
 * of the belief AND stands STUDY_LEAD_MARGIN clear of the runner-up. Below
 * either bar the study is genuinely undecided and shows WATCH_LINE.
 */
export const STUDY_LEAD_THRESHOLD = 0.45;
/** How far clear of the second reading a leader must stand to be named. */
export const STUDY_LEAD_MARGIN = 0.1;
/** Adopted verbatim from concepts/03-03 (decision log); wit 0. */
export const WATCH_LINE = "No hypothesis exceeds the threshold. Continue the watch.";

/**
 * What a menu entry is FOR, in evidence terms. Every menu carries one
 * mundane reading (nothing made), one built reading (somebody is there and
 * working), and one quiet reading (it used to be more than this); "open" is
 * the standing alternative a menu keeps live regardless of the numbers.
 */
export type HypothesisRole = "mundane" | "built" | "quiet" | "open";

/** One menu entry: id, display label, plain gloss, evidence role. */
interface MenuEntry {
  readonly id: HypothesisId;
  readonly label: string;
  /** One short plain phrase saying what this reading would MEAN. */
  readonly gloss: string;
  readonly role: HypothesisRole;
}

/** Per-class hypothesis menu, in display order (mundane-first). */
interface Menu {
  readonly entries: readonly MenuEntry[];
}

// The five v1 menus (observatory-design.md § Hypotheses). directed-beam is
// not produced by A0's classify; its menu keeps the catalog total for
// A2.4's hails.
const MENUS: Record<SignalClass, Menu> = {
  "infrared-excess": {
    entries: [
      {
        id: "brown-dwarf",
        label: "brown dwarf",
        gloss: "a star that never caught, warm and dim",
        role: "mundane",
      },
      {
        id: "rogue-world",
        label: "rogue world",
        gloss: "a cold planet adrift, with no star of its own",
        role: "open",
      },
      {
        id: "cooled-remnant",
        label: "cooled remnant",
        gloss: "the leftover heat of something long dead",
        role: "quiet",
      },
      {
        id: "somebodys-heart",
        label: "somebody's heart",
        gloss: "a made thing, warm because it is still working",
        role: "built",
      },
    ],
  },
  "transit-shadows": {
    entries: [
      {
        id: "debris-and-rings",
        label: "debris and rings",
        gloss: "rubble and dust crossing, left from a wreck",
        role: "quiet",
      },
      {
        id: "natural-transits",
        label: "natural transits",
        gloss: "worlds and rock crossing in front, nothing made",
        role: "mundane",
      },
      {
        id: "construction-under-way",
        label: "construction under way",
        gloss: "something is being built there",
        role: "built",
      },
    ],
  },
  "broadcast-leakage": {
    entries: [
      {
        id: "young-and-sloppy",
        label: "young and sloppy",
        gloss: "a young world spilling noise it cannot contain",
        role: "mundane",
      },
      {
        id: "deliberate-shine",
        label: "deliberate shine",
        gloss: "brightness they chose, meant to be noticed",
        role: "built",
      },
      {
        id: "a-performance",
        label: "a performance",
        gloss: "a show put on for whoever is watching",
        role: "quiet",
      },
    ],
  },
  biosignature: {
    entries: [
      {
        id: "stable-biosphere",
        label: "stable biosphere",
        gloss: "life going on as it has for ages, nothing more",
        role: "mundane",
      },
      {
        id: "biosphere-in-crisis",
        label: "biosphere in crisis",
        gloss: "a living world, and something there is failing",
        role: "quiet",
      },
      {
        id: "pre-industrial",
        label: "pre-industrial civilization",
        gloss: "people there, but no machines to see yet",
        role: "open",
      },
      {
        id: "industrial-rise",
        label: "industrial rise",
        gloss: "machines starting up on a living world",
        role: "built",
      },
    ],
  },
  "directed-beam": {
    entries: [
      {
        id: "meant-for-us",
        label: "meant for us",
        gloss: "a beam aimed our way, on purpose",
        role: "built",
      },
      {
        id: "meant-for-someone-near-us",
        label: "meant for someone near us",
        gloss: "aimed past us at someone else; we catch the edge",
        role: "mundane",
      },
      {
        id: "a-repeat",
        label: "a repeat of an old message",
        gloss: "an old message sent again, on a loop",
        role: "quiet",
      },
    ],
  },
};

// INVARIANT (questions.ts's whole update channel depends on this): every
// menu above has PAIRWISE-DISTINCT roles — no class has two entries sharing
// a role. That is what makes a RoleShift's per-role multiplier equivalent to
// a per-hypothesis multiplier (movedFromShift / distributionFor below), and
// it is why a bought question's finding needs no hypothesis-id vocabulary
// of its own. A future menu that gives one class two `mundane` entries (say)
// would silently make every question asked on it coarser — check this
// invariant again before adding a fifth entry to any menu.

/**
 * The opening menu for every signal class, in menu order — what a study on a
 * source of that class would be able to tell apart, each reading carrying the
 * same plain gloss the board shows. Wording only: shares are derived
 * per-study and do not exist until a study is open, so this leaks nothing
 * about any particular source. The briefing screen reads it so the client
 * never carries a second copy of the menus.
 */
export function hypothesisMenus(): Record<SignalClass, readonly HypothesisMenuEntry[]> {
  const out = {} as Record<SignalClass, readonly HypothesisMenuEntry[]>;
  for (const [signalClass, menu] of Object.entries(MENUS) as [SignalClass, Menu][]) {
    out[signalClass] = menu.entries.map((e) => ({ label: e.label, gloss: e.gloss }));
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Above this, no ordinary living world explains the output on its own. */
const WORLD_OUTPUT_CEILING = 0.12;
/** Output that only a made thing sustains; the top of the excess ramp. */
const MADE_OUTPUT = 0.5;
/** A change of this much across one epoch is a large one. */
const BIG_STEP = 0.25;

/**
 * The four evidence channels the board reads, all derived from the light
 * history alone (sorted oldest-first).
 */
interface LightReading {
  /** How far the latest output sits above what a world makes on its own. */
  readonly excess: number;
  /** How sharply the latest arrival rose over the one before it. */
  readonly rise: number;
  /** How far the latest output has fallen from the record's brightest. */
  readonly fall: number;
  /** Low, flat, unchanged: the shape nature usually has. */
  readonly steady: number;
}

/** Oldest-first copy of the light history. */
function sortedHistory(signal: ObservedSignal): EmissionEpoch[] {
  return [...signal.lightHistory].sort((a, b) => a.fromYear - b.fromYear);
}

function readLight(signal: ObservedSignal): LightReading {
  const sorted = sortedHistory(signal);
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  const latest = last === undefined ? signal.emissionLevel : last.level;
  const before = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
  const previous = before === undefined ? latest : before.level;

  let peak = latest;
  for (const epoch of sorted) {
    if (epoch.level > peak) peak = epoch.level;
  }

  const excess = clamp01((latest - WORLD_OUTPUT_CEILING) / (MADE_OUTPUT - WORLD_OUTPUT_CEILING));
  const rise = clamp01((latest - previous) / BIG_STEP);
  const fall = clamp01((peak - latest) / BIG_STEP);
  return { excess, rise, fall, steady: (1 - excess) * (1 - rise) * (1 - fall) };
}

/** How much of the belief each role earns from the light, before sharpening. */
function weightForRole(role: HypothesisRole, reading: LightReading): number {
  switch (role) {
    case "mundane":
      return 0.3 + 1.2 * reading.steady;
    case "built":
      return 0.15 + 1.35 * clamp01(0.65 * reading.excess + 0.5 * reading.rise);
    case "quiet":
      return 0.15 + 1.35 * reading.fall;
    case "open":
      return 0.35;
  }
}

/** Flattest and peakiest exponents applied to the evidence weights. */
const SHARPNESS_FLAT = 0.6;
const SHARPNESS_PEAKED = 2.4;
/** confidenceFor's output range (knowledge.ts): 0.2 marginal, 0.95 clean. */
const CONFIDENCE_MIN = 0.2;
const CONFIDENCE_MAX = 0.95;

// ---------------------------------------------------------------------------
// StudyMove — the seam between "an inference landed" and "the board moved"
// ---------------------------------------------------------------------------

/**
 * One delivered inference that moves a study. Bought answers
 * (questions.ts's Finding) and mission reports (missions.ts's deriveReports
 * — via a parallel, shift-bearing internal producer) both arrive as this;
 * this module cannot tell them apart and does not need to.
 */
export interface StudyMove {
  readonly id: string; // stable evidence id
  readonly kind: "answer" | "report";
  readonly asOfYear: number; // the target year this claim speaks to
  readonly annotation: string;
  readonly shift: RoleShift;
}

const ROLE_KEYS: readonly HypothesisRole[] = ["mundane", "built", "quiet", "open"];

/**
 * The readings a move supports on ONE class: every menu entry whose role
 * multiplier is greater than 1. A plateau (`shift: {}`) moves nothing and
 * returns []. Exact because every v1 menu has pairwise-distinct roles (see
 * the invariant comment above MENUS).
 */
export function movedFromShift(
  shift: RoleShift,
  signalClass: SignalClass,
): readonly HypothesisId[] {
  const ids: HypothesisId[] = [];
  for (const entry of MENUS[signalClass].entries) {
    const mult = shift[entry.role];
    if (mult !== undefined && mult > 1) ids.push(entry.id);
  }
  return ids;
}

/**
 * Every hypothesis, across ALL FIVE MENUS, whose role has a multiplier > 1
 * in `shift`. Mission reports do not know which signal class (if any)
 * their target currently studies under — a probe's ground truth outlives
 * its source's visibility — so missions.ts reads this class-agnostic
 * superset instead of `movedFromShift`'s single-class form.
 */
export function movedFromShiftAnyClass(shift: RoleShift): readonly HypothesisId[] {
  const ids: HypothesisId[] = [];
  for (const menu of Object.values(MENUS)) {
    for (const entry of menu.entries) {
      const mult = shift[entry.role];
      if (mult !== undefined && mult > 1) ids.push(entry.id);
    }
  }
  return ids;
}

/**
 * Every reading a question COULD move on `signalClass`, before any purchase
 * has picked a specific occupancy branch — the union of `movedFromShift`
 * over every shift `questions.ts`'s `possibleShiftsFor` names for the
 * question. Class-shaped, not source-shaped, so it leaks nothing about any
 * particular study.
 */
function separatesFor(def: QuestionDef, signalClass: SignalClass): readonly HypothesisId[] {
  const seen = new Set<HypothesisId>();
  const ids: HypothesisId[] = [];
  for (const shift of possibleShiftsFor(def.id)) {
    for (const id of movedFromShift(shift, signalClass)) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return ids;
}

/**
 * The board, given the light and every delivered inference. Shifts multiply
 * the role weights BEFORE sharpening; `settleShares` then clamps every
 * share into [SHARE_FLOOR, SHARE_CEIL]. Honesty is therefore structural: no
 * finding, and no probe report, can push any share past 0.9.
 *
 * THE MODEL, in short: the EVIDENCE picks the leader and the CONFIDENCE
 * only decides how sharp the picture is. The light history gives four
 * coarse channels — how far the latest output sits above what a world makes
 * on its own, how sharply it rose, how far it has fallen from its brightest,
 * and how flat the whole record is — and those channels weight the menu's
 * mundane / built / quiet / open readings. `signal.confidence` is not a
 * belief about any one reading (it is mostly a function of distance: a near,
 * clean look), so it is applied as a temperature: a clean read raises the
 * weights to a power above 1 and the board comes to a point, a far or
 * marginal read flattens everything toward an even spread. `moves` folds in
 * multiplicatively — order-independent, which matters because the move
 * list is rebuilt from scratch on every sky. Deterministic, no RNG, and
 * every share stays strictly inside (SHARE_FLOOR, SHARE_CEIL).
 */
export function distributionFor(
  signal: ObservedSignal,
  moves: readonly StudyMove[],
): Hypothesis[] {
  const menu = MENUS[signal.classification];
  const reading = readLight(signal);

  const sharpness =
    SHARPNESS_FLAT +
    (SHARPNESS_PEAKED - SHARPNESS_FLAT) *
      clamp01((signal.confidence - CONFIDENCE_MIN) / (CONFIDENCE_MAX - CONFIDENCE_MIN));

  const combinedShift: Partial<Record<HypothesisRole, number>> = {};
  for (const move of moves) {
    for (const role of ROLE_KEYS) {
      const mult = move.shift[role];
      if (mult === undefined) continue;
      combinedShift[role] = (combinedShift[role] ?? 1) * mult;
    }
  }

  const weights = menu.entries.map((entry) => {
    const shiftMult = combinedShift[entry.role] ?? 1;
    return Math.pow(
      Math.max(weightForRole(entry.role, reading) * shiftMult, 1e-6),
      sharpness,
    );
  });
  const shares = settleShares(weights);

  return menu.entries.map((entry, i) => {
    const share = shares[i];
    return {
      id: entry.id,
      label: entry.label,
      gloss: entry.gloss,
      share: share === undefined ? SHARE_FLOOR : share,
    };
  });
}

/**
 * Normalizes `weights` to a distribution summing to 1 with every share
 * inside [SHARE_FLOOR, SHARE_CEIL]. Clamps, then hands the leftover (or
 * takes the overrun) back proportionally to whatever room each share still
 * has. With menus of 3-4 entries a valid distribution always exists, and a
 * couple of passes reach it.
 */
function settleShares(weights: readonly number[]): number[] {
  const count = weights.length;
  if (count === 0) return [];

  let total = 0;
  for (const w of weights) total += Math.max(w, 0);
  const shares =
    total > 0 ? weights.map((w) => Math.max(w, 0) / total) : weights.map(() => 1 / count);

  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < count; i++) {
      const share = shares[i];
      if (share !== undefined) shares[i] = clamp(share, SHARE_FLOOR, SHARE_CEIL);
    }

    let sum = 0;
    for (const share of shares) sum += share;
    const drift = 1 - sum;
    if (Math.abs(drift) < 1e-9) break;

    const rooms = shares.map((share) =>
      drift > 0 ? Math.max(0, SHARE_CEIL - share) : Math.max(0, share - SHARE_FLOOR),
    );
    let roomTotal = 0;
    for (const room of rooms) roomTotal += room;
    if (roomTotal <= 0) break;

    for (let i = 0; i < count; i++) {
      const share = shares[i];
      const room = rooms[i];
      if (share === undefined || room === undefined) continue;
      shares[i] = share + drift * (room / roomTotal);
    }
  }

  return shares;
}

/** The two largest shares, in order. */
function topTwo(
  hypotheses: readonly Hypothesis[],
): { readonly lead: Hypothesis | undefined; readonly runnerUp: Hypothesis | undefined } {
  let lead: Hypothesis | undefined;
  let runnerUp: Hypothesis | undefined;
  for (const h of hypotheses) {
    if (lead === undefined || h.share > lead.share) {
      runnerUp = lead;
      lead = h;
    } else if (runnerUp === undefined || h.share > runnerUp.share) {
      runnerUp = h;
    }
  }
  return { lead, runnerUp };
}

/** How firmly the leader may be stated, given how much of the belief it holds. */
function trustLine(share: number): string {
  if (share >= 0.7) {
    return "It is the strongest reading by a wide margin, though watching alone will never make it certain.";
  }
  if (share >= 0.55) {
    return "It is the better reading, and the others are still live.";
  }
  return "It leads by only a little, so hold it loosely.";
}

/**
 * The board's headline line. Names what the light leans toward, in plain
 * words, and says how far to trust it — but only when one reading both
 * clears STUDY_LEAD_THRESHOLD and stands STUDY_LEAD_MARGIN clear of the
 * next. A genuinely undecided board keeps the watch line.
 */
export function annotationFor(hypotheses: readonly Hypothesis[]): string {
  const { lead, runnerUp } = topTwo(hypotheses);
  if (lead === undefined) return WATCH_LINE;
  const margin = runnerUp === undefined ? 1 : lead.share - runnerUp.share;
  if (lead.share < STUDY_LEAD_THRESHOLD || margin < STUDY_LEAD_MARGIN) {
    return WATCH_LINE;
  }
  return `So far the light leans toward ${lead.label}: ${lead.gloss}. ${trustLine(lead.share)}`;
}

type TransitionKind = "first" | "rose" | "fell" | "held";

/** Which reading an arrival of this kind speaks to. "held" reuses the
 *  first-light attribution. Descriptive only in A2.1 — it says which stories
 *  this arrival spoke to, and becomes load-bearing when A2.2's answers move
 *  shares. */
function roleForTransition(kind: TransitionKind): HypothesisRole {
  switch (kind) {
    case "rose":
      return "built";
    case "fell":
      return "quiet";
    case "first":
    case "held":
      return "mundane";
  }
}

function movedFor(kind: TransitionKind, signalClass: SignalClass): readonly HypothesisId[] {
  const role = roleForTransition(kind);
  const ids: HypothesisId[] = [];
  for (const entry of MENUS[signalClass].entries) {
    if (entry.role === role) ids.push(entry.id);
  }
  return ids;
}

/**
 * Magnitude in words, never in decimals: what this much output would look
 * like to someone who knows what worlds put out. Written to read after
 * "the light was", "leaving it", and "held steady,".
 */
function magnitudeWords(level: number): string {
  if (level < 0.03) return "almost too faint to hold";
  if (level < 0.08) return "faint, no more than a living world gives off";
  if (level < WORLD_OUTPUT_CEILING + 0.08) {
    return "steady, about what a world running machines gives off";
  }
  if (level < MADE_OUTPUT) return "brighter than a world puts out on its own";
  return "far brighter than a world makes on its own";
}

/** A change of this much in one step reads as a break, not a drift. */
const SHARP_STEP = 0.15;

function annotationForTransition(
  kind: TransitionKind,
  level: number,
  change: number,
): string {
  const words = magnitudeWords(level);
  switch (kind) {
    case "first":
      return `The record opens here. The light was ${words}.`;
    case "rose":
      return change >= SHARP_STEP
        ? `The light climbed sharply, leaving it ${words}. Nothing that only cools brightens like that.`
        : `The light brightened, leaving it ${words}. That could be weather on a world, or work beginning.`;
    case "fell":
      return change >= SHARP_STEP
        ? `The light dropped away, leaving it ${words}. Whatever was burning there stopped.`
        : `The light dimmed, leaving it ${words}. Something there is winding down, or turning away.`;
    case "held":
      return `The light held where it was: ${words}. Holding still for that long is usually what nature looks like.`;
  }
}

/**
 * One evidence entry per light-history epoch: what the light did at arrival,
 * in plain words, and which stories that arrival spoke to. Derived ONLY from
 * signal.lightHistory (belief, never truth) — never from truth newer than
 * the light-departure year.
 *
 * ORDER: the returned array is OLDEST-FIRST, and each entry carries its
 * 1-based `ordinal` plus a `latest` flag for the newest arrival. The trail
 * is a story and reads forward; the client renders it in this order.
 */
export function deriveEvidence(
  signal: ObservedSignal,
  nowYear: number,
  starId: string,
): EvidenceEntry[] {
  const sorted = sortedHistory(signal);

  const entries: EvidenceEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const epoch = sorted[i];
    if (epoch === undefined) continue;
    const prevEpoch = i > 0 ? sorted[i - 1] : undefined;

    let kind: TransitionKind;
    let change = 0;
    if (i === 0 || prevEpoch === undefined) {
      kind = "first";
    } else if (epoch.level > prevEpoch.level) {
      kind = "rose";
      change = epoch.level - prevEpoch.level;
    } else if (epoch.level < prevEpoch.level) {
      kind = "fell";
      change = prevEpoch.level - epoch.level;
    } else {
      kind = "held";
    }

    entries.push({
      id: `${starId}/epoch-${i}`,
      ordinal: entries.length + 1,
      latest: i === sorted.length - 1,
      asOfYear: epoch.fromYear,
      lightAgeYears: nowYear - epoch.fromYear,
      annotation: annotationForTransition(kind, epoch.level, change),
      moved: movedFor(kind, signal.classification),
      kind: "arrival",
    });
  }

  return entries;
}

/** Sort key used when merging arrival/move evidence: asOfYear ascending,
 *  arrivals before moves at the same year, then id — a deterministic
 *  payload order (systems-a.md §2.5). */
function evidenceSortKey(e: EvidenceEntry): readonly [number, number, string] {
  return [e.asOfYear, e.kind === "arrival" ? 0 : 1, e.id];
}

function compareEvidence(a: EvidenceEntry, b: EvidenceEntry): number {
  const [ay, ak, aid] = evidenceSortKey(a);
  const [by, bk, bid] = evidenceSortKey(b);
  if (ay !== by) return ay - by;
  if (ak !== bk) return ak - bk;
  return aid.localeCompare(bid);
}

/**
 * Merges the light-arrival trail with every delivered `StudyMove` into one
 * evidence trail: sorted by `asOfYear` (arrivals before moves at a tie,
 * then by id), then renumbered 1..n with `latest` set on the last.
 */
function mergeEvidence(
  signal: ObservedSignal,
  nowYear: number,
  starId: string,
  moves: readonly StudyMove[],
): EvidenceEntry[] {
  const arrivals = deriveEvidence(signal, nowYear, starId);
  const moveEntries: EvidenceEntry[] = moves.map((move) => ({
    id: move.id,
    ordinal: 0,
    latest: false,
    asOfYear: move.asOfYear,
    lightAgeYears: nowYear - move.asOfYear,
    annotation: move.annotation,
    moved: movedFromShift(move.shift, signal.classification),
    kind: move.kind,
  }));
  const merged = [...arrivals, ...moveEntries].sort(compareEvidence);
  return merged.map((e, i) => ({ ...e, ordinal: i + 1, latest: i === merged.length - 1 }));
}

/**
 * One question's wire snapshot: offered (with a LIVE discount/haste
 * preview), pending (frozen at `boughtYear`, no finding yet), or answered
 * (frozen, with the finding). Also returns the `StudyMove` an answered
 * question contributes, so the caller can fold it into `distributionFor`
 * and the evidence trail without a second pass over `bought`.
 */
function assembleQuestion(
  galaxy: Galaxy,
  cone: LightCone,
  starId: string,
  def: QuestionDef,
  signal: ObservedSignal,
  bought: BoughtQuestion | undefined,
  nowYear: number,
  projectState: ProjectState,
): { readonly wire: OpenQuestion; readonly move: StudyMove | null } {
  const separates = separatesFor(def, signal.classification);

  if (bought === undefined) {
    return {
      wire: {
        id: def.id,
        label: def.label,
        line: def.line,
        costClass: QUESTION_COST_CLASS,
        costCompute: effectiveCostFor(def, nowYear, projectState),
        integrationYears: effectiveIntegrationYearsFor(def, nowYear, projectState),
        separates,
        state: "offered",
        boughtYear: null,
        answersYear: null,
        finding: null,
      },
      move: null,
    };
  }

  const answersYear = answersYearFor(def, bought, projectState);
  const costCompute = effectiveCostFor(def, bought.boughtYear, projectState);
  const integrationYears = effectiveIntegrationYearsFor(def, bought.boughtYear, projectState);
  const finding = resolveQuestion(galaxy, cone, def, bought, signal, projectState);

  if (finding === null) {
    return {
      wire: {
        id: def.id,
        label: def.label,
        line: def.line,
        costClass: QUESTION_COST_CLASS,
        costCompute,
        integrationYears,
        separates,
        state: "pending",
        boughtYear: bought.boughtYear,
        answersYear,
        finding: null,
      },
      move: null,
    };
  }

  const asOfYear = answersYear - cone.distanceLy;
  const wireFinding: QuestionFinding = {
    id: finding.id,
    asOfYear,
    lightAgeYears: nowYear - asOfYear,
    annotation: finding.annotation,
    moved: movedFromShift(finding.shift, signal.classification),
    shape: finding.shape,
  };
  const move: StudyMove | null =
    finding.shape === "plateau"
      ? null
      : {
          id: `${starId}/q/${def.id}`,
          kind: "answer",
          asOfYear,
          annotation: finding.annotation,
          shift: finding.shift,
        };

  return {
    wire: {
      id: def.id,
      label: def.label,
      line: def.line,
      costClass: QUESTION_COST_CLASS,
      costCompute,
      integrationYears,
      separates,
      state: "answered",
      boughtYear: bought.boughtYear,
      answersYear,
      finding: wireFinding,
    },
    move,
  };
}

/**
 * Assembles the full study for a detected source: the board, the evidence
 * trail, the open-question menu, and the headline. `cone` gates every
 * question's truth read (questions.ts's resolveQuestion); `missionMoves`
 * are this star's mission-report StudyMoves, built by cohort.ts via
 * missions.ts and handed in — this module never imports missions.ts.
 */
export function buildStudySnapshot(
  galaxy: Galaxy,
  cone: LightCone,
  source: DetectedSource,
  stored: StoredStudy,
  nowYear: number,
  projectState: ProjectState,
  missionMoves: readonly StudyMove[],
): StudySnapshot {
  const signal = source.signal;
  const catalog = questionsFor(signal.classification);

  const openQuestions: OpenQuestion[] = [];
  const answerMoves: StudyMove[] = [];
  for (const def of catalog) {
    const bought = stored.bought.find((b) => b.id === def.id);
    const { wire, move } = assembleQuestion(
      galaxy,
      cone,
      source.starId,
      def,
      signal,
      bought,
      nowYear,
      projectState,
    );
    openQuestions.push(wire);
    if (move !== null) answerMoves.push(move);
  }

  const moves = [...answerMoves, ...missionMoves];
  const hypotheses = distributionFor(signal, moves);

  return {
    starId: source.starId,
    status: stored.status,
    signalClass: signal.classification,
    hypotheses,
    evidence: mergeEvidence(signal, nowYear, source.starId, moves),
    openQuestions,
    annotationLine: annotationFor(hypotheses),
  };
}
