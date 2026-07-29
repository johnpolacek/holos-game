// The knowledge layer — the architectural heart of Act 3.
//
// The server holds truth; every observer is served only LIGHT-DELAYED
// views: another civilization's state as of `now − distance` (in game
// years; distance in light-years — the same number, by the clock
// convention). The client must never be able to receive another
// civilization's present. Every Act 3 feature reads through this layer;
// it is both the anti-cheat and the core of "the map is the past"
// (act3-map.md: the Model renders belief, never truth).
//
// Discipline for callers: `ObservedCiv` is the ONLY shape about another
// civilization that may ever cross the wire. Truth-side types stay in
// this module and in galaxy/civseed; nothing below ever reads target
// state newer than the light-departure year.
//
// The observed record is shaped to feed the A1 source card
// (concepts/03-01-the-sky.png): designation, light-age chip ("as of
// N y ago"), belief + confidence, light-history.

import type { CivId, CivSeed, EmissionEpoch } from "./civseed";
import { lightDelayYears } from "./clock";
import { beamCrossing, BEAM_RECEIVED_LEVEL } from "./contact";
import { civById, civDistanceLy, starById, type Galaxy } from "./galaxy";

// ---------------------------------------------------------------------------
// Truth (server-side only)
// ---------------------------------------------------------------------------

/** Emission level at a year: last epoch begun by then; 0 before the first. */
export function emissionAt(history: readonly EmissionEpoch[], year: number): number {
  let level = 0;
  for (const epoch of history) {
    if (epoch.fromYear <= year) level = epoch.level;
    else break;
  }
  return level;
}

/** A civilization's true state at a game year. Never leaves the server. */
export interface CivTruth {
  readonly emissionLevel: number;
  readonly ascended: boolean;
}

export function civTruthAt(seed: CivSeed, year: number): CivTruth {
  return {
    emissionLevel: emissionAt(seed.emissionHistory, year),
    ascended: year >= seed.ascensionYear,
  };
}

// ---------------------------------------------------------------------------
// The knowledge gate — LightCone (A2.2, missions-design.md / systems-a.md §1)
// ---------------------------------------------------------------------------
//
// `ObservedCiv` was the wire boundary; this slice adds two more channels
// that read truth (bought questions, mission reports), so the boundary
// needs a reusable server-side form. A LightCone is a capability token: the
// only way to obtain one is `lightConeFor`, which derives `asOfYear` from
// the clock and the real distance. There is no constructor that takes an
// arbitrary ceiling, so carrying a cone is proof a read is causal.

/**
 * Permission to read one target's truth, bounded by causality. The ONLY way
 * to obtain one is `lightConeFor`. A cone is server-side only: it never
 * crosses the wire and has no wire-facing analogue.
 */
export interface LightCone {
  readonly observerId: CivId;
  readonly targetId: CivId;
  readonly distanceLy: number;
  /** nowYear − distanceLy. The newest target-year home may hold ANY claim
   *  about, from ANY channel: telescope, bought answer, or mission report. */
  readonly asOfYear: number;
}

/**
 * Mint a cone for (observer, target) at the clock's nowYear. Throws on
 * unknown civs, as civById already does.
 */
export function lightConeFor(
  galaxy: Galaxy,
  observerId: CivId,
  targetId: CivId,
  nowYear: number,
): LightCone {
  const distance = observerId === targetId ? 0 : civDistanceLy(galaxy, observerId, targetId);
  return {
    observerId,
    targetId,
    distanceLy: distance,
    asOfYear: nowYear - lightDelayYears(distance),
  };
}

/** Slop so a float-adjacent year at the exact cone edge never spuriously reads as pending. */
const LIGHT_CONE_EPS = 1e-6;

/**
 * The only truth read outside observeCiv. Returns null — never a clamped or
 * approximated value — when `year` is above the cone. Callers turn that
 * null into "pending" / "in flight" / "awaiting light"; none of them can
 * turn it into a number.
 */
export function peekTruth(galaxy: Galaxy, cone: LightCone, year: number): CivTruth | null {
  if (year > cone.asOfYear + LIGHT_CONE_EPS) return null;
  return civTruthAt(civById(galaxy, cone.targetId).seed, year);
}

