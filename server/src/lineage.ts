// The Ledger, drift, and the conversation brake — the aftermath side of A4
// (a4-ledger-note.md, with a4-synthesis.md's rulings binding).
//
// THIS MODULE READS TRUTH THROUGH NO PATH BUT `observeCiv` AND THE ARRIVED ACT
// LOG, AND IT MINTS NO CONE OF ITS OWN. That is the whole of its no-leak
// story, and it is meant to be grepped:
//
//   grep -rn "peekTruth\|civTruthAt\|lightConeFor" server/src/lineage.ts
//
// must return nothing. Every reading below comes from a clipped
// `lightHistory` (which `observeCiv` already gated) or from a part that has
// ARRIVED (traffic.ts's merge, which gates on the same comparison). There is
// no branch here that can see a colony's present, and there is deliberately no
// parameter that would let a caller hand one in.
//
// WHAT THE LEDGER IS FOR. A founding is the one act in this game whose
// consequence outlives every instrument that could check on it. The Ledger is
// the record of that: one row per voyage, keyed on the VOYAGE and never on a
// source (missions survive their sources; so do children), never deleted and
// never groomed. It says four things — where the ship is on the parent's own
// clock, how old the newest word is, whether what has come back still agrees
// with the charter, and whether the thread is alive. It asserts nothing about
// why a colony is silent, because from here that is not knowable.
//
// DRIFT IS A DISAGREEMENT TALLY, NOT A DISTANCE. It counts the dial axes on
// which what the parent has ACTUALLY READ contradicts what the charter wrote,
// over the axes the parent has read at all, and it shows its sample size. The
// denominator has a floor (MIN_DRIFT_DENOM) so one contradicted reading out of
// one observation cannot read as estrangement, and the top band is LATCHED: a
// child that has once read as independent stays independent, because a better
// sample arriving later does not un-happen what the parent already concluded.
//
// THE BRAKE IS THE ONE MECHANICAL CONSEQUENCE. `lineageExchangesFor` is the
// truth-side half: it counts completed round trips, and voyages.ts spends them
// against the walk (one round trip of credit per exchange, never more than
// BRAKE_CEILING of the elapsed time). The band NEVER filters what a colony
// says or what the parent may read: this game prices things, it does not scold.

import type { CivId, EmissionEpoch } from "./civseed";
import { MIN_DELIBERATION_YEARS } from "./contact";
import { DIAL_AXES, type DialAxisId, type DialSheet } from "./dials";
import type { Galaxy } from "./galaxy";
import { LEAKAGE_FLOOR, observeCiv } from "./knowledge";
import type { Posture } from "./minds";
import { lineageCulturePartsFor, threadRefRowsFor, type LineageCulturePart } from "./traffic";
import { bandLine } from "./voice";
// Type-only, and it stays that way: voyages.ts CALLS this module at run time
// (the brake), so the runtime edge runs one way only and the cycle is erased
// at build. Everything this module needs from a launch record arrives as data,
// through `LedgerVoyageInput` below.
import type { StoredVoyage } from "./voyages";
import type { DriftReading, LedgerRow, LedgerWire, StandingOrderWire } from "./protocol";

/** Slop on float year comparisons, so a schedule boundary never misfires.
 *  missions.ts's EPS, same reason. */
const EPS = 1e-6;

// ---------------------------------------------------------------------------
// The vocabulary (a4-ledger-note §1, §2)
// ---------------------------------------------------------------------------

/** What a row is a record of. One arm at A4 — the children this seat sent.
 *  A parent row (the colony that founded YOU) is the future arm, and the
 *  discriminator exists so adding it moves no field. */
export type LedgerRelation = "child";

/**
 * Where a founding stands, IN THE PARENT'S FRAME AND ONLY THERE. There is no
 * `abandoned` and there will not be one at this stage: it is unassertable from
 * darkness, and a state that claims a colony died would be the record inventing
 * the one thing the distance forbids. `returning` waits on a return leg that
 * does not exist yet. `independent` is NOT a state — it is the top drift band,
 * and it is latched.
 */
export type LedgerRowState = "outbound" | "awaiting-light" | "rooted" | "dark";

/** How far what has come back has moved from what was written down. Words,
 *  never numbers: the sample is too small for a percentage to be honest. */
export type DriftBand = "unread" | "close" | "kindred" | "estranged" | "independent";

