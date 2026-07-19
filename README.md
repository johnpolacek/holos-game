# Holos

Holos is an online multiplayer browser game played directly in the browser —
no install, no account. Right now it's a minimal multiplayer hello world:
every connected player appears as a colored dot in a shared room, and you
move your dot with touch or mouse while seeing everyone else move in real
time. The game itself is still taking shape; this repo is the foundation
it will grow on. *(Placeholder — real game description to come.)*

Built as a TypeScript monorepo: a
[partyserver](https://github.com/cloudflare/partykit) room running as a
Cloudflare Durable Object, and a Vite + [Pixi.js](https://pixijs.com/)
client — shipped together as one Cloudflare Worker.

## Local development

Requires Node 22+.

```sh
npm install

# terminal 1 — Worker + Durable Object room on localhost:8787
npm run dev:server

# terminal 2 — Vite client on localhost:5173
npm run dev:client
```

Open http://localhost:5173 in two or more tabs to see multiplayer working.
To test from a phone, run the server with `wrangler dev --ip 0.0.0.0`, open
`http://<your-lan-ip>:5173`, and set
`VITE_PARTYKIT_HOST=<your-lan-ip>:8787` in `client/.env.local`.

Checks (run in CI on every PR):

```sh
npm run typecheck
npm run build
```

## Deployment

`main` auto-deploys via a Cloudflare Workers Builds project (**Path
`/`**, build `npm run build`, deploy `npx wrangler deploy`). One
Worker serves everything: game traffic under `/parties/*` goes to the
Durable Object room, everything else is the built client
(root `wrangler.jsonc`). No deploy secrets needed.

See [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) for conventions.