// ---------------------------------------------------------------------------
// Occupancy — the one truth summary questions and reports both read
// ---------------------------------------------------------------------------

/**
 * What is going on there, at a year, in four tiers. Server-side only —
 * never a wire field, never a number, never handed to a client.
 *
 * A content gap the builder must know about, not fix: every DetectedSource
 * in v1 is a civilization, so a naive "report the truth" question would
 * answer *somebody* every single time. At this stage the honest meaning of
 * "nobody" is nobody answering — a world with no machines on it
 * (`living-quiet`), or a civilization that went dark and now radiates
 * nothing (`banked`). Both are, to every instrument and to a fist-sized
 * probe, indistinguishable from an ordinary cold body. `banked` is the
 * designed wrong answer: a shut-down civilization reads as a cooled
 * remnant, and the read is wrong and honest, produced by truth and never by
 * a die. Adding non-civ sources to galaxy generation is the right eventual
 * fix and is out of scope for this slice; nothing here has to change when
 * it lands, because every question and report reads Occupancy, not
 * PlacedCiv.
 */
export type Occupancy =
  | "living-quiet" // a biosphere, no machines
  | "living-industrial" // machines running, not ascended
  | "working" // ascended and radiating on purpose
  | "banked"; // ascended and radiating almost nothing

export function occupancyAt(truth: CivTruth): Occupancy {
  if (!truth.ascended) {
    return truth.emissionLevel >= LEAKAGE_FLOOR ? "living-industrial" : "living-quiet";
  }
  return truth.emissionLevel >= MADE_HEAT_FLOOR ? "working" : "banked";
}

// ---------------------------------------------------------------------------
// The observed view
// ---------------------------------------------------------------------------

/** The five v1 signal classes (act3-design.md § The Sky and the Observatory). */
export type SignalClass =
  | "infrared-excess"
  | "transit-shadows"
  | "directed-beam"
  | "broadcast-leakage"
  | "biosignature";

/**
 * What the light actually carries. `classification` + `confidence` are a
 * belief, not a fact — A0 derives them thinly from the delayed truth (the
 * observatory's real inference game is A1); the shape is what matters.
 */
export interface ObservedSignal {
  /** The target's emission as of light departure — never newer. */
  readonly emissionLevel: number;
  readonly classification: SignalClass;
  /** Belief confidence 0..1 (the source card's percentage chip). */
  readonly confidence: number;
  /**
   * The target's emission history as observable: clipped strictly at the
   * departure year. The un-shinable past — and nothing after it.
   */
  readonly lightHistory: readonly EmissionEpoch[];
}

/**
 * "What does observer X see of civ Y, as of its light?" — the one answer
 * shape. This (and only this) may eventually be serialized to clients.
 */
export interface ObservedCiv {
  readonly observerId: CivId;
  readonly targetId: CivId;
  /** The target's home star as sky object: id + catalog designation. */
  readonly starId: string;
  readonly designation: string;
  readonly distanceLy: number;
  /** The mandatory age chip: how old this light is, in years (= distance). */
  readonly lightAgeYears: number;
  /** The game year the observed light departed the target: now − distance. */
  readonly asOfYear: number;
  /** null: nothing from the target has reached this observer (no source). */
  readonly signal: ObservedSignal | null;
}

/** Emission below this is indistinguishable from empty sky in A0. */
const DETECTION_FLOOR = 0.015;

/**
 * Emission at or above this reads as machines, pre-ascension — classify's
 * broadcast-leakage boundary, hoisted from a literal so `occupancyAt` and
 * `classify` can never disagree about where it sits (A2.2, systems-a.md §1).
 */
export const LEAKAGE_FLOOR = 0.1;
/**
 * Above this, no ordinary world explains the output on its own — classify's
 * post-ascension infrared-excess boundary and studies.ts's
 * WORLD_OUTPUT_CEILING, unified for the same reason as LEAKAGE_FLOOR.
 */
export const MADE_HEAT_FLOOR = 0.12;

