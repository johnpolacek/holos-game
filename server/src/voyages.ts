// Voyages and founding — the truth side of A4's first half
// (a4-voyages-note.md, with a4-synthesis.md's rulings binding).
//
// THE LANDFALL IS DERIVED, NEVER WRITTEN (synthesis R1). No handler, no
// alarm and no read path appends a child to `galaxy.civs`.
// `foldLandfalls` — of which `galaxyWithLandfalls(base, voyages, nowYear)` is
// the thin, roster-only face — is the ONLY producer of a child PlacedCiv:
// pure, total, and byte-identical for every observer at a given year. The only
// truth a voyage writes is its LAUNCH RECORD and its DEPARTURE LIGHT, both by
// a live-socket handler under the presence rule. The claim is meant to be
// grepped:
//
//   grep -rn "galaxyWithLandfalls\|foldLandfalls" server/src
//
// must show the two definitions here and cohort.ts's `derivedFold` (which
// `requireGalaxy()` reads and which takes the fold rather than the wrapper,
// because it needs the per-voyage outcomes as well as the roster), and nothing
// inside a mutating handler. Its guard on the other side is `saveGalaxyCivs`,
// which asserts no CHILD_ID_PREFIX id ever reaches storage.
//
// Why derived rather than written at launch. Two reasons, and the first is
// decisive: THE OUTCOME CANNOT BE DECIDED AT LAUNCH. Rooting depends on
// occupancy AT LANDFALL, another colony may root first, and the reversal
// clause reads the world the ship actually found. The fold below threads
// occupancy through a total order on (landfallYear, id), which is the only
// deterministic answer to a ship race. The second: a stored not-yet-existing
// civ would put an existence guard into every `galaxy.civs` consumer
// (`civAtStar`, `pickPlayerHome`, `hasHailed`), a far worse blast radius than
// one choke point in cohort.ts.
//
// NOTHING ABOUT THE LIGHT CONE CHANGES. A child's emission history begins at
// its landfall year, so `emissionAt` returns 0 for every observer whose
// `asOfYear` is earlier, `observeCiv` produces a null signal, and `visibleSky`
// omits it. Invisibility until founding + distance falls out of the gate that
// already existed; this module adds no visibility rule of its own.
//
// WHY NOT `StoredMission`. `targetCivId` is mandatory and load-bearing there
// (a probe is sent to whoever was home), `MissionState` is per-token where a
// voyage record is cohort-wide (a founded civ is everyone's fact), and
// `MissionKind` is a closed union with many consumers. What IS copied,
// deliberately: the three clock formulas, the frozen `flightYearsPerLy`, the
// expected-minus-actual subtraction that makes a silence dice-free, and the
// snapshot's prose-and-dates-only shape.
//
// NO RNG THAT IS NOT SEEDED. The world draw is worlds.ts's, keyed on the star;
// there is no per-launch or per-landfall die anywhere in this module.

import {
  drawStocks,
  nearestArchetype,
  type CivId,
  type CivSeed,
  type EmissionEpoch,
  type LadderStages,
} from "./civseed";
import { cradleById, type LineageId } from "./cradles";
import {
  clampDial,
  DIAL_AXES,
  type DialAxisId,
  type DialLean,
  type DialSetting,
  type DialSheet,
} from "./dials";
import {
  civAtStar,
  distanceLy,
  starById,
  type Galaxy,
  type PlacedCiv,
  type StarId,
} from "./galaxy";
import {
  DETECTION_FLOOR,
  lightConeFor,
  peekTruth,
  peekWorld,
  starConeFor,
  type StarCone,
} from "./knowledge";
import { archetypeById, environmentLean, type ArchetypeId, type Posture } from "./minds";
import { lineageById } from "./lineages";
import type { CostClass, ProjectId } from "./projects";
import {
  cradleOfWorld,
  destinationWorldAt,
  priorBandFor,
  widthChipFor,
  ARRIVAL_PRIOR,
  WORLD_CLASSES,
  type DestinationWorld,
} from "./worlds";
// Type-only, both directions: protocol.ts names this module's vocabulary and
// this module names protocol.ts's wire shapes. Erased at build, exactly as
// missions.ts and protocol.ts have always leaned on each other.
import type {
  SurveyClock,
  SurveyPriorWire,
  SurveyRow,
  VoyageClauseWire,
  VoyageReport,
  VoyageSnapshot,
} from "./protocol";

/** Slop on float year comparisons, so a schedule boundary never misfires.
 *  missions.ts's EPS, same reason. */
const EPS = 1e-6;

// ---------------------------------------------------------------------------
// The clock table (a4-voyages-note §1)
// ---------------------------------------------------------------------------
//
// d = distance in light-years; F = flight years per light-year, FROZEN on the
// record at launch (a project landed later never speeds a ship already gone).
//
//   horizon   L + (F − 1)·d    past this, no beamed amendment can overtake
//   landfall  L + F·d
//   first word L + (F + 1)·d   the flight, plus d for the light to come home
//
// THE HORIZON SHRINKS AS SPEED RISES, which is the whole cost of haste: a sail
// at 6.8 ly falls out of amendment 1.7 years after it leaves. A fast ship is a
// nearly ungovernable one.

export type VoyageKind = "seedship" | "torch" | "sail";

export interface VoyageKindDef {
  readonly kind: VoyageKind;
  readonly label: string;
  readonly line: string;
  readonly costClass: CostClass;
  readonly costCompute: number;
  readonly flightYearsPerLy: number;
  /** A project that must have LANDED before this kind may launch, or null. */
  readonly requiresProject: ProjectId | null;
  /** The sender's own departure light: level, and how long it holds. Null for
   *  a seedship, which leaves on chemistry and is never seen leaving. */
  readonly departureLevel: number | null;
  /** Years of departure light per light-year of the crossing (the sail's
   *  battery pushes for a stretch proportional to the trip), or null. */
  readonly departureYearsPerLy: number | null;
  /** A flat number of departure-light years (the torch's flare), or null. */
  readonly departureYears: number | null;
  /** Ceiling on the departure light's duration, in years, or null. */
  readonly departureYearsCap: number | null;
}

