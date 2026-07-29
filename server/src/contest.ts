// The contest — mask upkeep, and what an instrument can still see through it
// (A2.3, observatory-design.md § The exits).
//
// The observatory's first two questions were "what is there" and "how old is
// the light". This module adds the third: WHO ELSE IS SPENDING. A
// civilization that chose the dark did not choose it once. It goes on paying,
// and what it pays for is a mask that improves on a cadence measured in
// target-years. The observer's instruments improve on their own cadence, and
// a bought question resolves against the DIFFERENCE between the two across
// the window the player's own pacing chose.
//
// AUTHORED CURVES, NOT A DIE AND NOT A BELIEF. `maskTierAt` is a pure
// function of the seed's own emission history and its archetype's rule row,
// so re-deriving it a thousand years later reproduces the identical number.
// That is questions.ts's effects-freeze discipline obtained for free rather
// than stored: nothing about the contest is written down anywhere, so nothing
// about it can go stale or be forged by editing storage. No RNG, no clock, no
// storage, and no economy for AI civs — an AI civ does not decide to mask,
// its character already did.
//
// NOTHING HERE CROSSES THE WIRE. `MaskRule`, the tiers, `ContestShape`, the
// archetype ids: every one of them is a fact about the TARGET, and the wire
// boundary (knowledge.ts's ObservedCiv discipline) admits belief, dates, and
// authored sentences only. What a player may learn from a contest is that a
// later look separated less than an earlier one — a fact about their own
// instruments, which is theirs to know.
//
// IMPORT DIRECTION. questions.ts imports THIS; this imports no question and
// no study. There is no cycle and no path from here to a finding table.

import type { CivSeed, EmissionEpoch } from "./civseed";
import { MADE_HEAT_FLOOR } from "./knowledge";
import type { ArchetypeId } from "./minds";

// ---------------------------------------------------------------------------
// The rule table — who pays for a mask, how fast it improves, and how long
// they keep paying.
// ---------------------------------------------------------------------------

/**
 * One archetype's mask upkeep. `why` is a design note kept next to the
 * numbers it explains so a later retune has to read the reason first; it is
 * never a surface and never crosses the wire.
 */
export interface MaskRule {
  readonly pays: boolean;
  /** Target-years per rung of improvement. */
  readonly cadenceYears: number;
  /** Upkeep stops after this many years and the tier freezes; null = forever. */
  readonly lapseYears: number | null;
  readonly why: string;
}

/**
 * Total over ArchetypeId. The bright four never pay: concealment is not a
 * thing they want, so there is nothing for an instrument to lose ground to,
 * and a study on one of them can plateau but can never regress.
 *
 * A non-paying row still carries a cadence, and it is Infinity rather than
 * zero: `maskTierAt` guards on `pays`, but the arithmetic underneath must be
 * total on its own, and floor(x / Infinity) is 0 for every x.
 */
export const MASK_RULES: Readonly<Record<ArchetypeId, MaskRule>> = {
  cloister: {
    pays: true,
    cadenceYears: 60,
    lapseYears: null,
    why: "Owes the sky nothing and has never intended to be read; the reference masker.",
  },
  sowing: {
    pays: true,
    cadenceYears: 90,
    lapseYears: null,
    why: "Being noticed nowhere is the whole method, so the upkeep is ordinary housekeeping.",
  },
  phoenix: {
    pays: true,
    cadenceYears: 120,
    lapseYears: 1200,
    why: "The mask dies with the self that built it; nobody later inherits the reason to keep paying.",
  },
  shepherd: {
    pays: true,
    cadenceYears: 150,
    lapseYears: null,
    why: "Hides its size rather than its existence, so the work is real but never urgent.",
  },
  monument: {
    pays: true,
    cadenceYears: 180,
    lapseYears: null,
    why: "Keeps everything, including its own quiet, and does everything slowly.",
  },
  engine: {
    pays: true,
    cadenceYears: 240,
    lapseYears: null,
    why: "Concealment is incidental to the work and arrives late, as a consequence of efficiency.",
  },
  beacon: { pays: false, cadenceYears: Infinity, lapseYears: null, why: "Never pays: being read is the point." },
  tide: { pays: false, cadenceYears: Infinity, lapseYears: null, why: "Never pays: too busy taking to bother hiding." },
  herald: { pays: false, cadenceYears: Infinity, lapseYears: null, why: "Never pays: it is transmitting on purpose." },
  congress: { pays: false, cadenceYears: Infinity, lapseYears: null, why: "Never pays: it could not agree to." },
};

// ---------------------------------------------------------------------------
// The mask's onset and its tier
// ---------------------------------------------------------------------------

