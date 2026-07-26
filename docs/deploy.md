# Deployment

How Holos ships, and the one-time setup for the custom domain
(**playholos.com**). Conventions live in CLAUDE.md; this file is the
operational runbook.

## What ships

One Cloudflare Worker, built from the root `wrangler.jsonc`:

- `main` points at `server/src/index.ts` — the partyserver Durable
  Objects (`Room`, `Cohort`). Game traffic is `/parties/*`.
- `assets` serves the built client from `client/dist` for every other
  path, with `not_found_handling: "single-page-application"` so a
  refresh on any route still lands on the app.

Because it is one origin, the client connects to its own host over
WebSocket. There is no cross-origin config and no host env var in
production — which also means a custom domain needs no client change
beyond the canonical URL in `client/index.html`.

## The pipeline

`main` auto-deploys. A Cloudflare **Workers Builds** project is
connected to this repo with **Path `/`**, build command
`npm run build`, deploy command `npx wrangler deploy`. No GitHub secrets
are involved and there is no deploy workflow in `.github/workflows/` —
CI there only runs typecheck and build.

**Merged means released.** Never merge something half-done on the
assumption it gets fixed before release; the merge *is* the release.

Two known wrinkles:

- **A new Durable Object fails the *preview* build, not production.**
  Non-production (PR-branch) builds deploy with
  `wrangler versions upload`, which cannot apply DO migrations — error
  10211. The migration lands when the PR reaches `main`, where
  `wrangler deploy` applies it atomically. See CLAUDE.md § Deployment.
- **Secrets are set out-of-band.** `ANTHROPIC_API_KEY` is a Workers
  secret (`npx wrangler secret put ANTHROPIC_API_KEY`) and never appears
  in `wrangler.jsonc`. Locally it goes in `.dev.vars` (gitignored).

## Custom domain — playholos.com

The domain is registered at **Porkbun**. Porkbun stays the registrar;
only DNS hosting moves to Cloudflare, because a Worker custom domain
requires the zone to be on the same Cloudflare account as the Worker.

### The ordering constraint

**The zone must be active on Cloudflare before any `routes` block
ships.** `wrangler deploy` resolves each route's zone against the
account at deploy time and fails with *"Could not find zone"* if it is
not there. Since `main` auto-deploys on every merge, merging a routes
block before the zone is active **takes production down** — the deploy
fails, and the last good version stays up only until the next merge
compounds it.

CI does not protect you here. `npx wrangler deploy --dry-run` never
contacts Cloudflare, so a routes block pointing at a zone that does not
exist passes dry-run and fails the real deploy. The zone move is a
prerequisite, not a parallel task.

So the routes block in `wrangler.jsonc` stays **commented out** until
step 3 below verifies the zone is active. That is the entire gate.

### Step 0 — where things stand

As of 2026-07-26 the zone has **not** moved. `playholos.com` still
delegates to Porkbun:

```
curitiba.ns.porkbun.com.   fortaleza.ns.porkbun.com.
maceio.ns.porkbun.com.     salvador.ns.porkbun.com.
```

The apex and `www` resolve to Porkbun's parking page
(207.207.210.36 / .50), and MX points at Porkbun email forwarding
(`fwd1.porkbun.com`, `fwd2.porkbun.com`). All three matter below.

### Step 1 — add the zone to Cloudflare

In the Cloudflare dashboard, on **the same account that owns the
`holos-game` Worker** (check the account switcher — a zone on a
different account will not bind, and the failure looks identical to the
zone not existing):

1. **Add a domain** → enter `playholos.com` → choose the **Free** plan.
2. Cloudflare scans the existing records and imports what it finds.
   **Review the imported set before continuing:**
   - Keep the **MX** records (`fwd1`/`fwd2.porkbun.com`, priority
     10/20) — dropping them silently breaks Porkbun email forwarding.
     Keep any TXT records too (SPF/verification).
   - **Delete** the apex `A` records and the `www` `CNAME` that point at
     the Porkbun parking page. Wrangler creates the DNS records for a
     custom domain itself, and a leftover record on the same name makes
     step 4's deploy fail with a conflict.
