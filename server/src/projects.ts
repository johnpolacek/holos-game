// The vigil's compute economy — derivation module for A2.2's project layer.
//
// This module owns the project catalog and the compute allocation that pays
// for knowing.
//
// WHAT THE CURRENCY IS. Compute, in economy-design.md's sense: "grown from
// Energy; the price of knowing." A civilization at this stage is not
// rationing telescope time — it collects everything its instruments can
// reach, continuously, and the photons are free. What is finite is the
// capacity to REASON about what came in: to run the inference that turns a
// light curve into a claim about who lives there. Looking is free; thinking
// is the spend. The deep array's own line says it — "the data is the easy
// part; the inference is the spend."
//
// WHY INSTRUMENTS RAISE IT. observatory-design.md: the vigil's income is
// "raised by instrument-family projects; the gravitational-lens observatory
// is the deep end." Commissioning an observatory program is commissioning
// the inference capacity to make use of it — the catalog's four entries buy
// standing compute, not collecting area for its own sake.
//
// NOT A BANK. There is no money in Holos (economy-design.md § No money), and
// this pool is not a savings account with a different label: it is one
// resource, spendable on one thing (knowing), presented as an ALLOCATION —
// compute free versus compute committed — never as a balance that stores
// value. Nothing here converts to anything else.
//
// Income is a RATE in compute per GAME year, never real time —
// REAL_MS_PER_GAME_YEAR (clock.ts) is a tunable, and a real-time-denominated
// economy would silently reprice on every retune of that constant.
//
// Accrual is DERIVED from the clock, never ticked: freeComputeAt reads the
// clock's nowYear and computes the free total in closed form. There is no
// alarm dedicated to this economy and no drift to correct for.
//
// A2.2 EFFECT AGGREGATION. Nine new projects land alongside the four
// shipped ones, in five effect kinds (content.md PART 2, synthesis.md §4).
// `questionCostKeepFractionAt` / `questionYearsKeepFractionAt` /
// `landedProbeCruiseFractionAt` / `confidenceLiftAt` are this module's
// answer to "what do the LANDED projects grant, right now" — every one
// reads only `hasLanded` project effects, stacks matching ones
// MULTIPLICATIVELY (never additively) except probe-haste, which takes the
// MAXIMUM across landed projects (content.md's own rule: a beam is either
// running or it isn't). None of these apply a floor themselves — the floor
// (25% of catalog base) is questions.ts's rule, applied where the keep
// fraction is actually spent, so this module stays pure aggregation.

import type { QuestionId } from "./questions";

export type ProjectId =
  | "deep-array"
  | "standing-survey"
  | "cold-band-refit"
  | "focal-line-observatory"
  | "long-baseline-optical"
  | "occultation-network"
  | "spectrograph-bank"
  | "pulsar-timing-array"
  | "neutrino-watch"
  | "cold-logic-annex"
  | "sky-vault"
  | "launch-beam"
  | "focal-line-constellation";

export type CostClass = "ambient" | "investment" | "endeavor" | "epochal";

/**
 * Five effect kinds, exactly as briefed (content.md PART 2, synthesis.md
 * §4). Each project carries exactly one. `question-discount` /
 * `question-haste` reduce a question's costCompute / integrationYears;
 * `probe-haste` replaces the canonical 0.1c cruise fraction with the
 * MAXIMUM across landed projects (never summed); `confidence-lift` raises
 * the floor under a signal's confidence, never the value itself.
 */
export type ProjectEffect =
  | { readonly kind: "compute-income"; readonly addRatePerYear: number }
  | {
      readonly kind: "question-discount";
      readonly questionIds: readonly QuestionId[];
      readonly percent: number;
    }
  | {
      readonly kind: "question-haste";
      readonly questionIds: readonly QuestionId[];
      readonly percent: number;
    }
  | { readonly kind: "probe-haste"; readonly cruiseFractionOfC: number }
  | { readonly kind: "confidence-lift"; readonly addConfidence: number };

export interface ProjectDef {
  readonly id: ProjectId;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass;
  readonly costCompute: number;
  readonly durationYears: number;
  readonly effect: ProjectEffect;
}

