# HOLOS
### Projects — The Long Work

*What a project is. The deep-time work a civilization runs on real clocks —
how it is chosen, funded, staged, completed, and abandoned, and how many
can spin at once. The answer to the last is: as many as you can afford,
and the game is built to keep a rack of them spinning.*

---

## About this document

[act2-design.md](./act2-design.md) names projects as Act 2's core verb and
gives them their three families. [economy-design.md](./economy-design.md)
prices them. [technology.md](./technology.md) catalogs what they build.
[act3-design.md](./act3-design.md) continues them at interstellar scale.
This document sits across all four and pins the object itself: the
anatomy, the lifecycle, the clocks, and the concurrency model. Where this
document and an act design disagree, the act design's behavior is
canonical; where any of it disagrees with the vision, the vision wins.
Numbers here are v1 targets, not tuning commitments.

---

## What a project is

**A project is a purpose with a clock.** The player chooses *what*; the
mind executes *how*, flawlessly and off-screen (the altitude principle);
and the work completes on real async time — hours to days of wall-clock,
scaled to fictional millennia. A project never fails. Per the death of
the dice, what a superintelligence attempts, it achieves; the only
questions are what it costs, how long it runs, and what its completion
reveals.

Projects are one of four purchasable purposes, and the boundaries between
them are load-bearing:

| Purpose | What it is | Clock | Where uncertainty lives |
|---|---|---|---|
| **Directive** | A standing policy — a posture, a dial lean, a rule of behavior. | None. It holds until changed. | None; it is how the mind behaves, not a thing it finishes. |
| **Project** | Work at home — the seat's system, inside the mind's own light. | A work clock, visible and counting. | None in execution; only in what instruments reveal. |
| **Launch** | A project whose clock is a flight — the product arrives somewhere else. | A flight clock; physics-floored, unshortenable. | The forecast: the destination will have aged by arrival. |
| **Mission** | A launch that carries an agent and a charter — *someone goes*. | The mission clock (act3-design.md, *Missions*). | Everything past the horizon: other minds, and silence at a deadline. |

Read down the table and the pattern is the arc of the game: certainty
thins as the work gets farther from home. A project is a certainty
scheduled; a mission is a bet your future self collects. All four carry
the same cost profile (economy-design.md, *The cost profile*) — one
shape, priced differently, is what keeps the whole game legible.

---

## The anatomy — what a project card shows

Every project, from a survey sweep to the deep Vault, is the same small
record ([ui-design.md](./ui-design.md): project cards carry the clock):

- **A family.** Bright (energy ladder), dark (integration ladder), or
  instrument (both) — per act2-design.md, *Projects*.
- **A cost profile and class.** The four prices plus residues, and the
  class from Ambient up to Epochal (economy-design.md, *The cost
  classes*).
- **A clock.** The real-time countdown, made of two parts (below): the
  floor physics sets and the span funding can compress.
- **A stage track.** Long projects complete in stages, each a report
  entry; the track shows what has lit and what is next.
- **A product.** What exists afterward: a swarm stage glowing on the
  system map, an instrument tier, a mask's ongoing shelter, a survey's
  findings delivered as a beat.

---

## The clock — floor and span

**Working decision (2026-07).** Every project clock is two parts:

- **The floor** is the part physics owns: flight time, the light-lag
  across a swarm's own span, the orbital mechanics of moving mass. No
  budget shortens it. A launch's clock is *all* floor — this is the
  economy's rule that real time is the one price the others cannot buy
  down, kept exactly.
- **The span** is the part diligence owns: how much of the civilization's
  income is aimed at the work. More income, shorter span — down to the
  floor and never past it.

So Energy can hurry a swarm stage but can never hurry a photon. The two
parts are visible on the card as one countdown with a hard core: the
player learns quickly which projects respond to attention and which
respond only to patience, and that distinction — fundable work versus
physics-floored work — is itself a lesson the game is teaching for Act 3,
where flight and light-lag are all floor.

---

## The lifecycle

A project passes through five states. None of them requires the player's
presence; all of them respect the altitude principle.

1. **Offered.** The menu of adoptable projects at any moment is gated by
   what the civilization *is*: ladder stages reached, instruments built,
   dials within range (a Silence civilization is not offered the
   broadcast array without a fight). Archetypes lean the menu; they never
   lock it (playstyles.md, rule 3).
2. **Adopted.** The strategy-turn act: the player names the purpose, and
   the mind owns it from that word on. Adoption commits the cost profile.
   An Ambient project barely registers against income; an Investment
   redirects this sitting's; an Endeavor opens a long accrual the
   civilization works toward across many sessions.
3. **Underway.** The clock runs in real absent time. Income flows to the
   work according to priority (below). The system map transforms as
   stages land — a view, never a control surface.
4. **Complete.** Completion is a beat trigger and a report entry, always.
   The product persists: a stage stays lit, an instrument stays sharp, a
   finding enters the Chronicle. Some products leave **standing work**
   behind — a mask's upkeep, a swarm's maintenance — which is a line item
   against income thereafter, not a new decision. Entropy charges upkeep
   on everything, completed projects included.
5. **Set down.** The player can shelve or abandon. Shelving aims income
   elsewhere: the span stretches, the clock slows toward its floor rate,
   and the work waits without resentment. Abandoning is final and honest:
   **nothing is refunded.** Matter already shaped stays shaped, Signature
   already shone stays shone — nothing can be unshone — and a half-built
   bright work is a ruin that still marks the sky. Abandonment should be
   rare, legible, and slightly sad.

**Reprioritization is ordinal, never numeric.** The act2 loop's
"reprioritizes deep-time projects" means the player *ranks* what matters
most; the mind allocates income down the ranking. The player never sets
percentages, rates, or allocations — that would be logistics, and the
altitude principle forbids it. Choosing what comes first is a value
statement; deciding what that does to the flow of Matter is the mind's
job.

