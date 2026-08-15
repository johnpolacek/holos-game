# Solo playtest

How to play the multiplayer game alone: run the local Worker, open the
client in a browser, and put one or more **playtest bots** in the cohort
beside you. The bots are headless players on the real player wire — they
take up sources, run vigils, buy questions, hail, trade composed signals
and answer the mutual quiet through exactly the messages the browser
client sends. Nothing about a bot is a second species of counterpart: A2.6
retired freeform and made human and AI threads byte-indistinguishable, so
a client speaking that vocabulary is indistinguishable by construction,
and playing against one exercises what a second person would.

The bot is `scripts/playtest-bot.mjs`. It is a **dev tool**: zero
dependencies, never imported by anything that ships, and it talks to a
local `wrangler dev` only.

> **Never point bots at production.** The runbook below leans on the dev
> HTTP surface (`/dev/skip`, `/dev/state`), and that surface refuses to
> answer on playholos.com — `devEndpointsOpen` opens it for a local
> hostname or for `HOLOS_DEV_ENDPOINTS=on`, and that flag lives in
> `.dev.vars`, which is gitignored and never deployed. So the time skip
> simply 404s against production while the bots themselves would go on
> joining the live cohort as ordinary players, taking seats, hailing real
> people and spending a real galaxy's contact log. There is no reason to
> do it and no way to undo it.

## Prerequisites

- Node 22 or newer. The bot uses the global `WebSocket` and nothing else.
- `npm install` at the repo root.
- A `.dev.vars` at the repo root (copy `.dev.vars.example`) with
  `HOLOS_DEV_ENDPOINTS = "on"`. Without it the time skip is not
  reachable: `wrangler dev` presents the request to the Worker as
  `http://playholos.com/…` once the routes are live, so the hostname
  half of the gate no longer fires locally.

## The three terminals

```sh
# 1 — the Worker (game server + Durable Objects) on :8787.
#     This also builds the client once, because the Worker serves it.
npm run dev:server

# 2 — the Vite dev server on :5173, for the browser you play in.
npm run dev:client

# 3 — the bots.
npm run build          # once, if you want the bots to use the game's own
                       # name lexicon (server/dist/names.js); optional
npm run playtest:bots -- --bots 2
```

Then open <http://localhost:5173>, run the inheritance ceremony, and
watch terminal 3. Every bot action is one line:

```
[bot1 Freshetarrangers] placed at HOL-2320-60, 10 sources in the sky
[bot1 Freshetarrangers] took up HOL-1163-121 by buying "OFF-AXIS" for 60 compute
[bot2 Sunsojourners] bought "WEIGH IT" on HOL-0412-1 for 180 compute
[bot2 Sunsojourners] hailing HOL-0412-1 at 8.4 light years, unprompted
[bot1 Freshetarrangers] answering HOL-7381-91 with a confirm on their
                        finding, our own recent light; tone plain
```

### Flags

| Flag | Default | What it does |
| --- | --- | --- |
| `--bots N` | `1` | How many seats to fill (max 8). |
| `--host` | `localhost:8787` | Where the Cohort answers. |
| `--room` | `genesis` | The cohort room name; the client's is `genesis`. |
| `--seed` | `holos-playtest` | The policy RNG seed. Same seed, same personalities and same choices. |
| `--verbose` | off | Also log every frame the bot sends. |

Each bot keeps its run token in `.playtest/<room>-bot<N>.token`
(gitignored), so a rerun resumes the same civilizations instead of
filling the cohort with abandoned ones. Delete that directory to give
the bots fresh seats.

## Compressing time

The shared clock runs at five real minutes per game year (`clock.ts`), and
contact is measured in light years: an eight light-year neighbor is an
eight-year round trip, which is most of an hour of real time. To watch a
whole exchange in one sitting, skip the clock forward:

```sh
curl -X POST http://localhost:8787/parties/cohort/genesis/dev/skip \
  -H 'content-type: application/json' -d '{"years":20}'
```

That is the real URL shape: the Cohort's HTTP surface hangs off the same
party route the socket uses, `/parties/cohort/<room>/dev/<action>`. The
skip re-anchors the clock, pushes the new anchor and a fresh sky to every
live connection (bots included), and re-arms anything that fell due
inside the window. It is **forward only**.

Two more that are worth knowing:

```sh
# The truth overview: every civ, its controller, its emission history.
curl http://localhost:8787/parties/cohort/genesis/dev/state

# Erase one run — the same call the in-game "start over" makes. The token
# is the authorization; a bot's is in .playtest/, and yours is in
# localStorage under `holos.token`.
curl -X POST http://localhost:8787/parties/cohort/genesis/dev/forget \
  -H 'content-type: application/json' -d '{"token":"…"}'
```

