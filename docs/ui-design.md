# HOLOS
### UI Design — the interface of a value function

*What is actually on the screen. Every other doc describes systems,
fiction, or experience; this one specifies the surfaces the player
touches: the home screen as it shipped, the screens per act, the
components they share, and the rules that keep the interface honest
about lightspeed, uncertainty, and the player's altitude.*

---

## About this document

Two halves, and they are read differently.

**The shipped half** — the home screen, its rail, the pages under it, the
intro, and the type system — is a *record*, revised in S0.4 (2026-08)
against what Phase S's S0 slice actually built. Here **the code is the
spec**: `client/src/home.ts`, `client/src/studyboard.ts`,
`client/src/sourcecard.ts`, `client/src/app.ts`, `client/src/intro.ts`
and `client/src/style.css` are the authority, and if this document disagrees with them about a
shipped surface, this document is what needs fixing.

**The specified half** — session zero, Act 1's beat frame, the pivot,
Act 2's loop surfaces, sleep and tripwires — is still a design
specification for screens nobody has built. There the
[walkthrough](./walkthrough.md) scenes remain the acceptance tests, and
where this document and the vision or a design doc disagree, they win.

The 2026-08 playtest condemned the shipped desk-and-panel presentation
(roadmap.md § The UX reboot): the server systems beneath it survived
untouched and the client half was replaced by the **hybrid home** below.
The launch brief that settled the layout and the copy is
[build-s0.md](./build-s0.md), and it stays the record of *why* each
decision reads the way it does.

**Inherited constraints**, from the stack and the design:

- **The game is a URL.** Browser, no installer; first meaningful render
  must be fast on a phone (vision; walkthrough § Day 1).
- **Mobile-first.** Touch/pointer input, responsive full-screen canvas
  (CLAUDE.md). Real sessions are a phone at breakfast and a laptop in the
  evening; the phone is the primary device for *reading and deciding*,
  the desktop for *surveying*.
- **Pixi.js canvas + DOM.** The renderer draws worlds, systems, and sky;
  decisions, reports, and signals are text. The split is architectural
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
- **Drawn over stated** (roadmap.md § The UX reboot): a physical quantity
  is drawn on the map, not written in a panel. S0 draws nothing new under
  this rule — the mirror, exposure arcs and trajectory labels are S1/S2
  — but it is the reason S0 built no prose surface where geometry is
  going to go.

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

*As shipped:* the mind speaks in the report's header sentence, in the one
remark that rides a report, and on the Mind page — the charter at its head
and the stance beside a proposal. It has no seat where it speaks
unprompted. The counsel strip was that seat for one slice and was cut
(§ Anatomy, between map and rail): the narrator that changed at the pivot
still owns every sentence on the screen, but a sentence with no occasion
behind it reads as chrome whoever is speaking.

### 2. Canvas for places, prose for the will

