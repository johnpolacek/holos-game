// Contact — the choice ceremony's truth side (A2.4, act3-design.md § The
// choice: hail, broadcast, stay dark).
//
// Three verbs, two of which write. A HAIL is aimed: one civilization, one
// beam, and nothing in the broadband sky changes, so only the target ever
// learns it happened. A BROADCAST is the opposite in every respect: it edits
// the sender's own emission history, which means every observer in the
// neighborhood reads it, each at their own distance, through exactly the
// machinery that already served them the sender's ordinary light. STAY DARK
// writes nothing at all (there is no physics of a non-event, and a stored
// one would be a fact no observer could ever read).
//
// PRESENCE RULE (act3-design.md, the absence charter): irreversible acts
// require presence. EVERY CALL SITE OF `appendAct` IS A HANDLER WHOSE FIRST
// STATEMENT READS A LIVE CONNECTION'S STATE. That is the invariant, and it
// is stronger than a count: a writer that cannot name a live socket cannot
// reach the log at all. Alarms are wake-ups and never truth (systems-a.md
// §7), the proposal route has no contact arm and gains none, study tripwires
// fire beliefs rather than acts, and no AI civilization has a path here at
// any stage (see the derivation rule below). The invariant is greppable and
// is meant to be grepped:
//
//   grep -rn "appendAct\|applyBroadcast\|commitContact" server/src
//
// must show only the definitions in this file, the parse arms and types in
// protocol.ts, and — after A2.5 — EXACTLY TWO `appendAct` call sites
// (`onCommitContact`, `onSendSignal`) and EXACTLY ONE `applyBroadcast` call
// site (`onCommitContact`), each of them opening on `this.conns.get(...)`.
//
// DERIVATION RULE (A2.5, traffic.ts): an AI counterpart's answers are a PURE
// FUNCTION of this log, the seeds and the distances, evaluated at read time
// and STORED NOWHERE. No AI civilization ever writes a ContactAct, so the
// presence rule above needed no exception carved into it and gained none.
// Its own greppable form:
//
//   grep -rn "deriveAiSignals" server/src
//
// must show the definition in traffic.ts, traffic.ts's own read paths (one
// of which, `aiBeamCrossing`, is how knowledge.ts's beam branch reaches it),
// and cohort.ts's READ-SIDE paths only (`buildThreads` through
// `assembleSkyState`, and `scheduleThreadWakes`, which schedules a wake and
// mutates nothing). It must never appear inside a handler that mutates
// `this.galaxy`. traffic.ts's header carries the full argument.
//
// NO RNG, NO CLOCK, NO STORAGE. Every function here is pure and total; the
// resistance a mind puts up is a function of its own dial sheet, so the
// price the client previews and the price the server charges are the same
// number computed by the same code, and neither can drift from the other.
//
// IMPORT DIRECTION. This module imports no study and no question. It does
// import `emissionAt` from knowledge.ts while knowledge.ts imports
// `beamCrossing` from here; that cycle is safe by construction, because both
// directions are function references resolved at CALL time and neither
// module reads the other at module-initialization time.

import type { CivId, CivSeed, EmissionEpoch } from "./civseed";
import { LEAN } from "./dials";
import { civById, civDistanceLy, type Galaxy, type PlacedCiv } from "./galaxy";
import { emissionAt } from "./knowledge";
// A2.6: the composed payload's shapes. TYPE-ONLY, which keeps this module's
// "no RNG, no clock, no storage" header true — signalparts.ts's materializer
// reads the sky, and nothing here may.
import type { SignalPart, SignalTone } from "./signalparts";
import type {
  ContactStance,
  ContactWire,
  OutboundAct,
  ThreadDetail,
  ThreadSummary,
} from "./protocol";
import { resistanceLine } from "./voice";

/**
 * What a CEREMONY can be about — the two acts the choice ceremony commits,
 * and therefore the two a mind can be asked to consent to. "stay-dark" is a
 * choice, not an act, and has no record here (see the module header).
 */
export type CeremonyKind = "hail" | "broadcast";

/**
 * Everything that can sit in the log. A2.5 adds `signal`: a follow-up inside
 * a thread you already opened. A signal is NEVER contested — the mind
 * objected once, at the door, and does not relitigate the conversation — so
 * `CONTACT_DEMAND`, `resistanceFor` and `ContactStance` all stay typed over
 * `CeremonyKind` and the A2.4 stance wire does not move.
 */
export type ContactKind = CeremonyKind | "signal";

