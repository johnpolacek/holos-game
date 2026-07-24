// The vigil's case board — derivation module for A2.1.
//
// This module owns the hypothesis menus (observatory-design.md §
// Hypotheses), the initial confidence distribution, and the evidence
// annotations. ALL case derivation lives here, never in handlers.
//
// Everything this module produces is belief derived from delayed light
// (ObservedSignal/lightHistory) — never truth. It reads the same shapes
// knowledge.ts already serves and reshapes them into the board the client
// renders; it does not touch CivTruth or anything server-truth-side.

import type { EmissionEpoch } from "./civseed";
import type {
  CaseSnapshot,
  CaseStatus,
  DetectedSource,
  EvidenceEntry,
  Hypothesis,
  HypothesisId,
  OpenQuestion,
} from "./protocol";
import type { ObservedSignal, SignalClass } from "./knowledge";

/** Shares never fall below this — even the least-favored reading stays live. */
export const SHARE_FLOOR = 0.02;
/** Shares never rise above this — watching alone never fully settles a case. */
export const SHARE_CEIL = 0.9;
/**
 * Above this, a case's board names a lead in its annotation. Deliberately
 * above the typical headline confidence (confidenceFor caps at 0.95, shares
 * clamp at SHARE_CEIL), so most read-only cases show WATCH_LINE — watching
 * alone rarely crowns a leader.
 */
export const CASE_LEAD_THRESHOLD = 0.75;
/** Adopted verbatim from concepts/03-03 (decision log); wit 0. */
export const WATCH_LINE = "No hypothesis exceeds the threshold. Continue the watch.";

/** One menu entry: id + display label, in menu order (mundane-first). */
interface MenuEntry {
  readonly id: HypothesisId;
  readonly label: string;
}

/** Per-class hypothesis menu. `leader` names the entry the headline echoes. */
interface Menu {
  readonly leader: HypothesisId;
  readonly entries: readonly MenuEntry[];
}

// The five v1 menus (observatory-design.md § Hypotheses). directed-beam is
// not produced by A0's classify; its menu keeps the catalog total for
// A2.4's hails.
const MENUS: Record<SignalClass, Menu> = {
  "infrared-excess": {
    leader: "brown-dwarf",
    entries: [
      { id: "brown-dwarf", label: "brown dwarf" },
      { id: "rogue-world", label: "rogue world" },
      { id: "cooled-remnant", label: "cooled remnant" },
      { id: "somebodys-heart", label: "somebody's heart" },
    ],
  },
  "transit-shadows": {
    leader: "natural-transits",
    entries: [
      { id: "debris-and-rings", label: "debris and rings" },
      { id: "natural-transits", label: "natural transits" },
      { id: "construction-under-way", label: "construction under way" },
    ],
  },
  "broadcast-leakage": {
    leader: "young-and-sloppy",
    entries: [
      { id: "young-and-sloppy", label: "young and sloppy" },
      { id: "deliberate-shine", label: "deliberate shine" },
      { id: "a-performance", label: "a performance" },
    ],
  },
  biosignature: {
    leader: "stable-biosphere",
    entries: [
      { id: "stable-biosphere", label: "stable biosphere" },
      { id: "biosphere-in-crisis", label: "biosphere in crisis" },
      { id: "pre-industrial", label: "pre-industrial civilization" },
      { id: "industrial-rise", label: "industrial rise" },
    ],
  },
  "directed-beam": {
    leader: "meant-for-someone-near-us",
    entries: [
      { id: "meant-for-us", label: "meant for us" },
      { id: "meant-for-someone-near-us", label: "meant for someone near us" },
      { id: "a-repeat", label: "a repeat of an old message" },
    ],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The initial confidence distribution for a freshly-observed signal.
 * leaderShare echoes the source card's headline confidence (the board and
 * the card can never disagree); the tail is a fixed descending prior,
 * tilted toward the most-somebody reading by emission brightness.
 */
export function initialDistribution(signal: ObservedSignal): Hypothesis[] {
  const menu = MENUS[signal.classification];
  const leaderShare = clamp(signal.confidence, SHARE_FLOOR, SHARE_CEIL);
  const tailEntries = menu.entries.filter((e) => e.id !== menu.leader);
  const tailCount = tailEntries.length;

  // Fixed descending prior over non-leader entries in menu order: the i-th
  // non-leader entry gets weight (tailCount - i). The last entry (the
  // most-somebody reading) is tilted further by emission brightness.
  const rawWeights = tailEntries.map((_, i) => tailCount - i);
  const lastIndex = rawWeights.length - 1;
  if (lastIndex >= 0) {
    const lastWeight = rawWeights[lastIndex];
    if (lastWeight !== undefined) {
      const tilt = 1 + 4 * Math.min(signal.emissionLevel, 0.25);
      rawWeights[lastIndex] = lastWeight * tilt;
    }
  }

  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const tailBudget = 1 - leaderShare;
  const shares =
    weightSum > 0
      ? rawWeights.map((w) => (w / weightSum) * tailBudget)
      : rawWeights.map(() => tailBudget / Math.max(1, tailCount));

  floorShares(shares, SHARE_FLOOR, tailBudget);

  const tailById = new Map<HypothesisId, number>();
  tailEntries.forEach((entry, i) => {
    const share = shares[i];
    tailById.set(entry.id, share === undefined ? 0 : share);
  });

  return menu.entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    share: entry.id === menu.leader ? leaderShare : tailById.get(entry.id) ?? 0,
  }));
}

/**
 * Floors each share at `floor`, stealing proportionally from the largest
 * shares if flooring would overrun `budget`. Mutates `shares` in place.
 * With menus of 3-4 tail entries and leaderShare <= SHARE_CEIL, a valid
 * distribution always exists.
 */
