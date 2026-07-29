// Probe-class missions — derivation module for A2.2 (missions-design.md,
// technology.md's sentinel probes, systems-a.md §3).
//
// THE CLOCK, DERIVED FROM 0.1c. A probe at a tenth of lightspeed launched
// at year L to a target d light-years away is beyond amendment at L+9d (an
// amendment beamed later cannot beat the probe there), arrives at L+10d,
// and the earliest word home can hear is L+11d — the flight, plus d years
// for the confirming light to cross back. Nothing here is stored: every
// date is `{launchedYear, distanceLy, flightYearsPerLy}` plus arithmetic
// (`missionHorizonYear` / `missionArrivalYear` / `missionFirstWordYear`).
// `flightYearsPerLy` is frozen on StoredMission at launch (synthesis.md §4:
// a project landed later must never retroactively speed up a mission
// already in flight).
//
// THE ASSAY IS NOT FRESHER, ONLY SHARPER. A report emitted at the target
// at year E arrives home at E+d — exactly the year the telescope is
// already showing. `deriveReports` reads truth exclusively through
// `peekTruth`, so the loop bound over candidate emission years IS the
// light-cone discipline: nothing above the cone is ever offered to the
// verdict tables. Reports carry PROSE AND DATES ONLY — no numeric truth
// field, because a number invites a future caller to fill it from a year
// the sentence-picker would have refused.
//
// SILENCE IS A SUBTRACTION OF TWO SCHEDULES, DICE-FREE (§3.4).
// `expectedArrivals` is what home was PROMISED at launch, from the mission
// KIND alone — pure arithmetic, no galaxy, no truth, and NOT gated by the
// charter (home cannot know, until the light is back, whether a
// contingency fired). `actualEmissions` is what the far side ACTUALLY
// sent, charter × truth-at-arrival (`ResolvedPlan`) — also pure
// arithmetic, taking the already-resolved plan rather than reading truth
// itself. A row goes silent when a promised arrival's grace window has
// closed and no actual arrival matches it. The player wrote the charter
// that causes this, which is the whole point: the silence CARRIES
// information without the game ever stating it.
//
// MISSIONS SURVIVE THEIR SOURCES. `toMissionSnapshot` derives from
// StoredMission + a LightCone, never from a currently-visible
// DetectedSource — a probe sent to a civilization that has since dropped
// below the detection floor keeps reporting, because its target civ id
// was stored at launch and its reports still stop at `cone.asOfYear`.
//
// `moved` ON A REPORT. A mission report doesn't know which signal class
// (if any) its target currently studies under — deriveReports takes no
// signalClass parameter, by design, since a probe's ground truth outlives
// its source's visibility. So `deriveReports` reads studies.ts's
// class-agnostic `movedFromShiftAnyClass` instead of the single-class
// `movedFromShift` questions.ts uses; the shift itself still comes from
// the occupancy-keyed verdict tables below.

import type { LadderStages } from "./civseed";
import { civById, type Galaxy } from "./galaxy";
import {
  occupancyAt,
  peekTruth,
  type LightCone,
  type Occupancy,
} from "./knowledge";
import type { CostClass } from "./projects";
import type { RoleShift } from "./questions";
import { movedFromShiftAnyClass, type StudyMove } from "./studies";
import type { CharterClauseWire, HypothesisId, MissionReport, MissionSnapshot } from "./protocol";

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

/** Canonical probe speed (technology.md: seedships and probes ~0.1c). */
export const PROBE_C_FRACTION = 0.1;
/** Flight years per light-year at the canonical speed. 1 / 0.1 = 10. */
export const FLIGHT_YEARS_PER_LY = 1 / PROBE_C_FRACTION;
/**
 * Years-per-light-year offset after which a beamed amendment can no longer
 * overtake the probe before arrival, at the CANONICAL speed: a beam sent at
 * Y reaches the target at Y+d and beats the probe iff Y+d < L+10d, i.e.
 * Y < L+9d. Kept for reference; a specific mission's horizon uses its own
 * frozen `flightYearsPerLy` (see `missionHorizonYear`).
 */
