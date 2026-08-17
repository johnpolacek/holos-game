// The vigil's compute economy — derivation module for A2.2's project layer.
//
// This module owns the project catalog and the compute allocation that pays
// for knowing.
//
// WHAT THE CURRENCY IS. Compute, in economy-design.md's sense: "grown from
// Energy; the price of knowing." A civilization at this stage is not
// rationing telescope time — it collects everything its instruments can
// reach, continuously, and the photons are free. What is finite is the
// capacity to REASON about what came in: to run the inference that turns a
// light curve into a claim about who lives there. Looking is free; thinking
// is the spend. The deep array's own line says it — "the data is the easy
// part; the inference is the spend."
//
// WHY INSTRUMENTS RAISE IT. observatory-design.md: the vigil's income is
// "raised by instrument-family projects; the gravitational-lens observatory
// is the deep end." Commissioning an observatory program is commissioning
// the inference capacity to make use of it — the catalog's four entries buy
// standing compute, not collecting area for its own sake.
//
// NOT A BANK. There is no money in Holos (economy-design.md § No money), and
// this pool is not a savings account with a different label: it is one
// resource, spendable on one thing (knowing), presented as an ALLOCATION —
// compute free versus compute committed — never as a balance that stores
// value. Nothing here converts to anything else. As of the 2026-07 scarcity
// pass this is enforced, not just presented: uncommitted compute SATURATES
// at the attention ceiling (ATTENTION_YEARS × the current income rate).
// Attention is capacity, not wealth — capacity idle yesterday buys nothing
// today — and without the ceiling, real-time accrual between sessions
// (288 game years per real day at the current clock ratio) would hand a
// daily player more compute than the whole question catalog costs, and no
// spend would ever be a choice. Spending opens headroom that refills at
// the income rate; the ceiling grows as income projects land, which is
// what keeps the project ladder climbable (see ATTENTION_YEARS).
//
// Income is a RATE in compute per GAME year, never real time —
// REAL_MS_PER_GAME_YEAR (clock.ts) is a tunable, and a real-time-denominated
// economy would silently reprice on every retune of that constant.
//
// Accrual is DERIVED from the clock, never ticked: freeComputeAt reads the
// clock's nowYear and computes the free total in closed form — since the
// ceiling, piecewise closed form from the last commit's anchor, the pieces
// being the years the income rate changes. There is still no alarm
// dedicated to this economy and no drift to correct for.
//
// A2.2 EFFECT AGGREGATION. Nine new projects land alongside the four
// shipped ones, in four effect kinds (content.md PART 2, synthesis.md §4;
// the fifth, `question-haste`, is gone — physics-audit.md P0-1: compute may
// price a question, it may never date one).
// `questionCostKeepFractionAt` /
// `landedProbeCruiseFractionAt` / `confidenceLiftAt` are this module's
// answer to "what do the LANDED projects grant, right now" — every one
// reads only `hasLanded` project effects, stacks matching ones
// MULTIPLICATIVELY (never additively) except probe-haste, which takes the
// MAXIMUM across landed projects (content.md's own rule: a beam is either
// running or it isn't). None of these apply a floor themselves — the floor
// (25% of catalog base) is questions.ts's rule, applied where the keep
// fraction is actually spent, so this module stays pure aggregation.
//
// ---------------------------------------------------------------------------
// WHAT THE INSTRUMENT IS (IN). prose-style.md §7 sync row: this paragraph
// also stands at the top of questions.ts, and an edit to one is owed to the
// other.
//
// A civilization at this tier does not own a telescope. It owns an
// INTERFEROMETER: many collectors across the home system, their signals
// correlated. An interferometer never records a picture, only correlations,
// so the archive is raw interference data centuries deep, and every image,
// spectrum and measurement anyone has ever read was COMPUTED out of it, under
// assumptions, by solving an inverse problem that has no unique answer.
//
//  - The STANDING READ reconstructs the cheap version of everything,
//    continuously, on every source in the sky. That is the board a detected
//    source already carries, and it costs nothing.
//  - A BOUGHT QUESTION re-derives the same archive under assumptions the
//    standing read cannot afford. Nothing new is collected; what is bought is
//    a deeper reconstruction of light already in hand.
//  - A PROJECT buys down one term of that inverse problem for good:
//    collecting area, baseline, element count, band, channel count, phase
//    reference, archive fidelity, correlator, nulling, shadows, neutrinos, a
//    borrowed lens. Those twelve terms are the axes below.
//  - COMPUTE IS FINITE BECAUSE IT IS ENERGY (Landauer), it DOES NOT AMORTIZE
//    (every source is its own search), and THE ANSWER DECAYS (a masker
//    improves on a cadence, forever). Hence an allocation with a ceiling
//    rather than a bank, and hence a recurring spend.
//  - QUESTIONS HAVE A COST AND NO CLOCK; PROJECTS HAVE BOTH. At swarm power
//    any search a mind would actually size finishes instantly, and the whole
//    cost is deciding what fraction of a star to point at one star. Duration
//    exists exactly where mass or light has to move, and is absent exactly
//    where nothing does (physics-audit.md P0-1's second leg).
// ---------------------------------------------------------------------------

import type { QuestionId } from "./questions";

export type ProjectId =
  | "deep-array"
  | "standing-survey"
  | "cold-band-refit"
  | "focal-line-observatory"
  | "long-baseline-optical"
  | "occultation-network"
  | "spectrograph-bank"
  | "pulsar-timing-array"
  | "neutrino-watch"
  | "cold-logic-annex"
  | "sky-vault"
  | "launch-beam"
  | "focal-line-constellation"
  // ── IN1 ──
  | "second-sightline"
  | "star-null"
  | "fill-the-plane"
  | "flicker-pair";

export type CostClass = "ambient" | "investment" | "endeavor" | "epochal";

/**
 * What KIND of work a project is (projects.md's families; technology.md's
 * message and deterrence are deliberately absent — message is a verb, the
 * contact ceremony, and deterrence is deferred). `bright` is in the type with
 * zero entries today so the first swarm stage is a catalog row and not a type
 * change, and so the client's `Record<ProjectFamily, …>` grouping is already
 * total for it.
 *
 * Family is ORTHOGONAL to `placement`: `sky-vault` and `cold-logic-annex` are
 * dark-family work that nonetheless moves an instrument axis, and both facts
 * are true at once.
 */
export type ProjectFamily = "instrument" | "dark" | "bright" | "carrier";

/**
 * The twelve terms of the reconstruction (see the header). Each is a short
 * ladder whose rung 0 is inherited at placement (AXES below) and whose later
 * rungs are catalog entries. Rungs are NAMED, never numbered: no rung index
 * exists in this data, so no surface can render one.
 */
export type InstrumentAxis =
  | "collecting-area"
  | "baseline"
  | "elements"
  | "band"
  | "channels"
  | "phase-reference"
  | "archive"
  | "correlator"
  | "nulling"
  | "shadows"
  | "neutrinos"
  | "borrowed-lens";

/**
 * Which term of the reconstruction a project moves, and which rung it follows.
 * A DISCRIMINATED UNION rather than an optional `axis?:` field, deliberately:
 * an optional field is satisfied by forgetting it, and a required union makes
 * `standing-survey` and `launch-beam` SAY `{ on: "none" }`. `after` lives
 * inside the axis arm, so "a rung with a predecessor but no axis" cannot be
 * written at all. `after: null` opens an axis: its predecessor is the
 * inherited rung, which every civilization already holds.
 */
