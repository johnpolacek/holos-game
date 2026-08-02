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
import { beamCrossing } from "./contact";
import { civById, civDistanceLy, distanceLy, starById, type Galaxy } from "./galaxy";
// A2.5: the derived half of the beam branch. Imported for its FUNCTION
// REFERENCE only, resolved at call time — traffic.ts imports `lightConeFor`
// and `peekTruth` from here in turn, and neither module reads the other at
// module-initialization time (contact.ts's header states the same cycle for
// the same reason).
import { aiBeamCrossing } from "./traffic";
// A4: the destination-world draw. Truth, and therefore gated here — a caller
// reaches it through `peekWorld` and a StarCone or not at all. worlds.ts
// imports nothing from this module, so there is no cycle to reason about.
import { destinationWorldAt, type DestinationWorld } from "./worlds";
import type { StarId } from "./galaxy";

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
 * null into "in flight" / "awaiting light" (mission reports; questions now
 * resolve at the cone edge and should never see it); none of them can
 * turn it into a number.
 */
export function peekTruth(galaxy: Galaxy, cone: LightCone, year: number): CivTruth | null {
  if (year > cone.asOfYear + LIGHT_CONE_EPS) return null;
  return civTruthAt(civById(galaxy, cone.targetId).seed, year);
}

// ---------------------------------------------------------------------------
// The star cone (A4) — the same gate, aimed at a PLACE rather than a civ
// ---------------------------------------------------------------------------
//
// A voyage asks a question `LightCone` cannot carry: not "what is that
// civilization doing" but "what is at that star". The target may hold nobody,
// so there is no `targetId` to mint a cone against, and the answer
// (`DestinationWorld`) is truth even though nothing about it is alive.
//
// It is the SAME capability discipline, one noun over. The only constructor is
// `starConeFor`, which derives `asOfYear` from the clock and the real distance
// between the observer's own home star and the target star; there is no
// constructor that takes an arbitrary ceiling. So at a launch sheet — where
// every year the player might ask about is in the future — `peekWorld` returns
// null BY CONSTRUCTION, and "the forecast is a prior, never truth" is a
// property of the types rather than a rule somebody remembered to follow.

/**
 * Permission to read one STAR's truth, bounded by causality. Server-side only;
 * it never crosses the wire and has no wire-facing analogue.
 */
export interface StarCone {
  readonly observerId: CivId;
  readonly starId: StarId;
  readonly distanceLy: number;
  /** nowYear − distanceLy. The newest star-year this observer may hold ANY
   *  claim about. */
  readonly asOfYear: number;
}

/** Mint a star cone for (observer, star) at the clock's nowYear. Throws on an
 *  unknown civ or star, as `civById` / `starById` already do. */
export function starConeFor(
  galaxy: Galaxy,
  observerId: CivId,
  starId: StarId,
  nowYear: number,
): StarCone {
  const home = starById(galaxy.stars, civById(galaxy, observerId).starId);
  const target = starById(galaxy.stars, starId);
  const distance = home.id === target.id ? 0 : distanceLy(home.position, target.position);
  return {
    observerId,
    starId,
    distanceLy: distance,
    asOfYear: nowYear - lightDelayYears(distance),
  };
}

/**
 * `peekTruth` for a place. Returns null — never a guess, never a clamped
 * value — when `year` is above the cone. The world itself is time-invariant
 * (worlds.ts draws it from the star id alone); what the cone gates is WHEN a
 * claim about it may be held, which is exactly the year a ship could have
 * been there and the light of its being there could have come home.
 */