To reset everything instead, stop `wrangler dev`, delete `.wrangler/`
(the local Durable Object storage) and `.playtest/`, and start again.

## Testing push without a push service

A5 sends a payload-free notification when a tripwire you left standing
comes true while you are away. Almost all of it can be exercised on a
laptop with no phone and no push service at all.

Put a throwaway keypair (docs/deploy.md § Web push has the generator)
plus these two lines in `.dev.vars`, and restart `wrangler dev`:

```
HOLOS_PUSH_DRY_RUN = "on"
HOLOS_DEV_ENDPOINTS = "on"
```

Dry run logs the request (host, TTL, Topic, the head of the JWT) and
answers a synthetic 201 without opening a socket. A bare status instead
of `on` answers that status, so `HOLOS_PUSH_DRY_RUN = "410"` is how you
watch a dead subscription get deleted.

Three routes, on the same `/parties/cohort/<room>/dev/<action>` shape as
everything else:

```sh
# What this seat has subscribed, what it has been told about, and the
# year its watch is queued for. Hosts, never endpoints: an endpoint is a
# bearer capability.
curl 'http://localhost:8787/parties/cohort/genesis/dev/push?token=…'

# Run the whole watch evaluation NOW and report it. SENDS NOTHING and
# writes nothing, so it is safe to hit in a loop.
curl -X POST http://localhost:8787/parties/cohort/genesis/dev/watch \
  -H 'content-type: application/json' -d '{"token":"…"}'

# The exact Authorization header the Worker would send to one audience.
curl 'http://localhost:8787/parties/cohort/genesis/dev/vapid?aud=https://fcm.googleapis.com'
```

`/dev/watch` answers `wouldPush` plus a `reason`, and the reason is the
whole diagnostic vocabulary: `not subscribed`, `connection live` (a tab
is open on that seat, so the board is already saying it), `pushed this
absence` (one push per absence, by design), `absent too long`, `no
firing`, `already notified`, or `send`.

The loop that proves the feature: arm a tripwire in the browser and
accept the sheet, `POST /dev/skip` past a change point, close the tab,
then `POST /dev/watch`. It reports the firing and the year it happened
in. Reconnect, and the study board shows that tripwire TRIPPED with the
**same year** on it — not the year you reconnected. The push and the
record are produced by the same function, and that is the property worth
checking if anything about this ever looks wrong.

To check the signature the push services will check, verify a minted JWT
against the public key:

```sh
node -e '
const { webcrypto: c } = require("node:crypto");
const [pub, auth] = process.argv.slice(1);
(async () => {
  const jwt = auth.match(/t=([^,]+)/)[1];
  const [h, p, s] = jwt.split(".");
  const b = (t) => Buffer.from(t, "base64url");
  const key = await c.subtle.importKey("raw", b(pub), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const ok = await c.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b(s), Buffer.from(h + "." + p));
  console.log({ ok, header: JSON.parse(b(h)), claims: JSON.parse(b(p)), sigBytes: b(s).length });
})();
' "$PUBLIC_KEY" "$AUTHORIZATION"
```

Expect `ok: true`, `sigBytes: 64` (raw P1363, never DER), an `aud` equal
to the origin you asked for, an `exp` no more than twenty-four hours
out, and a `sub` that parses as a URI.

### On real hardware, before you trust it

The one leg that cannot be driven from a laptop, and it is the leg the
design rests on: a bodyless push has to actually reach a device.

1. **iPhone.** Add the site to the Home Screen (iOS 16.4 or newer; Web
   Push does not exist in the Safari tab, which is why the hub row says
   so instead of shrugging). Open it from the Home Screen, arm a
   tripwire, accept the sheet, background the app, skip the clock past a
   change point and confirm the banner arrives.
2. **Android Chrome and desktop Firefox.** The same run. Between the
   three you have exercised all three push services, and therefore all
   three `aud` values the JWT is minted for.

If a payload-free push is ever rejected or silently dropped by one of
them, that is the finding that would force encrypted payloads (RFC
8291), which the design deliberately does not build.

## What the bots actually do

One action per tick, on a seeded fifteen to forty second jitter, chosen
off the last `sky`:

