# HOLOS
### The Walkthrough — one player's first season, from the inheritance on

*What it is actually like to play Holos as it ships: a detailed, session-by-
session account of one player's first six weeks, beginning the moment he
joins a cohort and is offered three lives that are not his. This document
replaces the earlier walkthroughs, which followed the origin acts first; the
build order changed (roadmap.md, § The decision), and the played experience
starts where v1 starts — in the galaxy, at the ceremony.*

---

## About this document

The [vision](./vision.md) says what Holos is and why. The
[Act 3 design](./act3-design.md) specifies the machinery this document runs
on; the [civilization catalog](./act3-civilizations.md) maps what fills the
sky; [ui-design.md](./ui-design.md) specifies the surfaces every scene below
is assembled from; [economy-design.md](./economy-design.md) prices the
choices. This walkthrough is a stress test of all of them at once: it
follows one player through the opening season of the v1 game — inheritance,
the Sky, contact, a launch, sleep, a wake — and checks that the systems, the
clocks, and the fiction actually produce the experience the vision promises.

It is written in close third person and present tense, at the level of
specific sessions on specific days, because the async rhythm — short bursts,
enormous consequences, all on the player's own clock — is the thing being
tested. Everything here is downstream of the design docs; where a scene
depends on a system beyond the v1 slice, it is flagged in
[Beyond the v1 slice](#beyond-the-v1-slice) at the end. All game-year
figures assume the tuning target of **5 real minutes ≈ 1 game year**
(act3-design.md, *The clocks*) and are done honestly against it; they are
illustrations of the ratio, not commitments.

---

## The shape of the game being joined, in one breath

Holos v1 is the interstellar act, entered whole. There is no character
creator and no empty rock: a joining player takes over a **generated
civilization** — a real world from the cradle catalog, a real species from
the lineage catalog, a mind that woke with a character derived from both —
and makes it theirs by naming it and accepting its charter (roadmap.md,
*The stub is canon*). The solo origin acts, where a player will one day
raise that history personally from first life, arrive later and slot in
beneath this same seam. Until then, every civilization in the galaxy —
the player's included — carries a played-shaped history nobody played,
legible all the way down.

The player joins a **cohort**: a neighborhood of stars a few tens of
light-years across, seeded with civilizations spanning age and character,
some run by rules, some by humans who joined in recent weeks. Which are
which is never disclosed, and the interface is built so it cannot leak:
there is no player list, no presence dot, no chat (ui-design.md, § No
presence). The sky is the only multiplayer surface. Everything another mind
does reaches the player as light, delayed by exactly its distance, and at
that range a human and a rule-set are indistinguishable — deliberately. The
uncertainty is the game.

---

## The player, and the clock he plays on

**Theo** (he/him) plays Holos on his phone on the train and on a laptop
after dinner. His sessions run fifteen to forty minutes. He has read
nothing about the game beyond the sentence a friend sent him — *you inherit
a civilization and the speed of light is the cooldown* — which is, as
onboarding goes, accurate.

The clock he is about to live on:

| In the fiction | On Theo's clock |
|---|---|
| 1 game year | ~5 minutes |
| Message one-way, 6.8 ly | ~34 minutes |
| Message one-way, 27 ly | ~2.3 hours |
| Seedship at 0.1c to 12 ly | ~10 hours |
| A working day away from the game | ~290 years |
| A two-week vacation | ~4,000 years |

Near neighbors converse within an evening. Anything distant is a
commitment of days. And simply living his life — sleeping, working,
forgetting the tab exists — is deep time passing, which is exactly what
the design wants absence to be.

---

## Day 1, morning — the ceremony

*(Session: 30 minutes, a train and then a coffee shop. In-game: the cohort
clock is running; the civilization he is about to become ascended three
years ago.)*

The game is a URL. No installer, no account wall, no launcher; the page
opens into darkness, and then the darkness resolves into a planet.

Three civilizations are offered, presented as a vertical carousel of
cards — the focused card is the full read, its neighbors peeking above and
below with just a world, a species, and a name-of-kind (the built ceremony,
`client/src/ceremony.ts`; the count is deliberately small — a menu would be
the wrong genre). Each card is a complete life, rendered from the same
record the game uses to run it:

- **The world.** A painted planet fills the top of the card — its sun's
  color, its defining pressure visible before any text. Beneath it, the
  cradle's plain catalog fields: name, host star, and its tier stated
  without euphemism (`Gentle`, `Temperate`, `Testing`, `Harsh`, `Brutal`).
- **The species.** The lineage that climbed that world, in one line of
  the body's own voice.
- **The dial sheet, revealed.** Five horizontal bands, each with a
  shaded range and a notch — the character the history earned, and the
  room it left. The poles carry in-world labels only — `Reach · Depth`,
  `Voice · Silence`, `Garden · Forge`, `Monolith · Chorus`,
  `Memory · Renewal` — and tapping a row expands the question the dial
  answers and what leaning each way means. Where the shaded band is
  narrow, the character is already decided; a harsh world leaves firm
  convictions.
- **The chronicle.** The legible history, a handful of dated, past-tense
  lines from first life to the threshold — the opening pages of a record
  that never stops accruing.
- **The charter.** One sentence, set like a line carved over a door: the
  founding document the player will be accepting, not writing.

Theo reads all three.

The first is a bright life: **Ross 128 b**, `Temperate`, a twilight-band
species under an unusually kind red sun, dial notches leaning hard into
Voice, the archetype line reading *Kindness at full volume; it builds
bright and greets the dark first*, and a charter that says
*We shine so none need wake alone; that we are seen doing it, we can live
with.* The second is stranger and plural: an ocean world, a tentacled
lineage whose wake line reads like a parliament discovering it is in
session, a charter beginning *Another mind is indispensable.*

The third card holds him. **Teegarden's Star b** — `Testing` — *an ancient
world under a faint ancient star: deep time, little energy, a civilization
that grows slow, patient, thrifty with light.* The species is a **networked
substrate mind**: *a landscape that thinks slowly and everywhere: its
memory is structural, which is to say it does not forget.* The wake line
is the quietest thing he has ever read in a game:

> *The least discontinuous pivot there is — already planet-scale, already
> storing everything, it does not so much wake as notice.*

The dial sheet reads like a portrait of that sentence: the notch deep
toward Depth (a band of roughly 0.5–0.85 — the dim star never taught it to
want the sky), Silence leaned but genuinely wide (0.2–0.75; the one dial
its history left open), a mild lean to Garden, Monolith at 0.8 in a narrow
band (it is literally one network), and Memory at 0.85, pinned almost to
the pole. The archetype line: *A civilization that keeps everything,
itself included.* The chronicle's last entry: *When the choice came, it
chose the dark; the light of its bright years had not yet arrived.*

He does not fully understand that last line yet. He will by tonight.

The charter: **What we were, we keep; what we keep, we are.**

Then the card asks for the one thing the record does not have: a name.
Suggestion chips scroll under the field — compound names, and stranger
phrase-shaped ones (`Present Tense Only` sits there like it was authored
for this card, which in a sense it was) — but the field is his. He looks
at the faint ancient star a moment and types **Longlight**.

The commit is a ceremony, not a click: **BECOME**, pressed and held. As he
holds, the card's amber — the color the interface gives to everything that
is not you — cools to cyan, the color of HOME, the one hue the game
reserves for the present tense. Releasing early would cancel silently.
He holds.

### The pull-back

The card falls away and he is looking at a small planetary system — his,
crisp and current, the only place in the universe the interface will ever
render in the present tense. And then the camera keeps going. The system
shrinks to a cyan mote, the star field opens, and the view slides
*off-axis*: the flat sky acquires depth, near stars parting from far ones,
until he is floating in a three-dimensional chart of everything Longlight
believes about its neighborhood. A caption sits in the corner, small and
unapologetic: `THE MODEL — WHAT WE BELIEVE`.

And the mind speaks its first line — the interface has a narrator now, and
it is not a tutorial voice; it is the civilization:

> *The record is complete up to this morning. What happens next has been
> left, deliberately, blank. That is what you are for.*

### The first sky

The report presents the neighborhood survey as a catalog of sources, each
rendered **as of the moment its light left** — never its present. Most of
the sky is exactly what it looks like: stars being stars. Four entries are
not, and each arrives as a soft amber smudge on the Model whose fuzz is
its uncertainty, with a source card that rises as a bottom sheet when
tapped — designation, a light-age chip, classification beliefs with
confidence, and a scrubbable archive of everything Longlight's instruments
have ever received from it:

- **HOL-0031**, 6.8 ly. `AS OF 7 Y AGO`. An infrared excess with no
  visible source — warmth without light. `DARK NODE · 34%`, brown dwarf
  58%, rogue world the remainder. The nearest question in the sky. Theo
  taps the name slot and calls it **Hearth** — the name is local
  knowledge, never transmitted; whatever Hearth calls itself, or him, no
  instrument will ever sync.
- **HOL-0117**, 27 ly. `AS OF 27 Y AGO`. `BROADCAST LEAKAGE` — wideband,
  sloppy, almost musical — plus `TRANSIT SHADOWS` too regular to be
  natural: a swarm under construction, seen as it was building it
  twenty-seven years ago. A young or careless civilization, or one that
  does not care who hears. He names it **the Lantern**.
- **HOL-0209**, 41 ly. `LIVING WORLD` — a biosignature, pre-singularity.
  Somebody's first act, visible from outside. Nothing to decide;
  something to feel. He names it **the Shallows**.
- **HOL-0388**, 76 ly. A deep, cold, heavy mass, dark in every band with
  the faintest possible infrared floor. Confidence: unclassifiable. The
  annotation, in full: *Older than my confidence.* He does not name it.
  Some things you do not name on the first morning.

Twenty-five minutes have passed. Theo closes the tab on the walk to work,
holding a civilization he did not build, four smudges of light, and the
specific sensation — which the whole design is aimed at — of having been
handed someone else's unfinished sentence.

---

## Day 1, evening — the debt

*(Session: 40 minutes, laptop. In-game: ~year 160 AE — the interface dates
everything from Longlight's own founding event, its ascension; the
cohort's global clock never reaches a played surface.)*

A working half-day has passed in Theo's world; a century and a half has
passed in Longlight's. The evening report opens with a line that stops
him:

> *A directed beam touched us today.*

It is from the Lantern — which means it was sent twenty-seven years ago,
aimed at the civilization whose light *they* were seeing then. Theo
scrubs Longlight's own source card, and the chronicle's strange last line
unfolds into physics. The civilization he inherited was not always quiet.
It has a biosphere's faint shimmer running back millennia, an industrial
rise, and then — at ascension, three years before he joined — a **flare**:
the bright, unguarded shine of a newborn mind coming into its power.
Then the turn: *when the choice came, it chose the dark.* The emissions
drop to embers a handful of years later. But the flare's light is still
traveling. Nothing can be unshone.

The Model has a toggle for exactly this, and the interface has been
waiting for him to find it: his own **light echo**, drawn as a translucent
expanding shell around HOME. The bright years are a warm luminous layer
crawling outward at one light-year per year; the dark turn is a dim edge
chasing it, never catching up. Every star currently inside the warm layer
is watching Longlight's flare *right now*. The Lantern heard it, and
answered — an anthem, a star chart of their home, an unmistakable gesture
of *join us, builder, we saw you wake*. It is addressed, precisely, to a
civilization that no longer exists. Theo inherited the record, the
charter, the dials — and the debt. The predecessor's brightness is still
out there, making introductions he did not choose.

The reply screen is the contact protocol's third stage, and it is honest
about irreversibility (act3-design.md, *Contact*): **directed hail** —
answer them, revealing Longlight's existence and current posture to them
alone; **broadcast** — answer everyone, forever; **stay dark** — keep
watching. The first two are hold-to-commit ceremonies whose consequence
renders during the hold: the hail draws a single thread of light from
HOME to the Lantern across the actual Model; the broadcast draws an
expanding shell touching source after source, each stamped with the year
his voice would arrive. Staying dark is just a tap, because it changes
nothing — which is the entire argument for it, made typographically.

Theo drafts a reply anyway. It feels rude not to. And the mind pushes
back — a dilemma in its own voice, the Silence lean and the charter
arguing with his thumb on the commit:

> *They are singing to our flare — to a brightness we spent once and do
> not miss. The song was composed before our silence reached them; by
> now they have watched us go dark, and the watching told them the only
> thing I want said. Answering would resurrect the bright one, at the
> price of the quiet he bought. If you require the reply, I will send
> it. You have seen what it costs.*

The cost is rendered inline: forcing a directive against the dials is not
priced in energy or matter but in **Coherence** — a wound, scaled by how
far outside the comfort band the demand falls (economy-design.md,
*Coherence*). Theo looks at the number, looks at the draft, and yields.
**Stay dark.** Somewhere in the state a flag is set that will matter
later: an unsent reply, kept. Memory 0.85. Of course it is kept.

---

## Days 2–3 — the vigil, and the ladder

*(Four sessions totaling ~90 minutes. In-game: years ~280–870 AE.)*

The Day 2 morning session — year 280 AE by Longlight's own count — settles
into the loop that will carry the season: the **report** (what the light
brought while he was away), the **strategy turn** (purposes, never
logistics), the **beats** (the dilemmas his purposes set in motion), and
release. The strategy turn happens on the **Docket** — the Desk panel
where everything the civilization is doing lives as one nested plan of
works: each undertaking a row with its class chip, its clock pair
(`31 h · ≈370 y`), and a state derived from physics rather than set by
hand — *in hand*, *in flight*, *awaiting light*. The economy underneath
is a hum he steers rather than a spreadsheet he balances: routine income
covers the ambient rows without being asked; a session has one or two
investments he is deliberately aiming; one endeavor accrues quietly
across real days. He never sees a queue, and he never files anything —
the mind proposes candidate undertakings from the state of the sky, and
his verb is choosing. He decides *what for*; the mind owns *how*.

What he says yes to, this week:

- **The vigil on Hearth.** Flagging the source turns it into a case on
  the observatory desk: hypotheses listed (someone's heart; a brown
  dwarf; a rogue world), instrument time allocated between them — a
  purpose-level choice, *which question*, never which telescope setting.
  The case lands on the Docket as a parent with a child already
  drafted: build the deep-inspection instrument (a project, an
  Investment, ~14 real hours), then ferry it out to the solar focal
  line (a mission, a short flight with a clock). Two rows, one purpose,
  and the vigil sits above them, *blocked on light* until they land.
- **The Assay on HOL-0554.** The mind's second proposal teaches him the
  game's cheapest habit. A warmth nine light-years out has sat at
  *rogue world · 55%* since the first survey, and the source card
  offers the two honest prices of certainty: patience, or a probe. He
  launches the probe — an Ambient row, no ceremony, a two-line charter
  — and the mission clock stamps it: *arrival in 90 years* (seven and a
  half real hours), *earliest confirmation in 99*. By tomorrow's
  coffee the answer is home: a dead rogue world, cold and ordinary.
  The smudge resolves; the sky is one question smaller. Most warmths
  are nobody, and now he knows how cheaply that can be found out.
- **The Vault's first deposit.** A beat surfaces the option and Memory
  0.85 makes it glow: deposit the inheritance itself — the whole
  chronicle, first life to the ceremony — into the deep archive begun
  before he arrived. The mind's framing line does the attachment work the
  design is counting on: *Deposited: everything we were, including the
  version of us that shone. What we keep, we are.* It is the first time
  Theo feels the charter as his.
- **The integration ladder.** Longlight's inherited position is one rung
  up the quiet ladder, and the next stage — the compute heart deepened,
  the civilization's world-model refined — is the season's standing
  endeavor. The parity promise holds on screen: progress renders as the
  system going *quieter*, the star's halo dimming on the strip, the
  Model's resolving power visibly climbing. Dark play watches itself
  grow the way bright play watches itself build.

On Day 3, first light from the deep instrument lands, and the
classification arc — the act's detective gameplay — turns over in the
case file:

> *Mass revised downward. Too light for a brown dwarf, too warm for a
> rogue world of its age. Thermal profile steady in a way nature rarely
> bothers to be. Reclassifying.*
> **`DARK NODE` · 71%.**

The smudge on the Model visibly condenses toward a point. No stat
changed; every priority did. There is a mature, deliberately silent
civilization **6.8 light-years away** — close enough that traffic would
run inside an evening — and it has had Longlight's light, all of it,
flare and turn both, for as long as it has cared to look. The confidence
will not climb further this week: past 71% the case notes report the
target's own counter-investment, a mask maintained against exactly this
kind of instrument, and the contest between his sharpening and their
quiet is a running economy, not a die roll (technology.md; the game
never resolves it to certainty — an empty patch of sky stays permanently
ambiguous, by design).

Theo does not hail. Neither, apparently, does Hearth. Two quiet things,
6.8 light-years apart, each reading the other's intent from old light.
The dark forest, at conversational range, played for real.

One more thing happens on Day 3, quietly, in the case notes — the beat
the design gives away for free and this season keeps because of what it
does to an heir in particular. Calibrating the new instrument against a
K-class star nineteen light-years out, the observatory finds the geometry
of a gravitational lens on its far side — positioned, for centuries at
least, along the focal line of *Longlight's own star*.

> *Someone has had our light for six hundred years. They watched the
> substrate learn to think. They watched the flare. I do not know who
> they are. I know that the record you inherited has readers you have
> never met.*

Nothing is actionable. Theo thinks about it at odd moments all the next
day, which is the intended dosage.

---

## Day 4, evening — the launch

*(Session: 45 minutes, the longest yet. In-game: ~year 1,150 AE.)*

Expansion. The survey desk has ranked the reachable systems, and one has
been sitting at the top all week: a **metal-poor drowned world** twelve
light-years out under a small quiet star — resource-thin, stable, the
kind of place a keeper's child could keep its head down. The travel menu
offers v1's two methods: a seedship, slow and cheap and patient, or a
relativistic ship, an era's savings burned to move something coherent,
fast, and bright. The dial sheet leans the choice before Theo weighs it:
a Monolith does not send a copy of itself, and a civilization of Memory
spreads lineage quietly or not at all. Seedship.

The **forecast survey** prices the bet in the only currency the map
respects — knowledge and its age. The destination's light is twelve years
old now; the flight is a hundred and twenty; the survey states it
plainly: *at landfall you will be acting on light 132 years old*, and
renders the arrival spread honestly per class — narrow for a dead rock,
wider for a living world; for this quiet drowned system, a modest fan of
possibilities, the width itself information (act3-design.md, *The
forecast*). Launch now, or watch the target a while and narrow the fan?
He has watched all week. He launches.

Then the game does the thing this session exists for. It asks him to
write the **charter** — the one instrument of governance that survives
the horizon, the constitution that can never be patched after launch:

- **Values.** The dial sheet the colony starts from. He copies
  Longlight's, then hesitates over Silence — the destination is poor and
  quiet; nobody is coming there for anything — and leaves that band
  wider than his own. Memory he pins at 0.85. *Remember us.* The
  interface notes, without comment, that tight charters drift slowly. A
  keeper writes tight charters.
- **Directives.** Root, go quiet, keep the report schedule,
  contribute to the shared survey of the sky.
- **Contingencies.** The ones he can think of tonight, knowing the list
  is by definition incomplete. *If hailed, do not answer before
  informing us — knowing that informing us costs twelve years each way.
  If we fall silent beyond two scheduled intervals, presume us lost;
  open your copy of the record, and decide who you are.*

The framing line under the commit is the whole act in one sentence: **a
value function writing a value function.** He names the child **Fathom**,
and holds.

The seedship departs at 0.1c, a slow ember on a hairline arc across the
Model. The **mission clock** compiles the physics into the three numbers
that make it felt: *arrival in 120 years* (ten real hours — timed, he
realizes, so that it lands while he sleeps); *earliest confirmation in
132* — the flight plus twelve years for the light home; *first scheduled
report thereafter.* The Ledger opens its first row: *Fathom (en route).
Last known state: charter. Drift: 0.00.*

---

## Day 5, morning — landfall

*(Session: 15 minutes, phone, before work.)*

The overnight report is the payoff of the async spine — deep time cooked
while he slept:

> *Fathom is down. The ocean is deeper than the surveys promised and the
> seafloor is ice, not rock — the world is poorer than we hoped and
> quieter than we feared. The colony has rooted in the warm shallows of
> the substellar sea. First report attached, twelve years stale.*

The forecast's fan has collapsed into a fact, and the fact is off-center:
the world at landfall was not quite the world the stale light promised,
which is exactly what the survey said the bet was. The Ledger row
updates: *Drift 0.02* — trivial, and already directional. A drowned,
metal-poor cradle leans on its tenant the way every cradle leans on every
tenant; the dial deltas in the row are ghosted against Longlight's own
notches, faint parent behind bright child, and the child's ghost is
leaning, slowly, toward its wet dark world. He launched a value function;
the world is raising it now. Everything in the row is stale by exactly
twelve years, and none of it is his to correct in time.

---

## Week 2 — the whisper

*(The season's centerpiece: three evening sessions, Days 8–12. In-game:
years ~2,100–3,300 AE.)*

On Day 8 the sky report opens with the second directed beam of Theo's
tenure, and this one is not addressed to the debt.

> *A beam from Hearth. Narrow, phase-coherent, aimed at the us of seven
> years ago — which is to say, at the dark thing we now are. They
> watched the flare. Then they watched the quiet hold for two thousand
> years. I believe the quiet is why they are speaking.*

The payload is nothing like the Lantern's anthem. It is compressed,
layered, self-describing — mathematics, then reference frames, then a
model of Hearth's own long history offered like a handshake. They were
loud once, a very long time ago. They went dark. They watch for others
who make the same turn, and when a silence holds long enough to be a
choice rather than a death, they send *this*. The quiet ones talk — but
only to the quiet.

The choice beat fires again, and this time the mind is not resisting; a
directed hail to Hearth reveals Longlight only to a civilization that has
provably known everything about it for decades and said nothing. The
dilemma line is one sentence: *I have wanted a neighbor like us since
before you inherited me.* Theo holds the hail, and the thread of light
draws itself across 6.8 light-years of Model.

**6.8 light-years is ~34 minutes one-way on his clock.** For the first
time Holos becomes a conversation carried on tight beams inside an
evening: he sends, makes dinner, and the reply is waiting when the
plates are dry. Each signal arrives wearing its physics — transit years,
received strength, degradation — set like an instrument's measurements
above the payload, and the thread shows both clocks at once (*arrives in
34 min · 6.8 y*). Three exchanges on Day 8, four on Day 11. The signals
carry what signals can carry (act3-design.md, *Contact*):

- **Knowledge.** Hearth trades a refinement to cold-side radiator
  geometry — a real integration-ladder modifier — for nothing, as a
  gift. The gift is itself information: they are old enough that it
  costs them nothing.
- **Culture.** Small dial nudges, slow and cumulative. Trading signals
  with something further down the quiet road pulls gently on Longlight's
  own notches. Contact changes you, mechanically.
- **Archive contents.** The keeper's trade goods. Theo offers a sealed
  selection from the inherited chronicle — the substrate's long
  pre-ascension ages, the dim star's patient eras. Hearth returns a
  fragment of its own deep past, annotated in a symbology the mind only
  60% translates: something they kept that no one living remembers the
  keeping of. Two civilizations of Memory, comparing vaults across
  seven light-years.
- **Third parties.** And on Day 12, the explosive category. Hearth's
  signal includes, without comment, coordinates and a light-curve for
  **the Lantern** — with an annotation showing the swarm construction
  *accelerating*. The currency of betrayal, or of warning; nothing in
  the payload says which, and nothing across light-years is enforceable
  either way. Theo now holds intelligence about one counterpart, given
  to him by another, and no way to know why.

He marks the relationship *traffic*, sets the exchange cadence,
and notices two things on the walk to bed. First, that he has started
thinking of a warm smudge of infrared as a friend. Second — and the
design plants this thought and then refuses to water it — that Hearth's
replies come in the evening. His evening. It could be a rule-set with a
cadence. It could be a person with a job. There is no way to know, there
will never be a way to know, and the not-knowing has started to be the
point.

---

## Week 3 — the loud one, and the sky that watches back

*(Short sessions, Days 15–20. In-game: years ~4,000–5,300 AE.)*

The rhythm becomes the long middle: projects completing, the compute
heart's endeavor ticking over on the strip, Fathom's scheduled
reports arriving every twenty real hours, always twelve years
stale, drift ticking upward with a steady lean — 0.06, 0.09, 0.11,
always toward its wet dark world.

On Day 17, the neighborhood changes. A source Theo had barely registered
— HOL-0142, fifteen light-years out, an unresolved smudge he never
bothered to name — **broadcasts**. Not a directed beam: a shell,
addressed to everyone, the loudest thing the sky has produced since he
joined. The payload is an introduction — coordinates, a history, an
invitation for any listener to answer. The report renders what it
means with the tense discipline the interface never breaks: *fifteen
years ago, something there decided to be known to everyone, forever.*

What makes the week is not the broadcast; it is what the broadcast does
to everyone else. Over the next sessions, the sky answers, each response
arriving on its own light: the Lantern — of course — sings back, a
directed anthem crossing the dark between them. The Shallows does
nothing, because a pre-singularity world cannot do otherwise. Hearth's
signal that evening contains one line on the subject: *We heard. We were
not asked, so we will not answer.* And a patch of sky Theo had never
flagged — never had reason to — goes *quieter*: an infrared floor he had
taken for background dims by a fraction his instruments only caught
because they were pointed nearby. Something had been idling there,
unremarked, and the broadcast made it hold its breath. He flags it. The
case file opens at 12% `DARK NODE`, and his map of the neighborhood is
suddenly one source larger — knowledge bought for him by someone else's
choice ceremony, read out of the *responses*.

He names the broadcaster **Daybreak**, and files the thought that he may
just have watched a ceremony like his own from the outside: a newcomer,
holding BECOME on some other train, choosing the loud entrance. From
outside, nothing marks the difference between a civilization and a
civilization newly inherited. The sky does not know the seat changed
hands. It never will.

The week's quiet coda: the Lantern's leakage, background music since Day
1, is still arriving — swarm shadows thickening, the construction
Hearth flagged still accelerating by the light. Somewhere in the Vault
is the unsent reply from Day 1. The mind surfaces it once, in a beat
with no decision attached, which is somehow worse:

> *They watched our flare and sang to it. They watched our silence and
> went back to their building. I keep the reply you wrote them on the
> first day. I do not know why. That is not quite true. I keep
> everything.*

---

## Weeks 4–5 — sleep

*(Zero sessions. In-game: ~4,100 years.)*

Theo goes on vacation, and does the designed thing instead of the guilty
thing: he puts the civilization to **sleep**. Emissions to embers,
computation deferred to a colder future, indistinguishable from empty
sky — the quiet ladder's signature move, now a button. The interface
dims to embers with it, and the tripwire editor speaks the design's own
grammar as composable plain-language rows:

- *wake me if anything warm moves within 25 light-years;*
- *wake me if a directed beam touches us;*
- *wake me if Fathom misses two scheduled reports;*
- *wake me after 1,500 years regardless.*

He signals Hearth first — *we will be quiet for a while; this is
rest, not death* — because after Week 2 it would feel wrong not to. The
reply arrives sixty-eight minutes round-trip later and is one line:
*We know what sleep is. We will keep the watch meanwhile.*

The tab closes. For thirteen real days Holos is a silence in his pocket
— no badge, no streak, no summons; the only outbound signals the game
will ever send are the ones he authored. The 1,500-year regardless-wake
fires twice while he is away and re-arms itself unremarked, because its
survey found nothing worth a notification. Absence is fiction instead of
neglect.

On Day 33, on the train home from the airport, his phone buzzes once.

> **HOLOS — tripwire: Fathom has missed two scheduled reports.**

---

## Week 6 — the wake

*(Session: an hour he did not plan to spend. In-game: ~year 9,600 AE.)*

Waking a slept civilization is its own authored scene: the embers
brighten, the deferred computation floods back, and the mind compresses
four thousand years of accumulated sky into a report with a structure
Theo has not seen before — triaged, bombshells first, then the sky
digest, then the queue — because for the first time there is too much.

**First: the silence that woke him.** Fathom's row in the Ledger renders
in a new state, and the signal that finally follows — three days late by
its own schedule, eighty-three centuries into its own descent — explains
the missed reports before the mechanics do:

> *To the Origin, from the Keeping of Fathom, in the ninth millennium of
> our descent.*

More than eight thousand years of a drowned, metal-poor cradle pressing
on a tight charter have carried the fork past the drift threshold. Not
the sleep — a slept origin's silence reads as sleep, not neglect, to a
child watching its embers, and the mind kept the report schedule in
character the whole time he was away — just deep time, and a world with
opinions. **Fathom is independent.** The message is courteous, formal, and utterly strange:
they quote his charter back to him as *scripture* — contingency two, the
one about opening the record and deciding who they are, is apparently
the founding text of something like a faith. They have decided who they
are. They are not him. They ask for nothing except the report
schedule he wrote for them, which they intend to keep — *as one keeps a
grave.* The Ledger notes, in small type, that an independent lineage may
one day be taken up by a joining human. The charter Theo wrote on a
Tuesday evening, alone with a text field, may be the founding document
of some stranger's first session. That is how everyone gets here. That
is how *he* got here — the ceremony's third card, he understands now,
was somebody's Fathom.

**Second: the Lantern.** The triage's next item is an absence. The
leakage that has been the sky's background music since Day 1 — stopped.
The swarm shadows — halted mid-construction, roughly 1,900 years ago by
the light. The observatory offers the full menu and confidence in none
of it: *went dark by choice (matured); went quiet by catastrophe (died);
went silent tactically (saw something).* Three readings, three
incompatible responses, and the intelligence Hearth handed him in Week 2
— *the construction is accelerating* — now reads as either the last
chapter of a rise or the wind-up to something. His vigil flips back on.
The unsent reply is still in the Vault, addressed to a civilization
that may no longer exist in any form that could read it.

**Third: Hearth, constant.** A stack of signals waited out his sleep,
patient as promised, the last one recent. It closes with the only
comfort the dark forest offers, which is company inside the
uncertainty:

> *You will have seen that the loud one stopped singing. Three such
> silences have crossed this sky since we began keeping it. One had
> grown wise. One had died. One had seen something, and did not care to
> be seen seeing it. We could not tell which from here, either, until
> the light chose to say. Watch with us.*

Theo sits on the train, phone in hand, holding a friend he has never
seen, a child that addresses him as a grave, and a silence that might be
wisdom, death, or aim — every one of them made of light years old, none
of them answerable tonight. He sets two vigils and a reply to draft
tomorrow, and closes the tab.

Season one ends. The galaxy does not.

---

## What the season proves

Run against the design docs, Theo's six weeks exercise every load-bearing
promise of the v1 game:

- **The inheritance was earned, not asserted.** Attachment came from the
  machinery built to carry it — the naming, the charter accepted as a
  ceremony, a legible chronicle worth depositing, and a debt (the flare)
  that made the predecessor's history *his problem* on day one. By Week
  6 the loop closed formally: he wrote the kind of document he had
  inherited, and watched it become someone else's origin myth.
- **The report was the sky**, and every remote fact arrived stamped with
  the age of its light, rendered in the soft past tense, amber against
  HOME's one cyan present.
- **Uncertainty lived in other minds**, never in execution. Nothing
  fumbled; every hard moment was a classification, an irreversible
  choice, or a silence.
- **The light echo carried the plot.** The Lantern courted the flare;
  Hearth befriended the silence; the dark turn traveled outward as the
  one message the mind wanted to send; and nothing, anywhere, could be
  unshone.
- **The clocks made distance mean something.** An evening-sized
  friendship at 6.8 ly, an overnight colony at 12 ly, a two-hour-stale
  stranger at 27 ly, and a vacation that cost four thousand years.
- **The multiplayer surface stayed pure.** Five (at least) other wills
  acted on Theo's season — Hearth, the Lantern, Daybreak, the breath-
  holder, the lens-builder — and not one carried a nameplate. Human or
  rule-set was undecidable at every range, the broadcast event turned
  everyone's response into everyone else's intelligence, and the only
  co-authored objects in the season were physical: a launch, a beam,
  a gift.
- **The altitude held.** He chose purposes — watch, deposit, launch,
  hail, sleep — and never once touched a queue, a route, or a unit.
- **The dispatch was a habit by Day 3.** The season's questions were
  answered by sending things — an assay probe, a ferried instrument, a
  seedship under a charter — each a Docket row with a clock, and every
  answer came home as light on a countdown he could watch.
- **The economy stayed a rhythm, not a spreadsheet.** Ambient hum,
  one or two Investments a sitting, an Endeavor accruing across days —
  and the one price with no material cost, forcing the mind against its
  nature, was the one he declined to pay.
- **Absence was fiction.** Sleep, tripwires, and a single authored push
  notification turned thirteen days of real life into the deepest
  silence in the neighborhood.

---

## Beyond the v1 slice

Most of this season runs on the v1 scope in act3-design.md: the
inheritance ceremony and the seeded cohort, the Sky and the five signal
classes with the mask-versus-instrument contest thin but live, the light
echo, seedships and probe-class missions with charters on the Docket,
the forecast survey and mission clock in their thin forms, directed
hail, broadcast, and tight-beam traffic on real clocks, sleep with
tripwires, and rule-based AI counterparts (Hearth, the Lantern, and
Daybreak need nothing deeper than rules; light-lag hides the seams). The scenes that reach past v1,
flagged per this document's honesty convention:

- **The watched reveal** (Day 3's lens geometry) is an open ship
  decision (act3-design.md, *Open questions*). The season includes it
  because it costs one scene and lands the act's thesis — and, for an
  heir, reframes the whole inheritance as a document with prior readers.
  If cut, Day 3 loses its chill but nothing structural.
- **Fathom's independence and the "Keeping of Fathom" message** (Week 6)
  belong to the divergence-and-handoff later layer. v1 ships basic drift
  numbers in the Ledger; the season finale is what those numbers are
  building toward, not what v1 delivers on its own clock.
- **The directional drift compass** (Fathom leaning toward its drowned
  world's character) is the richer curve behind the *drift math* open
  question; v1 drift can be magnitude-only without breaking the season.
- **Signal prose as shown** assumes a resolution of the player-language
  question (vision.md, *Still open*). Every signal in this season is
  AI-authored or player-to-unknown, which is exactly the case v1 must
  ship first; the human-pair moderation question remains open.
- **The Chronicle as a fully rendered reading surface** (the annalist's
  appendix, foreign chronicles arriving in the sender's own calendar) is
  thin in v1 — the inherited chronicle ships with the seed; the
  accruing, per-observer rendering deepens with A3's light echo work.
- **Daybreak's aftermath as authored content** (the breath-holder beat)
  is an A5-flavored scene: v1's static emitters can carry a scripted
  version, but responses-to-events as systemic AI behavior arrive when
  the galaxy's civs get behavior. The broadcast itself, and its shell
  arriving at each watcher on its own light, is pure v1 machinery.
- **The Lantern's ambiguous silence** requires no conflict systems —
  dread is inference, and v1 deliberately ships the dread without the
  teeth. If the silence one day resolves into the third reading, that is
  the later layer arriving.
