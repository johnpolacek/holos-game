// Grown behavior — what an AI civilization's light does with the years
// (A5, a5-behavior-note.md, with a5-synthesis.md's rulings binding).
//
// ===========================================================================
// THE BEHAVIOR CAUSALITY INVARIANT. READ THIS BEFORE THE CODE.
// ===========================================================================
//
// NO AI CIVILIZATION'S LIGHT IS EVER WRITTEN DOWN. An AI civ's emission
// history is a PURE FUNCTION of (its own seed, the cohort seed key, the
// stored act log, the stored voyage record, and every other civ's derivable
// light), evaluated at read time inside cohort.ts's `derivedFold` and STORED
// NOWHERE. Nothing in this file returns a stored shape, nothing in this file
// can be appended, and the alarm queue's contract is untouched: wipe the
// queue, restart the object, re-derive from disk, and every source in the sky
// is doing exactly what it was doing, because none of it was ever a fact on
// disk.
//
// BEHAVIOR WRITES LIGHT, NEVER CHARACTER (synthesis R3). `emissionHistory` is
// the only field this module rewrites, plus the derived-only `behaviorGrown`
// flag. Dials, archetype, posture, charter, chronicle, ladders and stocks are
// untouched, which is what keeps `maskTierAt`, `charterPosture`, the drift
// walk and the contest reading the same facts they read before this file
// existed. The authored curve is LAYERED ON, never edited: `base(y)` is read
// through `emissionAt` and the array it reads is frozen for the whole fold.
//
// TWO STRUCTURAL GUARDS sit above the rule table, because neither claim can be
// made true by tuning ten rows and both are load-bearing elsewhere in the
// game. `levelFor` holds the INVISIBILITY GUARD (a source under
// UNSEEABLE_LEVEL is exactly what its seed says, so a hidden colony can never
// be popped into the sky) and refuses to let a floor or a ceiling move a
// civilization past its own authored level in the direction its shape is not
// going. `guardChurn` holds MIN_HEAT_CROSSING_YEARS, which is what keeps the
// overtaken exit from firing on one source twice in a real week. Each is
// written out where it lives.
//
// The invariant itself, which is `applyBroadcast`'s safety property
// generalized one noun over:
//
//   BEHAVIOR CAUSALITY. Every behavior epoch's `fromYear` is at or after the
//   year of the newest input it depends on, and every new input is dated at
//   the clock's `now`. Therefore no derivation ever inserts, moves or removes
//   an epoch dated at or before `nowYear`, and every observer's `asOfYear` is
//   at most `nowYear`. ALREADY-SERVED LIGHT IS BYTE-IDENTICAL FOREVER.
//
// Three parts, and all three are load-bearing:
//
//  1. CADENCE EPOCHS depend only on the frozen `(seed, seedKey)` pair and the
//     horizon. The generator emits in increasing year order and CADENCE_CAP
//     truncates the tail, so raising the horizon only APPENDS epochs dated
//     above the old horizon — which was itself above `nowYear` at the moment
//     it was in force.
//
//  2. REACTION EPOCHS, by induction on pop order. An arrival at T reads
//     accumulator state at years at or below T, and splices at T + lag with
//     lag at least REACTION_LAG_MIN_YEARS. A new input dated y* = nowYear
//     generates only arrivals at or after y*, so every reaction dated below
//     y* is produced from identical state in both runs. The spacing and cap
//     counters are advanced only by reactions dated below y*, so the
//     ADMISSION DECISIONS agree too.
//
//  3. THE CAP DROPS THE NEWEST, NEVER THE OLDEST. Reactions are admitted in
//     year order, so a ninth candidate is always later than the eight on
//     record and nothing already derivable is ever displaced. The two caps
//     are separate (CADENCE_CAP, REACTION_CAP) so a reaction can never evict
//     a cadence epoch.
//
// Greppable, and meant to be grepped:
//
//   grep -rn "galaxyWithBehavior\|BEHAVIOR_RULES" server/src
//
// must show the definitions here and EXACTLY ONE call site, inside cohort.ts's
// `derivedFold` — a read path. It must never appear in a handler that mutates
// `this.storedGalaxy`, and `saveGalaxyCivs` throws on any civ carrying
// `behaviorGrown`, which is the `CHILD_ID_PREFIX` assertion's sibling.
//
// THE TEMPTATION TO STORE. The first bug report that reads "the sky changed
// retroactively" will look like it wants a snapshot. IT DOES NOT. It wants
// the stability check run against the input that actually moved: derive at a
// horizon, derive again with the suspect act or voyage appended, and diff
// every epoch dated at or before `nowYear`. A stored behavior state would
// answer that report by making the derivation unfalsifiable rather than by
// making it true, and it would put a second copy of every civ's light on disk
// free to disagree with the first the moment a rule row is retuned.
//
// IMPORT DIRECTION. This module imports civseed, galaxy, clock, rng, the act
// type from contact, the two floors it needs from knowledge, and
// `darkTurnYear` from contest (see `behaviorStartYear` for why). It imports
// NO traffic, NO studies, NO questions, and nothing imports it but cohort.ts,
// so there is no cycle. LEAKAGE_FLOOR is deliberately absent: an unascended
// source falling under it is what the `leakage-stops` watch catches
// downstream, and that is studies.ts's arithmetic on the light this module
// produces, not a threshold behavior itself reasons about.

import type { CivId, CivSeed, EmissionEpoch } from "./civseed";
import { lightDelayYears } from "./clock";
// Type-only: the act log rides `Galaxy.acts`, and the beam trigger reads it
// directly. Nothing of contact.ts's runtime comes behind it.
import type { ContactAct } from "./contact";
// The mask's onset. Behavior may not move it, so the one function that
// defines it is the one this module reads (see `behaviorStartYear`).
import { darkTurnYear } from "./contest";
import { distanceLy, starById, type Galaxy, type Vec3Ly } from "./galaxy";
import { emissionAt, UNSEEABLE_LEVEL, MADE_HEAT_FLOOR } from "./knowledge";
import type { ArchetypeId } from "./minds";
import { createRng } from "./rng";

// ---------------------------------------------------------------------------
// Bounds and pacing (note §7)
// ---------------------------------------------------------------------------

