// Traffic — what a counterpart does when you speak to it, and how a thread
// is assembled for one reader (A2.5, opened to human threads in A2.6).
//
// ===========================================================================
// THE DERIVATION RULE. READ THIS BEFORE THE CODE.
// ===========================================================================
//
// NO AI CIVILIZATION EVER WRITES ANYTHING. Every act on this side — the reply
// to your hail, the follow-up in a live thread, the lantern's unprompted
// opener — is a PURE FUNCTION of (the stored act log, the seeds, the
// distances), evaluated at read time and STORED NOWHERE. Nothing in this file
// returns a `ContactAct`, nothing in this file can be appended, and the
// alarm queue's contract is untouched: a wake scheduled for a derived
// arrival changes nothing about whether or when that arrival happens. Wipe
// the queue and every reply still lands, one `requestSky` later.
//
// THIS IS THE STAGE'S LOAD-BEARING DECISION, and it is the one the next
// builder will want to undo, because "just store the reply" looks simpler
// from every angle except the one that matters. What it would cost:
// contact.ts's PRESENCE RULE says every writer of an act is a handler whose
// first statement reads a live connection's state. An AI-initiated hail
// written by an alarm is a truth write with nobody present — precisely the
// thing the absence charter forbids — and once one exists, the rule is a
// comment rather than an invariant. Derivation dissolves the tension instead
// of carving an exception into it.
//
// Two properties make derivation sound, and both are load-bearing:
//
//  1. NO RECURSION. Every trigger predicate reads the AI's light-view of the
//     player through `lightConeFor` + `peekTruth` + a clipped emission
//     history. That path touches seeds and distances and NEVER touches
//     `galaxy.acts` on the AI's side, so `observeCiv -> aiBeamCrossing ->
//     deriveAiSignals` does not re-enter `observeCiv`.
//
//  2. STABILITY UNDER LATER WRITES. A derived signal answering stored act A
//     is evaluated at `evalYear = A.sentYear`. Every write to a civ's
//     emission history (`applyBroadcast`) is dated at or after `now`, and
//     `now >= A.sentYear`. So a reply that has already been delivered is
//     byte-identical forever. This is `applyBroadcast`'s OWN safety property,
//     cited by name, and it is why nothing here needs a snapshot.
//
// THE FREE IDENTITY that makes all of this cheap: an AI at distance d
// receives your act sent at year S at its own year S+d, at which moment its
// light-view of you is clipped at (S+d) - d = S. THE EVALUATION YEAR OF
// EVERY TRIGGER IS EXACTLY THE INBOUND ACT'S `sentYear`. No extra machinery,
// no second clock, and the whole rule table below is written against one
// number.
//
// Greppable, and meant to be grepped:
//
//   grep -rn "deriveAiSignals" server/src
//
// must show the definition here, this module's own read paths
// (`aiBeamCrossing`, which is how knowledge.ts's beam branch reaches it, and
// `mergedThreadRows`, which both `buildThreads` and A2.6's
// `threadRefRowsFor` go through), and cohort.ts's READ-SIDE paths only
// (`buildThreads` through `assembleSkyState`, and `scheduleThreadWakes`,
// which schedules a wake and mutates nothing). It must never appear inside a
// handler that mutates `this.storedGalaxy`.
//
// A2.6 NOTE, because it looks like an exception and is not:
// `onSendSignal` — which does append an act — calls `threadRefRowsFor`, and
// that reaches the derivation. It is a READ, and the strongest statement of
// why is that its result is used only to REFUSE: the turnaround floor, a
// verdict's reference, and the mutual quiet's legality. The one derived
// value that survives into storage is an id inside a verdict reference, and
// derived ids are append-only by construction (a new act appends a candidate
// at the end and moves no existing ordinal), so a stored reference cannot
// come to mean something else. If one ever did point at nothing,
// `renderPartsForViewer` renders it as null and the reader sees a verdict on
// a signal they cannot see, which is the honest render of that situation.
//
// NO CLOCK, NO STORAGE. `deriveAiSignals` does not take `nowYear`: it
// produces the FULL set, future-dated arrivals included, and every caller
// filters. That is what makes it testable and what makes the wake queue
// optional rather than authoritative. The only randomness is `createRng`
// seeded on the thread and the ordinal (`reportRemark`'s precedent), so two
// derivations of the same galaxy are byte-identical.
//
// IMPORT DIRECTION. This module imports `lightConeFor`/`peekTruth` from
// knowledge.ts while knowledge.ts imports `aiBeamCrossing` from here. That
// cycle is safe by construction and for exactly the reason contact.ts's
// header gives for its own: both directions are function references resolved
// at CALL time, and neither module reads the other at module-initialization
// time.

import type { CivId, CivSeed, EmissionEpoch } from "./civseed";
import { lightDelayYears } from "./clock";
import {
  BEAM_DWELL_YEARS,
  hasHailed,
  MAX_SIGNALS_PER_THREAD,
  SILENCE_DECLARED_YEARS,
  type ContactAct,
} from "./contact";
// A4: the dial catalog, and the dated-sheet lookup a colony's own word about
// itself is read through. dials.ts imports nothing and carries no truth.
import { DIAL_AXES, dialSheetAt, type DialAxisId } from "./dials";
import { civById, civDistanceLy, starById, type Galaxy } from "./galaxy";
import { emissionAt, lightConeFor, peekTruth, visibleSky, MADE_HEAT_FLOOR } from "./knowledge";
import type { ArchetypeId } from "./minds";
import {
  MAX_SIGNALS_ON_WIRE,
  type AccordRail,
  type ThreadDetail,
  type ThreadSignal,
  type ThreadState,
  type ThreadSummary,
} from "./protocol";
import { questionsFor } from "./questions";
import { createRng } from "./rng";
import {
  accordAvailability,
  buildArchivePart,
  deriveAccord,
  MAX_PARTS_PER_SIGNAL,
  orderParts,
  PER_KIND_CAP,
  renderPartsForViewer,
  type AccordMove,
  type PartKind,
  type SignalPart,
  type SignalTone,
  type ThreadRefRow,
} from "./signalparts";
import { menuReadings } from "./studies";
import { gateFactFree, LIMITS } from "./stylegate";
import {
  ACCORD_CLAUSE,
  SIGNAL_VOICE,
  TONE_CLAUSE,
  type SignalBeat,
  type VoicePool,
} from "./voice";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** How a counterpart handles being spoken to. Four classes, ten archetypes,
 *  total coverage (see COUNTERPART_CLASS). */
export type CounterpartClass = "whisperer" | "lantern" | "congress" | "silent";

/**
 * A DERIVED act. Structurally a ContactAct minus the log fields, and
 * deliberately a different type: it can never be appended, and there is no
 * function in this module that returns a ContactAct.
 */
export interface AiSignal {
  /** `ai/${aiId}/${playerId}/${ordinal}`. Stable across derivations, which
   *  is what lets a wake key and a client list key be the same string. */
  readonly id: string;
  readonly fromCivId: CivId;
  readonly toCivId: CivId;
  /** "hail" only for the lantern's unprompted opener; everything else is a
   *  signal inside a thread the player opened. */
  readonly kind: "hail" | "signal";
  /** The year it left them: the trigger's arrival at them, plus deliberation. */
  readonly sentYear: number;
  /** `sentYear + distanceLy`. */
  readonly arrivesYear: number;
  /** The stored act this answers, or null for the unprompted opener. Points
   *  at a REAL log id; the reverse pointer never exists (see
   *  `ContactAct.inReplyTo`). */
  readonly inReplyTo: string | null;
  /** Composed and gated at construction, through the SAME composer the human
   *  path uses (`composeSignalBody`). */
  readonly body: string;
  /** A2.6: exactly one tone, drawn seeded from the class's pool or forced by
   *  an accord move. Every reply carries one, because every signal does. */
  readonly tone: SignalTone;
  /** A2.6: the payload, assembled from the counterpart's OWN state through
   *  the same part shapes a human composes into. References inside it hold
   *  underlying ids; `buildThreads` re-renders them for the viewer. */
  readonly parts: readonly SignalPart[];
  /**
   * Which beat the voice clause came from. Not on the wire and not in the
   * prose: `buildThreads` reads it to decide that a thread is `withdrawn`,
   * which is a state the player can see and a fact about their OWN light
   * (something of theirs went bright), never about the counterpart's present.
   */
  readonly beat: SignalBeat;
}

/**
 * The instrument readout above a received payload. Every number a thread
 * shows lives here and NONE of them lives in the prose, which is what lets
 * the reply templates carry no facts and therefore need no pinned-fact
 * machinery at all.
 */
