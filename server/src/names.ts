// The civilization name lexicon — presentational vocabulary, like dials.ts.
//
// Lives in its own dependency-free module so the client may receive it as a
// value (re-exported through protocol.ts) without pulling any truth-side
// code into the bundle: the ceremony's name-suggestion chips compose from
// the same word lists the generator uses, so suggested names and generated
// names speak one language.

import type { Rng } from "./rng";

export const NAME_HEADS = [
  "Stone", "Seed", "Tide", "Deep", "Ember", "Salt", "Iron", "Frost",
  "Vault", "Song", "Root", "Glass", "Ash", "Hollow", "Dawn", "Rift",
] as const;

export const NAME_TAILS = [
  "binders", "weavers", "keepers", "wardens", "singers", "shapers",
  "tenders", "reckoners", "menders", "delvers", "callers", "sowers",
] as const;

export function generateCivName(rng: Rng): string {
  return `${rng.pick(NAME_HEADS)}${rng.pick(NAME_TAILS)}`;
}
