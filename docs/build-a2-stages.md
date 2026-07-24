# HOLOS — A2 stage handoffs

*Paste-ready launch prompts, one per stage of A2 (build-a2.md § The
stages). Each block below is self-contained: paste it into a fresh build
session and it carries everything the session needs to orient, read,
propose, and build — without this file open beside it. The prompts point
at specs rather than duplicating them; [build-a2.md](./build-a2.md) and
the docs each prompt names stay the source of truth.*

**How to use:** one stage at a time, in order. Paste the stage's block
into a new session. The session ends at an **open PR plus a phone
checklist** — you run the check on the preview or deployed URL, and the
stage is done only when the check passes on your phone and the PR is
merged. Then paste the next block into the next fresh session.

---

## A2.1 — The case board, read-only

```
Build stage A2.1 of Holos: the case board, read-only — the vigil's
screen before its verbs.

Orient. Read, in order: CLAUDE.md at the repo root (stack, conventions,
and § Build orchestration — you are the orchestrator; Opus for
reasoning-heavy design, Sonnet for mechanical work; you hold the
invariants, integrate, and commit). Then docs/build-a2.md (§ Staging and
§ A2.1 — the stage's scope and phone check), docs/observatory-design.md
(§ The case, § Hypotheses — the spec you are building the read-only
slice of), docs/ui-design.md (§ Act 3 the observatory bullet, the
component library, the seven principles), and
docs/concepts/03-03-case-board.png with its decision-log row in
docs/concepts/README.md (the adopted visual target, including its two
build notes: the confidence marker must not read as a draggable knob,
and a question's hours are stated once — the second note binds A2.2 but
shape the layout for it now).

What exists. A0/A1 are merged and deployed: the knowledge layer
(server/src/knowledge.ts — ObservedCiv, narrowed to DetectedSource in
server/src/protocol.ts, is the ONLY remote-civ shape that crosses the
wire), the Cohort Durable Object with clock + alarm queue
(server/src/cohort.ts), guarded protocol parsing patterns
(server/src/protocol.ts), and the client's Model, source card, and
ceremony (client/src/model.ts, sourcecard.ts, ceremony.ts).

Build:
1. Wire: openCase / shelveCase client messages (guarded parse, exactly
   in the existing pattern) and a case snapshot in the sky/report
   payloads. Per-player case state lives on the Cohort DO.
2. Server: hypothesis menus per signal class as typed data
   (observatory-design.md § Hypotheses table), an initial confidence
   distribution derived from the source's ObservedSignal, and evidence
   annotations derived from lightHistory. All derivation in
   knowledge.ts or a new cases.ts beside it — never in handlers.
3. Client: the case board as a Desk panel (DOM, not canvas): open cases
   as rows; the focused case shows the header (designation, local
   name, AS OF n Y AGO chip), the blurred-smudge treatment per the
   adopted art, hypothesis rows as track+marker bars with tabular
   percentages, and the annotated light archive. The source card
   gains one affordance: open a case.
4. One flat annotation line under the bars in the observatory register
   (wit 0, no exclamation marks): when no hypothesis leads decisively,
   use exactly: "No hypothesis exceeds the threshold. Continue the
   watch."

Do not build: buyable questions, instrument allocation, regression or
any opponent behavior, case tripwires, called/overtaken exits, the
choice ceremony, signals, missions, or the Docket. A2.1 is read-only.

Invariants you personally verify in every subagent's output: nothing
about a remote civ beyond DetectedSource + the new case shapes crosses
the wire, and the case shapes carry beliefs, never truth; present tense
and cyan for HOME only, soft past tense and amber for everything else;
every remote fact wears its light-age; strict TypeScript, no any,
noUncheckedIndexedAccess stays on; the comms register (signals, never
letters) in every string; npm run typecheck and npm run build green at
every commit.

First move: before building, propose (a) the case wire shapes — case,
hypothesis, evidence entry — with a sketch of where A2.2–A2.6's
messages will hang so nothing needs reshaping later, and (b) the case
board's screen layout against the adopted art. Get a go, then decompose
and build.

Finish: small single-purpose commits on a feature branch; open a PR
(do not merge) titled for the stage; end by reporting the PR link, the
preview URL if Workers Builds produced one (test only against a dev
cohort room — previews share production DO state), and this phone
checklist for the user: flag the nearest DARK NODE candidate on a
phone; a case opens; read its hypotheses with confidence shares and
the evidence so far; confirm nothing is buyable.
```

