# HOLOS
### Build roadmap — Act 3 first

*The design docs say **what** the systems are; this says **what order to
build them in**. The order is now: **Act 3 first, for real** — the
interstellar multiplayer act as the actual first build, not a spike — with
the solo acts following as the origin path. Where this disagrees with the
vision, the vision wins.*

> Related: [vision.md](./vision.md) (§ Scope and roadmap),
> [stakes-design.md](./stakes-design.md) (the survival revision; Phase S
> builds it), [act3-design.md](./act3-design.md) and [act3-map.md](./act3-map.md) (the
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

**A2.1 and A2.2 are merged and deployed.** A2.1 shipped the read-only
observatory (PR #12): per-player studies on the Cohort DO, hypothesis
boards seeded from `ObservedSignal`, the annotated light archive, and
the board itself as a Desk panel (`client/src/studyboard.ts`). PRs
#13–#17 grew it before A2.2 proper — tappable sources, the `+ START`
hub and its source picker, the instrument-time economy, smudges on the
source lists, and a study made legible enough for the evidence to pick
the belief in plain words. A2.2 shipped the work engine —
`questions.ts` (the six bought questions, priced in compute, integrating
over game-years, answered from deterministic finding tables keyed to
occupancy, with plateau gates where the instrument honestly cannot say),
`projects.ts` (thirteen instrument projects in five effect kinds, each
effect frozen at purchase time), and the causal gate all three knowledge
channels now read through: `LightCone` / `peekTruth` / `occupancyAt` in
`knowledge.ts`, which makes the light-cone ceiling a capability token
instead of a per-callsite check. No answer can push a hypothesis share
past 0.9: watching never delivers certainty, structurally.

**Part of A4 came forward with it.** The same session shipped the *other*
price of knowing: probe-class missions (`missions.ts` — the Assay and the
Sentinel, charters of 2–3 pre-authorized clauses resolved against truth
at arrival, silence as the subtraction of two schedules rather than a die
roll) and **the work list** (`tend.ts` — one derived list of undertakings
with class chips, physics-derived states, and one level of study
parentage), with their client surfaces. This overran build-a2.md's "no
missions, no launches" guardrail, which is now amended rather than
pretended away; A4 below is struck to match what actually landed.

**Known gap, half closed:** the shipped A2.2 modules cite three documents
that were never committed — `systems-a.md` (27 references),
`synthesis.md` (14) and `content.md` (14), working specs from that build
session. [systems-a.md](./systems-a.md) has been **reconstructed from the
shipped code** (2026-07), numbered to match those citations so they
resolve; it is an as-built record, and where it disagrees with the code,
the code wins. `synthesis.md` and `content.md` remain missing: where the
code cites them for a tuning call ("priced at 2100 per synthesis.md §4"),
that provenance is now recorded in systems-a.md as a fact about the
citation, and the number itself lives only in the code.

**A2.2b shipped** (2026-07): the grounded exit, plus the work list's
progress tracks, built alongside it. Every row now carries the span it is
waiting across (`fromYear` / `markYear` join `nextYear`), a probe's
amendment horizon is a tick on its rail, and a silence is drawn as a
break that widens. Running it on a phone-sized viewport is also what
caught a real A2.2 bug — a Sentinel that had kept every appointment read
SILENT, on exact float equality between two identical schedules.

**A2.3 shipped (2026-07): the contest and study tripwires.** Mask
upkeep as archetype rules over the seed (`contest.ts`), regression as
temperature entering through `settleShares` (order preserved, the
board contracts toward the even split), the banked one-sentence tell,
three standing tripwires firing in-app as persisted transitions, and
the `called` / `overtaken` exits inheriting grounded's closed-state
and reopen rules. The stage's double-Opus confidence-model call was
run and synthesized; systems-a.md §2.7 and §2.8 are the as-built
record, and observatory-design's confidence-math open question is
settled. The same session shipped the scarcity pass (the attention
ceiling, systems-a.md §2.2b).

**A2.4 shipped (2026-07): the choice ceremony.** Hail and broadcast
write emission truth through the light cone (`contact.ts`; the act
log on the Galaxy, a beam served only to its addressee and only at
arrival), the resistance beat charges Coherence through the
voice-silence dial with twenty banked archetype objections, and the
ceremony stages on the Model: hold-compressed flight previews with
running arrival years, a commit that collapses into the clock's real
crawl, and persistent in-flight renders derived from the player's own
outbound acts. Stay dark writes nothing. systems-a.md §12 is the
as-built record.

**A2.5 shipped (2026-07): traffic, against the AI.** Derived-truth
counterparts (no AI ever writes: replies are pure functions of the act
log, evaluated at read time, byte-stable forever), threads and signals
on real light clocks through the existing wake queue, four counterpart
classes over all ten archetypes with forty-three banked reply strings,
physics stamps as the header of every received payload, and the game's
first text composer, freeform-with-AI only, enforced server-side.
systems-a.md §13 is the as-built record.

**A2.6 shipped (2026-07): human pairs.** The composed-signal grammar
(the stage's double-Opus call: both framings converged on selectors-
never-content and one composer everywhere; freeform retired game-wide
as a path oracle), findings as tradeable payloads wearing three ages,
the thin mutual quiet derived from the act log with breach-by-light,
the full indistinguishability closure set with audit:parity in CI,
the mute, and durable identity as SQLite accounts over the seat-id
indirection. systems-a.md §14 is the as-built record. **A2 is
feature-complete: the fun gate (two phones, one evening) is the
remaining exit condition — a play test, not a build item.**

**Stage audit (2026-07), and what it changes about the plan.** A2's
slices pulled work forward so often that the stage list below had gone
stale in a way that mattered for deciding what to build next, so every
unticked bullet in A3 and A4 was checked against the tree:

- **A3 — the light echo is DONE**, all three bullets, none of it built
  as A3: emission history seeded in A0 and appended by A2.4's
  broadcasts, per-observer light-departure views in A0's `knowledge.ts`,
  and the echo shell rendering in A2.4's Model. The poster feature has
  been on screen since the choice ceremony shipped.
- **A4 is NOT done** — only its probe half is (the work list, probe-class
  missions, the mission clock, all with A2.2). Standing orders,
  seedships, relativistic ships, full charters and the Ledger are open,
  which makes A4 the largest unbuilt block in Phase A.
- **A5's first bullet is partly done**: study tripwires shipped in-app
  with A2.3, and A2.5's counterparts answer but do not yet *act* on
  their own; what A5 still owes is AI civilizations changing posture and
  building over time, cohort seeding and the frontier, and push
  notifications. *(Update 2026-07: the behavior bullet shipped — see
  below; what remains is cohort seeding + frontier and web push.)*

**A4's travel half shipped (2026-07)** — seedships, relativistic
ships, the forecast, full charters, derived landfall, the Ledger with
drift and the conversation brake, and standing orders; systems-a.md
§15 is the as-built record. **A5 is now the sole unbuilt Phase A
stage**, and the fun gate remains A2's open exit condition.

**A5 is complete (2026-07)** — grown behavior (systems-a.md §16), web
push for tripwires (§17), and the seeding retune + frontier + reserved
sky (§18) all shipped. **Every Phase A build item is now done**; the
open exit condition for the phase is A2's fun gate (two phones, one
evening), which is a playtest, not a build.

**The fun gate ran (2026-08) and failed.** A human playtest found the
shipped slice not fun: purpose unstated, actions buried, knowledge
without consequence. The diagnosis and the design response are
[stakes-design.md](./stakes-design.md) (a five-round design review that
settled purpose, death, visibility, forks, intent, and scarcity); the
build response is **Phase S** below, which is now the active phase. The
gate ceremony itself is retired: each Phase S stage is played by the
designer before the next opens, and the phase's exit is taste, owned
honestly.

**AS is complete (2026-08)** — ambient studies: a full board now stands
on every visible source with no gate and no verb, and the stored record
materializes on the player's first act (a question, a tripwire, a call, a
mission), which is what keeps the exits anchored to attention. The picker
and the briefing screen are gone and the Desk lists what has been spent
on; launch brief and as-built record:
[build-ambient-studies.md](./build-ambient-studies.md).

