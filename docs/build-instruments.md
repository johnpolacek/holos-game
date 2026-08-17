# HOLOS — Build brief: IN (the instrument, and what a project is)

*The launch brief for the slice that gives projects a family, gives the
instrument family its physical shape (one array, twelve terms, named rungs),
and lets the project sheet, the question drill-in and the report say what
the technology actually is. Part of the just-in-time `build-*.md` series;
[roadmap.md](./roadmap.md) is the source of sequence and wins on any
disagreement.*

---

## Why (the decision, already made)

The player cannot tell what the compute spend is for. A bought question's
card shows a price, a one-sentence method and three chips; a project's
sheet shows a cost class, a pitch, a grant and a clock. Nothing on either
says what the observatory *is*, what it is doing continuously for free,
or what the spend does past that. The thirteen shipped projects read as
thirteen unrelated purchases; the six questions read as three prices.

The physics underneath is specific and already half-written into the code
(`projects.ts`'s "the data is the easy part; the inference is the spend",
`questions.ts`'s "PHYSICS FIRST", `cold-logic-annex`'s Landauer floor,
`contest.ts`'s mask-versus-instrument tiers). It just never reached a
surface. Stated once, plainly, it is this:

**A civilization at this tier does not have a telescope. It has an
interferometer.** Many collectors across the home system, their signals
correlated. An interferometer never records a picture; it records
correlations, and every image, spectrum or measurement anyone has ever read
was *computed* out of them, under assumptions, by solving an inverse
problem that has no unique answer. So the archive is not a shelf of
photographs. It is raw interference data, centuries deep, and:

- **The standing read** reconstructs the cheap version of everything,
  continuously, on every source in the sky. Incoherent stacking (√N),
  one broad band, nature's low-dimensional models. That is what produces
  the board every detected source already carries.
- **A bought question** re-derives the same archive under assumptions the
  standing read cannot afford: coherent stacking across a template bank
  of trial phase models (the LIGO continuous-wave problem), one
  reconstruction *per spectral channel*, Bayesian retrieval through a
  model atmosphere. Nothing new is collected. What is bought is a deeper
  reconstruction of light already in hand.
- **A project** buys down one term of that inverse problem for good:
  collecting area, baseline, element count, band, channel count, phase
  reference, archive fidelity, correlator, nulling, a borrowed lens.
- **Compute is finite because it is energy** (Landauer), **it does not
  amortize** (every source is its own search), and **the answer decays**
  (`MASK_RULES`: a masker improves on a cadence, forever). Hence an
  allocation with a ceiling and not a bank; hence a recurring spend.
- **Questions have a cost and no clock; projects have both.** At swarm
  power, any search a mind would actually size finishes instantly; the
  whole cost is deciding what fraction of a star to point at one star.
  Duration exists exactly where mass or light has to move (projects,
  probes, voyages, the light delay, mask cadence) and is absent exactly
  where nothing does. physics-audit.md P0-1 stands, and gains this second
  leg.

Everything below is the surfaces catching up to that paragraph.

**Kept, deliberately.** The tab stays PROJECTS: projects are more than the
observatory (technology.md's families are bright, dark, instrument,
carrier, message, deterrence), and the instrument family is one section of
that page, not the page. Nothing here caps concurrency, numbers a rung, or
adds a level counter: [projects.md](./projects.md)'s no-caps and
altitude rules hold in full.

## What is actually wrong today (the audit)

- `ProjectDef` has **no `family` field**. projects.md says every project
  has one; the code encodes it implicitly in the effect kind. So no
  surface can say what kind of thing a project is.
- The shipped catalog is **10 instrument, 2 dark, 1 carrier, 0 bright**
  (act2-design.md's v1 target was 3/4/2). Not wrong (A2 built the
  observatory) but it is why "Projects" currently feels like the
  observatory. Grouping by family makes the imbalance legible and gives
  the first bright entry a place to land.
- **No prerequisites.** `focal-line-constellation` can be started without
  a single `focal-line-observatory`. Nothing in `startProject` reads
  another project's state.
- Two questions, `listen-off-axis` and `temperature-over-time`, have **no
  dedicated discount project**; only the Vault's blanket 20% touches them.
  The interferometer framing has an obvious project for each.
- `project-landed` records one sentence: the label and the grant. The
  question-answered record does not say what resolved it.
- Every archetype has a technology plate; **no project has one.**

## Orchestration

Per [CLAUDE.md § Build orchestration](../CLAUDE.md): **Fable
orchestrates** — plan, decompose, synthesize, keep context lean.
Reasoning-heavy work to **Opus**, mechanical work to **Sonnet**. The
**high-stakes calls** — run Opus twice with different framings and
synthesize — are:

1. **The catalog shape.** Where axis and rung live (fields on
   `ProjectDef` versus a separate `INSTRUMENT_AXES` table that names rung
   ids in order), where the *inherited* rung-0 descriptors live (they are
   not purchasable, have no effect, and must not enter `started`), and
   which of it rides `welcome` (static catalog, the `missionCatalog`
   precedent) versus `sky` (per-civ status). Framing A: minimize churn in
   `projects.ts`'s aggregation functions, which loop `started` and must
   not see a rung 0. Framing B: make the client's grouping exhaustive by
   construction (a project with no family, or an instrument with no axis,
   does not compile).
2. **The report's technical body.** `ReportEntry.record` is a record
   sentence at an 18-word wall and stays one. The technical paragraph is
   a new field (`detail: string | null`), a quieter tier under the
   record, with its own §2 row. Framing A: authored once per project in
   the catalog and reused verbatim by the sheet and the record (one
   string, two readers, cannot drift). Framing B: the record's detail is
   past-tense and about *this civ's* instrument now, so it is a second
   authored string. Decide, and decide whether `question-answered` carries
   its "leans on" line as detail or the finding already says enough.
3. **The four new entries' numbers.** Costs, durations and discount
   percentages are v1 targets below; the deep-reasoner prices them
   against the existing ladder (`ATTENTION_YEARS` × income must still
   reach every rung from the poorest start; no discount stack may need
   `EFFECT_KEEP_FLOOR` to save it) and against session rhythm
   (projects.md's stagger rule).

Fable — not the subagents — holds the invariants below, verifies them in
every subagent's output, keeps checks green, and commits.

## Decisions (settled; do not reopen)

1. **Family is a real type.** `ProjectFamily = "instrument" | "dark" |
   "bright" | "carrier"`, a required field on `ProjectDef`, on
   `ProjectSnapshot`, and a `Record<ProjectFamily, …>` wherever the client
   groups. `bright` is in the type today with zero entries so the first
   swarm stage is a catalog row and not a type change. Message stays a
   verb (the contact ceremony), not a family; deterrence stays deferred.
   Shipped assignment: `cold-logic-annex` and `sky-vault` are dark,
   `launch-beam` is carrier, everything else is instrument.
2. **The instrument family has axes; rungs are named, never numbered.**
   Twelve axes, each a short ladder whose rung 0 is inherited at
   placement and whose later rungs are catalog entries. Chrome axis
   labels (≤ 6 caps words, R-24) and the ladder:

   | Axis | Rung 0 (inherited, not purchasable) | Rungs (in order) |
   |---|---|---|
   | COLLECTING AREA | the deep array as inherited | `deep-array` |
   | BASELINE | system-scale | `long-baseline-optical` → `flicker-pair` (new) |
   | ELEMENTS | sparse | `fill-the-plane` (new) |
   | BAND | visible and near-infrared | `cold-band-refit` |
   | CHANNELS | broadband | `spectrograph-bank` |
   | PHASE REFERENCE | local clocks | `pulsar-timing-array` → `second-sightline` (new) |
   | ARCHIVE | reduced products | `sky-vault` |
   | CORRELATOR | the annex as inherited | `cold-logic-annex` |
   | NULLING | none | `star-null` (new) |
   | SHADOWS | none | `occultation-network` |
   | NEUTRINOS | none | `neutrino-watch` |
   | THE BORROWED LENS | none | `focal-line-observatory` → `focal-line-constellation` |

   `sky-vault` and `cold-logic-annex` are **dark-family projects that sit
   on an instrument axis**: family says what kind of work it is, axis says
   which term of the reconstruction it moves. Both are true and the types
   allow both. `standing-survey` is instrument-family and on **no axis**:
   a campaign run on the hardware, not hardware; the page lists it under
   the family beside the axes as a program. `launch-beam` is on no axis.
   Rung 0 carries a label, a plate id and a one-paragraph description and
   nothing else: no effect, no cost, never in `started`, never a
   `ProjectSnapshot`.
3. **A rung requires the rung before it.** `startProject` refuses an
   instrument entry whose axis predecessor has not *landed* (not merely
   started). Reuse the existing `project-required` error code if its
   client copy fits ("the ship needs a project that has not landed" is the
   same rule for a different subject); else add `rung-required`. The
   rule gates **new starts only**: a run that already has
   `focal-line-constellation` running without the observatory keeps it.
   No migration; `ProjectState` v3 is unchanged.
4. **Four new catalog entries, all `question-discount`, no new effect
   kind.** v1 targets, priced in the orchestration call above:

   | id | label | family / axis | class | cost | years | effect |
   |---|---|---|---|---|---|---|
   | `second-sightline` | Set the second sightline | instrument / phase reference | endeavor | 1400 | 80 | LISTEN OFF-AXIS 40% |
   | `star-null` | Null the star | instrument / nulling | endeavor | 1600 | 90 | TAKE ITS TEMPERATURE and READ ITS LINES 30% |
   | `fill-the-plane` | Fill the plane | instrument / elements | endeavor | 2000 | 100 | every question 10% |
   | `flicker-pair` | Pair the flicker | instrument / baseline | endeavor | 2600 | 130 | WEIGH IT and CATCH ITS EDGES 25% |

   The physics of each, for the prose: a station far enough off-axis that
   its sightline crosses different interstellar medium lets the scattering
   be solved rather than guessed, which is the term that bounds coherent
   span (second sightline). Destructive interference on the star's own
   light while everything beside it survives, the Bracewell null, attacks
   contrast, the hard part of every planet-beside-star measurement (star
   null). N elements give N(N−1)/2 baselines, so element count fills the
   frequency plane and every reconstruction becomes less ill-posed (fill
   the plane). Two crude collectors light-hours apart correlating
   *intensity* rather than amplitude, Hanbury Brown–Twiss, buys a baseline
   nothing else reaches at the price of losing phase: sizes and shapes,
   not images (flicker pair). **Deepest stack check** after these land:
   WEIGH IT under long baseline × flicker pair × pulsar clocks × Vault ×
   plane = 0.7 × 0.75 × 0.7 × 0.8 × 0.9 ≈ 0.26, above
   `EFFECT_KEEP_FLOOR` 0.25 by a hair; READ ITS LINES under spectrograph
   × null × Vault × plane = 0.6 × 0.7 × 0.8 × 0.9 ≈ 0.30. If the pricing
   call moves a percentage, re-run this arithmetic and keep every stack
   off the floor.
5. **The project sheet gains three blocks.** Under the pitch, before the
   grant: `HOW IT WORKS` (the physics, in the observatory's deadpan),
   `WHAT IT CHANGES` (which term of the reconstruction it moves, in
   words), `IN THE SKY` (what an observer reads when this is built,
   technology.md's own field). Three authored strings per catalog entry
   and per rung 0, shipped on the snapshot / the welcome catalog exactly
   as `effectLine` is. New §2 rows: HOW IT WORKS 60 words · aim 40; WHAT
   IT CHANGES 24 · aim 16; IN THE SKY 30 · aim 20; all observatory
   deadpan, wit 0. **Numbers in these blocks are constants of nature
   spelled in words** ("five hundred and fifty astronomical units", the
   catalog's own precedent) **and never restate a code field**: a block
   that names a `costCompute`, `durationYears`, `addRatePerYear`,
   `percent` or `cruiseFractionOfC` gets a coupling in
   `scripts/audit-facts.mjs` the same commit, per that script's header.
6. **The question drill-in is two blocks and a lean line.**
   `QUESTION_METHOD`'s single paragraph becomes two per question:
   `ALREADY RUNNING` (what the standing read produces for free, and where
   it stops) and `WHAT THE SPEND BUYS` (the reconstruction the compute
   pays for, and why that is its price). Both stay in
   `client/src/questionmethod.ts`, keyed by `QuestionId`, derived from
   nothing, per that file's no-leak header. Under them, `LEANS ON` names
   the axes the question is limited by, from a `leansOn: readonly
   InstrumentAxis[]` on `QuestionDef` (server, rides `OpenQuestion`) so
   the report can use the same list. `WHAT IT CAN TELL APART` keeps its
   chips. There is **no** "where the spend buys nothing" block: the
   plateau finding already says so, as an answer, when it happens.
7. **The report gets a technical body.** `ReportEntry` gains `detail:
   string | null`. `project-landed` carries the entry's WHAT IT CHANGES
   (or a second past-tense string; orchestration call 2), and the client
   renders the project's plate beside it, resolved from the route's
   `projectId` with no new wire field. `question-answered` carries the
   lean line as detail ("Resolved on the baseline and the phase
   reference"), when call 2 keeps it. Record sentences and their 18-word
   wall are untouched; `detail` is its own §2 row (60 · aim 40,
   observatory deadpan, wit 0, R-33a undated).
8. **Every project and every rung 0 gets a plate.** A fourth content-art
   axis: `docs/content-art-projects.md` (one subject prompt per catalog
   entry and per inherited rung, the ISOLATION rule verbatim: one subject,
   neutral ground), a `DOCS` row in `scripts/build-art-manifest.mjs`,
   plates under `client/public/art/projects/{sq,wide}/<id>.webp`, and
   `projectArt(id, ratio): string | null` in `client/src/art.ts` beside
   the three resolvers there. **No art is generated in the repo**; the
   client falls back to no image when a plate is absent, so the sheet and
   the report ship before the plates do and fill in as they land.
9. **Rung 0 is a page.** Tapping an axis's inherited rung opens the same
   sheet as a project, minus cost, clock and verb: what the civilization
   already owns, described. This is the answer to "what is doing all this
   computing" and it is the surface the whole slice exists for.

## Stages

Each stage is a small, single-purpose PR, and **every merge is
shippable** (`main` auto-deploys).

- **IN1 — server: the catalog knows what it is.** `family` on
  `ProjectDef` and `ProjectSnapshot`; the axis/rung shape per call 1;
  rung-0 descriptors and the axis table on `welcome`; the four new
  entries with all three prose blocks; `howLine` / `changesLine` /
  `skyLine` (names per call 1) on every existing entry; `leansOn` on
  `QuestionDef` and `OpenQuestion`; the predecessor rule in
  `startProject`; `audit:facts` couplings for any block that restates a
  field. Protocol changes in `protocol.ts` only, with guards.
- **IN2 — client: the Projects page has a shape.** Grouped by family
  (`Record<ProjectFamily, …>`, exhaustive); the instrument section lists
  axes, each with its current rung and its next rung as the offer, plus
  programs beside them; dark and carrier sections list their entries;
  a bright section header appears only when an entry exists. The detail
  sheet gains the three blocks; the rung-0 sheet ships. Every new caps
  string ≤ 6 words (R-24); every new prose string R-8 clean.
- **IN3 — the drill-in and the report.** `questionmethod.ts` becomes two
  strings per question plus the lean line; `ReportEntry.detail` on the
  wire and rendered; `project-landed` and (per call 2) `question-answered`
  carry detail. `scripts/prod/report.mjs` (`npm run prod:report`) prints
  detail under the record so production reads can be checked.
- **IN4 — art.** `content-art-projects.md`, the manifest row, `projectArt`
  in `art.ts`, the sheet's hero plate and the report's thumbnail, both
  null-safe. Plates land in a later, art-only PR as they are rendered.
- **IN5 — docs, bots, audits.** [projects.md](./projects.md) gains the
  family field and the axis table; [technology.md](./technology.md) §III
  points at the axes and gains the four new instruments;
  [prose-style.md](./prose-style.md) §2 gains rows for the three sheet
  blocks, the two drill-in blocks, and report detail, and §7 gains a sync
  row for the "why" paragraph above (it lives in `projects.ts`'s and
  `questions.ts`'s headers too, and an edit to one is owed to the
  others); [observatory-design.md](./observatory-design.md) names the
  interferometer; [physics-audit.md](./physics-audit.md) P0-1 records the
  second leg; `scripts/playtest-bot.mjs` learns the predecessor rule if
  it starts projects. Run `/prose-audit` after IN1 and IN3.

## Invariants (Fable verifies these in every subagent's output)

- **No leak widens.** Every string this slice adds is fixed catalog text
  keyed by a public id (`ProjectId`, `QuestionId`, an axis id). Nothing
  reads `CivTruth`, a study, or a sky to compose it. `leansOn` is a
  property of the question, not of any source. `ALREADY RUNNING` names a
  *kind* of standing product, never a value.
- **The register is the observatory's** (prose-style.md §2 register 2:
  flat, exact, sincere, wit 0). The one permitted flourish is a true
  statement of physics. R-8: no dash of any kind on a surface. R-24: caps
  ≤ 6 words. R-33: nothing dated. R-42: every block a player reads before
  spending says what spending would change, not what the subject is.
- **No number on a surface restates a code field** without an
  `audit:facts` coupling landing in the same commit. Constants of nature
  in words are fine; tunables are not.
- **No new effect kind.** All four entries are `question-discount`; the
  aggregation in `projects.ts` is untouched; every discount stack stays
  above `EFFECT_KEEP_FLOOR` without the floor's help.
- **Rung 0 never enters `started`** and never becomes a `ProjectSnapshot`;
  `ratePerYearAt`, `freeComputeAt` and the effect aggregators loop
  `started` and must never see one.
- **The predecessor rule gates new starts only.** No refusal of anything
  already stored; no migration; `ProjectState` stays v3.
- **Questions keep cost and no clock** (P0-1). Nothing here adds an
  `answersIn`, a countdown, or a duration to a question.
- **Rungs are named, never numbered**, on every surface. No "level", no
  "max", no fraction of a ladder. The last shipped rung on an axis is the
  last shipped, not the last.
- **The tab is PROJECTS.** Family is the grouping; the instrument is one
  family's shape; nothing renames the tab or the Work landing.
- **`ProjectFamily` grouping is exhaustive by construction** on the
  client: a `Record<ProjectFamily, …>`, so a family added later cannot
  reach a player unlisted.
- **Record sentences keep their wall.** `detail` is the new room; the
  18-word record sentence and its `PinnedLine` discipline (R-29) are
  untouched.

## Authored samples (the register, pinned by example)

These are the shape and register the subagents write to; the exact words
may be edited in review but the *kind* of sentence must not change.

**A project sheet** (`focal-line-observatory`, endeavor):

> HOW IT WORKS
> A star bends the light that grazes it, and everything passing close comes
> back together on a line beginning about five hundred and fifty
> astronomical units downstream. Stand anywhere on that line and the star
> itself is the objective, at an aperture no built mirror approaches. The
> target arrives as a ring drawn around the star, and the image is
> recovered out of the ring.
>
> WHAT IT CHANGES
> Gain, on one bearing. Everything on that line resolves; nothing off it
> does, and aiming elsewhere is a translation of hundreds of astronomical
> units.
>
> IN THE SKY
> Nothing. A cold speck a long way from anything, radiating less than the
> dust around it. Nobody being looked at can tell, and that is also true
> of us.

**A question drill-in** (`read-its-lines`):

> ALREADY RUNNING
> One broad band, reconstructed once, kept current. Enough to place the
> source in a class. Not enough to name anything in it.
>
> WHAT THE SPEND BUYS
> A spectrum is not one reconstruction. It is one per channel, each with
> its own deconvolution and its own starlight suppression, and then a
> search across compositions in which every candidate has to be radiated
> through a model atmosphere before it can be scored at all. Two costs
> multiplied, which is why this is the dearest question here.
>
> LEANS ON
> CHANNELS · NULLING · ARCHIVE

**A question drill-in** (`listen-off-axis`):

> ALREADY RUNNING
> The array's pairs are correlated as the light lands, and the standing
> read stacks them without regard to phase. That is cheap, and it costs:
> added that way, a million samples are worth a thousand.
>
> WHAT THE SPEND BUYS
> Stacked in phase they are worth all million, which needs every sample's
> phase across centuries, through the source's own motion and the medium
> in between. Nobody has that. The spend builds a bank of trial phase
> models, restacks the whole archive under each, and keeps the one that
> lights up. The bank is the price.
>
> LEANS ON
> PHASE REFERENCE · BASELINE · ARCHIVE

**A question drill-in** (`temperature-over-time`):

> ALREADY RUNNING
> Total power in a band, epoch by epoch, with the star suppressed just
> enough to leave what is beside it. Nothing here needs a phase, so
> samples of this kind simply add.
>
> WHAT THE SPEND BUYS
> A joint solution in place of a sequence of averages. The spend
> suppresses the star properly at every epoch, then fits the whole run at
> once for emissivity, thermal mass, rotation and orbit. Few unknowns and
> no bank to build, which is why it is the cheapest question here.
>
> LEANS ON
> NULLING · BAND · ARCHIVE

**A rung 0** (BASELINE, inherited):

> System-scale. The collectors stand as far apart as the home system is
> wide, and a pair that far apart resolves what a single mirror the size of
> the system would. Past this, resolution is bought by standing farther
> apart, and every step outward is paid in phase.

**A report record with detail** (`project-landed`, `spectrograph-bank`):

> A project came into service: Rebuild the spectrograph bank. READ ITS
> LINES costs 40% less compute, on every study.
>
> *The archive's light now splits to thousands of channels against a
> frequency comb that does not drift, so a reconstruction that was one
> broad band is one per line, and a spectrum stops being a color and
> becomes a list of names.*

## Open questions (for the orchestration calls, not for reopening the decisions)

- Whether the `WHAT IT CAN TELL APART` chips gain a sub-line per
  (question, hypothesis) pair saying what each reading looks like under
  this measurement (fifteen strings for `broadcast-leakage`, about
  sixty-six across the five classes). Same no-leak argument as
  `questionmethod.ts` (fixed per pair, derived from nothing). Deferred
  from this slice unless IN3 lands light; if taken up, the pill layout
  becomes rows (caps label over an `xs` sub-line, never a sentence in a
  pill).
- Whether the bright family's first entry (a swarm stage) should land in
  this slice purely so the family section is not empty on day one. Lean
  no: the section header appearing when the first entry ships is the
  honest state, and a swarm stage is a bright-family design decision that
  deserves its own brief.
- Whether the Projects list's family sections fold by default on a phone.
  Twelve axes plus programs plus two more families is a long page;
  projects.md's "rack's upper texture" open question, arriving early.
