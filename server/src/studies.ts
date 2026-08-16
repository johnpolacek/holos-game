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

/**
 * The two things the observatory watches for on its own. Nothing arms them
 * and nothing can: watching is what an observatory does, so a kind is a
 * QUESTION THE SKY IS ASKED CONTINUOUSLY rather than an order a player left
 * standing.
 *
 * "regress" was a third kind and is gone. Under automation it was
 * structurally vacuous: a regress finding's shape is fixed at PURCHASE time
 * (questions.ts's resolveContest reads `boughtYear` for every input), so it
 * can only ever become true in the send that made the purchase, which is a
 * send the player is present for by definition. The annal already records
 * that event as `question-regressed`, from the finding itself.
 */
export type WatchKind = "leakage-stops" | "crosses";

/** Both, in the order the report reads them. */
export const WATCH_KINDS: readonly WatchKind[] = ["leakage-stops", "crosses"];

/** The lead share `crosses` waits for. Fixed, and deliberately not a number
 *  on the wire: a share picker would turn a decision into a dial, and a free
 *  number arriving from a client is a number the server has to police. It
 *  reaches the player only as prose (voice.ts's WATCH_PROSE_NAME, which
 *  states the condition without stating the figure), so a retune here needs
 *  no label anywhere to be retuned with it. */
export const CROSS_SHARE = 0.7;

/**
 * One thing the watch caught: a KIND and a dated CHANGE POINT, derived and
 * stored nowhere.
 *
 * `anchorId` is the change point's stable symbolic name (`epoch-3`,
 * `q/occupancy`, `m-2/r/1`), never a year — a float year in an id is an id
 * that moves when the arithmetic is retuned. Together with the kind and the
 * star it is what the annal keys on, and the annal's id-keyed add-only merge
 * (report.ts's mergeReportEntries) is therefore the whole once-guarantee.
 * There is no fired flag anywhere, because there is nothing to flag: the
 * same walk over the same sky yields the same fires forever.
 */
export interface WatchFire {
  readonly starId: string;
  readonly kind: WatchKind;
  readonly anchorId: string;
  readonly atYear: number;
}

/**
 * How long a source must stay audible again before another quieting counts.
 * A civilization that flickers across the leakage floor every few centuries
 * would otherwise put a row in the annal for each flicker, which is the
 * record reporting weather. Two and a half thousand years is well past any
 * cadence rule's period floor (behavior.ts's 900) and well inside an era of
 * real silence.
 */
export const QUIET_REFIRE_MIN_YEARS = 2400;

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
   * A2.2b: the home year of the act that took this study up — the first act
   * that needed a record (a purchase, a launch, an arming, a call), and
   * every explicit reopen after it. NEVER the year of detection: every
   * visible source carries a board from the moment it is seen, and a vigil
   * nobody kept cannot end.
   *
   * The grounded exit fires only on a mission report that reached home
   * STRICTLY AFTER this year, which is what makes taking a study up a real
   * act: a report already home when the player first acts closes nothing,
   * and only the next word can. That one rule needs no first-act special
   * case. A probe launched as the first act stamps this at launch, so the
   * probe's own report, arriving later, grounds the study it opened; a
   * report that landed before there was a record still shows in the evidence
   * trail and still moves the board, it just closes nothing.
   *
   * The ambient boards cohort.ts assembles for sources with no record are
   * built over a synthetic, never-persisted study whose value here is
   * positive infinity. That is the arithmetic form of the rule above:
   * nothing can arrive strictly after it, so no ambient board can ground.
   */
  readonly openedYear: number;
  /**
   * A2.3: the source's signal class as it stood at that same act. Stamped
   * WITH `openedYear` and never apart from it: one stamp, two fields. The
   * overtaken exit compares it against the class the light shows now, which
   * is what makes "this is not the thing you were studying" a fact rather
   * than a feeling.
   *
   * Null on a study migrated from before this field existed, and null on the
   * synthetic record behind an ambient board. A null NEVER overtakes: for a
   * migrated study cohort.ts back-fills it to the current class on the next
   * sky-send, so one that has been watched for weeks does not close itself
   * on a class it was never taken up against; for an ambient board there is
   * nothing to back-fill and nothing to close.
   */
  readonly openedClass: SignalClass | null;
  /** A2.3: non-null iff `status === "called"`. */
  readonly called: StoredCall | null;
  /** A2.3: non-null iff `status === "overtaken"`. */
  readonly overtaken: StoredOvertaking | null;
}

