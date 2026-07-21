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
    left: { design: "Reach", inWorld: "Reach" },
    right: { design: "Depth", inWorld: "Depth" },
    question: "Does the mind spend itself outward or inward?",
  },
  {
    id: "voice-silence",
    left: { design: "Voice", inWorld: "Voice" },
    right: { design: "Silence", inWorld: "Silence" },
    question: "Does it want to be heard?",
  },
  {
    id: "custodian-instrumental",
    left: { design: "Custodian", inWorld: "Garden" },
    right: { design: "Instrumental", inWorld: "Forge" },
    question: "What are other minds for?",
  },
  {
    id: "one-mind-chorus",
    left: { design: "One Mind", inWorld: "Monolith" },
    right: { design: "Chorus", inWorld: "Chorus" },
    question: "Is a copy of you still you?",
  },
  {
    id: "curator-shedder",
    left: { design: "Curator", inWorld: "Memory" },
    right: { design: "Shedder", inWorld: "Renewal" },
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