/**
 * Thin A0 classification of delayed truth. Static emitters only —
 * directed beams arrive with signal traffic (A2) and are never produced
 * here; the class is in the type so the record doesn't reshape.
 */
function classify(truth: CivTruth, seed: CivSeed): SignalClass {
  if (!truth.ascended) {
    return truth.emissionLevel >= LEAKAGE_FLOOR ? "broadcast-leakage" : "biosignature";
  }
  if (truth.emissionLevel < MADE_HEAT_FLOOR) return "infrared-excess";
  return seed.ladders.energy >= 3 ? "transit-shadows" : "broadcast-leakage";
}

/** Thin belief confidence: nearer and brighter reads surer. Placeholder shape for A1. */
function confidenceFor(distance: number, level: number): number {
  const raw = 0.95 - distance / 100 - (0.25 - Math.min(0.25, level * 0.5));
  return Math.round(Math.min(0.95, Math.max(0.2, raw)) * 100) / 100;
}

/**
 * The core query. Self-observation is the one present-tense case (your
 * home system is the only thing in the universe you see now).
 */
export function observeCiv(
  galaxy: Galaxy,
  observerId: CivId,
  targetId: CivId,
  nowYear: number,
): ObservedCiv {
  const target = civById(galaxy, targetId);
  const star = starById(galaxy.stars, target.starId);
  const distance = observerId === targetId ? 0 : civDistanceLy(galaxy, observerId, targetId);
  const asOfYear = nowYear - lightDelayYears(distance);
  const truth = civTruthAt(target.seed, asOfYear);

  // A2.4: is a directed beam from the target landing on THIS observer as of
  // this observer's own light-departure year? The check rides the cone
  // already derived above and reads no clock of its own, so a beam can never
  // surface early; it is filtered on the recipient, so no other observer
  // sees anything but the sender's ordinary broadband light; and it
  // short-circuits DETECTION_FLOOR, which is the entire point — a silent
  // civilization reveals itself TO THEM ALONE. See contact.ts.
  const beam =
    observerId === targetId
      ? null
      : beamCrossing(galaxy.acts, targetId, observerId, asOfYear);

  let signal: ObservedSignal | null = null;
  if (beam !== null) {
    signal = {
      emissionLevel: Math.max(truth.emissionLevel, BEAM_RECEIVED_LEVEL),
      classification: "directed-beam",
      confidence: confidenceFor(distance, BEAM_RECEIVED_LEVEL),
      // Broadband, unchanged: the arrival adds a CLASS, never a fake
      // history. A beam is aimed and leaves no trace in the light curve.
      lightHistory: target.seed.emissionHistory.filter((e) => e.fromYear <= asOfYear),
    };
  } else if (truth.emissionLevel >= DETECTION_FLOOR) {
    signal = {
      emissionLevel: truth.emissionLevel,
      classification: classify(truth, target.seed),
      confidence: confidenceFor(distance, truth.emissionLevel),
      lightHistory: target.seed.emissionHistory.filter(
        (e) => e.fromYear <= asOfYear,
      ),
    };
  }

  return {
    observerId,
    targetId,
    starId: star.id,
    designation: star.designation,
    distanceLy: distance,
    lightAgeYears: lightDelayYears(distance),
    asOfYear,
    signal,
  };
}

/** Everything an observer currently sees: one view per other civilization. */
export function observeSky(
  galaxy: Galaxy,
  observerId: CivId,
  nowYear: number,
): ObservedCiv[] {
  return galaxy.civs
    .filter((c) => c.seed.id !== observerId)
    .map((c) => observeCiv(galaxy, observerId, c.seed.id, nowYear));
}

/**
 * The undetected-civ-is-simply-absent policy, enforced here in the
 * knowledge layer rather than by callers: only civilizations with a
 * signal (something has actually reached the observer) appear.
 */
export function visibleSky(
  galaxy: Galaxy,
  observerId: CivId,
  nowYear: number,
): (ObservedCiv & { signal: ObservedSignal })[] {
  return observeSky(galaxy, observerId, nowYear).filter(
    (o): o is ObservedCiv & { signal: ObservedSignal } => o.signal !== null,
  );
}
