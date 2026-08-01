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
  StudyGrounding,
} from "./protocol";
import { LEAKAGE_FLOOR, type LightCone, type ObservedSignal, type SignalClass } from "./knowledge";
import {
  costProvenanceFor,
  effectiveCostFor,
  possibleShiftsFor,
  questionsFor,
  resolveQuestion,
  QUESTION_COST_CLASS,
  type BoughtQuestion,
  type QuestionDef,
  type RoleShift,
} from "./questions";
import type { ProjectState } from "./projects";
// The one banked line this module reads. voice.ts is the bank for every
// string the mind says in its own person; the observatory's own deadpan
// annotations are authored here, and the contest tell is not one of them —
// it is the mind naming a cause, which is voice's job and the style gate's
// (scripts/audit-voice.mjs covers it as a bank).
import { contestLine } from "./voice";

// ---------------------------------------------------------------------------
// Persistence — `studies:${token}`, v1 → v2 (moved in from cohort.ts to
// match projects.ts's precedent: the module that derives from a stored
// shape owns its migration).
// ---------------------------------------------------------------------------

/** A2.3: the three conditions a player can leave standing on a study. One
 *  per kind per study; the client's chrome labels for them are the client's
 *  business (chrome, not voice). */
export type TripwireKind = "regress" | "leakage-stops" | "crosses";

/** All three, in the order the client shows them. */
export const TRIPWIRE_KINDS: readonly TripwireKind[] = ["regress", "leakage-stops", "crosses"];

/** The lead share `crosses` waits for. Fixed, and deliberately not a number
 *  on the wire: a share picker would turn a decision into a dial, and a free
 *  number arriving from a client is a number the server has to police. The
 *  client's tripwire chrome spells this constant out ("IF BELIEF CROSSES
 *  70%", studyboard.ts) precisely because the wire will not carry it, so a
 *  retune here retunes that label too. */
export const CROSS_SHARE = 0.7;

/** One armed condition. `firedYear` non-null means it has already fired for
 *  THIS arming, and it never fires twice without being armed again. */
export interface StoredTripwire {
  readonly kind: TripwireKind;
  readonly armedYear: number;
  readonly firedYear: number | null;
}

/**
 * A2.3: the belief the player froze when they called the study, exactly as
 * it stood at the call. INVARIANT (greppable): no code path reads
 * `called.hypothesisId` and compares it against the live distribution. Light
 * keeps arriving and the board underneath keeps moving; the call does not
 * move with it, is never scored against it, is never warned about, and never
 * reopens itself. Calling a study is a statement about what the player
 * believes, and the game does not grade it.
 */
export interface StoredCall {
  readonly hypothesisId: string;
  readonly label: string;
  readonly gloss: string;
  readonly share: number;
  /** The home year the call was made. */
  readonly calledYear: number;
  /** The target year the frozen belief speaks to (calledYear − distance). */
  readonly asOfYear: number;
}

/**
 * A2.3: the study closed itself because the source stopped being the thing
 * the study was opened on. Frozen at the transition, including the lead,
 * because the board is about to be about a different question and the closed
 * card must go on saying what it said.
 */
export interface StoredOvertaking {
  readonly fromClass: SignalClass;
  readonly toClass: SignalClass;
  /** The home year the change was seen. */
  readonly atYear: number;
  /** The target year the new light speaks to (atYear − distance). */
  readonly asOfYear: number;
  readonly lead: {
    readonly id: string;
    readonly label: string;
    readonly gloss: string;
    readonly share: number;
  };
}

export interface StoredStudy {
  readonly starId: string;
  readonly status: StudyStatus;
  /** A2.2: the purchases, in buy order. NOT the answer — that derives
   *  (questions.ts's resolveQuestion), so a finding cannot go stale and
   *  cannot be forged by editing storage. */
  readonly bought: readonly BoughtQuestion[];
  /**
   * A2.2b: the year this study was last opened — set on the first open AND
   * on every reopen. The grounded exit fires only on a mission report that
   * reached home STRICTLY AFTER this year, which is what makes reopening a
   * real act: the report that already closed the study cannot close it
   * again, and only the next word can. One rule, no special case for the
   * first open (a probe that reported before the study existed still shows
   * in the evidence trail and still moves the board — it just does not
   * close a vigil the player only now decided to keep).
   */
  readonly openedYear: number;
  /**
   * A2.3: the source's signal class as it stood when the study was last
   * opened, stamped on every open and reopen. The overtaken exit compares it
   * against the class the light shows now, which is what makes "this is not
   * the thing you were studying" a fact rather than a feeling.
   *
   * Null only on a study migrated from before this field existed. A null
   * NEVER overtakes: cohort.ts back-fills it to the current class on the next
   * sky-send, so a study that has been watched for weeks does not close
   * itself on a class it was never opened against.
   */
  readonly openedClass: SignalClass | null;
  /** A2.3: non-null iff `status === "called"`. */
  readonly called: StoredCall | null;
  /** A2.3: non-null iff `status === "overtaken"`. */
  readonly overtaken: StoredOvertaking | null;
  /** A2.3: at most one per kind. Survives shelving, closing, and reopening
   *  — an order left standing is left standing. */
  readonly tripwires: readonly StoredTripwire[];
}

