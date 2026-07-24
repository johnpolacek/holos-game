// The Cohort — one Durable Object per cohort neighborhood, holding TRUTH.
//
// Shard topology decision (roadmap.md § Open build decisions, resolved
// for A0): a single DO per cohort owns the galaxy, the shared clock, and
// the light-delay computation, with per-civ state hanging off it. v1
// cohorts are small; revisit at scale.
//
// Everything player-facing must read through the knowledge layer
// (knowledge.ts): this object never hands out another civilization's
// present. In A0 it exposes DEV endpoints only (no wire messages yet —
// those land per-slice from A1 on), gated to local development hosts so
// every commit stays shippable to production.
//
// HTTP surface (wrangler dev only), under /parties/cohort/:name :
//   POST /dev/seed     {seedKey?, radiusLy?, aiCivs?}  create + persist a galaxy
//   GET  /dev/state                                    truth overview (dev eyes only)
//   GET  /dev/observe?observer=ID&target=ID            the light-delayed view
//   GET  /dev/sky?observer=ID                          all views for an observer
//   POST /dev/event    {inYears, note}                 schedule an alarm-driven event
//   GET  /dev/events                                   pending + fired events

import { Server, type Connection, type WSMessage } from "partyserver";
import {
  gameYearAt,
  newClock,
  realMsAtGameYear,
  type ClockState,
} from "./clock";
import {
  civById,
  DEFAULT_GALAXY_CONFIG,
  distanceLy,
  generateGalaxy,
  pickPlayerHome,
  starById,
  type Galaxy,
  type GalaxyConfig,
  type PlacedCiv,
  type Star,
} from "./galaxy";
import { emissionAt, observeCiv, observeSky, visibleSky } from "./knowledge";
import { createRng } from "./rng";
import { generateCivSeed, type CivSeed } from "./civseed";
import { archetypeById } from "./minds";
import { buildCaseSnapshot } from "./cases";
import {
  parseCohortClientMessage,
  toWireSource,
  validateName,
  type CaseSnapshot,
  type CaseStatus,
  type CivCard,
  type ClockWire,
  type CohortServerMessage,
  type DetectedSource,
  type SelfView,
} from "./protocol";

/**
 * A clock-scheduled event, driven by the Durable Object alarm. A0 proves
 * the plumbing with dev pings; arrivals, deliveries, and signals (A2+)
 * ride the same queue.
 */
interface ScheduledEvent {
  readonly id: string;
  readonly atYear: number;
  readonly kind: string;
  readonly note: string;
}

interface FiredEvent extends ScheduledEvent {
  readonly firedAtYear: number;
}

interface GalaxyMeta {
  readonly seedKey: string;
  readonly config: GalaxyConfig;
}

interface CohortEnv {
  Cohort: DurableObjectNamespace;
}

/**
 * A placed player's per-run record. `localNames` are the owner's private
 * labels for sky sources — echoed only back to this owner, never attached
 * to any DetectedSource and never broadcast.
 */
interface RunRecord {
  readonly token: string;
  readonly civId: string;
  readonly starId: string;
  readonly localNames: Record<string, string>;
}

/**
 * A player's case-board state, stored SEPARATELY from RunRecord: RunRecord is
 * rewritten wholesale on every nameSource, while cases accrete A2.2+ state
 * and must not ride along on that rewrite. In A2.1 only `status` is stored —
 * the distribution and evidence are pure functions of the current
 * ObservedSignal (persisting them would only risk staleness); from A2.2, when
 * bought answers make the distribution path-dependent, it moves in here
 * additively.
 */
interface StoredCase {
  readonly starId: string;
  readonly status: CaseStatus;
}
interface CaseState {
  readonly version: 1;
  readonly cases: Record<string, StoredCase>; // keyed by starId
}

/** Live connection tracking: the socket, its token, and (once placed) civ. */
interface ConnState {
  readonly conn: Connection;
  readonly token: string;
  civId: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Dev endpoints exist only where wrangler dev serves: local hosts. */
function isLocalDev(url: URL): boolean {
  return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname);
}

