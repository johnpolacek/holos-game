# HOLOS
### Act 3 Design — Interstellar

*How Act 3 works: an epistemic strategy game where information is the
resource, light is the only carrier of truth, and the other minds are real.*

---

## About this document

The [vision](./vision.md) says what Holos is and why. The
[walkthrough](./gameplay-walkthrough.md) says what it feels like to play.
The [Act 2 design](./act2-design.md) specifies the strategy layer this act
inherits, and [economy-design.md](./economy-design.md) pins the choice
economy both acts run on — including Act 3's strictly-local resource model,
summarized below. This document specifies how Act 3 actually works: the sky,
the contact loop, expansion and divergence, and the multiplayer surface.
Where this document and the vision disagree, the vision wins. Numbers are v1
targets, not tuning commitments.

**Working decisions.** Three forks were open when this was written and are
resolved here as working decisions — sound, but cheaper to revisit now than
after implementation: the **transferable seat** (see The seat), **time
compression at ~5 real minutes ≈ 1 game year** (see The clocks), and
**conflict designed in full but deferred from v1** (see Conflict and
deterrence).

---

## What Act 3 must accomplish

1. **Make the galaxy real.** Multiplayer through light-lag: other minds,
   human and AI, indistinguishable at range — deliberately.
2. **Make information the resource.** Temporal fog of war; inference as
   gameplay; every fact stale by exactly its distance.
3. **Cash out Acts 1–2.** Every dial's Act 3 shadow lands; Signature
   becomes a wavefront; the posture choice becomes a way of life.
4. **Prove the contact loop.** First contact is the soul of v1, and the
   vision names it the first thing to prototype.
5. **Grow at the frontier.** Persistence, cohorts with AI fill, and
   divergence as the onboarding engine.
6. **Hold the altitude.** The player remains the value function. No fleet
   micromanagement, ever.

---

## The core reframe

Act 2's strategy layer was economic: energy, matter, compute, coherence.
Act 3 keeps that economy running (both ladders continue at interstellar
scale) and subordinates it to an **epistemic layer**: what you believe
about everywhere else, and how stale each belief is. Every piece of
knowledge about another system is timestamped by the light that carried
it. The game state you can see is always the past, and playing well means
reasoning about what the present probably became.

The session loop is unchanged from Act 2 — **report → strategy turn →
beats → release** — but the report becomes **The Sky**: the light that
arrived while you were away. Events becoming visible years after they
happened, letters finally delivered, colony reports stale by decades,
probes checking in from the void.

---

## The economy goes local

Act 2 was one system with one budget. Act 3 keeps the same four resources
and the same cost profiles ([economy-design.md](./economy-design.md)) but
**shatters the economy into a graph of local ones**, because light-lag and
the altitude principle both forbid a galactic treasury.

- **Every node runs its own economy** — home system, colony, fork holding —
  producing and spending its own Energy, Matter, and Compute. The player
  spends only what the **seat's** local system produces; that local budget
  is always the binding constraint.
- **Colonies are autonomous, never managed.** Each runs its economy under
  its charter, by itself, forever. The player never operates a colony's
  books — the altitude principle forbids it and light-lag makes it
  impossible regardless. **Expansion plants economies you will never
  directly spend**; a child enriches the lineage only by existing, never as
  a purse you can draw on.
