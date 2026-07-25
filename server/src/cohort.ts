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
  REAL_MS_PER_GAME_YEAR,
  type ClockState,
} from "./clock";
import {
  civAtStar,
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
import { emissionAt, lightConeFor, observeCiv, observeSky, visibleSky } from "./knowledge";
import { createRng } from "./rng";
import { generateCivSeed, type CivSeed } from "./civseed";
import { archetypeById } from "./minds";
import {
  buildStudySnapshot,
  hypothesisMenus,
  migrateStudyState,
  newStudyState,
  type StoredStudy,
  type StudyMove,
  type StudyState,
  type StoredStudyState,
} from "./studies";
import {
  confidenceLiftAt,
  freeComputeAt,
  hasLanded,
  landedProbeCruiseFractionAt,
  landedYear,
  commitCompute,
  migrateProjectState,
  newProjectState,
  projectById,
  ratePerYearAt,
  PROJECTS,
  type ProjectState,
  type StartedProject,
  type StoredProjectState,
} from "./projects";
import {
  expectedArrivals,
  missionArrivalYear,
  missionFirstWordYear,
  missionKindById,
  missionProseName,
  deriveStudyMoves,
  migrateMissionState,
  newMissionState,
  resolveMissionPlan,
  toMissionSnapshot,
  validateCharter,
  CHARTER_CLAUSES,
  MAX_MISSIONS_PER_TOKEN,
  MIN_CHARTER_CLAUSES,
  MAX_CHARTER_CLAUSES,
  MISSION_KINDS,
  PROBE_C_FRACTION,
  SENTINEL_CADENCE_YEARS,
  type MissionState,
  type StoredMission,
} from "./missions";
import {
  answersYearFor,
  effectiveCostFor,
  questionById,
  type BoughtQuestion,
} from "./questions";
import { buildDocket } from "./docket";
import {
  parseCohortClientMessage,
  toWireSource,
  validateName,
  type StudyGrounding,
  type StudySnapshot,
  type CivCard,
  type ClockWire,
  type CohortServerMessage,
  type DetectedSource,
  type ComputeBudget,
  type MissionCatalog,
  type MissionSnapshot,
  type ProjectSnapshot,
  type SelfView,
} from "./protocol";

/**
 * A clock-scheduled event, driven by the Durable Object alarm. A0 proved
 * the plumbing with dev pings; A2.2 adds "wake": a bought question's
 * answer or a mission's first word, landing while nobody is necessarily
 * connected. `onAlarm`'s ONLY job for a wake is to resend the sky to every
 * placed connection — the alarm queue is not a source of truth and cannot
 * become one (systems-a.md §7). If the DO sleeps through a wake or the
 * queue is wiped, the only consequence is a connected client not being
 * PUSHED a sky it would compute correctly on its next `requestSky`.
 * Nothing fires, nothing lands, nothing is recorded here.
 */
interface ScheduledEvent {
  readonly id: string;
  readonly atYear: number;
  readonly kind: "dev-ping" | "wake";
  readonly note: string;
  readonly token?: string; // wake only
  readonly missionId?: string; // wake only, so a sentinel can re-arm
}

interface FiredEvent extends ScheduledEvent {
  readonly firedAtYear: number;
}

/** Bounds the stored queue, dropping the farthest-future first. */
const MAX_PENDING_EVENTS = 256;

/** Slop on year comparisons, so a float-adjacent stamp never decides a
 *  lifecycle question (A2.2b's grounded exit compares arrival against the
 *  year a study was opened). */
const YEAR_EPS = 1e-6;

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

// A player's observatory state (StoredStudy/StudyState) is stored SEPARATELY
// from RunRecord — RunRecord is rewritten wholesale on every nameSource,
// while studies accrete A2.2 purchases and must not ride along on that
// rewrite. The shape and its migration now live in studies.ts (matching
// projects.ts's precedent); this module only reads/writes the DO key.

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

/**
 * The CURRENT effective probe cruise speed, in flight-years-per-light-year:
 * the reciprocal of the fastest LANDED probe-haste project's
 * cruiseFractionOfC at `atYear`, or the canonical 10 y/ly if none has
 * landed (synthesis.md §4 — probe-haste projects take the MAXIMUM across
 * landed projects, never the sum). A mission launched at `atYear` freezes
 * this value into `StoredMission.flightYearsPerLy`; the sky message also
 * carries the live value so the launch sheet can preview a clock before
 * committing.
 */
function effectiveFlightYearsPerLy(state: ProjectState, atYear: number): number {
  const fraction = landedProbeCruiseFractionAt(state, atYear) ?? PROBE_C_FRACTION;
  return 1 / fraction;
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
      case "openStudy":
        await this.onOpenStudy(conn, msg.starId);
        return;
      case "shelveStudy":
        await this.onShelveStudy(conn, msg.starId);
        return;
      case "startProject":
        await this.onStartProject(conn, msg.projectId);
        return;
      case "buyQuestion":
        await this.onBuyQuestion(conn, msg.starId, msg.questionId);
        return;
      case "launchMission":
        await this.onLaunchMission(conn, msg.starId, msg.kind, msg.charter);
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
        menus: hypothesisMenus(),
        missionCatalog: this.missionCatalog(),
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
      menus: hypothesisMenus(),
      missionCatalog: this.missionCatalog(),
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
   * openStudy: open a study on a currently visible detected source (also
   * resumes a shelved study — the one verb serves both). No derivation here:
   * status flip and persistence only, then a fresh sky.
   */
  private async onOpenStudy(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    // A study may only attach to a source this observer currently sees: bounds
    // the stored value AND enforces that studies only ever attach to detected
    // sources.
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    if (!visible.some((o) => o.starId === starId)) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const studyState = await this.loadStudyState(state.token, nowYear);
    // synthesis.md §2 (the reopen bug): SPREAD the existing record rather
    // than writing a fresh `{starId, status}` — a shelved study's `bought[]`
    // must survive a reopen, or every purchase on it would be discarded.
    //
    // A2.2b: `openedYear` is stamped on EVERY open, first or re-. It is what
    // the grounded exit measures a report's arrival against, so reopening a
    // grounded study genuinely reopens it — the report that closed it has
    // already arrived and can never close it again.
    const existing = studyState.studies[starId];
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: {
        ...existing,
        starId,
        status: "open",
        bought: existing?.bought ?? [],
        openedYear: nowYear,
      },
    };
    await this.saveStudyState(state.token, { version: 3, studies });
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * shelveStudy: shelve an existing study. No visibility check — a source may
   * have faded, but the study remains theirs. No derivation here: status flip
   * and persistence only, then a fresh sky.
   */
  private async onShelveStudy(conn: Connection, starId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no study there" });
      return;
    }
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: { ...existing, status: "shelved" },
    };
    await this.saveStudyState(state.token, { version: 3, studies });
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * buyQuestion: commission one inference on an open study, against free
   * compute. Requires a visible source (so the class is known) and an
   * existing study on it (systems-a.md §5.4).
   */
  private async onBuyQuestion(conn: Connection, starId: string, questionId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const studyState = await this.loadStudyState(state.token, nowYear);
    const existing = studyState.studies[starId];
    if (existing === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no study there" });
      return;
    }
    // A2.2b: a closed study buys nothing. Grounded is closed until the player
    // reopens it, and a shelved vigil is passive by definition — allocation
    // drops to zero (observatory-design.md § The exits).
    if (existing.status !== "open") {
      this.sendMsg(conn, {
        type: "error",
        code: "question-unavailable",
        message: "the study is not open",
      });
      return;
    }
    const def = questionById(questionId);
    if (def === undefined) {
      this.sendMsg(conn, { type: "error", code: "unknown-question", message: "no such question" });
      return;
    }
    const alreadyBought = existing.bought.some((b) => b.id === def.id);
    if (!def.appliesTo.includes(source.signal.classification) || alreadyBought) {
      this.sendMsg(conn, {
        type: "error",
        code: "question-unavailable",
        message: "question not available",
      });
      return;
    }
    const projectState = await this.loadProjectState(state.token, state.civId, nowYear);
    const cost = effectiveCostFor(def, nowYear, projectState);
    const free = freeComputeAt(projectState, nowYear);
    if (free < cost) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }

    const bought: BoughtQuestion = { id: def.id, boughtYear: nowYear };
    const studies: Record<string, StoredStudy> = {
      ...studyState.studies,
      [starId]: { ...existing, bought: [...existing.bought, bought] },
    };
    await this.saveStudyState(state.token, { version: 3, studies });

    const updatedProjectState = commitCompute(projectState, cost);
    await this.saveProjectState(state.token, updatedProjectState);

    const answersYear = answersYearFor(def, bought, projectState);
    await this.pushWakeEvent({
      token: state.token,
      atYear: answersYear,
      key: `q/${starId}/${def.id}`,
    });

    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * launchMission: commit a probe-class mission to a visible source under a
   * charter written now and never patchable again (systems-a.md §5.4).
   */
  private async onLaunchMission(
    conn: Connection,
    starId: string,
    kind: string,
    charter: readonly string[],
  ): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const galaxy = this.requireGalaxy();
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const visible = visibleSky(galaxy, state.civId, nowYear);
    const source = visible.find((o) => o.starId === starId);
    if (source === undefined) {
      this.sendMsg(conn, { type: "error", code: "bad-message", message: "no source there" });
      return;
    }
    const kindDef = missionKindById(kind);
    if (kindDef === undefined) {
      this.sendMsg(conn, {
        type: "error",
        code: "unknown-mission-kind",
        message: "no such mission kind",
      });
      return;
    }
    const resolvedCharter = validateCharter(kindDef.kind, charter);
    if (resolvedCharter === null) {
      this.sendMsg(conn, { type: "error", code: "bad-charter", message: "invalid charter" });
      return;
    }

    const missionState = await this.loadMissionState(state.token);
    const civId = state.civId;
    const conflict = missionState.missions.some((m) => {
      if (m.starId !== starId || m.kind !== kindDef.kind) return false;
      const cone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
      const snapshot = toMissionSnapshot(galaxy, cone, m, nowYear);
      return (
        snapshot.state === "in-flight" ||
        snapshot.state === "beyond-horizon" ||
        snapshot.state === "awaiting-light" ||
        snapshot.state === "standing"
      );
    });
    if (conflict || missionState.missions.length >= MAX_MISSIONS_PER_TOKEN) {
      this.sendMsg(conn, {
        type: "error",
        code: "mission-unavailable",
        message: "a live mission of this kind already runs on this star",
      });
      return;
    }

    const projectState = await this.loadProjectState(state.token, state.civId, nowYear);
    const free = freeComputeAt(projectState, nowYear);
    if (free < kindDef.costCompute) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }

    const flightYearsPerLy = effectiveFlightYearsPerLy(projectState, nowYear);
    const mission: StoredMission = {
      id: `m-${missionState.nextOrdinal}`,
      kind: kindDef.kind,
      starId,
      targetCivId: source.targetId,
      launchedYear: nowYear,
      distanceLy: source.distanceLy,
      flightYearsPerLy,
      charter: resolvedCharter,
    };
    const updatedMissionState: MissionState = {
      version: 1,
      missions: [...missionState.missions, mission],
      nextOrdinal: missionState.nextOrdinal + 1,
    };
    await this.saveMissionState(state.token, updatedMissionState);

    const updatedProjectState = commitCompute(projectState, kindDef.costCompute);
    await this.saveProjectState(state.token, updatedProjectState);

    await this.pushWakeEvent({
      token: state.token,
      atYear: missionFirstWordYear(mission),
      missionId: mission.id,
      key: `m/${mission.id}/0`,
    });

    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * startProject: commission a project against the civ's free compute. No
   * derivation here beyond calling projects.ts functions: validate, mutate
   * state, persist, then a fresh sky.
   */
  private async onStartProject(conn: Connection, projectId: string): Promise<void> {
    const state = this.conns.get(conn.id);
    if (state === undefined || state.civId === null) {
      this.sendMsg(conn, { type: "error", code: "not-placed", message: "not placed" });
      return;
    }
    const def = projectById(projectId);
    if (def === undefined) {
      this.sendMsg(conn, { type: "error", code: "unknown-project", message: "no such project" });
      return;
    }
    const nowYear = gameYearAt(this.requireClock(), Date.now());
    const projectState = await this.loadProjectState(state.token, state.civId, nowYear);
    if (projectState.started.some((p) => p.id === def.id)) {
      this.sendMsg(conn, {
        type: "error",
        code: "already-running",
        message: "already commissioned",
      });
      return;
    }
    const free = freeComputeAt(projectState, nowYear);
    if (free < def.costCompute) {
      this.sendMsg(conn, {
        type: "error",
        code: "insufficient-compute",
        message: "not enough free compute",
      });
      return;
    }
    const started: StartedProject[] = [
      ...projectState.started,
      { id: def.id, startedYear: nowYear },
    ];
    const updated: ProjectState = {
      ...projectState,
      started,
      committedCompute: projectState.committedCompute + def.costCompute,
    };
    await this.saveProjectState(state.token, updated);
    await this.sendSky(conn, state.token, state.civId);
  }

  /**
   * Key changed from `cases:${token}` at the case→study rename (A2.1 had
   * just shipped and the tap bug meant no studies were ever opened in
   * production, so no migration shim is needed for THAT rename). A2.2 adds
   * a real v1→v2 migration (studies.ts's migrateStudyState, loadProjectState's
   * exact idiom): every study gains an empty `bought[]`.
   */
  private async loadStudyState(token: string, nowYear: number): Promise<StudyState> {
    const stored = await this.ctx.storage.get<StoredStudyState>(`studies:${token}`);
    if (stored === undefined) return newStudyState();
    if (stored.version === 3) return stored;
    const migrated = migrateStudyState(stored, nowYear);
    await this.ctx.storage.put(`studies:${token}`, migrated);
    return migrated;
  }

  private async saveStudyState(token: string, state: StudyState): Promise<void> {
    await this.ctx.storage.put(`studies:${token}`, state);
  }

  /** A run placed before A2.2 has no stored mission state: lazily create one. */
  private async loadMissionState(token: string): Promise<MissionState> {
    const stored = await this.ctx.storage.get<MissionState>(`missions:${token}`);
    if (stored === undefined) return newMissionState();
    return migrateMissionState(stored);
  }

  private async saveMissionState(token: string, state: MissionState): Promise<void> {
    await this.ctx.storage.put(`missions:${token}`, state);
  }

  /**
   * A run placed before A2.2 has no stored project state: lazily create one
   * (via newProjectState, seeded from the civ's energy ladder) when absent,
   * and persist it once so the opening-allocation/base-grant clock doesn't
   * restart on every read.
   *
   * A run placed before the instrument-hours→compute rename has state in the
   * v1 shape: migrate it and persist once, so the civ keeps its exact
   * position (the rename was nominal — same numbers, same rates). A pure
   * read that finds current-shape state never writes it back.
   */
  private async loadProjectState(
    token: string,
    civId: string,
    nowYear: number,
  ): Promise<ProjectState> {
    const stored = await this.ctx.storage.get<StoredProjectState>(`projects:${token}`);
    if (stored !== undefined) {
      if (stored.version === 2) return stored;
      const migrated = migrateProjectState(stored);
      await this.ctx.storage.put(`projects:${token}`, migrated);
      return migrated;
    }
    const galaxy = this.requireGalaxy();
    const civ = civById(galaxy, civId);
    const fresh = newProjectState(nowYear, civ.seed.ladders.energy);
    await this.ctx.storage.put(`projects:${token}`, fresh);
    return fresh;
  }

  private async saveProjectState(token: string, state: ProjectState): Promise<void> {
    await this.ctx.storage.put(`projects:${token}`, state);
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
   * same pair (same code path), except for the confidence-lift step below.
   * localNames are the owner's private labels.
   *
   * A2.2 additions: `missions`, `docket`, and `probeFlightYearsPerLy`, and a
   * confidence-lift pass over every source's signal BEFORE it feeds
   * studies/questions/wire — landed `confidence-lift` projects raise the
   * FLOOR under `confidenceFor`'s output, never the value, and the lift is
   * still clamped to ≤0.95 (synthesis.md §4). This is the one call site.
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

    const projectState = await this.loadProjectState(token, civId, nowYear);
    const confidenceLift = confidenceLiftAt(projectState, nowYear);
    const sources: DetectedSource[] = visibleSky(galaxy, civId, nowYear).map((o) =>
      toWireSource(
        confidenceLift > 0
          ? { ...o, signal: { ...o.signal, confidence: Math.min(0.95, o.signal.confidence + confidenceLift) } }
          : o,
      ),
    );
    const run = await this.ctx.storage.get<RunRecord>(`run:${token}`);
    const localNames = run?.localNames ?? {};

    const missionState = await this.loadMissionState(token);

    // Join this player's stored studies against the currently visible sources:
    // a stored study whose source isn't visible right now is simply omitted
    // (forward-safe default for A2.3's overtaken). Sorted by starId for a
    // deterministic payload order. Each study needs a LightCone (for
    // questions.ts's resolveQuestion) and this star's mission-report
    // StudyMoves (missions.ts's deriveStudyMoves — studies.ts never imports
    // missions.ts, so those moves are built here and handed in).
    const studyState = await this.loadStudyState(token, nowYear);
    // A2.2b: a study grounds when a mission report reaches home after the
    // study was last opened. The decision lives HERE, not in studies.ts —
    // that module still cannot tell an answer from a report (systems-a.md
    // §2.5, §11), so the one place that knows a move came from a probe is
    // the place that built it from missions.ts. The transition is a write:
    // derived grounding would re-close the study the instant it was
    // reopened, since the report never goes away.
    let groundedWrites: Record<string, StoredStudy> | null = null;
    const studies: StudySnapshot[] = Object.values(studyState.studies)
      .map((stored) => {
        const source = sources.find((s) => s.starId === stored.starId);
        const targetCiv = civAtStar(galaxy, stored.starId);
        if (source === undefined || targetCiv === undefined) return null;
        const cone = lightConeFor(galaxy, civId, targetCiv.seed.id, nowYear);
        const missionMoves: StudyMove[] = [];
        let grounding: StudyGrounding | null = null;
        for (const m of missionState.missions) {
          if (m.starId !== stored.starId) continue;
          const mCone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
          const plan = resolveMissionPlan(galaxy, mCone, m, nowYear);
          if (plan === null) continue;
          const moves = deriveStudyMoves(
            galaxy,
            mCone,
            m,
            plan,
            missionArrivalYear(m),
            nowYear,
          );
          missionMoves.push(...moves);
          for (const move of moves) {
            if (move.arrivedYear <= stored.openedYear + YEAR_EPS) continue;
            if (grounding !== null && move.arrivedYear <= grounding.arrivedYear) continue;
            grounding = {
              missionId: m.id,
              reportId: move.id,
              missionName: missionProseName(m.kind),
              asOfYear: move.asOfYear,
              lightAgeYears: nowYear - move.asOfYear,
              arrivedYear: move.arrivedYear,
            };
          }
        }

        // Only an OPEN study grounds: a shelved vigil is passive, and an
        // already-grounded one keeps the grounding it has.
        const grounds = stored.status === "open" && grounding !== null;
        const settled: StoredStudy = grounds ? { ...stored, status: "grounded" } : stored;
        if (grounds) {
          groundedWrites = { ...(groundedWrites ?? studyState.studies), [stored.starId]: settled };
        }
        return buildStudySnapshot(
          galaxy,
          cone,
          source,
          settled,
          nowYear,
          projectState,
          missionMoves,
          settled.status === "grounded" ? grounding : null,
        );
      })
      .filter((s): s is StudySnapshot => s !== null)
      .sort((a, b) => a.starId.localeCompare(b.starId));

    if (groundedWrites !== null) {
      await this.saveStudyState(token, { version: 3, studies: groundedWrites });
    }

    const missions: MissionSnapshot[] = missionState.missions
      .map((m) => {
        const cone = lightConeFor(galaxy, civId, m.targetCivId, nowYear);
        return toMissionSnapshot(galaxy, cone, m, nowYear);
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const projects: ProjectSnapshot[] = PROJECTS.map((def) => {
      const runningEntry = projectState.started.find((p) => p.id === def.id);
      const addRatePerYear = def.effect.kind === "compute-income" ? def.effect.addRatePerYear : 0;
      if (runningEntry === undefined) {
        return {
          id: def.id,
          label: def.label,
          line: def.line,
          costClass: def.costClass,
          costCompute: def.costCompute,
          durationYears: def.durationYears,
          addRatePerYear,
          status: "available",
          startedYear: null,
          landsYear: null,
        };
      }
      const landed = hasLanded(def, runningEntry, nowYear);
      return {
        id: def.id,
        label: def.label,
        line: def.line,
        costClass: def.costClass,
        costCompute: def.costCompute,
        durationYears: def.durationYears,
        addRatePerYear,
        status: landed ? "standing" : "running",
        startedYear: runningEntry.startedYear,
        landsYear: landedYear(def, runningEntry),
      };
    });
    const budget: ComputeBudget = {
      free: freeComputeAt(projectState, nowYear),
      ratePerYear: ratePerYearAt(projectState, nowYear),
      asOfYear: nowYear,
    };

    const relevantStarIds = new Set<string>([
      ...studies.map((s) => s.starId),
      ...missions.map((m) => m.starId),
    ]);
    const designations: Record<string, string> = {};
    for (const starId of relevantStarIds) {
      designations[starId] = starById(galaxy.stars, starId).designation;
    }
    const docket = buildDocket({
      nowYear,
      projectState,
      studies,
      missions,
      localNames,
      designations,
    });

    const probeFlightYearsPerLy = effectiveFlightYearsPerLy(projectState, nowYear);

    this.sendMsg(conn, {
      type: "sky",
      nowYear,
      self,
      sources,
      localNames,
      studies,
      projects,
      budget,
      missions,
      docket,
      probeFlightYearsPerLy,
    });
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
    return {
      epochRealMs: clock.epochRealMs,
      epochGameYear: clock.epochGameYear,
      realMsPerGameYear: REAL_MS_PER_GAME_YEAR,
    };
  }

  /** The launch surface's vocabulary — sent once on welcome, like `menus`,
   *  so no mission catalog ships in the client bundle. */
  private missionCatalog(): MissionCatalog {
    return {
      kinds: MISSION_KINDS,
      clauses: CHARTER_CLAUSES,
      minClauses: MIN_CHARTER_CLAUSES,
      maxClauses: MAX_CHARTER_CLAUSES,
    };
  }

  /** Builds a wake ScheduledEvent — hygiene: `wake/${token}/${key}` so a
   *  re-push for the same purchase/launch is idempotent (same id). Pure;
   *  callers own persistence. */
  private buildWakeEvent(input: {
    readonly token: string;
    readonly atYear: number;
    readonly key: string;
    readonly missionId?: string;
  }): ScheduledEvent {
    return {
      id: `wake/${input.token}/${input.key}`,
      atYear: input.atYear,
      kind: "wake",
      note: input.key,
      token: input.token,
      ...(input.missionId !== undefined ? { missionId: input.missionId } : {}),
    };
  }

  /**
   * Push a wake event: read-modify-write the "events" queue, idempotent by
   * id (a re-push for the same purchase/launch overwrites the entry at the
   * same id). Bounds the queue at MAX_PENDING_EVENTS, dropping the
   * farthest-future entry first. Used by handlers (onBuyQuestion,
   * onLaunchMission); onAlarm appends to its own in-memory copy instead, so
   * the two writes to "events" in one alarm turn cannot race each other.
   */
  private async pushWakeEvent(input: {
    readonly token: string;
    readonly atYear: number;
    readonly key: string;
    readonly missionId?: string;
  }): Promise<void> {
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const event = this.buildWakeEvent(input);
    const withoutDup = pending.filter((e) => e.id !== event.id);
    let queue = [...withoutDup, event];
    if (queue.length > MAX_PENDING_EVENTS) {
      queue = queue.sort((a, b) => a.atYear - b.atYear).slice(0, MAX_PENDING_EVENTS);
    }
    await this.ctx.storage.put("events", queue);
    await this.armAlarm(queue);
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

  /**
   * Alarms are wake-ups only, never truth (systems-a.md §7): the ONLY thing
   * a due "wake" does is resend the sky to every currently-live placed
   * connection for its token. Every number in that sky is derived from the
   * clock at read time, so a sleeping DO or a wiped queue never desyncs
   * anything — it only delays a push the client would compute correctly
   * itself on its next `requestSky`.
   *
   * synthesis.md §1 (the alarm liveness rule): when a due wake would re-arm
   * a follow-up (a sentinel's next word), only push the fresh wake if at
   * least one placed connection for this token is currently live. An
   * absent player's sentinel must not re-arm forever.
   */
  async onAlarm(): Promise<void> {
    const clock = this.clock;
    if (clock === null) return;
    const nowYear = gameYearAt(clock, Date.now());
    const pending = (await this.ctx.storage.get<ScheduledEvent[]>("events")) ?? [];
    const log = (await this.ctx.storage.get<FiredEvent[]>("eventLog")) ?? [];

    const due = pending.filter((e) => e.atYear <= nowYear + 1e-6);
    const rest = pending.filter((e) => e.atYear > nowYear + 1e-6);

    for (const event of due) {
      log.push({ ...event, firedAtYear: nowYear });
      console.log(
        `[cohort ${this.name}] event fired at year ${nowYear.toFixed(3)}: ${event.kind} — ${event.note}`,
      );

      if (event.kind !== "wake" || event.token === undefined) continue;
      const token = event.token;
      const liveConns = [...this.conns.values()].filter(
        (c) => c.token === token && c.civId !== null,
      );
      for (const c of liveConns) {
        if (c.civId === null) continue; // filtered above; re-checked for the type narrowing
        await this.sendSky(c.conn, c.token, c.civId);
      }

      if (event.missionId === undefined || liveConns.length === 0) continue;
      const missionState = await this.loadMissionState(token);
      const mission = missionState.missions.find((m) => m.id === event.missionId);
      if (mission === undefined) continue;
      const nextArrivals = expectedArrivals(
        mission.kind,
        mission.launchedYear,
        mission.distanceLy,
        mission.flightYearsPerLy,
        nowYear + SENTINEL_CADENCE_YEARS + 1,
      );
      const next = nextArrivals.find((e) => e > nowYear + 1e-6);
      if (next !== undefined) {
        rest.push(
          this.buildWakeEvent({
            token,
            atYear: next,
            missionId: mission.id,
            key: `m/${mission.id}/${next}`,
          }),
        );
      }
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
