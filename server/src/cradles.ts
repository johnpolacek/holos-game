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
  /** Stable id 1–41, matching the act1-cradles.md master table row. */
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
      "A thin livable band under a fixed dim sun; six sister worlds make astronomy native.",
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
      "An eyeball ocean: open water facing the sun, ice everywhere else, life pooled there.",
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
      "Life shelters from flares in caves, water, or shadow. The lesson: do not be exposed.",
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
      "Crushing pressure under a calm sun; nothing stands tall, and orbit is nearly unreachable.",
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
      "A red-dwarf world that got lucky: steady light, a survivable sky, time to develop.",
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
      "Global seas under a steady red sun; the fixed day-night contrast drives the weather.",
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
      "An ancient world under a faint star: little energy, and growth slow and thrifty.",
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
      "Three suns and no true night: the sky was never a single star.",
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
      "A world on the cold habitable rim; life gathers at geothermal warmth and equatorial thaw.",
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
      "A warm terminator world, day side hot; life tracks the margin where water stays liquid.",
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
      "A weighty world under a fixed sun, no single savage pressure; endurance over drama.",
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
      "A drowned civilization under an opaque hydrogen sky; its road to space skips fire.",
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
      "Storms without end; the only calm is the lee of terrain, so it builds low.",
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
      "All life in one sunlit pool, hemmed by ice; crowded, with nowhere to spread.",
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
      "Life at volcanic vents worked by the giant overhead; chemistry, not sunlight, feeds everything.",
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
      "An aquatic world without rock, fire, or metal; technology comes from biology and water.",
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
      "A stable, well-lit world with days and seasons; Earth's rhythm at heavier gravity.",
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
      "A cool sea-world with little land: one planetary ocean, ice setting the livable latitudes.",
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
      "A rotating super-Earth: days, seasons, continents, and heavy gravity that keeps life low.",
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
      "A temperate world with a white dwarf in its sky: proof that stars die.",
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
      "A desert at the frost line: every drop is counted, life clusters at meltwater springs.",
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
      "The rare blue marble: land and sea both, a legible sky, life free to diversify.",
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
      "A warming sun and a biosphere past its peak; the future is visibly finite.",
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
      "A warm world-ocean under a yellow sun: no continents, and a clear view of the stars.",
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
      "Regular bombardment from a crowded system, and a metal-lean crust: catastrophe above, scarcity below.",
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
      "Under a sky of rock vapor, life, if any, is subsurface and carbon-built.",
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
      "Life keeps to the poles and the heights, under a suffocating, overheated sky.",
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
      "It evolved under a burning sky, driven to shade and water, racing a short-lived star.",
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
      "Heavy, bright, and mineral-rich under a short-lived sun: abundance, and a clock on it.",
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
      "Older than most of the galaxy's stars, and mineral-starved: age is the defining fact.",
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
      "Frigid, low-gravity, thin-aired, warmed only from below; it endures rather than reaches.",
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
      "Two suns out of step and seasons that never repeat; life adapted to irregularity itself.",
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
      "A ball of iron and rock: metallurgy is native; water, air, and escape are not.",
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
      "Diamond underfoot, tar in the low places, oxygen rare; biology and technology start alien.",
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
      "An unshielded sky, air thinning over eons; the surface is dangerous and space is worse.",
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
      "Sealed under ice in total darkness; it must discover the sky exists before reaching it.",
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
      "Deep cold, haze overhead, methane seas, and a chemistry that runs slow.",
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
      "Violent seasons and constant migration; change, not stability, is the baseline here.",
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
      "Permanent darkness, warmth from below, no concept of a sun; the sky is a discovery.",
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
      "A gravity well so deep that flight is costly, and leaving hardest of all.",
  },
  {
    id: 41,
    name: "The century orbit",
    host: "G or K dwarf; a world flung wide by ancient migration",
    hostClass: "G",
    archetype: "Eccentric long-winter world",
    tier: 5,
    spawnWeight: "rare",
    basis: "extrapolated",
    disputed: false,
    candidateLineages: ["S17", "S15"],
    fingerprint:
      "A year lasts a century: one furious summer, then a dark it sleeps through.",
  },
];

/** Look up a cradle by its catalog id (1–40), or undefined if none. */
export function cradleById(id: number): Cradle | undefined {
  return CRADLES.find((c) => c.id === id);
}