export const HORIZON_YEARS_PER_LY = FLIGHT_YEARS_PER_LY - 1;
/** A standing mission's report cadence, in game years (≈2 real hours). */
export const SENTINEL_CADENCE_YEARS = 25;
/** Slop on schedule comparisons, so float dates never fake a silence. */
export const SILENCE_GRACE_YEARS = 2;
/** Newest reports carried on the wire per mission; older ones are dropped. */
export const MAX_REPORTS_ON_WIRE = 8;
/** Slop so a float-adjacent year at a schedule boundary never misfires. */
const EPS = 1e-6;

// ---------------------------------------------------------------------------
// Mission kinds
// ---------------------------------------------------------------------------

export type MissionKind = "assay" | "sentinel";

export interface MissionKindDef {
  readonly kind: MissionKind;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass; // "ambient" for both
  readonly costCompute: number;
  /** The base cruise speed (10 y/ly), so the client can preview a clock
   *  before the live effective value (sky's `probeFlightYearsPerLy`) is
   *  known to differ. */
  readonly flightYearsPerLy: number;
  readonly cadenceYears: number | null;
}

/**
 * Ambient pricing (economy-design.md: "Launch a probe/seedship = Ambient …
 * under the income line, no saving up, no ceremony"). Label/line take
 * content.md PART 3's briefing prose (synthesis.md §5: stronger where the
 * mechanic matches). costCompute is the 2026-07 scarcity pass: systems-a
 * §3.2's canonical 24/40 scaled with the question retune (×3, rounded) so
 * the Assay stays cheaper than any question — its real price is the
 * decades of flight — without undercutting the whole menu. Still ambient
 * against the attention pool: 75 ≈ 12y of base income, about a tenth of a
 * full pool.
 */
export const MISSION_KINDS: readonly MissionKindDef[] = [
  {
    kind: "assay",
    label: "THE ASSAY",
    line: "A probe at a tenth of lightspeed, one pass through the system, and an answer that is not a belief. It leaves, and after that nothing about it is ours to decide.",
    costClass: "ambient",
    costCompute: 75,
    flightYearsPerLy: FLIGHT_YEARS_PER_LY,
    cadenceYears: null,
  },
  {
    kind: "sentinel",
    label: "THE SENTINEL",
    line: "An instrument with patience: it spends its arrival slowing down, takes an orbit, and reports on a cadence long after everyone who authorized it has changed their mind.",
    costClass: "ambient",
    costCompute: 120,
    flightYearsPerLy: FLIGHT_YEARS_PER_LY,
    cadenceYears: SENTINEL_CADENCE_YEARS,
  },
];

/** Takes `string` so handlers validate untrusted input without a cast. */
export function missionKindById(kind: string): MissionKindDef | undefined {
  return MISSION_KINDS.find((k) => k.kind === kind);
}

/**
 * The mission's name as it reads inside a sentence — `label` is chrome
 * (ALL CAPS) and cannot be dropped into prose. studies.ts's grounded
 * annotation names the probe that closed a study, and mission wording
 * belongs to this module, so the sentence-case form lives here.
 */
export function missionProseName(kind: MissionKind): string {
  return kind === "assay" ? "The Assay" : "The Sentinel";
}

// ---------------------------------------------------------------------------
// Charters — pre-authorized contingencies (systems-a.md §3.3)
// ---------------------------------------------------------------------------

export type CharterGroupId = "on-occupied" | "station" | "signal-plan";
export type CharterClauseId =
  | "hold-at-range"
  | "close-regardless"
  | "keep-station"
  | "one-look-and-done"
  | "go-dark-if-answered"
  | "report-on-cadence";