export interface StudyState {
  readonly version: 4;
  readonly studies: Record<string, StoredStudy>; // keyed by starId
}

/** The pre-A2.2 shape. Retained solely for migrateStudyState. */
interface StudyStateV1 {
  readonly version: 1;
  readonly studies: Record<string, { readonly starId: string; readonly status: StudyStatus }>;
}

/** The A2.2 shape, before `openedYear`. Retained solely for migration. */
interface StudyStateV2 {
  readonly version: 2;
  readonly studies: Record<
    string,
    {
      readonly starId: string;
      readonly status: StudyStatus;
      readonly bought: readonly BoughtQuestion[];
    }
  >;
}

/** The A2.2b shape, before the A2.3 exits. Retained solely for migration. */
interface StudyStateV3 {
  readonly version: 3;
  readonly studies: Record<
    string,
    {
      readonly starId: string;
      readonly status: StudyStatus;
      readonly bought: readonly BoughtQuestion[];
      readonly openedYear: number;
    }
  >;
}

export type StoredStudyState = StudyState | StudyStateV3 | StudyStateV2 | StudyStateV1;

/** A fresh v4 state: no studies yet. */
export function newStudyState(): StudyState {
  return { version: 4, studies: {} };
}

/**
 * The four A2.3 fields a pre-v4 study did not have. `openedClass: null` is
 * the load-bearing one: it is the "we do not know what this was opened
 * against" value, and the overtaken exit refuses to fire on it, so no legacy
 * study spuriously closes itself the moment the upgrade ships. cohort.ts
 * back-fills it to the current class on the next sky-send.
 */
function withExits(
  starId: string,
  status: StudyStatus,
  bought: readonly BoughtQuestion[],
  openedYear: number,
): StoredStudy {
  return {
    starId,
    status,
    bought,
    openedYear,
    openedClass: null,
    called: null,
    overtaken: null,
    tripwires: [],
  };
}

/**
 * Bring a persisted state up to the current shape: v1 studies gain an empty
 * purchase list, pre-v3 studies gain `openedYear`, and every pre-v4 study
 * gains the exit fields. Each older arm chains through the one above it —
 * they differ only in which fields they can supply from storage. Callers
 * persist the result so the migration happens once (loadStudyState's exact
 * idiom in cohort.ts, matching loadProjectState).
 *
 * `nowYear` is what a migrated study's `openedYear` becomes — as if it were
 * opened at the moment of the migration. That is the conservative reading:
 * a probe that reported BEFORE the upgrade does not reach back and close a
 * study the player has been watching for weeks; only the next word does.
 */
export function migrateStudyState(stored: StoredStudyState, nowYear: number): StudyState {
  if (stored.version === 4) return stored;
  const studies: Record<string, StoredStudy> = {};
  if (stored.version === 3) {
    for (const [starId, s] of Object.entries(stored.studies)) {
      studies[starId] = withExits(s.starId, s.status, s.bought, s.openedYear);
    }
  } else if (stored.version === 2) {
    for (const [starId, s] of Object.entries(stored.studies)) {
      studies[starId] = withExits(s.starId, s.status, s.bought, nowYear);
    }
  } else {
    for (const [starId, s] of Object.entries(stored.studies)) {
      studies[starId] = withExits(s.starId, s.status, [], nowYear);
    }
  }
  return { version: 4, studies };
}

/**
 * The three statuses that end a vigil. `shelved` is not one of them: a
 * shelved study is paused, and every verb that works on an open study works
 * on it. A closed study takes no new purchases, evaluates no tripwires, and
 * reopens only because the player says so (cohort.ts's openStudy).
 */