export type AxisPlacement =
  | { readonly on: "axis"; readonly axis: InstrumentAxis; readonly after: ProjectId | null }
  | { readonly on: "none" };

/** A type-level assertion: instantiating it with anything but `never` fails
 *  the typecheck. Used below to keep an order tuple total against the key set
 *  it claims to order, in both directions. */
export type AssertNever<T extends never> = T;

/**
 * Four effect kinds (content.md PART 2, synthesis.md §4). Each project
 * carries exactly one. `question-discount` reduces a question's
 * costCompute; `probe-haste` replaces the canonical 0.1c cruise fraction
 * with the MAXIMUM across landed projects (never summed); `confidence-lift`
 * raises the floor under a signal's confidence, never the value itself.
 *
 * There is no effect that moves a question's clock, and there cannot be one:
 * a question answers the year it is bought (physics-audit.md P0-1), so a
 * finer instrument buys a cleaner measurement, which takes less inference to
 * solve — a discount, not a countdown.
 */
export type ProjectEffect =
  | { readonly kind: "compute-income"; readonly addRatePerYear: number }
  | {
      readonly kind: "question-discount";
      readonly questionIds: readonly QuestionId[];
      readonly percent: number;
    }
  | { readonly kind: "probe-haste"; readonly cruiseFractionOfC: number }
  | { readonly kind: "confidence-lift"; readonly addConfidence: number };

export interface ProjectDef {
  readonly id: ProjectId;
  readonly label: string;
  /**
   * The project's name as it reads inside a sentence — `label` is a verb
   * phrase ("Rebuild the spectrograph bank") and cannot be dropped into
   * running text. questions.ts's provenance lines name the granting
   * project this way ("granted by the spectrograph bank"), exactly as
   * questions.ts's own `proseName` serves the report's record sentences.
   */
  readonly proseName: string;
  readonly line: string;
  /**
   * The grant, said plainly — what landing this project actually does, in
   * the observatory's deadpan (wit 0, numbers exact). `line` is the pitch;
   * this is the receipt. It rides the wire on ProjectSnapshot so the client
   * never needs the effect union to explain a project to the player.
   */
  readonly effectLine: string;
  readonly costClass: CostClass;
  readonly costCompute: number;
  readonly durationYears: number;
  /** What kind of work this is. Required, so a new entry cannot reach the
   *  player's page ungrouped. */
  readonly family: ProjectFamily;
  /** Which term of the reconstruction it moves, and what it follows.
   *  Required and discriminated: see AxisPlacement. */
  readonly placement: AxisPlacement;
  /**
   * HOW IT WORKS, on the project sheet (and on nothing else). The physics
   * this buys, in the observatory's deadpan. §2: 60 words, aim 40, wit 0.
   * Numbers are constants of nature spelled in words ("five hundred and fifty
   * astronomical units") and NEVER a restated code field: a block that names
   * a `costCompute`, `durationYears`, `addRatePerYear`, `percent` or
   * `cruiseFractionOfC` owes `scripts/audit-facts.mjs` a coupling the same
   * commit. `audit:axes` grep-checks all four of these fields for digits.
   */
  readonly howLine: string;
  /**
   * WHAT IT CHANGES, on the project sheet. Which term of the reconstruction
   * this moves, in words. §2: 24 words, aim 16, wit 0. R-42's block: what
   * building it would CHANGE, never what the thing is.
   */
  readonly changesLine: string;
  /**
   * IN THE SKY, on the project sheet. What an observer elsewhere reads once
   * this is standing (technology.md's own field). §2: 30 words, aim 20, wit 0.
   */
  readonly skyLine: string;
  /**
   * The report's technical body under a `project-landed` record
   * (ReportEntry.detail). PAST TENSE, and an account rather than a pitch:
   * `howLine` explains, this records. §2: 60 words, aim 40, wit 0, R-33a
   * undated, and it names no quantity, so no audit:facts coupling is owed.
   * It rides ProjectSnapshot exactly as `effectLine` does, and report.ts
   * FREEZES it at landing: resolve-at-read would let a later catalog edit
   * rewrite what year 212 said.
   */
  readonly landedLine: string;
  readonly effect: ProjectEffect;
}

/**
 * The full v1 project catalog, in menu order. There are no capacity slots:
 * a player with the compute may start all four in the same minute — the
 * catalog having four entries is four distinct things, not a cap. What
 * creates the decision is the balance (cost and duration against a finite,
 * slowly-accruing allocation), not a concurrency limit.
 *
 * The four shipped entries stay untouched; nine more append after them
 * (content.md PART 2) — five instrument-family Investments that discount or
 * hasten specific questions, then four Endeavor/Epochal-tier entries that
 * touch income, all six questions, probe speed, and the confidence floor.
 * `cold-logic-annex` is priced at 2100 (not content.md's flagged 1600) per
 * synthesis.md §4, keeping `focal-line-observatory` the better compute-per-
 * point rate at the same tier.
 *
 * IN1 appends four more at the end of the menu, all `question-discount` and
 * all on an instrument axis (build-instruments.md decision 4). No shipped
 * number changes.
 */
