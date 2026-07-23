# HOLOS
### Missions & the Docket — the work graph of a civilization

*Everything a civilization does is an undertaking: a purpose, a price, a
clock, and an outcome that arrives as light. This document unifies projects
and missions into one nested work graph, gives that graph a surface — the
Docket — and expands the mission possibility space so that dispatching
someone is the game's default verb, not its garnish.*

---

## About this document

[act3-design.md](./act3-design.md) § Missions defines the mission anatomy
(who goes + a charter + a travel method + a horizon), the mission clock,
veterans, cooperative missions, and the compensation menu — that anatomy is
unchanged and canonical. [economy-design.md](./economy-design.md) prices
missions like everything else — also unchanged. What this document adds is
**structure and prevalence**: how missions and projects compose into one
graph, how that graph is shown and touched, and how the design makes
*sending someone* as common a move as watching the sky.

**Working decision (2026-07): missions move into v1, thin.** The previous
scope held missions post-v1 with "probes and hails as the skeleton." That
skeleton is now dressed: v1 ships probe-class missions as real missions —
charters, clocks, outcomes — and the Docket in its list form. The full
system (veterans, joint missions, vignette returns) still arrives with Act
3 beat content. act3-design.md's v1 scope section reflects this.

> Related: [act3-design.md](./act3-design.md) (mission anatomy, the
> mission clock, contact), [economy-design.md](./economy-design.md) (cost
> profiles, no capacity slots, Coherence), [playstyles.md](./playstyles.md)
> (verb parity — this doc is where several flagged gaps get their verbs),
> [ui-design.md](./ui-design.md) (the Desk this doc adds a panel to),
> [walkthrough.md](./walkthrough.md) (the season that plays a slice of it).

---

## One kind of thing: the undertaking

Projects and missions have always shared a shape — a purpose, a cost
profile across the four prices, a real-time clock, a Signature residue, a
Coherence risk (economy-design.md, *The cost profile*). This document
names the shared shape: an **undertaking**.

- A **project** is an undertaking that stays home: the swarm stage, the
  compute heart, the instrument tier, the Vault deepened. The mind
  executes it in hand, and it completes on a clock.
- A **mission** is an undertaking that *goes*: someone — probe, envoy,
  crew, ship, ensemble — carries a charter beyond the horizon, where it
  stops being governed and becomes a story whose ending arrives later, as
  light.

The difference is not category but **governance**: a project can be
redirected tomorrow; a mission can never be patched after launch. Every
other property — pricing, clocks, the altitude principle — is common. One
shape, two relationships to the horizon.

---

## The graph: undertakings nest and depend

The real design move is that undertakings **compose**. A civilization's
work is not a list of independent tasks; it is a graph with parents,
children, and edges — and the graph is where the new possibility space
lives.

### Children

Any undertaking can spawn undertakings:

- **A project spawns a mission.** Build the gravitational-lens instrument
  (project, at home) → ferry it to the solar focal line (mission, a
  flight with a clock) → the emplaced instrument then feeds a vigil
  (a case on the observatory desk). Three nodes, one purpose.
- **A mission spawns a project.** Send a builder to a partner system
  (mission) → it raises a receiver there (project, executed at the far
  end under the charter) → the finished receiver unlocks transmission as
  a travel method to that system. This is how the trust topology of the
  receiver graph is *built* — by missions, node by node.
- **A mission spawns missions.** An expedition charter carries
  pre-authorized branches: *if the survey holds, detach a lander; if the
  world is occupied, fall back and emplace a sentinel instead.* The
  children instantiate beyond the horizon, and the parent's report — when
  it comes — tells you which of your contingent grandchildren exist.
- **A campaign spawns everything.** A standing parent — *account for
  every warm mass within thirty light-years* — whose children are created
  by triggers as instruments flag candidates. The campaign is never
  "done"; it is an orientation with a work history.

### Dependencies

Edges, not just nesting. An undertaking can be **blocked on** another —
the transmission blocked on the receiver, the strike (much later) blocked
on the deep energy gate — and the game adds one edge type no other genre
has:

