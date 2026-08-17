// Bought questions — derivation module for A2.2 (observatory-design.md's
// six inference programs; knowledge.ts §2, systems-a.md §2).
//
// WHAT THE INSTRUMENT IS (IN). prose-style.md §7 sync row: this paragraph
// also stands at the top of projects.ts, and an edit to one is owed to the
// other.
//
// A civilization at this tier does not own a telescope. It owns an
// INTERFEROMETER: many collectors across the home system, their signals
// correlated. An interferometer never records a picture, only correlations,
// so the archive is raw interference data centuries deep, and every image,
// spectrum and measurement anyone has ever read was COMPUTED out of it, under
// assumptions, by solving an inverse problem that has no unique answer.
//
//  - The STANDING READ reconstructs the cheap version of everything,
//    continuously, on every source in the sky. That is the board a detected
//    source already carries, and it costs nothing.
//  - A BOUGHT QUESTION re-derives the same archive under assumptions the
//    standing read cannot afford. Nothing new is collected; what is bought is
//    a deeper reconstruction of light already in hand.
//  - A PROJECT buys down one term of that inverse problem for good:
//    collecting area, baseline, element count, band, channel count, phase
//    reference, archive fidelity, correlator, nulling, shadows, neutrinos, a
//    borrowed lens. `leansOn` below names which of those terms bound which
//    question.
//  - COMPUTE IS FINITE BECAUSE IT IS ENERGY (Landauer), it DOES NOT AMORTIZE
//    (every source is its own search), and THE ANSWER DECAYS (a masker
//    improves on a cadence, forever). Hence an allocation with a ceiling
//    rather than a bank, and hence a recurring spend.
//  - QUESTIONS HAVE A COST AND NO CLOCK; PROJECTS HAVE BOTH. At swarm power
//    any search a mind would actually size finishes instantly, and the whole
//    cost is deciding what fraction of a star to point at one star. Duration
//    exists exactly where mass or light has to move, and is absent exactly
//    where nothing does (physics-audit.md P0-1's second leg).
//
// PHYSICS FIRST. Photons already at home are a free archive; thinking
// about them is not (knowledge.ts's F2). A bought question buys no new
// light — it buys a deeper read of light already in hand. That is why the
// currency is Compute, and why compute is the ONLY thing it costs: the
// archive is continuous and already spans millennia at the moment of
// purchase, so the swing, the curve and the crossings are in the record
// before anyone asks. **Compute may price a question; it may never date
// one** (physics-audit.md P0-1). Every question answers the year it is
// bought, and where the record is genuinely short the answer says so in
// words (the plateau gates below) rather than counting down to nothing.
//
// `resolveQuestion` still asks `peekTruth` for the year the inference lands
// on, and that guard stays, belt and braces: it is the whole no-leak story
// in one line. It now always admits, because a purchase year is never later
// than now and a cone always reaches it.
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
// THE CONTEST RUNS LAST, AND ONLY EVER SUBTRACTS. contest.ts knows what the
// target has been spending to stay unreadable; this module asks it only
// AFTER the honest table has already produced an answer, and only ever
// downgrades that answer (to a cause-neutral plateau, or to a regression
// that moves no share). It cannot invent an answer, cannot change which
// reading an answer favors, and cannot run at all before `peekTruth` has
// admitted the year. That ordering is the whole of the no-leak story on this
// side: what a player observes is their own instrument losing ground, never
// a fact about the target's behavior.
//
// EFFECTS FREEZE AT PURCHASE (synthesis.md §4). A question bought at year
// B is priced on the discounts granted by projects LANDED BY B — never
// retroactively. Because a project's landing year is itself an immutable
// historical fact once stored, re-deriving "what was landed by B" years
// later reproduces the identical number forever, so nothing needs to be
// frozen in storage beyond `boughtYear` itself. `effectiveCostFor` takes
// `atYear` explicitly so the SAME helper serves both the live "offered"
// preview (atYear = nowYear) and the frozen "answered" reading
// (atYear = bought.boughtYear).

import type { LadderStages } from "./civseed";
import { instrumentTierAt, resolveContest } from "./contest";
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
  confidenceLiftAt,
  questionCostKeepFractionAt,
  questionGrantProseNamesAt,
  type InstrumentAxis,
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