/** Cadence epochs one civilization may ever accumulate. THE ARC, NOT A LOOP:
 *  48 events at 900 to 3600 year periods spans 43,000 to 172,000 game years,
 *  which is five real months to a year and a half of continuous cohort life,
 *  after which a civilization holds its last posture. A played-out cohort
 *  wants successors, and that is A5's own cohort-seeding bullet. */
export const CADENCE_CAP = 48;
/** Reactions one civilization may ever be admitted. Bounds the fold's
 *  termination: each reaction adds at most two notable transitions and each of
 *  those pushes at most N-1 arrivals. */
export const REACTION_CAP = 8;
/** How long a civilization takes to be moved by anything again. Six
 *  centuries: a source that flinched at every arriving crossing would be a
 *  needle rather than a character. */
export const MIN_REACTION_SPACING_YEARS = 600;
/**
 * The memo era, in game years. One real work-day at the shipped clock ratio
 * (5 real minutes per game year, so 240 y is 20 real hours). cohort.ts's
 * derived memo keys on `floor(nowYear / this)` and folds to a horizon two eras
 * out, so the fold re-runs at most once per 20 real hours per cohort, plus
 * once per act, launch or landfall — the cadence the roster fold already pays.
 */
export const BEHAVIOR_ERA_YEARS = 240;

/** How long a reaction takes to reach the light, in years. Seeded per
 *  reaction (synthesis R2's key), never drawn from a clock. */
const REACTION_LAG_MIN_YEARS = 24;
const REACTION_LAG_MAX_YEARS = 180;

/**
 * The offset a BANKED window applies. Large and negative rather than a target
 * level, so the shed's dark phase falls out of the one level formula every
 * other shape uses: subtract more than any level can hold and the clamp puts
 * the civilization on its rule's floor, whatever it was doing before.
 */
const BANK_OFFSET = -1;

/** Levels are rounded here. The history holds transitions a player can read,
 *  not a float's last four digits. */
const LEVEL_PLACES = 1000;

/** Slop on float year comparisons. voyages.ts's EPS, same reason. */
const YEAR_EPS = 1e-6;

/** The waking's shape for a civilization that chose the dark: the flare, then
 *  the turn. Bright wakings have no second epoch — they just keep shining. */
const WAKING_FLARE_LEVEL = 0.45;
const WAKING_DARK_YEARS = 120;
const WAKING_DARK_LEVEL = 0.04;

/** How close a hastened phase may be pulled to the epoch before it. A phase
 *  that landed ON its predecessor would be a reordering, not a hastening. */
const HASTEN_MIN_GAP_YEARS = 1;

/**
 * THE CHURN GUARD, and it is the whole of a5-synthesis.md R6 made structural
 * rather than tuned. No civilization's grown light may cross MADE_HEAT_FLOOR
 * UPWARD twice inside this window.
 *
 * What it is protecting is the study board. An upward crossing is a
 * classification change, which closes any open study on itself
 * (`assembleSkyState`'s overtaken exit), fires the warm-movement standing
 * order, and moves the belief distribution. At the shipped clock ratio 2400
 * game years is about eight real days, and a source that re-classified faster
 * than that would be a source nobody could keep a study open on.
 *
 * The rule table alone cannot promise it, and the case that proves so is the
 * waking: a young world's flare is an authored beat landing at an arbitrary
 * year, and whatever the archetype's absolute cadence grid does next is not
 * negotiable with it. So the guard is applied where every epoch passes,
 * holding an offending BEHAVIOR epoch just under the floor. It never touches
 * an authored one, because the authored curve is not this module's to bound,
 * and it only ever counts crossings at or after cohort year 0, because a
 * crossing in the deep past is light that departed before anyone was here to
 * be churned by it.
 *
 * The light still moves; it simply does not re-classify. A sowing that would
 * have opened a launch window two centuries after waking opens a dimmer one.
 */
export const MIN_HEAT_CROSSING_YEARS = 2400;
/** Where a held epoch sits: under the made-heat floor, and visibly under it,
 *  so a reader watching the level sees the rise and the instruments do not
 *  call it a new class. */
const HEAT_HOLD_LEVEL = 0.119;

// ---------------------------------------------------------------------------
// The behavior vocabulary (note §1)
// ---------------------------------------------------------------------------

/**
 * Five cadence shapes, and what each one does with a period:
 *
 *   climb  one cumulative step up per period, forever, into the ceiling
 *   fade   one cumulative step down per period, forever, into the floor
 *   pulse  raised for a duty share (or a dwell) of each period, then not
 *   train  an absolute level stated for a dwell of each period, then not
 *   shed   banked, then a flare, then a hold: the four-phase turnover
 */
export type BehaviorShape = "climb" | "fade" | "pulse" | "train" | "shed";

/**
 * One archetype's cadence. `why` is a design note kept next to the numbers it
 * explains so a later retune has to read the reason first; it is never a
 * surface and never crosses the wire (contest.ts's `MaskRule`, same column,
 * same discipline).
 *
 * Columns an individual shape does not use are null rather than zero, so a
 * misread row is a type error rather than a silently inert pulse.
 */
export interface BehaviorRule {
  readonly shape: BehaviorShape;
  /** Years from one cadence event to the next. */
  readonly periodYears: number;
  /** climb and fade: the signed offset ONE STEP adds, accumulated. pulse: how
   *  much the raised half adds. Zero for the shapes that state a level. */
  readonly stepLevel: number;
  /** pulse, train and shed: how long the window holds, in years. A pulse with
   *  a null dwell takes `dutyFraction` of its period instead. */
  readonly dwellYears: number | null;
  /** pulse only: the share of the period the offset is raised. */
  readonly dutyFraction: number | null;
  /** train and shed: the level the window states outright, before the clamp. */
  readonly targetLevel: number | null;
  /** shed only: how long the flare holds once the banked window ends. */
  readonly flareYears: number | null;
  /** Where the shape bottoms out. */
  readonly floorLevel: number;
  /** Where the shape tops out; null means the level itself is the only bound. */
  readonly ceilLevel: number | null;
  /** Seeded variation on the phase and the step, as a fraction either way. */
  readonly jitter: number;
  readonly why: string;
}

