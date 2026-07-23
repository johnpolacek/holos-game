// Content-art resolver — maps a catalog id to its pregenerated plate URL.
//
// The library under client/public/art/ ships one plate per possibility on
// three axes, each in two crops (see docs/content-art-*.md and the manifest):
//   worlds/{sq,wide}/NN.webp   — cradle id, zero-padded 2 digits (01–40)
//   species/{sq,wide}/SN.webp  — lineage id verbatim (S1–S20)
//   tech/{sq,wide}/<id>.webp   — waking-mind archetype id (beacon … phoenix)
//
// Resolution is purely structural: id + ratio → path, no lookup table beyond
// the id (per the content-art docs). The caller picks the crop by layout.
//
// Invariant: every LineageId and every ArchetypeId has a plate, so those
// resolvers are total. Worlds are the exception — the cradle catalog carries
// 41 entries (server/src/cradles.ts) but only 01–40 were rendered; id 41
// ("The century orbit") has no plate, so worldArt returns null there and the
// caller falls back (e.g. the ceremony's cradle gradient). Bump WORLD_MAX when
// a plate for a higher id is added.

import type { ArchetypeId, LineageId } from "@holos/protocol";

/** Aspect crop: 1:1 square or 16:9 widescreen. Same subject, different void. */
export type ArtRatio = "sq" | "wide";

const BASE = "/art";
const WORLD_MIN = 1;
const WORLD_MAX = 40;

/**
 * World plate URL for a cradle id, or `null` when no plate exists for it
 * (id 41, or any id outside the rendered 1–40 range). Callers must handle
 * null — it is a real case in the shipped catalog, not just defensive.
 */
export function worldArt(cradleId: number, ratio: ArtRatio): string | null {
  if (!Number.isInteger(cradleId) || cradleId < WORLD_MIN || cradleId > WORLD_MAX) {
    return null;
  }
  const nn = String(cradleId).padStart(2, "0");
  return `${BASE}/worlds/${ratio}/${nn}.webp`;
}

/** Species plate URL for a lineage id (S1–S20). Total — every lineage has one. */
export function speciesArt(lineageId: LineageId, ratio: ArtRatio): string {
  return `${BASE}/species/${ratio}/${lineageId}.webp`;
}

/**
 * Technology plate URL for a waking-mind archetype id. Total — every archetype
 * has one. (No client consumer yet: the wire sends the resolved archetypeName,
 * not the id, to keep minds.ts off the client — a screen that gains the id can
 * call this without a name→id map.)
 */
export function technologyArt(archetypeId: ArchetypeId, ratio: ArtRatio): string {
  return `${BASE}/tech/${ratio}/${archetypeId}.webp`;
}
