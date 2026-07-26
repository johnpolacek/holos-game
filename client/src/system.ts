// THE HOME SYSTEM — what is under the floor of the zoom.
//
// The Model's catalog is a neighborhood twenty-five light-years across, and
// until now the camera bottomed out at four light-years: HOME was a cyan mote
// and nothing else, forever. This module is the other end of the scale. It
// generates one planetary system at the player's own star, in real AU laid
// into the same light-year frame the rest of the Model uses, so that pulling
// the camera all the way in arrives somewhere true rather than at a bigger dot.
//
// Three rules it keeps:
//
//   • DETERMINISTIC. Seeded from the star id and the cradle id, so the system
//     is the same system in every session and on every device that can see it.
//     Nothing here crosses the wire; nothing here is gameplay. It is the same
//     bargain cosmos.ts makes with the backdrop, one level closer in.
//   • HONEST POSITIONS. Semi-major axes are real AU, orbits are real ellipses
//     with the star at a focus, and periods go as a^1.5. What is stylized is
//     how BIG things are drawn (a planet at true scale is a millionth of a
//     pixel) and how FAST the clock runs — the Model's own two standing
//     compromises, applied here in the same direction.
//   • THE HOME PLANET IS IN THE HABITABLE ZONE OF ITS OWN STAR. An M dwarf's
//     is at a tenth of an AU and an F star's is nearly two; the ceremony
//     already told the player what kind of star they woke under, and the
//     system has to agree with it.
//
// The plane is fixed and slightly tilted, so orbits project as ellipses rather
// than as a set of lines seen edge-on, and so the pull-back opens near enough
// to face-on for the rings to read.

import type { Star } from "@holos/protocol";

/** One astronomical unit, in light-years. The whole bridge between the two
 *  scales this file lives between. */
export const AU_LY = 1.5813e-5;

export interface SystemVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A mutable vector for the projection loops to write into — the ring pass
 *  samples several hundred points a frame and must not allocate. */
export interface MutVec3 {
  x: number;
  y: number;
  z: number;
}

export interface Planet {
  /** Semi-major axis, AU. */
  readonly aAu: number;
  readonly ecc: number;
  /** Longitude of periapsis, measured in the ecliptic basis below. */
  readonly argP: number;
  /** Mean anomaly at t = 0. */
  readonly m0: number;
  /** Orbital period in REAL seconds of watching (see SECONDS_PER_AU_ORBIT). */
  readonly periodS: number;
  readonly tint: number;
  /** Drawn-size multiplier against the base planet pixel size. */
  readonly sizeMul: number;
}

export interface HomeSystem {
  readonly planets: readonly Planet[];
  /** Index into `planets` of the world the player's civ came from. */
  readonly homeIndex: number;
  /** The habitable orbit's semi-major axis, AU. The Model sizes the star and
   *  the planets against it: an M dwarf's whole system fits inside where a
   *  G star's home world merely starts, and one fixed drawn size in AU would
   *  make the close-in ones bigger than the orbits they sit on. */
  readonly habitableAu: number;
  /** The ecliptic's two in-plane unit vectors, in the light-year frame. */
  readonly basisU: SystemVec3;
  readonly basisV: SystemVec3;
  /** Where the act-opening pull-back starts, in AU: close enough that the
   *  home planet is a world and not a pixel, whatever class the star is. */
  readonly openingAu: number;
}

// ── The ecliptic ──────────────────────────────────────────────────────────
//
// One fixed plane for every system, chosen against the camera rather than
// randomized: near enough to face-on at the pull-back's opening angles that
// the rings read as rings, far enough off it that they are ellipses and not
// circles, and well open by the time the camera has drifted out to its
// resting off-axis attitude.

const ECLIPTIC_N: SystemVec3 = (() => {
  const x = 0.4799;
  const y = 0.0814;
  const z = 0.8721;
  const m = Math.sqrt(x * x + y * y + z * z);
  return { x: x / m, y: y / m, z: z / m };
})();

/** First in-plane axis: ŷ × n̂, normalized. The normal is well clear of
 *  vertical, so the cross product is nowhere near degenerate. */