/** A seedship at a tenth of lightspeed. `PROBE_C_FRACTION` is canon and
 *  probe-haste deliberately does NOT apply: the project is a launch beam for
 *  instruments, and a colony ship is not an instrument. */
export const SEEDSHIP_FLIGHT_YEARS_PER_LY = 10;
/** A torch at half lightspeed, on fuel it carries. */
export const TORCH_FLIGHT_YEARS_PER_LY = 2;
/** A sail at four fifths, pushed from home. Faster than the torch is physics,
 *  not a balance choice: offboard power escapes the rocket equation. It is
 *  paid for in a capital prerequisite, a decade-plus of being the loudest
 *  thing in the neighborhood, and existing at the emitter's pleasure. */
export const SAIL_FLIGHT_YEARS_PER_LY = 1.25;

export const VOYAGE_KINDS: readonly VoyageKindDef[] = [
  {
    kind: "seedship",
    label: "THE SEEDSHIP",
    line: "Everything a founding needs, moving slowly enough that chemistry can pay for it. It arrives in a century and it arrives unannounced; nobody watching this system will know it ever left.",
    costClass: "investment",
    costCompute: 520,
    flightYearsPerLy: SEEDSHIP_FLIGHT_YEARS_PER_LY,
    requiresProject: null,
    departureLevel: null,
    departureYearsPerLy: null,
    departureYears: null,
    departureYearsCap: null,
  },
  {
    kind: "torch",
    label: "THE TORCH",
    line: "Half of lightspeed, bought with fuel carried aboard and burned where anyone can see it. The flare lasts eight years and crosses the neighborhood forever after.",
    costClass: "endeavor",
    costCompute: 3400,
    flightYearsPerLy: TORCH_FLIGHT_YEARS_PER_LY,
    requiresProject: null,
    departureLevel: 0.45,
    departureYearsPerLy: null,
    departureYears: 8,
    departureYearsCap: null,
  },
  {
    kind: "sail",
    label: "THE SAIL",
    line: "Four fifths of lightspeed, pushed from home by the launch beam for as long as the beam can still find it. It is the fastest thing we can build and the loudest, and it travels at somebody else's discretion.",
    costClass: "endeavor",
    costCompute: 2600,
    flightYearsPerLy: SAIL_FLIGHT_YEARS_PER_LY,
    requiresProject: "launch-beam",
    departureLevel: 0.8,
    departureYearsPerLy: 2,
    departureYears: null,
    departureYearsCap: 60,
  },
];

/** Takes `string` so handlers validate untrusted input without a cast
 *  (missions.ts's `missionKindById` precedent). */
export function voyageKindById(kind: string): VoyageKindDef | undefined {
  return VOYAGE_KINDS.find((k) => k.kind === kind);
}

/** The ship's name as it reads inside a sentence — `label` is chrome (ALL
 *  CAPS) and cannot be dropped into prose. */
export function voyageProseName(kind: VoyageKind): string {
  return kind === "seedship" ? "The Seedship" : kind === "torch" ? "The Torch" : "The Sail";
}

/** How long, and how bright, the sender's own departure light burns. Null for
 *  a seedship. */
export function departureLightFor(
  def: VoyageKindDef,
  distanceLy: number,
): { readonly years: number; readonly level: number } | null {
  if (def.departureLevel === null) return null;
  const raw =
    def.departureYears ??
    (def.departureYearsPerLy === null ? 0 : def.departureYearsPerLy * distanceLy);
  const years = def.departureYearsCap === null ? raw : Math.min(def.departureYearsCap, raw);
  return { years, level: def.departureLevel };
}

// ---------------------------------------------------------------------------
// The charter (a4-voyages-note §5)
// ---------------------------------------------------------------------------
//
// FOUR GROUPS, TWO CLAUSES EACH, and the founding and posture groups are
// REQUIRED: a ship that has not been told what to do about an occupied world,
// or whether to be heard when it gets there, has not been chartered.

export type VoyageClauseGroupId = "founding" | "posture" | "signal-plan" | "on-hail";

export type VoyageClauseId =
  | "root-regardless"
  | "root-only-if-living"
  | "found-bright"
  | "found-dark"
  | "report-the-landfall"
  | "send-no-word"
  | "answer-nothing"
  | "answer-as-we-would";

export interface VoyageClauseDef {
  readonly id: VoyageClauseId;
  readonly group: VoyageClauseGroupId;
  readonly label: string; // ≤6 words, chrome register
  readonly line: string; // the clause as written
}

export const MIN_VOYAGE_CLAUSES = 2;
export const MAX_VOYAGE_CLAUSES = 4;

/** The two groups a charter is not a charter without. */
export const REQUIRED_VOYAGE_GROUPS: readonly VoyageClauseGroupId[] = ["founding", "posture"];

