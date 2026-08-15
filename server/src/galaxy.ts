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

import {
  generateCivSeed,
  type AgeBand,
  type CivId,
  type CivSeed,
  type GenerateCivParams,
} from "./civseed";
// Type-only: the dated dial record a derived colony carries. dials.ts imports
// nothing, so this pulls no runtime behind it.
import type { DialEpoch } from "./dials";
// Type-only, so nothing of contact.ts's runtime is pulled in behind the
// galaxy record (contact.ts imports this module in turn; the cycle is erased).
import type { ContactAct } from "./contact";
// Type-only, so nothing of minds.ts's catalog is pulled in behind a posture.
import type { Posture } from "./minds";
// `createRng` at run time: the reserved set below is keyed on the cohort's own
// seed key, and a derived truth may not reach for an unseeded die.
import { createRng, type Rng } from "./rng";

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
  /**
   * A4, optional and DERIVED-ONLY: this civilization answers nothing, ever.
   * Set on exactly one kind of civ — a colony whose founding charter carried
   * the `answer-nothing` clause (voyages.ts) — and read at exactly one place,
   * traffic.ts's class resolution, where it forces `counterpartClass` to
   * "silent" without inventing an eleventh archetype nobody wrote a voice for.
   *
   * IT IS NEVER PERSISTED, because the civs that carry it are never persisted:
   * children are produced by `galaxyWithLandfalls` on every read and
   * `saveGalaxyCivs` refuses to write one (cohort.ts's assertion). An absent
   * field means "answers in character", which is every stored civ in the game.
   */
  readonly answersNothing?: boolean;
  /**
   * A4, optional and DERIVED-ONLY: where this civilization's dials have
   * actually walked since it was founded, sampled at the same years its
   * emission history is (voyages.ts's `foundingWalkedDials`). Set on exactly
   * one kind of civ — a colony — and read at exactly one place, traffic.ts's
   * dial culture part, where it is what makes a child's word about itself
   * state the pole it HOLDS rather than the pole it was chartered with.
   *
   * Without it drift would be unreadable: the light channel would carry every
   * disagreement the parent could ever see, and a colony could contradict its
   * charter on one axis and never on the other four.
   *
   * NEVER PERSISTED, because the civs that carry it are never persisted
   * (`galaxyWithLandfalls` produces them on every read and `saveGalaxyCivs`
   * refuses to write one). An absent field means "has not walked", which is
   * every stored civ in the game.
   */
  readonly walkedDials?: readonly DialEpoch[];
  /**
   * A5, optional and DERIVED-ONLY: this civilization's emission history has
   * been grown by behavior.ts's fold and is no longer the one its seed was
   * generated with. Set on exactly one kind of civ — an AI civilization whose
   * cadence or reactions actually moved its light — and read at exactly one
   * place, cohort.ts's `saveGalaxyCivs`, where it throws.
   *
   * IT IS NEVER PERSISTED, and unlike the two fields above the civs that carry
   * it CAN be stored ones: a seeded AI civilization is on disk, and what is
   * derived is its light. So the assertion is the whole guard. Writing a grown
   * history down would freeze one derivation's answer into the record and put
   * a second copy of every source's light on disk, free to disagree with the
   * fold the first time a rule row is retuned. An absent field means "the
   * light its seed was written with", which is every stored civ in the game.
   */
  readonly behaviorGrown?: boolean;
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
  /**
   * A2.4: the append-only contact log (contact.ts). It lives HERE, on the
   * truth record, so `observeCiv(galaxy, …)` can reach it without a
   * signature change anywhere and the light-cone gate stays the only way
   * into truth. Persisted at its own DO key; an absent key loads as `[]`,
   * which IS the migration — no stored shape changed, so existing cohorts
   * keep working untouched.
   */
  readonly acts: readonly ContactAct[];
}

// ---------------------------------------------------------------------------
// Reserved sky (a5-seeding-note §3)
// ---------------------------------------------------------------------------

