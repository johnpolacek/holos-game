# HOLOS
### UI Design — the interface of a value function

*What is actually on the screen. Every other doc describes systems,
fiction, or experience; this one specifies the surfaces the player
touches: the screens per act, the components they share, and the rules
that keep the interface honest about lightspeed, uncertainty, and the
player's altitude.*

---

## About this document

The [walkthroughs](./gameplay-walkthrough.md) describe what playing feels
like and [act3-walkthrough.md](./act3-walkthrough.md) plays a season of it
in detail — but both *imply* an interface without specifying one. This
document is that specification. The walkthrough scenes double as its
acceptance tests: every scene in Mara's season must be assemblable from
the screens and components below. Where this document and the vision or a
design doc disagree, they win and this document is what needs fixing.

**Inherited constraints**, from the stack and the design:

- **The game is a URL.** Browser, no installer; first meaningful render
  must be fast on a phone (vision, walkthrough § Session zero).
- **Mobile-first.** Touch/pointer input, responsive full-screen canvas
  (CLAUDE.md). Real sessions are a phone at breakfast and a laptop in the
  evening; the phone is the primary device for *reading and deciding*,
  the desktop for *surveying*.
- **Pixi.js canvas + DOM.** The renderer draws worlds, systems, and sky;
  decisions, reports, and letters are text. The split is architectural
  *and* aesthetic: **canvas for places, prose for the will** (below).
- **The altitude principle** (act2-design.md): the lowest decision the UI
  ever offers is *which purpose*, never *how*. If a screen has a queue,
  a routing control, or a per-unit order on it, the screen is wrong.
- **Beat continuity** (act2-design.md): the scene-then-decision unit
  presents identically in all three acts. One component, three acts of
  content.
- **No presence** (vision, § Multiplayer model): human and AI must be
  indistinguishable, so the UI has **no player list, no names, no online
  status, no chat, no delivery receipts beyond physics**. The sky is the
  only multiplayer surface. This is the single most unusual constraint
  and most of the Act 3 UI falls out of it.

---

## Seven interface principles

### 1. The mind is the interface

From the pivot onward there is no neutral system chrome narrating the
game. The interface's voice *is* the civilization's mind — the report,
the tooltips, the confirmations, the objections are all written in its
register, colored by its dials (playstyles.md, *the report speaks in
character*). A Monument's interface is liturgical; a Tide's is hungry.
Before the pivot, Act 1's voice is the world itself — weather, geology,
life — because there is no mind yet to speak. The reveal beat is also the
moment the interface *changes narrator*, which is the cheapest way ever
invented to dramatize a singularity.

### 2. Canvas for places, prose for the will

The Pixi canvas renders what exists: the cradle, the home system, the
sky. The DOM overlay renders what is thought and decided: reports, beats,
letters, sheets. Nothing decision-critical lives only in canvas pixels
(accessibility, screen readers, localization), and the canvas is never a
control surface — it is **a view that transforms** (act2-design.md, *"a
view, not a control surface"*). You watch the swarm fill in or the star
go quiet; you never click a collector.

### 3. Every fact wears its age

Any datum about anything beyond the home system carries a **light-age
chip**: `as of 31 y ago`. The rule extends to grammar: the interface uses
**present tense only for the home system**; everything else is rendered
in a soft past — *"the Chorister was building"*, never *"is building"*.
No screen anywhere displays an unaged remote fact. This one rule, applied
everywhere, teaches temporal fog better than any tutorial could
(act3-design.md, *The Sky*).

### 4. Beliefs, not facts

Remote knowledge renders as **classification, with confidence** — `Dark
Node · 71%` — never as a resolved icon. The observatory outputs beliefs
(act3-design.md); the UI must refuse false certainty even in its
iconography: an unclassified source is a smudge, not a question-mark
badge, and it sharpens visually as confidence rises. Sharpening the
image *is* the progress bar of the inference game.

### 5. Reversible is a tap; irreversible is a ceremony

Ordinary choices commit in one touch, no confirmation dialogs — the
altitude principle implies trust. The rare irreversible acts (hail,
broadcast, launch, force-a-directive, wake-condition edits mid-sleep) get
the opposite: a full-screen **commitment ceremony** with a slow gesture —
press and hold while the consequence renders (the expanding shell of a
broadcast drawn across *your actual sky*, with the sources it will reach
lighting up in order of arrival). No "Are you sure?" text ever appears;
the render of the consequence is the question.

### 6. Calm by design

No spinning timers, no red badges, no daily-streak mechanics, no unread
counts screaming for return. The game's only outbound signals are the
ones the player authored — **tripwires** — plus the standing digest rule
that anything else waits quietly in the next report. Absence is fiction,
not neglect (act3-design.md, *Sleep and tripwires*), and the UI's job is
to make closing the tab feel like a move, not a lapse.

### 7. You name what you see

Remote sources have catalog designations (`IR-2214`); the player may
assign a local name ("Ember"). Names are **local knowledge**: they exist
only in your interface, are never transmitted, and two civilizations'
names for each other never sync. Even a correspondent is known by the
name *you* gave their warmth. The UI enforcing this epistemics is what
makes first exchange of true names — if the fiction ever allows it — an
event.

---

## The shell

One canvas, three surfaces, and almost no chrome. On a phone the
surfaces are full-screen and swipe between; on desktop the Stage holds
the center with the Voice and Desk docked beside it.

- **The Stage** (canvas): where you are. Act 1: the living world. Act 2:
  the system map. Act 3: the sky. Pinch/scroll to move between these
  scales in Act 3 — home system zooms out into the sky, seamlessly, so
  the player *feels* the scale change rather than switching modes.
- **The Voice** (overlay): the reading surface — reports, beats,
  letters. Typographic, vertical, one-thumb. This is where a phone
  session mostly lives.
- **The Desk** (panels): the reference surfaces — character sheet,
  ladders and projects, the Ledger, the observatory catalog, the Vault.
  Dense, glanceable, and *never required mid-beat*: any number a
  decision needs is embedded in the decision's own card.

Persistent chrome is a single thin strip: where you are (Stage scale),
what's cooking (project clocks), and the session's one ambient stat
(below). Nothing else is permanent.

---

## Act by act

### Session zero — the world reveal

A cold open: the canvas resolves from noise into the cradle — its sun's
color, its gravity in the set of the horizon, its defining pressure
rendered before any text. Then one card: the world's name-slot (yours to
fill), its profile in the catalog's plain fields, and its tier stated
without euphemism. No menu precedes it; the URL opens into the world
(walkthrough § Session zero). Difficulty dial and a Tier I–II guaranteed
first draw live behind a single "this world or an easier start?" choice,
not a settings screen.

