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

import { generateCivSeed, type CivId, type CivSeed } from "./civseed";
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

// ---------------------------------------------------------------------------
// Civilizations in the field
// ---------------------------------------------------------------------------

/**
 * A civilization placed in the neighborhood. Placement lives here — NOT
 * on CivSeed — so the handoff seam stays galaxy-free (Phase B produces a
 * CivSeed with no galaxy attached).
 */
export interface PlacedCiv {
  readonly seed: CivSeed;
  readonly starId: StarId;
  readonly controller: "player" | "ai";
}

export interface GalaxyConfig extends StarFieldConfig {
  readonly aiCivCount: number;
}

export const DEFAULT_GALAXY_CONFIG: GalaxyConfig = {
  ...DEFAULT_STAR_FIELD,
  aiCivCount: 8,
};

/** The truth record one Cohort Durable Object holds. Never serialized to clients. */
export interface Galaxy {
  readonly seedKey: string;
  readonly config: GalaxyConfig;
  readonly stars: readonly Star[];
  readonly civs: readonly PlacedCiv[];
}

/** Minimum separation between civilization home stars, in light-years. */
const MIN_CIV_SEPARATION_LY = 3;

function pickHomeStars(rng: Rng, stars: readonly Star[], count: number): Star[] {
  const homes: Star[] = [];
  let attempts = 0;
  while (homes.length < count && attempts < count * 200) {
    attempts++;
    const candidate = rng.pick(stars);
    if (homes.some((h) => h.id === candidate.id)) continue;
    const tooClose = homes.some(
      (h) => distanceLy(h.position, candidate.position) < MIN_CIV_SEPARATION_LY,
    );
    if (!tooClose) homes.push(candidate);
  }
  if (homes.length < count) {
    throw new Error(
      `could not place ${count} civs with ${MIN_CIV_SEPARATION_LY} ly separation in ${stars.length} stars`,
    );
  }
  return homes;
}

/** The galaxy's age mix for seeded AI civs (vision.md: seed the whole spectrum). */
function drawAgeBand(rng: Rng): "young" | "peer" | "elder" {
  const roll = rng.next();
  if (roll < 0.2) return "elder";
  if (roll < 0.45) return "young";
  return "peer";
}

/**
 * Generate a full cohort neighborhood at game year `nowYear` (normally 0):
 * the star field, N seeded AI civilizations across the age spectrum, and
 * one player civilization (recently ascended — Act 3 opens now) at the
 * star nearest the cohort center.
 */
export function generateGalaxy(
  rng: Rng,
  seedKey: string,
  config: GalaxyConfig,
  nowYear: number,
  playerCivId: CivId = "civ-player",
): Galaxy {
  const stars = generateStarField(rng.fork("stars"), config);
  const homes = pickHomeStars(rng.fork("placement"), stars, config.aiCivCount + 1);
  const origin: Vec3Ly = { x: 0, y: 0, z: 0 };
  homes.sort(
    (a, b) => distanceLy(a.position, origin) - distanceLy(b.position, origin),
  );
  const playerHome = homes[0];
  if (playerHome === undefined) throw new Error("no home star for player");

  const civs: PlacedCiv[] = [
    {
      seed: generateCivSeed(rng.fork("civ/player"), {
        id: playerCivId,
        ageBand: "peer",
        nowYear,
        recentlyAscended: true,
      }),
      starId: playerHome.id,
      controller: "player",
    },
  ];
  for (let i = 0; i < config.aiCivCount; i++) {
    const home = homes[i + 1];
    if (home === undefined) throw new Error("home star count mismatch");
    const civRng = rng.fork(`civ/ai-${i}`);
    civs.push({
      seed: generateCivSeed(civRng, {
        id: `civ-ai-${i}`,
        ageBand: drawAgeBand(civRng),
        nowYear,
      }),
      starId: home.id,
      controller: "ai",
    });
  }
  return { seedKey, config, stars, civs };
}

export function civById(galaxy: Galaxy, id: CivId): PlacedCiv {
  const civ = galaxy.civs.find((c) => c.seed.id === id);
  if (civ === undefined) throw new Error(`unknown civ: ${id}`);
  return civ;
}

/** Distance between two civilizations' home stars — the gameplay quantity. */
export function civDistanceLy(galaxy: Galaxy, a: CivId, b: CivId): number {
  const starA = starById(galaxy.stars, civById(galaxy, a).starId);
  const starB = starById(galaxy.stars, civById(galaxy, b).starId);
  return distanceLy(starA.position, starB.position);
}