/**
 * Stars held out of this cohort for Phase B's incubator worlds (act3-design.md
 * § Topology, Protected incubation). Held from SEEDING, PLACEMENT and VOYAGE
 * DESTINATIONS, and from nothing else: to every read path a reserved star is
 * ordinary empty sky, because a region a player can see is fenced is a leak
 * about content that does not exist yet.
 *
 * DERIVED, LIKE EVERY OTHER TRUTH IN THIS GAME. A pure function of the stored
 * `seedKey` and the stored star catalog, computed at read time and written
 * nowhere. No field on `Star`, no key in storage, no byte on the wire, no
 * migration, and no second copy of the answer free to disagree with the first.
 * Existing cohorts get their reserved set the moment this ships, derived from
 * what is already on disk.
 *
 * What it does NOT yet buy is the protection: a reserved star inside a 25 ly
 * sphere is a century by seedship, not "beyond practical reach". The stars are
 * held; the guarantee is Phase B's to build on top of them.
 */
export const RESERVED_STAR_COUNT = 6;

/** Reservations live in the outer shell: the incubation promise is about
 *  distance, so the carve-out starts where distance starts to mean something. */
export const RESERVE_MIN_RADIUS_FRACTION = 0.7;

/** Memoized on the CATALOG'S IDENTITY. `galaxy.stars` is the same array object
 *  across a derived fold, so the sort below runs once per Durable Object
 *  lifetime rather than once per guard. */
const RESERVED_CACHE = new WeakMap<readonly Star[], ReadonlySet<StarId>>();

/**
 * Which stars this cohort is holding. Keyed on `seedKey` and not on star id
 * alone: otherwise `st-0183` would be reserved in every cohort in the game,
 * which is a cross-cohort tell that survives any amount of care on the wire.
 *
 * SCATTERED, NOT CONTIGUOUS. A fenced volume is precisely the visible shape the
 * brief forbids, and Phase B needs a star per incubating world rather than a
 * region. Six stars drawn from the outer shell read as ordinary sparse sky from
 * every direction; the "region" that is reserved is the shell, and which six of
 * its stars are held is unguessable without the key.
 */
export function reservedStarIds(galaxy: Galaxy): ReadonlySet<StarId> {
  const cached = RESERVED_CACHE.get(galaxy.stars);
  if (cached !== undefined) return cached;
  const origin: Vec3Ly = { x: 0, y: 0, z: 0 };
  const inner = RESERVE_MIN_RADIUS_FRACTION * galaxy.config.radiusLy;
  const ids: ReadonlySet<StarId> = new Set(
    galaxy.stars
      .filter((s) => distanceLy(s.position, origin) >= inner)
      .map((s) => ({ star: s, key: createRng(`${galaxy.seedKey}/reserve/${s.id}`).next() }))
      .sort((a, b) => a.key - b.key || a.star.id.localeCompare(b.star.id))
      .slice(0, RESERVED_STAR_COUNT)
      .map((x) => x.star.id),
  );
  RESERVED_CACHE.set(galaxy.stars, ids);
  return ids;
}

/** Minimum separation between civilization home stars, in light-years. */
const MIN_CIV_SEPARATION_LY = 3;