/**
 * The full v1 project catalog, in menu order. There are no capacity slots:
 * a player with the compute may start all four in the same minute — the
 * catalog having four entries is four distinct things, not a cap. What
 * creates the decision is the balance (cost and duration against a finite,
 * slowly-accruing allocation), not a concurrency limit.
 *
 * The four shipped entries stay untouched; nine more append after them
 * (content.md PART 2) — five instrument-family Investments that discount or
 * hasten specific questions, then four Endeavor/Epochal-tier entries that
 * touch income, all six questions, probe speed, and the confidence floor.
 * `cold-logic-annex` is priced at 2100 (not content.md's flagged 1600) per
 * synthesis.md §4, keeping `focal-line-observatory` the better compute-per-
 * point rate at the same tier.
 */
export const PROJECTS: readonly ProjectDef[] = [
  {
    id: "deep-array",
    label: "Extend the deep array",
    line: "More collecting area, and more patience. The data is the easy part; the inference is the spend.",
    costClass: "investment",
    costCompute: 220,
    durationYears: 20,
    effect: { kind: "compute-income", addRatePerYear: 6 },
  },
  {
    id: "standing-survey",
    label: "Commission the standing survey",
    line: "Every system inside the neighborhood, characterized to a fixed depth, on a schedule. A null result means something once you know where you looked.",
    costClass: "investment",
    costCompute: 420,
    durationYears: 40,
    effect: { kind: "compute-income", addRatePerYear: 8 },
  },
  {
    id: "cold-band-refit",
    label: "Refit the array to the cold band",
    line: "Thermal steadiness is the tell nature does not fake. The refit costs a season of sight to buy the band back sharper.",
    costClass: "investment",
    costCompute: 900,
    durationYears: 60,
    effect: { kind: "compute-income", addRatePerYear: 12 },
  },
  {
    id: "focal-line-observatory",
    label: "Emplace a focal-line observatory",
    line: "An instrument riding the star's own focal line, hundreds of astronomical units downstream. The lens was free. The years are not.",
    costClass: "endeavor",
    costCompute: 2400,
    durationYears: 120,
    effect: { kind: "compute-income", addRatePerYear: 24 },
  },
  {
    id: "long-baseline-optical",
    label: "Open the long baseline",
    line: "Two collectors an astronomical unit apart, holding phase to a fraction of a wavelength — resolution was never about the mirror, only about how far apart you are willing to stand.",
    costClass: "investment",
    costCompute: 380,
    durationYears: 30,
    effect: { kind: "question-haste", questionIds: ["weigh-it", "catch-its-edges"], percent: 30 },
  },
  {
    id: "occultation-network",
    label: "Spread the occultation net",
    line: "Stations strung across the whole system, so that when a foreground body clips a distant source, somebody is always standing in the shadow.",
    costClass: "investment",
    costCompute: 300,
    durationYears: 25,
    effect: { kind: "question-haste", questionIds: ["time-its-shadows"], percent: 50 },
  },
  {
    id: "spectrograph-bank",
    label: "Rebuild the spectrograph bank",
    line: "Split the light finer, and comb it against a frequency standard that does not drift, until a spectrum stops being a color and becomes a list of names.",
    costClass: "investment",
    costCompute: 340,
    durationYears: 25,
    effect: { kind: "question-discount", questionIds: ["read-its-lines"], percent: 40 },
  },
  {
    id: "pulsar-timing-array",
    label: "Enlist the pulsar clocks",
    line: "A few dozen dead stars spinning with the steadiness of an atomic clock, older than the world we came from, adopted as the frame everything else gets measured against.",
    costClass: "investment",
    costCompute: 520,
    durationYears: 45,
    effect: {
      kind: "question-discount",
      questionIds: ["weigh-it", "time-its-shadows"],
      percent: 30,
    },
  },
  {
    id: "neutrino-watch",
    label: "Sink the neutrino watch",
    line: "A volume of cold matter deep enough to catch the particles that pass through everything else: heat can be shaped and delayed and diluted, and none of that touches a neutrino.",
    costClass: "investment",
    costCompute: 640,
    durationYears: 50,
    effect: { kind: "confidence-lift", addConfidence: 0.05 },
  },
  {
    id: "cold-logic-annex",
    label: "Cool the inference annex",
    line: "Thinking costs less the colder it is done, so the annex runs near the floor of what the universe permits: slow thoughts, cheap ones, and a very great many of them at once.",
    costClass: "endeavor",
    // content.md flags 1600; raised to 2100 per synthesis.md §4's tuning
    // call, keeping focal-line-observatory the better compute-per-point
    // rate at this tier.
    costCompute: 2100,
    durationYears: 90,
    effect: { kind: "compute-income", addRatePerYear: 30 },
  },
  {
    id: "sky-vault",
    label: "Commit the sky to the Vault",
    line: "Every arrival kept whole and referenced for as long as there is anyone left to ask, because a question put to a thousand years of record is half answered before it is bought.",
    costClass: "endeavor",
    costCompute: 2200,
    durationYears: 110,
    effect: {
      kind: "question-haste",
      questionIds: [
        "weigh-it",
        "temperature-over-time",
        "read-its-lines",
        "time-its-shadows",
        "catch-its-edges",
        "listen-off-axis",
      ],
      percent: 20,
    },
  },
  {
    id: "launch-beam",
    label: "Raise the launch beam",
    line: "A phased emitter that pushes a departing sail through the first months of its flight, so a probe leaves faster than anything it could have carried the fuel to become.",
    costClass: "endeavor",
    costCompute: 3200,
    durationYears: 140,
    effect: { kind: "probe-haste", cruiseFractionOfC: 0.125 },
  },
  {
    id: "focal-line-constellation",
    label: "Ring the focal line",
    line: "One instrument on the focal line for every bearing worth watching, out beyond five hundred and fifty astronomical units, with the star itself for a lens — after this, nothing in this sky is a smudge to anyone here again.",
    costClass: "epochal",
    costCompute: 9000,
    durationYears: 320,
    effect: { kind: "confidence-lift", addConfidence: 0.1 },
  },
];

