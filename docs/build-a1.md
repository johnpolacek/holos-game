# HOLOS — Build brief: A1 (the Sky)

*The launch brief for a fresh thread building slice **A1** — the first
player-facing Act 3 build: open the URL, inherit a civilization, see the
past. Part of the just-in-time `build-*.md` series; source of sequence and
scope is [roadmap.md](./roadmap.md) (§ Phase A → A1), which wins on any
disagreement. [build-a0.md](./build-a0.md) is the previous slice's brief,
kept as record — A0 is merged and deployed.*

> **Status: A1 shipped, merged to main.** Kept below as a record of the
> launch brief, not rewritten. Two as-built deviations from the text as
> originally written:
>
> - The wire type is `DetectedSource` (`server/src/protocol.ts`), a strict
>   narrowing of `ObservedCiv` (`Omit<ObservedCiv, …>` plus a
>   `DetectedSource`-only field) — tighter than this brief's literal
>   "`ObservedCiv` crosses the wire" language below; the no-leak discipline
>   is unchanged, just enforced through a narrower wire shape.
> - `galaxy.ts` no longer pre-places a player civ at seed time; placement
>   now happens at inheritance (`server/src/cohort.ts`'s
>   `pickPlayerHome`), as this brief intended.

---

## Orchestration

Per [CLAUDE.md § Build orchestration](../CLAUDE.md): run this slice with
**Fable as orchestrator** — plan, decompose, synthesize, keep context lean.
Send **reasoning-heavy work to Opus** (deep-reasoner: the wire-protocol
design, the Model renderer choice, the join/placement flow) and **mechanical
work to Sonnet** (fast-worker: boilerplate modules, wiring, scaffolding a
screen from a settled spec). For the **high-stakes calls** — the
`ObservedCiv` wire boundary, the renderer, player placement — run Opus twice
with slightly different framings and synthesize. Fable — not the subagents —
holds the invariants below (the `ObservedCiv` no-leak rule, the cyan/amber
color rule, the A2/A3 scope line), verifies them in every subagent's output,
keeps `typecheck`/`build` green, and commits.

## Orientation

