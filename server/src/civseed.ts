// CivSeed + the seed generator — the handoff seam (roadmap.md).
//
// Act 3 consumes a civilization as this typed record and never cares
// where it came from. Phase A fills it with the generator below, which
// walks the catalog chain — cradle (cradles.ts) -> candidate lineage
// (lineages.ts) -> base lean and waking-mind vector (minds.ts) — plus
// authored variation, so every generated civ has a legible history: its
// world's fingerprint, its species, its character, its charter. Phase B
// will fill the same record from play, and the generator retires to
// serving AI civs and inheritances.
//
// Shape discipline: this record must be able to feed the inheritance card
// (concepts/03-00-inheritance.png) — world fingerprint, lineage, the
// five-dial sheet, archetype, charter — without a reshape in A1.

import { CRADLES, SPAWN_RELATIVE_WEIGHT, type Cradle, type LineageId } from "./cradles";
import { DIAL_AXES, clampDial, dialDistance, type DialAxisId, type DialSetting, type DialSheet } from "./dials";
import { lineageById, type Lineage } from "./lineages";
import {
  ARCHETYPES,
  archetypeById,
  baseLean,
  rangeWidth,
  speciesMindFor,
  type ArchetypeId,
  type Posture,
} from "./minds";
import { generateCivName } from "./names";
import type { Rng } from "./rng";

export type CivId = string;

/** Where the civ sits on the galaxy's age axis (vision.md, seed the whole spectrum). */
export type AgeBand = "young" | "peer" | "elder";

/** Ladder stages, 0–4 (act2-design.md v1 scope: 2 ladders × ~4 stages). */
export interface LadderStages {
  readonly energy: number;
  readonly integration: number;
}

/** Starting stocks in v1 placeholder units (act2-design.md's four resources). */
export interface ResourceStocks {
  readonly energy: number;
  readonly matter: number;
  readonly compute: number;
  readonly coherence: number;
}

/**
 * One step of the emission-history summary: from `fromYear` (absolute
 * game year; negative = before cohort creation) the civilization emits at
 * `level` (0..1 broadband Signature) until the next epoch begins.
 *
 * Epochs MAY be future-dated: A0 civs are static emitters whose behavior
 * over time is pre-authored (a dark turn that has not happened yet). The
 * knowledge layer only ever serves light that has already departed, so a
 * future epoch can never leak — it simply becomes true when the clock
 * reaches it, and then takes distance-years more to be seen.
 */
export interface EmissionEpoch {
  readonly fromYear: number;
  readonly level: number;
}

/** The handoff record. Placement (which star) lives on the galaxy, not here. */
export interface CivSeed {
  readonly id: CivId;
  readonly name: string;
  /** Origin cradle (cradles.ts id) — the backstory's world. */
  readonly cradleId: number;
  /** Origin lineage (S1–S20) — the backstory's species. */
  readonly lineageId: LineageId;
  /** The five-dial sheet: earned position + allowed range per dial. */
  readonly dials: DialSheet;
  /** Nearest archetype region (minds.ts). */
  readonly archetype: ArchetypeId;
  /** The Act 2 closing posture — bright or dark. */
  readonly posture: Posture;
  readonly ageBand: AgeBand;
  /** Game year of the singularity; future for young (still climbing). */
  readonly ascensionYear: number;
  readonly ladders: LadderStages;
  readonly stocks: ResourceStocks;
  /** The light-echo seed: bright-years Signature debt and all. */
  readonly emissionHistory: readonly EmissionEpoch[];
  /** Founding-document epigraph (the archetype's charter register). */
  readonly charter: string;
  /** The legible history, one line per link of the chain. */
  readonly chronicle: readonly string[];
}

export interface GenerateCivParams {
  readonly id: CivId;
  readonly ageBand: AgeBand;
  /** Game year of generation (0 at cohort creation). */
  readonly nowYear: number;
  /** Player civs: ascended only a handful of years ago (Act 3 opens now). */
  readonly recentlyAscended?: boolean;
}

// --- the generator ----------------------------------------------------------

function drawCradle(rng: Rng): Cradle {
  return rng.weighted(CRADLES, (c) => SPAWN_RELATIVE_WEIGHT[c.spawnWeight]);
}

