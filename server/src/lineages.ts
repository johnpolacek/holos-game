// The lineage catalog — Act 1 intelligent species, as typed data.
//
// This is the `Lineage` record act1-lifeforms.md flags under "Data shape
// (for when this leaves Markdown)", realized in the cradles.ts pattern.
// act1-lifeforms.md remains the source of truth for the fiction; this file
// is the machine-readable projection of its master table plus the per-entry
// dial seeds. The cradle -> candidate-lineage mapping already lives on each
// `Cradle` in cradles.ts (`candidateLineages`) and is not duplicated here.
//
// Dial seed convention (see dials.ts): negative = left pole, positive =
// right pole; magnitudes follow LEAN (strong 0.6 / lean 0.35 / faint 0.15).

import type { LineageId } from "./cradles";
import { CRADLES, type Cradle } from "./cradles";
import type { DialLean } from "./dials";

/** Catalog group, following act1-lifeforms.md's sections A-G. */
export type LineageGroup =
  | "oceanic"
  | "terrestrial"
  | "aerial"
  | "colonial"
  | "subsurface"
  | "exotic"
  | "photo-motile";

/** Primary living medium (act1-lifeforms.md, "The axes of variation"). */
export type Medium =
  | "aquatic"
  | "terrestrial"
  | "aerial"
  | "subsurface"
  | "cryogenic"
  /** Two species, one mind (S14) — the union's medium is the pairing's. */
  | "paired";

/** Cognition model — the deepest fork; pre-writes One Mind <-> Chorus. */
export type CognitionModel =
  | "unitary"
  | "distributed"
  | "collective"
  | "networked"
  | "composite"
  /** The colony is the individual (S5). */
  | "colonial"
  /** Group minds that assemble on demand (S13). */
  | "aggregate";

/** How hard the road from clever animal to technological civilization is. */
export type Technogenesis =
  | "straightforward"
  | "hard"
  | "severe"
  | "near-impossible";

export interface Lineage {
  /** Stable id S1-S20, matching the act1-lifeforms.md master table row. */
  readonly id: LineageId;
  readonly name: string;
  readonly group: LineageGroup;
  readonly medium: Medium;
  readonly cognition: CognitionModel;
  /** First signal channel; shadows how it will one day want to be heard. */
  readonly signalChannel: string;
  readonly technogenesis: Technogenesis;
  /**
   * At the edge of plausibility (act1-lifeforms.md flags S17-S19); leaned
   * on lightly by generation, like disputed cradles.
   */
  readonly speculative: boolean;
  /** The body's dial pre-load, before Act 1 moves the point. */
  readonly dialSeed: DialLean;
  /** One line: the body, and the character it writes. */
  readonly fingerprint: string;
}

