# Holos — Agent Guide

Holos is an online multiplayer browser game. This file documents the stack,
workflows, and conventions for anyone (human or agent) working in this repo.

## Stack

- **TypeScript everywhere**, npm workspaces monorepo with two packages:
  - `server/` — [partyserver](https://github.com/cloudflare/partykit)
    (PartyKit's library form) running as a **Cloudflare Durable Object**.
    A single `Room` class in `server/src/index.ts` holds **authoritative
    game state**: each connected player is a colored dot; the server
    validates/clamps move intents and broadcasts positions to all clients.
  - `client/` — Vite + Pixi.js. Mobile-friendly: touch/pointer input,
    responsive full-screen canvas. Connects to the Room over WebSocket via
    `partysocket` at `/parties/room/:roomName`.
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

## Tests / checks

There is no test suite yet. The checks that must pass are:

```sh
npm run typecheck   # tsc --noEmit in both workspaces
npm run build       # vite build (client) + tsc emit (server)
```

CI (`.github/workflows/ci.yml`) runs both on every PR and must pass before
merge.

## Deployment

`main` auto-deploys through a single pipeline: a Cloudflare **Workers
Builds** project connected to this repo with **Path `/`**, build
command `npm run build`, and deploy command `npx wrangler deploy`. That
deploys the one Worker (game server + client assets, config: root
`wrangler.jsonc`, including Durable Object migrations). No GitHub
secrets are involved. The custom domain (holosgame.com) attaches to this
Worker in the Cloudflare dashboard once its DNS zone is on the account —
see the commented `routes` block in `wrangler.jsonc`.

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

## PR conventions

- PRs are **small and single-purpose**.
- The PR description explains the change: what and why.
- CI (typecheck + build for both workspaces) must be green before merge.
- **`main` auto-deploys** — every merge must be shippable. Never merge
  something half-done behind the assumption it will be fixed "before
  release"; merged means released.