### Act 1 — the beat frame

The whole act is one repeating screen, the **beat frame**, in three
movements (gameplay-walkthrough.md § The beat):

1. **Vignette** — full-bleed scene on the Stage with sparse caption
   prose. The world has changed since last beat; the render shows it.
2. **Decision** — 2–4 **choice cards** slide up over the vignette. Each
   card carries its framing in the world's terms, its *kind* — **garden**
   cards are visually cool and patient, **intervene** cards are hot and
   bordered like the rare thing they are — and its odds, stated plainly
   (`likely · uncertain · long shot`, with exact odds one tap deeper).
3. **The roll** — a deliberate, physical moment: the odds render as a
   band, the marker falls, the result holds for a beat before the
   consequence vignette plays. The roll is *watched, not skipped*; it is
   the act's signature interaction and it should have the weight of a
   die hitting felt.

The Desk in Act 1 holds one panel: **the History spine** — a vertical
timeline of every beat taken, branch chosen, roll survived. It is the
causal chain the pivot will read back to the player, so the UI treats it
as sacred from the first beat: nothing in it is ever edited or hidden.

### The pivot — the reveal

The character sheet reveal is a one-time, full-screen sequence: each
dial draws itself as a **band** (the range the cradle allowed) with a
**notch** (where the history landed), and as each dial lands, the History
spine highlights the beats that put it there — the receipts, shown at
the moment of grading. Then the interface changes narrator (§ principle
1) and the mind speaks its first line. This screen is the game's
signature moment and earns bespoke craft; nothing else in the UI is
allowed to be this theatrical.

### Act 2 — the loop surfaces

- **The report** opens every session in the Voice: scenes generated from
  state deltas, in the mind's register, each scene tappable to jump to
  the thing it describes on the Stage. Reading the report *is* the
  session's onboarding; there is no "what's new" panel besides it.
- **The system map** (Stage) transforms as the ladders climb — swarm
  filling in, or star dimming as the Vault deepens. Per playstyles.md's
  parity requirement, the dark path's transformation is rendered with
  the same fidelity as the bright path's: quieting is *drawn*, not
  implied by falling numbers.
- **The dial sheet** (Desk): drag the notch within the band. Dragging
  *outside* the comfort band doesn't snap back or refuse — it shows the
  Coherence price inline and the mind's objection as a one-line dilemma
  preview. Forcing is a ceremony (§ principle 5).
- **Ladders and projects**: two opposing columns (bright / dark) whose
  stages light as thresholds cross; project cards carry the **clock
  pair** — real time and game time together (`31 h · ≈370 y`) — so deep
  time stays legible without a tutorial.
- **The quiet number**: Signature is deliberately *not* a stat panel
  (act2-design.md). It renders ambiently — the home system's halo on the
  Stage brightens as Signature climbs. Players who notice, notice; the
  exact number exists one tap deep for those who go looking. The UI
  honors the design's intent that ignoring it is a legitimate (and
  consequential) way to play.

### Act 3 — the sky and its desk

- **The Sky** (Stage, zoomed out): the home system recedes to a mote;
  sources render as what they optically are — smudges, warmths, shadows
  — not as gameplay icons. Selecting one opens its **source card**:
  designation, your name for it, light-age chip, classification beliefs
  with confidence, and its **light archive** — a scrubbable history of
  everything your instruments have ever received from it. Scrubbing a
  source's past is how "the map is the past" becomes something the
  player's fingers know.
