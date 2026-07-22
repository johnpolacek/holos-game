// The cradle catalog — Act 1 starting worlds, as typed data.
//
// This is the `Cradle` record act1-cradles.md flags under "Data shape
// (for when this leaves Markdown)", realized. act1-cradles.md remains the
// source of truth for the fiction; this file is the machine-readable
// projection of its master table (worlds) and its cradle -> candidate
// lineage table.
//
// Server-authoritative content: the Room assigns a cradle at session zero.
// It intentionally does NOT live in protocol.ts (wire messages only). When
// session zero ships, the wire message that hands a player their cradle is
// what gets added to protocol.ts; a `Cradle` (or a view of one) travels in
// that message. Lineage (act1-lifeforms.md) and waking-mind (act2-minds.md)
// records are the next catalogs to leave Markdown the same way.

/** Difficulty tier I–V (act1-cradles.md, "Difficulty tiers"). */
export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

/** How common the world-type is under real occurrence rates; drives the draw. */
export type SpawnWeight = "common" | "uncommon" | "rare" | "very-rare";

/** Whether the entry is a real named world or an extrapolated archetype. */
export type CradleBasis = "real" | "extrapolated";

/** Coarse host-star class for generation and filtering. */
export type HostStarClass = "M" | "K" | "G" | "F" | "binary" | "any" | "none";

/** Intelligent-lineage ids from act1-lifeforms.md (S1–S20). */
export type LineageId =
  | "S1" | "S2" | "S3" | "S4" | "S5"
  | "S6" | "S7" | "S8" | "S9" | "S10"
  | "S11" | "S12" | "S13" | "S14" | "S15"
  | "S16" | "S17" | "S18" | "S19" | "S20";

export interface Cradle {
  /** Stable id 1–40, matching the act1-cradles.md master table row. */
  readonly id: number;
  /** Display name. */
  readonly name: string;
  /** Host star as written in the catalog (e.g. "M8 ultracool", "none"). */
  readonly host: string;
  /** Coarse host class for the generator; the primary class where mixed. */
  readonly hostClass: HostStarClass;
  /** World-type archetype label (master table "Class" column). */
  readonly archetype: string;
  readonly tier: DifficultyTier;
  readonly spawnWeight: SpawnWeight;
  readonly basis: CradleBasis;
  /** The detection or the world is contested in the literature (kept honest). */
  readonly disputed: boolean;
  /** Candidate lineages this cradle can raise, likeliest first. */
  readonly candidateLineages: readonly LineageId[];
  /** One line: the pressure that shapes what survives and what it builds. */
  readonly fingerprint: string;
}

/** Human-readable tier names (act1-cradles.md, "Difficulty tiers"). */
export const TIER_NAMES: Record<DifficultyTier, string> = {
  1: "Gentle",
  2: "Temperate",
  3: "Testing",
  4: "Harsh",
  5: "Brutal",
};

/**
 * Relative draw weight per spawn class. Illustrative starting values — the
 * pool skews toward Testing/Harsh because those world-types are common,
 * not because the tier is targeted directly (act1-cradles.md, open
 * question on weighting-vs-difficulty).
 */
export const SPAWN_RELATIVE_WEIGHT: Record<SpawnWeight, number> = {
  common: 8,
  uncommon: 4,
  rare: 2,
  "very-rare": 1,
};