export function isClosed(status: StudyStatus): boolean {
  return status === "grounded" || status === "called" || status === "overtaken";
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

/**
 * A2.6: the same menu with its IDS, for a caller that has to name one
 * reading rather than list them all. `hypothesisMenus` above deliberately
 * drops the ids (the briefing screen renders wording and nothing else);
 * traffic.ts needs them, because a seeded counterpart's finding names a
 * hypothesis and the recipient renders it from the label that travelled
 * beside it. Wording and ids only — still no shares, still nothing
 * source-specific, so this leaks exactly as little as its sibling.
 */
export function menuReadings(
  signalClass: SignalClass,
): readonly { readonly id: HypothesisId; readonly label: string; readonly gloss: string }[] {
  return MENUS[signalClass].entries.map((e) => ({ id: e.id, label: e.label, gloss: e.gloss }));
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
/** The flattest a board can be pushed by regressions, ever. */
export const SHARPNESS_MIN = 0.3;
/** Each regression keeps this fraction of the gap to SHARPNESS_MIN. */
export const REGRESS_KEEP = 0.55;
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
  /** The year this claim reached HOME — an answer's integration completing,
   *  a report's light landing (asOfYear + distanceLy). Never the same axis
   *  as `asOfYear`, which is a year at the TARGET; cohort.ts's grounded
   *  exit compares this against the study's `openedYear`, and both of those
   *  are home years. */
  readonly arrivedYear: number;
  readonly annotation: string;
  readonly shift: RoleShift;
  /**
   * A2.3: this move is a REGRESSION. It carries an empty shift and moves no
   * share toward anything; what it does is take definition out of the whole
   * board (`distributionFor`'s sharpness fold). Mission reports pass `false`
   * — a probe on the ground is never outpaced by an upkeep budget.
   */
  readonly regress: boolean;
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
 *
 * REGRESSION IS TEMPERATURE, NEVER A REPAINT (A2.3). A regressing move
 * carries no shift at all; it lowers the sharpness exponent and nothing
 * else. Since `x ↦ x^s` is strictly monotone for every `s > 0`, dropping `s`
 * PRESERVES THE ORDER of the shares and CONTRACTS every share strictly
 * toward the even split: the leader strictly falls, anything below the
 * even split strictly rises, and a strong runner-up above it falls too
 * (toward the split, never past a rival). The board loses definition
 * without changing its mind, which is what "the look got worse" honestly
 * means. Each
 * regression keeps REGRESS_KEEP of the remaining gap, so repeated
 * regressions asymptote to SHARPNESS_MIN and never reach it — spending
 * against the look never delivers total ignorance, the exact mirror of
 * SHARE_CEIL's "watching never delivers certainty".
 */
export function distributionFor(
  signal: ObservedSignal,
  moves: readonly StudyMove[],
): Hypothesis[] {
  const menu = MENUS[signal.classification];
  const reading = readLight(signal);

  const raw =
    SHARPNESS_FLAT +
    (SHARPNESS_PEAKED - SHARPNESS_FLAT) *
      clamp01((signal.confidence - CONFIDENCE_MIN) / (CONFIDENCE_MAX - CONFIDENCE_MIN));
  const regressions = moves.filter((m) => m.regress).length;
  const sharpness =
    SHARPNESS_MIN + (raw - SHARPNESS_MIN) * Math.pow(REGRESS_KEEP, regressions);

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

/**
 * The highest-share reading on a board, or undefined on an empty one.
 * Exported for cohort.ts's call freeze: calling a study has to name exactly
 * the reading the player was looking at when they called it, to the share,
 * and that means asking this module rather than picking a maximum by hand.
 */
export function leadHypothesisOf(
  hypotheses: readonly Hypothesis[],
): Hypothesis | undefined {
  return topTwo(hypotheses).lead;
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

/**
 * The grounded board's headline (A2.2b). A probe was there, so the hedging
 * the watch line does is no longer honest in either direction: it names the
 * reading plainly, and it says where the reading came from — because a
 * report is not fresher than the light, only nearer to what it describes.
 * No threshold applies: the study is closed, and this is what closed it.
 */
export function groundedAnnotationFor(
  hypotheses: readonly Hypothesis[],
  grounding: StudyGrounding,
): string {
  const { lead } = topTwo(hypotheses);
  const provenance =
    "The finding came back from the ground. It is no newer than the light, only nearer.";
  if (lead === undefined) return provenance;
  return `${grounding.missionName} closed this study: ${lead.label}, ${lead.gloss}. ${provenance}`;
}

/**
 * The called board's headline (A2.3). Reads from the FROZEN call and never
 * from the live board: the whole point of calling a study is that the answer
 * stops moving, so a headline derived from the current shares would be
 * quietly reopening the question the player just shut.
 */
export function calledAnnotationFor(call: StoredCall): string {
  return `You called this study on ${call.label}: ${call.gloss}. Light goes on arriving, and the call stands as it was made.`;
}

/**
 * The overtaken board's headline (A2.3). It names no reading, because the
 * reading is beside the point: the study was opened on one kind of thing and
 * the sky is now showing another, and the honest move is to say so and offer
 * the reopen. The frozen lead rides on the wire beside this for the closed
 * card to show what the study had believed up to here.
 */
export const OVERTAKEN_LINE =
  "What this is has changed since you opened the study. The light reads differently now. Reopening starts the watch on what it is now.";

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
 * One question's wire snapshot: offered (with a LIVE discount preview) or
 * answered (frozen at `boughtYear`, with the finding). There is no third
 * branch — a purchase answers the year it is made. Also returns the
 * `StudyMove` an answered question contributes, so the caller can fold it
 * into `distributionFor` and the evidence trail without a second pass over
 * `bought`.
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
  purchases: readonly BoughtQuestion[],
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
        costProvenance: costProvenanceFor(def, nowYear, projectState),
        separates,
        state: "offered",
        boughtYear: null,
        finding: null,
      },
      move: null,
    };
  }

  const costCompute = effectiveCostFor(def, bought.boughtYear, projectState);
  const costProvenance = costProvenanceFor(def, bought.boughtYear, projectState);
  const finding = resolveQuestion(galaxy, cone, def, bought, signal, projectState, purchases);

  if (finding === null) {
    // Unreachable arithmetic: the cone always admits a year at or before
    // now, and a purchase year always is one. Kept because the guard it
    // mirrors is kept (questions.ts's no-leak line), and rendered as the
    // bare row the client already draws for an answer with no finding.
    return {
      wire: {
        id: def.id,
        label: def.label,
        line: def.line,
        costClass: QUESTION_COST_CLASS,
        costCompute,
        costProvenance,
        separates,
        state: "answered",
        boughtYear: bought.boughtYear,
        finding: null,
      },
      move: null,
    };
  }

  const asOfYear = bought.boughtYear - cone.distanceLy;
  const wireFinding: QuestionFinding = {
    id: finding.id,
    asOfYear,
    lightAgeYears: nowYear - asOfYear,
    annotation: finding.annotation,
    moved: movedFromShift(finding.shift, signal.classification),
    shape: finding.shape,
  };
  // A plateau contributes nothing at all. A regression DOES contribute a
  // move, and it has to: its shift is empty, so the only thing it can carry
  // into the board is the flag distributionFor's sharpness fold reads. It is
  // also an evidence entry with `moved: []`, which is the honest rendering
  // of an answer that named no reading.
  const move: StudyMove | null =
    finding.shape === "plateau"
      ? null
      : {
          id: `${starId}/q/${def.id}`,
          kind: "answer",
          asOfYear,
          arrivedYear: bought.boughtYear,
          annotation: finding.annotation,
          shift: finding.shift,
          regress: finding.shape === "regress",
        };

  return {
    wire: {
      id: def.id,
      label: def.label,
      line: def.line,
      costClass: QUESTION_COST_CLASS,
      costCompute,
      costProvenance,
      separates,
      state: "answered",
      boughtYear: bought.boughtYear,
      finding: wireFinding,
    },
    move,
  };
}