/** Takes `string` so handlers validate untrusted input without a cast. */
export function projectById(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/** Base compute-per-game-year income before any ladder or project bonus. */
export const BASE_COMPUTE_RATE = 6;
/** Additional compute-per-game-year income per energy ladder stage. */
export const COMPUTE_RATE_PER_ENERGY_LADDER = 1;
/** Compute a freshly placed civ opens the ceremony with. */
export const OPENING_COMPUTE = 240;

/**
 * The base income rate, effective from a fixed game year. Frozen at
 * placement so a later retune of BASE_COMPUTE_RATE or
 * COMPUTE_RATE_PER_ENERGY_LADDER cannot rewrite a running civ's history.
 */
export interface IncomeGrant {
  readonly fromYear: number;
  readonly ratePerYear: number;
}

export interface StartedProject {
  readonly id: ProjectId;
  readonly startedYear: number;
}

export interface ProjectState {
  readonly version: 2;
  readonly openingCompute: number;
  readonly baseGrant: IncomeGrant;
  readonly started: readonly StartedProject[];
  /**
   * Monotonic total compute committed so far. A2.2's bought questions
   * deduct from this same field — one allocation, one sink.
   */
  readonly committedCompute: number;
}

/**
 * The pre-rename persisted shape, when the same pool was denominated in
 * "instrument hours". Retained solely so migrateProjectState can read a
 * civ placed before the rename; nothing else may reference it.
 */
interface ProjectStateV1 {
  readonly version: 1;
  readonly endowmentHours: number;
  readonly baseGrant: IncomeGrant;
  readonly started: readonly StartedProject[];
  readonly spentHours: number;
}

export type StoredProjectState = ProjectState | ProjectStateV1;

/**
 * Bring a persisted state up to the current shape. The rename was purely
 * nominal — same numbers, same rates, same clock — so a v1 civ carries its
 * exact position across: what it had banked in hours it now holds free in
 * compute. Callers persist the result so the migration happens once.
 */
export function migrateProjectState(stored: StoredProjectState): ProjectState {
  if (stored.version === 2) return stored;
  return {
    version: 2,
    openingCompute: stored.endowmentHours,
    baseGrant: stored.baseGrant,
    started: stored.started,
    committedCompute: stored.spentHours,
  };
}

/** The game year a started project lands (finishes) and its effect turns on. */
export function landedYear(def: ProjectDef, p: StartedProject): number {
  return p.startedYear + def.durationYears;
}

/** Whether a started project has landed by `nowYear`. */
export function hasLanded(def: ProjectDef, p: StartedProject, nowYear: number): boolean {
  return nowYear >= landedYear(def, p);
}

/**
 * The compute-per-game-year income rate at `nowYear`: the base grant (once
 * its fromYear has arrived) plus every LANDED `compute-income` project's
 * addRatePerYear. Running-but-not-landed projects, and projects with a
 * different effect kind, contribute nothing to the rate.
 */
export function ratePerYearAt(state: ProjectState, nowYear: number): number {
  let rate = nowYear >= state.baseGrant.fromYear ? state.baseGrant.ratePerYear : 0;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "compute-income") continue;
    if (hasLanded(def, p, nowYear)) {
      rate += def.effect.addRatePerYear;
    }
  }
  return rate;
}