/** Likeliest-first candidate weights, speculative lineages leaned on lightly. */
function drawLineage(rng: Rng, cradle: Cradle): Lineage {
  const n = cradle.candidateLineages.length;
  const drawn = rng.weighted(cradle.candidateLineages, (id) => {
    const rank = cradle.candidateLineages.indexOf(id);
    const base = 2 ** (n - 1 - rank);
    return lineageById(id).speculative ? base * 0.4 : base;
  });
  return lineageById(drawn);
}

function drawDialSheet(rng: Rng, cradle: Cradle, lineage: Lineage): DialSheet {
  const base = baseLean(cradle, lineage);
  const sheet = {} as Record<DialAxisId, DialSetting>;
  for (const axis of DIAL_AXES) {
    const center = base[axis.id] ?? 0;
    const half = rangeWidth(cradle, lineage, axis.id) / 2;
    const min = clampDial(center - half);
    const max = clampDial(center + half);
    sheet[axis.id] = { position: rng.range(min, max), min, max };
  }
  return sheet;
}

/**
 * Resolve the archetype: the species' primary, with a real chance that
 * this particular history took its documented drift — or, for the open
 * canvas (S6), whichever region the drawn sheet actually lands nearest.
 */
function resolveArchetype(rng: Rng, lineage: Lineage, sheet: DialSheet): ArchetypeId {
  const row = speciesMindFor(lineage.id);
  if (row.primary === null) {
    let best: ArchetypeId = "beacon";
    let bestDist = Infinity;
    for (const region of ARCHETYPES) {
      const d = dialDistance(sheet, region.dialSignature);
      if (d < bestDist) {
        bestDist = d;
        best = region.id;
      }
    }
    return best;
  }
  const drift = row.driftsTo.length > 0 && rng.chance(0.3);
  return drift ? rng.pick(row.driftsTo) : row.primary;
}

/** Nudge the drawn point toward the resolved region — inside its range. */
function settleDials(sheet: DialSheet, archetype: ArchetypeId): DialSheet {
  const signature = archetypeById(archetype).dialSignature;
  const settled = {} as Record<DialAxisId, DialSetting>;
  for (const axis of DIAL_AXES) {
    const dial = sheet[axis.id];
    const target = signature[axis.id];
    const nudged =
      target === undefined
        ? dial.position
        : dial.position + 0.25 * (target - dial.position);
    settled[axis.id] = {
      position: Math.min(dial.max, Math.max(dial.min, nudged)),
      min: dial.min,
      max: dial.max,
    };
  }
  return settled;
}

function drawAscensionYear(rng: Rng, params: GenerateCivParams): number {
  if (params.recentlyAscended === true) return params.nowYear - rng.int(1, 5);
  switch (params.ageBand) {
    case "young":
      return params.nowYear + rng.int(40, 400);
    case "peer":
      return params.nowYear - rng.int(30, 300);
    case "elder":
      return params.nowYear - rng.int(1500, 8000);
  }
}

function drawLadders(rng: Rng, params: GenerateCivParams, archetype: ArchetypeId): LadderStages {
  if (params.ageBand === "young") return { energy: 0, integration: 0 };
  const lean = archetypeById(archetype).ladderLean;
  if (params.recentlyAscended === true) {
    return lean === "energy"
      ? { energy: 1, integration: 0 }
      : lean === "integration"
        ? { energy: 0, integration: 1 }
        : { energy: 1, integration: 1 };
  }
  if (params.ageBand === "elder") {
    return lean === "energy"
      ? { energy: 4, integration: rng.int(1, 2) }
      : lean === "integration"
        ? { energy: rng.int(1, 2), integration: 4 }
        : { energy: 3, integration: 3 };
  }
  return lean === "energy"
    ? { energy: rng.int(2, 3), integration: rng.int(0, 1) }
    : lean === "integration"
      ? { energy: rng.int(0, 1), integration: rng.int(2, 3) }
      : { energy: rng.int(1, 2), integration: rng.int(1, 2) };
}

/** v1 placeholder units; only the relative shape matters yet. */
function drawStocks(ladders: LadderStages): ResourceStocks {
  return {
    energy: 100 * (1 + ladders.energy),
    matter: Math.max(50, 400 - 80 * ladders.energy),
    compute: 120 * (1 + ladders.energy + ladders.integration),
    coherence: 50 + 50 * ladders.integration,
  };
}

