// The vigil's observatory — derivation module for A2.1.
//
// This module owns the hypothesis menus (observatory-design.md §
// Hypotheses), the initial confidence distribution, and the evidence
// annotations. ALL study derivation lives here, never in handlers.
//
// Everything this module produces is belief derived from delayed light
// (ObservedSignal/lightHistory) — never truth. It reads the same shapes
// knowledge.ts already serves and reshapes them into the board the client
// renders; it does not touch CivTruth or anything server-truth-side.
//
// Player-facing register: observatory deadpan, wit 0. Every string here is
// written to be understood by someone who has read no design doc: plain
// words, concrete claims, no instrument jargon and no bare numbers standing
// in for meaning.

import type { EmissionEpoch } from "./civseed";
import type {
  StudySnapshot,
  StudyStatus,
  DetectedSource,
  EvidenceEntry,
  Hypothesis,
  HypothesisId,
  OpenQuestion,
} from "./protocol";
import type { ObservedSignal, SignalClass } from "./knowledge";

/** Shares never fall below this — even the least-favored reading stays live. */
export const SHARE_FLOOR = 0.02;
/** Shares never rise above this — watching alone never fully settles a study. */
export const SHARE_CEIL = 0.9;
/**
 * A reading is named in the annotation only if it holds at least this much
 * of the belief AND stands STUDY_LEAD_MARGIN clear of the runner-up. Below
 * either bar the study is genuinely undecided and shows WATCH_LINE.
 */
export const STUDY_LEAD_THRESHOLD = 0.45;
/** How far clear of the second reading a leader must stand to be named. */
export const STUDY_LEAD_MARGIN = 0.1;
/** Adopted verbatim from concepts/03-03 (decision log); wit 0. */
export const WATCH_LINE = "No hypothesis exceeds the threshold. Continue the watch.";

/**
 * What a menu entry is FOR, in evidence terms. Every menu carries one
 * mundane reading (nothing made), one built reading (somebody is there and
 * working), and one quiet reading (it used to be more than this); "open" is
 * the standing alternative a menu keeps live regardless of the numbers.
 */
type HypothesisRole = "mundane" | "built" | "quiet" | "open";

/** One menu entry: id, display label, plain gloss, evidence role. */
interface MenuEntry {
  readonly id: HypothesisId;
  readonly label: string;
  /** One short plain phrase saying what this reading would MEAN. */
  readonly gloss: string;
  readonly role: HypothesisRole;
}

/** Per-class hypothesis menu, in display order (mundane-first). */
interface Menu {
  readonly entries: readonly MenuEntry[];
}