export const PROJECTS: readonly ProjectDef[] = [
  {
    id: "deep-array",
    label: "Extend the deep array",
    proseName: "the deep array",
    line: "More collecting area, and more patience. The data is the easy part; the inference is the spend.",
    effectLine: "Raises the compute income by 6 a year, for good.",
    costClass: "investment",
    costCompute: 220,
    durationYears: 20,
    family: "instrument",
    placement: { on: "axis", axis: "collecting-area", after: null },
    howLine:
      "More collectors on the same geometry. Each one adds light to every pair it joins, and the faintest thing separable from noise falls as the total area rises. The correlations arrive in proportion; so does the work of turning them into a measurement, which is what the extension is actually for.",
    changesLine:
      "The noise floor, on every source at once, and the inference standing behind it. Faint sources stop being unreachable and start being affordable.",
    skyLine:
      "Nothing, once it is standing. Assembly at this scale throws shadows across the home star that a patient observer elsewhere could count, and then it stops.",
    landedLine:
      "The array carries more collectors than it did, and every pair among them lands more light. Sources that sat under the noise floor now sit above it, and what limits them is no longer the light but the thinking done about it.",
    effect: { kind: "compute-income", addRatePerYear: 6 },
  },
  {
    id: "standing-survey",
    label: "Commission the standing survey",
    proseName: "the standing survey",
    line: "Every system inside the neighborhood, characterized to a fixed depth, on a schedule. A null result means something once you know where you looked.",
    effectLine: "Raises the compute income by 8 a year, for good.",
    costClass: "investment",
    costCompute: 420,
    durationYears: 40,
    family: "instrument",
    // A campaign run ON the hardware, not hardware: instrument-family, on no
    // axis. The page lists it beside the axes as a program.
    placement: { on: "none" },
    howLine:
      "The same collectors, pointed on a schedule instead of on interest. Every system inside the chosen radius is characterized to the same depth, in a fixed rotation, whether or not anything has ever been noticed there. What changes is where it looks, and for how long.",
    changesLine:
      "Completeness. A place you never looked at and a place you looked at and found empty stop being the same entry.",
    skyLine:
      "Nothing. Watching is the one thing that costs an observer no visibility at all, which is why every civilization does it and none of them can tell.",
    landedLine:
      "The rotation runs on its own schedule now, every system inside the radius held to the same depth whether anything was ever seen there. The catalog it fills is a map with its holes marked, which is the only kind a null result can be read from.",
    effect: { kind: "compute-income", addRatePerYear: 8 },
  },
  {
    id: "cold-band-refit",
    label: "Refit the array to the cold band",
    proseName: "the cold-band refit",
    line: "Thermal steadiness is the tell nature does not fake. The refit costs a season of sight to buy the band back sharper.",
    effectLine: "Raises the compute income by 12 a year, for good.",
    costClass: "investment",
    costCompute: 900,
    durationYears: 60,
    family: "instrument",
    placement: { on: "axis", axis: "band", after: null },
    howLine:
      "Optics and detectors rebuilt for the wavelengths below the ones the array was made for, and the instrument itself chilled until its own glow stops competing with what it is trying to see. Cold objects radiate down there.",
    changesLine:
      "The band, and with it the class of things that are cold rather than dark. Warmth outside the instrument's old reach becomes a reading.",
    skyLine:
      "Nothing. The refit is work done inside the array's own housings, and the array was invisible before it and is invisible after.",
    landedLine:
      "The array reads below the band it was built for, and reads it cold: the housings sit near the temperature of the sky behind them, so the instrument's own warmth no longer stands between it and the cold things it was refitted to find.",
    effect: { kind: "compute-income", addRatePerYear: 12 },
  },
  {
    id: "focal-line-observatory",
    label: "Emplace a focal-line observatory",
    proseName: "the focal-line observatory",
    line: "An instrument riding the star's own focal line, hundreds of astronomical units downstream. The lens was free. The years are not.",
    effectLine: "Raises the compute income by 24 a year, for good.",
    costClass: "endeavor",
    costCompute: 2400,
    durationYears: 120,
    family: "instrument",
    placement: { on: "axis", axis: "borrowed-lens", after: null },
    howLine:
      "A star bends the light that grazes it, and everything passing close comes back together on a line beginning five hundred and fifty astronomical units downstream. Stand on that line and the star is the objective, at an aperture no built mirror approaches. The target arrives as a ring, and the image is recovered from the ring.",
    changesLine:
      "Gain, on one bearing. Everything on that line resolves; nothing off it does, and aiming elsewhere is a translation of hundreds of astronomical units.",
    skyLine:
      "Nothing. A cold speck a long way from anything, radiating less than the dust around it. Nobody being looked at can tell, and that is also true of us.",
    landedLine:
      "An instrument stands on the star's focal line, far past the outer bodies, holding one bearing. The star is the objective now; the ring drawn around it is the datum, and everything on that bearing resolves at an aperture nothing built could match.",
    effect: { kind: "compute-income", addRatePerYear: 24 },
  },
  {
    id: "long-baseline-optical",
    label: "Open the long baseline",
    proseName: "the long baseline",
    line: "Two collectors an astronomical unit apart, holding phase to a fraction of a wavelength. Resolution was never about the mirror, only about how far apart you are willing to stand.",
    effectLine: "WEIGH IT and CATCH ITS EDGES cost 30% less compute, on every study.",
    costClass: "investment",
    costCompute: 380,
    durationYears: 30,
    family: "instrument",
    placement: { on: "axis", axis: "baseline", after: null },
    howLine:
      "Two collectors held an astronomical unit apart, their light brought together with the path lengths matched to a fraction of a wavelength. At that spacing a pair splits detail no single aperture anyone could fly would reach.",
    changesLine:
      "Resolution, on everything. A source that was a point becomes a point with structure, which is what a mass and an edge are measured from.",
    skyLine:
      "Nothing. Two cold collectors holding station a long way apart, each of them smaller than the ordinary rubble around them.",
    landedLine:
      "Two collectors hold station an astronomical unit apart with their paths matched to a fraction of a wavelength. What the array resolves is set by that separation now, and the old limit, the size of any single mirror, has stopped being the limit.",
    effect: { kind: "question-discount", questionIds: ["weigh-it", "catch-its-edges"], percent: 30 },
  },
  {
    id: "occultation-network",
    label: "Spread the occultation net",
    proseName: "the occultation net",
    line: "Stations strung across the whole system, so that when a foreground body clips a distant source, somebody is always standing in the shadow.",
    effectLine: "TIME ITS SHADOWS costs 50% less compute, on every study.",
    costClass: "investment",
    costCompute: 300,
    durationYears: 25,
    family: "instrument",
    placement: { on: "axis", axis: "shadows", after: null },
    howLine:
      "Receiving stations spread the width of the system, so that whichever narrow track a foreground body's shadow sweeps, somebody is standing inside it. A crossing seen from within the track gives a chord, and chords from separate stations give the size and the path.",
    changesLine:
      "Coverage, on crossings. A dimming that used to be one number becomes a shape and a schedule, and a missed crossing stops being missed.",
    skyLine:
      "Nothing. Stations built to receive, spread thin and running cold; the shadow they stand in was cast by something else.",
    landedLine:
      "Stations stand across the width of the system now, so a shadow track that used to sweep between the collectors has someone in it. A crossing gives a chord where it used to give a dip, and several chords give a body.",
    effect: { kind: "question-discount", questionIds: ["time-its-shadows"], percent: 50 },
  },
  {
    id: "spectrograph-bank",
    label: "Rebuild the spectrograph bank",
    proseName: "the spectrograph bank",
    line: "Split the light finer, and comb it against a frequency standard that does not drift, until a spectrum stops being a color and becomes a list of names.",
    effectLine: "READ ITS LINES costs 40% less compute, on every study.",
    costClass: "investment",
    costCompute: 340,
    durationYears: 25,
    family: "instrument",
    placement: { on: "axis", axis: "channels", after: null },
    howLine:
      "The light is divided before it is reconstructed, each narrow slice reduced on its own and measured against a comb of reference frequencies that does not drift. A composition shows as narrow lines; a sum across the whole band is the operation that erased them.",
    changesLine:
      "Channel count. Worked air can be told from ordinary air.",
    skyLine:
      "Nothing. A rebuild inside the housings of an instrument that never emitted anything to begin with.",
    landedLine:
      "The archive's light now splits to thousands of channels against a frequency comb that does not drift, so a reconstruction that was one broad band is one per line, and a spectrum stops being a color and becomes a list of names.",
    effect: { kind: "question-discount", questionIds: ["read-its-lines"], percent: 40 },
  },
  {
    id: "pulsar-timing-array",
    label: "Enlist the pulsar clocks",
    proseName: "the pulsar clocks",
    line: "A few dozen dead stars spinning with the steadiness of an atomic clock, older than the world we came from, adopted as the frame everything else gets measured against.",
    effectLine: "WEIGH IT and TIME ITS SHADOWS cost 30% less compute, on every study.",
    costClass: "investment",
    costCompute: 520,
    durationYears: 45,
    family: "instrument",
    placement: { on: "axis", axis: "phase-reference", after: null },
    howLine:
      "The pulses of a few dozen collapsed stars arrive on a schedule older than anything local. Timing every collector against them puts the whole array, and the whole archive, on one frame that does not wander.",
    changesLine:
      "The frame. Positions and arrival times taken centuries apart become comparable, so a swing and a schedule can be fitted across the whole record.",
    skyLine:
      "Nothing. The pulses were arriving anyway, and adopting them as a clock puts nothing new into the sky.",
    landedLine:
      "The array keeps time against dead stars now. Every collector, and every epoch in the archive behind it, sits on one frame that neither drifts nor was made here, which is the condition for adding old light to new.",
    effect: {
      kind: "question-discount",
      questionIds: ["weigh-it", "time-its-shadows"],
      percent: 30,
    },
  },
  {
    id: "neutrino-watch",
    label: "Sink the neutrino watch",
    proseName: "the neutrino watch",
    line: "A volume of cold matter deep enough to catch the particles that pass through everything else: heat can be shaped and delayed and diluted, and none of that touches a neutrino.",
    // R-42: every other effectLine here says what changes ("Raises the
    // compute income by 6 a year"); this named an instrument behaviour and
    // left the player to derive what it buys.
    effectLine:
      "Holds every signal's confidence five points higher, so fewer readings stay too faint to trust.",
    costClass: "investment",
    costCompute: 640,
    durationYears: 50,
    family: "instrument",
    placement: { on: "axis", axis: "neutrinos", after: null },
    howLine:
      "A volume of cold matter sunk deep enough that nothing but a neutrino reaches it, instrumented to catch the rare one that interacts. Neutrinos leave a fusing core directly and pass through everything after.",
    changesLine:
      "A second channel, independent of light. Readings that light alone left too faint to trust get a check nothing built can stage.",
    skyLine:
      "Nothing. A volume of cold matter under a great deal of rock, receiving; there is no version of this that emits.",
    landedLine:
      "The watch is sunk and running. What it catches is not light and cannot be dressed: a core either fuses or it does not, and the particles that say so arrive through the rock, the shell and the mask alike.",
    effect: { kind: "confidence-lift", addConfidence: 0.05 },
  },
  {
    id: "cold-logic-annex",
    label: "Cool the inference annex",
    proseName: "the inference annex",
    line: "Thinking costs less the colder it is done, so the annex runs near the floor of what the universe permits: slow thoughts, and a very great many of them at once.",
    effectLine: "Raises the compute income by 30 a year, for good.",
    costClass: "endeavor",
    // content.md flags 1600; raised to 2100 per synthesis.md §4's tuning
    // call, keeping focal-line-observatory the better compute-per-point
    // rate at this tier.
    costCompute: 2100,
    durationYears: 90,
    // Dark-family work that nonetheless moves an instrument axis. Family says
    // what kind of work it is; placement says which term it moves.
    family: "dark",
    placement: { on: "axis", axis: "correlator", after: null },
    howLine:
      "Erasing a bit of information costs energy in proportion to the temperature it is erased at, and nothing in physics forgives that. The annex is moved down toward the temperature of the sky and run slowly on purpose: the same correlations, at a fraction of the heat, so more of them fit inside the same energy.",
    changesLine:
      "The correlator, which is the ceiling under everything else. More of the sky can be reasoned about at once, for the same energy.",
    skyLine:
      "A patch of infrared where there was none, and nothing else. Warmth without light reads the same from far away as a cooling remnant does.",
    landedLine:
      "The annex runs cold and slow. Its erasures are paid for at a temperature near the sky's, which is the only place the price of thinking gets cheaper, and the correlations it can hold at once went up accordingly.",
    effect: { kind: "compute-income", addRatePerYear: 30 },
  },
  {
    id: "sky-vault",
    label: "Commit the sky to the Vault",
    proseName: "the Vault",
    line: "Every arrival kept whole and referenced for as long as there is anyone left to ask, because a question put to a thousand years of record is half answered before it is bought.",
    effectLine: "Every question on every study costs 20% less compute.",
    costClass: "endeavor",
    costCompute: 2200,
    durationYears: 110,
    // Dark family, ARCHIVE axis — the same orthogonality the annex above has.
    family: "dark",
    placement: { on: "axis", axis: "archive", after: null },
    howLine:
      "What lands is kept whole: not the images the standing read made, but the correlations they were made from, indexed and referenced so any of it can be found again. A reconstruction is an assumption applied to data; keeping only reconstructions throws the data away.",
    changesLine:
      "Every question's starting point. A question asked now can be asked of centuries of light nobody thought to ask it of then.",
    skyLine:
      "Nothing. Passive storage with no moving parts, drawing almost no power; the Vault is the rare large work that casts no shadow anyone can read.",
    landedLine:
      "The arrivals are kept as they arrived. What the archive holds is no longer a shelf of finished answers but the correlations underneath them, so a question put to it reaches back as far as the record does.",
    effect: {
      kind: "question-discount",
      questionIds: [
        "weigh-it",
        "temperature-over-time",
        "read-its-lines",
        "time-its-shadows",
        "catch-its-edges",
        "listen-off-axis",
      ],
      percent: 20,
    },
  },
  {
    id: "launch-beam",
    label: "Raise the launch beam",
    proseName: "the launch beam",
    line: "A phased emitter that pushes a departing sail through the first months of its flight, so a probe leaves faster than anything it could have carried the fuel to become.",
    effectLine: "Probes launched after this cruise at an eighth of lightspeed, up from a tenth.",
    costClass: "endeavor",
    costCompute: 3200,
    durationYears: 140,
    family: "carrier",
    placement: { on: "none" },
    howLine:
      "A phased emitter at home pushes a sail through the opening stretch of its flight, so the energy for the crossing stays behind and only the payload leaves. A probe that carries its own fuel must accelerate that fuel as well; this one does not.",
    changesLine:
      "Cruise speed, on everything launched after it. A crossing longer than any plan becomes one a plan can hold.",
    skyLine:
      "The loudest thing here. A beam is invisible to everyone except whoever stands in it, and whoever stands in it sees exactly where it came from.",
    landedLine:
      "The emitter stands and the sails leave under it. The energy for a crossing is spent at home and radiated at the departing ship, so what leaves carries instrument and no fuel, and arrives sooner for it.",
    effect: { kind: "probe-haste", cruiseFractionOfC: 0.125 },
  },
  {
    id: "focal-line-constellation",
    label: "Ring the focal line",
    proseName: "the focal-line ring",
    line: "One instrument on the focal line for every bearing worth watching, out beyond five hundred and fifty astronomical units, with the star itself for a lens. After this, nothing in this sky is a smudge to anyone here again.",
    // R-42, the five-point line's reasoning at the catalog's top end.
    effectLine:
      "Holds every signal's confidence ten points higher, so fewer readings stay too faint to trust.",
    costClass: "epochal",
    costCompute: 9000,
    durationYears: 320,
    family: "instrument",
    placement: { on: "axis", axis: "borrowed-lens", after: "focal-line-observatory" },
    howLine:
      "One focal line serves one bearing, and a sky has many. Each new instrument rides the line the star draws behind a different target, out past five hundred and fifty astronomical units, where the focus begins and then never ends: standing farther out only deepens it.",
    changesLine:
      "Gain, on every bearing at once. A reading too faint to trust becomes a reading, on anything in this sky.",
    skyLine:
      "Nothing, in every direction at once. Specks strung down many focal lines, each colder than the dust around it and none of them emitting.",
    landedLine:
      "Instruments stand on focal lines in every direction worth watching. Each of them borrows the same star for an objective and looks down a different bearing, and nothing in this sky has to be reported as a smudge again.",
    effect: { kind: "confidence-lift", addConfidence: 0.1 },
  },
  // ── IN1: four entries, all question-discount, no new effect kind. Priced
  // against the shipped ladder (build-instruments.md decision 4): every stack
  // they touch clears 0.30 without EFFECT_KEEP_FLOOR's help, and no duration
  // collides with a shipped one.
  {
    id: "second-sightline",
    label: "Set the second sightline",
    proseName: "the second sightline",
    line: "A second station, far enough off the line that its light arrives through different medium. What one sightline can only guess at, two sightlines solve.",
    effectLine: "LISTEN OFF-AXIS costs 40% less compute, on every study.",
    costClass: "investment",
    costCompute: 800,
    durationYears: 70,
    family: "instrument",
    placement: { on: "axis", axis: "phase-reference", after: "pulsar-timing-array" },
    howLine:
      "The medium between here and a source smears the phase, and one sightline cannot tell smearing from the source's own motion. A station far enough off the line looks through different medium at the same source; what the two disagree about is the medium, and that can be solved instead of assumed.",
    changesLine:
      "The coherent span. Trial phase models stop having to cover the medium's guesswork, so a bank that was unaffordably wide gets narrow.",
    skyLine:
      "Nothing. One more cold station holding a position a long way off the line, receiving, like everything else here.",
    landedLine:
      "A station holds position far off the line, watching the same sources through different medium. The scattering that used to be absorbed into the phase model is now measured, and the trial banks that stack the archive are narrower for it.",
    effect: { kind: "question-discount", questionIds: ["listen-off-axis"], percent: 40 },
  },
  {
    id: "star-null",
    label: "Null the star",
    proseName: "the star null",
    line: "Interfere the star's own light against itself until it cancels, and leave everything standing beside it untouched. The hard part was never the planet; it was the glare.",
    effectLine: "TAKE ITS TEMPERATURE and READ ITS LINES cost 25% less compute, on every study.",
    costClass: "endeavor",
    costCompute: 1500,
    durationYears: 80,
    family: "instrument",
    placement: { on: "axis", axis: "nulling", after: null },
    howLine:
      "The light of the star reaches the combiner by two paths cut to arrive exactly out of step, so it cancels itself. Anything a little off to the side arrives at a different angle, does not cancel, and survives. The glare is removed in the optics, where removing it is possible.",
    changesLine:
      "Contrast. What stands beside a star can be measured on its own terms instead of dug out of the star's own light.",
    skyLine:
      "Nothing. Cancelling a star's light is done inside our own instrument, and the star is unaffected.",
    landedLine:
      "The combiner cancels a star against itself before anything downstream sees it. What stands beside the star arrives on its own, and a measurement of a companion is no longer a measurement made through glare.",
    effect: {
      kind: "question-discount",
      questionIds: ["temperature-over-time", "read-its-lines"],
      percent: 25,
    },
  },
  {
    id: "fill-the-plane",
    label: "Fill the plane",
    proseName: "the filled plane",
    line: "Every pair of collectors is another baseline, and pairs climb faster than collectors. Fill the gaps and every reconstruction has fewer ways to be wrong.",
    effectLine:
      "WEIGH IT, READ ITS LINES, CATCH ITS EDGES and LISTEN OFF-AXIS cost 15% less compute, on every study.",
    costClass: "endeavor",
    costCompute: 1400,
    durationYears: 100,
    family: "instrument",
    placement: { on: "axis", axis: "elements", after: null },
    howLine:
      "Every pair of collectors is a baseline, so the count of baselines rises with the square of the count of collectors: every element added brings as many new baselines as there were elements before it. Each fills a spacing the array was blind to, and every gap filled is one fewer thing the reconstruction has to invent.",
    changesLine:
      "Sampling, under everything reconstructed as an image. Fewer images fit the same data, so every reconstruction has less to invent and less to search.",
    skyLine:
      "Nothing standing, and shadows while it is built. Elements at this count cross the star often enough that a patient observer elsewhere could count them going up.",
    landedLine:
      "The gaps between the array's spacings are filled. Every pair of elements is a baseline, and the pairs now outnumber the elements many times over, so a reconstruction has far fewer ways to be wrong and still fit.",
    effect: {
      kind: "question-discount",
      questionIds: ["weigh-it", "read-its-lines", "catch-its-edges", "listen-off-axis"],
      percent: 15,
    },
  },
  {
    id: "flicker-pair",
    label: "Pair the flicker",
    proseName: "the flicker pair",
    line: "Two crude collectors light-hours apart, comparing not the light but its flicker. Phase is lost for good; the baseline is longer than anything else here will reach.",
    effectLine: "CATCH ITS EDGES costs 35% less compute, on every study.",
    costClass: "endeavor",
    costCompute: 1800,
    durationYears: 160,
    family: "instrument",
    placement: { on: "axis", axis: "baseline", after: "long-baseline-optical" },
    howLine:
      "Two plain collectors light-hours apart, each recording only how the brightness flickers, and the two records multiplied together. Light from one source flickers in step at both ends, and how quickly that agreement falls off with separation gives the source's size.",
    changesLine:
      "Baseline, past where phase can be held. Sizes and shapes at a separation nothing else reaches, and no image at the end of it.",
    skyLine:
      "Nothing. Two crude collectors, far apart, each doing nothing an observer could distinguish from a rock at the same temperature.",
    landedLine:
      "Two collectors stand light-hours apart and compare flicker rather than phase. The pair reaches a separation no coherent link could hold, and what comes back from it is a size and a shape, never a picture.",
    effect: { kind: "question-discount", questionIds: ["catch-its-edges"], percent: 35 },
  },
];