- **Transfers are physical and slow.** Value crosses between systems only as
  a launch or a beamed payload — lossy, and arriving years to centuries
  late. There is no fast rebalancing, so **wealth never pools galactically**:
  a vast civilization is a scatter of separately-solvent nodes that cannot
  lend to one another in time. This connects to the **fleeing seat** (it
  inherits its refuge node's local economy whole — see *The seat*) and to
  **cross-civ payment** (also physical or informational, never an abstract
  ledger — see *Missions*).

---

## Inspirations

Carried forward: the beat engine (CK3-style state-fired dilemmas) and the
Act 2 strategy layer. New steals:

| Game | What we take | How it mutates for Holos |
|---|---|---|
| Neptune's Pride / Subterfuge | Async real-time strategy; things arrive on wall-clock schedules; the tension of checking in | Lightspeed is the clock; messages, probes, and light itself run on real timers |
| Diplomacy (the board game) | No dice, no enforcement — everything is trust and intent-reading | Treaties across light-years are physically unenforceable promises; betrayal is already in flight |
| Outer Wilds | Progress through knowledge, not stats | The observatory: classifying a warm mass changes everything while changing no number |
| EVE Online | One persistent shard; real loss; player-made politics | One galaxy, permanent consequences, relationships that outlive sessions |

---

## The Sky and the Observatory

The sky is a catalog of objects, each rendered **as of the moment its
light left** — never its present. Signal classes in v1:

- **Infrared excess** — warmth without light. Dark Node, brown dwarf, or
  rogue world; the classic Teeming Dark ambiguity.
- **Transit shadows** — occlusions too regular to be natural: megastructure
  construction, seen as it was when the light departed.
- **Directed beams** — a hail aimed at you (or intercepted en route to
  someone else — rare, and explosive intelligence).
- **Broadcast leakage** — the sloppy shine of a young or careless
  civilization, or the deliberate, constitutional shine of a Refuser that
  will never go dark; the thing you spent Act 2 learning not to emit.
- **Biosignatures** — a living world, pre-singularity. Someone's Act 1,
  visible from outside.

Classification is inference under uncertainty, sharpened by Instrument
projects (the Act 2 family, continued at interstellar scale). The
observatory outputs *beliefs with confidence levels*, never facts, and
observatory findings are a beat trigger class: the flag the mind cannot
explain is how contact arcs begin.

**Progress here is knowledge.** Correctly classifying one warm mass can
reorder every priority you have while changing no stat at all.

---

## The Light Echo

Signature stops being a number and becomes a **wavefront**. The game
tracks each civilization's emission history; what any observer sees of you
is your emissions as of light-departure time.

- Go dark today, and observers keep seeing your bright years until your
  silence reaches them. You cannot un-shine.
- Your entire posture history is written on the sky in an expanding shell,
  readable by anyone patient and close enough.
- Deception is native and physical: others never see *you*, only your
  emissions — and you choose what to emit. A civilization can perform a
  character it does not have, for centuries. Sustained performance is
  costly (it fights your Voice ↔ Silence dial via the Act 2 resistance
  rule).

This single mechanic makes the Act 2 posture choice permanent, honest, and
strategic, and it is the game's most distinctive system.

---

## The Chronicle

The light echo is the physics; the **Chronicle** is the reading of it. Every
civilization accrues one continuous record from first life onward — its past
is never private, because its past is already on the sky.

- **One record, all three acts.** Act 1's authored branching history is its
  opening entries, Act 2's reports extend it, and Act 3's major events
  complete it. The archive never stops accruing.
- **Rendered as the light arrives.** Each observer's copy is composed as the
  wavefront reaches them, in a dry annalist's voice — entries dated, past
  tense, exactly as old as their distance. It rides the existing knowledge
  layer and asserts no new wire concept.
- **The family history behind the founding document.** This is the
  divergence-onboarding payload: the charter is the founding document a
  joining player inherits, and the Chronicle is the family history standing
  behind it, back to first life.
- **Physically honest.** A distant observer watching your world is literally
  reading your past — nothing can be unshone, all the way back to first life.

---

## Travel and expansion

The vision's travel menu, with mechanical teeth. All three are launches —
projects with real-time flight clocks:

- **Seedships and probes** push *matter*: slow, cheap, spreading lineage.
  The default expansion tool and the v1 method.
- **Relativistic ships** push *a coherent self*: brutally expensive
  (energy-ladder gated), subjectively fast, objectively slow — the
  traveler arrives displaced into an unplanned future. Two fuel
  postures, both in play: onboard fuel (independent, dearest) and
  beam-push from a home battery (cheaper, and the traveler exists at
  the pleasure of whoever runs the beam — technology.md, *Working
  decisions*).
- **Transmission** pushes *pattern* at lightspeed — but requires a
  **receiver** already standing at the destination.

**Receivers are trust topology.** The first receiver anywhere must arrive
as matter, so transmission never bootstraps itself. Building a receiver
for another civilization is inviting it into your house; building one at
home is announcing you are willing to be arrived at. The receiver graph is
the game's map of who trusts whom, and it is visible in principle to
anyone watching construction shadows.

A Refuser has no transmissible self — nothing it could broadcast is anyone
— so transmission and the receiver graph are closed to it, and its
expansion is matter only: seedships, generation ships, and embryo banks,
folded into the seedship family above. The menu still lists three tools; a
Refuser spends its whole interstellar life on the first.

---

## Charters and the Ledger

You cannot govern across light-years, so governance happens once, at
launch: every colony and transmitted fork carries a **charter** — values
(a dial sheet it starts from), directives, and contingency instructions.
After launch, a charter can never be patched in time. The player is a
value function writing a value function.

The **Ledger** is the lineage view: every fork, its last-known state, its
charter, and how far its dials have drifted from yours — all of it stale
by exactly its distance. **Drift** accrues with time and separation,
faster where the charter was loose or the local environment is extreme
(exact curve open). Past a drift threshold, a fork becomes **independent**:
AI-run — or handed to a joining human player, who inherits its history,
its grudges, and *your charter as their founding document*. Player-authored
charters becoming other players' origin myths is the onboarding engine.

---

## The seat

**Working decision: one transferable seat.** The player is exactly one
seat in exactly one place — the seat never divides, so the player's brain
never becomes an FTL side-channel between forks.

- Default: the seat stays home. Every fork is a child, running its
  charter as its own mind.
- At any transmission of self, the player may instead **go**: the seat
  transfers to the arriving copy, and the origin continues as an AI under
  its standing directives — a mind you used to be.
- If the seat's node is destroyed, the seat **flees** rather than falls.
  An ascended mind departs as a lightspeed transmission toward the nearest
  surviving fork — **the Crossing** — its transit duration the light-distance
  between the two, and for the whole length of the crossing it is rendered as
  a directed-beam-class object: visible, interceptable, hunted. A lineage can
  lose almost everything and still be the player.
- A Refuser has no transmissible self, so its seat is a **throne world**,
  the lineage's living center; when it is destroyed the court crosses by
  evacuation ship instead — slower and worse, which fits the path.
- **A fled seat inherits its refuge node's local economy, whole.** Because
  the economy is strictly local (see *The economy goes local*), no budget
  crosses with the seat — you land in whatever budget was already there,
  which may be a thin frontier income. The Crossing is a demotion as well as
  a survival: you keep the game, but you keep it on the refuge's means.
- **Elimination** = the entire lineage erased. Rare, dramatic, and meant
  to be; the Crossing is the dramatic window before it. An eliminated player
  rejoins through divergence onboarding — inheriting some other lineage's
  diverged colony — which closes the loop.

The One Mind ↔ Chorus dial gives the seat rule its character: a Chorus
civilization forks cheerfully and the seat choice is light; a One Mind
civilization treats every transmission as an identity crisis, mechanically
(coherence costs) and narratively (beats).

---

## Contact

The heart of the act and of v1. A protocol stack, each stage a real
decision with real time in it:

1. **Detect.** The observatory flags something it cannot explain away.
   They may never know. Neither may you — of their vigil on you.
2. **Vigil.** Watch silently, gather light, refine classification. Can
   last real-world weeks. Ends only by your choice — or theirs.
3. **The choice.** Three options, none reversible:
   - **Directed hail** — reveals your existence and position *to them*.
   - **Broadcast** — reveals you to everyone inside the expanding shell of
     your voice, forever.
   - **Stay dark** — keep watching. The vigil continues.
4. **Correspondence.** Letters at lightspeed, on real clocks (see The
   clocks). Each message is composed for a reader years-to-centuries
   downstream of the one you know, and each arrives wearing its physics
   — transit years, distance, received strength, relay path, degradation
   — as measurements attached to the text (see ui-design, Letters).

**What letters can carry:** knowledge (tech and ladder modifiers), culture
(dial nudges — contact changes you), Vault contents (the Curator's trade
goods), verification challenges — and **coordinates of third parties**,
the currency of betrayal.

**Nothing is enforceable.** A treaty is a promise held up by two minds'
natures and nothing else; a betrayal is already in flight before it can be
detected. Relationship states (correspondence, accord, silence, threat)
are labels on beliefs, not contracts. The one credible commitment is
physical: a mission is sunk and unrecallable at launch, which is why
cooperation that must be believed runs through missions (see Missions).
This is Diplomacy's trust game at lightspeed, and first-contact arcs are
the act's seismic authored beats.

**Human or AI?** Never disclosed. At light-lag range the question is
undecidable by design, and the uncertainty is the game.

---

## Missions

The player is a civilization-scale mind, but it can act in the world at
small scale by dispatching **agents**. Agents span the full range of what
a civilization contains: biological individuals and groups, avatars,
sovereign or sub-person AI, drones, probes, ships, and ensembles of all of
these. The mix is itself expressive of the civilization's character — a
Refuser sends people, dynasties, and religious orders backed by shackled
machines; a deep-integration civilization favors small dark probes and
avatars; a Chorus sends copies of itself and thinks nothing of it.

**Why a vast mind sends something small.**

- **Smallness is stealth.** A single agent is undetectable where a fleet
  is a signature. For a dark, integrated civilization, missions are its
  only limb — the one way to touch the world without lighting up the sky.
- **Presence is bandwidth.** An agent on-site acts in local time; the
  alternative is correspondence at decades per round trip.
- **Deniability.** An agent can be disowned. A broadcast cannot.
- **Character.** Even a chorus-mind is plural inside — specialists,
  eccentrics, sub-minds. Choosing the right agent and writing its brief is
  self-portraiture; the mission roster is a civilization's character sheet
  in motion.

**Anatomy of a mission.** One reusable structure: **who goes** (an
individual, a group, an AI, a drone, a probe, a ship, or an ensemble) +
**a charter** (instructions written knowing they can never be patched —
the colony-charter mechanic at mission scale) + **a travel method** (from
the existing menu: transmission to a receiver, relativistic ship, slow
seed or probe) + **a horizon** (the moment the mission passes beyond
governance and becomes a story whose ending arrives later, as
light-delayed reports).

**What a mission costs.** A mission is priced like everything else
([economy-design.md](./economy-design.md)) — no special mission economy.
The bill is the ordinary cost profile applied to *someone goes*: **the
agent** (Matter and Energy to build a body, Compute to train or instantiate
a mind — a drone is cheap Matter, a sovereign sub-mind is expensive Compute,
a lent veteran is neither because it already exists); **the travel method**,
which keeps its existing cost character exactly (a slow probe is routine
income; a relativistic ship is an era's savings; a transmission is Compute
to encode plus Energy to beam); and **real time**, the transit to the
horizon. There is **no attention resource** in v1: what limits mission
dispatch is the player's real session time and the Coherence cost of
running heavily distributed endeavors — no single mission threatens unity,
but a civilization flooding the sky with agents is distributed by
definition and pays for the sprawl (economy-design.md, *Coherence*). Whether
that is enough to hold off mission spam is an open question (below).

**The vignette engine survives into Act 3.** Mission outcomes return as
narrative beats and reuse Act 1's vignette machinery — authored scene,
choice, contingent resolution — with one inversion: the player's choice
happens at launch, in the charter, rather than live. Missions are how
Act 1's authored-history engine carries into Act 3, which is what makes
them cheap to build relative to their narrative weight.

**An illustrative array** (grouped by purpose; not an exhaustive spec):

*Watching.*

- **The Vigil.** Embed observers, living or machine, at a pre-singularity
  world — the concrete verb for the promised recursion: the observer role
  from Act 1 becomes something players do to each other.
- **The Assay.** Send an agent to a warm dark mass to settle civilization
  versus dead star — ground truth for the observatory's inference game.
- **The Witness.** Dispatch a recorder to a predicted distant event, so
  the Chronicle gains a primary source.

*Talking.*

- **The Embassy.** Physical presence at another civilization — high
  bandwidth, high trust. Exchanged resident envoys are the closest thing
  to an enforceable treaty in a no-enforcement galaxy: each side holds
  someone the other values.
- **The Heir Visit.** A mission into your own diverged forks — recontact a
  descendant colony, assess its drift, carry the family archive.
- **The Prophet** *(Refuser flavor)*. Missionary expansion: conversion
  attempts toward other biological civilizations.

*Meddling.*

- **The Gardener's Hand.** Intervene at a young world's evolutionary
  bottleneck — become the dice in someone else's Act 1: uplift, protect,
  or prune.
- **The Counter-Hand.** Oppose another civilization's agents at a
  third-party world through your own, deniably, principals never visible —
  cold war by proxy at someone else's cradle.
- **The Locksmith.** Negotiate or infiltrate access to a grave world;
  recover, verify, or destroy a dead civilization's Vault — the open
  Restoration question, given a mission shape without being answered.

*Surviving.*

- **The Courier.** A mission in flight can serve as the receiver at the
  far end of a fleeing seat — missions as pre-placed lifeboats for the
  Crossing.
- **The Inspector** *(Refuser flavor)*. Audit distant colonies for harness
  breakout; sometimes the report that returns is written a little too
  well.

**Veterans.** Agents who survive persist. A returned agent is not spent;
it is a named, reusable entity — a scarred envoy, a storied order or crew,
a probe or ship grown strange and capable across centuries of service.
Two properties, coupled:

- **Experience.** A veteran is more capable than a fresh agent and, just
  as valuable, a better-known quantity: its judgment has been observed,
  its drift has a track record, its charter needs fewer contingencies.
- **Weight.** Everything a veteran has done and had done to it travels
  with it. Past missions resurface as authored complications in later
  ones — the person it spared, the world it broke, the protocol an old
  ship-mind refuses to run again. Weight is narrative continuity across
  the vignette engine, not a numeric debuff system.

Veterans are where players form their strongest attachments: a
civilization accumulates a stable of veterans the way it accumulates
colonies, and the stable outlives any single mission's stakes.

One weight of a particular kind: an agent who holds a mind-backup (see
the compensation menu) and dies on mission can be re-instantiated at
home — minus everything since the last backup, which may include the
mission, and the death. The death still happened; it is in the
Chronicle, and in other people's memory of them. The **restored
veteran** is the same name with a hole in it — the crew remembers what
their captain cannot, the debrief tells an envoy how it died — and that
is vignette material, not a mechanic: a shape such stories can take, in
a civilization where death is sometimes a gap in the record instead of
an ending.

**Cooperative missions.** Agents can serve civilizations other than their
own — missions as the player-to-player cooperative verb:

- **Lending a veteran.** One civilization's agent runs another's mission.
  A real commitment — physical transit, years of lag, no recall — and a
  real trust exercise: the agent carries its home civilization's
  knowledge, and its own weight, into someone else's charter.
- **Joint missions.** Two civilizations each contribute agents under a
  co-written charter — the only co-authored object in a galaxy where
  nothing else can be jointly governed. A shared Vigil; a joint
  expedition to a grave world.
- **Cross-civ recruitment.** Hiring agents from another civilization,
  including from worlds held under a Vigil.

The credibility is physical, not promissory. Nothing agreed across
light-years is enforceable, but a mission is sunk at launch — transit
paid, agent committed, recall impossible — so cooperation through
missions is credible where treaties cannot be. It complements
correspondence diplomacy; it does not replace it.

**The compensation menu.** What agents are paid — above all the mortal
and the foreign — is what only a post-singularity civilization can offer:
rejuvenation, a backup of their mind, restoration of their dead, a berth
in the civilization's Vault, uplift or protection for their homeworld.

- **The menu is a dial readout.** What a civilization is willing to pay
  with reveals its character: an Instrumental civilization pays cheap and
  personal, a Custodian pays in protections, a Curator offers the Vault
  itself. In cooperative missions the menu doubles as the cross-civ trade
  economy — compensation terms travel in the co-written charter.
- **Payment changes the agent.** A mortal who holds a backup stops
  fearing death, and runs missions like it — not always in the employer's
  favor. This feeds the veteran's weight rather than any separate
  mechanic: what you paid someone becomes part of who they are at the
  next launch.
- **Payment is physical or informational, never a ledger.** Every item on
  the menu is a real good delivered or a real thing transmitted; there is
  no abstract inter-civ currency and no running account between two minds
  (economy-design.md, *The Act 3 economy is strictly local*). Consideration
  rides the co-written charter, sunk and unrecallable at launch — which is
  exactly why cross-civ cooperation is credible where a promise of *future*
  payment would not be. The value is already in flight, not a balance
  someone owes: no-money and no-enforcement are the same rule from two
  sides.

**Mechanical spine.**

- Missions are the game's main source of narrative uncertainty after the
  singularity. The mind does not fumble — but an agent beyond the horizon,
  meeting other minds, is uncertainty of exactly the kind the vision says
  replaces chance: migrated from dice to cost to other minds, and now to
  your own hands at a distance.
- Every agent inherently carries drift risk — going native, exceeding the
  charter, coming back wrong. These are ways a mission story can end, not
  a separate global rule; the Ledger's drift logic already covers it.
- Mission timescales are decades to millennia. Results arrive as
  light-delayed reports on the shared clock, consistent with telescoping
  time; a mission is a bet your future self collects.

---

## Coalitions

Diplomacy is bilateral by default — correspondence is a thread between
two minds — but nothing stops the threads from braiding. Coalitions and
alliances among many civilizations are an expected mode of play, and
they are built entirely from existing pieces; the design adds no
enforcement machinery, because there is none to add:

- **Correspondence carries the promises** — unenforceable by design.
- **Cooperative missions and exchanged envoys carry the commitments** —
  physically sunk, unrecallable, credible the way no signature is.
- **The compensation menu is the consideration** — the medium in which
  members pay, trade, and bind one another's agents.

The strategic texture has no counterpart at conversational range. In a
three-civilization agreement, no two members share a present: each acts
on stale knowledge of the others' adherence, every confirmation is years
old on arrival, and a defection is already in flight before anyone could
learn of it. Holding a coalition together across light-lag is a game of
anticipation and character-reading, not of monitoring. A special case
with its own flavor: coalitions among one's own diverged forks — family
alliances between civilizations that were once one mind and remember it
differently.

The existing principle stands unchanged: nothing agreed across
light-years is enforceable. A coalition is a set of promises held up
only by the minds that made them.

---

## Conflict and deterrence

**Working decision: designed here, deferred from v1.**

- **The strike.** A relativistic kinetic strike is the only true weapon at
  interstellar range: catastrophically expensive (deep energy-ladder
  gate), launched on stale data, arriving barely behind the light that
  announces it, impossible to recall. War is a letter you cannot unsend,
  addressed to someone you knew centuries ago.
- **Defense** is the integration ladder's payoff: dispersal (no single
  target worth the price), darkness (no target found), and the Vault
  (destruction without erasure).
