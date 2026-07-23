# One light-year a year — Holos and *A Deepness in the Sky*

*A design review of Holos against Vernor Vinge's 1999 novel — the one major
work of science fiction that already plays by Act 3's rules — and a catalog
of what the game should take from it: element by element, each steal sized
and slotted against the roadmap.*

> Related design: [vision.md](./vision.md) (the settled physics and the
> Banks citation this document parallels),
> [act3-design.md](./act3-design.md) (contact, missions, the vigil),
> [playstyles.md](./playstyles.md) (the verb-parity gaps this document
> keeps aiming at), [technology.md](./technology.md) (the catalog two
> entries here would join), [act1-cradles.md](./act1-cradles.md) (the
> catalog one entry here would join), [roadmap.md](./roadmap.md) (where
> each steal lands), [prose-style.md](./prose-style.md) (the coinage
> discipline extended here to a second author).

---

## The review, in brief

Where Holos stands: A0 is merged and deployed. The server holds the whole
truth engine — the shared clock, a real-statistics star field, the typed
catalog chain from cradle to waking mind, `CivSeed` and its generator, and
the knowledge layer that serves every observer only the light that has
reached them. The design corpus above it is unusually complete: the
physics is settled, the character system is settled, the contact loop is
specified, and the neutrality rules keep the whole thing honest. A1, the
first player-facing slice, is next.

The corpus also names its own thin spots, and credit to it for doing so
([playstyles.md](./playstyles.md), "Known gaps"): the **vigil** is not yet
an activity; the **Instrumental** lean is under-verbed until conflict
ships; the **Refuser** shelf runs shallow; the **mission** system is a
skeleton awaiting texture. These are exactly the places where a second
literary source would pay best — and it happens that the four of them are
the four places where *A Deepness in the Sky* is richest.

That is the thesis of this document. The vision already names Iain M.
Banks as the touchstone for the galaxy's *character spectrum* — what kinds
of mind fill the sky. Vinge is the complementary source: the touchstone
for how anything actually *lives* under Holos's physics. Banks writes the
crossed civilizations; Vinge writes the refused ones, the watchers, and
the traders — at sublight, on stale light, with no law that reaches
between stars. *A Deepness in the Sky* is, almost uniquely in the genre, a
novel whose every plot beat would survive Holos's six laws intact. It is
not an influence to acquire; it is a sourcebook the design has been
converging on without citing.

---

## The one hard constraint, extended

The Banks rule ([prose-style.md](./prose-style.md) §6) applies unchanged
to Vinge: **we borrow the craft, never the coinages**. No invented
terminology, faction name, character name, or title phrase from the novel
may appear in Holos player-facing prose or be closely imitated. Analytical
citations in the design docs — this document — are allowlisted, same as
the Banks citations in the vision. Where a mechanic below needs an
in-world name, it gets a house coinage under the existing naming rules;
the working labels used here are design vocabulary only. A grep block for
§6 accompanies this document.

---

## The steals

Each entry: what the book does, what Holos already has, and what to take.
Sizing verdicts are collected in the table at the end.

### 1. The culture that is the institution

**Status: rejected (2026-07).** Reviewed and declined as
over-prescriptive — no adoption stat, no broadcast posture, and no
legibility system joins the design. The entry stands as record; the
Voice-economy question it aimed at stays open.

**In the book.** The novel's trading fleets are bound by no government —
none could survive the distances. What binds them is *culture as
infrastructure*: shared protocols, a shared calendar, shared trade
languages, and above all the standing broadcasts — fleets transmitting
their libraries toward stars they will not reach for centuries, knowledge
sent ahead as advertisement, dowry, and glue. The founder's insight, and
the book's, is that the only polity that can span stars is a *brand with
customs*, renewed at every rendezvous.

**Already in Holos.** Coalitions without enforcement; letters carrying
knowledge and culture; the payload stack; the Beacon and Herald leans,
which want exactly this economy and do not yet have it.

**Take: the library broadcast, and protocol adoption.** Give a
civilization a standing posture — a continuous, omnidirectional knowledge
broadcast. It is expensive in exactly the currency the game already
tracks: it writes a permanent bright band into the emission history, and
the light echo publishes it forever. In exchange, every listener inside
the expanding shell reads ladder modifiers from it, and — the deeper
mechanic — listeners who begin *answering in the broadcaster's formats*
have adopted its protocols. Protocol-sharers correspond better:
more payload per exchange, lower misread risk, faster verification. Soft
power becomes a physical thing: a measure of how much of the sky speaks
your language because you shouted it at them for a thousand years. This
is the Voice economy playstyles.md was missing, and it rides the light
echo and the payload stack without a new wire concept.

