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
      gloss: "It pours itself outward — more worlds, more room. Growth is the point, and it will accept a scattered, far-flung self to have it.",
    },
    right: {
      design: "Depth",
      inWorld: "Depth",
      gloss: "It turns inward — fewer places, deeper mastery. It would rather perfect one world than spread thin across a thousand.",
    },
    question: "Does the mind spend itself outward or inward?",
  },
  {
    id: "voice-silence",
    left: {
      design: "Voice",
      inWorld: "Voice",
      gloss: "It wants to be known. It builds bright and signals first, content to be the loudest thing in its sky.",
    },
    right: {
      design: "Silence",
      inWorld: "Silence",
      gloss: "It keeps to the dark. Better unheard than found — it dampens its own light and lets the neighbors wonder.",
    },
    question: "Does it want to be heard?",
  },
  {
    id: "custodian-instrumental",
    left: {
      design: "Custodian",
      inWorld: "Garden",
      gloss: "Other life is a garden to keep. Younger minds are to be sheltered and tended, never spent.",
    },
    right: {
      design: "Instrumental",
      inWorld: "Forge",
      gloss: "Other life is ore for the forge. What it finds, it uses; a living world is material like any other.",
    },
    question: "What are other minds for?",
  },
  {
    id: "one-mind-chorus",
    left: {
      design: "One Mind",
      inWorld: "Monolith",
      gloss: "It is one indivisible self. A copy is not you — to split the mind is to lose it, so it never forks its will or travels as a mere signal.",
    },
    right: {
      design: "Chorus",
      inWorld: "Chorus",
      gloss: "It is many voices at once. A copy is still you, so it scatters freely — sending itself as light costs nothing it fears to lose.",
    },
    question: "Is a copy of you still you?",
  },
  {
    id: "curator-shedder",
    left: {
      design: "Curator",
      inWorld: "Memory",
      gloss: "The past is worth keeping. It hoards what it was — its dead, its languages, its first world — and builds vaults against forgetting.",
    },
    right: {
      design: "Shedder",
      inWorld: "Renewal",
      gloss: "The past is a shell to shed. It remakes itself without grief, leaving each old self behind to become the next.",
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