export interface StudyState {
  readonly version: 5;
  readonly studies: Record<string, StoredStudy>; // keyed by starId
  /**
   * The year the AUTOMATIC WATCH began for this seat, or null for "always".
   *
   * WHY IT EXISTS. The watch derives its fires by walking back
   * WATCH_SCAN_YEARS over every visible source, and everything it would find
   * back there is true: those sources really did go quiet, those readings
   * really did pull clear. Without this field the first send after the
   * automatic watch shipped would back-materialize weeks of true-but-silent
   * history into a live seat's annal at once, which is the record shouting
   * about things the player lived through in silence. So a seat that existed
   * before automation stamps the year automation reached it, and the walk
   * never looks past it.
   *
   * NULL MEANS ALWAYS, and it is what a FRESH state carries. That is
   * deliberate and load-bearing: `loadStudyState` returns a fresh state
   * WITHOUT persisting it, so a stamped year here would be a different year
   * on every read, and a seat that had never touched a study would push its
   * horizon forward faster than the sky moved and never see a fire at all.
   * A new seat is bounded instead by the report's own `sinceYear`, which is
   * stamped once and stored.
   */
  readonly autoFrom: number | null;
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

/**
 * The A2.3 shape, before the watch became automatic. Retained solely for
 * migration, and its `tripwires` are typed loosely on purpose: they are read
 * once, discarded, and never written again.
 */
interface StudyStateV4 {
  readonly version: 4;
  readonly studies: Record<
    string,
    {
      readonly starId: string;
      readonly status: StudyStatus;
      readonly bought: readonly BoughtQuestion[];
      readonly openedYear: number;
      readonly openedClass: SignalClass | null;
      readonly called: StoredCall | null;
      readonly overtaken: StoredOvertaking | null;
      readonly tripwires?: readonly {
        readonly kind: string;
        readonly armedYear: number;
        readonly firedYear: number | null;
      }[];
    }
  >;
}

export type StoredStudyState =
  | StudyState
  | StudyStateV4
  | StudyStateV3
  | StudyStateV2
  | StudyStateV1;

/** A fresh v5 state: no studies yet, and a watch that has always been on
 *  (see StudyState.autoFrom for why null rather than `nowYear`). */
export function newStudyState(): StudyState {
  return { version: 5, studies: {}, autoFrom: null };
}

/**
 * Replace the study map, carrying everything else about the state forward.
 * EVERY save site goes through this, so `autoFrom` cannot be dropped by a
 * handler that only meant to write one study: a handler that spelled the
 * whole state out by hand would silently re-open this seat's whole history
 * to the walk.
 */
export function withStudies(
  state: StudyState,
  studies: Record<string, StoredStudy>,
): StudyState {
  return { version: 5, studies, autoFrom: state.autoFrom };
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
  };
}

/**
 * Bring a persisted state up to the current shape: v1 studies gain an empty
 * purchase list, pre-v3 studies gain `openedYear`, every pre-v4 study gains
 * the exit fields, and v4 drops its armed tripwires. Each older arm chains
 * through the one above it — they differ only in which fields they can
 * supply from storage. Callers persist the result so the migration happens
 * once (loadStudyState's exact idiom in cohort.ts, matching
 * loadProjectState).
 *
 * `nowYear` is what a migrated study's `openedYear` becomes — as if it were
 * opened at the moment of the migration. That is the conservative reading:
 * a probe that reported BEFORE the upgrade does not reach back and close a
 * study the player has been watching for weeks; only the next word does.
 *
 * IT IS ALSO WHAT `autoFrom` BECOMES, for the same shape of reason one level
 * up: the automatic watch starts for this seat at the moment automation
 * reaches it, so nothing it would have caught while nobody could arm it is
 * written into the annal after the fact.
 *
 * THE STORED TRIPWIRES ARE READ ONCE AND DISCARDED. Nothing is lost by that:
 * an arming was a standing intention, and there is no longer anything to
 * intend — the observatory watches every source. The fires those armings
 * already produced survive where they were always kept, as frozen entries in
 * `report:${token}`, which this migration cannot and does not touch.
 */
