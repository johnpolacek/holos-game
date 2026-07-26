// Bought questions — derivation module for A2.2 (observatory-design.md's
// six inference programs; knowledge.ts §2, systems-a.md §2).
//
// PHYSICS FIRST. Photons already at home are a free archive; thinking
// about them is not (knowledge.ts's F2). A bought question buys no new
// light — it buys a deeper read of light already in hand. That is why the
// currency is Compute, why the answer is dated, and why the whole no-leak
// story is four lines: `resolveQuestion` asks `peekTruth` for the year the
// inference lands on, and gets `null` back until the light-cone admits it.
// The pending state is arithmetic, not a guard (knowledge.ts's LightCone).
//
// FINDINGS ARE KEYED BY OCCUPANCY, NOT BY SIGNAL CLASS. The same physical
// truth (an ascended civ radiating almost nothing) reads the same way
// whichever instrument asked — `occupancyAt` is the one truth summary
// knowledge.ts hands both questions and mission reports, so a question can
// never disagree with the sky about where the boundary sits. `findingFor`
// is total over Occupancy for every question id.
//
// PLATEAU IS AN INSTRUMENT LIMIT, NOT A DIE ROLL. observatory-design.md's
// "consistent with everything, informative about nothing" is the
// measurement being impossible at this range or baseline — a pure function
// of the signal already in hand (confidence, emission level, epoch count)
// or, for listen-off-axis, of there being nothing on-axis to catch the
// edge of. No RNG anywhere in this module.
//
// EFFECTS FREEZE AT PURCHASE (synthesis.md §4). A question bought at year
// B answers on the discount/haste granted by projects LANDED BY B — never
// retroactively. Because a project's landing year is itself an immutable
// historical fact once stored, re-deriving "what was landed by B" years
// later reproduces the identical number forever, so nothing needs to be
// frozen in storage beyond `boughtYear` itself. `effectiveCostFor` /
// `effectiveIntegrationYearsFor` take `atYear` explicitly so the SAME
// helper serves both the live "offered" preview (atYear = nowYear) and the
// frozen "pending"/"answered" reading (atYear = bought.boughtYear).

import type { LadderStages } from "./civseed";
import { civById, type Galaxy } from "./galaxy";
import {
  occupancyAt,
  peekTruth,
  type LightCone,
  type Occupancy,
  type ObservedSignal,
  type SignalClass,
} from "./knowledge";
import {
  questionCostKeepFractionAt,
  questionYearsKeepFractionAt,
  type ProjectState,
} from "./projects";
import type { HypothesisRole } from "./studies";

export type QuestionId =
  | "weigh-it"
  | "temperature-over-time"
  | "read-its-lines"
  | "time-its-shadows"
  | "catch-its-edges"
  | "listen-off-axis";

/**
 * Multipliers on the four evidence roles, applied to weightForRole's output
 * before sharpening (studies.ts). Absent = 1. Nothing here can push a share
 * past SHARE_CEIL: every shift lands in settleShares, which clamps. Keyed
 * by studies.ts's own HypothesisRole so a shift can never name a role that
 * does not exist on the menus.
 */
export type RoleShift = Readonly<Partial<Record<HypothesisRole, number>>>;

export interface QuestionDef {
  readonly id: QuestionId;
  readonly label: string; // "WEIGH IT" — chrome, ALL CAPS, ≤6 words
  /**
   * The question's name as it reads inside a sentence — `label` is chrome
   * (ALL CAPS, R-24) and cannot be dropped into prose. The report's record
   * sentences name the question this way ("The weighing on Hearth came
   * back"), so the sentence-case form lives with the catalog, exactly as
   * missions.ts's `missionProseName` does.
   */
  readonly proseName: string;
  readonly line: string; // what it would tell apart, plain words
  readonly costCompute: number;
  readonly integrationYears: number;
  /** Signal classes this question can even be asked of. Physics, not
   *  balance: you cannot time shadows that are not there. */
  readonly appliesTo: readonly SignalClass[];
}

/** All six questions are Investment class (economy-design.md). */
export const QUESTION_COST_CLASS = "investment" as const;

/**
 * The full v1 question catalog. Costs, integration years, and the
 * applies-to matrix are systems-a.md §2.2's numbers (canonical per
 * synthesis.md §3 — content.md's 40–160 / 15–60y figures are superseded);
 * `label` uses content.md's chrome forms and `line` its glosses.
 */
