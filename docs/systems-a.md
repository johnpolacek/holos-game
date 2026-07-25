# HOLOS — Systems A: the work engine, as built

*The A2.2 systems spec: the light cone, bought questions, probe-class
missions, and the Docket.*

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
> `questions.ts`, `projects.ts`, `missions.ts`, `docket.ts`, `studies.ts`
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
compute; integration is in game years. Per the code's own provenance
note, these are systems-a's numbers, canonical over content.md's 40–160 /
15–60y figures.

| id | label | cost | integration | applies to |
| --- | --- | ---: | ---: | --- |
| `weigh-it` | WEIGH IT | 60 | 12 | infrared-excess, transit-shadows |
| `temperature-over-time` | TAKE ITS TEMPERATURE | 45 | 24 | infrared-excess, transit-shadows, broadcast-leakage, directed-beam |
| `read-its-lines` | READ ITS LINES | 75 | 8 | infrared-excess, transit-shadows, broadcast-leakage, biosignature |
| `time-its-shadows` | TIME ITS SHADOWS | 40 | 18 | transit-shadows, biosignature |
| `catch-its-edges` | CATCH ITS EDGES | 90 | 6 | infrared-excess, transit-shadows, biosignature, directed-beam |
| `listen-off-axis` | LISTEN OFF-AXIS | 55 | 10 | broadcast-leakage, directed-beam |

`appliesTo` is physics, not balance: you cannot time shadows that are not
there.

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
ceremony. `costCompute` is systems-a's number, justified against income
(24 ≈ 3–4 years of it, 40 ≈ 4–7); content.md's 20/32 flagged the price
point only and is superseded.

| kind | label | cost | cadence |
| --- | --- | ---: | --- |
| `assay` | THE ASSAY | 24 | none — one word |
| `sentinel` | THE SENTINEL | 40 | `SENTINEL_CADENCE_YEARS = 25` |

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
closed (`SILENCE_GRACE_YEARS = 2`) and no actual arrival matches it. The
player wrote the charter that causes this, which is the whole point: the
silence carries information without the game ever stating it.

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
| working | OCCUPIED — HOLDING AT RANGE | built 3, mundane 0.4, quiet 0.4 |
| living-industrial | INHABITED — HOLDING AT RANGE | built 3, mundane 0.5, quiet 0.4 |

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

### §3.6 Docket state

`DocketState = in-hand | in-flight | beyond-horizon | awaiting-light |
returned | silent | standing`, decided in order:

1. `nowYear < horizon` → **in-flight**
2. `nowYear < arrival` → **beyond-horizon**
3. `nowYear < firstWord` → **awaiting-light**
4. any expected arrival past its grace window with no matching actual →
   **silent**
5. reports exist → **standing** if `plan.standing`, else **returned**
6. otherwise → **awaiting-light**

`in-hand` never applies to a mission — it is the projects-and-questions
state; `missionNextDate`'s branch for it is defensive only.

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

## §4 The Docket

**One derived list.** `buildDocket` stores nothing: it is assembled per
sky send from the three state records that already exist (studies,
projects, missions) plus nothing new. Every date on a row derives from a
purchase-time stamp plus catalog constants — never a stored date of its
own.

**The no-backlog rule.** Available projects and offered questions are not
undertakings — nothing has been committed to, so they are not rows.
Answered questions leave the Docket too: they have become evidence on the
study, which is where the player reads them. A study row appears only if
it has at least one child, so an idle vigil is not clutter. **There is
nothing to groom.**

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

`sky` gained `missions`, `docket`, and `probeFlightYearsPerLy` (the
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
the class is known); an **existing study** on that star; a known question
that `appliesTo` the source's class and has not already been bought; and
`freeCompute ≥ effectiveCostFor(def, nowYear, …)`. It then appends the
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