/** Takes `string` so handlers validate untrusted input without a cast. */
export function projectById(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/** Runtime membership for `ProjectFamily`. The one consumer is protocol.ts's
 *  `sky` parse, which cannot import this module (a catalog in the client
 *  bundle), so it keeps its own list beside its own guard; this one is here
 *  for server-side callers and for `audit:axes`. */
export const PROJECT_FAMILIES: readonly ProjectFamily[] = [
  "instrument",
  "dark",
  "bright",
  "carrier",
];

export function isProjectFamily(x: unknown): x is ProjectFamily {
  return typeof x === "string" && (PROJECT_FAMILIES as readonly string[]).includes(x);
}

// ---------------------------------------------------------------------------
// The instrument's twelve axes, and their inherited rung 0.
//
// RUNG 0 IS NOT A PROJECT. It has no cost, no clock, no effect and no
// `ProjectId`, so `StartedProject.id` cannot hold one AT COMPILE TIME and
// every aggregator below (which loops `started` and resolves through
// `projectById`) is untouched by this whole block: zero lines.
// ---------------------------------------------------------------------------

export interface AxisDef {
  readonly id: InstrumentAxis;
  /** Chrome, ALL CAPS, ≤ 6 words (R-24). The client renders LEANS ON and the
   *  axis headings from these, so the labels are single-sourced. */
  readonly label: string;
  /** What this term of the reconstruction actually sets, in one line. */
  readonly axisLine: string;
  /** What the civilization already holds on this axis at placement: a label
   *  and a paragraph, and nothing else. Never purchasable, never in
   *  `started`, never a `ProjectSnapshot`. */
  readonly inherited: {
    readonly label: string;
    readonly description: string;
  };
}

/**
 * A mapped type over the twelve literal keys, so an axis with no rung 0 does
 * not compile and `AXES[axis]` is an `AxisDef` rather than `| undefined`
 * under `noUncheckedIndexedAccess`.
 */
export const AXES: Readonly<Record<InstrumentAxis, AxisDef>> = {
  "collecting-area": {
    id: "collecting-area",
    label: "COLLECTING AREA",
    axisLine:
      "How much light the array gathers at once. It sets how faint a thing can be and still be separated from noise.",
    inherited: {
      label: "THE INHERITED ARRAY",
      description:
        "Collectors across the whole home system, added to for centuries and never taken down. Photons are free, and the array takes all of them it can stand under. What it cannot do is think about them faster: more light landing is more inference owed, and the inference is what runs out.",
    },
  },
  baseline: {
    id: "baseline",
    label: "BASELINE",
    axisLine:
      "How far apart two collectors stand. Distance between them, not the size of either, sets how fine a detail the pair can separate.",
    inherited: {
      label: "SYSTEM-SCALE",
      description:
        "System-scale. The collectors stand as far apart as the home system is wide, and a pair that far apart resolves what a single mirror the size of the system would. Past this, resolution is bought by standing farther apart, and every step outward is paid in phase.",
    },
  },
  elements: {
    id: "elements",
    label: "ELEMENTS",
    axisLine:
      "How many collectors the array has. Every pair is one more baseline, so the count sets how much is sampled rather than guessed.",
    inherited: {
      label: "SPARSE",
      description:
        "Sparse. Enough collectors to hold a baseline, not enough to fill the space between the pairs, so the array samples the sky at scattered spacings and the reconstruction has to invent whatever falls between them. Every gap is a family of images that fit the data equally well.",
    },
  },
  band: {
    id: "band",
    label: "BAND",
    axisLine:
      "Which wavelengths the array can see at all. Everything outside the band is not faint here; it is absent.",
    inherited: {
      label: "VISIBLE AND NEAR-INFRARED",
      description:
        "Visible light and the near infrared: the band the first instruments were built for, and the band in which a star drowns everything standing beside it. Colder things radiate below it, and the array meets that light with optics and detectors that were never meant for it.",
    },
  },
  channels: {
    id: "channels",
    label: "CHANNELS",
    axisLine:
      "How finely the band is divided. One channel gives a color; thousands give the lines that name what the light passed through.",
    inherited: {
      label: "BROADBAND",
      description:
        "Broadband. The light is summed across the whole band before anything is reconstructed, which is what makes the standing read affordable: one reconstruction, not one per color. A composition is a set of narrow lines, and a sum across the band is exactly the operation that erases them.",
    },
  },
  "phase-reference": {
    id: "phase-reference",
    label: "PHASE REFERENCE",
    axisLine:
      "The clock every collector's timing is measured against. It sets how long a stretch of archive can be added in step instead of blindly.",
    inherited: {
      label: "LOCAL CLOCKS",
      description:
        "Local clocks. Good enough that the array's own pairs stay in step across a run, and not good enough to say what the phase was a century ago. Stacking beyond a clock's memory has to guess the phase, and a guessed phase adds like noise.",
    },
  },
  archive: {
    id: "archive",
    label: "ARCHIVE",
    axisLine:
      "What is kept, and in what form. Keeping the raw interference lets a question be re-asked of old light; keeping only answers does not.",
    inherited: {
      label: "REDUCED PRODUCTS",
      description:
        "Reduced products. What the standing read produced was kept: images, curves, spectra, each one a reconstruction made under the assumptions of the year it was made. The interference data behind them was not kept, so a question asked now can only be asked of somebody else's answers.",
    },
  },
  correlator: {
    id: "correlator",
    label: "CORRELATOR",
    axisLine:
      "The machinery that multiplies every collector's signal against every other. Where the archive becomes a measurement, and its temperature is what that costs.",
    inherited: {
      label: "RUN WARM",
      description:
        "The annex, run warm. Every pair of collectors has to be multiplied against every other pair, continuously, for every source in the sky, and the annex does it at the temperature of the machinery around it. Erasing a bit costs energy in proportion to that temperature, and the bill is the ceiling.",
    },
  },
  nulling: {
    id: "nulling",
    label: "NULLING",
    axisLine:
      "Cancelling a bright source's own light in the optics so that whatever stands beside it survives the reconstruction.",
    inherited: {
      label: "NONE",
      description:
        "None. The star and everything beside it arrive in the same reconstruction, and the star outshines its neighbors by a margin no subtraction afterwards recovers. Suppression is cheap in the optics and impossible in the arithmetic, so every measurement of a companion is made through the glare.",
    },
  },
  shadows: {
    id: "shadows",
    label: "SHADOWS",
    axisLine:
      "Standing where a crossing body's shadow actually falls. A dimming measured from inside the track carries a size; measured from outside it carries nothing.",
    inherited: {
      label: "NONE",
      description:
        "None. A body crossing in front of a distant source casts a shadow that sweeps one narrow track, and a shadow is only measured by something standing in it. The array's collectors sit where the baseline wanted them, not where the tracks fall, so most crossings sweep through the space between them.",
    },
  },
  neutrinos: {
    id: "neutrinos",
    label: "NEUTRINOS",
    axisLine:
      "A second channel that is not light. Neutrinos leave a fusing core directly, and no mask, shell or shaping alters what they carry.",
    inherited: {
      label: "NONE",
      description:
        "None. Everything the array knows arrives as light, and light is the one channel a civilization can shape: heat can be delayed, spread, and pointed away from you. A star's fusion and a reactor's both leak neutrinos, and nothing anyone builds can stop them or fake them.",
    },
  },
  "borrowed-lens": {
    id: "borrowed-lens",
    label: "THE BORROWED LENS",
    axisLine:
      "Using a star's gravity as the objective of a telescope. The aperture is not built and not paid for; the standing place is.",
    inherited: {
      label: "NONE",
      description:
        "None. Every aperture the array has was built, and a built aperture is bounded by what can be flown and held in figure. The largest lens in reach was never built: a star bends light around itself, and nobody is standing far enough downstream to catch what it focuses.",
    },
  },
};

/** Display order, the one place it lives. `as const` is load-bearing: the two
 *  assertions below would be vacuous against a `readonly InstrumentAxis[]`. */
export const AXIS_ORDER = [
  "collecting-area",
  "baseline",
  "elements",
  "band",
  "channels",
  "phase-reference",
  "archive",
  "correlator",
  "nulling",
  "shadows",
  "neutrinos",
  "borrowed-lens",
] as const satisfies readonly InstrumentAxis[];

/** Fails the typecheck if AXIS_ORDER misses an axis. Exported because an
 *  unexported type alias is an unused local (noUnusedLocals). */
export type AxisOrderIsTotal = AssertNever<
  Exclude<InstrumentAxis, (typeof AXIS_ORDER)[number]>
>;
/** ...and if it names one that is not an axis. */
export type AxisOrderIsKnown = AssertNever<
  Exclude<(typeof AXIS_ORDER)[number], InstrumentAxis>
>;

/**
 * The ladders, DERIVED rather than authored: partition PROJECTS by
 * `placement.axis` and chain each partition through `after`. Two properties
 * the brief's table had to be checked for become unstatable — every ladder id
 * is a real `ProjectDef` because ladders are built out of `ProjectDef`s, and
 * an axis-placed project is in exactly one ladder because it names exactly
 * one axis.
 *
 * What is left is chain well-formedness, and this THROWS on all of it: no
 * root, two roots, two rungs sharing a predecessor, an `after` naming an
 * unknown project or one on another axis, and a cycle (which shows up as a
 * chain that does not reach every rung). It throws AT MODULE LOAD rather than
 * lazily, because a lazy check leaves the malformed catalog readable by
 * `startProject` in the meantime. `npm run audit:axes` imports this module in
 * CI, so the first place a bad chain speaks is a red check and never a
 * Durable Object that will not boot.
 */
export function axisLadders(): Readonly<Record<InstrumentAxis, readonly ProjectId[]>> {
  const byAxis = {} as Record<InstrumentAxis, ProjectDef[]>;
  for (const axis of AXIS_ORDER) byAxis[axis] = [];
  for (const def of PROJECTS) {
    if (def.placement.on !== "axis") continue;
    byAxis[def.placement.axis].push(def);
  }
  const out = {} as Record<InstrumentAxis, readonly ProjectId[]>;
  for (const axis of AXIS_ORDER) out[axis] = ladderFor(axis, byAxis[axis]);
  return out;
}

function ladderFor(axis: InstrumentAxis, rungs: readonly ProjectDef[]): readonly ProjectId[] {
  if (rungs.length === 0) return [];
  const onThisAxis = new Set<string>(rungs.map((d) => d.id));
  /** predecessor id -> the rung that follows it. */
  const follows = new Map<string, ProjectId>();
  let root: ProjectId | null = null;
  for (const def of rungs) {
    if (def.placement.on !== "axis") continue; // unreachable: partitioned by axis
    const after = def.placement.after;
    if (after === null) {
      if (root !== null) {
        throw new Error(`axis ${axis}: ${root} and ${def.id} both open it`);
      }
      root = def.id;
      continue;
    }
    if (projectById(after) === undefined) {
      throw new Error(`axis ${axis}: ${def.id} follows ${after}, which is not a project`);
    }
    if (!onThisAxis.has(after)) {
      throw new Error(`axis ${axis}: ${def.id} follows ${after}, which is on another axis or none`);
    }
    const claimed = follows.get(after);
    if (claimed !== undefined) {
      throw new Error(`axis ${axis}: ${claimed} and ${def.id} both follow ${after}`);
    }
    follows.set(after, def.id);
  }
  if (root === null) {
    throw new Error(`axis ${axis}: no rung opens it; every rung names a predecessor`);
  }
  // `root` is never a VALUE in `follows` (its own `after` is null) and each
  // rung appears there at most once, so the walk is an injection started
  // outside its own image: it cannot revisit, and it terminates. A cycle
  // among the rest is simply unreachable, which the length check catches.
  const order: ProjectId[] = [root];
  for (let next = follows.get(root); next !== undefined; next = follows.get(next)) {
    order.push(next);
  }
  if (order.length !== rungs.length) {
    throw new Error(
      `axis ${axis}: ${rungs.length} rungs, but the chain from ${root} reaches ${order.length}`,
    );
  }
  return order;
}

/** Built once, at module load. See axisLadders. */
export const AXIS_LADDERS: Readonly<Record<InstrumentAxis, readonly ProjectId[]>> = axisLadders();

/** Base compute-per-game-year income before any ladder or project bonus. */
export const BASE_COMPUTE_RATE = 6;
/** Additional compute-per-game-year income per energy ladder stage. */
export const COMPUTE_RATE_PER_ENERGY_LADDER = 1;

/**
 * The attention ceiling, in years of income: uncommitted compute saturates
 * at ATTENTION_YEARS × the current income rate (attentionCapAt). The
 * constant is not arbitrary — 110 is the FLOOR at which the project ladder
 * can never wedge from the poorest start (energy ladder 0, rate 6/y),
 * whatever order income projects are taken in: the binding rung is the sky
 * vault at 2200, affordable straight after deep-array + standing-survey
 * (rate 20/y) only when 20 × ATTENTION_YEARS ≥ 2200. Raising it loosens
 * every squeeze at once; lowering it below 110 dead-ends a legal build
 * order. A freshly placed civ opens with its attention full (see
 * newProjectState), which replaces the old flat opening grant.
 */
export const ATTENTION_YEARS = 110;

/**
 * The base income rate, effective from a fixed game year. Frozen at
 * placement so a later retune of BASE_COMPUTE_RATE or
 * COMPUTE_RATE_PER_ENERGY_LADDER cannot rewrite a running civ's history.
 */
export interface IncomeGrant {
  readonly fromYear: number;
  readonly ratePerYear: number;
}

export interface StartedProject {
  readonly id: ProjectId;
  readonly startedYear: number;
}

/**
 * The capped-accrual anchor: the free total as it stood at the moment of
 * the last commit. Between anchors nothing discrete happens to the pool,
 * so freeComputeAt can integrate forward from here in closed form,
 * clamping to the ceiling piecewise. Without an anchor the ceiling could
 * not bite: a hoard above the cap would absorb spends invisibly (free
 * stays "cap" while the hoard drains), and no spend would be felt.
 */
export interface FreeAnchor {
  readonly asOfYear: number;
  readonly free: number;
}

export interface ProjectState {
  readonly version: 3;
  readonly openingCompute: number;
  readonly baseGrant: IncomeGrant;
  readonly started: readonly StartedProject[];
  /**
   * Monotonic total compute committed so far. A2.2's bought questions
   * deduct from this same field — one allocation, one sink. Since v3 this
   * is the historical record only; the live free total reads through
   * `freeAnchor`.
   */
  readonly committedCompute: number;
  /**
   * Null only on a state migrated from v2, whose spend history carries no
   * timestamps to replay: reads fall back to min(cap, uncapped legacy
   * total) — clamping any over-cap hoard once — until the first commit
   * writes a real anchor.
   */
  readonly freeAnchor: FreeAnchor | null;
}

/**
 * The pre-rename persisted shape, when the same pool was denominated in
 * "instrument hours". Retained solely so migrateProjectState can read a
 * civ placed before the rename; nothing else may reference it.
 */
interface ProjectStateV1 {
  readonly version: 1;
  readonly endowmentHours: number;
  readonly baseGrant: IncomeGrant;
  readonly started: readonly StartedProject[];
  readonly spentHours: number;
}

/** The pre-ceiling shape: same fields, no anchor. */
interface ProjectStateV2 {
  readonly version: 2;
  readonly openingCompute: number;
  readonly baseGrant: IncomeGrant;
  readonly started: readonly StartedProject[];
  readonly committedCompute: number;
}

export type StoredProjectState = ProjectState | ProjectStateV2 | ProjectStateV1;

/**
 * Bring a persisted state up to the current shape. v1→v3 carries the
 * rename's exact position across (hours become compute, same numbers);
 * v2→v3 adds a null anchor, so the civ's free total clamps to the ceiling
 * on first read and anchors on first spend. Callers persist the result so
 * the migration happens once.
 */
export function migrateProjectState(stored: StoredProjectState): ProjectState {
  if (stored.version === 3) return stored;
  if (stored.version === 2) return { ...stored, version: 3, freeAnchor: null };
  return {
    version: 3,
    openingCompute: stored.endowmentHours,
    baseGrant: stored.baseGrant,
    started: stored.started,
    committedCompute: stored.spentHours,
    freeAnchor: null,
  };
}

/** The game year a started project lands (finishes) and its effect turns on. */
export function landedYear(def: ProjectDef, p: StartedProject): number {
  return p.startedYear + def.durationYears;
}

/** Whether a started project has landed by `nowYear`. */
export function hasLanded(def: ProjectDef, p: StartedProject, nowYear: number): boolean {
  return nowYear >= landedYear(def, p);
}

/**
 * The compute-per-game-year income rate at `nowYear`: the base grant (once
 * its fromYear has arrived) plus every LANDED `compute-income` project's
 * addRatePerYear. Running-but-not-landed projects, and projects with a
 * different effect kind, contribute nothing to the rate.
 */
export function ratePerYearAt(state: ProjectState, nowYear: number): number {
  let rate = nowYear >= state.baseGrant.fromYear ? state.baseGrant.ratePerYear : 0;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "compute-income") continue;
    if (hasLanded(def, p, nowYear)) {
      rate += def.effect.addRatePerYear;
    }
  }
  return rate;
}