**→ Previously next (now shipped in code): AV — the voice.** Decided
2026-07: the shipped game has the machinery but no narrator — the
pull-back is wordless, nothing states the frame, and the mind never
speaks. AV fixes what a new player finds confusing, which sits on the
critical path of A2's fun gate, so it runs before A2.3. Launch brief:
[build-voice.md](./build-voice.md). **Then A2.3 — the contest and study
tripwires.** Launch brief: [build-a2.md](./build-a2.md), with
[observatory-design.md](./observatory-design.md) as the vigil's spec and
[build-a2-stages.md](./build-a2-stages.md) as the per-stage handoff
prompts.

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

- [x] **The vigil's board (A2.1)**: a flagged source becomes a study —
      hypotheses as belief with confidence, the annotated light archive,
      open/shelved ([observatory-design.md](./observatory-design.md) is
      the spec).
- [x] **Buyable questions and the compute economy (A2.2)**: the six
      questions as Investment-priced inferences over light already in
      hand, integrating on real clocks and answered through the light
      cone; instrument projects as the shelf that prices them.
- [x] **The grounded exit (A2.2b)**: a returned probe closes the study it
      was launched from — the observatory's closing verb, moved out of A4
      once missions shipped early. A study grounds on a report that
      arrives after it was last opened, so reopening is a real act; a
      closed study buys nothing.
