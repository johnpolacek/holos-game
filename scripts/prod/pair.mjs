#!/usr/bin/env node
// Pair a seat: catch its credential from the game's own origin, over loopback.
//
// The manual route (docs/prod-read.md) walks a bearer secret through the
// clipboard and a shell, once per machine. This is the OAuth native-app shape
// instead: a ONE-SHOT listener on 127.0.0.1, a single line pasted into the
// game's own DevTools console, and the credential crosses the loopback
// interface and nothing else — no clipboard, no shell history, no chat
// transcript, nothing another machine could answer.
//
// The pasted line carries NO secret and is safe to display anywhere. What
// keeps it honest:
//   - the listener binds 127.0.0.1 only, so only this machine can reach it;
//   - a one-time nonce in the path, so a stray local page that guesses the
//     port still cannot feed it;
//   - an Origin allowlist, so the line works pasted into the game and
//     nowhere else;
//   - single use: the first accepted credential closes the listener.
//
// After the write it verifies by opening the seat and naming the civ — which
// costs the one thing every prod read costs (the handshake advances that
// seat's report baseline; docs/prod-read.md).
//
// Usage:
//   npm run prod:pair                      # writes .seats/default
//   npm run prod:pair -- --seat phone --port 8790
//   npm run prod:pair -- --host localhost:8787   # verify against a dev run

import { createServer } from "node:http";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { SEAT_DIR, Seat, classifyCredential, flag } from "./seat.mjs";

const argv = process.argv.slice(2);
const name = flag(argv, "seat", "default");
const port = Number(flag(argv, "port", "8788"));
const host = flag(argv, "host", null); // verify target; Seat.open defaults to production
const nonce = randomUUID();

/** The origins the game is actually served from. `Origin` is set by the
 *  browser, not the page, so this is a real boundary rather than a claim. */
const ALLOWED_ORIGINS = new Set([
  "https://playholos.com",
  "https://www.playholos.com",
  "http://localhost:5173", // Vite dev
  "http://localhost:8787", // wrangler dev serving the built client
]);

const PATH = `/seat/${nonce}`;

/** CORS/private-network headers for an allowed origin. Chrome preflights a
 *  public-page-to-loopback request (Private Network Access) and the answer
 *  must say allow-private-network, or the fetch never leaves the page. */
function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-allow-private-network": "true",
    "cache-control": "no-store",
  };
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin);

  if (req.method === "OPTIONS") {
    // The preflight names no path secrets and costs nothing; answer any
    // allowed origin so the real POST gets its chance.
    res.writeHead(allowed ? 204 : 403, allowed ? corsHeaders(origin) : {});
    res.end();
    return;
  }

  const headers = { "content-type": "text/plain", ...(allowed ? corsHeaders(origin) : {}) };

  if (req.method !== "POST" || !allowed) {
    res.writeHead(403, headers);
    res.end("run the pairing line on playholos.com, in the browser you play in");
    return;
  }
  if (req.url !== PATH) {
    // Wrong nonce: a stale line from an earlier run, or a guesser. Either
    // way it is not this pairing, and the listener stays up for the real one.
    res.writeHead(404, headers);
    res.end("stale pairing line: re-run `npm run prod:pair` and paste the new one");
    return;
  }

  let params;
  try {
    params = new URLSearchParams(await readBody(req));
  } catch {
    res.writeHead(400, headers);
    res.end("unreadable body");
    return;
  }

  // The page sends both slots; net.ts's XOR means at most one is non-empty.
  // Prefer the account key (a claimed seat's token is a dead credential).
  const credential = classifyCredential(params.get("a") ?? "") ?? classifyCredential(params.get("t") ?? "");
  if (credential === null) {
    res.writeHead(400, headers);
    res.end("no credential in this browser: is this the profile you play in?");
    return; // not consumed; the listener waits for the right browser
  }

  const raw = credential.account ?? credential.token;
  mkdirSync(SEAT_DIR, { recursive: true });
  const path = join(SEAT_DIR, name);
  writeFileSync(path, `${raw}\n`, "utf8");
  chmodSync(path, 0o600);

  res.writeHead(200, headers);
  res.end("paired: credential received, return to the terminal");
  server.close();

  // Verify by opening the seat: proves the credential is live and names the
  // civ, so a paired wrong-profile seat is caught here rather than on the
  // first confused read.
  try {
    const seat = await Seat.open(["--seat", name, ...(host !== null ? ["--host", host] : [])]);
    console.error(`paired: ${seat.civName}, year ${Math.floor(seat.nowYear)} AE  (.seats/${name})`);
    seat.close();
    process.exit(0);
  } catch (error) {
    console.error(
      `credential stored at .seats/${name}, but the verifying read failed:\n${error.message}`,
    );
    process.exit(1);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`port ${port} is busy: pass a different one with --port`);
  } else {
    console.error(String(error.message ?? error));
  }
  process.exit(1);
});

const TIMEOUT_MS = 5 * 60 * 1000;
setTimeout(() => {
  console.error("no credential arrived in five minutes; run it again when ready");
  process.exit(1);
}, TIMEOUT_MS).unref();
server.listen(port, "127.0.0.1", () => {
  const snippet =
    `fetch("http://127.0.0.1:${port}${PATH}",{method:"POST",` +
    `body:new URLSearchParams({a:localStorage["holos.account"]||"",` +
    `t:localStorage["holos.token"]||""})}).then(r=>r.text()).then(console.log,console.log)`;
  console.log(`pairing .seats/${name} — listening on 127.0.0.1:${port}, single use\n`);
  console.log(`On THIS machine, in the browser you play in, open the game, then the`);
  console.log(`DevTools console (Cmd-Opt-J), and paste:\n`);
  console.log(`  ${snippet}\n`);
  console.log(`Chrome may ask you to type "allow pasting" first; that guard is about`);
  console.log(`code from strangers, and this line only talks to 127.0.0.1 and carries`);
  console.log(`no secret. This command finishes by itself once the credential lands.`);
});