// ---------------------------------------------------------------------------
// Tripwires — a standing order, evaluated over the board that has just been
// assembled rather than over any state of its own.
// ---------------------------------------------------------------------------

/**
 * Everything the three conditions read, taken from the board this send has
 * ALREADY computed. No condition re-derives anything: a tripwire can only
 * fire on something the player could have read for themselves had they been
 * looking, which is what makes it an order and not an oracle.
 */
export interface TripwireBoard {
  readonly openQuestions: readonly OpenQuestion[];
  readonly hypotheses: readonly Hypothesis[];
  readonly signal: ObservedSignal;
  readonly distanceLy: number;
}

/**
 * Whether `kind`'s condition holds for an arming made in `armedYear`. ONE
 * predicate, used for both halves of the contract: cohort.ts refuses to arm
 * when it already holds at `nowYear`, and the sky-send fires when it holds
 * for the arming on record. That is why fired-state plus this condition is
 * the whole state machine — there is no third "was it true when you armed
 * it" bit to keep.
 *
 * `regress` and `leakage-stops` are armed-year-relative and so can never
 * already hold at the moment of arming (an answer that has landed answered
 * at or before now; light that has arrived arrived at or before now). Only
 * `crosses` reads a standing fact about the board, and it is the one the
 * arming refusal actually bites on.
 */