export const CRADLES: readonly Cradle[] = [
  {
    id: 1,
    name: "TRAPPIST-1e",
    host: "TRAPPIST-1, M8 ultracool dwarf",
    hostClass: "M",
    archetype: "Terminator terrestrial",
    tier: 3,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S8", "S6"],
    fingerprint:
      "Life in a thin livable band under a huge dim sun that never moves; six sister worlds hang close, so astronomy is native.",
  },
  {
    id: 2,
    name: "TRAPPIST-1f",
    host: "TRAPPIST-1, M8 ultracool dwarf",
    hostClass: "M",
    archetype: "Eyeball ocean",
    tier: 4,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S1", "S4", "S20"],
    fingerprint:
      "An eyeball ocean: a warm meltwater pupil facing the sun, ice everywhere else; life pools where the light lands.",
  },
  {
    id: 3,
    name: "Proxima Centauri b",
    host: "Proxima Centauri, M5.5 flare star",
    hostClass: "M",
    archetype: "Flare terminator",
    tier: 5,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S15", "S8", "S18"],
    fingerprint:
      "Life under a dangerous sky, sheltering from flares in caves, deep water, or shadow. The lesson written into everything: do not be exposed.",
  },
  {
    id: 4,
    name: "LHS 1140 b",
    host: "LHS 1140, M4.5 quiet dwarf",
    hostClass: "M",
    archetype: "Dense super-Earth",
    tier: 4,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S7", "S3"],
    fingerprint:
      "A crushing high-pressure world under a calm sun; nothing stands tall and orbit is a nearly impossible height to climb.",
  },
  {
    id: 5,
    name: "Ross 128 b",
    host: "Ross 128, unusually quiet M4 dwarf",
    hostClass: "M",
    archetype: "Temperate terminator",
    tier: 2,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S6", "S8"],
    fingerprint:
      "A red-dwarf world that got lucky: steady light, a survivable sky, time to develop without constant catastrophe.",
  },
  {
    id: 6,
    name: "TOI-700 d",
    host: "TOI-700, quiet M2 dwarf",
    hostClass: "M",
    archetype: "Ocean terminator",
    tier: 3,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S1", "S3", "S2"],
    fingerprint:
      "A mild waterworld under a steady red sun: global seas, weather driven by the eternal day-night contrast.",
  },
  {
    id: 7,
    name: "Teegarden's Star b",
    host: "Teegarden's Star, old quiet M7 ultracool dwarf",
    hostClass: "M",
    archetype: "Dim ancient temperate",
    tier: 3,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S20", "S12"],
    fingerprint:
      "An ancient world under a faint ancient star: deep time, little energy, a civilization that grows slow, patient, thrifty with light.",
  },
  {
    id: 8,
    name: "GJ 667 Cc",
    host: "GJ 667 C, M1.5 dwarf in a triple system",
    hostClass: "M",
    archetype: "Super-Earth, three suns",
    tier: 3,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S6", "S9"],
    fingerprint:
      "A world with three suns and no true darkness; a civilization that always knew it was not alone in the heavens.",
  },
  {
    id: 9,
    name: "Kepler-186f",
    host: "Kepler-186, M1 dwarf",
    hostClass: "M",
    archetype: "Cold-edge Earth-size",
    tier: 4,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S15", "S16", "S20"],
    fingerprint:
      "A cold-edge world clinging to the far habitable rim; life gathers around geothermal warmth and equatorial thaw. Heat is scarce.",
  },
  {
    id: 10,
    name: "Gliese 12 b",
    host: "Gliese 12, cool quiet M dwarf",
    hostClass: "M",
    archetype: "Warm-edge terminator",
    tier: 3,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S8", "S6"],
    fingerprint:
      "A warm terminator world where the day side runs hot; life tracks the shifting margin where water stays liquid.",
  },
  {
    id: 11,
    name: "Luyten b (GJ 273 b)",
    host: "Luyten's Star, quiet M3.5 dwarf",
    hostClass: "M",
    archetype: "Temperate super-Earth",
    tier: 3,
    spawnWeight: "common",
    basis: "real",
    disputed: false,
    candidateLineages: ["S7", "S6"],
    fingerprint:
      "A steady, weighty world with a fixed sun and no single savage pressure; endurance over drama.",
  },
  {
    id: 12,
    name: "K2-18 b",
    host: "K2-18, M2.5 dwarf",
    hostClass: "M",
    archetype: "Hycean (H₂ ocean)",
    tier: 5,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S1", "S4", "S10"],
    fingerprint:
      "A drowned civilization under a hydrogen sky it can never see through; the road to space skips fire entirely.",
  },
  {
    id: 13,
    name: "Terminator storm world",
    host: "M dwarf",
    hostClass: "M",
    archetype: "Storm-belt terminator",
    tier: 4,
    spawnWeight: "common",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S8", "S7", "S15"],
    fingerprint:
      "A world of endless terminator storms where the only calm is the lee of terrain; built low, braced, and wind-wise.",
  },
  {
    id: 14,
    name: "Eyeball ice world",
    host: "M dwarf",
    hostClass: "M",
    archetype: "Substellar meltpool",
    tier: 4,
    spawnWeight: "common",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S1", "S4", "S20"],
    fingerprint:
      "All life in one sunlit eye of open water, hemmed by ice on every side; a crowded origin with nowhere to spread.",
  },
  {
    id: 15,
    name: "Tidally-heated moon",
    host: "M dwarf; a gas giant's moon",
    hostClass: "M",
    archetype: "Volcanic moon",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S16", "S3", "S4"],
    fingerprint:
      "Life around volcanic vents keyed to the giant that fills half the sky; chemistry, not sunlight, is the source of everything.",
  },
  {
    id: 16,
    name: "Metal-poor drowned world",
    host: "M or K dwarf, metal-poor",
    hostClass: "M",
    archetype: "Land-less ice-floored ocean",
    tier: 5,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S1", "S2", "S3"],
    fingerprint:
      "An aquatic, mineral-poor civilization that never had rock, fire, or metal within reach; technology invented from biology and water alone.",
  },
  {
    id: 17,
    name: "Kepler-442b",
    host: "Kepler-442, K5 dwarf",
    hostClass: "K",
    archetype: "Temperate super-Earth",
    tier: 2,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S6", "S7", "S11"],
    fingerprint:
      "A stable, weighty, well-lit world with days and seasons; close to Earth's rhythm, heavy enough to remember it is not Earth.",
  },
  {
    id: 18,
    name: "Kepler-62f",
    host: "Kepler-62, K2 dwarf",
    hostClass: "K",
    archetype: "Cool water world",
    tier: 3,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S1", "S3", "S2"],
    fingerprint:
      "A deep cool sea-world with little or no land; life spread through a single planetary ocean, ice defining the livable latitudes.",
  },
  {
    id: 19,
    name: "HD 40307 g",
    host: "HD 40307, quiet K2.5 dwarf",
    hostClass: "K",
    archetype: "Rotating super-Earth",
    tier: 3,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S7", "S6", "S11"],
    fingerprint:
      "A rotating super-Earth with proper days, seasons, and continents under heavy gravity; life low-slung and strong.",
  },
  {
    id: 20,
    name: "40 Eridani A b",
    host: "40 Eridani A, K0.5 dwarf in a triple system",
    hostClass: "K",
    archetype: "Temperate super-Earth",
    tier: 2,
    spawnWeight: "rare",
    basis: "real",
    disputed: true,
    candidateLineages: ["S6", "S9"],
    fingerprint:
      "A temperate world with an uncanny stellar pair in the sky, a nearby white dwarf that once was a sun: a permanent reminder that stars die.",
  },
  {
    id: 21,
    name: "Cold-edge desert world",
    host: "K or M dwarf, outer habitable zone",
    hostClass: "K",
    archetype: "Arid frost-line desert",
    tier: 4,
    spawnWeight: "common",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S11", "S15", "S6"],
    fingerprint:
      "A desert pushed to the frost line: every drop is counted, life clusters at ice margins and meltwater springs, conservation baked in from the first cell.",
  },
  {
    id: 22,
    name: "The temperate twin",
    host: "K or G dwarf",
    hostClass: "K",
    archetype: "Near-Earth garden",
    tier: 1,
    spawnWeight: "very-rare",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S6", "S9", "S11", "S1", "S14"],
    fingerprint:
      "The blue marble the galaxy rarely makes: land and sea both, a legible sky; life diversifies freely, inheriting abundance and options.",
  },
  {
    id: 23,
    name: "Kepler-452b",
    host: "Kepler-452, aging G2 star",
    hostClass: "G",
    archetype: "Warming old-Earth",
    tier: 4,
    spawnWeight: "rare",
    basis: "real",
    disputed: false,
    candidateLineages: ["S6", "S11"],
    fingerprint:
      "A civilization racing a warming sun, a biosphere that peaked and is now being cooked from above; the future is visibly finite.",
  },
  {
    id: 24,
    name: "Kepler-22b",
    host: "Kepler-22, G5 star",
    hostClass: "G",
    archetype: "Sunlit ocean world",
    tier: 3,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S1", "S3", "S5"],
    fingerprint:
      "A warm world-ocean under a familiar yellow sun, continents absent: an aquatic civilization with a clear view of the stars. Rare, and important.",
  },
  {
    id: 25,
    name: "Tau Ceti f",
    host: "Tau Ceti, metal-poor G8 star with a thick debris disk",
    hostClass: "G",
    archetype: "Bombarded super-Earth",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S7", "S15", "S11"],
    fingerprint:
      "A world under regular bombardment from its own crowded system, its crust metal-lean; shaped by catastrophe from the sky and scarcity in the ground.",
  },
  {
    id: 26,
    name: "55 Cancri e",
    host: "55 Cancri A, G8 star",
    hostClass: "G",
    archetype: "Molten carbon lava world",
    tier: 5,
    spawnWeight: "rare",
    basis: "real",
    disputed: false,
    candidateLineages: ["S19", "S16"],
    fingerprint:
      "Life, if any, is subsurface and heat-loving in a carbon-rich crust under a sky of rock vapor: forged in fire and carbon, alien in its chemistry.",
  },
  {
    id: 27,
    name: "Runaway-greenhouse-edge world",
    host: "G or K dwarf",
    hostClass: "G",
    archetype: "Hot inner-margin world",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S18", "S15", "S11"],
    fingerprint:
      "A civilization of the cool corners, heat-fleeing, altitude- and pole-dwelling; its whole history a negotiation with a suffocating sky.",
  },
  {
    id: 28,
    name: "UV-scoured F-star world",
    host: "F-type star (bright, hot, high-UV, short-lived)",
    hostClass: "F",
    archetype: "High-UV terrestrial",
    tier: 4,
    spawnWeight: "rare",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S18", "S15", "S1"],
    fingerprint:
      "A civilization that evolved under a burning sky, driven to shade, ozone, and water, racing a star that will die young.",
  },
  {
    id: 29,
    name: "Bright super-Earth",
    host: "F or early-G star, metal-rich",
    hostClass: "F",
    archetype: "Rich heavy world",
    tier: 3,
    spawnWeight: "rare",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S6", "S9", "S11"],
    fingerprint:
      "A world of abundance under a demanding sun: heavy, bright, mineral-rich; a civilization that grows expansive and energetic, racing the star's short life.",
  },
  {
    id: 30,
    name: "Kapteyn b",
    host: "Kapteyn's Star, ~11 Gyr M1 halo subdwarf, extremely metal-poor",
    hostClass: "M",
    archetype: "Ancient metal-poor relic",
    tier: 4,
    spawnWeight: "rare",
    basis: "real",
    disputed: true,
    candidateLineages: ["S12", "S7", "S6"],
    fingerprint:
      "A relic world older than most of the galaxy's stars, patient beyond measure, mineral-starved; age is the defining fact.",
  },
  {
    id: 31,
    name: "Barnard's Star b",
    host: "Barnard's Star, old metal-poor quiet M4 dwarf",
    hostClass: "M",
    archetype: "Cold metal-poor sub-Earth",
    tier: 5,
    spawnWeight: "uncommon",
    basis: "real",
    disputed: false,
    candidateLineages: ["S15", "S16", "S17"],
    fingerprint:
      "A frigid, low-gravity relic scraping by on geothermal warmth and thin air: small and enduring, holding on rather than reaching out.",
  },
  {
    id: 32,
    name: "Circumbinary world (Kepler-16 type)",
    host: "A close K + M binary; the world orbits both",
    hostClass: "binary",
    archetype: "Two-sun world",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S9", "S13", "S6"],
    fingerprint:
      "Two suns out of step, seasons that never repeat, life adapted to irregularity itself; a sky that taught it the heavens are plural.",
  },
  {
    id: 33,
    name: "Super-Mercury (iron world)",
    host: "Any; often metal-rich G/K",
    hostClass: "any",
    archetype: "Iron world",
    tier: 5,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S7", "S15"],
    fingerprint:
      "A great ball of iron and rock: abundant metal, scarce water and air, a savage gravity well; metallurgy is native, everything else a fight.",
  },
  {
    id: 34,
    name: "Carbon world",
    host: "A carbon-rich star (C/O ratio > 1)",
    hostClass: "any",
    archetype: "Graphite/diamond world",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S19", "S17", "S16"],
    fingerprint:
      "A civilization of carbon and hydrocarbons, diamonds underfoot and tar in the low places, oxygen a rarity; biology and technology start alien.",
  },
  {
    id: 35,
    name: "Coreless silicate world",
    host: "M or K dwarf",
    hostClass: "M",
    archetype: "Unshielded low-density",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S18", "S15", "S1"],
    fingerprint:
      "A civilization under an unshielded sky, sheltering from radiation, its air thinning over eons; the surface is dangerous and space is worse.",
  },
  {
    id: 36,
    name: "Subsurface-ocean ice world",
    host: "Any; often a moon, heated by tides or radionuclides",
    hostClass: "any",
    archetype: "Buried vent ocean",
    tier: 5,
    spawnWeight: "common",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S4", "S16", "S1"],
    fingerprint:
      "A sealed civilization grown in total darkness around vents; it has to discover the sky exists before it can dream of reaching it.",
  },
  {
    id: 37,
    name: "Titan-analog haze world",
    host: "Any; a cold outer-system world",
    hostClass: "any",
    archetype: "Hydrocarbon-sea world",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S17", "S10"],
    fingerprint:
      "A civilization of the deep cold, breathing haze, sailing methane seas, its chemistry glacially slow; patience and cold are its native conditions.",
  },
  {
    id: 38,
    name: "High-obliquity world",
    host: "G or K dwarf",
    hostClass: "G",
    archetype: "Extreme-seasons world",
    tier: 4,
    spawnWeight: "uncommon",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S13", "S9", "S2"],
    fingerprint:
      "A civilization built on migration and cycle, keyed to violent seasons; change, not stability, is the baseline it evolved to expect.",
  },
  {
    id: 39,
    name: "Rogue / geothermal world (Stevenson planet)",
    host: "None; warmth is entirely geothermal",
    hostClass: "none",
    archetype: "Starless geothermal",
    tier: 5,
    spawnWeight: "rare",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S16", "S4", "S15"],
    fingerprint:
      "A civilization that arose in permanent darkness with no concept of a sun; piercing its atmosphere is a first-contact with the cosmos itself.",
  },
  {
    id: 40,
    name: "Crushing super-Earth",
    host: "K or G dwarf (the star isn't the problem; the gravity is)",
    hostClass: "K",
    archetype: "High-gravity flagship",
    tier: 4,
    spawnWeight: "common",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S7", "S11", "S3"],
    fingerprint:
      "Built low and heavy, flight and spaceflight brutally expensive, the sky a ceiling more than an invitation; leaving is the hardest thing it will do.",
  },
];

/** Look up a cradle by its catalog id (1–40), or undefined if none. */
export function cradleById(id: number): Cradle | undefined {
  return CRADLES.find((c) => c.id === id);
}
