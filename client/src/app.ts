// Tiny screen router. Holds the latest CohortServerMessage-derived state and
// swaps the mounted view: the inheritance ceremony or the Model (the 3D sky).
//
// The Model mounts on the first `sky` message (which carries the SelfView and
// the detected sources); the star catalog is retained from `welcome`. The
// pull-back-vs-resume decision lives here: a `sky` that arrives while a
// `become` this session is still pending → the one-shot "pullback"; any other
// placed sky (a reconnect/resume) → "resume".

import type {
  CohortServerMessage,
  StudySnapshot,
  CivCard,
  DetectedSource,
  SelfView,
  Star,
  ProjectSnapshot,
  ComputeBudget,
  HypothesisMenus,
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
import { SourceCard, type ContactCardState, type MissionCardState } from "./sourcecard";
import { setClockAnchor } from "./clock";
import { VoiceBeat } from "./voicebeat";
import { ContactCeremony } from "./contactceremony";

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

type ScreenCleanup = () => void;

export class App {
  private readonly root: HTMLElement;
  private readonly socket: CohortSocket;
  private currentCleanup: ScreenCleanup | null = null;
  private mountedScreen: "none" | "ceremony" | "sky" = "none";

  private catalog: readonly Star[] = [];
  // The opening hypothesis menus, retained from `welcome` (which always
  // precedes the first `sky`) for the study briefing's "what it can tell
  // apart". Null only if the board somehow mounts before a welcome lands.
  private menus: HypothesisMenus | null = null;
  // The launch sheet's vocabulary, retained from `welcome` like `menus`.
  private missionCatalog: MissionCatalog | null = null;
  private model: Model | null = null;
  private sourceCard: SourceCard | null = null;
  private studyBoard: StudyBoard | null = null;

  // Latest `sky` payload's studies/sources, kept for the observatory (mounted
  // separately from the Model/SourceCard's own copies) and for looking up a
  // source's study by starId (setStudyStatus, the pending-focus handoff).
  private studies: readonly StudySnapshot[] = [];
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
  // locally by takeVoice/playArrival, never re-added).
  private voiceLines: VoiceLines = {};
  private voiceBeat: VoiceBeat | null = null;

  // AV2: the latest report, wholesale-replaced on every `report` message —
  // same field-then-forward shape as `voice`'s lines, except the report
  // also always gets a *stored* copy here, because it can (and on
  // placement, always does) arrive before the board mounts; the first-sky
  // mount closure hands this to the fresh board's setReport(). Session-open
  // uses it too (maybeOpenReport): the panel opens once per session iff
  // this has entries and the arrival beat is not in the way.
  private reportPayload: ReportPayload | null = null;
  private reportOpened = false;

  // Set when the source card fires onStudyAction for a source with no study
  // yet: we've sent `openStudy` and are waiting for the confirming `sky` to
  // carry it, at which point the observatory opens focused on it.
  private pendingStudyFocus: string | null = null;

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
  // (the voicebeat.ts mold), NOT torn down by `mount()` — `token-claimed`
  // can arrive before any screen has mounted at all (the very first hello
  // on a dead token), so this cannot depend on a screen existing to sit on.
  private reclaimRoot: HTMLDivElement | null = null;
  private reclaimSignIn: SignInMount | null = null;

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
        this.menus = message.menus;
        this.missionCatalog = message.missionCatalog;
        setClockAnchor(message.clock);
        // A2.6: any welcome at all means the hello it answered was accepted
        // — a fresh anonymous seat, a resumed one, or a successful sign-in —
        // so whatever reclaim sheet was up has done its job.
        this.hideReclaim();
        this.hasAccount = message.account;
        this.studyBoard?.setHasAccount(this.hasAccount);
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
        this.sources = message.sources;
        this.projects = message.projects;
        this.budget = message.budget;
        this.missions = message.missions;
        this.tend = message.tend;
        this.probeFlightYearsPerLy = message.probeFlightYearsPerLy;
        this.proposals = message.proposals;
        this.contact = message.contact;
        this.showSky(message.self, message.sources);
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
        break;
      case "report":
        this.reportPayload = message.report;
        this.studyBoard?.setReport(message.report);
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

  /** If a study was just requested (onStudyAction, no prior study) and the
   * confirming sky has now arrived carrying it, hand focus to the
   * observatory — the phone-checklist beat "flag a source; a study opens". */
  private maybeFocusPendingStudy(): void {
    const starId = this.pendingStudyFocus;
    if (starId === null || this.findStudy(starId) === undefined) return;
    this.sourceCard?.close();
    this.model?.clearSelection();
    this.studyBoard?.focusStudy(starId);
    this.pendingStudyFocus = null;
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

  /** At most one source-card explainer per open — the age chip first, the
   *  silence note on a later open (the hub's compute-then-clock idiom,
   *  applied to the sky's reading surface). The silence line states the
   *  Fermi stance once and nowhere else: it belongs here because this is
   *  where a class label is read, and it comes second because the age chip
   *  teaches the physics the stance then leans on (act3-design.md, *The
   *  silence, kept*). Idempotent by way of takeVoice. */
  private takeSourceCardVoice(): string | null {
    return this.takeVoice("age") ?? this.takeVoice("silence");
  }

  /** The arrival beat is the exception to takeVoice's report-on-take: the
   *  tap is the acknowledgement, so `voiceSeen` is reported ON DISMISS, not
   *  here — a crash mid-beat replays it next session, the friendlier
   *  failure. Safe to call more than once (double-mount guarded).
   *
   *  AV2: returns whether a beat is up (just mounted, or already was) —
   *  false only when there was no arrival line to show. Both call sites use
   *  this to decide whether the report's session-open can fire right away
   *  or must wait for the beat's onDismiss: the arrival beat always wins. */
  private playArrival(): boolean {
    if (this.voiceBeat !== null) return true;
    const text = this.voiceLines["arrival"];
    if (text === undefined) return false;
    this.voiceLines = { ...this.voiceLines, arrival: undefined };
    this.voiceBeat = new VoiceBeat(this.root, text, () => {
      this.socket.send({ type: "voiceSeen", key: "arrival" });
      this.voiceBeat = null;
      this.maybeOpenReport();
    });
    return true;
  }

  /** AV2: opens the report panel once per placed session — the arrival beat
   *  always goes first (both call sites below call this only when
   *  playArrival() reports nothing was mounted; the beat's own onDismiss
   *  calls this too, once it closes). Requires the sky screen to actually
   *  be mounted (studyBoard exists) and a stored payload with at least one
   *  entry — an empty report is not worth interrupting arrival for. Never
   *  called from the "later sky" branch of showSky or from the
   *  visibilitychange refresh, so a reconnect never re-fires it. */
  private maybeOpenReport(): void {
    if (this.reportOpened) return;
    if (this.reportPayload === null || this.reportPayload.entries.length === 0) return;
    if (this.studyBoard === null) return;
    this.reportOpened = true;
    this.studyBoard.openReport();
  }

  private showSky(self: SelfView, sources: readonly DetectedSource[]): void {
    // Later sky messages (another civ joined, or the calm-cadence refresh)
    // just update the Model and, if a card is open, its live source data.
    if (this.mountedScreen === "sky" && this.model !== null) {
      this.model.setSky(self, sources);
      this.model.setContact(this.contact);
      this.contactCeremony?.setSky(sources);
      this.studyBoard?.setSelf(self);
      this.sourceCard?.setLocalNames(this.localNames);
      const openId = this.sourceCard?.currentStarId() ?? null;
      if (openId !== null) {
        const updated = sources.find((s) => s.starId === openId);
        if (updated !== undefined) {
          this.sourceCard?.setSource(updated);
          this.sourceCard?.setStudyStatus(this.findStudy(openId)?.status ?? null);
          this.sourceCard?.setMissionState(this.findMissionState(openId));
          this.sourceCard?.setContactState(this.findContactState(openId));
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
      this.maybeFocusPendingStudy();
      return;
    }

    // First sky this session: decide the opening beat before clearing the
    // marker, then mount the Model + its source card + the observatory.
    const mode: "pullback" | "resume" = hasPendingBecome() ? "pullback" : "resume";
    this.mountedScreen = "sky";
    this.mount(() => {
      const model = new Model(this.root, this.catalog);
      const sourceCard = new SourceCard(this.root, this.socket);
      const studyBoard = new StudyBoard(
        this.root,
        this.socket,
        this.menus,
        this.missionCatalog,
        this.catalog,
      );
      const contactCeremony = new ContactCeremony(this.root, model, this.socket);
      this.model = model;
      this.sourceCard = sourceCard;
      this.studyBoard = studyBoard;
      this.contactCeremony = contactCeremony;
      // A2.6: this board's very first render already knows — no waiting on
      // a welcome that, on a resume, already came and went.
      studyBoard.setHasAccount(this.hasAccount);

      // While a ceremony is armed the sky belongs to it: the two standing
      // chips stand down, so the only things a thumb can reach are the
      // canvas (the press) and the one word that says no.
      contactCeremony.onActive((active) => studyBoard.setChromeHidden(active));

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
        } else {
          sourceCard.open(source, this.localNames);
          sourceCard.setStudyStatus(this.findStudy(source.starId)?.status ?? null);
          sourceCard.setMissionState(this.findMissionState(source.starId));
          sourceCard.setContactState(this.findContactState(source.starId));
          sourceCard.setAccord(this.findAccord(source.starId));
          sourceCard.setExplainer(this.takeSourceCardVoice());
        }
      });
      sourceCard.onClose(() => model.clearSelection());
      studyBoard.onInspect((starId) => {
        const source = this.sources.find((s) => s.starId === starId);
        if (source === undefined) return;
        model.selectStar(starId);
        sourceCard.open(source, this.localNames);
        sourceCard.setStudyStatus(this.findStudy(starId)?.status ?? null);
        sourceCard.setMissionState(this.findMissionState(starId));
        sourceCard.setContactState(this.findContactState(starId));
        sourceCard.setAccord(this.findAccord(starId));
        sourceCard.setExplainer(this.takeSourceCardVoice());
      });
      sourceCard.onStudyAction((starId) => {
        if (this.findStudy(starId) !== undefined) {
          sourceCard.close();
          model.clearSelection();
          studyBoard.focusStudy(starId);
        } else {
          this.socket.send({ type: "openStudy", starId });
          this.pendingStudyFocus = starId;
        }
      });
      // A2.4: AIM A BEAM. The stance rides the same `sky` that produced this
      // source, so the mind's objection (if it has one) is already in hand
      // and the ceremony arms with no round trip.
      sourceCard.onContactAction((starId) => {
        const contact = this.contact;
        if (contact === null) return;
        stage(() => contactCeremony.armHail(starId, contact.hail, this.sources));
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
        stage(() => contactCeremony.armHail(starId, contact.hail, this.sources));
      });
      // A2.4: the HOME mote is the one present-tense object on the sky, so
      // tapping it goes to where the player's own voice lives.
      model.onSelectHome(() => {
        sourceCard.close();
        model.clearSelection();
        studyBoard.openHub("voice");
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
      // AV1: the mind's first line, at the end of the one-shot pull-back.
      // AV2: the report's session-open rides this same beat — it only
      // fires once the arrival beat has had its turn (see playArrival's
      // and maybeOpenReport's comments).
      model.onPullbackEnd(() => {
        if (!this.playArrival()) this.maybeOpenReport();
      });
      // AV1: at most one hub explainer per open — compute first, the clock
      // note on a later open (idempotent: takeVoice empties whichever it
      // returns, so a second call in the same session yields the next one).
      studyBoard.onHubOpen(() => {
        const lineText = this.takeVoice("compute") ?? this.takeVoice("clock");
        if (lineText !== null) studyBoard.setHubExplainer(lineText);
      });
      // AV2: the epoch-dating explainer — shown once, on the first report
      // open, because the report is where "year n AE" first appears.
      studyBoard.onReportOpen(() => {
        studyBoard.setReportExplainer(this.takeVoice("epoch"));
      });

      model.setSky(self, sources);
      model.setContact(this.contact);
      studyBoard.setSelf(self);
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
      clearPendingBecome();
      if (mode === "resume") {
        // clearPendingBecome() (above) runs at pull-back START, not end — so
        // a reload mid-dolly resumes straight into "resume" mode with no
        // pull-back at all, and onPullbackEnd above will never fire. The
        // arrival line is still unseen server-side, so play it here instead,
        // after a short beat so it doesn't land in the same frame as the
        // sky mounting.
        window.setTimeout(() => {
          if (!this.playArrival()) this.maybeOpenReport();
        }, 600);
      }
      return () => {
        contactCeremony.destroy();
        model.destroy();
        sourceCard.destroy();
        studyBoard.destroy();
        this.voiceBeat?.destroy();
        this.voiceBeat = null;
        if (this.model === model) this.model = null;
        if (this.sourceCard === sourceCard) this.sourceCard = null;
        if (this.studyBoard === studyBoard) this.studyBoard = null;
        if (this.contactCeremony === contactCeremony) this.contactCeremony = null;
      };
    });
  }
}