export function tripwireHolds(
  kind: TripwireKind,
  armedYear: number,
  board: TripwireBoard,
): boolean {
  switch (kind) {
    case "regress":
      return board.openQuestions.some(
        (q) =>
          q.finding !== null &&
          q.finding.shape === "regress" &&
          q.boughtYear !== null &&
          q.boughtYear > armedYear,
      );
    case "leakage-stops": {
      // The newest ARRIVED epoch sits below the leakage floor while an
      // earlier one stood at or above it: somebody's machines stopped being
      // audible. `lightHistory` is already clipped at the departure year
      // (knowledge.ts's observeCiv), so "arrived" is the only kind of epoch
      // in it, and the arrival year is the departure year plus the distance.
      const sorted = sortedHistory(board.signal);
      const newest = sorted[sorted.length - 1];
      if (newest === undefined || newest.level >= LEAKAGE_FLOOR) return false;
      const wasAudible = sorted
        .slice(0, -1)
        .some((epoch) => epoch.level >= LEAKAGE_FLOOR);
      if (!wasAudible) return false;
      return newest.fromYear + board.distanceLy > armedYear;
    }
    case "crosses": {
      const { lead } = topTwo(board.hypotheses);
      return lead !== undefined && lead.share >= CROSS_SHARE;
    }
  }
}

/**
 * A5: the catch-up walk's answer for one study — for each kind, the CHANGE
 * POINT at which the condition became true while nobody was looking.
 *
 * A tripwire fires on its condition holding, not on the player being present
 * when it held (a5-push-note.md §3.2). Two of the three conditions are not
 * monotone, so one that came and went across an absence would otherwise never
 * be recorded at all: cohort.ts's `findFirings` walks the dated years at which
 * a study can change and hands the first true one in here.
 */
export type TripwireFiredAt = ReadonlyMap<TripwireKind, number>;

/**
 * Folds this send's firings into the stored tripwire record. Returns the
 * SAME array by identity when nothing changed, which is how cohort.ts knows
 * whether it owes a write. Fires once per arming (`firedYear` is set and
 * never cleared); a closed study is not evaluated at all, which is how
 * "called stays called" survives a standing order left on it.
 *
 * A5: `firedAt` is folded in BEFORE the now-year evaluation, so a condition
 * the catch-up walk caught is recorded at the year it actually held rather
 * than at the year somebody happened to look. That is both more truthful for
 * the report and the property the push rests on: the phone and the record
 * cannot disagree, because the same `findFirings` produced both.
 */
function settleTripwires(
  stored: StoredStudy,
  board: TripwireBoard,
  nowYear: number,
  firedAt: TripwireFiredAt | null,
): readonly StoredTripwire[] {
  if (isClosed(stored.status)) return stored.tripwires;
  let changed = false;
  const next = stored.tripwires.map((t) => {
    if (t.firedYear !== null) return t;
    const caught = firedAt?.get(t.kind);
    if (caught !== undefined) {
      changed = true;
      return { ...t, firedYear: caught };
    }
    if (!tripwireHolds(t.kind, t.armedYear, board)) return t;
    changed = true;
    return { ...t, firedYear: nowYear };
  });
  return changed ? next : stored.tripwires;
}

/** All three kinds, always, with the state the server computed. A kind with
 *  no stored arming is "available"; the client's labels are its own. */