/**
 * The light-echo seed. Every civ has a biosphere era (a biosignature to
 * anyone watching), an industrial rise (leakage), and — once ascended —
 * a posture: bright civs keep shining; dark civs carry a bright-years
 * debt (the ascension flare) and then turn dark. Peers' dark turns
 * cluster near the present so their silence is still in flight across
 * the neighborhood — the whole point of the knowledge layer.
 */
function drawEmissionHistory(
  rng: Rng,
  params: GenerateCivParams,
  ascensionYear: number,
  posture: Posture,
  ladders: LadderStages,
): EmissionEpoch[] {
  const biosphere: EmissionEpoch = {
    fromYear: ascensionYear - rng.int(3000, 9000),
    level: rng.range(0.03, 0.06),
  };
  const industrial: EmissionEpoch = {
    fromYear: ascensionYear - rng.int(80, 400),
    level: rng.range(0.1, 0.18),
  };
  if (params.ageBand === "young") {
    // Still climbing: the industrial rise only exists once it has begun.
    return industrial.fromYear <= params.nowYear
      ? [biosphere, industrial]
      : [biosphere];
  }
  if (posture === "bright") {
    const shine: EmissionEpoch = {
      fromYear: ascensionYear,
      level: Math.min(0.95, 0.45 + 0.12 * ladders.energy + rng.range(-0.05, 0.15)),
    };
    return [biosphere, industrial, shine];
  }
  // Dark: an ascension flare (the bright-years debt), then the turn.
  const turn =
    params.ageBand === "elder"
      ? ascensionYear + rng.int(20, 150)
      : Math.max(ascensionYear + 5, params.nowYear - rng.int(-10, 45));
  const flare: EmissionEpoch = {
    fromYear: ascensionYear,
    level: rng.range(0.3, 0.65),
  };
  const dark: EmissionEpoch = { fromYear: turn, level: rng.range(0.02, 0.06) };
  return [biosphere, industrial, flare, dark];
}

function chronicleFor(
  cradle: Cradle,
  lineage: Lineage,
  params: GenerateCivParams,
  posture: Posture,
  ascensionYear: number,
): string[] {
  const row = speciesMindFor(lineage.id);
  const lines = [
    `Home was ${cradle.name} — ${cradle.fingerprint}`,
    `Its shape was ${lineage.name}: ${lineage.fingerprint}`,
  ];
  if (params.ageBand === "young") {
    lines.push(
      `Not yet ascended: a living world, pre-singularity, visible to anyone watching its light.`,
    );
    return lines;
  }
  lines.push(row.wake);
  // In-world phrasing only: "posture beat" is design vocabulary
  // (act2-design.md § Close) and never reaches the player.
  lines.push(
    posture === "bright"
      ? `When the choice came, it chose to be heard; it burned brighter every year since ${Math.round(ascensionYear)}.`
      : `When the choice came, it chose the dark; the light of its bright years had not yet arrived.`,
  );
  if (params.ageBand === "elder") {
    lines.push(`It had grown ancient — a past no younger mind would ever catch up to.`);
  }
  return lines;
}

export function generateCivSeed(rng: Rng, params: GenerateCivParams): CivSeed {
  const cradle = drawCradle(rng);
  const lineage = drawLineage(rng, cradle);
  const drawn = drawDialSheet(rng, cradle, lineage);
  const archetype = resolveArchetype(rng, lineage, drawn);
  const dials = settleDials(drawn, archetype);
  const row = speciesMindFor(lineage.id);
  const posture: Posture =
    row.posture === "either" ? archetypeById(archetype).defaultPosture : row.posture;
  const ascensionYear = drawAscensionYear(rng, params);
  const ladders = drawLadders(rng, params, archetype);
  return {
    id: params.id,
    name: generateCivName(rng),
    cradleId: cradle.id,
    lineageId: lineage.id,
    dials,
    archetype,
    posture,
    ageBand: params.ageBand,
    ascensionYear,
    ladders,
    stocks: drawStocks(ladders),
    emissionHistory: drawEmissionHistory(rng, params, ascensionYear, posture, ladders),
    charter: archetypeById(archetype).charter,
    chronicle: chronicleFor(cradle, lineage, params, posture, ascensionYear),
  };
}
