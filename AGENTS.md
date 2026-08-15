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

## PR conventions

- PRs are **small and single-purpose**.
- The PR description explains the change: what and why.
- CI (typecheck + build for both workspaces) must be green before merge.
- **`main` auto-deploys** — every merge must be shippable. Never merge
  something half-done behind the assumption it will be fixed "before
  release"; merged means released.