---

## A2.2 — Questions, bought and answered

```
Build stage A2.2 of Holos: questions, bought and answered — the vigil's
verb.

Orient. Read, in order: CLAUDE.md at the repo root (stack, conventions,
§ Build orchestration — you orchestrate; Opus for design-heavy calls,
Sonnet for mechanical work). Then docs/build-a2.md (§ Staging, § A2.2),
docs/observatory-design.md (§ Questions — the six question types, costs
as instrument time, sequencing, "which hypotheses it separates"; § The
design target — portfolio pacing is settled: dry spells per case are
normal, the board must always offer a decision), docs/economy-design.md
(questions are Compute-heavy Investments; no capacity slots — budget
and time are the only limits), and docs/ui-design.md (clock pair rule:
real time and game time together, everywhere).

What exists. A2.1 shipped the read-only case board: case state on the
Cohort DO, hypothesis menus, guarded openCase/shelveCase wire, the Desk
panel, and the adopted visual language (docs/concepts/README.md's
03-03-case-board row — note its build fixes: the confidence marker is a
glow, never a knob; a question's hours are stated once, with the clock
pair carrying the duration). The Cohort DO's alarm queue
(server/src/cohort.ts) already schedules future events; answers ride
it.

Build:
1. Server: the six question types as typed data (weigh it, temperature
   over time, read its lines, time its shadows, catch its edges,
   listen off-axis), each with an instrument-time cost, an
   integration-time clock, and which hypothesis pairs it separates.
   Instrument-time income per civilization; allocation across cases.
   Answers resolve server-side against emission truth through the
   knowledge layer (never in handlers) and update the case's
   distribution — sharpen or plateau only; no opponent yet.
2. Wire: buyQuestion and setAllocation messages (guarded); scheduled
   answer delivery through the alarm queue at light-honest times;
   answers arrive as report entries and case updates.
3. Client: the case's open-questions list with cost, clock pair, and
   which-hypotheses-it-separates; bought questions on the strip's
   cooking clocks; the report renders landed answers and the bars
   move. A plateau is labeled honestly in the observatory register
   (wit 0): consistent with everything, informative about nothing.

Do not build: regression or mask spend (A2.3), case tripwires (A2.3),
called/overtaken exits (A2.3), the choice ceremony (A2.4), signals
(A2.5+), missions, or the Docket surface (A4) — bought questions ride
the existing strip clocks.

Invariants you personally verify: answer content is derived in
knowledge.ts/cases.ts from delayed truth only — a question's answer can
never reveal more than the light the observer holds; DetectedSource
discipline unchanged; clock pairs on every duration; no capacity slots
anywhere (income and time are the only limiters); strict TS; comms
register; typecheck and build green at every commit.

First move: before building, propose the question data shape and the
answer-resolution rule (how an answer moves a distribution, and when it
plateaus) in one short note; get a go, then build.

Finish: small commits, feature branch, open a PR (do not merge); report
the PR link, the preview URL if any (dev cohort room only), and this
phone checklist: in the evening, buy an overnight question on an open
case; next morning the report shows the answer and the case's bars have
visibly moved — or a plateau, honestly labeled.
```

---

## A2.3 — The contest, and case tripwires