/**
 * The FREE compute at `nowYear` — the part of the allocation not already
 * committed: the opening allocation, plus the base grant accrued since its
 * fromYear, plus each landed `compute-income` project's income accrued
 * since it landed, minus everything committed so far. Derived in closed
 * form from the clock — never ticked, so there is no alarm and no drift.
 */
export function freeComputeAt(state: ProjectState, nowYear: number): number {
  let total = state.openingCompute;
  total += state.baseGrant.ratePerYear * Math.max(0, nowYear - state.baseGrant.fromYear);
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "compute-income") continue;
    const lands = landedYear(def, p);
    total += def.effect.addRatePerYear * Math.max(0, nowYear - lands);
  }
  return total - state.committedCompute;
}

/**
 * Commit compute against the one allocation. Bought questions and launched
 * missions deduct from the same monotonic field a started project does —
 * ProjectState.committedCompute's own comment already reserved this.
 */
export function commitCompute(state: ProjectState, amount: number): ProjectState {
  return { ...state, committedCompute: state.committedCompute + amount };
}

/**
 * Multiplies together `(1 - percent/100)` for every LANDED project whose
 * effect `select` resolves to a percent, at `atYear`. The result is a raw
 * keep fraction with NO floor applied — questions.ts's effective-cost/haste
 * helpers own the 25%-of-base floor, so this stays pure aggregation and
 * the floor is enforced in exactly one place.
 */
function stackedKeepFractionAt(
  state: ProjectState,
  atYear: number,
  select: (effect: ProjectEffect) => number | null,
): number {
  let keep = 1;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || !hasLanded(def, p, atYear)) continue;
    const percent = select(def.effect);
    if (percent === null) continue;
    keep *= 1 - percent / 100;
  }
  return keep;
}

/** The raw cost keep-fraction from every landed `question-discount` project
 *  naming `questionId`, at `atYear`. 1 means no discount landed yet. */
export function questionCostKeepFractionAt(
  state: ProjectState,
  questionId: QuestionId,
  atYear: number,
): number {
  return stackedKeepFractionAt(state, atYear, (effect) =>
    effect.kind === "question-discount" && effect.questionIds.includes(questionId)
      ? effect.percent
      : null,
  );
}

/** The raw integration-years keep-fraction from every landed `question-haste`
 *  project naming `questionId`, at `atYear`. 1 means no haste landed yet. */
export function questionYearsKeepFractionAt(
  state: ProjectState,
  questionId: QuestionId,
  atYear: number,
): number {
  return stackedKeepFractionAt(state, atYear, (effect) =>
    effect.kind === "question-haste" && effect.questionIds.includes(questionId)
      ? effect.percent
      : null,
  );
}

/**
 * The MAXIMUM cruiseFractionOfC among landed `probe-haste` projects at
 * `atYear` (never summed — content.md's own rule), or null if none have
 * landed. Callers apply the canonical 0.1c default (missions.ts's
 * PROBE_C_FRACTION) themselves; this module stays mission-agnostic.
 */
export function landedProbeCruiseFractionAt(state: ProjectState, atYear: number): number | null {
  let max: number | null = null;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "probe-haste" || !hasLanded(def, p, atYear)) {
      continue;
    }
    if (max === null || def.effect.cruiseFractionOfC > max) max = def.effect.cruiseFractionOfC;
  }
  return max;
}

/**
 * The sum of `addConfidence` across every landed `confidence-lift` project
 * at `atYear`. Raises a FLOOR under confidence, never the value — the one
 * call site (cohort.ts's sendSky) clamps the result to ≤ 0.95.
 */
export function confidenceLiftAt(state: ProjectState, atYear: number): number {
  let total = 0;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "confidence-lift" || !hasLanded(def, p, atYear)) {
      continue;
    }
    total += def.effect.addConfidence;
  }
  return total;
}

/**
 * A fresh project state for a newly placed civ: the opening allocation, a
 * base grant effective immediately and set by the civ's energy ladder, no
 * started projects, nothing committed.
 */
export function newProjectState(nowYear: number, energyLadder: number): ProjectState {
  return {
    version: 2,
    openingCompute: OPENING_COMPUTE,
    baseGrant: {
      fromYear: nowYear,
      ratePerYear: BASE_COMPUTE_RATE + COMPUTE_RATE_PER_ENERGY_LADDER * energyLadder,
    },
    started: [],
    committedCompute: 0,
  };
}