function pickHomeStars(
  rng: Rng,
  stars: readonly Star[],
  count: number,
  reserved: ReadonlySet<StarId>,
): Star[] {
  const homes: Star[] = [];
  let attempts = 0;
  while (homes.length < count && attempts < count * 200) {
    attempts++;
    const candidate = rng.pick(stars);
    // A reserved star hosts nobody, so the draw simply spends an attempt on it
    // and moves on; the shell is thin enough that the seeding distribution does
    // not notice (about a fifth of a collision per cohort, measured).
    if (reserved.has(candidate.id)) continue;
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
function drawAgeBand(rng: Rng): AgeBand {
  const roll = rng.next();
  if (roll < 0.2) return "elder";
  if (roll < 0.45) return "young";
  return "peer";
}

/**
 * The galaxy's posture mix, per age band: P(bright). The sibling of
 * `drawAgeBand`, and the one knob that sets how much of the sky reads loud
 * (act3-design.md § The constraint that can be checked).
 *
 * The elder number is the expensive one: a bright elder shines from year zero
 * for the life of the cohort, where a bright young world is loudness that
 * ARRIVES during play, hours in, when it wakes. So the ancients are held to one
 * in twelve and the young are the mix's spending money.
 */
const BRIGHT_SHARE: Readonly<Record<AgeBand, number>> = {
  young: 0.25,
  peer: 0.12,
  elder: 0.08,
};

/** How many characters the chain may offer before the mix gives up and takes
 *  what it is given. Eight leaves under half a percent of civs off-target. */
const POSTURE_DRAW_ATTEMPTS = 8;

function drawPosture(rng: Rng, band: AgeBand): Posture {
  return rng.next() < BRIGHT_SHARE[band] ? "bright" : "dark";
}

/**
 * Draw until the catalog chain produces a character whose posture is the one
 * the galaxy wants. Each attempt is its own fork, so attempt k is a pure
 * function of (cohort, civ index, k) and the parent stream is untouched.
 *
 * THE MIX CHOOSES WHICH CIVILIZATIONS EXIST, NEVER WHAT A CIVILIZATION IS.
 * `civseed.ts` is not edited and `GenerateCivParams` gains no field: handing
 * the generator a target posture would produce dark Beacons and bright
 * Cloisters, contradicting the archetype's own charter and every downstream
 * reader that assumes character and posture agree (`charterPosture`,
 * `maskTierAt`, behavior.ts's wakings). Redrawing instead yields the chain's
 * own distribution conditioned on posture. A Beacon still shines; there are
 * simply fewer Beacons.
 */
function drawSeedWithPosture(rng: Rng, params: GenerateCivParams, want: Posture): CivSeed {
  let seed = generateCivSeed(rng.fork("posture/0"), params);
  for (let a = 1; a < POSTURE_DRAW_ATTEMPTS && seed.posture !== want; a++) {
    seed = generateCivSeed(rng.fork(`posture/${a}`), params);
  }
  return seed;
}

/**
 * Generate a full cohort neighborhood at game year `nowYear` (normally 0):
 * the star field and N seeded AI civilizations across the age spectrum.
 * No player civilization is placed at seed time (A1) — that placement
 * happens only when a real browser inherits, via `pickPlayerHome`.
 */
export function generateGalaxy(
  rng: Rng,
  seedKey: string,
  config: GalaxyConfig,
  nowYear: number,
): Galaxy {
  const stars = generateStarField(rng.fork("stars"), config);
  // The reserved set needs the key and the catalog, both of which exist by
  // now; the roster it will eventually sit beside is empty and irrelevant to
  // it. The same `stars` array goes into the galaxy below, so this warms the
  // memo the rest of the object's lifetime reads.
  const homes = pickHomeStars(
    rng.fork("placement"),
    stars,
    config.aiCivCount,
    reservedStarIds({ seedKey, config, stars, civs: [], acts: [] }),
  );

  const civs: PlacedCiv[] = [];
  for (let i = 0; i < config.aiCivCount; i++) {
    const home = homes[i];
    if (home === undefined) throw new Error("home star count mismatch");
    const civRng = rng.fork(`civ/ai-${i}`);
    const ageBand = drawAgeBand(civRng);
    const want = drawPosture(civRng, ageBand);
    civs.push({
      seed: drawSeedWithPosture(civRng, { id: `civ-ai-${i}`, ageBand, nowYear }, want),
      starId: home.id,
      controller: "ai",
    });
  }
  return { seedKey, config, stars, civs, acts: [] };
}

/** THE FRONTIER (act3-design.md § Topology: "new players and cohorts seed
 *  outward"). Every player already seated pushes the next joiner's minimum
 *  separation out by this much, so a cohort fills from the inside out and a
 *  late joiner's light-lag insulates them from established play. */
const FRONTIER_STEP_LY = 2;

/** Where the frontier stops growing, as a fraction of the neighborhood radius.
 *  Without it the eleventh joiner asks for a separation the sphere cannot
 *  supply and placement falls off the rim. */
const FRONTIER_CAP_FRACTION = 0.55;

/**
 * The star a real player's civilization would be placed at, were one to
 * inherit right now — the innermost star that is not an existing civ's home,
 * is not reserved, and clears the frontier floor. Placement itself (creating
 * the PlacedCiv) is the caller's job; this is the helper it calls. Returns
 * null if the neighborhood is full.
 *
 * THE FLOOR IS THE EXISTING RULE, GROWN. `MIN_CIV_SEPARATION_LY` was always
 * the separation a placement had to clear; the frontier raises it by a step per
 * seat and changes nothing else. At `seated === 0` the floor is the old
 * constant, the band is every eligible star, and the pick is the innermost one,
 * so the first player lands exactly where they always did.
 */
export function pickPlayerHome(galaxy: Galaxy): Star | null {
  const origin: Vec3Ly = { x: 0, y: 0, z: 0 };
  const reserved = reservedStarIds(galaxy);
  const homes = galaxy.civs.map((c) => starById(galaxy.stars, c.starId));
  const homeIds = new Set(homes.map((h) => h.id));

  // ISOLATION IS MEASURED AGAINST EVERY CIVILIZATION, seeded elder and seat and
  // somebody's founding alike. That is why colonies need no special handling:
  // they are in the derived roster, so they are already in the floor.
  const eligible = galaxy.stars
    .filter((s) => !homeIds.has(s.id) && !reserved.has(s.id))
    .map((star) => ({
      star,
      isolation: homes.reduce(
        (min, h) => Math.min(min, distanceLy(h.position, star.position)),
        Infinity,
      ),
      fromOrigin: distanceLy(star.position, origin),
    }))
    .filter((c) => c.isolation >= MIN_CIV_SEPARATION_LY);
  if (eligible.length === 0) return null;

  // How far out this joiner has to sit. Counted over SEATS, not civilizations —
  // a colony is not a new player, and it already pushes the frontier out by
  // being in `homes` above. `forget` drops a seat, so the frontier tracks
  // occupancy rather than history and a playtester who resets gets their seat
  // back rather than a place beyond it.
  const seated = galaxy.civs.filter((c) => c.controller === "player").length;
  const floor = Math.min(
    MIN_CIV_SEPARATION_LY + FRONTIER_STEP_LY * seated,
    FRONTIER_CAP_FRACTION * galaxy.config.radiusLy,
  );

  // Innermost star that clears the floor: outward, but no further out than the
  // frontier requires. The frontier is a floor and not a target, so a joiner
  // keeps the sky populated around them instead of being exiled to the rim,
  // which is what a plain farthest-first rule would do. Ties by star id, the
  // file's idiom (buildSurvey's sort). The fallback fires only for a cohort so
  // full that even the capped floor is unavailable, and it degrades to the
  // most isolated seat left rather than to null.
  const band = eligible.filter((c) => c.isolation >= floor);
  const ranked =
    band.length > 0
      ? band.sort((a, b) => a.fromOrigin - b.fromOrigin || a.star.id.localeCompare(b.star.id))
      : eligible.sort((a, b) => b.isolation - a.isolation || a.star.id.localeCompare(b.star.id));
  return ranked[0]?.star ?? null;
}

export function civById(galaxy: Galaxy, id: CivId): PlacedCiv {
  const civ = galaxy.civs.find((c) => c.seed.id === id);
  if (civ === undefined) throw new Error(`unknown civ: ${id}`);
  return civ;
}

/**
 * The civ placed at a star, if any (A2.2: cohort.ts needs this to mint a
 * LightCone for a study's target — DetectedSource drops targetId, so a
 * study's starId is the only handle back to the civ once it is wire-side).
 * Undefined rather than throwing: not every star hosts a civ.
 */
export function civAtStar(galaxy: Galaxy, starId: StarId): PlacedCiv | undefined {
  return galaxy.civs.find((c) => c.starId === starId);
}

/** Distance between two civilizations' home stars — the gameplay quantity. */
export function civDistanceLy(galaxy: Galaxy, a: CivId, b: CivId): number {
  const starA = starById(galaxy.stars, civById(galaxy, a).starId);
  const starB = starById(galaxy.stars, civById(galaxy, b).starId);
  return distanceLy(starA.position, starB.position);
}
