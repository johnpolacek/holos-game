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
// callings (what a people does). 664 heads x 398 tails = 264,272 pairings.
//
// Both lists are append-only in spirit: the pools are what a cohort's names
// are drawn from, so a removal changes names already inherited. Run
// `npm run audit:names` after any edit — it enforces the shape rules, the
// no-duplicates rule, and the constraint that binds: the longest possible
// pairing must still fit MAX_NAME_LEN.

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
  "Crust", "Strata", "Bedrock", "Cavern", "Grotto", "Quarry", "Furrow", "Terrace",
  "Talus", "Moraine", "Mesa", "Butte", "Steppe", "Tundra", "Dune", "Karst",
  "Fissure", "Crevice", "Rubble", "Shingle", "Pebble", "Cobble", "Hillock", "Knoll",
  "Trench", "Shaft", "Basin", "Hummock", "Summit", "Saddle", "Crater", "Caldera",
  "Fault", "Nickel", "Zinc", "Pewter", "Ingot", "Billet", "Gilt", "Verdigris",
  "Patina", "Ochre", "Umber", "Cinnabar", "Malachite", "Jasper", "Agate", "Opal",
  "Topaz", "Beryl", "Garnet", "Amethyst", "Alabaster", "Porphyry", "Feldspar", "Mica",
  "Talc", "Gypsum", "Nitre", "Sulfur", "Bitumen", "Naphtha", "Ocean", "Wash",
  "Sluice", "Weir", "Levee", "Channel", "Estuary", "Firth", "Skerry", "Atoll",
  "Islet", "Cape", "Headland", "Strand", "Shore", "Coast", "Cascade", "Cataract",
  "Whirlpool", "Maelstrom", "Billow", "Breaker", "Crest", "Trough", "Ebb", "Neap",
  "Freshet", "Runnel", "Culvert", "Cistern", "Blizzard", "Flurry", "Cyclone", "Typhoon",
  "Vortex", "Downpour", "Cloudburst", "Stratus", "Cumulus", "Cirrus", "Nimbus", "Lightning",
  "Rainbow", "Corona", "Solstice", "Equinox", "Meridian", "Horizon", "Firmament", "Sirocco",
  "Mistral", "Thermal", "Updraft", "Downdraft", "Chill", "Bonfire", "Pyre", "Brazier",
  "Furnace", "Crucible", "Bellows", "Foundry", "Cauldron", "Smoke", "Fume", "Glare",
  "Dazzle", "Sheen", "Luster", "Radiance", "Candle", "Taper", "Wick", "Fuse",
  "Firelight", "Scintilla", "Afterglow", "Phosphor", "Lumen", "Glint", "Quasar", "Pulsar",
  "Nebula", "Perigee", "Apogee", "Parallax", "Ecliptic", "Cluster", "Penumbra", "Radiant",
  "Zodiac", "Starfall", "Lodestar", "Polestar", "Aphelion", "Ellipse", "Sundial", "Daybreak",
  "Nightfall", "Gloaming", "Orchard", "Meadow", "Pasture", "Harvest", "Tendril", "Rootstock",
  "Taproot", "Seedling", "Sapling", "Timber", "Heartwood", "Sapwood", "Driftwood", "Willow",
  "Alder", "Birch", "Rowan", "Aspen", "Cedar", "Hazel", "Holly", "Juniper",
  "Laurel", "Myrtle", "Sorrel", "Clover", "Thistle", "Heather", "Gorse", "Furze",
  "Nectar", "Chestnut", "Tendon", "Vertebra", "Skull", "Spine", "Femur", "Gullet",
  "Artery", "Ligament", "Cartilage", "Fleece", "Bristle", "Quill", "Whisker", "Mane",
  "Hackle", "Clutch", "Brood", "Swarm", "Flock", "Herd", "Molt", "Pupa",
  "Larva", "Nymph", "Carapace", "Mandible", "Cellar", "Sanctum", "Reliquary", "Ossuary",
  "Catacomb", "Rotunda", "Portico", "Colonnade", "Buttress", "Lintel", "Cornice", "Gable",
  "Eaves", "Rafter", "Truss", "Girder", "Joist", "Plinth", "Frieze", "Alcove",
  "Niche", "Corridor", "Stairwell", "Turret", "Parapet", "Battlement", "Palisade", "Stockade",
  "Bulwark", "Redoubt", "Citadel", "Aqueduct", "Causeway", "Viaduct", "Litany", "Canticle",
  "Requiem", "Elegy", "Refrain", "Cadence", "Antiphon", "Benison", "Blessing", "Charm",
  "Talisman", "Amulet", "Effigy", "Icon", "Emblem", "Banner", "Standard", "Pennant",
  "Cipher", "Codex", "Tablet", "Scroll", "Archive", "Chronicle", "Legend", "Fable",
  "Parable", "Proverb", "Riddle", "Lament", "Threnody", "Paean", "Anthem",
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
  "shipwrights", "wheelwrights", "millwrights", "ropers", "riveters", "solderers", "platers", "finishers",
  "polishers", "lacquerers", "varnishers", "enamelers", "inlayers", "veneerers", "planers", "chiselers",
  "sculptors", "modelers", "founders", "blowers", "bakers", "brewers", "distillers", "millers",
  "maltsters", "vintners", "curers", "salters", "smokers", "picklers", "preservers", "nurturers",
  "rearers", "cradlers", "swaddlers", "comforters", "consolers", "solacers", "easers", "restorers",
  "renewers", "revivers", "quickeners", "sustainers", "providers", "nourishers", "shelterers", "harborers",
  "welcomers", "greeters", "ushers", "custodians", "curators", "marshals", "rangers", "scouts",
  "outriders", "pickets", "lookouts", "beaconers", "signalers", "warners", "patrollers", "gatekeepers",
  "firekeepers", "lampkeepers", "voyagers", "crossers", "traversers", "pathmakers", "roadmakers", "bridgers",
  "circlers", "returners", "homecomers", "sojourners", "nomads", "trekkers", "ramblers", "learners",
  "teachers", "questioners", "ponderers", "wonderers", "musers", "thinkers", "reasoners", "calculators",
  "counters", "numberers", "measurers", "gaugers", "surveyors", "sounders", "probers", "testers",
  "provers", "verifiers", "doubters", "skeptics", "debaters", "arrangers", "composers", "patterners",
  "planners", "drafters", "sketchers", "tracers", "balancers", "levelers", "aligners", "tuners",
  "tighteners", "fasteners", "fishers", "fowlers", "trappers", "snarers", "netters", "beekeepers",
  "goatherds", "swineherds", "cowherds", "milkers", "shearers", "grazers", "orchardists", "vinedressers",
  "gardeners", "weeders", "mulchers", "waterers", "irrigators", "terracers", "drainers", "lighters",
  "brighteners", "roasters", "firers", "scorchers", "searers", "glowers", "sparkers", "forgetters",
  "buriers", "entombers", "enshriners", "honorers", "venerators", "blessers", "anointers", "consecrators",
  "absolvers", "atoners", "pardoners", "forgivers", "redeemers", "ransomers", "swimmers", "waders",
  "dredgers", "bailers", "paddlers", "anchorers", "moorers", "launchers", "wreckers", "salvagers",
  "rescuers",
] as const;

