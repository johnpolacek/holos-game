// The instrument-time economy — derivation module for A2.2's project layer.
//
// This module owns the project catalog and the instrument-time economy.
// ALL derivation lives here, never in handlers.
//
// Income is a RATE in instrument-hours per GAME year, never real time —
// REAL_MS_PER_GAME_YEAR (clock.ts) is a tunable, and a real-time-denominated
// economy would silently reprice on every retune of that constant.
//
// Accrual is DERIVED from the clock, never ticked: bankedHoursAt reads the
// clock's nowYear and computes the banked total in closed form. There is no
// alarm dedicated to this economy and no drift to correct for.

export type ProjectId =
  | "deep-array"
  | "standing-survey"
  | "cold-band-refit"
  | "focal-line-observatory";

export type CostClass = "ambient" | "investment" | "endeavor" | "epochal";

export interface ProjectEffect {
  readonly kind: "instrument-income";
  readonly addRatePerYear: number;
}

export interface ProjectDef {
  readonly id: ProjectId;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass;
  readonly costInstrumentHours: number;
  readonly durationYears: number;
  readonly effect: ProjectEffect;
}

/**
 * The full v1 project catalog, in menu order. There are no capacity slots:
 * a player with the hours may start all four in the same minute — the
 * catalog having four entries is four distinct things, not a cap. What
 * creates the decision is the balance (cost and duration against a finite,
 * slowly-accruing budget), not a concurrency limit.
 */
export const PROJECTS: readonly ProjectDef[] = [
  {
    id: "deep-array",
    label: "Extend the deep array",
    line: "More collecting area, and more patience. The data is the easy part; the inference is the spend.",
    costClass: "investment",
    costInstrumentHours: 220,
    durationYears: 20,
    effect: { kind: "instrument-income", addRatePerYear: 6 },
  },
  {
    id: "standing-survey",
    label: "Commission the standing survey",
    line: "Every system inside the neighborhood, characterized to a fixed depth, on a schedule. A null result means something once you know where you looked.",
    costClass: "investment",
    costInstrumentHours: 420,
    durationYears: 40,
    effect: { kind: "instrument-income", addRatePerYear: 8 },
  },
  {
    id: "cold-band-refit",
    label: "Refit the array to the cold band",
    line: "Thermal steadiness is the tell nature does not fake. The refit costs a season of sight to buy the band back sharper.",
    costClass: "investment",
    costInstrumentHours: 900,
    durationYears: 60,
    effect: { kind: "instrument-income", addRatePerYear: 12 },
  },
  {
    id: "focal-line-observatory",
    label: "Emplace a focal-line observatory",
    line: "An instrument riding the star's own focal line, hundreds of astronomical units downstream. The lens was free. The years are not.",
    costClass: "endeavor",
    costInstrumentHours: 2400,
    durationYears: 120,
    effect: { kind: "instrument-income", addRatePerYear: 24 },
  },
];

/** Takes `string` so handlers validate untrusted input without a cast. */
export function projectById(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/** Base instrument-hours-per-game-year income before any ladder or project bonus. */
export const BASE_INSTRUMENT_RATE = 6;
/** Additional instrument-hours-per-game-year income per energy ladder stage. */
export const INSTRUMENT_RATE_PER_ENERGY_LADDER = 1;
/** Instrument-hours a freshly placed civ opens the ceremony with. */
export const OPENING_ENDOWMENT_HOURS = 240;

/**
 * The base income rate, effective from a fixed game year. Frozen at
 * placement so a later retune of BASE_INSTRUMENT_RATE or
 * INSTRUMENT_RATE_PER_ENERGY_LADDER cannot rewrite a running civ's history.
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
  readonly version: 1;
  readonly endowmentHours: number;
  readonly baseGrant: IncomeGrant;
  readonly started: readonly StartedProject[];
  /**
   * Monotonic total instrument-hours spent so far. A2.2's bought questions
   * deduct from this same field — one budget, one sink.
   */
  readonly spentHours: number;
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
 * The instrument-hours-per-game-year income rate at `nowYear`: the base
 * grant (once its fromYear has arrived) plus every LANDED project's
 * addRatePerYear. Running-but-not-landed projects contribute nothing yet.
 */
export function ratePerYearAt(state: ProjectState, nowYear: number): number {
  let rate = nowYear >= state.baseGrant.fromYear ? state.baseGrant.ratePerYear : 0;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined) continue;
    if (hasLanded(def, p, nowYear)) {
      rate += def.effect.addRatePerYear;
    }
  }
  return rate;
}

/**
 * The banked instrument-hours total at `nowYear`: the opening endowment,
 * plus the base grant accrued since its fromYear, plus each landed
 * project's income accrued since it landed, minus everything spent so far.
 * Derived in closed form from the clock — never ticked, so there is no
 * alarm and no drift.
 */
export function bankedHoursAt(state: ProjectState, nowYear: number): number {
  let total = state.endowmentHours;
  total += state.baseGrant.ratePerYear * Math.max(0, nowYear - state.baseGrant.fromYear);
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined) continue;
    const lands = landedYear(def, p);
    total += def.effect.addRatePerYear * Math.max(0, nowYear - lands);
  }
  return total - state.spentHours;
}

/**
 * A fresh project state for a newly placed civ: the opening endowment, a
 * base grant effective immediately and set by the civ's energy ladder, no
 * started projects, nothing spent.
 */
export function newProjectState(nowYear: number, energyLadder: number): ProjectState {
  return {
    version: 1,
    endowmentHours: OPENING_ENDOWMENT_HOURS,
    baseGrant: {
      fromYear: nowYear,
      ratePerYear: BASE_INSTRUMENT_RATE + INSTRUMENT_RATE_PER_ENERGY_LADDER * energyLadder,
    },
    started: [],
    spentHours: 0,
  };
}
