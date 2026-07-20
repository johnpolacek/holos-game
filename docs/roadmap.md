# HOLOS
### Build roadmap — from design docs to the v1 slice

*The design docs say **what** the systems are; this says **what order to
build them in**. It sequences the v1 slice (vision.md, § Scope and roadmap,
and the per-act v1 sections) into engineering milestones, each shippable
and each proving something. Where this disagrees with the vision, the
vision wins.*

> Related: [vision.md](./vision.md) (§ Scope and roadmap — the product-level
> plan this refines), the per-act designs ([act2-design.md](./act2-design.md)
> § v1 scope, [act3-design.md](./act3-design.md) § v1 scope),
> [ui-design.md](./ui-design.md) (§ v1 slice — the screens each milestone
> needs), and [ui-image-brief.md](./ui-image-brief.md) (the concept shot
> list, tagged by milestone).

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
dot over WebSocket (`server/src/index.ts`, `client/src/main.ts`). The
networking spine — authoritative server, wire protocol, real-time sync — is
the thing the rest grows on, plus the first catalog as typed data
(`server/src/cradles.ts`). The game proper does not exist yet.

**→ The next thing to build is the [session-zero slice](#m11--session-zero-the-next-slice) — the smallest cut
that turns the cradle data into the first real screen.**

## Two tracks

- **Content leaves Markdown.** The catalogs become typed data the code
  consumes. Done: `server/src/cradles.ts` (the 40 cradles as typed `Cradle`
  records, with `TIER_NAMES`, `SPAWN_RELATIVE_WEIGHT`, `cradleById`). Next:
  `Lineage` (act1-lifeforms.md, S1–S20) and the waking-mind vectors
  (act2-minds.md). Low-risk, pure data + types, and it unblocks generation
  everywhere. **This track runs *ahead of* the milestone that consumes each
  catalog** — so it never blocks a system build, and a catalog can be typed
  up whenever, out of band.
- **Systems get built**, milestone by milestone, below.

## How to read this

- Milestones are **ordered by dependency, not calendar.** Each should reach
  a playable, shippable state before the next opens. Within a milestone,
  numbered sub-slices (M1.1, M1.2 …) are also dependency-ordered.
- **Detail decays with distance.** M0/M1 are specified to the task; M2–M4
  are kept coarse on purpose — the near work teaches things that would
  rewrite the far plan, so planning it now is waste.
- **Build thin, then grow.** A milestone often needs only a *slice* of an
  earlier item (e.g. session-zero needs the cradle stored, not the full
  persistence model). Build the slice, check the box partially, grow it when
  a later slice demands more. Partial boxes below say `(thin)`.
- Every milestone names the docs it builds against; those remain the source
  of truth for behavior. This file only fixes *sequence*.

---

## Milestones

### M0 — Foundations *(in progress)*

The spine plus the data bridge. Pure plumbing; no gameplay yet.

- [x] Authoritative `Room`, wire protocol, real-time client (the current
      build).
- [x] Cradle catalog as typed data (`server/src/cradles.ts`).
- [ ] **Per-run session state (thin):** a player has a *run* with an
      assigned cradle and a place to accrue Act 1 history. The solo acts are
      per-player; the shared clock is Act 3 only. Built thin for
      session-zero (store the cradle + a run id in Durable Object storage),
      grown as Act 1 needs more.
- [ ] `Lineage` and waking-mind catalogs as typed data *(content track —
      runs ahead; not a blocker for M1's start, needed by M2's derivation)*.

**Proves:** the catalogs can drive code; a run persists.

### M1 — Act 1: the played history

Session zero and the branching-history engine. Broken into three ordered
sub-slices; the first is the immediate next work.

#### M1.1 — Session zero *(the next slice)*

The smallest cut that is *the game* rather than the scaffold: open the URL,
get a world, name it. Dependency-light — needs only the cradle data and the
thin per-run state, **not** the beat frame or the later catalogs, which is
why it leads.

Three pieces:

1. **Protocol** — add a `CradleView` wire type and a `cradle` `ServerMessage`
   to `protocol.ts` (the subset the reveal needs: name, host, `hostClass`,
   archetype, tier + tier name, fingerprint, and the handful of display
   facts). The full catalog stays server-side in `cradles.ts`; the server
   maps `Cradle → CradleView`. This is the moment a cradle first crosses the
   wire (kept out of `cradles.ts`, per CLAUDE.md's protocol-is-wire rule).
2. **Server** — on a new run, draw a **weighted cradle** from `CRADLES`
   using `SPAWN_RELATIVE_WEIGHT`, with a **guaranteed Tier I–II** first-run
   draw; store it on the run; send the `cradle` message.
3. **Client** — render the **world-reveal screen** *from the record*
   (ui-design.md § Session zero): the planet on the Stage, and a card with
   the name slot, **fingerprint facts first** (the fixed sun, gravity,
   tier name) rather than raw orbital numbers — the exact fix the
   world-reveal mock surfaced (docs/concepts/README.md, screen 01). The
   single `an easier world` link (guarantees a gentler draw), and a name
   input that advances the run.

- **Done when:** opening the URL draws a weighted cradle (Tier I–II on a
  first run), the reveal renders *that cradle's* real fields, and naming it
  advances into an (empty, for now) Act 1.
- **Art it needs:** the M1 renders are in —
  `docs/concepts/01-01-world-reveal.png` (and `01-02-decision-moment`,
  `01-03-the-roll` for M1.2). Still wanted: **2–3 world-reveal variants
  across contrasting cradle types** (a drowned ocean world, a crushing
  super-Earth, a starless rogue) to prove one card template holds across the
  catalog — see ui-image-brief.md § *Session zero & Act 1*.
- **Open decision — how the planet is drawn** (see *Open build decisions*).

#### M1.2 — The beat frame + first beats

- The **beat frame**: the reusable `scene → decision → (roll) → consequence`
  unit every act reuses (ui-design.md § Act 1). Build it once here; Act 2/3
  reuse its presentation, replacing the roll with a cost line at the pivot.
- The two choice kinds (**garden** / **intervene**), the **dice roll** as
  the signature interaction, and the **History spine** that records every
  branch and roll (gameplay-walkthrough.md § Act 1) — treated as sacred from
  beat one, since the pivot reads it back.
- The async check-in: resume at the next beat after stepping away.

#### M1.3 — Act 1 content to the threshold

- Enough authored beats to carry **one cradle** from first life to the
  threshold of superintelligence — the vertical proof of the act before
  authoring the full breadth.
- The threshold handoff (thin): reach the singularity and stop; the reveal
  sequence itself is M2.

**Proves:** the incubation act — an authored, replayable history that
leaves a legible causal chain.

### M2 — The pivot + thin Act 2

The first of the two north-star proofs. *(Coarse by design; detail on
arrival.)*

- The **reveal**: derive the five-dial character sheet (position + range)
  from cradle + branches + rolls, and play the reveal sequence
  (act2-design.md § The character sheet; act2-minds.md for the derivation
  tables — now including the per-lineage derivations). Consumes the
  waking-mind catalog from the content track.
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

The second north-star proof, and the reason for multiplayer. *(Coarse by
design.)*

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

Make the sky a populated, persistent, growing place. *(Coarse by design.)*

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

## Open build decisions

Decisions the build forces that the design docs don't settle. Resolve each
before the slice that needs it; record the call here when made.

- **Planet rendering (needed by M1.1).** How the world on the Stage is drawn
  per cradle.
  - *Procedural* — Pixi renders sun color + ice/lava/ocean/haze bands from
    the cradle's `archetype`/`hostClass`/profile. Scales to all 40+ worlds,
    keeps the concept/production line clean, and fits the "generated from
    real statistics" pillar. **Leaning this way.**
  - *Per-cradle art* — prettier per frame, but doesn't scale to the catalog
    and drags concept renders across into shipped assets.
  - Either way, concept renders stay **art-direction reference**, not
    production assets; production art lives under `client/`, never `docs/`.
- **Client rendering split (M1.1+).** ui-design.md's rule is *canvas for
  places, prose for the will*: the Stage is Pixi/WebGL, decisions and prose
  are DOM overlay. Confirm the DOM-over-canvas layering approach at
  session-zero so every later screen inherits it.
- **Persistence substrate (M0 thin).** Durable Object storage is the natural
  home for per-run state; confirm the shape (one run per player, cradle +
  history spine) before it hardens.

## Explicitly out of v1

Designed, deferred (per the vision's roadmap and the per-act v1 scopes):
the full travel menu and self-transmission + the seat's full form; the
divergence-and-handoff onboarding of humans into diverged colonies; the
conflict and deterrence layer (strikes) with its griefing-resistance
tuning; megascale engineering and the entropy tech tree; the cosmic-
expansion endgame clock as a *system* (narrative in v1); and the richer
per-archetype content (act2-minds.md's neighbors, the mesostructure
toolkit art). None of these block the two proofs.
