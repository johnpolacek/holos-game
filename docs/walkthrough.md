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
- **The chronicle.** The legible history, a handful of past-tense lines
  running in order from first life to the threshold — the opening pages of
  a record that never stops accruing.
- **The charter.** One sentence, set like a line carved over a door: the
  founding document the player will be accepting, not writing.

Theo reads all three.

The first is a bright life: **Ross 128 b**, `Temperate`, a twilight-band
species under an unusually kind red sun, dial notches leaning hard into
Voice, the archetype line reading *Kindness at full volume; it greets the
dark first*, and a charter that says *We shine so none wake alone, and
accept being seen.* The second is stranger and plural: an ocean world, a
tentacled lineage whose wake line reads like an argument already under way,
a charter beginning *Another mind is indispensable.*

The third card holds him. **Teegarden's Star b** — `Testing` — *an ancient
world under a faint star: little energy, and growth slow and thrifty.* The
species is a **networked substrate mind**: *a landscape that thinks slowly
and everywhere; structural memory, so it does not forget.* The wake line
is the quietest thing he has ever read in a game:

> *A planet-wide mind does not wake; it notices.*

The dial sheet reads like a portrait of that sentence: the notch deep
toward Depth (a band of roughly 0.5–0.85 — the dim star never taught it to
want the sky), Silence leaned but genuinely wide (0.2–0.75; the one dial
its history left open), a mild lean to Garden, Monolith at 0.8 in a narrow
band (it is literally one network), and Memory at 0.85, pinned almost to
the pole. The archetype line: *A civilization that keeps everything,
itself included.* The chronicle's last entry: *When the choice came, it
chose the dark, its bright light still in flight.*

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
unapologetic: `THE MODEL · WHAT WE BELIEVE`.

And the mind speaks its first line — the interface has a narrator now, and
it is not a tutorial voice; it is the civilization:

> *The record is complete and kept. You are how it grows.*

Two sentences, and the second one hands him the game.

### The first sky

The report presents the neighborhood survey as a catalog of sources, each
rendered **as of the moment its light left** — never its present. Most of
the sky is exactly what it looks like: stars being stars. Four entries are
not, and each arrives as a soft amber smudge on the Model whose fuzz is
its uncertainty, with a source card that rises as a bottom sheet when
tapped — designation, a light-age chip, classification beliefs with
confidence, and a scrubbable archive of everything Longlight's instruments
have ever received from it. The first card he opens carries one line above
the rest, shown once and never again:

> *This source is shown as its light left it. Nothing outside this system
> is current.*

The four that are not stars:

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
  the faintest possible infrared floor. `DARK NODE · 9%` — the class the
  instruments have to pick, held with almost nothing behind it. The archive
  holds one entry, and it reads in full: *The record opens here. The light
  was almost too faint to hold.* He does not name it. Some things you do
  not name on the first morning.

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
passed in Longlight's. He opens the Sky, and one smudge has changed class.
The belief row on the Lantern's card, and the fixed line behind the info
tap beside it:

> `DIRECTED BEAM` · 61%
>
> *A signal aimed, not spilled: tight, coherent, and pointed at this
> system when it left.*

Aimed. Which means it was sent twenty-seven years ago,
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
answered. The thread carries the crossing above the words, the way every
arriving signal does:

> `TRANSIT 27 y · DISTANCE 27.0 ly`
> `RECEIVED 0.03 · LOSS 97% · ARRIVED Y1041`
>
> `NARROW, FOR ONE RECEIVER`
>
> *We aimed this at one receiver. You are it. We are the loudest thing
> here, and we volunteered.*

Under it, two instrument blocks: `COORDINATES · THEIRS`, a star chart of
their home, and `WHO WE ARE · THEIRS`. It is addressed, precisely, to a
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

Theo assembles a reply anyway — four chips, no keyboard; the composer has
no text field and never will. It feels rude not to. Then he arms the hold,
and the mind objects, in one sentence, in its own voice:

> *The record will say we spoke first, forever.*