/**
 * One committed act, appended to a galaxy-scoped log that is never rewritten
 * and never pruned. `sentYear` is the clock's now at commit, which is the
 * year the light departed: every downstream read compares against it through
 * an observer's own `asOfYear` and so can never be early.
 *
 * A2.5 extends this record with two OPTIONAL fields and nothing else — added
 * optional fields on an append-only log need no migration, which is why the
 * thread has no identity of its own here. A thread is (fromCivId, toCivId)
 * and the log's own order; there is nothing else to store.
 */
export interface ContactAct {
  /** `act-${n}`, galaxy-scoped ordinal. */
  readonly id: string;
  readonly kind: ContactKind;
  readonly fromCivId: CivId;
  /** Hail/signal only; null for a broadcast, which is aimed at nobody. */
  readonly toCivId: CivId | null;
  /** The clock's now at commit = the year this light departed. */
  readonly sentYear: number;
  /** The receipt: what the commit actually cost the mind (0 uncontested,
   *  and a signal is always uncontested). */
  readonly coherenceCost: number;
  /**
   * A2.5, optional: the id of the act this one answers. Unset on every act
   * A2.5 writes, deliberately — the only thing a player's signal could be
   * answering is a DERIVED reply, whose id names nothing in this log, and a
   * stored pointer into derived material would dangle the moment the
   * derivation moved. The field is here because the derived side (traffic.ts's
   * `AiSignal.inReplyTo`) points the other way, at a real act id, and because
   * a human-to-human thread will want it.
   */
  readonly inReplyTo?: string;
  /**
   * A2.5, optional and now LEGACY: the freeform payload. Present only on acts
   * A2.5 wrote. It is PLAYER PROSE — sanitized by `sanitizeSignalText` at the
   * door, rendered with textContent only, never gated, never handed to
   * voicegen. NOTHING NEW WRITES IT (A2.6 retired freeform everywhere), and
   * the field survives only because an append-only log is never rewritten and
   * a live cohort still has to render what is already in it.
   */
  readonly text?: string;
  /**
   * A2.6, optional: the composed signal. Present together iff
   * `kind === "signal"` and the act was written by A2.6 or later. Two more
   * optional fields on an append-only log need no migration and get none,
   * which is the same reason `inReplyTo` and `text` are shaped this way.
   *
   * `parts` IS SERVER-WRITTEN, ALWAYS. The client sent selectors;
   * `materializeParts` resolved each one against the sender's own study, sky
   * and seed state and froze the result here. No number and no string in it
   * came off the wire, so an act in this log cannot carry a fabricated fact
   * even if the storage were edited by hand — there is no code path that
   * would have put one there.
   *
   * References inside a part (a verdict's target, an accord's offer) hold
   * UNDERLYING ids in storage; `renderPartsForViewer` re-renders them into
   * each reader's own `sig/N` namespace on the way out.
   */
  readonly tone?: SignalTone;
  readonly parts?: readonly SignalPart[];
}

/**
 * How long a beam dwells on its target, in game years. A legibility constant
 * (about two real hours at the shipped clock ratio), not a physical one: a
 * beam is a period of transmission, and the sky is a present view, so a
 * player away overnight misses it. The honest fix is the annal, not a longer
 * dwell.
 */
export const BEAM_DWELL_YEARS = 24;

/** What a received beam reads as. Well above DETECTION_FLOOR on purpose:
 *  the whole point of a hail is that a dark civilization can make itself
 *  seen by exactly one observer. */
export const BEAM_RECEIVED_LEVEL = 0.4;

/** How long a broadcast shout lasts in the sender's own emission history. */
export const BROADCAST_SHOUT_YEARS = 24;

/** The level the shout holds. Below `classify`'s transit-shadows boundary,
 *  so a player ladder reads it as broadcast leakage, which is what it is. */
export const BROADCAST_LEVEL = 0.55;

/** A hostile client cannot grow the log without bound. Raised from 32 in
 *  A2.5: a thread is several acts, and the ceremony's own cap was sized when
 *  one hail was the whole conversation. */
export const MAX_ACTS_PER_CIV = 64;

/** Per ORDERED PAIR: how many signals you may put into one thread. Matches
 *  MAX_SIGNALS_ON_WIRE, so a full thread is exactly what the detail view can
 *  carry and the composer never closes on a signal the wire would drop. */
export const MAX_SIGNALS_PER_THREAD = 24;

