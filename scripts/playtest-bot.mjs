#!/usr/bin/env node
// The playtest bot — headless players on the REAL player wire.
//
// WHY THIS EXISTS. Holos is a multiplayer game whose whole subject is what
// arrives from someone else, and one person cannot open two browsers and still
// be surprised. A2.6 retired freeform and made human and AI threads
// byte-indistinguishable, so a bot that speaks the shipped client vocabulary is
// indistinguishable BY CONSTRUCTION: it takes up sources, runs vigils, buys
// questions, hails, trades composed signals and answers the mutual quiet
// through exactly the messages `client/src/net.ts` sends. It is not a second
// species of AI counterpart (traffic.ts already owns those, server-side and
// rule-based) — it is a second seat.
//
// A DEV TOOL, and nothing shipped may import it. It lives in scripts/, has ZERO
// dependencies, and talks to a local `wrangler dev` only.
//
// WHAT IT IMPORTS FROM THE SERVER, and why almost nothing. `server/dist/*.js`
// is compiled with `moduleResolution: bundler`, so its relative specifiers are
// EXTENSIONLESS and Node's ESM loader will not resolve them; importing any
// module with a relative import inside it fails. So the handful of constants
// this policy needs are hand-rolled below, each one naming the server file it
// mirrors, and drift shows up as a rejected intent rather than as silence. The
// ONE exception is the name lexicon: `server/src/names.ts` is deliberately
// dependency-free (it re-exports through protocol.ts to the client for the same
// reason), so its compiled form has no relative imports and loads cleanly. It is
// tried optionally and falls back to a fixed list when `server/dist` is absent.
//
// NO PLAYER PROSE ANYWHERE. There is no freeform field on this wire and this
// script does not invent one: signals are SELECTORS, materialized server-side
// from the sender's own state (signalparts.ts). The one authored string a bot
// writes is its civilization's name, at the ceremony, exactly as a person does.
//
// Usage:
//   node scripts/playtest-bot.mjs --bots 2 [--host localhost:8787]
//                                 [--room genesis] [--seed <string>] [--verbose]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

// ---------------------------------------------------------------------------
// Constants mirrored from the server
// ---------------------------------------------------------------------------
// Every one of these is a copy, and the comment beside it is the original. A
// bot that violates one gets an error code back and drops the intent, so the
// cost of drift is a logged refusal rather than a wrong game.

const MAX_PARTS_PER_SIGNAL = 4; // signalparts.ts
const MAX_SIGNALS_PER_THREAD = 24; // contact.ts
const SIGNAL_COOLDOWN_YEARS = 0.2; // contact.ts
const MIN_DELIBERATION_YEARS = 0.32; // contact.ts
const SIGNAL_TONES = ["plain", "open", "guarded", "urgent", "reluctant"]; // signalparts.ts
const TRIPWIRE_KINDS = ["regress", "leakage-stops", "crosses"]; // studies.ts
const CROSS_SHARE = 0.7; // studies.ts — the share a call waits for
const REAL_MS_PER_GAME_YEAR = 5 * 60 * 1000; // clock.ts
const MAX_NAME_LEN = 24; // protocol.ts

/** Fallback civilization-name parts, used when `server/dist` has not been
 *  built. Same register as names.ts, and every pairing is validateName-clean
 *  (letters and hyphens only, well inside MAX_NAME_LEN). */
const FALLBACK_HEADS = ["Stone", "Tide", "Ember", "Frost", "Vault", "Rift", "Salt", "Reed"];
const FALLBACK_TAILS = ["binders", "weavers", "keepers", "wardens", "shapers", "tenders"];

/** The game's own lexicon when it is on disk, the fallback otherwise. See the
 *  header: names.ts is the one compiled module with no relative imports. */