That is the whole objection. It names no target, no distance and nobody
listening, because at this range the mind has nothing to tell him about
any of those; it names only what speaking costs a civilization whose whole
character is what it keeps.

The cost is rendered inline: forcing a directive against the dials is not
priced in energy or matter but in **Coherence** — a wound, scaled by how
far outside the comfort band the demand falls (economy-design.md,
*Coherence*). Theo looks at the number, looks at the reply he built, and yields.
**Stay dark.** Somewhere in the state a flag is set that will matter
later: an unsent reply, kept. Memory 0.85. Of course it is kept.

---

## Days 2–3 — the vigil, and the ladder

*(Four sessions totaling ~90 minutes. In-game: years ~280–870 AE.)*

The Day 2 morning session — year 280 AE by Longlight's own count — settles
into the loop that will carry the season: the **report** (what the light
brought while he was away), the **strategy turn** (purposes, never
logistics), the **beats** (the dilemmas his purposes set in motion), and
release. The strategy turn happens on the **work list** — the `TEND` panel
where everything the civilization is doing lives as one nested plan of
works: each undertaking a row with its class chip, its clock pair (game
time first, then real: `370 y · ≈31 h`), and a state derived from physics
rather than set by hand — `IN HAND`, `IN FLIGHT`, `AWAITING LIGHT`. An
empty panel says so in three words and does not dress it up: *Nothing
under way.* The economy underneath
is a hum he steers rather than a spreadsheet he balances: routine income
covers the ambient rows without being asked; a session has one or two
investments he is deliberately aiming; one endeavor accrues quietly
across real days. He never sees a queue, and he never files anything —
the mind proposes candidate undertakings from the state of the sky, and
his verb is choosing. He decides *what for*; the mind owns *how*.

The proposing happens on the Mind page under a header that says exactly
what it is, `WHAT WE WOULD DO NEXT`, and each proposal is a flat reason
with every number in it pinned, a verb that names the surface a tap
opens, and a refusal set in body weight so it never shouts back at the
verb it declines:

> *Hearth carries one reading, no study: `DARK NODE`, 7 years away, 34%
> confidence. Its light arrives regardless.*
>
> `READ THE BRIEF` · Leave It

Nothing in that argues. It states what is on the card, prices what is
not, and closes on the observatory's one licensed flourish, which is a
true statement of physics.

What he says yes to, this week:

