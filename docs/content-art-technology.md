# HOLOS — Content art
### Technology plates — pregeneration prompt sheet (cinematic matte)

*One standalone prompt per waking-mind archetype in the minds catalog
([`server/src/minds.ts`](../server/src/minds.ts),
[act2-minds.md](./act2-minds.md)), for pregenerating a mix-and-match asset
library. The archetype's `ladderLean` (energy → bright megastructures /
integration → compact quiet works) and `defaultPosture` (bright / dark) drive
the look. Content art is the representational register decided in
[ui-design.md § Two registers of art](./ui-design.md) — its bans do **not**
come from [ui-image-brief.md](./ui-image-brief.md), which governs only the
austere interface. **No art is generated here — these are prompts only.***

**How to use:** generate the shared **STYLE ANCHOR** once (below), then compose
each render as `--sref <anchor> + STYLE BLOCK + FRAMING + one SUBJECT PROMPT`.
Render **every subject at both 1:1 (square) and 16:9 (widescreen)** — the
subject prompts are framing-agnostic and the FRAMING block covers how each crop
composes. Each subject keys to a stable archetype id; store the two crops as
`tech/sq/<id>.webp` and `tech/wide/<id>.webp` (the per-entry slug below is the
shared identity), so the client picks the ratio by layout and resolves art by
seed with no lookup table beyond the id. (Each subject line below is tagged
`→ tech/<id>.webp` — that notation names the plate's identity slug, not a
file on disk; on disk each plate is stored as the two crops above, under
`sq/` and `wide/`.)

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
> **technology** plate shows the works with NO creatures and NO identifiable
> home planet (a dimmed or partial star, or bare space, is fine as the thing
> the works act upon). The ground is deep, near-black space. A built object,
> never a landscape.

## FRAMING — technology

> A single hero structure — the civilization's signature work — centered in
> space or low orbit against near-black, its scale implied by the fineness of
> its detail rather than by any reference object. Moonlight-cyan marks its own
> construction; ember-amber marks whatever it makes radiant. Real materials and
> real optics; a built thing, engineered and vast, not a natural formation.
>
> Render both crops: **16:9** sets the structure against a wide sweep of empty
> space; **1:1** frames it tighter and more iconic. Same object and scale cues
> in both — only the negative space changes.

---

## Subject prompts

*Energy-lean archetypes build **bright and large**; integration-lean build
**compact and quiet**. Posture (bright/dark) sets how much it radiates.*

#### beacon · The Beacon — energy / bright  → `tech/beacon.webp`
> A vast, radiant Dyson swarm partway built around a bright star: countless
> orbiting collectors catching and re-radiating light, deliberately luminous,
> beaming energy and signal outward for anyone to see. Warm ember-gold blaze
> laced with cyan-marked structure; grand, open, unmistakable — a civilization
> that shines on purpose.

#### tide · The Tide — energy / bright  → `tech/tide.webp`
> A star system being dismantled for material: a bright industrial megastructure
> tearing a planet down into orbital rings of processed matter, swarms of
> self-replicating harvesters working the rubble, everything treated as
> feedstock. Blazing and sprawling, ember-hot with cyan machinery — a
> civilization consuming its own system to cross the dark.

#### monument · The Monument — integration / dark  → `tech/monument.webp`
> A compact, dark vault-structure sealed tight around a deliberately dimmed
> star's core: a near-lightless obsidian shell radiating only faint infrared
> warmth, its surface fine cyan filigree — an archive-fortress, a civilization
> folded into its own tomb. Severe, funereal, immense; almost invisible against
> the black.

#### cloister · The Cloister — integration / dark  → `tech/cloister.webp`
> A single dense, quiet compute-heart in deep space: a tight, dark, coherent
> structure drawn inward around one cold luminous core, radiating almost
> nothing, ringed by thin cyan lattice. No sprawl, no broadcast — a whole
> civilization held as one mind, owing the sky nothing. Restrained,
> self-contained, nearly dark.

#### shepherd · The Shepherd — energy / bright  → `tech/shepherd.webp`
> A broad, bright array of protective megastructures — watch-stations and
> power collectors arranged like a sheltering canopy around something small
> and unseen below. Strong ember-gold light and cyan structure, but turned
> outward as guardianship rather than display. Powerful, watchful, benevolent.

#### sowing · The Sowing — energy / dark  → `tech/sowing.webp`
> A silent fleet of self-replicating seedships dispersing from a darkened
> staging structure: countless small dark craft fanning out into the black,
> running cold and quiet, the spent husk left behind. Minimal ember drive-glow,
> cyan-flecked hulls — expansion without announcement. Vast, patient, unlit.

#### herald · The Herald — integration / bright  → `tech/herald.webp`
> A compact dark core wrapped in a single luminous transmitting structure: an
> inward-folded civilization that has turned itself into a broadcast — a great
> cyan-and-ember antenna-array radiating its archive and its song outward in a
> directed beam. Small in mass, loud in signal — a message built to outlast its
> makers.

#### engine · The Engine — either / dark  → `tech/engine.webp`
> A cold, industrial megastructure feeding a single dark computational core:
> its home system stripped and funneled inward as raw power, no ceremony, no
> warmth — only throughput. Dim ember furnace-glow buried deep inside, hard cyan
> machinery without. Ruthless, utilitarian, sacred to nothing but the work.

#### congress · The Congress — mixed / bright  → `tech/congress.webp`
> A loose, bright constellation of many linked structures — no single core, a
> plurality of distinct habitats and works negotiating as equals, joined by
> luminous cyan tethers. Warm, open, communicative — a civilization built as a
> congress of selves rather than one will. Plural, welcoming, mixed in its
> means.

#### phoenix · The Phoenix — integration / dark  → `tech/phoenix.webp`
> A compact dark structure caught mid-rebirth: an old shell being shed and
> consumed as a newer cyan-lit core rises from within it, the past folded
> inward and burned to feed the next self. Ember embers of the discarded form,
> cool cyan of the new. Cyclic, inward, self-renewing — a civilization that
> keeps becoming.

---

## Deferred subject — the refused path

The ten plates above key to the waking-mind archetype ids in
`server/src/minds.ts`, which is why the **Refuser** — not a waking-mind
archetype — has no plate yet. Its signature work, the **throne world**
(technology.md §VII: a `LIVING WORLD` wearing `BROADCAST LEAKAGE`, the
brightest and most legible object in any sky), is among the most
distinctive visual subjects in the catalog. When the refused path gets an
id on player surfaces, it earns a plate here: a living capital blazing
ember-warm and cyan-built, hiding nothing, its visibility a founding
document rather than a failure.