/**
 * Total over ArchetypeId. THE WHOLE FEEL OF THE STAGE IS IN THIS TABLE, and it
 * is one table on purpose: a playtest retune is a diff to these ten rows and
 * to nothing else in the server.
 *
 * Pacing against the shipped clock (5 real minutes per game year, so 288 y a
 * day and 2016 y a week): a source produces one visible transition every 720
 * to 2400 game years, which is every two and a half to eight real days per
 * source. With 8 to 16 sources in a cohort, SOMETHING moves every day or two
 * and ANY GIVEN SOURCE moves weekly-ish.
 *
 * The audit that keeps the study board sane: no archetype crosses
 * MADE_HEAT_FLOOR upward more than once per 2400 years, so the overtaken exit
 * fires at most once per source per eight real days. The engine's ceiling
 * (below the floor it would otherwise cross) and the fade floors exist for it.
 */
export const BEHAVIOR_RULES: Readonly<Record<ArchetypeId, BehaviorRule>> = {
  tide: {
    shape: "climb",
    periodYears: 900,
    stepLevel: 0.05,
    dwellYears: null,
    dutyFraction: null,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.12,
    ceilLevel: 0.95,
    jitter: 0.12,
    why: "Everything in frame is material and the swarm only ever thickens; the fastest climb in the catalog.",
  },
  beacon: {
    shape: "climb",
    periodYears: 1200,
    stepLevel: 0.035,
    dwellYears: null,
    dutyFraction: null,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.12,
    ceilLevel: 0.9,
    jitter: 0.15,
    why: "It burned brighter every year since, which is the chronicle's own line about it made mechanical.",
  },
  engine: {
    shape: "pulse",
    periodYears: 900,
    stepLevel: 0.05,
    dwellYears: null,
    dutyFraction: 0.5,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.02,
    ceilLevel: 0.115,
    jitter: 0,
    why: "The metronome: nothing sacred but the work, no jitter, and a ceiling under the made-heat floor so the beat is never a classification event.",
  },
  congress: {
    shape: "pulse",
    periodYears: 1500,
    stepLevel: 0.07,
    dwellYears: null,
    dutyFraction: 0.35,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.1,
    ceilLevel: 0.8,
    jitter: 0.18,
    why: "Sessions. It had to be put to a vote, and between votes the chamber is dark.",
  },
  herald: {
    shape: "pulse",
    periodYears: 2400,
    stepLevel: 0.3,
    dwellYears: 120,
    dutyFraction: null,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.02,
    ceilLevel: 0.75,
    jitter: 0.1,
    why: "The transmitter warms for a century and then the vault is quiet again; the archive is the point, the broadcast is the errand.",
  },
  monument: {
    shape: "fade",
    periodYears: 1800,
    stepLevel: -0.015,
    dwellYears: null,
    dutyFraction: null,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.02,
    ceilLevel: null,
    jitter: 0.15,
    why: "Keeps everything, including its own quiet, and does everything slowly.",
  },
  cloister: {
    shape: "fade",
    periodYears: 1500,
    stepLevel: -0.02,
    dwellYears: null,
    dutyFraction: null,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.012,
    ceilLevel: null,
    jitter: 0.2,
    why: "The one floor under the detection floor: it may go fully dark and sleep, and the sky loses it.",
  },
  shepherd: {
    shape: "fade",
    periodYears: 1500,
    stepLevel: -0.018,
    dwellYears: null,
    dutyFraction: null,
    targetLevel: null,
    flareYears: null,
    floorLevel: 0.03,
    ceilLevel: null,
    jitter: 0.15,
    why: "Hides its size so the small stay unafraid, and stops above the floor because vanishing would abandon them.",
  },
  sowing: {
    shape: "train",
    periodYears: 2400,
    stepLevel: 0,
    dwellYears: 120,
    dutyFraction: null,
    targetLevel: 0.135,
    flareYears: null,
    floorLevel: 0.02,
    ceilLevel: null,
    jitter: 0.25,
    why: "Seedships in every direction, none announcing; the launch window is the only thing anyone ever sees.",
  },
  phoenix: {
    shape: "shed",
    periodYears: 3600,
    stepLevel: 0,
    dwellYears: 600,
    dutyFraction: null,
    targetLevel: 0.55,
    flareYears: 300,
    floorLevel: 0.02,
    ceilLevel: 0.6,
    jitter: 0.1,
    why: "Yesterday's self is a shell and we owe it only departure: bank for six centuries, burn for three, hold.",
  },
};

// ---------------------------------------------------------------------------
// Reactive triggers (note §2)
// ---------------------------------------------------------------------------

/**
 * What a civilization's own light did, as anybody watching it would read the
 * change. These are the only broadband facts the fold treats as events, and
 * the reason is arithmetic rather than taste: a metronome oscillating inside
 * one band triggers nobody, so the event set collapses to a handful per
 * civilization rather than the full epoch count.
 */
export type TransitionKind = "new-source" | "vanished" | "warm" | "quiet";

/**
 * What a civilization reacts TO. Every one is a fact carried in departed
 * broadband light or a beam actually aimed at the reactor (the A2.5 no-leak
 * discipline); none of them reads a target's dials, stocks, studies or
 * present.
 *
 * `beam` is read straight off `galaxy.acts` and NOT through traffic.ts,
 * because AI-to-AI beams do not exist: `deriveAiSignals` requires a player
 * target, so the only aimed light in the game is a player's own.
 */
export type ReactionTrigger = TransitionKind | "beam";

/**
 * Four responses, and `skip` is the cheapest thing in the file: it DELETES a
 * scheduled epoch rather than adding one, which is patterns.md §9's missed
 * beat delivered mechanically. A broken pattern is a beat, always.
 */
export type ReactionResponse = "kindle" | "flinch" | "skip" | "hasten";

/** One archetype's single answer to a single trigger. `why` is design
 *  narration, never a surface. */
export interface ReactionRule {
  readonly trigger: ReactionTrigger;
  /** How near the source must be, in light-years; null is any distance. */
  readonly radiusLy: number | null;
  readonly response: ReactionResponse;
  /** kindle and flinch: the signed offset the window adds. */
  readonly amount: number;
  /** kindle and flinch: how long the window holds, in years. */
  readonly durationYears: number;
  readonly why: string;
}

