# HOLOS
### UI image-generation brief — mobile-first concept screens

*A copy-paste handoff for an image generator (Midjourney, DALL·E, Flux,
Ideogram, etc.): a reusable style block, an avoid block, and one
self-contained prompt per key screen from [ui-design.md](./ui-design.md).
These produce concept mockups for art-direction exploration — not
production UI, not pixel specs.*

---

## How to use

1. **One screen per image.** Compose each generation as
   `STYLE BLOCK + one SCREEN PROMPT + AVOID BLOCK`.
2. **Portrait phone framing.** Use a tall aspect ratio — `9:16` (or
   `9:19.5` if supported; Midjourney: `--ar 9:16`). Every prompt below
   already asks for a full-bleed phone screen, no device bezel.
3. **Consistency.** Generate the **style tile** (screen 0) first; if the
   tool supports style reference / seed reuse (Midjourney `--sref`,
   locked seeds), reference it in all later screens so the set reads as
   one product.
4. **Text will be wrong.** Image models mangle words; treat all rendered
   text as greeked placeholder and judge type *scale, weight, and
   rhythm*, not spelling. Ideogram/Flux handle short labels best if
   exact words matter.
5. The palette and type here are the **working art-direction proposal**
   (flagged in ui-design.md's open questions) — iterate on the style
   block freely; the screen prompts' *content* comes from ui-design.md
   and should stay stable.

---

## THE STYLE BLOCK (prefix every prompt with this)

> Mobile game UI concept, full-bleed portrait smartphone screen, no
> device frame, no hands. Dark astronomical interface: near-black
> blue-charcoal background (#070B12) with subtle astrophotography grain,
> matte surfaces, hairline 1px dividers, enormous quiet black space. The
> aesthetic of a beautifully typeset book crossed with a scientific
> instrument — editorial, restrained, contemplative; closer to a poetry
> app than a sci-fi HUD. Typography-led: an elegant editorial serif for
> prose in warm off-white (#E8E4DA), a clean geometric grotesque in
> muted slate (#8A93A6) for small data labels and chips, tabular
> numerals for clocks; large type, very few words, generous line
> spacing. Color is information and appears sparingly: soft ember-amber
> glow (#D08A4A) for anything warm or alive in the sky, pale moonlight
> cyan (#9FC4CC) for the player's own civilization, everything else
> monochrome. Soft radial glows, no gloss, no glassmorphism, no
> gradients-for-decoration. Single column, one-thumb layout, decisions
> rise as bottom sheets. Calm, precise, museum-grade graphic design.
> Flat vector-crisp UI over softly rendered astronomical imagery.

## THE AVOID BLOCK (append to every prompt)

> Avoid: sci-fi HUD clutter, neon cyberpunk, glowing blue holograms,
> hexagon motifs, circuit patterns, lens flare, chrome or glass panels,
> busy dashboards, progress-bar spam, red notification badges, cartoon
> style, photorealistic 3D render look, spaceships, aliens, robots,
> human figures, device bezel, watermarks.

---

## Screen prompts

### 0 — Style tile (generate first, use as style reference)

> Design-system sample sheet for this interface on one phone screen: a
> column of specimen components floating on the dark background — a
> paragraph of serif prose; a small slate label chip reading "AS OF 31 Y
> AGO"; a paired clock reading "31 H · ≈370 Y"; a horizontal dial: a
> soft pale band with a bright notch mark inside it; a blurred
> amber-glowing smudge with "71%" beside it; a thin ring drawn
> three-quarters closed around the words "HOLD TO SEND"; two stacked
> choice cards, one cool slate-toned, one warm ember-edged. Arranged
> like a minimal type-specimen poster.

### 1 — Session zero: the world reveal

> Opening screen: the upper two-thirds is a planet resolving out of
> darkness — a tidally-locked world lit by a huge dim red-amber sun, a
> thin habitable twilight band between a scorched hemisphere and an ice
> hemisphere, rendered soft and painterly, seen from high orbit. Below
> it, one quiet card: a large empty name field marked by a thin
> underline cursor, three small lines of planetary data in slate
> grotesque, and a small stark label reading "TIER IV — HARSH". No
> buttons visible except one subtle text link at the bottom: "an easier
> world". Immense stillness.

### 2 — Act 1: the beat, decision moment

> A painterly vignette fills the top half: primitive ocean life under a
> red sun at the shoreline of a dark sea, grainy and atmospheric. Rising
> over its lower edge, a bottom sheet with three tappable choice cards
> in a vertical stack: two cards in cool slate tones (patient,
> garden-like choices) each with a serif line of text and a small word
> "LIKELY" or "UNCERTAIN" in grotesque caps; one card edged in warm
> ember with slightly hotter background (a rare bold intervention)
> marked "LONG SHOT". The cards feel like letterpress slips, not
> buttons.

### 3 — Act 1: the roll

> A full-screen held-breath moment: everything dark except the center,
> where a single horizontal odds band glows softly — a pale segment
> covering about two-thirds of its length, a hot ember segment the rest
> — and a small bright marker falling toward it in mid-air, motion-
> blurred slightly. One serif line above: the choice being risked. Below,
> tiny slate text: "evolution decides". The feel of a die in the air
> over felt, translated to minimal graphic design.

### 4 — The pivot: the character sheet reveal

> Ceremony screen: five horizontal dials stacked with generous spacing,
> each a soft pale range band with a bright cyan notch landed inside it,
> labels in small caps at each end ("REACH — DEPTH", "VOICE — SILENCE").
> The third dial is mid-animation: its notch trailing a faint comet line
> as it settles. Along the right edge, a thin vertical timeline of tiny
> moments — small dots and dashes — with two dots lit ember,
> hair-lined to the settling dial. At the top, one serif sentence in
> large type, the first words a newborn mind speaks. Dark, reverent,
> museum-lighting.

### 5 — Act 2: the report

> A reading screen, typography-led: a long scrolling letter in elegant
> serif on the dark background, written by an immense calm intelligence,
> broken into short scene-paragraphs. Between paragraphs, slim inline
> cards: one showing a tiny system-map thumbnail with an amber ring
> filling in, captioned by a paired clock "14 H · ≈160 Y"; one showing a
> faint telescope smudge with "62%" beside it. A hairline top strip
> holds three tiny project clocks. Feels like reading correspondence,
> not a dashboard.

### 6 — Act 2: the system map going quiet

> Full-screen astronomical view of a home star system from above: the
> central star deliberately dimmed, drawn with a tight compact core of
> pale cyan structure close around it — dense, quiet geometry — while
> the outer system is nearly featureless darkness. A very subtle warm
> halo rings the whole system, barely brighter than the background sky
> (the civilization's faint visibility). One small slate label at the
> bottom: "THE VAULT DEEPENS". Progress rendered as quieting, not
> growth. Almost monochrome, breathtaking restraint.

### 7 — Act 3: the Sky with a source card

> The signature screen. A nearly empty star field fills the screen —
> true darkness, sparse faint stars, one soft amber smudge glowing low
> in the field. A slim bottom sheet is open for that smudge: designation
> "IR-2214" in grotesque, a player-given name "EMBER" in serif beside
> it, a chip reading "AS OF 7.3 Y AGO", and a belief line — "DARK NODE ·
> 71%" — set next to a small blurred thumbnail that is slightly sharper
> than the smudge above. Beneath, a thin horizontal scrubber of the
> source's light history, decades marked as ticks. The screen must feel
> almost empty; the emptiness is the point.

### 8 — Act 3: the choice ceremony (broadcast)

> Irreversible-decision screen: the same dark star field, and from the
> player's home mote at center an expanding translucent shell is drawn
> — a perfect thin luminous circle in pale cyan sweeping outward —
> intersecting faint sources one by one, each intersection marked with a
> tiny arrival date. At the bottom center, a thin ring closing around
> the words "HOLD — THIS CANNOT BE UNSENT", rendered as a serene
> typographic ceremony, three-quarters complete. No dialog box, no
> buttons. Gravity and silence.

### 9 — Act 3: letters in flight

> Correspondence screen split vertically: the top third is a dark map
> showing two star-points joined by a hairline arc, a small bright
> point traveling along it at two-thirds of the way; twin clocks beneath
> the arc read "ARRIVES IN 37 MIN · 7.3 Y". The lower two-thirds is the
> letter thread: alternating serif paragraphs, the correspondent's in
> warm off-white, the player's in cool moonlight tone, each stamped with
> a tiny light-age chip. Epistolary, intimate, astronomical.

### 10 — Act 3: the Ledger, drift ghosts

> Lineage screen: a sparse vertical tree of a few descendant nodes on
> the dark background, one branch highlighted. The open row shows a
> colony's five dials — bright notches in ember — with the player's own
> notch positions rendered as faint cyan ghosts behind them, visibly
> offset on three of the five dials: two characters diverging, overlaid.
> A staleness chip reads "AS OF 12 Y AGO", and a small drift figure
> "0.14" sits in slate. Quiet genealogical melancholy.

### 11 — Act 3: sleep and tripwires

> A dimmed interface: the whole screen at ember-glow brightness, as if
> the UI itself is banked coals — all elements present but faded near
> black. Center column: four plain-language rule rows in serif, each
> beginning "WAKE ME —" ("if anything warm moves within 25 light-years",
> "if a beam touches us", "if a fork misses two letters", "after 1,500
> years regardless"), each with a small toggle rendered as a dim ember
> dot. At the bottom, a single line: "the galaxy runs on". The visual
> feeling of a house at night with the pilot lights on.

### 12 — Act 3: the wake report

> A triage screen after millennia of sleep: at top, a large serif
> headline block — the single most important development — set like
> front-page news in a book, with a small ember chip "WHILE YOU SLEPT ·
> 2,300 Y". Below it, two medium cards of second-order news, then a
> compressed digest list in small slate type. The brightness of the UI
> visibly returning: top of screen fully lit, bottom still ember-dim, a
> gradient of waking. Urgent but never alarmed; no red anywhere.

### 13 — the Model: the pull-back (Act 3's opening wow)

> A 3D volumetric star map on a phone screen, mid-camera-move: the view
> has just pulled back and off-axis from a night sky, so a field of
> stars is parting into visible depth — thousands of tiny points of
> starlight in true astronomical colors (warm oranges, whites, rare
> blues) with strong parallax layering, sparse and mostly empty, black
> dominating. Near the center-bottom, one minuscule pale-cyan mote with
> a hairline ring marks "HOME". A subtle depth-of-field softens the
> nearest and farthest stars. One small slate label floats low: "THE
> MODEL — WHAT WE BELIEVE". The overwhelming feeling: the sky just
> became a place. Vast, precise, vertiginous, silent.

### 14 — the Model: your own light, seen from outside

> The poster image. A 3D star map viewed from outside the player's home
> star: around the tiny cyan home mote, a vast translucent spherical
> shell rendered in layers — an outer layer glowing warm ember (the
> civilization's bright years, still traveling), and inside it a much
> dimmer, darker inner shell (the silence that followed, never able to
> catch up). Sparse background stars pierce the shells; the few stars
> currently inside the warm layer are faintly haloed, as if lit by old
> light reaching them now. Caption chip in slate: "YOUR LIGHT · 84 Y
> DEEP". Elegiac, astronomical, breathtaking restraint — a civilization
> orbiting its own past.

### 15 — the Model: things in flight

> A 3D star chart with knowledge rendered as depth: near stars crisp,
> distant stars progressively ghosted and antiqued, two faint concentric
> guide shells labeled "50 Y" and "100 Y" in tiny slate type. Between
> stars, three hairline arcs each carry a slow bright point — a letter
> in flight, a seedship mid-decade, and one incoming line rendered
> hotter than everything else. One unresolved source is a soft amber
> fuzz-cloud just beginning to condense toward a point. Mostly black,
> few words, immense scale.

---

## Notes for the set

- Screens **6, 7, 8, and 14** carry the product's thesis (advancement
  as quieting, the empty sky, irreversibility as ceremony, the
  inescapable light echo) — iterate those hardest, and judge every
  candidate by whether the screen feels *quiet*.
- If a generation drifts toward busy sci-fi, strengthen the avoid block
  before touching the screen prompt — clutter is a style failure, not a
  content failure.
- When a look wins, fold its parameters back into the style block, keep
  the seed/style reference, and re-run the full set for a consistent
  concept board.
