// The civilization name lexicon — presentational vocabulary, like dials.ts.
//
// Lives in its own dependency-free module so the client may receive it as a
// value (re-exported through protocol.ts) without pulling any truth-side
// code into the bundle: the ceremony's name-suggestion chips compose from
// the same word lists the generator uses, so suggested names and generated
// names speak one language.
//
// Register: short, concrete, evocative English — earth, water, weather, fire,
// growth, bone, stone, sign. Heads are nouns; tails are plural agentive
// callings (what a people does). 377 heads x 229 tails.

import type { Rng } from "./rng";

export const NAME_HEADS = [
  "Stone", "Seed", "Tide", "Deep", "Ember", "Salt", "Iron", "Frost",
  "Vault", "Song", "Root", "Glass", "Ash", "Hollow", "Dawn", "Rift",
  "Rock", "Scree", "Slate", "Shale", "Flint", "Chert", "Basalt", "Granite",
  "Marble", "Quartz", "Chalk", "Clay", "Loam", "Silt", "Sand", "Grit",
  "Gravel", "Dust", "Cinder", "Soot", "Char", "Coal", "Peat", "Marl",
  "Gneiss", "Schist", "Obsidian", "Pumice", "Geode", "Ore", "Vein", "Lode",
  "Seam", "Cairn", "Crag", "Boulder", "Gorge", "Bluff", "Scarp", "Ledge",
  "Tor", "Fell", "Ridge", "Peak", "Cliff", "Chasm", "Cleft", "Gap",
  "Bronze", "Copper", "Tin", "Steel", "Brass", "Gold", "Silver", "Lead",
  "Cobalt", "Rust", "Slag", "Dross", "Crystal", "Amber", "Jet", "Onyx",
  "Pearl", "Coral", "Bone", "Horn", "Ivory", "Shell", "Chitin", "Resin",
  "Pitch", "Tar", "Wax", "Brine", "Alloy", "Wave", "Surge", "Swell",
  "Foam", "Spray", "Spume", "Flood", "Deluge", "Torrent", "Rill", "Brook",
  "Stream", "Creek", "Beck", "Burn", "River", "Delta", "Fjord", "Sound",
  "Strait", "Bay", "Cove", "Inlet", "Lagoon", "Marsh", "Fen", "Bog",
  "Mire", "Slough", "Moor", "Mere", "Tarn", "Loch", "Spring", "Well",
  "Font", "Eddy", "Current", "Ripple", "Drift", "Wake", "Undertow", "Reef",
  "Shoal", "Shallow", "Fathom", "Rain", "Sleet", "Hail", "Snow", "Rime",
  "Ice", "Thaw", "Mist", "Fog", "Haze", "Cloud", "Storm", "Gale",
  "Squall", "Tempest", "Gust", "Breeze", "Wind", "Zephyr", "Thunder", "Bolt",
  "Dew", "Drizzle", "Shower", "Monsoon", "Drought", "Aurora", "Welkin", "Sky",
  "Rack", "Murk", "Gloom", "Vapor", "Flame", "Blaze", "Spark", "Flare",
  "Glow", "Glimmer", "Gleam", "Shimmer", "Beam", "Ray", "Dusk", "Twilight",
  "Gloam", "Shade", "Shadow", "Umbra", "Eclipse", "Halo", "Light", "Flicker",
  "Kindle", "Scorch", "Sear", "Smoulder", "Wisp", "Tinder", "Torch", "Star",
  "Sun", "Moon", "Comet", "Meteor", "Nova", "Void", "Abyss", "Dark",
  "Night", "Noon", "Zenith", "Nadir", "Orbit", "Sphere", "Cosmos", "Aeon",
  "Epoch", "Pole", "Axis", "Verge", "Brink", "Ether", "Sprout", "Shoot",
  "Stalk", "Stem", "Leaf", "Frond", "Bough", "Branch", "Bark", "Sap",
  "Bloom", "Blossom", "Petal", "Thorn", "Briar", "Bramble", "Nettle", "Bracken",
  "Fern", "Moss", "Lichen", "Ivy", "Vine", "Reed", "Rush", "Sedge",
  "Grass", "Hay", "Straw", "Chaff", "Husk", "Grain", "Sheaf", "Bud",
  "Burr", "Cone", "Spore", "Pollen", "Grove", "Copse", "Thicket", "Glade",
  "Dell", "Weald", "Holt", "Bower", "Wood", "Vale", "Glen", "Heath",
  "Marrow", "Sinew", "Blood", "Pulse", "Breath", "Hide", "Fur", "Feather",
  "Plume", "Wing", "Talon", "Claw", "Fang", "Tusk", "Antler", "Hoof",
  "Scale", "Fin", "Gill", "Roe", "Spawn", "Nest", "Hive", "Comb",
  "Web", "Silk", "Cocoon", "Nerve", "Heart", "Maw", "Pelt", "Down",
  "Spire", "Tower", "Arch", "Gate", "Wall", "Keep", "Hold", "Hall",
  "Crypt", "Tomb", "Barrow", "Mound", "Henge", "Pillar", "Column", "Beacon",
  "Lantern", "Forge", "Kiln", "Hearth", "Anvil", "Loom", "Wheel", "Mill",
  "Bridge", "Span", "Road", "Path", "Ford", "Pass", "Notch", "Warren",
  "Burrow", "Den", "Lair", "Bastion", "Rampart", "Threshold", "Hymn", "Chant",
  "Dirge", "Ode", "Verse", "Rune", "Glyph", "Mark", "Sign", "Sigil",
  "Token", "Oath", "Vow", "Word", "Name", "Echo", "Hush", "Whisper",
  "Murmur", "Knell", "Toll", "Chime", "Bell", "Peal", "Dream", "Vigil",
  "Watch", "Ward", "Relic", "Shard", "Trace", "Omen", "Rite", "Creed",
  "Psalm",
] as const;