/**
 * Total over ArchetypeId. Each archetype answers EXACTLY ONE trigger with
 * EXACTLY ONE emission response, which is what keeps the sky legible: a source
 * that moved has one readable reason, and a patient player can find it.
 *
 * The loop this closes and that nothing else in the game closes: THE PLAYER'S
 * OWN LOUD ACT MAKES A NEARBY SOURCE VISIBLY DIM, about two real days later,
 * on their own study board. `applyBroadcast` writes the loud epoch into the
 * player's history, which IS the `warm` crossing, so the whole payoff costs no
 * act-log read at all.
 */
export const REACTION_RULES: Readonly<Record<ArchetypeId, ReactionRule>> = {
  beacon: {
    trigger: "new-source",
    radiusLy: null,
    response: "kindle",
    amount: 0.15,
    durationYears: 240,
    why: "Somebody new to be read by. It turns the lamp up and leaves it up for a couple of centuries.",
  },
  tide: {
    trigger: "new-source",
    radiusLy: null,
    response: "kindle",
    amount: 0.12,
    durationYears: 180,
    why: "A new source is a new frame, and everything in frame is material.",
  },
  herald: {
    trigger: "beam",
    radiusLy: null,
    response: "kindle",
    amount: 0.3,
    durationYears: 120,
    why: "Somebody aimed something at the archive. The transmitter answers the only way it knows.",
  },
  congress: {
    trigger: "beam",
    radiusLy: null,
    response: "skip",
    amount: 0,
    durationYears: 0,
    why: "The session is suspended while the chamber reads what arrived; the next scheduled sitting does not happen.",
  },
  engine: {
    trigger: "warm",
    radiusLy: null,
    response: "skip",
    amount: 0,
    durationYears: 0,
    why: "The metronome misses one beat. Nothing sacred but the work, and the work paused to look.",
  },
  monument: {
    trigger: "warm",
    radiusLy: null,
    response: "flinch",
    amount: -0.05,
    durationYears: 600,
    why: "Something out there got loud, and the archive has six centuries of practice at being quieter.",
  },
  cloister: {
    trigger: "warm",
    radiusLy: null,
    response: "flinch",
    amount: -0.08,
    durationYears: 900,
    why: "The deepest flinch in the catalog: it owes the sky nothing and least of all an answer.",
  },
  shepherd: {
    trigger: "warm",
    radiusLy: 12,
    response: "flinch",
    amount: -0.06,
    durationYears: 480,
    why: "The ward radius, and the only radius in the table: it answers what happens NEAR the small, not what happens.",
  },
  sowing: {
    trigger: "warm",
    radiusLy: null,
    response: "flinch",
    amount: -0.04,
    durationYears: 300,
    why: "Being noticed nowhere is the whole method, so a loud neighbour is a reason to sit one launch window out quietly.",
  },
  phoenix: {
    trigger: "quiet",
    radiusLy: null,
    response: "hasten",
    amount: 0,
    durationYears: 0,
    why: "Somebody else banked. Yesterday's self is a shell, and the next shedding comes early.",
  },
};

// ---------------------------------------------------------------------------
// Where behavior starts
// ---------------------------------------------------------------------------

/**
 * THE AUTHORED DEEP PAST IS BYTE-IDENTICAL TO TODAY'S, BY CONSTRUCTION.
 * Behavior begins at the civilization's own singularity and never before
 * cohort year 0, so every already-shipped derivation over the deep past —
 * `contest.darkTurnYear`, the archive dig, the Chronicle — is untouched
 * without any of them knowing this file exists.
 *
 * For a `young` civilization this is a FUTURE year: `drawAscensionYear` puts
 * its singularity at `nowYear + 40..400`, which is three to thirty-five real
 * hours after cohort creation, and `wakingEpochs` below is the beat the
 * generator deliberately withheld.
 */
export function behaviorFromYear(seed: CivSeed): number {
  return Math.max(0, seed.ascensionYear);
}

/**
 * Where this civilization's CADENCE actually begins, which is
 * `behaviorFromYear` plus three floors the authored record already owns:
 *
 *  - the base history's first epoch, so nothing is dated before the source
 *    existed (traffic.ts's existence floor, obtained the same way);
 *  - the AUTHORED DARK TURN, because the mask's onset is an authored fact and
 *    behavior does not get to move it. Without this a peer whose turn sits a
 *    few years the far side of cohort year 0 could have a banked phase land in
 *    the gap and become the first sub-floor epoch after ascension, which would
 *    change `maskTierAt` for a civilization whose character never changed. A
 *    fade only ever deepens a quiet that already began;
 *  - the end of the waking, so the archetype's cadence begins AFTER the
 *    singularity has finished landing rather than through the middle of it.
 */
function behaviorStartYear(seed: CivSeed, base: readonly EmissionEpoch[]): number {
  const first = base[0]?.fromYear ?? seed.ascensionYear;
  const turn = darkTurnYear(seed);
  const waking = wakingEpochs(seed);
  const wokeBy = waking[waking.length - 1]?.fromYear ?? Number.NEGATIVE_INFINITY;
  return Math.max(behaviorFromYear(seed), first, turn ?? Number.NEGATIVE_INFINITY, wokeBy);
}

/**
 * THE WAKING, and the single most dramatic sky event A5 can ship.
 *
 * `drawEmissionHistory` gives a `young` civilization no ascension at all — a
 * biosphere and an industrial rise, forever — while `drawAscensionYear` puts
 * its singularity a few real hours out. This is the missing beat: at the
 * ascension year a flare, and for a civilization that chose the dark, the turn
 * a century later. New class, warm-movement standing order, overtaken exit,
 * all at once, and it costs one branch.
 *
 * It is part of the FROZEN BASE rather than a layer over it, because it is the
 * authored curve's own missing epoch: everything the cadence does afterwards
 * is measured against a civilization that has actually ascended.
 */
function wakingEpochs(seed: CivSeed): readonly EmissionEpoch[] {
  if (seed.ageBand !== "young") return [];
  const year = seed.ascensionYear;
  if (year < 0) return [];
  if (seed.posture === "bright") {
    return [{ fromYear: year, level: round(Math.min(0.95, 0.45 + 0.12 * seed.ladders.energy)) }];
  }
  return [
    { fromYear: year, level: WAKING_FLARE_LEVEL },
    { fromYear: year + WAKING_DARK_YEARS, level: WAKING_DARK_LEVEL },
  ];
}

