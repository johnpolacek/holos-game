// The production read seat — one socket, one credential, an allowlist of frames.
//
// WHY THIS EXISTS. Production withholds itself on purpose: `devEndpointsOpen`
// (server/src/cohort.ts) opens /dev/state and /dev/sky only for a local
// hostname or for HOLOS_DEV_ENDPOINTS, and that flag lives in `.dev.vars` and
// is deliberately absent from wrangler.jsonc, because what it unlocks is
// exactly the truth the knowledge layer exists to withhold. Durable Object
// storage has no CLI read path either. So the only honest way to look at a
// live run is the way a player looks at it: join the cohort on that player's
// own credential and read what the server chooses to send.
//
// That is a real capability and it deserves a real bound, which is the
// allowlist below. A script built on this module CANNOT open a study, launch a
// mission, hail anyone or spend a compute — not because it declines to, but
// because `send` refuses any frame outside READ_ONLY. Pointing a tool at
// production is a thing you do to READ.
//
// A DEV TOOL. Zero dependencies, never imported by anything that ships, and it
// prints no credential ever (accounts.ts's "NOTHING HERE EVER LOGS", carried
// over to the one place outside the server that holds a key).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = join(HERE, "..", "..");

/** Where credentials live: one file per seat, gitignored. See docs/prod-read.md. */
const SEAT_DIR = join(REPO, ".seats");

/** The client's room, hard-coded there too (client/src/net.ts's ROOM). */
export const DEFAULT_ROOM = "genesis";
export const DEFAULT_HOST = "playholos.com";

/**
 * THE SAFETY PROPERTY: the only frames this module will put on the wire.
 *
 * `hello` is the handshake and unavoidable. `requestSky` and `requestReport`
 * are the two re-reads whose handlers take no player action — they re-serve
 * state the connection is already entitled to. Every other arm of
 * CohortClientMessage is an ACT: it opens a study, spends compute, commits a
 * contact, sends a signal.
 *
 * Adding a frame here is not a formality. Read its handler in cohort.ts first
 * and confirm it writes nothing a player would notice; the sendReport note in
 * `open` below is what happens when a handshake alone has a cost.
 */
const READ_ONLY = new Set(["hello", "requestSky", "requestReport"]);

/**
 * Crockford base32 as accounts.ts publishes it, and the same fold its
 * `normalizeAccountKey` applies (O -> 0, I/L -> 1, unknown characters
 * dropped). Mirrored rather than imported for the playtest-bot reason:
 * server/dist is compiled with extensionless relative specifiers that Node's
 * ESM loader will not resolve. Drift shows up as a refused credential.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ACCOUNT_KEY_SYMBOLS = 20; // accounts.ts

function normalizeAccountKey(raw) {
  let out = "";
  for (const ch of raw.toUpperCase()) {
    const folded = ch === "O" ? "0" : ch === "I" || ch === "L" ? "1" : ch;
    if (!CROCKFORD.includes(folded)) continue;
    out += folded;
    if (out.length > ACCOUNT_KEY_SYMBOLS) return null;
  }
  return out.length === ACCOUNT_KEY_SYMBOLS ? out : null;
}

/** `--name value` out of argv, or a default. */
export function flag(argv, name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || i + 1 >= argv.length ? fallback : argv[i + 1];
}

export function has(argv, name) {
  return argv.includes(`--${name}`);
}

/**
 * The credential for a seat, as the two things `hello` carries.
 *
 * A run token and an account key are both opaque strings, and telling them
 * apart is not a guess: a key normalizes to exactly 20 Crockford symbols, a
 * token is a randomUUID (32 hex symbols, which normalizes to null). So the
 * same normalizer the server uses classifies the file for us, and typing the
 * key with its display hyphens in works here exactly as it works in the game.
 *
 * net.ts's XOR holds on this side too: whichever one this returns, the other
 * is null.
 */
export function readCredential(argv) {
  const fromEnvAccount = process.env.HOLOS_ACCOUNT ?? null;
  const fromEnvToken = process.env.HOLOS_TOKEN ?? null;
  if (fromEnvAccount !== null) return { account: normalizeAccountKey(fromEnvAccount), token: null };
  if (fromEnvToken !== null) return { account: null, token: fromEnvToken.trim() };

  const name = flag(argv, "seat", "default");
  const path = join(SEAT_DIR, name);
  let raw;
  try {
    raw = readFileSync(path, "utf8").trim();
  } catch {
    throw new Error(
      `no credential at .seats/${name}\n\n` +
        "On the device you play on, at playholos.com, open the console and copy\n" +
        "  localStorage['holos.account']   (a claimed seat: the 20-symbol key)\n" +
        "  localStorage['holos.token']     (an unclaimed seat: a UUID)\n" +
        `then write it to .seats/${name} (gitignored). See docs/prod-read.md.`,
    );
  }
  if (raw.length === 0) throw new Error(`.seats/${name} is empty`);

  const account = normalizeAccountKey(raw);
  return account !== null ? { account, token: null } : { account: null, token: raw };
}