export const NAME_TAILS = [
  "binders", "weavers", "keepers", "wardens", "singers", "shapers", "tenders", "reckoners",
  "menders", "delvers", "callers", "sowers", "makers", "forgers", "smiths", "wrights",
  "carvers", "masons", "builders", "spinners", "tanners", "potters", "coopers", "fletchers",
  "smelters", "refiners", "gilders", "etchers", "engravers", "scribers", "kindlers", "stokers",
  "turners", "joiners", "framers", "riggers", "benders", "welders", "tinkers", "glaziers",
  "casters", "molders", "knitters", "stitchers", "splicers", "plaiters", "braiders", "knotters",
  "temperers", "quenchers", "honers", "whetters", "grinders", "cutters", "hewers", "borers",
  "setters", "layers", "raisers", "healers", "fosterers", "shepherds", "herders", "drovers",
  "breeders", "tamers", "feeders", "gentlers", "soothers", "calmers", "stillers", "warders",
  "guardians", "shielders", "defenders", "sentinels", "watchers", "wakers", "rousers", "stirrers",
  "seekers", "finders", "searchers", "questers", "wanderers", "roamers", "rovers", "wayfarers",
  "walkers", "striders", "treaders", "runners", "chasers", "hunters", "trackers", "stalkers",
  "followers", "leaders", "guiders", "steerers", "sailors", "mariners", "rowers", "ferriers",
  "divers", "miners", "diggers", "climbers", "scalers", "leapers", "vaulters", "gliders",
  "drifters", "riders", "porters", "bearers", "slingers", "throwers", "reapers", "gleaners",
  "gatherers", "harvesters", "threshers", "winnowers", "tillers", "plowers", "planters", "pruners",
  "grafters", "foragers", "storers", "hoarders", "garnerers", "rooters", "cullers", "pickers",
  "criers", "heralds", "speakers", "tellers", "sayers", "chanters", "reciters", "readers",
  "writers", "scribes", "namers", "markers", "sealers", "witnesses", "weighers", "mappers",
  "plotters", "charters", "seers", "dreamers", "augurs", "diviners", "chroniclers", "rememberers",
  "mourners", "keeners", "wailers", "breakers", "shatterers", "sunderers", "cleavers", "splitters",
  "renders", "fellers", "crushers", "splinterers", "biters", "gnawers", "quellers", "dousers",
  "holders", "wielders", "bringers", "traders", "burnishers", "veilers", "maskers", "oracles",
  "prophets", "sages", "elders", "hermits", "pilgrims", "palmers", "conjurers", "summoners",
  "banishers", "reavers", "harrowers", "harriers", "hallowers", "shrouders", "gravers", "kenners",
  "acolytes", "votaries", "limners", "beckoners", "beguilers", "enchanters", "charmers", "embalmers",
  "riddlers", "harpers", "bards", "skalds", "mystics", "ascetics", "anchorites", "penitents",
  "supplicants", "celebrants", "fullers", "dyers", "chandlers", "wainwrights", "cordwainers", "thatchers",
  "hedgers", "warreners", "foresters", "verderers", "stewards",
] as const;

export function generateCivName(rng: Rng): string {
  return `${rng.pick(NAME_HEADS)}${rng.pick(NAME_TAILS)}`;
}
