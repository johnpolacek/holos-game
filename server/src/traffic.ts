// Traffic — what an AI counterpart does when you speak to it (A2.5).
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
// must show the definition here, this module's own two read paths
// (`aiBeamCrossing`, which is how knowledge.ts's beam branch reaches it, and
// `buildThreads`), and cohort.ts's READ-SIDE paths only (`buildThreads`
// through `assembleSkyState`, and `scheduleThreadWakes`, which schedules a
// wake and mutates nothing). It must never appear inside a handler that
// mutates `this.galaxy`.
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

import type { CivId, EmissionEpoch } from "./civseed";
import { lightDelayYears } from "./clock";
import {
  BEAM_DWELL_YEARS,
  hasHailed,
  MAX_SIGNALS_PER_THREAD,
  type ContactAct,
} from "./contact";
import { civById, civDistanceLy, type Galaxy } from "./galaxy";
import { lightConeFor, peekTruth } from "./knowledge";
import type { ArchetypeId } from "./minds";
import {
  MAX_SIGNALS_ON_WIRE,
  type ThreadDetail,
  type ThreadSignal,
  type ThreadState,
  type ThreadSummary,
} from "./protocol";
import { createRng } from "./rng";
import { gateFactFree, LIMITS } from "./stylegate";
import {
  SIGNAL_OBSERVATIONS,
  SIGNAL_VOICE,
  type SignalBeat,
  type SignalObservation,
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
  /** Composed and gated at construction. */
  readonly body: string;
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

/** The longest any counterpart can take. What the `silent` state is measured
 *  against, and a statement about deliberation in general rather than about
 *  the particular counterpart, so computing it leaks nothing. */
export const MAX_DELIBERATION_YEARS =
  Math.max(...Object.values(DELIBERATION_YEARS)) * (1 + DELIB_JITTER);

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
 * body = observation clause + " " + voice clause. The observation is the rule
 * made prose (selected by real state, stating that state QUALITATIVELY); the
 * voice is §4's register and knows nothing about the player. Neither may
 * carry a number, because every number is on the stamp above the payload.
 *
 * Gated at construction against LIMITS.signal. A rejection falls back to the
 * observation clause ALONE, which is already gate-clean on its own: "reject,
 * then template, never retry" is the gate's own policy, and there is nothing
 * to retry here because nothing was generated.
 */
function composeBody(
  archetype: ArchetypeId,
  observation: SignalObservation,
  beat: SignalBeat,
  threadId: string,
  ordinal: number,
): string {
  const opening = SIGNAL_OBSERVATIONS[observation];
  const card = SIGNAL_VOICE[archetype];
  let clause: string | null;
  if (beat === "open") clause = card.open;
  else if (beat === "withdraw") clause = card.withdraw;
  else clause = card.follow.length === 0
    ? null
    : createRng(`signal/${threadId}/${ordinal}`).pick(card.follow);
  if (clause === null) return opening;
  const verdict = gateFactFree(`${opening} ${clause}`, LIMITS.signal);
  return verdict.ok ? verdict.line : opening;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/** Your acts aimed at them, in commit order. Bounded, so a derivation's cost
 *  is bounded whatever the log does. */
function inboundActs(
  acts: readonly ContactAct[],
  playerId: CivId,
  aiId: CivId,
): readonly ContactAct[] {
  return acts
    .filter(
      (a) =>
        (a.kind === "hail" || a.kind === "signal") &&
        a.fromCivId === playerId &&
        a.toCivId === aiId,
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
  /** Hail before signal at an identical year, so the ordering is total. */
  readonly tie: number;
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
  // A counterpart is a seeded civilization. A player never answers by rule,
  // and A2.5 has no human-to-human freeform at all (onSendSignal refuses it
  // at the door with its own code).
  if (ai.controller !== "ai") return [];
  const cls = counterpartClass(ai.seed.archetype);
  if (cls === "silent") return [];

  const player = civById(g, playerId);
  const d = civDistanceLy(g, aiId, playerId);
  // Seeded per cohort as well as per pair, so two cohorts running the same
  // archetype at the same distance do not draw the same variants.
  const threadId = `${g.seedKey}/${aiId}/${playerId}`;
  const inbound = inboundActs(g.acts, playerId, aiId);

  const candidates: Candidate[] = [];
  if (cls === "lantern" && MAX_UNPROMPTED_PER_PAIR > 0) {
    const bright = firstBrightYear(player.seed.emissionHistory);
    if (bright !== null) {
      candidates.push({ kind: "hail", evalYear: bright, inReplyTo: null, tie: 0 });
    }
  }
  for (const act of inbound) {
    candidates.push({ kind: "signal", evalYear: act.sentYear, inReplyTo: act.id, tie: 1 });
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
  for (let ordinal = 0; ordinal < candidates.length; ordinal++) {
    const candidate = candidates[ordinal];
    if (candidate === undefined) continue;
    const evalYear = candidate.evalYear;

    // The causal read, through the gate and not around it: mint the cone for
    // the counterpart at the moment the trigger reaches it, and take the
    // player's history as of that cone. `peekTruth` is the capability check —
    // it returns null for any year above the cone, and there is no way to
    // turn that null into a number.
    const cone = lightConeFor(g, aiId, playerId, evalYear + d);
    if (peekTruth(g, cone, evalYear) === null) continue;
    const clip = clippedHistory(player.seed.emissionHistory, cone.asOfYear);

    let beat: SignalBeat;
    let observation: SignalObservation;

    if (candidate.kind === "hail") {
      // The lantern did not wait to be asked.
      beat = "open";
      observation = "unprompted";
    } else if (cls === "whisperer") {
      if (openingYear !== null && brightAfter(clip, openingYear, evalYear)) {
        // ONE withdrawal, then nothing, forever. The loop stops below.
        beat = "withdraw";
        observation = "turnedBright";
      } else if (!heldDark(clip, evalYear)) {
        // SILENCE IS NOT A DECLINE. Nothing is sent and nothing is recorded;
        // the thread's own arithmetic will call it `silent` in due course,
        // which is a statement about the player's light and leaks nothing.
        continue;
      } else {
        beat = replyIndex === 0 ? "open" : "follow";
        observation = replyIndex === 0 ? "heldDark" : "unchanged";
      }
    } else if (cls === "lantern") {
      beat = replyIndex === 0 ? "open" : "follow";
      observation = replyIndex === 0 ? "answered" : "continued";
    } else {
      beat = replyIndex === 0 ? "open" : "follow";
      observation =
        replyIndex === 0
          ? voteClose(ai.seed.dials["voice-silence"].position)
            ? "deferred"
            : "carried"
          : "reconvened";
    }

    const sentYear = evalYear + d + deliberationFor(cls, threadId, ordinal);
    out.push({
      id: `ai/${aiId}/${playerId}/${ordinal}`,
      fromCivId: aiId,
      toCivId: playerId,
      kind: candidate.kind,
      sentYear,
      arrivesYear: sentYear + d,
      inReplyTo: candidate.inReplyTo,
      body: composeBody(ai.seed.archetype, observation, beat, threadId, ordinal),
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

/** What a thread row sorts and states by: the year YOU learned of the event.
 *  Yours is when you sent it; theirs is when it arrived. */
function learnedYear(signal: ThreadSignal): number {
  return signal.from === "you" ? signal.sentYear : signal.arrivesYear;
}

/**
 * Every thread this player has, plus the full detail of the one their
 * connection has open.
 *
 * THE NO-LEAK RULES, enforced here and asserted on the wire shapes:
 *  - derived inbound is filtered at `arrivesYear <= nowYear`, so an answer in
 *    flight is invisible in every field of every shape below;
 *  - `nextEventYear` is computed from the player's OWN acts only and can
 *    never carry a predicted reply;
 *  - a pair with nothing delivered either way produces NO ROW, so the
 *    existence of a row is never itself news about a counterpart.
 */
export function buildThreads(
  g: Galaxy,
  playerId: CivId,
  nowYear: number,
  openStarId: string | null,
): { summaries: ThreadSummary[]; detail: ThreadDetail | null } {
  const summaries: ThreadSummary[] = [];
  let detail: ThreadDetail | null = null;

  for (const civ of g.civs) {
    if (civ.controller !== "ai") continue;
    const aiId = civ.seed.id;
    const mine = inboundActs(g.acts, playerId, aiId);
    const theirs = deriveAiSignals(g, aiId, playerId)
      .filter((s) => s.arrivesYear <= nowYear + YEAR_EPS)
      .sort((a, b) => a.arrivesYear - b.arrivesYear);
    if (mine.length === 0 && theirs.length === 0) continue;

    const d = civDistanceLy(g, playerId, aiId);
    const signals: ThreadSignal[] = [
      ...mine.map((act) => ({
        id: act.id,
        from: "you" as const,
        kind: act.kind,
        sentYear: act.sentYear,
        arrivesYear: act.sentYear + d,
        // Your own words, always: a hail has none, a signal is what you wrote.
        body: act.text ?? null,
        // NEVER a stamp on your own beam. You have no instrument at the far
        // end, and the landing year the client renders is your own arithmetic
        // rather than a receipt.
        stamp: null,
        inReplyTo: act.inReplyTo ?? null,
      })),
      ...theirs.map((s) => ({
        id: s.id,
        from: "them" as const,
        kind: s.kind,
        sentYear: s.sentYear,
        arrivesYear: s.arrivesYear,
        body: s.body,
        stamp: stampFor(d, s.sentYear),
        inReplyTo: s.inReplyTo,
      })),
    ].sort((a, b) => learnedYear(a) - learnedYear(b) || a.id.localeCompare(b.id));

    const lastMine = mine[mine.length - 1] ?? null;
    const lastTheirs = theirs[theirs.length - 1] ?? null;
    const inFlight =
      lastMine !== null && lastMine.sentYear + d > nowYear + YEAR_EPS;

    let state: ThreadState;
    if (inFlight) {
      state = "in-flight";
    } else if (lastTheirs !== null && lastTheirs.beat === "withdraw") {
      // Permanent, and the one dead end the player can read as a decision.
      state = "withdrawn";
    } else if (lastMine === null) {
      state = lastTheirs !== null ? "answered" : "unopened";
    } else if (
      lastTheirs !== null &&
      lastTheirs.arrivesYear >= lastMine.sentYear + d - YEAR_EPS
    ) {
      state = "answered";
    } else if (
      nowYear >
      lastMine.sentYear + 2 * d + MAX_DELIBERATION_YEARS + YEAR_EPS
    ) {
      // Your own arithmetic: the round trip plus the longest anyone thinks.
      state = "silent";
    } else {
      state = "awaiting";
    }

    const lastEventYear = signals.reduce(
      (latest, s) => Math.max(latest, learnedYear(s)),
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
        hasHailed(g.acts, playerId, aiId) && mySignalCount < MAX_SIGNALS_PER_THREAD,
    };
    summaries.push(summary);

    if (openStarId !== null && openStarId === civ.starId) {
      const kept = signals.slice(-MAX_SIGNALS_ON_WIRE);
      detail = { ...summary, signals: kept, truncated: kept.length < signals.length };
    }
  }

  summaries.sort((a, b) => a.starId.localeCompare(b.starId));
  return { summaries, detail };
}
