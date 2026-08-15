# Reading production

How to look at a live run on playholos.com: join the cohort on your own
credential and print what the server sends. The tools live in
`scripts/prod/`, they are **read-only by construction**, and this file is
both the runbook and the pattern for adding the next one.

## Why it works this way

Production withholds itself on purpose. `devEndpointsOpen`
(`server/src/cohort.ts`) opens `/dev/state` and `/dev/sky` only for a local
hostname or for `HOLOS_DEV_ENDPOINTS=on`, and that flag lives in
`.dev.vars` and is deliberately absent from `wrangler.jsonc` — what it
unlocks is exactly the truth the knowledge layer exists to withhold. Durable
Object storage has no CLI read path either.

So there is one honest route, and it is the player's own: `hello` with a
credential, then read what the server chooses to serve that seat. Everything
these tools can see, the browser could see. Nothing here is a back door, and
nothing here should become one.

## The credential

A seat is one string, and your browser holds it at playholos.com:

- `localStorage['holos.account']` — a claimed seat: 20 Crockford symbols,
  the key from the write-it-down sheet. Hyphens and spacing are fine, the
  tools normalize exactly as the server does.
- `localStorage['holos.token']` — an unclaimed seat: a UUID.

`net.ts` keeps the XOR (a device holds one, never both), so copy whichever
is there into a file under `.seats/`:

```sh
mkdir -p .seats
pbpaste > .seats/default        # or .seats/phone, .seats/testseat, ...
```

`.seats/` is gitignored, one file per seat. These are **bearer secrets for
real runs** — a leaked one is someone's civilization, and there is no
recovery and no rotation. Nothing in `scripts/prod/` ever prints a
credential (`accounts.ts`'s "NOTHING HERE EVER LOGS", carried over).

`HOLOS_ACCOUNT` / `HOLOS_TOKEN` in the environment override the file.

## The tools

```sh
npm run prod:report                  # the AV2 annal, as the player reads it
npm run prod:sky                     # the whole state the client renders from
```

| Flag | Default | What it does |
| --- | --- | --- |
| `--seat NAME` | `default` | Which file under `.seats/` to read. |
| `--host` | `playholos.com` | Point at `localhost:8787` to read a dev run. |
| `--room` | `genesis` | The cohort room; the client's is `genesis`. |
| `--json` | off | The raw payload instead of the rendered summary. |

`prod:sky` is the troubleshooting workhorse: when something looks wrong on
production — a study stuck, a mission past its arrival, a compute rate that
does not match a landed project, a proposal that should not be there — it
prints the state the client was rendering when it looked wrong. `--json`
feeds a diff against a later read.

## The one cost of looking

`hello` on a placed seat makes the server call `sendReport(..., { advance:
true })`, which persists `lastServedYear = nowYear`. That marker is what
`report.ts` triages against, so **running any of these consumes that seat's
"new since last visit" baseline**: the next open may not fire a header it
otherwise would, and may not attach the archetype remark to a promoted
entry.

What is *not* affected: the entries themselves (frozen at materialization,
so the text is identical however often you read it) and the Report tab's
badge (client-side, `reportSeenKey` in `client/src/app.ts`). So the cost is
the framing, not the annal — and it rides the handshake, not the request,
so no client can avoid it. Read a seat you are about to open anyway, or
accept the flattened header.

## Adding a tool

Every script here is the same shape, and `scripts/prod/report.mjs` is the
short one to copy:

```js
import { withSeat, has } from "./seat.mjs";
const argv = process.argv.slice(2);
await withSeat(argv, async (seat) => {
  const { report } = await seat.ask({ type: "requestReport" }, "report");
  // ... print it
});
```

`seat.mjs` owns the socket, the credential, the handshake and the waiting.
It also owns **the safety property**: `send` refuses any frame outside
`READ_ONLY` (`hello`, `requestSky`, `requestReport`). A tool built on it
cannot open a study, launch a mission, hail anyone or spend a compute — not
because it declines to, but because the module will not put those bytes on
the wire.

Adding a frame to that allowlist is not a formality. Read its handler in
`cohort.ts` first and confirm it writes nothing a player would notice; the
`sendReport` note above is what a handshake alone already costs, and that
one is unavoidable. Every other arm of `CohortClientMessage` is an act.

These are dev tools: zero dependencies, Node 22 or newer for the global
`WebSocket`, and nothing that ships may import them.

## Never point the bots here

`docs/playtest.md` says it and it belongs here too: `scripts/playtest-bot.mjs`
talks to a local `wrangler dev` only. Bots pointed at production would join
the live cohort as ordinary players, take seats, hail real people and spend a
real galaxy's contact log. There is no reason to do it and no way to undo it.