/** Ascending. Only a STRICTLY HIGHER band is ever a crossing. */
export const DRIFT_BANDS: readonly DriftBand[] = [
  "unread",
  "close",
  "kindred",
  "estranged",
  "independent",
];

/** Whether the thread to a child is warm, cooling, or over. One word, no
 *  meter: a freshness bar would turn a relationship into a chore. */
export type LineageThreadState = "unopened" | "alive" | "faded" | "silent";

/** Which channel a reading came down. */
export type DriftVia = "light" | "stated";

/**
 * The floor under the drift denominator, and the whole safety story of the
 * magnitude: one disagreement out of one observation reads as `kindred`, not
 * as estrangement, and `independent` needs at least three contradicted axes.
 * The most likely constant to move under tuning (the design note says so).
 */
export const MIN_DRIFT_DENOM = 3;
/** m at or below this is `kindred`. */
export const KINDRED_CEILING = 1 / 3;
/** m at or below this is `estranged`; above it is `independent`. */
export const ESTRANGED_CEILING = 2 / 3;

/**
 * How long after the confirming year a row waits before it reads `dark`.
 * voyages.ts's LANDFALL_GRACE_YEARS, same number and same reason, stated here
 * rather than imported so this module keeps its type-only edge to voyages.ts
 * (missions.ts's SILENCE_GRACE_YEARS precedent, one module over).
 */
export const DARK_GRACE_YEARS = 2;

/**
 * A colony's own turnaround: the least time between a beam landing on it and
 * an answer leaving. contact.ts's deliberation floor, borrowed rather than
 * invented — the number is what a mind takes to decide anything at all.
 */
export const LINEAGE_TURNAROUND_YEARS = MIN_DELIBERATION_YEARS;

// ---------------------------------------------------------------------------
// Persistence — `ledger:${token}` (a4-ledger-note §5.2)
// ---------------------------------------------------------------------------

/**
 * LATCHES AND CROSSING STAMPS ONLY. Everything else on a row is derived on
 * every read, from the launch record and the light; these two are the facts a
 * derivation cannot recover, because they are about WHEN THE PARENT FIRST
 * CONCLUDED SOMETHING and the conclusion is not in the light.
 *
 * Written only on transition (orders.ts's settle idiom): `buildLedger`
 * returns the stored state BY IDENTITY when nothing crossed, and cohort.ts
 * writes exactly when it did not.
 */
export interface StoredLedgerRow {
  readonly voyageId: string;
  /** The year the band first computed `independent`. Once set, the band is
   *  independent forever, whatever a later sample says. */
  readonly independentSinceYear: number | null;
  /** The year each band was first entered. Only strictly-higher entries are
   *  ever stamped, so this is a monotone record of one relationship. */
  readonly bandSeenAt: Partial<Record<DriftBand, number>>;
}

export interface LedgerState {
  readonly version: 1;
  /** Keyed by voyage id. */
  readonly rows: Readonly<Record<string, StoredLedgerRow>>;
}

export function newLedgerState(): LedgerState {
  return { version: 1, rows: {} };
}

/** Identity at v1 — the seam exists for a future version bump
 *  (`migrateVoyageState`'s precedent). */
export function migrateLedgerState(stored: LedgerState): LedgerState {
  return stored;
}

// ---------------------------------------------------------------------------
// The conversation brake (a4-ledger-note §2.5)
// ---------------------------------------------------------------------------

/**
 * How much of one round trip an exchange buys back, keyed on the WALK ITSELF
 * rather than on what the parent has read.
 *
 * That distinction is load-bearing and it is not the note's wording being
 * ignored: the brake acts on the colony's actual dials, so it must be the same
 * number for every observer. If it keyed on the observed band, a colony's
 * position would depend on who was looking at it and when their light left,
 * which is the one thing this whole layer exists to prevent. The THRESHOLDS
 * are the band's own (a third, two thirds), applied to the truth-side walk
 * that the band is the delayed reading of.
 *
 * Devotion buys less as the colony gets further away from you, and past the
 * point where it has become its own thing it buys nothing at all.
 */
export function brakeFactorFor(walk: number): number {
  if (walk <= KINDRED_CEILING + EPS) return 1;
  if (walk <= ESTRANGED_CEILING + EPS) return 0.5;
  return 0;
}

/** What `lineageExchangesFor` needs to know about a founding. Every field is
 *  on the launch record or derived from it; none of them is truth. */