export const QUESTIONS: readonly QuestionDef[] = [
  {
    id: "weigh-it",
    label: "WEIGH IT",
    proseName: "weighing",
    line: "how heavy it is, and whether the warmth matches the weight",
    costCompute: 60,
    integrationYears: 12,
    appliesTo: ["infrared-excess", "transit-shadows"],
  },
  {
    id: "temperature-over-time",
    label: "TAKE ITS TEMPERATURE",
    proseName: "temperature watch",
    line: "whether it is cooling the way nature cools, or being held",
    costCompute: 45,
    integrationYears: 24,
    appliesTo: ["infrared-excess", "transit-shadows", "broadcast-leakage", "directed-beam"],
  },
  {
    id: "read-its-lines",
    label: "READ ITS LINES",
    proseName: "line reading",
    line: "what it is made of, and what has been done to its air",
    costCompute: 75,
    integrationYears: 8,
    appliesTo: ["infrared-excess", "transit-shadows", "broadcast-leakage", "biosignature"],
  },
  {
    id: "time-its-shadows",
    label: "TIME ITS SHADOWS",
    proseName: "shadow timing",
    line: "whether the crossings keep a clock, and what kind",
    costCompute: 40,
    integrationYears: 18,
    appliesTo: ["transit-shadows", "biosignature"],
  },
  {
    id: "catch-its-edges",
    label: "CATCH ITS EDGES",
    proseName: "edge look",
    line: "how the light comes off it — air answers differently than surface",
    costCompute: 90,
    integrationYears: 6,
    appliesTo: ["infrared-excess", "transit-shadows", "biosignature", "directed-beam"],
  },
  {
    id: "listen-off-axis",
    label: "LISTEN OFF-AXIS",
    proseName: "off-axis listening",
    line: "what spills around the edge of the signal, and who the middle is for",
    costCompute: 55,
    integrationYears: 10,
    appliesTo: ["broadcast-leakage", "directed-beam"],
  },
];

/** Takes `string` so handlers validate untrusted input without a cast. */
export function questionById(id: string): QuestionDef | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/**
 * The curated per-class menu order (systems-a.md §2.2's "resulting menus"
 * table) — NOT catalog order; ordered so each class's offers read as a
 * real, class-appropriate sequence rather than an alphabetical accident.
 */
const MENU_ORDER: Record<SignalClass, readonly QuestionId[]> = {
  "infrared-excess": ["weigh-it", "temperature-over-time", "read-its-lines", "catch-its-edges"],
  "transit-shadows": [
    "time-its-shadows",
    "weigh-it",
    "read-its-lines",
    "catch-its-edges",
    "temperature-over-time",
  ],
  "broadcast-leakage": ["listen-off-axis", "read-its-lines", "temperature-over-time"],
  biosignature: ["read-its-lines", "catch-its-edges", "time-its-shadows"],
  "directed-beam": ["listen-off-axis", "catch-its-edges", "temperature-over-time"],
};

/** The questions offered on a signal class, in the curated menu order. */
export function questionsFor(signalClass: SignalClass): readonly QuestionDef[] {
  const ids = MENU_ORDER[signalClass];
  const defs: QuestionDef[] = [];
  for (const id of ids) {
    const def = questionById(id);
    if (def !== undefined) defs.push(def);
  }
  return defs;
}

// ---------------------------------------------------------------------------
// Persistence — the purchase record (studies.ts owns StoredStudy/StudyState;
// this shape is question-scoped so it belongs next to QuestionId).
// ---------------------------------------------------------------------------

export interface BoughtQuestion {
  readonly id: QuestionId;
  readonly boughtYear: number;
}

// ---------------------------------------------------------------------------
// Effective cost / integration years — the one place the 25%-of-base floor
// is enforced (projects.ts's aggregation stays a pure, unfloored stack).
// ---------------------------------------------------------------------------

/** No stack of discount/haste projects can push a question below this
 *  fraction of its catalog base (content.md PART 2's rule). */
const EFFECT_KEEP_FLOOR = 0.25;

/** costCompute after every landed discount project, rounded to whole compute. */
export function effectiveQuestionCost(baseCost: number, keepFraction: number): number {
  return Math.round(baseCost * Math.max(EFFECT_KEEP_FLOOR, keepFraction));
}

/** integrationYears after every landed haste project, rounded to 1 decimal. */
export function effectiveIntegrationYears(baseYears: number, keepFraction: number): number {
  return Math.round(baseYears * Math.max(EFFECT_KEEP_FLOOR, keepFraction) * 10) / 10;
}