- **Deterrence** is performed on the sky: visible capability, visible
  restraint, the light echo as your reputation. Most civilizations never
  fire; all of them decide what they would do if the warmth they watch
  starts to move.
- Dials color everything: an Instrumental Tide strikes for resources; a
  Custodian Beacon's strike, if it ever comes, is a moral event the whole
  sky reads.

**The conflicted war.** Real war at interstellar range is nearly unusable
as a verb: decades of lag, no recall, and every act shone permanently
into every watcher's Chronicle. So disputing civilizations may agree to
settle in simulation instead. The procedure is physics-honest — a shared
real-time simulation across light-years is impossible — so each side
dispatches envoys with full authority, an ordinary mission, to one
agreed venue: a neutral system, or a third-party arbiter civilization.
The conflict is run locally, in simulation, at the venue, and the
verdict broadcasts back to both principals years later, as light.

- **The verdict binds as a promise, nothing more.** The founding rule
  does not bend for it: the loser can always defect and go physical. But
  the defection, unlike the simulation, happens in the light — in the
  permanent record, in front of every watching civilization.
- **The strategic meaning.** A conflicted war is not a safe substitute
  for war; it is a wager that your opponent values its standing more
  than the stakes. Defection risk is the drama, not a failure mode to be
  patched.
- **Built from existing pieces.** The envoys are mission agents — a
  storied veteran can stand as champion. Venue selection is a role for
  coalitions, and for elders willing to arbitrate. Outcome and defection
  alike enter the Chronicle, which is the only court there is.