/**
 * A joined, placed seat. `open` resolves once the server has said `welcome`
 * and named the civilization, so a caller can trust `seat.civName` and then
 * ask for what it came for.
 */
export class Seat {
  #socket;
  #waiters = [];
  #closed = false;

  constructor(socket) {
    this.#socket = socket;
    this.civName = null;
    this.nowYear = null;
    this.lastSky = null;
  }

  /**
   * Join and wait to be placed.
   *
   * ONE COST, AND IT IS NOT NOTHING. `hello` on a placed seat makes the server
   * call `sendReport(..., { advance: true })` (cohort.ts, the placed arm of
   * onHello), which persists `lastServedYear = nowYear`. That marker is what
   * report.ts triages against, so running any tool built on this module
   * consumes the player's "new since last visit" baseline: their next open may
   * not fire a header it otherwise would, and may not attach the archetype
   * remark to a promoted entry. The report TEXT is unaffected (entries are
   * frozen at materialization), and the Report tab's own badge is client-side
   * (client/src/app.ts's reportSeenKey), so what is lost is the framing, not
   * the annal. There is no client-side way to avoid it: the advance rides the
   * handshake, not the request.
   */
  static async open(argv, { quiet = false } = {}) {
    const host = flag(argv, "host", DEFAULT_HOST);
    const room = flag(argv, "room", DEFAULT_ROOM);
    const credential = readCredential(argv);

    const local = host.startsWith("localhost") || host.startsWith("127.");
    const url = `${local ? "ws" : "wss"}://${host}/parties/cohort/${room}`;
    if (!quiet) console.error(`# ${url}`);

    if (typeof WebSocket === "undefined") {
      throw new Error("no global WebSocket: this script needs Node 22 or newer");
    }

    const socket = new WebSocket(url);
    const seat = new Seat(socket);

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "sky") {
        seat.lastSky = msg;
        seat.nowYear = msg.nowYear;
        seat.civName = msg.self?.seed?.name ?? seat.civName;
      }
      seat.#deliver(msg);
    });

    socket.addEventListener("close", () => {
      seat.#closed = true;
      seat.#fail(new Error("socket closed"));
    });
    socket.addEventListener("error", () => {
      seat.#fail(new Error(`cannot reach ${url}`));
    });

    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error(`cannot reach ${url}`)), {
        once: true,
      });
    });

    seat.send({ type: "hello", token: credential.token, account: credential.account });

    const welcome = await seat.waitFor("welcome");
    if (welcome.phase !== "placed") {
      throw new Error("this seat has no civilization yet (the ceremony is unfinished)");
    }
    // The name rides `sky`, which the placed arm of onHello sends unprompted.
    await seat.waitFor("sky");
    return seat;
  }

  /** Put one frame on the wire, or refuse. See READ_ONLY. */
  send(message) {
    if (!READ_ONLY.has(message.type)) {
      throw new Error(
        `refusing to send "${message.type}" from a prod read tool. ` +
          "Only hello, requestSky and requestReport are allowed (scripts/prod/seat.mjs).",
      );
    }
    this.#socket.send(JSON.stringify(message));
  }

  /**
   * The next message of a type. An `error` frame from the server rejects
   * whatever is waiting, so a refused credential surfaces as a refusal rather
   * than as a timeout.
   */
  waitFor(type, timeoutMs = 20000) {
    if (this.#closed) return Promise.reject(new Error("socket closed"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#drop(waiter);
        reject(new Error(`timed out waiting for "${type}"`));
      }, timeoutMs);
      const waiter = { type, resolve, reject, timer };
      this.#waiters.push(waiter);
    });
  }

  /** Ask for a re-read and await its reply. */
  async ask(message, replyType) {
    const pending = this.waitFor(replyType);
    this.send(message);
    return pending;
  }

  close() {
    this.#closed = true;
    this.#socket.close();
  }

  #deliver(msg) {
    if (msg.type === "error") {
      // A bad credential is terminal; anything else is a refusal of some frame
      // we did not send, so it is noise to a read tool.
      if (msg.code === "bad-account" || msg.code === "token-claimed") {
        this.#fail(new Error(`server refused the credential: ${msg.code}`));
      }
      return;
    }
    const waiter = this.#waiters.find((w) => w.type === msg.type);
    if (waiter === undefined) return;
    this.#drop(waiter);
    clearTimeout(waiter.timer);
    waiter.resolve(msg);
  }

  #drop(waiter) {
    const i = this.#waiters.indexOf(waiter);
    if (i !== -1) this.#waiters.splice(i, 1);
  }

  #fail(error) {
    const waiting = this.#waiters.splice(0);
    for (const w of waiting) {
      clearTimeout(w.timer);
      w.reject(error);
    }
  }
}

/** Run a read against one seat and exit. Every script here is this shape. */
export async function withSeat(argv, body) {
  let seat = null;
  try {
    seat = await Seat.open(argv);
    console.error(`# ${seat.civName}, year ${Math.floor(seat.nowYear)} AE`);
    await body(seat);
    process.exit(0);
  } catch (error) {
    console.error(String(error.message ?? error));
    process.exit(1);
  } finally {
    if (seat !== null) seat.close();
  }
}
