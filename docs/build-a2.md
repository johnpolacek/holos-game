# HOLOS — Build brief: A2 (Contact)

*The launch brief for a fresh thread building slice **A2** — the soul of
the game: detect → vigil → choice → traffic, across real light-lag,
against counterparts who may be human or rules and never say which. Part
of the just-in-time `build-*.md` series; source of sequence and scope is
[roadmap.md](./roadmap.md) (§ Phase A → A2), which wins on any
disagreement. [build-a1.md](./build-a1.md) is the previous slice's brief,
kept as record — A1 is merged and deployed.*

---

## Orchestration

Per [CLAUDE.md § Build orchestration](../CLAUDE.md): run this slice with
**Fable as orchestrator** — plan, decompose, synthesize, keep context
lean. Send **reasoning-heavy work to Opus** (deep-reasoner) and
**mechanical work to Sonnet** (fast-worker). The **high-stakes calls** —
run Opus twice with different framings and synthesize — are: the
**case/confidence model** (honest-but-coarse updating vs authored curves;
the regression tell must be earned by real opponent spend), the
**composed-signal grammar** (the parts, and what deception and tone they
allow), and the **delivery wire design** (signals and question-answers
scheduled through the Cohort DO's alarm queue, arriving as light).
Fable — not the subagents — holds the invariants below, verifies them in
every subagent's output, keeps `typecheck`/`build` green, and commits.

## Orientation

A1 shipped the inheritance ceremony and the Sky: a player owns a
civilization and reads warm smudges as beliefs. **A2 makes the smudges
answer back.** This is the slice the vision calls the first thing to
prototype and the roadmap gates on fun: a complete contact arc — a vigil
that is a real activity, an irreversible choice, and tight-beam traffic
on real clocks — playable against seeded AI counterparts and between two
humans in one cohort, indistinguishably.

Three decisions are already made for you (do not reopen them):

- **Signal format** (vision.md § Decisions, 2026-07): human-to-human
  signals are **composed from structured parts**; traffic with AI
  counterparts may be freeform. Design the parts; don't ship a chat box.
- **The vigil spec exists**:
  [observatory-design.md](./observatory-design.md) — cases, hypotheses,
  buyable questions, instrument-time allocation, sharpen/plateau/regress,
  case tripwires, called/shelved/overtaken exits. Build that, thin.
- **Durable identity lives in DO SQLite** (roadmap § Open build
  decisions): the A1 per-run token becomes a claimable account in the
  Durable Object's native SQLite storage; multi-device by carrying the
  account token. No external backend.

## What A0/A1 already give you (read the code, it is the real spec)

- `server/src/knowledge.ts` — the light-delay layer; `ObservedCiv` (→
  wire-narrowed `DetectedSource`) is still the ONLY remote-civ shape
  that crosses. The vigil's evidence and every signal's physics stamp
  derive from it and from `lightHistory`.
- `server/src/cohort.ts` — the Cohort DO: truth, clock, alarm-driven
  event queue (this is your delivery mechanism — a sent signal is a
  scheduled event `distanceLy` years out), the A1 join/become flow, and
  per-player state.
- `server/src/protocol.ts` — the guarded-parse pattern and the A1
  message set you extend (cases, questions, the choice, signals).
- `server/src/civseed.ts` / `minds.ts` — archetype registers (charter,
  first read, voices) that AI counterpart replies are generated from;
  `emissionHistory` feeds what any vigil can actually see.
- `client/src/model.ts`, `sourcecard.ts`, `ceremony.ts` — the Model, the
  source card (grows the *open case* affordance), and the
  hold-to-commit ceremony pattern (reused for the choice screen).

## Read first (docs)

- [roadmap.md](./roadmap.md) — § A2 (authoritative scope), § Open build
  decisions (A2 entries now marked decided).
- [observatory-design.md](./observatory-design.md) — the vigil, whole.
  Its § v1 scope is your build list for the case board.
- [act3-design.md](./act3-design.md) — § Contact (the four stages;
  what signals carry), § The Sky, § Sleep/tripwires/absence charter
  (the presence rule binds this slice).
- [ui-design.md](./ui-design.md) — § Act 3 (the observatory/case board,
  the choice screen, Signals-as-threads), principles 3–5 (ages,
  beliefs, reversible-vs-ceremony).
- [economy-design.md](./economy-design.md) — the mask-versus-instrument
  contest as opposed open-ended spends; questions are Compute-heavy
  Investments; no capacity slots anywhere.
- [prose-style.md](./prose-style.md) — the comms register (signals,
  never letters — grep-checkable), observatory deadpan for the case
  board, archetype voices (§4) for AI counterpart replies.
- [walkthrough.md](./walkthrough.md) — Days 1–3 and Week 2 are this
  slice's acceptance scenes (the anthem, the stay-dark resistance beat,
  the whisper, the evening exchange).