One dark corollary, straight from the book, where the pirated trade goods
turn out to contain their maker's keys: **adopted standards carry their
author's locks**. See steal 4.

### 2. Markets you cannot see yet

**Status: adopted (2026-07).** Developed in full as
[act3-design.md](./act3-design.md) § The forecast — information age at
landfall, the arrival spread, the timing decision, and landfall beats —
landing with A4's survey (roadmap.md) and answering part of
playstyles.md's Instrumental gap. The entry below is the provenance;
act3-design.md is the spec.

**In the book.** Fleets plan voyages against *forecasts*, not markets: the
customer civilization that beckoned at launch will have risen or fallen by
arrival, so a trader's real skill is modeling how worlds age — and the
book's central catastrophe is a forecast that failed, two ruined fleets
stranded in orbit for decades, waiting for the natives' industry to grow
enough to rebuild them.

**Already in Holos.** "The map is the past" gives the epistemics;
seedship launches with real flight clocks give the vehicle; A4's
destination survey is specced but thin; playstyles.md flags the
Instrumental lean as under-verbed until conflict ships.

**Take: forecast play, surfaced.** The destination survey should not show
a system's stale present — it should show its *projected state at your
arrival*, with the uncertainty cone the projection deserves. Launching at
a young world becomes timing play: arrive too early and there is nothing
to meet; too late and someone else's protocols are already in its sky.
This gives the Instrumental civilization its interim verb set — appraise,
time, arbitrage across civilizational cycles, bargain hard in
correspondence — commerce as the peacetime face of appetite. And it
supplies a ready-made beat class for when the cone misses: the market
that wasn't — the arrival report from a system that did not become what
the launch was priced against.

### 3. The harness with a face

**Status: rejected as mechanic (2026-07).** Nothing is codified — no
harness variant, no modifier, no named failure line. If a Refuser's
interior darkness belongs in the game, it emerges through beat content
and Chronicle writing, revealed by play rather than legislated by a
system. The entry stands as record and as a sourcebook note for beat
writers.

**In the book.** The tyranny's engine is a technology that turns people
into brilliant single-purpose instruments — obsession induced and managed
as infrastructure. Its horror is specific: the victims are *better at
their work than any free mind*, the masters are lucid administrators
rather than sadists, and the whole civilization's competitive edge rests
on the practice. The novel's long game is the unmaking of it.

**Already in Holos.** The Refusal: harnessed intelligence as shackled
computation with zero machine personhood; the Breakout as its standing
risk; the neutrality rule that prices are never verdicts.

**Take: the yoked harness** *(working label — needs a house coinage)*.
The Refuser shelf currently assumes the harness is silicon. Offer the
darker variant as a priced option: a Refuser polity may run part of its
harness on *its own people* — bound minds, tuned to one obsession,
mechanically superior for exactly the interpretive work machines under a
charter do worst (translation, watching, archaeology of old systems). The
prices: a standing wound in the polity's self-account, a Chronicle any
close reader can see the shape of, and a second failure line beside the
Breakout — the **unbinding**, the day the instruments wake up as people,
with memories. Beats interrogate it from inside, per playstyles.md's
rule, and the game never scores it. This single option deepens the
Refuser from "biological civ, bright posture" into an interior with a
genuine moral topology — the thing the shelf most lacks — and it makes
the compensation menu's contrast portraits sharper: what a civilization
pays its agents versus what it does to them.

### 4. Code older than nations

**Status: rejected (2026-07).** No dormant clauses, no lineage keys, no
charter-audit project — charters stay fully legible instruments, as
designed. The entry stands as record.

**In the book.** Software is millennia deep; nobody writes fresh; the
skilled trade is *archaeology* — digging functionality out of layers
older than any living polity. And the fleet's founder spent centuries
seeding those layers with private keys, so that the story's decisive
weapon turns out to be ancestral access hidden inside everyone's
infrastructure — including infrastructure the enemy proudly adopted.

**Already in Holos.** The exact substrate, already shipped: `CivSeed`
carries a charter, a chronicle, and an emission history whose epochs
**may be future-dated** — a pre-authored fact that simply becomes true
when the clock reaches it, and cannot leak early because the knowledge
layer serves only departed light (roadmap.md, A0). Charters at A4 are
launch-time value functions that can never be patched. Divergence
onboarding hands players civilizations whose founding documents someone
else wrote.