```
Build stage A2.3 of Holos: the contest and case tripwires — the other
side starts spending, and the case lifecycle completes.

Orient. Read, in order: CLAUDE.md at the repo root (§ Build
orchestration — this stage carries one of A2's two double-Opus calls:
run the case/confidence model past Opus twice with different framings —
e.g. "honest Bayesian, coarse" vs "authored curves that cannot lie" —
and synthesize before building). Then docs/build-a2.md (§ A2.3),
docs/observatory-design.md (§ The contest — sharpen/plateau/regress;
the regression tell is stated plainly, settled; § The exits — called
stays called, no auto-reopen, no warning, no penalty; § Open questions
— the confidence-math question this stage must answer),
docs/economy-design.md (the mask-versus-instrument contest is opposed
open-ended spending, never stealth stats), and docs/prose-style.md
(observatory deadpan, wit 0, for the tell).

What exists. A2.1–A2.2 shipped cases with hypothesis distributions and
bought questions answering through the alarm queue against delayed
truth. Seeded civs carry archetypes and emission histories
(server/src/civseed.ts, minds.ts); their mask behavior is this stage's
addition.

Build:
1. Server: archetype-rule mask upkeep for seeded civs (a Cloister pays
   forever; a young Beacon never does; read each archetype's posture
   from minds.ts and keep the rule table small and typed). Contest
   resolution: the target's mask spend against the observer's
   instrument spend decides whether an answer sharpens, plateaus, or
   regresses — and regression fires ONLY when the target actually
   spent against the look in the relevant window. An earned tell,
   never a scripted jump-scare.
2. The tell: when a case regresses, the board says why in one flat
   observatory-deadpan sentence stating the implication (this does not
   happen naturally; something is working against the look). Plain,
   settled; no drama in the type, all the drama in the fact.
3. Case tripwires: per-case standing conditions (wake this case if
   confidence regresses; if the leakage stops; if confidence crosses
   N%) firing in-app on next open — no push notifications in this
   stage.
4. Exits: called (player accepts the leading belief; the case closes
   and STAYS closed — later light accrues to the archive but never
   auto-reopens, never warns, never penalizes; reopening is always the
   player's own act) and overtaken (the source's own change of state
   converts the case). Shelve already exists; grounded does not ship
   (A4).

Do not build: the choice ceremony (A2.4), signals (A2.5+), push
notifications, missions, the player's own mask UI beyond what exists
(their dark-project upkeep already stands in).

Invariants you personally verify: regression is earned (test: a case on
a never-masking target can plateau but never regress); called cases are
immutable except by explicit player reopen; the tell renders wit-0 with
no exclamation marks; DetectedSource discipline; strict TS; typecheck
and build green.

First move: the double-Opus proposal — the confidence model (few
hypotheses, few evidence channels, real arithmetic vs authored curves),
how mask spend enters it, and the regression trigger window — synthesized
into one short design note. Get a go, then build.

Finish: small commits, feature branch, PR open (not merged); report the
PR link, preview URL if any (dev cohort room only), and this phone
checklist: run a vigil on a masked target until an answer regresses and
the board says why in one flat sentence; call a different case and
confirm it closes and stays closed.
```

---

## A2.4 — The choice ceremony

```
Build stage A2.4 of Holos: the choice ceremony — the game's first
irreversible screen.

Orient. Read, in order: CLAUDE.md at the repo root (§ Build
orchestration). Then docs/build-a2.md (§ A2.4), docs/act3-design.md
(§ Contact stages 1–3, § The Light Echo — the commit writes emission
truth; § Sleep, tripwires, and the absence charter — the presence rule:
irreversible acts require presence, so nothing in this stage may ever
fire without a live hold), docs/ui-design.md (§ principle 5 —
reversible is a tap, irreversible is a ceremony; § Act 3 the choice
screen; hold-to-commit component), docs/act3-map.md (ceremonies stage
ON the Model, in the volume), and client/src/ceremony.ts (the existing
hold-to-commit pattern from BECOME — reuse its feel).

What exists. A2.1–A2.3 shipped the full vigil. The Model renders the
cohort's sky with detected sources (client/src/model.ts); emission
history lives per-civ in the CivSeed/truth layer and the knowledge
layer serves only departed light — which is why this stage's commits
can write truth freely: nothing leaks early by construction.

Build:
1. Wire: a choice message (hail target / broadcast / stay dark),
   guarded; server validates the player holds a case or detection on
   the target for a hail. Hail and broadcast write emission truth
   (a directed-beam event toward one target; a broadcast epoch touching
   the civ's emission history) with the clock's now — the knowledge
   layer does the rest for every observer, unchanged.
2. Client: the ceremony, staged on the Model. Hail: press-and-hold
   draws a thread of light from HOME to the one source, committing at
   hold completion. Broadcast: the hold sweeps an expanding shell
   across the actual neighborhood, each source it touches stamped with
   its arrival year, in order of distance. Stay dark: a plain tap that
   returns to the vigil. Releasing early cancels silently — no
   confirmation text anywhere; the rendered consequence IS the
   question.
3. The resistance beat: when the choice fights the civ's dials (a
   Silence-leaning mind ordered to broadcast), surface the objection as
   a one-line dilemma in the mind's archetype voice with the Coherence
   price inline, before the ceremony arms. Forcing through remains
   possible; it wounds Coherence (economy-design.md § Coherence).
   The walkthrough's stay-dark scene (docs/walkthrough.md, Day 1
   evening) is the acceptance test for tone.

Do not build: replies, threads, or any signal content — nothing answers
until A2.5. No push. No new Model features beyond the two ceremony
renders.

Invariants you personally verify: no path exists by which a hail or
broadcast commits without a completed live hold (grep for programmatic
calls to the commit); emission truth writes go through the truth layer
so every observer sees the event only as their light arrives; the
ceremony renders read from the same star/source data the Model already
holds (no new remote facts cross); archetype voice per prose-style §4
for the resistance line, no exclamation marks; strict TS; typecheck and
build green.

First move: propose the choice wire message + emission-truth write
shapes, and storyboard the two holds (hail thread, broadcast sweep) in
a short note against ui-design's ceremony rule. Get a go, then build.

Finish: small commits, feature branch, PR open (not merged); report the
PR link, preview URL if any (dev cohort room only — a committed
broadcast in the live cohort is forever), and this phone checklist:
hold a broadcast far enough to watch the shell sweep three sources with
arrival dates, release early, and confirm nothing happened; then hold a
hail to completion and see the thread in flight on the Model.
```