/** The attention ceiling at `atYear`: what the mind can hold uncommitted.
 *  Grows exactly when the income rate does — a landed income project
 *  raises both the refill speed and the pool it refills. */
export function attentionCapAt(state: ProjectState, atYear: number): number {
  return ATTENTION_YEARS * ratePerYearAt(state, atYear);
}

/** The pre-ceiling accrual total: opening allocation plus every income
 *  stream's accrual, minus everything committed — the v2 formula, kept as
 *  the fallback read for anchor-less (migrated) states. */
function uncappedFreeAt(state: ProjectState, nowYear: number): number {
  let total = state.openingCompute;
  total += state.baseGrant.ratePerYear * Math.max(0, nowYear - state.baseGrant.fromYear);
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "compute-income") continue;
    const lands = landedYear(def, p);
    total += def.effect.addRatePerYear * Math.max(0, nowYear - lands);
  }
  return total - state.committedCompute;
}

/** The years in (afterYear, toYear] at which the income rate changes: the
 *  base grant switching on, and each income project landing. These are the
 *  piece boundaries of the capped accrual — between them rate and ceiling
 *  are constant and the integration is one line. */
function rateChangeYears(state: ProjectState, afterYear: number, toYear: number): number[] {
  const years: number[] = [];
  const from = state.baseGrant.fromYear;
  if (from > afterYear && from <= toYear) years.push(from);
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "compute-income") continue;
    const lands = landedYear(def, p);
    if (lands > afterYear && lands <= toYear) years.push(lands);
  }
  return years.sort((a, b) => a - b);
}

