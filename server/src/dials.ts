// The five character dials — the shared vocabulary of every catalog.
//
// act2-design.md ("The dials", "In-world labels") is the source of truth.
// Internal ids and pole names are the **design vocabulary**, used by every
// derivation table in the docs; the player only ever sees the pinned
// in-world labels, which ship here so A1 can render a dial sheet without
// reaching back into Markdown. The poles map straight across: left stays
// left.
//
// Convention: a dial value is a number in [-1, +1]. Negative leans the
// LEFT pole (Reach, Voice, Custodian, One Mind, Curator), positive leans
// the RIGHT pole (Depth, Silence, Instrumental, Chorus, Shedder). Zero is
// balanced. Catalog seeds use the LEAN magnitudes below.

export type DialAxisId =
  | "reach-depth"
  | "voice-silence"
  | "custodian-instrumental"
  | "one-mind-chorus"
  | "curator-shedder";

/** One pole of a dial, in both vocabularies. */
export interface DialPole {
  /** Design vocabulary (docs, derivations — never shown to the player). */
  readonly design: string;
  /** Pinned in-world label (act2-design.md § In-world labels). */
  readonly inWorld: string;
  /** In-world reading of leaning this way — the tap-to-expand explanation. */
  readonly gloss: string;
}

export interface DialAxis {
  readonly id: DialAxisId;
  /** Negative end. */
  readonly left: DialPole;
  /** Positive end. */
  readonly right: DialPole;
  /** The question the dial answers (act2-design.md). */
  readonly question: string;
}

export const DIAL_AXES: readonly DialAxis[] = [
  {
    id: "reach-depth",
    left: {
      design: "Reach",
      inWorld: "Reach",
      gloss: "It spends itself outward: more worlds, and a self scattered across them.",
    },
    right: {
      design: "Depth",
      inWorld: "Depth",
      gloss: "It turns inward: fewer places, and each known down to the bedrock.",
    },
    question: "Does the mind spend itself outward or inward?",
  },
  {
    id: "voice-silence",
    left: {
      design: "Voice",
      inWorld: "Voice",
      gloss: "It wants to be known: it builds bright and signals first, whoever is listening.",
    },
    right: {
      design: "Silence",
      inWorld: "Silence",
      gloss: "Better unheard than found: it dampens its own light and holds its signals close.",
    },
    question: "Does it want to be heard?",
  },
  {
    id: "custodian-instrumental",
    left: {
      design: "Custodian",
      inWorld: "Garden",
      gloss: "Other life is a garden to keep: younger minds are sheltered, never spent.",
    },
    right: {
      design: "Instrumental",
      inWorld: "Forge",
      gloss: "Other life is ore for the forge: what it finds, it uses.",
    },
    question: "What are other minds for?",
  },
  {
    id: "one-mind-chorus",
    left: {
      design: "One Mind",
      inWorld: "Monolith",
      gloss: "A copy is not you, so it will not fork or travel as light.",
    },
    right: {
      design: "Chorus",
      inWorld: "Chorus",
      gloss: "A copy is still you, so it scatters freely and travels as light.",
    },
    question: "Is a copy of you still you?",
  },
  {
    id: "curator-shedder",
    left: {
      design: "Curator",
      inWorld: "Memory",
      gloss: "The past is worth keeping: it hoards what it was and builds vaults.",
    },
    right: {
      design: "Shedder",
      inWorld: "Renewal",
      gloss: "The past is a shell: it remakes itself and leaves each old self behind.",
    },
    question: "What is the biological past worth?",
  },
];

export function dialAxisById(id: DialAxisId): DialAxis {
  const axis = DIAL_AXES.find((a) => a.id === id);
  if (axis === undefined) throw new Error(`unknown dial axis: ${id}`);
  return axis;
}

/**
 * A sparse lean over the axes: catalog seeds, environment tilts, archetype
 * signatures. Missing axes mean "no opinion" (0).
 */
export type DialLean = Partial<Record<DialAxisId, number>>;

/** Standard seed magnitudes used by the catalogs (sign supplies the pole). */
export const LEAN = { strong: 0.6, lean: 0.35, faint: 0.15 } as const;

/**
 * One dial as it ships to Act 2/3: the earned position plus the range its
 * history allows (act2-design.md § Derivation: "position, minimum,
 * maximum" — nature sets the range; the played history sets the point).
 */
export interface DialSetting {
  readonly position: number;
  readonly min: number;
  readonly max: number;
}

/** The full five-dial sheet — what the inheritance card reveals. */
export type DialSheet = Readonly<Record<DialAxisId, DialSetting>>;

/**
 * A4: a DATED reading of a sheet, and the shape a walk is recorded in.
 *
 * `CivSeed.emissionHistory`'s twin, deliberately: a colony's light and a
 * colony's dials are two readings of ONE sampled record, taken at the same
 * years, so the year a child brightened and the year it started saying it had
 * turned toward Voice can never disagree. A civilization that has not walked
 * anywhere carries no history at all, and `dialSheetAt` falls back to the
 * sheet it was seeded with.
 */
export interface DialEpoch {
  readonly fromYear: number;
  readonly sheet: DialSheet;
}

/** The newest sample at or before `year`, else `fallback`. Total, and
 *  order-independent: the caller's history need not be sorted. */
export function dialSheetAt(
  history: readonly DialEpoch[],
  fallback: DialSheet,
  year: number,
): DialSheet {
  let best: DialEpoch | undefined;
  for (const epoch of history) {
    if (epoch.fromYear > year) continue;
    if (best === undefined || epoch.fromYear > best.fromYear) best = epoch;
  }
  return best?.sheet ?? fallback;
}

export function clampDial(n: number): number {
  return Math.min(1, Math.max(-1, n));
}

/** Sum two leans, clamped per axis. */
export function addLeans(a: DialLean, b: DialLean): DialLean {
  const out: DialLean = {};
  for (const axis of DIAL_AXES) {
    const sum = (a[axis.id] ?? 0) + (b[axis.id] ?? 0);
    if (sum !== 0) out[axis.id] = clampDial(sum);
  }
  return out;
}

/** Euclidean distance between a sheet's positions and a region's lean. */
export function dialDistance(sheet: DialSheet, lean: DialLean): number {
  let sq = 0;
  for (const axis of DIAL_AXES) {
    const d = sheet[axis.id].position - (lean[axis.id] ?? 0);
    sq += d * d;
  }
  return Math.sqrt(sq);
}