3. Cloudflare shows **two assigned nameservers** (e.g.
   `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`). Copy both — they
   are specific to this zone, not generic.

### Step 2 — repoint the nameservers at Porkbun

In the Porkbun dashboard → **Domain Management** → `playholos.com`:

1. If **DNSSEC** is enabled, **turn it off first** and let the DS record
   clear. A DS record signing Porkbun's keys makes the domain fail to
   resolve — hard-fail, not degrade — once Cloudflare answers for it.
   DNSSEC can be re-enabled from Cloudflare afterwards.
2. Open **Authoritative Nameservers** (the `NS` section) → **Edit**.
3. Replace **all four** Porkbun nameservers with **the two** Cloudflare
   ones from step 1. Save.

Nothing else at Porkbun changes: registration, renewal, WHOIS privacy,
and transfer lock stay where they are.

Propagation is usually minutes to a couple of hours; the registry TTL
is 24h in the worst case.

### Step 3 — verify the zone is ACTIVE (the gate)

Do not touch `wrangler.jsonc` until **all** of these hold:

1. **Cloudflare says Active.** The zone's Overview page reads
   `Active` (not `Pending Nameserver Update`). Cloudflare also emails
   on activation.
2. **Delegation actually moved**, checked against a resolver rather
   than the dashboard:

   ```sh
   dig +short NS playholos.com          # expect the two *.ns.cloudflare.com
   # no dig? same answer over DoH:
   curl -sS -H 'accept: application/dns-json' \
     'https://cloudflare-dns.com/dns-query?name=playholos.com&type=NS'
   ```

3. **Same account as the Worker.** `npx wrangler whoami` lists the
   account id it will deploy to; the zone's Overview page shows the
   account it belongs to. They must match.

If the zone sits at `Pending` for more than a day, the usual causes are
a partially-saved NS change at Porkbun (all four replaced by two?) or a
stale DS record from step 2.1.

### Step 4 — ship the routes

Only once step 3 passes. In `wrangler.jsonc`, uncomment the routes
block at the bottom:

```jsonc
"routes": [
  { "pattern": "playholos.com", "custom_domain": true },
  { "pattern": "www.playholos.com", "custom_domain": true }
]
```

Merge to `main`; Workers Builds runs `npx wrangler deploy`, which
attaches both hostnames to the Worker and creates their DNS records
automatically. Nothing needs clicking in the dashboard.

`custom_domain: true` (rather than a zone route pattern like
`playholos.com/*`) is what makes the hostname resolve to the Worker
directly, which is what a WebSocket origin serving its own assets
wants.

### Step 5 — verify the deploy

```sh
curl -sSI https://playholos.com/ | head -n 1        # 200
curl -sSI https://www.playholos.com/ | head -n 1    # 200
```

Then load `https://playholos.com/` in a browser and confirm the game
connects — the WebSocket to `/parties/cohort/:roomName` is same-origin,
so a connection failure here means the route bound but the asset/DO
split did not, not a CORS problem.

If the deploy fails, comment the routes block back out and merge that
immediately: production is only healthy while `wrangler deploy`
succeeds.

## Canonical URL

The **apex** (`https://playholos.com/`) is canonical. `www` serves the
same Worker so no one hits a dead hostname, but
`client/index.html` carries `<link rel="canonical">`, `og:url`, and the
image URLs on the apex, so crawlers and shares only ever see one form.

Anything that adds a URL to the client, a doc, or a share card uses the
apex form. If you would rather `www` 301 to the apex, add a
Cloudflare **Redirect Rule** (Rules → Redirect Rules) on the zone —
it is a dashboard change, not a repo change, and the canonical tag
already covers the SEO side either way.