/** The live (or frozen, if `atYear` is a purchase year) cost for `def`. */
export function effectiveCostFor(
  def: QuestionDef,
  atYear: number,
  projectState: ProjectState,
): number {
  return effectiveQuestionCost(
    def.costCompute,
    questionCostKeepFractionAt(projectState, def.id, atYear),
  );
}

/** The live (or frozen) integration years for `def`. */
export function effectiveIntegrationYearsFor(
  def: QuestionDef,
  atYear: number,
  projectState: ProjectState,
): number {
  return effectiveIntegrationYears(
    def.integrationYears,
    questionYearsKeepFractionAt(projectState, def.id, atYear),
  );
}

/**
 * The year a bought question's inference completes, using the haste
 * landed BY `bought.boughtYear` (frozen — never the live rate). The single
 * source both `resolveQuestion` and the OpenQuestion wire snapshot read, so
 * the two can never disagree about when a finding lands.
 */
export function answersYearFor(
  def: QuestionDef,
  bought: BoughtQuestion,
  projectState: ProjectState,
): number {
  return bought.boughtYear + effectiveIntegrationYearsFor(def, bought.boughtYear, projectState);
}

// ---------------------------------------------------------------------------
// Findings — the deterministic answer table (systems-a.md §2.4)
// ---------------------------------------------------------------------------

export interface Finding {
  readonly id: string; // e.g. "weigh-it/too-little-mass-for-the-heat"
  readonly annotation: string; // observatory deadpan, one or two sentences
  readonly shift: RoleShift;
  readonly shape: "sharpen" | "plateau";
}

function plateau(id: QuestionId, slug: string, annotation: string): Finding {
  return { id: `${id}/${slug}`, annotation, shift: {}, shape: "plateau" };
}

function sharpen(id: QuestionId, slug: string, annotation: string, shift: RoleShift): Finding {
  return { id: `${id}/${slug}`, annotation, shift, shape: "sharpen" };
}

function weighItFinding(occupancy: Occupancy, signal: ObservedSignal): Finding {
  if (signal.confidence < 0.35) {
    return plateau(
      "weigh-it",
      "no-clean-solution",
      "The look was not clean enough to weigh anything. Astrometry and microlensing both need a steady baseline, and this one is too faint or too far to hold still long enough to solve.",
    );
  }
  switch (occupancy) {
    case "working":
      return sharpen(
        "weigh-it",
        "too-little-mass-for-the-heat",
        "The wobble puts far less mass there than the heat requires. Whatever is warm is spread thin and wide. Nothing that formed on its own is built like that.",
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
      );
    case "banked":
      return sharpen(
        "weigh-it",
        "mass-and-heat-agree-on-cold",
        "Mass and heat agree: an ordinary body, cooling. There is nothing here the mass cannot account for.",
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "weigh-it",
        "planetary-mass",
        "A world's mass, on a world's orbit. Too light for a failed star and too heavy to be debris.",
        { mundane: 1.8, open: 1.8, built: 0.55 },
      );
  }
}

function temperatureOverTimeFinding(
  occupancy: Occupancy,
  ladders: LadderStages,
  signal: ObservedSignal,
): Finding {
  if (signal.lightHistory.length < 2) {
    return plateau(
      "temperature-over-time",
      "no-baseline",
      "One measurement is not a temperature over time. The record needs a second arrival before the question can even be asked.",
    );
  }
  switch (occupancy) {
    case "working":
      return sharpen(
        "temperature-over-time",
        "held-against-the-curve",
        "It is not cooling. Across the whole record it sits at one temperature, which is a thing that has to be done on purpose.",
        { built: 3.0, quiet: 0.3, mundane: 0.55 },
      );
    case "banked":
      if (ladders.integration >= 3) {
        return sharpen(
          "temperature-over-time",
          "too-steady-for-its-age",
          "It is cold, and it is cold at exactly one temperature. Cooling bodies drift. This one does not.",
          { built: 1.3, quiet: 0.8 },
        );
      }
      return sharpen(
        "temperature-over-time",
        "cooling-on-schedule",
        "It is cooling the way things cool: fast at first, slower since. The curve is ordinary all the way down.",
        { quiet: 3.0, built: 0.3 },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "temperature-over-time",
        "a-worlds-thermostat",
        "The temperature swings the way a world with air and water swings, and settles back where it started.",
        { mundane: 1.8, built: 0.8 },
      );
  }
}

