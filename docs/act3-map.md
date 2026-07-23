# HOLOS
### The Model — Act 3's 3D map of space

*The wow factor of Act 3: a beautiful, navigable, fully 3D map of the
player's corner of the galaxy. This document specifies what it renders,
the moments it exists to deliver, how it is touched on a phone, and how
it stays honest — because in Holos even the pretty map must obey
lightspeed.*

---

## About this document

[ui-design.md](./ui-design.md) defines the Stage as the canvas surface
whose Act 3 form is the sky. This document upgrades that form into its
full ambition: a volumetric star chart that is the act's centerpiece and
its signature piece of beauty. The interface rules of ui-design.md (ages,
beliefs, view-not-control, mobile first) apply here with full force —
the map is where they become *visible physics*. Mechanics it renders come
from [act3-design.md](./act3-design.md) (the Sky, the Light Echo, travel,
the Ledger); the things it shows come from
[act3-civilizations.md](./act3-civilizations.md).

**Working name: the Model.** In-fiction, the map is not a picture of
space — it is the mind's spatial **world-model** made visible, the thing
the compute heart exists to maintain (theory.pdf's Computronium Kernel:
*"maintaining a single, stable world-model across long horizons"*). That
framing is load-bearing, not flavor: it explains every honest limitation
the map has, and it makes the map itself an artifact of the civilization
— a Monument's Model and a Tide's Model should not feel the same.

---

## One surface: the sky is the map seen from home

There is no "map screen" separate from the sky. The Stage holds a single
continuous camera:

- Zoomed all the way in, it is the **system map** of Act 2, unchanged.
- Pulled back, the home system shrinks to a mote and the camera enters
  the **sky** — the star field as seen from home, the screen the
  observatory reads.
- And then — the act's first wow — the camera keeps going, *off-axis*,
  and the sky acquires **depth**: the flat field of stars parts into a
  volume, parallax revealing which lights are near and which are far,
  and the player is floating in a three-dimensional chart of everything
  their civilization believes about its neighborhood.

The first pull-back is staged as a beat (the opening of Act 3): the
night sky the player has been staring at all through Act 2's telescope
reports becomes a place. That single camera move *is* the genre shift
from solo ascent to interstellar game, and it should be built and tuned
like the signature moment it is.

## The one rule: the Model renders belief, never truth

The map draws what the civilization **knows**, which is always the past.
This is architecture, not styling: the server only ever sends the client
light-delayed knowledge, so the renderer *cannot* draw another
civilization's present — the data does not exist on the device. The
prettiest surface in the game is also its anti-cheat: there is nothing
to datamine because the Model is the player's epistemic state, not the
world state.

Consequences, all rendered:

- Every object carries its **light-age**; distant objects are known only
  as they were.
- Classification uncertainty is **literal fuzz**: an unresolved source is
  a soft volume of probability, and it visibly *condenses* into a point
  as the observatory's confidence rises. Sharpening the map is what
  progress looks like.
- Things the civilization has never detected are simply absent. An empty
  region of the Model is a claim about your instruments, not about
  space — and late in the game, the player knows the difference.

---

## The five moments the map exists for

### 1. The pull-back

Described above; the act-opening beat. Judged by one criterion: the
player should *feel the size of the game change*.

### 2. Your own light, seen from outside

A toggle renders the player's own **light echo** as a translucent
expanding shell around home (act3-design.md, *The Light Echo*): the
bright Act 2 years as a warm luminous layer traveling outward, the dark
turn as a dim inner edge chasing it and never catching up. Orbit the
camera around your own history. Every star currently inside the warm
layer is watching your bright years *right now*; stars beyond the shell
have never heard of you; stars inside the dim core are the ones that
have seen who you became. Tap any star to read what *it* currently sees
of you.

This is the design's most distinctive idea (*you cannot un-shine*) made
into its most distinctive image, and no other game in the genre can draw
it. If the Model has one poster shot, it is this.

### 3. Depth of knowledge

The fog of war rendered as geometry. Near stars are crisp; distance
ghosts things progressively — not darker, but *older*, their renderings
subtly antiqued and their uncertainty fuzz wider. Optional faint
concentric shells mark round-number light-ages ("what you see here left
50 years ago"). The temporal fog of war (vision.md, *The map is the
past*) becomes something the player's eyes learn to read as naturally as
depth itself.

### 4. Things in flight

Signals, probes, and seedships render as slow bright points on long
arcs — the game's real clocks made spatial. A signal to a counterpart
is a mote crawling a hairline; a seedship is a decade-long ember; a
relativistic ship is a hard bright torch on the same slow arc, its
deceleration flare pointed at its destination — the most dramatic slow
burn on the map, short of a strike; an incoming directed beam, when
detected, is the most electric object on the map — unless what is
crossing is a fleeing seat. Objects beyond your light's reach are shown
as **dead
reckoning**: an elongating fuzz of where they should be by now, because
even your own ships, once distant, are beliefs.

### 5. Time, scrubbable