/**
 * The multiplier ladder every finding in this module is built from — the
 * exact shipped numbers, named. NOT a retune: the six values below are the
 * six values the tables already used, hoisted so a finding's strength is
 * stated in words ("firmly for the quiet reading") rather than in a decimal
 * a reader has to compare against every other decimal in the file.
 *
 * Naming them also makes membership structural: a shift can only be built
 * from rungs of this ladder, so there is no runtime audit to write and no
 * seventh magnitude to accidentally invent. The ladder lives here rather
 * than in studies.ts because a RoleShift is a question's output and
 * questions.ts must not import runtime values from studies.ts (studies.ts
 * imports THIS module at runtime; the other direction would be a cycle).
 */
export const LADDER = {
  strong: 3.0,
  firm: 1.8,
  slight: 1.3,
  slightAgainst: 0.8,
  against: 0.55,
  strongAgainst: 0.3,
} as const;

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
  /** Signal classes this question can even be asked of. Physics, not
   *  balance: you cannot time shadows that are not there. */
  readonly appliesTo: readonly SignalClass[];
  /**
   * The terms of the reconstruction this question is LIMITED BY, in the order
   * they bind (projects.ts's InstrumentAxis). It rides `OpenQuestion` so the
   * drill-in's LEANS ON row and the report read the one list, and the labels
   * come from the welcome catalog, so there is one label source.
   *
   * A PROPERTY OF THE QUESTION AND OF NOTHING ELSE: it is invariant per id,
   * derived from no source, no study and no truth. `audit:axes` asserts a
   * project that discounts a question always sits on an axis this list names,
   * so the chips can never contradict a grant the player already holds.
   */
  readonly leansOn: readonly InstrumentAxis[];
}

/** All six questions are Investment class (economy-design.md). */
export const QUESTION_COST_CLASS = "investment" as const;

/**
 * The full v1 question catalog. The applies-to matrix is systems-a.md
 * §2.2's (canonical per synthesis.md §3); `label` uses content.md's chrome
 * forms and `line` its glosses. Costs are the 2026-07 scarcity pass:
 * systems-a's originals (60/45/75/40/90/55) tripled, so a full attention
 * pool (ATTENTION_YEARS × income, projects.ts) covers a few questions
 * rather than the whole menu. systems-a.md §2.2 records the retune.
 *
 * There is no clock field, and the costs no longer sit opposite one: with
 * latency gone (physics-audit.md P0-1) a price is anchored on inference
 * depth alone, which is what the shipped numbers already roughly encode —
 * lines and edges are deep and dear, shadows and temperature shallow and
 * cheap.
 */