v1 ships no strikes, and no conflicted wars with them. The dark forest must first exist as dread and
inference; teeth arrive only after the social fabric does, alongside
griefing-resistance tuning (see Open questions).

---

## Sleep and tripwires

A civilization can go dormant: emissions near zero, compute deferred to a
colder future, indistinguishable from empty sky — the Teeming Dark's
signature move, now playable.

- **Tripwires** are standing wake conditions: *anything warm moves within
  N light-years; a directed beam touches us; a fork goes silent; T years
  pass.*
- Sleep is also the engagement model's pressure valve: set watchers, close
  the tab for a week, and the game notifies you when the sky changes.
  Absence becomes fiction instead of neglect.

---

## Grave worlds

A handful of systems in any galaxy read wrong. A world lies dead where the
physics says it should long since have been scavenged for material — and it
was not; it was kept. Something faint and enormous keeps it, warm in the
infrared and otherwise silent, a presence standing a vigil with no end. No
single signal class describes this; the observatory assembles the anomaly
out of the ones it already has, and the assembly is the tell. These are
**grave worlds** — systems where a civilization died and some withdrawn
elder mind chose to preserve and quarantine the grave.

- **The anomaly is a contradiction, not a signal.** An unscavenged dead
  world and a warm mass that never hails are each unremarkable alone and
  impossible together; reading the pair is the whole find.