// The five v1 menus (observatory-design.md § Hypotheses). directed-beam is
// not produced by A0's classify; its menu keeps the catalog total for
// A2.4's hails.
const MENUS: Record<SignalClass, Menu> = {
  "infrared-excess": {
    entries: [
      {
        id: "brown-dwarf",
        label: "brown dwarf",
        gloss: "a star that never caught, warm and dim",
        role: "mundane",
      },
      {
        id: "rogue-world",
        label: "rogue world",
        gloss: "a cold planet adrift, with no star of its own",
        role: "open",
      },
      {
        id: "cooled-remnant",
        label: "cooled remnant",
        gloss: "the leftover heat of something long dead",
        role: "quiet",
      },
      {
        id: "somebodys-heart",
        label: "somebody's heart",
        gloss: "a made thing, warm because it is still working",
        role: "built",
      },
    ],
  },
  "transit-shadows": {
    entries: [
      {
        id: "debris-and-rings",
        label: "debris and rings",
        gloss: "rubble and dust crossing, left from a wreck",
        role: "quiet",
      },
      {
        id: "natural-transits",
        label: "natural transits",
        gloss: "worlds and rock crossing in front, nothing made",
        role: "mundane",
      },
      {
        id: "construction-under-way",
        label: "construction under way",
        gloss: "something is being built there",
        role: "built",
      },
    ],
  },
  "broadcast-leakage": {
    entries: [
      {
        id: "young-and-sloppy",
        label: "young and sloppy",
        gloss: "a young world spilling noise it cannot contain",
        role: "mundane",
      },
      {
        id: "deliberate-shine",
        label: "deliberate shine",
        gloss: "brightness they chose, meant to be noticed",
        role: "built",
      },
      {
        id: "a-performance",
        label: "a performance",
        gloss: "a show put on for whoever is watching",
        role: "quiet",
      },
    ],
  },
  biosignature: {
    entries: [
      {
        id: "stable-biosphere",
        label: "stable biosphere",
        gloss: "life going on as it has for ages, nothing more",
        role: "mundane",
      },
      {
        id: "biosphere-in-crisis",
        label: "biosphere in crisis",
        gloss: "a living world, and something there is failing",
        role: "quiet",
      },
      {
        id: "pre-industrial",
        label: "pre-industrial civilization",
        gloss: "people there, but no machines to see yet",
        role: "open",
      },
      {
        id: "industrial-rise",
        label: "industrial rise",
        gloss: "machines starting up on a living world",
        role: "built",
      },
    ],
  },
  "directed-beam": {
    entries: [
      {
        id: "meant-for-us",
        label: "meant for us",
        gloss: "a beam aimed our way, on purpose",
        role: "built",
      },
      {
        id: "meant-for-someone-near-us",
        label: "meant for someone near us",
        gloss: "aimed past us at someone else; we catch the edge",
        role: "mundane",
      },
      {
        id: "a-repeat",
        label: "a repeat of an old message",
        gloss: "an old message sent again, on a loop",
        role: "quiet",
      },
    ],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Above this, no ordinary living world explains the output on its own. */
const WORLD_OUTPUT_CEILING = 0.12;
/** Output that only a made thing sustains; the top of the excess ramp. */
const MADE_OUTPUT = 0.5;
/** A change of this much across one epoch is a large one. */
const BIG_STEP = 0.25;

/**
 * The four evidence channels the board reads, all derived from the light
 * history alone (sorted oldest-first).
 */
interface LightReading {
  /** How far the latest output sits above what a world makes on its own. */
  readonly excess: number;
  /** How sharply the latest arrival rose over the one before it. */
  readonly rise: number;
  /** How far the latest output has fallen from the record's brightest. */
  readonly fall: number;
  /** Low, flat, unchanged: the shape nature usually has. */
  readonly steady: number;
}

/** Oldest-first copy of the light history. */
function sortedHistory(signal: ObservedSignal): EmissionEpoch[] {
  return [...signal.lightHistory].sort((a, b) => a.fromYear - b.fromYear);
}

function readLight(signal: ObservedSignal): LightReading {
  const sorted = sortedHistory(signal);
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  const latest = last === undefined ? signal.emissionLevel : last.level;
  const before = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
  const previous = before === undefined ? latest : before.level;

  let peak = latest;
  for (const epoch of sorted) {
    if (epoch.level > peak) peak = epoch.level;
  }

  const excess = clamp01((latest - WORLD_OUTPUT_CEILING) / (MADE_OUTPUT - WORLD_OUTPUT_CEILING));
  const rise = clamp01((latest - previous) / BIG_STEP);
  const fall = clamp01((peak - latest) / BIG_STEP);
  return { excess, rise, fall, steady: (1 - excess) * (1 - rise) * (1 - fall) };
}

/** How much of the belief each role earns from the light, before sharpening. */
function weightForRole(role: HypothesisRole, reading: LightReading): number {
  switch (role) {
    case "mundane":
      return 0.3 + 1.2 * reading.steady;
    case "built":
      return 0.15 + 1.35 * clamp01(0.65 * reading.excess + 0.5 * reading.rise);
    case "quiet":
      return 0.15 + 1.35 * reading.fall;
    case "open":
      return 0.35;
  }
}

/** Flattest and peakiest exponents applied to the evidence weights. */
const SHARPNESS_FLAT = 0.6;
const SHARPNESS_PEAKED = 2.4;
/** confidenceFor's output range (knowledge.ts): 0.2 marginal, 0.95 clean. */
const CONFIDENCE_MIN = 0.2;
const CONFIDENCE_MAX = 0.95;

/**
 * The initial confidence distribution for a freshly-observed signal.
 *
 * THE MODEL, in short: the EVIDENCE picks the leader and the CONFIDENCE
 * only decides how sharp the picture is. The light history gives four
 * coarse channels — how far the latest output sits above what a world makes
 * on its own, how sharply it rose, how far it has fallen from its brightest,
 * and how flat the whole record is — and those channels weight the menu's
 * mundane / built / quiet / open readings. `signal.confidence` is not a
 * belief about any one reading (it is mostly a function of distance: a near,
 * clean look), so it is applied as a temperature: a clean read raises the
 * weights to a power above 1 and the board comes to a point, a far or
 * marginal read flattens everything toward an even spread. Deterministic,
 * no RNG, and every share stays strictly inside (SHARE_FLOOR, SHARE_CEIL).
 */
export function initialDistribution(signal: ObservedSignal): Hypothesis[] {
  const menu = MENUS[signal.classification];
  const reading = readLight(signal);

  const sharpness =
    SHARPNESS_FLAT +
    (SHARPNESS_PEAKED - SHARPNESS_FLAT) *
      clamp01((signal.confidence - CONFIDENCE_MIN) / (CONFIDENCE_MAX - CONFIDENCE_MIN));

  const weights = menu.entries.map((entry) =>
    Math.pow(Math.max(weightForRole(entry.role, reading), 1e-6), sharpness),
  );
  const shares = settleShares(weights);

  return menu.entries.map((entry, i) => {
    const share = shares[i];
    return {
      id: entry.id,
      label: entry.label,
      gloss: entry.gloss,
      share: share === undefined ? SHARE_FLOOR : share,
    };
  });
}

/**
 * Normalizes `weights` to a distribution summing to 1 with every share
 * inside [SHARE_FLOOR, SHARE_CEIL]. Clamps, then hands the leftover (or
 * takes the overrun) back proportionally to whatever room each share still
 * has. With menus of 3-4 entries a valid distribution always exists, and a
 * couple of passes reach it.
 */
function settleShares(weights: readonly number[]): number[] {
  const count = weights.length;
  if (count === 0) return [];

  let total = 0;
  for (const w of weights) total += Math.max(w, 0);
  const shares =
    total > 0 ? weights.map((w) => Math.max(w, 0) / total) : weights.map(() => 1 / count);

  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < count; i++) {
      const share = shares[i];
      if (share !== undefined) shares[i] = clamp(share, SHARE_FLOOR, SHARE_CEIL);
    }

    let sum = 0;
    for (const share of shares) sum += share;
    const drift = 1 - sum;
    if (Math.abs(drift) < 1e-9) break;

    const rooms = shares.map((share) =>
      drift > 0 ? Math.max(0, SHARE_CEIL - share) : Math.max(0, share - SHARE_FLOOR),
    );
    let roomTotal = 0;
    for (const room of rooms) roomTotal += room;
    if (roomTotal <= 0) break;

    for (let i = 0; i < count; i++) {
      const share = shares[i];
      const room = rooms[i];
      if (share === undefined || room === undefined) continue;
      shares[i] = share + drift * (room / roomTotal);
    }
  }

  return shares;
}