/**
 * The FREE compute at `nowYear` — uncommitted attention, saturating at the
 * ceiling. From the last commit's anchor, integrate forward piecewise:
 * within each piece the rate (and so the ceiling) is constant, and the
 * total grows linearly until it hits the ceiling and stops. The clamp
 * never confiscates — a total already above a piece's ceiling (possible
 * only transiently, around a migration) simply stops growing rather than
 * being cut down. Anchor-less states (migrated from v2) read as
 * min(ceiling, v2 total): any over-cap hoard clamps once, and the first
 * commit anchors the state into the capped regime for good. Still derived
 * in closed form from the clock — no alarm, no drift.
 */
export function freeComputeAt(state: ProjectState, nowYear: number): number {
  const anchor = state.freeAnchor;
  if (anchor === null) {
    return Math.min(attentionCapAt(state, nowYear), uncappedFreeAt(state, nowYear));
  }
  if (nowYear <= anchor.asOfYear) return anchor.free;
  let free = anchor.free;
  let year = anchor.asOfYear;
  for (const next of [...rateChangeYears(state, year, nowYear), nowYear]) {
    if (next <= year) continue;
    const rate = ratePerYearAt(state, year);
    const cap = ATTENTION_YEARS * rate;
    free = Math.min(Math.max(cap, free), free + rate * (next - year));
    year = next;
  }
  return free;
}