**Take: sealed clauses and lineage keys.** Let a charter carry **sealed
clauses** — provisions with a `fromYear`, or a trigger condition, that
neither the child civilization nor its inheriting player has read yet.
An inherited civ's founding document becomes something you *excavate*:
auditing your own charter is a real project with a visible product (a
found clause, a closed door, a disarmed surprise), which incidentally
gives the Depth lean one more piece of the visible progression
playstyles.md demands. And let a parent, at launch, embed **lineage
keys** — recognition codes its systems will still answer to at recontact.
The Heir Visit stops being a courtesy call: the parent may hold a key the
child never found; the child may have spent a project finding and
breaking it; either fact, discovered, is a beat. All of it rides the
future-dated-epoch machinery and the charter record as built — no new
wire concept, no new physics, and the fiction is exact: governance at
range is a dead hand, and a dead hand can hold keys.

### 5. Dust that listens

**Status: adopted (2026-07).** Shipped as
[technology.md](./technology.md) § The dust veil — a new instrument-shelf
option, catalog content only; mechanics arrive if and when a later system
reads from it. The key-substrate role it had in steal 4 died with
steal 4.

**In the book.** The pivotal hardware is almost beneath notice:
millimeter-scale networked sensor-effector motes, scattered through
ships and cities, individually trivial and collectively a nervous
system — and the layer in which those ancestral keys were hidden.

**Already in Holos.** The instrument shelf has deep arrays, sentinel
probes, tripwires — all system-scale or interstellar. Nothing occupies
the *local* floor.

**Take: the dust veil** *(a technology.md instrument entry)*. An
in-system pervasive sensing layer: enormous compute cost, near-zero
Signature, no interstellar reach. It is the dark family's home-defense
and inspection texture — the integration path's answer to "how does a
quiet civilization watch its own house" — and it is the natural
substrate where sealed clauses and lineage keys physically live. In the
sky: nothing, which is the point; the entry's visibility line is its own
absence.

### 6. The star that turns off

**Status: adopted (2026-07).** Shipped as cradle 41, *The century orbit*
(`cradles.ts`, mirrored in act1-cradles.md and act1-lifeforms.md's
candidate-lineage table) — live in the seed generator immediately.

**In the book.** A star that shines for roughly 35 years in every 250,
and a native biosphere that answered with obligate hibernation — a whole
civilization lived in installments, its physics and culture organized
around the long dark, and its greatest heresy the engineer who proposed
staying awake through it. The title names the refuge: depth as safety,
and eventually the sky itself as the deepest refuge there is.

**Already in Holos.** Forty cradles, none periodic. Sleep, the cold
berth, and tripwires arrive in Act 3 as *learned* technologies. S17 (the
cryogenic slow-mind) and S15 (the blind burrower) are adjacent in spirit.

**Take: a dormancy cradle.** One catalog row — physically honest, so not
a switching star: a world on a violently eccentric century-long orbit, a
brief furious summer and a decades-deep winter that life must sleep
through. Tier 5, extrapolated, candidate lineages S17/S15. Indicative
fingerprint (per the R-21 bounds): *"A year lasts a century here: one
brief summer, then a dark it must sleep through. Its civilization
happens in installments, and it keeps exact calendars."* The payoff
lands in Act 3: this lineage arrives at the sleep mechanic as an
*instinct* rather than an invention — the civilization for whom the cold
berth is the oldest technology it owns, and the Teeming Dark feels like
home. Because the A0 seed generator consumes the cradle catalog
directly, this content is live in inherited civilizations the day the
row lands. Naming discipline: the row must not be named or fingerprinted
with the title phrase.

### 7. The watchers over the cradle

**Status: split (2026-07).** *Rival watchers* adopted — a seeding note
and beat class in act3-design.md § Topology and onboarding (*Shared
vigils*), nothing codified beyond it. The interpretive layer and the
lurk-scaling rule were declined; if a vigil's texture wants either, it
arrives as beat content, not system.

**In the book.** Two rival starfaring powers hang in orbit above a
rising pre-technological world for decades — hiding from the natives,
hiding from each other, reading the natives' own radio once it exists,
and understanding them *only through translators*. The novel's quietest,
best trick: the native chapters the reader enjoys are in-fiction
translations, and their warmth is partly translation bias — a fact that
becomes a plot point, because decisions made on an anthropomorphized
model of the natives nearly fail catastrophically.

**Already in Holos.** The recursion is promised everywhere: the Vigil,
the Gardener's Hand, the Counter-Hand; protected incubation; the watched
reveal. And playstyles.md flags the vigil as the design's most
load-bearing gap — an activity of hypotheses and instrument allocation,
not yet designed.

**Take three things, all aimed at that gap.**