function floorShares(shares: number[], floor: number, budget: number): void {
  if (shares.length === 0) return;
  const deficits = shares.map((s) => Math.max(0, floor - s));
  const totalDeficit = deficits.reduce((a, b) => a + b, 0);
  if (totalDeficit <= 0) return;

  for (let i = 0; i < shares.length; i++) {
    const deficit = deficits[i];
    const current = shares[i];
    if (deficit !== undefined && deficit > 0 && current !== undefined) {
      shares[i] = current + deficit;
    }
  }

  // Steal the surplus back from shares above the floor, proportionally to
  // how far above the floor they sit.
  const above = shares
    .map((s, i) => ({ i, excess: s - floor }))
    .filter((e) => e.excess > 0);
  const excessSum = above.reduce((a, e) => a + e.excess, 0);

  if (excessSum > 0) {
    for (const { i, excess } of above) {
      const take = (excess / excessSum) * totalDeficit;
      const current = shares[i];
      if (current !== undefined) shares[i] = current - take;
    }
  }

  // Renormalize defensively to hold the budget exactly (fp tolerance).
  const sum = shares.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    const scale = budget / sum;
    for (let i = 0; i < shares.length; i++) {
      const current = shares[i];
      if (current !== undefined) shares[i] = current * scale;
    }
  }
}

/**
 * The board's headline line: names the leader if it clears the threshold,
 * else falls back to the watch line. Soft past tense, wit 0.
 */
export function annotationFor(hypotheses: readonly Hypothesis[]): string {
  let leader: Hypothesis | undefined;
  for (const h of hypotheses) {
    if (leader === undefined || h.share > leader.share) leader = h;
  }
  if (leader === undefined || leader.share < CASE_LEAD_THRESHOLD) {
    return WATCH_LINE;
  }
  return `The reading leaned ${leader.label}. Hold the designation lightly.`;
}

type TransitionKind = "first" | "rose" | "fell" | "held";

/** Per-class attribution table: which hypothesis a transition kind speaks to.
 *  "held" reuses the first-light attribution. Descriptive only in A2.1 — it
 *  says which stories this arrival spoke to, and becomes load-bearing when
 *  A2.2's answers move shares. */
const MOVED_BY_CLASS: Record<
  SignalClass,
  Record<Exclude<TransitionKind, "held">, readonly HypothesisId[]>
> = {
  "infrared-excess": {
    first: ["brown-dwarf"],
    rose: ["somebodys-heart"],
    fell: ["cooled-remnant"],
  },
  "transit-shadows": {
    first: ["natural-transits"],
    rose: ["construction-under-way"],
    fell: ["debris-and-rings"],
  },
  "broadcast-leakage": {
    first: ["young-and-sloppy"],
    rose: ["deliberate-shine"],
    fell: ["a-performance"],
  },
  biosignature: {
    first: ["stable-biosphere"],
    rose: ["industrial-rise"],
    fell: ["biosphere-in-crisis"],
  },
  "directed-beam": {
    first: ["meant-for-us"],
    rose: ["meant-for-someone-near-us"],
    fell: ["a-repeat"],
  },
};

function movedFor(kind: TransitionKind, signalClass: SignalClass): readonly HypothesisId[] {
  const table = MOVED_BY_CLASS[signalClass];
  return table[kind === "held" ? "first" : kind];
}

/**
 * One evidence entry per light-history epoch: what the signature did at
 * arrival, and which stories that transition spoke to. Derived ONLY from
 * signal.lightHistory (belief, never truth) — never from truth newer than
 * the light-departure year.
 */
export function deriveEvidence(
  signal: ObservedSignal,
  nowYear: number,
  starId: string,
): EvidenceEntry[] {
  const sorted: EmissionEpoch[] = [...signal.lightHistory].sort(
    (a, b) => a.fromYear - b.fromYear,
  );

  const entries: EvidenceEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const epoch = sorted[i];
    if (epoch === undefined) continue;
    const prevEpoch = i > 0 ? sorted[i - 1] : undefined;
    const level = epoch.level.toFixed(2);

    let kind: TransitionKind;
    let annotation: string;
    if (i === 0 || prevEpoch === undefined) {
      kind = "first";
      annotation = `First light in the record. The signature held near ${level}.`;
    } else if (epoch.level > prevEpoch.level) {
      kind = "rose";
      annotation = `The signature rose to ${level}.`;
    } else if (epoch.level < prevEpoch.level) {
      kind = "fell";
      annotation = `The signature fell to ${level}.`;
    } else {
      kind = "held";
      annotation = `The signature held at ${level}.`;
    }

    entries.push({
      id: `${starId}/epoch-${i}`,
      asOfYear: epoch.fromYear,
      lightAgeYears: nowYear - epoch.fromYear,
      annotation,
      moved: movedFor(kind, signal.classification),
    });
  }

  return entries;
}

/**
 * Assembles the full case for a detected source: the board, the evidence
 * trail, and the headline. openQuestions is reserved — A2.2 populates it
 * from the question catalog.
 */
export function buildCaseSnapshot(
  source: DetectedSource,
  status: CaseStatus,
  nowYear: number,
): CaseSnapshot {
  const hypotheses = initialDistribution(source.signal);
  const openQuestions: OpenQuestion[] = [];
  return {
    starId: source.starId,
    status,
    signalClass: source.signal.classification,
    hypotheses,
    evidence: deriveEvidence(source.signal, nowYear, source.starId),
    openQuestions,
    annotationLine: annotationFor(hypotheses),
  };
}