/** The two largest shares, in order. */
function topTwo(
  hypotheses: readonly Hypothesis[],
): { readonly lead: Hypothesis | undefined; readonly runnerUp: Hypothesis | undefined } {
  let lead: Hypothesis | undefined;
  let runnerUp: Hypothesis | undefined;
  for (const h of hypotheses) {
    if (lead === undefined || h.share > lead.share) {
      runnerUp = lead;
      lead = h;
    } else if (runnerUp === undefined || h.share > runnerUp.share) {
      runnerUp = h;
    }
  }
  return { lead, runnerUp };
}

/** How firmly the leader may be stated, given how much of the belief it holds. */
function trustLine(share: number): string {
  if (share >= 0.7) {
    return "It is the strongest reading by a wide margin, though watching alone will never make it certain.";
  }
  if (share >= 0.55) {
    return "It is the better reading, and the others are still live.";
  }
  return "It leads by only a little, so hold it loosely.";
}

/**
 * The board's headline line. Names what the light leans toward, in plain
 * words, and says how far to trust it — but only when one reading both
 * clears STUDY_LEAD_THRESHOLD and stands STUDY_LEAD_MARGIN clear of the
 * next. A genuinely undecided board keeps the watch line.
 */
export function annotationFor(hypotheses: readonly Hypothesis[]): string {
  const { lead, runnerUp } = topTwo(hypotheses);
  if (lead === undefined) return WATCH_LINE;
  const margin = runnerUp === undefined ? 1 : lead.share - runnerUp.share;
  if (lead.share < STUDY_LEAD_THRESHOLD || margin < STUDY_LEAD_MARGIN) {
    return WATCH_LINE;
  }
  return `So far the light leans toward ${lead.label}: ${lead.gloss}. ${trustLine(lead.share)}`;
}