function readItsLinesFinding(occupancy: Occupancy, signal: ObservedSignal): Finding {
  if (signal.emissionLevel < 0.03) {
    return plateau(
      "read-its-lines",
      "too-few-photons",
      "Too few photons to split into lines. There is not enough light here to read anything into it.",
    );
  }
  switch (occupancy) {
    case "living-quiet":
      return sharpen(
        "read-its-lines",
        "biosignature-gases-only",
        "Gases in the air that only living things keep in the air, and nothing else. No smoke, no metals, no chemistry anyone had to invent.",
        { mundane: 3.0, open: 1.8, built: 0.3 },
      );
    case "living-industrial":
      return sharpen(
        "read-its-lines",
        "industrial-chemistry",
        "Compounds in that air that no volcano makes and no ocean makes. Somebody down there is running a chemistry.",
        { built: 3.0, mundane: 0.55, quiet: 0.55 },
      );
    case "working":
      return sharpen(
        "read-its-lines",
        "lines-of-worked-material",
        "The lines are of worked material — refined, uniform, and nothing like a rock's. There is no atmosphere here to speak of. There are surfaces.",
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
      );
    case "banked":
      return sharpen(
        "read-its-lines",
        "lines-of-rock-and-dust",
        "Rock, dust, and old ice. Whatever the lines had to say, they said it a long time ago.",
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
      );
  }
}

function timeItsShadowsFinding(occupancy: Occupancy, signal: ObservedSignal): Finding {
  if (signal.confidence < 0.3) {
    return plateau(
      "time-its-shadows",
      "no-timing-survives",
      "No timing survives a look this uncertain. The crossings, if there are any, are lost in the noise.",
    );
  }
  switch (occupancy) {
    case "working":
      return sharpen(
        "time-its-shadows",
        "shadows-that-do-not-keep-time",
        "The crossings do not repeat. Their depths change, their spacing changes, and the pattern is different at the end of the record than at the start. Orbits do not do that. Work does.",
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
      );
    case "banked":
      return sharpen(
        "time-its-shadows",
        "clockwork-and-a-wide-belt",
        "The crossings keep perfect time, and they are broad and soft — a lot of small things on the same path.",
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "time-its-shadows",
        "clockwork",
        "Every crossing arrives when the one before it said it would. This is a solar system doing what solar systems do.",
        { mundane: 3.0, built: 0.3 },
      );
  }
}

function catchItsEdgesFinding(
  occupancy: Occupancy,
  ladders: LadderStages,
  signal: ObservedSignal,
): Finding {
  if (signal.confidence < 0.35) {
    return plateau(
      "catch-its-edges",
      "no-clean-polarization",
      "The polarization did not come back clean enough to read. Whatever the light is doing, this look could not resolve it.",
    );
  }
  switch (occupancy) {
    case "working":
      return sharpen(
        "catch-its-edges",
        "flat-faces-in-ranks",
        "The light comes back polarized, in one plane, from a great many flat faces held at the same angle. Nature makes flat faces. It does not line them up.",
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
      );
    case "banked":
      if (ladders.energy >= 3) {
        return sharpen(
          "catch-its-edges",
          "flatter-than-rubble",
          "Mostly rock and dust — but flatter, in places, than rubble has any reason to be.",
          { built: 1.3, quiet: 0.8 },
        );
      }
      return sharpen(
        "catch-its-edges",
        "rock-and-regolith",
        "Rough, unsorted, and scattering light in every direction. Rock and the dust rock makes.",
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "catch-its-edges",
        "an-atmosphere-and-a-sea",
        "A glint that moves with the phase — deep water under air. It is a world, and it is wet.",
        { mundane: 1.8, open: 1.8, built: 0.55 },
      );
  }
}

const LISTEN_OFF_AXIS_NOTHING_ON_AXIS = plateau(
  "listen-off-axis",
  "nothing-on-axis",
  "There is nothing off-axis, because there is nothing on-axis. Whatever it was, it is not transmitting now.",
);