The Model can re-render your knowledge **as of any past date** — scrub
back and watch shells contract, sources dim to their older selves,
colonies unfound themselves. Scrubbing *forward* of now renders honest
extrapolation with growing fuzz. History review, arrival planning, and
the map's own tutorial ("watch what you knew and when") in one
mechanic. (Later layer; see scope.)

---

## Reading the Model

| Thing | Rendered as |
|---|---|
| Backdrop stars | a real point-cloud star field in true astronomical color (temperature → color); non-interactive, mostly *empty* |
| Detected sources | soft volumes of amber warmth; fuzz radius ∝ classification uncertainty; condense as confidence rises |
| The home system | the one crisp, current, pale-cyan object in the universe — the only place rendered in the present tense |
| Colonies / forks | cyan-tinted motes, aged like everything else; ghost-dial overlay via their source card (Ledger) |
| Light echo shells | translucent luminous layering around any emitter whose history you hold — yours always; others' as reconstructed |
| In-flight objects | bright points on hairline arcs; dead-reckoned fuzz when beyond your light |
| Relativistic ships | a hard bright torch on its arc, deceleration flare aimed at the destination — the map's most dramatic slow burn short of a strike |
| Light-age | ghosting/antiquing with distance + the mandatory age chip on selection |
| Names | your local names only (ui-design.md, *you name what you see*) |

**Beauty discipline.** The Model must be beautiful the way the real
night sky is beautiful: vast, dark, precise. Real star colors, real
sparseness, no nebula soup, no colored territory bubbles, no faction
overlays — the galaxy has no borders to draw, only light. The wow comes
from depth, parallax, scale, and motion. If a screenshot of the Model
looks *busy*, it is wrong; the emptiness carries the thesis
(ui-design.md's one art-direction commitment), and the moments of light
— a shell, a beam, an arriving signal — land *because* of it.

## Touching the Model

Mobile first, one continuous gesture set, and strictly **a view, not a
control surface**:

- **Orbit** — one-finger drag. **Zoom** — pinch, continuous from system
  map to full chart. **Reset to home / to sky-view** — one tap on the
  strip. Optional gyro parallax for depth at rest (off by default;
  battery).
- **Select** — tap a source; its **source card** bottom sheet rises
  (same component as ui-design.md). All actions live in the sheet —
  vigil, hail, launch-target — and every one of them is a purpose, not
  an order. Nothing on the map is dragged, drawn, or commanded.
- Ceremonies stage *on* the Model: the broadcast shell of the choice
  screen (ui-design.md § the choice ceremony) is drawn in this same 3D
  space, sweeping the actual neighborhood it will touch.

## Under the hood

- **Renderer:** the Model is a WebGL 3D scene (three.js or a purpose-
  built point-sprite renderer) living alongside the Pixi 2D stage; text
  stays DOM per ui-design.md. A star field is cheap 3D — one instanced
  point-sprite cloud of 50–150k stars, shells as alpha-blended shader
  spheres, arcs as polylines — comfortably 60 fps on a mid-tier phone if
  nothing per-star touches the CPU per frame.
- **Backdrop data:** seed the star field from a **real astronomical
  catalog** (e.g. the HYG/Gaia-derived neighborhood set) with gameplay
  sources placed among real stars. This is the vision's grounding pillar
  made literal — the map is beautiful partly because it is *true* — and
  it costs a few megabytes of preprocessed positions, not a content
  team. (Whether the persistent galaxy's player geography is anchored to
  the real solar neighborhood or to a generated field with real
  statistics is an open question below.)
- **Performance budget:** first render fast on a phone (the game is a
  URL); the catalog streams progressively — near shell first, depth
  arriving as it loads, which conveniently *is* the pull-back
  choreography.

## Scope

**v1:** the continuous camera (system → sky → volume), the pull-back
beat, the point-cloud backdrop, detected sources with condensing fuzz,
light-age ghosting, selection + source cards, the player's own light
echo shell (the poster feature — it ships in v1 or the map is just a
skybox), ceremonies staged in the volume.

**Later:** time scrubbing, in-flight dead-reckoning fuzz, reconstructed
echo shells for *other* civilizations, gyro parallax, the knowledge-
shell overlay, per-character Model styling (the mind's register applied
to its own world-model rendering).

## Open questions

- **The name.** "The Model" is design-side; whether the surface is named
  in-game at all, or is simply *the sky, which turns out to be deep*, is
  an aesthetic call worth playtesting.
- **Real neighborhood or generated?** A real-catalog backdrop is free
  beauty and free truth, but anchoring *player* geography to the real
  solar neighborhood constrains the persistent galaxy's growth topology
  (vision.md, frontier expansion). Generated-with-real-statistics may be
  the honest compromise; the backdrop can be real either way.
- **How much 3D on the lowest devices?** The fallback for a phone that
  can't hold the frame rate: the sky-view (camera locked at home) with
  parallax-on-drag — which is Act 2's presentation, gracefully degraded,
  losing the wow but none of the information.
- **Does the echo-shell toggle live on the strip or one tap deep?** It
  is the poster feature, but it is also emotionally heavy — surfacing it
  constantly may dull it. Candidate: it surfaces contextually (after a
  hail, before a posture choice), and lives one tap deep otherwise.