- **Blocked on light.** The next decision waits for a report that is
  still in flight. This is not a loading state; it is *the* state — the
  async spine rendered as a dependency. A node blocked on light shows its
  countdown (the mission clock's earliest-confirmation date), and the
  player's strategic skill is largely in what they choose to do while
  blocked.

### The horizon rule

Nesting obeys the physics. **Children on the far side of a horizon exist
only if the charter wrote them.** A mission cannot grow new branches after
launch — only its pre-authorized contingencies can fire. So the graph has
two regions with different truth values: nodes *in hand* are current and
editable; nodes *beyond the horizon* are rendered as dead reckoning — what
should be happening by now, if the branch you bet on is the branch the
story took. You learn the true shape of your own work graph the way you
learn everything else: when the light arrives.

### Standing orders

Tripwires already exist as wake conditions (act3-design.md, *Sleep*). The
graph generalizes them: a trigger can arm an **undertaking**, not just a
notification. *If anything warm moves within twenty light-years, launch
the sentinel package. If Fathom misses two reports, dispatch the Heir
Visit.* Standing orders are how a sleeping civilization keeps acting in
character — the player's judgment, pre-committed, running on the alarm
infrastructure that already fires everything else. They are priced when
they fire, not when they are armed, and a standing order firing while the
player is away is exactly the kind of thing the wake report leads with.

---

## The Docket

The graph needs a surface. Design-side, the honest joke is that this is
the sci-fi issue tracker — epics, tickets, states, blocked-on edges — and
the joke is load-bearing because that discipline is what makes a hundred
concurrent undertakings legible. In-world it is nothing so bureaucratic:
it is the mind's **plan of works**, the agenda a civilization-scale
intelligence keeps for itself, and it already has the game's dry clerical
register (prose-style.md M8 — *precision as wit*). Surface name: **the
Docket**, a Desk panel beside the Ledger and the observatory
(ui-design.md).

What a row shows — and the altitude guard that keeps it honest:

- **The purpose**, in the mind's register. Never a task. The smallest
  unit the Docket ever displays is *a thing worth deciding*; the mind's
  logistics beneath it are executed flawlessly off-screen and are not in
  the data model, let alone the UI (economy-design.md, *price purposes,
  never logistics*).
- **Its class chip** — Ambient, Investment, Endeavor, Epochal — so the
  budget conversation is visible at a glance.
- **The clock pair** (`31 h · ≈370 y`), and for missions the mission
  clock's next checkpoint: arrival, earliest confirmation, next
  scheduled report.
- **Its state**, derived from physics, never set by hand:

| State | Meaning |
|---|---|
| **in hand** | the mind is executing at home; redirectable |
| **in flight** | launched, this side of the horizon; watchable, not governable |
| **beyond the horizon** | ungoverned; rendered as dead reckoning |
| **awaiting light** | blocked on a report; countdown running |
| **returned** | the outcome is home — a report, a veteran, a vignette |
| **silent** | a deadline passed with no signal; fires a beat, never a badge |
| **rooted** | a colony-class outcome: the child lives |
| **independent / disowned** | the node left the lineage — by drift, or by your denial |

- **Its edges** — parent, children, blocked-on — drawn as a thread the
  player can follow. In v1 the Docket is a list with indentation; the
  full graph rendering (and the dead-reckoned far side) can arrive with
  the deeper layers.

Two disciplines keep the Docket from becoming homework. **The survey desk
proposes; the player disposes** — there is no backlog to groom, because
the mind drafts candidate undertakings from state (the observatory's
unexplained sources, the forecast desk's ranked targets, beats that
resolve into options) and the player's verb is choosing, not filing. And
**no capacity slots, still** (economy-design.md): the Docket never caps
concurrent work. What limits it is income, real session time, and the
Coherence strain of running many distributed endeavors — the graph's
natural work-in-progress limit is the mind's unity, which is to say the
limit is *in the fiction*, where it belongs.

---

## The possibility space, expanded

act3-design.md's illustrative array (Watching, Talking, Meddling,
Surviving) stands. The graph adds two families and three structural
patterns that multiply all of them.

### New family: Building

Constructive missions — the graph's infrastructure verbs, most of them
parents or children by nature:

