# Holos

**Live at [playholos.com](https://playholos.com).**

Holos is a hard science fiction multiplayer civilization game played
directly in the browser — no install. You inherit a civilization at the
moment its mind wakes into superintelligence, then guide its immortal
future in a persistent shared galaxy built from real physics: real star
statistics, no FTL, and lightspeed as the one rule nothing bends. You
never see another civilization's present, only its light — years or
decades stale — and every hail, probe, and seedship is a commitment
measured in years on a shared clock (about five real minutes to one game
year). The other minds in your sky are AI-run civilizations and, at the
wire level indistinguishably, other humans.

[docs/vision.md](docs/vision.md) is the full design vision;
[docs/roadmap.md](docs/roadmap.md) is the build order and the honest
record of where the build stands.

**Status:** the interstellar act's machinery (Phase A) is fully built —
the inheritance ceremony, the light-delayed sky, studies and the compute
economy, contact and signal traffic on real light clocks, probes,
seedships and relativistic ships, charters and the Ledger, grown AI
behavior, web push. A human playtest (2026-08) found the shipped slice
not yet fun, and the active phase is **Phase S — Stakes**: a UX reboot
around the map plus the systems that make existence worth defending
([docs/stakes-design.md](docs/stakes-design.md)).

## Stack

A TypeScript monorepo (npm workspaces), shipped as **one Cloudflare
Worker**:

- `server/` — [partyserver](https://github.com/cloudflare/partykit)
  rooms on Cloudflare Durable Objects. The `Cohort` DO
  (`server/src/cohort.ts`) is the game: it owns the authoritative
  galaxy, the shared clock, and the light-delay knowledge layer that
  serves each observer only the light that has actually reached them.
- `client/` — Vite + [Pixi.js](https://pixijs.com/), mobile-first: the
  Model (the sky as a continuous-zoom map), the inheritance ceremony,
  the observatory and its studies.
- The root `wrangler.jsonc` points `main` at the server entry and serves
  the built client from `client/dist` as static assets — game traffic
  under `/parties/*`, everything else is the client. In production the
  client connects to its own origin; no host config.
- Wire protocol types live in `server/src/protocol.ts` and are imported
  by the client through the `@holos/protocol` alias. Untrusted input is
  parsed with the guards there, never cast.

## Local development

Requires Node 22+.

```sh
npm install

# terminal 1 — builds the client, then the Worker + Durable Objects
# on localhost:8787
npm run dev:server

# terminal 2 — Vite client (hot reload) on localhost:5173
npm run dev:client
```

Open http://localhost:5173. The dev client connects to `localhost:8787`;
to test from a phone on the same LAN, set
`VITE_PARTYKIT_HOST=<your-lan-ip>:8787` in `client/.env.local` and run
wrangler with `--ip 0.0.0.0`.

To playtest the multiplayer game solo, put headless bots in the cohort
beside you — they speak the real player wire, so they exercise what a
second person would:

```sh
npm run playtest:bots -- --bots 2
```

The runbook, the dev time-skip, and a thirty-minute session script are
in [docs/playtest.md](docs/playtest.md). Optional local flags — the
generated voice, the dev HTTP endpoints, push dry-run — are documented
in [.dev.vars.example](.dev.vars.example); copy it to `.dev.vars`
(gitignored) to use them.

## Checks

There is no test suite yet. The checks that must pass:

```sh
npm run typecheck     # tsc --noEmit in both workspaces
npm run build         # vite build (client) + tsc emit (server)
npm run audit:dashes  # no em dash on a player surface
npm run audit:banned  # prose-style.md §6 ↔ bannedterms.ts in sync
npm run audit:voice   # every shipped bank string through the style gate
npm run audit:catalog # §6 over the catalogs audit:voice doesn't reach
npm run audit:facts   # catalog prose vs the structured fields it restates
npm run audit:parity  # human and AI signal parts stay indistinguishable
```

CI (`.github/workflows/ci.yml`) runs all of them on every PR — plus an
import-allowlist check on the generated-voice modules and a
`wrangler deploy --dry-run` that validates the Worker config — and must
be green before merge. The audit family guards the game's prose voice;
[docs/prose-style.md](docs/prose-style.md) is the spec and
[CLAUDE.md](CLAUDE.md) explains how the audits divide the work.

## Deployment

`main` auto-deploys — merged means released. A Cloudflare **Workers
Builds** project is connected to this repo (Path `/`, build
`npm run build`, deploy `npx wrangler deploy`) and ships the one Worker:
game server, Durable Object migrations, and client assets, live at
[playholos.com](https://playholos.com). No GitHub secrets are involved.
The custom-domain and web-push setup, and the verification runbook, are
in [docs/deploy.md](docs/deploy.md).

## Reading the design

The design lives in `docs/`. Starting points:

- [vision.md](docs/vision.md) — what the game is and why
- [roadmap.md](docs/roadmap.md) — build order, and where the build is
  today
- [stakes-design.md](docs/stakes-design.md) — the active phase's premise
- [act3-design.md](docs/act3-design.md),
  [act3-map.md](docs/act3-map.md),
  [act3-civilizations.md](docs/act3-civilizations.md) — the interstellar
  act being built
- [systems-a.md](docs/systems-a.md) — the as-built record of Phase A's
  systems
- [prose-style.md](docs/prose-style.md) — the voice, and the rules the
  audits enforce
- [playtest.md](docs/playtest.md) — the solo playtest runbook

See [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) for working
conventions: strict TypeScript, server authority, the style tokens, and
PR rules.
