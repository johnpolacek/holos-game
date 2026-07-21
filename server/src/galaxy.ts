// The galaxy (thin) — a generated star field for one cohort neighborhood.
//
// Real-statistics positions, tens of light-years across (roadmap § A0).
// Distance in light-years is *the* gameplay quantity: by the shared-clock
// convention light crosses one light-year per game year, so the distance
// between two stars IS the light-delay in game years between them.
//
// Generated-with-real-statistics rather than the real solar neighborhood
// (act3-map.md leaves the player-geography anchor open; the honest
// compromise it names). The *statistics* are real: local stellar density
// ~0.004 stars/ly^3 (~0.12 pc^-3) and a class mix dominated by M dwarfs,
// which also matches the cradle catalog's skew.

import type { Rng } from "./rng";

export type StarId = string;

/** Position in light-years, cohort-centric frame (origin = cohort center). */
export interface Vec3Ly {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function distanceLy(a: Vec3Ly, b: Vec3Ly): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Main-sequence classes the neighborhood draws from. */
export type SpectralClass = "M" | "K" | "G" | "F";

/**
 * Approximate local-neighborhood fractions among these four classes
 * (M dwarfs dominate; bright stars are rare).
 */
export const SPECTRAL_MIX: readonly { cls: SpectralClass; weight: number }[] = [
  { cls: "M", weight: 76 },
  { cls: "K", weight: 12 },
  { cls: "G", weight: 8 },
  { cls: "F", weight: 4 },
];

/** Local stellar density, stars per cubic light-year. */
export const STARS_PER_CUBIC_LY = 0.004;

export interface Star {
  readonly id: StarId;
  /** Catalog-style designation, e.g. "HOL-0413" — the pre-naming name. */
  readonly designation: string;
  readonly spectralClass: SpectralClass;
  readonly position: Vec3Ly;
}

export interface StarFieldConfig {
  /** Neighborhood radius in light-years ("tens of light-years across"). */
  readonly radiusLy: number;
}

export const DEFAULT_STAR_FIELD: StarFieldConfig = { radiusLy: 25 };

/**
 * Generate a star field: uniform positions in a sphere at real density,
 * real class mix. ~260 stars at the default 25 ly radius.
 */
export function generateStarField(rng: Rng, config: StarFieldConfig): Star[] {
  const volume = (4 / 3) * Math.PI * config.radiusLy ** 3;
  const count = Math.max(2, Math.round(volume * STARS_PER_CUBIC_LY));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    // Uniform in a sphere: r ∝ cbrt(u); direction from cos(theta) uniform.
    const r = config.radiusLy * Math.cbrt(rng.next());
    const cosTheta = rng.range(-1, 1);
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = rng.range(0, 2 * Math.PI);
    stars.push({
      id: `st-${i.toString().padStart(4, "0")}`,
      designation: `HOL-${rng.int(0, 9999).toString().padStart(4, "0")}-${i}`,
      spectralClass: rng.weighted(SPECTRAL_MIX, (m) => m.weight).cls,
      position: {
        x: r * sinTheta * Math.cos(phi),
        y: r * sinTheta * Math.sin(phi),
        z: r * cosTheta,
      },
    });
  }
  return stars;
}

export function starById(stars: readonly Star[], id: StarId): Star {
  const star = stars.find((s) => s.id === id);
  if (star === undefined) throw new Error(`unknown star: ${id}`);
  return star;
}