export function peekWorld(
  galaxy: Galaxy,
  cone: StarCone,
  year: number,
): DestinationWorld | null {
  if (year > cone.asOfYear + LIGHT_CONE_EPS) return null;
  return destinationWorldAt(galaxy, cone.starId);
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

/** Inside this the source is your own system; it keeps the flux finite at
 *  d = 0. Shared by the detection test and `confidenceFor` below, which is
 *  what makes self-observation (distance 0) pass both. */
const NEAR_FIELD_LY = 0.25;

/**
 * DETECTION IS RECEIVED FLUX, NOT EMISSION LEVEL (physics-audit.md P2-5).
 *
 * A source delivers `level / d²` to the collector. The old scalar floor
 * admitted a given emission level into the sky at 3 ly and at 50 alike, which
 * was the one place this module disagreed with the inverse square
 * `confidenceFor` already runs on. Same threshold, asked of the flux.
 *
 * CALIBRATED SO THE SHIPPED SKY DOES NOT MOVE. The faintest thing the game
 * authors is a dark tail at 0.02, and the widest crossing of a 25 ly-radius
 * field is 50 ly: 0.02 / 50² is exactly this number, so that source sits at the
 * edge and stays visible. Everything else clears it everywhere in field —
 * biospheres 0.03 to 0.06, dark tails 0.02 to 0.06, industrial 0.10 to 0.18, a
 * shine or a flare 0.30 and up, behavior.ts's own WAKING_DARK 0.04 and
 * HEAT_HOLD 0.119. Nothing that was visible went out. The shape is the fix,
 * and it is the fix the field can grow past 25 ly behind.
 */
export const DETECTION_FLUX_FLOOR = 8e-6;

/**
 * The closest two civilizations are ever seated, restated from galaxy.ts's
 * `MIN_CIV_SEPARATION_LY` (module-private to placement) so the derivation
 * below can name the worst case without an import that would say this module
 * cares where anybody was put. Keep the two in step.
 */
const SEPARATION_FLOOR_LY = 3;

/**
 * THE LEVEL NO OBSERVER CAN EVER SEE. Under a flux threshold "detected" is a
 * question about a PAIR, so a module that needs a plain scalar — "this thing
 * is in nobody's sky, full stop" — needs the worst case rather than the
 * average one: the flux floor as read by the nearest observer the galaxy will
 * ever seat. Below it, no legal observer at any legal distance has the photons.
 *
 * Exported since A4 for the claim it was minted to carry: a colony chartered
 * `found-dark` emits BELOW it on purpose (voyages.ts's FOUND_DARK_LEVEL),
 * which makes it the first emitter in the game that is in `galaxy.civs` and in
 * nobody's sky. That module reads this constant rather than a copy of its
 * value.
 */
export const UNSEEABLE_LEVEL = DETECTION_FLUX_FLOOR * SEPARATION_FLOOR_LY * SEPARATION_FLOOR_LY;

/**
 * The detection test itself: does this source's flux clear the floor AT THIS
 * OBSERVER? The near-field clamp is `confidenceFor`'s, for the same reason and
 * with the same consequence — your own system is at distance 0 and you always
 * see yourself.
 */
export function detectableAt(level: number, distance: number): boolean {
  const d = Math.max(distance, NEAR_FIELD_LY);
  return level / (d * d) >= DETECTION_FLUX_FLOOR;
}

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

/**
 * The aperture term the received flux is measured against — the noise the
 * collector cannot get below. Lower it and the same photons read surer, which
 * is what a collecting-area project physically buys (physics-audit.md P1-4).
 */
const APERTURE_K = 0.022;
/**
 * How much of the [0.2, 0.95] band a rising SNR spans. Above 0.75 the ceiling
 * is REACHED rather than approached: past a clean-enough read the clamp binds
 * and near, bright sources sit at 0.95, as they did under the old shape.
 */
const CONFIDENCE_SPAN = 0.85;

/**
 * Belief confidence from RECEIVED FLUX, not from range: a source delivers
 * level/d² to the aperture — the same inverse square traffic.ts degrades a
 * beam by — and confidence stands in for SNR, which rises as the ROOT of that
 * flux and saturates. Sure near home, photon-starved far out, and the
 * plateau gates that read it become starvation gates rather than distance ones.
 */
function confidenceFor(distance: number, level: number): number {
  const d = Math.max(distance, NEAR_FIELD_LY);
  const rootFlux = Math.sqrt(Math.max(0, level) / (d * d));
  const snr = rootFlux / (rootFlux + APERTURE_K);
  const raw = 0.2 + CONFIDENCE_SPAN * snr;
  return Math.round(Math.min(0.95, Math.max(0.2, raw)) * 100) / 100;
}

// ---------------------------------------------------------------------------
// The beam falloff — ONE LAW (physics-audit.md P2-6)
// ---------------------------------------------------------------------------
//
// There used to be two. traffic.ts measured the arriving beam with an
// inverse-square fall-off against the range the transmitter was trimmed for,
// and the beam branch below classified every received beam at a flat 0.4 no
// matter how far it had come. The old note in traffic.ts argued the two were
// different quantities (a MEASUREMENT and a GUARANTEE) and that unifying them
// would break the A2.4 promise. The promise survives the unification: what
// guarantees a dark civilization can make itself seen by exactly one observer
// is that the beam branch SKIPS THE DETECTION FLOOR ENTIRELY, not that the
// level it reports is distance-free. A beam is aimed; it announces itself at
// any range. How LOUD it reads, and how sure the read is, are then honest
// functions of the crossing, like everything else in this module.

/** The range a transmitter is trimmed for. */
const BEAM_REFERENCE_LY = 5;

/** However far away, something arrives. A beam is aimed. */
const BEAM_RECEIVED_FLOOR = 0.02;

/**
 * The level a transmitter is trimmed to DELIVER, back-solved from what the
 * game already shipped: at the 5 ly reference range the fraction is one half,
 * so the received level is 0.4, which is what the old flat constant said. A
 * beam at the reference distance is unchanged; nearer ones read brighter and
 * surer, farther ones weaker and less sure. Past about 30 ly the read falls
 * under questions.ts's 0.35 gate and a beam plateaus the study board, which is
 * photon starvation doing its job rather than a distance gate wearing its
 * clothes.
 */
export const BEAM_TRIMMED_LEVEL = 0.8;

/**
 * How much of the beam arrives: an inverse-square fall-off against the range
 * the transmitter was trimmed for. At 3 ly it reads 0.74; at 6.8 ly, 0.35; at
 * 15 ly, 0.10. Floored, because a beam is aimed and something always lands.
 *
 * Lives here rather than in traffic.ts because BOTH callers are now downstream
 * of it: traffic.ts renders it as the thread's instrument header (that module
 * imports from this one already, and the reverse would be a new cycle), and
 * `observeCiv` below reads the beam's level and confidence off it.
 */
export function beamReceivedFraction(distanceLy: number): number {
  const ref = BEAM_REFERENCE_LY * BEAM_REFERENCE_LY;
  const raw = ref / (ref + distanceLy * distanceLy);
  return Math.min(1, Math.max(BEAM_RECEIVED_FLOOR, raw));
}

/** What a beam trimmed for the reference range reads as after that crossing. */
export function beamReceivedLevel(distanceLy: number): number {
  return BEAM_TRIMMED_LEVEL * beamReceivedFraction(distanceLy);
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
  // short-circuits the detection test entirely, which is the entire point — a
  // silent civilization reveals itself TO THEM ALONE. See contact.ts.
  const beam =
    observerId === targetId
      ? null
      : beamCrossing(galaxy.acts, targetId, observerId, asOfYear);

  // A2.5: the same question asked of the DERIVED half of the log. A
  // counterpart's reply (and a lantern's unprompted opener) is a beam on
  // exactly the same terms — aimed, filtered on the recipient, compared only
  // against this observer's own light-departure year — and it lights the same
  // class. Consulted only when the stored half found nothing, so a live
  // outbound beam of the player's own is never overwritten by one of theirs.
  // NO RECURSION: `aiBeamCrossing` reads seeds, distances and the player's
  // acts, and never calls back into `observeCiv` (traffic.ts's header, §1).
  const derivedBeam =
    beam !== null || observerId === targetId
      ? null
      : aiBeamCrossing(galaxy, targetId, observerId, asOfYear);

  let signal: ObservedSignal | null = null;
  if (beam !== null || derivedBeam !== null) {
    // P2-6: one falloff law, shared with traffic.ts's instrument header. The
    // beam still needs no detection test — it is aimed — but what it READS as
    // is now the crossing it actually made.
    const received = beamReceivedLevel(distance);
    signal = {
      emissionLevel: Math.max(truth.emissionLevel, received),
      classification: "directed-beam",
      confidence: confidenceFor(distance, received),
      // Broadband, unchanged: the arrival adds a CLASS, never a fake
      // history. A beam is aimed and leaves no trace in the light curve.
      lightHistory: target.seed.emissionHistory.filter((e) => e.fromYear <= asOfYear),
    };
  } else if (detectableAt(truth.emissionLevel, distance)) {
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