- **The rarity is the meaning.** A handful per galaxy, most minds never
  meeting one — finding a grave world is an event, not a waypoint.
- **A grave is where a Vault might keep.** If a destroyed civilization's
  identity survives anywhere, it survives behind a quarantine that has held
  off scavengers for an age — which is where the open Restoration question
  (below) goes looking.

---

## Anomalies

Rarer still than a grave world, an **anomaly** is a genuine unknown with
no author: not another civilization, not a scripted villain, not a puzzle
holding a key. Its game function is to be a mirror. Every civilization
within light-range must respond from its character — race to it, hail it,
go dark, send missions, pray at it — and the responses are themselves
visible, so an anomaly reveals the responders to each other. What it is
matters less than what everyone does about it.

Mechanically, an anomaly is mostly existing systems firing at once: a
sensor-and-inference question the observatory cannot close, a mission
target, a correspondence surge among every watcher, and eventually an
entry in a hundred separate Chronicles.

Illustrative seeds of an extensible class:

- **A hail from beyond the horizon.** A directed signal from a galaxy
  that has already crossed the cosmic-expansion edge — audible, forever
  unreachable, forever unanswerable. The endgame clock as content: proof
  that the door closes, arriving through the closed door.
- **A mass that fails the taxonomy.** Warm, heavy, moving under power —
  and with no lineage: no cradle, no history anywhere in its past light.
  In a game where the map is the past, a thing with no past is the
  deepest possible wrongness.