- [ ] **The contest, tripwires, and the remaining exits (A2.3)**:
      archetype-rule mask upkeep for seeded civs against the observer's
      instrument spend — the live mask-versus-instrument contest
      (technology.md § Working decisions), moved here from A1 because
      this is the slice where the other side first has behavior worth
      masking — deciding sharpen / plateau / **regress** with the tell
      earned, never scripted; per-study tripwires firing in-app; the
      called and overtaken exits.
- [ ] **The choice ceremony (A2.4)**: directed hail / broadcast / stay dark —
      irreversible, hold-to-commit, consequences rendered on the Model
      (ui-design.md § the choice screen).
- [ ] **Traffic on real clocks (A2.5)**: tight-beam signals travel at c;
      delivery via the clock/alarm infrastructure; threads with in-flight
      rendering. Signal format decided (2026-07): **composed from
      structured parts for human pairs, freeform for AI counterparts**
      (vision.md, § Decisions).
- [ ] **Rule-based AI counterparts (A2.5, thin)**: enough behavior for a
      complete contact arc against a seeded civ — detect, be detected,
      answer signals in its archetype's register. Single-player-testable.
- [ ] **Human contact (A2.6)**: two players in one cohort detect and exchange
      signals, indistinguishable from the AI path at the wire level.

**Done when:** two humans (and one human + one AI, indistinguishably)
complete detect → vigil → hail → traffic across real light-lag, and
the exchange is *worth screenshotting* — this is the fun gate; if it fails,
we tune here before building anything else.

### AV — The voice (the narrator slice)

Inserted 2026-07, before A2.3: the mind becomes the voice of the
interface. The story is fully designed (walkthrough.md is the script,
prose-style.md the voice spec) but the build never speaks it — this
slice closes that gap. Full brief: [build-voice.md](./build-voice.md).
*(Update 2026-08: the unbuilt AV1–AV3 fold into Phase S's S0 — the
frame — and build into the UX reboot's surfaces, not the condemned
panels.)*

- [ ] **AV1 — The first line and the frame**: the mind's arrival line
      after the pull-back (per archetype), and one-time explainers for
      the age chip, compute, and the clock.
- [ ] **AV2 — The report**: sessions open on *what the light brought
      while you were away* — per-player, light-cone-legal, dated entries
      in the mind's voice; the Cohort DO's event machinery grows the
      per-player log it needs. Calm: no badges, the report waits.
- [ ] **AV3 — The mind proposes** *(amended 2026-07: two layers)*: a
      deterministic **candidate enumerator** (typed records, stable ids,
      state fingerprints) with a rules-ranked floor surfaces 1–2
      proposals, each a framing line routing into the existing
      brief/sheet. The mind proposes, the player chooses; nothing
      irreversible, no nagging — the fingerprint is what makes no-nag
      checkable under both this floor and AV4's counsel seam.
