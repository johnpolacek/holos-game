# HOLOS
### Build roadmap — Act 3 first

*The design docs say **what** the systems are; this says **what order to
build them in**. The order is now: **Act 3 first, for real** — the
interstellar multiplayer act as the actual first build, not a spike — with
the solo acts following as the origin path. Where this disagrees with the
vision, the vision wins.*

> Related: [vision.md](./vision.md) (§ Scope and roadmap),
> [act3-design.md](./act3-design.md) and [act3-map.md](./act3-map.md) (the
> act being built), [act3-civilizations.md](./act3-civilizations.md) (what
> fills it), [act2-design.md](./act2-design.md) / [act2-minds.md](./act2-minds.md)
> (the character system Phase A consumes as data and Phase B later produces
> by play), [ui-design.md](./ui-design.md) and
> [ui-image-brief.md](./ui-image-brief.md) (screens; the Act 3 groups are
> now the active shot list).

---

## The decision: why Act 3 first

Decided 2026-07: build the interstellar act before the solo acts.

1. **The vision says so, explicitly.** First contact is *"the heart of the
   multiplayer and the first thing to prototype"* (vision.md, § Decisions);
   *"first contact is the soul of v1"* (act3-design.md). The contact loop is
   the novel, unproven mechanic — the thing that could fail to be fun. Learn
   that first, not after months of on-ramp.
2. **The foundation is already multiplayer.** The existing build is an
   authoritative shared Room over WebSockets. Act 3 uses and extends it;
   Acts 1–2 (solo) would leave it idle.
