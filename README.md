# Holos

Holos is an online multiplayer browser game played directly in the browser —
no install, no account. Right now it's a minimal multiplayer hello world:
every connected player appears as a colored dot in a shared room, and you
move your dot with touch or mouse while seeing everyone else move in real
time. The game itself is still taking shape; this repo is the foundation
it will grow on. *(Placeholder — real game description to come.)*

Built as a TypeScript monorepo: a [PartyKit](https://www.partykit.io/)
server (Cloudflare Durable Objects) holding authoritative room state, and a
Vite + [Pixi.js](https://pixijs.com/) client.

## Local development

Requires Node 22+.

```sh
npm install

# terminal 1 — PartyKit server on localhost:1999
npm run dev:server

# terminal 2 — Vite client on localhost:5173
npm run dev:client
```

Open http://localhost:5173 in two or more tabs to see multiplayer working.
To test from a phone, open `http://<your-lan-ip>:5173` and set
`VITE_PARTYKIT_HOST=<your-lan-ip>:1999` in `client/.env.local`.

Checks (run in CI on every PR):

```sh
npm run typecheck
npm run build
```

## Deployment

`main` auto-deploys. The two halves ship independently:

- **Client** → Cloudflare Workers (static assets). A Cloudflare Workers
  Builds project is connected to this repo with **Path `client`**, build
  command `npm run build`, and deploy command `npx wrangler deploy`
  (config in `client/wrangler.jsonc`). Set the build-time env var
  `VITE_PARTYKIT_HOST` to the deployed PartyKit host (e.g.
  `holos.<your-username>.partykit.dev`) so the client connects to the live
  server.
- **Server** → PartyKit, via the `Deploy server` GitHub Action
  (`.github/workflows/deploy-server.yml`) on every push to `main`. It
  needs two repo secrets: `PARTYKIT_LOGIN` (your GitHub username) and
  `PARTYKIT_TOKEN` (from `npx partykit token generate` after
  `npx partykit login`).

See [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) for conventions.