const ECLIPTIC_U: SystemVec3 = (() => {
  const x = -ECLIPTIC_N.z;
  const y = 0;
  const z = ECLIPTIC_N.x;
  const m = Math.sqrt(x * x + y * y + z * z);
  return { x: x / m, y: y / m, z: z / m };
})();

/** Second in-plane axis: n̂ × û. Completes a right-handed triad. */
const ECLIPTIC_V: SystemVec3 = {
  x: ECLIPTIC_N.y * ECLIPTIC_U.z - ECLIPTIC_N.z * ECLIPTIC_U.y,
  y: ECLIPTIC_N.z * ECLIPTIC_U.x - ECLIPTIC_N.x * ECLIPTIC_U.z,
  z: ECLIPTIC_N.x * ECLIPTIC_U.y - ECLIPTIC_N.y * ECLIPTIC_U.x,
};

// ── Tuning ────────────────────────────────────────────────────────────────

/**
 * Habitable zone by spectral class, AU. An M dwarf's is close in because the
 * star is dim; an F star's is out past ours because it is not. These are the
 * bands the brief names, and they are the one place the system's geometry is
 * answerable to something the player was already told.
 */
const HABITABLE_ZONE: Readonly<Record<Star["spectralClass"], readonly [number, number]>> = {
  M: [0.1, 0.3],
  K: [0.4, 0.7],
  G: [0.8, 1.2],
  F: [1.2, 1.8],
};

/** Hard limits on where a planet may sit. The general spread is the brief's
 *  0.25–20 AU; the inner limit only goes lower to let an M dwarf's habitable
 *  world have anything inside it at all. */
const A_MIN_AU = 0.07;
const A_MAX_AU = 21;

const PLANETS_MIN = 4;
const PLANETS_MAX = 8;

/**
 * How long, in real seconds of watching, a one-AU orbit takes. Everything
 * else follows from a^1.5, so the innermost planet of a system comes round in
 * one to three minutes and the outer ones are a slow drift you notice only if
 * you look away and come back. Twenty minutes at 1 AU would be more honest
 * and would read as a still image; two would read as a clock.
 */
const SECONDS_PER_AU_ORBIT = 1200;

/** Muted, varied, and none of them cyan or amber — those two colors are
 *  spoken for (HOME and a detected source) everywhere in the Model. */
const PLANET_TINTS: readonly number[] = [
  0x8d8477, 0x6f7e8c, 0x9a8b74, 0x7d8a7e, 0x8f8898, 0x6c7a86, 0xa39074, 0x77828f,
];

/** The plate the home world is drawn with can fail to resolve (worldArt is
 *  partial); when it does, the disc still has to look like a world someone
 *  came from rather than like a bug. Warm, dim, unmistakably not the others. */
export const HOME_FALLBACK_TINT = 0xc08a63;

// ── Determinism ───────────────────────────────────────────────────────────

type Rnd = () => number;