export const LINEAGES: readonly Lineage[] = [
  {
    id: "S1",
    name: "Tentacled cephalopodan",
    group: "oceanic",
    medium: "aquatic",
    cognition: "distributed",
    signalChannel: "chromatophore / visual",
    technogenesis: "severe",
    speculative: false,
    dialSeed: { "one-mind-chorus": 0.6, "reach-depth": 0.35 },
    fingerprint:
      "A federation of arms that talks in skin — the self is already plural, and its language is impossible to whisper.",
  },
  {
    id: "S2",
    name: "Song-culture pelagic",
    group: "oceanic",
    medium: "aquatic",
    cognition: "unitary",
    signalChannel: "acoustic / song",
    technogenesis: "near-impossible",
    speculative: false,
    dialSeed: {
      "voice-silence": -0.6,
      "custodian-instrumental": -0.5,
      "one-mind-chorus": 0.35,
    },
    fingerprint:
      "A magnificent mind with no hands: it is its songs, and it carries oral history across ocean basins.",
  },
  {
    id: "S3",
    name: "Clawed benthic exoskeletal",
    group: "oceanic",
    medium: "aquatic",
    cognition: "unitary",
    signalChannel: "gesture / sound-tap / chemical",
    technogenesis: "hard",
    speculative: false,
    dialSeed: { "custodian-instrumental": 0.35, "reach-depth": -0.15 },
    fingerprint:
      "The water's best builder — a claw-handed predator whose landfall cracks the energy door open.",
  },
  {
    id: "S4",
    name: "Electro-sensing abyssal",
    group: "oceanic",
    medium: "aquatic",
    cognition: "unitary",
    signalChannel: "bioelectric / chemical",
    technogenesis: "severe",
    speculative: false,
    dialSeed: {
      "voice-silence": 0.6,
      "reach-depth": 0.6,
      "custodian-instrumental": 0.35,
    },
    fingerprint:
      "Unseeing and unseen in the sealed dark: it must discover that an outside exists before it can want it.",
  },
  {
    id: "S5",
    name: "Colonial reef superorganism",
    group: "oceanic",
    medium: "aquatic",
    cognition: "colonial",
    signalChannel: "chemical / electrical",
    technogenesis: "near-impossible",
    speculative: false,
    dialSeed: {
      "one-mind-chorus": -0.6,
      "reach-depth": 0.5,
      "custodian-instrumental": -0.35,
    },
    fingerprint:
      "A reef that is one slow distributed self — it cannot reach for tools, so it grows its technology instead.",
  },
  {
    id: "S6",
    name: "Erect generalist",
    group: "terrestrial",
    medium: "terrestrial",
    cognition: "unitary",
    signalChannel: "acoustic / vocal",
    technogenesis: "straightforward",
    speculative: false,
    dialSeed: { "voice-silence": -0.15 },
    fingerprint:
      "The open canvas: all four doors to technology open at once, and almost nothing pre-decided.",
  },
  {
    id: "S7",
    name: "Heavy-world multiped",
    group: "terrestrial",
    medium: "terrestrial",
    cognition: "unitary",
    signalChannel: "seismic / vocal",
    technogenesis: "hard",
    speculative: false,
    dialSeed: {
      "reach-depth": 0.6,
      "one-mind-chorus": -0.35,
      "custodian-instrumental": -0.15,
    },
    fingerprint:
      "Built low and strong under crushing gravity — it masters its surface early and finds leaving the hardest thing it will ever do.",
  },
  {
    id: "S8",
    name: "Twilight-band migratory",
    group: "terrestrial",
    medium: "terrestrial",
    cognition: "unitary",
    signalChannel: "thermal / vocal / gestural",
    technogenesis: "hard",
    speculative: false,
    dialSeed: {
      "voice-silence": -0.5,
      "one-mind-chorus": -0.35,
      "custodian-instrumental": 0.15,
    },
    fingerprint:
      "One connected ring of habitability under a fixed, unmissable sun — a culture that always knew where the sky was.",
  },
  {
    id: "S9",
    name: "Winged grasping flyer",
    group: "aerial",
    medium: "aerial",
    cognition: "unitary",
    signalChannel: "acoustic / song",
    technogenesis: "hard",
    speculative: false,
    dialSeed: { "reach-depth": -0.45, "voice-silence": -0.45 },
    fingerprint:
      "Mastery of the open air and a far-seeing life — an astronomer by instinct, outward by temperament.",
  },
  {
    id: "S10",
    name: "Buoyant aerial drifter",
    group: "aerial",
    medium: "aerial",
    cognition: "distributed",
    signalChannel: "chemical / acoustic",
    technogenesis: "near-impossible",
    speculative: false,
    dialSeed: {
      "reach-depth": 0.6,
      "voice-silence": 0.6,
      "one-mind-chorus": 0.35,
    },
    fingerprint:
      "Permanently airborne with no ground and no clear sky — its technology, if it comes, is grown in the air.",
  },
  {
    id: "S11",
    name: "Eusocial hive superorganism",
    group: "colonial",
    medium: "terrestrial",
    cognition: "collective",
    signalChannel: "chemical (pheromone)",
    technogenesis: "hard",
    speculative: false,
    dialSeed: { "one-mind-chorus": -0.6, "custodian-instrumental": 0.6 },
    fingerprint:
      "Many bodies, one purpose: the individual is a cell, and collective construction is its native genius.",
  },
  {
    id: "S12",
    name: "Networked substrate mind",
    group: "colonial",
    medium: "terrestrial",
    cognition: "networked",
    signalChannel: "chemical / electrical",
    technogenesis: "near-impossible",
    speculative: false,
    dialSeed: {
      "one-mind-chorus": -0.6,
      "curator-shedder": -0.6,
      "reach-depth": 0.5,
    },
    fingerprint:
      "A landscape that thinks slowly and everywhere: its memory is structural, which is to say it does not forget.",
  },
  {
    id: "S13",
    name: "Aggregative modular organism",
    group: "colonial",
    medium: "terrestrial",
    cognition: "aggregate",
    signalChannel: "chemical / tactile",
    technogenesis: "severe",
    speculative: false,
    dialSeed: { "one-mind-chorus": 0.6, "curator-shedder": 0.6 },
    fingerprint:
      "A self that assembles on demand and disperses again — shedding units and starting over is its way of life.",
  },
  {
    id: "S14",
    name: "Obligate symbiotic composite",
    group: "colonial",
    medium: "paired",
    cognition: "composite",
    signalChannel: "dual-channel (song + gesture)",
    technogenesis: "hard",
    speculative: false,
    dialSeed: { "one-mind-chorus": 0.6, "custodian-instrumental": -0.6 },
    fingerprint:
      "Two species, one mind — its founding lesson is that another mind is indispensable.",
  },
  {
    id: "S15",
    name: "Blind seismic-thermal burrower",
    group: "subsurface",
    medium: "subsurface",
    cognition: "unitary",
    signalChannel: "seismic (drum) / chemical",
    technogenesis: "hard",
    speculative: false,
    dialSeed: { "voice-silence": 0.6, "reach-depth": 0.6 },
    fingerprint:
      "A life spent hidden and below — it must dig up into the sky before it can imagine leaving.",
  },
  {
    id: "S16",
    name: "Chemo-lithic vent grazer",
    group: "subsurface",
    medium: "subsurface",
    cognition: "unitary",
    signalChannel: "chemical / thermal",
    technogenesis: "severe",
    speculative: false,
    dialSeed: {
      "reach-depth": 0.5,
      "voice-silence": 0.5,
      "custodian-instrumental": 0.35,
    },
    fingerprint:
      "Clustered at the vents, indifferent to sunlight — energy is right there, and the universe is a rumor.",
  },
  {
    id: "S17",
    name: "Cryogenic slow-mind",
    group: "exotic",
    medium: "cryogenic",
    cognition: "unitary",
    signalChannel: "chemical / acoustic (slow)",
    technogenesis: "severe",
    speculative: true,
    dialSeed: {
      "reach-depth": 0.6,
      "curator-shedder": -0.6,
      "voice-silence": 0.35,
    },
    fingerprint:
      "A thought can take a season: patience not as virtue but as condition, in methane cold.",
  },
  {
    id: "S18",
    name: "Radiation-hardened extremophile",
    group: "exotic",
    medium: "terrestrial",
    cognition: "unitary",
    signalChannel: "chemical / UV-shifted visual",
    technogenesis: "hard",
    speculative: false,
    dialSeed: {
      "voice-silence": 0.6,
      "curator-shedder": 0.6,
      "reach-depth": -0.35,
    },
    fingerprint:
      "Shielded against a sky that hurts: built on constant damage-and-repair, racing a star that will die young.",
  },
  {
    id: "S19",
    name: "High-temperature mineral life",
    group: "exotic",
    medium: "subsurface",
    cognition: "unitary",
    signalChannel: "thermal / seismic",
    technogenesis: "near-impossible",
    speculative: true,
    dialSeed: { "reach-depth": 0.6, "voice-silence": 0.6 },
    fingerprint:
      "Cognition in rock and melt, alien in tempo and chemistry — the outer bound of the plausible.",
  },
  {
    id: "S20",
    name: "Photovore",
    group: "photo-motile",
    medium: "terrestrial",
    cognition: "collective",
    signalChannel: "visual / chemical (slow)",
    technogenesis: "severe",
    speculative: false,
    dialSeed: {
      "reach-depth": 0.6,
      "one-mind-chorus": -0.6,
      "custodian-instrumental": -0.35,
    },
    fingerprint:
      "Half-forest, half-society: it grazes light under a dim sun, and life quite literally is light to it.",
  },
];

export function lineageById(id: LineageId): Lineage {
  const lineage = LINEAGES.find((l) => l.id === id);
  if (lineage === undefined) throw new Error(`unknown lineage: ${id}`);
  return lineage;
}

/** The cradles that can raise this lineage (derived from cradles.ts). */
export function cradlesForLineage(id: LineageId): readonly Cradle[] {
  return CRADLES.filter((c) => c.candidateLineages.includes(id));
}