/**
 * Commit compute against the one allocation. Bought questions and launched
 * missions deduct from the same monotonic field a started project does —
 * ProjectState.committedCompute's own comment already reserved this. Since
 * v3 this also writes the anchor the capped accrual integrates from, so
 * every spend is felt: the pool drops by the full amount and refills at
 * the income rate. Callers check affordability first (freeComputeAt >=
 * amount); the Math.max is a float guard, not a policy.
 */
export function commitCompute(state: ProjectState, amount: number, nowYear: number): ProjectState {
  const free = freeComputeAt(state, nowYear);
  return {
    ...state,
    committedCompute: state.committedCompute + amount,
    freeAnchor: { asOfYear: nowYear, free: Math.max(0, free - amount) },
  };
}

/**
 * Multiplies together `(1 - percent/100)` for every LANDED project whose
 * effect `select` resolves to a percent, at `atYear`. The result is a raw
 * keep fraction with NO floor applied — questions.ts's effective-cost/haste
 * helpers own the 25%-of-base floor, so this stays pure aggregation and
 * the floor is enforced in exactly one place.
 */
function stackedKeepFractionAt(
  state: ProjectState,
  atYear: number,
  select: (effect: ProjectEffect) => number | null,
): number {
  let keep = 1;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || !hasLanded(def, p, atYear)) continue;
    const percent = select(def.effect);
    if (percent === null) continue;
    keep *= 1 - percent / 100;
  }
  return keep;
}

