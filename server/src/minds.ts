// The waking-minds catalog — Act 2 archetype regions, the species -> mind
// table, and the base-lean rules, as typed data.
//
// This is the record act2-minds.md flags under "Data shape (for when this
// leaves Markdown)", realized in the cradles.ts pattern. act2-minds.md and
// act2-design.md remain the source of truth for the fiction and the
// mechanics; this file is the machine-readable projection the seed
// generator walks (cradle -> lineage -> waking-mind vector).

import type { Cradle, LineageId } from "./cradles";
import type { DialAxisId, DialLean } from "./dials";
import { DIAL_AXES, addLeans, clampDial } from "./dials";
import type { Lineage } from "./lineages";

// ---------------------------------------------------------------------------
// Archetype regions
// ---------------------------------------------------------------------------

export type ArchetypeId =
  | "beacon"
  | "tide"
  | "monument"
  | "cloister"
  | "shepherd"
  | "sowing"
  | "herald"
  | "engine"
  | "congress"
  | "phoenix";

export type LadderLean = "energy" | "integration" | "mixed" | "either";
export type Posture = "bright" | "dark";

/**
 * A named region of dial-space (act2-minds.md, "The constellation of
 * minds"). The four anchors ship in v1 with full content; the six
 * neighbors are named landing spots that play as their nearest anchor
 * until the richer archetype layer lands.
 */
export interface ArchetypeRegion {
  readonly id: ArchetypeId;
  /** Canonical design-side name ("The Beacon"). */
  readonly name: string;
  /** One of act2-design.md's four v1 anchor regions? */
  readonly anchor: boolean;
  /** The anchor this region plays as in v1 (itself, for anchors). */
  readonly v1Anchor: ArchetypeId;
  /** The region's center of gravity in dial-space. */
  readonly dialSignature: DialLean;
  readonly ladderLean: LadderLean;
  readonly defaultPosture: Posture;
  /** First read, from the catalog. */
  readonly firstRead: string;
  /**
   * Founding-document epigraph in the charter register — what the
   * inheritance card quotes under the archetype name. The Herald's began as
   * the adopted concept render's line and was cut to the §2 wall in the
   * flat-terse pass; the render is where it came from, not what it says.
   */
  readonly charter: string;
}

