// Content-art resolver — maps a catalog id to its pregenerated plate URL.
//
// The library under client/public/art/ ships one plate per possibility on
// four axes, each in two crops (see docs/content-art-*.md and the manifest):
//   worlds/{sq,wide}/NN.webp     — cradle id, zero-padded 2 digits (01–40)
//   species/{sq,wide}/SN.webp    — lineage id verbatim (S1–S20)
//   tech/{sq,wide}/<id>.webp     — waking-mind archetype id (beacon … phoenix)
//   projects/{sq,wide}/<slug>.webp — project id, or inherited-<axisId> for a
//                                    rung 0 (docs/content-art-projects.md)
//
// Resolution is purely structural: id + ratio → path, no lookup table beyond
// the id (per the content-art docs). The caller picks the crop by layout.
//
// Invariant: every LineageId and every ArchetypeId has a plate, so those
// resolvers are total. Worlds cover the full cradle catalog (ids 1–41,
// server/src/cradles.ts, plates 01–41). worldArt still returns null for any id
// outside that range — a future catalog entry rendered later — and the caller
// falls back (e.g. the ceremony's cradle gradient); bump WORLD_MAX when a plate
// for a higher id ships.

import type { ArchetypeId, LineageId } from "@holos/protocol";

/** Aspect crop: 1:1 square or 16:9 widescreen. Same subject, different void. */
export type ArtRatio = "sq" | "wide";

const BASE = "/art";
const WORLD_MIN = 1;
const WORLD_MAX = 41;

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

/**
 * Project plate URL for a project id, or for an axis's inherited rung 0 via
 * `inherited-<axisId>` (build-instruments.md Decision 8). Total by
 * construction, like {@link speciesArt} and {@link technologyArt} — the
 * catalog names 29 slugs and the string is built from the id alone, no
 * lookup table.
 *
 * Total is not the same as present: unlike the other three axes, this
 * library's 29 plates are rendered and land incrementally, one PR at a time
 * (Decision 8, "no art is generated in the repo"), so a URL this resolves
 * can 404 for a good while after it ships. The resolver stays honest about
 * that by returning a plain string rather than `string | null` — there is no
 * catalog-side "does it exist" check to run — which pushes the null-safety
 * onto the caller: every `<img>` built from this URL must carry an `onerror`
 * that removes the image (or its space-reserving wrapper) from the DOM. A
 * plate that has not landed yet must never leave a broken-image glyph or a
 * reserved empty box on screen; it must cost nothing, the same as if the
 * caller had never asked for it. See `buildPlate` in studyboard.ts.
 */
export function projectArt(slug: string, ratio: ArtRatio): string {
  return `${BASE}/projects/${ratio}/${slug}.webp`;
}
