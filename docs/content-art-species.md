# HOLOS — Content art
### Species plates — pregeneration prompt sheet (cinematic matte)

*One standalone prompt per intelligent lineage in the lifeform catalog
([`server/src/lineages.ts`](../server/src/lineages.ts),
[act1-lifeforms.md](./act1-lifeforms.md)), for pregenerating a mix-and-match
asset library. Content art (worlds, species, technology) is the
representational register decided in
[ui-design.md § Two registers of art](./ui-design.md) — its bans do **not**
come from [ui-image-brief.md](./ui-image-brief.md), which governs only the
austere interface. **No art is generated here — these are prompts only.***

**How to use:** generate the shared **STYLE ANCHOR** once (below), then compose
each render as `--sref <anchor> + STYLE BLOCK + FRAMING + one SUBJECT PROMPT`.
Render **every subject at both 1:1 (square) and 16:9 (widescreen)** — the
subject prompts are framing-agnostic and the FRAMING block covers how each crop
composes. Each subject keys to a stable lineage id; store the two crops as
`species/sq/SN.webp` and `species/wide/SN.webp` (the per-entry slug below is the
shared identity), so the client picks the ratio by layout and resolves art by
seed with no lookup table beyond the id. The per-subject `→ species/SN.webp`
notation below is the plate's identity slug, not a file path — each is stored
on disk as the two crops `species/sq/SN.webp` and `species/wide/SN.webp`.

---

## STYLE ANCHOR — generate once, reuse everywhere  *(shared across all three docs)*

**Adopted anchor:** [`concepts/00-content-style-anchor.png`](./concepts/00-content-style-anchor.png)
— feed this image as the `--sref` (Midjourney) or style-reference input for
every plate in all three docs. Warm ember planet over a cool moonlight-cyan
structure: it carries the palette (ember = warm/alive, cyan = your own works)
as well as the rendering. The prompt below is what produced it, kept for
reference and regeneration.

![The adopted content-art style anchor — the sref for the whole library](./concepts/00-content-style-anchor.png)

The whole library shares **one** style anchor, not one per axis: a style
reference carries *look*, not subject, so a single anchor is what keeps worlds,
species, and technology reading as one product when they composite on a card.
Generate it once, then feed it as `--sref` (Midjourney) or the equivalent
image-style input to every prompt in all three docs. If the anchor tries to
force its own composition onto a single-subject render, lower the style weight
(`--sw 50–80`); raise it if the look drifts.

