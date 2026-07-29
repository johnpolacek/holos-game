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
// require presence. The only writer of a ContactAct is Cohort's
// `onCommitContact`, whose first statement resolves a LIVE socket. Nothing
// else in the server may produce one: alarms are wake-ups and never truth
// (systems-a.md §7), the proposal route has no contact arm and gains none,
// study tripwires fire beliefs rather than acts, and AI civs have no path
// here in v1. The invariant is greppable and is meant to be grepped:
//
//   grep -rn "appendAct\|applyBroadcast\|commitContact" server/src
//
// must show only the definitions in this file, the parse arm and types in
// protocol.ts, and EXACTLY ONE call site each inside `onCommitContact`.
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
import type { ContactStance, ContactWire, OutboundAct } from "./protocol";
import { resistanceLine } from "./voice";

/** The two acts that write. "stay-dark" is a choice, not an act, and has no
 *  record here — see the module header. */
export type ContactKind = "hail" | "broadcast";

/**
 * One committed act, appended to a galaxy-scoped log that is never rewritten
 * and never pruned. `sentYear` is the clock's now at commit, which is the
 * year the light departed: every downstream read compares against it through
 * an observer's own `asOfYear` and so can never be early.
 *
 * A2.5 extends this record with an optional `inReplyTo` and nothing else —
 * an added optional field on an append-only log needs no migration, which is
 * why the thread has no identity of its own here.
 */
export interface ContactAct {
  /** `act-${n}`, galaxy-scoped ordinal. */
  readonly id: string;
  readonly kind: ContactKind;
  readonly fromCivId: CivId;
  /** Hail only; null for a broadcast, which is aimed at nobody. */
  readonly toCivId: CivId | null;
  /** The clock's now at commit = the year this light departed. */
  readonly sentYear: number;
  /** The receipt: what the commit actually cost the mind (0 uncontested). */
  readonly coherenceCost: number;
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

/** A hostile client cannot grow the log without bound. */
export const MAX_ACTS_PER_CIV = 32;

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
 * v1 body: "a hail from me to them exists". Written this way deliberately —
 * A2.5 changes the BODY (an act carrying `inReplyTo` clears it) and no
 * caller, no wire field and no stored shape has to move.
 */
export function hasUnansweredHail(
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
 * Scans for the LATEST qualifying act rather than the first. In v1 at most
 * one can qualify per ordered pair (`hasUnansweredHail` refuses a second),
 * so the two agree today; the scan is what stays correct once A2.5 lets a
 * thread carry several.
 */
export function beamCrossing(
  acts: readonly ContactAct[],
  fromCivId: CivId,
  toCivId: CivId,
  asOfYear: number,
): ContactAct | null {
  let latest: ContactAct | null = null;
  for (const act of acts) {
    if (act.kind !== "hail") continue;
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
export const CONTACT_DEMAND: Readonly<Record<ContactKind, number>> = {
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

export function resistanceFor(seed: CivSeed, kind: ContactKind): Resistance {
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

function stanceFor(seed: CivSeed, kind: ContactKind): ContactStance {
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
 */
export function buildContactWire(
  galaxy: Galaxy,
  selfCiv: PlacedCiv,
  nowYear: number,
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
  };
}
