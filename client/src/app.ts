// Tiny screen router. Holds the latest CohortServerMessage-derived state and
// swaps the mounted view: the inheritance ceremony or the Model (the 3D sky).
//
// The Model mounts on the first `sky` message (which carries the SelfView and
// the detected sources); the star catalog is retained from `welcome`. The
// opening-beat decision lives here: a `sky` that arrives while a `become`
// this session is still pending plays the four-beat intro (S0.1) if the
// server actually served its lines, else the one-shot "pullback" fallback;
// any other placed sky (a reconnect/resume) → "resume".

import type {
  CohortServerMessage,
  StudySnapshot,
  CivCard,
  DetectedSource,
  SelfView,
  Star,
  ProjectSnapshot,
  ComputeBudget,
  MissionSnapshot,
  MissionCatalog,
  WorkState,
  TendRow,
  VoiceLines,
  VoiceKey,
  ReportPayload,
  Proposal,
  ContactWire,
  AccordRail,
  // ── A4 ──
  LedgerWire,
  SurveyRow,
  VoyageCatalog,
  VoyageSnapshot,
  VoyageWorkState,
} from "@holos/protocol";
import type { CohortSocket } from "./net";
import { StudyBoard } from "./studyboard";
import {
  clearPendingBecome,
  hasPendingBecome,
  mountSignIn,
  renderCeremony,
  type SignInMount,
} from "./ceremony";
import { Model } from "./model";
import {
  SourceCard,
  type ContactCardState,
  type MissionCardState,
  type VoyageCardState,
} from "./sourcecard";
import { Home } from "./home";
import { setClockAnchor, setEpochAnchor, formatEpochYearPrecise, nowYear } from "./clock";
import { ContactCeremony } from "./contactceremony";
import { Intro } from "./intro";
// A5: the boot re-sync, and nothing else from here. The row, the sheet and
// the ask all live in the study board.
import { resyncWatch } from "./push";

/** The HOME mote's flight is timed by the DECADES it crosses, not by a fixed
 *  clock, because the camera is logarithmic and the two ends are not a fixed
 *  distance apart: the volume is six orders of magnitude off the home world
 *  and the cosmic web is thirteen. A fixed duration would fly the second trip
 *  at twice the rate of the first, so the further you were, the more the
 *  scales would blur past. At this rate the volume round trip lands near two
 *  seconds — brisk against the act-opening pull-back's 4.2s, which is a
 *  cutscene you watch once where this is a control you use all session.
 *  The floor keeps a short hop from reading as a cut; the ceiling keeps the
 *  trip back from the web from becoming a cutscene of its own. */
const HOME_FLY_MS_PER_DECADE = 360;
const HOME_FLY_MS_MIN = 900;
const HOME_FLY_MS_MAX = 3600;

/** How long to fly between two camera distances, at that rate. */
function homeFlyMs(fromLy: number, toLy: number): number {
  const decades = Math.abs(Math.log10(toLy / fromLy));
  const ms = decades * HOME_FLY_MS_PER_DECADE;
  return Math.min(HOME_FLY_MS_MAX, Math.max(HOME_FLY_MS_MIN, ms));
}

/** Tend states that mean a mission is still under way — everything but a
 *  terminal returned/silent (missions.ts's missionWorkState never emits
 *  "in-hand" for a mission; that branch is defensive only there too). */
function isLiveMissionState(state: WorkState): boolean {
  return (
    state === "in-flight" ||
    state === "beyond-horizon" ||
    state === "awaiting-light" ||
    state === "standing"
  );
}

/** A4: voyage states that mean a founding is still under way — everything
 *  short of the four terminal words (founded, unrooted, silent, dark). The
 *  source card's row reads this, and the server's own cap agrees with it:
 *  one live founding per star at a time. */
function isLiveVoyageState(state: VoyageWorkState): boolean {
  return state === "in-flight" || state === "beyond-horizon" || state === "awaiting-light";
}

/** S0.2: the Report tab's badge marker, one localStorage key per civ so a
 *  reload does not reopen already-read arrivals as new. ReportEntry.id is
 *  the honest thing to key on: it is the stable per-entry key report.ts
 *  promises ("rendered once at materialization... byte-identical" on a
 *  re-read), not a position in a list that reshuffles when a header
 *  promotes an entry out of newest-first order. */
function reportSeenKey(civId: string): string {
  return `holos.reportSeen.${civId}`;
}

/** The ids already shown to this civ, or an empty set on first visit, a
 *  corrupt value, or a storage read that throws (private browsing, a full
 *  quota) — a badge that undercounts a returning reader is the safe
 *  failure, not one that crashes the shell. */
function loadSeenReportIds(civId: string): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(reportSeenKey(civId));
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

/** Best-effort: a write that throws leaves the marker stale rather than
 *  crashing the report open it is attached to. */
function saveSeenReportIds(civId: string, ids: readonly string[]): void {
  try {
    window.localStorage.setItem(reportSeenKey(civId), JSON.stringify(ids));
  } catch {
    // Storage unavailable: the badge stops persisting across reloads, no more.
  }
}

type ScreenCleanup = () => void;

export class App {
  private readonly root: HTMLElement;
  private readonly socket: CohortSocket;
  private currentCleanup: ScreenCleanup | null = null;
  private mountedScreen: "none" | "ceremony" | "sky" = "none";

  private catalog: readonly Star[] = [];
  // The launch sheet's vocabulary, retained from `welcome` (which always
  // precedes the first `sky`). Null only if the board somehow mounts before a
  // welcome lands.
  //
  // AS2: `welcome.menus` is no longer read here. It was the study briefing's
  // "what it can tell apart", and the briefing is gone — every board carries
  // its own hypotheses on the wire. The field stays ON THE WIRE (the server
  // still serves it); nothing on the client retains it any more.
  private missionCatalog: MissionCatalog | null = null;
  // A4: the founding sheet's vocabulary, retained the same way.
  private voyageCatalog: VoyageCatalog | null = null;
  private model: Model | null = null;
  private sourceCard: SourceCard | null = null;
  private studyBoard: StudyBoard | null = null;
  // S0.2: the hybrid home shell — the HUD band and the five-tab rail.
  // Mounted alongside the Model on the first sky, torn down with it.
  private home: Home | null = null;
  // S0.2: the HUD's standing lines tick on their own second, independent of
  // any board render — started at sky mount, cleared in that screen's
  // cleanup like every other per-mount handle here.
  private standingInterval: number | null = null;