- [x] **AV4 — The generated voice (flagged)** *(built 2026-07, merged
      flag-off)*: the Cohort DO can render an entry via the Claude API —
      prompt boundary = the knowledge layer, facts pinned byte-exact,
      output style-gated, cached forever in DO storage, template
      fallback always, flag off by default. Two tenants: the renderer
      (a three-line remark pool per civ and family, swapped in over the
      shipped bank's own deterministic pick) and **the counsel seam** —
      the closed candidate set as fixed slots, cached per candidate-set
      fingerprint, floor fallback; character touches gameplay texture,
      never gameplay truth. As built: the counsel ships **conservative**
      — the floor still picks and serves, and the model's stance attaches
      only where its pick agrees, so a disagreement degrades to the rules
      and is logged rather than played. Two flags
      (`HOLOS_VOICE_GEN`, `HOLOS_COUNSEL_GEN`), both `off`, key a Workers
      secret. Gates in CI: the §6 banned-terms sync, the style gate run
      over every shipped bank string, and R-37's import allowlist. The
      arrival line stays authored (its one serve is sub-second after
      `become`). The seam A2.5's LLM-run counterpart civ later builds on.

### A3 — The light echo ✅ *shipped, inside other slices*

The signature system: your past, propagating. (The Chronicle — the readable
record of that past — rides this same light echo and knowledge layer; thin.)

**This stage was never built as a stage.** All three items landed inside
A0, A2.4 and A2.6 as those slices needed them, and it stayed unticked here
until an audit (2026-07) checked each bullet against the tree. Recorded as
shipped so the plan stops listing built work as future work.

- [x] Emission history per civilization (seeded by the `CivSeed`'s
      bright-years debt; appended by everything bright you do)
      *(A0 seeds it — `civseed.ts`'s `drawEmissionHistory`; A2.4 appends
      to it — `contact.ts`'s `applyBroadcast`, whose two epochs are the
      shout and the fall back to what the civ would have been)*.
- [x] Per-observer views read emissions as-of light departure — going dark
      propagates outward; others court the civilization you used to be
      *(A0's `knowledge.ts`: `observeCiv` clips `lightHistory` at
      `asOfYear`, and it has been the spine of every later slice — the
      contest, the beam branch, the AI counterparts' light-view)*.
- [x] The Model's **echo shell** rendering (the poster feature,
      act3-map.md § moment 2) *(A2.4 — `model.ts`'s `drawOutbound`: one
      hairline ring whose radius is the years since the broadcast, drawn
      forever, growing a light-year a year)*.

### A4 — Missions & expansion ✅ *shipped: the probe half with A2.2, the travel half 2026-07*

Every launch is a mission from here on: a work-list node with a charter, a
clock, and an outcome ([missions-design.md](./missions-design.md) —
working decision 2026-07, missions into v1 thin).

**Three of this slice's items shipped early**, with A2.2's work engine
(see *Where the build is today*) — the probe half of A4 is done. **A4 is
NOT a shipped stage**: what remains is the *travel* half — standing
orders, seedships, relativistic ships, charters as a written value
function, and the Ledger — and it is the largest unbuilt block in
Phase A. (Audited 2026-07 alongside A3, which *was* fully shipped; the
two are easy to conflate because both had work pulled forward, and only
A3's was all of it.)

- [x] **The work list (list form)** *(shipped with A2.2)*: one surface for
      every undertaking — projects and missions as one derived work
      list, class chips, clock pairs, physics-derived states, one level
      of study parentage (missions-design.md, § The work list). Nothing to
      groom: an undertaking not yet undertaken is not a row.
- [x] **Probe-class missions** *(shipped with A2.2)*: the Assay (go and
      know) and the emplaced Sentinel; charters with 2–3 contingency
      slots resolved against truth at arrival; silence-at-deadline as
      the subtraction of two schedules. The Assay's *closing* of a study
      — the grounded exit — moved up to A2 (see § A2).
- [x] **Standing orders (thin)** *(shipped 2026-07)*: one class — on
      warm movement inside twenty light-years, launch the sentinel —
      armed on the sky with a charter as the consent's content, fired
      only from sky assembly, priced at fire time, fizzling with a
      report when the pool is short (systems-a.md §15).
- [x] **Seedships** *(shipped 2026-07)*: real flight clocks at 0.1c,
      the forecast survey (information age (1+F)d, the arrival spread a
      prior over public facts, a visible source forcing WIDEST), and
      landfall as a derived fold — the child civilization is never
      written, only derived, invisible to every observer until founding
      plus distance (systems-a.md §15).
- [x] **Relativistic ships (thin)** *(shipped 2026-07)*: the torch at
      0.5c behind an eight-year departure flare and the beam-pushed sail
      at 0.8c behind the launch-beam project, its battery burning bright
      for up to sixty years — launching loud as the price that cannot be
      paid down later; the seat stays home; dilation is narration
      (systems-a.md §15).
- [x] **The mission clock (thin)** *(shipped with A2.2)*: every launch
      compiles its expected light events — arrival, earliest
      confirmation, first report — into visible countdowns derived from
      three stored stamps plus constants; silence at a deadline reads as
      itself (act3-design.md § Missions, *The mission clock*).
- [x] **Charters** *(shipped 2026-07)*: the launch-time value function —
      five dial positions snapped inside the parent's own bands with
      per-dial pins, four clause groups, one name; the child's archetype
      resolves from the sheet through the same seam that places players,
      and the composer is the inheritance ceremony's dial furniture with
      the player on the writing side of the card (systems-a.md §15).
- [x] **The Ledger** *(shipped 2026-07)*: the lineage view with
      staleness chips and drift bands as words over dated observations
      (a disagreement tally against the charter as written, never a
      number), independence latched one-way, and the conversation brake:
      one round trip of slowed walk per completed exchange, capped at
      half, dead past two-thirds drift (systems-a.md §15).

### A5 — A living galaxy

- [x] **Tripwires + notifications** *(completed 2026-07)* — the
      engagement pressure valve (act3-design.md § Sleep and tripwires;
      sleep itself demoted to fiction and AI content, working decision
      2026-07 — a player taking no actions is already the quiet state).
      In-app shipped with A2.3; web push shipped: payload-free VAPID
      pushes off the alarm queue's predictive watch, the catch-up walk
      (a condition that held while nobody looked now fires, dated at
      the year it held), and the one-fixed-line service worker. As-built
      record: systems-a.md §17. Real-iOS delivery check remains on the
      playtest runbook.
- [x] **AI civ behavior (grown)** *(shipped 2026-07)*: the archetype
      spectrum acting over time — cadence shapes per archetype, reactive
      kindles/flinches/skips/hastens, the young-civ waking, and the
      congress's unprompted opener — derived at read time as a pure
      function of the seeds, the act log and the voyage record, stored
      nowhere, hidden by light-lag. As-built record: systems-a.md §16.
- [x] **Cohort seeding + frontier (thin)** *(shipped 2026-07)*: the
      posture mix (one seeded civ in five loud, the checked constraint
      enforced; the sky now ages quieter), new players seed outward (the
      separation floor grows per seat; joiner one unchanged), and six
      derived reserved stars per cohort held for Phase B incubators —
      never stored, never sent, refusals indistinguishable from typos.
      The stars are held; the protection itself is Phase B's (geometry
      or an arrivals-before-ascension rule, decide before B1). As-built
      record: systems-a.md §18.

**Phase A ships** as the v1 galaxy: inherit a mind, read the sky, meet
someone, launch a child, step away under tripwires. The whole loop of the
walkthrough's season (walkthrough.md).

---

## Phase S — Stakes *(inserted 2026-08; the active phase)*

Phase A built the machinery; the human playtest found it not fun.
[stakes-design.md](./stakes-design.md) is the premise this phase builds:
purpose stated, death real, visibility an economy, scarcity a map,
intent a human judgment. Two workstreams run together — the **UX
reboot** (how everything ships) and the **stakes systems** (what ships)
— in stages the designer plays before the next opens.

### The UX reboot (settled 2026-08)

The shipped desk-and-panel presentation is condemned; the server systems
beneath it — the knowledge layer, economy, missions, charters, the
Ledger — survive untouched. The client is the replaceable half.

- **Hybrid home.** A home dashboard with the Model as its centerpiece:
  the map is the heart, the dashboard carries navigation and what
  graphics can't.
- **The kept ingredient.** The one element the playtest liked: *the
  spatial feeling of having a place in a real sky*, and seeing the
  relative distances from Home to everything of interest. Every layout
  decision protects and amplifies this.
- **Drawn over stated.** If it is a physical quantity, it is drawn on
  the map: the mirror as a translucent sphere expanding from Home a
  light-year a year, exposure as reach arcs, probes as dots on drawn
  trajectories wearing arrival years, beams as corridors, staleness as
  fade. Prose belongs to the mind's counsel; numbers belong to the card
  the player opened on purpose. The echo shell was this rule's first
  instance — promoted from poster to paradigm.
- **Overflow detail lives on the card** *(decided 2026-08 in S0.4, by
  thumb)*. Both were built and put on a phone carrying the same content:
  the focused study reached from a source card, the deepest reach the
  game has. The card won, and what won it is the strip of map it leaves
  above itself. A detail page fills the frame between HUD and rail, and a
  frame with no sky left in it has spent the kept ingredient to show a
  list; the card stops short of the HUD, so the detail is read *at* a
  place that is still on the screen. That strip is the trade the call was
  actually about, and it is a pinned token now rather than a number
  re-picked per surface. The verdict is for **reading** surfaces: the
  launch and voyage composers carry text entry and a press-and-hold
  commit, were out of the test, and are their own call. ui-design.md
  § Settled: overflow detail is the record, including what the card
  stands down to carry it.
- **Inspirations, by role, Holos-flavored, never cloned:** Subterfuge
  (map-is-everything mobile interaction, drawn timers), Neptune's Pride
  (dread from arrival times on a bare map), Sins of a Solar Empire and
  Homeworld (the continuous zoom), Stellaris (semantic zoom: what a
  star shows changes with camera distance), Outer Wilds' ship log (the
  record as a knowledge graph — the model for the one big non-map
  surface), Clash of Clans (the return-visit rhythm, feeding AV2's
  report). Anti-model: EVE's spreadsheet presentation.