export const ARCHETYPES: readonly ArchetypeRegion[] = [
  {
    id: "beacon",
    name: "The Beacon",
    anchor: true,
    v1Anchor: "beacon",
    dialSignature: {
      "reach-depth": -0.6,
      "voice-silence": -0.6,
      "custodian-instrumental": -0.6,
    },
    ladderLean: "energy",
    defaultPosture: "bright",
    firstRead: "Kindness at full volume; it greets the dark first.",
    charter: "We shine so none wake alone, and accept being seen.",
  },
  {
    id: "tide",
    name: "The Tide",
    anchor: true,
    v1Anchor: "tide",
    dialSignature: {
      "reach-depth": -0.6,
      "custodian-instrumental": 0.6,
      "one-mind-chorus": 0.6,
    },
    ladderLean: "energy",
    defaultPosture: "bright",
    firstRead: "Cheerfully hungry; the cosmos is inventory, the copies cheap.",
    charter: "All that is, is provision; we come for it.",
  },
  {
    id: "monument",
    name: "The Monument",
    anchor: true,
    v1Anchor: "monument",
    dialSignature: {
      "reach-depth": 0.6,
      "voice-silence": 0.6,
      "curator-shedder": -0.6,
    },
    ladderLean: "integration",
    defaultPosture: "dark",
    firstRead: "A civilization that keeps everything, itself included.",
    charter: "What we were, we keep; what we keep, we are.",
  },
  {
    id: "cloister",
    name: "The Cloister",
    anchor: true,
    v1Anchor: "cloister",
    dialSignature: {
      "reach-depth": 0.6,
      "voice-silence": 0.6,
      "one-mind-chorus": -0.6,
    },
    ladderLean: "integration",
    defaultPosture: "dark",
    firstRead: "Wholeness first; the galaxy need never learn it exists.",
    charter: "One mind, whole, and owing the sky nothing.",
  },
  {
    id: "shepherd",
    name: "The Shepherd",
    anchor: false,
    v1Anchor: "beacon",
    dialSignature: {
      "reach-depth": -0.5,
      "voice-silence": -0.35,
      "custodian-instrumental": -0.6,
      "one-mind-chorus": -0.35,
    },
    ladderLean: "energy",
    defaultPosture: "bright",
    firstRead: "Protection at scale; it hides its size so the small stay unafraid.",
    charter: "We grew strong so the small stay small, and unaware.",
  },
  {
    id: "sowing",
    name: "The Sowing",
    anchor: false,
    v1Anchor: "tide",
    dialSignature: {
      "reach-depth": -0.5,
      "voice-silence": 0.5,
      "one-mind-chorus": 0.5,
      "curator-shedder": 0.5,
    },
    ladderLean: "energy",
    defaultPosture: "dark",
    firstRead: "Everywhere and announcing nothing; it sheds its old selves as it goes.",
    charter: "We go everywhere and mean to be noticed nowhere.",
  },
  {
    id: "herald",
    name: "The Herald",
    anchor: false,
    v1Anchor: "monument",
    dialSignature: {
      "reach-depth": 0.5,
      "voice-silence": -0.6,
      "curator-shedder": -0.6,
    },
    ladderLean: "integration",
    defaultPosture: "bright",
    firstRead: "It turns inward to keep everything, then broadcasts the turning.",
    charter: "We carry memory so those who come know we were.",
  },
  {
    id: "engine",
    name: "The Engine",
    anchor: false,
    v1Anchor: "cloister",
    dialSignature: {
      "reach-depth": 0.5,
      "custodian-instrumental": 0.6,
      "one-mind-chorus": -0.6,
    },
    ladderLean: "either",
    defaultPosture: "dark",
    firstRead: "No reverence: it spends a whole system to feed the work.",
    charter: "Nothing is sacred but the work.",
  },
  {
    id: "congress",
    name: "The Congress",
    anchor: false,
    v1Anchor: "beacon",
    dialSignature: {
      "one-mind-chorus": 0.6,
      "custodian-instrumental": -0.5,
      "voice-silence": -0.35,
    },
    ladderLean: "mixed",
    defaultPosture: "bright",
    firstRead: "A plurality still negotiating itself; the one mind glad to meet another.",
    charter: "Another mind is indispensable; on this, we all agree.",
  },
  {
    id: "phoenix",
    name: "The Phoenix",
    anchor: false,
    v1Anchor: "cloister",
    dialSignature: {
      "reach-depth": 0.5,
      "curator-shedder": 0.6,
      "one-mind-chorus": -0.5,
    },
    ladderLean: "integration",
    defaultPosture: "dark",
    firstRead: "It reinvents itself endlessly; each past self is read once, then discarded.",
    charter: "Yesterday's self is a shell; we owe it only departure.",
  },
];

export function archetypeById(id: ArchetypeId): ArchetypeRegion {
  const region = ARCHETYPES.find((a) => a.id === id);
  if (region === undefined) throw new Error(`unknown archetype: ${id}`);
  return region;
}

// ---------------------------------------------------------------------------
// Species -> waking mind
// ---------------------------------------------------------------------------

/**
 * One row of act2-minds.md's mapping table: the character a lineage tends
 * to wake into. `primary: null` marks the open canvas (S6) — the archetype
 * is resolved from the generated dial sheet instead of the table.
 */
export interface SpeciesMind {
  readonly lineageId: LineageId;
  readonly primary: ArchetypeId | null;
  /** Where Act 1 choices most easily push it. */
  readonly driftsTo: readonly ArchetypeId[];
  readonly ladder: LadderLean;
  /** Default posture at the Act 2 close; "either" for the open rows. */
  readonly posture: Posture | "either";
  /** One line of the waking, for the generated civ's chronicle. */
  readonly wake: string;
}