/** Minimum spacing between your OWN sends on one thread, in game years —
 *  about one real minute at the shipped clock ratio. Not a physics rule: a
 *  floor under the write rate, so a held-down SEND cannot turn a thread into
 *  a log-growth primitive. */
export const SIGNAL_COOLDOWN_YEARS = 0.2;

/**
 * A2.6, THE TURNAROUND FLOOR. No send on a thread within this many game years
 * of the latest inbound arrival on it. About one and a half real minutes at
 * the shipped clock ratio, and IDENTICAL ON EVERY THREAD.
 *
 * It exists for parity, not for pacing. A seeded counterpart deliberates for
 * a class-dependent stretch before its answer departs (traffic.ts's
 * DELIBERATION_YEARS, floored around 0.32 y by the shortest of them); a human
 * with a thumb on the composer can answer in real seconds. Reply latency was
 * therefore a free human/AI tell on any thread, readable without sending
 * anything. One uniform floor closes it, and it is uniform precisely so that
 * hitting it says nothing about who is on the other end.
 *
 * It answers `contact-unavailable`, which is the same code a cooldown or a
 * full thread answers, and the client renders the composer briefly closed.
 */
export const MIN_DELIBERATION_YEARS = 0.32;

/**
 * A2.6, WHEN SILENCE IS DECLARED. A thread reads `silent` once your own
 * arithmetic says an answer could have come and did not:
 * `sentYear + 2 × distance + SILENCE_DECLARED_YEARS`. ONE CONSTANT FOR BOTH
 * PATHS, and it leaks nothing, because it is a statement about deliberation
 * in general rather than about the particular counterpart.
 *
 * THE ARITHMETIC, at the shipped ratio of five real minutes per game year:
 *
 *   longest seeded deliberation  3.0 y  =  15 real minutes  (whisperer + jitter)
 *   longest seeded RECESS       96.0 y  =   8 real hours    (traffic.ts)
 *   SILENCE_DECLARED_YEARS     288.0 y  =  24 real hours
 *
 * Three times the longest recess and a full real day of quiet. That gap is
 * the point: a counterpart on recess must never be declarable silent, or the
 * declaration becomes a test that a human (who sleeps) fails and a machine
 * (which does not) passes. Above the floor the reading is honest for both —
 * a day of nothing is a day of nothing, whoever is out there.
 */
export const SILENCE_DECLARED_YEARS = 288;

/** Slop so a float-adjacent year at the exact departure edge never reads as
 *  not-yet-arrived (knowledge.ts's LIGHT_CONE_EPS, same reason). */
const BEAM_EPS = 1e-6;

// ---------------------------------------------------------------------------
// The log
// ---------------------------------------------------------------------------

/**
 * Append one act. The log lives ON THE GALAXY rather than beside it, which
 * is what lets `observeCiv(galaxy, …)` reach it with no signature change
 * anywhere: the light-cone gate stays the only way into truth.
 */
export function appendAct(galaxy: Galaxy, act: ContactAct): Galaxy {
  return { ...galaxy, acts: [...galaxy.acts, act] };
}

/** Every act this civilization has committed, in commit order. */
export function actsFrom(
  acts: readonly ContactAct[],
  civId: CivId,
): readonly ContactAct[] {
  return acts.filter((a) => a.fromCivId === civId);
}

/**
 * "A hail from me to them exists." A2.5 renamed this from
 * `hasUnansweredHail` and changed NOT ONE BYTE of the body: you reveal
 * yourself to a given civilization exactly once, and the second verb is a
 * `signal`, not a second hail. The VOCABULARY widened; the predicate did
 * not. It is still what refuses a second hail at the ceremony, and it is now
 * also what says the thread's composer is live.
 *
 * The retry path A2.4 wrote the old name for is preserved by the derived
 * side rather than by this function: a whisperer that declined your hail
 * re-evaluates its trigger on every later inbound signal.
 */
export function hasHailed(
  acts: readonly ContactAct[],
  fromCivId: CivId,
  toCivId: CivId,
): boolean {
  return acts.some(
    (a) => a.kind === "hail" && a.fromCivId === fromCivId && a.toCivId === toCivId,
  );
}

/**
 * You are already shouting. Refuses a second broadcast until the first
 * shout's window has closed; afterwards another pair of epochs is legal, and
 * repeated broadcasts genuinely brighten the echo as layered shells with
 * gaps between them.
 */
