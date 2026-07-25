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

export type ProjectId =
  | "deep-array"
  | "standing-survey"
  | "cold-band-refit"
  | "focal-line-observatory";

export type CostClass = "ambient" | "investment" | "endeavor" | "epochal";

export interface ProjectEffect {
  readonly kind: "compute-income";
  readonly addRatePerYear: number;
}

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
 * its fromYear has arrived) plus every LANDED project's addRatePerYear.
 * Running-but-not-landed projects contribute nothing yet.
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
 * The FREE compute at `nowYear` — the part of the allocation not already
 * committed: the opening allocation, plus the base grant accrued since its
 * fromYear, plus each landed project's income accrued since it landed,
 * minus everything committed so far. Derived in closed form from the clock
 * — never ticked, so there is no alarm and no drift.
 */
export function freeComputeAt(state: ProjectState, nowYear: number): number {
  let total = state.openingCompute;
  total += state.baseGrant.ratePerYear * Math.max(0, nowYear - state.baseGrant.fromYear);
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined) continue;
    const lands = landedYear(def, p);
    total += def.effect.addRatePerYear * Math.max(0, nowYear - lands);
  }
  return total - state.committedCompute;
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