// ---------------------------------------------------------------------------
// The level formula
// ---------------------------------------------------------------------------

function round(level: number): number {
  return Math.round(level * LEVEL_PLACES) / LEVEL_PLACES;
}

/**
 * `level(y) = clamp( max( base(y) + offsetAdd, targetAt ), floor, ceil )`,
 * with two guards that are the difference between layering and replacing.
 *
 * THE INVISIBILITY GUARD (synthesis R4) comes first and is absolute: where
 * `base(y)` is under UNSEEABLE_LEVEL the evolved level IS `base(y)`, exactly.
 * A `found-dark` colony sits at FOUND_DARK_LEVEL, stays in `galaxy.civs` and
 * stays in nobody's sky; `FOUND_DARK_IS_SUB_FLOOR` survives untouched, and no
 * rule row can accidentally pop a hidden colony into the sky.
 *
 * THE GUARD READS THE WORST CASE, and since physics-audit.md P2-5 it says so.
 * Detection is received flux, so "visible" is a question about a pair, and a
 * rule row here knows no observer and no distance. `UNSEEABLE_LEVEL` is the
 * level below which NOBODY at any legal separation has the photons, which is
 * the only threshold a distance-free guard is entitled to use: it refuses to
 * move exactly the sources that no reading could have caught anyway, and
 * leaves every source somebody could see to the rule table.
 *
 * THE CLAMP NEVER CROSSES BASE. The bounds are widened to hold `base(y)`
 * itself, so a floor cannot LIFT a civilization the shape is not lifting and a
 * ceiling cannot PULL DOWN one the shape is not pulling. Both matter: without
 * the first, a dark tide would jump to 0.12 at its first cadence epoch for no
 * reason anybody could read; without the second, a bright engine would be
 * dragged from a shine of 0.6 to 0.115 by a ceiling that exists only to keep
 * its own pulse under the made-heat floor. Behavior moves light, and moving it
 * past where the seed put it in the direction the shape is not going would be
 * replacing the authored curve rather than layering on it.
 */
function levelFor(
  rule: BehaviorRule,
  base: number,
  offsetAdd: number,
  targetAt: number | null,
): number {
  if (base < UNSEEABLE_LEVEL) return base;
  const raw = targetAt === null ? base + offsetAdd : Math.max(base + offsetAdd, targetAt);
  const lower = Math.min(rule.floorLevel, base);
  const upper = Math.max(rule.ceilLevel ?? 1, base);
  return round(Math.min(upper, Math.max(lower, raw)));
}

// ---------------------------------------------------------------------------
// The cadence layer (note §3, step 1)
// ---------------------------------------------------------------------------

/** A cadence event, before it is merged with anything. */
export interface CadenceEpoch extends EmissionEpoch {
  /** The shed's banked window: the one epoch `hasten` may pull forward. */
  readonly banked: boolean;
}

/**
 * The seeded phase and step scale. Both come from ONE draw on the note's §7
 * key, so two derivations of one galaxy are byte-identical — `reportRemark`
 * and `deliberationFor`'s precedent. Never an unseeded draw, never the clock:
 * this file contains no other source of a number.
 *
 * A rule with no jitter (the engine) takes phase 0 and scale 1 rather than a
 * degenerate draw, which is why every engine in every cohort keeps the same
 * beat: it is the metronome, and a metronome with a seeded offset is a
 * different instrument.
 */
function phaseFor(
  seedKey: string,
  civId: CivId,
  rule: BehaviorRule,
): { readonly phaseYears: number; readonly stepScale: number } {
  if (rule.jitter <= 0) return { phaseYears: 0, stepScale: 1 };
  const rng = createRng(`behave/${seedKey}/${civId}/phase`);
  return {
    phaseYears: rng.range(0, rule.jitter * rule.periodYears),
    stepScale: rng.range(1 - rule.jitter, 1 + rule.jitter),
  };
}

/**
 * THE COST IS PER EVENT, NEVER PER YEAR. The index range is computed
 * arithmetically against an absolute grid anchored at cohort year 0 plus the
 * seeded phase, so a cohort nobody looked at for a month adds about ten epochs
 * per civilization rather than 8,640 years of ticking. The fold's work grows
 * with WHAT HAPPENED, not with how long nobody looked.
 *
 * The grid is absolute rather than relative to `startYear` for the same
 * reason: `kFrom` is a pure function of the frozen seed, so raising the
 * horizon can only ever append.
 */
