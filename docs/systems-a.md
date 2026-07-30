# HOLOS — Systems A: the work engine, as built

*The A2.2 systems spec: the light cone, bought questions, probe-class
missions, and the work list.*

> **Provenance — read this first.** The original `systems-a.md` was a
> working document of the A2.2 build session and was **never committed**;
> twenty-seven comments across `server/src` cite it by section number, and
> until now none of them resolved. This file is a **reconstruction from
> the shipped code**, written 2026-07, one slice after that session. Its
> section numbering is recovered from those citations so every existing
> `systems-a.md §N` comment lands where it should.
>
> What that means for its authority: **where this document and the code
> disagree, the code wins.** It records what `knowledge.ts`,
> `questions.ts`, `projects.ts`, `missions.ts`, `tend.ts`, `studies.ts`
> and `cohort.ts` *do*, not what anyone intended — the intent is only
> recoverable where a comment states it, and those statements are quoted
> or paraphrased rather than embroidered. Two companion documents,
> `synthesis.md` and `content.md`, are cited fourteen times each and are
> **also missing**; where the code says a number is "canonical per
> synthesis.md" or "content.md's, superseded", that provenance is recorded
> below as a fact about the citation, not as a claim about a document
> anyone can now read.
>
> **§8, §9 and §10 are unrecovered.** No comment in the tree cites them,
> so nothing is known about what they held. The numbering skips them
> rather than renumbering the sections that survive.

Related: [observatory-design.md](./observatory-design.md) (the vigil's
design spec), [missions-design.md](./missions-design.md) (the mission
framework), [economy-design.md](./economy-design.md) (Compute as the
price of knowing), [roadmap.md](./roadmap.md) § Where the build is today.

---

## §1 The light cone

Three channels now read another civilization's truth — telescopes, bought
answers, mission reports — so the causal ceiling is a **capability token**
rather than a check repeated at each call site.

**`LightCone`** (`knowledge.ts`) carries `observerId`, `targetId`,
`distanceLy`, and `asOfYear = nowYear − lightDelayYears(distanceLy)`. The
only way to obtain one is **`lightConeFor(galaxy, observerId, targetId,
nowYear)`**: there is no constructor taking an arbitrary ceiling, so
holding a cone is proof that a read is causal. A cone is server-side only
and has no wire-facing analogue. Self-observation gives `distanceLy = 0`
— your own home system is the one thing you see in the present tense.

**`peekTruth(galaxy, cone, year)`** is the only truth read outside
`observeCiv`. Above the cone it returns **`null` — never a clamped or
approximated value** (slop: `LIGHT_CONE_EPS = 1e-6`, so a float-adjacent
year at the exact edge does not spuriously read as pending). Callers turn
that null into *pending* / *in flight* / *awaiting light*; none of them
can turn it into a number. Pending states are therefore arithmetic, not
defensive branches.

**`Occupancy`** collapses `CivTruth` into the four tiers every downstream
channel reads, so a question can never disagree with the sky about where
a boundary sits:

| tier | condition | what it is |
| --- | --- | --- |
| `living-quiet` | not ascended, emission < `LEAKAGE_FLOOR` | a biosphere, no machines |
| `living-industrial` | not ascended, emission ≥ `LEAKAGE_FLOOR` | machines running, pre-ascension |
| `working` | ascended, emission ≥ `MADE_HEAT_FLOOR` | ascended and radiating on purpose |
| `banked` | ascended, emission < `MADE_HEAT_FLOOR` | ascended and radiating almost nothing |