export interface CharterClauseDef {
  readonly id: CharterClauseId;
  readonly group: CharterGroupId;
  readonly label: string; // ≤6 words, chrome register
  readonly line: string; // the clause as written
  readonly appliesTo: readonly MissionKind[];
}

export const MIN_CHARTER_CLAUSES = 2;
export const MAX_CHARTER_CLAUSES = 3;

const BOTH_KINDS: readonly MissionKind[] = ["assay", "sentinel"];

/**
 * The six clauses, two per exclusivity group. Structure, ids, groups, and
 * the resolution table are systems-a.md §3.3's (canonical per synthesis.md
 * §6); prose blends systems-a's mechanically-precise clause text with
 * content.md's stronger phrasing where the doctrine matches (silence-over-
 * life → go-dark-if-answered; stay-and-watch → keep-station;
 * report-everything → report-on-cadence).
 */
export const CHARTER_CLAUSES: readonly CharterClauseDef[] = [
  {
    id: "hold-at-range",
    group: "on-occupied",
    label: "Hold at range if occupied",
    line: "If the world is living or occupied, do not close. Hold at range and watch.",
    appliesTo: BOTH_KINDS,
  },
  {
    id: "close-regardless",
    group: "on-occupied",
    label: "Close and look regardless",
    line: "Close and look, whatever is there.",
    appliesTo: BOTH_KINDS,
  },
  {
    id: "keep-station",
    group: "station",
    label: "Stay if nothing is working",
    line: "If nothing is working there, stay and keep watch: a patient instrument over people who will never know it is there.",
    appliesTo: BOTH_KINDS,
  },
  {
    id: "one-look-and-done",
    group: "station",
    label: "One look, then power down",
    line: "One look, then power down.",
    appliesTo: ["sentinel"],
  },
  {
    id: "go-dark-if-answered",
    group: "signal-plan",
    label: "Go dark if answered",
    line: "If anything there is transmitting, stop transmitting. We would rather not be the reason anybody down there learns to look up.",
    appliesTo: BOTH_KINDS,
  },
  {
    id: "report-on-cadence",
    group: "signal-plan",
    label: "Report on cadence, always",
    line: "Report on the schedule, whatever happens, so the moment there is anything to say, we hear it.",
    appliesTo: BOTH_KINDS,
  },
];

export function charterClauseById(id: string): CharterClauseDef | undefined {
  return CHARTER_CLAUSES.find((c) => c.id === id);
}

/**
 * Length in [MIN,MAX], every id known, every clause applies to `kind`, no
 * two clauses share a group, no duplicate ids. Returns the narrowed,
 * de-duplicated id list on success, else null (handler answers
 * `bad-charter`).
 */
export function validateCharter(
  kind: MissionKind,
  charter: readonly string[],
): readonly CharterClauseId[] | null {
  if (charter.length < MIN_CHARTER_CLAUSES || charter.length > MAX_CHARTER_CLAUSES) return null;
  const seenIds = new Set<string>();
  const seenGroups = new Set<CharterGroupId>();
  const resolved: CharterClauseId[] = [];
  for (const raw of charter) {
    if (seenIds.has(raw)) return null;
    seenIds.add(raw);
    const def = charterClauseById(raw);
    if (def === undefined) return null;
    if (!def.appliesTo.includes(kind)) return null;
    if (seenGroups.has(def.group)) return null;
    seenGroups.add(def.group);
    resolved.push(def.id);
  }
  return resolved;
}

/** The far side's actual behavior, once truth at arrival is knowable. */
export interface ResolvedPlan {
  readonly emits: boolean; // false ⇒ the mission never speaks
  readonly standing: boolean; // true ⇒ reports on cadence from arrival
  readonly closeLook: boolean; // false ⇒ held at range: the coarse verdict
}

/**
 * Deterministic. Order of clause application is fixed by group order:
 * on-occupied, then station, then signal-plan (systems-a.md §3.3).
 */
