# HOLOS — Build brief: A0 (Act 3 foundations)

*The launch brief for a fresh thread building slice **A0**. One brief per
build slice — this is the `build-a*.md` series, written **just-in-time**:
the next brief (`build-a1.md`, …) is written when its slice starts, shaped
by what the previous slice actually taught. Source of sequence and scope:
[roadmap.md](./roadmap.md) — this file does **not** re-spec the slice, it
launches it (read-list, task, done-when, guardrails). If this and the
roadmap disagree, the roadmap wins.*

---

## Orientation

Holos is a hard-SF civilization game. The strategy is **Act 3 first**: build
the interstellar multiplayer act before the solo acts (decided and explained
in [roadmap.md](./roadmap.md), § "The decision"). The repo is
design-doc-driven and already has a multiplayer scaffold plus the first typed
data catalog. **A0 is invisible plumbing** — backend/state only, no
player-facing UI.

## Read first (source of truth, in order)

- [CLAUDE.md](../CLAUDE.md) — stack, conventions, how to run/typecheck/build.
  Non-negotiable: strict TS (no `any`), `noUncheckedIndexedAccess`, the
  **server is authoritative** (clients send intents, never state), wire types
  live **only** in `server/src/protocol.ts`, keep dependencies minimal.
- [roadmap.md](./roadmap.md) — the plan. You build **Phase A → A0**. Read all
  of "Phase A", plus "The handoff seam: CivSeed", "Open build decisions", and
  "How to read this".
- [vision.md](./vision.md) — why the game is what it is; light-lag is the
  whole point (§ Act 3, § Multiplayer model).
- [act3-design.md](./act3-design.md) — Act 3 mechanics: the Sky, the clocks
  (target **5 real minutes ≈ 1 game year**), contact, charters.
- [act3-map.md](./act3-map.md) — the Model, and critically **"the Model
  renders belief, never truth"** — you are building the backend for that
  light-delay layer.
- [act3-civilizations.md](./act3-civilizations.md) — what fills the galaxy
  (the AI civ spectrum) and the conceptual fields behind `CivSeed`.
- `server/src/cradles.ts` — the pattern for a typed catalog (you'll write
  `lineages.ts` and `minds.ts` the same way).
- `server/src/protocol.ts` and `server/src/index.ts` — the current spine
  (authoritative `Room` Durable Object, guarded wire parsing, real-time
  sync). This is what you extend.

## The task — A0

Roadmap § A0 is authoritative; in short:

1. **The shared clock** — server-authoritative game time (5 real min ≈ 1 game
   year, a tunable constant); Durable Object alarms for scheduled events.
2. **The galaxy (thin)** — a generated star field for one cohort neighborhood
   (real-statistics positions, tens of light-years across) with civilizations
   placed in it. Distance in light-years is *the* gameplay quantity.
3. **The knowledge layer** — the architectural heart; build it right first.
   The server holds truth; every observer is served only **light-delayed
   views** (another civ's state as of `now − distance/c`). The client must
   never be able to receive another civilization's present. Every Act 3
   feature reads through this layer; it is both the anti-cheat and the core of
   "the map is the past."
4. **Catalogs** — `lineages.ts` (act1-lifeforms.md, S1–S20 with dial seeds)
   and `minds.ts` (act2-minds.md: base-lean rules, archetype regions,
   species→mind table) as typed data, following the `cradles.ts` pattern.
5. **`CivSeed` + the seed generator** — the handoff seam (roadmap). `CivSeed`
   = origin cradle id + lineage id, the five-dial sheet (position + range per
   dial), archetype region, posture (bright/dark), starting ladder stages +
   resource stocks, and an emission-history summary (the light-echo seed).
   The generator walks the catalog chain (cradle → candidate lineages →
   lineage dial seeds → waking-mind vectors) plus authored variation, so every
   generated civ has a legible history. Thin per-run persistence stores the
   player's civ. **`CivSeed` data and catalogs live in server content modules;
   only new *wire messages* go in `protocol.ts`.**

## Done when

A dev command/endpoint creates a galaxy with N seeded AI civs + one player
civ, and the server can answer **"what does observer X see of civ Y, as of
its light?"** for any pair — proven by a script/log showing two observers
legitimately **disagree** about a third civ's present because their
light-distances differ. Prove it by running it, not just by types compiling.

## The eventual UI (do NOT build any of it in A0)

Two adopted concept screens show what A0's data must eventually feed, so
design the records to match and avoid a reshape in A1:

- [`concepts/03-00-inheritance.png`](./concepts/03-00-inheritance.png) — what
  a `CivSeed` becomes on screen: world fingerprint, lineage, the five-dial
  sheet, archetype, charter. Make `CivSeed` able to feed this. (Dial labels
  render as the pinned **in-world** set — Reach·Depth, Voice·Silence,
  Garden·Forge, Monolith·Chorus, Memory·Renewal; act2-design.md § In-world
  labels — but the *internal* names stay the design vocabulary.)
- [`concepts/03-01-the-sky.png`](./concepts/03-01-the-sky.png) — what the
  knowledge layer feeds a source card: designation, local name, light-age
  chip, belief + confidence, light-history. Make the observation-view output
  able to feed this.

([`concepts/03-07-the-model.png`](./concepts/03-07-the-model.png) is the
eventual galaxy *renderer* — A1, not A0.) These constrain the **shape** of the
records you design; build none of the UI now.

## Guardrails

- **No UI.** A0 is backend/state only. The 3D Model, inheritance screen, etc.
  are A1.
- Touch `protocol.ts` only to add new **guarded** wire messages (copy the
  existing parse pattern).
- Suggested order: catalogs → galaxy + civ placement → shared clock →
  knowledge layer (the light-delay query) → `CivSeed` + generator → thin
  persistence.
- Keep `npm run typecheck` and `npm run build` green at **every** commit;
  small, single-purpose commits. Work on a feature branch and open a PR — main
  auto-deploys, so every commit must be shippable.
- Open decision to make early (roadmap § "Open build decisions"): **shard
  topology**. Start with one Durable Object per cohort holding truth + clock +
  light-delay computation; revisit at scale.

## First move

Read the docs above, then **propose your A0 slice order and the `CivSeed` +
galaxy type definitions before writing much code.**
