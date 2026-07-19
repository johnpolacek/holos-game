# Holos — Agent Guide

Holos is an online multiplayer browser game. This file documents the stack,
workflows, and conventions for anyone (human or agent) working in this repo.

## Stack

- **TypeScript everywhere**, npm workspaces monorepo with two packages:
  - `server/` — [PartyKit](https://www.partykit.io/) (Cloudflare Durable
    Objects) with a single `Room` class in `server/src/server.ts`. The Room
    holds **authoritative game state**: each connected player is a colored
    dot; the server validates/clamps move intents and broadcasts positions
    to all clients.
  - `client/` — Vite + Pixi.js. Mobile-friendly: touch/pointer input,
    responsive full-screen canvas. Connects to the PartyKit room over
    WebSocket via `partysocket`.
- Wire protocol types live in `server/src/protocol.ts` and are imported by
  the client through the `@holos/protocol` alias (defined in
  `client/tsconfig.json` and `client/vite.config.ts`). Change the protocol
  in that one file only.

## Running dev

Run both processes (two terminals), from the repo root:

```sh
npm install
npm run dev:server   # PartyKit dev server on localhost:1999
npm run dev:client   # Vite dev server on localhost:5173
```

Open http://localhost:5173 in multiple tabs (or phones on the same LAN —
Vite listens on all interfaces) to see multiplayer in action. The client
reads `VITE_PARTYKIT_HOST` to find the server (defaults to
`localhost:1999`).

## Tests / checks

There is no test suite yet. The checks that must pass are:

```sh
npm run typecheck   # tsc --noEmit in both workspaces
npm run build       # vite build (client) + tsc emit (server)
```

CI (`.github/workflows/ci.yml`) runs both on every PR and must pass before
merge.

## Deployment

`main` auto-deploys; the two workspaces ship on separate pipelines:

- **Client** — Cloudflare Workers static assets. A Workers Builds project
  is connected with **Path `client`** and deploy command
  `npx wrangler deploy` (config: `client/wrangler.jsonc`, an assets-only
  Worker serving `dist/`). The build-time env var `VITE_PARTYKIT_HOST`
  points the client at the deployed PartyKit host.
- **Server** — PartyKit, via the `Deploy server` workflow
  (`.github/workflows/deploy-server.yml`) on push to `main`. It runs
  `partykit deploy` and needs the `PARTYKIT_LOGIN` / `PARTYKIT_TOKEN` repo
  secrets. Note: PartyKit deploys to PartyKit's platform, **not** to your
  Cloudflare account via `wrangler` — the two deploys are independent.

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
