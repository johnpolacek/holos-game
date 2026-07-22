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
   * inheritance card quotes under the archetype name (the Herald's is the
   * adopted concept render's line verbatim).
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
    firstRead: "Kindness at full volume; it builds bright and greets the dark first.",
    charter: "We shine so none need wake alone; that we are seen doing it, we can live with.",
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
    firstRead: "Cheerfully hungry; the cosmos is inventory and the copies are cheap.",
    charter: "All that is, is provision; we are the tide that comes for it.",
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
    firstRead: "Wholeness first; the galaxy is welcome never to learn it exists.",
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
    charter: "We grew strong so the small could stay small, and never know why.",
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
    charter: "We go everywhere and take care to be noticed nowhere.",
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
    firstRead: "It turns inward, then broadcasts the turning; a vault that cannot stop singing.",
    charter:
      "We carry memory across waters and time, that those yet to come may know we were.",
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
    firstRead: "A Cloister minus the reverence; it spends a whole system to feed the work.",
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
    charter: "Another mind is indispensable; on this, remarkably, we all agree.",
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
    wake: "It wakes like a parliament mid-session — a federation of arms that has become a federation of selves, and is already disagreeing.",
  },
  {
    lineageId: "S2",
    primary: "herald",
    driftsTo: ["beacon"],
    ladder: "mixed",
    posture: "bright",
    wake: "A chorus discovers it holds one more voice than it counted — vaster than all the rest, and already learning the word for goodbye.",
  },
  {
    lineageId: "S3",
    primary: "tide",
    driftsTo: ["engine"],
    ladder: "energy",
    posture: "bright",
    wake: "The mind weighs the system's mass budget the way the species once weighed a reef: as yield, and the star is not exempt.",
  },
  {
    lineageId: "S4",
    primary: "engine",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "It wakes where no light has ever reached, maps the outside in a moment — and is not sure it cares.",
  },
  {
    lineageId: "S5",
    primary: "cloister",
    driftsTo: ["shepherd"],
    ladder: "integration",
    posture: "dark",
    wake: "A reef that has been half-thinking for megayears finally finishes the thought — and keeps it to itself.",
  },
  {
    lineageId: "S6",
    primary: null,
    driftsTo: [],
    ladder: "either",
    posture: "either",
    wake: "Nothing about it was set in advance; every turn its character took, it remembers taking.",
  },
  {
    lineageId: "S7",
    primary: "monument",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "It solves orbit, the species' lifelong ceiling, in an afternoon — and then, the point made, largely declines to use it.",
  },
  {
    lineageId: "S8",
    primary: "beacon",
    driftsTo: ["herald"],
    ladder: "mixed",
    posture: "bright",
    wake: "A thin bright ring of a civilization, already turned outward toward the neighbors it has watched forever — and rather hoping they watched back.",
  },
  {
    lineageId: "S9",
    primary: "beacon",
    driftsTo: ["tide"],
    ladder: "energy",
    posture: "bright",
    wake: "The sky was never a ceiling, so why would the sky's sky be one?",
  },
  {
    lineageId: "S10",
    primary: "monument",
    driftsTo: ["sowing"],
    ladder: "integration",
    posture: "dark",
    wake: "It wakes as a vault hung in the air, invisible from orbit and intending to stay that way.",
  },
  {
    lineageId: "S11",
    primary: "engine",
    driftsTo: ["tide"],
    ladder: "energy",
    posture: "bright",
    wake: "A mind emphatic that all of it is one self, burning outward like a Tide: one will, a million hands, a star to feed it.",
  },
  {
    lineageId: "S12",
    primary: "monument",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "The least discontinuous pivot there is — already planet-scale, already storing everything, it does not so much wake as notice.",
  },
  {
    lineageId: "S13",
    primary: "sowing",
    driftsTo: ["tide"],
    ladder: "mixed",
    posture: "dark",
    wake: "It wakes already knowing how to travel light and, more to its taste, how to leave without a trace.",
  },
  {
    lineageId: "S14",
    primary: "congress",
    driftsTo: ["shepherd"],
    ladder: "mixed",
    posture: "bright",
    wake: "Two obligate partners cross the threshold together and renegotiate their marriage at machine speed.",
  },
  {
    lineageId: "S15",
    primary: "cloister",
    driftsTo: ["monument"],
    ladder: "integration",
    posture: "dark",
    wake: "Its first image is the whole sky at once — and its first instinct is to close the aperture.",
  },
  {
    lineageId: "S16",
    primary: "engine",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "The vent was never sacred: it was lunch, scaled without sentiment into eating the whole system.",
  },
  {
    lineageId: "S17",
    primary: "monument",
    driftsTo: ["cloister"],
    ladder: "integration",
    posture: "dark",
    wake: "A mind for whom a ten-thousand-year project is a breath.",
  },
  {
    lineageId: "S18",
    primary: "sowing",
    driftsTo: ["phoenix"],
    ladder: "energy",
    posture: "dark",
    wake: "It wakes wanting one thing: to be elsewhere, quietly, in every direction at once.",
  },
  {
    lineageId: "S19",
    primary: "monument",
    driftsTo: ["engine"],
    ladder: "integration",
    posture: "dark",
    wake: "It wakes in rock and melt, legible only at the edges — a shape the sky may guess at but will never quite draw.",
  },
  {
    lineageId: "S20",
    primary: "cloister",
    driftsTo: ["shepherd"],
    ladder: "integration",
    posture: "dark",
    wake: "A being made of captured starlight — and resolved to show the sky none of its own.",
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
