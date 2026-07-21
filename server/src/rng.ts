// Deterministic seeded PRNG for world generation.
//
// Generation must be reproducible from a seed key (same key -> same
// galaxy, same civs) so dev seeding, the proof script, and eventual
// cohort creation all agree. Never use Math.random() in generation code.
//
// xmur3 string hash feeding mulberry32 — small, fast, good enough for
// content generation (not cryptographic).

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Pick one element; throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Pick by relative weight; throws on empty or non-positive total. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T;
  /** True with probability p. */
  chance(p: number): boolean;
  /** A fresh independent stream derived from this one plus a label. */
  fork(label: string): Rng;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seedKey: string): Rng {
  const seed = xmur3(seedKey);
  const next = mulberry32(seed());

  const rng: Rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error("pick from empty array");
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error("pick out of bounds");
      return item;
    },
    weighted: (items, weightOf) => {
      const total = items.reduce((sum, item) => sum + weightOf(item), 0);
      if (items.length === 0 || total <= 0) {
        throw new Error("weighted pick needs positive total weight");
      }
      let roll = next() * total;
      for (const item of items) {
        roll -= weightOf(item);
        if (roll <= 0) return item;
      }
      const last = items[items.length - 1];
      if (last === undefined) throw new Error("unreachable");
      return last;
    },
    chance: (p) => next() < p,
    fork: (label) => createRng(`${seedKey}/${label}`),
  };
  return rng;
}