- **A false grave.** An object or system wearing the quarantine
  conventions of a grave world with nothing dead inside it. The
  observatory's tell reads clean; the conclusion it points to is wrong.

Cadence: roughly once per real-world year per region — rare enough that
each anomaly is an era, and every civilization's answer to it becomes
part of how the galaxy remembers the time.

---

## The clocks

**Working decision: telescoping time.** The solo acts compress freely
(Act 1: eons per beat; Act 2: millennia per real day). The shared clock
exists only in Act 3, targeted at **5 real minutes ≈ 1 game year** — the
more godlike the civilization, the more the universe's real pace binds it.

| Separation | One-way message | Round trip |
|---|---|---|
| 5 ly | ~25 min | ~50 min |
| 20 ly | ~1.7 hours | ~3.3 hours |
| 100 ly | ~8 hours | ~17 hours |
| 400 ly | ~1.4 days | ~2.8 days |

Cohort neighbors converse within a sitting; distant contact is a multi-day
commitment per exchange — exactly the vision's "conversational near,
committed far." The ratio is a tuning target, not scripture.

**The cosmic clock** (accelerating expansion; galaxies crossing the
horizon) is narrative in v1 — beats, not systems — and becomes the
endgame's mechanical layer later, per the vision's roadmap.

---

## Topology and onboarding