Holos is a hard-SF civilization game, building **Act 3 first**
(roadmap.md, § The decision). A0 shipped the entire invisible truth
engine; **nothing about it is visible yet**. A1 makes it visible: a new
player inherits a generated civilization, names it, pulls back from their
home system into a 3D sky, and reads a warm mass as a belief — with every
remote fact aged and nothing certain. No contact yet (that's A2); A1 ends
where the vigil would begin.

## What A0 already gives you (read the code, it is the real spec)

- `server/src/civseed.ts` — **`CivSeed`** (the civilization record:
  cradle + lineage backstory, five-dial sheet with position+range,
  archetype, posture, `ageBand`, `ascensionYear`, ladders, stocks,
  `emissionHistory` epochs, `charter` epigraph, `chronicle` lines) and
  `generateCivSeed(rng, {id, ageBand, nowYear, recentlyAscended})`. The
  record was shaped to feed the inheritance card — use it directly.
- `server/src/knowledge.ts` — the light-delay layer. **`ObservedCiv`
  (with `ObservedSignal`) is the ONLY shape about another civilization
  that may ever cross the wire** — read the module's discipline comment
  first. `observeCiv` / `observeSky` answer "what does X see of Y, as of
  its light?"; `lightHistory` is already clipped to departed light.
- `server/src/cohort.ts` — the `Cohort` Durable Object: owns the galaxy
  truth, `ClockState`, and an alarm-driven event queue; currently exposes
  **local-dev-only** endpoints (`/dev/seed`, `/dev/observe`, `/dev/sky`).
  A1 adds the real wire surface alongside these.
- `server/src/galaxy.ts` — `Star` (position in ly, spectral class,
  designation), `PlacedCiv`, `Galaxy`, `generateGalaxy`, `civDistanceLy`.
  **Note:** it currently pre-places one player civ at seed time; A1's
  inheritance flow replaces that (see roadmap § Open build decisions,
  "Player placement").
- `server/src/clock.ts` — 5 real min ≈ 1 game year; `lightDelayYears`
  (1 ly = 1 year).
- `server/src/dials.ts` — the five axes with **pinned in-world pole
  labels** (Reach·Depth, Voice·Silence, Garden·Forge, Monolith·Chorus,
  Memory·Renewal) carried in `DIAL_AXES`. The UI renders these, never the
  design names.
- `server/src/rng.ts` — deterministic seeded RNG; no `Math.random` in
  generation.
- `server/src/protocol.ts` — untouched by A0 **on purpose**; A1 adds the
  first real Act 3 wire messages here, with guarded parsing (copy the
  existing pattern). `server/src/index.ts` + `client/src/main.ts` are the
  current thin spine you extend.

## Read first (docs)

- [CLAUDE.md](../CLAUDE.md) — conventions; server authoritative; strict TS.
- [roadmap.md](./roadmap.md) — § A1, § Open build decisions (four are
  yours to make: Model renderer, player identity, player placement, sky
  data budget / inheritance count).
- [ui-design.md](./ui-design.md) — the seven principles (esp. **every
  fact wears its age**, **beliefs not facts**, mobile-first, canvas for
  places / DOM for prose), the Stage/Voice/Desk shell, § Act 3, and the
  component library (light-age chip, confidence render, dial band,
  source card).
- [act3-map.md](./act3-map.md) — the Model: one continuous camera, "the
  sky is the map seen from home," renders belief never truth, § Scope
  (v1 core only — **no echo shell, no time scrub**; those are A3).
- [act3-design.md](./act3-design.md) — § The Sky and the Observatory
  (the five signal classes — already typed in `knowledge.ts`).
- [act2-design.md](./act2-design.md) § In-world labels — the dial
  presentation rule (already encoded in `dials.ts`).

## The adopted visual targets (match these)

- [`concepts/03-00-inheritance.png`](./concepts/03-00-inheritance.png) —
  the inheritance ceremony: card carousel, world + species line, dial
  sheet, archetype, charter fragment, name field, BECOME. (Its rendered
  dial labels are placeholder; use `DIAL_AXES`'s in-world labels.)
- [`concepts/03-01-the-sky.png`](./concepts/03-01-the-sky.png) — the Sky
  + source card: near-empty field, one warm smudge, designation + local
  name + age chip + belief·confidence, **past-only** light-history
  scrubber (right edge = now; you only hold departed light).
- [`concepts/03-07-the-model.png`](./concepts/03-07-the-model.png) — the
  pull-back: parallax depth, true star colors, HOME as a cyan mote.
  Build note: background catalog stars (crisp points) must read
  differently from detected sources (soft amber fuzz sized by
  uncertainty) — certainty vs belief is the whole game.

## The task — A1 (roadmap § A1 is authoritative)

1. **Wire protocol + join flow.** First real Act 3 messages in
   `protocol.ts`, guarded like the existing ones: offer inheritance
   candidates → choose + name → sky snapshot → source detail. Rules:
   about *other* civs, only `ObservedCiv`-shaped data ever crosses; the
   star catalog (positions/classes/designations) is public data and may
   be sent whole; the player's own `CivSeed` is theirs to see. Thin
   player identity: a per-run token stored on the `Cohort` DO.
2. **Inheritance session zero.** On join, offer 2–3 candidates from
   `generateCivSeed` (`recentlyAscended: true`, distinct archetypes make
   the choice legible); render each card from the record (`chronicle`,
   dial sheet with in-world labels, archetype name, `charter`); choose →
   the civ is **placed in the galaxy then** (replacing A0's pre-placed
   player), named by the player (hold-to-commit BECOME per ui-design's
   ceremony rule). This screen must earn ownership — it carries the
   plan's "inherited must feel owned" risk.
3. **The Model, v1 core.** One continuous camera: home system → sky →
   volume (the pull-back staged as the act-opening beat). Render the
   cohort's real star field from the wire catalog; detected sources
   (from `observeSky`) as warm fuzz distinct from catalog stars, fuzz
   sized by `confidence`; light-age everywhere (the age chip; past tense
   for everything not home). Decide the renderer first (three.js vs
   point-sprite pass — roadmap open decision) and keep text in DOM.
4. **The observatory (thin) + source card.** Tap a source → the card:
   designation, player-assigned **local name** (local knowledge — never
   transmitted, stored with the player's run), age chip, classification
   + confidence from `ObservedSignal`, and the past-only light-history
   view from `lightHistory`. No vigil mechanics yet — A1's observatory
   is read-and-name only.

## Done when (prove it by running it, on a phone-sized viewport)

A fresh browser on the deployed URL: inherits and names a civilization →
pulls back from its system into the 3D sky → taps a warm source → reads
designation, its own local name, "as of N y ago," a belief with a
confidence, and a past-only light history. **And the no-leak check:**
wire traffic contains nothing about another civilization beyond
`ObservedCiv` fields; two browsers joined to one cohort see *each other*
only as light-delayed sources. A0's `/dev/observe` output and the client
view for the same observer/target pair must agree.

## Guardrails

- **No contact verbs.** No hail, broadcast, signals, or vigil mechanics —
  A2. No echo shell, no time scrubbing — A3. Ship the smallest true Sky.
- `ObservedCiv` discipline is absolute: if a field about another civ
  isn't in it, it doesn't cross the wire. Extend the type only by
  extending `knowledge.ts`, never by reaching into truth from a handler.
- Dev endpoints stay local-only; the real wire surface is separate.
- Mobile-first (portrait, one thumb); canvas for places, DOM for prose;
  in-world dial labels only.
- Small single-purpose commits on a feature branch + PR; `npm run
  typecheck` and `npm run build` green at every commit — main
  auto-deploys.

## First move

Read the code and docs above, then **propose before building: the wire
message set, the Model renderer choice, and the join/inheritance flow**
(including how player placement replaces A0's pre-placed civ). After the go,
decompose into Opus-subagent tasks (see *Orchestration*), and integrate +
verify the invariants yourself before each commit.
