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

**How to use:** compose each generation as `STYLE BLOCK + FRAMING + one
SUBJECT PROMPT`. Portrait or square to taste; the subject prompts are
framing-agnostic. Each keys to a stable archetype id, which is the filename
slug (`tech/<id>.webp`), so the client resolves art by seed with no lookup
table beyond the id.

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
> A broad, bright array of protective megastructures — shields, watch-stations,
> and power collectors arranged like a sheltering canopy around something small
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