3. **The stub is canon.** Act 3 needs a character the solo acts normally
   produce — but the vision already defines players who *never played*
   Acts 1–2: divergence onboarding (*"new players inherit a diverged
   descendant with history and grudges"*). So v1's entry **is** that path:
   every player inherits a **generated civilization** — cradle → lineage →
   waking mind, composed from the typed catalogs — with its charter as
   their founding document. Acts 1–2 arrive later as the origin path
   ("raise your own from first life"), slotting into the same seam.

**Costs, owned:** the solo acts are deferred (the pivot — proof #2 — waits
for Phase B); inherited characters must *feel owned*, which the inheritance
ceremony has to earn; and one seam (the handoff record) must be designed
carefully now so Phase B plugs in without rewiring. That seam is specified
below.

## The north star, reordered

v1 still exists to prove two things — now in this order:

1. **The contact loop** (Phase A): detection, the irreversible choice, and
   stale-light signal traffic between real minds.
2. **The pivot** (Phase B): a played history becoming a superintelligent
   character — which then *replaces* the seed generator as the way
   characters are born.

## Where the build is today

**A0 is merged and deployed** (PR #8). The server now has the whole truth
engine: the catalog chain as typed data (`cradles.ts`, `lineages.ts`,
`minds.ts`, with the dial vocabulary + pinned in-world labels in
`dials.ts`), a deterministic seeded RNG (`rng.ts`), a real-statistics star
field and civ placement (`galaxy.ts`, ~0.004 stars/ly³, default 25 ly
radius), the shared clock at 5 real min ≈ 1 game year (`clock.ts`,
`lightDelayYears`), `CivSeed` + the seed generator (`civseed.ts`), the
light-delay knowledge layer (`knowledge.ts` — `observeCiv`/`observeSky`,
with `ObservedCiv` as the *only* shape about another civ that may ever
cross the wire), and a `Cohort` Durable Object (`cohort.ts`) owning truth,
clock, and an alarm-driven event queue, exposed through **local-dev-only
endpoints**.

**A1 is merged and deployed too.** `protocol.ts` now carries the first
real Act 3 wire messages (the cohort join/inheritance flow, sky
snapshot, source detail), landed as part of A1. Cohort inheritance —
session zero, candidate civs, name + BECOME — replaces A0's pre-placed
player civ, placing the chosen civ at inheritance time
(`server/src/cohort.ts`'s `pickPlayerHome`). The client boots the Model
(`client/src/model.ts`), the inheritance ceremony
(`client/src/ceremony.ts`), and the observatory/source card
(`client/src/sourcecard.ts`).

**→ Next to build: A2 — Contact.** Launch brief:
[build-a2.md](./build-a2.md), with
[observatory-design.md](./observatory-design.md) as the vigil's spec.

Each slice gets a just-in-time **launch brief** — a thin `build-*.md` wrapper
(read-list, task, done-when, guardrails) that points back here for spec.
`build-a0.md` and `build-a1.md` are both done and kept as record;
`build-a2.md` opens the current slice; the next is written when its slice
starts, shaped by what the last one taught. Slices are built with **Fable orchestrating Opus (deep-reasoner) and Sonnet
(fast-worker) subagents** (CLAUDE.md § Build orchestration).

---

## The handoff seam: `CivSeed`

The load-bearing interface of the whole plan. Act 3 consumes a civilization
as a typed record and never cares where it came from:

- **`CivSeed`** *(names indicative)*: origin cradle id + lineage id (the
  backstory), the five-dial sheet as position + range per dial, archetype
  region, posture (bright/dark), starting ladder stages and resource
  stocks, and an **emission history summary** (the bright-years Signature
  debt that seeds the light echo).
- **Phase A** fills it with the **seed generator**: walk the catalog chain
  (`cradles.ts` candidate lineages → lineage dial seeds → waking-mind
  vectors from act2-minds.md) plus authored variation, so every inherited
  civilization has a *legible* history — its fingerprint, its species, its
  character — even though no one played it.
- **Phase B** fills it from *play*: Act 1's branches and rolls and Act 2's
  drift produce the same record at the pivot.

One producer swapped for another; Act 3 never changes. This is also why
the content-track catalogs (`Lineage`, waking-mind vectors) move **up** the
priority list: the seed generator consumes them in A0, not M2.

**Shipped (A0):** `server/src/civseed.ts` realizes the record, with fields
the sketch didn't have: `ageBand` (young/peer/elder), `ascensionYear`, a
`chronicle` (the legible history, one line per link of the chain), a
`charter` epigraph from the archetype, and `emissionHistory` as epochs
that **may be future-dated** — a pre-authored dark turn simply becomes
true when the clock reaches it, and can never leak early because the
knowledge layer only serves departed light. That last trick is how A0's
"static emitters" already have living postures.

## Two tracks

- **Content leaves Markdown** *(runs ahead, never blocks)*: done —
  `cradles.ts`. **Now needed by A0:** `lineages.ts` (act1-lifeforms.md,
  S1–S20 with dial seeds) and `minds.ts` (act2-minds.md: base-lean rules,
  archetype regions, the species → mind table). Later: beat content
  formats (Phase B).
- **Systems get built**, slice by slice, below.

## How to read this

- Slices are **dependency-ordered**; each reaches a playable state before
  the next opens. **Detail decays with distance** — Phase A is task-level,
  Phase B deliberately coarse. **Build thin, then grow** — items marked
  `(thin)` ship a slice of themselves and deepen later.
- The design docs stay the source of truth for behavior; this file fixes
  sequence only.

---

## Phase A — Act 3, for real

### A0 — Foundations: the world under the sky

Everything invisible that the Sky stands on. No player-facing change yet.

- [x] **The shared clock**: server-authoritative game time at the target
      ratio (5 real minutes ≈ 1 game year; tunable constant). Durable
      Object alarms drive scheduled events (arrivals, deliveries).
- [x] **The galaxy (thin)**: a generated star field for one cohort
      neighborhood — real-statistics positions, tens of light-years across
      — with civilizations (player + AI) placed in it. Distances in light
      years are *the* gameplay quantity.
- [x] **The knowledge layer** — the architectural heart: the server holds
      truth; each observer is served only **light-delayed views** (state
      as of `now − distance`). The client never receives another
      civilization's present (act3-map.md, *the Model renders belief*).
      Every Act 3 feature reads through this layer, so it comes first.
- [x] **Catalogs**: `lineages.ts` + `minds.ts` typed (content track).
- [x] **`CivSeed` + the seed generator**: generate inheritable
      civilizations from the catalog chain; per-run persistence (thin)
      stores the player's civ.
- [ ] **Protocol growth**: new guarded wire messages per slice
      (sky snapshot, source detail, signals, launches), added to
      `protocol.ts` as each lands.

**Done when:** a dev command creates a galaxy with N seeded AI civs and one
player civ, and the server can answer "what does this observer see, as of
its light?" for any of them.

### A1 — The Sky

The first player-facing Act 3 build: open the URL, inherit a civilization,
see the past.

- [x] **Inheritance session zero**: present 2–3 generated civilizations —
      each a card with its world's fingerprint, its lineage, its dial sheet
      *revealed* — choose one, name it, accept its charter as your founding
      document (the ceremony that makes it *yours*). Reuses the
      world-reveal card pattern and renders from the `CivSeed`.
- [x] **The Model (v1 core)**: the continuous camera (system → sky →
      volume), the pull-back beat, the point-cloud backdrop, sources
      rendered with **light-age everywhere** and **uncertainty as fuzz**
      (act3-map.md § Scope). WebGL point cloud beside Pixi; DOM for text.
- [x] **The observatory (thin)**: the five signal classes
      (act3-design.md), classification as belief + confidence, source
      cards with local naming (`client/src/sourcecard.ts`). The
      sharpening contest against the target's mask moved to A2 (working
      decision): a contest needs an opponent, and A1's emitters are
      static — masks first mean something when the other side acts.
- [x] AI civs as **static emitters** for now — warm masses, leakage,
      biosignatures to classify; behavior arrives in A2/A5.

**Done when:** a new player inherits and names a civilization, pulls back
from their system into a 3D sky, and classifies a warm mass — with every
remote fact aged and no remote fact certain.

### A2 — Contact *(north-star proof #1)*

The soul of the game, reached as directly as possible — built **one
screen at a time in six stages** (build-a2.md § Staging), each stage a
small PR merged to `main` and phone-checked on the deployed URL before
the next begins.

- [ ] **The vigil**: a flagged source becomes a case — hypotheses,
      buyable questions, instrument-time allocation, the
      sharpen/plateau/regress contest, case tripwires, and the
      called/shelved/overtaken exits
      ([observatory-design.md](./observatory-design.md) is the spec;
      the grounded exit — the Assay — lands with A4).
- [ ] **The mask contest (thin)**: sharpening with instrument time
      against the target's mask — the live mask-versus-instrument
      contest (technology.md § Working decisions), moved here from A1
      because this is the slice where the other side first has behavior
      worth masking.
- [ ] **The choice ceremony**: directed hail / broadcast / stay dark —
      irreversible, hold-to-commit, consequences rendered on the Model
      (ui-design.md § the choice screen).
- [ ] **Traffic on real clocks**: tight-beam signals travel at c;
      delivery via the clock/alarm infrastructure; threads with in-flight
      rendering. Signal format decided (2026-07): **composed from
      structured parts for human pairs, freeform for AI counterparts**
      (vision.md, § Decisions).
- [ ] **Rule-based AI counterparts** (thin): enough behavior for a
      complete contact arc against a seeded civ — detect, be detected,
      answer signals in its archetype's register. Single-player-testable.
- [ ] **Human contact**: two players in one cohort detect and exchange
      signals, indistinguishable from the AI path at the wire level.

**Done when:** two humans (and one human + one AI, indistinguishably)
complete detect → vigil → hail → traffic across real light-lag, and
the exchange is *worth screenshotting* — this is the fun gate; if it fails,
we tune here before building anything else.

### A3 — The light echo

The signature system: your past, propagating. (The Chronicle — the readable
record of that past — rides this same light echo and knowledge layer; thin.)

- [ ] Emission history per civilization (seeded by the `CivSeed`'s
      bright-years debt; appended by everything bright you do).
- [ ] Per-observer views read emissions as-of light departure — going dark
      propagates outward; others court the civilization you used to be.
- [ ] The Model's **echo shell** rendering (the poster feature,
      act3-map.md § moment 2).

### A4 — Missions & expansion

Every launch is a mission from here on: a Docket node with a charter, a
clock, and an outcome ([missions-design.md](./missions-design.md) —
working decision 2026-07, missions into v1 thin).

- [ ] **The Docket (list form)**: one surface for every undertaking —
      projects and missions as one work graph, class chips, clock pairs,
      physics-derived states, one level of nesting
      (missions-design.md, § The Docket).
- [ ] **Probe-class missions**: the Assay (go and know — the
      observatory's closing verb) and the emplaced Sentinel; charters
      with 2–3 contingency slots; silence-at-deadline beats.
- [ ] **Standing orders (thin)**: one or two armable order-classes
      (*on warm movement, launch sentinel*), priced at fire time.
- [ ] **Seedships**: launches with real flight clocks; the **forecast
      survey** — information age at landfall (light-age + transit years)
      and an honest arrival spread per target class; landfall reports
      resolve against truth when the flight clock fires
      (act3-design.md § The forecast).
- [ ] **Relativistic ships (thin)**: coherent colony founding on real
      flight clocks — the second v1 travel method (bold-scope decision,
      2026-07); onboard-fuel and beam-pushed variants, the beam battery
      bright by design; the seat stays home.
- [ ] **The mission clock (thin)**: every launch compiles its expected
      light events — arrival, earliest confirmation, first report — into
      visible countdowns; silence at a deadline fires a beat
      (act3-design.md § Missions, *The mission clock*).
- [ ] **Charters**: the launch-time value function (dial sheet + directives
      + contingencies) — the same `CivSeed` shape, written by the player;
      the recursion made literal.
- [ ] **The Ledger**: lineage view, staleness chips, drift (magnitude-only
      in v1).

### A5 — A living galaxy

- [ ] **Sleep, tripwires, wake report** — the engagement pressure valve
      (act3-design.md § Sleep); in-app wake first, web push after.
- [ ] **AI civ behavior (grown)**: the archetype spectrum acting over time
      — postures shifting, construction shadows, occasional directed
      beams — rule-based, hidden by light-lag.
- [ ] **Cohort seeding + frontier (thin)**: new players seed outward;
      regions reserved for future Phase B incubators (protected
      incubation, act3-design.md § Topology).

**Phase A ships** as the v1 galaxy: inherit a mind, read the sky, meet
someone, launch a child, sleep. The whole loop of the walkthrough's season
(walkthrough.md).

---

## Phase B — The origin path *(coarse by design)*

The solo acts, built after the galaxy is alive, producing `CivSeed`s by
play instead of generation:

- **B1 — Session zero + Act 1**: cradle draw over `CRADLES` and the
  world-reveal from the record (the previously-specced session-zero
  slice); the beat frame (scene → decision → roll); the History spine;
  authored beats to the threshold. The existing world-reveal concept art
  and the cradle catalog land here.
- **B2 — The pivot + thin Act 2** *(north-star proof #2)*: the reveal
  derived from cradle + branches + rolls; the strategy loop, ladders,
  resources, projects, resistance/drift, Signature. Its output *is* a
  `CivSeed` — the generator retires to serving AI civs and inheritances.
- **B3 — The join**: an ascended origin-path civilization enters the
  persistent galaxy at the frontier.

## Open build decisions

Resolve each before the slice that needs it; record the call here.

- **Shard topology (A0):** one galaxy Durable Object per cohort (truth,
  clock, light-delay computation) with per-civ state hanging off it, or a
  DO per civ + a coordinator? Start with one-DO-per-cohort (v1 cohorts are
  small); revisit at scale.
  **Decided (A0, 2026-07):** one `Cohort` Durable Object per cohort holds
  truth + clock + light-delay computation (`server/src/cohort.ts`); all
  observer reads go through the knowledge layer.
- **Signal format (A2):** freeform vs composed for human pairs — the
  vision's open moderation/deception question.
  **Decided (2026-07):** composed from structured parts for human pairs;
  freeform permitted with AI counterparts (vision.md, § Decisions).
- **Sky data budget (A1):** how much star field streams to a phone first
  render (act3-map.md § Under the hood). Note A0's real cohort field is
  small (~260 stars at 25 ly) — the 50–150k-star *cosmetic* backdrop can
  arrive later; A1 can ship on the real field alone.
- **Model renderer (A1):** three.js beside Pixi, or a purpose-built WebGL
  point-sprite pass? Decide at A1 start, before the pull-back is built.
- **Player identity (A1, thin):** how a browser session maps to its civ in
  the cohort (a per-run token in DO storage is enough for v1).
  **Decided (A2, 2026-07): durable identity lives in the platform's
  SQLite** — Durable Objects' native SQLite storage backs accounts (the
  A1 token becomes claimable; multi-device by carrying the account
  token; recovery flow later). No external backend: Convex was
  considered and declined, because the one-Worker architecture and the
  knowledge layer's server authority are the design's spine and an
  external state store would fork them.
- **Player placement (A1):** A0's `generateGalaxy` pre-places one player
  civ at seed time; the inheritance flow replaces this — candidates are
  offered on join and the chosen civ is placed then. Reconcile in A1.
- **Inheritance count (A1):** how many candidate civs a joining player
  chooses among (2–3 feels right; 1 removes agency, many becomes a menu —
  anti-pattern per act2's "revealed, not chosen").
- **Planet rendering** (was M1's decision) — deferred to Phase B with the
  world-reveal screen; the inheritance card can use painterly stills
  meanwhile.
- **Post-singularity priorities (design, decide by A5):** should a civ's
  posture stay a chosen bright/dark binary, or derive from a richer
  priority orientation (what the civilization is *for*)? Captured
  direction in [priorities.md](./priorities.md); resolve before A5 gives
  AI civs real behavior.
- **Refuser seeding (design, decide by A5):** should A5's AI spectrum
  include Refuser civilizations as catalog content — bright, legible,
  non-archetype emitters — before Phase B makes the refusal playable, or
  does the Refuser region wait for the pivot that produces it? Parked;
  resolve when A5 gives AI civs real behavior.

## Art that helps now

The image brief's **Act 3 groups are the active shot list** (screens 7–15,
plus the adopted style tile): the Sky + source card (7), the choice
ceremony (8), signals in flight (9), the Ledger (10), sleep/wake (11–12),
and the Model set (13–15, echo shell = poster). The inheritance-ceremony
ask from this plan shipped with A1 (concepts 03-00, 03-00b). **Current
ask (A2.1): the case board** — ui-image-brief.md screen 7b, the
observatory desk with hypotheses, open questions, and the allocation
strip. Phase B's screens (world reveal variants, beat, roll, pivot
reveal) wait.

## Explicitly out of v1

Per the vision roadmap + per-act scopes (v1 posture is bold — relativistic
ships moved *into* v1 above; these stay out): self-transmission + the
seat's full form; human-inheritance of *diverged
in-game colonies* (v1 inherits *generated* civs; the drifted-colony
handoff needs the drift system matured); the conflict/deterrence layer;
the mission system (agents, veterans, mission charters, vignette
returns, cooperative missions and the compensation menu — v1's probes
and hails are its skeleton);
megascale engineering and the entropy tree; the cosmic clock as a system;
grave worlds and the Restoration question they house, and anomaly
events (later-galaxy content);
richer per-archetype content beyond the anchors. The refusal path — the
threshold's other branch and its Breakout onboarding seam — is out of v1
too, landing with Phase B's pivot.

## Risks, named

- **Fun-density of the quiet loop** — the A2 done-when is a *fun gate*,
  and playstyles.md's verb-parity gaps (the vigil especially) are on the
  critical path, not polish.
- **Inherited ≠ owned** — if the inheritance ceremony doesn't create
  attachment, the premise wobbles; naming, charter-acceptance, and the
  civ's legible backstory carry this.
- **Empty-galaxy liveness** — AI fill must be present from A1 day one;
  light-lag is the cover, per the vision.
- **Clock tuning** — 5 min/year is a target, not scripture; A2 is where
  it gets play-tested against real sessions.
