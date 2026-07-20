# HOLOS
### Build roadmap — from design docs to the v1 slice

*The design docs say **what** the systems are; this says **what order to
build them in**. It sequences the v1 slice (vision.md, § Scope and roadmap,
and the per-act v1 sections) into engineering milestones, each shippable
and each proving something. Where this disagrees with the vision, the
vision wins.*

> Related: [vision.md](./vision.md) (§ Scope and roadmap — the product-level
> plan this refines), the per-act designs ([act2-design.md](./act2-design.md)
> § v1 scope, [act3-design.md](./act3-design.md) § v1 scope), and
> [ui-design.md](./ui-design.md) (§ v1 slice — the screens each milestone
> needs).

---

## The north star

v1 exists to prove the two things the game lives or dies on: **the pivot**
(a played history becoming a superintelligent character) and **the contact
loop** (first contact across light-lag). Everything below is ordered to
reach those two proofs as directly as the dependencies allow. Anything not
on the path to them is a later layer, by definition.

## Where the build is today

An early multiplayer foundation: a single `Room` Durable Object holding
authoritative state, clients rendering each connected player as a colored
dot over WebSocket (server/src/index.ts, client/src/main.ts). The
networking spine — authoritative server, wire protocol, real-time sync — is
the thing the rest grows on. The game proper does not exist yet; these
milestones build it on top.

## Two tracks

- **Content leaves Markdown.** The catalogs become typed data the code
  consumes. Started: `server/src/cradles.ts` (the 40 cradles as typed
  `Cradle` records). Next: `Lineage` (act1-lifeforms.md, S1–S20) and the
  waking-mind vectors (act2-minds.md). Low-risk, pure data + types, and it
  unblocks generation everywhere. This track runs *ahead of* the milestone
  that needs each catalog.
- **Systems get built**, milestone by milestone, below.

---

## Milestones

### M0 — Foundations *(in progress)*

The spine plus the data bridge.

- [x] Authoritative Room, wire protocol, real-time client (the current
      build).
- [x] Cradle catalog as typed data (`server/src/cradles.ts`).
- [ ] `Lineage` and waking-mind catalogs as typed data.
- [ ] Session/persistence model for a single player's run (the solo acts
      are per-player; the shared clock is Act 3 only).
- [ ] The **beat frame** as a reusable component (ui-design.md) — the
      scene → decision → (roll) unit every act reuses. Build it once here.

**Proves:** the catalogs can drive code; the beat unit renders.

### M1 — Act 1: the played history

Session zero and the branching-history engine.

- Cradle assignment at session zero (weighted draw over `CRADLES`;
  guaranteed Tier I–II for a first run), and the **world-reveal screen**
  rendered *from the cradle record* — fingerprint facts first, not
  placeholder orbital data (ui-design.md § Session zero; the concept note
  in docs/concepts/README.md).
- The authored branching history: beats, the two choice kinds (garden /
  intervene), the dice roll, the **History spine** that records every
  branch and roll (gameplay-walkthrough.md § Act 1).
- Enough authored beat content to carry one cradle from first life to the
  threshold.

**Proves:** the incubation act — an authored, replayable history that
leaves a legible causal chain.

### M2 — The pivot + thin Act 2

The first of the two north-star proofs.

- The **reveal**: derive the five-dial character sheet (position + range)
  from cradle + branches + rolls, and play the reveal sequence
  (act2-design.md § The character sheet; act2-minds.md for the derivation
  tables).
- The strategy loop: **report → strategy turn → beats → release**. Two
  ladders (~4 stages each), four resources (Energy/Matter/Compute/
  Coherence), ~8 projects (3 bright, 3 dark, 2 instruments), the
  state-fired beat engine, dial resistance + drift, and Signature
  accumulating quietly (act2-design.md § v1 scope).
- Deep-time projects on **real async clocks** — the Act 3 rhythm, trained
  solo.

**Proves the pivot:** a played history becomes a superintelligence with an
inherited, mechanically-live character.

### M3 — Act 3: the contact loop

The second north-star proof, and the reason for multiplayer.

- **The Sky / the Model** in its v1 form: the continuous camera (system →
  sky → volume), the pull-back beat, the point-cloud backdrop, detected
  sources with confidence + fuzz, light-age everywhere, and the player's
  own **light echo** shell (act3-map.md § Scope).
- The observatory and the **five signal classes**; classification as
  inference (act3-design.md § The Sky and the Observatory).
- **Light echo** tracking (emission history, per-observer views).
- One expansion method — **seedships** — with **charters**, the **Ledger**,
  and basic drift (act3-design.md § Travel, § Charters).
- **Light-lag messaging**: directed hail, broadcast, correspondence, on
  real clocks (the contact protocol: detect → vigil → choice →
  correspondence).
- **Sleep**, tripwires, wake report, push notifications.

**Proves the contact loop:** detection, the irreversible choice, and
stale-light correspondence — the soul of the game.

### M4 — The galaxy

Make the sky a populated, persistent, growing place.

- **Cohorts + AI fill**: a seeded rule-based AI spectrum across age
  (young worlds → peers → elders) and character (the archetype span),
  indistinguishable from humans at range (act3-civilizations.md;
  act3-design.md § Topology).
- **Persistence** and **frontier seeding**: newcomers seed outward where
  light-lag insulates them; protected incubation for solo players
  (act3-design.md § Topology and onboarding).

**Proves:** the galaxy feels alive and deep in time, and grows at its edge
without disrupting anyone in it.

---

## Explicitly out of v1

Designed, deferred (per the vision's roadmap and the per-act v1 scopes):
the full travel menu and self-transmission + the seat's full form; the
divergence-and-handoff onboarding of humans into diverged colonies; the
conflict and deterrence layer (strikes) with its griefing-resistance
tuning; megascale engineering and the entropy tech tree; the cosmic-
expansion endgame clock as a *system* (narrative in v1); and the richer
per-archetype content (act2-minds.md's neighbors, the mesostructure
toolkit art). None of these block the two proofs.

## How to read this

- Milestones are **ordered by dependency**, not calendar. Each should reach
  a playable, shippable state before the next opens.
- The **content track runs ahead**: type up each catalog before the
  milestone that consumes it, so systems are never blocked on data entry.
- Every milestone names the docs it builds against; those remain the source
  of truth for behavior. This file only fixes *sequence*.