export interface LineageThread {
  readonly parentCivId: CivId;
  readonly childCivId: CivId;
  readonly distanceLy: number;
  readonly foundingYear: number;
  /** False when the charter said to answer nothing, ever. A colony that
   *  answers nothing completes no exchange, so devotion aimed at it brakes
   *  nothing: you cannot hold close something that will not speak. */
  readonly answers: boolean;
}

/**
 * THE COMPLETED ROUND TRIPS, in the child's own frame, ascending.
 *
 * An exchange is a beam of yours arriving at the colony and an answer leaving
 * it. The arrival is arithmetic on the log (`sentYear + d`); the departure is
 * the colony's own turnaround on top of it.
 *
 * ADAPTATION, recorded because it is the one place this module departs from
 * the note's letter: the note pairs each arrival with an INBOUND ACTUALLY
 * COMPOSED by the child, and this pairs it with the answer the charter
 * commits the colony to. It has to. The composed reply is derived
 * (traffic.ts's `deriveAiSignals`) from a civilization that does not exist yet
 * at the moment this is called — the brake runs inside the fold that MINTS the
 * child, so reaching for the child's own composer there is circular, and
 * running it twelve times per child per fold would put the whole reply
 * derivation under every sky send besides. What survives unchanged is every
 * property the brake was specified for: one round trip of credit per exchange,
 * distance deciding who can be held close, a colony chartered to answer
 * nothing braking nothing, and a muted thread stopping the brake dead (a muted
 * thread leaves the rack, no further act is ever sent down it, and the pairing
 * needs an act).
 *
 * Reads `g.acts` and NOTHING ELSE: no civ lookup, no cone, no observation. It
 * is safe to call while the roster is still being folded, which is exactly
 * when it is called.
 */