## Staging and live preview

A2 builds **one screen at a time, in six stages**. Every stage ends
shippable and *shipped*: a small PR, CI green, merged to `main` — and
`main` auto-deploys the one Worker, so the production URL on a phone is
the live preview after every stage (CLAUDE.md § Deployment; merged means
released, and each stage below is written to be releasable). Workers
Builds also deploys a preview version per PR branch (`wrangler versions
upload`) for checking *before* merge — usable here since A2 adds no
Durable Object migration (the 10211 caveat does not apply) — but note a
preview version shares production DO state, so run pre-merge checks
against a dev cohort room name, never the live cohort.

**The stage discipline:** each stage = one screen (plus only the
substrate it needs), one PR, one phone check written below as its gate.
A stage does not start until the previous stage's phone check passed on
the deployed URL. Wire rules hold at every stage: guarded parsing per
the protocol pattern, and nothing about a remote civ beyond
`DetectedSource` + what the case/evidence shapes explicitly add — those
shapes derived in `knowledge.ts`, never in handlers.

## The stages — A2 (roadmap § A2 is authoritative for scope)

### A2.1 — The case board, read-only

The vigil's screen, before its verbs. Wire: open/shelve a case; case
state on the Cohort DO; hypothesis menus per signal class seeded from
`ObservedSignal`. Screen: the observatory Desk panel — open cases as
rows, the focused case showing its hypotheses as confidence bars, the
light archive annotated with what moved what. The source card grows one
affordance: *open a case*.

**Phone check:** flag the nearest `DARK NODE` candidate → a case opens
→ read its hypotheses with confidence shares and the evidence so far.
Nothing buyable yet.

### A2.2 — Questions, bought and answered

The vigil's verb. Wire: buy a question; instrument-time income and
allocation; answers scheduled through the alarm queue on real clocks.
Screen: the case's open questions with costs, clock pairs, and
which-hypotheses-it-separates; bought questions on the strip's cooking
clocks; answers landing in the report and moving the bars (sharpen and
plateau only — no opponent yet).

**Phone check:** buy an overnight question in the evening; the next
morning's report shows the answer and the case's bars visibly moved —
or a plateau, honestly labeled.

### A2.3 — The contest, and case tripwires

The other side spends. Archetype-rule mask upkeep for seeded civs (a
Cloister pays forever; a young Beacon never does), resolved
budget-vs-budget per economy-design.md — no stealth stats, no
certainty. Regression joins the answer shapes, its tell stated plainly
in the observatory deadpan (observatory-design.md, **settled**). Case
tripwires (*wake this case if confidence regresses; if the leakage
stops*) fire in-app on next open. Called/shelved/overtaken exits
complete the case lifecycle — a called case stays called. **No
grounded exit** — the Assay is A4; the board simply does not offer it.

**Phone check:** a vigil on a masked target regresses and the board
says why in one flat sentence; a called case closes and stays closed.

### A2.4 — The choice ceremony