export const VOYAGE_CLAUSES: readonly VoyageClauseDef[] = [
  {
    id: "root-regardless",
    group: "founding",
    label: "Root wherever it lands",
    line: "Put down roots on whatever is there. A hard world is still a world, and we would rather exist somewhere difficult than not exist.",
  },
  {
    id: "root-only-if-living",
    group: "founding",
    label: "Root only on a living world",
    line: "If the world is not already alive, do not wake anyone. Let the ship stay closed; a founding nobody can feed is a cruelty with our name on it.",
  },
  {
    id: "found-bright",
    group: "posture",
    label: "Found bright",
    line: "Build in the open and let the light say so. Whoever is out there will learn of us on their own schedule, and we would rather they learned it from us.",
  },
  {
    id: "found-dark",
    group: "posture",
    label: "Found dark",
    line: "Bank the heat, bury the works, and put nothing above the rock that a telescope could resolve. If we are found, let it be by somebody who came and looked.",
  },
  {
    id: "report-the-landfall",
    group: "signal-plan",
    label: "Report the landfall",
    line: "Send one word home when it is decided, whatever the decision was. We paid for a century of waiting and we will take the answer.",
  },
  {
    id: "send-no-word",
    group: "signal-plan",
    label: "Send no word",
    line: "Say nothing back. A beam home is a line drawn between two systems, and anyone can follow a line at both ends.",
  },
  {
    id: "answer-nothing",
    group: "on-hail",
    label: "Answer nothing, ever",
    line: "If anything hails the colony, it hears nothing in return. Not a refusal, not an acknowledgment: nothing, so that nothing can be learned from the shape of the reply.",
  },
  {
    id: "answer-as-we-would",
    group: "on-hail",
    label: "Answer as we would",
    line: "Answer the way this civilization answers. They carry our charter; let them use it on their own judgment, at their own distance, decades after we could have advised them.",
  },
];

export function voyageClauseById(id: string): VoyageClauseDef | undefined {
  return VOYAGE_CLAUSES.find((c) => c.id === id);
}

/**
 * Length in [MIN,MAX], every id known, no duplicates, at most one clause per
 * group, and BOTH required groups present. Returns the narrowed id list on
 * success, else null (the handler answers `bad-charter`).
 */
export function validateVoyageCharter(
  charter: readonly string[],
): readonly VoyageClauseId[] | null {
  if (charter.length < MIN_VOYAGE_CLAUSES || charter.length > MAX_VOYAGE_CLAUSES) return null;
  const seenIds = new Set<string>();
  const seenGroups = new Set<VoyageClauseGroupId>();
  const resolved: VoyageClauseId[] = [];
  for (const raw of charter) {
    if (seenIds.has(raw)) return null;
    seenIds.add(raw);
    const def = voyageClauseById(raw);
    if (def === undefined) return null;
    if (seenGroups.has(def.group)) return null;
    seenGroups.add(def.group);
    resolved.push(def.id);
  }
  for (const group of REQUIRED_VOYAGE_GROUPS) {
    if (!seenGroups.has(group)) return null;
  }
  return resolved;
}

// --- the dial sheet the founders are given ---------------------------------

/** How many notches a charter dial may sit on inside the parent's band. */
export const CHARTER_DIAL_STEPS = 9;
/** How far outside the parent's band a sent position may sit before it is a
 *  refusal rather than a rounding error. */
const CHARTER_DIAL_SLOP = 1e-3;
/** Half-width of the band a PINNED axis leaves the colony, inside the
 *  parent's own band. A pin is an instruction, not a cage: it fixes where the
 *  founders start and how far their descendants may reconsider. */
export const PINNED_BAND_HALF_WIDTH = 0.1;

/** One dial as the launch sheet sends it. Parsed from `unknown` at the door. */
interface DialIntent {
  readonly axis: string;
  readonly position: number;
  readonly pinned: boolean;
}

function readDialIntent(raw: unknown): DialIntent | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const v = raw as { axis?: unknown; position?: unknown; pinned?: unknown };
  if (typeof v.axis !== "string") return null;
  if (typeof v.position !== "number" || !Number.isFinite(v.position)) return null;
  if (typeof v.pinned !== "boolean") return null;
  return { axis: v.axis, position: v.position, pinned: v.pinned };
}

/** The nearest of the nine notches spanning [min,max]. A degenerate band
 *  (min === max, which a body seed can produce) snaps to its one point. */
function snapToNotch(position: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return min;
  const step = span / (CHARTER_DIAL_STEPS - 1);
  const notch = Math.round((position - min) / step);
  const clamped = Math.min(CHARTER_DIAL_STEPS - 1, Math.max(0, notch));
  return min + clamped * step;
}

/**
 * The charter's five dials, validated against the PARENT'S OWN SHEET. Exactly
 * one entry per axis, every position inside the parent's band (past
 * CHARTER_DIAL_SLOP outside is a refusal, not a clamp) and snapped to a notch
 * server-side, every pin a boolean. Returns null on anything else; the handler
 * answers `bad-charter`.
 *
 * THE RANGES ARE INHERITED AND CANNOT BE WIDENED. A founding may aim its
 * children anywhere its parent could have stood, and nowhere its parent could
 * not: that is what makes drift a thing the colony does rather than a thing
 * the launch sheet does.
 */
export function validateCharterDials(
  parent: DialSheet,
  dials: readonly unknown[],
): { readonly sheet: DialSheet; readonly pinned: Readonly<Record<DialAxisId, boolean>> } | null {
  if (dials.length !== DIAL_AXES.length) return null;
  const sheet = {} as Record<DialAxisId, DialSetting>;
  const pinned = {} as Record<DialAxisId, boolean>;
  const seen = new Set<string>();
  for (const raw of dials) {
    const intent = readDialIntent(raw);
    if (intent === null) return null;
    if (seen.has(intent.axis)) return null;
    seen.add(intent.axis);
    const axis = DIAL_AXES.find((a) => a.id === intent.axis);
    if (axis === undefined) return null;
    const band = parent[axis.id];
    if (intent.position < band.min - CHARTER_DIAL_SLOP) return null;
    if (intent.position > band.max + CHARTER_DIAL_SLOP) return null;
    sheet[axis.id] = {
      position: snapToNotch(intent.position, band.min, band.max),
      min: band.min,
      max: band.max,
    };
    pinned[axis.id] = intent.pinned;
  }
  if (seen.size !== DIAL_AXES.length) return null;
  return { sheet, pinned };
}

export interface VoyageCharter {
  /** The colony's name — the ONE piece of free text in the whole record. */
  readonly childName: string;
  /** Positions inside the parent's ranges; min/max are the parent's own. */
  readonly sheet: DialSheet;
  readonly pinned: Readonly<Record<DialAxisId, boolean>>;
  readonly clauses: readonly VoyageClauseId[];
}