> **STYLE ANCHOR PROMPT** — A style reference sheet for a hard-science-fiction
> art library: three small studies with generous dark space between them on one
> near-black (#070B12) field — at top a painterly planet seen from orbit, its
> curved terminator catching a dim ember sun; at center a lone alien creature as
> a museum specimen study, anatomically plausible, lit from one side; at the
> bottom a single compact megastructure in space, its own works picked out in
> faint moonlight-cyan (#9FC4CC). All three in identical cinematic
> matte-painting rendering — painterly yet photoreal, fine filmic grain, deep
> shadow, volumetric depth, muted and desaturated but for ember-amber (#D08A4A)
> warmth and moonlight-cyan construction. Solemn, elegiac, deep-time restraint.
> No text, labels, UI, borders, people, or watermark. Render at 1:1 and 16:9.

Once you have a plate you love in *this* axis, keep it as the axis's **framing
exemplar** — a secondary reference for pose / scale / orbit conventions, chained
alongside the master anchor. That locks composition within the axis without
introducing a second *style*.

---

## STYLE BLOCK  *(identical in all three content-art docs — edit them together)*

> Cinematic matte painting in the style of high-end film concept art and
> natural-history documentary stills — painterly yet physically photoreal:
> real light, real materials, atmospheric depth, fine surface detail, a faint
> filmic grain. Low-key dramatic lighting from a single dominant source; deep
> shadow; volumetric haze. Muted, desaturated palette anchored in near-black
> (#070B12) and warm off-white (#E8E4DA); color is meaning, used sparingly —
> ember-amber (#D08A4A) for whatever is warm, alive, or radiant, and
> moonlight-cyan (#9FC4CC) reserved strictly for a civilization's OWN works
> and bio-light. Solemn, elegiac, deep-time mood; immense stillness; restraint
> over spectacle; hard-science-fiction plausibility throughout. No text,
> letters, numerals, UI, HUD, diagrams, arrows, or borders; no neon, lens
> flare, or bloom; no cartoon, anime, or video-game-render look; no people or
> human artifacts; no watermark or signature.

## ISOLATION — one subject, neutral ground  *(the mix-and-match rule)*

> ONE SUBJECT ONLY, centered on a neutral cinematic ground so it composites
> cleanly onto either partner layer. Do not paint the other two layers: a
> **species** plate shows the organism with NO planet in the sky and NO
> structures or tools. A shallow suggestion of its immediate living medium
> (water, haze, rock, ice, soil) is allowed at its base, fading fast to deep
> near-black void. Never a full populated environment or landscape.

## FRAMING — species

> A full-body specimen study: the single organism centered and complete,
> anatomically coherent, filling most of the frame in a three-quarter or
> profile view, lit like a museum diorama. Alien but biologically plausible —
> evolved, not designed; no anthropomorphic posing, no clothing, no tools, no
> weapons. A creature, studied, on the dark.
>
> Render both crops: **1:1** frames the specimen head-to-foot, centered;
> **16:9** keeps the creature centered with dark space to either side (room for
> the wide card and layout). Same organism, same pose — only the surrounding
> void changes.

---

## Subject prompts

#### S1 · Tentacled cephalopodan  → `species/S1.webp`
> A large soft-bodied cephalopod-like organism, radial-to-bilateral, with many
> prehensile arms fanned mid-undulation; iridescent chromatophore skin rippling
> with shifting patterns of color — its language made visible; large, luminous,
> intelligent eyes. Suspended in dark water fading to void. Boneless, graceful,
> a distributed self.

#### S2 · Song-culture pelagic  → `species/S2.webp`
> A large, streamlined pelagic swimmer, whale-like but wholly alien —
> fin-limbs built to swim and sing, no hands anywhere, a broad domed cranium
> housing an outsized brain, sound-emitting structures ridging its flanks.
> Rendered mid-song in dark open water. Majestic, hand-less, deeply cultured.

#### S3 · Clawed benthic exoskeletal  → `species/S3.webp`
> A segmented, exoskeletal benthic organism, part-crustacean in logic: a low
> armored body, jointed legs, and fine clawed manipulating limbs, built to
> crawl the sea floor and haul out onto vent-rock. Chitinous plating,
> chemoreceptive antennae. On dark wet stone fading to void. A plated builder.

#### S4 · Electro-sensing abyssal  → `species/S4.webp`
> A deep-abyssal organism built for crushing pressure and total dark: a smooth
> bilateral body, reduced or absent eyes, sensory organs for electroreception
> ridging its flanks, a faint bioelectric glimmer around it. Suspended in
> lightless black water. Sightless, patient, pressure-built.

#### S5 · Colonial reef superorganism  → `species/S5.webp`
> A sessile reef superorganism: a single large colonial structure of countless
> specialized polyps grown together into one body, coral-like but subtly
> purposive, faint chemical bioluminescence pulsing across it. On dark sea
> floor fading to void. Motionless, distributed — one mind grown as a reef.

#### S6 · Erect generalist  → `species/S6.webp`
> An erect, bilateral, upright terrestrial animal with freed forelimbs ending
> in fine manipulating digits, forward-facing eyes, an expressive vocal build —
> a generalist tool-user's body plan, clearly not human and not primate, its
> own evolutionary line. Standing on bare dark ground fading to void.

#### S7 · Heavy-world multiped  → `species/S7.webp`
> A low, broad, powerfully built multiped adapted to crushing gravity: many
> sturdy weight-bearing legs, a hunkered armored body close to the ground, one
> or two limb-pairs refined into manipulators, tactile seismic sensory pits. On
> heavy dark stone fading to void. Massive, deliberate, ground-hugging.

#### S8 · Twilight-band migratory  → `species/S8.webp`
> A lean, long-limbed bilateral animal built for endless migration along a
> world's thin twilight band: heat-shedding on one flank, insulated on the
> other, large thermal-sensing eye-pits reading the day-night gradient.
> Mid-stride on dim ground fading to void. Wayfaring, hardy.

#### S9 · Winged grasping flyer  → `species/S9.webp`
> A winged aerial-terrestrial flyer, alien to any bird: broad membranous wings,
> grasping feet or a freed limb-pair for handling, keen forward eyes, built to
> soar far and land to build. Wings spread mid-glide against dark air fading to
> void. Far-seeing, wide-ranging.

#### S10 · Buoyant aerial drifter  → `species/S10.webp`
> A permanently airborne organism, a living gasbag: a translucent buoyant
> lift-body trailing sensory and feeding tendrils, radial-to-modular, drifting
> slow. Suspended in dim opaque haze fading to void. Weightless, ghostly,
> unhurried — a creature that never lands.

#### S11 · Eusocial hive superorganism  → `species/S11.webp`
> A eusocial colony's specialized castes shown together as one organism: a
> small manipulator-caste worker, a bulk laborer, a sensory caste, rendered as
> a coherent chemically-bound set — the colony IS the individual. Insectile but
> alien, on dark ground fading to void. Many bodies, one purpose.

#### S12 · Networked substrate mind  → `species/S12.webp`
> A networked substrate mind: a vast root-and-mycelial web threading dark soil
> and stone, faint chemo-electric signals traveling its filaments, nodal
> swellings where thought concentrates — no discrete body anywhere, the network
> itself the organism. A section lifted onto void. A mind with no face.

#### S13 · Aggregative modular organism  → `species/S13.webp`
> An aggregative modular organism caught mid-assembly: scattered small units
> flowing together into a larger transient body, part slime-mold, part
> siphonophore — a form that masses into one creature and disperses again.
> Half-gathered against dark ground fading to void. Provisional, resilient.

#### S14 · Obligate symbiotic composite  → `species/S14.webp`
> An obligate symbiotic pair rendered as one organism: a large hand-less
> cognition creature (finned, song-built) joined to a small clawed manipulator
> partner riding and working with it — two species, one mind, neither whole
> alone. Together in dark water fading to void. Interdependent, plural.

#### S15 · Blind seismic-thermal burrower  → `species/S15.webp`
> A blind subsurface burrower: a robust bilateral digger with reduced or
> vestigial eyes, powerful digging limbs doubling as manipulators, thermal- and
> seismic-sensing organs across its head. On broken dark earth fading to void.
> Sightless, tunnel-built, patient — a mind from below.

#### S16 · Chemo-lithic vent grazer  → `species/S16.webp`
> A chemo-lithic vent grazer: a low, slow, chemosynthetic organism clustered on
> mineral-crusted hydrothermal rock, feeding on vent chemistry, indifferent to
> light, faint warmth shimmering around it. On dark vent-stone fading to void.
> Place-bound, ancient, sunless.

#### S17 · Cryogenic slow-mind  → `species/S17.webp`
> A cryogenic slow-mind organism from a methane world: a low, slow-growing body
> built on ethane-methane chemistry rather than water, pale and frost-rimed,
> its metabolism so slow it seems almost still, a faint thermal glow at its
> core. On dark hydrocarbon ice fading to void. Glacial, patient, alien in
> tempo.

#### S18 · Radiation-hardened extremophile  → `species/S18.webp`
> A radiation-hardened surface extremophile: a heavily shielded animal,
> mineral-armored and darkly pigmented, thick-walled and squat, built to endure
> a sky that burns. On bright-scoured dark ground fading to void. Armored,
> weathered, sun-defiant.

#### S19 · High-temperature mineral life  → `species/S19.webp`
> High-temperature mineral life: a deeply alien organism of hot carbon-rich,
> part-mineral substance, crystalline and slaggy, glowing internally with heat,
> grown in melt and rock — no surface existence, cognition on a mineral tempo.
> On dark glowing crust fading to void. The far edge of the possible.

#### S20 · Photovore  → `species/S20.webp`
> A photovore: a part-photosynthetic, mobile organism, half-animal, half-plant —
> broad light-gathering vanes it spreads to bask, root-feet to anchor, a slow
> gait to chase a dim red sun. On dim ground fading to void. Gentle,
> light-hungry, unhurried — a creature that eats light.