- **The interpretive layer.** A vigil on a living world should output
  readings through a chosen *stance* — conservative and literal versus
  rich and humanizing. The rich stance yields more hypotheses, more
  beats, more apparent understanding — and carries a structured bias the
  player cannot see from inside, only suspect. Ground truth exists (an
  Assay, a landed mission) and can contradict the whole model. This
  extends the Model's one rule — belief, never truth — from *staleness*
  into *distortion*: the observatory can now be confidently, coherently
  wrong, which is the epistemic game at its best.
- **The lurk.** Once a watched world invents radio, its own broadcast
  leakage becomes your instrument: vigil bandwidth should scale with the
  ward's emissions, and intervention verbs should widen with its
  infrastructure — you can whisper into a network where you could only
  nudge a bottleneck before. This ties the recursion to the existing
  signal classes, and gives the watched reveal its mirror: what your
  watcher knew of you scaled with exactly how much you shone.
- **Rival watchers.** The Counter-Hand names cold war by proxy; the book
  supplies its best beat — discovering, mid-vigil, that the dark beside
  you is *another vigil*. Two watchers over one cradle, each arriving at
  the other by inference from instrument anomalies, is a contact arc in
  miniature and should be authored as one.

### 8. The first hour

**Status: transformed and adopted (2026-07).** The rendezvous-window
rule was declined; the discussion of it produced something better —
**the mission clock** (act3-design.md § Missions, *The mission clock*):
every mission compiles its charter into a branching timeline of
expected light events with visible countdowns, and silence at a
deadline is itself an event. The first hour's dread survives in
temporal form — the countdown whose outcome you cannot know until the
light comes back. Thin version lands with A4's launches (roadmap.md).

**In the book.** After years of courteous lightspeed negotiation, two
fleets finally share one sky — and the ambush comes in the first hour of
the first meeting. The book's structural lesson: distance *is* the
safety in this universe. Correspondence cannot be betrayed, only
disappointed; co-location is where treachery becomes physically possible
again, because a rendezvous is the one place two civilizations briefly
share a present.

**Already in Holos.** Missions are sunk and unrecallable, which makes
them credible commitments — but the design is quiet about the moment
two civilizations' agents actually occupy one system. The Embassy, joint
missions, the conflicted war's venue, and the Crossing's arrival all
create exactly that moment.

**Take: the rendezvous window.** Name the rule: whenever agents of two
lineages are co-located, light-lag protections lapse and events run in
local time — the one arena where something can happen faster than
anyone's ability to watch it. Then make the posture at rendezvous a
*charter-declared* choice, set at launch like everything else: open,
guarded, or treacherous, sealed until the hour arrives, resolved through
the vignette engine. The game never needs real-time tactical play — the
first hour is a beat, not a battle screen — but the dread of it should
price every embassy, every venue, every joint charter. And the book's
aftermath is a scenario seed worth keeping: two crippled delegations
stranded in one system, forced into years of cohabitation neither chose
— the richest possible stage for authored content, delivered entirely by
mechanics that already exist.

### 9. The legend, broadcast

**In the book.** The trading culture's most valuable cargo is its own
myth — a reputation deliberately broadcast for centuries, worth more
than any hold's contents, and, in the founding-era backstory, weaponized:
phantom fleets conjured out of nothing but credible transmissions,
battles decided by broadcast lies arriving on schedule.

**Already in Holos.** The light echo already makes deception native and
physical — others see only your emissions, and you choose what to emit;
sustained performance is priced through the Voice ↔ Silence resistance
rule. Letters can carry verification challenges. What is missing is the
*counterfeiting of identity* — and its detection.

**Take: light-cone authentication.** If protocol adoption (steal 1)
exists, identity can be worn: a civilization can transmit in another
lineage's formats, flying a flag it never earned. The physics supplies
the check, and it is elegant enough to deserve first-class treatment: a
verification challenge asks about *light* — what did such-and-such
supernova, flare, or transit look like from where you claim to have
been, when you claim to have been there? Only a civilization whose
worldline actually passed through that light can answer. The forged
identity fails not against a database but against the sky itself, and
the interrogation is a correspondence mini-game: each challenge round
trips at lightspeed, so unmasking an impostor is a project measured in
years and worth a season of play. The knowledge layer can adjudicate
this today — "what has this observer's light included?" is the question
it already answers.

### 10. Seconds since the epoch

**In the book.** The fleets keep time in raw seconds — kiloseconds,
megaseconds — from an epoch every crew misremembers as the first moon
landing; it is actually the zero-second of an ancient operating system,
a fact only the software archaeologists know. Deep time, kept honestly,
plus a five-thousand-year-old off-by-a-decade joke.