/** mulberry32, as in cosmos.ts — thirty lines instead of a dependency. */
function mulberry32(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over the star id, folded with the cradle id. Two civs on the same
 *  star would get the same sky anyway; the cradle keeps the pair honest. */
function hashSeed(starId: string, cradleId: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < starId.length; i++) {
    h ^= starId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= Math.imul(cradleId + 1, 0x9e3779b9);
  return h >>> 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function pick(rnd: Rnd, arr: readonly number[]): number {
  return arr[Math.floor(rnd() * arr.length)] ?? 0x888888;
}

// ── Generation ────────────────────────────────────────────────────────────

/**
 * Build the system at the player's own star. Deterministic in
 * (starId, cradleId, spectralClass); safe to call whenever the sky changes,
 * though the Model only rebuilds when the star actually differs.
 */
export function buildHomeSystem(
  starId: string,
  cradleId: number,
  spectralClass: Star["spectralClass"],
): HomeSystem {
  const rnd = mulberry32(hashSeed(starId, cradleId));
  const zone = HABITABLE_ZONE[spectralClass];
  const aHome = zone[0] + (zone[1] - zone[0]) * rnd();

  const total = PLANETS_MIN + Math.floor(rnd() * (PLANETS_MAX - PLANETS_MIN + 1));

  // Split the other planets inside and outside the habitable one in the ratio
  // of the log room available on each side — an M dwarf's world has almost
  // nothing inside it and a whole system outside, and it should look that way.
  const roomIn = Math.log(aHome / A_MIN_AU);
  const roomOut = Math.log(A_MAX_AU / aHome);
  let inner = Math.round((total - 1) * (roomIn / (roomIn + roomOut)));
  inner = clamp(inner, 0, total - 1);

  const axes: number[] = [aHome];

  // Inward, each step a Titius–Bode-ish ratio so orbits never cross and never
  // crowd. If we run out of room, the remaining slots go outward instead.
  let a = aHome;
  let placedIn = 0;
  for (let i = 0; i < inner; i++) {
    const next = a / (1.42 + rnd() * 0.8);
    if (next < A_MIN_AU) break;
    axes.push(next);
    a = next;
    placedIn++;
  }

  a = aHome;
  for (let i = 0; i < total - 1 - placedIn; i++) {
    const next = a * (1.45 + rnd() * 1.0);
    if (next > A_MAX_AU) break;
    axes.push(next);
    a = next;
  }

  axes.sort((p, q) => p - q);
  const homeIndex = axes.indexOf(aHome);

  const planets: Planet[] = axes.map((aAu) => {
    const isHome = aAu === aHome;
    // The habitable world's orbit is the roundest in the system, because the
    // one thing every story about it assumes is a climate that holds.
    const ecc = isHome ? rnd() * 0.022 : rnd() * 0.055;
    return {
      aAu,
      ecc,
      argP: rnd() * Math.PI * 2,
      m0: rnd() * Math.PI * 2,
      periodS: SECONDS_PER_AU_ORBIT * Math.pow(aAu, 1.5),
      tint: isHome ? HOME_FALLBACK_TINT : pick(rnd, PLANET_TINTS),
      // Beyond a couple of times the habitable radius the big ones live, the
      // way they do here. Small rocks inside, larger worlds out.
      sizeMul: aAu > aHome * 2.2 ? 0.75 + rnd() * 0.5 : 0.38 + rnd() * 0.28,
    };
  });

  return {
    planets,
    homeIndex: homeIndex < 0 ? 0 : homeIndex,
    habitableAu: aHome,
    basisU: ECLIPTIC_U,
    basisV: ECLIPTIC_V,
    // Far enough back that the home planet's orbit fills a good part of the
    // frame without leaving it, whatever class the star is.
    openingAu: clamp(aHome * 3.4, 2, 5),
  };
}

// ── Motion ────────────────────────────────────────────────────────────────

/**
 * True anomaly at `tSec` seconds of watching. Eccentricities here are all
 * under 0.06, well inside where the equation of the center is accurate to
 * far better than a pixel — so no Newton iteration on the Kepler equation,
 * which would be four hundred solves a frame for no visible difference.
 */
export function trueAnomalyAt(p: Planet, tSec: number): number {
  const m = p.m0 + (2 * Math.PI * tSec) / p.periodS;
  const e = p.ecc;
  return m + 2 * e * Math.sin(m) + 1.25 * e * e * Math.sin(2 * m);
}

/**
 * Offset from the star, in LIGHT-YEARS, at true anomaly `nu`. The orbit path
 * and the planet on it both go through here, so the dot is on the ring by
 * construction rather than by two formulas agreeing.
 */
export function orbitPointLy(sys: HomeSystem, p: Planet, nu: number, out: MutVec3): void {
  const r = (p.aAu * (1 - p.ecc * p.ecc)) / (1 + p.ecc * Math.cos(nu));
  const ang = nu + p.argP;
  const a = r * Math.cos(ang) * AU_LY;
  const b = r * Math.sin(ang) * AU_LY;
  out.x = sys.basisU.x * a + sys.basisV.x * b;
  out.y = sys.basisU.y * a + sys.basisV.y * b;
  out.z = sys.basisU.z * a + sys.basisV.z * b;
}