  // S0.1: the latest `sky`'s SelfView, from both branches of showSky — the
  // intro needs self.starId as its own seed (voicegen.ts's per-player seed
  // contract), and the replay entry can fire long after the mount closure
  // that first had `self` as a parameter.
  private self: SelfView | null = null;

  // Latest `sky` payload's studies/sources, kept for the observatory (mounted
  // separately from the Model/SourceCard's own copies) and for looking up a
  // source's study by starId (setStudyStatus).
  //
  // `studies` is the ENGAGED set and stays that: findStudy reads it, and the
  // source card's status row asks it what this player has going on here.
  // AS2's `ambient` is the sky's other half — a board for every source with
  // no stored record yet — and it is forwarded to the board and read nowhere
  // else here.
  private studies: readonly StudySnapshot[] = [];
  private ambient: readonly StudySnapshot[] = [];
  private sources: readonly DetectedSource[] = [];
  private projects: readonly ProjectSnapshot[] = [];
  private budget: ComputeBudget = { free: 0, ratePerYear: 0, cap: 0, asOfYear: 0 };
  private missions: readonly MissionSnapshot[] = [];
  private tend: readonly TendRow[] = [];
  private probeFlightYearsPerLy = 10;
  // AV3: the mind's current proposals, wholesale-replaced on every `sky` —
  // never appended, never re-sorted client-side (the server's ranked order
  // is load-bearing, per the AV3 design).
  private proposals: readonly Proposal[] = [];
  // S0.3's answer: the arrival note, the mind's first standing sentence
  // after the intro beats. Non-null exactly while it is on screen.
  private arrivalNote: HTMLDivElement | null = null;
  // A4: this player's own foundings and the forecast over the nearest stars,
  // wholesale-replaced on every `sky` like everything else above. THE LEDGER
  // rides the same message — what became of those foundings, and what the
  // standing orders have done — and is forwarded the same way, straight to the
  // board that renders it.
  private voyages: readonly VoyageSnapshot[] = [];
  private survey: readonly SurveyRow[] = [];
  private ledger: LedgerWire = { rows: [], orders: [] };

  // A2.4: the contact block from the latest `sky` — both stances (pushed,
  // never preflighted, so the ceremony can render the mind's objection with
  // no round trip) and the player's own committed acts. Null until the first
  // sky, which is the only state in which no ceremony can be armed.
  // A2.5 widens the same block with `threads` and `openThread`, so the
  // thread list and the one open detail reach the board through the field
  // that was already being handed over — no new plumbing, no second store.
  private contact: ContactWire | null = null;
  private contactCeremony: ContactCeremony | null = null;

  // AV1: one-time lines the mind speaks. A key present means unseen — the
  // payload's whole shape carries no-replay, so this is just the latest
  // `voice` wholesale-replaced (a key already taken this session is dropped
  // locally by takeVoice, never re-added).
  private voiceLines: VoiceLines = {};

  // S0.1: the intro. Non-null exactly while it owns the sky screen — either
  // the fresh path (mounted from showSky's "intro" enter mode) or a replay
  // (mounted from the Mind page's row, IntroOptions.replay true).
  // `pendingIntroReplay` covers the gap in the replay path between
  // requestIntro going out and its answering `voice` landing with all four
  // lines confirmed present.
  private intro: Intro | null = null;
  private pendingIntroReplay = false;

  // AV2: the latest report, wholesale-replaced on every `report` message —
  // same field-then-forward shape as `voice`'s lines, except the report
  // also always gets a *stored* copy here, because it can (and on
  // placement, always does) arrive before the board mounts; the first-sky
  // mount closure hands this to the fresh board's setReport(). S0.2: the
  // panel no longer opens itself (the report waits to be read); this is now
  // also the source refreshReportBadge() counts against.
  private reportPayload: ReportPayload | null = null;

  // The canonical client-side store of the player's private source labels —
  // one Map instance, mutated in place from `sky` (wholesale replace) and
  // `sourceNamed` (single-key update), and shared by reference with
  // whichever SourceCard is currently mounted.
  private readonly localNames = new Map<string, string>();

  // ── A2.6: durable identity ────────────────────────────────────────────
  // Whether THIS SEAT has an account, from the latest `welcome.account` —
  // forwarded to the study board (its hub row's either/or) on every welcome
  // and again the moment the board mounts, so its very first render already
  // knows.
  private hasAccount = false;
  // The re-onboard sheet: a sibling overlay appended directly to `this.root`
  // (the same sibling-overlay pattern the retired voice beat used), NOT torn
  // down by `mount()` — `token-claimed` can arrive before any screen has
  // mounted at all (the very first hello on a dead token), so this cannot
  // depend on a screen existing to sit on.
  private reclaimRoot: HTMLDivElement | null = null;
  private reclaimSignIn: SignInMount | null = null;

  // ── A5: the watch ─────────────────────────────────────────────────────
  // The deployment's VAPID application server key from `welcome.push`, and
  // whether the SEAT holds a subscription from `sky.pushSubscribed`. Both are
  // forwarded to the study board the moment they arrive and again when the
  // board mounts, exactly as `hasAccount` is: a resume's welcome came and went
  // before the first sky.
  private pushPublicKey: string | null = null;
  private pushSubscribed = false;