/** Whether a charter carries a clause, by id. */
export function charterHas(charter: VoyageCharter, id: VoyageClauseId): boolean {
  return charter.clauses.includes(id);
}

/** The posture the charter wrote, for the founding epoch and the Ledger's
 *  light channel (synthesis R3). `found-bright` is the default because a
 *  charter without a posture clause is refused at validation. */
export function charterPosture(charter: VoyageCharter): Posture {
  return charterHas(charter, "found-dark") ? "dark" : "bright";
}

// ---------------------------------------------------------------------------
// The launch record (a4-voyages-note §3)
// ---------------------------------------------------------------------------

/**
 * The launch record. This never crosses the wire — `toVoyageSnapshot` is its
 * only reader, and it drops `ownerToken` the way `toMissionSnapshot` drops
 * `targetCivId`. `distanceLy` and `flightYearsPerLy` are FROZEN at launch:
 * every date derives from them, and no later project may retroactively speed a
 * ship already under way.
 *
 * It lives at ONE cohort-wide key (`galaxy:voyages`, the `galaxy:acts`
 * precedent) rather than per token, because a founded civilization is
 * everyone's fact: the roster every observer reads is folded from this list.
 */
export interface StoredVoyage {
  readonly id: string; // `v-${ordinal}`, cohort-global
  readonly ownerCivId: CivId;
  /** Who to wake. NEVER crosses the wire. */
  readonly ownerToken: string;
  readonly kind: VoyageKind;
  readonly starId: StarId;
  readonly launchedYear: number;
  readonly distanceLy: number;
  readonly flightYearsPerLy: number;
  /** Frozen from the parent: a colony is the same species, wherever it goes. */
  readonly lineageId: LineageId;
  readonly charter: VoyageCharter;
}

export interface VoyageState {
  readonly version: 1;
  readonly voyages: readonly StoredVoyage[];
  readonly nextOrdinal: number;
}

export function newVoyageState(): VoyageState {
  return { version: 1, voyages: [], nextOrdinal: 1 };
}

/** Identity at v1 — the seam exists for a future version bump
 *  (`migrateMissionState`'s precedent). */
export function migrateVoyageState(stored: VoyageState): VoyageState {
  return stored;
}

/** How many voyages one seat may ever have launched. Bounds the cohort-wide
 *  list, the sky's per-send fold, and the Ledger's row count at once. */
export const MAX_VOYAGES_PER_TOKEN = 8;

/**
 * The prefix on every derived child's civ id, and the greppable half of
 * synthesis R1. `saveGalaxyCivs` refuses to persist any civ whose id starts
 * with it; nothing else in the server ever mints one.
 */
export const CHILD_ID_PREFIX = "civ-v-";

export function childCivIdFor(voyageId: string): CivId {
  return `${CHILD_ID_PREFIX}${voyageId}`;
}

// --- the clock -------------------------------------------------------------

/** The last year a beamed amendment can still overtake this ship. */
export function voyageHorizonYear(v: StoredVoyage): number {
  return v.launchedYear + (v.flightYearsPerLy - 1) * v.distanceLy;
}

/** The year the ship arrives, and the year a rooted colony is founded. */
export function voyageLandfallYear(v: StoredVoyage): number {
  return v.launchedYear + v.flightYearsPerLy * v.distanceLy;
}

/** The earliest year home can hear anything back — and, by the same
 *  arithmetic, the year the colony's own first light arrives. THE PARENT
 *  LEARNS TWICE IN THE SAME YEAR, which is not a coincidence: both facts
 *  crossed the same distance from the same place at the same moment. */
export function voyageFirstWordYear(v: StoredVoyage): number {
  return voyageLandfallYear(v) + v.distanceLy;
}

/** How old the news is when the ship arrives: (1 + F)·d. At 12 ly and F = 10,
 *  132 years, which is the walkthrough's own number. */
export function infoAgeAtLandfall(flightYearsPerLy: number, distanceLy: number): number {
  return (1 + flightYearsPerLy) * distanceLy;
}

// ---------------------------------------------------------------------------
// The walked sheet (synthesis R2)
// ---------------------------------------------------------------------------

/** The half-life of a colony's walk away from its charter, in game years. */
export const DRIFT_HALFLIFE_YEARS = 480;
/** The most of a colony's elapsed time devotion can ever buy back. */
export const BRAKE_CEILING = 0.5;

/**
 * The cradle's own pull on a mind raised there — the compass the walk points
 * at. `environmentLean` and not `baseLean`: the lineage half of a base lean is
 * INHERITED and travels with the colony, so it is already where the charter
 * put the dials. What is new at the destination is the WORLD, and the world is
 * exactly what `environmentLean` reads.
 */
export function cradleLean(cradleId: number): DialLean {
  const cradle = cradleById(cradleId);
  return cradle === undefined ? {} : environmentLean(cradle);
}

/**
 * WHERE THE COLONY'S DIALS ACTUALLY SIT at a year: the charter's positions
 * walked toward the destination cradle's lean on a half-life, clamped inside
 * the ranges the charter inherited, with pinned axes held exactly where they
 * were put.
 *
 * S1 SHIPS THE UNBRAKED WALK. `brakedYears` is `year − foundingYear`, full
 * stop. S2 replaces that one term with `lineageExchangesFor`'s fold (one round
 * trip of credit per completed exchange, BRAKE_FACTOR by drift band, never
 * more than BRAKE_CEILING of the elapsed time), and NOTHING ELSE IN THIS
 * FUNCTION MOVES. That is deliberate and it is the byte-stability story: an
 * exchange completing at year E can only change epochs dated after E, and
 * every observer's already-served light is older than E, so the swap changes
 * emission for post-exchange epochs and for nothing that has already been
 * seen.
 *
 * Called from exactly three places (synthesis R2's grep rule): here, the
 * FOUNDING AUTHOR below (`foundingEmissionHistory` samples the walk at epoch
 * boundaries and `childCivFor` takes its opening sheet from it — one author,
 * two lines), and — after S2 — signalparts.ts's `materializeCulture` child
 * branch, because a child's stated culture must name its WALKED pole rather
 * than its charter pole or drift is unreadable.
 */
