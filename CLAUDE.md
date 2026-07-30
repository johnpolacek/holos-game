# Holos — Agent Guide

Holos is an online multiplayer browser game. This file documents the stack,
workflows, and conventions for anyone (human or agent) working in this repo.

## Stack

- **TypeScript everywhere**, npm workspaces monorepo with two packages:
  - `server/` — [partyserver](https://github.com/cloudflare/partykit)
    (PartyKit's library form) running as **Cloudflare Durable Objects**.
    `server/src/index.ts` still carries the original `Room` class (the A0
    colored-dot demo — each connected player is a dot; the server
    validates/clamps move intents and broadcasts positions), now vestigial.
    The live game is the `Cohort` Durable Object (`server/src/cohort.ts`),
    the Act 3 slice: it owns the authoritative galaxy, the inheritance
    ceremony, and the light-delay knowledge layer, with typed catalogs
    and generation logic in `cradles.ts`, `lineages.ts`, `minds.ts`,
    `civseed.ts`, `galaxy.ts`, `knowledge.ts`, `clock.ts`, `dials.ts`, and
    `rng.ts`.
  - `client/` — Vite + Pixi.js. Mobile-friendly: touch/pointer input,
    responsive full-screen canvas. Boots the Act 3 App (`client/src/app.ts`)
    — the Model (`model.ts`), the inheritance ceremony (`ceremony.ts`), and
    the source card (`sourcecard.ts`) — connected to the `Cohort` room over
    WebSocket via `partysocket` (`net.ts`'s `CohortSocket`) at
    `/parties/cohort/:roomName`.
- **One Worker ships both**: the root `wrangler.jsonc` points `main` at the
  server entry and serves the built client from `dist/` as static assets.
  In production the client connects to its own origin — no cross-origin
  config, no host env var.
- Wire protocol types live in `server/src/protocol.ts` and are imported by
  the client through the `@holos/protocol` alias (defined in
  `client/tsconfig.json` and `client/vite.config.ts`). Change the protocol
  in that one file only.

## Running dev

Run both processes (two terminals), from the repo root:

```sh
npm install
npm run dev:server   # wrangler dev (Worker + Durable Object) on localhost:8787
npm run dev:client   # Vite dev server on localhost:5173
```

Open http://localhost:5173 in multiple tabs to see multiplayer in action.
The dev client connects to `localhost:8787`; set `VITE_PARTYKIT_HOST` in
`client/.env.local` (e.g. `<lan-ip>:8787`, with
`wrangler dev --ip 0.0.0.0`) to test from phones on the same LAN.

To playtest the multiplayer game **solo**, put headless players in the
cohort beside you: `npm run playtest:bots -- --bots 2`. They speak the
real player wire (`scripts/playtest-bot.mjs` — a dev tool, zero
dependencies, never imported by shipped code), so they exercise what a
second person would. The runbook, the dev time-skip and a
thirty-minute session script are in `docs/playtest.md`.

## Tests / checks

There is no test suite yet. The checks that must pass are:

```sh
npm run typecheck     # tsc --noEmit in both workspaces
npm run build         # vite build (client) + tsc emit (server)
npm run audit:dashes  # R-8: no em dash on a player surface
npm run audit:banned  # prose-style.md §6 <-> bannedterms.ts
npm run audit:voice   # every shipped bank string through the style gate
```

CI (`.github/workflows/ci.yml`) runs all of them on every PR and they must
pass before merge. `audit:voice` imports the compiled gate, so it runs after
`build`.

## Deployment

`main` auto-deploys through a single pipeline: a Cloudflare **Workers
Builds** project connected to this repo with **Path `/`**, build
command `npm run build`, and deploy command `npx wrangler deploy`. That
deploys the one Worker (game server + client assets, config: root
`wrangler.jsonc`, including Durable Object migrations). No GitHub
secrets are involved. The custom domain (playholos.com, apex canonical)
attaches to this Worker through the `routes` block in `wrangler.jsonc`,
which stays **commented out** until that DNS zone is active on the same
Cloudflare account — `wrangler deploy` fails with "Could not find zone"
otherwise, and `main` auto-deploys, so shipping routes early breaks
production. `wrangler deploy --dry-run` does not catch this (it never
contacts Cloudflare). The zone move and its verification are the runbook
in `docs/deploy.md`.

**Adding a Durable Object fails the *preview* build, not production.** A
new DO adds a `migrations` entry to `wrangler.jsonc`. On `main` the
deploy runs `wrangler deploy`, which applies migrations atomically, so
production deploys fine on merge. But Workers Builds' non-production
(PR-branch) builds deploy with `wrangler versions upload`, which **cannot
apply Durable Object migrations** — it fails with Cloudflare error 10211
(*"migrations must be fully applied via a non-versioned deployment"*). So
a PR that introduces a Durable Object shows a red Workers Builds check
even when the code is correct; the migration lands when it reaches
`main`. (If you want those preview checks green, disable non-production
branch builds in the Workers Builds project settings.)

## Code conventions

- **Strict TypeScript, no `any`** (explicit or implicit). `strict` and
  `noUncheckedIndexedAccess` are on in both workspaces; keep them on.
  Parse untrusted input (e.g. WebSocket messages) with the guards in
  `protocol.ts` rather than casting.
- The server is authoritative: clients send intents, never state. Any new
  gameplay logic belongs in the Room.
- Keep dependencies minimal; prefer the platform (pointer events, etc.)
  over libraries.
- **Type and ink come from the tokens in `client/src/style.css`** — the
  `--holos-text-*` scale and the `--holos-ink{,-dim,-faint}` tiers. Never
  hard-code a `font-size` or a raw ink color in a component rule. Reading
  type bottoms out at `--holos-text-xs` and the ink tiers stay above the
  alpha where a phone screen in daylight loses them; something that needs to
  feel quieter goes down a tier, not below the floor. `--holos-text-xxs` is
  below that floor and is not reading type: it is for short, repeated,
  *enclosed* classifiers a thumb recognises by shape (the Tend row badges).
  Putting a sentence — or a lone unenclosed label — at xxs is a bug.
- **Line breaking is a policy, not a per-component decision.** The
  "Wrapping" block near the top of `client/src/style.css` owns it: titles,
  subtitles, headers and short label lines get `text-wrap: balance`; running
  prose gets `text-wrap: pretty` (inherited from `body`, so it is the
  default). A new heading or prose class joins the matching selector list in
  that block — never a `text-wrap` declaration in the component rule. The
  block sits above every component so a later `white-space: nowrap` still
  wins (both set `text-wrap-mode`).
- **No em dash reaches a player surface** (prose-style.md R-8). Not in
  prose, not in a chrome label, not as a missing-value glyph, and not
  disguised as an en dash or a double hyphen. A colon sets up a reveal, a
  semicolon joins two whole clauses, a comma carries an aside, and a full
  stop is always available; pick one, because the dash is what a sentence
  reaches for when its clauses have not been decided about. Code comments
  and `docs/*.md` narration are *not* surfaces and keep their dashes — this
  file included. `npm run audit:dashes` draws the line mechanically (it
  reads string literals, not files) and runs in CI; `stylegate.ts` enforces
  the same rule on the lines AV4 generates at runtime.

## Build orchestration

Implementation slices — each `docs/build-*.md` brief — use a three-tier
model topology. Run the build session on Fable (`/model claude-fable-5`):
**you (Fable) are the orchestrator — plan, decompose, synthesize.** Delegate
rather than doing the work yourself, and keep your own context lean.

- **Reasoning-heavy work → Opus** (the deep-reasoner; Agent tool
  `model: "opus"`): architecture, the wire-protocol and knowledge-layer
  design, tricky derivations — anything where getting the *shape* right is
  what matters.
- **Mechanical work → Sonnet** (the fast-worker; Agent tool
  `model: "sonnet"`): boilerplate modules, wiring, repetitive edits,
  scaffolding a screen from a settled spec.
- **High-stakes decisions:** run the deep-reasoner (Opus) **twice with
  slightly different framings** and synthesize the best of both. For A1 those
  are the wire-message design (the `ObservedCiv` no-leak boundary), the Model
  renderer choice, and the join/placement flow.

Use `isolation: "worktree"` when subagents edit files in parallel; otherwise
run them sequentially on the shared tree.

The orchestrator owns the **invariants** and verifies them in every
subagent's output, because a subagent sees only its own task — the
cross-cutting rules and guardrails named in the slice's brief (for A1: the
`ObservedCiv` no-leak discipline, the `cyan = you / amber = other` color
rule, and the no-A2/A3-verbs scope). The orchestrator — not the subagents —
commits, after integrating and confirming `typecheck` + `build` green, in
small single-purpose commits.

This applies to *building*. Doc-only work, planning, and trivial glue don't
need it.

## PR conventions

- PRs are **small and single-purpose**.
- The PR description explains the change: what and why.
- CI (typecheck + build for both workspaces) must be green before merge.
- **`main` auto-deploys** — every merge must be shippable. Never merge
  something half-done behind the assumption it will be fixed "before
  release"; merged means released.
