// Destination worlds — what is actually at a star, and what may be believed
// about it before anyone has been (A4, a4-voyages-note.md §3/§4).
//
// TWO TABLES, ONE OF THEM PUBLIC. `destinationWorldAt` is TRUTH: a world
// class, an origin cradle and a yield band, drawn from a stream seeded on
// `${seedKey}/world/${starId}` and therefore stable forever, for every
// observer, at every year. `ARRIVAL_PRIOR` is BELIEF: a distribution over the
// three world classes conditioned on the star's SPECTRAL CLASS and on nothing
// else. The spectral class is already public (it rides the star catalog the
// client is welcomed with), so the forecast survey built on this table reads
// no truth at all and cannot be made to.
//
// The two are sampled at two different times, which is the whole design: the
// forecast is the prior, the landfall is the draw, and the gap between them is
// what a voyage is actually spending decades to close. Nothing here reads a
// civilization, an emission history or a light cone; the knowledge layer gates
// this module's truth half through `peekWorld` (knowledge.ts), and a caller
// with no cone is structurally unable to ask.
//
// NO CLOCK, NO STORAGE, NO GALAXY MUTATION. Every function is pure and total.

import { CRADLES, SPAWN_RELATIVE_WEIGHT, cradleById, type Cradle } from "./cradles";
import type { Galaxy, SpectralClass, StarId } from "./galaxy";
import { starById } from "./galaxy";
import { createRng } from "./rng";

/** What a ship finds when it gets there. */
export type WorldClass = "barren" | "marginal" | "living";

/** How much a rooted colony has to work with, in three steps. */
export type YieldBand = 0 | 1 | 2;

export interface DestinationWorld {
  readonly starId: StarId;
  readonly worldClass: WorldClass;
  /** The cradle catalog row this world reads as (the drift compass). */
  readonly cradleId: number;
  readonly yieldBand: YieldBand;
}

/** In-world names for the three classes, so no caller spells them itself. */
export const WORLD_CLASS_LABEL: Readonly<Record<WorldClass, string>> = {
  barren: "BARREN",
  marginal: "MARGINAL",
  living: "LIVING",
};

/**
 * The arrival spread: P(world class | spectral class), a4-voyages-note §4's
 * table verbatim. A TUNING OBJECT and recorded as one (the note's risk 3): the
 * M-dwarf row governs three quarters of the field, so moving it moves the
 * whole game's sense of where it is worth sending anything.
 */
export const ARRIVAL_PRIOR: Readonly<
  Record<SpectralClass, Readonly<Record<WorldClass, number>>>
> = {
  M: { barren: 0.62, marginal: 0.3, living: 0.08 },
  K: { barren: 0.45, marginal: 0.35, living: 0.2 },
  G: { barren: 0.4, marginal: 0.32, living: 0.28 },
  F: { barren: 0.55, marginal: 0.33, living: 0.12 },
};

/** The three classes in the order every surface reads them. */
export const WORLD_CLASSES: readonly WorldClass[] = ["barren", "marginal", "living"];

/**
 * How tight the forecast is, as a chip rather than a number. A VISIBLE SOURCE
 * FORCES `WIDEST` at the call site (voyages.ts's survey): something is already
 * living there, the prior is about a world nobody has claimed, and the honest
 * reading of a prior that no longer applies is "we do not know".
 */
export type WidthChip = "NARROW" | "WIDE" | "WIDEST";

export function widthChipFor(prior: Readonly<Record<WorldClass, number>>): WidthChip {
  let peak = 0;
  for (const cls of WORLD_CLASSES) peak = Math.max(peak, prior[cls]);
  if (peak >= 0.6) return "NARROW";
  if (peak >= 0.4) return "WIDE";
  return "WIDEST";
}

/** A prior read as a word. Bands, never percentages: the survey is a guess
 *  about a place nobody has been, and a percentage would dress it as a
 *  measurement. */
export type PriorBand = "unlikely" | "possible" | "likely";

export function priorBandFor(share: number): PriorBand {
  if (share < 0.2) return "unlikely";
  if (share < 0.4) return "possible";
  return "likely";
}

/**
 * Which cradle rows this star could be hosting. `any` admits every star (the
 * catalog's own wildcard); `binary` and `none` admit none of them, because
 * this galaxy's stars are single main-sequence bodies and a starless cradle is
 * by definition not at a star. Total by construction: every one of the four
 * spectral classes has at least one same-class row, and the four `any` rows
 * back that up.
 */
function cradlePoolFor(cls: SpectralClass): readonly Cradle[] {
  const pool = CRADLES.filter((c) => c.hostClass === cls || c.hostClass === "any");
  return pool.length > 0 ? pool : CRADLES;
}

/**
 * The yield a rooted colony inherits, from the world it landed on and the
 * difficulty of the cradle that world reads as. Deterministic and dice-free:
 * the draw already happened upstream (world class and cradle), and this is
 * arithmetic on its result.
 */
function yieldBandFor(worldClass: WorldClass, tier: number): YieldBand {
  if (worldClass === "barren") return 0;
  if (worldClass === "living") return tier <= 3 ? 2 : 1;
  return tier <= 2 ? 2 : tier <= 4 ? 1 : 0;
}

/**
 * THE TRUTH DRAW, stable forever. Seeded on the cohort seed key and the star
 * id and on nothing else, so it does not move when a voyage is launched, when
 * a colony roots, or when the clock advances: two ships aimed at one star find
 * the same world, and a re-derivation years later finds it again.
 *
 * Reads no civilization and no emission history. Occupancy is a separate
 * question, answered at the fold in voyages.ts against the roster.
 */
export function destinationWorldAt(g: Galaxy, starId: StarId): DestinationWorld {
  const star = starById(g.stars, starId);
  const rng = createRng(`${g.seedKey}/world/${starId}`);
  const prior = ARRIVAL_PRIOR[star.spectralClass];
  const worldClass = rng.weighted(WORLD_CLASSES, (cls) => prior[cls]);
  const cradle = rng.weighted(cradlePoolFor(star.spectralClass), (c) =>
    SPAWN_RELATIVE_WEIGHT[c.spawnWeight],
  );
  return {
    starId,
    worldClass,
    cradleId: cradle.id,
    yieldBand: yieldBandFor(worldClass, cradle.tier),
  };
}

/** The cradle row a destination world reads as. Throws on an id the catalog
 *  does not hold, which cannot happen: the only producer is the draw above. */
export function cradleOfWorld(world: DestinationWorld): Cradle {
  const cradle = cradleById(world.cradleId);
  if (cradle === undefined) throw new Error(`unknown cradle: ${world.cradleId}`);
  return cradle;
}