  constructor(root: HTMLElement, socket: CohortSocket) {
    this.root = root;
    this.socket = socket;
    this.socket.onMessage((message) => this.handleMessage(message));

    // Calm-cadence refresh: the phone slept and light moved on without us.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.mountedScreen === "sky") {
        this.socket.send({ type: "requestSky" });
      }
    });
  }

  private handleMessage(message: CohortServerMessage): void {
    switch (message.type) {
      case "welcome":
        // Retain the public catalog; the sky renders sources at their catalog
        // star's position. A placed welcome is followed immediately by `sky`,
        // which is what actually mounts the Model.
        this.catalog = message.catalog;
        this.missionCatalog = message.missionCatalog;
        this.voyageCatalog = message.voyageCatalog;
        setClockAnchor(message.clock);
        // A2.6: any welcome at all means the hello it answered was accepted
        // — a fresh anonymous seat, a resumed one, or a successful sign-in —
        // so whatever reclaim sheet was up has done its job.
        this.hideReclaim();
        this.hasAccount = message.account;
        this.studyBoard?.setHasAccount(this.hasAccount);
        // A5: the deployment's application server key, or null when no VAPID
        // pair is configured — then nothing below runs, no service worker is
        // registered and the panel renders no watch row.
        this.pushPublicKey = message.push?.publicKey ?? null;
        this.studyBoard?.setPushKey(this.pushPublicKey);
        // THE BOOT RE-SYNC. Endpoints rot silently and
        // `pushsubscriptionchange` is unevenly implemented, so a device that
        // already holds permission re-sends its subscription on every load.
        // Idempotent server-side (keyed by the endpoint's hash), and the only
        // thing that reliably heals a rotated endpoint or a rotated key.
        if (this.pushPublicKey !== null) {
          void resyncWatch(this.pushPublicKey, (msg) => this.socket.send(msg));
        }
        break;
      case "offer":
        this.showCeremony(message.candidates);
        break;
      case "sky":
        this.localNames.clear();
        for (const [starId, name] of Object.entries(message.localNames)) {
          this.localNames.set(starId, name);
        }
        this.studies = message.studies;
        this.ambient = message.ambient;
        this.sources = message.sources;
        this.projects = message.projects;
        this.budget = message.budget;
        this.missions = message.missions;
        this.tend = message.tend;
        this.probeFlightYearsPerLy = message.probeFlightYearsPerLy;
        this.proposals = message.proposals;
        this.contact = message.contact;
        this.voyages = message.voyages;
        this.survey = message.survey;
        this.ledger = message.ledger;
        // A5: whether the SEAT holds a subscription on any device. The board
        // combines it with what the browser says about this one.
        this.pushSubscribed = message.pushSubscribed;
        this.showSky(message.self, message.sources);
        // S0.2: the HUD's standing lines read off fields just set above
        // (self, budget); an immediate render on top of the 1s ticker so a
        // fresh sky's numbers are never stale for up to a second.
        this.refreshStanding();
        break;
      case "sourceNamed":
        if (message.name === "") this.localNames.delete(message.starId);
        else this.localNames.set(message.starId, message.name);
        this.sourceCard?.handleServerMessage(message);
        break;
      case "clock":
        // A re-anchor (dev time-skip). A fresh `sky` follows for placed
        // connections; swapping the anchor is all the client owes.
        setClockAnchor(message.clock);
        break;
      case "voice":
        this.voiceLines = message.lines;
        // S0.1: a replay staged before the round trip landed (onReplayIntro's
        // requestIntro branch, below) starts now, if the four lines are
        // actually here and the sky screen it was staged on is still up. If
        // the screen moved on instead, the wait ends here rather than
        // outliving its own board — drop the flag and best-effort restore
        // the chrome onReplayIntro hid (a no-op if the board is already
        // gone). A genuinely dropped reply on a still-live screen just
        // leaves the flag pending for the next voice message.
        if (this.pendingIntroReplay && this.mountedScreen === "sky") {
          const lines = this.introLinesIfComplete();
          if (lines !== null) {
            this.pendingIntroReplay = false;
            this.startIntroReplay(lines);
          }
        } else if (this.pendingIntroReplay) {
          this.pendingIntroReplay = false;
          this.studyBoard?.setChromeHidden(false);
          this.home?.setHidden(false);
        }
        break;
      case "report":
        this.reportPayload = message.report;
        this.studyBoard?.setReport(message.report);
        this.refreshReportBadge();
        break;
      case "accountKey":
        // A2.6: the ONLY message that carries a key. It only ever answers
        // `claimAccount`/`showAccountKey`, both sent from the hub row, so the
        // board is always mounted by the time this arrives.
        this.studyBoard?.showAccountKey(message.key, message.fresh);
        break;
      case "error":
        // The ceremony subscribes to the socket directly for become-
        // rejection errors; the source card only reacts while it has a
        // nameSource request in flight, so forwarding unconditionally is
        // safe even outside the sky screen. The observatory needs it to
        // release a begin that will never be confirmed by a `sky`.
        this.sourceCard?.handleServerMessage(message);
        // A2.6: the board takes the CODE now, for one branch only — a
        // `contact-unavailable` on a send is the turnaround floor, and the
        // composer has a line to say about it. Every other code still
        // releases the same silent way it always has.
        this.studyBoard?.handleServerError(message.code);
        // A2.4: only reacts while a commit of its own is in flight, and then
        // it reverses the optimistic bloom and states the reason.
        this.contactCeremony?.handleServerError(message.message);
        // A2.6: the seat this connection's stored token names now belongs to
        // an account. net.ts has already dropped the dead token by the time
        // this runs (its own absorbCredentials); this is the UI half — the
        // re-onboard sheet, over whatever else is on screen.
        if (message.code === "token-claimed") this.showReclaim();
        break;
    }
  }

  private mount(render: () => ScreenCleanup | void): void {
    this.currentCleanup?.();
    this.root.innerHTML = "";
    const cleanup = render();
    this.currentCleanup = cleanup ?? null;
  }

  /**
   * A2.6: the re-onboard sheet. A sibling overlay on `this.root`, appended
   * rather than mounted, so it survives whatever `mount()` last put up (or
   * the fact that nothing has mounted yet) — this can fire before the very
   * first `welcome`. No ambient dismiss: [Sign in] and [Begin again] are the
   * only two ways out, and `hideReclaim()` (called unconditionally on the
   * next `welcome`) takes it down the moment either one succeeds.
   */
  private showReclaim(): void {
    if (this.reclaimRoot !== null) return;

    const root = document.createElement("div");
    root.className = "reclaim-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "This run now belongs to an account");

    const scrim = document.createElement("div");
    scrim.className = "reclaim-scrim";

    const panel = document.createElement("div");
    panel.className = "reclaim-panel";

    const line = document.createElement("p");
    line.className = "reclaim-line";
    line.textContent =
      "This run now belongs to an account. Sign in with your key, or begin again.";
    panel.append(line);

    const actions = document.createElement("div");
    actions.className = "reclaim-actions";

    const signInToggle = document.createElement("button");
    signInToggle.type = "button";
    signInToggle.className = "reclaim-signin-toggle holos-caps";
    signInToggle.textContent = "Sign in";
    signInToggle.addEventListener("click", () => {
      if (this.reclaimSignIn !== null) return;
      signInToggle.hidden = true;
      const field = mountSignIn(this.socket);
      this.reclaimSignIn = field;
      panel.append(field.el);
    });

    const beginBtn = document.createElement("button");
    beginBtn.type = "button";
    beginBtn.className = "reclaim-begin-btn holos-caps";
    beginBtn.textContent = "Begin again";
    beginBtn.addEventListener("click", () => {
      // A fresh anonymous hello, on the live socket — the exact shape a
      // brand-new tab sends (net.ts's sendHello with nothing stored yet).
      this.socket.send({ type: "hello", token: null, account: null });
      this.hideReclaim();
    });

    actions.append(signInToggle, beginBtn);
    panel.append(actions);

    root.append(scrim, panel);
    this.root.append(root);
    this.reclaimRoot = root;
    requestAnimationFrame(() => root.classList.add("open"));
  }

  private hideReclaim(): void {
    if (this.reclaimRoot === null) return;
    this.reclaimSignIn?.destroy();
    this.reclaimSignIn = null;
    this.reclaimRoot.remove();
    this.reclaimRoot = null;
  }

  private showCeremony(candidates: readonly CivCard[]): void {
    if (this.mountedScreen === "ceremony") return;
    this.mountedScreen = "ceremony";
    this.model = null;
    this.sourceCard = null;
    this.studyBoard = null;
    this.mount(() => renderCeremony(this.root, candidates, this.socket));
  }

  /** The study for `starId` in the latest sky payload, or undefined if none
   * is open/shelved for it. */
  private findStudy(starId: string): StudySnapshot | undefined {
    return this.studies.find((s) => s.starId === starId);
  }

  /** The source card's mission-row state for `starId`, derived from the
   *  latest sky's missions — "live" beats "inactive" beats "none". */
  private findMissionState(starId: string): MissionCardState {
    const onStar = this.missions.filter((m) => m.starId === starId);
    if (onStar.some((m) => isLiveMissionState(m.state))) return "live";
    if (onStar.length > 0) return "inactive";
    return "none";
  }

  /** A2.4: the contact row's state for `starId` — the arrival year of a beam
   *  already aimed there, or null. Straight off the server's own record of
   *  the player's acts; nothing local ever fills this in. */
  private findContactState(starId: string): ContactCardState {
    const act = this.contact?.outbound.find(
      (a) => a.kind === "hail" && a.starId === starId,
    );
    if (act === undefined || act.arrivesYear === null) return null;
    return { arrivesYear: act.arrivesYear };
  }

  /** A4: the founding row's state for `starId` — whether one of this
   *  player's own ships is still crossing to it. Straight off the sky's own
   *  voyage list; nothing local ever fills this in. */
  private findVoyageState(starId: string): VoyageCardState {
    return this.voyages.some((v) => v.starId === starId && isLiveVoyageState(v.state))
      ? "live"
      : "none";
  }

  /** A2.6: the mutual quiet standing with this source, for the card's rail.
   *  Straight off the thread summary the sky already carries — the card
   *  renders it and derives nothing (findContactState's contract). Null when
   *  there is no thread there, or no understanding in it. */
  private findAccord(starId: string): AccordRail | null {
    const thread = this.contact?.threads.find((t) => t.starId === starId);
    if (thread === undefined || thread.accord.state === "none") return null;
    return thread.accord;
  }

  /** The one live mission on `starId`, if any — for the source card's
   *  DISPATCH verb deciding between "focus it" and "open the launch sheet". */
  private findLiveMission(starId: string): MissionSnapshot | undefined {
    return this.missions.find((m) => m.starId === starId && isLiveMissionState(m.state));
  }

  /** Take a one-time line if still held: returns it once, reports it shown,
   *  never returns it again this session. */
  private takeVoice(key: VoiceKey): string | null {
    const text = this.voiceLines[key];
    if (text === undefined) return null;
    this.voiceLines = { ...this.voiceLines, [key]: undefined };
    this.socket.send({ type: "voiceSeen", key });
    return text;
  }

  /**
   * S0.3's answer, the arrival note: the mind's one line after the four
   * beats, over the first-watch proposal it argues for. Shown once ever
   * (the "firstsky" key, takeVoice's contract) and only over the sky it
   * was written for — rule 1's pick is the top proposal exactly while
   * nothing is engaged (serveProposals's first-watch exclusivity, and the
   * proposal id is that rule's own stable prefix). Any other sky means
   * this civ's arrival predates the note; the line is buried unshown
   * rather than replayed over a life already in motion.
   */
  private maybeShowArrival(): void {
    if (this.voiceLines.firstsky === undefined) return;
    if (this.mountedScreen !== "sky" || this.intro !== null) return;
    const top = this.proposals[0];
    if (top === undefined || !top.id.startsWith("first-watch/") || top.route.kind !== "study-brief") {
      this.takeVoice("firstsky");
      return;
    }
    const lineText = this.takeVoice("firstsky");
    if (lineText === null) return;
    this.showArrivalNote(lineText, top, top.route.starId);
  }

  /** The note itself: the mind's line, then the proposal in the Mind page's
   *  own chrome (.proposal-line/-stance/-accept/-decline), so the note and
   *  the page it points back to read as the same speaker. "Later" only
   *  closes the note — it is not a decline; the proposal stays on the Mind
   *  page, which is where a player who taps Later will find it again. */
  private showArrivalNote(mindLine: string, p: Proposal, starId: string): void {
    this.dismissArrivalNote();
    const note = document.createElement("div");
    note.className = "arrival-note";

    const voiceEl = document.createElement("div");
    voiceEl.className = "arrival-note-voice";
    voiceEl.textContent = mindLine;
    note.append(voiceEl);

    const lineEl = document.createElement("div");
    lineEl.className = "proposal-line";
    lineEl.textContent = p.line;
    note.append(lineEl);

    if (p.stance !== null) {
      const stance = document.createElement("div");
      stance.className = "proposal-stance";
      stance.textContent = p.stance;
      note.append(stance);
    }

    const actions = document.createElement("div");
    actions.className = "proposal-actions";
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "proposal-accept holos-caps";
    accept.textContent = p.verb;
    accept.addEventListener("click", () => {
      this.dismissArrivalNote();
      // The sky's own study door (the source card's row makes the same
      // call): straight to the board, ambient face, ‹ STUDIES back out.
      this.studyBoard?.focusStudy(starId);
    });
    const later = document.createElement("button");
    later.type = "button";
    later.className = "proposal-decline";
    later.textContent = "Later";
    later.addEventListener("click", () => this.dismissArrivalNote());
    actions.append(accept, later);
    note.append(actions);

    this.root.append(note);
    this.arrivalNote = note;
  }

  private dismissArrivalNote(): void {
    this.arrivalNote?.remove();
    this.arrivalNote = null;
  }

  /** S0.1: the four intro beats, in the pinned order, or null if the server
   *  has not (or no longer) served all four. VOICE_KEYS tracks each beat's
   *  seen state independently (protocol.ts's comment on the four keys), so
   *  partial presence is a real state — a client that dismissed beat three
   *  but dropped before beat four — and partial is not complete. Presence
   *  is also the autoplay gate's whole contract: a key present means unseen
   *  server-side, so "all four present" is the only signal that says a
   *  fresh player has not been shown the intro yet. */
  private introLinesIfComplete(): readonly [string, string, string, string] | null {
    const { intro1, intro2, intro3, intro4 } = this.voiceLines;
    if (
      intro1 === undefined ||
      intro2 === undefined ||
      intro3 === undefined ||
      intro4 === undefined
    ) {
      return null;
    }
    return [intro1, intro2, intro3, intro4];
  }

  /** S0.1: starts the intro's replay. The two ways in (immediate, or after
   *  requestIntro's round trip in the "voice" case above) both funnel
   *  through here so the start contract cannot drift between them: seeded
   *  off the latest self, `replay: true` (no voiceSeen, no
   *  clearPendingBecome, no arrival beat — those belong only to the fresh
   *  path in showSky's mount). Silently does nothing if the sky screen (or
   *  self) is not there to replay against — the screen-swap bail in the
   *  "voice" case above is the only caller that can race this. */
  private startIntroReplay(lines: readonly [string, string, string, string]): void {
    const model = this.model;
    const studyBoard = this.studyBoard;
    const self = this.self;
    if (model === null || studyBoard === null || self === null) return;
    this.intro = new Intro(this.root, model, {
      lines,
      seed: self.starId,
      replay: true,
      onDone: () => {
        this.intro = null;
        studyBoard.setChromeHidden(false);
        this.home?.setHidden(false);
      },
    });
  }

  /** At most one source-card explainer per open — the age chip first, the
   *  silence note on a later open. Two lines share one surface here, and a
   *  card is opened often enough that the next open is a real event; the
   *  clock note left Sky's page for Projects because a second open of THAT
   *  page was not. The silence line states the
   *  Fermi stance once and nowhere else: it belongs here because this is
   *  where a class label is read, and it comes second because the age chip
   *  teaches the physics the stance then leans on (act3-design.md, *The
   *  silence, kept*). Idempotent by way of takeVoice. */
  private takeSourceCardVoice(): string | null {
    return this.takeVoice("age") ?? this.takeVoice("silence");
  }

  /** S0.2: the HUD's ticking year, at instrument precision — the civ's OWN
   *  count from its ascension (R-33: never the cohort's absolute year), two
   *  fixed decimals so the passage of game time is visible on the dial (a
   *  hundredth of a year is three real seconds on the shipped clock). */
  private standingYearText(): string {
    return `YEAR ${formatEpochYearPrecise(nowYear())}`;
  }

  /** S0.2: the compute meter — the same local accrual the retired masthead
   *  ran, clamped at the attention ceiling like the server's own
   *  freeComputeAt; the bar carries the fullness, the label the number and
   *  the rate. Null when there is no ceiling to draw against. */
  private computeMeterState(): { readonly fill: number; readonly label: string } | null {
    if (this.budget.cap <= 0) return null;
    const elapsedYears = Math.max(0, nowYear() - this.budget.asOfYear);
    const free = Math.min(this.budget.cap, this.budget.free + this.budget.ratePerYear * elapsedYears);
    return {
      fill: free / this.budget.cap,
      label: `COMPUTE ${Math.floor(free)} · +${this.budget.ratePerYear}/Y`,
    };
  }

  /** Renders the standing lines and the meter against the latest
   *  self/budget. A no-op before the first sky (self null) or once the
   *  shell has torn down (home null) — the 1s interval and the sky handler
   *  both call this unconditionally rather than each guarding it
   *  themselves. */
  private refreshStanding(): void {
    if (this.self === null) return;
    this.home?.setStanding(this.self.designation, this.standingYearText());
    this.home?.setCompute(this.computeMeterState());
  }

  /** S0.2: the Report tab's badge — the count of entries not yet marked
   *  seen (studyBoard.onReportOpen's handler writes the marker on open).
   *  Called on every `report` message and once at the first sky mount, from
   *  whatever payload is already in hand (AV2: a `report` can arrive before
   *  the board, and hence before `self`, has). */
  private refreshReportBadge(): void {
    const self = this.self;
    const payload = this.reportPayload;
    if (self === null || payload === null) return;
    const seen = loadSeenReportIds(self.civId);
    const unseen = payload.entries.filter((e) => !seen.has(e.id)).length;
    this.home?.setReportBadge(unseen);
  }

  private showSky(self: SelfView, sources: readonly DetectedSource[]): void {
    // S0.1: kept for the intro's seed regardless of which branch below runs.
    this.self = self;
    // R-33: every dated surface string subtracts this civ's own zero from the
    // wire's cohort-absolute year, so the epoch anchor is set before anything
    // below can mount a surface that renders a date.
    setEpochAnchor(self.seed.ascensionYear);
    // Later sky messages (another civ joined, or the calm-cadence refresh)
    // just update the Model and, if a card is open, its live source data.
    if (this.mountedScreen === "sky" && this.model !== null) {
      this.model.setSky(self, sources);
      this.model.setContact(this.contact);
      this.contactCeremony?.setSky(sources);
      this.studyBoard?.setSelf(self);
      // A rename cannot happen, but the field-driven idiom is the file's:
      // re-set on every sky rather than assumed still correct from mount.
      this.home?.setIdentity(self.seed.name);
      this.studyBoard?.setVoyages(this.voyages, this.survey);
      this.studyBoard?.setLedger(this.ledger);
      this.studyBoard?.setAmbient(this.ambient);
      this.sourceCard?.setLocalNames(this.localNames);
      const openId = this.sourceCard?.currentStarId() ?? null;
      if (openId !== null) {
        const updated = sources.find((s) => s.starId === openId);
        if (updated !== undefined) {
          this.sourceCard?.setSource(updated);
          this.sourceCard?.setStudyStatus(this.findStudy(openId)?.status ?? null);
          this.sourceCard?.setMissionState(this.findMissionState(openId));
          this.sourceCard?.setContactState(this.findContactState(openId));
          this.sourceCard?.setVoyageState(this.findVoyageState(openId));
          this.sourceCard?.setAccord(this.findAccord(openId));
        }
        // else: the Model's setSky above already fired onSelectSource(null)
        // for a selection that no longer corresponds to a live source.
      }
      this.studyBoard?.update(
        this.studies,
        this.sources,
        this.localNames,
        this.projects,
        this.budget,
        this.missions,
        this.tend,
        this.probeFlightYearsPerLy,
        this.proposals,
        this.contact,
      );
      return;
    }

    // First sky this session: decide the opening beat before clearing the
    // marker, then mount the Model + its source card + the observatory.
    // "intro" iff a fresh BECOME is still pending AND the server actually
    // served all four beats (their presence is the autoplay contract — a
    // veteran's resume never autoplays, seen or not, because pendingBecome
    // is never set on a resume in the first place); "pullback" is the
    // shipped fallback for a fresh player whose voice message somehow
    // lacked the beats.
    const introLines = hasPendingBecome() ? this.introLinesIfComplete() : null;
    const mode: "intro" | "pullback" | "resume" =
      introLines !== null ? "intro" : hasPendingBecome() ? "pullback" : "resume";
    this.mountedScreen = "sky";
    this.mount(() => {
      const model = new Model(this.root, this.catalog);
      const sourceCard = new SourceCard(this.root, this.socket);
      const studyBoard = new StudyBoard(
        this.root,
        this.socket,
        this.missionCatalog,
        this.voyageCatalog,
        this.catalog,
        // Where a focused study's detail goes: the source card anchored at
        // the star it is about, which is why the card is constructed above
        // the board rather than beside it.
        {
          acquire: (starId, source) => {
            // A fresh drill-in rather than the once-a-second rebuild. The
            // board cannot light the ring itself here: with its own sheet
            // down it reports no viewed star, by design.
            if (sourceCard.currentStarId() !== starId) model.selectStar(starId);
            return sourceCard.acquireDetail(source, this.localNames);
          },
          release: () => sourceCard.releaseDetail(),
        },
      );
      const contactCeremony = new ContactCeremony(this.root, model, this.socket);
      // S0.2: the hybrid home shell. Constructed before the board's own
      // wiring below so its rail can drive showTab() from the very first
      // handler registered against it.
      const home = new Home(this.root, { onTab: (tab) => studyBoard.showTab(tab) });
      this.model = model;
      this.sourceCard = sourceCard;
      this.studyBoard = studyBoard;
      this.contactCeremony = contactCeremony;
      this.home = home;
      // onViewChanged does not fire on registration, so the rail starts on
      // Sky explicitly, matching the board's own initial view.
      home.setActiveTab("sky");
      home.setIdentity(self.seed.name);
      this.refreshReportBadge();
      // The counsel strip's TALK tap used to hang here, and it carried the
      // `arrival` acknowledgement with it: tapping it reported the line seen
      // and dropped it locally. With the strip cut (2026-08) NOTHING reads or
      // acknowledges `arrival` any more, so the server offers it again every
      // session. That is inert rather than broken, and it is deliberate: the
      // arrival line is the intro's own payoff and the next slice decides
      // where it lands. Whatever surface takes it owes this `voiceSeen`.
      studyBoard.onViewChanged((tab, open) => {
        home.setActiveTab(open ? tab : "sky");
      });
      // A2.6: this board's very first render already knows — no waiting on
      // a welcome that, on a resume, already came and went.
      studyBoard.setHasAccount(this.hasAccount);
      // A5: the same, for the watch — the welcome that carried the key may
      // already have come and gone on a resume.
      studyBoard.setPushKey(this.pushPublicKey);

      // While a ceremony is armed the sky belongs to it: the two standing
      // chips stand down, so the only things a thumb can reach are the
      // canvas (the press) and the one word that says no.
      contactCeremony.onActive((active) => {
        studyBoard.setChromeHidden(active);
        home.setHidden(active);
      });

      /** Stage a ceremony. The three entry points all funnel through here so
       *  there is one place that closes what is open, drops the selection
       *  ring and hands the sky over. */
      const stage = (arm: () => void): void => {
        sourceCard.close();
        model.clearSelection();
        studyBoard.close();
        arm();
      };

      model.onSelectSource((source) => {
        if (source === null) {
          sourceCard.close();
          // Desktop: the board may still be open beside the sky, reading one
          // system. An empty-sky tap dismisses the card, not that, so the
          // ring falls back to the board's system rather than to nothing.
          const viewed = studyBoard.viewedStarId();
          if (viewed !== null) model.selectStar(viewed);
        } else {
          sourceCard.open(source, this.localNames);
          sourceCard.setStudyStatus(this.findStudy(source.starId)?.status ?? null);
          sourceCard.setMissionState(this.findMissionState(source.starId));
          sourceCard.setContactState(this.findContactState(source.starId));
          sourceCard.setVoyageState(this.findVoyageState(source.starId));
          sourceCard.setAccord(this.findAccord(source.starId));
          sourceCard.setExplainer(this.takeSourceCardVoice());
        }
      });
      sourceCard.onClose(() => {
        // This dismissal may have taken a focused study with it, and the
        // board is still on that view with its sheet down. It has to be told,
        // or the next tick puts the study back on a card the player just
        // swiped away.
        studyBoard.leaveFocusedCard();
        // The card's dismiss drops its ring, unless the board behind it is
        // still reading a system; then the ring falls back to that one.
        const viewed = studyBoard.viewedStarId();
        if (viewed !== null) model.selectStar(viewed);
        else model.clearSelection();
      });
      // The board is a partial-width panel on desktop, so the sky stays
      // visible beside it: the selection ring tracks whichever system the
      // open view is about. On a null the ring is only dropped when no card
      // holds its own selection over the board.
      studyBoard.onViewedStar((starId) => {
        if (starId !== null) model.selectStar(starId);
        else if (!sourceCard.isOpen()) model.clearSelection();
      });
      studyBoard.onInspect((starId) => {
        // This hands the card to a plain source, so whatever study was
        // borrowing it as its surface lets go first.
        studyBoard.leaveFocusedCard();
        const source = this.sources.find((s) => s.starId === starId);
        if (source === undefined) return;
        model.selectStar(starId);
        sourceCard.open(source, this.localNames);
        sourceCard.setStudyStatus(this.findStudy(starId)?.status ?? null);
        sourceCard.setMissionState(this.findMissionState(starId));
        sourceCard.setContactState(this.findContactState(starId));
        sourceCard.setVoyageState(this.findVoyageState(starId));
        sourceCard.setAccord(this.findAccord(starId));
        sourceCard.setExplainer(this.takeSourceCardVoice());
      });
      // AS2: the card's study row is a door and never a verb. Every detected
      // source carries a board already, so there is nothing to ask the server
      // for and nothing to wait on — the tap hands straight to the board,
      // ambient or engaged alike.
      sourceCard.onStudyAction((starId) => {
        sourceCard.close();
        model.clearSelection();
        studyBoard.focusStudy(starId);
      });
      // A2.4: AIM A BEAM. The stance rides the same `sky` that produced this
      // source, so the mind's objection (if it has one) is already in hand
      // and the ceremony arms with no round trip.
      // KN: both prices ride the same sky, so the ceremony can offer the
      // binary (knock bare, carry the charter) and restage the objection
      // without asking the server anything.
      sourceCard.onContactAction((starId) => {
        const contact = this.contact;
        if (contact === null) return;
        stage(() =>
          contactCeremony.armHail(
            starId,
            { bare: contact.hail, named: contact.namedHail },
            this.sources,
          ),
        );
      });
      // A2.4: SPEAK TO EVERYONE, from the hub's own one-row section.
      studyBoard.onVoiceAction(() => {
        const contact = this.contact;
        if (contact === null) return;
        stage(() => contactCeremony.armBroadcast(contact.broadcast, this.sources));
      });
      // A2.5: a thread the player has never spoken into — they hailed first
      // and nothing of ours has ever been aimed at them. Answering is the
      // hail ceremony at its usual price, staged through the same funnel as
      // every other way in, so the sky is handed over exactly once.
      studyBoard.onHailAction((starId) => {
        const contact = this.contact;
        if (contact === null) return;
        stage(() =>
          contactCeremony.armHail(
            starId,
            { bare: contact.hail, named: contact.namedHail },
            this.sources,
          ),
        );
      });
      // The HOME mote is the one present-tense object on the sky, and what it
      // points at is a place: the world this civilization woke on, still
      // turning around its own star. So tapping it FLIES THERE — the
      // act-opening pull-back run backwards, into the orrery the intro left.
      // Tapping it again from down there flies back out to the volume, so the
      // mote is a round trip rather than a one-way drop that strands a player
      // who does not know the sky answers a pinch.
      //
      // Which way is a question about where the camera already is, and the
      // camera is logarithmic (thirteen orders of magnitude), so the midpoint
      // is a GEOMETRIC one: nearer the world than the volume in log distance
      // means the tap is asking to leave. That derives the boundary from the
      // two poses instead of pinning a light-year count that every star class
      // would want set differently.
      //
      // It replaces opening Sky's page at the voice section. Nothing is
      // stranded: that section is on Sky's page, one rail tap away.
      model.onSelectHome(() => {
        const opening = model.openingPose();
        const volume = model.volumePose();
        // Null until the home system is known, which is before the first sky
        // and therefore before any of this is on screen to tap.
        if (opening === null) return;
        const here = model.cameraView().distLy;
        const goingOut = here < Math.sqrt(opening.distLy * volume.distLy);
        const to = goingOut ? volume : opening;
        // The sky is the thing for the length of a flight: the card, the ring
        // and the page all come down, the way `stage` clears it for a
        // ceremony. The board's own close puts the rail back on Sky.
        sourceCard.close();
        model.clearSelection();
        studyBoard.close();
        model.dollyTo(to.distLy, to.az, to.el, homeFlyMs(here, to.distLy));
      });
      sourceCard.onMissionAction((starId) => {
        const live = this.findLiveMission(starId);
        sourceCard.close();
        model.clearSelection();
        if (live !== undefined) {
          studyBoard.focusMission(live.id);
        } else {
          studyBoard.openLaunch(starId);
        }
      });
      // A4: SEND A SHIP. The card covers the sources; THE SURVEY covers the
      // empty stars, and both open the same sheet. The card closes behind it
      // (the DISPATCH row's own beat) — a founding is written on a full
      // column, not over the top of the thing it is aimed at.
      sourceCard.onVoyageAction((starId) => {
        sourceCard.close();
        model.clearSelection();
        studyBoard.openVoyageLaunch(starId);
      });
      // AV1: the compute explainer, once, on the first open of Sky's page —
      // the page whose rows spend the number. The guard is what keeps the
      // note up across a drill-in and back (openSkyPage re-fires on every
      // back leg out of a Sky-owned page, and takeVoice is idempotent, so
      // the second call returns null); the panel's close() is what finally
      // takes it down.
      studyBoard.onHubOpen(() => {
        const lineText = this.takeVoice("compute");
        if (lineText !== null) studyBoard.setHubExplainer(lineText);
      });
      // AV1: the clock explainer — shown once, on the first open of the
      // Projects page, because Projects is the first surface that quotes
      // durations in game years (a project runs 20 to 320 of them) and the
      // note is what those years convert into. It used to sit behind the
      // compute note on Sky, reachable only on a second open of that page,
      // which most players never made.
      studyBoard.onWorkOpen(() => {
        studyBoard.setWorkExplainer(this.takeVoice("clock"));
      });
      // AV2: the epoch-dating explainer — shown once, on the first report
      // open, because the report is where "year n AE" first appears. S0.2:
      // the same open writes the badge's seen marker and clears the count
      // that brought the player here.
      studyBoard.onReportOpen(() => {
        studyBoard.setReportExplainer(this.takeVoice("epoch"));
        if (this.reportPayload !== null) {
          saveSeenReportIds(
            self.civId,
            this.reportPayload.entries.map((e) => e.id),
          );
        }
        home.setReportBadge(0);
      });
      // AS2: the board explainer — shown once, on the first board this player
      // opens, ambient or engaged. It says what a standing watch is and what
      // attending to one costs, which is the whole of what the retired
      // briefing screen taught. Unguarded like the work and report notes: a
      // later open takes the field back to null of its own accord, and the
      // line itself never comes back (takeVoice is idempotent).
      studyBoard.onStudyOpen(() => {
        studyBoard.setStudyExplainer(this.takeVoice("study"));
      });
      // S0.1: THE MIND's one row, replaying the intro. Guarded against a
      // double-arm the same way the ceremony's three entry points are
      // guarded by having only one live thing to stage at a time.
      studyBoard.onReplayIntro(() => {
        if (this.intro !== null) return;
        sourceCard.close();
        model.clearSelection();
        studyBoard.close();
        studyBoard.setChromeHidden(true);
        home.setHidden(true);
        const lines = this.introLinesIfComplete();
        if (lines !== null) {
          this.startIntroReplay(lines);
        } else {
          this.socket.send({ type: "requestIntro" });
          this.pendingIntroReplay = true;
        }
      });

      model.setSky(self, sources);
      model.setContact(this.contact);
      studyBoard.setSelf(self);
      studyBoard.setVoyages(this.voyages, this.survey);
      studyBoard.setLedger(this.ledger);
      studyBoard.setAmbient(this.ambient);
      studyBoard.setPushSubscribed(this.pushSubscribed);
      studyBoard.update(
        this.studies,
        this.sources,
        this.localNames,
        this.projects,
        this.budget,
        this.missions,
        this.tend,
        this.probeFlightYearsPerLy,
        this.proposals,
        this.contact,
      );
      // AV2: a `report` message can (and on placement, does) arrive before
      // this board exists — handleMessage stored it on `this.reportPayload`
      // regardless. Hand the fresh board that stored copy now, the same
      // beat as the update() call just above.
      if (this.reportPayload !== null) studyBoard.setReport(this.reportPayload);
      model.enter(mode);
      if (introLines !== null) {
        // S0.1: pendingBecome stays SET through the whole sequence — a
        // reload mid-intro must come back through this same branch (the
        // beats are still unseen server-side and the marker is still
        // there), never fall back to a bare "resume". It only clears in
        // Intro's onDone below, once the beats are actually seen.
        studyBoard.setChromeHidden(true);
        home.setHidden(true);
        this.intro = new Intro(this.root, model, {
          lines: introLines,
          seed: self.starId,
          replay: false,
          onDone: (_outcome) => {
            // AV1: seen either way — finishing the sequence and skipping it
            // both count as having been shown it once.
            for (const key of ["intro1", "intro2", "intro3", "intro4"] as const) {
              this.socket.send({ type: "voiceSeen", key });
              this.voiceLines = { ...this.voiceLines, [key]: undefined };
            }
            clearPendingBecome();
            studyBoard.setChromeHidden(false);
            home.setHidden(false);
            this.intro = null;
            // The handoff the cut counsel strip left open: the beats end,
            // and the mind's arrival note is the first thing standing.
            this.maybeShowArrival();
          },
        });
      } else {
        clearPendingBecome();
        // No intro to wait on (a reconnect, or the beats were seen on
        // another device): the arrival note stands on its own if its
        // moment is still this civ's moment — maybeShowArrival buries it
        // otherwise.
        this.maybeShowArrival();
      }
      // S0.2: the HUD's standing lines tick on their own second; the sky
      // handler's immediate refreshStanding() covers the gap until the
      // first tick.
      this.standingInterval = window.setInterval(() => this.refreshStanding(), 1000);
      return () => {
        contactCeremony.destroy();
        model.destroy();
        sourceCard.destroy();
        studyBoard.destroy();
        home.destroy();
        if (this.standingInterval !== null) {
          window.clearInterval(this.standingInterval);
          this.standingInterval = null;
        }
        this.intro?.destroy();
        this.intro = null;
        this.dismissArrivalNote();
        if (this.model === model) this.model = null;
        if (this.sourceCard === sourceCard) this.sourceCard = null;
        if (this.studyBoard === studyBoard) this.studyBoard = null;
        if (this.contactCeremony === contactCeremony) this.contactCeremony = null;
        if (this.home === home) this.home = null;
      };
    });
  }
}