The irreversible screen. Hail (a thread of light drawn to one source),
broadcast (the expanding shell touching sources with arrival dates),
stay dark (a tap) — staged on the Model, hold-to-commit, consequence
rendered during the hold; releasing early cancels silently. Resistance
beats fire when the choice fights the dials (the walkthrough's
stay-dark scene is the acceptance test). The commit writes emission
truth; nothing answers yet.

**Phone check:** hold a broadcast far enough to watch the shell sweep
three sources with arrival dates, release early, and nothing happens;
hold a hail to commit, and the Model shows the thread in flight.

### A2.5 — Traffic, against the AI

The thread screen, and the first replies. Freeform-with-AI first (the
settled format order): rule-based counterparts in three registers — a
dark whisperer (Hearth-class: answers only civs that have gone quiet),
a loud builder (Lantern-class: hails bright pasts, sings back at
broadcasts), and a Congress-style ready answerer — replying in
archetype voice (prose-style §4) on real clocks through the alarm
queue. Screen: threads in the Voice, in-flight motes on the Model,
every received signal wearing its physics stamp.

**Phone check:** hail the near whisperer, get a reply roughly half an
hour later wearing transit years and received strength, and hold a
conversation across an evening — the walkthrough's Week 2 texture, on
the deployed URL.

### A2.6 — Human pairs: the composer, dossiers, identity

The multiplayer gate. The composed-parts composer for human pairs
(part set: payload blocks — knowledge, culture, archive fragments,
coordinates, **dossiers** (tradeable, observatory-design.md § The
dossier) — plus quantity, tone, and reference parts). Durable identity
(account row in DO SQLite, claim flow from the A1 token, second-device
sign-in by token, old anonymous token rejected). Human-to-human threads
indistinguishable from the AI path at the wire level.

**Phone check:** the fun gate below, run on two phones.

## Done when (the fun gate — prove it by playing it)

Two humans in one cohort, phones: each flags the other, runs a vigil in
which at least one bought question visibly moves (or visibly *regresses*)
a belief, one hails, and they exchange composed signals across real
light-lag inside an evening — **and the exchange is worth
screenshotting**. The same arc runs human-vs-AI, indistinguishable at
the wire level. The no-leak check still holds byte-for-byte: nothing
beyond `DetectedSource` + the case's own evidence shapes about any
remote civ. One account works from two devices. If the loop isn't fun,
tune here — nothing else builds until this gate passes (roadmap, § A2).

## Guardrails

- **Irreversibility requires presence.** No auto-hail, no auto-answer
  to first contact, nothing irreversible fires from any standing state
  while the player is away (act3-design.md, § the presence rule).
- **No missions, no launches.** The Assay/grounded exit, the Docket
  surface, and seedships are A4. Bought questions may ride the existing
  strip clocks; do not build the Docket early.
- **`ObservedCiv`/`DetectedSource` discipline is absolute**, extended
  only through `knowledge.ts`.
- **The comms register**: signals, tight beams, traffic, payloads —
  never letters, never email furniture (prose-style.md § 8; the ban is
  grep-checkable and CI-greppable).
- **Registers**: case board and physics stamps in observatory deadpan
  (wit 0); AI counterpart replies in their archetype's voice (§4);
  no exclamation marks anywhere.
- **Calm by design**: no badges, no unread counts; deliveries wait in
  the report; only tripwires notify.
- Small single-purpose commits on a feature branch + PR; `npm run
  typecheck` and `npm run build` green at every commit — main
  auto-deploys.

## First move

Read the code and docs above, then **propose before building A2.1: the
case wire shapes (case, hypothesis, evidence) and the case board's
screen layout** — plus a sketch of where the later stages' messages will
hang, so A2.1's shapes don't need reshaping. Each subsequent stage opens
the same way: a short proposal (its wire additions and its screen), the
go, then build. The two proposals that warrant the double-Opus treatment
when their stages arrive: the case/confidence model with earned
regression (A2.3) and the composed-signal part grammar (A2.6). After
each go, decompose into subagent tasks (see *Orchestration*), and
integrate + verify the invariants yourself before each commit — every
stage merges to `main` and is checked on a phone at the deployed URL
before the next begins.