export function lineageExchangesFor(
  g: Galaxy,
  thread: LineageThread,
  throughYear: number,
): readonly number[] {
  if (!thread.answers) return [];
  const out: number[] = [];
  for (const act of g.acts) {
    if (act.kind !== "hail" && act.kind !== "signal") continue;
    if (act.fromCivId !== thread.parentCivId) continue;
    if (act.toCivId !== thread.childCivId) continue;
    const arrival = act.sentYear + thread.distanceLy;
    // Nothing lands on a colony that has not been founded yet. Unreachable in
    // practice (a star with no source on it cannot be hailed), and cheap to
    // state, because the day it becomes reachable it would silently credit a
    // brake to a conversation with nobody.
    if (arrival < thread.foundingYear - EPS) continue;
    const completes = arrival + LINEAGE_TURNAROUND_YEARS;
    if (completes > throughYear + EPS) continue;
    out.push(completes);
  }
  return out.sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Drift (a4-ledger-note §2)
// ---------------------------------------------------------------------------

/** The pole words of one axis, as the world says them. */
function polesOf(axisId: DialAxisId): { readonly left: string; readonly right: string } {
  const axis = DIAL_AXES.find((a) => a.id === axisId);
  return {
    left: axis?.left.inWorld ?? "",
    right: axis?.right.inWorld ?? "",
  };
}

function questionOf(axisId: DialAxisId): string {
  return DIAL_AXES.find((a) => a.id === axisId)?.question ?? "";
}

/**
 * What a charter that sat a dial dead centre wrote. Nothing a colony ever says
 * about that axis can contradict it, because no pole was chosen; the row says
 * so in words rather than showing a pole the charter never named.
 */
const NO_POLE = "no pole given";

/** The one axis the light can speak about: whether it wants to be heard. */
const LIGHT_AXIS: DialAxisId = "voice-silence";

/**
 * A reading, plus the year the parent LEARNED it. The learned year is the
 * tie-break when two channels speak about the same axis, and it is what the
 * headline staleness chip rides; it never reaches the wire itself, because it
 * is a fact about the parent's own record rather than about the colony.
 */
export interface DatedDriftReading {
  readonly reading: DriftReading;
  readonly learnedYear: number;
}

export interface DriftInput {
  /** The positions the founders were given, in the parent's own ranges. */
  readonly charterSheet: DialSheet;
  /** The posture clause, which is what the light is compared against. */
  readonly charterPosture: Posture;
  /** The colony's emission as this parent can see it: already clipped at the
   *  departure year by `observeCiv`. Null when nothing is detected at all. */
  readonly lightHistory: readonly EmissionEpoch[] | null;
  /** Dial parts from the colony that have ARRIVED (traffic.ts's merge). */
  readonly stated: readonly LineageCulturePart[];
  readonly distanceLy: number;
  readonly nowYear: number;
}

/**
 * The light channel: voice and silence, and nothing else.
 *
 * NO SIGNAL PRODUCES NO READING, which is the rule that keeps the whole
 * measure honest — a colony that has gone quiet because it is dead must not
 * read as a colony devoutly keeping a dark charter. Absence is absence here,
 * and it lowers the sample rather than raising the agreement.
 */
function lightReading(input: DriftInput): DatedDriftReading | null {
  const history = input.lightHistory;
  if (history === null || history.length === 0) return null;
  const newest = [...history].sort((a, b) => a.fromYear - b.fromYear)[history.length - 1];
  if (newest === undefined) return null;
  const poles = polesOf(LIGHT_AXIS);
  const readPole = newest.level >= LEAKAGE_FLOOR ? poles.left : poles.right;
  const charterPole = input.charterPosture === "bright" ? poles.left : poles.right;
  return {
    learnedYear: newest.fromYear + input.distanceLy,
    reading: {
      axis: LIGHT_AXIS,
      question: questionOf(LIGHT_AXIS),
      charterPole,
      readPole,
      agrees: readPole === charterPole,
      via: "light",
      // A light reading speaks to the departure year and is exactly the
      // crossing old. Not a difference of years: it left when it left.
      asOfYear: input.nowYear - input.distanceLy,
      lightAgeYears: input.distanceLy,
    },
  };
}

/** The stated channel: what the colony said about its own dials, frozen at
 *  send from the sheet it actually held then. */
function statedReadings(input: DriftInput): readonly DatedDriftReading[] {
  const out: DatedDriftReading[] = [];
  for (const part of input.stated) {
    const dial = input.charterSheet[part.axis];
    const poles = polesOf(part.axis);
    const charterPole =
      dial.position < 0 ? poles.left : dial.position > 0 ? poles.right : NO_POLE;
    out.push({
      learnedYear: part.learnedYear,
      reading: {
        axis: part.axis,
        question: questionOf(part.axis),
        charterPole,
        readPole: part.pole,
        // A charter that named no pole cannot be contradicted.
        agrees: charterPole === NO_POLE || charterPole === part.pole,
        via: "stated",
        asOfYear: part.sentYear,
        lightAgeYears: input.nowYear - part.sentYear,
      },
    });
  }
  return out;
}

/**
 * At most one reading per axis, newest by the year the parent learned it. Both
 * channels can speak about voice and silence, and the newer word wins: a
 * colony that says it has turned toward Voice is a later fact than the light
 * that left before it did.
 *
 * Ordered by the dial catalog so the fork detail reads the same way every
 * time.
 */
export function driftReadingsFor(input: DriftInput): readonly DatedDriftReading[] {
  const byAxis = new Map<DialAxisId, DatedDriftReading>();
  const consider = (dated: DatedDriftReading | null): void => {
    if (dated === null) return;
    const held = byAxis.get(dated.reading.axis);
    if (held !== undefined && held.learnedYear >= dated.learnedYear) return;
    byAxis.set(dated.reading.axis, dated);
  };
  consider(lightReading(input));
  for (const dated of statedReadings(input)) consider(dated);
  return DIAL_AXES.map((axis) => byAxis.get(axis.id)).filter(
    (r): r is DatedDriftReading => r !== undefined,
  );
}

/**
 * The band, from the tally alone. `n` is how many axes have been read at all
 * and `k` how many of those contradict the charter; the denominator is
 * `max(n, MIN_DRIFT_DENOM)`, which is what stops a thin sample from reading as
 * a verdict.
 */
export function bandFor(observedAxes: number, disagreements: number): DriftBand {
  if (observedAxes === 0) return "unread";
  const m = disagreements / Math.max(observedAxes, MIN_DRIFT_DENOM);
  if (m <= EPS) return "close";
  if (m <= KINDRED_CEILING + EPS) return "kindred";
  if (m <= ESTRANGED_CEILING + EPS) return "estranged";
  return "independent";
}

function bandRank(band: DriftBand): number {
  const index = DRIFT_BANDS.indexOf(band);
  return index < 0 ? 0 : index;
}

// ---------------------------------------------------------------------------
// The thread (a4-ledger-note §1.3)
// ---------------------------------------------------------------------------

/** One thread row, as much of it as the Ledger needs. */
export interface LineageRow {
  readonly from: "you" | "them";
  readonly learnedYear: number;
}

/**
 * The brake's face, in one word. `rt` is a round trip, so the windows are
 * stated in the only unit that means anything at this distance: a thread eight
 * light-years out and a thread twenty light-years out are not the same thread
 * after two hundred years, and a fixed number of years would have claimed they
 * were.
 */
export function lineageThreadStateFor(
  rows: readonly LineageRow[],
  distanceLy: number,
  nowYear: number,
): { readonly state: LineageThreadState; readonly lastExchangeYear: number | null } {
  if (rows.length === 0) return { state: "unopened", lastExchangeYear: null };
  let newest = rows[0]?.learnedYear ?? null;
  for (const row of rows) {
    if (newest === null || row.learnedYear > newest) newest = row.learnedYear;
  }
  if (newest === null) return { state: "unopened", lastExchangeYear: null };
  const roundTrip = 2 * distanceLy;
  const since = nowYear - newest;
  const state: LineageThreadState =
    since <= 2 * roundTrip + EPS ? "alive" : since <= 6 * roundTrip + EPS ? "faded" : "silent";
  return { state, lastExchangeYear: newest };
}

// ---------------------------------------------------------------------------
// The Ledger itself (a4-ledger-note §1, §5.1)
// ---------------------------------------------------------------------------

/**
 * One founding as the Ledger needs it. Assembled by cohort.ts from the launch
 * record and voyages.ts's own clock and catalog helpers, which is what keeps
 * this module's edge to voyages.ts type-only: everything about a ship that
 * matters here is arithmetic somebody else already did.
 */
export interface LedgerVoyageInput {
  readonly voyage: StoredVoyage;
  readonly childCivId: CivId;
  readonly designation: string;
  readonly foundingYear: number;
  readonly confirmYear: number;
  readonly charterPosture: Posture;
  /** The charter as one sentence, from the clause catalog and the sheet. */
  readonly charterLine: string;
  /** Whether this parent has gone dark to this child. The row STAYS — a mute
   *  takes a thread off the rack and changes nothing about the relationship
   *  the Ledger is a record of. */
  readonly muted: boolean;
}

export interface BuildLedgerInput {
  readonly galaxy: Galaxy;
  readonly observerId: CivId;
  readonly voyages: readonly LedgerVoyageInput[];
  readonly orders: readonly StandingOrderWire[];
  readonly stored: LedgerState;
  readonly nowYear: number;
}

/**
 * THE LEDGER, and the two latches assembling it can produce.
 *
 * `state` is returned BY IDENTITY when nothing crossed, which is how cohort.ts
 * knows whether it owes a write (orders.ts's `settleStandingOrders` makes the
 * same promise). A band crossing and a first independence are the only two
 * things here that are ever written down; everything else is derived on every
 * read and would be identical if storage were wiped.
 */
export function buildLedger(input: BuildLedgerInput): {
  readonly wire: LedgerWire;
  readonly state: LedgerState;
} {
  const { galaxy, observerId, nowYear } = input;
  let writes: Record<string, StoredLedgerRow> | null = null;
  const noteWrite = (row: StoredLedgerRow): void => {
    writes = { ...(writes ?? input.stored.rows), [row.voyageId]: row };
  };

  const rows: LedgerRow[] = input.voyages.map((entry) => {
    const v = entry.voyage;
    const stored: StoredLedgerRow = input.stored.rows[v.id] ?? {
      voyageId: v.id,
      independentSinceYear: null,
      bandSeenAt: {},
    };

    // The colony, if it is on the roster at all. A voyage that arrived to
    // find the star taken, or that kept its ships closed on a dead world,
    // never produces one — and its row is `dark` forever, which is the record
    // declining to say why.
    const child = galaxy.civs.find((c) => c.seed.id === entry.childCivId);
    const observed =
      child === undefined ? null : observeCiv(galaxy, observerId, entry.childCivId, nowYear);
    const signal = observed?.signal ?? null;

    const state: LedgerRowState =
      nowYear < entry.foundingYear - EPS
        ? "outbound"
        : nowYear < entry.confirmYear - EPS
          ? "awaiting-light"
          : signal !== null
            ? "rooted"
            : nowYear >= entry.confirmYear + DARK_GRACE_YEARS - EPS
              ? "dark"
              : "awaiting-light";

    const stated =
      child === undefined
        ? []
        : lineageCulturePartsFor(galaxy, observerId, entry.childCivId, nowYear);
    const dated = driftReadingsFor({
      charterSheet: v.charter.sheet,
      charterPosture: entry.charterPosture,
      lightHistory: signal?.lightHistory ?? null,
      stated,
      distanceLy: v.distanceLy,
      nowYear,
    });
    const readings = dated.map((d) => d.reading);
    const observedAxes = readings.length;
    const disagreements = readings.filter((r) => !r.agrees).length;

    // THE LATCH. A band computed independent is written down the first time it
    // is computed, and the row reads independent from then on however the
    // sample later moves. That is deliberate and it is the design's own
    // sentence: a parent does not get to decide, later, that the thing out
    // there is still theirs.
    const computed = bandFor(observedAxes, disagreements);
    const latched = stored.independentSinceYear !== null;
    const band: DriftBand = latched ? "independent" : computed;
    const independentSinceYear =
      stored.independentSinceYear ?? (computed === "independent" ? nowYear : null);

    // A crossing is a STRICTLY HIGHER band than anything this row has ever
    // been in. Falling back toward the charter is not an event: the light that
    // said so is older than the light that said the other thing, and the
    // record of what was once concluded stands.
    const seen = stored.bandSeenAt;
    let highestSeen = 0;
    for (const [key, year] of Object.entries(seen)) {
      if (year === undefined) continue;
      highestSeen = Math.max(highestSeen, bandRank(key as DriftBand));
    }
    const crosses = band !== "unread" && bandRank(band) > highestSeen;
    const bandSeenAt = crosses ? { ...seen, [band]: nowYear } : seen;
    if (crosses || independentSinceYear !== stored.independentSinceYear) {
      noteWrite({ voyageId: v.id, independentSinceYear, bandSeenAt });
    }

    const threadRows: LineageRow[] =
      child === undefined
        ? []
        : threadRefRowsFor(galaxy, observerId, entry.childCivId, nowYear).map((r) => ({
            from: r.from,
            learnedYear: r.learnedYear,
          }));
    const thread = lineageThreadStateFor(threadRows, v.distanceLy, nowYear);

    // YOUR OWN NEXT ARRIVAL, AND NOTHING ELSE. The earliest beam of yours that
    // has not landed yet. A predicted reply would be a claim about a decision
    // nobody has made, and there is no field here that could carry one.
    let nextExchangeYear: number | null = null;
    for (const act of galaxy.acts) {
      if (act.fromCivId !== observerId || act.toCivId !== entry.childCivId) continue;
      const arrives = act.sentYear + v.distanceLy;
      if (arrives <= nowYear + EPS) continue;
      if (nextExchangeYear === null || arrives < nextExchangeYear) nextExchangeYear = arrives;
    }

    // The headline chip rides the NEWEST reading and nothing else. Null before
    // anything has come back: the client renders no chip, and never a zero.
    let newest: DatedDriftReading | null = null;
    for (const entry of dated) {
      if (newest === null || entry.learnedYear > newest.learnedYear) newest = entry;
    }

    return {
      voyageId: v.id,
      relation: "child" as LedgerRelation,
      childName: v.charter.childName,
      starId: v.starId,
      designation: entry.designation,
      distanceLy: v.distanceLy,
      launchedYear: v.launchedYear,
      foundingYear: entry.foundingYear,
      confirmYear: entry.confirmYear,
      state,
      asOfYear: newest?.reading.asOfYear ?? null,
      lightAgeYears: newest?.reading.lightAgeYears ?? null,
      band,
      independentSinceYear,
      bandSinceYear: bandSeenAt[band] ?? null,
      darkSinceYear: state === "dark" ? entry.confirmYear + DARK_GRACE_YEARS : null,
      observedAxes,
      disagreements,
      readings,
      thread: thread.state,
      lastExchangeYear: thread.lastExchangeYear,
      nextExchangeYear,
      muted: entry.muted,
      charterLine: entry.charterLine,
      bandLine: bandLine(band),
    };
  });

  rows.sort((a, b) => a.voyageId.localeCompare(b.voyageId));
  const nextState: LedgerState =
    writes === null ? input.stored : { version: 1, rows: writes };
  return { wire: { rows, orders: input.orders }, state: nextState };
}