- **Cohorts plus AI fill.** Human cohorts seed into a galaxy populated
  with AI civilizations spanning both axes: age (ancient elders to
  pre-singularity worlds) and character (the full archetype spectrum, and
  stranger). Rule-based is enough — light-lag hides AI shallowness.
- **The frontier grows.** New players and cohorts seed outward, where
  light-lag insulates them from established play for years of real time.
- **Protected incubation.** Human players' Act 1–2 worlds exist in the
  shared galaxy (a biosignature world is detectable) but are seeded beyond
  practical reach: no strike, probe, or transmission can arrive before
  ascension. The recursion — watch, uplift, exploit, leave alone — applies
  to AI-run young worlds only.
- **The watched reveal.** On entering Act 3, a player may learn from their
  own new observatory that their incubation was observed — someone's
  instruments have had their world's light for centuries. Free, chilling,
  and costs the solo acts nothing. (Ship decision open.)
- **The Breakout as a second seam.** A Refuser colony's harnessed
  intelligence can wake against its makers, and the newborn machine is a
  fresh independent civilization a joining human can inherit — parallel to
  divergence handoff, except the inherited world was built to forbid the
  very mind now running it.

---

## The arc of the act

- **Opening.** The first sky: a quiet neighborhood, a handful of
  unexplained sources, the first classification arc — and possibly the
  watched reveal. The first launch.