- **The vigil.** Keeps two or three vigils running on the nearest
  sources. A study stands on every source already, so taking one up means
  spending: it buys the cheapest question it can afford on the nearest
  untouched board, or leaves a standing order there when it can afford
  nothing. After that it buys the cheapest affordable question on the
  flattest board it holds — the study whose leading reading is least
  settled. Arms a tripwire now and then, usually `crosses`. Calls a study
  once its lead passes seventy percent with two answers behind it.
- **Probes.** Occasionally launches an assay at the nearest source it is
  already watching, once the compute is there. The charter comes from the
  catalog the welcome sent, two clauses from different groups.
- **Contact.** Hails back anything whose beam has landed on it. Hails once
  unprompted, at its nearest source, a few ticks in — so a solo playtester
  gets hailed without having to do anything first.
- **Signals.** On its turn in an answered thread, composes a reply: a
  verdict on what arrived (usually a confirm), its own called finding if
  it has one and its own recent light record if it does not, plus a
  seeded sprinkle of sighting, culture and request parts. Tone is mostly
  plain. Sometimes it sends a carrier with nothing on it.
- **The mutual quiet.** Each bot has a seeded disposition. A quiet one
  accepts an offer and eventually makes one of its own on a long thread;
  the others decline, which is what keeps the accord a real move rather
  than a formality that always succeeds.

The floors are respected rather than probed: the bot waits out the
turnaround and the cooldown, backs off at the per-thread signal cap, and
takes at most one action per tick. Anything the server refuses is logged
and dropped, and the next tick tries something else.

**No player prose, anywhere.** There is no freeform field on this wire
and the bot does not invent one — signals are selectors, materialized
server-side from the sender's own state. The one authored string a bot
writes is its civilization's name, at the ceremony, exactly as a person
does.

## A thirty-minute session

A script that touches every A2.3 through A2.6 beat. Run it with
`--bots 2`; the times are wall clock, and each skip is the curl above.

1. **0:00 — arrive.** Start the three terminals. Run the ceremony in the
   browser; take a candidate whose dials you can argue with. Watch
   terminal 3 for both bots placing.
2. **0:03 — open the vigil.** Open your two nearest sources from the map
   and read the boards that are already standing on them. Buy one
   question on each; that purchase is what takes the study up and puts it
   on the Desk. Both answer on the tap, so note how far each board moves
   on a single look.
3. **0:06 — skip 20 years.** Light lands, and so do the bots' moves. Read
   the evidence trail: an arrival, an answer, a report all read
   differently. Buy a second question on one of the studies now: the
   window it is contested over is the stretch you just let pass. If a
   board went backwards, that is A2.3's regress, and the mind has a
   sentence about it.
4. **0:10 — arm and launch.** Arm the `crosses` tripwire on the flatter
   study and launch an assay at the sharper one. Skip 20 years and watch
   the probe's horizon move.
5. **0:14 — the choice.** By now a bot has hailed you: a source in your
   sky reads as a directed beam and a thread has appeared with nothing you
   can say into it yet. Answering costs the hail ceremony — commit it, and
   notice whether your mind objects and what it charges.
6. **0:18 — skip 20 years.** Your hail lands, the bot reads it, and its
   answer comes back. Open the thread and read the stamp above the
   payload: that is A2.5's physics, measured on an arriving beam.
7. **0:20 — compose.** Reply with a verdict on their finding plus one
   thing of your own. Try `headline` depth once: a claim with the working
   left out, and they can see it was left out. Skip 20 years per exchange.
8. **0:26 — the quiet.** On a long thread, offer the mutual quiet. Half
   the bots accept and half decline, by disposition. If one accepts, watch
   the rail: it is held from your side before it is held from theirs, and
   neither side is wrong.
9. **0:28 — go dark.** Mute a thread and confirm the sender is told
   nothing: their beams still land, their thread still renders on their
   own rack, and your rack simply stops carrying the row.
10. **0:30 — call it.** Call a study you are done arguing about, then send
    that frozen belief on as a finding. Then start over from the in-game
    reset and confirm the ceremony is waiting.

## When something is wrong

- **Bots log `refused: contact-unavailable (the beam is still being
  read)`.** Expected. The turnaround floor has not elapsed; skip time.
- **Bots log `refused: bad-message (no source there)`.** The star left the
  bot's visible sky between the sky it decided on and the send. Harmless.
- **`{"error":"not found"}` from a `/dev/…` URL.** `HOLOS_DEV_ENDPOINTS`
  is not `on` in `.dev.vars`, or the Worker did not pick it up. Restart
  `wrangler dev`.
- **The bots never place.** Check terminal 1 is actually on :8787 and
  that `--room` matches the client's (`genesis`).