export function resolvePlan(
  kind: MissionKind,
  charter: readonly CharterClauseId[],
  occupancy: Occupancy,
): ResolvedPlan {
  let emits = true;
  // station default: an Assay leaves after one look, a Sentinel stands.
  let standing = kind === "sentinel";
  // on-occupied default: close.
  let closeLook = true;

  if (charter.includes("hold-at-range")) {
    if (occupancy === "living-industrial" || occupancy === "working") {
      closeLook = false;
      standing = true;
    }
  }
  // close-regardless is the explicit form of the default; nothing to do.

  if (charter.includes("keep-station")) {
    if (occupancy === "living-quiet" || occupancy === "banked") {
      standing = true;
    }
  }
  if (charter.includes("one-look-and-done")) {
    standing = false;
  }

  if (charter.includes("go-dark-if-answered")) {
    if (occupancy === "working") {
      emits = false;
    }
  }
  // report-on-cadence is the explicit form of the baseline; nothing to do.

  return { emits, standing, closeLook };
}

// ---------------------------------------------------------------------------
// Persistence — the launch record (systems-a.md §6.2)
// ---------------------------------------------------------------------------

/**
 * The launch record. This never crosses the wire — `toMissionSnapshot` is
 * its only reader, and drops `targetCivId` the way `toWireSource` drops
 * `targetId`. `distanceLy` and `flightYearsPerLy` are FROZEN at launch:
 * every date derives from them, and neither a later galaxy change nor a
 * later-landed probe-haste project may retroactively move a mission
 * already under way. `targetCivId` is stored rather than re-resolved from
 * `starId` for the same reason — the probe was sent to whoever was there
 * when it left.
 */
export interface StoredMission {
  readonly id: string; // `m-${ordinal}`
  readonly kind: MissionKind;
  readonly starId: string;
  readonly targetCivId: string;
  readonly launchedYear: number;
  readonly distanceLy: number;
  readonly flightYearsPerLy: number;
  readonly charter: readonly CharterClauseId[];
}

export interface MissionState {
  readonly version: 1;
  readonly missions: readonly StoredMission[];
  readonly nextOrdinal: number;
}

export function newMissionState(): MissionState {
  return { version: 1, missions: [], nextOrdinal: 1 };
}

/** Identity at v1 — the seam exists for a future version bump. */
export function migrateMissionState(stored: MissionState): MissionState {
  return stored;
}

export const MAX_MISSIONS_PER_TOKEN = 24;

/** The last year a beamed amendment can still overtake this mission's probe. */
export function missionHorizonYear(m: StoredMission): number {
  return m.launchedYear + (m.flightYearsPerLy - 1) * m.distanceLy;
}

/** The year this mission's probe reaches its target. */
export function missionArrivalYear(m: StoredMission): number {
  return m.launchedYear + m.flightYearsPerLy * m.distanceLy;
}

/** The earliest year home can hear anything back. */
export function missionFirstWordYear(m: StoredMission): number {
  return m.launchedYear + (m.flightYearsPerLy + 1) * m.distanceLy;
}

// ---------------------------------------------------------------------------
// Silence — two schedules, one subtraction (systems-a.md §3.4)
// ---------------------------------------------------------------------------

/**
 * What home was PROMISED, from the launch record and mission KIND alone.
 * Pure arithmetic — takes no galaxy, no cone, no truth, and is NOT gated by
 * the charter: by the horizon rule home cannot know whether a contingency
 * fired. Assay: one word. Sentinel: a word every cadence, forever (bounded
 * by `throughYear` so the list stays finite).
 */
export function expectedArrivals(
  kind: MissionKind,
  launchedYear: number,
  distanceLy: number,
  flightYearsPerLy: number,
  throughYear: number,
): readonly number[] {
  const first = launchedYear + (flightYearsPerLy + 1) * distanceLy;
  if (first > throughYear + EPS) return [];
  if (kind === "assay") return [first];
  const out: number[] = [];
  for (let y = first; y <= throughYear + EPS; y += SENTINEL_CADENCE_YEARS) {
    out.push(y);
  }
  return out;
}