/** The raw cost keep-fraction from every landed `question-discount` project
 *  naming `questionId`, at `atYear`. 1 means no discount landed yet. */
export function questionCostKeepFractionAt(
  state: ProjectState,
  questionId: QuestionId,
  atYear: number,
): number {
  return stackedKeepFractionAt(state, atYear, (effect) =>
    effect.kind === "question-discount" && effect.questionIds.includes(questionId)
      ? effect.percent
      : null,
  );
}

/**
 * The prose names of every LANDED `question-discount` project naming
 * `questionId` at `atYear` — the provenance behind the keep-fraction above,
 * in started order. questions.ts composes these into the receipt line under
 * a discounted cost row; the aggregation stays here so the two reads (how
 * much, and granted by whom) can never disagree about which projects count.
 */
export function questionGrantProseNamesAt(
  state: ProjectState,
  questionId: QuestionId,
  atYear: number,
): readonly string[] {
  const names: string[] = [];
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || !hasLanded(def, p, atYear)) continue;
    const effect = def.effect;
    if (effect.kind !== "question-discount" || !effect.questionIds.includes(questionId)) continue;
    names.push(def.proseName);
  }
  return names;
}

/**
 * The MAXIMUM cruiseFractionOfC among landed `probe-haste` projects at
 * `atYear` (never summed — content.md's own rule), or null if none have
 * landed. Callers apply the canonical 0.1c default (missions.ts's
 * PROBE_C_FRACTION) themselves; this module stays mission-agnostic.
 */
export function landedProbeCruiseFractionAt(state: ProjectState, atYear: number): number | null {
  let max: number | null = null;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "probe-haste" || !hasLanded(def, p, atYear)) {
      continue;
    }
    if (max === null || def.effect.cruiseFractionOfC > max) max = def.effect.cruiseFractionOfC;
  }
  return max;
}

/**
 * The sum of `addConfidence` across every landed `confidence-lift` project
 * at `atYear`. Raises a FLOOR under confidence, never the value — the one
 * call site (cohort.ts's sendSky) clamps the result to ≤ 0.95.
 */
export function confidenceLiftAt(state: ProjectState, atYear: number): number {
  let total = 0;
  for (const p of state.started) {
    const def = projectById(p.id);
    if (def === undefined || def.effect.kind !== "confidence-lift" || !hasLanded(def, p, atYear)) {
      continue;
    }
    total += def.effect.addConfidence;
  }
  return total;
}

/**
 * A fresh project state for a newly placed civ: a base grant effective
 * immediately and set by the civ's energy ladder, no started projects,
 * nothing committed — and the mind wakes with its attention full: the
 * opening allocation IS the ceiling, anchored at placement, so the
 * ceremony opens onto real choices rather than an empty pool.
 */
export function newProjectState(nowYear: number, energyLadder: number): ProjectState {
  const ratePerYear = BASE_COMPUTE_RATE + COMPUTE_RATE_PER_ENERGY_LADDER * energyLadder;
  const openingCompute = ATTENTION_YEARS * ratePerYear;
  return {
    version: 3,
    openingCompute,
    baseGrant: { fromYear: nowYear, ratePerYear },
    started: [],
    committedCompute: 0,
    freeAnchor: { asOfYear: nowYear, free: openingCompute },
  };
}