export function cadenceEpochs(
  seedKey: string,
  seed: CivSeed,
  base: readonly EmissionEpoch[],
  startYear: number,
  horizonYear: number,
): readonly CadenceEpoch[] {
  const rule = BEHAVIOR_RULES[seed.archetype];
  const { phaseYears, stepScale } = phaseFor(seedKey, seed.id, rule);
  const period = rule.periodYears;
  const kFrom = Math.ceil((startYear - phaseYears) / period - YEAR_EPS);
  const kTo = Math.floor((horizonYear - phaseYears) / period + YEAR_EPS);
  const out: CadenceEpoch[] = [];
  const at = (year: number, offsetAdd: number, targetAt: number | null, banked: boolean): void => {
    if (out.length >= CADENCE_CAP) return;
    out.push({
      fromYear: year,
      level: levelFor(rule, emissionAt(base, year), offsetAdd, targetAt),
      banked,
    });
  };
  for (let k = kFrom; k <= kTo && out.length < CADENCE_CAP; k++) {
    const cycleYear = phaseYears + k * period;
    // The step count is measured from the FIRST admitted index, so a climb
    // opens one step above its base rather than wherever the absolute grid
    // happens to have reached.
    const steps = k - kFrom + 1;
    switch (rule.shape) {
      case "climb":
      case "fade":
        at(cycleYear, rule.stepLevel * stepScale * steps, null, false);
        break;
      case "pulse": {
        const on = rule.dwellYears ?? (rule.dutyFraction ?? 0.5) * period;
        at(cycleYear, rule.stepLevel * stepScale, null, false);
        at(cycleYear + on, 0, null, false);
        break;
      }
      case "train": {
        const on = rule.dwellYears ?? 0;
        at(cycleYear, 0, rule.targetLevel, false);
        at(cycleYear + on, 0, null, false);
        break;
      }
      case "shed": {
        const banked = rule.dwellYears ?? 0;
        const flare = rule.flareYears ?? 0;
        at(cycleYear, BANK_OFFSET, null, true);
        at(cycleYear + banked, 0, rule.targetLevel, false);
        at(cycleYear + banked + flare, 0, null, false);
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Notable transitions (note §3, step 2)
// ---------------------------------------------------------------------------

export interface NotableTransition {
  readonly fromYear: number;
  readonly kind: TransitionKind;
}

/**
 * Every crossing of UNSEEABLE_LEVEL or MADE_HEAT_FLOOR, in either direction.
 * ONE EPOCH MAY CARRY TWO: a colony rooting bright goes from nothing to 0.45
 * and is both a new source and a warm one, and both are true, so both are
 * pushed.
 *
 * This is the optimization that makes the fold small. A history of sixty
 * cadence epochs oscillating inside one band produces zero events; the same
 * history crossing a floor twice produces two, and that is only cheap because
 * the scan is per SOURCE rather than per pair.
 *
 * WHICH IS WHY IT READS THE WORST CASE (physics-audit.md P2-5, same argument
 * as `levelFor`'s guard). Under flux detection the fully honest form of
 * "new source" is per reactor, and this scan has no reactor in hand; the
 * distance the reaction does care about is already the caller's
 * `rule.radiusLy`. So the threshold here is the level below which the crossing
 * could not be news to ANYONE, and the shipped content makes the two answers
 * identical anyway: every authored level is either nothing or 0.02 and up,
 * which clears the flux floor across the whole field.
 */
export function notableTransitions(
  history: readonly EmissionEpoch[],
): readonly NotableTransition[] {
  const out: NotableTransition[] = [];
  let previous = 0;
  for (const epoch of history) {
    const level = epoch.level;
    if (previous < UNSEEABLE_LEVEL && level >= UNSEEABLE_LEVEL) {
      out.push({ fromYear: epoch.fromYear, kind: "new-source" });
    } else if (previous >= UNSEEABLE_LEVEL && level < UNSEEABLE_LEVEL) {
      out.push({ fromYear: epoch.fromYear, kind: "vanished" });
    }
    if (previous < MADE_HEAT_FLOOR && level >= MADE_HEAT_FLOOR) {
      out.push({ fromYear: epoch.fromYear, kind: "warm" });
    } else if (previous >= MADE_HEAT_FLOOR && level < MADE_HEAT_FLOOR) {
      out.push({ fromYear: epoch.fromYear, kind: "quiet" });
    }
    previous = level;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The global event fold (note §3, Scheme B)
// ---------------------------------------------------------------------------
//
// The `galaxyWithLandfalls` precedent, one noun over: fold ALL behavior events
// across ALL civilizations in strictly increasing year order, threading the
// evolving histories through the accumulator.
//
// The alternative — computing every civ's reactions against every OTHER civ's
// UNEVOLVED history — was rejected for a reason that is fatal rather than
// aesthetic: it produces TWO GALAXIES. The light an AI reacts to would not be
// the light a player sees, so a cloister would fail to flinch at the tide the
// player is watching thicken, and `aiSighting`/`aiFinding` (which read
// `visibleSky` on the evolved roster) would speak from a sky that disagreed
// with the one that produced the reaction. There is one truth and one cone.
//
// WELL-FOUNDEDNESS. Every causal step advances the year by
// `d(X,R) + lag`, and lag is at least REACTION_LAG_MIN_YEARS, so when an
// arrival at T is popped every event that could affect the light departing at
// or before T has already been popped and settled. The recursion is stratified
// by causality OPERATIONALLY, not just in principle.

/** Where an epoch came from. Only `base` is inviolable: the collapse never
 *  drops one, because dropping one would edit the authored curve. */
type EpochSource = "base" | "cadence" | "reaction";

interface WorkEpoch {
  /** Mutable for exactly one reason: `hasten` pulls a banked phase forward. */
  fromYear: number;
  readonly level: number;
  readonly source: EpochSource;
  readonly banked: boolean;
}

interface Grown {
  readonly rule: BehaviorRule;
  readonly reaction: ReactionRule;
  /** The authored curve plus the waking. FROZEN: `base(y)` is read from here
   *  for every level this module computes, and nothing ever writes to it. */
  readonly base: readonly EmissionEpoch[];
  /**
   * `behaviorStartYear`, and the reason it is on the accumulator rather than a
   * local: A REACTION IS AN ARRIVAL, AND AN ARRIVAL BEFORE BEHAVIOR BEGAN IS
   * NOT ONE. Every civilization's biosphere crossed the detection floor
   * millennia before cohort year 0, so without this gate a beacon would kindle
   * at somebody's Cambrian and the fold would rewrite a deep past the whole
   * design promises is byte-identical. The gate is on the ARRIVAL year and not
   * the departure year, which is the honest form: light that left in year -10
   * and lands in year 20 is news, and behavior is there to hear it.
   */
  readonly startYear: number;
  readonly epochs: WorkEpoch[];
  reactions: number;
  lastReactionYear: number;
  touched: boolean;
}

interface Arrival {
  readonly arrivalYear: number;
  readonly reactorId: CivId;
  /** Identifies the cause: kind, source and departure year, or the act id.
   *  It is the tie-break that makes the pop order total, and half of the
   *  seeded lag key. */
  readonly triggerKey: string;
}

function compareArrivals(a: Arrival, b: Arrival): number {
  return (
    a.arrivalYear - b.arrivalYear ||
    a.reactorId.localeCompare(b.reactorId) ||
    a.triggerKey.localeCompare(b.triggerKey)
  );
}

/** Sorted insertion. Every arrival pushed mid-fold is dated strictly after the
 *  one being popped, so the queue only ever grows at its tail half. */
function insertArrival(queue: Arrival[], head: number, arrival: Arrival): void {
  let lo = head;
  let hi = queue.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const at = queue[mid];
    if (at !== undefined && compareArrivals(at, arrival) <= 0) lo = mid + 1;
    else hi = mid;
  }
  queue.splice(lo, 0, arrival);
}

function insertEpoch(epochs: WorkEpoch[], epoch: WorkEpoch): void {
  let lo = 0;
  let hi = epochs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const at = epochs[mid];
    if (at !== undefined && at.fromYear <= epoch.fromYear) lo = mid + 1;
    else hi = mid;
  }
  epochs.splice(lo, 0, epoch);
}

/**
 * MIN_HEAT_CROSSING_YEARS, applied. A left-to-right fold in year order, which
 * is also its byte-stability argument: an epoch's held level depends only on
 * epochs dated at or before it, so an epoch dated at or before `nowYear` reads
 * the identical predecessors in every derivation and is held or not held the
 * same way forever.
 */
function guardChurn(epochs: readonly WorkEpoch[]): WorkEpoch[] {
  const out: WorkEpoch[] = [];
  let previous = 0;
  let lastUpYear: number | null = null;
  for (const epoch of epochs) {
    let level = epoch.level;
    const wouldCross = previous < MADE_HEAT_FLOOR && level >= MADE_HEAT_FLOOR;
    if (
      wouldCross &&
      epoch.source !== "base" &&
      lastUpYear !== null &&
      epoch.fromYear - lastUpYear < MIN_HEAT_CROSSING_YEARS - YEAR_EPS
    ) {
      level = Math.min(level, HEAT_HOLD_LEVEL);
    }
    if (previous < MADE_HEAT_FLOOR && level >= MADE_HEAT_FLOOR && epoch.fromYear >= 0) {
      lastUpYear = epoch.fromYear;
    }
    out.push({ ...epoch, level });
    previous = level;
  }
  return out;
}

/**
 * The working history as the rest of the module reads it — GUARDED, so there
 * is one sky and not two. A reaction's own level and every event pushed to a
 * neighbour read the same light a player would be served, which is the whole
 * argument against the stratified scheme, held one level down.
 */
function historyOf(g: Grown): readonly EmissionEpoch[] {
  return guardChurn(sortedEpochs(g)).map((e) => ({ fromYear: e.fromYear, level: e.level }));
}

function sortedEpochs(g: Grown): WorkEpoch[] {
  return [...g.epochs].sort((a, b) => a.fromYear - b.fromYear);
}

/**
 * The evolved history, guarded and collapsed. Consecutive equal levels are one
 * transition and not two (`foundingEmissionHistory`'s precedent: the history
 * holds transitions, not ticks), and a BASE epoch is never the one dropped,
 * because the authored curve's own steps are not this module's to remove.
 */
function finalize(g: Grown): readonly EmissionEpoch[] {
  const out: EmissionEpoch[] = [];
  let last: number | null = null;
  for (const epoch of guardChurn(sortedEpochs(g))) {
    if (epoch.source !== "base" && last !== null && epoch.level === last) continue;
    out.push({ fromYear: epoch.fromYear, level: epoch.level });
    last = epoch.level;
  }
  return out;
}

/**
 * Splice the response. Four shapes, and two of them add nothing at all:
 *
 *   kindle/flinch  a window: the level at `year` moved by the rule's amount,
 *                  and a restore at the far end of the duration
 *   skip           the next cadence boundary simply does not happen
 *   hasten         the next banked phase is pulled forward to `year`
 *
 * Every epoch it touches is dated strictly after `year`, and `year` is the
 * arrival plus a lag of at least two dozen years, so nothing already served
 * can move. That is the induction step of the invariant at the top of the
 * file, in nine lines.
 */
function applyResponse(g: Grown, year: number): void {
  const rule = g.reaction;
  if (rule.response === "kindle" || rule.response === "flinch") {
    const history = historyOf(g);
    const closeYear = year + rule.durationYears;
    const openLevel = levelFor(
      g.rule,
      emissionAt(g.base, year),
      emissionAt(history, year) - emissionAt(g.base, year) + rule.amount,
      null,
    );
    const closeLevel = levelFor(
      g.rule,
      emissionAt(g.base, closeYear),
      emissionAt(history, closeYear) - emissionAt(g.base, closeYear),
      null,
    );
    insertEpoch(g.epochs, {
      fromYear: year,
      level: openLevel,
      source: "reaction",
      banked: false,
    });
    insertEpoch(g.epochs, {
      fromYear: closeYear,
      level: closeLevel,
      source: "reaction",
      banked: false,
    });
    return;
  }
  if (rule.response === "skip") {
    const index = g.epochs.findIndex(
      (e) => e.source === "cadence" && e.fromYear > year + YEAR_EPS,
    );
    if (index >= 0) g.epochs.splice(index, 1);
    return;
  }
  // hasten: the next banked phase comes early, never earlier than the epoch
  // before it, and never at all if the pull would push it later.
  const index = g.epochs.findIndex(
    (e) => e.source === "cadence" && e.banked && e.fromYear > year + YEAR_EPS,
  );
  if (index < 0) return;
  const target = g.epochs[index];
  if (target === undefined) return;
  const previous = g.epochs[index - 1];
  const earliest =
    previous === undefined ? year : Math.max(year, previous.fromYear + HASTEN_MIN_GAP_YEARS);
  if (earliest >= target.fromYear) return;
  target.fromYear = earliest;
}

/** Every beam actually aimed at somebody, as an arrival at the civilization it
 *  was aimed at. A broadcast is aimed at nobody and is not one of these; it
 *  reaches the fold as an ordinary crossing in the sender's own light. */
function beamArrivals(
  acts: readonly ContactAct[],
  distanceOf: (a: CivId, b: CivId) => number | null,
  reacts: (id: CivId) => boolean,
): readonly Arrival[] {
  const out: Arrival[] = [];
  for (const act of acts) {
    if (act.kind !== "hail" && act.kind !== "signal") continue;
    const to = act.toCivId;
    if (to === null) continue;
    if (!reacts(to)) continue;
    const d = distanceOf(act.fromCivId, to);
    if (d === null) continue;
    out.push({
      arrivalYear: act.sentYear + lightDelayYears(d),
      reactorId: to,
      triggerKey: `beam/${act.id}`,
    });
  }
  return out;
}

/**
 * THE FOLD, and the only producer of a grown emission history.
 *
 * Pure and total. Called twice with the same arguments it returns
 * byte-identical output, which is what lets cohort.ts memoize it and what
 * makes every observer's sky the same sky. Players are IMMUNE BY REFERENCE
 * (synthesis R5): a `player` civilization is returned as the identical object,
 * carrying the identical `emissionHistory` array, because a player's light is
 * written by their own acts and by nothing else.
 */
export function galaxyWithBehavior(base: Galaxy, horizonYear: number): Galaxy {
  const positions = new Map<CivId, Vec3Ly>();
  for (const civ of base.civs) {
    positions.set(civ.seed.id, starById(base.stars, civ.starId).position);
  }
  const distanceOf = (a: CivId, b: CivId): number | null => {
    const from = positions.get(a);
    const to = positions.get(b);
    if (from === undefined || to === undefined) return null;
    return distanceLy(from, to);
  };

  // 1. The cadence layer, closed form and free of cross-dependencies.
  const grown = new Map<CivId, Grown>();
  const histories = new Map<CivId, readonly EmissionEpoch[]>();
  for (const civ of base.civs) {
    if (civ.controller !== "ai") {
      histories.set(civ.seed.id, civ.seed.emissionHistory);
      continue;
    }
    const waking = wakingEpochs(civ.seed);
    const authored: readonly EmissionEpoch[] = [...civ.seed.emissionHistory, ...waking].sort(
      (a, b) => a.fromYear - b.fromYear,
    );
    const startYear = behaviorStartYear(civ.seed, authored);
    const cadence = cadenceEpochs(base.seedKey, civ.seed, authored, startYear, horizonYear);
    const epochs: WorkEpoch[] = [];
    for (const epoch of authored) {
      epochs.push({ ...epoch, source: "base", banked: false });
    }
    for (const epoch of cadence) {
      insertEpoch(epochs, {
        fromYear: epoch.fromYear,
        level: epoch.level,
        source: "cadence",
        banked: epoch.banked,
      });
    }
    const state: Grown = {
      rule: BEHAVIOR_RULES[civ.seed.archetype],
      reaction: REACTION_RULES[civ.seed.archetype],
      base: authored,
      startYear,
      epochs,
      reactions: 0,
      lastReactionYear: Number.NEGATIVE_INFINITY,
      touched: waking.length > 0 || cadence.length > 0,
    };
    grown.set(civ.seed.id, state);
    histories.set(civ.seed.id, historyOf(state));
  }

  // 2. The queue: every notable transition times every civilization the rule's
  //    trigger and radius admit, plus every stored beam. Ordered by
  //    (arrivalYear, reactorId, triggerKey), which is total.
  const queue: Arrival[] = [];
  const seen = new Set<string>();
  const push = (head: number, arrival: Arrival): void => {
    const key = `${arrival.reactorId}|${arrival.triggerKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (arrival.arrivalYear > horizonYear + YEAR_EPS) return;
    insertArrival(queue, head, arrival);
  };
  const pushTransitions = (
    head: number,
    sourceId: CivId,
    history: readonly EmissionEpoch[],
  ): void => {
    const transitions = notableTransitions(history);
    if (transitions.length === 0) return;
    for (const [reactorId, state] of grown) {
      if (reactorId === sourceId) continue;
      const rule = state.reaction;
      if (rule.trigger === "beam") continue;
      const d = distanceOf(sourceId, reactorId);
      if (d === null) continue;
      if (rule.radiusLy !== null && d > rule.radiusLy) continue;
      for (const transition of transitions) {
        if (transition.kind !== rule.trigger) continue;
        const arrivalYear = transition.fromYear + lightDelayYears(d);
        if (arrivalYear < state.startYear - YEAR_EPS) continue;
        push(head, { arrivalYear, reactorId, triggerKey: `${transition.kind}/${sourceId}/${transition.fromYear}` });
      }
    }
  };

  for (const [sourceId, history] of histories) {
    pushTransitions(0, sourceId, history);
  }
  for (const arrival of beamArrivals(
    base.acts,
    distanceOf,
    (id) => grown.get(id)?.reaction.trigger === "beam",
  )) {
    push(0, arrival);
  }

  // 3. Drain. Admit, splice, and push whatever the splice made newly notable.
  let head = 0;
  while (head < queue.length) {
    const arrival = queue[head];
    head++;
    if (arrival === undefined) continue;
    const state = grown.get(arrival.reactorId);
    if (state === undefined) continue;
    if (state.reactions >= REACTION_CAP) continue;
    if (arrival.arrivalYear > horizonYear + YEAR_EPS) continue;
    // The gate `startYear` documents. Restated here rather than trusted from
    // the push site, because the beam arrivals come in through a second door.
    if (arrival.arrivalYear < state.startYear - YEAR_EPS) continue;
    if (arrival.arrivalYear < state.lastReactionYear + MIN_REACTION_SPACING_YEARS - YEAR_EPS) {
      continue;
    }
    // Synthesis R2: the arrival year is part of the key, so a civilization
    // that answers the same kind of trigger twice does not answer it twice in
    // lockstep. The year is itself derived, so determinism is untouched, and
    // an already-derivable reaction's key never changes.
    const lag = createRng(
      `behave/${base.seedKey}/${arrival.reactorId}/${arrival.triggerKey}/${arrival.arrivalYear}`,
    ).range(REACTION_LAG_MIN_YEARS, REACTION_LAG_MAX_YEARS);
    applyResponse(state, arrival.arrivalYear + lag);
    state.reactions++;
    state.lastReactionYear = arrival.arrivalYear;
    state.touched = true;
    // A splice can also REMOVE a crossing somebody else was already queued to
    // answer. That arrival stays in the queue and may still be admitted, which
    // is deliberate: it is dated after the splice, so it cannot disturb light
    // that has already been served, and re-deriving the queue from scratch on
    // every splice would cost the fold its bounds for no readable difference.
    pushTransitions(head, arrival.reactorId, historyOf(state));
  }

  // 4. The roster. An AI civilization behavior did not move is returned as the
  //    identical object, exactly as a player's is.
  let changed = false;
  const civs = base.civs.map((civ) => {
    const state = grown.get(civ.seed.id);
    if (state === undefined || !state.touched) return civ;
    changed = true;
    return {
      ...civ,
      seed: { ...civ.seed, emissionHistory: finalize(state) },
      behaviorGrown: true,
    };
  });
  return changed ? { ...base, civs } : base;
}
