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
} from "@holos/protocol";
import type { CohortSocket } from "./net";
import { StudyBoard } from "./studyboard";
import { clearPendingBecome, hasPendingBecome, renderCeremony } from "./ceremony";
import { Model } from "./model";
import { SourceCard, type MissionCardState } from "./sourcecard";
import { setClockAnchor } from "./clock";
import { VoiceBeat } from "./voicebeat";

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
      case "error":
        // The ceremony subscribes to the socket directly for become-
        // rejection errors; the source card only reacts while it has a
        // nameSource request in flight, so forwarding unconditionally is
        // safe even outside the sky screen. The observatory needs it to
        // release a begin that will never be confirmed by a `sky`.
        this.sourceCard?.handleServerMessage(message);
        this.studyBoard?.handleServerError();
        break;
    }
  }

  private mount(render: () => ScreenCleanup | void): void {
    this.currentCleanup?.();
    this.root.innerHTML = "";
    const cleanup = render();
    this.currentCleanup = cleanup ?? null;
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
      this.studyBoard?.setSelf(self);
      this.sourceCard?.setLocalNames(this.localNames);
      const openId = this.sourceCard?.currentStarId() ?? null;
      if (openId !== null) {
        const updated = sources.find((s) => s.starId === openId);
        if (updated !== undefined) {
          this.sourceCard?.setSource(updated);
          this.sourceCard?.setStudyStatus(this.findStudy(openId)?.status ?? null);
          this.sourceCard?.setMissionState(this.findMissionState(openId));
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
      this.model = model;
      this.sourceCard = sourceCard;
      this.studyBoard = studyBoard;

      model.onSelectSource((source) => {
        if (source === null) {
          sourceCard.close();
        } else {
          sourceCard.open(source, this.localNames);
          sourceCard.setStudyStatus(this.findStudy(source.starId)?.status ?? null);
          sourceCard.setMissionState(this.findMissionState(source.starId));
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
        model.destroy();
        sourceCard.destroy();
        studyBoard.destroy();
        this.voiceBeat?.destroy();
        this.voiceBeat = null;
        if (this.model === model) this.model = null;
        if (this.sourceCard === sourceCard) this.sourceCard = null;
        if (this.studyBoard === studyBoard) this.studyBoard = null;
      };
    });
  }
}