export const QUESTIONS: readonly QuestionDef[] = [
  {
    id: "weigh-it",
    label: "WEIGH IT",
    proseName: "weighing",
    line: "how heavy it is, and whether the warmth matches the weight",
    costCompute: 180,
    appliesTo: ["infrared-excess", "transit-shadows"],
    leansOn: ["baseline", "phase-reference", "elements", "archive"],
  },
  {
    id: "temperature-over-time",
    label: "TAKE ITS TEMPERATURE",
    proseName: "temperature watch",
    line: "whether it is cooling the way nature cools, or being held",
    costCompute: 135,
    appliesTo: ["infrared-excess", "transit-shadows", "broadcast-leakage", "directed-beam"],
    leansOn: ["nulling", "band", "archive"],
  },
  {
    id: "read-its-lines",
    label: "READ ITS LINES",
    proseName: "line reading",
    line: "what it is made of, and what has been done to its air",
    costCompute: 225,
    appliesTo: ["infrared-excess", "transit-shadows", "broadcast-leakage", "biosignature"],
    leansOn: ["channels", "nulling", "elements", "archive"],
  },
  {
    id: "time-its-shadows",
    label: "TIME ITS SHADOWS",
    proseName: "shadow timing",
    line: "whether the crossings keep a clock, and what kind",
    costCompute: 120,
    appliesTo: ["transit-shadows", "biosignature"],
    leansOn: ["shadows", "phase-reference", "archive"],
  },
  {
    id: "catch-its-edges",
    label: "CATCH ITS EDGES",
    proseName: "edge look",
    line: "how the light comes off it, since air answers differently than surface",
    costCompute: 270,
    appliesTo: ["infrared-excess", "transit-shadows", "biosignature", "directed-beam"],
    leansOn: ["baseline", "elements", "collecting-area", "archive"],
  },
  {
    id: "listen-off-axis",
    label: "LISTEN OFF-AXIS",
    proseName: "off-axis listening",
    line: "what spills around the edge of the signal, and who the middle is for",
    costCompute: 165,
    appliesTo: ["broadcast-leakage", "directed-beam"],
    leansOn: ["phase-reference", "baseline", "elements", "archive"],
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
// Effective cost — the one place the 25%-of-base floor is enforced
// (projects.ts's aggregation stays a pure, unfloored stack).
// ---------------------------------------------------------------------------

/**
 * No stack of discount projects can push a question below this fraction of
 * its catalog base (content.md PART 2's rule).
 *
 * The deepest stack the catalog can build is TIME ITS SHADOWS under the
 * occultation net, the pulsar clocks and the Vault: 0.5 × 0.7 × 0.8 = 0.28.
 * (This comment named WEIGH IT at 0.392 until IN1; that was the deepest stack
 * of the four A2.1 entries and stopped being true the day the occultation net
 * shipped at 50%.) IN1's four new entries deepen five of the six stacks and
 * leave that one alone, deliberately: WEIGH IT 0.333, READ ITS LINES 0.306,
 * CATCH ITS EDGES 0.309, LISTEN OFF-AXIS 0.408, TAKE ITS TEMPERATURE 0.60,
 * TIME ITS SHADOWS untouched at 0.28. Every stack the slice touches clears
 * 0.30 without this floor's help, and `npm run audit:axes` re-runs that
 * arithmetic in CI so a retune cannot quietly land one on the floor.
 */
const EFFECT_KEEP_FLOOR = 0.25;

/** costCompute after every landed discount project, rounded to whole compute. */
export function effectiveQuestionCost(baseCost: number, keepFraction: number): number {
  return Math.round(baseCost * Math.max(EFFECT_KEEP_FLOOR, keepFraction));
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

// ---------------------------------------------------------------------------
// Provenance — the receipt behind an effective number. When a landed
// project has moved a question's cost off its catalog base, the player
// deserves to see the base and the grantor, or the effective number reads
// as an arbitrary constant. Composed server-side (ProjectSnapshot's
// effectLine precedent: the client never needs the effect union), caps to
// match the chrome meta lines it renders among. Null whenever nothing has
// landed, which is the common case and renders as nothing.
// ---------------------------------------------------------------------------

/** "the spectrograph bank" / "the pulsar clocks and the long baseline". */
function joinProseNames(names: readonly string[]): string {
  if (names.length === 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + (names[names.length - 1] ?? "");
}

/** The receipt under the COST row, or null if no discount has landed. */
export function costProvenanceFor(
  def: QuestionDef,
  atYear: number,
  projectState: ProjectState,
): string | null {
  const names = questionGrantProseNamesAt(projectState, def.id, atYear);
  if (names.length === 0) return null;
  return `DOWN FROM ${def.costCompute} COMPUTE · GRANTED BY ${joinProseNames(names).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Findings — the deterministic answer table (systems-a.md §2.4)
// ---------------------------------------------------------------------------

export interface Finding {
  readonly id: string; // e.g. "weigh-it/too-little-mass-for-the-heat"
  readonly annotation: string; // observatory deadpan, one or two sentences
  readonly shift: RoleShift;
  /** sharpen: the board moves toward a reading. plateau: the instrument
   *  could not separate anything, and the board does not move at all.
   *  regress: the board moves, but only in temperature — every share loses
   *  definition and none of them changes rank (studies.ts's sharpness fold). */
  readonly shape: "sharpen" | "plateau" | "regress";
}

function plateau(id: QuestionId, slug: string, annotation: string): Finding {
  return { id: `${id}/${slug}`, annotation, shift: {}, shape: "plateau" };
}

function regressed(id: QuestionId, slug: string, annotation: string): Finding {
  return { id: `${id}/${slug}`, annotation, shift: {}, shape: "regress" };
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
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
      );
    case "banked":
      return sharpen(
        "weigh-it",
        "mass-and-heat-agree-on-cold",
        "Mass and heat agree: an ordinary body, cooling. There is nothing here the mass cannot account for.",
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "weigh-it",
        "planetary-mass",
        "A world's mass, on a world's orbit. Too light for a failed star and too heavy to be debris.",
        { mundane: LADDER.firm, open: LADDER.firm, built: LADDER.against },
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
        { built: LADDER.strong, quiet: LADDER.strongAgainst, mundane: LADDER.against },
      );
    case "banked":
      if (ladders.integration >= 3) {
        return sharpen(
          "temperature-over-time",
          "too-steady-for-its-age",
          "It is cold, and it is cold at exactly one temperature. Cooling bodies drift. This one does not.",
          { built: LADDER.slight, quiet: LADDER.slightAgainst },
        );
      }
      return sharpen(
        "temperature-over-time",
        "cooling-on-schedule",
        "It is cooling the way things cool: fast at first, slower since. The curve is ordinary all the way down.",
        { quiet: LADDER.strong, built: LADDER.strongAgainst },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "temperature-over-time",
        "a-worlds-thermostat",
        "The temperature swings the way a world with air and water swings, and settles back where it started.",
        { mundane: LADDER.firm, built: LADDER.slightAgainst },
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
        { mundane: LADDER.strong, open: LADDER.firm, built: LADDER.strongAgainst },
      );
    case "living-industrial":
      return sharpen(
        "read-its-lines",
        "industrial-chemistry",
        "Compounds in that air that no volcano makes and no ocean makes. Somebody down there is running a chemistry.",
        { built: LADDER.strong, mundane: LADDER.against, quiet: LADDER.against },
      );
    case "working":
      return sharpen(
        "read-its-lines",
        "lines-of-worked-material",
        "The lines are of worked material: refined, uniform, and nothing like a rock's. There is no atmosphere here to speak of. There are surfaces.",
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
      );
    case "banked":
      return sharpen(
        "read-its-lines",
        "lines-of-rock-and-dust",
        "Rock, dust, and old ice. Whatever the lines had to say, they said it a long time ago.",
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
      );
  }
}

function timeItsShadowsFinding(occupancy: Occupancy, signal: ObservedSignal): Finding {
  // 0.35 like its siblings, not the original 0.3: under flux-based
  // confidence (knowledge.ts) the in-field floor sits near 0.30, so a 0.3
  // gate could never fire inside the 25 ly ball and the refusal below was
  // dead content. At 0.35 it fires where it should: faint and far.
  if (signal.confidence < 0.35) {
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
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
      );
    case "banked":
      return sharpen(
        "time-its-shadows",
        "clockwork-and-a-wide-belt",
        "The crossings keep perfect time, and they are broad and soft: a lot of small things on the same path.",
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "time-its-shadows",
        "clockwork",
        "Every crossing arrives when the one before it said it would. This is a solar system doing what solar systems do.",
        { mundane: LADDER.strong, built: LADDER.strongAgainst },
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
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
      );
    case "banked":
      if (ladders.energy >= 3) {
        return sharpen(
          "catch-its-edges",
          "flatter-than-rubble",
          "Mostly rock and dust, but flatter, in places, than rubble has any reason to be.",
          { built: LADDER.slight, quiet: LADDER.slightAgainst },
        );
      }
      return sharpen(
        "catch-its-edges",
        "rock-and-regolith",
        "Rough, unsorted, and scattering light in every direction. Rock and the dust rock makes.",
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
      );
    case "living-quiet":
    case "living-industrial":
      return sharpen(
        "catch-its-edges",
        "an-atmosphere-and-a-sea",
        "A glint that moves with the phase: deep water under air. It is a world, and it is wet.",
        { mundane: LADDER.firm, open: LADDER.firm, built: LADDER.against },
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
        { mundane: LADDER.strong, built: LADDER.strongAgainst },
      );
    case "working":
      if (ladders.integration >= 3) {
        return sharpen(
          "listen-off-axis",
          "aimed-past-us",
          "There is structure off the main axis, and the structure is not centered on us. Some of what we are hearing was meant for somebody else.",
          { quiet: LADDER.firm, built: LADDER.slight, mundane: LADDER.against },
        );
      }
      return sharpen(
        "listen-off-axis",
        "structure-in-the-spill",
        "The spill has edges and a shape. Something is being pointed, and we are catching the sides of it.",
        { built: LADDER.strong, mundane: LADDER.strongAgainst },
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

// ---------------------------------------------------------------------------
// The contested rows — what the honest table's answer becomes when the
// target's mask has gained ground on the instrument (contest.ts).
// ---------------------------------------------------------------------------

/**
 * ONE cause-neutral sentence, shared by every question. A masked plateau and
 * a gate plateau MUST be indistinguishable on the surface: naming the cause
 * here would tell the player, for free, that somebody over there is paying to
 * be unreadable — which is exactly the fact the mask is buying. The tell for
 * a contest lives one level up and only after a REGRESSION has been earned
 * (studies.ts's contestLine), never here.
 */
const MASKED_PLATEAU_LINE =
  "The look came back consistent with every reading and decisive about none.";

/**
 * ONE shared annotation, and it states only what the instrument did: this
 * measurement, run again on a longer record, separated less than it did
 * before. It makes NO claim about why. The cause claim is the mind's, and it
 * is made once, in the tell.
 */
const REGRESSED_LINE =
  "The later look separates less than the earlier one: the same measurement, on a longer record, came back worse.";

function byQuestion(build: (id: QuestionId) => Finding): Readonly<Record<QuestionId, Finding>> {
  const out = {} as Record<QuestionId, Finding>;
  for (const def of QUESTIONS) out[def.id] = build(def.id);
  return out;
}

/** Keyed per question so the finding id stays question-scoped (the client
 *  and the report both key off it), with one authored sentence behind them. */
const MASKED_PLATEAU: Readonly<Record<QuestionId, Finding>> = byQuestion((id) =>
  plateau(id, "no-separation", MASKED_PLATEAU_LINE),
);

const REGRESSED: Readonly<Record<QuestionId, Finding>> = byQuestion((id) =>
  regressed(id, "look-worse", REGRESSED_LINE),
);

/**
 * Every RoleShift a question's findings can produce, across every
 * occupancy/ladder branch (excluding plateau's `{}` — a plateau moves
 * nothing by definition). Used to compute a question's `separates` before
 * any purchase has picked a specific branch: studies.ts unions
 * `movedFromShift` over each of these to get the full set of readings the
 * question COULD move on a given class.
 *
 * THE CONTESTED ROWS ARE DELIBERATELY ABSENT and this list must never gain
 * them. `separates` is printed on the OFFER, before anything is bought; a
 * menu that quietly said less about a masking target than about an honest
 * one would betray the mask on a surface the player reads for free. Both
 * contested rows carry `{}`, so their union contribution is empty and the
 * offer is bit-identical either way.
 */
export function possibleShiftsFor(id: QuestionId): readonly RoleShift[] {
  switch (id) {
    case "weigh-it":
      return [
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
        { mundane: LADDER.firm, open: LADDER.firm, built: LADDER.against },
      ];
    case "temperature-over-time":
      return [
        { built: LADDER.strong, quiet: LADDER.strongAgainst, mundane: LADDER.against },
        { built: LADDER.slight, quiet: LADDER.slightAgainst },
        { quiet: LADDER.strong, built: LADDER.strongAgainst },
        { mundane: LADDER.firm, built: LADDER.slightAgainst },
      ];
    case "read-its-lines":
      return [
        { mundane: LADDER.strong, open: LADDER.firm, built: LADDER.strongAgainst },
        { built: LADDER.strong, mundane: LADDER.against, quiet: LADDER.against },
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
      ];
    case "time-its-shadows":
      return [
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
        { mundane: LADDER.strong, built: LADDER.strongAgainst },
      ];
    case "catch-its-edges":
      return [
        { built: LADDER.strong, mundane: LADDER.strongAgainst, quiet: LADDER.against },
        { built: LADDER.slight, quiet: LADDER.slightAgainst },
        { quiet: LADDER.firm, mundane: LADDER.slight, built: LADDER.against },
        { mundane: LADDER.firm, open: LADDER.firm, built: LADDER.against },
      ];
    case "listen-off-axis":
      return [
        { mundane: LADDER.strong, built: LADDER.strongAgainst },
        { quiet: LADDER.firm, built: LADDER.slight, mundane: LADDER.against },
        { built: LADDER.strong, mundane: LADDER.strongAgainst },
      ];
  }
}

// ---------------------------------------------------------------------------
// The relevant window — which stretch of TARGET years a look is contested
// over. Both endpoints are `boughtYear − distanceLy`, which is exactly the
// light-cone edge on the day the question was asked, and a purchase year is
// an immutable historical fact, so a window is fixed forever once its later
// purchase has been made.
// ---------------------------------------------------------------------------

/**
 * T_prev: the greatest target year among purchases at a strictly LOWER index
 * in the study's `bought` record bought strictly earlier than this one.
 * Null when there is no such purchase, and that null is load-bearing: the
 * FIRST question on a study has no earlier look to separate less than, so it
 * can never regress. Two questions bought in the same breath give no window
 * at all and nothing can be lost across it; a study left to sit for
 * centuries between looks hands the target every one of those years. The
 * pacing is the player's.
 */
function priorTargetYearFor(
  purchases: readonly BoughtQuestion[],
  index: number,
  boughtYear: number,
  distanceLy: number,
): number | null {
  let best: number | null = null;
  for (let i = 0; i < index; i++) {
    const earlier = purchases[i];
    if (earlier === undefined) continue;
    if (earlier.boughtYear >= boughtYear) continue;
    const targetYear = earlier.boughtYear - distanceLy;
    if (best === null || targetYear > best) best = targetYear;
  }
  return best;
}

/** How many purchases at a lower index answered at or before this one — the
 *  study's own accumulated baseline, the second channel of instrumentTierAt. */
function priorAnswerCount(
  purchases: readonly BoughtQuestion[],
  index: number,
  boughtYear: number,
): number {
  let count = 0;
  for (let i = 0; i < index; i++) {
    const earlier = purchases[i];
    if (earlier === undefined) continue;
    if (earlier.boughtYear <= boughtYear) count++;
  }
  return count;
}

/**
 * The answer. Pure: same inputs, same output, forever — the purchase year is
 * the answer year and never moves, so a re-derivation centuries later
 * reproduces the identical finding.
 *
 * `null` is the light cone refusing the year, and it is kept as belt and
 * braces rather than deleted: it is the whole no-leak story in one line, and
 * a guard that has stopped being reachable is still the guard. It cannot
 * fire on a purchase, because a purchase year is never later than now.
 *
 * `purchases` is the study's WHOLE purchase record in buy order, and `bought`
 * is one of its entries. It is passed because a look is contested against the
 * looks that came before it on the same study (contest.ts), and both the
 * window and the instrument tier are derived from that record rather than
 * stored — the same "an immutable historical fact needs no storage" argument
 * the effects-freeze makes.
 *
 * ORDER OF RESOLUTION (I9): the honest table answers FIRST, and the contest
 * can only ever take away an answer the player would otherwise have had. A
 * plateau is already the instrument's limit and cannot be limited further, so
 * it short-circuits; the contest never invents an answer, never changes which
 * reading an answer favors, and never runs before `peekTruth` has admitted
 * the year, which is what keeps every contested row inside the light cone.
 */
export function resolveQuestion(
  galaxy: Galaxy,
  cone: LightCone,
  def: QuestionDef,
  bought: BoughtQuestion,
  signal: ObservedSignal,
  projectState: ProjectState,
  purchases: readonly BoughtQuestion[],
): Finding | null {
  const targetYear = bought.boughtYear - cone.distanceLy;
  const truth = peekTruth(galaxy, cone, targetYear);
  if (truth === null) return null;
  const seed = civById(galaxy, cone.targetId).seed;
  const base = findingFor(def.id, occupancyAt(truth), seed.ladders, signal);
  if (base.shape === "plateau") return base;

  const index = purchases.findIndex((b) => b.id === bought.id);
  if (index < 0) return base; // defensive: `bought` is always one of `purchases`
  const priorTargetYear = priorTargetYearFor(
    purchases,
    index,
    bought.boughtYear,
    cone.distanceLy,
  );
  if (priorTargetYear === null) return base; // a first look has no window

  const instrumentTier = instrumentTierAt(
    confidenceLiftAt(projectState, bought.boughtYear),
    priorAnswerCount(purchases, index, bought.boughtYear),
  );
  switch (resolveContest({ seed, targetYear, priorTargetYear, instrumentTier }).shape) {
    case "clear":
      return base;
    case "masked":
      return MASKED_PLATEAU[def.id];
    case "regressed":
      return REGRESSED[def.id];
  }
}