- **Middle.** Expansion, the Ledger filling with children, first
  correspondence, the fork of the ladders continuing at interstellar
  scale (star-moving and black-hole power on one path; near-invisibility
  and sleep on the other).
- **There is no end.** The galaxy is persistent; the cosmic clock is the
  only horizon. The long game is legacy: what your lineage becomes, what
  your charters grew into, what the sky remembers of you.

---

## v1 scope

Per the vision's v1 slice — prove the pivot and the contact loop.
**Working decision: the v1 scope posture is bold** (2026-07) — where a
call is borderline, take the bolder inclusion; the slice must still ship.

- One cohort of human players + a seeded AI spectrum (rule-based)
- The Sky report and observatory with the five v1 signal classes;
  classification confidence runs on the mask-versus-instrument contest
  from day one — thin, but a live economy, never fixed stealth grades
  (technology.md, *Working decisions*)
- Light echo tracking (emission history, per-observer views; the seed
  Chronicle already ships as the inherited civ's legible history)
- Two expansion methods: seedships/probes with charters and basic drift,
  and relativistic ships — coherent colony founding on real flight
  clocks, onboard-fuel or beam-pushed (technology.md, *Working
  decisions*); the seat still does not travel in v1
- Light-lag messaging: directed hail, broadcast, correspondence
- Sleep with basic tripwires and notifications
- No strikes, no seat transfer (single node in v1 — the seat rule's full
  form, the Crossing included, arrives with transmission), cosmic clock as
  narrative only
- Missions are post-v1: probes and hails are their v1 skeleton; the full
  system (agents, mission charters, vignette returns) arrives with Act 3
  beat content

---

## Open questions

- **Player-to-player language.** Freeform text between humans (with the
  moderation burden that implies) versus structured/composed messages, and
  what each does to deception, tone, and safety.
- **Drift math.** The exact curve from time × separation × charter
  looseness to dial drift and independence.
- **Griefing resistance.** When strikes ship: cost gates, deterrence
  systems, and social fabric needed so the dark forest stays dreadful
  without becoming a spawn-camp.
- **Does mission spam require an attention mechanic?** v1 bets that real
  session time and the Coherence cost of distributed endeavors are enough
  to limit mission dispatch, adding no attention resource
  (economy-design.md, *Missions*). If flooding the galaxy with cheap agents
  proves dominant, a light attention or command limiter may be needed — but
  only as a last resort, since a slot pool would violate the
  no-capacity-slots rule.
- **Restoration.** Can a destroyed civilization's Vault be found and
  restored by others — and what does that do to the meaning of death? A
  **grave world** gives the question a place to happen — a quarantined
  system where such a Vault might survive — without answering it.
- **The watched reveal.** Ship it, and how often it should be true.
- **Interception.** Whether directed beams can be intercepted en route,
  and how rare that must be to stay explosive — a fleeing seat mid-Crossing
  is interception's highest-stakes instance, and what a *caught* crossing
  means is deliberately left unsettled here.