---

## A2.5 — Traffic, against the AI

```
Build stage A2.5 of Holos: traffic against AI counterparts — the thread
screen, and the sky answers for the first time.

Orient. Read, in order: CLAUDE.md at the repo root (§ Build
orchestration). Then docs/build-a2.md (§ A2.5), docs/act3-design.md
(§ Contact stage 4 — traffic on real clocks; what signals can carry),
docs/ui-design.md (§ Act 3 Signals — threads, in-flight rendering,
physics stamps; the texture is astronomy, never mail),
docs/prose-style.md (§4 archetype voices — every AI reply is written in
its civilization's register; §8 the comms register: signals, tight
beams, traffic, payloads — the words letter and correspondence never
appear), and docs/walkthrough.md (Week 2 — the whisper — is this
stage's acceptance texture).

Format rule, settled (vision.md § Decisions): freeform text is
permitted ONLY in threads with AI-run civilizations. This stage ships
freeform-with-AI; the human-pair composed composer is A2.6. Since no
human ever reads another human's freeform under this rule, moderation
burden in this stage is nil — but enforce the rule server-side: a
freeform payload addressed to a human-held civ is rejected at parse.

What exists. A2.1–A2.4: the vigil, the contest, and committed
hails/broadcasts writing emission truth. The alarm queue delivers
scheduled events; seeded civs carry archetypes, postures, and emission
histories.

Build:
1. Server: threads keyed by (player civ, counterpart civ); signal
   send/deliver through the alarm queue at exactly light-honest times;
   each delivered signal carries its physics (transit years, distance,
   received strength, degradation) computed from the knowledge layer.
2. AI counterparts, rule-based, three registers: a dark whisperer
   (Hearth-class — answers only civs whose emission history shows a
   held dark turn; unhurried; Monument/Cloister voice), a loud builder
   (Lantern-class — hails bright pasts on detection, sings back at any
   broadcast; Beacon/Tide voice), and a Congress-style ready answerer
   (answers most hails after deliberation; plural voice, minutes of a
   meeting). Replies compose archetype voice templates with real state
   (their light-view of the player); light-lag hides the seams. Reply
   latency is physics plus a small in-character deliberation delay.
3. Client: threads in the Voice (one thread per counterpart), each
   received signal wearing its physics stamp as instrument
   measurements above the payload; in-flight signals as motes on
   hairline arcs on the Model with the both-clocks chip (arrives in
   37 min · 7.3 y); sent signals join the thread immediately, marked in
   flight until arrival.

Do not build: the composed-parts composer, dossier payloads, or
human-to-human threads (all A2.6); no push notifications; no read
receipts or presence of any kind — delivery is physics, nothing more.

Invariants you personally verify: a signal is light — no reply ever
arrives faster than round-trip distance allows (test at 6.8 ly: ~34 min
each way at the 5 min/year clock); freeform-to-human rejected
server-side; every AI reply passes the archetype voice check
(prose-style §4 — no homogeneous wit, no exclamation marks, comms
register clean); threads expose nothing about the counterpart beyond
DetectedSource + what it chose to transmit; strict TS; typecheck and
build green.

First move: propose the thread/signal wire shapes and the three
counterpart rule tables (trigger, deliberation, reply template
structure) in one short note. Get a go, then build.

Finish: small commits, feature branch, PR open (not merged); report the
PR link, preview URL if any (dev cohort room only), and this phone
checklist: hail the near dark whisperer; roughly half an hour later a
reply arrives wearing transit years and received strength; hold a
three-exchange conversation across an evening — the walkthrough's
Week 2 texture on a real phone.
```