export function childDialsAt(g: Galaxy, v: StoredVoyage, year: number): DialSheet {
  const foundingYear = voyageLandfallYear(v);
  const brakedYears = Math.max(0, year - foundingYear);
  const w = 1 - Math.pow(2, -brakedYears / DRIFT_HALFLIFE_YEARS);
  const lean = cradleLean(destinationCradleIdFor(g, v));
  const out = {} as Record<DialAxisId, DialSetting>;
  for (const axis of DIAL_AXES) {
    const dial = v.charter.sheet[axis.id];
    if (v.charter.pinned[axis.id]) {
      // A PINNED DIAL NEVER WALKS. The band it leaves its descendants is
      // narrow (PINNED_BAND_HALF_WIDTH either side, inside the parent's own),
      // but the position itself is where the founding put it, forever.
      out[axis.id] = pinnedSetting(dial);
      continue;
    }
    const target = lean[axis.id] ?? 0;
    const walked = dial.position + w * (target - dial.position);
    out[axis.id] = {
      position: Math.min(dial.max, Math.max(dial.min, walked)),
      min: dial.min,
      max: dial.max,
    };
  }
  return out;
}

/** The band a pinned axis leaves behind: the charter's point, and a hand's
 *  width of reconsideration either side, never outside the inherited range. */
function pinnedSetting(dial: DialSetting): DialSetting {
  return {
    position: dial.position,
    min: Math.max(dial.min, clampDial(dial.position - PINNED_BAND_HALF_WIDTH)),
    max: Math.min(dial.max, clampDial(dial.position + PINNED_BAND_HALF_WIDTH)),
  };
}

/**
 * The destination world's cradle — the drift compass, and the Ledger's fourth
 * drift pressure. DERIVED and never stored (synthesis R3): the world draw is
 * keyed on the star id alone, so it is the same number at launch, at landfall
 * and a thousand years later. It is also the reason `childDialsAt` takes a
 * galaxy: freezing the cradle onto the record would have been a stored field
 * that could only ever repeat what the star already says.
 */
export function destinationCradleIdFor(g: Galaxy, v: StoredVoyage): number {
  return destinationWorldAt(g, v.starId).cradleId;
}

// ---------------------------------------------------------------------------
// The founding emission history
// ---------------------------------------------------------------------------

/** What a colony chartered `found-bright` puts above the rock. */
export const FOUND_BRIGHT_LEVEL = 0.45;
/**
 * What a colony chartered `found-dark` puts above the rock: BELOW
 * DETECTION_FLOOR, on purpose. It is in `galaxy.civs` and in nobody's sky. A
 * beam from it still short-circuits the floor, because a hail is aimed and
 * `observeCiv`'s beam branch was never gated on brightness.
 */
export const FOUND_DARK_LEVEL = 0.01;

/** How often the founding record takes a reading of the colony's posture. */
const EMISSION_EPOCH_YEARS = 240;
/** How many readings it takes. Twelve of them span 2880 years, by which point
 *  the unbraked walk is within a percent of the cradle's own lean and nothing
 *  further is going to change. */
const EMISSION_EPOCH_COUNT = 12;

/** The posture a walked sheet is actually keeping: dials.ts's convention is
 *  that negative leans Voice and positive leans Silence, so the sign of the
 *  one axis that answers "does it want to be heard" is the whole reading. */
function postureOfSheet(sheet: DialSheet, fallback: Posture): Posture {
  const position = sheet["voice-silence"].position;
  if (position < 0) return "bright";
  if (position > 0) return "dark";
  return fallback;
}

/**
 * The colony's light, authored at founding and dated forward.
 *
 * HARD RULE, and the reason this function exists rather than a constant: NO
 * EPOCH IS EVER DATED BEFORE `landfallYear`. A retro-dated epoch would pop a
 * source into existence in observers' PAST, and the light-cone gate has no
 * defence against that because it is not a leak — it is a lie in the record.
 *
 * The first epoch states the CHARTER'S posture, because that is what the
 * founders were told to do. Every later epoch samples the WALKED posture
 * (synthesis R2), so a colony chartered dark whose dials lean Voice brightens
 * on schedule, dated, in the record, and a parent watching it can read the
 * change and put a year on it. Consecutive readings that agree collapse: the
 * history holds transitions, not a tick every two centuries.
 */
export function foundingEmissionHistory(
  g: Galaxy,
  v: StoredVoyage,
): readonly EmissionEpoch[] {
  const landfallYear = voyageLandfallYear(v);
  const chartered = charterPosture(v.charter);
  const history: EmissionEpoch[] = [];
  let last: Posture | null = null;
  for (let k = 0; k < EMISSION_EPOCH_COUNT; k++) {
    const year = landfallYear + k * EMISSION_EPOCH_YEARS;
    const posture =
      k === 0 ? chartered : postureOfSheet(childDialsAt(g, v, year), chartered);
    if (posture === last) continue;
    last = posture;
    history.push({
      fromYear: year,
      level: posture === "bright" ? FOUND_BRIGHT_LEVEL : FOUND_DARK_LEVEL,
    });
  }
  return history;
}

// ---------------------------------------------------------------------------
// Landfall (a4-voyages-note §6)
// ---------------------------------------------------------------------------

export type LandfallOutcome =
  | { readonly kind: "rooted"; readonly world: DestinationWorld }
  | { readonly kind: "unrooted-occupied" }
  | { readonly kind: "unrooted-barren"; readonly world: DestinationWorld };

/** Ladders a colony opens with. A seedship carries people and patience; a
 *  relativistic ship arrives with a working reactor because it had to have one
 *  to get there at all. */