---

## The plate rack — concurrency as the session texture

**Working decision (2026-07, from design discussion): the intended
texture of play is many clocks spinning at once.** A civilization in good
health is a rack of plates — several Ambient hums it never thinks about,
one or two Investments the player is actively steering this sitting, an
Endeavor or two accruing quietly across real days, launches in flight,
and (in Act 3) missions past the horizon. The game is *built around*
having a bunch of timers running concurrently, and the design serves that
texture deliberately:

- **No caps, ever.** The no-capacity-slots rule (economy-design.md)
  applies in full: nothing limits how many projects run at once except
  income and real time. Ten plates is not a violation; it is the intended
  state of a mature civilization.
- **Stagger the completions.** The scheduling craft is that clocks should
  *interleave*: every sitting should open with something just finished
  (the report has news) and close with something about to finish (a
  reason to return). Offers, stage lengths, and class rhythms are tuned
  so completions spread across sessions rather than bunching. A session
  where everything resolves at once is a tuning failure, and so is a
  session where nothing does — this is economy-design.md's rhythm-targets
  rule, restated from the clock side.
- **No silent decades.** Any project longer than about a real day must
  have a stage boundary or an emitted signal inside every few sittings.
  An Endeavor is allowed to be slow; it is not allowed to be mute. The
  stage track exists so that long work stays *present* on the rack
  instead of vanishing into a distant date.
- **Many is fine; scattered is costly.** Concurrency itself is free —
  a dozen projects in the home system strain nothing. What injures
  Coherence is *distribution*: many far-flung endeavors put parts of the
  civilization beyond a shared present, and below the meter's thresholds
  distributed projects wobble — they lose reliability and drift from
  their briefs (economy-design.md, *Coherence*). The rack punishes
  sprawl, never plate count.

---

## Where uncertainty lives

A project cannot fail, so the game must be honest about where surprise
comes from. Three doors, and only three:

1. **Instrument content.** The telescope completes on schedule; what it
   *saw* is the surprise. Instrument products are the act's main beat
   source and the outward glances toward the Teeming Dark.
2. **Thresholds crossed on the way.** A project's spending can push the
   strategy state over a line — a Signature band, a resource extreme, a
   ladder threshold — and the beat engine fires mid-project. The work
   proceeds; the *situation* develops.
3. **The horizon.** Anything launched far enough stops being a project
   and becomes a story (missions, act3-design.md). Past the horizon the
   death of the dice ends: agents among other minds can fumble, and
   silence at a deadline is an event.

The Coherence wobble is deliberately not a fourth door: distributed
projects drifting from their briefs is not a roll, it is a meter the
player can read in advance and chose to press. Uncertainty in Holos is
never the game rolling dice behind its hand — it is content, consequence,
or other minds.

---

## Act 3 — the rack goes local

At interstellar scale projects keep their anatomy and gain a geography
(economy-design.md, *The Act 3 economy is strictly local*):

- **The seat's rack is the seat's system.** Projects are funded by what
  the local system produces, and only that. There is no running a project
  at a colony — the colony runs its own rack, under its charter, forever.
- **Colony completions arrive as light.** A child's finished work is
  *news*, read years late in the Sky and the report — the plate you can
  see spinning but never touch. This is the intended feeling of a grown
  lineage: a family of racks, only one of them yours.
- **Launches join the rack as flight clocks** — all floor, no span — and
  the forecast prices what their arrival will find. Missions leave the
  rack entirely at the horizon and return, if they return, as beats.

---

## The v1 slice

The ~9 projects of the v1 target (act2-design.md, *v1 scope*), read as a
rack. Classes per economy-design.md; clock characters are relative.

| Project | Family | Class | Clock character | Product |
|---|---|---|---|---|
| First swarm stage | Bright | Endeavor | Long span, modest floor | A stage lit; big Energy income; Signature |
| Star-lifting | Bright | Endeavor | Long, floor-heavy | Matter income from the star itself; Signature |
| High-output industry | Bright | Investment | Short span | Faster Matter conversion; some Signature |
| The compute heart | Dark | Endeavor | Long span | Compute income; Coherence heals; Signature sheds |
| The deep Vault | Dark | Endeavor | Very long | Identity preserved; Curator beats; Signature sheds |
| The energy core | Dark | Endeavor | Long | Quiet dense power; Signature sheds |
| Masks | Dark | Investment | Ongoing | Standing Signature shed for standing upkeep |
| The telescope | Instrument | Investment | Short–moderate | Sight; the first outward glance |
| The survey | Instrument | Investment | Moderate | Findings as beats; later, the destination survey |

A healthy mid-act rack from this slice: the swarm stage or the Vault
accruing as the era's Endeavor, industry or an instrument landing this
sitting or next, masks humming as standing work, and the telescope always
worth a glance — four to six clocks at different phases, which is the
texture the whole document exists to protect.

---

## Open questions

- **Clock scaling.** The real-hours-to-days mapping per cost class — how
  long an Investment or an Endeavor actually runs — inherits act2's open
  time-compression question and lands with A-slice tuning.
- **Shelved work's floor rate.** Whether a shelved project creeps forward
  at a trickle (the mind never quite stops) or halts clean. The trickle
  is better fiction; the halt is easier to read on a card.
- **Stage authorship.** Whether stage tracks are authored per project or
  generated from the clock's length. Authored stages carry better beat
  content; generated ones scale.
- **The rack's upper texture.** No caps is settled — but whether a very
  large rack (say, twenty concurrent clocks) needs UI grouping, or
  whether the card list simply grows, is an interface question for when a
  mature civilization exists to test it.