function numberField(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function stringField(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
}

export class Cohort extends Server<CohortEnv> {
  private clock: ClockState | null = null;
  private galaxy: Galaxy | null = null;
  // In-memory only, rebuilt by each connection's `hello`. This relies on
  // partyserver's default `hibernate: false`: a DO restart closes live
  // sockets, the client reconnects and re-hellos, and the map self-heals.
  // If hibernation is ever enabled, every non-hello handler must instead
  // recover the token from the connection attachment.
  private readonly conns = new Map<string, ConnState>();

  async onStart(): Promise<void> {
    const clock = await this.ctx.storage.get<ClockState>("clock");
    this.clock = clock ?? null;
    const meta = await this.ctx.storage.get<GalaxyMeta>("galaxy:meta");
    const stars = await this.ctx.storage.get<Star[]>("galaxy:stars");
    const civs = await this.ctx.storage.get<PlacedCiv[]>("galaxy:civs");
    this.galaxy =
      meta !== undefined && stars !== undefined && civs !== undefined
        ? { seedKey: meta.seedKey, config: meta.config, stars, civs }
        : null;
  }

  // ── Act 3 WebSocket surface (A1) ──────────────────────────────────────
  // The client drives with `hello`; the server never sends unprompted. The
  // ONLY other-civ data on the wire is toWireSource(visibleSky(...)).

  onConnect(): void {
    // Intentionally empty: the client opens by sending `hello`.
  }

  async onMessage(conn: Connection, message: WSMessage): Promise<void> {
    if (typeof message !== "string") return;
    const msg = parseCohortClientMessage(message);
    if (msg === null) return; // ignore malformed, like Room
    switch (msg.type) {
      case "hello":
        await this.onHello(conn, msg.token);
        return;
      case "become":
        await this.onBecome(conn, msg.candidateId, msg.name);
        return;
      case "nameSource":
        await this.onNameSource(conn, msg.starId, msg.name);
        return;
      case "requestSky":
        await this.onRequestSky(conn);
        return;
      case "openCase":
        await this.onOpenCase(conn, msg.starId);
        return;
      case "shelveCase":
        await this.onShelveCase(conn, msg.starId);
        return;
    }
  }

  onClose(conn: Connection): void {
    this.conns.delete(conn.id);
  }

  /** hello: resolve/mint a token, register, and send welcome + first payload. */
  private async onHello(conn: Connection, tokenIn: string | null): Promise<void> {
    await this.ensureSeeded();
    const galaxy = this.requireGalaxy();
    // Mint only when the client had no token; a non-null unknown token is a
    // choosing-phase / storage-evicted token and is reused as-is.
    const token = tokenIn ?? crypto.randomUUID();
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    if (run !== undefined) {
      this.conns.set(conn.id, { conn, token, civId: run.civId });
      this.sendMsg(conn, {
        type: "welcome",
        token,
        phase: "placed",
        clock: this.toClockWire(),
        catalog: galaxy.stars,
      });
      await this.sendSky(conn, token, run.civId);
      return;
    }
    this.conns.set(conn.id, { conn, token, civId: null });
    this.sendMsg(conn, {
      type: "welcome",
      token,
      phase: "choosing",
      clock: this.toClockWire(),
      catalog: galaxy.stars,
    });
    const offerYear = await this.getOfferYear(token);
    this.sendMsg(conn, { type: "offer", candidates: this.makeCandidates(token, offerYear) });
  }

  /**
   * The game year a token's candidates are anchored to, frozen at first
   * offer and persisted. Without this, nowYear drifts between offer and
   * become (5 real min = 1 game year), shifting the candidates' dated
   * fields (ascensionYear, emission epochs) — the player must become
   * exactly the civ whose card they read.
   */
  private async getOfferYear(token: string): Promise<number> {
    const stored = await this.ctx.storage.get<number>(`offerYear:${token}`);
    if (stored !== undefined) return stored;
    const year = gameYearAt(this.requireClock(), Date.now());
    await this.ctx.storage.put(`offerYear:${token}`, year);
    return year;
  }

  /** become: commit an inheritance candidate into a placed player civ. */
  private async onBecome(conn: Connection, candidateId: string, name: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined) return; // must hello first
    const token = state.token;

    // Idempotency: already placed (this conn or a stored run) → re-send sky.
    if (state.civId !== null) {
      await this.sendSky(conn, token, state.civId);
      return;
    }
    const existing = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    if (existing !== undefined) {
      state.civId = existing.civId;
      await this.sendSky(conn, token, existing.civId);
      return;
    }

    const clean = validateName(name);
    if (clean === null) {
      this.sendMsg(conn, { type: "error", code: "bad-name", message: "name is invalid" });
      return;
    }
    const offerYear = await this.getOfferYear(token);
    const chosen = this.makeCandidates(token, offerYear).find(
      (c) => c.candidateId === candidateId,
    );
    if (chosen === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "unknown-candidate",
        message: "no such candidate",
      });
      return;
    }

    // Capture the galaxy AFTER the last await: storage reads yield, and a
    // concurrent become on another connection may have placed a civ in the
    // meantime — a stale capture here would lose that civ (and could hand
    // out its star) when we spread `civs` below.
    const galaxy = this.requireGalaxy();
    const civId = `civ-p-${token.slice(0, 12)}`;
    // Same-token race (two tabs committing at once): if this token's civ
    // landed while we awaited above, treat this as the idempotent path.
    const already = galaxy.civs.find((c) => c.seed.id === civId);
    if (already !== undefined) {
      state.civId = civId;
      await this.sendSky(conn, token, civId);
      return;
    }
    const star = pickPlayerHome(galaxy);
    if (star === null) {
      this.sendMsg(conn, { type: "error", code: "cohort-full", message: "cohort is full" });
      return;
    }
    const placedSeed: CivSeed = { ...chosen.seed, id: civId, name: clean };
    const placed: PlacedCiv = { seed: placedSeed, starId: star.id, controller: "player" };
    this.galaxy = { ...galaxy, civs: [...galaxy.civs, placed] };
    await this.ctx.storage.put("galaxy:civs", this.galaxy.civs);

    const run: RunRecord = { token, civId, starId: star.id, localNames: {} };
    await this.ctx.storage.put(`run:${token}`, run);
    state.civId = civId;

    // This connection sees its own sky; every other placed connection gets a
    // fresh observer-relative sky (membership changed — a new warm source
    // entered their field).
    await this.sendSky(conn, token, civId);
    for (const [id, other] of this.conns) {
      if (id === conn.id) continue;
      if (other.civId === null) continue;
      await this.sendSky(other.conn, other.token, other.civId);
    }
  }

  /** nameSource: set/clear the owner's private label for a sky source. */
  private async onNameSource(conn: Connection, starId: string, name: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const run = await this.ctx.storage.get<RunRecord>(`run:${state.token}`);
    if (run === undefined) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // Only real catalog stars may be named: bounds the run record (a
    // hostile client could otherwise grow it without limit / oversize a
    // stored value with an arbitrary starId).
    const galaxy = this.requireGalaxy();
    if (!galaxy.stars.some((s) => s.id === starId)) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "unknown star" });
      return;
    }
    const localNames: Record<string, string> = { ...run.localNames };
    let echo: string;
    if (name === "") {
      delete localNames[starId];
      echo = "";
    } else {
      const clean = validateName(name);
      if (clean === null) {
        this.sendMsg(conn, { type: "error", code: "bad-name", message: "name is invalid" });
        return;
      }
      localNames[starId] = clean;
      echo = clean;
    }
    const updated: RunRecord = { ...run, localNames };
    await this.ctx.storage.put(`run:${state.token}`, updated);
    // Owner-only echo; never broadcast, never attached to a DetectedSource.
    this.sendMsg(conn, { type: "sourceNamed", starId, name: echo });
  }

  /** requestSky: a placed connection asks for a fresh sky. */
  private async onRequestSky(conn: Connection): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) return;
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * openCase: open a case on a currently visible detected source (also
   * resumes a shelved case — the one verb serves both). No derivation here:
   * status flip and persistence only, then a fresh sky.
   */
  private async onOpenCase(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // A case may only attach to a source this observer currently sees: bounds
    // the stored value AND enforces that cases only ever attach to detected
    // sources.
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    if (!visible.some((o) => o.starId === starId)) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const caseState = await this.loadCaseState(state.token);
    const cases: Record<string, StoredCase> = {
      ...caseState.cases,
      [starId]: { starId, status: "open" },
    };
    await this.saveCaseState(state.token, { version: 1, cases });
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * shelveCase: shelve an existing case. No visibility check — a source may
   * have faded, but the case remains theirs. No derivation here: status flip
   * and persistence only, then a fresh sky.
   */
  private async onShelveCase(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const caseState = await this.loadCaseState(state.token);
    if (caseState.cases[starId] === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no case there" });
      return;
    }
    const cases: Record<string, StoredCase> = {
      ...caseState.cases,
      [starId]: { starId, status: "shelved" },
    };
    await this.saveCaseState(state.token, { version: 1, cases });
    await this.sendSky(conn, state.token, state.civId);
  }

  private async loadCaseState(token: string): Promise<CaseState> {
    const stored = await this.ctx.storage.get<CaseState>(`cases:${token}`);
    return stored ?? { version: 1, cases: {} };
  }

  private async saveCaseState(token: string, state: CaseState): Promise<void> {
    await this.ctx.storage.put(`cases:${token}`, state);
  }

  /**
   * Seed a fresh production cohort on first contact. Idempotent (returns if
   * already seeded); the DO is single-threaded so no lock is needed. Mirrors
   * devSeed with no request body.
   */
  private async ensureSeeded(): Promise<void> {
    if (this.galaxy !== null) return;
    const seedKey = `cohort-${this.name}`;
    const config: GalaxyConfig = {
      radiusLy: Math.min(30, DEFAULT_GALAXY_CONFIG.radiusLy),
      aiCivCount: DEFAULT_GALAXY_CONFIG.aiCivCount,
    };
    const clock = newClock(Date.now());
    const galaxy = generateGalaxy(createRng(seedKey), seedKey, config, 0);
    this.clock = clock;
    this.galaxy = galaxy;
    await this.ctx.storage.put("clock", clock);
    await this.ctx.storage.put("galaxy:meta", { seedKey, config } satisfies GalaxyMeta);
    await this.ctx.storage.put("galaxy:stars", galaxy.stars);
    await this.ctx.storage.put("galaxy:civs", galaxy.civs);
    await this.ctx.storage.put("events", []);
    await this.ctx.storage.put("eventLog", []);
  }

  /**
   * The player's whole sky in one message: their own present-tense SelfView,
   * plus the ONLY other-civ data on the wire — visibleSky mapped through
   * toWireSource, so the client sky is byte-identical to /dev/observe for the
   * same pair (same code path). localNames are the owner's private labels.
   */
  private async sendSky(conn: Connection, token: string, civId: string): Promise<void> {
    const galaxy = this.requireGalaxy();
    const clock = this.requireClock();
    const nowYear = gameYearAt(clock, Date.now());
    const selfCiv = civById(galaxy, civId);
    const star = starById(galaxy.stars, selfCiv.starId);
    const self: SelfView = {
      civId,
      seed: selfCiv.seed,
      starId: star.id,
      designation: star.designation,
      position: star.position,
    };
    const sources: DetectedSource[] = visibleSky(galaxy, civId, nowYear).map(toWireSource);
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    const localNames = run?.localNames ?? {};
    // Join this player's stored cases against the currently visible sources:
    // a stored case whose source isn't visible right now is simply omitted
    // (forward-safe default for A2.3's overtaken). Sorted by starId for a
    // deterministic payload order.
    const caseState = await this.loadCaseState(token);
    const cases: CaseSnapshot[] = Object.values(caseState.cases)
      .map((stored) => {
        const source = sources.find((s) => s.starId === stored.starId);
        return source === undefined ? null : buildCaseSnapshot(source, stored.status, nowYear);
      })
      .filter((c): c is CaseSnapshot => c !== null)
      .sort((a, b) => a.starId.localeCompare(b.starId));
    this.sendMsg(conn, { type: "sky", nowYear, self, sources, localNames, cases });
  }

  /**
   * The inheritance offer — DETERMINISTIC in the token, so a mid-ceremony
   * refresh re-offers identical cards and `become` re-derives the exact seed.
   * Draws a pool of recently-ascended peers, then greedily prefers distinct
   * archetypes for legibility, topping up in pool order.
   */
  private makeCandidates(token: string, offerYear: number): CivCard[] {
    const galaxy = this.requireGalaxy();
    const nowYear = offerYear;
    const poolRng = createRng(`${galaxy.seedKey}/join/${token}`);
    const POOL = 6;
    const WANT = 3;
    const pool: { readonly i: number; readonly seed: CivSeed }[] = [];
    for (let i = 0; i < POOL; i++) {
      const seed = generateCivSeed(poolRng.fork(`cand/${i}`), {
        id: `cand-${i}`,
        ageBand: "peer",
        nowYear,
        recentlyAscended: true,
      });
      pool.push({ i, seed });
    }
    const selected: { readonly i: number; readonly seed: CivSeed }[] = [];
    const seenArchetypes = new Set<string>();
    for (const entry of pool) {
      if (selected.length >= WANT) break;
      if (seenArchetypes.has(entry.seed.archetype)) continue;
      seenArchetypes.add(entry.seed.archetype);
      selected.push(entry);
    }
    for (const entry of pool) {
      if (selected.length >= WANT) break;
      if (selected.some((s) => s.i === entry.i)) continue;
      selected.push(entry);
    }
    return selected.map((entry) => {
      const archetype = archetypeById(entry.seed.archetype);
      return {
        candidateId: String(entry.i),
        seed: entry.seed,
        archetypeName: archetype.name,
        archetypeFirstRead: archetype.firstRead,
      };
    });
  }

  private sendMsg(conn: Connection, msg: CohortServerMessage): void {
    conn.send(JSON.stringify(msg));
  }

  private toClockWire(): ClockWire {
    const clock = this.requireClock();
    return { epochRealMs: clock.epochRealMs, epochGameYear: clock.epochGameYear };
  }

  private requireGalaxy(): Galaxy {
    if (this.galaxy === null) throw new Error("cohort not seeded");
    return this.galaxy;
  }

  private requireClock(): ClockState {
    if (this.clock === null) throw new Error("cohort clock not seeded");
    return this.clock;
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!isLocalDev(url)) return json({ error: "not found" }, 404);

    const parts = url.pathname.split("/").filter((p) => p.length > 0);
    const devIdx = parts.indexOf("dev");
    const action = devIdx >= 0 ? parts.slice(devIdx + 1).join("/") : "";

    if (request.method === "POST" && action === "seed") return this.devSeed(request);
    if (request.method === "GET" && action === "state") return this.devState();
    if (request.method === "GET" && action === "observe") return this.devObserve(url);
    if (request.method === "GET" && action === "sky") return this.devSky(url);
    if (request.method === "POST" && action === "event") return this.devScheduleEvent(request);
    if (request.method === "GET" && action === "events") return this.devEvents();
    return json({ error: "not found" }, 404);
  }

  async onAlarm(): Promise<void> {
    const clock = this.clock;
    if (clock === null) return;
    const nowYear = gameYearAt(clock, Date.now());
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const log = (await this.ctx.storage.get<FiredEvent[]>("eventLog")) ?? [];

    const due = pending.filter((e) => e.atYear <= nowYear + 1e-6);
    const rest = pending.filter((e) => e.atYear > nowYear + 1e-6);
    for (const event of due) {
      // A0: firing = recording. Arrivals/deliveries will hook in here.
      log.push({ ...event, firedAtYear: nowYear });
      console.log(
        `[cohort ${this.name}] event fired at year ${nowYear.toFixed(3)}: ${event.kind} — ${event.note}`,
      );
    }
    await this.ctx.storage.put("events", rest);
    await this.ctx.storage.put("eventLog", log.slice(-100));
    await this.armAlarm(rest);
  }

  private async armAlarm(pending: readonly ScheduledEvent[]): Promise<void> {
    const clock = this.clock;
    if (clock === null || pending.length === 0) return;
    const nextYear = Math.min(...pending.map((e) => e.atYear));
    await this.ctx.storage.setAlarm(realMsAtGameYear(clock, nextYear));
  }

  private nowYear(): number | null {
    return this.clock === null ? null : gameYearAt(this.clock, Date.now());
  }

  private async devSeed(request: Request): Promise<Response> {
    const body = await parseBody(request);
    const seedKey = stringField(body, "seedKey") ?? `cohort-${this.name}`;
    const config: GalaxyConfig = {
      // Cap the radius so the star list stays comfortably inside DO
      // storage value limits (~450 stars at 30 ly).
      radiusLy: Math.min(30, numberField(body, "radiusLy") ?? DEFAULT_GALAXY_CONFIG.radiusLy),
      aiCivCount: Math.min(24, numberField(body, "aiCivs") ?? DEFAULT_GALAXY_CONFIG.aiCivCount),
    };

    const clock = newClock(Date.now());
    const galaxy = generateGalaxy(createRng(seedKey), seedKey, config, 0);
    this.clock = clock;
    this.galaxy = galaxy;
    await this.ctx.storage.put("clock", clock);
    await this.ctx.storage.put("galaxy:meta", {
      seedKey,
      config,
    } satisfies GalaxyMeta);
    await this.ctx.storage.put("galaxy:stars", galaxy.stars);
    await this.ctx.storage.put("galaxy:civs", galaxy.civs);
    await this.ctx.storage.put("events", []);
    await this.ctx.storage.put("eventLog", []);
    await this.ctx.storage.deleteAlarm();

    return json({
      seeded: true,
      seedKey,
      config,
      starCount: galaxy.stars.length,
      civs: this.civOverview(galaxy, 0),
    });
  }

  private civOverview(galaxy: Galaxy, nowYear: number): unknown[] {
    const origin = { x: 0, y: 0, z: 0 };
    return galaxy.civs.map((c) => ({
      id: c.seed.id,
      name: c.seed.name,
      controller: c.controller,
      archetype: c.seed.archetype,
      posture: c.seed.posture,
      ageBand: c.seed.ageBand,
      lineage: c.seed.lineageId,
      cradle: c.seed.cradleId,
      star: starById(galaxy.stars, c.starId).designation,
      distanceFromCenterLy:
        Math.round(distanceLy(starById(galaxy.stars, c.starId).position, origin) * 100) / 100,
      emissionNow: emissionAt(c.seed.emissionHistory, nowYear),
      ascensionYear: c.seed.ascensionYear,
      emissionHistory: c.seed.emissionHistory,
    }));
  }

  private devState(): Response {
    const nowYear = this.nowYear();
    if (this.galaxy === null || nowYear === null) {
      return json({ error: "not seeded — POST /dev/seed first" }, 404);
    }
    return json({
      nowYear,
      clock: this.clock,
      seedKey: this.galaxy.seedKey,
      config: this.galaxy.config,
      starCount: this.galaxy.stars.length,
      civs: this.civOverview(this.galaxy, nowYear),
    });
  }

  private devObserve(url: URL): Response {
    const nowYear = this.nowYear();
    if (this.galaxy === null || nowYear === null) {
      return json({ error: "not seeded — POST /dev/seed first" }, 404);
    }
    const observer = url.searchParams.get("observer");
    const target = url.searchParams.get("target");
    if (observer === null || target === null) {
      return json({ error: "observer and target query params required" }, 400);
    }
    try {
      return json({ nowYear, view: observeCiv(this.galaxy, observer, target, nowYear) });
    } catch (err) {
      return json({ error: String(err) }, 404);
    }
  }

  private devSky(url: URL): Response {
    const nowYear = this.nowYear();
    if (this.galaxy === null || nowYear === null) {
      return json({ error: "not seeded — POST /dev/seed first" }, 404);
    }
    const observer = url.searchParams.get("observer");
    if (observer === null) return json({ error: "observer query param required" }, 400);
    try {
      return json({ nowYear, sky: observeSky(this.galaxy, observer, nowYear) });
    } catch (err) {
      return json({ error: String(err) }, 404);
    }
  }

  private async devScheduleEvent(request: Request): Promise<Response> {
    const nowYear = this.nowYear();
    if (nowYear === null) return json({ error: "not seeded — POST /dev/seed first" }, 404);
    const body = await parseBody(request);
    const inYears = numberField(body, "inYears");
    if (inYears === undefined || inYears <= 0) {
      return json({ error: "inYears (positive number) required" }, 400);
    }
    const note = stringField(body, "note") ?? "dev ping";
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const event: ScheduledEvent = {
      id: `ev-${pending.length}-${Date.now()}`,
      atYear: nowYear + inYears,
      kind: "dev-ping",
      note,
    };
    pending.push(event);
    await this.ctx.storage.put("events", pending);
    await this.armAlarm(pending);
    return json({ scheduled: event, nowYear });
  }

  private async devEvents(): Promise<Response> {
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const log = (await this.ctx.storage.get<FiredEvent[]>("eventLog")) ?? [];
    return json({ nowYear: this.nowYear(), pending, fired: log });
  }
}