/** Oldest-first copy; the generator emits epochs in order, and this does not
 *  depend on it having. (studies.ts's `sortedHistory`, same reason.) */
function sortedHistory(history: readonly EmissionEpoch[]): EmissionEpoch[] {
  return [...history].sort((a, b) => a.fromYear - b.fromYear);
}

/**
 * First emission epoch at or after ascension whose level sits below the
 * made-heat floor; null if this seed never went dark. Derived from the seed's
 * OWN emissionHistory rather than from a posture flag, because the mask's
 * onset has to be the same year the sky sees the character change: the epoch
 * that makes the light go quiet is the epoch upkeep starts paying for.
 */
export function darkTurnYear(seed: CivSeed): number | null {
  for (const epoch of sortedHistory(seed.emissionHistory)) {
    if (epoch.fromYear < seed.ascensionYear) continue;
    if (epoch.level < MADE_HEAT_FLOOR) return epoch.fromYear;
  }
  return null;
}

/**
 * Rungs of mask improvement paid for by `year`, in TARGET years. Monotone
 * non-decreasing in `year`, which is the property the whole contest rests on:
 * the difference across a window can never be negative, so a mask can take an
 * answer away and can never hand one back.
 *
 * Zero unless the archetype pays, the posture is dark, the seed actually went
 * dark, and the year is at or after the turn. A lapsing rule (phoenix) freezes
 * at its last paid rung forever rather than decaying: the mask does not
 * un-build itself, it simply stops getting better.
 */
export function maskTierAt(seed: CivSeed, year: number): number {
  const rule = MASK_RULES[seed.archetype];
  if (!rule.pays || seed.posture !== "dark") return 0;
  const darkTurn = darkTurnYear(seed);
  if (darkTurn === null || year < darkTurn) return 0;
  const lapse = rule.lapseYears ?? Infinity;
  const paidThrough = Math.min(year, darkTurn + lapse);
  return Math.floor((paidThrough - darkTurn) / rule.cadenceYears);
}

// ---------------------------------------------------------------------------
// The observer's side
// ---------------------------------------------------------------------------

/**
 * How many rungs of mask improvement this look can absorb without losing
 * ground, frozen at purchase. Two channels, deliberately different in kind:
 * the LANDED confidence-lift projects (a civilization that built better
 * instruments sees through more), and the study's own accumulated record (a
 * baseline of earlier answers is itself an instrument, capped at two rungs so
 * a long study cannot become unmaskable).
 *
 * `lift` is `confidenceLiftAt(projectState, boughtYear)` and `priorAnswers` is
 * how many purchases on this study answer at or before this one — both frozen
 * at purchase by their callers (questions.ts), so a tier computed years later
 * is the identical number.
 */
export function instrumentTierAt(lift: number, priorAnswers: number): number {
  return (
    (lift >= 0.05 ? 1 : 0) + (lift >= 0.15 ? 1 : 0) + Math.min(2, Math.floor(priorAnswers / 2))
  );
}

// ---------------------------------------------------------------------------
// The contest itself
// ---------------------------------------------------------------------------

/**
 * clear: the look stands as the honest table wrote it. masked: the target
 * gained ground the instrument could still absorb, so the look comes back
 * consistent with everything and decisive about nothing. regressed: the
 * target outpaced the instrument, and the later look separates LESS than the
 * earlier one.
 */
export type ContestShape = "clear" | "masked" | "regressed";

export interface ContestInput {
  readonly seed: CivSeed;
  /** T_now: the target year this look lands on. */
  readonly targetYear: number;
  /** T_prev: the target year of the newest earlier look, or null on a first
   *  look — which is why the first question on a study can never regress. */
  readonly priorTargetYear: number | null;
  readonly instrumentTier: number;
}

/**
 * The window `(T_prev, T_now]` resolved against the instruments. `deltaMask`
 * is how many rungs the target gained across a window whose length is the
 * player's own pacing choice: ask two questions back to back and the target
 * gains nothing; let a study sit for four hundred target-years and a cloister
 * has gained six rungs while the instruments gained at most four.
 */
export function resolveContest(i: ContestInput): {
  readonly shape: ContestShape;
  readonly deltaMask: number;
  readonly maskTier: number;
} {
  const maskTier = maskTierAt(i.seed, i.targetYear);
  const deltaMask =
    i.priorTargetYear === null ? 0 : maskTier - maskTierAt(i.seed, i.priorTargetYear);
  if (deltaMask <= 0) return { shape: "clear", deltaMask, maskTier };
  if (deltaMask <= i.instrumentTier) return { shape: "masked", deltaMask, maskTier };
  return { shape: "regressed", deltaMask, maskTier };
}