The Pixi canvas renders what exists: the cradle, the home system, the
sky. The DOM overlay renders what is thought and decided: reports, beats,
signals, sheets. Nothing decision-critical lives only in canvas pixels
(accessibility, screen readers, localization), and the canvas is never a
control surface — it is **a view that transforms** (act2-design.md, *"a
view, not a control surface"*). You watch the swarm fill in or the star
go quiet; you never click a collector.

### 3. Every fact wears its age

Any datum about anything beyond the home system carries a **light-age
chip**: `AS OF n Y AGO` (§8-pinned). The rule extends to grammar: the
interface uses **present tense only for the home system**; everything
else is rendered in a soft past — *"the Chorister was building"*, never
*"is building"*. No screen anywhere displays an unaged remote fact. This
one rule, applied everywhere, teaches temporal fog better than any
tutorial could (act3-design.md, *The Sky*).

### 4. Beliefs, not facts

Remote knowledge renders as **classification, with confidence** — a
signal-class label and a percentage — never as a resolved icon. The
observatory outputs beliefs (act3-design.md); the UI must refuse false
certainty even in its iconography: an unclassified source is a smudge,
not a question-mark badge, and it sharpens visually as confidence rises.
Sharpening the image *is* the progress bar of the inference game.

### 5. Reversible is a tap; irreversible is a ceremony

Ordinary choices commit in one touch, no confirmation dialogs — the
altitude principle implies trust. The rare irreversible acts (hail,
broadcast, launch, force-a-directive, wake-condition edits mid-sleep) get
the opposite: a full-screen **commitment ceremony** with a slow gesture —
press and hold while the consequence renders (the expanding shell of a
broadcast drawn across *your actual sky*, with the sources it will reach
lighting up in order of arrival). No "Are you sure?" text ever appears;
the render of the consequence is the question.

*As shipped:* a ceremony takes the whole screen. The home shell hides
itself and the board's chrome stands down while one is armed, so the
only things a thumb can reach are the canvas and the one word that
refuses.

### 6. Calm by design

No spinning timers, no red badges, no daily-streak mechanics, no unread
counts screaming for return. The game's only outbound signals are the
ones the player authored — **tripwires** — plus the standing digest rule
that anything else waits quietly in the next report. Absence is fiction,
not neglect (act3-design.md, *Sleep and tripwires*), and the UI's job is
to make closing the tab feel like a move, not a lapse.

*As shipped, S0 made this mechanical.* See § Calm, as shipped: the
report's session auto-open is dead, the badge is a count and not an
alarm, and no surface on the home screen pulses.

### 7. You name what you see

Remote sources have catalog designations (`HOL-nnnn-i`); the player may
assign a local name ("Ember"). Names are **local knowledge**: they exist
only in your interface, are never transmitted, and two civilizations'
names for each other never sync. Even a counterpart is known by the
name *you* gave their warmth. The UI enforcing this epistemics is what
makes first exchange of true names — if the fiction ever allows it — an
event.

---

## The home screen (shipped, S0, 2026-08)

The desk is gone. There is no Stage/Voice/Desk triptych and no swipe
between three surfaces: there is **one home screen**, and it is the
Model with a band of chrome above it and a five-tab rail at the bottom.
Everything else in the game is a **page** that docks into that frame under
exactly one of the five tabs.

The kept ingredient, and the reason the map is the heart rather than a
panel among panels, is *the spatial feeling of having a place in a real
sky* — the one thing the failed playtest liked. Every layout decision
below protects it.

*A reading note for the older docs.* act3-map.md and the A-phase build
briefs call the canvas **the Stage**, the reading overlay **the Voice**
and the reference panels **the Desk**. Those three words are retired.
Read the Stage as the Model, the Voice as the report and the Mind page's
stances, and the Desk as the pages under the rail; nothing those docs say
about *content* changed, only where it lives.

### Anatomy

Three fixed, safe-area-aware siblings over the canvas, in this order down
the screen:

**The Model (the centerpiece).** The 3D sky
([act3-map.md](./act3-map.md)) fills the screen edge to edge and is
never a thumbnail. Its own DOM overlay is pointer-transparent and carries
the `HOME` label on the player's own star, the backdrop landmark names,
the scale readout, and the tracking label on an outbound act still
crossing. §8 also pins `THE MODEL · WHAT WE BELIEVE` as a Model caption;
it is *not* on the shipped home screen, and the belief framing is carried
instead by what the map draws (smudges and confidences, never resolved
icons). Tapping a source opens its source card; tapping `HOME` opens
Sky's page scrolled to the voice section.

**The HUD band (top).** Two fixed rows at every width, never a wrap:

- Row one, left: the **cyan mark** and the civilization's **name** in the
  titling face — the same face the inheritance ceremony crowned it in.
  The name ellipsizes; it never pushes anything.
- Row one, right: the star's **designation** (`HOL-nnnn-i`), in the mono
  instrument face.
- Row two, right: the **epoch year**, mono and tabular, shaped
  `YEAR <n.nn> AE` — the civilization's own count from its own ascension
  (R-33: the cohort's absolute year never reaches a surface), carried to
  two decimals so it visibly ticks. A hundredth of a year is a few real
  seconds on the shipped clock, which is the whole point: game time is
  *watched* moving rather than inferred between sessions.
- Row two, left: the **compute meter** — a thin bar in muted indigo with
  a tiny mono label over it, shaped `COMPUTE <n> · +<rate>/Y`. The bar is
  the reading (how much of the attention ceiling is uncommitted); the
  label carries the number and the rate. Indigo is deliberate: an
  instrument that is neither you (cyan) nor other (amber) nor the gold
  chrome, so its readout borrows none of their meanings. The meter hides
  whole when there is no ceiling to draw against; an empty bar would be a
  claim.

The band's readouts explain themselves on tap (2026-08; the source
card's class-explainer info toggle is the precedent): the standing lines
— either one — toggle a pinned note saying what the designation and the
epoch year are, and the compute meter toggles one saying what compute
is. The note is `home.ts`'s HUD_NOTE, observatory deadpan, deliberately
numeral-free (every number it could quote is printed on the readout the
tap came from); it hangs just under the band, hugging the tapped
readout's edge, and a second tap on the readout, a tap on the note, or
any rail tab stands it down. Everywhere else the band stays
non-interactive — a thumb reaches straight through it to the map
underneath.

**Between map and rail: nothing.** The **counsel strip** shipped in that
gap in S0.3 and was cut in 2026-08. It carried one argued line from the
mind with a **TALK** affordance beside it, both opening the Mind page; it
was the *stance* side of the facts/stance split, empty until there was
something to say, and it collapsed to zero height when empty.

Three things killed it and they compound. The line was floor-picked
ambient counsel with no triggering event behind it, so it spoke with
nothing at stake and read as wallpaper however well the sentence was
written. TALK was the third affordance to the Mind page inside sixty
vertical pixels — the line was tappable, the button was tappable, and the
MIND rail tab sits directly beneath both. And it charged real height on a
phone, where the sky is the product. Two decisions in build-s0.md had
already said as much and are worth reading as one rule: *S0's job is to
not build prose surfaces where geometry will go*, and the purpose banner
that was mocked and cut for stating rather than showing.

*The arrival line was cut with it* (settled 2026-08). The server still
serves the mind's per-archetype first read after the intro's last beat,
and no client surface displays or acknowledges it, so it is re-offered
every session — the TALK tap was what reported it seen. That is now the
resting state rather than a gap awaiting a surface. The line was the
intro's payoff, but what it pays off with is a sentence about what the
player is for, and the same objection that cut the purpose banner and the
strip applies a third time: it states what the interface should show.
A first session worth clicking through is what carries that meaning
instead, and it is what S0's own playtest gate measures. Nothing was
deleted — `ARRIVAL_LINES` stays pinned in `voice.ts`, the
message still carries the field, and a later slice that finds a real
occasion for the line can spend it, owing the acknowledgement the strip
used to send.

**The rail (bottom).** Five equal tabs, always visible, in this pinned
order:

> **Report · Sky · Projects · Reach · Mind**

Labels are the titling face at the reading floor (`--holos-text-xs`,
never xxs — a rail label is a lone unenclosed word), in light amber, with
the lit tab at full amber. A tab switch eases that ink and nothing else:
the rail never moves, resizes, or animates its badge. Exactly one tab is
lit at all times.

The internal tab ids are `report`, `sky`, `work`, `family`, `mind` —
`work` is labelled Projects and `family` is labelled Reach. The ids kept
the names they shipped under; only the words changed. Anyone wiring a new
page reads `VIEW_TAB` in `studyboard.ts` for the mapping and never
re-derives it.

**Stacking.** The shell's two chrome bands share one z-slot, above the
map and above any open page, and below the four heavier interruptions:
the contact ceremony, the reclaim sheet, the intro, and the slot the
retired voice beat left open. A page docks *between* the HUD and the
rail; a ceremony or the intro takes the whole screen and hides the shell
outright.

### What each tab owns

| Tab | Landing | Owns (drill-ins) |
|---|---|---|
| **Report** | Two halves. The annal: a header sentence in the mind's register, then entries, newest first, each a stamp, a record sentence, an optional remark, and a route. Then `STANDINGS` (shipped 2026-08, build-report-standings.md), live and needing no payload: a source row per study in the sky, the engaged ones first in the Desk's order carrying their status flags, then the rest by light age. | Routes out of an entry (a study, a mission, a source, a project, a founding, a Ledger record) open the target page; a standings row opens that source's board, which backs out to the Report. |
| **Sky** | **The bare map.** The tab lands on the Model with no page over it. | The source card and the contact ceremonies; the Desk, a source's study board, and explore; threads and `THE VOICE`; the survey; the founding sheet. |
| **Projects** | `Start a project`, over `TEND` — the work list of everything under way. | The project catalog, a project's detail sheet, a mission's detail, the launch sheet. |
| **Reach** | What the civilization has spread beyond its own system: `THE LEDGER`, the standing order under it from the first tap, then a row per fork. **The fork list is empty until the first sending.** | A fork's whole record; the sheet where a standing order is armed. |
| **Mind** | The masthead at its head (world plate, charter; the name is the HUD's), then the proposals block, then the intro replay, then housekeeping below a hairline. | The start-over confirmation page. |

Detail worth having in front of you when building:

- **Sky's landing is the map, not a page.** Tapping Sky from anywhere
  else shuts the open page; tapping it again on a shut panel opens Sky's
  own page. That page carries the studies row (`Your studies · <count>`
  over `The sources you have put something into.`, absent until there is
  one — a study stands on every source, but the Desk lists the ones
  something has been spent on), `Explore the sky`, the
  survey row when a sky has carried survey rows, a hairline, then
  `THE VOICE` with one row per thread beneath it and a row for any
  thread gone dark. Rows that have nothing behind them are absent, not
  greyed.
- **The survey is Sky's**, and so is the founding sheet it opens: the
  nearest stars are sky whether or not anyone stands on them, and the
  act of sending is aimed at a place. The same sheet also opens from a
  source card. What a sending *became* is Reach's.
- **Reach opens on the standing order and grows from there.** `THE
  LEDGER`, the `Leave a standing order` row beneath it, then one row per
  fork. The order row is there before anything has been sent, and that is
  correct: the warm movement order dispatches a *Sentinel*, an
  observatory instrument aimed at somebody else's system, so it has
  nothing to do with having reached anywhere — and the row is the only
  route to the page an order is armed on. What is honestly empty at the
  start is the fork list, and nothing pads it: no placeholder, no
  explainer, no encouraging empty state. The page fills as the
  civilization actually reaches. S2's reach-arc exposure readout and the
  family register land here.
- **Mind opens with who you are before what you propose.** The masthead
  moved here when Family became Reach: the world plate and the charter,
  and **not the name**. The HUD carries the name over every page, a band
  above, so putting it in the masthead too would be the same word twice
  in one glance — the defect the source card's summary stands down to
  avoid (§ Settled: overflow detail). Below it, `WHAT WE WOULD DO NEXT`
  renders the mind's ranked proposals in the server's order (never
  re-sorted client-side), each with an accept verb and a `Leave It`
  beside it. Then `PLAY THE OPENING AGAIN`. Then, under a hairline and
  in the aside tone, the housekeeping that belongs to the *player*
  rather than to the civilization: the account, the watch, and
  `Start over` / `Give up this civilization and inherit again.`

### The deciding test

When a new surface arrives, one question decides its tab: **what is this
page about?** Not which system produced it, not which module it lives in.
The survey is about the sky, so it is Sky's even though voyages built it;
a standing order is a rule the line keeps rather than an undertaking that
ends, so it is Reach's even though it rides the same machinery as a
launch; the start-over page is about the player's run, so it is Mind's.

The check on the answer is a player sentence: **a page whose tab is not
lit is a page the player cannot explain being on.**

### Deep links and back legs

- Every `open*` on the board lights its owning tab. The rail's highlight
  is derived from the current view through `VIEW_TAB` and from nothing
  else, so a page opened from a report route, a proposal, a source card
  or the map lights the same tab as the same page reached by tapping the
  rail. `VIEW_TAB` is exhaustive by construction: a page added later
  without an entry does not compile.
- A **landing has no back leg** — the rail is the way out — and dims
  nothing behind it. A **drill-in always has one**, labelled `‹ BACK`.
- A back leg comes home somewhere the player can explain. Normally that
  is the owning tab's landing (explore, the Desk and the survey all
  return to Sky's page, and a study board backs out to the Desk it was
  opened from). The routed exceptions return to
  where the tap came from instead: a project sheet opened from a report
  entry backs out to the report, and one opened from a proposal backs
  out to the Mind page. In those cases the rail lights the page's own
  owner while the back leg points at the page the player came from —
  the rail answers "where am I", the back leg answers "how do I undo
  this tap", and they are allowed to be different answers.
- A page never dims the map behind it into a modal. The two true
  overlays (the ceremonies and the intro) are the only surfaces that
  take the screen.

### Calm, as shipped

S0 turned principle 6 into mechanics, and these are load-bearing:

- **The report's session auto-open is dead.** No session opens on a
  wall of text; the report waits to be read.
- **The badge is a count of unread entries**, and nothing else. It is
  derived by diffing the report's entry ids against a per-civ
  `localStorage` marker keyed on each entry's stable id, so a reload
  does not re-announce arrivals already read. A storage failure
  undercounts rather than crashing the shell — the safe direction.
- **It clears on a chosen open.** Opening the Report tab writes the
  marker and drops the count to zero. Nothing else clears it, and it is
  never cleared on the player's behalf.
- **Zero removes the badge entirely.** It is never shown resting on
  zero.
- **Nothing pulses.** No animation, no push, no nag. The badge does not
  bounce and the rail does not move under it.
- **The chrome holds still between renders.** The counsel strip was the
  one band whose content turned over, and even it turned over wholesale
  rather than by transition. With it cut, the only things on the home
  screen that change on their own are the epoch year, which ticks, and
  the badge, which counts.

### Desktop

Desktop is the same surfaces given room, not a different design. Past the
wide breakpoint a page **docks as a column** against one side with the
Model beside it, over a light scrim that says the sky is still there and
tapping it returns you. The rail stays a full-width bottom bar at every
width — it is the page that stops short of the rail, never the other way
round.

The consequence is a rule to build to: **on desktop the map is never
fully covered.** A page that needs the whole screen on desktop is a page
that has been designed wrong. Selection stays coherent across the split:
the ring on the map tracks whichever system the open page is about, and
falls back to the page's system when a card is dismissed.

One shipped surface does not honor the column yet: a source card carrying
a focused study has no wide override and runs full width past the
breakpoint (§ Settled: overflow detail). It is a known gap left by a call
made on a phone, not a second desktop pattern.

### Settled: overflow detail (S0.4, 2026-08)

The one UX call the reboot deferred to S0 was where **overflow detail**
lives: on map-anchored cards, or on dashboard pages. Both were built and
put on a phone. **The card carries it.**

The case under test was the **focused study** reached from a source card:
the deepest reach in the game, and the only card verb whose target is
detail rather than a composer. It nests — a question row folds open
inside it — it rebuilds every second, and it ends in a two-tap `call it`
commit, so it leans on a container every way a phone can. The pre-commit
brief was deliberately out of the test, because no source-card route
reaches it and putting it in would have meant inventing navigation to run
the comparison.

As shipped, the focused study's DOM renders **inside the source card**.
The card takes a fixed height rather than sizing to its contents (the
study's countdowns change width as they run, and a card that breathes
under a thumb cannot be read) and scrolls on the inside. The docked board
page is no longer the container for it. Every other page under the rail
is untouched: this is one surface's containment, not a new frame.

**The strip of sky is what decided it.** The card stops short of the HUD
and leaves a deliberate band of map visible above itself — five and a half
rem of it, pinned as `--card-detail-sky` beside the two heights it is
subtracted from. Without that band the two builds sat within eight pixels
of the same height on a phone and the comparison would have measured
nothing. With it, the detail is read *at* a place that is still on the
screen, and the kept ingredient survives the deepest drill-in the game
has. Everything else was held equal on purpose, which is why the strip is
the trade the call was about. The card also stayed **opaque**, as tested:
the page it beat was translucent over a three-pixel blur, and what shipped
is the build the thumb judged.

**What the card gives up, stated plainly.** While the detail is up, the
card's own summary and its four verb rows are hidden. That is a departure
from the literal phrasing this document carried before the build — that
detail "expands in place *below* a card's summary" — which was written
when nothing had been built yet. In practice the focused study renders its
own identity header, so keeping the summary would put two identity blocks
about one system on one screen, restating each other in different words
and charging something like a hundred and forty vertical pixels of a phone
for the restatement. The rows are hidden rather than torn down, so
releasing the detail restores the card without rebuilding it.

**Getting out** is four ways: the detail's own `‹ STUDIES` back leg, a
swipe down on the grabber, a tap on the strip of sky or on the HUD band
(its pass-through regions — the band's readouts catch the tap for their
own note instead), and any rail tab. The rail lights **Sky** the whole time the
detail is on the card, which is the deciding test's own answer — a study
is about the sky. The deep-link rule and the back-leg rule above are
inherited unchanged.

**Two known gaps, both desktop, both deliberate.** Escape does nothing
while the detail is on the card: the card has no global Escape handler and
the board's requires the board's own open flag. And the card has no wide
override, so past the wide breakpoint it renders full width where the
board page narrowed to a column — § Desktop's column rule is unmet on this
one surface. The call was made by thumb on a phone, which is what the
method asked for; closing these two is a keyboard-and-desktop pass, not a
reopening of the call.

**The verdict is about reading, not composing.** The launch and voyage
composers carry text input and a press-and-hold commit, were out of the
test, and are a separate call (§ Open questions).

The frame never depended on the answer and does not now: the Model is the
centerpiece, the rail owns navigation, the deciding test assigns tabs, and
every drill-in lights its owner.

### Interim: the seeded sky

The sources visible on the map at the start of a run, and the threads
already listed under `THE VOICE`, are **seeded by the A-phase
generation** and predate the detection gating S1 brings with the
two-layer sky (roadmap.md § Phase S, S1). They are the reason a fresh
civilization can see neighbours at minute one, and they contradict the
Fermi-honest baseline the two-layer sky establishes, in which an early
sky is empty until instruments earn something out of it.

Treat them as scaffolding: **S1 retires them.** Do not build a surface
that assumes a populated opening sky, and do not "fix" the emptiness
that arrives when S1 lands by seeding it again.

---

## The intro (shipped, S0.1)

Four beats between the inheritance ceremony's BECOME and the home screen,
staged as **one continuous camera move on the Model** — not a slideshow
bolted in front of a game. The camera recedes at a constant rate of
distance per second and rests four times: the star's limb filling the
frame, the scale rail, the waking rings at the first light-year, and the
ambiguous sky of the wider volume. Scale is *felt as travel* rather than
read off a caption.

- **Tap to advance.** Nothing auto-advances; a tap launches the next leg,
  and the canvas underneath is the tap target. Each line fades in while
  the camera is still moving, so words always arrive mid-flight and never
  sit on a static frame.
- **Two chrome words, and no more.** A faint `Skip`, offered from the
  first beat and placed out of the thumb's path, and `Begin` at the end.
  A skip is never a cut: the camera makes the whole journey, faster.
- **The purpose is shown, never stated.** The four served lines are the
  only prose on screen. There is no banner and no tutorial sentence
  saying what the player is for; the banner was mocked and cut in review
  and does not return. Beat four's silence before `Begin` is deliberate
  and is not filled.
- **The copy is pinned** in build-s0.md § "The intro's copy" and is not
  restated here: one source, byte-exact, and a gate rejection is reviewed
  against that brief rather than fixed in place. The beats carry no dates
  at all (R-33) and beat two shows the scale without naming it.
- **Beat four may not assert a neighbour.** Its smudges are deliberately
  outside the shipped detection grammar — no core, breathing down to
  nothing — and the Model's own amber is held at zero for the whole
  sequence and eased back in at `Begin`. What resolves at the end is the
  instrument, not a sky that moved. The art may not claim what no
  instrument could.
- **Played once, server-tracked.** The intro autoplays only when a fresh
  BECOME is pending *and* the server actually served all four lines;
  their presence is the contract, because a served line means unseen. A
  returning player never sees it uninvited, and a reload mid-sequence
  comes back into the sequence rather than falling through to a bare
  resume. Finishing and skipping both count as having seen it.
- **Replayable from the Mind page**, through `PLAY THE OPENING AGAIN`. A
  replay saves the camera, dollies in, plays, and dollies back out; it
  marks nothing as seen and fires no arrival beat.

---

## Type, ink and wrapping

Three faces, one ladder, three ink tiers. All of it lives in
`client/src/style.css`; **never hard-code a size or a raw ink color in a
component rule.**

**The three faces.**

- **Cinzel, the titling face.** Caps only, no italic. Headings, the rail
  labels, the civilization's name over the sky, panel titles, place
  names. It is the face the ceremony crowns a civilization in, which is
  why the HUD wears it: the name over the sky is the same name.
- **Source Sans 3, the text face.** Everything that is a sentence,
  upright and italic, including the charter.
- **JetBrains Mono, the instrument face.** Machine readouts *only* — a
  value an instrument produced: a distance, a clock, a count, a machine
  ID. The shipped set is a single grouped selector list in style.css: the
  scale readout, the HUD's designation and year, the rail badge, the
  source card whole (its designation, its belief line, and the light
  history's year axis — a class and the confidence in it are one reading,
  so the face never splits across them), the same reading at list scale,
  the stamps and prices outside the board, and **`study-tabular`**, the
  hook the board already applies wherever it prints a figure. That last
  one is why the list stays short: a surface that adopts the hook is
  covered without an edit. **When a new readout ships outside it, it
  joins the list**, so "what is a readout?" stays answerable by reading
  one place. Mono runs wide, so nothing in it takes letterspacing.
  Prose and labels never wear it, and neither does the name a *player*
  gave a source: a name is not a readout.

**The ladder.** One `--holos-text-*` scale for the whole UI. The floor
for anything a player *reads* is `--holos-text-xs`: prose, sub-lines and
label lines bottom out there, and something that wants to feel quieter
does it with color or letterspacing, not by going smaller.
`--holos-text-xxs` sits below that floor and is **not reading type** — it
is for short, repeated, *enclosed* classifiers a thumb recognises by
shape and position (the Tend row badges, the rail's count badge, the
compute meter's label riding its own bar). Two conditions travel with it:
the mark must be short and repeated often enough to be learned, and it
must be enclosed or otherwise separated from the prose around it. **A
sentence at xxs is a bug, and so is a lone unenclosed label** — which is
why rail labels are xs.

**The ink tiers.** `--holos-ink`, `--holos-ink-dim`, `--holos-ink-faint`,
tuned for the worst case: a phone screen outdoors, where glare lifts the
black floor and low-alpha text disappears. They still read as a
hierarchy; the dim and faint steps just never fall below what sunlight
leaves resolvable. **Do not push them down for mood** — the mood is the
near-black stage and the gold hairlines, not dim prose.

**The color invariants.** Cyan = you (present tense, your own works,
`HOME`, the HUD's mark); amber = other (belief, old light, a detected
source). Those two are SEMANTIC and carry meaning on the map and in
prose; prose must never call `HOME` amber or a source cyan. The rail's
light-amber labels are a chrome tint, not a claim — a designer call for
warmth against the sky that deliberately carries none of amber's
belief meaning, the same way gold hairlines, pill borders and the
badge's rim are chrome rather than statements. Muted indigo belongs to
the compute meter alone.

**Wrapping is a policy, not a per-component decision.** The Wrapping
block near the top of style.css owns it: titles, subtitles, headers and
short label lines get `text-wrap: balance`; running prose gets
`text-wrap: pretty`, inherited from `body`, so it is the default. A new
heading or prose class joins the matching selector list **in that
block** — never a `text-wrap` declaration in a component rule. The block
sits above every component so a later `white-space: nowrap` still wins.

**No em dash reaches a player surface** (prose-style.md R-8): not in
prose, not in a chrome label, not as a missing-value glyph (the clock
pair's is an en dash), and not disguised as a double hyphen.
`npm run audit:dashes` draws the line mechanically over string literals,
and `stylegate.ts` enforces it on lines generated at runtime.

---

## Two registers on one screen

The presentation doctrine, from stakes-design.md § Two registers: **the
instruments report, and the mind argues.** The same screen speaks twice
and the registers never blur.

- **The instruments report.** Numbers, ranges, staleness stamps, costs.
  Clear, concise, actionable. Numerals belong here, and so does the mono
  face. On the home screen this register is the HUD band (designation,
  ticking year, compute meter), the map's own scale and labels, the
  report's stamps, and every clock pair and age chip on a page.
- **The mind argues.** The voice — the banks, the style gate,
  prose-style.md — carries the authored beats, the chronicle lines and
  the mind's counsel, and stops carrying load the instruments should
  carry. On the home screen this register is the report's header sentence
  and the one remark that rides it, and the Mind page's proposals and
  stances. It holds no band of its own: since the counsel strip was cut
  the mind speaks beside something that happened, or it does not speak.

Two consequences a builder should hold on to. **A numeral in the mind's
prose is a register leak** (the mind spells its numbers; numerals belong
to the instrument register). And **intent is never a readout** — not in a
remark, not on a card, not ever: the instruments report what can be
measured and the human judges what cannot, and the mind argues without
ever computing a verdict.

---

## Act by act (still specification)

Everything in this section is designed and unbuilt except where noted.
The Act 3 entries name which rail tab already owns each surface, so an
implementation slice re-homes rather than re-invents.

### Session zero — the world reveal

A cold open: the canvas resolves from noise into the cradle — its sun's
color, its gravity in the set of the horizon, its defining pressure
rendered before any text. Then one card: the world's name-slot (yours to
fill), its profile in the catalog's plain fields, and its tier stated
without euphemism. No menu precedes it; the URL opens into the world
(vision § The arc, Act 1). Difficulty dial and a Tier I–II guaranteed
first draw live behind a single "this world or an easier start?" choice,
not a settings screen.

### Act 1 — the beat frame

The whole act is one repeating screen, the **beat frame**, in three
movements (vision.md § The arc, Act 1 — scene, decision, roll):

1. **Vignette** — full-bleed scene on the map surface with sparse caption
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

Act 1's one reference surface is **the History spine** — a vertical
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

- **The report** is the Report tab's landing: scenes generated from state
  deltas, in the mind's register, each entry routed to the thing it
  describes. Reading the report *is* the session's onboarding; there is
  no "what's new" panel besides it. It waits to be read (§ Calm, as
  shipped).
- **The system map** transforms as the ladders climb — swarm filling in,
  or star dimming as the Vault deepens. Per playstyles.md's parity
  requirement, the dark path's transformation is rendered with the same
  fidelity as the bright path's: quieting is *drawn*, not implied by
  falling numbers.
- **The dial sheet**: drag the notch within the band. Dragging *outside*
  the comfort band doesn't snap back or refuse — it shows the Coherence
  price inline and the mind's objection as a one-line dilemma preview.
  Forcing is a ceremony (§ principle 5). It belongs to Mind: the sheet is
  about who the civilization is, which is that page's subject.
- **Ladders and projects**: two opposing columns (bright / dark) whose
  stages light as thresholds cross; project cards carry the **clock
  pair** — game time and real time together — so deep time stays legible
  without a tutorial. Projects' tab, beside the catalog already there.
- **The quiet number**: Signature is deliberately *not* a stat panel
  (act2-design.md). It renders ambiently — the home system's halo
  brightens as Signature climbs. Players who notice, notice; the exact
  number exists one tap deep for those who go looking. The UI honors the
  design's intent that ignoring it is a legitimate (and consequential)
  way to play.

### Act 3 — the sky and the pages under it

- **The Sky / the Model** — shipped, and the home screen's centerpiece
  (above). Specified in [act3-map.md](./act3-map.md): the home system
  recedes to a mote, the sky acquires depth off-axis, and the map renders
  *belief*, never truth — light-age ghosting, uncertainty as literal
  fuzz, the player's own light echo as an orbitable expanding shell.
  Sources render as what they optically are: smudges, warmths, shadows,
  not gameplay icons. Selecting one opens its **source card**:
  designation, a pen to name it by, the light-age chip, the belief line
  (class and confidence, with an info toggle whose five pinned texts say
  what that *class* means and never what *this source* is), and the
  **light history** — a step chart of what the source has been emitting
  across the span of light that has reached you, its right edge the
  newest light held and nothing ever drawn past it. The chart is a glance
  by default and expands in place on a tap, gridlined, with its axis
  density derived from what the width can hold. Beneath it the four verbs
  are lit buttons, each in its own semantic color: gold for the study,
  amber for the probe and the ship, cyan for the beam. The study verb's
  target now renders **in the card itself** rather than on a docked page
  (§ Settled: overflow detail), which is the card's second job: while a
  focused study is up, the anatomy in this paragraph stands down and the
  card is a fixed-height frame scrolling on the inside. Time-scrubbing is
  a later slice; the archive is read, not yet scrubbed. Sky's.
- **The observatory** — the inference workbench, shipped in its
  read-first form as Sky's Desk and the board standing on every source.
  Vigils as studies: hypotheses with confidence shares, buyable questions priced in
  compute (a purpose-level choice — *which question*, never *which
  telescope setting*), answers that sharpen, plateau, or regress, and
  per-study tripwires
  ([observatory-design.md](./observatory-design.md) is the spec). This is
  Silence's verb set (playstyles.md) given a surface. Sky's.
- **The choice screen**: contact's irreversible stage gets the full
  ceremony — hail renders a thread of light to one source; broadcast
  renders the expanding shell touching source after source with arrival
  dates; stay dark simply returns you to the map, the only option that is
  a tap. Armed from the source card or from `THE VOICE`; it takes the
  whole screen and the shell stands down under it. Sky's.
- **Signals**: traffic as threads, one thread per tight-beam channel. An
  in-flight signal renders on the map as a moving point on a line between
  stars — the wait made visible — and the thread shows both clocks. Every
  received signal wears its physics: transit years, distance, received
  strength, relay path, degradation — set as an instrument's measurements
  attached to the payload, in the observatory's register. The texture is
  astronomy, never mail. Sky's, under `THE VOICE`.
- **The work list**: the work graph — every undertaking, project or
  mission, as a row with its class chip, clock pair, physics-derived
  state, and one level of nesting; a node awaiting light shows its
  countdown, and a `silent` node fires a beat, never a badge
  (missions-design.md, § The work list). Purpose altitude throughout: the
  smallest visible unit is a thing worth deciding. Projects', shipped as
  `TEND` under `Start a project`.
- **The Ledger**: the lineage as a tree. Each fork's row shows its
  charter, last-known state, staleness chip, and its dial sheet **ghosted
  against yours** — your notches faint behind theirs, so drift is read as
  two overlaid characters diverging, not as a number. An independent
  fork's row changes tone (its ghost notches drop away): it is no longer
  measured against you. Reach's.
- **Sleep**: entering it visibly dims the whole interface to embers. The
  tripwire editor speaks the design's own grammar — *wake me if anything
  warm moves within N light-years; if a beam touches us; if a fork misses
  two scheduled reports; after T years regardless* — as composable
  plain-language rows, not a settings form. The **wake report** is a
  distinct triaged layout (the walkthrough's Week 6): bombshells first,
  then the sky digest, then the queue — built for the jackpot moment the
  engagement model banks on. Report's, with the standing order that
  governs it on Reach.

---

## The component library

The small set of parts everything above is assembled from — each built
once, used everywhere. The first four shipped in S0, and one of those four
has since been cut; its row stays, because a part that was built and
removed is worth knowing about.

| Component | Contract |
|---|---|
| **HUD band** | cyan mark + name (titling face) left, designation over ticking epoch year (mono) right, compute meter under the name; two fixed rows, never a wrap; the readouts toggle a pinned what-this-means note (§ Anatomy), the rest of the band passes taps through |
| **Counsel strip** *(shipped S0.3, cut 2026-08)* | one argued line from the mind + TALK, both opening the Mind page; empty collapsed to nothing; the arrival line sticky until acknowledged; no animation. Removed when the line proved to be ambient counsel with nothing at stake, and TALK a third door to a page the rail already opens; § Anatomy holds the record |
| **Rail** | five equal tabs, pinned words and order, titling face at xs in amber with the lit tab full amber; exactly one lit, derived from the view through `VIEW_TAB` |
| **Page** | docks between HUD and rail; a landing has no back leg and dims nothing, a drill-in carries `‹ BACK`; never a modal over the map |
| **Hub row** | a verb line over one sentence of what it is for; absent entirely when it has nothing behind it, never greyed |
| **Tend row** | name, clock pair, physics-derived state badge (an enclosed xxs classifier); one row per undertaking |
| **Report row** | stamp + record sentence + optional remark + route; inert when the route is none |
| **Beat frame** | vignette → choice cards → consequence; identical anatomy in all acts; Act 1 adds the roll, Act 2+ replaces it with the cost line (the dice die at the pivot, visibly) |
| **Light-age chip** | mandatory on every remote fact; `AS OF n Y AGO`, mono |
| **Confidence render** | belief + %, visual sharpness ∝ confidence; never a resolved icon below a confidence threshold |
| **Dial band** | range band + position notch; ghostable (Ledger); price-on-drag; used for reveal, sheet, charters, drift; poles render as **in-world labels** — Reach · Depth, Voice · Silence, Garden · Forge, Monolith · Chorus, Memory · Renewal (act2-design.md § In-world labels), never the design vocabulary |
| **Clock pair** | game time + real time, always together, everywhere a duration appears; an en dash stands in for a missing half |
| **Hold-to-commit** | the irreversibility ceremony; consequence renders during the hold; releasing early cancels silently; the shell hides under it |
| **Source card** | designation + pen-to-name + age chip + belief line with a class explainer + the light history (small, tap to expand) + four lit verb buttons; opened from the map, and the way into a sending. Also the container for a focused study's overflow detail (S0.4): a fixed height under a strip of sky, scrolling on the inside, with the summary and the verb rows hidden while the detail holds the surface |

---

## Mobile first

**The portrait phone is the canonical device.** Every screen in this
document is designed at phone width first — one column, one thumb, pages
docked between HUD and rail — and must be complete there: no decision,
reading, or ceremony may require a larger screen. The typical session
(5–20 min: read the report, answer the mind, tap a vigil's new light) is
a phone session by default.

Desktop is the same surfaces given room (§ Desktop above): the map
becomes a place to *dwell* while a page reads beside it. Nothing is
desktop-only; the split is cadence, not capability. Notifications are
OS-level push, tripwire-authored only, and each deep-links to what
tripped.

---

## Two registers of art

The game renders in **two distinct visual registers**, and they must not
bleed into each other:

- **The interface is austere and typography-led** — the "typeset book
  crossed with a scientific instrument" of
  [ui-image-brief.md](./ui-image-brief.md). Its content bans (no aliens,
  people, machines drawn as chrome) keep the frame quiet; that quiet is the
  Teeming Dark made tangible.
- **In-game content — species, technology, worlds — is representational
  and wanted.** The life the player raises across Act 1, the works it
  builds in Act 2, and its own cradle are known *intimately*, and they get
  real rendered art, not smudges. This is the content *inside* the frame,
  not the frame.

The line between the two registers is the epistemic line the rest of this
document already draws: **you render what the player knows up close, and
you refuse to render what they only infer.** Their own species and
technology are known — draw them. A distant civilization is a belief — it
stays a warmth, a smudge, a classification with confidence (§ principles
3–4), never a drawn body or machine, no matter how advanced the observer.
Species and technology art depicts the *self and the seen*, never the
inferred other. Content art also honors the fiction's own toolkits — bright
megastructures on the energy path, compact quiet works on the integration
path (vision.md § Source framework) — so the look of a civilization's
technology reads its character, the same way its dials do.

The content register's adopted look is **cinematic matte painting** —
painterly but physically photoreal, sharing the interface palette (near-black
grounds; ember = warm/alive, cyan = the civ's own works). It is built as a
**mix-and-match layer library**: three independent axes — origin world,
species, technology — each generated on a neutral ground so any valid triple
composites cleanly (the data's `candidateLineages` and lineage→mind tables
gate which triples occur). One asset per possibility, keyed to the catalog id.
The full shot lists live in the content-art briefs:
[worlds](./content-art-worlds.md) · [species](./content-art-species.md) ·
[technology](./content-art-technology.md).

---

## Open questions

- **Where a composer's overflow lives.** The cards-versus-pages call was
  settled on the card (§ Settled: overflow detail), but it was decided on
  a *reading* surface and generalizes no further than that. The launch
  and voyage composers carry text input and a press-and-hold commit,
  neither of which the tested surface had, and were out of the test.
  Which container they take is the next call, and the answer is allowed
  to differ from the reading surfaces'.
- **Whether the mind ever gets an unprompted surface again.** Cutting the
  counsel strip (§ Anatomy) left the mind speaking only beside a report
  entry or a proposal. Whether that is the right resting state is the
  next slice's call. Nothing above depends on it, and the strip is not
  the answer by default — it was tried. The arrival line, which this
  question used to carry with it, is no longer part of it: it was settled
  2026-08 as cut (§ Anatomy), so nothing here waits on where it lands.
- **Art direction (interface look)** — this doc specifies structure and
  rules, not look. A working proposal (dark astronomical matte,
  ember-warmth accents, editorial type) lives in
  [ui-image-brief.md](./ui-image-brief.md) as the concept-image brief; it
  is a candidate, not a decision. What *is* settled is the split above
  (§ *Two registers of art*): the interface stays austere while in-game
  species and technology art is representational. The one commitment the
  design forces on the interface either way: the sky must read as *dark and
  mostly empty*, because the Teeming Dark only lands if the screen itself
  is quiet.
- **The instrument register's style rules.** prose-style.md governs the
  mind's prose; the instruments have conventions (mono, tabular numerals,
  the age chip, the clock pair) but no written rulebook and no audit.
  S4 owns writing them down and wiring them in (stakes-design.md's own
  open question).
- **How much scene is rendered vs written?** Beat vignettes could be
  full Pixi scenes, styled stills, or prose-forward cards. Cost scales
  brutally with the first option; v1 likely ships prose-forward with a
  rendered map behind it, upgrading signature beats (the reveal, first
  contact) only.
- **Accessibility of the canvas.** The prose surfaces are DOM and
  screen-reader-clean by construction; the map needs an audit — every
  canvas-only signal (halo, quieting star, in-flight signals) must have a
  page equivalent.
- **Archetype names in-game** (open in act2-design.md) becomes a UI
  question here: the reveal sequence works with or without a name at the
  end; shipping v1 *without* naming keeps the question open cheaply.
- **The signal composer** waits on the player-language decision; the
  thread and flight rendering above are deliberately agnostic to it.
- **Onboarding density.** The principles replace tutorials with rules
  (tense, age chips, clock pairs) that teach by consistency. S0's intro is
  now the whole of the first real test: the counsel strip that was meant to
  share the load is cut, so the rules carry a new player unaided or they do
  not. The next playtest answers it.