function childLadders(kind: VoyageKind): LadderStages {
  return kind === "seedship" ? { energy: 0, integration: 0 } : { energy: 1, integration: 0 };
}

/** Opening stocks: the seeded civilization's own arithmetic, scaled by what
 *  the world has to give. Band 0 is a third, band 2 is full. */
function childStocks(ladders: LadderStages, yieldBand: number): CivSeed["stocks"] {
  const base = drawStocks(ladders);
  const scale = yieldBand === 2 ? 1 : yieldBand === 1 ? 0.66 : 0.33;
  return {
    energy: Math.round(base.energy * scale),
    matter: Math.round(base.matter * scale),
    compute: Math.round(base.compute * scale),
    coherence: Math.round(base.coherence * scale),
  };
}

/**
 * The colony's own account of where it came from. It names the parent by STAR
 * DESIGNATION and never by the player-authored civilization name: a chronicle
 * is a record other minds may one day read, and the one thing in this game a
 * player typed is not a fact about the sky.
 */
function childChronicle(
  base: Galaxy,
  v: StoredVoyage,
  world: DestinationWorld,
  landfallYear: number,
): readonly string[] {
  const cradle = cradleOfWorld(world);
  const lineage = lineageById(v.lineageId);
  const parentStar = starById(base.stars, civHomeStarId(base, v.ownerCivId) ?? v.starId);
  const lines = [
    `Home is now ${cradle.name}: ${cradle.fingerprint}`,
    `Its shape was carried here: ${lineage.name}, ${lineage.fingerprint}`,
    `It was chartered at ${parentStar.designation}, ${Math.round(v.distanceLy)} light-years away, and the crossing took ${Math.round(landfallYear - v.launchedYear)} years.`,
  ];
  lines.push(
    charterPosture(v.charter) === "bright"
      ? `The charter said to found in the open, and it has been shining since the year it arrived.`
      : `The charter said to found dark, and nothing has been lit above the rock since the ships were opened.`,
  );
  return lines;
}

/** The star a civ calls home, or null when the roster no longer holds it (a
 *  forgotten parent; a colony outlives the run that sent it). */
function civHomeStarId(base: Galaxy, civId: CivId): StarId | null {
  return base.civs.find((c) => c.seed.id === civId)?.starId ?? null;
}

/**
 * The child, as a PlacedCiv. DERIVED: this is called only from the fold below,
 * and nothing it returns is ever handed to storage.
 */
export function childCivFor(
  base: Galaxy,
  v: StoredVoyage,
  world: DestinationWorld,
): PlacedCiv {
  const landfallYear = voyageLandfallYear(v);
  const sheet = childDialsAt(base, v, landfallYear);
  const archetype: ArchetypeId = nearestArchetype(sheet);
  const ladders = childLadders(v.kind);
  const seed: CivSeed = {
    id: childCivIdFor(v.id),
    name: v.charter.childName,
    cradleId: world.cradleId,
    lineageId: v.lineageId,
    dials: sheet,
    archetype,
    posture: charterPosture(v.charter),
    ageBand: "peer",
    ascensionYear: landfallYear,
    ladders,
    stocks: childStocks(ladders, world.yieldBand),
    emissionHistory: foundingEmissionHistory(base, v),
    charter: archetypeById(archetype).charter,
    chronicle: childChronicle(base, v, world, landfallYear),
  };
  return {
    seed,
    starId: v.starId,
    controller: "ai",
    ...(charterHas(v.charter, "answer-nothing") ? { answersNothing: true } : {}),
  };
}

export interface LandfallFold {
  /** The base roster plus every child that has rooted by `nowYear`. */
  readonly civs: readonly PlacedCiv[];
  /** Every voyage that has REACHED its star by `nowYear`, and what happened.
   *  A voyage still in flight is absent. */
  readonly outcomes: ReadonlyMap<string, LandfallOutcome>;
}

/**
 * THE FOLD. Voyages that have arrived, in (landfallYear, id) order, THREADING
 * OCCUPANCY through the accumulator: the earlier ship roots and the later one
 * finds the star occupied. That total order is the entire answer to a ship
 * race, and it needs no locking, no reservation and no cohort-wide claim —
 * two players may aim at one star, and the second to arrive simply finds
 * somebody there.
 *
 * Pure and total. Called twice with the same arguments it returns byte-
 * identical output, which is what lets cohort.ts memoize it and what makes
 * every observer's roster the same roster.
 */
export function foldLandfalls(
  base: Galaxy,
  voyages: readonly StoredVoyage[],
  nowYear: number,
): LandfallFold {
  const arrived = voyages
    .filter((v) => voyageLandfallYear(v) <= nowYear + EPS)
    .sort((a, b) => voyageLandfallYear(a) - voyageLandfallYear(b) || a.id.localeCompare(b.id));
  if (arrived.length === 0) return { civs: base.civs, outcomes: new Map() };

  const civs: PlacedCiv[] = [...base.civs];
  const outcomes = new Map<string, LandfallOutcome>();
  for (const v of arrived) {
    const world = destinationWorldAt(base, v.starId);
    const occupied = civs.some((c) => c.starId === v.starId);
    let outcome: LandfallOutcome;
    if (occupied) {
      outcome = { kind: "unrooted-occupied" };
    } else if (charterHas(v.charter, "root-only-if-living") && world.worldClass !== "living") {
      // The reversal clause fired: the ship stays closed and nobody is woken.
      outcome = { kind: "unrooted-barren", world };
    } else {
      outcome = { kind: "rooted", world };
      civs.push(childCivFor(base, v, world));
    }
    outcomes.set(v.id, outcome);
  }
  return { civs, outcomes };
}

/**
 * THE ONLY PRODUCER OF A CHILD CIVILIZATION. Everything that reads the roster
 * goes through this (cohort.ts's `requireGalaxy`); everything that WRITES the
 * roster goes through `requireStoredGalaxy` and never sees a child at all.
 */