type TransitionKind = "first" | "rose" | "fell" | "held";

/** Which reading an arrival of this kind speaks to. "held" reuses the
 *  first-light attribution. Descriptive only in A2.1 — it says which stories
 *  this arrival spoke to, and becomes load-bearing when A2.2's answers move
 *  shares. */
function roleForTransition(kind: TransitionKind): HypothesisRole {
  switch (kind) {
    case "rose":
      return "built";
    case "fell":
      return "quiet";
    case "first":
    case "held":
      return "mundane";
  }
}

function movedFor(kind: TransitionKind, signalClass: SignalClass): readonly HypothesisId[] {
  const role = roleForTransition(kind);
  const ids: HypothesisId[] = [];
  for (const entry of MENUS[signalClass].entries) {
    if (entry.role === role) ids.push(entry.id);
  }
  return ids;
}

/**
 * Magnitude in words, never in decimals: what this much output would look
 * like to someone who knows what worlds put out. Written to read after
 * "the light was", "leaving it", and "held steady,".
 */
function magnitudeWords(level: number): string {
  if (level < 0.03) return "almost too faint to hold";
  if (level < 0.08) return "faint, no more than a living world gives off";
  if (level < WORLD_OUTPUT_CEILING + 0.08) {
    return "steady, about what a world running machines gives off";
  }
  if (level < MADE_OUTPUT) return "brighter than a world puts out on its own";
  return "far brighter than a world makes on its own";
}

/** A change of this much in one step reads as a break, not a drift. */
const SHARP_STEP = 0.15;

function annotationForTransition(
  kind: TransitionKind,
  level: number,
  change: number,
): string {
  const words = magnitudeWords(level);
  switch (kind) {
    case "first":
      return `The record opens here. The light was ${words}.`;
    case "rose":
      return change >= SHARP_STEP
        ? `The light climbed sharply, leaving it ${words}. Nothing that only cools brightens like that.`
        : `The light brightened, leaving it ${words}. That could be weather on a world, or work beginning.`;
    case "fell":
      return change >= SHARP_STEP
        ? `The light dropped away, leaving it ${words}. Whatever was burning there stopped.`
        : `The light dimmed, leaving it ${words}. Something there is winding down, or turning away.`;
    case "held":
      return `The light held where it was: ${words}. Holding still for that long is usually what nature looks like.`;
  }
}

/**
 * One evidence entry per light-history epoch: what the light did at arrival,
 * in plain words, and which stories that arrival spoke to. Derived ONLY from
 * signal.lightHistory (belief, never truth) — never from truth newer than
 * the light-departure year.
 *
 * ORDER: the returned array is OLDEST-FIRST, and each entry carries its
 * 1-based `ordinal` plus a `latest` flag for the newest arrival. The trail
 * is a story and reads forward; the client renders it in this order.
 */
export function deriveEvidence(
  signal: ObservedSignal,
  nowYear: number,
  starId: string,
): EvidenceEntry[] {
  const sorted = sortedHistory(signal);

  const entries: EvidenceEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const epoch = sorted[i];
    if (epoch === undefined) continue;
    const prevEpoch = i > 0 ? sorted[i - 1] : undefined;

    let kind: TransitionKind;
    let change = 0;
    if (i === 0 || prevEpoch === undefined) {
      kind = "first";
    } else if (epoch.level > prevEpoch.level) {
      kind = "rose";
      change = epoch.level - prevEpoch.level;
    } else if (epoch.level < prevEpoch.level) {
      kind = "fell";
      change = prevEpoch.level - epoch.level;
    } else {
      kind = "held";
    }

    entries.push({
      id: `${starId}/epoch-${i}`,
      ordinal: entries.length + 1,
      latest: i === sorted.length - 1,
      asOfYear: epoch.fromYear,
      lightAgeYears: nowYear - epoch.fromYear,
      annotation: annotationForTransition(kind, epoch.level, change),
      moved: movedFor(kind, signal.classification),
    });
  }

  return entries;
}

/**
 * Assembles the full study for a detected source: the board, the evidence
 * trail, and the headline. openQuestions is reserved — A2.2 populates it
 * from the question catalog.
 */
export function buildStudySnapshot(
  source: DetectedSource,
  status: StudyStatus,
  nowYear: number,
): StudySnapshot {
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