export function migrateStudyState(stored: StoredStudyState, nowYear: number): StudyState {
  if (stored.version === 5) return stored;
  const studies: Record<string, StoredStudy> = {};
  if (stored.version === 4) {
    for (const [starId, s] of Object.entries(stored.studies)) {
      studies[starId] = {
        starId: s.starId,
        status: s.status,
        bought: s.bought,
        openedYear: s.openedYear,
        openedClass: s.openedClass,
        called: s.called,
        overtaken: s.overtaken,
      };
    }
  } else if (stored.version === 3) {
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
  return { version: 5, studies, autoFrom: nowYear };
}

/**
 * The three statuses that end a vigil. `shelved` is not one of them: a
 * shelved study is paused, and every verb that works on an open study works
 * on it. A closed study takes no new purchases and reopens only because the
 * player says so (cohort.ts's openStudy).
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
  /**
   * One short plain phrase saying what this reading would MEAN, in two
   * parts: what it is, then what it would mean FOR US. The second part is
   * the whole point and was missing from every entry for a long time — the
   * menu described the sky accurately and gave a player no reason to care
   * which row won, on the one surface whose entire job is to make them care
   * enough to spend on a question.
   *
   * The second part follows the entry's `role` and is a claim about
   * presence, never about truth: mundane means nobody is there, built means
   * somebody is, quiet means somebody was, and open leaves it standing. It
   * is what the reading WOULD mean if it held, which is why a menu shared
   * by every source can carry it without saying anything about any source.
   */
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
        gloss: "a star that never caught: warm, dim, and empty",
        role: "mundane",
      },
      {
        id: "rogue-world",
        label: "rogue world",
        gloss: "a cold planet adrift: nothing there chose the dark",
        role: "open",
      },
      {
        id: "cooled-remnant",
        label: "cooled remnant",
        gloss: "leftover heat: whatever burned there is over",
        role: "quiet",
      },
      {
        id: "somebodys-heart",
        label: "somebody's heart",
        gloss: "a made thing, still warm: someone is there",
        role: "built",
      },
    ],
  },
  "transit-shadows": {
    entries: [
      {
        id: "debris-and-rings",
        label: "debris and rings",
        gloss: "rubble from a wreck: something ended here",
        role: "quiet",
      },
      {
        id: "natural-transits",
        label: "natural transits",
        gloss: "worlds and rock crossing: nothing there was placed",
        role: "mundane",
      },
      {
        id: "construction-under-way",
        label: "construction under way",
        gloss: "something is being built: someone is at work",
        role: "built",
      },
    ],
  },
  "broadcast-leakage": {
    entries: [
      {
        id: "young-and-sloppy",
        label: "young and sloppy",
        gloss: "noise a young world cannot contain: nobody chose this",
        role: "mundane",
      },
      {
        id: "deliberate-shine",
        label: "deliberate shine",
        gloss: "brightness they chose: someone wants to be found",
        role: "built",
      },
      {
        id: "a-performance",
        label: "a performance",
        gloss: "a show for whoever is watching: that includes us",
        role: "quiet",
      },
    ],
  },
  biosignature: {
    entries: [
      {
        id: "stable-biosphere",
        label: "stable biosphere",
        gloss: "life as it has been for ages: nothing to answer",
        role: "mundane",
      },
      {
        id: "biosphere-in-crisis",
        label: "biosphere in crisis",
        gloss: "a living world, something failing: this may not hold",
        role: "quiet",
      },
      {
        id: "pre-industrial",
        label: "pre-industrial civilization",
        gloss: "people there, no machines yet: they cannot answer",
        role: "open",
      },
      {
        id: "industrial-rise",
        label: "industrial rise",
        gloss: "machines starting up: someone is climbing",
        role: "built",
      },
    ],
  },
  "directed-beam": {
    entries: [
      {
        id: "meant-for-us",
        label: "meant for us",
        gloss: "a beam aimed our way: someone knows we are here",
        role: "built",
      },
      {
        id: "meant-for-someone-near-us",
        label: "meant for someone near us",
        gloss: "aimed past us: they are speaking to someone else",
        role: "mundane",
      },
      {
        id: "a-repeat",
        label: "a repeat of an old message",
        gloss: "an old message on a loop: no one need be left",
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
  // The gloss is NOT restated here, and stopped being when glosses grew
  // their second half. It sits on the leading row a thumb's width above
  // this sentence, so repeating it was always redundancy; once the gloss
  // carried its own colon it was also a collision ("leans toward cooled
  // remnant: leftover heat: whatever burned there is over"). The headline
  // names the reading and says how far to trust it, which is the part the
  // bars cannot say.
  return `So far the light leans toward ${lead.label}. ${trustLine(lead.share)}`;
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
  // No gloss, annotationFor's reasoning: the menu is still on screen under
  // this headline, with the reading's own row spelling out what it means.
  return `${grounding.missionName} closed this study: ${lead.label}. ${provenance}`;
}

/**
 * The called board's headline (A2.3). Reads from the FROZEN call and never
 * from the live board: the whole point of calling a study is that the answer
 * stops moving, so a headline derived from the current shares would be
 * quietly reopening the question the player just shut.
 */
export function calledAnnotationFor(call: StoredCall): string {
  // No gloss, annotationFor's reasoning once more, and here the frozen call
  // card renders `call.gloss` itself a few rows down, so the words are on
  // screen from the stored record rather than from today's catalog.
  return `You called this study on ${call.label}. Light goes on arriving, and the call stands as it was made.`;
}

/**
 * The overtaken board's headline (A2.3). It names no reading, because the
 * reading is beside the point: the study was opened on one kind of thing and
 * the sky is now showing another, and the honest move is to say so and offer
 * the reopen. The frozen lead rides on the wire beside this for the closed
 * card to show what the study had believed up to here.
 */
export const OVERTAKEN_LINE =
  "What this is has changed since you took this study up. The light reads differently now. Taking it up again starts the watch on what it is now.";

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
// The watch — two questions the observatory asks of every source it can see,
// answered by DERIVATION over the light and nothing else.
//
// THE BOARD IS A STEP FUNCTION and every fire is a (kind, change point) pair.
// Nothing here is stored, nothing is armed, and nothing carries a fired flag:
// a fire is the same answer every time it is asked for, so the annal's
// id-keyed add-only merge is the entire once-guarantee. That is exactly how a
// sky arrival has always worked (report.ts's `arr/${starId}/epoch-${i}`), and
// the two now work the same way for the same reason.
// ---------------------------------------------------------------------------

/**
 * Every quieting in a source's arrived light, oldest-first.
 *
 * A TRANSITION TEST, not a state one. The predicate this replaced asked
 * whether the NEWEST arrival sat below the floor with an earlier one above
 * it, which is true for as long as the silence lasts and is therefore an
 * answer about today rather than an event with a date. This asks where the
 * light crossed downward: `H[i]` below the floor with `H[i-1]` at or above
 * it. The date is the crossing's, so the same crossing keeps the same date
 * and the same anchor whichever year the question is asked in.
 *
 * SCANS THE WHOLE CLIPPED HISTORY, oldest-first, and leaves the windowing to
 * the caller. That is what makes `QUIET_REFIRE_MIN_YEARS` window-independent:
 * the suppression state is a function of the history alone, so a walk over a
 * long absence and a walk over a short one agree about which crossings count.
 *
 * `lightHistory` is already clipped at the departure year (knowledge.ts's
 * observeCiv) and clipping is a PREFIX, so index `i` names the same epoch
 * forever and the arrival year is the departure year plus the distance.
 */
export function quietFires(
  signal: ObservedSignal,
  distanceLy: number,
  starId: string,
): readonly WatchFire[] {
  const history = sortedHistory(signal);
  const fires: WatchFire[] = [];
  let lastFiredFromYear: number | null = null;
  for (let i = 1; i < history.length; i++) {
    const epoch = history[i];
    const before = history[i - 1];
    if (epoch === undefined || before === undefined) continue;
    if (epoch.level >= LEAKAGE_FLOOR) continue;
    if (before.level < LEAKAGE_FLOOR) continue;
    if (
      lastFiredFromYear !== null &&
      epoch.fromYear - lastFiredFromYear < QUIET_REFIRE_MIN_YEARS
    ) {
      continue;
    }
    lastFiredFromYear = epoch.fromYear;
    fires.push({
      starId,
      kind: "leakage-stops",
      anchorId: `epoch-${i}`,
      atYear: epoch.fromYear + distanceLy,
    });
  }
  return fires;
}

/** How much of the belief the leading reading holds; 0 on an empty board. */
export function leadShare(hypotheses: readonly Hypothesis[]): number {
  const { lead } = topTwo(hypotheses);
  return lead === undefined ? 0 : lead.share;
}

/** Whether the lead crossed CROSS_SHARE going up between two boards. A board
 *  already past the line is not a crossing, which is what keeps `crosses`
 *  an event with a date rather than a standing fact about today. */
export function crossed(prevLead: number, curLead: number): boolean {
  return prevLead < CROSS_SHARE && curLead >= CROSS_SHARE;
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
 * The snapshot, plus the one write assembling it can produce. It is
 * cohort.ts's to persist (this module stores nothing): `overtaken` is
 * non-null only on the single send that saw the class change.
 */
export interface AssembledStudy {
  readonly snapshot: StudySnapshot;
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
      // VESTIGIAL, AND ALWAYS EMPTY. protocol.ts says why the field is still
      // on the wire; the empty array is written here rather than derived
      // because there is nothing left to derive it from.
      tripwires: [],
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
    overtaken,
  };
}