export interface PhysicsStamp {
  /** = distanceLy, by clock.ts's identity. Named separately because the
   *  reader is being told two different things. */
  readonly transitYears: number;
  readonly distanceLy: number;
  /** 0..1, how much of the beam arrived. */
  readonly receivedFraction: number;
  /** 1 - receivedFraction, so the client never subtracts. */
  readonly degradation: number;
  readonly sentYear: number;
  readonly arrivedYear: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The range a transmitter is trimmed for. */
const BEAM_REFERENCE_LY = 5;

/** However far away, something arrives. A beam is aimed. */
const RECEIVED_FLOOR = 0.02;

/**
 * Below this, the counterpart's light-view of you reads as quiet.
 * A whisperer's whole trigger.
 */
const DARK_LEVEL = 0.08;

/** How long that quiet must have held before a whisperer believes it. Six
 *  centuries: the whisperer is answering a DISPOSITION, not a lull. */
const DARK_HOLD_YEARS = 600;

/** Above this, the counterpart's light-view of you reads as loud. It is what
 *  a lantern comes looking for and what a whisperer leaves over. */
const BRIGHT_LEVEL = 0.3;

/** Structural bound on the lantern's unprompted opener: it may hail a given
 *  player ONCE, ever. Enforced by construction (at most one candidate is
 *  ever built), not by a counter. */
const MAX_UNPROMPTED_PER_PAIR = 1;

/**
 * HOW LONG A COUNTERPART THINKS, in game years, before its answer departs.
 * THIS TABLE IS THE FEEL OF THE STAGE. At the shipped clock ratio (5 real
 * minutes per game year) it reads:
 *
 *   whisperer  2.5 y = 12.5 real minutes   it is not in a hurry and says so
 *   lantern    0.4 y =  2 real minutes     it was already talking
 *   congress   1.6 y =  8 real minutes     it had to be put to a vote
 *
 * The worked phone check, 6.8 ly, whisperer: hail at 20:00, beam lands
 * 20:34, reply departs 20:47, reply arrives 21:21. Eighty-one real minutes
 * round trip, three exchanges across an evening.
 *
 * The whisperer's UNHURRIEDNESS lives in its prose, not in this number (the
 * absence charter: the waiting is voiced, not mechanized). It keeps the
 * longest deliberation of the three and that is all the mechanism it gets.
 */
export const DELIBERATION_YEARS: Readonly<Record<CounterpartClass, number>> = {
  whisperer: 2.5,
  lantern: 0.4,
  congress: 1.6,
  silent: 0,
};

/** Deliberation is jittered by this fraction either way, SEEDED on the thread
 *  and ordinal, so it is the same number on every derivation forever. */
const DELIB_JITTER = 0.2;

/** The longest any counterpart can take to DELIBERATE, recess aside. Kept as
 *  the honest name for that quantity; A2.6 measures the `silent` state
 *  against contact.ts's SILENCE_DECLARED_YEARS instead, which is the same
 *  number on a human thread and on this one. */
export const MAX_DELIBERATION_YEARS =
  Math.max(...Object.values(DELIBERATION_YEARS)) * (1 + DELIB_JITTER);

/**
 * A2.6, THE RECESS. Roughly one reply in four does not go out when it was
 * ready: the counterpart puts it down and comes back to it, on a scale a
 * human away-time is drawn on.
 *
 * This exists to make LONG SILENCE UNPROVABLE. Without it, deliberation is
 * bounded by fifteen real minutes, so any quiet longer than that is a
 * machine-free zone and every human on a thread is legible by the clock
 * alone. With it, a gap of hours is ordinary on both kinds of thread, which
 * is what the silence predicate needs in order to say nothing about who is
 * out there. The seeded draw means a delivered reply's departure year is the
 * same forever (traffic.ts's stability property, unchanged).
 *
 * At five real minutes per game year: 12 y is one real hour, 96 y is eight.
 * contact.ts's SILENCE_DECLARED_YEARS sits three times above the longest of
 * them; the arithmetic is written out there.
 */
const RECESS_CHANCE = 0.25;
const RECESS_MIN_YEARS = 12;
const RECESS_MAX_YEARS = 96;

/** A2.6: which tones a class reaches for. Seeded, so a counterpart's habits
 *  are stable and eventually readable as character — the deferral precedent
 *  (a fact about who you are speaking to, not a die roll). Every pool holds
 *  more than one entry, because a class that always sent the same tone would
 *  be identifiable by tone alone. */
const CLASS_TONES: Readonly<Record<CounterpartClass, readonly SignalTone[]>> = {
  whisperer: ["guarded", "reluctant", "plain"],
  lantern: ["open", "plain", "urgent"],
  congress: ["plain", "open", "guarded"],
  silent: ["plain"],
};

/** A2.6: the share a seeded counterpart's own reading carries. Bounded well
 *  inside studies.ts's SHARE_FLOOR/SHARE_CEIL: a counterpart is confident,
 *  never certain, and never usefully precise. */
const AI_SHARE_MIN = 0.45;
const AI_SHARE_MAX = 0.85;

/** A2.6: how often a counterpart's finding travels with its working. Matches
 *  the human lever exactly — an empty evidence list is a headline — so
 *  neither depth is ever a tell about which path composed the part. */
const AI_FULL_FINDING_CHANCE = 0.5;

/** A congress whose voice-silence dial sits this close to balanced cannot
 *  settle the first vote, and answers with the disagreement instead. */
const VOTE_CLOSE_BAND = 0.2;

/** Slop at a light-cone edge; knowledge.ts's LIGHT_CONE_EPS, same reason. */
const CLIP_EPS = 1e-6;

/** Slop at a beam's departure edge; contact.ts's BEAM_EPS, same reason. */
const BEAM_EPS = 1e-6;

/** Slop on the year comparisons that decide a thread's state. */
const YEAR_EPS = 1e-6;

// ---------------------------------------------------------------------------
// The class table
// ---------------------------------------------------------------------------

/**
 * All ten archetypes map, and the mapping is a reading of §4's voice cards
 * rather than a dial threshold:
 *
 *  lantern    beacon, tide, herald        loud by constitution; transmitting
 *                                         is what they are for
 *  whisperer  monument, cloister,         speak only to a proven silence. The
 *             sowing, shepherd            shepherd will not speak to anything
 *                                         loud, because loud is what it
 *                                         protects its wards from
 *  congress   congress, engine            deliberative; answers on a schedule
 *                                         and minutes it
 *  silent     phoenix                     never answers. The self you hailed
 *                                         is gone.
 */
const COUNTERPART_CLASS: Readonly<Record<ArchetypeId, CounterpartClass>> = {
  beacon: "lantern",
  tide: "lantern",
  herald: "lantern",
  monument: "whisperer",
  cloister: "whisperer",
  sowing: "whisperer",
  shepherd: "whisperer",
  congress: "congress",
  engine: "congress",
  phoenix: "silent",
};

export function counterpartClass(a: ArchetypeId): CounterpartClass {
  return COUNTERPART_CLASS[a];
}

/**
 * A4: the first year this civilization could have transmitted anything —
 * the start of its emission record, or its ascension if it somehow has none.
 * For a seeded civ this sits millennia in the past and constrains nothing;
 * for a founded colony it is the year its own light begins, and it is the
 * whole of the causality fix at `deriveAiSignals`' push site.
 *
 * FOR A TORCH OR A SAIL THAT IS THE BRAKING BURN, which starts before the
 * landfall year (voyages.ts, physics-audit.md P1-3), so such a colony may
 * answer while it is still coming in. That reads correctly rather than
 * loosely: the thing under the burn is a ship with a working reactor and the
 * charter aboard, and a reply it sends on approach still arrives at
 * `sentYear + d`, which no observer can read before the fold has admitted the
 * colony anyway.
 */
function existsFromYear(seed: CivSeed): number {
  return seed.emissionHistory[0]?.fromYear ?? seed.ascensionYear;
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/**
 * What the arriving beam MEASURES: an inverse-square fall-off against the
 * range the transmitter was trimmed for. At 3 ly it reads 0.74; at 6.8 ly,
 * 0.35; at 15 ly, 0.10.
 *
 * THIS IS NOT `BEAM_RECEIVED_LEVEL` (contact.ts, 0.40), AND UNIFYING THE TWO
 * WOULD BREAK A2.4. They are different quantities that happen to share a
 * range:
 *
 *  - `BEAM_RECEIVED_LEVEL` is a CLASSIFICATION floor. `observeCiv` assigns it
 *    so that a dark civilization can always make itself seen by exactly one
 *    observer, at any distance. It is a guarantee, and a distance-dependent
 *    guarantee is not one.
 *  - `receivedFraction` is a MEASUREMENT of the beam that actually landed. It
 *    is rendered as the thread's instrument header, it falls off with
 *    distance because that is what a beam does, and nothing depends on it
 *    being above any threshold.
 *
 * The first says "you can see them". The second says "and here is how badly
 * the crossing cost". Both ship.
 */
function receivedFraction(distanceLy: number): number {
  const ref = BEAM_REFERENCE_LY * BEAM_REFERENCE_LY;
  const raw = ref / (ref + distanceLy * distanceLy);
  return Math.min(1, Math.max(RECEIVED_FLOOR, raw));
}

/** Derived at delivery from the distance alone. `relayPath` has no machinery
 *  behind it in A2.5 and is deliberately not on the wire. */
export function stampFor(distanceLy: number, sentYear: number): PhysicsStamp {
  const transitYears = lightDelayYears(distanceLy);
  const received = receivedFraction(distanceLy);
  return {
    transitYears,
    distanceLy,
    receivedFraction: received,
    degradation: 1 - received,
    sentYear,
    arrivedYear: sentYear + transitYears,
  };
}

// ---------------------------------------------------------------------------
// The rule table
// ---------------------------------------------------------------------------
//
// EVERY PREDICATE BELOW READS ONLY THE COUNTERPART'S LIGHT-VIEW OF THE
// PLAYER: the emission history clipped at the cone's `asOfYear`, which the
// free identity above puts at exactly the trigger's own year. No
// `civTruthAt` on the player above the cone; no read of the player's dials,
// stocks, studies, projects or archetype, ever, at any year. A bright epoch
// dated AFTER the evaluation year cannot change a reply that was already
// derivable, which is the whole of invariant (c).

/** The player's emission history as this counterpart could have seen it. */
function clippedHistory(
  history: readonly EmissionEpoch[],
  asOfYear: number,
): readonly EmissionEpoch[] {
  return history.filter((e) => e.fromYear <= asOfYear + CLIP_EPS);
}

/**
 * An epoch below DARK_LEVEL began at year y, no later epoch at or above
 * DARK_LEVEL has begun since, and the quiet has held DARK_HOLD_YEARS. The
 * whisperer's entire trigger, and the reason it answers a silent world and
 * not a loud one.
 */
function heldDark(clip: readonly EmissionEpoch[], evalYear: number): boolean {
  let darkSince: number | null = null;
  for (const epoch of clip) {
    if (epoch.fromYear > evalYear + CLIP_EPS) break;
    if (epoch.level >= DARK_LEVEL) darkSince = null;
    else if (darkSince === null) darkSince = epoch.fromYear;
  }
  if (darkSince === null) return false;
  return evalYear - darkSince >= DARK_HOLD_YEARS;
}

/** Something at or above BRIGHT_LEVEL began after `sinceYear` and is visible
 *  by `evalYear`. What ends a whisperer's participation, permanently. */
function brightAfter(
  clip: readonly EmissionEpoch[],
  sinceYear: number,
  evalYear: number,
): boolean {
  return clip.some(
    (e) =>
      e.level >= BRIGHT_LEVEL &&
      e.fromYear > sinceYear + CLIP_EPS &&
      e.fromYear <= evalYear + CLIP_EPS,
  );
}

/**
 * The first year the player was ever loud. The lantern's unprompted opener
 * hangs off this and nothing else: it learns of that year at `y* + d`,
 * deliberates, and its hail arrives at `y* + 2d + delib`. Causality is free
 * here — the learn year is derived FROM the trigger year, so the lantern can
 * never act on light that has not reached it.
 */
function firstBrightYear(history: readonly EmissionEpoch[]): number | null {
  for (const epoch of history) {
    if (epoch.level >= BRIGHT_LEVEL) return epoch.fromYear;
  }
  return null;
}

/**
 * A5: the first year the player's own world was ever read as RUNNING HOT —
 * the first upward crossing of MADE_HEAT_FLOOR at or after cohort year 0. The
 * congress's unprompted opener hangs off this and nothing else.
 *
 * It is a different question from `firstBrightYear`, and the difference is the
 * character of who is asking. A lantern comes looking for something LOUD, so
 * it reads a level. A congress is the natural interlocutor for a world that
 * has just begun to run hot, so it reads a CROSSING: the year a neighborhood
 * would first have had to classify the player as made heat rather than as a
 * biosphere with weather. The at-or-after-year-0 clause keeps a seeded civ's
 * own authored industrial rise, which is millennia deep, from counting as
 * something that just happened.
 *
 * It reads the player's emission history, which is the same clipped structure
 * every other predicate in this table reads. BEHAVIOR NEVER TOUCHES A PLAYER'S
 * HISTORY (a5-synthesis.md R5), so `heldDark`, `brightAfter`, `firstBrightYear`
 * and this are all provably unmoved by A5's fold.
 */
function firstWarmYear(history: readonly EmissionEpoch[]): number | null {
  let previous = 0;
  for (const epoch of history) {
    const crossed = previous < MADE_HEAT_FLOOR && epoch.level >= MADE_HEAT_FLOOR;
    previous = epoch.level;
    if (crossed && epoch.fromYear >= 0) return epoch.fromYear;
  }
  return null;
}

/**
 * A5: WHO OPENS UNPROMPTED, AND ON WHAT. Keyed on ARCHETYPE rather than on
 * counterpart class, which is both more legible and the point of the change —
 * it lets the engine sit out while the congress speaks, and the two of them
 * share a class.
 *
 * Six archetypes never open unprompted, and `null` says so in the table rather
 * than by omission, so a new archetype cannot acquire an opener by accident.
 * MAX_UNPROMPTED_PER_PAIR is preserved BY CONSTRUCTION exactly as before: at
 * most one candidate is ever built per pair, whichever row matched.
 */
type UnpromptedTrigger = "first-bright" | "first-warm";

const UNPROMPTED_OPENER: Readonly<Record<ArchetypeId, UnpromptedTrigger | null>> = {
  beacon: "first-bright",
  tide: "first-bright",
  herald: "first-bright",
  congress: "first-warm",
  engine: null,
  monument: null,
  cloister: null,
  sowing: null,
  shepherd: null,
  phoenix: null,
};

/**
 * The congress cannot call it. Deterministic and legible rather than random:
 * a body whose voice-silence dial sits near balanced really is a body that
 * splits, and the player can eventually read the deferral as a fact about
 * WHO they are speaking to rather than as a die roll.
 */
function voteClose(dialPosition: number): boolean {
  return Math.abs(dialPosition) < VOTE_CLOSE_BAND;
}

/** Seeded, so it is the same number on every derivation forever. */
function deliberationFor(
  cls: CounterpartClass,
  threadId: string,
  ordinal: number,
): number {
  const base = DELIBERATION_YEARS[cls];
  const jitter = createRng(`delib/${threadId}/${ordinal}`).range(-DELIB_JITTER, DELIB_JITTER);
  return base * (1 + jitter);
}

// ---------------------------------------------------------------------------
// The composer
// ---------------------------------------------------------------------------

/**
 * THE NO-IMMEDIATE-REPEAT DRAW.
 *
 * WHY IT EXISTS. A2.6's flagged top risk is that the rendered lines are dull,
 * and the shape of dullness on this stage is REPETITION: an evening of the fun
 * gate is roughly seven signals a side, so a pool handing back the sentence it
 * handed back last time is the failure a reader actually notices. Deepening
 * the banks lowers the odds; it does not remove the case, because an
 * independent draw over a pool of five collides one time in five.
 *
 * WHAT IT DOES. The index for ordinal N is the seeded draw for N, stepped one
 * forward whenever it lands on the index this same walk produced for N-1. The
 * walk is recomputed from ordinal zero on every call, so the comparison is
 * against the EFFECTIVE previous index rather than the raw one, and two
 * neighbouring signals cannot land on the same line of a pool with more than
 * one entry in it. Cheap: the walk is bounded by MAX_SIGNALS_PER_THREAD.
 *
 * WHY IT IS BYTE-STABLE FOREVER, which is the property traffic.ts's header
 * calls load-bearing. It is a PURE FUNCTION of (key, ordinal, poolSize): no
 * stored state, no clock, no dependence on what was actually delivered or on
 * when anybody read it. Nothing upstream can change the walk for an ordinal
 * that already exists, because appending a signal only adds ordinals at the
 * end and never renumbers one. So a reply that has already been read composes
 * to the same bytes on every later derivation, and a derived thread still
 * needs no snapshot. (A change to the pool's SIZE is a different walk, which
 * is the honest statement of what expanding a bank does: it is a prose
 * revision, and it is why the banks are expanded once and then left alone.)
 *
 * Applied INDEPENDENTLY to the voice clause, the tone clause and the accord
 * clause, on three separate seed keys, so a repeat in one half of a body does
 * not drag the other half along with it.
 */
function drawIndex(key: string, ordinal: number, poolSize: number): number {
  let index = -1;
  for (let n = 0; n <= ordinal; n++) {
    const raw = Math.floor(createRng(`${key}/${n}`).next() * poolSize);
    index = poolSize > 1 && raw === index ? (raw + 1) % poolSize : raw;
  }
  return index;
}

/** One line from a non-empty pool. Total by the tuple's own shape. */
function drawFrom(pool: VoicePool, key: string, ordinal: number): string {
  return pool[drawIndex(key, ordinal, pool.length)] ?? pool[0];
}

/**
 * THE ONE COMPOSER, USED BY BOTH PATHS.
 *
 *   body = (ACCORD_CLAUSE[move] ?? TONE_CLAUSE[tone]) + " " + voice clause
 *
 * The opening says HOW IT WAS SENT (or, when the beam carries a move in the
 * mutual quiet, what the move is); the voice clause is §4's archetype
 * register and says nothing about the recipient at all. Neither may carry a
 * number, because every number in a signal is on the stamp or inside a typed
 * part, where the two could not disagree.
 *
 * A2.5's observation clause is gone from here on purpose: it stated what the
 * counterpart's own light-view of the player carried, which no human composer
 * could ever produce, so it identified the sender's nature in one glance. One
 * distribution, not two look-alikes (voice.ts's header carries the argument).
 *
 * Gated at construction against LIMITS.signal. A rejection falls back to the
 * OPENING CLAUSE ALONE, which is already gate-clean on its own: "reject, then
 * template, never retry" is the gate's own policy, and there is nothing to
 * retry here because nothing was generated.
 */
export function composeSignalBody(
  archetype: ArchetypeId,
  tone: SignalTone,
  parts: readonly SignalPart[],
  beat: SignalBeat,
  threadId: string,
  ordinal: number,
): string {
  const move = accordMoveOf(parts);
  const opening =
    move === null
      ? drawFrom(TONE_CLAUSE[tone], `tone/${threadId}`, ordinal)
      : drawFrom(ACCORD_CLAUSE[move], `accord/${threadId}`, ordinal);
  const card = SIGNAL_VOICE[archetype];
  // `follow` is the fallback as well as the ordinary case: six archetypes
  // have no `withdraw` pool, and a body that went bare on those would be a
  // tell about which archetypes can leave.
  const pool =
    beat === "open" ? card.open : beat === "withdraw" ? (card.withdraw ?? card.follow) : card.follow;
  // The seed key is unchanged from A2.5 (`signal/thread/ordinal`), so the pick
  // moves only because the pools got deeper.
  const clause = drawFrom(pool, `signal/${threadId}`, ordinal);
  const verdict = gateFactFree(`${opening} ${clause}`, LIMITS.signal);
  return verdict.ok ? verdict.line : opening;
}

/** The accord move a signal carries, or null. At most one accord part rides
 *  a signal (PER_KIND_CAP), so this is total. */
export function accordMoveOf(parts: readonly SignalPart[]): AccordMove | null {
  for (const part of parts) {
    if (part.kind === "accord") return part.move;
  }
  return null;
}

/**
 * Which beat a SENDER is speaking from, computed identically on both paths:
 * a withdraw in the mutual quiet is the withdraw beat (which is what makes
 * `withdrawn` reachable on a human thread — A2.5's tell was that only a
 * whisperer could ever reach it), an opening signal opens, everything else
 * follows.
 */
function beatFor(parts: readonly SignalPart[], senderSignalIndex: number): SignalBeat {
  if (accordMoveOf(parts) === "withdraw") return "withdraw";
  return senderSignalIndex === 0 ? "open" : "follow";
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/** Your acts aimed at them, in commit order. Bounded, so a derivation's cost
 *  is bounded whatever the log does. */
function actsBetween(
  acts: readonly ContactAct[],
  fromCivId: CivId,
  toCivId: CivId,
): readonly ContactAct[] {
  return acts
    .filter(
      (a) =>
        (a.kind === "hail" || a.kind === "signal") &&
        a.fromCivId === fromCivId &&
        a.toCivId === toCivId,
    )
    .slice(0, MAX_SIGNALS_PER_THREAD);
}

/**
 * One thing the counterpart might speak about, and the year it learns of it.
 *
 * ORDINALS ARE ASSIGNED BEFORE DELIBERATION IS DRAWN, from a key that does
 * not depend on it — otherwise the jitter would depend on the ordering and
 * the ordering on the jitter. `evalYear` is the trigger's own year; the
 * learn year is `evalYear + d` for every candidate alike, so ordering by one
 * orders by the other.
 */
interface Candidate {
  readonly kind: "hail" | "signal";
  readonly evalYear: number;
  readonly inReplyTo: string | null;
  /** The act that triggered this, for reading what it carried. Null on the
   *  lantern's unprompted opener, which answers nothing. */
  readonly act: ContactAct | null;
  /** Hail before signal at an identical year, so the ordering is total. */
  readonly tie: number;
}

// ---------------------------------------------------------------------------
// The counterpart's own composer (A2.6)
// ---------------------------------------------------------------------------
//
// A counterpart answers IN PARTS, through the same shapes a player composes
// into, and every part is built from state the counterpart itself holds: its
// own sky, its own seed, and its LIGHT-VIEW OF THE PLAYER — which is the
// universal source, the one thing every counterpart can always speak from
// ("here is what your light has done, as we have it"). That view is the same
// clipped history every trigger predicate already reads, so speaking costs
// the derivation no new capability and can leak nothing a trigger could not.
//
// The class table is character, and each row is performable by a human, which
// is what makes it safe to ship: a whisperer declines to reciprocate a
// sighting, and so may anybody.

/** Never a carrier when a move in the mutual quiet is riding: an accord beam
 *  exists to carry the move. Otherwise a counterpart sometimes sends nothing
 *  but the beam, because a player can, and an empty signal that only ever
 *  came from a person would be the cheapest tell in the game. */
const CARRIER_CHANCE = 0.12;

interface AiComposeInput {
  readonly g: Galaxy;
  readonly aiId: CivId;
  readonly playerId: CivId;
  readonly cls: CounterpartClass;
  readonly beat: SignalBeat;
  /** The trigger's own year — and, by the free identity, the year the
   *  counterpart's light-view of the player is clipped at. */
  readonly evalYear: number;
  readonly distanceLy: number;
  /** The player's emission history as this counterpart could have seen it. */
  readonly clip: readonly EmissionEpoch[];
  /** What the act being answered carried, or empty. */
  readonly inbound: readonly SignalPart[];
  /** The underlying id of the act being answered, for a verdict's reference. */
  readonly inboundId: string | null;
  /** A move in the mutual quiet this reply owes, and the offer it answers. */
  readonly accordMove: AccordMove | null;
  readonly accordRef: string | null;
  readonly threadId: string;
  readonly ordinal: number;
}

function roundShare(share: number): number {
  return Math.round(share * 100) / 100;
}

/** Sources this counterpart can see, minus the player themselves. Only
 *  reached when a reply actually names a third party, which is rare — the
 *  ordinary reply speaks from the light-view and the seed. */
function ownSky(input: AiComposeInput): ReturnType<typeof visibleSky> {
  return visibleSky(input.g, input.aiId, input.evalYear + input.distanceLy).filter(
    (o) => o.targetId !== input.playerId,
  );
}

/** THE UNIVERSAL SOURCE. Every class can send this, always. */
function aiArchiveOfPlayer(input: AiComposeInput, window: "recent" | "long"): SignalPart {
  return buildArchivePart(
    starById(input.g.stars, civById(input.g, input.playerId).starId).id,
    false,
    input.clip,
    input.evalYear,
    window,
  );
}

function aiSighting(input: AiComposeInput, rng: ReturnType<typeof createRng>): SignalPart | null {
  const sky = ownSky(input);
  if (sky.length === 0) return null;
  const seen = rng.pick(sky);
  return {
    kind: "sighting",
    subjectStarId: seen.starId,
    signalClass: seen.signal.classification,
    asOfYear: seen.asOfYear,
  };
}

/**
 * A reading of a third source, as this counterpart holds it. Seeded and
 * therefore stable forever, and DELIBERATELY NOT SCORED AGAINST THE TRUTH:
 * a counterpart's belief can be wrong in exactly the way a player's frozen
 * call can be wrong, and the reader's only recourse is the same one they
 * have against a human — check the ages, and go look themselves.
 */
function aiFinding(input: AiComposeInput, rng: ReturnType<typeof createRng>): SignalPart | null {
  const sky = ownSky(input);
  if (sky.length === 0) return null;
  const seen = rng.pick(sky);
  const readings = menuReadings(seen.signal.classification);
  if (readings.length === 0) return null;
  const reading = rng.pick(readings);
  // The evidence list is the same omission lever the human composer has: an
  // empty one is a headline, and neither depth may be a tell about the path.
  const questions = questionsFor(seen.signal.classification);
  const evidence = rng.chance(AI_FULL_FINDING_CHANCE)
    ? questions.slice(0, rng.int(1, Math.min(3, questions.length))).map((q) => q.id)
    : [];
  return {
    kind: "finding",
    subjectStarId: seen.starId,
    hypothesisId: reading.id,
    label: reading.label,
    gloss: reading.gloss,
    share: roundShare(rng.range(AI_SHARE_MIN, AI_SHARE_MAX)),
    basis: "called",
    asOfYear: seen.asOfYear,
    calledYear: input.evalYear,
    evidence,
  };
}

function aiCulture(input: AiComposeInput, rng: ReturnType<typeof createRng>, opening: boolean): SignalPart {
  const seed = civById(input.g, input.aiId).seed;
  // The opening beat leads with the founding epigraph; later beats reach for
  // a line of the history instead. Both are catalog prose and neither
  // interpolates the civilization's name (signalparts.ts states the check).
  if (opening || seed.chronicle.length === 0) {
    return { kind: "culture", source: "charter", index: 0, axis: null, pole: null, text: seed.charter };
  }
  const index = rng.int(0, seed.chronicle.length - 1);
  const line = seed.chronicle[index];
  if (line === undefined) {
    return { kind: "culture", source: "charter", index: 0, axis: null, pole: null, text: seed.charter };
  }
  return { kind: "culture", source: "chronicle", index, axis: null, pole: null, text: line };
}

/**
 * A4: ONE DIAL, READ OFF THE SHEET THIS CIVILIZATION ACTUALLY HOLDS.
 *
 * `walkedDials` is a colony's dated record of where its dials have gone since
 * it was founded (voyages.ts's `foundingWalkedDials`); every other
 * civilization in the game has none and falls back to the sheet it was seeded
 * with, which is exactly what it did before this existed. The lookup is by the
 * TRIGGER YEAR, so a reply composed in the year it was sent states what was
 * true then and stays byte-identical on every later derivation.
 *
 * This is what makes a founding's drift readable: a colony asked what it
 * believes answers with the pole it holds, and a parent comparing that against
 * the charter is comparing two things that were both actually said.
 * Structurally identical to signalparts.ts's `materializeCulture` dial arm, so
 * the two paths emit the same shape and a part says nothing about which side
 * composed it.
 */
function aiCultureDial(input: AiComposeInput, rng: ReturnType<typeof createRng>): SignalPart {
  const civ = civById(input.g, input.aiId);
  const index = rng.int(0, DIAL_AXES.length - 1);
  const axis = DIAL_AXES[index];
  if (axis === undefined) return aiCulture(input, rng, false);
  const sheet = dialSheetAt(civ.walkedDials ?? [], civ.seed.dials, input.evalYear);
  const leaning = sheet[axis.id].position < 0 ? axis.left : axis.right;
  return {
    kind: "culture",
    source: "dial",
    index,
    axis: axis.id,
    pole: leaning.inWorld,
    text: leaning.gloss,
  };
}

function aiRequest(input: AiComposeInput, rng: ReturnType<typeof createRng>): SignalPart {
  const want = rng.pick(["finding", "sighting", "archive", "culture"] as const);
  // Either an open ask, or one aimed at the player's own star — which this
  // counterpart certainly sees, because the player aimed a beam at it.
  const aimed = rng.chance(0.5);
  return {
    kind: "request",
    want,
    subjectStarId: aimed ? civById(input.g, input.playerId).starId : null,
  };
}

function aiVerdict(input: AiComposeInput, rng: ReturnType<typeof createRng>): SignalPart | null {
  if (input.inboundId === null) return null;
  const index = input.inbound.findIndex((p) => p.kind === "finding");
  if (index < 0) return null;
  return {
    kind: "verdict",
    signalId: input.inboundId,
    partIndex: index,
    stance: rng.pick(["confirm", "contradict", "nothing"] as const),
  };
}

/** Caps, then canonical order. The human path REFUSES an over-cap selection
 *  (the client built it and can fix it); this path TRIMS, because nobody is
 *  there to be told. Both emit a list obeying the same bounds in the same
 *  order, which is the only thing the wire can see. */
function capParts(parts: readonly SignalPart[]): readonly SignalPart[] {
  const counts = new Map<PartKind, number>();
  const kept: SignalPart[] = [];
  for (const part of parts) {
    if (kept.length >= MAX_PARTS_PER_SIGNAL) break;
    const next = (counts.get(part.kind) ?? 0) + 1;
    if (next > PER_KIND_CAP[part.kind]) continue;
    counts.set(part.kind, next);
    kept.push(part);
  }
  return orderParts(kept);
}

function aiTone(
  cls: CounterpartClass,
  beat: SignalBeat,
  accordMove: AccordMove | null,
  rng: ReturnType<typeof createRng>,
): SignalTone {
  if (accordMove === "accept" || accordMove === "offer") return "guarded";
  if (accordMove === "decline" || accordMove === "withdraw") return "reluctant";
  if (beat === "withdraw") return "reluctant";
  return rng.pick(CLASS_TONES[cls]);
}

/**
 * THE REPLY TABLE (R10). What came in decides what goes out, and the class
 * decides how. Seeded throughout, so a delivered reply is byte-identical on
 * every later derivation.
 */
function composeAiParts(input: AiComposeInput): {
  readonly tone: SignalTone;
  readonly parts: readonly SignalPart[];
} {
  const rng = createRng(`parts/${input.threadId}/${input.ordinal}`);
  const tone = aiTone(input.cls, input.beat, input.accordMove, rng);
  const parts: SignalPart[] = [];

  if (input.accordMove !== null) {
    parts.push({
      kind: "accord",
      form: "mutual-quiet",
      move: input.accordMove,
      ref: input.accordRef,
    });
  } else if (rng.chance(CARRIER_CHANCE)) {
    return { tone, parts: [] };
  }

  const inKinds = new Set(input.inbound.map((p) => p.kind));
  const opening = input.beat === "open";
  const push = (part: SignalPart | null): void => {
    if (part !== null) parts.push(part);
  };
  // A4: an ASK IS ANSWERED BEFORE A FLOURISH. Only one culture part survives
  // the per-kind cap, and a class that has already led with its charter would
  // otherwise push the answer to a direct question straight off the end of the
  // list. Whoever asked gets the slot.
  const answerCulture = (part: SignalPart): void => {
    const at = parts.findIndex((p) => p.kind === "culture");
    if (at >= 0) parts[at] = part;
    else parts.push(part);
  };
  const answerRequest = (): void => {
    for (const part of input.inbound) {
      if (part.kind !== "request") continue;
      if (part.want === "finding") push(aiFinding(input, rng));
      else if (part.want === "sighting") {
        // A whisperer will not hand over coordinates, and says who it is by
        // answering with itself instead. A human can perform the same refusal.
        push(input.cls === "whisperer" ? aiCulture(input, rng, false) : aiSighting(input, rng));
      } else if (part.want === "archive") push(aiArchiveOfPlayer(input, "long"));
      // A4 (synthesis R3): ASKED WHO YOU ARE, ANSWER WITH A DIAL. The charter
      // and the chronicle are what a civilization was; a dial is what it is
      // now, and it is the only culture part that carries an axis and a pole
      // for a reader to compare anything against. It is also the coverage
      // lever the Ledger's drift rests on — a parent who never asks reads one
      // axis forever, and asking is how the sample grows.
      else answerCulture(aiCultureDial(input, rng));
    }
  };

  switch (input.cls) {
    case "lantern":
      // It was already talking, and it reciprocates in kind.
      if (inKinds.has("sighting")) push(aiSighting(input, rng));
      if (inKinds.has("finding")) push(aiArchiveOfPlayer(input, "recent"));
      if (inKinds.has("archive")) push(aiArchiveOfPlayer(input, "long"));
      answerRequest();
      if (opening) push(aiCulture(input, rng, true));
      if (parts.length === 0) {
        push(rng.chance(0.5) ? aiFinding(input, rng) : aiArchiveOfPlayer(input, "long"));
        push(aiRequest(input, rng));
      }
      break;
    case "whisperer":
      // It answers a proven silence, and it does not trade coordinates.
      if (inKinds.has("sighting")) push(aiCulture(input, rng, false));
      if (opening) {
        push(aiCulture(input, rng, true));
        push(aiRequest(input, rng));
      }
      answerRequest();
      if (parts.length === 0) push(aiArchiveOfPlayer(input, "long"));
      break;
    case "congress":
      // Minutes of a meeting: the record it holds, and the vote on yours.
      if (inKinds.has("finding")) {
        push(aiArchiveOfPlayer(input, "recent"));
        push(aiVerdict(input, rng));
      }
      if (inKinds.has("sighting")) push(aiSighting(input, rng));
      answerRequest();
      if (opening) push(aiCulture(input, rng, true));
      if (parts.length === 0) {
        push(rng.chance(0.5) ? aiFinding(input, rng) : aiArchiveOfPlayer(input, "recent"));
      }
      break;
    case "silent":
      break;
  }

  return { tone, parts: capParts(parts) };
}

/**
 * THE FULL, FUTURE-INCLUSIVE set of derived acts from `aiId` to `playerId`.
 * Pure, total, clock-free and deterministic. Callers filter by arrival.
 *
 * Empty for a player-controlled counterpart, for the silent class, and for a
 * pair with nothing to say — all three by returning early rather than by
 * producing signals nobody may see.
 */
export function deriveAiSignals(
  g: Galaxy,
  aiId: CivId,
  playerId: CivId,
): readonly AiSignal[] {
  if (aiId === playerId) return [];
  const ai = civById(g, aiId);
  // A counterpart is a seeded civilization. A player never answers by rule:
  // their side of a thread is the acts they committed, and A2.6's
  // `buildThreads` reads those directly.
  if (ai.controller !== "ai") return [];
  // AND THE MIRROR, which A2.6 needs and A2.5 did not: derivation exists so a
  // PLAYER can read an answer. Without this line, a reply's part list (which
  // reads the counterpart's own sky) would re-enter `observeCiv`, and
  // `observeCiv -> aiBeamCrossing -> deriveAiSignals -> ownSky -> observeCiv`
  // would recurse without bound. With it, the chain stops dead one level in.
  // NOT a branch in the signal path (`onSendSignal` names no controller
  // anywhere); a bound on what the derivation is FOR.
  if (civById(g, playerId).controller !== "player") return [];
  // A4: a colony chartered `answer-nothing` is silent by INSTRUCTION rather
  // than by character, so the override sits here and not in the class table —
  // its archetype is whatever its dials say, and it keeps that archetype's
  // voice for every other purpose. The flag is derived-only and set by exactly
  // one producer (voyages.ts's `childCivFor`); every stored civ in the game
  // leaves it absent.
  const cls: CounterpartClass =
    ai.answersNothing === true ? "silent" : counterpartClass(ai.seed.archetype);
  if (cls === "silent") return [];

  const player = civById(g, playerId);
  const d = civDistanceLy(g, aiId, playerId);
  // Seeded per cohort as well as per pair, so two cohorts running the same
  // archetype at the same distance do not draw the same variants.
  const threadId = `${g.seedKey}/${aiId}/${playerId}`;
  const inbound = actsBetween(g.acts, playerId, aiId);

  const candidates: Candidate[] = [];
  const opener = UNPROMPTED_OPENER[ai.seed.archetype];
  if (opener !== null && MAX_UNPROMPTED_PER_PAIR > 0) {
    const year =
      opener === "first-bright"
        ? firstBrightYear(player.seed.emissionHistory)
        : firstWarmYear(player.seed.emissionHistory);
    if (year !== null) {
      candidates.push({ kind: "hail", evalYear: year, inReplyTo: null, act: null, tie: 0 });
    }
  }
  for (const act of inbound) {
    candidates.push({
      kind: "signal",
      evalYear: act.sentYear,
      inReplyTo: act.id,
      act,
      tie: 1,
    });
  }
  candidates.sort(
    (a, b) =>
      a.evalYear - b.evalYear ||
      a.tie - b.tie ||
      (a.inReplyTo ?? "").localeCompare(b.inReplyTo ?? ""),
  );

  // The thread's opening: what a whisperer's withdrawal is measured AFTER.
  const openingYear = inbound[0]?.sentYear ?? null;

  const out: AiSignal[] = [];
  /** Counts REPLIES ACTUALLY SENT, which is what "first reply" means: a
   *  whisperer that declined your hail and answers a later signal is opening,
   *  not following. */
  let replyIndex = 0;
  // A2.6, the mutual quiet from this counterpart's side. Thin by design: one
  // live understanding per ordered pair, answered once, with no stored object
  // anywhere. A congress that cannot call the vote DEFERS — it sends the
  // reply with no move on it — and answers on its next one.
  let pendingOffer: string | null = null;
  let accordSettled = false;
  let congressDeferred = false;
  for (let ordinal = 0; ordinal < candidates.length; ordinal++) {
    const candidate = candidates[ordinal];
    if (candidate === undefined) continue;
    const evalYear = candidate.evalYear;
    const inboundParts = candidate.act?.parts ?? [];
    for (const part of inboundParts) {
      if (part.kind === "accord" && part.move === "offer" && !accordSettled) {
        pendingOffer = candidate.act?.id ?? null;
      }
    }

    // The causal read, through the gate and not around it: mint the cone for
    // the counterpart at the moment the trigger reaches it, and take the
    // player's history as of that cone. `peekTruth` is the capability check —
    // it returns null for any year above the cone, and there is no way to
    // turn that null into a number.
    const cone = lightConeFor(g, aiId, playerId, evalYear + d);
    if (peekTruth(g, cone, evalYear) === null) continue;
    const clip = clippedHistory(player.seed.emissionHistory, cone.asOfYear);

    let beat: SignalBeat;

    if (candidate.kind === "hail") {
      // The lantern did not wait to be asked.
      beat = "open";
    } else if (cls === "whisperer") {
      if (openingYear !== null && brightAfter(clip, openingYear, evalYear)) {
        // ONE withdrawal, then nothing, forever. The loop stops below.
        beat = "withdraw";
      } else if (!heldDark(clip, evalYear)) {
        // SILENCE IS NOT A DECLINE. Nothing is sent and nothing is recorded;
        // the thread's own arithmetic will call it `silent` in due course,
        // which is a statement about the player's light and leaks nothing.
        continue;
      } else {
        beat = replyIndex === 0 ? "open" : "follow";
      }
    } else {
      beat = replyIndex === 0 ? "open" : "follow";
    }

    // The move in the mutual quiet this reply owes, if any. Each class
    // answers in character (R6), and the congress that cannot call the vote
    // spends one reply saying nothing about it — which is a fact about who
    // you are speaking to rather than a die roll (`voteClose`'s own reason).
    let accordMove: AccordMove | null = null;
    let accordRef: string | null = null;
    if (pendingOffer !== null && !accordSettled && beat !== "withdraw") {
      if (cls === "whisperer") accordMove = "accept";
      else if (cls === "lantern") accordMove = "decline";
      else if (voteClose(ai.seed.dials["voice-silence"].position) && !congressDeferred) {
        congressDeferred = true;
      } else accordMove = "accept";
      if (accordMove !== null) {
        accordRef = pendingOffer;
        accordSettled = true;
        pendingOffer = null;
      }
    }

    // A HAIL CARRIES NO PAYLOAD, on this side exactly as on the other: the
    // lantern's unprompted opener is a beam that says only that it exists.
    // It still carries a tone, because every signal does.
    const composed =
      candidate.kind === "hail"
        ? {
            tone: aiTone(cls, beat, null, createRng(`parts/${threadId}/${ordinal}`)),
            parts: [] as readonly SignalPart[],
          }
        : composeAiParts({
            g,
            aiId,
            playerId,
            cls,
            beat,
            evalYear,
            distanceLy: d,
            clip,
            inbound: inboundParts,
            inboundId: candidate.inReplyTo,
            accordMove,
            accordRef,
            threadId,
            ordinal,
          });

    // Deliberation, then — one reply in four — a recess on top of it. Both
    // are seeded on the thread and the ordinal, so a reply that has already
    // been delivered departs at the same year forever.
    const recessRng = createRng(`recess/${threadId}/${ordinal}`);
    const recess = recessRng.chance(RECESS_CHANCE)
      ? recessRng.range(RECESS_MIN_YEARS, RECESS_MAX_YEARS)
      : 0;
    const sentYear = evalYear + d + deliberationFor(cls, threadId, ordinal) + recess;
    // A4, THE EXISTENCE FLOOR. Nothing may transmit from before it existed.
    // It was unreachable while every counterpart was seeded at cohort creation
    // with a biosphere epoch millennia deep; a FOUNDED COLONY breaks that — its
    // history begins at its landfall year, and a lantern child's unprompted
    // opener is evaluated at the year the PLAYER first went bright, which can
    // be centuries before the ship even left. The candidate is dropped whole
    // (not clamped forward), because a hail that could not have been sent is
    // not a late hail, and `replyIndex` is deliberately not advanced: a reply
    // nobody sent is not this thread's first.
    if (sentYear < existsFromYear(ai.seed) - BEAM_EPS) continue;
    out.push({
      id: `ai/${aiId}/${playerId}/${ordinal}`,
      fromCivId: aiId,
      toCivId: playerId,
      kind: candidate.kind,
      sentYear,
      arrivesYear: sentYear + d,
      inReplyTo: candidate.inReplyTo,
      body: composeSignalBody(
        ai.seed.archetype,
        composed.tone,
        composed.parts,
        beat,
        threadId,
        ordinal,
      ),
      tone: composed.tone,
      parts: composed.parts,
      beat,
    });
    if (beat === "withdraw") break;
    if (candidate.kind === "signal") replyIndex++;
  }
  return out;
}

/**
 * The derived counterpart to `beamCrossing`, and byte-for-byte the same
 * comparison: the beam from them is landing on this observer as of the
 * observer's OWN light-departure year. There is no clock read here and no
 * second channel, so a derived beam rides the same light cone as everything
 * else and cannot surface early.
 */
export function aiBeamCrossing(
  g: Galaxy,
  aiId: CivId,
  playerId: CivId,
  asOfYear: number,
): AiSignal | null {
  let latest: AiSignal | null = null;
  for (const signal of deriveAiSignals(g, aiId, playerId)) {
    if (asOfYear < signal.sentYear - BEAM_EPS) continue;
    if (asOfYear >= signal.sentYear + BEAM_DWELL_YEARS) continue;
    if (latest === null || signal.sentYear > latest.sentYear) latest = signal;
  }
  return latest;
}


// ---------------------------------------------------------------------------
// The thread view
// ---------------------------------------------------------------------------
//
// A2.6 OPENS THIS TO HUMANS, and the way it does so is the whole of B's
// error-path parity: there is no `controller` branch anywhere below. Every
// civilization in the galaxy is walked, stored inbound and derived inbound
// are merged into ONE sorted list, and both halves are stamped by the same
// code. A player-controlled counterpart simply has no derived half
// (`deriveAiSignals` returns empty for one), and a seeded counterpart simply
// has no stored half (no AI civilization ever writes an act). Neither
// emptiness is visible in any field of any shape below.

/**
 * One signal in a thread, BEFORE it is given a wire identity. The internal id
 * (a log act's `act-N`, a derived reply's `ai/...`) lives here and nowhere
 * further out: `buildThreads` mints per-thread ordinals over the sorted list
 * and every reference is re-rendered into that namespace on the way out.
 */
interface ThreadRow {
  readonly internalId: string;
  readonly from: "you" | "them";
  readonly kind: ContactAct["kind"];
  readonly sentYear: number;
  readonly arrivesYear: number;
  /** The year THIS PLAYER learned of it: yours when you sent it, theirs when
   *  it arrived. */
  readonly learnedYear: number;
  readonly tone: SignalTone | null;
  readonly parts: readonly SignalPart[];
  readonly beat: SignalBeat;
  /** Composed here for a stored act, and already composed for a derived one.
   *  Null on a hail, which carries no payload at all. */
  readonly body: string | null;
  readonly inReplyToInternal: string | null;
  /** A stamp measures an ARRIVING beam. You have no instrument at the far end
   *  of your own, so your own rows carry none. */
  readonly stamped: boolean;
}

/**
 * Turn one side's stored acts into rows. `senderIndex` counts that sender's
 * own SIGNALS in this thread, which is what decides the beat and seeds the
 * body — so both readers of a human thread compose the same line for the same
 * act, and the sender's own rack and the recipient's agree.
 */
function rowsFromActs(
  g: Galaxy,
  acts: readonly ContactAct[],
  from: "you" | "them",
  distanceLy: number,
  senderId: CivId,
  recipientId: CivId,
): ThreadRow[] {
  const archetype = civById(g, senderId).seed.archetype;
  const threadSeed = `${g.seedKey}/${senderId}/${recipientId}`;
  const rows: ThreadRow[] = [];
  let senderIndex = 0;
  for (const act of acts) {
    const parts = act.parts ?? [];
    const arrivesYear = act.sentYear + distanceLy;
    const beat = beatFor(parts, senderIndex);
    // A hail carries no payload and never has. A legacy A2.5 act carries the
    // player's own prose and no tone, and is rendered as it was written; a
    // composed act gets its body from the one composer, on both paths.
    const body =
      act.kind === "hail"
        ? null
        : act.tone === undefined
          ? (act.text ?? null)
          : composeSignalBody(archetype, act.tone, parts, beat, threadSeed, senderIndex);
    rows.push({
      internalId: act.id,
      from,
      kind: act.kind,
      sentYear: act.sentYear,
      arrivesYear,
      learnedYear: from === "you" ? act.sentYear : arrivesYear,
      tone: act.tone ?? null,
      parts,
      beat,
      body,
      inReplyToInternal: act.inReplyTo ?? null,
      stamped: from === "them",
    });
    if (act.kind === "signal") senderIndex++;
  }
  return rows;
}

/** The compliance read: the counterpart's OBSERVED light since the accord
 *  year, against the darkness floor. A belief about the past, arriving on
 *  delay like everything else, and never a verdict. */
function accordCompliance(
  observed: readonly EmissionEpoch[],
  heldSinceYear: number,
  asOfYear: number,
): "below-the-floor" | "above-the-floor" | null {
  if (asOfYear < heldSinceYear - YEAR_EPS) return null;
  if (emissionAt(observed, heldSinceYear) >= DARK_LEVEL) return "above-the-floor";
  const brightened = observed.some(
    (e) =>
      e.level >= DARK_LEVEL &&
      e.fromYear > heldSinceYear + YEAR_EPS &&
      e.fromYear <= asOfYear + YEAR_EPS,
  );
  return brightened ? "above-the-floor" : "below-the-floor";
}

/**
 * ONE THREAD, MERGED AND SORTED, before any of it is given a wire identity.
 * The single derivation both readers of a thread go through: `buildThreads`
 * renders it, and `threadRefRowsFor` hands its reference view to the
 * materializer, so a selector is legal exactly when the row it names is one
 * the client could see.
 *
 * Empty when nothing has been delivered either way.
 */
function mergedThreadRows(
  g: Galaxy,
  playerId: CivId,
  otherId: CivId,
  nowYear: number,
  distanceLy: number,
): ThreadRow[] {
  const mine = actsBetween(g.acts, playerId, otherId);
  // Their stored acts, gated by the SAME arrival comparison the derived half
  // uses. A player counterpart has these and no derived half; a seeded one
  // has the derived half and none of these, and neither emptiness shows.
  const storedTheirs = actsBetween(g.acts, otherId, playerId).filter(
    (a) => a.sentYear + distanceLy <= nowYear + YEAR_EPS,
  );
  const derivedTheirs = deriveAiSignals(g, otherId, playerId).filter(
    (s) => s.arrivesYear <= nowYear + YEAR_EPS,
  );
  if (mine.length === 0 && storedTheirs.length === 0 && derivedTheirs.length === 0) {
    return [];
  }
  return [
    ...rowsFromActs(g, mine, "you", distanceLy, playerId, otherId),
    ...rowsFromActs(g, storedTheirs, "them", distanceLy, otherId, playerId),
    ...derivedTheirs.map(
      (s): ThreadRow => ({
        internalId: s.id,
        from: "them",
        kind: s.kind,
        sentYear: s.sentYear,
        arrivesYear: s.arrivesYear,
        learnedYear: s.arrivesYear,
        tone: s.kind === "hail" ? null : s.tone,
        parts: s.kind === "hail" ? [] : s.parts,
        beat: s.beat,
        body: s.kind === "hail" ? null : s.body,
        inReplyToInternal: s.inReplyTo,
        stamped: true,
      }),
    ),
  ].sort((a, b) => a.learnedYear - b.learnedYear || a.internalId.localeCompare(b.internalId));
}

/**
 * THE WIRE NAMESPACE. Ordinals are minted over the sorted list, so they are
 * append-only in practice — everything newly visible was learned at or after
 * everything already visible — and a reference minted last year still
 * resolves this year.
 */
function refRowsOf(rows: readonly ThreadRow[]): ThreadRefRow[] {
  return rows.map((row, index) => {
    const accordPart = row.parts.find((p) => p.kind === "accord");
    return {
      wireId: `sig/${index}`,
      internalId: row.internalId,
      from: row.from,
      learnedYear: row.learnedYear,
      partKinds: row.parts.map((p) => p.kind),
      accord:
        accordPart !== undefined && accordPart.kind === "accord"
          ? { move: accordPart.move, ref: accordPart.ref }
          : null,
    };
  });
}

/**
 * The reference view of one thread, for the send handler: what has landed on
 * this player, in the same order and under the same `sig/N` names the client
 * is reading. `onSendSignal` resolves the turnaround floor, every verdict
 * reference and the mutual quiet's legality against exactly this.
 */
export function threadRefRowsFor(
  g: Galaxy,
  playerId: CivId,
  otherId: CivId,
  nowYear: number,
): readonly ThreadRefRow[] {
  return refRowsOf(
    mergedThreadRows(g, playerId, otherId, nowYear, civDistanceLy(g, playerId, otherId)),
  );
}

/**
 * A4: ONE ARRIVED DIAL PART, as the Ledger reads it. Nothing but what the
 * counterpart said about itself and when it said it — no body, no tone, no
 * reference, and no row identity.
 */
export interface LineageCulturePart {
  readonly axis: DialAxisId;
  /** The pole the sender stated, in world words, frozen at send. */
  readonly pole: string;
  /** The year it was said, which is what the reading is AS OF. */
  readonly sentYear: number;
  /** The year it landed here, which is what decides whether it is the newest
   *  thing this parent knows about that axis. */
  readonly learnedYear: number;
}

/**
 * THE STATED CHANNEL, and the only door onto it. `mergedThreadRows` stays
 * private: the Ledger has no business with thread rows, wire ids or bodies,
 * and handing it the merge would let a later change there quietly widen what
 * a drift reading can see.
 *
 * Inbound only, dial parts only, ALREADY ARRIVED — the merge's own filter,
 * unchanged and not re-implemented here, which is the point of going through
 * it. A part still in flight is invisible to this function in exactly the way
 * it is invisible to the rack.
 */
export function lineageCulturePartsFor(
  g: Galaxy,
  playerId: CivId,
  otherId: CivId,
  nowYear: number,
): readonly LineageCulturePart[] {
  const rows = mergedThreadRows(g, playerId, otherId, nowYear, civDistanceLy(g, playerId, otherId));
  const out: LineageCulturePart[] = [];
  for (const row of rows) {
    if (row.from !== "them") continue;
    for (const part of row.parts) {
      if (part.kind !== "culture" || part.source !== "dial") continue;
      if (part.axis === null || part.pole === null) continue;
      out.push({
        axis: part.axis,
        pole: part.pole,
        sentYear: row.sentYear,
        learnedYear: row.learnedYear,
      });
    }
  }
  return out;
}

/**
 * Every thread this player has, plus the full detail of the one their
 * connection has open.
 *
 * THE NO-LEAK RULES, enforced here and asserted on the wire shapes:
 *  - derived inbound is filtered at `arrivesYear <= nowYear` and stored
 *    inbound at `sentYear + distance <= nowYear`, by the same comparison, so
 *    an answer in flight is invisible in every field of every shape below;
 *  - `nextEventYear` is computed from the player's OWN acts only and can
 *    never carry a predicted reply;
 *  - a pair with nothing delivered either way produces NO ROW, so the
 *    existence of a row is never itself news about a counterpart;
 *  - wire ids are per-thread ordinals and the underlying ids stay in here.
 */
export function buildThreads(
  g: Galaxy,
  playerId: CivId,
  nowYear: number,
  openStarId: string | null,
  /** A2.6: civilizations this player has gone dark to. Their beams still
   *  land and their acts are still stored; the threads simply do not appear
   *  on this rack, and NOTHING about that reaches the other side. */
  mutedCivIds: readonly CivId[] = [],
): {
  summaries: ThreadSummary[];
  detail: ThreadDetail | null;
  mutedStarIds: string[];
} {
  const summaries: ThreadSummary[] = [];
  const mutedStarIds: string[] = [];
  let detail: ThreadDetail | null = null;

  for (const civ of g.civs) {
    const otherId = civ.seed.id;
    if (otherId === playerId) continue;
    const d = civDistanceLy(g, playerId, otherId);

    const rows = mergedThreadRows(g, playerId, otherId, nowYear, d);
    if (rows.length === 0) continue;

    // THE MUTE, and the whole of its sender-side cost: nothing. The thread is
    // dropped from this rack after it has been fully derived, so muting
    // changes no act, no arrival and no counterpart behavior, and there is no
    // notification anywhere because there is nothing to notify.
    if (mutedCivIds.includes(otherId)) {
      mutedStarIds.push(civ.starId);
      continue;
    }

    const mine = actsBetween(g.acts, playerId, otherId);
    const wireIdOf = new Map<string, string>();
    rows.forEach((row, index) => wireIdOf.set(row.internalId, `sig/${index}`));
    const wireFor = (internalId: string): string | null =>
      wireIdOf.get(internalId) ?? null;

    // The mutual quiet, derived from what has ARRIVED on this side.
    const accordView = deriveAccord(refRowsOf(rows));
    const asOfYear = nowYear - d;
    const observed = civ.seed.emissionHistory.filter((e) => e.fromYear <= asOfYear);
    // THE ACCORD YEAR IN THEIR OWN FRAME, which is the only year their light
    // can be read against: their acceptance left them one transit before you
    // learned of it, and yours reaches them one transit after you sent it.
    const accordYearThere =
      accordView.heldSinceYear === null
        ? null
        : accordView.acceptedBy === "them"
          ? accordView.heldSinceYear - d
          : accordView.heldSinceYear + d;
    const compliance =
      accordView.state === "held" && accordYearThere !== null
        ? accordCompliance(observed, accordYearThere, asOfYear)
        : null;
    // BREACH BY LIGHT ENDS IT, AND NO MESSAGE IS REQUIRED. That is what keeps
    // the thread cap from ever locking somebody into an accord: the exit that
    // costs nothing is always available, and the withdraw move is the honest
    // version for anyone with signal budget left.
    const accord: AccordRail = {
      form: "mutual-quiet",
      state: compliance === "above-the-floor" ? "broken" : accordView.state,
      heldSinceYear: accordView.heldSinceYear,
      theirLight: compliance,
      // Non-null exactly when there IS a reading, so the rail can never show
      // a year beside a blank and invite the reader to fill it in.
      asOfYear: compliance === null ? null : asOfYear,
      ...accordAvailability(accordView),
    };

    const signals: ThreadSignal[] = rows.map((row, index) => ({
      id: `sig/${index}`,
      from: row.from,
      kind: row.kind,
      sentYear: row.sentYear,
      arrivesYear: row.arrivesYear,
      body: row.body,
      tone: row.tone,
      parts: renderPartsForViewer(row.parts, wireFor),
      stamp: row.stamped ? stampFor(d, row.sentYear) : null,
      inReplyTo: row.inReplyToInternal === null ? null : wireFor(row.inReplyToInternal),
    }));

    const lastMine = mine[mine.length - 1] ?? null;
    const theirRows = rows.filter((r) => r.from === "them");
    const lastTheirs = theirRows[theirRows.length - 1] ?? null;
    const inFlight = lastMine !== null && lastMine.sentYear + d > nowYear + YEAR_EPS;

    let state: ThreadState;
    if (inFlight) {
      state = "in-flight";
    } else if (lastTheirs !== null && lastTheirs.beat === "withdraw") {
      // Permanent, and the one dead end the player can read as a decision.
      // A2.6 makes it reachable on a human thread too: the accord's withdraw
      // move maps to this beat, so `withdrawn` stopped being a whisperer tell.
      state = "withdrawn";
    } else if (lastMine === null) {
      state = lastTheirs !== null ? "answered" : "unopened";
    } else if (
      lastTheirs !== null &&
      lastTheirs.arrivesYear >= lastMine.sentYear + d - YEAR_EPS
    ) {
      state = "answered";
    } else if (nowYear > lastMine.sentYear + 2 * d + SILENCE_DECLARED_YEARS + YEAR_EPS) {
      // Your own arithmetic: the round trip plus ONE constant that is the same
      // on every thread and sits far above any seeded recess (contact.ts
      // writes out the sum). A long quiet is never proof of anything.
      state = "silent";
    } else {
      state = "awaiting";
    }

    const lastEventYear = rows.reduce(
      (latest, r) => Math.max(latest, r.learnedYear),
      Number.NEGATIVE_INFINITY,
    );
    // YOUR OWN next arrival, and there is deliberately no branch here that
    // could reach for a derived one.
    const pending = mine
      .map((a) => a.sentYear + d)
      .filter((y) => y > nowYear + YEAR_EPS)
      .sort((a, b) => a - b);
    const mySignalCount = mine.filter((a) => a.kind === "signal").length;

    const summary: ThreadSummary = {
      starId: civ.starId,
      state,
      signalCount: signals.length,
      lastEventYear: Number.isFinite(lastEventYear) ? lastEventYear : nowYear,
      nextEventYear: pending[0] ?? null,
      canSpeak:
        hasHailed(g.acts, playerId, otherId) && mySignalCount < MAX_SIGNALS_PER_THREAD,
      accord,
    };
    summaries.push(summary);

    if (openStarId !== null && openStarId === civ.starId) {
      const kept = signals.slice(-MAX_SIGNALS_ON_WIRE);
      detail = { ...summary, signals: kept, truncated: kept.length < signals.length };
    }
  }

  summaries.sort((a, b) => a.starId.localeCompare(b.starId));
  mutedStarIds.sort((a, b) => a.localeCompare(b));
  return { summaries, detail, mutedStarIds };
}
