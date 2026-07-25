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
**study/confidence model** (honest-but-coarse updating vs authored curves;
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
  [observatory-design.md](./observatory-design.md) — studies, hypotheses,
  buyable questions, compute allocation, sharpen/plateau/regress,
  study tripwires, called/shelved/overtaken exits. Build that, thin.
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
  message set you extend (studies, questions, the choice, signals).
- `server/src/civseed.ts` / `minds.ts` — archetype registers (charter,
  first read, voices) that AI counterpart replies are generated from;
  `emissionHistory` feeds what any vigil can actually see.
- `client/src/model.ts`, `sourcecard.ts`, `ceremony.ts` — the Model, the
  source card (grew the *open study* affordance in A2.1, and *dispatch a
  probe* in A2.2), and the hold-to-commit ceremony pattern (reused for
  the choice screen).

And what A2.1/A2.2 added, which the remaining stages extend rather than
re-invent:

- `server/src/studies.ts` — studies, hypothesis boards, evidence and
  `settleShares` (the one place a belief moves; shares capped below
  certainty). `StudyStatus` is still `"open" | "shelved"` — A2.2b and
  A2.3 are what widen it.
- `server/src/questions.ts` / `projects.ts` — the six bought questions
  and the instrument shelf, priced in compute with effects frozen at
  purchase.
- `server/src/missions.ts` / `tend.ts` — Assay and Sentinel probes,
  charters, the mission clock, and the derived work list. `deriveStudyMoves`
  is the seam A2.2b closes a study through.
- `server/src/knowledge.ts` — now also `LightCone` / `peekTruth` /
  `occupancyAt`: every channel that reads another civ's truth mints a
  cone first, and above it `peekTruth` returns `null`, never a clamp.
- `client/src/studyboard.ts` — the board, the work list, and the launch
  sheet. It is the largest client module; new panels join it.

**A note for any session reading those modules:** their comments cite
`systems-a.md`, `synthesis.md` and `content.md` with section numbers, and
none of the three was ever committed.
[systems-a.md](./systems-a.md) now exists as a **reconstruction from the
code**, numbered to match its citations — read it for the tables (the
question catalog, the finding rows, the charter resolution, the work list's
states), but treat the code as the spec of record where they differ.
`synthesis.md` and `content.md` are still missing; do not add new
citations to them.

## Read first (docs)

- [roadmap.md](./roadmap.md) — § A2 (authoritative scope), § Open build
  decisions (A2 entries now marked decided).
- [observatory-design.md](./observatory-design.md) — the vigil, whole.
  Its § v1 scope is your build list for the observatory.
- [act3-design.md](./act3-design.md) — § Contact (the four stages;
  what signals carry), § The Sky, § Sleep/tripwires/absence charter
  (the presence rule binds this slice).
- [ui-design.md](./ui-design.md) — § Act 3 (the observatory,
  the choice screen, Signals-as-threads), principles 3–5 (ages,
  beliefs, reversible-vs-ceremony).
- [economy-design.md](./economy-design.md) — the mask-versus-instrument
  contest as opposed open-ended spends; questions are Compute-heavy
  Investments; no capacity slots anywhere.
- [prose-style.md](./prose-style.md) — the comms register (signals,
  never letters — grep-checkable), observatory deadpan for the
  observatory, archetype voices (§4) for AI counterpart replies.
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

**Per-stage launch prompts:** [build-a2-stages.md](./build-a2-stages.md)
carries a paste-ready handoff prompt for each stage — self-contained
blocks for starting each stage in a fresh session.

**The stage discipline:** each stage = one screen (plus only the
substrate it needs), one PR, one phone check written below as its gate.
A stage does not start until the previous stage's phone check passed on
the deployed URL. Wire rules hold at every stage: guarded parsing per
the protocol pattern, and nothing about a remote civ beyond
`DetectedSource` + what the study/evidence shapes explicitly add — those
shapes derived in `knowledge.ts`, never in handlers.

## The stages — A2 (roadmap § A2 is authoritative for scope)

**Where the stages stand (2026-07):** A2.1 and A2.2 are merged and
deployed; the grounded-exit slice is next, then A2.3. A2.2 also shipped
probe missions and the work list — A4 work, pulled forward, against this
brief's guardrail (see § Guardrails, which now records the overrun
rather than pretending it away). roadmap.md § Where the build is today
carries the full account, including the three uncommitted spec docs the
shipped code cites.

### A2.1 — The observatory, read-only ✅ *shipped (#12, follow-ups #13–#17)*

The vigil's screen, before its verbs. Wire: open/shelve a study; study
state on the Cohort DO; hypothesis menus per signal class seeded from
`ObservedSignal`. Screen: the observatory Desk panel — open studies as
rows, the focused study showing its hypotheses as confidence bars, the
light archive annotated with what moved what. The source card grows one
affordance: *open a study*.

**Phone check:** flag the nearest `DARK NODE` candidate → a study opens
→ read its hypotheses with confidence shares and the evidence so far.
Nothing buyable yet.

### A2.2 — Questions, bought and answered ✅ *shipped*

