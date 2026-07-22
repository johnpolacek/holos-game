# HOLOS
### Act 3 Design — Interstellar

*How Act 3 works: an epistemic strategy game where information is the
resource, light is the only carrier of truth, and the other minds are real.*

---

## About this document

The [vision](./vision.md) says what Holos is and why. The
[walkthrough](./gameplay-walkthrough.md) says what it feels like to play.
The [Act 2 design](./act2-design.md) specifies the strategy layer this act
inherits. This document specifies how Act 3 actually works: the sky, the
contact loop, expansion and divergence, and the multiplayer surface. Where
this document and the vision disagree, the vision wins. Numbers are v1
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

## Travel and expansion

The vision's travel menu, with mechanical teeth. All three are launches —
projects with real-time flight clocks:

- **Seedships and probes** push *matter*: slow, cheap, spreading lineage.
  The default expansion tool and the v1 method.
- **Relativistic ships** push *a coherent self*: brutally expensive
  (energy-ladder gated), subjectively fast, objectively slow — the
  traveler arrives displaced into an unplanned future.
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
mind in exactly one place — the seat never divides, so the player's brain
never becomes an FTL side-channel between forks.

- Default: the seat stays home. Every fork is a child, running its
  charter as its own mind.
- At any transmission of self, the player may instead **go**: the seat
  transfers to the arriving copy, and the origin continues as an AI under
  its standing directives — a mind you used to be.
- If the seat's node is destroyed, the seat falls to the nearest surviving
  fork. A lineage can lose almost everything and still be the player.
- **Elimination** = the entire lineage erased. Rare, dramatic, and meant
  to be. An eliminated player rejoins through divergence onboarding —
  inheriting some other lineage's diverged colony — which closes the loop.

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
   downstream of the one you know.

**What letters can carry:** knowledge (tech and ladder modifiers), culture
(dial nudges — contact changes you), Vault contents (the Curator's trade
goods), verification challenges — and **coordinates of third parties**,
the currency of betrayal.

**Nothing is enforceable.** A treaty is a promise held up by two minds'
natures and nothing else; a betrayal is already in flight before it can be
detected. Relationship states (correspondence, accord, silence, threat)
are labels on beliefs, not contracts. This is Diplomacy's trust game at
lightspeed, and first-contact arcs are the act's seismic authored beats.

**Human or AI?** Never disclosed. At light-lag range the question is
undecidable by design, and the uncertainty is the game.

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

v1 ships no strikes. The dark forest must first exist as dread and
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

Per the vision's v1 slice — prove the pivot and the contact loop:

- One cohort of human players + a seeded AI spectrum (rule-based)
- The Sky report and observatory with the five v1 signal classes
- Light echo tracking (emission history, per-observer views)
- One expansion method: seedships/probes, with charters and basic drift
- Light-lag messaging: directed hail, broadcast, correspondence
- Sleep with basic tripwires and notifications
- No strikes, no seat transfer (single node in v1 — the seat rule's full
  form arrives with transmission), cosmic clock as narrative only

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
- **Restoration.** Can a destroyed civilization's Vault be found and
  restored by others — and what does that do to the meaning of death?
- **The watched reveal.** Ship it, and how often it should be true.
- **Interception.** Whether directed beams can be intercepted en route,
  and how rare that must be to stay explosive.
