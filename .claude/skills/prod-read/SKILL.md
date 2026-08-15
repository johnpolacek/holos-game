---
name: prod-read
description: Troubleshoot or improve Holos against a live run on playholos.com. Use when something looks wrong in production (a study stuck, a mission past its arrival, a compute rate that disagrees with a landed project, a report entry that reads false, a proposal that should not be there), when asked to read a live seat's report or sky, or when a change should be shaped by what real play actually produced rather than by a guess.
---

# Reading production, and what to do with what you find

`docs/prod-read.md` owns the mechanics: the credential, the flags, the
`.seats/` layout, the one cost of looking. Read it for any of that and do not
restate it here. This is the loop.

## 1. Read before you theorize

```sh
npm run prod:sky        # always first: the whole state the client renders from
npm run prod:report     # the annal, when the question is about what was told
```

`prod:sky --json` twice, minutes or years apart, and diff them — that is how
you tell "stuck" from "slow". A symptom described from a screenshot is a
report about a render; the sky is what the render was made of.

**What these can and cannot see.** This is the player's own seat, so `sources`
is `DetectedSource` and everything the knowledge layer withholds from the
browser is withheld from you. You are looking at a *belief*. If the question
is whether a belief is correct — whether the study is wrong about that star,
whether the silence means what it looks like — production cannot answer it and
neither can these tools. Reproduce it locally, where `/dev/state` exists.

## 2. Locate the layer

| The symptom | Where it lives |
| --- | --- |
| A number is wrong (rate, cost, distance, year) | The derivation in `server/src/*.ts`. The server is authoritative; a client never computes truth. |
| A sentence states a number that disagrees with it | A catalog `effectLine` / ship-class `line`. `npm run audit:facts` guards the couplings written into it — if this one was not, add it there as part of the fix. |
| A sentence is fine but reads flat, hedged, or coined | `voice.ts` / the `voicegen.ts` prompts, and the fix belongs in `stylegate.ts` or `bannedterms.ts` so it holds for generated lines too. `/prose-audit` is the judgement pass. |
| A frozen report entry reads false | `report.ts` materialization. The entry is frozen at write, so the bad text is already stored and a code fix does not retroactively mend it — say so when reporting. |
| The wire carries something it should not | `protocol.ts`, and treat it as a leak, not a bug. |

## 3. Reproduce locally, never experiment in production

The live cohort has real seats in it. Every fix gets exercised against a
local galaxy instead (`docs/playtest.md` is the full runbook; this is the
short form):

```sh
npm run dev:server                                     # needs .dev.vars, HOLOS_DEV_ENDPOINTS=on
curl -X POST localhost:8787/parties/cohort/genesis/dev/seed \
  -H 'content-type: application/json' -d '{"aiCivs":6}'
npm run playtest:bots -- --bots 1                      # a placed seat to read
curl -X POST localhost:8787/parties/cohort/genesis/dev/skip \
  -H 'content-type: application/json' -d '{"years":45}'
npm run prod:sky -- --seat <name> --host localhost:8787
```

The same tools point at either host, which is the point of the `--host` flag:
the thing you verify locally is read through the same code that showed you the
problem.

## 4. Rules that must survive contact with a live galaxy

- **Never widen the `READ_ONLY` allowlist casually.** `scripts/prod/seat.mjs`
  will not send any frame outside `hello`, `requestSky` and `requestReport`,
  and that is what makes "a prod tool cannot take an action" structural rather
  than careful. Adding one means reading its handler in `cohort.ts` first and
  confirming it writes nothing a player would notice.
- **Never point the playtest bots at production.** They would join the live
  cohort as ordinary players, take seats, hail real people. There is no way to
  undo it.
- **A credential is never printed, never logged, never committed.** `.seats/`
  is gitignored and holds bearer secrets for real runs, with no recovery and no
  rotation.
- **Looking costs the report baseline.** The handshake advances
  `lastServedYear` for that seat. Say so if you read someone else's seat.
- **Merged means released.** `main` auto-deploys, so a fix shaped by a prod
  reading ships the moment it lands.

## 5. Adding a tool

New readers go beside the two in `scripts/prod/` and are the same six lines —
`withSeat`, one `ask`, print. Copy `report.mjs`. Zero dependencies, Node 22 or
newer, and nothing that ships may import them.