// Phrase names (prose-style.md §5): witty phrase-length proper names, a
// self-contained quip as a name, with zero borrowed names. Every entry passes
// N-1..N-5: ≤ MAX_NAME_LEN (24) chars including spaces, Title Case,
// letters/spaces/comma/apostrophe only, original in words and cadence, reads
// as a name and not an error string.
//
// NOT a civilization-name flavor. A civilization is a people across deep
// time, and a quip reads as a joke told once rather than a name a species
// carries for ten thousand years — the compound lexicon above is the whole
// civ pool. This list is kept for *instance* names: ships and structures
// (technology.md — "a beam battery called `Louder Than Necessary` is exactly
// the register"), where a one-off quip is the point. Unused until that lands.
export const NAME_PHRASES = [
  // Polite menace (M7)
  "Politely Enormous", "Do Sit Down", "After You, Truly",
  "No Sudden Movements", "Do Watch Your Step", "We Insist, Gently",
  "Terribly Sorry", "As You Wish, Of Course", "Kindly Step Aside",
  "We'd Rather You Didn't",
  // Bureaucratic deadpan (Engine)
  "Terms And Conditions", "Pending Review", "Noted And Filed",
  "See Attached", "Per My Last Signal", "Awaiting Your Reply",
  "Filed Under Later", "Subject To Change", "Escalated Upward",
  "In Triplicate", "Duly Recorded", "Approved In Principle",
  "Forms In Duplicate",
  // Deep-time shrug (M9)
  "A Rounding Error", "Give It An Age", "Eventually, Yes",
  "The Long Way Round", "Any Century Now", "Barely A Moment",
  "Give Or Take An Age", "Roughly Forever", "In A Geological Sense",
  "Later, Then", "A Brief Ten Millennia", "Not Yet, Not Nearly",
  // Understatement (M2)
  "Not The Loud Kind", "Present Tense Only", "Somewhat Inevitable",
  "Slightly Overqualified", "Fairly Sure", "A Bit Much, Perhaps",
  "Quietly Effective", "Somewhat Larger", "A Touch Excessive",
  // Committee humor (Congress)
  "Ask Me Again Later", "Tabled For Now", "One Voice Against",
  "Motion Carried", "Under Advisement", "Some Of Us Object",
  "Provisionally, Yes", "We Shall Deliberate", "Vote Still Pending",
  "A Split Decision", "One Abstention", "Quorum Achieved",
  // Cheerful appetite (Tide)
  "Cheaper To Rebuild", "All Of It, Ideally", "Room For More",
  "Still Peckish", "Second Helping", "More, If You Please",
  "A Growing Appetite", "Everything, Eventually", "Bring The Rest",
  "Hungry, Frankly",
  // Self-deprecation (Phoenix)
  "We'll See About That", "Better Than Before", "New, Mostly",
  "Wiser Now, Allegedly", "Regret Nothing, Nearly", "Yesterday's Idea",
  "Learning As We Go", "Mostly Rebuilt", "Nobody's Fault, Really",
  // Beacon
  "Louder Than Necessary", "Yes, That Was Us", "Hard To Miss",
  "Someone Had To", "Unmistakably Present", "The Bright One",
  "Impossible To Ignore",
  // Monument
  "Kept, All Of It", "Nothing Discarded", "We Keep The Rest",
  "Still On File", "Nothing Thrown Away", "Every Last Detail",
  // Herald
  "Bright, Regrettably", "Loud And Sealed", "Shouting Quietly",
  "Open, Yet Not", "Both, Somehow",
  // Cloister
  "Still Doing The Math", "Not Hiding, Exactly", "The Door Stays Shut",
  "No Visitors, Thanks", "Sealed, On Purpose", "Working On It",
  // Shepherd
  "You Never Saw Us", "For Your Own Good", "Watching, Kindly",
  "Best Left Unseen",
  // Sowing
  "Everywhere, Discreetly", "Best Not Say Where", "Rather Not Say",
  "More Of Us, Elsewhere",
] as const;

export function generateCivName(rng: Rng): string {
  // One pool: a head+tail compound. Deterministic by seed via rng.
  return `${rng.pick(NAME_HEADS)}${rng.pick(NAME_TAILS)}`;
}