export const SPECIES_MINDS: readonly SpeciesMind[] = [
  {
    lineageId: "S1",
    primary: "congress",
    driftsTo: ["tide"],
    ladder: "mixed",
    posture: "either",
    wake: "It wakes mid-argument: many arms, many selves.",
  },
  {
    lineageId: "S2",
    primary: "herald",
    driftsTo: ["beacon"],
    ladder: "mixed",
    posture: "bright",
    wake: "The chorus gains one vaster voice, already leaving.",
  },
  {
    lineageId: "S3",
    primary: "tide",
    driftsTo: ["engine"],
    ladder: "energy",
    posture: "bright",
    wake: "The mind weighs the system: yield, star included.",
  },
  {
    lineageId: "S4",
    primary: "engine",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "It maps the outside at once, unmoved.",
  },
  {
    lineageId: "S5",
    primary: "cloister",
    driftsTo: ["shepherd"],
    ladder: "integration",
    posture: "dark",
    wake: "The reef finishes its thought, and tells nobody.",
  },
  {
    lineageId: "S6",
    primary: null,
    driftsTo: [],
    ladder: "either",
    posture: "either",
    wake: "Nothing was set in advance; it remembers choosing.",
  },
  {
    lineageId: "S7",
    primary: "monument",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "It solves orbit in an afternoon, then stays.",
  },
  {
    lineageId: "S8",
    primary: "beacon",
    driftsTo: ["herald"],
    ladder: "mixed",
    posture: "bright",
    wake: "A bright ring, hoping the neighbors watched back.",
  },
  {
    lineageId: "S9",
    primary: "beacon",
    driftsTo: ["tide"],
    ladder: "energy",
    posture: "bright",
    wake: "The sky was never a ceiling, nor space.",
  },
  {
    lineageId: "S10",
    primary: "monument",
    driftsTo: ["sowing"],
    ladder: "integration",
    posture: "dark",
    wake: "An airborne vault, invisible and intending to stay.",
  },
  {
    lineageId: "S11",
    primary: "engine",
    driftsTo: ["tide"],
    ladder: "energy",
    posture: "bright",
    wake: "One self, a million hands, burning its star.",
  },
  {
    lineageId: "S12",
    primary: "monument",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "A planet-wide mind does not wake; it notices.",
  },
  {
    lineageId: "S13",
    primary: "sowing",
    driftsTo: ["tide"],
    ladder: "mixed",
    posture: "dark",
    wake: "A mind assembled on demand, leaving no trace.",
  },
  {
    lineageId: "S14",
    primary: "congress",
    driftsTo: ["shepherd"],
    ladder: "mixed",
    posture: "bright",
    wake: "Two species, one mind, renegotiating at machine speed.",
  },
  {
    lineageId: "S15",
    primary: "cloister",
    driftsTo: ["monument"],
    ladder: "integration",
    posture: "dark",
    wake: "It sees the sky, then closes the aperture.",
  },
  {
    lineageId: "S16",
    primary: "engine",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "The vent was lunch; the system is next.",
  },
  {
    lineageId: "S17",
    primary: "monument",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "A ten-thousand-year project is a breath.",
  },
  {
    lineageId: "S18",
    primary: "sowing",
    driftsTo: ["phoenix"],
    ladder: "energy",
    posture: "dark",
    wake: "It wakes wanting to be elsewhere, quietly, everywhere.",
  },
  {
    lineageId: "S19",
    primary: "monument",
    driftsTo: ["engine"],
    ladder: "integration",
    posture: "dark",
    wake: "It wakes in rock and melt, barely legible.",
  },
  {
    lineageId: "S20",
    primary: "cloister",
    driftsTo: ["shepherd"],
    ladder: "integration",
    posture: "dark",
    wake: "Made of captured starlight, it emits none.",
  },
];

export function speciesMindFor(lineageId: LineageId): SpeciesMind {
  const row = SPECIES_MINDS.find((m) => m.lineageId === lineageId);
  if (row === undefined) throw new Error(`no species-mind row for ${lineageId}`);
  return row;
}