export function broadcastInFlight(
  acts: readonly ContactAct[],
  fromCivId: CivId,
  nowYear: number,
): boolean {
  return acts.some(
    (a) =>
      a.kind === "broadcast" &&
      a.fromCivId === fromCivId &&
      a.sentYear + BROADCAST_SHOUT_YEARS > nowYear,
  );
}

/**
 * The beam `from` is landing on `to` as of the observer's own light-departure
 * year, or null. THE ONLY COMPARISON IS AGAINST `asOfYear`, which observeCiv
 * derived as `nowYear − distance`: there is no second channel and no clock
 * read here, so the beam rides the same light cone as everything else and
 * cannot leak early. The filter on `toCivId` is what makes it directed —
 * every other observer gets null and sees the sender's ordinary broadband
 * light, so interception stays the open question act3-design.md says it is.
 *
 * Scans for the LATEST qualifying act rather than the first. A2.5 is where
 * that matters: the class filter now admits `signal` as well as `hail`,
 * because a follow-up is a beam too, and several of them can be in the
 * dwell window at once. This is also what keeps a live thread lit as
 * DIRECTED BEAM on both skies for as long as it is live.
 */
export function beamCrossing(
  acts: readonly ContactAct[],
  fromCivId: CivId,
  toCivId: CivId,
  asOfYear: number,
): ContactAct | null {
  let latest: ContactAct | null = null;
  for (const act of acts) {
    if (act.kind !== "hail" && act.kind !== "signal") continue;
    if (act.fromCivId !== fromCivId || act.toCivId !== toCivId) continue;
    if (asOfYear < act.sentYear - BEAM_EPS) continue;
    if (asOfYear >= act.sentYear + BEAM_DWELL_YEARS) continue;
    if (latest === null || act.sentYear > latest.sentYear) latest = act;
  }
  return latest;
}

// ---------------------------------------------------------------------------
// The broadcast residue
// ---------------------------------------------------------------------------

/**
 * The broadcast's edit to the sender's own emission history: a shout that
 * dominates its window, and the level history resumes at when the shout ends.
 *
 * THE SAFETY PROPERTY, stated once because it is the whole reason this can
 * be a plain write: EVERY YEAR THIS FUNCTION TOUCHES IS AT OR AFTER
 * `sentYear`, and `sentYear` is the clock's now at commit, while every
 * observer's `asOfYear` is at most now. So no write here can change light
 * that has already been served to anybody, and an observation taken with
 * `asOfYear < sentYear` is byte-identical before and after. Future-dated
 * epochs are already blessed by civseed.ts's own contract (a seeded dark
 * peer really can carry a dark turn that has not happened yet), which is
 * also why the result is re-sorted rather than appended: `emissionAt` breaks
 * on the first future epoch, so ascending order is load-bearing.
 *
 * The sort is STABLE (ES2019 onward), which settles the two collisions: an
 * original epoch dated exactly `sentYear` keeps its place before the shout
 * and is therefore overridden by it, and one dated exactly at the shout's
 * end keeps its place before the resume epoch, which carries its level
 * anyway.
 */
export function applyBroadcast(
  history: readonly EmissionEpoch[],
  sentYear: number,
): readonly EmissionEpoch[] {
  const endYear = sentYear + BROADCAST_SHOUT_YEARS;
  // Read off the ORIGINAL history, before anything is dropped: this is where
  // the civilization's own story resumes once the shout is over.
  const tail = emissionAt(history, endYear);
  const kept = history.filter((e) => !(e.fromYear > sentYear && e.fromYear < endYear));
  const shout: EmissionEpoch = {
    fromYear: sentYear,
    // A civ already brighter than the shout does not dim itself to make it.
    level: Math.max(BROADCAST_LEVEL, emissionAt(history, sentYear)),
  };
  const resume: EmissionEpoch = { fromYear: endYear, level: tail };
  return [...kept, shout, resume].sort((a, b) => a.fromYear - b.fromYear);
}

// ---------------------------------------------------------------------------
// The resistance beat
// ---------------------------------------------------------------------------

/**
 * What each act asks of the voice-silence dial (dials.ts: negative leans
 * Voice, positive leans Silence). It is the ONE axis that answers "does it
 * want to be heard?", and it is the only axis consulted — one-mind-chorus
 * matters when you transmit a SELF, which is not this stage.
 */
export const CONTACT_DEMAND: Readonly<Record<CeremonyKind, number>> = {
  hail: -LEAN.lean, // speak to one
  broadcast: -LEAN.strong, // speak to everyone, forever
};

