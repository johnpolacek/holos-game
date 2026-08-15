# HOLOS — Build brief: AS (ambient studies)

*The launch brief for the slice that removes the "start a study" gate: every
detected source carries a full study board from the moment it is seen, and
the stored study record materializes lazily on the player's first real act.
Part of the just-in-time `build-*.md` series; [roadmap.md](./roadmap.md) is
the source of sequence and wins on any disagreement.*

---

## Why (the decision, already made)

Opening a study today is free, uncapped, and reversible — the briefing
screen's own comment says there is no transaction to price. Nothing is lost
by opening late: the light archive accrues per source regardless of study
state, and `distributionFor` rebuilds the whole board from that history on
every send. The sky is small (eight seeded civs plus the cohort's seats).
A free, uncapped, reversible act with no cost to deferring is a click, not
a choice; the real decisions — which question, which tripwire, when to
call, when to shelve — all survive this change untouched. And the fiction
prefers it: a mind that detected a source but was not already working up
hypotheses on it would be a bad observatory. The walkthrough's promise is
"he never sees a queue, and he never files anything"; Begin the Watch is
filing.

**The shape: universal board, lazy record.** Every visible source renders
its full board (hypotheses, evidence trail, open questions) with no gate
and no verb. The persisted `StoredStudy` comes into existence on the first
act that needs a record — and `openedYear` / `openedClass` stamp *then*,
keeping the grounded and overtaken exits anchored to a real act of
attention. The Desk keeps listing engaged studies, so the portfolio texture
and the report's scope survive. This is deliberately **not** "auto-open
everything": literally opening a study per detection would stamp the exits
at detection time (studies grounding themselves and announcing overtakings
nobody engaged with) and would turn the Desk into a mirror of the sky.

The storage shape already agrees: absence of a record *is* the ambient
state. **No storage migration** — `StudyState` v4 and `StoredStudy` are
unchanged; an existing player's studies are simply their engaged set.

## Integrating PR #57 (do this first, stage AS0)

[PR #57](https://github.com/johnpolacek/holos-game/pull/57) is merged on
`main` and touches only `client/src/studyboard.ts` (`renderReport`: a
section caption, a waiting line, an empty state). This slice's client work
lives in the picker/brief/desk regions of the same file — disjoint hunks,
so `git merge origin/main` should be clean; resolve by hand if not.

Two things to preserve through this slice:

- `.study-picker-subtitle` is no longer just the picker's class — PR #57
  adopts it as the R-40 section-caption mold on the Report page, and other
  pages use it too. Deleting the picker must not delete the class or its
  style rule.
- The Report's empty state names "studies settle" as a family; that stays
  true (settling requires an engaged study) — no wording change owed.

## Orchestration

Per [CLAUDE.md § Build orchestration](../CLAUDE.md): **Fable orchestrates**
— plan, decompose, synthesize, keep context lean. Reasoning-heavy work to
**Opus**, mechanical work to **Sonnet**. The **high-stakes calls** — run
Opus twice with different framings and synthesize — are:

1. **The wire shape of the universal board.** How an unengaged source's
   board rides the sky payload. Leading options: a `StudySnapshot` for
   every visible source plus an `engaged` marker (keeping `StudyStatus` a
   stored-record vocabulary), versus widening `StudyStatus` with an
   `ambient` value, versus folding the board into `DetectedSource`.
   Framing A: minimize protocol churn and client rework. Framing B: make
   illegal states unrepresentable (an ambient study can never carry a
   call, a grounding, purchases, or tripwires — can the types say so?).
   Constraints either way: `report.ts` input stays engaged-only;
   `isClosed` semantics untouched; payload cost is ~a dozen boards, fine.
2. **The first-act set and stamp semantics.** Which acts materialize the
   record — `buyQuestion`, `armTripwire`, `callStudy`, `shelveStudy` are
   clear; `launchMission` at the source is the judgment call (a probe is
   an act of attention, but missions deliberately do not require studies
   today and their reports already fold into any board as `StudyMove`s).
   Decide what `openedYear` means when stamped at first act (the grounded
   exit's "only the next word closes it" contract), what happens to a
   mission launched *before* materialization whose report lands *after*,
   and what reopening a closed study means now. Framing A: the exits'
   honesty ("a vigil nobody kept cannot end"). Framing B: least surprise
   for the player reading the closed card.
3. **The client IA.** Where ambient boards live (the sky page and source
   card are the natural doors), what the Desk lists, what marks engaged
   rows, where the brief's teaching content goes (natural home: the first
   face of an un-acted board), and what replaces the picker entry point.
   Framing A: fewest screens, the sky is the picker. Framing B: preserve
   the Desk-as-portfolio session texture above all.

Fable — not the subagents — holds the invariants below, verifies them in
every subagent's output, keeps checks green, and commits.

## Decisions (settled — Opus x2 per call, synthesized; do not reopen)

1. **Wire shape: a second array of the same type.** The `sky` payload gains
   `ambient: readonly StudySnapshot[]` — a full board for every visible
   source with no stored record — beside `studies`, whose meaning (engaged,
   stored-record boards) does not change. Engagement is array membership,
   not a flag and not a status value. `StudySnapshot`, `StudyStatus`,
   `StoredStudy`, `isClosed`, and `DetectedSource` are all untouched;
   `report.ts` keeps its engaged-only input by construction. An ambient
   board is assembled by the same `buildStudySnapshot` over a synthetic
   never-persisted record (`bought: []`, `tripwires: []`,
   `openedClass: null`, `openedYear: Infinity` — cannot ground, cannot
   overtake, cannot reach `resolveQuestion`), and its write outputs are
   discarded. The ambient board's `status` is `"open"`: honest at the level
   the field means (nothing has closed this board).
2. **First acts: `buyQuestion`, `launchMission`, `armTripwire`,
   `callStudy`.** The generating rule: materialize on an act the server
   must remember; refuse an act that only takes something away. Shelve
   refuses where no record exists and is not offered on an un-acted board;
   `launchVoyage` never materializes. A standing order's dispatch is a
   delegated launch and materializes exactly as a hand launch does.
   `openedYear` is the home year of the act that took the study up,
   restamped only on explicit reopen; `openedClass` stamps beside it,
   always together. The grounded exit's strictly-after rule is unchanged
   and needs no special case: a probe launched as a first act stamps at
   launch, so its own report grounds the study (the walkthrough's Assay);
   a report already home when the player first acts closes nothing.
   Calling as a first act is allowed and closes in the same write. The
   `openStudy` wire verb SURVIVES as the reopen/resume verb (closed cards
   still need "watch it again"): absent record → materialize open;
   shelved/closed → today's reopen (restamp, clear frozen exits, keep
   `bought`/`tripwires`); already open → **no-op, no write** (today's
   unconditional restamp is a live bug: a stale tab could push the
   grounding horizon past a probe in flight). `OVERTAKEN_LINE`'s "since
   you opened the study" is re-authored: the player took the study up,
   they did not "open" it.
3. **Client IA: the sky is the picker; the Desk is the portfolio.** The
   picker (`renderPicker`) and briefing (`renderBrief`) die; the
   `.study-picker-subtitle` class and rule survive as the R-40 caption
   mold. Doors: map → source card → the study row (always present, idle
   string re-authored); Explore rows reach the same board; the Desk's
   `+ START A STUDY` foot becomes a quiet hub row into Explore ("the rest
   of the sky"). The Desk lists engaged studies only; its caption and
   empty state are re-authored to say what the Desk now is (the sources
   you have put something into). The ambient board face carries the
   brief's relocated starmap at its head, no verb row (no shelve/call
   until materialized), and OPEN QUESTIONS with prices as the call to
   action; the brief's teaching collapses into one one-shot `voice-note`
   (new voice key, AV1 intro pattern). Engagement marks are chrome and
   amber only (`.study-explore-flag` keys on engagement; no cyan; no xxs
   badge). `updateStudyCount` and every `studiesByStarId.has()` site are
   re-audited so "has" keeps meaning engaged. The AV3 `study-brief`
   proposal route keeps its id and retargets to focusing the board
   (`from: "mind"`, the `focusProject` precedent); the proposal's bank
   verb naming the dead brief screen is re-authored (`audit:voice`).
   No pager across the sky: the sweep is Report → Desk → the rest of the
   sky, and the Desk's foot row is the hinge.

## Stages

Each stage is a small, single-purpose PR, and **every merge is shippable**
(`main` auto-deploys). The `openStudy` wire verb is removed only in the
last stage, after no shipped client sends it.

- **AS1 — server: the universal board.** After the design calls settle:
  `assembleSkyState` assembles a snapshot for every visible source,
  synthesizing an unengaged record for sources without one (no write);
  exits, tripwire evaluation, and `studyWrites` run only on materialized
  records; `report.ts` keeps receiving engaged studies only; first-act
  materialization lands in the acting handlers per Decision 2
  (`onBuyQuestion`, `onArmTripwire`, `onCallStudy`, `onLaunchMission`,
  and the standing-order dispatch; shelve refuses), stamping
  `openedYear`/`openedClass` at the act; `onOpenStudy` becomes
  reopen/resume per Decision 2, materializing open on an absent record
  (the shipped client still sends it until AS2 lands). Protocol changes
  in `protocol.ts` only, with guards.
- **AS2 — client: the sky is the picker.** Ambient boards open from the
  sky page and source card; the board's un-acted face absorbs the brief's
  teaching content (hypothesis menu, what the watch can tell apart, what
  it will and will not cost); the Desk lists engaged studies; the
  START A STUDY picker, `renderBrief`, `pendingBeginStarId`, and the
  Begin the Watch verb come out; the AV3 `study-brief` proposal route
  retargets to the ambient board (route id kept); `home.ts` entry points
  audited. New chrome strings obey R-8/R-25/R-40; register per
  prose-style.md §2 (observatory deadpan, wit 0).
- **AS3 — cleanup, bots, docs.** The `openStudy` verb stays on the wire as
  reopen (settled above); AS3 instead retires the client's dead code paths
  and vestigial payload reads; update `scripts/playtest-bot.mjs`
  (`tryOpenStudy` and `studyTarget` become engagement-by-first-act); update
  [observatory-design.md](./observatory-design.md) ("Flagging a source
  opens a study" → universal board / lazy record, and the four-endings
  list), [walkthrough.md](./walkthrough.md)'s vigil-on-Hearth beat,
  [playtest.md](./playtest.md) if the runbook scripts an open, and
  prose-style.md §2 if any new surface appeared. Run `/prose-audit` if any
  bank string was added.

## Invariants (Fable verifies these in every subagent's output)

- **No leak widens.** Ambient boards derive from `ObservedSignal` /
  `lightHistory` and delivered moves only — assembling a board for every
  source must not add a single truth read. An unengaged record has no
  purchases, so `resolveQuestion` (the one gated truth reader) is never
  reached for it.
- **The report's scope is engagement.** `report.ts` never sees an ambient
  board; "which studies said nothing at all" keeps meaning studies the
  player keeps.
- **A called study stays called**; closed studies remain byte-stable; no
  code path compares a frozen call against the live distribution.
- **Exit stamps anchor to acts.** `openedYear`/`openedClass` are written
  at first act (or explicit reopen), never at detection; an ambient source
  can never ground, overtake, or fire a tripwire.
- **Server authority.** Clients send intents; materialization happens
  server-side inside the acting handler, atomically with the act.
- **Protocol discipline.** Wire changes in `protocol.ts` only; parse
  guards updated; a stale client's `openStudy` never crashes a session.
- **Prose law.** R-8 (no em dash on any player surface), pinned vocabulary
  (§8), banned coinages (§6); all seven CI checks green per stage:
  `typecheck`, `build`, `audit:dashes`, `audit:banned`, `audit:voice`,
  `audit:catalog`, `audit:facts`.

## Out of scope

- Any change to question costs, compute income, or pacing constants — the
  economy is untouched; scarcity stays in the spend.
- Joint studies, finding exchange, and everything else parked in
  observatory-design.md § open questions.
- Renaming `.study-picker-subtitle` (it outlives the picker as the caption
  mold; a rename is cosmetic churn across many pages).
- The A5 watch/push machinery — it walks armed tripwires on stored
  studies, which is unchanged by construction.

## Verification

Beyond the CI checks per stage: a solo playtest with bots
(`npm run playtest:bots -- --bots 2`, [playtest.md](./playtest.md))
covering — a fresh civ sees boards on every source with no verb offered;
buying a question on an ambient board materializes it onto the Desk and
the Report; a probe launched at an untouched source folds its report into
that board and (per the AS1 decision) does or does not ground it; shelve,
call, tripwires, and reopen behave as today on engaged studies; a stale
tab from the previous deploy neither crashes nor double-opens anything.