- ui-design.md gets revised to match as part of S0.

### The stages

Sequenced by three rules argued in review (2026-08): **loops, not
systems** (every consequence ships with its minimal legibility);
**time-to-felt-effect** (order by what week one feels like); **motive
before violence** (scarcity before strikes — with simultaneous starts
and the investigation ramp, early striking is implausible anyway, and
gets priced risky besides).

- [ ] **S0 — The frame.** The purpose line at minute one ("You are
      trying to continue to exist"), the verbs unburied, the mind's
      counsel giving direction (the shipped AV4 counsel seam, turned
      on), the hybrid home layout landed, the cards-versus-dashboard
      call made. Near-zero new systems; attacks the playtest's stated
      complaint directly. Subsumes AV1–AV3. *(Amended 2026-08: the
      purpose line was mocked and cut in review — the purpose is shown by
      the intro's four beats, never stated. Launch brief:
      [build-s0.md](./build-s0.md), which records the mock's settled
      layout and copy. The counsel strip that carried "the mind's counsel
      giving direction" shipped in S0.3 and was cut after the same phone
      check: an argued line with no occasion behind it reads as wallpaper,
      and its TALK was the third way to reach a Mind page the rail already
      opens. The AV4 seam and its bank are untouched and still serve the
      proposal stance; what is now open is where the mind speaks
      unprompted, if it ever does. The arrival line is settled: cut
      2026-08, the third prose surface to fall to one rule, with a first
      session worth clicking through doing the work all three were
      reaching for. build-s0.md § S0.3 carries the reasoning.)*
- [ ] **S1 — The prizes and the mirror.** The two-layer sky (real
      catalog as public knowledge, statistically-honest hidden objects
      to survey out), prospecting as the early game, the near scarcity
      tier first (rogue planets, cold sites, gardens; lens lines and
      black holes as the far tier), and the self-signature mirror drawn
      as geometry. Completes a loop from shipped parts: survey → find →
      seedship (A4) → charter a child at the prize (A4) → Ledger drift
      (A4). *(Amended 2026-08, S0 phone-check review — S1's frame is
      settled: **the baseline is the Fermi paradox.** A civilization at
      current-Earth-grade equipment detects no technosignatures at all,
      because receiver sensitivity is the binding constraint and the
      rule is real physics: nature is loud, civilization is quiet —
      stars, planets and transits stay detectable at baseline, while
      beams, leakage and works sit below the receiver floor. Finding
      others IS the invest loop: better receivers and instruments,
      probes, missions, projects. Seeded civilizations' transmissions
      are therefore invisible without upgraded comms equipment,
      including hails: a beam aimed at you goes unread until your floor
      drops, and landing the upgrade resolves the accumulated backlog
      at once — "they spoke first" arrives as a discovery you earned,
      not an inbox you were assigned. Until S1 lands, the shipped sky's
      visible seeded sources and threads are a known interim artifact
      that S1 retires.)*
- [ ] **S2 — Exposure and the thread.** The exposure readout
      (capability × proximity, drawn as reach), the record as a
      ship-log-style dossier surface, the jump/membrane/emigration
      rules over the shipped Ledger, the family register.
- [ ] **S3 — Consequence.** Weapons investment, the attack menu (strike
      thin first; raid and conquer after), wounding and the attacker's
      blindness, the morning-after, signed shots, death and new-cohort
      rebirth. Tested over real weeks, not an evening — this loop lives
      on Subterfuge time.
- [ ] **S4 — The instrument ladder, complete.** The two registers in
      final form, presence/capability/posture/record cards everywhere,
      staleness stamps as a system, and the instrument register's style
      rules written and wired into the audits (stakes-design.md's open
      question).

**Phase S ships when** the playtest that failed in 2026-08 stops
failing — each stage played before the next opens, the exit owned as
taste.

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
- **The grounded exit (A2/A4 boundary):** the Assay was specced to land
  with A4, so A2.3's brief told the board not to offer *grounded*. A2.2
  shipped probe missions early, which makes the exit buildable now.
  **Decided (2026-07): grounded ships as its own small slice, before
  A2.3** — the study lifecycle is then opened once, and A2.3's
  double-Opus session stays on the confidence model.
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
  **Decided (2026-07): deferred to Phase B.** The Refuser waits for the
  pivot that produces it — nothing about it is codified in Phase A. No
  Refuser civs in A5's AI spectrum, no refusal flag in the seed path, and
  no generator special-case for the one no-archetype region. The rationale
  is complexity: the Refuser is designed as the single exception to nearly
  every galaxy system (no dial sheet, closed transmission and receiver
  graph, throne-world seat, its own calendar convention, mission flavors,
  and the Breakout beat class), so every Phase A system would have to carry
  a Refuser branch to serve a shelf the corpus itself flags as shallow
  until Phase B. Deferring keeps Phase A uniform. The Refuser stays intact
  as design and Phase B content — vision.md pillar 2's "refusal is a played
  path, not a fail state" is unchanged, and the loud-minority spread in
  act3-civilizations.md still balances without Refusers at A5 scale. When
  refusal becomes playable, prefer folding the region into the normal
  machinery (an eleventh region with a fixed dial vector + a "harness, not
  mind" flag) over special-casing, so systems stay branch-free.

## Art that helps now

The image brief's **Act 3 groups are the active shot list** (screens 7–15,
plus the adopted style tile): the Sky + source card (7), the choice
ceremony (8), signals in flight (9), the Ledger (10), sleep/wake (11–12),
and the Model set (13–15, echo shell = poster). The inheritance-ceremony
ask from this plan shipped with A1 (concepts 03-00, 03-00b), and the
observatory ask (screen 7b) shipped as A2.1's adopted target
(concepts 03-03), and the work list has its plate too (screen 18, concepts
03-04 — adopted for its visual language, with six content fixes logged;
its progress tracks are unbuilt, the shipped rows carry text countdowns
only). **Current ask (A2.4): the choice ceremony** —
ui-image-brief.md screen 8, the hail thread and the broadcast shell
staged on the Model. A2.3 needs no new art: the contest renders inside
the board that already exists. Phase B's screens (world reveal variants,
beat, roll, pivot reveal) wait.

## Explicitly out of v1

Per the vision roadmap + per-act scopes (v1 posture is bold — relativistic
ships moved *into* v1 above; these stay out): self-transmission + the
seat's full form; human-inheritance of *diverged
in-game colonies* (v1 inherits *generated* civs; the drifted-colony
handoff needs the drift system matured); the conflict/deterrence layer
*(reversed 2026-08: Phase S moves the conflict layer into v1 —
stakes-design.md made consequence the center)*;
the mission system (agents, veterans, mission charters, vignette
returns, cooperative missions and the compensation menu — v1's probes
and hails are its skeleton);
megascale engineering and the entropy tree; the cosmic clock as a system;
grave worlds and the dig they house (harvest, never restore —
act3-design.md, *Grave worlds*), and anomaly
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
- **The UX reboot's scope** — Phase S condemns the shipped presentation
  while keeping the systems, and the risk is a long dark stretch
  rebuilding surfaces with nothing playable. The mitigation is the
  stage order: S0 ships in days, and every stage ends playable.