- **The Receiver Raiser.** Carry and raise a receiver at a far system —
  the mission that turns a destination into an address. Building one *for
  another civilization* is the deepest trust move on the board; building
  one at home is announcing you are willing to be arrived at
  (act3-design.md, *Travel and expansion*).
- **The Relay Chain.** A campaign of raiser missions laying a line of
  relay nodes toward somewhere that matters — each node a child, the
  chain itself the deliverable. Tight beams hop the chain; so, later, can
  a fleeing seat. Infrastructure as foreign policy.
- **The Beam Battery.** Raise a push-beam battery at a partner system
  under a co-written charter, so *their* sky can launch *your*
  beam-pushed ships — the cooperative version of the technology's
  standing dependence (technology.md: the traveler exists at the pleasure
  of whoever runs the beam).
- **The Cache.** Pre-position matter, fuel, or a dormant instrument
  package at a dead system — a waystation for expeditions not yet
  written. A Curator caches archives; an Instrumental mind caches fuel;
  the difference is legible to anyone who ever finds one.

### New family: Working

Economic missions — the extraction-and-logistics verbs playstyles.md
flags as the Instrumental gap, landed without waiting for the conflict
layer:

- **The Claim.** Send extractors to an uninhabited system and beam or
  ship the yield home — slow, lossy, honest transfers
  (economy-design.md, *Transfers are physical and slow*). The graph
  shape: a mission that spawns a standing project at the far end whose
  output arrives as scheduled physical deliveries.
- **The Salvage.** A dead system, a failed colony, a burned-out swarm —
  someone goes and takes what is left. Cheap matter, heavy narrative:
  salvage sites have histories, and the vignette engine knows it.
- **The Delivery.** The compensation menu made physical: a mission whose
  entire purpose is carrying payment — a mind-backup, a Vault berth's
  contents, a rejuvenation clinic — to someone owed. Cross-civ credibility
  is *built* out of these (the consideration is already in flight).

### Pattern: the standing mission

Bounded arcs end; standing missions **hold**. The Vigil, the Embassy, the
emplaced Sentinel, the grave-world watch — undertakings whose steady state
is *presence*, whose reports arrive on a cadence, and whose charters need
a different kind of writing: not "do X then return" but "be there, and
here is who you are while you are there." Standing missions are the
natural parents of drama: every one of them is a tripwire with a soul,
and a standing mission's **silence** is the loudest thing the Docket can
say.

### Pattern: the campaign

A parent purpose that spawns children over deep time, by trigger rather
than by plan — survey campaigns, uplift programs, a diaspora's rolling
wavefront of seedships. Campaigns are how the Docket stays alive across
eras without the player re-deciding the same intent: the orientation is
chosen once; the instances fire as the sky provides them; the player
tunes or retires the campaign as a purpose, not its instances.

### Pattern: the joint node

Cooperative missions (act3-design.md) get a graph meaning: a **node two
civilizations both hold** — co-written charter, each side contributing
agents or infrastructure, each side seeing the same clocks through its own
light-lag. The only co-authored object in a galaxy where nothing else can
be jointly governed, now literally rendered as a shared entry in two
Dockets that can never quite agree on its state. A shared Vigil, a joint
expedition, a Relay Chain built from both ends toward the middle.

---

## Missions and signals

Signals are how the graph talks. Every mission's charter includes a
**signal plan**: the report cadence, the tight-beam geometry (reports are
aimed home at where home *will be*), and the silence protocol — what the
absence of a scheduled report should be read as, and what the mission
will assume if home goes quiet. The mission clock (act3-design.md) is the
signal plan compiled into countdowns; **silence at a deadline is an
event, not an absence**, and it is the Docket's `silent` state firing its
beat.

Traffic with other civilizations rides the same physics in the other
direction: a hail is not a mission (nothing goes; nothing is sunk), but
missions and signals compose — an Embassy is a mission whose *product* is
high-bandwidth local traffic; a verification challenge is a signal whose
*subject* is where a mission has physically been; a joint node's partners
coordinate by tight beam and misalign by exactly their distance.

---

## Agents, briefly