- **The observatory** (Desk): the inference workbench. Active vigils as
  cases: hypotheses listed, instrument time allocated between them (a
  purpose-level choice — *which question*, never *which telescope
  setting*), confidence shifting as light arrives. This is Silence's
  verb set (playstyles.md) given a surface.
- **The choice screen**: contact's irreversible stage gets the full
  ceremony — hail renders a thread of light to one source; broadcast
  renders the expanding shell touching source after source with arrival
  dates; stay dark simply returns you to the vigil, the only option
  that is a tap.
- **Letters** (Voice): correspondence as threads. An in-flight letter
  renders on the Stage as a moving point on a line between stars — the
  wait made visible — and the thread shows both clocks (`arrives in
  37 min · 7.3 y`). Composition UI is deliberately unspecified here
  pending the player-language decision (vision, § Still open); the
  thread and flight rendering hold regardless of what fills them.
- **The Ledger** (Desk): the lineage as a tree. Each fork's row shows
  its charter, last-known state, staleness chip, and its dial sheet
  **ghosted against yours** — your notches faint behind theirs, so
  drift is read as two overlaid characters diverging, not as a number.
  An independent fork's row changes tone (its ghost notches drop away):
  it is no longer measured against you.
- **Sleep**: entering it visibly dims the whole interface to embers.
  The tripwire editor speaks the design's own grammar — *wake me if
  anything warm moves within N light-years; if a beam touches us; if a
  fork misses two correspondences; after T years regardless* — as
  composable plain-language rows, not a settings form. The **wake
  report** is a distinct triaged layout (the walkthrough's Week 6):
  bombshells first, then the sky digest, then the queue — built for the
  jackpot moment the engagement model banks on.

---

## The component library

The small set of parts everything above is assembled from — each built
once, used everywhere:

| Component | Contract |
|---|---|
| **Beat frame** | vignette → choice cards → consequence; identical anatomy in all acts; Act 1 adds the roll, Act 2+ replaces it with the cost line (the dice die at the pivot, visibly) |
| **Light-age chip** | mandatory on every remote fact; tap = "light left in [year]" detail |
| **Confidence render** | belief + %, visual sharpness ∝ confidence; never a resolved icon below a confidence threshold |
| **Dial band** | range band + position notch; ghostable (Ledger); price-on-drag; used for reveal, sheet, charters, drift |
| **Clock pair** | real time + game time, always together, everywhere a duration appears |
| **Hold-to-commit** | the irreversibility ceremony; consequence renders during the hold; releasing early cancels silently |
| **Source card** | designation + local name + age + beliefs + light archive scrubber |
| **The strip** | scale, cooking clocks, ambient Signature halo; the only persistent chrome |

## Phone and desktop

The phone session (5–20 min) is the Voice: read the report, resolve
beats, answer letters, tap a vigil's new light. Everything decision-shaped
is one-thumb, bottom-sheet, portrait. The desktop session (30–60 min) adds
the Stage as a place to *dwell* — survey the sky, scrub light archives,
read the Ledger wide. Nothing is desktop-only or phone-only; the split is
cadence, not capability. Notifications are OS-level push, tripwire-
authored only, and each deep-links to its wake report.

---

## v1 slice

Matching the design docs' v1 scope: the beat frame with roll; the world
reveal; the History spine; the reveal sequence; report, system map with
both transformations, dial sheet, ladder/project columns with clock
pairs; the Sky with source cards and the five signal classes; the
observatory in its basic form (beliefs and confidence, without the full
case-board vigil UI); the choice ceremony; letter threads with flight
rendering; the Ledger with basic drift ghosts; sleep, tripwires, wake
report, push. Deferred with their systems: the mask/performance surfaces,
strike ceremonies, seat-transfer UI, the intelligence-brokering desk.

## Open questions

- **Art direction** is entirely unset — this doc specifies structure and
  rules, not look. The one commitment implied by the design: the sky
  must read as *dark and mostly empty*, because the Teeming Dark only
  lands if the screen itself is quiet.
- **How much scene is rendered vs written?** Beat vignettes could be
  full Pixi scenes, styled stills, or prose-forward cards. Cost scales
  brutally with the first option; v1 likely ships prose-forward with a
  rendered Stage behind it, upgrading signature beats (the reveal, first
  contact) only.
- **Accessibility of the canvas.** The prose surfaces are DOM and
  screen-reader-clean by construction; the Stage needs an audit — every
  Stage-only signal (halo, quieting star, in-flight letters) must have a
  Voice/Desk equivalent.
- **Archetype names in-game** (open in act2-design.md) becomes a UI
  question here: the reveal sequence works with or without a name at the
  end; shipping v1 *without* naming keeps the question open cheaply.
- **The letter composer** waits on the player-language decision; the
  thread/flight rendering above is deliberately agnostic to it.
- **Onboarding density.** The principles replace tutorials with rules
  (tense, age chips, clock pairs) that teach by consistency. Whether
  that carries a new player through the pivot without an explicit
  tutorial is a playtest question, not a design argument.