- **The vigil on Hearth.** The study is already standing when he first
  reads it — it has stood since the source was found — with the
  hypotheses listed (someone's heart; a brown dwarf; a rogue world) and
  each open question priced. Buying one is what takes the watch up, and
  puts it on the observatory desk: a purpose-level choice, *which
  question*, never which telescope setting.
  The study lands on the work list as a parent with a child already
  drafted: build the deep-inspection instrument (a project, an
  Investment, ~14 real hours), then ferry it out to the solar focal
  line (a mission, a short flight with a clock). Two rows, one purpose,
  and the vigil sits above them, `AWAITING LIGHT` until they land.
- **The Assay on HOL-0554.** The mind's second proposal teaches him the
  game's cheapest habit. A warmth nine light-years out has sat at
  *rogue world · 55%* since the first survey, and the source card
  offers the two honest prices of certainty: patience, or a probe. He
  taps `DISPATCH A PROBE` — an Ambient row, no ceremony, a charter of
  chips — and the launch sheet prices it in both clocks at once:
  `ARRIVES IN 90 y · ≈7 h 30 m · FIRST WORD IN 99 y · ≈8 h 15 m`. By
  tomorrow's coffee the answer is in the report, in one sentence with
  every number in it pinned:

  > *The Assay sent its first word from HOL-0554: `COLD AND STILL`, 9
  > years old.*

  The smudge resolves; the sky is one question smaller. Most warmths
  are nobody, and now he knows how cheaply that can be found out.
- **The Vault's first deposit.** A beat surfaces the option and Memory
  0.85 makes it glow: deposit the inheritance itself — the whole
  chronicle, first life to the ceremony — into the deep archive begun
  before he arrived. The mind says one thing about it and stops:
  *Deposited: everything we were, the bright years included.* It is the
  first time Theo feels the charter as his.
- **The integration ladder.** Longlight's inherited position is one rung
  up the quiet ladder, and the next stage — the compute heart deepened,
  the civilization's world-model refined — is the season's standing
  endeavor. The parity promise holds on screen: progress renders as the
  system going *quieter*, the star's halo dimming on the strip, the
  Model's resolving power visibly climbing. Dark play watches itself
  grow the way bright play watches itself build.

On Day 3 the deep instrument is standing, and Theo spends the compute on
the weighing. The classification arc — the act's detective gameplay —
turns over in the study file, in the instrument's own words and then the
board's:

> *The wobble puts far less mass there than the heat requires. Whatever
> is warm is spread thin and wide. Nothing that formed on its own is
> built like that.*
>
> *So far the light leans toward somebody's heart: a made thing, warm
> because it is still working. It is the strongest reading by a wide
> margin, though watching alone will never make it certain.*

The smudge on the Model visibly condenses toward a point. No stat
changed; every priority did. There is a mature, deliberately silent
civilization **6.8 light-years away** — close enough that traffic would
run inside an evening — and it has had Longlight's light, all of it,
flare and turn both, for as long as it has cared to look. The confidence
will not climb further this week. When the next look comes back with
less separation than the last one, the study carries a sentence it
carries nowhere else, because it is the only line on the observatory
that names a cause:

> *Nature does not learn to hide. Something there has.*

A mask, maintained against exactly this kind of instrument, and the
contest between his sharpening and their quiet is a running economy, not
a die roll (technology.md; the game never resolves it to certainty — an
empty patch of sky stays permanently ambiguous, by design).

Theo does not hail. Neither, apparently, does Hearth. Two quiet things,
6.8 light-years apart, each reading the other's intent from old light.
The dark forest, at conversational range, played for real.

One more thing happens on Day 3, quietly, in the study notes — the beat
the design gives away for free and this season keeps because of what it
does to an heir in particular. Calibrating the new instrument against a
K-class star nineteen light-years out, the observatory finds the geometry
of a gravitational lens on its far side — positioned, for centuries at
least, along the focal line of *Longlight's own star*.

> *Someone has had our light for six hundred years. We do not know who.
> The record you inherited has readers.*

Nothing is actionable. Theo thinks about it at odd moments all the next
day, which is the intended dosage.

---

## Day 4, evening — the launch

*(Session: 45 minutes, the longest yet. In-game: ~year 1,150 AE.)*

Expansion. The survey desk has ranked the reachable systems, and one has
been sitting at the top all week: a **metal-poor drowned world** twelve
light-years out under a small quiet star — resource-thin, stable, the
kind of place a keeper's child could keep its head down. `CHOOSE A SHIP`
offers three, and each row states its own physics and nothing else:

> `THE SEEDSHIP` · *A tenth of lightspeed, on a burn too cold to see. It
> arrives unannounced.*
>
> `THE TORCH` · *Half of lightspeed, on fuel it carries. The flare lasts
> eight years, and again at the far end.*
>
> `THE SAIL` · *Four fifths of lightspeed, pushed by the launch beam. It
> brakes in plain view at the far end.*

The dial sheet leans the choice before Theo weighs it: a Monolith does
not send a copy of itself, and a civilization of Memory spreads lineage
quietly or not at all. Only one of the three arrives without being
watched arriving. Seedship.

`WHAT WE EXPECT TO FIND` prices the bet in the only currency the map
respects — knowledge and its age. The destination's light is twelve years
old now; the flight is a hundred and twenty; the panel states the sum of
those without softening it:

> `EVERYTHING WE KNOW WILL BE 132 y OLD AT LANDFALL`

Under it, the arrival spread as three priors and a width chip — `BARREN ·
POSSIBLE`, `MARGINAL · LIKELY`, `LIVING · UNLIKELY`, and `HOW TIGHT THIS
IS: WIDE` — bands and never percentages, so nothing on the surface can
dress a guess as a reading. Beside them, the one thing the forecast says
about arriving second, and it is the same sentence for every target
because a sentence that varied would be a leak:

> *Nothing reserves a star. Another founding may already be under way
> toward this one, and the first to arrive is the one that roots.*

Launch now, or watch the target a while and narrow the fan? He has
watched all week. He launches.

Then the game does the thing this session exists for: `WRITE THE CHARTER`,
the one instrument of governance that survives the horizon, the
constitution that can never be patched after launch. It is the
inheritance card run backwards: the same dial furniture he read himself
onto on the train, with Longlight's own band as the track and Longlight's
own notch as a ghost behind the child's, and the player on the writing
side this time.

- **The dials.** *Drag a dial to aim it. Pin it to hold.* He copies
  Longlight's, then hesitates over Silence — the destination is poor and
  quiet; nobody is coming there for anything — and leaves that one where
  the parent's band is widest. Memory he pins. *Remember us.* A pin is
  not a cage and the sheet does not pretend otherwise: it fixes where the
  founders start and leaves their descendants a hand's width either side,
  forever.
- **The clauses.** Four groups, each headed by the question it answers,
  two chips apiece; the first two groups are required, because a ship
  that has not been told what to do about an occupied world, or whether
  to be heard when it gets there, has not been chartered. He takes one
  from each:

  > `WHAT THEY DO WITH THE WORLD` · *Root wherever it lands*: **Put down
  > roots on whatever is there. A hard world is still a world.**
  >
  > `WHETHER THEY CAN BE SEEN` · *Found dark*: **Bank the heat and bury
  > the works. The crossing says what it says; after that, nothing.**
  >
  > `WHETHER THEY WRITE HOME` · *Report the landfall*: **Send one word
  > home when it is decided, whatever the decision was.**
  >
  > `WHAT THEY SAY IF HAILED` · *Answer as we would*: **Answer the way
  > this civilization answers. They carry our charter; the judgment is
  > theirs.**

That last chip is the whole act in one clause, and he takes it without
noticing what he has just done: the judgment is theirs. The caption over
the name field reads *What they will call themselves*. He types **Fathom**
and holds `LAUNCH`.

The seedship departs at 0.1c, a slow ember on a hairline arc across the
Model. The clocks compile the physics into the two numbers that make it
felt: `LANDFALL IN 120 y · ≈10 h` — timed, he realizes, so that it lands
while he sleeps — and `FIRST WORD IN 132 y · ≈11 h`, the flight plus
twelve years for the light home. The Ledger opens its first row, and the
band on it is the honest one:

> **Fathom** · `OUTBOUND`
> `UNREAD` · *Nothing has come back that speaks to this.*

---

## Day 5, morning — landfall

*(Session: 15 minutes, phone, before work.)*

The overnight report is the payoff of the async spine — deep time cooked
while he slept:

> *The word from HOL-0771 came home: `ROOTED, MARGINAL GROUND`. Fathom
> has been that for 12 years.*

The verdict under it is four sentences shorter than the moment deserves,
which is why it lands:

> *Fathom is down. The world will hold them, on terms; everything they
> build for the first century will be about not needing it to hold them.*

The forecast's fan has collapsed into a fact, and the fact is off-center:
the world at landfall was not quite the world the stale light promised,
which is exactly what the survey said the bet was. The Ledger row moves
to `ROOTED`, and the band under it is a word rather than a number —
`CLOSE`, with the whole of what can honestly be said beside it:

> *What has come back still matches the charter.*

Beside the band, the one figure a band is allowed, and it is a
measurement of the sample and not of the child: `READ ON 2 OF 5`. A
drowned, metal-poor cradle leans on its tenant the way every cradle leans
on every tenant; the dial deltas in the row are ghosted against
Longlight's own notches, faint parent behind bright child, and the
child's ghost is leaning, slowly, toward its wet dark world. He launched
a value function; the world is raising it now. Everything in the row is
stale by exactly twelve years, and none of it is his to correct in time.

---

## Week 2 — the whisper

*(The season's centerpiece: three evening sessions, Days 8–12. In-game:
years ~2,100–3,300 AE.)*

On Day 8 the second directed beam of Theo's tenure lands, and this one is
not addressed to the debt. Hearth's thread opens with the crossing stated
before anything is said:

> `TRANSIT 7 y · DISTANCE 6.8 ly`
> `RECEIVED 0.35 · LOSS 65% · ARRIVED Y2107`
>
> `NARROW, FOR ONE RECEIVER`
>
> *We narrowed this until it reached you and nobody else. We keep
> everything. We kept you before this arrived.*

Two clauses and nothing else: how it was sent, and who is speaking. Every
number in the signal is on the stamp or inside a block, which is exactly
why the prose can afford to carry none. The blocks are nothing like the
Lantern's anthem — `LIGHT RECORD · THEIRS`, a model of Hearth's own long
history offered like a handshake. They were loud once, a very long time
ago. They went dark. They watch for others who make the same turn, and
when a silence holds long enough to be a choice rather than a death, they
send *this*. The quiet ones talk — but only to the quiet.

The choice beat fires again, and this time the objection slot on the
ceremony is simply empty. A Silence-leaning mind aiming a narrow beam at
a proven silence is not being made to do anything against its nature, so
the interface says nothing, which after Day 1 reads louder than a
sentence would. Theo holds the hail, and the thread of light draws itself
across 6.8 light-years of Model.

**6.8 light-years is ~34 minutes one-way on his clock.** For the first
time Holos becomes a conversation carried on tight beams inside an
evening: he sends, makes dinner, and the reply is waiting when the
plates are dry. His own beams get a cyan rail with only his own
arithmetic on it — `HAIL · IN FLIGHT · ARRIVES IN 7 y · ≈34 m`, and then
`HAIL · LANDED Y2114`, never a receipt, because nothing has come back
from the far end to make it one. Three exchanges on Day 8, four on Day
11. The composer has seven kinds of block and no keyboard, and what they
can carry is what a signal can carry (act3-design.md, *Contact*):

- **`FINDING`.** Hearth trades a refinement to cold-side radiator
  geometry — a real integration-ladder modifier — for nothing, as a
  gift, under the tone chip that says so: *This goes out as it is.
  Nothing is asked in return.* The gift is itself information: they are
  old enough that it costs them nothing.
- **`WHO WE ARE`.** Small dial nudges, slow and cumulative. Trading
  signals with something further down the quiet road pulls gently on
  Longlight's own notches. Contact changes you, mechanically.
- **`LIGHT RECORD`.** The keeper's trade goods. Theo offers a selection
  from the inherited archive — the substrate's long pre-ascension ages,
  the dim star's patient eras. Hearth returns a fragment of its own deep
  past. Two civilizations of Memory, comparing vaults across seven
  light-years, and Hearth's covering line is the one thing it will say
  about the exchange: *The gaps between these are kept as carefully as
  the sendings.*
- **`COORDINATES`.** And on Day 12, the explosive category. Hearth's
  signal includes a coordinates block on **the Lantern**, with a light
  record beside it showing the swarm construction *accelerating*. The
  prose says nothing about it, because the prose never says anything
  about a third party; the blocks are the whole of the disclosure. The
  currency of betrayal, or of warning; nothing in the payload says
  which, and nothing across light-years is enforceable either way. Theo
  now holds intelligence about one counterpart, given to him by another,
  and no way to know why.

The thread's own state word goes to `ANSWERED`, and he notices two things
on the walk to bed. First, that he has started
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
heart's endeavor ticking over on the strip, Fathom's scheduled reports
arriving every twenty real hours, always twelve years stale. The Ledger
never gives him a drift number to watch climb — the band is a word, and a
distance would be a measurement nobody took. What he gets instead is the
sample line widening as more axes are read, and then, one evening, the
word itself changing:

> *What comes back from Fathom reads differently: `KINDRED`, on light 12
> years old. Some of what came back no longer agrees with the charter.*

Which does not say what disagreed, or how much, or why. Nothing here
states a cause; a colony that has stopped agreeing with its charter is
not disobedient, and a sentence that leaned either way would be the
record inventing the one thing the distance forbids.

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
nothing, because a pre-singularity world cannot do otherwise. Hearth
sends that evening and says nothing about it at all, which is itself the
answer: the body carries how it was sent and who is speaking, and there
is no slot in a signal for an opinion about somebody else. And a patch of
sky Theo had never
flagged — never had reason to — goes *quieter*: an infrared floor he had
taken for background dims by a fraction his instruments only caught
because they were pointed nearby. Something had been idling there,
unremarked, and the broadcast made it hold its breath. He flags it. The
study file opens at 12% `DARK NODE`, and his map of the neighborhood is
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

> *They sang to our flare, then went back to their building. We still
> hold the reply you never sent. We keep everything.*

---

## Weeks 4–5 — sleep

*(Zero sessions. In-game: ~4,100 years.)*

Theo goes on vacation, and does the designed thing instead of the guilty
thing: he puts the civilization to **sleep**. Emissions to embers,
computation deferred to a colder future, indistinguishable from empty
sky — the quiet ladder's signature move, now a button. The interface dims
to embers with it, and most of what stands watch behind him he never had
to set. The observatory keeps its own conditions on every source he can
see, and keeps them whether he is at the tab or on a plane: a source that
goes quiet, and a reading that passes seventy percent. Hearth, the
Lantern and the breath-holder are all watched that way, and when one of
them turns, it turns into a line in the report with the board behind it.
There is nothing to arm and nothing to forget to arm.

The one thing he does arm is a **standing order**, and it is the one
thing in the game licensed to spend while nobody is watching. There is
exactly one class of them, and the catalog's brevity is the design: an
armable list is a list of things a player has agreed may happen without
them, and every entry has to earn the sentence *I would have done that
myself*.

> `THE WARM MOVEMENT ORDER` · *If anything inside twenty light-years
> first runs hot, send the Sentinel unasked. An instrument beats a late
> decision.*

He arms it, with a charter of chips riding on the arming, because the
arming is the consent and the charter is its content. `ARMED`. It will
fire once and never twice, and if the pool is short when it comes due the
annal will say so and nothing will be owed.

He signals Hearth last. There is no chip for *this is rest, not death* —
the composer is seven kinds of block and five tones, and none of them is
a farewell — so he sends the plainest thing available and lets the
crossing say the rest:

> *This goes out as it is. Nothing is asked in return.*

The reply arrives sixty-eight minutes round-trip later, and Hearth,
being Hearth, answers the thing he could not say:

> *We narrowed this until it reached you and nobody else. The gaps
> between these are kept as carefully as the sendings.*

The tab closes. For thirteen real days Holos is a silence in his pocket
— no badge, no streak, no summons; the only outbound signals the game
will ever send are the ones he authored, and the only inbound one is a
condition the observatory keeps for him. Absence is fiction instead of
neglect.

On Day 33, on the train home from the airport, his phone buzzes once.

> **A watch tripped**
>
> *The observatory caught something it watches for. The report has the
> rest.*

Which one, it does not say. It names no star, no year, no civilization
and no kind, because the push that carried it had no payload at all: the
relay that delivered the buzz learned only that this device received
something. The content is read in the game, through the cone, as always.
The observatory is watching every source in his sky and the order is
standing over all of them, and until he opens the tab Theo cannot know
which of them spoke.

---

## Week 6 — the wake

*(Session: an hour he did not plan to spend. In-game: ~year 9,600 AE.)*

Waking a slept civilization is its own authored scene: the embers
brighten, the deferred computation floods back, and the mind compresses
four thousand years of accumulated sky into a report with a structure
Theo has not seen before — triaged, bombshells first, then the sky
digest, then the queue — because for the first time there is too much.

It was the Lantern going quiet that tripped the watch, as it turns out.
It is not what the triage puts first.

**First: Fathom.** Its row in the Ledger has a word on it Theo has not
seen before, and the sentence beside the word is the flattest thing in
the game:

> `INDEPENDENT` · *It answers to itself now. It was ours when it left.*

The signal that follows — three days late by its own schedule,
eighty-three centuries into its own descent — explains the missed reports
before the mechanics do:

> *To the Origin, from the Keeping of Fathom, in the ninth millennium of
> our descent.*

More than eight thousand years of a drowned, metal-poor cradle pressing
on a tight charter have carried the fork past the drift threshold. Not
the sleep — a slept origin's silence reads as sleep, not neglect, to a
child watching its embers, and the mind kept the report schedule in
character the whole time he was away — just deep time, and a world with
opinions. The message is courteous, formal, and utterly strange: they
quote his charter back to him as *scripture*. It is the on-hail clause,
the one he took last and barely read — **Answer the way this
civilization answers. They carry our charter; the judgment is theirs** —
and it is apparently the founding text of something like a faith. They
have decided who they are. They are not him. They ask for nothing except
the report schedule he wrote for them, which they intend to keep — *as
one keeps a grave.* The Ledger notes, in small type, that an independent
lineage may one day be taken up by a joining human. The charter Theo
wrote on a Tuesday evening, four chips and five dials, may be the
founding document of some stranger's first session. That is how everyone
gets here. That is how *he* got here — the ceremony's third card, he
understands now, was somebody's Fathom.

**Second: the Lantern.** The triage's next item is the absence he was
woken for, and the annal states it without a syllable of drama:

> *The watch on the Lantern caught what it was set for: the noise of
> machines going quiet, on light 27 years old.*

A summons, not a finding. It says nothing about what the board now shows,
because going and looking is the player's job. The board, when he gets
there, has closed itself:

> *What this is has changed since you opened the study. The light reads
> differently now. Reopening starts the watch on what it is now.*

The swarm shadows halted mid-construction, roughly 1,900 years ago by the
light. Went dark by choice; went quiet by catastrophe; went silent
because it saw something. Three readings, three incompatible responses,
and the intelligence Hearth handed him in Week 2 — the construction
accelerating — now reads as either the last chapter of a rise or the
wind-up to something. Nothing on the surface picks between them, and the
reopen does not promise to either. His vigil flips back on. The unsent
reply is still in the Vault, addressed to a civilization that may no
longer exist in any form that could read it.

**Third: Hearth, constant.** A stack of signals waited out his sleep,
patient as promised, the last one recent. Its prose is what Hearth's
prose always is, two clauses and no facts:

> *We aimed this at one receiver. You are it. This stays legible long
> after both of us have stopped.*

The comfort is not in the prose — a signal body never carries a fact, so
it could not have been. It is in the `LIGHT RECORD · THEIRS` block under
it: three silences out of Hearth's own archive, dated, one of which
brightened again eleven thousand years later, and two of which did not.
No reading is attached. That is the only company the dark forest
offers, and it turns out to be enough.

Theo sits on the train, phone in hand, holding a friend he has never
seen, a child that addresses him as a grave, and a silence that might be
wisdom, death, or aim — every one of them made of light years old, none
of them answerable tonight. He reopens two studies, re-arms the order,
leaves a reply half-assembled, and closes the tab.

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
  seedship under a charter — each a work-list row with a clock, and every
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
echo, seedships and probe-class missions with charters on the work list,
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
- **The "Keeping of Fathom" message** (Week 6) belongs to the
  divergence-and-handoff later layer. The `INDEPENDENT` band and its one
  flat sentence are v1 and ship now; a child that composes an address
  back is what that band is building toward, not what v1 delivers on its
  own clock.
- **The directional drift compass** (Fathom leaning toward its drowned
  world's character) is the richer curve behind the *drift math* open
  question. v1's Ledger deliberately shows no magnitude at all — the band
  is a word and the only figure beside it counts how many axes have been
  read — and the season survives that, because the word moving is the
  event.
- **Signal prose as shown** is settled rather than open, and the
  resolution is the reason every quoted signal in this season is two flat
  clauses: freeform is retired, the composer has no text field, and one
  composer builds every body in the game from the same pools whether the
  sender is a rule-set or a person. The player-language question
  (vision.md, *Still open*) is answered by there being no player language
  to moderate.
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