/** How far a mind may sit from the demand before it argues. */
export const CONTEST_GAP = 2 * LEAN.lean;

/** Coherence wounded per unit of gap past CONTEST_GAP. */
export const COHERENCE_WOUND_PER_GAP = 40;

/**
 * Whether the mind objects, and what forcing it anyway costs. Effective
 * thresholds fall out of the constants above: a hail contests above a
 * Silence position of +0.35, a broadcast above +0.10, so a balanced mind
 * argues about a broadcast and not about a hail, which is the right
 * asymmetry.
 *
 * The integration divisor is economy-design.md's "a deeply integrated mind
 * can weather a forcing that would fragment a shallow one", made real in one
 * term. Deterministic and stock-free: the same seed yields the same number
 * at preview and at charge, which is what lets the stance be PUSHED on the
 * sky rather than preflighted.
 */
export interface Resistance {
  readonly contested: boolean;
  /** The wound, in coherence. 0 iff uncontested. */
  readonly coherenceCost: number;
}

export function resistanceFor(seed: CivSeed, kind: CeremonyKind): Resistance {
  const gap = seed.dials["voice-silence"].position - CONTACT_DEMAND[kind];
  const contested = gap > CONTEST_GAP;
  if (!contested) return { contested: false, coherenceCost: 0 };
  const cost = Math.max(
    1,
    Math.round(
      (COHERENCE_WOUND_PER_GAP * (gap - CONTEST_GAP)) /
        (1 + 0.25 * seed.ladders.integration),
    ),
  );
  return { contested: true, coherenceCost: cost };
}

// ---------------------------------------------------------------------------
// The wire view
// ---------------------------------------------------------------------------

function stanceFor(seed: CivSeed, kind: CeremonyKind): ContactStance {
  const resistance = resistanceFor(seed, kind);
  return {
    kind,
    contested: resistance.contested,
    // Non-null iff contested: the objection is the whole content of the
    // resistance beat, and an uncontested act has nothing to say.
    line: resistance.contested ? resistanceLine(seed.archetype, kind) : null,
    coherenceCost: resistance.coherenceCost,
  };
}

/**
 * The `contact` block on `sky`. NOTHING IN IT IS ABOUT ANYONE ELSE: both
 * stances are pure functions of this civ's own dial sheet, and `outbound` is
 * this civ's own acts. A hail's `starId` and `arrivesYear` name a source the
 * player already sees (they aimed at it, and DetectedSource already carries
 * its distance), so the echo view crosses no boundary the sky had not
 * already crossed.
 *
 * A2.5's `threads` block is CALLED THROUGH rather than built here: it is the
 * one part of the contact wire that is about somebody else, it is derived
 * (traffic.ts) rather than stored, and keeping its construction out of this
 * module is what keeps this module's "no RNG, no clock, no storage" header
 * true — the composer draws a seeded variant, which is exactly the thing
 * that may not happen in here.
 */
export function buildContactWire(
  galaxy: Galaxy,
  selfCiv: PlacedCiv,
  nowYear: number,
  threads: {
    readonly summaries: readonly ThreadSummary[];
    readonly detail: ThreadDetail | null;
    /** A2.6: the threads this player has gone dark to, already filtered out
     *  of `summaries` by `buildThreads`. Carried through untouched — this
     *  module does not know what a mute is and does not need to. */
    readonly mutedStarIds: readonly string[];
  },
): ContactWire {
  const selfId = selfCiv.seed.id;
  const outbound: OutboundAct[] = actsFrom(galaxy.acts, selfId).map((act) => {
    const target = act.toCivId === null ? null : civById(galaxy, act.toCivId);
    return {
      id: act.id,
      kind: act.kind,
      starId: target === null ? null : target.starId,
      sentYear: act.sentYear,
      arrivesYear:
        act.toCivId === null
          ? null
          : act.sentYear + civDistanceLy(galaxy, selfId, act.toCivId),
      // The shell a broadcast has swept by now. Never negative: an act's
      // sentYear is the clock's now at commit, so it is always in the past.
      shellRadiusLy: act.kind === "broadcast" ? Math.max(0, nowYear - act.sentYear) : null,
    };
  });
  return {
    hail: stanceFor(selfCiv.seed, "hail"),
    broadcast: stanceFor(selfCiv.seed, "broadcast"),
    outbound,
    threads: threads.summaries,
    openThread: threads.detail,
    mutedStarIds: threads.mutedStarIds,
  };
}