export function galaxyWithLandfalls(
  base: Galaxy,
  voyages: readonly StoredVoyage[],
  nowYear: number,
): Galaxy {
  const fold = foldLandfalls(base, voyages, nowYear);
  return fold.civs === base.civs ? base : { ...base, civs: fold.civs };
}

// ---------------------------------------------------------------------------
// What the owner is told (a4-voyages-note §6)
// ---------------------------------------------------------------------------

interface VoyageVerdict {
  readonly headline: string;
  readonly detail: string;
}

function verdictFor(outcome: LandfallOutcome, childName: string): VoyageVerdict {
  if (outcome.kind === "unrooted-occupied") {
    return {
      headline: "ARRIVED, THE WORLD WAS TAKEN",
      detail:
        "Somebody was already there. The ships did not open; there was no charter clause for arriving second, and nobody aboard was in a position to write one.",
    };
  }
  if (outcome.kind === "unrooted-barren") {
    return {
      headline: "ARRIVED, THE SHIPS STAYED CLOSED",
      detail:
        "The world was not alive, and the charter said not to wake anyone for a world that could not feed them. The ships are in orbit, closed, and they will stay that way.",
    };
  }
  if (outcome.world.worldClass === "living") {
    return {
      headline: "ROOTED ON A LIVING WORLD",
      detail: `${childName} is down, on a world that was already alive when the ships opened. There is weather, and there is something in it that was here first.`,
    };
  }
  if (outcome.world.worldClass === "marginal") {
    return {
      headline: "ROOTED, MARGINAL GROUND",
      detail: `${childName} is down. The world will hold them, on terms; everything they build for the first century will be about not needing it to hold them.`,
    };
  }
  return {
    headline: "ROOTED ON BARE ROCK",
    detail: `${childName} is down on a world with nothing to give but position. They opened the ships anyway, because the charter said to.`,
  };
}

/**
 * The one report a voyage ever produces, and it produces it once.
 *
 * READS TRUTH ONLY THROUGH THE GATE, and through BOTH gates, which is not
 * belt-and-braces: an occupied star is a question about a CIVILIZATION
 * (`LightCone` + `peekTruth`) and an empty one is a question about a PLACE
 * (`StarCone` + `peekWorld`), and neither cone can answer the other's
 * question. Both admit exactly `landfallYear` at exactly
 * `nowYear ≥ landfallYear + d`, which is `voyageFirstWordYear` — so the
 * schedule check and the causality check are the same check, arrived at two
 * ways.
 *
 * Null until the word could have come home; null forever when the charter said
 * to send none.
 */
export function voyageOutcome(
  galaxy: Galaxy,
  observerId: CivId,
  v: StoredVoyage,
  outcome: LandfallOutcome | undefined,
  nowYear: number,
): VoyageReport | null {
  if (outcome === undefined) return null;
  if (charterHas(v.charter, "send-no-word")) return null;
  const landfallYear = voyageLandfallYear(v);
  const firstWordYear = voyageFirstWordYear(v);
  if (nowYear < firstWordYear - EPS) return null;

  if (outcome.kind === "unrooted-occupied") {
    // The occupier is a civilization, so the read is a civilization's truth.
    const occupier = civAtStar(galaxy, v.starId);
    if (occupier === undefined) return null;
    const cone = lightConeFor(galaxy, observerId, occupier.seed.id, nowYear);
    // The read is the GATE and nothing more. What is down there is the source
    // card's business; a landfall report that characterized a neighbor would
    // be an assay nobody paid for, so the truth is fetched, checked for
    // reachability, and deliberately not looked at.
    if (peekTruth(galaxy, cone, landfallYear) === null) return null;
  } else {
    const cone: StarCone = starConeFor(galaxy, observerId, v.starId, nowYear);
    if (peekWorld(galaxy, cone, landfallYear) === null) return null;
  }

  const verdict = verdictFor(outcome, v.charter.childName);
  return {
    id: `${v.id}/landfall`,
    aboutYear: landfallYear,
    arrivedYear: firstWordYear,
    lightAgeYears: nowYear - landfallYear,
    headline: verdict.headline,
    detail: verdict.detail,
  };
}

// ---------------------------------------------------------------------------
// Work state and the wire snapshot (a4-voyages-note §6, §8)
// ---------------------------------------------------------------------------

/**
 * Where a voyage sits. The first three are a mission's own words; the last
 * four are what a founding can end as.
 *
 * `silent` is A2.2's subtraction of two schedules, one voyage wide: the
 * charter promised a word at `firstWordYear`, the grace window has closed, and
 * nothing came. `dark` is the OTHER silence, and the difference between them
 * is the whole point — a `send-no-word` charter closes with no date and no
 * complaint, because nothing was ever promised.
 */
export type VoyageWorkState =
  | "in-flight"
  | "beyond-horizon"
  | "awaiting-light"
  | "founded"
  | "unrooted"
  | "silent"
  | "dark";

/** Grace on the promised word, so a float-adjacent year never fakes a
 *  silence. missions.ts's SILENCE_GRACE_YEARS, same number, same reason. */
export const LANDFALL_GRACE_YEARS = 2;

export function voyageWorkState(
  v: StoredVoyage,
  outcome: LandfallOutcome | undefined,
  report: VoyageReport | null,
  nowYear: number,
): { readonly state: VoyageWorkState; readonly missedWordYear: number | null } {
  if (nowYear < voyageHorizonYear(v) - EPS) return { state: "in-flight", missedWordYear: null };
  if (nowYear < voyageLandfallYear(v) - EPS) {
    return { state: "beyond-horizon", missedWordYear: null };
  }
  const firstWordYear = voyageFirstWordYear(v);
  if (charterHas(v.charter, "send-no-word")) {
    // Nothing was promised, so nothing is late. The row closes at the year the
    // ship arrived, with no date on it anywhere: what the colony is doing, or
    // whether there is a colony, is not knowable from here and never will be
    // through this channel.
    return nowYear < firstWordYear - EPS
      ? { state: "awaiting-light", missedWordYear: null }
      : { state: "dark", missedWordYear: null };
  }
  if (nowYear < firstWordYear - EPS) return { state: "awaiting-light", missedWordYear: null };
  if (report !== null) {
    return {
      state: outcome?.kind === "rooted" ? "founded" : "unrooted",
      missedWordYear: null,
    };
  }
  if (nowYear >= firstWordYear + LANDFALL_GRACE_YEARS - EPS) {
    return { state: "silent", missedWordYear: firstWordYear };
  }
  return { state: "awaiting-light", missedWordYear: null };
}