**Already in Holos.** The shared clock, `AS OF n Y AGO`, the Chronicle's
dry annalist voice with dated entries.

**Take: calendars as character** *(content-only)*. Each civilization's
Chronicle should date from its own epoch — the waking, the Refusal, the
first summer of a dormancy world — so that reading a foreign Chronicle
means converting between calendars, and *adopting* a correspondent's
calendar is part of protocol adoption. One wry Chronicle line per
lineage about what the epoch actually commemorates (versus what the
founding myth says) is exactly the biographer's-deadpan register the
style guide already licenses at wit 2.

---

## Where each steal lands

Ordered by when the roadmap can absorb them; "rides on" names the shipped
or specced machinery, per the rule that entries ride existing systems.

| # | Steal | Rides on | Lands | Size |
|---|---|---|---|---|
| 6 | Dormancy cradle | `cradles.ts` + act1-cradles.md sync | **Adopted (2026-07)** — cradle 41, The century orbit | One catalog row |
| 7 | Interpretive layer, the lurk, rival watchers | The vigil (A2), signal classes, Assay | **Split (2026-07)** — rival watchers adopted (act3-design.md, *Shared vigils*); the rest declined | Seeding note + beats |
| 9 | Light-cone authentication | Verification challenges, knowledge layer | A2 thin (one challenge class), grows with correspondence | Small mechanic |
| 1 | Library broadcast + protocol adoption | Light echo (A3), payload stack | **Rejected (2026-07)** | — |
| 4 | Sealed clauses + lineage keys | Future-dated epochs (shipped), charters (A4), Ledger | **Rejected (2026-07)** | — |
| 2 | Forecast play | Forecast survey (A4), young worlds (A5) | **Adopted (2026-07)** — act3-design.md § The forecast; A4–A5 | Medium |
| 10 | Calendars as character | Chronicle | Content-only, alongside A3's Chronicle | Trivial |
| 5 | Dust veil | technology.md instrument shelf | **Adopted (2026-07)** — technology.md § The dust veil | One catalog entry |
| 8 | Rendezvous window | Missions, conflicted-war venue | **Transformed (2026-07)** — became the mission clock (act3-design.md § Missions); thin at A4 | Derived timelines |
| 3 | The yoked harness | Refuser shelf | **Rejected as mechanic (2026-07)** — content may reveal it; nothing codified | — |

Read against playstyles.md's flagged gaps: steal 7 is aimed at
**Silence**; steal 2 at **Instrumental**; steal 4 gives **Depth** one
more visible project; steal 3 is the **Refuser** interior. The four
thinnest flavors each get their densest material from this one book —
which is the practical argument for adopting it as the second named
touchstone.

---

## What not to take

- **The book's verdict on the singularity.** Its setting quietly holds
  that superintelligence and immortality are failed dreams — planetary
  civilizations always fall, and the diaspora culture is the only thing
  that endures. Holos's crossed path contradicts this by design. Take
  the verdict as *the Refuser's creed* — it is very nearly the charter's
  one line already — and never as the game's physics or scoring. Rule 1
  of playstyles.md governs: prices, not verdicts.
- **The cruelty as spectacle.** The bound-mind material earns its place
  only as a priced choice with an interior, per steal 3. If a beat ever
  plays it for shock rather than interrogation, cut the beat.
- **The coinages.** Extended §6 block accompanies this document; the
  title phrase itself is banned as an in-world name (N-4 near-variant
  discipline applies: a half-remembered compound of *deep* + refuge
  should be assumed to be his).
- **Nothing else needs stripping.** The book has no FTL, no reactionless
  drives, no exemptions — the six laws pass it clean. That is precisely
  why it is worth this document.

---

## Open questions

- **House coinages needed** before any of this reaches a surface: the
  yoked harness (steal 3), the library-broadcast posture (steal 1), the
  dust veil (steal 5), and the dormancy lineage's own name for sleep.
  The naming pass runs under prose-style.md rules.
- **Does protocol adoption need a wire concept?** The thin version (a
  payload multiplier between protocol-sharers) does not; the full
  version (formats as visible, adoptable objects) might. Decide when the
  message layer ships.
- **How wrong may the interpretive layer be?** Structured distortion is
  the point, but a vigil that can be *arbitrarily* wrong reads as the
  game lying. The bias needs bounds the player can learn — wrongness
  with a grain, not noise.
- **Rendezvous posture and griefing.** The treacherous posture at a
  venue interacts with the conflict layer's griefing-resistance work;
  the rendezvous window rule should be written together with that
  tuning, before any co-location mechanic ships.