/**
 * What the far side ACTUALLY emitted, charter × truth at arrival (already
 * resolved into `plan`). Emission years, not arrival years — no galaxy
 * parameter, so this cannot read truth itself.
 */
export function actualEmissions(
  plan: ResolvedPlan,
  arrivalYear: number,
  throughYear: number,
): readonly number[] {
  if (!plan.emits) return [];
  if (arrivalYear > throughYear + EPS) return [];
  if (!plan.standing) return [arrivalYear];
  const out: number[] = [];
  for (let y = arrivalYear; y <= throughYear + EPS; y += SENTINEL_CADENCE_YEARS) {
    out.push(y);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The report — a shape that cannot leak (systems-a.md §3.5)
// ---------------------------------------------------------------------------

interface ReportVerdict {
  readonly headline: string;
  readonly detail: string;
  readonly shift: RoleShift;
}

/**
 * Close-look verdicts (§3.5's first table) and, where the plan held at
 * range on an occupied world, the coarser long-look pair (its second
 * table). `hold-at-range` only ever fires for `living-industrial` /
 * `working` occupancy, so those are the only two long-look rows authored;
 * a `banked` / `living-quiet` target always reads the close-look table
 * regardless of `closeLook`, because standing off changes nothing about
 * what a cold, quiet body has to show.
 */
function closeLookFor(occupancy: Occupancy, ladders: LadderStages, closeLook: boolean): ReportVerdict {
  if (!closeLook && occupancy === "working") {
    return {
      headline: "OCCUPIED, HOLDING AT RANGE",
      detail:
        "Powered structure, at a distance we were told not to close. We are standing off and watching.",
      shift: { built: 3, mundane: 0.4, quiet: 0.4 },
    };
  }
  if (!closeLook && occupancy === "living-industrial") {
    return {
      headline: "INHABITED, HOLDING AT RANGE",
      detail: "A world with machines on it. We are standing off, as instructed.",
      shift: { built: 3, mundane: 0.5, quiet: 0.4 },
    };
  }
  switch (occupancy) {
    case "living-quiet":
      return {
        headline: "A LIVING WORLD, NO WORKS",
        detail:
          "Air, water, weather, and a biosphere going about its business. Nothing is transmitting, and nothing has been built.",
        shift: { mundane: 6, open: 3, built: 0.2, quiet: 0.3 },
      };
    case "living-industrial":
      return {
        headline: "A LIVING WORLD, BUILDING",
        detail: "Machines are running down there, and chemistry in the air that no volcano makes.",
        shift: { built: 6, mundane: 0.5, quiet: 0.2, open: 0.5 },
      };
    case "working":
      return {
        headline: "OCCUPIED AND WORKING",
        detail:
          "Structures under power, holding station, shedding waste heat on purpose. Somebody is home and busy.",
        shift: { built: 8, mundane: 0.15, quiet: 0.15, open: 0.3 },
      };
    case "banked": {
      const extra =
        ladders.integration >= 3
          ? " Nothing is radiating. That is not the same as nothing being there."
          : "";
      return {
        headline: "COLD AND STILL",
        detail: `No works under power. No heat above the rock.${extra}`,
        shift: { quiet: 6, mundane: 2, built: 0.15, open: 0.5 },
      };
    }
  }
}

interface PeriodicTemplate {
  readonly headline: string;
  readonly detail: string;
}

const PERIODIC_QUIET: PeriodicTemplate = {
  headline: "NOTHING NEW TO REPORT",
  detail:
    "Nothing has changed here that was not going to change anyway. The world turns, the chemistry holds, and the instrument is well.",
};
const PERIODIC_TREND: PeriodicTemplate = {
  headline: "TREND CONTINUES",
  detail:
    "The trend flagged last interval has continued, and is now outside the range we called normal. No recommendation attached; the charter did not ask for one.",
};
const PERIODIC_MARGIN: PeriodicTemplate = {
  headline: "POWER MARGIN FAILING",
  detail:
    "Power margin has fallen below what the charter set aside for reporting. This is the last interval at this cadence. The next will be longer, or will not come.",
};
const PERIODIC_OFF_CADENCE: PeriodicTemplate = {
  headline: "OFF-CADENCE REPORT",
  detail:
    "Something happened here that the charter has a line for, and the line was followed. The record is attached in full.",
};
const PERIODIC_CYCLE: readonly PeriodicTemplate[] = [
  PERIODIC_QUIET,
  PERIODIC_TREND,
  PERIODIC_MARGIN,
];

/** Deterministic by ordinal (content.md PART 3's periodic templates, cycled
 *  — "the ordinary case must be the common one"). */
function periodicTemplateAt(ordinal: number): PeriodicTemplate {
  const idx = (ordinal - 2) % PERIODIC_CYCLE.length;
  return PERIODIC_CYCLE[idx] ?? PERIODIC_QUIET;
}

/** The shift-bearing core shared by `deriveReports` (wire, strips the
 *  shift) and `deriveStudyMoves` (server-side, keeps it). One truth-reading
 *  loop, two thin producers — so the light-cone discipline lives in exactly
 *  one place. */
interface ReportCore {
  readonly ordinal: number;
  readonly latest: boolean;
  readonly aboutYear: number;
  readonly arrivedYear: number;
  readonly headline: string;
  readonly detail: string;
  readonly shift: RoleShift;
}

/**
 * Reads truth exclusively through `peekTruth`: `actualEmissions` gives
 * candidate emission years, this filters to those already home
 * (`e + distanceLy ≤ nowYear`), and every survivor's `peekTruth` call is
 * therefore guaranteed non-null — the loop bound IS the light-cone
 * discipline. The first delivered report uses the close/long-look table;
 * later ones cycle through the periodic templates, re-reading occupancy at
 * EACH emission year so a sentinel watching a civ that changes mid-watch
 * reports the change (an `OFF-CADENCE REPORT` regardless of where the
 * cycle sat).
 */
function deriveReportCores(
  galaxy: Galaxy,
  cone: LightCone,
  m: StoredMission,
  plan: ResolvedPlan,
  arrivalYear: number,
  nowYear: number,
): readonly ReportCore[] {
  if (!plan.emits) return [];
  const emissions = actualEmissions(plan, arrivalYear, nowYear);
  const deliverable = emissions.filter((e) => e + m.distanceLy <= nowYear + EPS);
  const ladders = civById(galaxy, m.targetCivId).seed.ladders;

  const cores: ReportCore[] = [];
  let prevOccupancy: Occupancy | null = null;
  for (let i = 0; i < deliverable.length; i++) {
    const e = deliverable[i];
    if (e === undefined) continue;
    const truth = peekTruth(galaxy, cone, e);
    if (truth === null) continue; // unreachable given the filter above; defensive
    const occupancy = occupancyAt(truth);
    const ordinal = i + 1;

    let verdict: ReportVerdict;
    if (ordinal === 1) {
      verdict = closeLookFor(occupancy, ladders, plan.closeLook);
    } else {
      const base = closeLookFor(occupancy, ladders, plan.closeLook);
      const changed = prevOccupancy !== null && prevOccupancy !== occupancy;
      const template = changed ? PERIODIC_OFF_CADENCE : periodicTemplateAt(ordinal);
      verdict = { headline: template.headline, detail: template.detail, shift: base.shift };
    }
    prevOccupancy = occupancy;

    cores.push({
      ordinal,
      latest: false,
      aboutYear: e,
      arrivedYear: e + m.distanceLy,
      headline: verdict.headline,
      detail: verdict.detail,
      shift: verdict.shift,
    });
  }

  const lastIndex = cores.length - 1;
  const last = cores[lastIndex];
  if (last !== undefined) cores[lastIndex] = { ...last, latest: true };
  return cores;
}

/** The ONLY producer of MissionReports — the wire-safe half of
 *  `deriveReportCores` (prose and dates only; `moved` via the
 *  class-agnostic `movedFromShiftAnyClass`, never a numeric shift). */
export function deriveReports(
  galaxy: Galaxy,
  cone: LightCone,
  m: StoredMission,
  plan: ResolvedPlan,
  arrivalYear: number,
  nowYear: number,
): readonly MissionReport[] {
  const cores = deriveReportCores(galaxy, cone, m, plan, arrivalYear, nowYear);
  const capped = cores.length > MAX_REPORTS_ON_WIRE ? cores.slice(-MAX_REPORTS_ON_WIRE) : cores;
  return capped.map((c) => {
    const moved: readonly HypothesisId[] = movedFromShiftAnyClass(c.shift);
    return {
      id: `${m.id}/r/${c.ordinal}`,
      ordinal: c.ordinal,
      latest: c.latest,
      aboutYear: c.aboutYear,
      arrivedYear: c.arrivedYear,
      lightAgeYears: nowYear - c.aboutYear,
      headline: c.headline,
      detail: c.detail,
      moved,
    };
  });
}

/**
 * The mission-report half of `StudyMove` production — server-side only
 * (the shift never crosses the wire). cohort.ts calls this for a star's
 * missions when handing evidence to studies.ts's `buildStudySnapshot`,
 * which never imports missions.ts itself and cannot tell an answer from a
 * report (systems-a.md §2.5, §11).
 */
export function deriveStudyMoves(
  galaxy: Galaxy,
  cone: LightCone,
  m: StoredMission,
  plan: ResolvedPlan,
  arrivalYear: number,
  nowYear: number,
): readonly StudyMove[] {
  const cores = deriveReportCores(galaxy, cone, m, plan, arrivalYear, nowYear);
  return cores.map((c) => ({
    id: `${m.id}/r/${c.ordinal}`,
    kind: "report",
    asOfYear: c.aboutYear,
    arrivedYear: c.arrivedYear,
    annotation: c.detail,
    shift: c.shift,
  }));
}

/**
 * Resolves a mission's plan against truth at arrival, if the light is
 * back (`nowYear ≥ firstWordYear`) — else null. The one truth read
 * `toMissionSnapshot` and cohort.ts's evidence assembly share, so a
 * mission's plan is computed identically wherever it is needed.
 */
export function resolveMissionPlan(
  galaxy: Galaxy,
  cone: LightCone,
  m: StoredMission,
  nowYear: number,
): ResolvedPlan | null {
  if (nowYear < missionFirstWordYear(m) - EPS) return null;
  const truth = peekTruth(galaxy, cone, missionArrivalYear(m));
  if (truth === null) return null;
  return resolvePlan(m.kind, m.charter, occupancyAt(truth));
}

// ---------------------------------------------------------------------------
// Work state (systems-a.md §3.6) and the mission wire snapshot (§3.7)
// ---------------------------------------------------------------------------

export type WorkState =
  | "watching" // a study accruing light with nothing bought on it
  | "in-hand"
  | "in-flight"
  | "beyond-horizon"
  | "awaiting-light"
  | "returned"
  | "silent"
  | "standing";

function missionWorkState(
  m: StoredMission,
  plan: ResolvedPlan | null,
  reportCount: number,
  nowYear: number,
): { readonly state: WorkState; readonly missedWordYear: number | null } {
  const horizon = missionHorizonYear(m);
  const arrival = missionArrivalYear(m);
  const firstWord = missionFirstWordYear(m);
  if (nowYear < horizon) return { state: "in-flight", missedWordYear: null };
  if (nowYear < arrival) return { state: "beyond-horizon", missedWordYear: null };
  if (nowYear < firstWord) return { state: "awaiting-light", missedWordYear: null };
  // Truth at arrival is guaranteed knowable once nowYear ≥ firstWord, so
  // `plan` is always non-null here; the fallback is defensive only.
  if (plan === null) return { state: "awaiting-light", missedWordYear: null };

  const expected = expectedArrivals(m.kind, m.launchedYear, m.distanceLy, m.flightYearsPerLy, nowYear);
  const actualAtHome = actualEmissions(plan, arrival, nowYear).map((a) => a + m.distanceLy);
  // A promise is KEPT by an actual arrival within EPS of it — not by exact
  // float equality. The two schedules are the same arithmetic associated
  // differently (`launched + f·d + k·c + d` against `launched + (f+1)·d +
  // k·c`), so from the third cadence on they disagree in the last bits and
  // a Sentinel reporting perfectly on schedule read SILENT forever.
  const kept = (promise: number): boolean =>
    actualAtHome.some((a) => Math.abs(a - promise) <= EPS);
  // The FIRST promise that went unkept, not merely whether one did: it is
  // the year the schedule broke, which is the only date a silence has.
  const missed = expected.find((e) => e + SILENCE_GRACE_YEARS <= nowYear + EPS && !kept(e));
  if (missed !== undefined) return { state: "silent", missedWordYear: missed };
  if (reportCount > 0) {
    return { state: plan.standing ? "standing" : "returned", missedWordYear: null };
  }
  return { state: "awaiting-light", missedWordYear: null };
}

/** The next scheduled home-arrival strictly after `nowYear`, assuming a
 *  continuous cadence anchored at `firstWord`. */
function nextCadenceYearAfter(firstWord: number, nowYear: number): number {
  if (nowYear < firstWord - EPS) return firstWord;
  const k = Math.floor((nowYear - firstWord) / SENTINEL_CADENCE_YEARS) + 1;
  return firstWord + k * SENTINEL_CADENCE_YEARS;
}

/**
 * The only producer of a MissionSnapshot — the toWireSource of missions.
 * Derives from `StoredMission` + the cone, never from a currently-visible
 * DetectedSource, so a probe sent to a civ that has since dropped below
 * the detection floor keeps reporting.
 */
export function toMissionSnapshot(
  galaxy: Galaxy,
  cone: LightCone,
  m: StoredMission,
  nowYear: number,
): MissionSnapshot {
  const def = missionKindById(m.kind);
  const label = def?.label ?? m.kind;
  const horizonYear = missionHorizonYear(m);
  const arrivalYear = missionArrivalYear(m);
  const firstWordYear = missionFirstWordYear(m);

  const plan = resolveMissionPlan(galaxy, cone, m, nowYear);
  const reports: readonly MissionReport[] =
    plan !== null ? deriveReports(galaxy, cone, m, plan, arrivalYear, nowYear) : [];

  const { state, missedWordYear } = missionWorkState(m, plan, reports.length, nowYear);
  const nextWordYear =
    plan !== null && plan.standing ? nextCadenceYearAfter(firstWordYear, nowYear) : null;

  const charter: readonly CharterClauseWire[] = m.charter.map((id) => {
    const clause = charterClauseById(id);
    return {
      id,
      label: clause?.label ?? id,
      line: clause?.line ?? "",
    };
  });

  return {
    id: m.id,
    kind: m.kind,
    label,
    starId: m.starId,
    costClass: def?.costClass ?? "ambient",
    costCompute: def?.costCompute ?? 0,
    launchedYear: m.launchedYear,
    distanceLy: m.distanceLy,
    horizonYear,
    arrivalYear,
    firstWordYear,
    nextWordYear,
    missedWordYear,
    charter,
    state,
    reports,
  };
}
