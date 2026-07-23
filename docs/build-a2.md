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

## The task — A2 (roadmap § A2 is authoritative)

1. **Wire protocol growth.** Guarded messages for: open/shelve/call a
   case; buy a question; allocate instrument time; the choice commit
   (hail / broadcast / stay dark); send a signal; receive scheduled
   deliveries (question answers, signals) fired by the alarm queue at
   light-honest times. Nothing about a remote civ beyond
   `DetectedSource` + what the new case/evidence shapes explicitly add —
   and those shapes are derived in `knowledge.ts`, never in handlers.
2. **The case board** (observatory-design.md § v1 scope): hypothesis
   menus per signal class, the six question types with costs and
   clocks, instrument-time income + allocation, sharpen/plateau/regress
   answers (regress only when the target actually spends — archetype
   mask rules supply the spend), case tripwires, called/shelved/
   overtaken exits. **No grounded exit yet** — the Assay is A4; the
   board simply doesn't offer it.
3. **The mask contest (thin).** Archetype-rule mask spend for seeded
   civs (a Cloister pays upkeep forever; a young Beacon never does);
   the player's own mask as the existing dark-project upkeep. Contest
   resolution is budget-vs-budget per economy-design.md — no stealth
   stats, no certainty.
4. **The choice ceremony.** Hail (thread of light to one source),
   broadcast (expanding shell with arrival dates), stay dark (a tap) —
   staged on the Model, hold-to-commit, consequences rendered during
   the hold. Resistance beats fire when the choice fights the dials
   (the walkthrough's stay-dark scene is the acceptance test).
5. **Traffic.** Tight-beam threads on real clocks: composed-parts
   composer for human pairs (design the part set: payload blocks —
   knowledge, culture, archive fragments, coordinates, **dossiers**
   (tradeable in v1, observatory-design.md § The dossier) — plus
   quantity, tone, and reference parts); freeform for AI counterparts; in-flight
   rendering on the Model; every received signal wearing its physics
   stamp. Delivery via the alarm queue; a signal is light and arrives
   exactly when light would.
6. **Rule-based AI counterparts (thin).** Enough behavior for complete
   contact arcs in three registers: a dark whisperer (Hearth-class — 
   answers only civs that have gone quiet), a loud builder
   (Lantern-class — hails bright pasts, sings back at broadcasts), and
   one Congress-style ready answerer. Replies composed from archetype
   voice + templated payloads; light-lag hides the seams.
7. **Durable identity (thin).** Account row in DO SQLite; claim flow
   from the A1 token; second-device sign-in by token; the cohort
   rejects a claimed civ's old anonymous token. Recovery flows later.

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

Read the code and docs above, then **propose before building: the wire
message set (cases, questions, choice, signals, deliveries), the
composed-signal part grammar, and the case/confidence model** (including
how archetype mask spend produces an earned regression). After the go,
decompose into subagent tasks (see *Orchestration*), and integrate +
verify the invariants yourself before each commit.
