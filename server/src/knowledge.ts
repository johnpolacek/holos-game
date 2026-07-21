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
 * Thin A0 classification of delayed truth. Static emitters only —
 * directed beams arrive with correspondence (A2) and are never produced
 * here; the class is in the type so the record doesn't reshape.
 */
function classify(truth: CivTruth, seed: CivSeed): SignalClass {
  if (!truth.ascended) {
    return truth.emissionLevel >= 0.1 ? "broadcast-leakage" : "biosignature";
  }
  if (truth.emissionLevel < 0.12) return "infrared-excess";
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

  let signal: ObservedSignal | null = null;
  if (truth.emissionLevel >= DETECTION_FLOOR) {
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