function listenOffAxisFinding(occupancy: Occupancy, ladders: LadderStages): Finding {
  switch (occupancy) {
    case "living-industrial":
      return sharpen(
        "listen-off-axis",
        "spill-in-every-direction",
        "It spills the same in every direction we can measure. Nobody aimed this. It is simply getting out.",
        { mundane: 3.0, built: 0.3 },
      );
    case "working":
      if (ladders.integration >= 3) {
        return sharpen(
          "listen-off-axis",
          "aimed-past-us",
          "There is structure off the main axis, and the structure is not centered on us. Some of what we are hearing was meant for somebody else.",
          { quiet: 1.8, built: 1.3, mundane: 0.55 },
        );
      }
      return sharpen(
        "listen-off-axis",
        "structure-in-the-spill",
        "The spill has edges and a shape. Something is being pointed, and we are catching the sides of it.",
        { built: 3.0, mundane: 0.3 },
      );
    case "banked":
      // Nothing is being transmitted, so there are no sidelobes to catch
      // (systems-a.md §2.4's gate for this question).
      return LISTEN_OFF_AXIS_NOTHING_ON_AXIS;
    case "living-quiet":
      // Not in systems-a's table (a pre-ascension world quiet enough to be
      // `living-quiet` classifies as biosignature, which never offers this
      // question) — but Finding.shape must be total over Occupancy, and a
      // biosphere with no machines is, for this instrument, the same
      // physical case as `banked`: nothing on-axis to catch the edge of.
      return LISTEN_OFF_AXIS_NOTHING_ON_AXIS;
  }
}

/** Total over QuestionId × Occupancy, per systems-a.md §2.4's tables. */
function findingFor(
  id: QuestionId,
  occupancy: Occupancy,
  ladders: LadderStages,
  signal: ObservedSignal,
): Finding {
  switch (id) {
    case "weigh-it":
      return weighItFinding(occupancy, signal);
    case "temperature-over-time":
      return temperatureOverTimeFinding(occupancy, ladders, signal);
    case "read-its-lines":
      return readItsLinesFinding(occupancy, signal);
    case "time-its-shadows":
      return timeItsShadowsFinding(occupancy, signal);
    case "catch-its-edges":
      return catchItsEdgesFinding(occupancy, ladders, signal);
    case "listen-off-axis":
      return listenOffAxisFinding(occupancy, ladders);
  }
}

/**
 * Every RoleShift a question's findings can produce, across every
 * occupancy/ladder branch (excluding plateau's `{}` — a plateau moves
 * nothing by definition). Used to compute a question's `separates` before
 * any purchase has picked a specific branch: studies.ts unions
 * `movedFromShift` over each of these to get the full set of readings the
 * question COULD move on a given class.
 */
export function possibleShiftsFor(id: QuestionId): readonly RoleShift[] {
  switch (id) {
    case "weigh-it":
      return [
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
        { mundane: 1.8, open: 1.8, built: 0.55 },
      ];
    case "temperature-over-time":
      return [
        { built: 3.0, quiet: 0.3, mundane: 0.55 },
        { built: 1.3, quiet: 0.8 },
        { quiet: 3.0, built: 0.3 },
        { mundane: 1.8, built: 0.8 },
      ];
    case "read-its-lines":
      return [
        { mundane: 3.0, open: 1.8, built: 0.3 },
        { built: 3.0, mundane: 0.55, quiet: 0.55 },
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
      ];
    case "time-its-shadows":
      return [
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
        { mundane: 3.0, built: 0.3 },
      ];
    case "catch-its-edges":
      return [
        { built: 3.0, mundane: 0.3, quiet: 0.55 },
        { built: 1.3, quiet: 0.8 },
        { quiet: 1.8, mundane: 1.3, built: 0.55 },
        { mundane: 1.8, open: 1.8, built: 0.55 },
      ];
    case "listen-off-axis":
      return [
        { mundane: 3.0, built: 0.3 },
        { quiet: 1.8, built: 1.3, mundane: 0.55 },
        { built: 3.0, mundane: 0.3 },
      ];
  }
}

/**
 * The answer, or null while the inference has not completed. Pure: same
 * inputs, same output, forever — `answersYearFor` freezes the haste at
 * `bought.boughtYear`, so a re-derivation years later reproduces the
 * identical finding. The whole no-leak story: ask `peekTruth` for the
 * answer's target year, and if it is still above the light cone, the
 * answer is `null` — arithmetic, not a guard.
 */
export function resolveQuestion(
  galaxy: Galaxy,
  cone: LightCone,
  def: QuestionDef,
  bought: BoughtQuestion,
  signal: ObservedSignal,
  projectState: ProjectState,
): Finding | null {
  const answersYear = answersYearFor(def, bought, projectState);
  const truth = peekTruth(galaxy, cone, answersYear - cone.distanceLy);
  if (truth === null) return null;
  const ladders = civById(galaxy, cone.targetId).seed.ladders;
  return findingFor(def.id, occupancyAt(truth), ladders, signal);
}