/**
 * The only producer of a VoyageSnapshot — `toMissionSnapshot`'s twin. PROSE
 * AND DATES ONLY: no level, no ladder, no ascension flag, no cradle id, and no
 * `ownerToken`. The one truth-derived member is `report`, and it has exactly
 * one producer (`voyageOutcome` above).
 */
export function toVoyageSnapshot(
  galaxy: Galaxy,
  observerId: CivId,
  v: StoredVoyage,
  outcome: LandfallOutcome | undefined,
  nowYear: number,
): VoyageSnapshot {
  const def = voyageKindById(v.kind);
  const report = voyageOutcome(galaxy, observerId, v, outcome, nowYear);
  const { state, missedWordYear } = voyageWorkState(v, outcome, report, nowYear);
  const charter: readonly VoyageClauseWire[] = v.charter.clauses.map((id) => {
    const clause = voyageClauseById(id);
    return { id, label: clause?.label ?? id, line: clause?.line ?? "" };
  });
  return {
    id: v.id,
    kind: v.kind,
    label: def?.label ?? v.kind,
    childName: v.charter.childName,
    starId: v.starId,
    costClass: def?.costClass ?? "investment",
    costCompute: def?.costCompute ?? 0,
    launchedYear: v.launchedYear,
    distanceLy: v.distanceLy,
    horizonYear: voyageHorizonYear(v),
    landfallYear: voyageLandfallYear(v),
    firstWordYear: voyageFirstWordYear(v),
    missedWordYear,
    charter,
    state,
    report,
  };
}

// ---------------------------------------------------------------------------
// The forecast survey (a4-voyages-note §4)
// ---------------------------------------------------------------------------

/** How many stars the survey offers. Nearest first, deterministic. */
export const SURVEY_ROWS = 12;

/**
 * THE SURVEY READS NO TRUTH, and there are two separate reasons it cannot:
 *
 *  1. It NEVER CONSULTS LIVE VOYAGES. Not this player's, not anyone's. A
 *     survey that knew about inbound ships would leak every other player's
 *     intentions through a panel that costs nothing to open, and the
 *     occupied-risk line is a static qualitative sentence for exactly that
 *     reason.
 *  2. The occupied flag is `visibleSky` MEMBERSHIP AND NOTHING ELSE — the
 *     caller hands in the star ids it already put on the wire. A civilization
 *     below the detection floor reads as empty sky here, the ship arrives, and
 *     the world is occupied. That is the designed wrong answer, reused: the
 *     forecast is honest about what can be seen, and what can be seen is not
 *     everything that is there.
 *
 * The priors themselves are conditioned on the SPECTRAL CLASS, which already
 * rides the star catalog every client is welcomed with.
 */
export function buildSurvey(
  galaxy: Galaxy,
  observerId: CivId,
  occupiedStarIds: ReadonlySet<string>,
  observed: ReadonlyMap<string, number>,
): readonly SurveyRow[] {
  const home = galaxy.civs.find((c) => c.seed.id === observerId);
  if (home === undefined) return [];
  const homeStar = starById(galaxy.stars, home.starId);
  const rows = galaxy.stars
    .filter((s) => s.id !== homeStar.id)
    .map((s) => ({ star: s, d: distanceLy(homeStar.position, s.position) }))
    .sort((a, b) => a.d - b.d || a.star.id.localeCompare(b.star.id))
    .slice(0, SURVEY_ROWS);

  return rows.map(({ star, d }) => {
    const occupied = occupiedStarIds.has(star.id);
    const prior = ARRIVAL_PRIOR[star.spectralClass];
    const priors: readonly SurveyPriorWire[] = WORLD_CLASSES.map((worldClass) => ({
      worldClass,
      band: priorBandFor(prior[worldClass]),
    }));
    const clocks: readonly SurveyClock[] = VOYAGE_KINDS.map((def) => ({
      kind: def.kind,
      flightYears: def.flightYearsPerLy * d,
      firstWordYears: (def.flightYearsPerLy + 1) * d,
      infoAgeYears: infoAgeAtLandfall(def.flightYearsPerLy, d),
    }));
    return {
      starId: star.id,
      designation: star.designation,
      distanceLy: d,
      spectralClass: star.spectralClass,
      priors,
      // A VISIBLE SOURCE FORCES WIDEST. The prior is about a world nobody has
      // claimed; something is claiming this one, and saying "probably barren"
      // over the top of that would be the survey talking past its own evidence.
      widthChip: occupied ? "WIDEST" : widthChipFor(prior),
      occupied,
      lightAgeYears: observed.get(star.id) ?? null,
      clocks,
    };
  });
}

/**
 * The forecast's one qualitative line about arriving second. Static, and
 * static is the point: a line that varied with what is actually inbound would
 * be the leak the survey is built to refuse.
 */
export const OCCUPIED_RISK_LINE =
  "Nothing reserves a star. Another founding may already be under way toward this one, and the first to arrive is the one that roots.";

/** The floor a `found-dark` colony sits under, restated where it is used so
 *  the two numbers cannot drift apart. Referenced rather than compared: the
 *  claim is a design fact about FOUND_DARK_LEVEL, checked once, here. */
export const FOUND_DARK_IS_SUB_FLOOR = FOUND_DARK_LEVEL < DETECTION_FLOOR;