---

## A2.6 — Human pairs: the composer, dossiers, identity

```
Build stage A2.6 of Holos: human pairs — the composed-signal composer,
tradeable dossiers, and durable identity. This stage ends at A2's fun
gate.

Orient. Read, in order: CLAUDE.md at the repo root (§ Build
orchestration — this stage carries A2's second double-Opus call: the
composed-signal part grammar; run it twice with different framings —
e.g. "expressiveness first" vs "deception and moderation first" — and
synthesize). Then docs/build-a2.md (§ A2.6 and § Done when — the fun
gate is this stage's exit), docs/act3-design.md (§ Contact — what
signals carry), docs/observatory-design.md (§ The dossier — tradeable
in v1, settled: a dossier is a payload block, stale by construction),
docs/vision.md (§ Decisions — signal format: composed for human pairs,
settled), and docs/roadmap.md (§ Open build decisions — durable
identity in Durable Objects' native SQLite storage, decided).

What exists. A2.1–A2.5: the full vigil, the choice ceremony, and
freeform traffic with AI counterparts on real clocks. Called cases
produce dossiers server-side (belief, confidence, evidence chain,
light-ages). Identity is still the A1 per-run token.

Build:
1. The part grammar (the double-Opus deliverable): a composed signal is
   assembled from typed parts — payload blocks (knowledge, culture,
   archive fragment, coordinates, dossier), quantity and reference
   parts, and a small tone set. Expressive enough to carry Week 2's
   texture between strangers; constrained enough that no free text
   ever crosses between humans. The composer UI builds a signal from
   parts in the Voice, one-thumb.
2. Dossier payloads: attach a called case's dossier to a signal; it
   arrives as a readable case summary wearing BOTH its original
   light-ages and the transit aging (stale by construction). Received
   dossiers land in the observatory as foreign findings, marked by
   provenance, never auto-merged into the player's own cases.
3. Durable identity: an accounts table in the Cohort DO's SQLite
   storage; claim flow upgrades the A1 anonymous token to an account;
   second-device sign-in by account token; the old anonymous token is
   rejected after claim. Recovery flows are out of scope.
4. Human-to-human threads: same thread machinery as A2.5, composed
   parts only (server rejects freeform to human-held civs — the rule
   from A2.5, now with real traffic behind it), indistinguishable from
   the AI path at the wire level — no flag, field, or timing artifact
   may reveal whether a counterpart is human.

Do not build: moderation tooling beyond the composed constraint (that
constraint IS the moderation posture), dossier brokering or forgery,
joint cases, missions, push notifications.

Invariants you personally verify: byte-level wire inspection shows
human and AI threads identical in shape and cadence class; no freeform
between humans by construction (parse-level, not UI-level); dossier
payloads carry beliefs and ages, never truth; accounts never leak
across civs (one seat per account per cohort); comms register and
archetype-voice rules hold; strict TS; typecheck and build green.

First move: the double-Opus part-grammar proposal, plus the accounts
schema and claim flow, as one short design note. Get a go, then build.

Finish: small commits, feature branch, PR open (not merged); report the
PR link, preview URL if any (dev cohort room only), and this phone
checklist — A2's fun gate, run on two phones: two humans in one cohort
each flag the other, run a vigil in which a bought question visibly
moves (or regresses) a belief, one hails, and they exchange composed
signals across real light-lag inside an evening — and the exchange is
worth screenshotting. One account works from both devices. If the loop
is not fun, the stage is not done: tune here, because nothing else
builds until this gate passes.
```