The vigil's verb. Wire: buy a question; compute income and allocation;
answers scheduled through the alarm queue on real clocks.
Screen: the study's open questions with costs, clock pairs, and
which-hypotheses-it-separates; bought questions on the strip's cooking
clocks; answers landing in the report and moving the bars (sharpen and
plateau only — no opponent yet).

**Phone check:** buy an overnight question in the evening; the next
morning's report shows the answer and the study's bars visibly moved —
or a plateau, honestly labeled.

### A2.2b — The grounded exit ✅ *shipped, with the work list's tracks*

Added 2026-07, after probe missions shipped early with A2.2. The Assay
is the observatory's closing verb — *go and know* — and its reports
already fold into a study's board through `deriveStudyMoves`; what is
missing is the close. A returned Assay on a study's target grounds that
study: the belief it settles is the probe's, not the sky's, and the
board says which. Grounded is an exit like called — it stays closed
until the player reopens it — but it is the one exit whose belief was
paid for in flight time rather than in compute.

Small and standalone on purpose: it opens the study lifecycle once, so
A2.3 adds called and overtaken to a lifecycle that already has three
states, and A2.3's double-Opus session stays on the confidence model.

**Phone check:** launch an Assay from an open study, wait out its
flight, and on the report's arrival the study closes as grounded,
naming the probe as the source of the belief.

*Shipped 2026-07 with the work list's progress tracks (roadmap § A4's
work-list row), which were built alongside it because both are small and
both touch surfaces that already exist. The tracks were checked on a
phone-sized viewport against a live cohort on an accelerated local
clock — and that check found a real bug in A2.2's silence detection: a
Sentinel that had kept every appointment read SILENT, because promised
and actual arrivals were matched by exact float equality (systems-a.md
§3.4, fixed). Run the app and look at the screen; it says things the
types cannot.*

### A2.3 — The contest, and study tripwires

The other side spends. Archetype-rule mask upkeep for seeded civs (a
Cloister pays forever; a young Beacon never does), resolved
budget-vs-budget per economy-design.md — no stealth stats, no
certainty. Regression joins the answer shapes, its tell stated plainly
in the observatory deadpan (observatory-design.md, **settled**). Study
tripwires (*wake this study if confidence regresses; if the leakage
stops*) fire in-app on next open. Called/shelved/overtaken exits
complete the study lifecycle — a called study stays called. The
grounded exit is no longer this stage's problem: it ships in A2.2b,
just above.

**Phone check:** a vigil on a masked target regresses and the board
says why in one flat sentence; a called study closes and stays closed.

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
beyond `DetectedSource` + the study's own evidence shapes about any
remote civ. One account works from two devices. If the loop isn't fun,
tune here — nothing else builds until this gate passes (roadmap, § A2).

## Guardrails

- **Irreversibility requires presence.** No auto-hail, no auto-answer
  to first contact, nothing irreversible fires from any standing state
  while the player is away (act3-design.md, § the presence rule).
- ~~**No missions, no launches.**~~ **Amended 2026-07 — overrun, and
  kept.** A2.2 shipped probe-class missions (Assay, Sentinel, charters)
  and the work list alongside the questions layer, on the argument that a
  bought question and a launched probe are the same verb at two prices
  and wanted one work engine between them. That is now the shipped
  architecture and this brief follows it rather than the other way
  round. What stays out of A2 is still real: **no seedships, no
  relativistic ships, no standing orders, no Ledger** — the travel half
  of A4 (roadmap.md § A4). New work in the remaining stages hangs off
  the work list that exists; it does not grow it.
- **`ObservedCiv`/`DetectedSource` discipline is absolute**, extended
  only through `knowledge.ts`.
- **The comms register**: signals, tight beams, traffic, payloads —
  never letters, never email furniture (prose-style.md § 8; the ban is
  grep-checkable and CI-greppable).
- **Registers**: the observatory and physics stamps in observatory deadpan
  (wit 0); AI counterpart replies in their archetype's voice (§4);
  no exclamation marks anywhere.
- **Calm by design**: no badges, no unread counts; deliveries wait in
  the report; only tripwires notify.
- Small single-purpose commits on a feature branch + PR; `npm run
  typecheck` and `npm run build` green at every commit — main
  auto-deploys.

## First move

Every stage opens the same way: a short proposal — its wire additions
and its screen — then the go, then the build. A2.1's proposal (the study,
hypothesis and evidence shapes, and the board's layout) is shipped and
is now the pattern the rest extend. **The open stage is A2.2b**, whose
proposal is small: where `grounded` sits in `StudyStatus`, what closes
the study when an Assay report lands, and how the board says the belief
came back with the probe rather than out of the sky. The two proposals that warrant the double-Opus treatment
when their stages arrive: the study/confidence model with earned
regression (A2.3) and the composed-signal part grammar (A2.6). After
each go, decompose into subagent tasks (see *Orchestration*), and
integrate + verify the invariants yourself before each commit — every
stage merges to `main` and is checked on a phone at the deployed URL
before the next begins.