Unchanged from act3-design.md, restated as graph terms: the **agent** is
who a mission node is entrusted to — from a fist-sized probe to an
armada — and choosing it is self-portraiture. **Veterans** are named,
reusable agents whose weight travels with them; in graph terms, a
veteran is a resource whose history is an input to every node it is
assigned to, and whose availability is real (an envoy in flight is not
also at home). Lending one into another civilization's node is the
strongest trust signal the compensation menu can carry. The design-side
joke completes itself here — the assignee is real, remembers previous
tickets, and beyond the horizon can and will edit its own — and the joke
is the design: an unsupervisable assignee is what makes mission outcomes
the main source of narrative uncertainty after the singularity.

---

## Prevalence: making the dispatch the default verb

The systems above make missions *possible*; these commitments make them
*common*:

1. **Every launch is a mission.** Seedships, probes, ferries, colony
   ships — all of them are Docket nodes with charters and clocks from A4
   on. There is no separate "expansion" pipeline; expansion is the
   colony-class mission family.
2. **The observatory's closing verb is a dispatch.** Every classification
   arc ends at a fork: keep watching (allocate instrument time), or *go
   and know* (the Assay). Ambiguity is priced in exactly two currencies —
   patience or a probe — and the source card offers both. Most warm
   masses are nobody; finding that out cheaply, overnight, by sending
   something, should be a beginner's habit by their third session.
3. **Beats resolve into nodes.** When a dilemma's answer is an action,
   the action lands on the Docket as a drafted undertaking — the beat
   engine is a mission generator, not just a text generator.
4. **The forecast desk always has a slate.** Ranked destinations, each
   with its information-age figure and arrival spread, each one tap from
   a charter. The launch decision is never more than one surface away.
5. **Ambient-class missions are genuinely ambient.** A probe is under
   the income line (economy-design.md) — no saving up, no ceremony,
   launched from the source card in one gesture plus a short charter.
   The commitment ceremony is reserved for the launches that deserve it.

The counterweight is already designed: mission spam self-limits through
real session time and the Coherence cost of heavy distribution, with no
attention pool added unless play proves it necessary (economy-design.md,
open questions — the bet stands, and the Docket makes it easier to
observe whether it is winning).

---

## v1 slice (thin)

- **The Docket, list form**: every undertaking (project and mission) as
  rows with class chip, clock pair, state, and one level of
  parent–child indentation. Full graph rendering, dead-reckoned far-side
  nodes, and campaign UI: later.
- **Probe-class missions**: the Assay and the emplaced Sentinel — real
  charters (2–3 contingency slots), real mission clocks, `silent`-state
  beats. Colony seedships gain the same node anatomy in A4.
- **The signal plan** in its minimal form: report cadence + silence
  deadline (this is A4's mission clock, unchanged).
- **Standing orders, tripwire-adjacent**: one or two armable
  order-classes (*on warm movement, launch sentinel*), priced at fire
  time.
- **Deferred with their systems**: veterans and weight, joint nodes,
  the Working family's cross-civ forms, campaigns as UI (a campaign can
  ship as authored content sooner), armada-scale ensembles (conflict
  layer), the full vignette-return machinery.

---

## Open questions

- **Player-authored parents.** Can the player create an arbitrary parent
  purpose ("open traffic with the elder") and hang undertakings under
  it, or are parents always system-shaped (campaigns, charters, beats)?
  The first is truer to the tracker fantasy; the second protects the
  altitude principle. Candidate answer: player-named parents are labels
  over system-shaped children — organization without new mechanics.
- **How much tracker is too much?** States and edges earn their keep;
  the failure mode is the Docket becoming homework — assignees to
  shuffle, stale rows to groom. The no-backlog rule and
  propose/dispose split are the guardrails; playtest whether they hold.
- **Standing-order scope.** Pre-authorized dispatches while the player
  sleeps are powerful and dangerous (a griefing surface later, a
  surprise-spend surface now). v1 keeps the armable set tiny and the
  costs Ambient–Investment; where the ceiling sits is a tuning question.
- **Docket vs. Ledger seam.** A rooted colony is a Docket outcome that
  becomes a Ledger row. Where exactly the handoff happens (at rooting?
  at first report?) — decide in A4 when both surfaces exist.
- **The name.** *The Docket* is design-side until playtest says it reads
  in-world; the fallback is that the surface is simply *the plan*,
  unnamed, the way the Model may stay *the sky*.