async function loadLexicon() {
  try {
    const mod = await import(join(REPO, "server", "dist", "names.js"));
    if (Array.isArray(mod.NAME_HEADS) && Array.isArray(mod.NAME_TAILS)) {
      return { heads: mod.NAME_HEADS, tails: mod.NAME_TAILS, source: "server/dist/names.js" };
    }
  } catch {
    // Not built, or built differently. The fallback is a complete answer.
  }
  return { heads: FALLBACK_HEADS, tails: FALLBACK_TAILS, source: "built-in list" };
}

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------
// One stream per bot, derived from --seed and the bot index, so a rerun with
// the same flags produces the same personalities and the same choices. Written
// out here rather than imported from rng.ts for the reason in the header.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedString) {
  const next = mulberry32(xmur3(seedString)());
  return {
    next,
    /** Uniform in [lo, hi). */
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const opts = {
    bots: 1,
    host: "localhost:8787",
    room: "genesis",
    seed: "holos-playtest",
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    switch (flag) {
      case "--bots":
        opts.bots = Math.max(1, Math.min(8, Number(value) || 1));
        i++;
        break;
      case "--host":
        opts.host = String(value ?? opts.host);
        i++;
        break;
      case "--room":
        opts.room = String(value ?? opts.room);
        i++;
        break;
      case "--seed":
        opts.seed = String(value ?? opts.seed);
        i++;
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      case "--help":
        console.log(
          "usage: node scripts/playtest-bot.mjs [--bots N] [--host localhost:8787] " +
            "[--room genesis] [--seed <string>] [--verbose]",
        );
        process.exit(0);
        break;
      default:
        break;
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Seat persistence
// ---------------------------------------------------------------------------
// A bot's run token is its seat (cohort.ts's RunRecord). Persisting it under
// .playtest/ is what makes a rerun resume the SAME civilization instead of
// filling the cohort with abandoned ones. The directory is gitignored.

const SEAT_DIR = join(REPO, ".playtest");

function seatPath(room, index) {
  return join(SEAT_DIR, `${room}-bot${index}.token`);
}

function readSeat(room, index) {
  try {
    const raw = readFileSync(seatPath(room, index), "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function writeSeat(room, index, token) {
  mkdirSync(SEAT_DIR, { recursive: true });
  writeFileSync(seatPath(room, index), `${token}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// The bot
// ---------------------------------------------------------------------------

class PlaytestBot {
  constructor(index, opts, lexicon) {
    this.index = index;
    this.opts = opts;
    this.rng = makeRng(`${opts.seed}#${index}`);
    this.lexicon = lexicon;

    this.name = `bot${index}`;
    this.token = readSeat(opts.room, index);
    this.socket = null;
    this.closed = false;
    this.backoffMs = 1000;

    // Wire state, replaced wholesale on each `sky`.
    this.clock = null;
    this.missionCatalog = null;
    this.sky = null;
    this.placed = false;
    this.becomeSent = false;

    // Policy state.
    this.ticks = 0;
    this.timer = null;
    this.hailedUnprompted = false;
    this.readingThread = null; // the starId whose detail we asked for
    this.lastSignalYear = new Map(); // starId -> our own last send, game years

    // The seeded disposition. `quiet` bots offer and accept the mutual quiet;
    // the others decline it, which is what makes the accord a real move
    // instead of a formality the playtester always sees succeed.
    this.quiet = this.rng.chance(0.5);
    this.studyTarget = 2 + this.rng.int(2); // 2 or 3 vigils it means to hold
    this.tripwireHabit = this.rng.range(0.2, 0.5);
    this.probeHabit = this.rng.range(0.2, 0.45);
  }

  log(line) {
    console.log(`[${this.tag()}] ${line}`);
  }

  trace(line) {
    if (this.opts.verbose) console.log(`[${this.tag()}] · ${line}`);
  }

  tag() {
    return `bot${this.index} ${this.name}`;
  }

  // ── the socket ────────────────────────────────────────────────────────
  // partysocket adds a `_pk` connection id and a reconnect policy and nothing
  // else the server reads (partyserver mints an id when the param is absent),
  // so a native WebSocket at the same path is the same client.

  url() {
    return `ws://${this.opts.host}/parties/cohort/${this.opts.room}`;
  }

  connect() {
    if (this.closed) return;
    const socket = new WebSocket(this.url());
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.backoffMs = 1000;
      this.trace("socket open");
      this.send({ type: "hello", token: this.token, account: null });
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this.onMessage(msg);
    });

    socket.addEventListener("close", () => {
      if (this.closed) return;
      this.stopTicking();
      const wait = this.backoffMs;
      this.backoffMs = Math.min(30000, this.backoffMs * 2);
      this.log(`socket closed; reconnecting in ${Math.round(wait / 1000)}s`);
      setTimeout(() => this.connect(), wait);
    });

    // Node surfaces socket failures as an error event; the close handler owns
    // the retry, so this only needs to keep the process from tripping over it.
    socket.addEventListener("error", () => {
      this.trace("socket error");
    });
  }

  stop() {
    this.closed = true;
    this.stopTicking();
    if (this.socket !== null) this.socket.close();
  }

  send(message) {
    if (this.socket === null || this.socket.readyState !== 1) return;
    this.trace(`→ ${message.type}`);
    this.socket.send(JSON.stringify(message));
  }

  // ── inbound ───────────────────────────────────────────────────────────

  onMessage(msg) {
    switch (msg.type) {
      case "welcome":
        this.clock = msg.clock;
        this.missionCatalog = msg.missionCatalog ?? null;
        // A welcome's token is non-null only on an anonymous seat, which is
        // the only kind a bot ever holds (net.ts's XOR, from the other side).
        if (typeof msg.token === "string") {
          this.token = msg.token;
          writeSeat(this.opts.room, this.index, msg.token);
        }
        this.trace(`welcome, phase ${msg.phase}`);
        return;
      case "clock":
        this.clock = msg.clock;
        return;
      case "offer":
        this.onOffer(msg.candidates ?? []);
        return;
      case "sky":
        this.onSky(msg);
        return;
      case "error":
        this.onError(msg);
        return;
      default:
        // voice, report, sourceNamed, accountKey: nothing a bot acts on.
        return;
    }
  }

  onError(msg) {
    // Every refusal is logged and the intent is dropped. The floors
    // (`contact-unavailable` on a turnaround that has not elapsed) are
    // ordinary and simply retried on a later tick.
    this.log(`refused: ${msg.code} (${msg.message})`);
    if (msg.code === "token-claimed") {
      this.token = null;
      this.send({ type: "hello", token: null, account: null });
    }
  }

  onOffer(candidates) {
    if (this.becomeSent || candidates.length === 0) return;
    const chosen = candidates[this.rng.int(candidates.length)];
    this.name = this.mintName();
    this.becomeSent = true;
    this.log(`becoming ${chosen.archetypeName} at the ceremony, as ${this.name}`);
    this.send({ type: "become", candidateId: chosen.candidateId, name: this.name });
  }

  /** A name from the game's own lexicon, clipped to the wire's bound the way
   *  `validateName` measures it. */
  mintName() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = `${this.rng.pick(this.lexicon.heads)}${this.rng.pick(this.lexicon.tails)}`;
      const collapsed = candidate.replace(/\s+/g, " ").trim();
      if (collapsed.length >= 1 && collapsed.length <= MAX_NAME_LEN) return collapsed;
    }
    return `Bot${this.index}`;
  }

  onSky(sky) {
    const first = !this.placed;
    this.sky = sky;
    this.placed = true;
    if (first) {
      const home = sky.self?.designation ?? "somewhere";
      this.name = sky.self?.seed?.name ?? this.name;
      this.log(`placed at ${home}, ${sky.sources.length} sources in the sky`);
      this.startTicking();
    }
  }

  // ── the clock ─────────────────────────────────────────────────────────

  nowYear() {
    if (this.sky !== null && this.clock === null) return this.sky.nowYear;
    if (this.clock === null) return 0;
    const { epochRealMs, epochGameYear, realMsPerGameYear } = this.clock;
    const perYear = realMsPerGameYear || REAL_MS_PER_GAME_YEAR;
    return epochGameYear + (Date.now() - epochRealMs) / perYear;
  }

  /** Compute accrues locally between skies and saturates at the attention
   *  ceiling, exactly as the client's own budget chip does. */
  freeCompute() {
    const budget = this.sky?.budget;
    if (budget === undefined) return 0;
    const elapsed = Math.max(0, this.nowYear() - budget.asOfYear);
    return Math.min(budget.cap, budget.free + budget.ratePerYear * elapsed);
  }

  // ── the tick ──────────────────────────────────────────────────────────
  // ONE ACTION PER TICK, on a seeded 15 to 40 second jitter. A bot that acted
  // on every sky would empty its compute in a burst and read as a script; a
  // slow single-intent loop reads as somebody thinking.

  startTicking() {
    if (this.timer !== null) return;
    this.scheduleTick();
  }

  stopTicking() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  scheduleTick() {
    const wait = this.rng.range(15000, 40000);
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        this.tick();
      } catch (err) {
        this.log(`policy error: ${String(err)}`);
      }
      this.scheduleTick();
    }, wait);
  }

  tick() {
    if (!this.placed || this.sky === null) return;
    this.ticks++;
    const acted =
      this.tryHailBack() ||
      this.tryReply() ||
      this.tryReadThread() ||
      this.tryFirstHail() ||
      this.tryCallStudy() ||
      this.tryEngageStudy() ||
      this.tryBuyQuestion() ||
      this.tryArmTripwire() ||
      this.tryLaunchProbe();
    // A tick that decided nothing still wants a fresh sky: the next decision
    // depends on light that may have landed since (`requestSky` is the same
    // refresh the client makes).
    if (!acted) this.send({ type: "requestSky" });
  }

  // ── contact ───────────────────────────────────────────────────────────

  sources() {
    return this.sky?.sources ?? [];
  }

  threads() {
    return this.sky?.contact?.threads ?? [];
  }

  designationOf(starId) {
    const source = this.sources().find((s) => s.starId === starId);
    return source?.designation ?? starId;
  }

  /** Someone aimed a beam at us and we have never aimed one back. The wire
   *  says so twice over: the source classifies as a directed beam, and a
   *  thread row exists that we may not speak into (`canSpeak` is false until
   *  we have hailed). Either is enough. */
  tryHailBack() {
    const stance = this.sky?.contact?.hail;
    if (stance === undefined) return false;
    const hailedUs = this.threads().filter((t) => !t.canSpeak);
    const beams = this.sources().filter(
      (s) => s.signal.classification === "directed-beam" && !this.threads().some(
        (t) => t.starId === s.starId && t.canSpeak,
      ),
    );
    const target =
      hailedUs.map((t) => t.starId).find((id) => this.sources().some((s) => s.starId === id)) ??
      beams.sort((a, b) => a.distanceLy - b.distanceLy)[0]?.starId ??
      null;
    if (target === null) return false;
    this.log(`hailing back at ${this.designationOf(target)}, whose beam landed here`);
    this.send({
      type: "commitContact",
      choice: "hail",
      starId: target,
      // CONSENT, NEVER PRICE (protocol.ts): the server recomputes the mind's
      // resistance and charges what it computes. This flag only says the
      // objection was read.
      acknowledged: stance.contested === true,
      // KN: answering a knock is a bare knock. Between this and the unprompted
      // hail below, a run puts both shapes of opener on a human's rack.
      named: false,
    });
    return true;
  }

  /** One unprompted hail per run, at the nearest source, a few ticks in — so a
   *  solo playtester gets hailed without having to do anything first. */
  tryFirstHail() {
    if (this.hailedUnprompted || this.ticks < 3) return false;
    // KN: this one carries the charter, so a solo playtester is knocked on by
    // a NAMED opener without having to do anything first. Its price is the
    // named knock's own stance, which rides the same sky.
    const stance = this.sky?.contact?.namedHail ?? this.sky?.contact?.hail;
    if (stance === undefined) return false;
    const spoken = new Set(this.threads().filter((t) => t.canSpeak).map((t) => t.starId));
    const target = this.sources()
      .filter((s) => !spoken.has(s.starId))
      .sort((a, b) => a.distanceLy - b.distanceLy)[0];
    if (target === undefined) return false;
    this.hailedUnprompted = true;
    this.log(
      `hailing ${target.designation} at ${target.distanceLy.toFixed(1)} light years, unprompted`,
    );
    this.send({
      type: "commitContact",
      choice: "hail",
      starId: target.starId,
      acknowledged: stance.contested === true,
      named: true,
    });
    return true;
  }

  /** Ask for a thread's detail. Composing a reply needs the signals and their
   *  part counts, and only the thread THIS CONNECTION has open carries them
   *  (protocol.ts's `openThread` is per-connection UI state). */
  tryReadThread() {
    const open = this.sky?.contact?.openThread ?? null;
    const answered = this.threads().filter(
      (t) => t.canSpeak && t.state === "answered" && t.signalCount < MAX_SIGNALS_PER_THREAD,
    );
    const next = answered.find((t) => open === null || open.starId !== t.starId);
    if (next === undefined) return false;
    this.readingThread = next.starId;
    this.trace(`reading the thread at ${this.designationOf(next.starId)}`);
    this.send({ type: "openThread", starId: next.starId });
    return true;
  }

  /** A composed reply on the open thread, when it is our turn and the floors
   *  have passed. On `contact-unavailable` the intent is dropped and the next
   *  tick tries again, which is what the turnaround floor is for. */
  tryReply() {
    const detail = this.sky?.contact?.openThread ?? null;
    if (detail === null || !detail.canSpeak) return false;
    if (detail.signalCount >= MAX_SIGNALS_PER_THREAD) return false;

    const now = this.nowYear();
    const theirs = detail.signals.filter((s) => s.from === "them");
    const ours = detail.signals.filter((s) => s.from === "you");
    const lastTheirs = theirs[theirs.length - 1];
    const lastOurs = ours[ours.length - 1];

    // Nothing to answer yet.
    if (lastTheirs === undefined) return false;
    // The turnaround floor and the cooldown, mirrored so the common case is a
    // quiet wait rather than a refusal.
    if (now - lastTheirs.arrivesYear < MIN_DELIBERATION_YEARS) return false;
    if (lastOurs !== undefined && now - lastOurs.sentYear < SIGNAL_COOLDOWN_YEARS) return false;
    const lastSent = this.lastSignalYear.get(detail.starId);
    if (lastSent !== undefined && now - lastSent < SIGNAL_COOLDOWN_YEARS) return false;
    // Only answer what is actually newer than our own last word.
    if (lastOurs !== undefined && lastTheirs.arrivesYear <= lastOurs.sentYear) return false;

    const { parts, tone, summary } = this.compose(detail, lastTheirs);
    this.lastSignalYear.set(detail.starId, now);
    this.log(`answering ${this.designationOf(detail.starId)} ${summary}; tone ${tone}`);
    this.send({ type: "sendSignal", starId: detail.starId, tone, parts });
    return true;
  }

  /**
   * The composer. SELECTORS ONLY — every part below points at something this
   * bot already holds, and the server materializes the actual bytes from its
   * own state (signalparts.ts). The caps are the server's: four parts, and one
   * of each kind except archive and verdict.
   */
  compose(detail, lastTheirs) {
    const parts = [];
    const notes = [];
    const accord = detail.accord ?? {};

    // The mutual quiet answers first, because it is the move that decides
    // whether the thread continues at all.
    if (accord.canAccept === true) {
      // `ref` is left null on purpose: there is exactly one offer on the
      // table, the server resolves it, and naming the wrong row would be a
      // malformed signal rather than a miss (signalparts.ts's
      // `materializeAccord`).
      if (this.quiet) {
        parts.push({ kind: "accord", move: "accept", ref: null });
        notes.push("accepting the quiet");
      } else {
        parts.push({ kind: "accord", move: "decline", ref: null });
        notes.push("declining the quiet");
      }
    } else if (accord.canOffer === true && this.quiet && detail.signalCount >= 5) {
      parts.push({ kind: "accord", move: "offer", ref: null });
      notes.push("offering the mutual quiet");
    }

    // A carrier: a beam with nothing on it, arriving dated. Legal, ordinary,
    // and the most light-lag-native thing anyone can say.
    if (parts.length === 0 && this.rng.chance(0.12)) {
      return { parts: [], tone: this.pickTone(), summary: "with a carrier and nothing on it" };
    }

    // Reciprocate: a verdict on what they sent. Prefer their finding, which is
    // the part a verdict is really for.
    if (parts.length < MAX_PARTS_PER_SIGNAL && Array.isArray(lastTheirs.parts)) {
      const findingIndex = lastTheirs.parts.findIndex((p) => p.kind === "finding");
      const index = findingIndex >= 0 ? findingIndex : lastTheirs.parts.length > 0 ? 0 : -1;
      if (index >= 0) {
        const stance = this.rng.chance(0.75)
          ? "confirm"
          : this.rng.chance(0.5)
            ? "contradict"
            : "nothing";
        parts.push({ kind: "verdict", signalId: lastTheirs.id, partIndex: index, stance });
        notes.push(`a ${stance} on their ${lastTheirs.parts[index].kind}`);
      }
    }

    // Our own contribution: a called study's frozen belief if we have one,
    // otherwise our own light record. `full` carries the working; `headline`
    // leaves it out, and the reader can see that it was left out.
    const called = (this.sky?.studies ?? []).find((s) => s.status === "called" && s.call !== null);
    if (parts.length < MAX_PARTS_PER_SIGNAL) {
      if (called !== undefined) {
        const depth = this.rng.chance(0.6) ? "full" : "headline";
        parts.push({ kind: "finding", starId: called.starId, depth });
        notes.push(`a ${depth} finding on ${this.designationOf(called.starId)}`);
      } else if (this.sky?.self?.starId !== undefined) {
        parts.push({ kind: "archive", starId: this.sky.self.starId, window: "recent" });
        notes.push("our own recent light");
      }
    }

    // The sprinkle: a sighting from our own sky, a line of who we are, or a
    // want. Seeded, and always inside the caps.
    if (parts.length < MAX_PARTS_PER_SIGNAL && this.rng.chance(0.4)) {
      const elsewhere = this.sources()
        .filter((s) => s.starId !== detail.starId)
        .sort((a, b) => a.distanceLy - b.distanceLy)[0];
      if (elsewhere !== undefined) {
        parts.push({ kind: "sighting", starId: elsewhere.starId });
        notes.push(`a sighting of ${elsewhere.designation}`);
      }
    }
    if (parts.length < MAX_PARTS_PER_SIGNAL && this.rng.chance(0.35)) {
      // charter, chronicle line 0 or 1, or the first dial: all three resolve
      // against every seed the ceremony can hand out.
      const source = this.rng.pick(["charter", "chronicle", "dial"]);
      const index = source === "chronicle" ? this.rng.int(2) : 0;
      parts.push({ kind: "culture", source, index });
      notes.push(`a word about who we are (${source})`);
    }
    if (parts.length < MAX_PARTS_PER_SIGNAL && this.rng.chance(0.3)) {
      const want = this.rng.pick(["finding", "sighting", "archive", "culture"]);
      parts.push({ kind: "request", want, starId: null });
      notes.push(`asking for a ${want}`);
    }

    return {
      parts: parts.slice(0, MAX_PARTS_PER_SIGNAL),
      tone: this.pickTone(),
      summary: notes.length > 0 ? `with ${notes.join(", ")}` : "with nothing on it",
    };
  }

  /** Mostly plain. A tone has no truth conditions, so the mix is a
   *  personality and not a claim. */
  pickTone() {
    return this.rng.chance(0.6) ? "plain" : this.rng.pick(SIGNAL_TONES);
  }

  // ── the vigil ─────────────────────────────────────────────────────────

  studies() {
    return this.sky?.studies ?? [];
  }

  openStudies() {
    return this.studies().filter((s) => s.status === "open");
  }

  /** The boards on sources this bot holds no record on. A study stands on
   *  every source from the moment it is found, so these arrive fully built —
   *  hypotheses, prices and all — and cost nothing to read. */
  ambient() {
    return this.sky?.ambient ?? [];
  }

  /**
   * Keep two or three vigils running on the nearest sources — by ACTING on
   * them.
   *
   * AS: there is no "begin the watch" any more. The board is already standing
   * on every source; what the Desk lists, and what `sky.studies` carries, is
   * the sources this civilization has put something into. So taking one up
   * means spending: the cheapest question this bot can afford on the nearest
   * ambient board, or, when it can afford nothing, a standing order on it —
   * both are acts the server must remember, and either one materializes the
   * record in the same write. `studyTarget` is unchanged in meaning; it just
   * counts boards acted on rather than boards filed.
   */
  tryEngageStudy() {
    if (this.openStudies().length >= this.studyTarget) return false;
    const free = this.freeCompute();
    const distance = new Map(this.sources().map((s) => [s.starId, s.distanceLy]));
    const nearest = this.ambient()
      .slice()
      .sort(
        (a, b) =>
          (distance.get(a.starId) ?? Infinity) - (distance.get(b.starId) ?? Infinity),
      );
    for (const board of nearest) {
      const question = (board.openQuestions ?? [])
        .filter((q) => q.state === "offered" && q.costCompute <= free)
        .sort((a, b) => a.costCompute - b.costCompute)[0];
      if (question !== undefined) {
        this.log(
          `took up ${this.designationOf(board.starId)} by buying "${question.label}" ` +
            `for ${question.costCompute} compute`,
        );
        this.send({ type: "buyQuestion", starId: board.starId, questionId: question.id });
        return true;
      }
      const wire = (board.tripwires ?? []).find((t) => t.state === "available");
      if (wire !== undefined) {
        this.log(
          `took up ${this.designationOf(board.starId)} with a standing ${wire.kind} order, ` +
            `nothing there being affordable yet`,
        );
        this.send({ type: "armTripwire", starId: board.starId, kind: wire.kind });
        return true;
      }
    }
    return false;
  }

  /** The cheapest affordable question on the FLATTEST board — the study whose
   *  leading reading is least settled is the one worth paying to sharpen. */
  tryBuyQuestion() {
    const free = this.freeCompute();
    const boards = this.openStudies()
      .map((study) => {
        const offered = (study.openQuestions ?? [])
          .filter((q) => q.state === "offered" && q.costCompute <= free)
          .sort((a, b) => a.costCompute - b.costCompute);
        return { study, question: offered[0], lead: leadShare(study) };
      })
      .filter((row) => row.question !== undefined)
      .sort((a, b) => a.lead - b.lead);
    const chosen = boards[0];
    if (chosen === undefined) return false;
    this.log(
      `bought "${chosen.question.label}" on ${this.designationOf(chosen.study.starId)} ` +
        `for ${chosen.question.costCompute} compute`,
    );
    this.send({
      type: "buyQuestion",
      starId: chosen.study.starId,
      questionId: chosen.question.id,
    });
    return true;
  }

  /** Leave a standing order now and then. `crosses` is the one that matters to
   *  a watcher: it fires when the board makes up its mind without them. */
  tryArmTripwire() {
    if (!this.rng.chance(this.tripwireHabit)) return false;
    for (const study of this.openStudies()) {
      const kind = this.rng.chance(0.7) ? "crosses" : this.rng.pick(TRIPWIRE_KINDS);
      const row = (study.tripwires ?? []).find((t) => t.kind === kind);
      if (row === undefined || row.state !== "available") continue;
      this.log(`armed the ${kind} tripwire on ${this.designationOf(study.starId)}`);
      this.send({ type: "armTripwire", starId: study.starId, kind });
      return true;
    }
    return false;
  }

  /** Done arguing: the lead has crossed and two answers stand behind it. */
  tryCallStudy() {
    for (const study of this.openStudies()) {
      const answered = (study.openQuestions ?? []).filter((q) => q.state === "answered").length;
      const lead = leadShare(study);
      if (lead < CROSS_SHARE || answered < 2) continue;
      this.log(
        `called the study on ${this.designationOf(study.starId)} at ` +
          `${Math.round(lead * 100)} percent, on ${answered} answers`,
      );
      this.send({ type: "callStudy", starId: study.starId });
      return true;
    }
    return false;
  }

  /** An assay at the nearest studied source, occasionally, once affordable. */
  tryLaunchProbe() {
    if (this.missionCatalog === null) return false;
    if (!this.rng.chance(this.probeHabit)) return false;
    const kind = this.missionCatalog.kinds.find((k) => k.kind === "assay");
    if (kind === undefined) return false;
    if (this.freeCompute() < kind.costCompute) return false;

    const live = new Set(
      (this.sky?.missions ?? [])
        .filter((m) => m.kind === "assay" && m.state !== "silent")
        .map((m) => m.starId),
    );
    const watched = new Set(this.openStudies().map((s) => s.starId));
    const target = this.sources()
      .filter((s) => watched.has(s.starId) && !live.has(s.starId))
      .sort((a, b) => a.distanceLy - b.distanceLy)[0];
    if (target === undefined) return false;

    const charter = this.pickCharter("assay");
    if (charter === null) return false;
    this.log(
      `launched an assay at ${target.designation}, ${target.distanceLy.toFixed(1)} light years out`,
    );
    this.send({ type: "launchMission", starId: target.starId, kind: "assay", charter });
    return true;
  }

  /** Two clauses that apply to this kind, from different exclusivity groups —
   *  missions.ts's `validateCharter`, read off the catalog the welcome sent
   *  rather than hard-coded here. */
  pickCharter(kind) {
    const clauses = (this.missionCatalog?.clauses ?? []).filter((c) =>
      c.appliesTo.includes(kind),
    );
    const min = this.missionCatalog?.minClauses ?? 2;
    const groups = new Set();
    const picked = [];
    // Seeded shuffle, so two bots do not always fly the same charter.
    const pool = clauses.slice().sort(() => this.rng.next() - 0.5);
    for (const clause of pool) {
      if (groups.has(clause.group)) continue;
      groups.add(clause.group);
      picked.push(clause.id);
      if (picked.length === min) break;
    }
    return picked.length >= min ? picked : null;
  }
}

/** The share of a study's leading hypothesis, or 0 on an empty board. */
function leadShare(study) {
  return (study.hypotheses ?? []).reduce((best, h) => Math.max(best, h.share), 0);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseFlags(process.argv.slice(2));
  if (typeof WebSocket === "undefined") {
    console.error("no global WebSocket: this script needs Node 22 or newer");
    process.exit(1);
  }
  const lexicon = await loadLexicon();

  console.log(
    `playtest bots: ${opts.bots} on ws://${opts.host}/parties/cohort/${opts.room} ` +
      `(seed "${opts.seed}", names from ${lexicon.source})`,
  );
  console.log("the bots speak the shipped player wire only; stop them with ctrl-c");

  const bots = [];
  for (let i = 1; i <= opts.bots; i++) {
    const bot = new PlaytestBot(i, opts, lexicon);
    bots.push(bot);
    // Stagger the joins so the ceremony does not resolve two seats in the
    // same millisecond (and so the log reads like people arriving).
    setTimeout(() => bot.connect(), (i - 1) * 1500);
  }

  const shutdown = () => {
    console.log("\nstopping bots");
    for (const bot of bots) bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