function toWireTripwires(
  tripwires: readonly StoredTripwire[],
): StudySnapshot["tripwires"] {
  return TRIPWIRE_KINDS.map((kind) => {
    const armed = tripwires.find((t) => t.kind === kind);
    if (armed === undefined) return { kind, state: "available" as const, firedYear: null };
    return {
      kind,
      state: armed.firedYear !== null ? ("tripped" as const) : ("armed" as const),
      firedYear: armed.firedYear,
    };
  });
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * What cohort.ts hands in when it has decided that THIS send is the moment a
 * study is overtaken: the class pair and the two years. The frozen lead is
 * filled in here, from the board this call has just built, because the lead
 * is the one part of an overtaking that only the assembly knows.
 */
export interface OvertakingTrigger {
  readonly fromClass: SignalClass;
  readonly toClass: SignalClass;
  readonly atYear: number;
  readonly asOfYear: number;
}

/**
 * The snapshot, plus the two writes assembling it can produce. Both are
 * cohort.ts's to persist (this module stores nothing): `tripwires` is
 * identical by reference when nothing fired, and `overtaken` is non-null
 * only on the single send that saw the class change.
 */
export interface AssembledStudy {
  readonly snapshot: StudySnapshot;
  readonly tripwires: readonly StoredTripwire[];
  readonly overtaken: StoredOvertaking | null;
}

/**
 * Assembles the full study for a detected source: the board, the evidence
 * trail, the open-question menu, and the headline. `cone` gates every
 * question's truth read (questions.ts's resolveQuestion); `missionMoves`
 * are this star's mission-report StudyMoves, built by cohort.ts via
 * missions.ts and handed in — this module never imports missions.ts.
 *
 * `grounding` and `overtaking` are both decisions cohort.ts has already
 * made (only it can see a probe report or compare against a stored
 * `openedClass`); this function renders them and, for an overtaking, freezes
 * the lead. Precedence between them is settled before the call, so nothing
 * here has to break a tie.
 */
export function buildStudySnapshot(
  galaxy: Galaxy,
  cone: LightCone,
  source: DetectedSource,
  stored: StoredStudy,
  nowYear: number,
  projectState: ProjectState,
  missionMoves: readonly StudyMove[],
  grounding: StudyGrounding | null,
  overtaking: OvertakingTrigger | null,
  /** A5: the catch-up walk's firings for THIS study, or null (the default for
   *  every caller that is evaluating a single year, including `findFirings`'
   *  own probe builds). */
  firedAt: TripwireFiredAt | null = null,
): AssembledStudy {
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
      stored.bought,
    );
    openQuestions.push(wire);
    if (move !== null) answerMoves.push(move);
  }

  const moves = [...answerMoves, ...missionMoves];
  const hypotheses = distributionFor(signal, moves);

  const board: TripwireBoard = {
    openQuestions,
    hypotheses,
    signal,
    distanceLy: cone.distanceLy,
  };
  const tripwires = settleTripwires(stored, board, nowYear, firedAt);

  // Freeze the lead the moment the class changes, or read the one that was
  // frozen the last time it did. An overtaken card must go on saying what
  // the study believed up to the change, and the live board is about to be
  // about something else entirely.
  const { lead } = topTwo(hypotheses);
  const overtaken: StoredOvertaking | null =
    overtaking === null
      ? null
      : {
          fromClass: overtaking.fromClass,
          toClass: overtaking.toClass,
          atYear: overtaking.atYear,
          asOfYear: overtaking.asOfYear,
          lead:
            lead === undefined
              ? { id: "", label: "", gloss: "", share: 0 }
              : { id: lead.id, label: lead.label, gloss: lead.gloss, share: lead.share },
        };
  const overtakenNow = overtaken ?? stored.overtaken;

  const call = stored.called;
  const annotationLine =
    call !== null
      ? calledAnnotationFor(call)
      : overtakenNow !== null
        ? OVERTAKEN_LINE
        : grounding !== null
          ? groundedAnnotationFor(hypotheses, grounding)
          : annotationFor(hypotheses);

  return {
    snapshot: {
      starId: source.starId,
      status: stored.status,
      signalClass: signal.classification,
      hypotheses,
      evidence: mergeEvidence(signal, nowYear, source.starId, moves),
      openQuestions,
      annotationLine,
      grounding,
      // The tell, and only after a regression has actually been earned: the
      // annotation on the answer says the look got worse, and this says the
      // one thing that cannot be read off the instrument. The two claims
      // stay in their two places (the headline is untouched by either).
      contestLine: answerMoves.some((m) => m.regress) ? contestLine() : null,
      tripwires: toWireTripwires(tripwires),
      call:
        call === null
          ? null
          : {
              hypothesisId: call.hypothesisId,
              label: call.label,
              gloss: call.gloss,
              share: call.share,
              calledYear: call.calledYear,
              lightAgeYears: nowYear - call.asOfYear,
            },
      overtaking:
        overtakenNow === null
          ? null
          : {
              fromClass: overtakenNow.fromClass,
              toClass: overtakenNow.toClass,
              atYear: overtakenNow.atYear,
              lightAgeYears: nowYear - overtakenNow.asOfYear,
              lead: overtakenNow.lead,
            },
    },
    tripwires,
    overtaken,
  };
}