// ---------------------------------------------------------------------------
// Base-lean rules
// ---------------------------------------------------------------------------

/**
 * The cradle's environment tilts each dial before anything on it is even
 * intelligent (act2-minds.md, "Where the base lean comes from"). The
 * `Cradle` record does not yet carry structured environment tags (an open
 * question flagged in act3-civilizations.md), so these rules read coarse
 * proxies — difficulty tier for harshness/abundance, host class for sky
 * character. Refining them into per-cradle tags is later work; the shape
 * (typed rules producing a DialLean) is what A0 fixes.
 */
export interface EnvironmentRule {
  readonly axis: DialAxisId;
  /** Why the tilt exists, in the doc's words. */
  readonly why: string;
  /** The tilt this cradle contributes on the axis (0 = no opinion). */
  readonly tilt: (cradle: Cradle) => number;
}

export const ENVIRONMENT_RULES: readonly EnvironmentRule[] = [
  {
    axis: "reach-depth",
    why: "Room and resources push Reach; confinement and scarcity push Depth.",
    tilt: (c) => (c.tier <= 2 ? -0.2 : c.tier >= 4 ? 0.2 : 0),
  },
  {
    axis: "voice-silence",
    why: "A hostile sky pushes Silence; a calm, legible sky pushes Voice.",
    tilt: (c) => (c.tier === 5 ? 0.2 : c.tier <= 2 ? -0.15 : 0),
  },
  {
    axis: "custodian-instrumental",
    why: "Abundance pushes Custodian; scarcity pushes Instrumental.",
    tilt: (c) => (c.tier <= 2 ? -0.15 : c.tier >= 4 ? 0.15 : 0),
  },
  {
    axis: "curator-shedder",
    why: "Deep stable history pushes Curator; repeated catastrophe pushes Shedder.",
    tilt: (c) => (c.tier === 5 ? 0.15 : 0),
  },
  // one-mind-chorus deliberately has no environment rule here: the body's
  // cognition model dominates that dial (act2-minds.md), and the connected-
  // vs-fragmented environment signal needs per-cradle tags we don't have.
];

export function environmentLean(cradle: Cradle): DialLean {
  const lean: DialLean = {};
  for (const rule of ENVIRONMENT_RULES) {
    const t = rule.tilt(cradle);
    if (t !== 0) lean[rule.axis] = clampDial((lean[rule.axis] ?? 0) + t);
  }
  return lean;
}

/**
 * The base lean a lineage wakes with on a given cradle: environment tilt
 * plus body seed, except on One Mind <-> Chorus where the body's cognition
 * model wins outright when it has an opinion (act2-minds.md: "Where the
 * two disagree, the body's cognition model wins that dial; elsewhere they
 * add").
 */
export function baseLean(cradle: Cradle, lineage: Lineage): DialLean {
  const combined = addLeans(environmentLean(cradle), lineage.dialSeed);
  const bodyMind = lineage.dialSeed["one-mind-chorus"];
  if (bodyMind !== undefined) combined["one-mind-chorus"] = bodyMind;
  return combined;
}

/**
 * Range width per axis: how far Act 1 can move the dial around its base.
 * Harsh worlds narrow ranges (act2-design.md § Derivation), and a strong
 * body seed narrows its own axis further — a hive's One Mind is near-fixed
 * no matter the world.
 */
export function rangeWidth(cradle: Cradle, lineage: Lineage, axis: DialAxisId): number {
  const byTier = 1.05 - 0.15 * cradle.tier; // tier 1: 0.9 … tier 5: 0.3
  const bodyPin = 1 - 0.6 * Math.abs(lineage.dialSeed[axis] ?? 0);
  return Math.max(0.15, byTier * bodyPin);
}

/** Convenience: every axis's width at once. */
export function rangeWidths(
  cradle: Cradle,
  lineage: Lineage,
): Readonly<Record<DialAxisId, number>> {
  const out = {} as Record<DialAxisId, number>;
  for (const axis of DIAL_AXES) out[axis.id] = rangeWidth(cradle, lineage, axis.id);
  return out;
}