The floors are hoisted constants shared with `classify`:
`LEAKAGE_FLOOR = 0.1`, `MADE_HEAT_FLOOR = 0.12` (the latter also
`studies.ts`'s `WORLD_OUTPUT_CEILING`). `DETECTION_FLOOR = 0.015` is
separate: below it nothing is a source at all.

**`banked` is the designed wrong answer.** A shut-down civilization reads
as a cooled remnant to every instrument and to a fist-sized probe alike.
The read is wrong, and it is honest, and it is produced by truth rather
than by a die. `knowledge.ts` names the content gap behind this plainly:
every `DetectedSource` in v1 *is* a civilization, so a naive report-the-
truth question would answer *somebody* every time; at this stage the
honest meaning of "nobody" is nobody answering — `living-quiet` or
`banked`. Adding non-civ sources to galaxy generation is the eventual
fix, and nothing here changes when it lands, because every question and
report reads `Occupancy`, never `PlacedCiv`.

---

## §2 Bought questions

### §2.1 What a question is

**Physics first.** Photons already at home are a free archive; thinking
about them is not. A bought question buys **no new light** — it buys a
deeper read of light already in hand. That is why the currency is
Compute, why the answer is dated, and why the no-leak story is four
lines: `resolveQuestion` asks `peekTruth` for the year the inference
lands on and gets `null` until the cone admits it.

The answer's target year is **`answersYear − cone.distanceLy`** — the
inference completes at home in `answersYear`, and what it can speak to is
the light that had arrived by then.

**No RNG anywhere in the module.** Findings are keyed by `Occupancy`, not
by signal class: the same physical truth reads the same way whichever
instrument asked.

### §2.2 The catalog

All six are **Investment** class (`QUESTION_COST_CLASS`). Costs are in
compute; integration is in game years. Integration years are systems-a's
original numbers, canonical over content.md's 15–60y figures. Costs were
**retuned 2026-07 (the scarcity pass)**: the originals (60/45/75/40/90/55)
tripled, so a full attention pool covers a few questions rather than every
menu at once — see §2.2b. The cost/clock inverse the originals encoded
(patience cheap, haste dear: a long-baseline question waits and thinks
little; a fast question brute-forces light in hand) is preserved exactly.

| id | label | cost | integration | applies to |
| --- | --- | ---: | ---: | --- |
| `weigh-it` | WEIGH IT | 180 | 12 | infrared-excess, transit-shadows |
| `temperature-over-time` | TAKE ITS TEMPERATURE | 135 | 24 | infrared-excess, transit-shadows, broadcast-leakage, directed-beam |
| `read-its-lines` | READ ITS LINES | 225 | 8 | infrared-excess, transit-shadows, broadcast-leakage, biosignature |
| `time-its-shadows` | TIME ITS SHADOWS | 120 | 18 | transit-shadows, biosignature |
| `catch-its-edges` | CATCH ITS EDGES | 270 | 6 | infrared-excess, transit-shadows, biosignature, directed-beam |
| `listen-off-axis` | LISTEN OFF-AXIS | 165 | 10 | broadcast-leakage, directed-beam |

`appliesTo` is physics, not balance: you cannot time shadows that are not
there.

### §2.2b The attention ceiling (added 2026-07, the scarcity pass)

Not part of the original A2.2 build — added one slice later, when play
showed the economy's one leak: income is a rate per **game** year, the
clock runs 288 game years per real day, and an unbounded pool therefore
handed any returning player more compute than the whole question catalog
costs. No spend was a choice. The fix enforces what projects.ts's header
had claimed all along ("not a bank"):

- **Uncommitted compute saturates at `ATTENTION_YEARS × ratePerYearAt` —
  the attention ceiling** (`attentionCapAt`, projects.ts). Attention is
  capacity, not wealth; capacity idle yesterday buys nothing today.
  Spending opens headroom that refills at the income rate.
- **`ATTENTION_YEARS = 110` is the floor that keeps the project ladder
  playable**: the binding rung is the sky vault (2200) straight after the
  first two income projects (rate 20/y) — every catalog entry stays
  reachable from the poorest start, in any legal order, and lowering the
  constant below 110 dead-ends one.
- **A fresh civ wakes with its attention full** (`newProjectState`): the
  opening allocation is the ceiling itself, replacing the old flat 240.
- **Accrual is still closed-form, never ticked.** `ProjectState` v3 adds
  `freeAnchor` (the free total at the last commit); `freeComputeAt`
  integrates forward from it piecewise, the pieces being the years the
  income rate changes. v2 states migrate with a null anchor and read as
  `min(cap, v2 total)` until their first spend anchors them.
- **The wire carries the ceiling** (`ComputeBudget.cap`) and the budget
  line reads `N OF M COMPUTE UNCOMMITTED · +R/Y`, so a full pool reads as
  full rather than as a balance still growing.

Question costs (×3, §2.2) and mission costs (§3.2) were retuned in the
same pass, sized against the ceiling: a full base pool (660 at rate 6/y)
covers two or three questions or most of one starter project, and refills
one cheap question in roughly 100 real minutes.

**The resulting menus** — the curated per-class offer order, deliberately
*not* catalog order, so each class reads as a real sequence:

| signal class | menu, in order |
| --- | --- |
| infrared-excess | weigh-it, temperature-over-time, read-its-lines, catch-its-edges |
| transit-shadows | time-its-shadows, weigh-it, read-its-lines, catch-its-edges, temperature-over-time |
| broadcast-leakage | listen-off-axis, read-its-lines, temperature-over-time |
| biosignature | read-its-lines, catch-its-edges, time-its-shadows |
| directed-beam | listen-off-axis, catch-its-edges, temperature-over-time |

### §2.3 Effects, and when they freeze

A question bought at year *B* answers on the discount and haste granted
by projects **landed by *B*** — never retroactively. Because a project's
landing year is an immutable historical fact once stored, re-deriving
"what was landed by *B*" years later reproduces the identical number
forever; nothing needs freezing in storage beyond `boughtYear` itself.

`effectiveCostFor` / `effectiveIntegrationYearsFor` take `atYear`
explicitly, so one helper serves both the live *offered* preview
(`atYear = nowYear`) and the frozen *pending* / *answered* reading
(`atYear = boughtYear`).

Aggregation lives in `projects.ts` and stays pure: matching effects stack
**multiplicatively** as keep-fractions, unfloored. The **25%-of-base
floor** (`EFFECT_KEEP_FLOOR = 0.25`) is applied once, in `questions.ts`,
where the fraction is actually spent. Cost rounds to whole compute;
integration years round to one decimal.

`answersYearFor(def, bought, projectState) = boughtYear +
effectiveIntegrationYearsFor(def, boughtYear, …)` is the single source
both `resolveQuestion` and the `OpenQuestion` wire snapshot read, so the
two can never disagree about when a finding lands.

### §2.4 The finding tables

Every question is total over `Occupancy`. **Plateau is an instrument
limit, not a die roll** — the measurement is impossible at this range or
baseline, decided by a pure function of the signal in hand.

**Plateau gates:**

| question | gate | slug |
| --- | --- | --- |
| weigh-it | `confidence < 0.35` | `no-clean-solution` |
| temperature-over-time | `lightHistory.length < 2` | `no-baseline` |
| read-its-lines | `emissionLevel < 0.03` | `too-few-photons` |
| time-its-shadows | `confidence < 0.3` | `no-timing-survives` |
| catch-its-edges | `confidence < 0.35` | `no-clean-polarization` |
| listen-off-axis | occupancy `banked` or `living-quiet` | `nothing-on-axis` |

`listen-off-axis` is the one physical rather than instrumental plateau:
nothing is on-axis, so there are no sidelobes to catch. (`living-quiet`
is outside the original table — such a world classifies as biosignature,
which never offers this question — but `Finding` must be total, and for
this instrument a biosphere with no machines is the same physical case.)

**Sharpen rows**, as `occupancy → slug { role multipliers }`:

*weigh-it* — working: `too-little-mass-for-the-heat` {built 3.0, mundane
0.3, quiet 0.55} · banked: `mass-and-heat-agree-on-cold` {quiet 1.8,
mundane 1.3, built 0.55} · living-*: `planetary-mass` {mundane 1.8, open
1.8, built 0.55}.

*temperature-over-time* — working: `held-against-the-curve` {built 3.0,
quiet 0.3, mundane 0.55} · banked **and `ladders.integration ≥ 3`**:
`too-steady-for-its-age` {built 1.3, quiet 0.8} · banked otherwise:
`cooling-on-schedule` {quiet 3.0, built 0.3} · living-*:
`a-worlds-thermostat` {mundane 1.8, built 0.8}.

*read-its-lines* — living-quiet: `biosignature-gases-only` {mundane 3.0,
open 1.8, built 0.3} · living-industrial: `industrial-chemistry` {built
3.0, mundane 0.55, quiet 0.55} · working: `lines-of-worked-material`
{built 3.0, mundane 0.3, quiet 0.55} · banked: `lines-of-rock-and-dust`
{quiet 1.8, mundane 1.3, built 0.55}.

*time-its-shadows* — working: `shadows-that-do-not-keep-time` {built 3.0,
mundane 0.3, quiet 0.55} · banked: `clockwork-and-a-wide-belt` {quiet
1.8, mundane 1.3, built 0.55} · living-*: `clockwork` {mundane 3.0, built
0.3}.

*catch-its-edges* — working: `flat-faces-in-ranks` {built 3.0, mundane
0.3, quiet 0.55} · banked **and `ladders.energy ≥ 3`**:
`flatter-than-rubble` {built 1.3, quiet 0.8} · banked otherwise:
`rock-and-regolith` {quiet 1.8, mundane 1.3, built 0.55} · living-*:
`an-atmosphere-and-a-sea` {mundane 1.8, open 1.8, built 0.55}.

*listen-off-axis* — living-industrial: `spill-in-every-direction`
{mundane 3.0, built 0.3} · working **and `ladders.integration ≥ 3`**:
`aimed-past-us` {quiet 1.8, built 1.3, mundane 0.55} · working otherwise:
`structure-in-the-spill` {built 3.0, mundane 0.3}.

The three ladder-gated rows are the whole of the target's *character*
entering an answer: a well-integrated banked civ holds one temperature
too exactly, a high-energy banked civ leaves surfaces flatter than rubble
should be, and a well-integrated working civ is aiming past you at
somebody else.

`possibleShiftsFor(id)` enumerates every shift a question's findings can
produce across all branches (plateau's `{}` excluded). `studies.ts`
unions `movedFromShift` over that list to compute a question's
`separates` **before** any purchase has picked a branch — class-shaped,
never source-shaped, so the offer leaks nothing.

### §2.5 `StudyMove` — the seam, and how the board moves

A delivered inference reaches a study as a **`StudyMove`**: `{id, kind:
"answer" | "report", asOfYear, annotation, shift}`. Bought answers
(`questions.ts`'s `Finding`) and mission reports (`missions.ts`'s
shift-bearing internal producer) both arrive in this shape, and
`studies.ts` **cannot tell them apart and does not need to** — see §11.
A plateau contributes no move at all.

**The board math** (`distributionFor`): the light history yields four
coarse channels — `excess` (how far the latest output sits above what a
world makes on its own), `rise`, `fall`, and `steady = (1−excess)(1−rise)
(1−fall)` — which weight the menu's four evidence roles:

| role | weight |
| --- | --- |
| mundane | `0.3 + 1.2 · steady` |
| built | `0.15 + 1.35 · clamp01(0.65·excess + 0.5·rise)` |
| quiet | `0.15 + 1.35 · fall` |
| open | `0.35` (a standing alternative, kept live regardless) |

**The evidence picks the leader; the confidence only decides how sharp
the picture is.** `signal.confidence` is mostly a function of distance,
so it is applied as a *temperature*: an exponent ramped from
`SHARPNESS_FLAT = 0.6` to `SHARPNESS_PEAKED = 2.4` across the confidence
range 0.2–0.95. A clean read brings the board to a point; a marginal one
flattens it toward an even spread.

Moves fold in **multiplicatively, before sharpening** — order-independent,
which matters because the move list is rebuilt from scratch on every sky
send. `settleShares` then normalizes into `[SHARE_FLOOR = 0.02,
SHARE_CEIL = 0.9]`, clamping and redistributing the drift proportionally
to the room each share has left, up to eight passes.

**Hence the structural honesty rule: no answer and no probe report can
push any share past 0.9. Watching never delivers certainty.**

The headline (`annotationFor`) names a leader only when it clears
`STUDY_LEAD_THRESHOLD = 0.45` **and** stands `STUDY_LEAD_MARGIN = 0.1`
clear of the runner-up; otherwise the board keeps `WATCH_LINE` — *"No
hypothesis exceeds the threshold. Continue the watch."*

**Evidence order** is deterministic: `asOfYear` ascending, arrivals
before moves at the same year, then id; renumbered 1..n with `latest` on
the last. The trail is a story and reads forward.

**Menu invariant** (`studies.ts`, above `MENUS`): every class's menu has
**pairwise-distinct roles**. That is what makes a per-role multiplier
equivalent to a per-hypothesis one, and it is why a finding needs no
hypothesis-id vocabulary of its own. A menu that ever gives one class two
`mundane` entries would silently make every question asked on it coarser.

### §2.6 The grounded exit (A2.2b)

Added after the rest of this document, when the observatory's closing
verb finally closed something.

A study **grounds** when a mission report reaches home *strictly after*
the study was last opened. `StoredStudy.openedYear` is stamped on every
open and every reopen, and that comparison is the whole design:

- The report that closed a study can never close it again, so reopening
  is a real act rather than a button that undoes itself on the next sky.
- One rule covers the first open too. A probe that reported *before* the
  study existed still appears in the evidence trail and still moves the
  board — it just does not close a vigil the player only now decided to
  keep.

The decision lives in **cohort.ts, not studies.ts**: that module still
cannot tell an answer from a report (§11.3), and the place that knows a
move came from a probe is the place that built it from missions.ts. It
is a **persisted transition**, not a derivation — derived grounding would
re-close the study the instant it was reopened, because the report never
goes away.

`StudyMove` gained `arrivedYear` for this: the home-side twin of
`asOfYear` (an answer's integration completing, a report's light
landing). Both it and `openedYear` are home years; `asOfYear` is a year
at the target, and comparing across those axes would be a category error.

A grounded study is closed: the server refuses a question bought on any
study that is not open (which also closed the same hole for shelved
studies), and the board renders the menu inert rather than offering a tap
that would error. Its annotation names the probe and its provenance,
because a report is not fresher than the light, only nearer:
*"The Assay closed this study: construction under way, something is
being built there. The finding came back from the ground. It is no newer
than the light, only nearer."*

`StudyStatus` is therefore `open | shelved | grounded`, and A2.3
(shipped 2026-07) added `called` and `overtaken`, both inheriting
grounded's closed-state and reopen rules rather than inventing their
own. See §2.7 and §2.8.

### §2.7 The contest (A2.3, as built)

The stage's double-Opus design call (observatory-design § Open
questions: honest Bayes vs authored curves) was run and synthesized;
the authored-curves core won on contest semantics. Sharpen is the
observer winning, plateau is stalemate, regress is the target's spend
outpacing the observer's instruments: confidence retreats.

- **Mask upkeep is an archetype rule, not an economy** (`contest.ts`):
  a pure function of the seed and a year, no state, no RNG.
  `darkTurnYear` is the first emission epoch at or after ascension
  below `MADE_HEAT_FLOOR` (the mask's onset is the same year the sky
  sees the character change); `maskTierAt` is the monotone staircase
  `floor((year - darkTurn) / cadenceYears)`, frozen by `lapseYears`
  where the archetype's discipline ends. The table: cloister 60,
  sowing 90, phoenix 120 (lapses at 1200), shepherd 150, monument 180,
  engine 240; beacon, tide, herald and congress never pay. A bright
  posture, an unascended civ, and a `pays: false` archetype are three
  independent gates, so *a young Beacon never does* is true three
  times over.
- **The relevant window is the player's own pacing**: `(T_prev, T_now]`
  in target years between this answer and the most recent previous
  look on the same study, both endpoints frozen at purchase (§2.3's
  effects-freeze). The first question on a study has no window and can
  never regress. Mission reports are not looks.
- **The instrument tier is what the observer can absorb**:
  `(lift >= 0.05) + (lift >= 0.15) + min(2, floor(priorAnswers / 2))`,
  with `lift` the confidence-lift landed by the purchase year. Rungs
  gained beyond the tier regress the study; at or under it, the mask
  holds and the answer is a cause-neutral plateau. Nothing new is
  priced; the arms race runs entirely through the existing question
  and project catalogs.
- **Regression is temperature, never a repaint**: a regressing answer
  contributes a `StudyMove` with an empty shift and `regress: true`,
  and `distributionFor` folds the count into the sharpness exponent
  (`SHARPNESS_MIN = 0.3`, `REGRESS_KEEP = 0.55`). Order is preserved
  and every share contracts strictly toward the even split; repeated
  regressions asymptote and never reach flat, the mirror of
  `SHARE_CEIL`'s *watching never delivers certainty*. Regression
  enters shares only through `settleShares`.
- **The tell** is one banked wit-0 sentence on the wire
  (`StudySnapshot.contestLine`): *"Nature does not get better at
  hiding; something there is working against the look."* The evidence
  trail's regressed row states only the observation (*"The later look
  separates less than the earlier one..."*); cause lives in the tell.
  A masked plateau (*"...consistent with every reading and decisive
  about none."*) is indistinguishable on the surface from an
  instrument-limit plateau, deliberately.
- **No-leak**: `MaskRule`, `maskTierAt`, `ContestShape` and the tier
  never cross the wire; `possibleShiftsFor` is unchanged, so the offer
  menu cannot betray that a target masks.

Invariant, mechanically verified: a never-masking target (bright
archetype or dark non-payer) can plateau but never regress, at any
window, any tier, any year.

### §2.8 Tripwires and the closing exits (A2.3, as built)

**Tripwires** are standing orders, not oracles: three kinds
(`regress`, `leakage-stops`, `crosses` at the fixed
`CROSS_SHARE = 0.7`), at most one arming per kind per study, free to
arm. One predicate (`tripwireHolds`) serves both halves of the
contract: the server refuses to arm a condition that already holds,
and the sky-send fires an armed one as a persisted transition (the
grounded exit's write-back, generalized to `studyWrites`), once per
arming. No wake-queue entries: firing is in-app on next open. A closed
study is never evaluated, which is how *called stays called* survives
a standing order left on it.

**Called** freezes the leading belief at the call (`StoredCall`: id,
label, gloss, share, the call year and the light-age it rests on) and
closes the study from `open` or `shelved`. No code path compares the
frozen call against the live distribution: later light accrues to the
archive silently, nothing warns, nothing penalizes, nothing reopens.
Reopening is the player's own act (`openStudy`), which clears the call
and restamps `openedYear` and `openedClass`.

**Overtaken** is the source's own change of state: the sky's
`classification` differing from the `openedClass` stamped at open.
The transition freezes the lead it closed on (`StoredOvertaking`).
Grounded wins ties (a probe was there; the sky only changed its mind).
Migrated studies carry `openedClass: null` and are back-filled to the
current class on the next sky-send, so no legacy study spuriously
overtakes. The detection-floor drop is not a trigger: unreachable in
v1, since dark emission levels sit above the floor.

Persistence: `StudyState` v3 to v4 (`openedClass`, `called`,
`overtaken`, `tripwires` on every stored study).

---

## §3 Probe-class missions

### §3.1 The clock, derived from 0.1c

A probe at `PROBE_C_FRACTION = 0.1` launched at year *L* toward a target
*d* light-years away:

| date | formula | meaning |
| --- | --- | --- |
| horizon | `L + (f−1)·d` | last year a beamed amendment could still overtake it |
| arrival | `L + f·d` | it is there |
| first word | `L + (f+1)·d` | earliest year home can hear anything |

…where `f = flightYearsPerLy`, **frozen on the mission at launch** (10 at
the canonical speed, 8 with the launch beam landed). A probe-haste
project landed later must never retroactively speed up a mission already
under way. **Nothing is stored but `{launchedYear, distanceLy,
flightYearsPerLy}`** — every date is arithmetic on those three stamps
plus catalog constants.

**The Assay is not fresher, only sharper.** A report emitted at the
target in year *E* arrives home at *E+d* — exactly the year the telescope
is already showing.

### §3.2 The two kinds

Both are **Ambient** class — under the income line, no saving up, no
ceremony. `costCompute` was retuned 2026-07 with the scarcity pass
(§2.2b): systems-a's canonical 24/40 scaled with the question retune
(×3, rounded) so the Assay stays cheaper than any question — its real
price is the decades of flight — without undercutting the whole menu;
content.md's 20/32 flagged the price point only and is superseded twice
over.

| kind | label | cost | cadence |
| --- | --- | ---: | --- |
| `assay` | THE ASSAY | 75 | none — one word |
| `sentinel` | THE SENTINEL | 120 | `SENTINEL_CADENCE_YEARS = 25` |

### §3.3 Charters

Two to three clauses (`MIN_CHARTER_CLAUSES = 2`, `MAX = 3`), at most one
per exclusivity group, written at launch and **never patchable again**.

| clause | group | applies to |
| --- | --- | --- |
| `hold-at-range` | on-occupied | both |
| `close-regardless` | on-occupied | both |
| `keep-station` | station | both |
| `one-look-and-done` | station | sentinel only |
| `go-dark-if-answered` | signal-plan | both |
| `report-on-cadence` | signal-plan | both |

`validateCharter` enforces length, known ids, kind-applicability, no
repeated group, and no duplicate ids; it returns the narrowed id list or
`null` (handler answers `bad-charter`).

**Resolution** (`resolvePlan`) is deterministic, in fixed group order —
on-occupied, then station, then signal-plan — against occupancy at
arrival, producing `ResolvedPlan {emits, standing, closeLook}`:

- Defaults: `emits = true`, `standing = (kind === "sentinel")`,
  `closeLook = true`.
- `hold-at-range`: on `living-industrial` or `working` → `closeLook =
  false`, `standing = true`.
- `close-regardless`: the explicit form of the default; no effect.
- `keep-station`: on `living-quiet` or `banked` → `standing = true`.
- `one-look-and-done`: `standing = false`.
- `go-dark-if-answered`: on `working` → `emits = false`.
- `report-on-cadence`: the explicit form of the baseline; no effect.

The doctrine that reads as care is the doctrine that produces silence:
a probe chartered to go dark on a transmitting world goes dark at exactly
the earliest-confirmation year, and home cannot tell that story from the
other one.

### §3.4 Silence — two schedules, one subtraction

Dice-free, by construction:

- **`expectedArrivals`** — what home was *promised*: from the launch
  record and the mission **kind alone**. Pure arithmetic; takes no galaxy,
  no cone, no truth, and is **not gated by the charter**, because by the
  horizon rule home cannot know whether a contingency fired.
- **`actualEmissions`** — what the far side *actually* sent: charter ×
  truth-at-arrival, taking the already-resolved plan rather than reading
  truth itself. Emission years, not arrival years.

A mission reads **silent** when some promised arrival's grace window has
closed (`SILENCE_GRACE_YEARS = 2`) and no actual arrival matches it —
*matches* meaning **within `EPS`**, not exact equality. The two schedules
are the same arithmetic associated differently (`launched + f·d + k·c +
d` against `launched + (f+1)·d + k·c`); they agree exactly for the first
two cadences and diverge in the last bits thereafter, so an exact match
test marked every long-standing Sentinel permanently silent (fixed
2026-07, A2.2b). `missionDocketState` returns the **first** unkept
promise, which is the one date a silence has.

The player wrote the charter that causes a real silence, which is the
whole point: it carries information without the game ever stating it.

### §3.5 The report — a shape that cannot leak

Reports carry **prose and dates only** — no level, no ladder, no
ascension flag. A number would invite a future caller to fill it from a
year the sentence-picker would have refused.

`deriveReportCores` reads truth exclusively through `peekTruth`, and the
loop bound *is* the light-cone discipline: candidate emission years are
filtered to those already home (`e + distanceLy ≤ nowYear`), so every
surviving `peekTruth` is non-null by construction. Occupancy is re-read
at **each** emission year, so a sentinel watching a civ that changes
mid-watch reports the change.

**First report — the close-look table:**

| occupancy | headline | shift |
| --- | --- | --- |
| living-quiet | A LIVING WORLD, NO WORKS | mundane 6, open 3, built 0.2, quiet 0.3 |
| living-industrial | A LIVING WORLD, BUILDING | built 6, mundane 0.5, quiet 0.2, open 0.5 |
| working | OCCUPIED AND WORKING | built 8, mundane 0.15, quiet 0.15, open 0.3 |
| banked | COLD AND STILL | quiet 6, mundane 2, built 0.15, open 0.5 |

A banked target with `ladders.integration ≥ 3` earns one extra sentence:
*"Nothing is radiating. That is not the same as nothing being there."*

**Held at range — the coarser long-look pair**, authored only for the two
occupancies `hold-at-range` can fire on:

| occupancy | headline | shift |
| --- | --- | --- |
| working | OCCUPIED, HOLDING AT RANGE | built 3, mundane 0.4, quiet 0.4 |
| living-industrial | INHABITED, HOLDING AT RANGE | built 3, mundane 0.5, quiet 0.4 |

A `banked` or `living-quiet` target always reads the close-look table
regardless of `closeLook`: standing off changes nothing about what a
cold, quiet body has to show.

**Later reports** cycle deterministically by ordinal over `NOTHING NEW TO
REPORT` → `TREND CONTINUES` → `POWER MARGIN FAILING`, keeping the
close-look shift for that year. If occupancy changed since the previous
report, the template is `OFF-CADENCE REPORT` instead, wherever the cycle
sat. The ordinary case is the common one.

`MAX_REPORTS_ON_WIRE = 8`; older reports are dropped from the wire, newest
kept.

### §3.6 work state

`WorkState = watching | in-hand | in-flight | beyond-horizon |
awaiting-light | returned | silent | standing`, decided in order:

1. `nowYear < horizon` → **in-flight**
2. `nowYear < arrival` → **beyond-horizon**
3. `nowYear < firstWord` → **awaiting-light**
4. any expected arrival past its grace window with no matching actual →
   **silent**
5. reports exist → **standing** if `plan.standing`, else **returned**
6. otherwise → **awaiting-light**

`in-hand` and `watching` never apply to a mission — they are the states
of a project or question in hand, and of a study only accruing light;
`missionSpan`'s branches for them are defensive only.

### §3.7 The mission wire snapshot

`toMissionSnapshot` is the only producer of a `MissionSnapshot` — the
`toWireSource` of missions. It derives from `StoredMission` + a
`LightCone`, **never from a currently-visible `DetectedSource`**, so a
probe sent to a civ that has since dropped below the detection floor
keeps reporting: the target civ id was stored at launch, and the reports
still stop at `cone.asOfYear`. `targetCivId` is dropped on the wire, the
same drop `toWireSource` makes for `observerId`/`targetId`. `reports` is
the only truth-derived member.

---

## §4 The work list (TEND)

**Named TEND on screen** (renamed from *the Docket*, 2026-07). The old
name was the last survivor of a legal vocabulary the game had already
dropped once, when `case` became `study`; TEND is a verb, and it names
the second standing chip on the sky — `+ Start` begins something, `Tend`
checks on what is already going. In code the module is `tend.ts` with
`TendRow`, and the per-row state is `WorkState`, which describes the work
rather than the surface.

**One derived list.** `buildTendList` stores nothing: it is assembled per
sky send from the three state records that already exist (studies,
projects, missions) plus nothing new. Every date on a row derives from a
purchase-time stamp plus catalog constants — never a stored date of its
own.

**The no-backlog rule.** Available projects and offered questions are not
undertakings — nothing has been committed to, so they are not rows.
Answered questions leave the work list too: they have become evidence on
the study, which is where the player reads them. **There is nothing to
groom.**

**Every open study is a row** (changed 2026-07, with the TEND rename).
The rule was once "a study row appears only if it has at least one
child", which kept idle vigils off the list; TEND is where a player
checks on all three kinds of work at once, so a study with nothing bought
on it still appears — in the `watching` state, with no date and no track,
which is the honest rendering of a vigil that is only accruing light.
Closed studies stay off: grounded is finished and shelved is put down,
and both live on the study board.

**Parenting is by star, one level deep.** A question or mission row's
`parentId` is `study/${starId}` exactly when an **open** (not shelved)
study exists on that star; otherwise null, and a mission launched with no
study open is a top-level row.

**Rows and their one date:**

| kind | which rows exist | `nextYear` / `nextLabel` |
| --- | --- | --- |
| project | started only (running or landed) | `landedYear` / LANDS, or none once standing |
| question | pending only | `answersYear` / ANSWERS |
| mission | always, whatever the state | see below |
| study | only with ≥1 child | mirrors the earliest child's |

Mission dates by state: in-flight and beyond-horizon → `arrivalYear` /
**ARRIVES**; awaiting-light → `firstWordYear` / **FIRST WORD**; standing
→ `nextWordYear` / **NEXT WORD**; returned and silent → none.

**The span** (A2.2b). A row also carries `fromYear` and `markYear` — the
other end of the wait, and any physics event inside it — so the client
can draw a track without reaching into three other collections by id:

| state | `fromYear` | `markYear` |
| --- | --- | --- |
| project running | `startedYear` | — |
| question pending | `boughtYear` | — |
| mission in-flight / beyond-horizon | `launchedYear` | `horizonYear` |
| mission awaiting-light | `launchedYear` | `horizonYear` (behind the tip; the amendment window is closed, and saying so is the point) |
| mission standing | `nextWordYear − 25` | — |
| mission silent | `launchedYear` | `missedWordYear` |
| study | mirrors the soonest child, span included | mirrors |

**Two rails, two meanings** (2026-07). A rail on a question, mission or
project row measures **time**: `fromYear` → `nextYear ?? markYear`,
crossed by a fill with a travelling tip. A rail on a **study** row
measures **belief** — the leading hypothesis's share, in the study
sheet's own gold rather than the live amber — because a vigil has no end
date to run toward: light keeps arriving for as long as you keep
watching. Everything that actually ends is a child row under it. A landed
project keeps a full, unlit rail: finished reads better than absent.

A standing sentinel's span is **one cadence**, not the decades since
launch — the wait that is actually running is the wait for the next word,
and a launch-anchored track would sit at 99% forever. A silent mission
has no end to run toward, so the client ends the rail at *now*: the fill
stops at `markYear` and the gap after it is the silence, widening every
year nothing comes. Returned and landed rows get no track: nothing is
under way, and an empty rail invites a reading that is not there.

**Sort:** group by `parentId ?? id`; a group's key is the minimum
non-null `nextYear` within it (`+∞` when all null), tiebroken by group id;
within a group the parent comes first, then children by `nextYear` then
id. Deterministic payload, soonest-thing-first reading order.

---

## §5 The wire and the handlers

### §5.1 Client messages

`buyQuestion {starId, questionId}` and `launchMission {starId, kind,
charter[]}` join the pre-existing `openStudy` / `shelveStudy` /
`startProject`, guarded on parse in the existing pattern.

### §5.2 What a sky send carries

`sky` gained `missions`, `work list`, and `probeFlightYearsPerLy` (the
*current* effective speed, so the launch sheet can preview a clock before
committing), alongside A2.1's `studies` and the compute `budget`.

Assembly order in `sendSky` matters in one place: a **confidence-lift**
pass runs over every source's signal **before** it feeds
studies/questions/wire. Landed `confidence-lift` projects raise the floor
under `confidenceFor`'s output, never the value, still clamped to ≤ 0.95.
This is the one call site.

Studies are joined against currently-visible sources: a stored study
whose source is not visible right now is simply omitted — the
forward-safe default for A2.3's *overtaken*. Payload order is sorted by
`starId` (studies) and `id` (missions).

### §5.3 Catalogs on `welcome`

`menus` (the hypothesis menus) and `missionCatalog` (kinds, clauses, and
the 2/3 clause bounds) ship once on welcome, so no catalog lives in the
client bundle — the `archetypeName` precedent.

### §5.4 Handler contracts

Handlers **validate, mutate, persist, and re-send the sky**. No
derivation lives in a handler.

**`buyQuestion`** requires: a placed connection; a **visible source** (so
the class is known); that any existing study on that star is **not
grounded**; a known question that `appliesTo` the source's class and has
not already been bought; and
`freeCompute ≥ effectiveCostFor(def, nowYear, …)`. It does **not** require
an open study — the spend is the statement of intent: buying on a star
with no study opens one, and buying on a shelved study reopens it, in both
cases stamping `openedYear` exactly as `openStudy` would (an already-open
study keeps its `openedYear`). Grounded alone still refuses, because
reopening a grounded study restamps what the grounded exit measures
against and must stay a deliberate act. The handler then appends the
`BoughtQuestion {id, boughtYear: nowYear}`, commits the cost against the
one allocation, and pushes a wake for `answersYear`.

**`launchMission`** requires: a placed connection; a visible source; a
known kind; a charter that survives `validateCharter`; **no live mission
of the same kind on that star** (in-flight, beyond-horizon,
awaiting-light or standing all count as live); fewer than
`MAX_MISSIONS_PER_TOKEN = 24` missions on the token; and enough free
compute. It freezes `distanceLy`, `targetCivId` and the effective
`flightYearsPerLy` into the launch record, commits the cost, and pushes a
wake for `missionFirstWordYear`. **The charter is written now and is
never patchable again.**

**`openStudy`** re-opens by *spreading* the existing record rather than
writing a fresh one — a shelved study's `bought[]` must survive a reopen,
or every purchase on it would be discarded.

Error codes in this layer: `not-placed`, `bad-message`,
`unknown-question`, `question-unavailable`, `unknown-mission-kind`,
`bad-charter`, `mission-unavailable`, `unknown-project`,
`already-running`, `insufficient-compute`.

---

## §6 Persistence

### §6.1 Keys and migrations

Per token: `studies:${token}`, `projects:${token}`, `missions:${token}`,
`run:${token}`. The module that derives from a stored shape **owns its
migration**, and a migration persists once on read:

- `StudyState` v1 → v2: every study gains an empty `bought[]`
  (`migrateStudyState`).
- `ProjectState` v1 → v2: the instrument-hours → compute rename, purely
  nominal — same numbers, same rates, same clock.
- `MissionState` v1: identity; the seam exists for a future bump.

A run placed before A2.2 has no mission or project state: it is lazily
created and persisted once, so the opening-allocation clock does not
restart on every read.

### §6.2 The launch record

```
StoredMission {
  id, kind, starId, targetCivId,
  launchedYear, distanceLy, flightYearsPerLy,
  charter[]
}
```

`distanceLy` and `flightYearsPerLy` are **frozen at launch**: every date
derives from them, and neither a later galaxy change nor a later-landed
probe-haste project may move a mission already under way. `targetCivId`
is stored rather than re-resolved from `starId` for the same reason — the
probe was sent to whoever was there when it left. The record never
crosses the wire.

---

## §7 Alarms

**Alarms are wake-ups only, never truth.** The only thing a due `wake`
does is re-send the sky to every currently-live placed connection for its
token. Every number in that sky is derived from the clock at read time,
so a sleeping DO or a wiped queue never desyncs anything — it delays a
push the client would compute correctly itself on its next `requestSky`.
**Losing the queue costs a push, never a fact.**

- Event ids are `wake/${token}/${key}`, so a re-push for the same
  purchase or launch is idempotent at the same id.
- The queue is bounded at `MAX_PENDING_EVENTS = 256`, dropping the
  farthest-future entry first; the alarm is armed for the earliest
  pending year.
- Handlers push through `pushWakeEvent` (read-modify-write); `onAlarm`
  appends to its own in-memory copy instead, so the two writes to
  `events` in one alarm turn cannot race.
- **The liveness rule:** a due wake re-arms a follow-up (a sentinel's next
  word) **only if at least one placed connection for that token is
  currently live**. An absent player's sentinel must not re-arm forever.
- The fired log keeps the last 100 entries.

---

## §8–§10 — unrecovered

No comment in the shipped tree cites these sections, so their content is
unknown. The numbering is preserved rather than closed up, so every
existing citation in `server/src` still resolves to the section it meant.

---

## §11 The invariants

The cross-cutting rules the A2.2 code holds, each checkable against the
tree:

1. **Nothing above the light cone becomes a number.** `peekTruth` returns
   `null`, never a clamp; pending states are arithmetic (§1).
2. **One truth summary.** Questions and reports both read `Occupancy`,
   sharing `LEAKAGE_FLOOR` / `MADE_HEAT_FLOOR` with `classify`, so no
   channel can disagree with the sky about a boundary (§1).
3. **`studies.ts` never imports `missions.ts`.** A report reaches a study
   only as a neutral `StudyMove` that `cohort.ts` builds and hands in;
   the module cannot tell a bought answer from a probe report (§2.5).
4. **Watching never settles anything.** Every share stays within
   `[0.02, 0.9]` through `settleShares`, the one place a belief moves
   (§2.5).
5. **No RNG in the derivation modules.** Findings, reports, plateaus and
   silence are all pure functions of stored stamps and truth; the same
   inputs reproduce the same output forever (§2.4, §3.4, §3.5).
6. **Effects freeze at purchase.** A project landed later never
   retroactively discounts a bought question or speeds a flying probe
   (§2.3, §3.1, §6.2).
7. **Prose and dates only.** No wire shape derived from truth carries a
   level, a ladder, or an ascension flag (§3.5, §3.7).
8. **A report is never fresher than the sky, only sharper.**
   `arrivedYear === aboutYear + distanceLy`, and `aboutYear` is never
   above the cone (§3.1, §3.5).
9. **Missions survive their sources.** A snapshot derives from the launch
   record plus a cone, never from a currently-visible source (§3.7).
10. **Handlers validate and persist; derivation modules derive.** No
    handler computes a belief, a date, or a finding (§5.4).
11. **Alarms carry no state.** Losing the queue costs a push, never a
    fact (§7).

---

## §12 The choice ceremony (A2.4, as built)

The first irreversible act: hail, broadcast, or stay dark. Server truth
in `contact.ts`; the ceremony staged on the Model
(`contactceremony.ts`).

**The act log lives on the Galaxy** (`galaxy.acts`, DO key
`galaxy:acts`, absent-key default as the entire migration). A hail is
one appended `ContactAct` and no emission write: a beam is aimed, not
broadcast, and putting it in the broadband history would leak it to
every observer. A broadcast writes two epochs onto the sender's OWN
emission history: the shout (`max(BROADCAST_LEVEL, current)` from the
commit year) and the fall-back (the level the civ would have had when
the shout ends, read off the original history before interior epochs
are dropped). Every year `applyBroadcast` touches is at or after the
commit's now, and every observer's `asOfYear` is at or before now, so
no light already served to anyone can change. Verified mechanically.

**Observation** (`observeCiv`'s beam branch): directedness is the
`toCivId` filter; the cone is the same `asOfYear` every other channel
reads. The target sees `directed-beam` at `BEAM_RECEIVED_LEVEL` from
`sentYear` through `sentYear + BEAM_DWELL_YEARS`, `lightHistory`
staying unfaked broadband. A dark sender surfaces to the target alone,
at arrival: the detection floor is short-circuited only for the
addressee, which is the entire point of a directed beam. The
`directed-beam` study menu is reachable at last, and a study open on
that star comes back overtaken by A2.3's machinery with no new code.

**The wire**: `commitContact { choice, starId, acknowledged }` in;
`ContactWire` rides `sky`: two `ContactStance`s (contested, the
archetype objection line, the coherence cost — pushed, not
preflighted, because they are pure functions of the civ's own dials)
and `outbound`, the player's own acts (`sentYear` / `arrivesYear` /
`shellRadiusLy`). Nothing in it is about anyone else. Validation
answers "unknown star", "no civ there" and "light not yet arrived"
with one code, so the error channel is not an oracle.

**Resistance**: the `voice-silence` dial against the act's demand
(hail contests above +0.35, broadcast above +0.10), damped by the
integration ladder; deterministic, byte-identical at preview and
charge. The wound debits the existing `stocks.coherence`, floored at
zero; the act records the amount actually charged. `acknowledged` is
consent, never price: the server recomputes the cost regardless.
Twenty banked objection lines (10 archetypes x hail/broadcast),
`LIMITS.remark`-gated, first person plural, no numerals.

**Stay dark writes nothing.** Physics has no record of a non-event;
the handler validates and returns. (The walkthrough's "unsent reply,
kept" is A2.5's draft object.)

**The presence rule** (act3-design's absence charter): `appendAct`
and `applyBroadcast` have exactly one call site each, inside
`onCommitContact`, which begins from a live connection's state.
Alarms resend skies; proposals have no contact arm; tripwires fire
beliefs. Client-side the same rule holds: `commitContact` has one
send site, reachable only from a completed live hold (or the
stay-dark word, which commits nothing). Greppable, and grepped.

**One-shot semantics**: a second hail to the same target refuses
until answered (A2.5 relaxes the predicate's body, not its callers);
a second broadcast waits out `BROADCAST_SHOUT_YEARS`, so repeated
broadcasts layer real shells with gaps. `MAX_ACTS_PER_CIV` bounds the
log.

**The ceremony**: camera frozen while armed; both holds
`HOLD_MS = 2800` wall-clock. The hold compresses the whole flight;
the commit collapses the preview inward into the BECOME bloom and
hands the act to the real clock. The hail thread is 3D-lerped then
projected each frame (foreshortening is honest) with a running year
at its head; the broadcast ring crosses the snapshotted neighborhood
linearly in radius, stamping each source's true arrival year in 3D
distance order, never screen order. Nothing at a target reacts to an
arriving preview: nothing there knows. Early release fades in place,
silently; the inward motion belongs to commit alone. A contested hold
renders dimmer with a brightness-only tremor while the arrival dates
stay full strength: the dates are not in dispute, only the
willingness. The persistent renders derive from `outbound` only: the
in-flight mote (covered-path hairline behind, nothing ahead) and the
echo ring growing a light-year a year, forever. They look motionless
in a session; that stillness is the point.

---

## §13 Traffic against the AI (A2.5, as built)

The sky answers for the first time. Threads, signals on real light
clocks, and rule-based counterparts, on one load-bearing decision:

**Derived truth, not written truth.** No AI civilization ever writes
anything. Every AI act, reply and the lantern's unprompted hail alike,
is a pure function of (the stored act log, the seeds, the distances),
evaluated at read time in `traffic.ts` and stored nowhere. The
presence rule survives restated: every `appendAct` call site is a
handler whose first statement reads a live connection's state (two
after A2.5: `onCommitContact`, `onSendSignal`), and alarms stay
wake-ups; wipe the queue and every reply still lands one sky-request
later. The identity that makes it cheap: an AI at distance d receiving
your act sent at year S sees your light clipped at exactly S, so every
trigger evaluates at the inbound act's own `sentYear`. Already-derived
replies are byte-stable forever because every later truth write is
dated at or after its own now. Verified mechanically.

**Signals as acts.** `ContactAct` gains optional `inReplyTo` and
`text` (append-only log: no migration; `inReplyTo` is declared but
unpopulated in A2.5, since the only thing a player's signal could
answer is derived material whose ids name nothing in the log). A
thread is the civ pair's stored acts plus the pair's derived signals.
You hail once (`hasHailed`); every later utterance is a signal,
uncontested: the mind objected at the door and does not relitigate
the conversation. `beamCrossing` accepts signals, so a live thread
keeps the counterpart lit as DIRECTED BEAM on both skies (a real cost
of traffic: their light curve stops teaching your study while you
talk).

**The counterparts** (class per archetype, all ten mapped): lanterns
(beacon, tide, herald) answer everything and hail a bright past
unprompted, exactly once per pair; whisperers (monument, cloister,
sowing, shepherd) answer only a held dark turn (below 0.08 for 600
years and more, by their own light-view) and withdraw permanently if
you brighten after the thread opens; congress and engine always
answer, deferring the first reply when the vote is close
(|voice-silence| < 0.20); the phoenix is silent, forever: the self
you hailed is gone. Deliberation 2.5 / 0.4 / 1.6 game years with
seeded jitter, deterministic on every derivation.

**Reply text** composes two fact-free clauses, the rule's own
observation then the archetype's voice, gated at construction
(`LIMITS.signal`), falling back to the observation clause alone on
rejection. Every number lives on the physics stamp above the payload
and none in the prose, so no fact can originate in a template.
Forty-three banked strings, `audit:voice`-gated.

**Physics stamps**: transit years, distance, received fraction
(REF squared over REF squared plus d squared, REF 5 ly, floored at
0.02), degradation — a measurement of the arriving beam, deliberately
distinct from `BEAM_RECEIVED_LEVEL`, the classification floor that
keeps a dark civ visible to its addressee.

**The wire**: threads ride the sky's contact block as a list/detail
split; the open thread is per-connection state, no DO key.
`nextEventYear` never carries a pending reply (knowing an answer is
coming would be knowing their present); derived inbound signals are
filtered at arrival; no inbound arc ever renders on the Model.

**Freeform** is player prose: one paragraph, sanitized
(`sanitizeSignalText`: NFC, whitespace collapse, control and bidi
rejection, combining-mark cap, 280 code points), never style-gated,
never handed to generation, and refused to human-held targets with
one throw site (`freeform-forbidden`): the human-pair composer is
A2.6.

**The client**: threads live in THE VOICE; each received signal wears
its stamp as an instrument readout above the payload (the texture is
astronomy, never mail); sent signals ride a cyan rail whose LANDED
line is the player's own arithmetic, never a receipt. Answering a
counterpart that hailed you first routes through the hail ceremony,
because answering reveals you. The silent state's one line: "The
window in which an answer could have arrived has passed. Nothing
came."

---

## §14 Human pairs (A2.6, as built)

The composer, findings in flight, the mutual quiet, and durable
identity. The stage that ends at A2's fun gate.

**The grammar** (the stage's double-Opus call, both framings converging
on the architecture): composed signals only, everywhere. Freeform
retired game-wide, because the freeform path had become a human/AI
oracle from the sender's own side and the AI never read the prose. The
client sends selectors, never content (`signalparts.ts`): it points at
its own called studies, visible sources, light archives, and founding
documents, and the server materializes every part, frozen, at send.
Fabrication is structurally impossible; v1 deception is selection,
omission, tone, and timing. No player-authored text travels between
players, at parse level, which is why the composed constraint is the
moderation posture and there is no report button for signals: there is
no player content to report.

**Seven part kinds** (finding, sighting, archive, culture, request,
verdict, accord) under **five tones rendered as properties of the
beam** (REPEATED IN THE CLEAR; NARROW, FOR ONE RECEIVER; MARKED FOR
IMMEDIATE READING; ONE PASS, AT LOW POWER; plain renders nothing).
The empty carrier ships: a beam with nothing on it, arriving dated.
Every signal carries a server-composed fact-free body in the sender's
archetype register, drawn from the same voice bank the AI path uses:
one distribution, not two look-alikes, and composed signals disclose
archetype family by the sender's own act of speaking.

**Findings in flight**: a finding freezes the sender's actual
StoredCall at send and lands wearing three ages (their light's age at
the call, the transit, the reader's own now). The reader can check
the arithmetic against the sender's known catalog position: honesty
is checked by geometry, not moderation. Foreign findings render with
provenance and are never merged. No forwarding: parts materialize
only from the sender's own state, so a leak cannot amplify.

**The mutual quiet**: offer, accept, decline, withdraw as accord
moves derived from the act log; the two racks honestly disagree while
an acceptance is in flight (the appointment feeling, generated by the
physics); breach by light ends it with no message, so the lifetime
signal cap can never lock anyone into an arrangement; the compliance
rail reads the counterpart's observed emission since the accord, in
their frame. AI parity: the whisperer accepts (its trigger already is
the predicate), the lantern declines in character, the congress
defers on a close vote, the phoenix never answers.

**Indistinguishability**: per-thread opaque wire ids; a uniform
turnaround floor on every thread (the beam is still being read); one
silence constant for both paths plus a seeded AI recess so a long
silence is never proof; canonical part order; no controller branch in
the signal path; audit:parity in CI proving every part kind flows in
both directions. The honest limit, stated: this removes proofs, not
evidence; no single observation proves a counterpart human, and no
surface ever confirms it.

**The mute** (conduct.md's promise, due with human traffic): one
filter on the muted player's own view; the sender's signal still
commits, their thread still renders, nothing notifies. Lifetime caps
carry the anti-harassment weight: one hail per pair ever, 24 signals
per pair ever, a cooldown and a turnaround floor, zero notifications.

**Durable identity**: accounts in the Cohort DO's native SQLite
storage (the class was already SQLite-backed; tables are created at
runtime, no wrangler migration, preview builds untouched). The
anonymous run token is promoted to a SEAT ID and keeps every key it
owns; the accounts table is a pure indirection from a 100-bit
Crockford bearer key to the seat. One seat per account per cohort is
a PRIMARY KEY inside the per-cohort DO. Claim mints the key once,
shows it in a write-it-down ceremony (there is no recovery in v1),
and kills the anonymous token; sign-in on a second device rides the
exact anonymous resume path; both devices stay live and every sky
fans out to the whole seat. The key travels in exactly one message
type; accounts appear on no wire shape visible to another player: the
account is a login, not a persona.

---

## §15 The travel half (A4, as built)

Seedships, relativistic ships, the forecast, full charters, landfall,
the Ledger, drift, and standing orders. The recursion made literal: a
player writes a CivSeed-shaped value function, launches it on a real
flight clock, and a child civilization enters everyone's sky at
light-honest times.

**The child is derived, never written.** `galaxyWithLandfalls`
(voyages.ts) is the only producer of a child PlacedCiv: a pure fold
over the stored voyage log in (landfallYear, id) order with occupancy
threaded, so ship races are deterministic and an earlier colony blocks
a later ship. The cohort's requireGalaxy() returns the derived roster
through one memoized choke point; requireStoredGalaxy() serves only
the write sites; saveGalaxyCivs asserts no CHILD_ID_PREFIX id ever
reaches storage. The only truth a voyage writes is its launch record
(galaxy:voyages, cohort-wide: a founded civilization is everyone's
fact) and its departure light. Wipe the wake queue and every colony
still exists. Invisibility is not enforced by voyage code at all: the
child's first emission epoch is dated landfallYear, so the existing
light-cone clip hides it from every observer until founding plus
distance.

**Three ships, F frozen at launch**: the seedship at 0.1c (canon,
520 compute, Investment); the torch at 0.5c behind an eight-year
departure flare (3400, Endeavor); the beam-pushed sail at 0.8c behind
the launch-beam project and a battery burning at 0.80 for min(60, 2d)
years (2600, Endeavor). Fast, informed, and loud, or slow, blind, and
silent; the amendment horizon (F-1)d shrinks as speed rises. Time
dilation is narration only.

**The forecast survey** prices the act before it: information age at
landfall is (1+F)d, and the arrival spread is a prior over public
facts (spectral class), never truth: the survey reads no live voyages
(a committed ship is not leakable), a visible source forces WIDEST,
and a sub-floor civilization reads as an empty star until landfall
finds it occupied: the designed-wrong-answer rule, reused.

**The charter** is the launch-time value function: five dial positions
snapped inside the parent's own bands with per-dial pins (a pinned
axis never walks), four clause groups (founding, posture, signal-plan,
on-hail; founding and posture required), one validateName token. The
child's archetype resolves from the sheet through nearestArchetype,
the same seam that places players; found-dark is the game's first
sub-floor emitter, and found-dark plus send-no-word means never
learning whether your child exists. No emission epoch may predate the
landfall year.

**The walk and the brake**: a child's sheet derives (childDialsAt),
never ticks: a halflife walk from the charter toward the destination
cradle's lean, slowed by conversation. Each completed exchange (your
act arrived, their answer sent after it) credits one round trip of
brake, capped at half of elapsed time, decaying with the walk itself:
past two-thirds drift a child cannot be held at all. Distance decides
who can be held close. The founding light samples the walked sheet, so
devotion shows in the record, dated. Muting your child stops the brake
dead.

**The Ledger** derives every row from observables (lineage.ts: no
truth path exists in the module; its header carries the grep). States
are the parent's own clock arithmetic: outbound, awaiting-light,
rooted, dark; `abandoned` is refused as unassertable from darkness,
and independence is not a state but the top drift band, latched once,
forever. Drift is a disagreement tally over dated observations: what
you have actually read (the light channel on voice-silence; stated
culture/dial parts on any axis) against the charter as written, over
max(n,3), rendered as words with a sample line, never a number. The
bands: unread, close, kindred, estranged, independent. The Ledger is a
hub section with no cyan, no badges, no counts, and one verb per row:
a child is a relationship, not an undertaking.

**Standing orders**: one class ships: on warm movement inside twenty
light-years, launch the sentinel. Armed on the sky with a sentinel
charter as the consent's content; fired only from sky assembly, never
from an alarm; once per arming; priced at fire time, and a fire that
cannot be paid for never becomes a debt: it fizzles and says so. THE
STANDING-ORDER INVARIANT stands in the cohort header beside the
presence rule: a standing order may commit only reversible,
Ambient-class dispatches that reveal nothing and ask nothing; it can
never reach a ContactAct, a broadcast, or an Investment-class spend.
saveMissionState has exactly three call sites, grepped.

**Deferred, seams named**: the reunion payload and lineage referendum
(PartKind "reunion"), the returning state (voyage.returnLeg), grounded
`abandoned` (a landfall Assay), handoff of an independent child to a
joining player (Phase B: a token bound to civ-v-*), dilation as a
quantity, the sail's battery stopping.

## §16 Grown behavior (A5, as built)

The archetype spectrum acting over time. An AI civilization's emission
history is no longer the curve its seed was generated with: it is a
pure function of (its seed, the cohort seed key, the stored act log,
the stored voyage record, and every other civilization's derivable
light), evaluated at read time inside the cohort's derivedFold and
stored nowhere. The third application of the derivation discipline
(AI speech in §13, children in §15, now light itself), and the
cheapest: EmissionEpoch[] was already a future-inclusive authored
curve, and A5 generalizes A4's foundingEmissionHistory move from
colonies to everyone.

**Behavior writes light, never character.** emissionHistory is the
only field the fold rewrites, plus the derived-only behaviorGrown
flag (saveGalaxyCivs throws on it, the CHILD_ID_PREFIX assertion's
sibling). Dials, archetype, posture, charter, chronicle, ladders and
stocks are untouched, so maskTierAt, charterPosture, drift and the
contest read the same facts as before. The authored curve is layered
on additively, never edited; nothing is dated before
max(0, ascensionYear), the authored dark turn, or the end of the
waking, so the deep past is byte-identical by construction.

**The rule table** (behavior.ts BEHAVIOR_RULES, one row per
archetype, each with a `why` column): five cadence shapes: climb
(tide, beacon), pulse (engine, congress, herald), fade (monument,
cloister, shepherd), train (sowing), shed (phoenix), periods 900 to
3600 years. At five real minutes per game year a source produces one
visible transition every 2.5 to 8 real days, so something in an
8-to-16-civ sky moves every day or two. The engine's ceiling (0.115)
sits under MADE_HEAT_FLOOR and the cloister's floor (0.012) under
DETECTION_FLOOR: the one civilization that can vanish outright. A
young civilization gets the sixth shape: the waking, a flare at its
ascensionYear (3 to 35 real hours after cohort creation), after
which its archetype's cadence begins.

**Reactions**: four triggers, each an arrival through the reactor's
own cone (new-source, warm, quiet, beam); four responses: kindle
(beacon, tide, herald), flinch (monument, cloister, shepherd,
sowing), skip (engine, congress: the missed beat, delivered by
deleting a scheduled epoch), hasten (phoenix pulls its dark phase
forward). A player's own broadcast is the warm trigger for free, so
their loud act makes a nearby quiet source visibly dim about two
real days later: the one loop nothing else in the game closes. The
shepherd reacts only inside its 12 ly ward radius.

**The fold** (galaxyWithBehavior, exactly one call site, in
derivedFold after the landfall fold, so a drifted colony grows into
the behavior of the character it became): cadence laid down in
closed form (cost per event, never per year), then a global event
queue drained in (arrivalYear, reactorId, triggerKey) order with
seeded lag in [24, 180] years. Well-founded because every causal
step advances time by at least 24 years; terminated by
REACTION_CAP 8 with MIN_REACTION_SPACING 600 y; capped at
CADENCE_CAP 48, which is the arc, not a loop: five real months to a
year and a half of sky, then a settled posture, answered by A5's
cohort-seeding bullet. Memoized behind one new memo term,
era = floor(nowYear / 240 y), horizon two eras out, so a sky send
costs what it cost before.

**BEHAVIOR CAUSALITY** (the applyBroadcast safety property, one
noun over): every behavior epoch is dated at or after its newest
input, every new input is dated now, so no derivation ever inserts,
moves or removes an epoch at or before nowYear, and already-served
light is byte-identical forever. Two structural guards sit above
the table because tuning cannot supply them: the invisibility guard
(a source under DETECTION_FLOOR is exactly what its seed says, so a
found-dark colony stays hidden) and the churn guard (no behavior
epoch may cross MADE_HEAT_FLOOR within 2400 years of the last
crossing, so the overtaken exit fires at most about once a real
week per source). Players are immune by reference: a player
civilization is returned as the identical object.

**Unprompted openers** became an archetype-keyed table in
traffic.ts: beacon, tide and herald keep firstBrightYear unchanged;
the congress newly opens on firstWarmYear, the player's first
upward MADE_HEAT_FLOOR crossing at or after cohort year 0; the
other six never open. At most one candidate per pair, as before.

**Zero new wire fields, zero new persistence keys, zero banked
lines.** Every payoff lands on a shipped surface: the source card
and echo shell, the evidence trail, the annal, belief shifts and
the crosses tripwire, the overtaken exit, the warm-movement
standing order, the leakage-stops tripwire, the Ledger's drift
band, and a thread that opens itself.

**Deferred, seams named**: a lightHistory wire cap (needs
EvidenceEntry.id off the array index first), a line of chrome for
the vanished cloister's closed study, retunes as diffs to
BEHAVIOR_RULES only, and the successor problem (cohort seeding).

## §17 Web push (A5, as built)

The second half of the tripwire bullet: in-app shipped with A2.3, and
now the phone. A player arms a tripwire, closes the tab for a week,
and their device says when a watch trips. At five real minutes per
game year a week away is two thousand years of galaxy, so the push is
the async spine's basic need answered: absence becomes fiction
instead of neglect.

**Payload-free, structurally.** The POST body is empty; the service
worker (client/public/sw.js, no fetch handler, no caching) shows one
fixed line, "A watch tripped. One of the conditions you left standing
now holds. The board has the rest." The server stores no subscriber
key material (no p256dh, no auth), so no code path could put a fact
on a push service's wire even if a later change tried. The content
waits behind the tap, in the game, through the cone, as always.

**The watch.** A tripwire's condition can change only at a dated
arrival: a grown emission epoch reaching the observer, a bought
question answering, a probe report landing. scheduleWatch computes
each seat's next change point and puts one singleton, trim-exempt
watch event on the existing alarm queue (backstop one real day);
runWatch re-derives, decides, sends, and writes only push:<token>.
Alarms stay wake-ups, never truth: the saveStudyState writer set is
byte-identical to before the slice. One push per absence; the alarm
chain stops after a push and the next connect restarts it. A seat
with no subscription pays nothing on any sky send.

**The catch-up walk.** Two of the three tripwire kinds are not
monotone; a condition that held and stopped holding across an
absence was previously never recorded. findFirings walks a study's
change points oldest-first and finds the first year each armed kind
held; it has exactly two callers, the watch (which only counts) and
the sky settle (which records), so the push and the board cannot
disagree. firedYear now carries the year the condition held rather
than the year somebody looked: a behavior change to a shipped A2.3
surface, and the bullet's own intent.

**Consent and the cliff.** The ask is spent at the first successful
arming, once per seat, on the account sheet's mould; never on load,
never where it cannot be granted. The hub row is the settings
surface and speaks for this device only. On iOS, push needs the app
on the Home Screen, and the inert row says exactly that. One denial
is permanent, so every never-ask branch is load-bearing.

**Crypto with zero dependencies.** VAPID ES256 on crypto.subtle: the
private key is a JWK in a Workers secret, signatures come out raw
P1363 which is exactly what JWS wants (no DER anywhere in the
slice), JWTs are cached per audience, and a boot assertion rebuilds
the public key from the JWK and disables push on mismatch. Rotation
is destructive by nature; keyId cleanup plus the boot re-sync heal
it. Client-supplied endpoints pass an https-plus-allowlist SSRF gate
before the Worker will fetch them.

**Verified without a push service**: HOLOS_PUSH_DRY_RUN plus
/dev/push, /dev/watch, /dev/vapid drive the whole path headlessly,
including the load-bearing consistency check (the recorded firedYear
equals the change point the watch reported). The one leg this
environment cannot verify is a bodyless push delivering on real iOS
hardware; docs/playtest.md carries that checklist.

**Deferred, seams named**: pushes for a first hail and for probe
reports (the change-point machinery generalizes), re-notify on long
absence, a notification inbox (never), email (no), per-tripwire
preferences, offline caching. Standing orders are structurally
blocked from push: an order has not fired until the settle fires it,
and no alarm may fire one.
