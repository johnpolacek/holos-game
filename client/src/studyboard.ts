// THE OBSERVATORY — the inference workbench, a Desk panel (Act 3, slice
// A2.1: read-only).
// A DOM overlay (not canvas) that lists open/shelved studies and, per study,
// shows the current hypothesis reading derived from delayed light
// (StudySnapshot; see server/src/protocol.ts). The visual target for the
// focused study is docs/concepts/03-03-case-board.png.
//
// Two adopted build notes, load-bearing for this slice:
//   - The confidence marker renders as a GLOW, never a knob/handle. The
//     hypothesis "bars" are a view of a share, not a control — nothing here
//     is draggable, nothing is an input.
//   - The OPEN QUESTIONS section ships its layout (a reserved, empty
//     container) but renders nothing in A2.1: `StudySnapshot.openQuestions`
//     is always `[]` this slice, and nothing is buyable yet. The art's
//     allocation strip (labelled INSTRUMENT ALLOCATION in the image brief,
//     denominated in compute since — see projects.ts) is A2.2 entirely and
//     does not appear here.
//
// Register: observatory deadpan, wit 0, no exclamation marks. Soft past
// tense for remote facts — every one wears its light-age. NEVER cyan inside
// the panel: cyan is the present tense and your own works, and everything
// this surface shows is remote and old, so it is all amber/ink.
//
// Two exceptions, and they prove the rule — both are present-tense and
// yours. The Tend chip out on the sky is chrome, not panel, and what it
// opens is the list of YOUR work. The HOME end of the briefing's starmap is
// your own star, charted so the source's distance reads as geometry; the
// deeper rule (cyan = you / amber = other) wins there, because an amber
// HOME would say "someone else". Both take the same cyan as the HOME mote
// (model.ts's COLOR_HOME), for the same reason. Nothing else rendered into
// the sheet may follow them.

import type {
  StudySnapshot,
  DetectedSource,
  Hypothesis,
  HypothesisId,
  HypothesisMenus,
  ProjectSnapshot,
  ComputeBudget,
  OpenQuestion,
  MissionSnapshot,
  MissionCatalog,
  MissionKind,
  MissionKindDef,
  CharterClauseDef,
  CharterClauseId,
  WorkState,
  TendRow,
  ReportPayload,
  ReportEntry,
  ReportRoute,
  Proposal,
  ProposalRoute,
  SelfView,
  Star,
} from "@holos/protocol";
import type { CohortSocket } from "./net";
import { startOver } from "./startover";
import { QUESTION_METHOD } from "./questionmethod";
import { CLASS_LABEL } from "./sourcecard";
import { formatClockPair, formatCountdown, nowYear } from "./clock";
// Inlined at build time rather than fetched: one more request for a 400-byte
// mark is a request the sky does not need, and the markup carries
// fill="currentColor", so the icon takes the chip's ink — including the
// glare-mode bump — without a second color declaration anywhere.
import treeViewIcon from "@phosphor-icons/core/assets/light/tree-view-light.svg?raw";

const SWIPE_CLOSE_PX = 56;

const WORK_STATE_LABEL: Record<WorkState, string> = {
  watching: "WATCHING",
  "in-hand": "IN HAND",
  "in-flight": "IN FLIGHT",
  "beyond-horizon": "BEYOND THE HORIZON",
  "awaiting-light": "AWAITING LIGHT",
  returned: "RETURNED",
  silent: "SILENT",
  standing: "STANDING",
};

/** The Tend/mission-detail absolute-year chrome: "Y1204". Countdown-bearing
 *  dates always go through formatCountdown/formatClockPair; this is only for
 *  a date that has already passed (nothing left to count down to). */
function formatAbsoluteYear(year: number): string {
  return `Y${Math.round(year)}`;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Archive entries can run into the thousands of years, so from 100 up we
 *  round to a whole year and add thousands separators (`9,016`); below that
 *  the one-decimal reading stays, matching the header sentence's precision. */
function formatArchiveAge(years: number): string {
  if (years >= 100) return Math.round(years).toLocaleString("en-US");
  return years.toFixed(1);
}

/** The hypothesis with the largest share (ties keep the first encountered,
 * i.e. wire order). Undefined only if the menu is empty. */
function leadingHypothesis(hyps: readonly Hypothesis[]): Hypothesis | undefined {
  let best: Hypothesis | undefined;
  for (const h of hyps) {
    if (best === undefined || h.share > best.share) best = h;
  }
  return best;
}

/**
 * Largest-remainder rounding: shares sum to 1 (protocol.ts's invariant), so
 * the floored percentages sum to at most 100; the remainder is handed out,
 * one point each, to the entries with the largest fractional remainder —
 * so the displayed integers always sum to exactly 100.
 */
function hypothesisPercentages(
  hyps: readonly Hypothesis[],
): ReadonlyMap<HypothesisId, number> {
  const floors = hyps.map((h) => {
    const exact = h.share * 100;
    const floor = Math.floor(exact);
    return { id: h.id, floor, rem: exact - floor };
  });
  const flooredTotal = floors.reduce((sum, f) => sum + f.floor, 0);
  const remainder = Math.max(0, Math.round(100 - flooredTotal));

  const result = new Map<HypothesisId, number>();
  for (const f of floors) result.set(f.id, f.floor);

  const byRemainder = [...floors].sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remainder; i++) {
    const entry = byRemainder[i];
    if (entry === undefined) break;
    result.set(entry.id, (result.get(entry.id) ?? 0) + 1);
  }
  return result;
}

export class StudyBoard {
  private readonly socket: CohortSocket;
  /** Opening menu labels per signal class, from `welcome` — the briefing's
   *  "what it can tell apart". Null omits that section rather than guessing. */
  private readonly menus: HypothesisMenus | null;
  /** The launch sheet's vocabulary (kinds + charter clauses), from `welcome`
   *  like `menus`. Null omits the sheet's catalog rows rather than guessing. */
  private readonly missionCatalog: MissionCatalog | null;
  /** The public star catalog by id, from `welcome` like `menus` — the
   *  briefing starmap's geometry. A DetectedSource carries no position (the
   *  ObservedCiv boundary), but its STAR is public sky. */
  private readonly starsById: ReadonlyMap<string, Star>;

  private readonly root: HTMLDivElement;
  private readonly chip: HTMLButtonElement;
  /** The second standing chip, opposite + Start: everything already under
   *  way. Hidden while there is nothing to tend — a chip pointing at an
   *  empty list is noise. */
  private readonly tendChip: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly topbar: HTMLDivElement;
  private readonly body: HTMLDivElement;

  private studiesByStarId = new Map<string, StudySnapshot>();
  private sourcesByStarId = new Map<string, DetectedSource>();
  private localNames: ReadonlyMap<string, string> = new Map();
  private projects: readonly ProjectSnapshot[] = [];
  private budget: ComputeBudget = { free: 0, ratePerYear: 0, asOfYear: 0 };
  private missions: readonly MissionSnapshot[] = [];
  private missionsById = new Map<string, MissionSnapshot>();
  private tend: readonly TendRow[] = [];
  /** The current effective probe cruise rate (years/ly), from the latest
   *  sky — feeds the launch sheet's client-side clock preview. */
  private probeFlightYearsPerLy = 10;
  // AV3: the mind's current proposals, wholesale-replaced on every `sky` —
  // never appended, never re-sorted client-side (the server's ranked order
  // is load-bearing).
  private proposals: readonly Proposal[] = [];

  private openFlag = false;
  private view:
    | "hub"
    | "list"
    | "focused"
    | "picker"
    | "brief"
    | "explore"
    | "projects"
    | "project"
    | "tend"
    | "mission"
    | "launch"
    | "startover"
    | "report" = "list";
  private focusedStarId: string | null = null;
  private briefStarId: string | null = null;
  private focusedMissionId: string | null = null;
  // The project detail sheet: which catalog entry, and which panel the tap
  // came from — the back button returns there, so Tend, Projects and the
  // Report each get their own way in without the sheet forking.
  private focusedProjectId: string | null = null;
  // AV3: "hub" joins the return set — a proposal's `project` route opens the
  // detail sheet from the hub, so its back button must come home there.
  private projectReturn: "tend" | "projects" | "report" | "hub" = "projects";
  // AV3: same rule for the brief — a proposal's `study-brief` route opens it
  // from the hub, and backing out must come home there, not to a picker the
  // player never visited.
  private briefReturn: "picker" | "hub" = "picker";
  private openStudyCount = 0;

  // The reset's two transient bits. `pending` disables the verb for the one
  // beat between the tap and the reload (a second tap would POST a token the
  // first call is already erasing); `error` is set only when the server
  // refused, in which case the run is untouched and the tap can come again.
  private startOverPending = false;
  private startOverError: string | null = null;

  // AV3: a one-shot pointer set by focusStudyQuestion (a proposal's
  // `question` route) — the next renderFocused() scrolls the matching row
  // into view and clears this, so the 1s tick never re-scrolls the sheet
  // under the player's thumb.
  private highlightQuestionId: string | null = null;

  // The launch sheet's in-progress selection — cleared each time openLaunch
  // opens fresh (a half-written charter never survives a close/reopen).
  private launchStarId: string | null = null;
  private launchKind: MissionKind | null = null;
  private launchCharter = new Set<CharterClauseId>();

  // The star a `begin the watch` is in flight for. The confirming `sky`
  // carries the new study and hands straight to the focused board — without
  // this the picker row simply vanished in place and the tap read as a
  // dead end. Cleared by any sky that does not confirm, and by any server
  // error, so the verb can never sit stuck mid-flight.
  private pendingBeginStarId: string | null = null;

  // The latest SelfView, handed over by the App just before every update()
  // — the starmap's HOME end. Null only before the first sky, when nothing
  // renders anyway; the map simply omits itself rather than guess.
  private self: SelfView | null = null;

  // A buyQuestion in flight: the study it's on plus the question id, so the
  // trio can never be mistaken for a different study's purchase. The
  // confirming sky moves the question past "offered" (studies.ts's
  // assembleQuestion); handleServerError releases it on a rejection.
  private pendingQuestion: { readonly starId: string; readonly questionId: string } | null = null;

  // The one offered question whose drill-in is open, if any. Tapping an
  // offered row expands it — the spend is the BUY button inside, never the
  // row — and a second tap folds it back. Lives on the panel, not in the
  // DOM, because renderFocused() rebuilds the whole body every second
  // (startTicking) and an expansion has to survive that. Star-scoped like
  // pendingQuestion so a stale id can never open a row on a different study.
  private expandedQuestion: { readonly starId: string; readonly questionId: string } | null = null;

  // A startProject in flight: released when the confirming sky moves the
  // project past "available" (the detail sheet then reads RUNNING with its
  // countdown — the confirmation is the state change, not a toast), or by
  // handleServerError on a rejection.
  private pendingProjectId: string | null = null;

  // A launchMission in flight: the star plus a snapshot of the mission ids
  // already on the wire at send time, so the confirming sky can pick out
  // the ONE new mission it carries (by id difference) and hand focus
  // straight to its detail view — the monitor page, same beat as
  // pendingBeginStarId's "begin the watch" → focusStudy.
  private pendingLaunchStarId: string | null = null;
  private pendingLaunchPriorMissionIds: ReadonlySet<string> = new Set();

  // A single 1s ticker, live while the panel is open, so the hub's compute
  // allocation line and any running project's countdown stay current without
  // a new `sky` message — both derive from clock.ts's locally-interpolated
  // nowYear(), never from server polling.
  private tickHandle: number | null = null;

  // AV3: the hub's budget line element, set by buildBudgetLine() whenever
  // the hub is the caller. The ticker's hub branch updates only this
  // element's textContent instead of re-rendering the whole hub — a tick
  // landing between finger-down and finger-up on a proposal row must never
  // eat the tap (see refreshHubBudget()).
  private hubBudgetEl: HTMLDivElement | null = null;

  private onInspectCb: ((starId: string) => void) | null = null;

  // AV1: the one-time hub explainer (compute, then later the clock note).
  // renderHub() re-runs on every openHub() and on every sky (the 1s ticker
  // no longer re-runs it in full — see refreshHubBudget/AV3), so nothing
  // one-shot can live inside it directly — the App sets this field once
  // per hub open via setHubExplainer, and every render after that just
  // reads it back, stable for the life of the panel session.
  private explainerText: string | null = null;
  private onHubOpenCb: (() => void) | null = null;

  // AV2: the report. `report` is the latest ReportPayload the App has
  // handed over (via setReport, mirroring `voice`'s field-then-forward
  // pattern) — renderers only ever read it back, never mutate it. A reopen
  // sends `requestReport` first and renders the standing copy immediately;
  // when the fresh payload lands, setReport re-renders IF the panel is
  // still showing the report (the setHubExplainer field-driven precedent,
  // but this field also drives its own re-render since the payload can
  // arrive well after the render that requested it).
  private report: ReportPayload | null = null;
  private onReportOpenCb: (() => void) | null = null;
  // The one-time epoch explainer, same field-only contract as
  // `explainerText` above: the App sets it via setReportExplainer before
  // (or in response to) onReportOpen firing, and renderReport only reads
  // it back.
  private reportExplainerText: string | null = null;

  private dragStartY: number | null = null;
  private dragDy = 0;

  constructor(
    container: HTMLElement,
    socket: CohortSocket,
    menus: HypothesisMenus | null,
    missionCatalog: MissionCatalog | null,
    catalog: readonly Star[],
  ) {
    this.socket = socket;
    this.menus = menus;
    this.missionCatalog = missionCatalog;
    this.starsById = new Map(catalog.map((s) => [s.id, s] as const));

    this.root = document.createElement("div");
    this.root.className = "study-board-root";

    this.chip = document.createElement("button");
    this.chip.type = "button";
    // Not holos-caps: this is the one standing invitation on the sky, not a
    // label, so it wears the display face at reading size. Cinzel's lowercase
    // are small caps, so "Start" sets as a titled word without shouting.
    this.chip.className = "study-chip";
    this.chip.textContent = "+ Start";
    this.chip.addEventListener("click", () => this.openHub());

    // The pair: + Start begins something, Tend checks on what is already
    // going. Same pill, other corner, cyan rather than amber, and the same
    // travelling glint at half the rate — a slower pulse for the chip you
    // return to rather than the one that invites you in.
    // The mark is Phosphor's tree-view at light weight — a trunk with things
    // branching off it, which is the shape of the panel it opens: missions
    // with their children indented under them. It is decoration for the word
    // beside it, so it is hidden from the accessibility tree; "Tend" is the
    // accessible name on its own.
    this.tendChip = document.createElement("button");
    this.tendChip.type = "button";
    this.tendChip.className = "study-chip study-chip--tend";
    const tendIcon = document.createElement("span");
    tendIcon.className = "study-chip-icon";
    tendIcon.setAttribute("aria-hidden", "true");
    // A build-time constant from node_modules, not anything a player or the
    // server can reach — the one place innerHTML is safe.
    tendIcon.innerHTML = treeViewIcon;
    const tendLabel = document.createElement("span");
    tendLabel.textContent = "Tend";
    this.tendChip.append(tendIcon, tendLabel);
    this.tendChip.hidden = true;
    this.tendChip.addEventListener("click", () => this.openTend());

    this.backdrop = document.createElement("div");
    this.backdrop.className = "study-board-backdrop";
    this.backdrop.addEventListener("click", () => this.close());

    this.sheet = document.createElement("div");
    this.sheet.className = "study-board-sheet";

    // The sheet is full-height on a phone, so it covers the backdrop
    // entirely — "tap outside to dismiss" does not exist here. The panel
    // therefore carries its own visible exit, and the grabber's swipe stays
    // as the gesture for thumbs that already know it.
    // The whole bar is the swipe surface, not just the pill: the pill is
    // 4px tall and a thumb misses it far more often than it hits.
    this.topbar = document.createElement("div");
    this.topbar.className = "study-board-topbar";

    const grabber = document.createElement("div");
    grabber.className = "study-board-grabber";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "study-board-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.close());

    this.topbar.append(grabber, closeBtn);

    this.body = document.createElement("div");
    this.body.className = "study-board-body";

    this.sheet.append(this.topbar, this.body);
    this.root.append(this.chip, this.tendChip, this.backdrop, this.sheet);
    container.append(this.root);

    this.attachSwipe();
    window.addEventListener("keydown", this.onKeyDown);
    this.renderList();
  }

  /** The player's own place in the sky, from every `sky` message — the App
   *  calls this just before update(), so no render ever sees a stale HOME. */
  setSelf(self: SelfView): void {
    this.self = self;
  }

  update(
    studies: readonly StudySnapshot[],
    sources: readonly DetectedSource[],
    localNames: ReadonlyMap<string, string>,
    projects: readonly ProjectSnapshot[],
    budget: ComputeBudget,
    missions: readonly MissionSnapshot[],
    tend: readonly TendRow[],
    probeFlightYearsPerLy: number,
    proposals: readonly Proposal[],
  ): void {
    this.studiesByStarId = new Map(studies.map((s) => [s.starId, s] as const));
    this.sourcesByStarId = new Map(sources.map((s) => [s.starId, s] as const));
    this.localNames = localNames;
    this.projects = projects;
    this.budget = budget;
    this.missions = missions;
    this.missionsById = new Map(missions.map((m) => [m.id, m] as const));
    this.tend = tend;
    this.probeFlightYearsPerLy = probeFlightYearsPerLy;
    this.proposals = proposals;
    this.updateChip();

    // A begin sent from the briefing: this sky either carries the new study
    // — hand straight to it, which is the monitor page — or it does not, in
    // which case the request went nowhere and the verb is released.
    if (this.pendingBeginStarId !== null) {
      const starId = this.pendingBeginStarId;
      this.pendingBeginStarId = null;
      if (this.studiesByStarId.has(starId)) {
        this.focusStudy(starId);
        return;
      }
    }

    // A startProject in flight: released the moment the project's own state
    // moves past "available" (running or, same sky, already landed).
    if (this.pendingProjectId !== null) {
      const proj = this.projects.find((pp) => pp.id === this.pendingProjectId);
      if (proj === undefined || proj.status !== "available") {
        this.pendingProjectId = null;
      }
    }

    // A buyQuestion in flight: released the moment the question's own state
    // moves past "offered" (bought — pending or, same sky, already answered).
    if (this.pendingQuestion !== null) {
      const pending = this.pendingQuestion;
      const study = this.studiesByStarId.get(pending.starId);
      const q = study?.openQuestions.find((qq) => qq.id === pending.questionId);
      if (q !== undefined && q.state !== "offered") {
        this.pendingQuestion = null;
      }
    }

    // A launchMission in flight: this sky either carries exactly one new
    // mission for the star (by id difference against the pre-send
    // snapshot) — hand straight to its detail view — or it does not, in
    // which case nothing landed yet (or the server rejected it, in which
    // case handleServerError already released the trio before this runs).
    if (this.pendingLaunchStarId !== null) {
      const starId = this.pendingLaunchStarId;
      const priorIds = this.pendingLaunchPriorMissionIds;
      const newMission = missions.find((m) => m.starId === starId && !priorIds.has(m.id));
      if (newMission !== undefined) {
        this.pendingLaunchStarId = null;
        this.pendingLaunchPriorMissionIds = new Set();
        this.focusMission(newMission.id);
        return;
      }
    }

    if (this.view === "focused" && this.focusedStarId !== null) {
      if (this.studiesByStarId.has(this.focusedStarId)) {
        this.renderFocused(this.focusedStarId);
      } else {
        // The focused study vanished from this payload — fall back to list.
        this.view = "list";
        this.focusedStarId = null;
        this.renderList();
      }
    } else if (this.view === "picker") {
      // Re-render so a row disappears the moment its study exists.
      this.renderPicker();
    } else if (this.view === "brief") {
      this.renderBrief();
    } else if (this.view === "hub") {
      this.renderHub();
    } else if (this.view === "explore") {
      this.renderExplore();
    } else if (this.view === "projects") {
      this.renderProjects();
    } else if (this.view === "project") {
      this.renderProjectDetail();
    } else if (this.view === "tend") {
      this.renderTend();
    } else if (this.view === "mission") {
      if (this.focusedMissionId !== null && this.missionsById.has(this.focusedMissionId)) {
        this.renderMissionDetail();
      } else {
        // The focused mission vanished from this payload — fall back to the Tend.
        this.view = "tend";
        this.focusedMissionId = null;
        this.renderTend();
      }
    } else if (this.view === "launch") {
      this.renderLaunch();
    } else if (this.view === "startover") {
      // Nothing on this page comes from a `sky`, but the branch must exist:
      // the `else` below falls back to the study list, which would drop the
      // player out of a confirmation they are mid-way through reading.
      this.renderStartOver();
    } else if (this.view === "report") {
      // Defensive consistency only, the `tend`/`projects` precedent — a
      // `sky` carries none of the report's own data, so this just re-runs
      // the render against whatever `this.report` already holds. It is NOT
      // how the report refreshes; see openReport()/setReport().
      this.renderReport();
    } else {
      this.renderList();
    }
  }

  openBoard(): void {
    this.view = "list";
    this.focusedStarId = null;
    this.renderList();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openHub(): void {
    // Fires first, before renderHub(), so the App's setHubExplainer() (if it
    // calls one) is already in `explainerText` for the very first render.
    this.onHubOpenCb?.();
    this.view = "hub";
    this.focusedStarId = null;
    this.renderHub();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openPicker(): void {
    this.view = "picker";
    this.focusedStarId = null;
    this.renderPicker();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openProjects(): void {
    this.view = "projects";
    this.focusedStarId = null;
    this.renderProjects();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  focusStudy(starId: string): void {
    this.view = "focused";
    this.focusedStarId = starId;
    // A board opened fresh opens with every question folded.
    this.expandedQuestion = null;
    this.renderFocused(starId);
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openTend(): void {
    this.view = "tend";
    this.focusedStarId = null;
    this.renderTend();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  focusProject(projectId: string, from: "tend" | "projects" | "report" | "hub"): void {
    this.view = "project";
    this.focusedProjectId = projectId;
    this.projectReturn = from;
    this.renderProjectDetail();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** AV2: opens the report. `onReportOpenCb` fires FIRST (the onHubOpen
   *  mold) so a setReportExplainer() call it makes is already in
   *  `reportExplainerText` for the very first render; `requestReport` goes
   *  out before that render so the panel shows its standing copy while the
   *  fresh one is in flight (setReport re-renders it in place on arrival —
   *  see the `report` field's comment). */
  openReport(): void {
    this.onReportOpenCb?.();
    this.socket.send({ type: "requestReport" });
    this.view = "report";
    this.focusedStarId = null;
    this.renderReport();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** The playtest reset's confirmation page. Always starts clean: a failure
   *  message from a previous attempt never greets the next one. */
  private openStartOver(): void {
    this.view = "startover";
    this.focusedStarId = null;
    this.startOverPending = false;
    this.startOverError = null;
    this.renderStartOver();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  focusMission(missionId: string): void {
    this.view = "mission";
    this.focusedMissionId = missionId;
    this.renderMissionDetail();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** Opens the two-step launch sheet for `starId`. Always starts clean — a
   *  half-written charter never survives a close/reopen (openBrief's
   *  precedent: `pendingBeginStarId` reset on entry). */
  openLaunch(starId: string): void {
    this.view = "launch";
    this.launchStarId = starId;
    this.launchKind = null;
    this.launchCharter = new Set();
    this.renderLaunch();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** AV3: a proposal's `question` route — focuses the study and scrolls its
   *  matching OPEN QUESTIONS row into view. Guards on the study still being
   *  in this session's sky (the AV3 design's "target fades mid-session"
   *  edge case) and falls back to the hub rather than opening a focus view
   *  for a study that no longer exists. The scroll itself is one-shot: see
   *  `highlightQuestionId` and renderFocused's oqSection loop. */
  private focusStudyQuestion(starId: string, questionId: string): void {
    if (!this.studiesByStarId.has(starId)) {
      this.openHub();
      return;
    }
    this.view = "focused";
    this.focusedStarId = starId;
    this.highlightQuestionId = questionId;
    // The route means "look at this question", so it lands on the drill-in
    // rather than on a folded row the player would have to tap again. The
    // spend still waits behind the BUY button inside it.
    this.expandedQuestion = { starId, questionId };
    this.renderFocused(starId);
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  close(): void {
    this.openFlag = false;
    this.root.classList.remove("open");
    this.stopTicking();
  }

  isOpen(): boolean {
    return this.openFlag;
  }

  destroy(): void {
    this.stopTicking();
    window.removeEventListener("keydown", this.onKeyDown);
    this.root.remove();
  }

  /** Starts the 1s ticker if it is not already running. Idempotent — every
   * open* method calls this, so opening while already open is a no-op. */
  private startTicking(): void {
    if (this.tickHandle !== null) return;
    this.tickHandle = window.setInterval(() => {
      // AV3: the hub's only time-varying content is the budget line — a
      // full renderHub() every second would wipe the body between
      // finger-down and finger-up on a proposal's accept/decline buttons.
      // Update just that element's text; fall back to a full render if it
      // has fallen out of the document (defensive only).
      if (this.view === "hub") this.refreshHubBudget();
      else if (this.view === "projects") this.renderProjects();
      else if (this.view === "project") this.renderProjectDetail();
      else if (this.view === "focused" && this.focusedStarId !== null) {
        this.renderFocused(this.focusedStarId);
      } else if (this.view === "tend") this.renderTend();
      else if (this.view === "mission") this.renderMissionDetail();
    }, 1000);
  }

  private stopTicking(): void {
    if (this.tickHandle !== null) {
      window.clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  /** Uncommitted compute right now: the last snapshot plus what has accrued
   * since, derived locally from clock.ts's nowYear() so the hub and projects
   * panel read live without waiting on a new `sky`. */
  private currentFreeCompute(): number {
    const elapsedYears = Math.max(0, nowYear() - this.budget.asOfYear);
    return this.budget.free + this.budget.ratePerYear * elapsedYears;
  }

  /**
   * The allocation line. "UNCOMMITTED", not "banked" — this is compute not
   * yet spent on thinking, not savings (projects.ts § NOT A BANK), and the
   * word has to carry that on its own because it is the only place the
   * player meets the currency.
   */
  private budgetLineText(): string {
    return `${Math.floor(this.currentFreeCompute())} COMPUTE UNCOMMITTED · +${this.budget.ratePerYear}/Y`;
  }

  private buildBudgetLine(): HTMLDivElement {
    const line = document.createElement("div");
    line.className = "study-budget-line holos-caps";
    line.textContent = this.budgetLineText();
    // AV3: the hub's copy is the one the 1s ticker updates in place
    // (refreshHubBudget) rather than through a full renderHub().
    if (this.view === "hub") this.hubBudgetEl = line;
    return line;
  }

  /** AV3: the ticker's hub branch — updates only the budget line's text,
   *  never the whole hub body, so a tick cannot land between finger-down
   *  and finger-up on a proposal row. Falls back to a full renderHub() if
   *  the element has fallen out of the document. */
  private refreshHubBudget(): void {
    if (this.hubBudgetEl !== null && this.hubBudgetEl.isConnected) {
      this.hubBudgetEl.textContent = this.budgetLineText();
    } else {
      this.renderHub();
    }
  }

  /** Escape closes the panel on a keyboard — the desktop equivalent of the
   *  exit button, which is the only way out on a phone. */
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.openFlag) this.close();
  };

  /** Registers the callback fired when a row in the explore view is tapped,
   * with the tapped source's starId. */
  onInspect(cb: (starId: string) => void): void {
    this.onInspectCb = cb;
  }

  /** Registers the callback fired as the FIRST step of every openHub(),
   *  before that call's renderHub() — so a setHubExplainer() the callback
   *  makes is already in `explainerText` for the very first render. */
  onHubOpen(cb: () => void): void {
    this.onHubOpenCb = cb;
  }

  /** AV1: the hub's one-time explainer line (compute, then later the
   *  clock), or null for none. The App drives this via takeVoice — stable
   *  across the panel's re-renders because renderHub() only reads it back. */
  setHubExplainer(text: string | null): void {
    this.explainerText = text;
  }

  /** AV2: the latest ReportPayload, forwarded by the App on every `report`
   *  message (session-open and reply-to-requestReport alike — the App
   *  cannot tell them apart and does not need to). Sets the field only,
   *  EXCEPT the one re-render this field alone can trigger: a reopen
   *  requests fresh data before its first render, so the payload always
   *  lands after the panel is already open — if the panel is still showing
   *  the report when it arrives, this is the only place that can put it on
   *  screen. */
  setReport(payload: ReportPayload): void {
    this.report = payload;
    if (this.view === "report") this.renderReport();
  }

  /** Registers the callback fired as the FIRST step of every openReport(),
   *  before requestReport is sent or renderReport() runs — the onHubOpen
   *  mold, so a setReportExplainer() the callback makes is already in
   *  `reportExplainerText` for the very first render. */
  onReportOpen(cb: () => void): void {
    this.onReportOpenCb = cb;
  }

  /** AV2: the report's one-time epoch explainer (why the dates read "n
   *  AE"), or null for none. Same field-only contract as setHubExplainer —
   *  renderReport() only ever reads it back. */
  setReportExplainer(text: string | null): void {
    this.reportExplainerText = text;
  }

  // ── Render: chrome ──────────────────────────────────────────────────

  /** The Start chip's text never changes; this keeps the open-study count
   * fresh for the hub's "Your studies · n" row, and shows or hides the Tend
   * chip — which exists only while there is something to tend. */
  private updateChip(): void {
    let n = 0;
    for (const s of this.studiesByStarId.values()) {
      if (s.status === "open") n++;
    }
    this.openStudyCount = n;
    this.tendChip.hidden = this.tend.length === 0;
  }

  private hairline(): HTMLHRElement {
    const hr = document.createElement("hr");
    hr.className = "holos-hairline study-hairline";
    return hr;
  }

  // ── Render: hub view ──────────────────────────────────────────────────

  private renderHub(): void {
    this.body.innerHTML = "";

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "START";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "What your civilization can begin now.";
    this.body.append(subtitle);

    this.body.append(this.buildBudgetLine());

    if (this.explainerText !== null) {
      const note = document.createElement("div");
      note.className = "voice-note";
      note.textContent = this.explainerText;
      this.body.append(note);
    }

    this.body.append(this.hairline());

    // AV3: the mind's proposals — a live, present-tense block that renders
    // only when there is something to say. See buildProposalRow's comment
    // for the row anatomy and why this is not another buildHubRow.
    if (this.proposals.length > 0) {
      const proposalHeader = document.createElement("div");
      proposalHeader.className = "study-section-header holos-caps";
      proposalHeader.textContent = "WHAT WE WOULD DO NEXT";
      this.body.append(proposalHeader);

      for (const proposal of this.proposals) {
        this.body.append(this.buildProposalRow(proposal));
      }

      this.body.append(this.hairline());
    }

    this.body.append(
      this.buildHubRow(
        "Start a study",
        "Watch a source and work out what it is.",
        true,
        () => this.openPicker(),
      ),
    );
    this.body.append(
      this.buildHubRow(
        "Start a project",
        "Build the instruments. Raise what you can think about.",
        true,
        () => this.openProjects(),
      ),
    );
    this.body.append(
      this.buildHubRow(
        "Explore the sky",
        "Everything your instruments can see.",
        true,
        () => {
          this.view = "explore";
          this.renderExplore();
        },
      ),
    );

    this.body.append(this.hairline());

    if (this.studiesByStarId.size > 0) {
      this.body.append(
        this.buildHubRow(
          `Your studies · ${this.openStudyCount}`,
          "Open and shelved.",
          true,
          () => this.openBoard(),
        ),
      );
    }

    // AV2: always present, quiet — no count, no dot, no conditional
    // visibility. A show/hide affordance here would read as an unread
    // badge, and the report carries none.
    this.body.append(
      this.buildHubRow(
        "The report",
        "What the light brought while you were away.",
        true,
        () => this.openReport(),
      ),
    );

    // The playtest reset. Below its own hairline and in faint ink rather
    // than the rows' amber, because it is not one of the verbs the panel
    // exists to offer: everything above is something the CIVILIZATION can
    // begin, and this is something the PLAYER does to the run. It never
    // fires from here — the tap opens the consequences first.
    this.body.append(this.hairline());
    this.body.append(
      this.buildHubRow(
        "Start over",
        "Give up this civilization and inherit again.",
        true,
        () => this.openStartOver(),
        "aside",
      ),
    );
  }

  /** `tone` is the row's standing in the panel, not its state: "aside" is a
   *  live, tappable row that is not one of the game's verbs (the reset).
   *  Inertness stays where it was, on `active`. */
  private buildHubRow(
    label: string,
    sublabel: string,
    active: boolean,
    onClick: () => void,
    tone: "verb" | "aside" = "verb",
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = active ? "study-hub-row" : "study-hub-row study-hub-row--inert";
    if (tone === "aside") btn.classList.add("study-hub-row--aside");
    if (active) {
      btn.addEventListener("click", onClick);
    } else {
      btn.disabled = true;
    }

    const labelEl = document.createElement("div");
    labelEl.className = "study-hub-label";
    labelEl.textContent = label;

    const subEl = document.createElement("div");
    subEl.className = "study-hub-sub";
    subEl.textContent = sublabel;

    btn.append(labelEl, subEl);
    return btn;
  }

  /**
   * AV3: one proposal — the deadpan reason (plus the AV4 stance, when the
   * mind has one) as prose that accepts on click, then the two answers on
   * one row beneath it: `.proposal-accept` is the verb, a pill you can see
   * is tappable; `.proposal-decline` is the one-tap, no-confirmation "no" at
   * the far end. Two SIBLING buttons, never nested. A distinct block from
   * buildHubRow deliberately: a proposal is a sentence from a different
   * speaker, not a place-name-over-sublabel browse row, and rendering it in
   * the same clothes would blur that.
   */
  private buildProposalRow(p: Proposal): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "proposal-row";

    // The prose is the row's other tap target: clicking what the mind said
    // does what its verb does. Deliberately NOT a second <button> — the pill
    // below is already the labelled control, and a button wrapping the whole
    // reason would double the tab stop and make a screen reader announce the
    // sentence twice. This is pointer convenience; the pill carries the
    // semantics.
    const reason = document.createElement("div");
    reason.className = "proposal-reason";
    reason.addEventListener("click", () => this.followProposalRoute(p.route));
    row.append(reason);

    const line = document.createElement("div");
    line.className = "proposal-line";
    line.textContent = p.line;
    reason.append(line);

    // AV4-only: always omitted at the AV3 floor, where stance is always null.
    if (p.stance !== null) {
      const stance = document.createElement("div");
      stance.className = "proposal-stance";
      stance.textContent = p.stance;
      reason.append(stance);
    }

    const actions = document.createElement("div");
    actions.className = "proposal-actions";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "proposal-accept holos-caps";
    accept.textContent = p.verb;
    // The reason is no longer inside the button, so the accessible name has
    // to carry it: "READ THE BRIEF" alone says nothing about which source.
    accept.setAttribute("aria-label", `${p.verb}: ${p.line}`);
    accept.addEventListener("click", () => this.followProposalRoute(p.route));

    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "proposal-decline";
    decline.textContent = "Leave It";
    decline.setAttribute("aria-label", `Leave it: ${p.line}`);
    decline.addEventListener("click", () => {
      // Quiet, one tap, no confirmation — declining is free and costs
      // nothing to be wrong about. Optimistic local filter; the confirming
      // `sky` re-supplies the (shorter) list wholesale. If the message is
      // dropped the proposal simply returns on the next `sky`.
      this.socket.send({ type: "declineProposal", id: p.id });
      this.proposals = this.proposals.filter((x) => x.id !== p.id);
      this.renderHub();
    });

    actions.append(accept, decline);
    row.append(actions);
    return row;
  }

  /** followReportRoute's twin: every arm names an EXISTING client entry
   *  point, so accepting a proposal never opens anything AV3 builds.
   *  Accepting writes nothing server-side — there is no `acceptProposal`
   *  message. Opening a surface is not a decision, so the candidate re-arms
   *  if the player backs out without committing (the AV3 design's edge
   *  case — "accept-then-don't-commit"). */
  private followProposalRoute(route: ProposalRoute): void {
    switch (route.kind) {
      case "study-brief":
        this.openBrief(route.starId, "hub");
        break;
      case "question":
        this.focusStudyQuestion(route.starId, route.questionId);
        break;
      case "launch":
        this.openLaunch(route.starId);
        break;
      case "project":
        this.focusProject(route.projectId, "hub");
        break;
    }
  }

  /** "3 under way · 2 watching · 1 silent" / "Nothing under way." — the
   *  panel's live summary, derived from its own rows (never a second
   *  count). Under way means a clock is actually running: a study only
   *  accruing light is watching, and counting it as work would inflate the
   *  number every time a vigil sat idle. */
  private tendSummaryLine(): string {
    if (this.tend.length === 0) return "Nothing under way.";
    const watching = this.tend.filter((r) => r.state === "watching").length;
    const silent = this.tend.filter((r) => r.state === "silent").length;
    const underWay = this.tend.filter((r) => r.nextYear !== null).length;
    const parts: string[] = [];
    if (underWay > 0) parts.push(`${underWay} under way`);
    if (watching > 0) parts.push(`${watching} watching`);
    if (silent > 0) parts.push(`${silent} silent`);
    return parts.length === 0 ? "Nothing under way." : parts.join(" · ");
  }

  // ── Render: start-over view ──────────────────────────────────────────

  /**
   * What starting over actually costs, then the verb. The page exists
   * because the hub row must not be a one-tap erase, and because the honest
   * description of the reset is three sentences long: this is the one place
   * in the UI that admits the game is being played on a test cohort.
   *
   * The prose does not soften it. A run's whole history goes, the star goes
   * back into the pool, and — the part no game verb could ever do — the
   * light this civilization already sent stops arriving for everyone else,
   * because every view in the game is derived from the galaxy as it is now.
   */
  private renderStartOver(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "START OVER";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "A playtester's tool, not a move in the game.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    const note = document.createElement("div");
    note.className = "study-startover-note";
    note.textContent =
      "This civilization is given up: its studies, its projects, its missions " +
      "and everything it ever learned. Its star returns to the pool for whoever " +
      "inherits next, and the light it has already sent stops arriving for the " +
      "others. Nothing in the game itself works this way. You then inherit " +
      "again, from a fresh offer, at the cohort's current year.";
    this.body.append(note);

    if (this.startOverError !== null) {
      const error = document.createElement("div");
      error.className = "study-startover-note study-startover-note--error";
      error.textContent = this.startOverError;
      this.body.append(error);
    }

    const row = document.createElement("div");
    row.className = "study-verb-row";
    const btn = document.createElement("button");
    btn.type = "button";
    // The pill, not the bare text verb: this is the one verb the page
    // exists to offer, and the recent turn across the panel is that a verb
    // you are meant to press looks pressable. The prose above carries the
    // weight of what it does; the button only has to be legible.
    btn.className = "study-verb-btn study-verb-btn--primary";
    btn.textContent = this.startOverPending ? "GIVING UP…" : "GIVE UP THIS CIVILIZATION";
    btn.disabled = this.startOverPending;
    btn.addEventListener("click", () => {
      void this.runStartOver();
    });
    row.append(btn);
    this.body.append(row);
  }

  /** The tap. On success this never comes back — startOver() reloads the
   *  page. On refusal the run is untouched (the token is cleared only after
   *  the server confirms), so the only thing to do is say so and let the
   *  player tap again. */
  private async runStartOver(): Promise<void> {
    if (this.startOverPending) return;
    this.startOverPending = true;
    this.startOverError = null;
    this.renderStartOver();
    try {
      await startOver();
    } catch {
      this.startOverPending = false;
      this.startOverError =
        "The cohort would not let go of this run. Nothing was given up. Try again.";
      this.renderStartOver();
    }
  }

  // ── Render: explore view ─────────────────────────────────────────────

  private renderExplore(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE SKY";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "Everything your instruments have found. Tap one to look closer.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    const sources = [...this.sourcesByStarId.values()].sort(
      (a, b) => a.lightAgeYears - b.lightAgeYears,
    );

    for (const source of sources) {
      this.body.append(this.buildExploreRow(source));
    }
  }

  /**
   * The source as its instrument actually renders it: a warm, formless blot
   * whose radius GROWS as confidence falls and whose core brightens as it
   * rises. Same law the Model draws in the sky (model.ts's SMUDGE_* sizing),
   * so a source looks like itself wherever the player meets it — and the
   * sharpening of the image is the progress bar of the inference game
   * (ui-design.md § principle 4).
   */
  private sourceSmudge(confidence: number): HTMLDivElement {
    const conf = clamp01(confidence);
    const cell = document.createElement("div");
    cell.className = "study-row-smudgecell";

    const blot = document.createElement("div");
    blot.className = "study-row-smudge";
    const diameter = 30 + (1 - conf) * 26;
    blot.style.width = `${diameter.toFixed(1)}px`;
    blot.style.height = `${(diameter * 0.86).toFixed(1)}px`;
    blot.style.filter = `blur(${(4 + (1 - conf) * 7).toFixed(1)}px)`;
    blot.style.opacity = (0.34 + conf * 0.52).toFixed(2);

    cell.append(blot);
    return cell;
  }

  /** The shared anatomy of a source row: the blot, then the belief loud with
   *  the catalog designation and the light-age quiet around it. */
  private buildSourceRow(source: DetectedSource): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-picker-row";
    btn.append(this.sourceSmudge(source.signal.confidence), this.buildSourceIdentity(source));
    return btn;
  }

  /** The text half of a source row — designation, local name, belief, light
   *  age. Shared with the briefing so a source reads identically either side
   *  of the tap that opens it. */
  private buildSourceIdentity(source: DetectedSource): HTMLDivElement {
    const text = document.createElement("div");
    text.className = "study-row-text";

    const idLine = document.createElement("div");
    idLine.className = "study-row-idline";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    idLine.append(desig);

    const localName = this.localNames.get(source.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      idLine.append(nm);
    }

    const beliefLine = document.createElement("div");
    beliefLine.className = "study-row-beliefline";
    const cls = document.createElement("span");
    cls.className = "study-row-class";
    cls.textContent = CLASS_LABEL[source.signal.classification];
    const conf = document.createElement("span");
    conf.className = "study-row-conf";
    conf.textContent = `${Math.round(source.signal.confidence * 100)}%`;
    beliefLine.append(cls, conf);

    const age = document.createElement("div");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    text.append(idLine, beliefLine, age);
    return text;
  }

  private buildExploreRow(source: DetectedSource): HTMLButtonElement {
    const btn = this.buildSourceRow(source);
    btn.addEventListener("click", () => {
      this.onInspectCb?.(source.starId);
      this.close();
    });

    if (this.studiesByStarId.has(source.starId)) {
      const flag = document.createElement("span");
      flag.className = "study-explore-flag holos-caps";
      flag.textContent = "UNDER STUDY";
      btn.append(flag);
    }

    return btn;
  }

  // ── Render: list view ────────────────────────────────────────────────

  private renderList(): void {
    this.body.innerHTML = "";

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE OBSERVATORY";
    this.body.append(header);

    const all = [...this.studiesByStarId.values()];
    if (all.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "No studies open.";
      this.body.append(empty);
      this.body.append(this.buildStartStudyButton());
      return;
    }

    const open = all.filter((s) => s.status === "open");
    // Closed studies keep their own sections, and grounded comes first: a
    // study a probe settled is a finding, and a shelved one is only a vigil
    // put down.
    const grounded = all.filter((s) => s.status === "grounded");
    const shelved = all.filter((s) => s.status === "shelved");

    for (const s of open) {
      const row = this.buildRow(s, false);
      if (row !== null) this.body.append(row);
    }

    for (const [label, group] of [
      ["GROUNDED", grounded],
      ["SHELVED", shelved],
    ] as const) {
      if (group.length === 0) continue;
      const divider = document.createElement("div");
      divider.className = "study-board-divider holos-caps";
      divider.textContent = label;
      this.body.append(divider);
      for (const s of group) {
        const row = this.buildRow(s, true);
        if (row !== null) this.body.append(row);
      }
    }

    this.body.append(this.buildStartStudyButton());
  }

  private buildStartStudyButton(): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "study-verb-row";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-verb-btn";
    btn.textContent = "+ START A STUDY";
    btn.addEventListener("click", () => this.openPicker());
    row.append(btn);
    return row;
  }

  /** A study with no matching DetectedSource is skipped entirely (defensive:
   * should not happen, but there is nothing sane to render). */
  private buildRow(s: StudySnapshot, dimmed: boolean): HTMLButtonElement | null {
    const source = this.sourcesByStarId.get(s.starId);
    if (source === undefined) return null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = dimmed ? "study-row study-row--dim" : "study-row";
    btn.addEventListener("click", () => this.focusStudy(s.starId));

    // Sized by the LEADING hypothesis rather than the raw signal confidence:
    // a study's blot tightens as its own belief firms, so the list shows
    // progress the same way the focused sheet does.
    const leader = leadingHypothesis(s.hypotheses);
    btn.append(this.sourceSmudge(leader?.share ?? 0));

    const text = document.createElement("div");
    text.className = "study-row-text";

    const idLine = document.createElement("div");
    idLine.className = "study-row-idline";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    idLine.append(desig);

    const localName = this.localNames.get(s.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      idLine.append(nm);
    }

    const beliefLine = document.createElement("div");
    beliefLine.className = "study-row-beliefline";
    if (leader !== undefined) {
      const pcts = hypothesisPercentages(s.hypotheses);
      const pct = pcts.get(leader.id) ?? Math.round(leader.share * 100);
      const label = document.createElement("span");
      label.className = "study-row-class";
      label.textContent = leader.label;
      const percent = document.createElement("span");
      percent.className = "study-row-conf study-tabular";
      percent.textContent = `${pct}%`;
      beliefLine.append(label, percent);
    }

    const age = document.createElement("div");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    text.append(idLine, beliefLine, age);
    btn.append(text);
    return btn;
  }

  // ── Render: picker view ──────────────────────────────────────────────

  private renderPicker(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "START A STUDY";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "Sources your instruments have found. Tap one to read the brief.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    const candidates = [...this.sourcesByStarId.values()]
      .filter((source) => !this.studiesByStarId.has(source.starId))
      .sort((a, b) => a.lightAgeYears - b.lightAgeYears);

    if (candidates.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "Nothing new in reach. Every source found is already under study.";
      this.body.append(empty);
      return;
    }

    for (const source of candidates) {
      this.body.append(this.buildPickerRow(source));
    }
  }

  private buildPickerRow(source: DetectedSource): HTMLButtonElement {
    const btn = this.buildSourceRow(source);
    btn.addEventListener("click", () => this.openBrief(source.starId));
    return btn;
  }

  // ── Render: briefing view ────────────────────────────────────────────
  // Tapping a candidate does not open a study — it opens the brief. A study
  // is free, uncapped and reversible, so the brief's job is not to price a
  // transaction (there is none) but to say what the watch is, what it can
  // tell apart, and what it will and will not cost. Nothing here invents a
  // spend: compute buys questions, and questions are their own slice.

  /** AV3: public — a proposal's `study-brief` route (followProposalRoute)
   *  is the mind's own affordance for opening this same brief, alongside
   *  the picker row's tap. */
  openBrief(starId: string, from: "picker" | "hub" = "picker"): void {
    this.view = "brief";
    this.briefStarId = starId;
    this.briefReturn = from;
    this.pendingBeginStarId = null;
    this.renderBrief();
    // The sheet body keeps its scroll across view swaps, and a picker
    // scrolled deep would otherwise open the brief past its own starmap.
    // Entry only — the sky-driven re-render must never yank a reader.
    this.body.scrollTop = 0;
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  private renderBrief(): void {
    const starId = this.briefStarId;
    const source = starId === null ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";

    // The source faded between the picker and here — there is nothing to
    // brief, so fall back rather than render a card about nothing.
    if (starId === null || source === undefined) {
      this.briefStarId = null;
      if (this.briefReturn === "hub") {
        this.view = "hub";
        this.renderHub();
      } else {
        this.view = "picker";
        this.renderPicker();
      }
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      if (this.briefReturn === "hub") this.openHub();
      else this.openPicker();
    });
    this.body.append(back);

    // The chart first: where this source actually sits relative to home —
    // the brief opens on the geometry the whole watch is about.
    const map = this.buildBriefStarmap(source);
    if (map !== null) this.body.append(map);

    // The same identity block the picker row carries, so the source reads as
    // itself across the tap — minus the smudge, which the starmap directly
    // above already draws (under the same sizing law), and which said the
    // percentage a second time in a form nobody had asked for. The gloss
    // takes its place: the one number on this screen, stated in words.
    const identity = document.createElement("div");
    identity.className = "study-brief-identity";
    identity.append(this.buildSourceIdentity(source));
    const confGloss = document.createElement("div");
    confGloss.className = "study-brief-conf-gloss";
    confGloss.textContent =
      "The percentage is confidence in the reading, not a measure of the source: " +
      "nearer and brighter light reads surer. The remainder belongs to the other " +
      "stories the same light still allows.";
    identity.append(confGloss);
    this.body.append(identity);

    this.body.append(this.hairline());

    this.body.append(
      this.buildBriefSection(
        "WHAT A STUDY IS",
        "A standing watch on one source. Its light reaches us at its own delay, and every arrival is filed here and read against the stories still in play.",
      ),
    );

    const menu = this.menus === null ? [] : this.menus[source.signal.classification];
    if (menu.length > 0) {
      const section = this.buildBriefSection(
        "WHAT IT COULD TELL APART",
        // No class name in this sentence: the labels are not all count nouns
        // ("a transit shadows"), and the class already sits in the identity
        // block directly above.
        "At this range the reading admits more than one story. The watch holds them all at once, each with its share of the confidence.",
      );
      const list = document.createElement("div");
      list.className = "study-brief-menu";
      // Label over gloss, exactly as the board's hypothesis rows carry them —
      // the same reading in the same words on both sides of the tap.
      for (const entry of menu) {
        const item = document.createElement("div");
        item.className = "study-hyp-labelcol study-brief-reading";
        const label = document.createElement("span");
        label.className = "study-hyp-label holos-caps";
        label.textContent = entry.label;
        const gloss = document.createElement("span");
        gloss.className = "study-hyp-gloss";
        gloss.textContent = entry.gloss;
        item.append(label, gloss);
        list.append(item);
      }
      section.append(list);
      this.body.append(section);
    }

    this.body.append(
      this.buildBriefSection(
        "WHAT IT COSTS",
        "Nothing to open, nothing to hold, and no limit on how many stand at once. The light arrives whether or not you attend to it, so watching spends only patience. Compute buys questions, the inference that separates one reading from another, and no question has been put to this source.",
      ),
    );

    const meta = document.createElement("div");
    meta.className = "study-brief-meta holos-caps";
    meta.textContent = "NO COMPUTE · NO CLOCK · REVERSIBLE";
    this.body.append(meta);

    this.body.append(this.hairline());

    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    // The one commit on this screen, and the only one outside the ceremony
    // that costs the player a decision — so it wears the ceremony's lit
    // stone rather than the outlined pill the lesser verbs share.
    verbBtn.className = "study-verb-btn study-verb-btn--ember";
    if (this.pendingBeginStarId === starId) {
      verbBtn.disabled = true;
      verbBtn.textContent = "Opening the Watch…";
    } else {
      verbBtn.textContent = "Begin the Watch";
      verbBtn.addEventListener("click", () => {
        this.pendingBeginStarId = starId;
        this.socket.send({ type: "openStudy", starId });
        this.renderBrief();
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);
  }

  private buildBriefSection(header: string, body: string): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "study-brief-section";

    const h = document.createElement("div");
    h.className = "study-section-header holos-caps";
    h.textContent = header;

    const p = document.createElement("div");
    p.className = "study-brief-body";
    p.textContent = body;

    section.append(h, p);
    return section;
  }

  /**
   * The chart at the top of the briefing: HOME and this source at their true
   * bearing through the neighborhood, joined by the sightline the light
   * actually crosses. Everything on it is re-used vocabulary — the public
   * catalog's positions, the Model's point-in-a-thin-cyan-ring HOME and its
   * amber smudge law, the panel's hairline gold for the path — so it reads
   * as the sky folded flat, not a new diagram. Null (no map at all) when the
   * geometry isn't known: a DetectedSource carries no position (the
   * ObservedCiv boundary), so the chart needs the star from the catalog and
   * a SelfView, and it would rather be absent than invented.
   */
  private buildBriefStarmap(source: DetectedSource): HTMLDivElement | null {
    if (this.self === null || !this.starsById.has(source.starId)) return null;

    const wrap = document.createElement("div");
    wrap.className = "study-brief-map";

    const canvas = document.createElement("canvas");
    wrap.append(canvas);

    // The labels ride the canvas's geometry but live in the DOM, so they
    // stay real type on the tokens (and the HOME cyan is one declaration in
    // style.css, not a canvas constant).
    const homeLabel = document.createElement("span");
    homeLabel.className = "study-brief-map-home holos-caps";
    homeLabel.textContent = "HOME";

    const sourceLabel = document.createElement("span");
    sourceLabel.className = "study-brief-map-source holos-caps";
    sourceLabel.textContent = source.designation;

    const distLabel = document.createElement("span");
    distLabel.className = "study-brief-map-dist holos-caps";
    distLabel.textContent = `${source.distanceLy.toFixed(1)} LY`;

    wrap.append(homeLabel, sourceLabel, distLabel);

    // The body this sits in was just rebuilt synchronously and has no
    // layout yet, so widths are only real next frame — measure and paint
    // then. A view change in the same beat disconnects the canvas and the
    // frame is simply dropped (drawBriefStarmap's guard).
    requestAnimationFrame(() =>
      this.drawBriefStarmap(wrap, canvas, homeLabel, sourceLabel, distLabel, source),
    );
    return wrap;
  }

  /** Measure-and-paint half of the starmap — see buildBriefStarmap. */
  private drawBriefStarmap(
    wrap: HTMLDivElement,
    canvas: HTMLCanvasElement,
    homeLabel: HTMLSpanElement,
    sourceLabel: HTMLSpanElement,
    distLabel: HTMLSpanElement,
    source: DetectedSource,
  ): void {
    const self = this.self;
    const target = this.starsById.get(source.starId);
    if (!canvas.isConnected || self === null || target === undefined) return;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.scale(dpr, dpr);

    const home = self.position;
    const dx = target.position.x - home.x;
    const dy = target.position.y - home.y;
    const dz = target.position.z - home.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!Number.isFinite(dist) || dist <= 0) return;

    // The chart's frame: u runs HOME → source and lies along the drawn
    // line; v is any perpendicular (u × the world axis u leans on least).
    // Background stars keep their true offsets along both, so the scatter
    // is the real neighborhood seen side-on to the sightline — the same
    // stars the Model draws, folded flat, not decoration.
    const ux = dx / dist;
    const uy = dy / dist;
    const uz = dz / dist;
    const kx = Math.abs(uy) < 0.9 ? 0 : 1;
    const ky = 1 - kx;
    let vx = -uz * ky;
    let vy = uz * kx;
    let vz = ux * ky - uy * kx;
    const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
    vx /= vLen;
    vy /= vLen;
    vz /= vLen;

    const xHome = w * 0.14;
    const xSource = w * 0.86;
    const yLine = h * 0.44;
    const scale = (xSource - xHome) / dist;

    // Canvas ink, mirroring style.css's tokens — gradient stops need an
    // explicit alpha, so the vars can't be read straight in. (--holos-ink,
    // --holos-gold, --holos-cyan, and .study-row-smudge's amber.)
    const INK = "239, 233, 219";
    const GOLD = "211, 185, 130";
    const CYAN = "126, 233, 239";
    const AMBER = "240, 172, 102";

    // The rest of the neighborhood, faint, brighter by class the way the
    // sky is. Skips the two endpoints (they get their own marks) and
    // anything projected off the chart.
    for (const star of this.starsById.values()) {
      if (star.id === self.starId || star.id === target.id) continue;
      const px = star.position.x - home.x;
      const py = star.position.y - home.y;
      const pz = star.position.z - home.z;
      const sx = xHome + (px * ux + py * uy + pz * uz) * scale;
      const sy = yLine + (px * vx + py * vy + pz * vz) * scale;
      if (sx < 3 || sx > w - 3 || sy < 3 || sy > h - 3) continue;
      const alpha =
        star.spectralClass === "F" ? 0.4
        : star.spectralClass === "G" ? 0.32
        : star.spectralClass === "K" ? 0.24
        : 0.16;
      ctx.fillStyle = `rgba(${INK}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // The source's smudge radius first — the sightline stops at its edge.
    const conf = clamp01(source.signal.confidence);
    const smudgeR = 8 + (1 - conf) * 8;

    // The sightline: the panel's hairline gold, dotted, from the ring's
    // edge to the smudge — the path the light crosses.
    ctx.strokeStyle = `rgba(${GOLD}, 0.55)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 4.5]);
    ctx.beginPath();
    ctx.moveTo(xHome + 9, yLine);
    ctx.lineTo(xSource - smudgeR * 0.5, yLine);
    ctx.stroke();
    ctx.setLineDash([]);

    // HOME: the Model's mark — a point inside a thin cyan ring.
    ctx.fillStyle = `rgba(${CYAN}, 1)`;
    ctx.beginPath();
    ctx.arc(xHome, yLine, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${CYAN}, 0.85)`;
    ctx.beginPath();
    ctx.arc(xHome, yLine, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    // The source: the same smudge law as everywhere else — radius grows as
    // confidence falls, the core brightens as it rises (sourceSmudge's
    // numbers, at map scale).
    const core = 0.34 + conf * 0.52;
    const grad = ctx.createRadialGradient(xSource, yLine, 0, xSource, yLine, smudgeR);
    grad.addColorStop(0, `rgba(${AMBER}, ${core})`);
    grad.addColorStop(0.55, `rgba(${AMBER}, ${core * 0.45})`);
    grad.addColorStop(1, `rgba(${AMBER}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(xSource, yLine, smudgeR, 0, Math.PI * 2);
    ctx.fill();

    homeLabel.style.left = `${xHome}px`;
    homeLabel.style.top = `${yLine + 12}px`;
    sourceLabel.style.left = `${xSource}px`;
    sourceLabel.style.top = `${yLine + 12}px`;
    distLabel.style.left = `${(xHome + xSource) / 2}px`;
    distLabel.style.top = `${yLine - 26}px`;
  }

  /** Releases any verb that no `sky` will ever confirm (the server answered
   *  with an error instead), so a pending trio never sits disabled forever. */
  handleServerError(): void {
    let releasedBegin = false;
    if (this.pendingBeginStarId !== null) {
      this.pendingBeginStarId = null;
      releasedBegin = true;
    }
    let releasedQuestion = false;
    if (this.pendingQuestion !== null) {
      this.pendingQuestion = null;
      releasedQuestion = true;
    }
    let releasedProject = false;
    if (this.pendingProjectId !== null) {
      this.pendingProjectId = null;
      releasedProject = true;
    }
    let releasedLaunch = false;
    if (this.pendingLaunchStarId !== null) {
      this.pendingLaunchStarId = null;
      this.pendingLaunchPriorMissionIds = new Set();
      releasedLaunch = true;
    }

    if (releasedBegin && this.view === "brief") this.renderBrief();
    if (releasedQuestion && this.view === "focused" && this.focusedStarId !== null) {
      this.renderFocused(this.focusedStarId);
    }
    if (releasedProject && this.view === "project") this.renderProjectDetail();
    if (releasedLaunch && this.view === "launch") this.renderLaunch();
  }

  // ── Render: projects view ────────────────────────────────────────────

  private renderProjects(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "PROJECTS";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent =
      "What the observatory can build. Tap one to read what it grants.";
    this.body.append(subtitle);

    this.body.append(this.buildBudgetLine());

    this.body.append(this.hairline());

    for (const p of this.projects) {
      this.body.append(this.buildProjectRow(p));
    }
  }

  /** Every row opens the detail sheet — the picker → brief pattern. Nothing
   *  is bought from the list: the commit verb lives on the sheet, behind
   *  the grant, the cost, and the allocation line. */
  private buildProjectRow(p: ProjectSnapshot): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-project-row";
    btn.addEventListener("click", () => this.focusProject(p.id, "projects"));

    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = p.label;

    const line = document.createElement("div");
    line.className = "study-project-line";
    line.textContent = p.line;

    const meta = document.createElement("div");
    meta.className = "study-project-meta holos-caps";

    let flag: HTMLSpanElement | null = null;

    if (p.status === "running") {
      const countdown = p.landsYear === null ? null : formatCountdown(p.landsYear);
      meta.textContent = countdown !== null ? `LANDS IN ${countdown}` : "LANDING";
    } else if (p.status === "standing") {
      // Income projects wear their rate; the others landed a one-time grant
      // the sheet spells out, so the row carries the landing date instead —
      // never a false "+0/Y".
      meta.textContent =
        p.addRatePerYear > 0
          ? `+${p.addRatePerYear}/Y`
          : `LANDED ${formatAbsoluteYear(p.landsYear ?? 0)}`;
      flag = document.createElement("span");
      flag.className = "study-project-flag holos-caps";
      flag.textContent = "STANDING";
    } else {
      // "available"
      const free = this.currentFreeCompute();
      const rate = p.addRatePerYear > 0 ? ` · +${p.addRatePerYear}/Y` : "";
      const base = `${p.costCompute} COMPUTE · ${formatClockPair(p.durationYears)}${rate}`;
      meta.textContent =
        free >= p.costCompute
          ? base
          : `${base} · ${Math.ceil(p.costCompute - free)} SHORT`;
    }

    btn.append(label, line, meta);
    if (flag !== null) btn.append(flag);
    return btn;
  }

  // ── Render: project detail ───────────────────────────────────────────
  // The sheet that answers, for one project: what it grants, what it costs,
  // where its clock stands, and what the allocation can bear right now.
  // Reached from the Projects list and from a Tend project row; for an
  // available project it also carries the one commit verb (the brief's
  // "begin the watch" pattern — nothing on the list spends).

  private renderProjectDetail(): void {
    const id = this.focusedProjectId;
    const p = id === null ? undefined : this.projects.find((pp) => pp.id === id);
    this.body.innerHTML = "";

    // The catalog is fixed server-side, so a missing entry means a stale id
    // — fall back to wherever the tap came from.
    if (p === undefined) {
      this.focusedProjectId = null;
      if (this.projectReturn === "tend") {
        this.view = "tend";
        this.renderTend();
      } else if (this.projectReturn === "report") {
        this.view = "report";
        this.renderReport();
      } else if (this.projectReturn === "hub") {
        this.view = "hub";
        this.renderHub();
      } else {
        this.view = "projects";
        this.renderProjects();
      }
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      if (this.projectReturn === "tend") this.openTend();
      else if (this.projectReturn === "report") this.openReport();
      else if (this.projectReturn === "hub") this.openHub();
      else this.openProjects();
    });
    this.body.append(back);

    // Header: cost class quiet over the name loud — the focused study's
    // designation/name anatomy.
    const header = document.createElement("div");
    header.className = "study-focus-header";
    const kicker = document.createElement("div");
    kicker.className = "study-focus-designation holos-caps";
    kicker.textContent = p.costClass.toUpperCase();
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = p.label;
    header.append(kicker, nameEl);
    this.body.append(header);

    const line = document.createElement("div");
    line.className = "study-focus-lightage";
    line.textContent = p.line;
    this.body.append(line);

    this.body.append(this.hairline());

    // The grant. Present tense only once it is actually on.
    this.body.append(
      this.buildBriefSection(
        p.status === "standing" ? "WHAT IT GRANTS" : "WHAT IT WILL GRANT",
        p.effectLine,
      ),
    );

    this.body.append(this.hairline());

    // The clocks: the price in compute, then whichever date matters now.
    this.body.append(this.buildClockRow("COST", `${p.costCompute} COMPUTE`));
    if (p.status === "available") {
      this.body.append(this.buildClockRow("TAKES", formatClockPair(p.durationYears)));
    } else if (p.status === "running") {
      if (p.startedYear !== null) {
        this.body.append(this.buildClockRow("STARTED", formatAbsoluteYear(p.startedYear)));
      }
      const countdown = p.landsYear === null ? null : formatCountdown(p.landsYear);
      this.body.append(
        countdown !== null
          ? this.buildClockRow("LANDS IN", countdown)
          : this.buildClockRow("LANDS", "NOW"),
      );
    } else {
      // "standing"
      if (p.landsYear !== null) {
        this.body.append(this.buildClockRow("LANDED", formatAbsoluteYear(p.landsYear)));
      }
      const standing = document.createElement("div");
      standing.className = "study-brief-meta holos-caps";
      standing.textContent = "STANDING · PAID ONCE · THE GRANT HOLDS";
      this.body.append(standing);
    }

    this.body.append(this.hairline());

    // The economy the decision is made against — same line the hub carries.
    this.body.append(this.buildBudgetLine());

    if (p.status === "available") {
      const verbRow = document.createElement("div");
      verbRow.className = "study-verb-row";
      const verbBtn = document.createElement("button");
      verbBtn.type = "button";
      verbBtn.className = "study-verb-btn study-verb-btn--primary";

      const free = this.currentFreeCompute();
      let hint = "";
      if (this.pendingProjectId === p.id) {
        verbBtn.disabled = true;
        verbBtn.textContent = "starting the project…";
      } else if (free >= p.costCompute) {
        verbBtn.textContent = "start the project";
        verbBtn.addEventListener("click", () => {
          this.pendingProjectId = p.id;
          this.socket.send({ type: "startProject", projectId: p.id });
          this.renderProjectDetail();
        });
      } else {
        verbBtn.disabled = true;
        verbBtn.textContent = "start the project";
        hint = `${Math.ceil(p.costCompute - free)} SHORT`;
      }
      verbRow.append(verbBtn);
      this.body.append(verbRow);

      if (hint.length > 0) {
        const hintEl = document.createElement("div");
        hintEl.className = "study-brief-meta holos-caps";
        hintEl.textContent = hint;
        this.body.append(hintEl);
      }
    }
  }

  /** One row per OpenQuestion on the focused study — see renderFocused's
   *  comment for the state → anatomy mapping. */
  private buildQuestionRow(
    starId: string,
    q: OpenQuestion,
    evidenceIds: ReadonlySet<string>,
    buyable: boolean,
    hypothesisLabels: ReadonlyMap<HypothesisId, string>,
  ): HTMLElement {
    if (q.state === "offered") {
      // An offered question is a drill-in, not a buy button. The head folds
      // and unfolds; the spend is the BUY inside the fold, so no tap on the
      // menu can cost compute by itself.
      const wrap = document.createElement("div");
      wrap.className = "study-question";
      // AV3: tagged so a proposal's `question` route (focusStudyQuestion)
      // can find and scroll to this row — all three branches below carry
      // the same tag.
      wrap.dataset.questionId = q.id;

      const expanded =
        this.expandedQuestion !== null &&
        this.expandedQuestion.starId === starId &&
        this.expandedQuestion.questionId === q.id;

      const head = document.createElement("button");
      head.type = "button";
      head.className = "study-project-row study-question-head";
      head.setAttribute("aria-expanded", expanded ? "true" : "false");
      head.addEventListener("click", () => {
        this.expandedQuestion = expanded ? null : { starId, questionId: q.id };
        this.renderFocused(starId);
      });

      const headline = document.createElement("div");
      headline.className = "study-question-headline";
      const label = document.createElement("div");
      label.className = "study-project-label holos-serif";
      label.textContent = q.label;
      const caret = document.createElement("span");
      caret.className = "study-question-caret";
      caret.textContent = expanded ? "▾" : "▸";
      caret.setAttribute("aria-hidden", "true");
      headline.append(label, caret);

      const line = document.createElement("div");
      line.className = "study-project-line";
      line.textContent = q.line;
      const meta = document.createElement("div");
      meta.className = "study-project-meta holos-caps";

      const isPending =
        this.pendingQuestion !== null &&
        this.pendingQuestion.starId === starId &&
        this.pendingQuestion.questionId === q.id;
      const free = this.currentFreeCompute();
      const affordable = free >= q.costCompute;
      const base = `${q.costCompute} COMPUTE · ANSWERS IN ${formatClockPair(q.integrationYears)}`;
      // The cost/clock line reads the same as it always did, shortfall and
      // all — the only change is that the states below now dress the BUY
      // button rather than the row, which stays tappable so a question can
      // be read when it cannot be bought.
      const shortfall = Math.ceil(q.costCompute - free);
      meta.textContent = affordable || !buyable ? base : `${base} · ${shortfall} SHORT`;
      if (!buyable || isPending || !affordable) head.classList.add("study-project-row--muted");

      head.append(headline, line, meta);
      wrap.append(head);

      if (expanded) {
        const detail = document.createElement("div");
        detail.className = "study-question-detail";

        // 1. How the question is answered. No new light, no launch: the
        //    archive already holds the photons and the spend is the
        //    inference (questionmethod.ts).
        const method = document.createElement("div");
        method.className = "study-question-method";
        method.textContent = QUESTION_METHOD[q.id];
        detail.append(method);

        // 2. What it could tell apart — the server's class-shaped
        //    `separates`, which names readings on this study's menu and
        //    nothing about this source. Labels come from the same menu the
        //    board above is showing; anything not on it is skipped, the
        //    evidence-tag precedent.
        const separatesLabels: string[] = [];
        for (const id of q.separates) {
          const lbl = hypothesisLabels.get(id);
          if (lbl !== undefined) separatesLabels.push(lbl);
        }
        if (separatesLabels.length > 0) {
          const sepHeader = document.createElement("div");
          sepHeader.className = "study-question-subheader holos-caps";
          sepHeader.textContent = "WHAT IT CAN TELL APART";
          const tags = document.createElement("div");
          tags.className = "study-archive-tags";
          for (const lbl of separatesLabels) {
            const tag = document.createElement("span");
            tag.className = "study-archive-tag holos-caps";
            tag.textContent = lbl;
            tags.append(tag);
          }
          detail.append(sepHeader, tags);
        }

        // 3. The spend, and only here.
        const verbRow = document.createElement("div");
        verbRow.className = "study-verb-row";
        const buyBtn = document.createElement("button");
        buyBtn.type = "button";
        buyBtn.className = "study-verb-btn study-verb-btn--primary";
        buyBtn.textContent = "buy the question";
        let hint = "";
        if (!buyable) {
          // A grounded study buys nothing (the server refuses it too): the
          // menu still reads, so the player can see what reopening would
          // offer. A shelved study IS buyable — the spend reopens it
          // server-side.
          buyBtn.disabled = true;
          hint = "REOPEN THE STUDY TO BUY";
        } else if (isPending) {
          buyBtn.disabled = true;
          buyBtn.textContent = "buying the question…";
        } else if (affordable) {
          buyBtn.addEventListener("click", () => {
            this.pendingQuestion = { starId, questionId: q.id };
            this.socket.send({ type: "buyQuestion", starId, questionId: q.id });
            this.renderFocused(starId);
          });
        } else {
          // Unaffordable. No hint: the head's meta line already carries the
          // shortfall, and saying it twice in one fold is noise.
          buyBtn.disabled = true;
        }
        verbRow.append(buyBtn);
        detail.append(verbRow);

        if (hint.length > 0) {
          const hintEl = document.createElement("div");
          hintEl.className = "study-question-hint holos-caps";
          hintEl.textContent = hint;
          detail.append(hintEl);
        }

        wrap.append(detail);
      }

      return wrap;
    }

    if (q.state === "pending") {
      const row = document.createElement("div");
      row.className = "study-project-row study-project-row--disabled";
      row.dataset.questionId = q.id;
      const label = document.createElement("div");
      label.className = "study-project-label holos-serif";
      label.textContent = q.label;
      const meta = document.createElement("div");
      meta.className = "study-project-meta holos-caps";
      const countdown = q.answersYear === null ? null : formatCountdown(q.answersYear);
      meta.textContent = countdown !== null ? `ANSWERS IN ${countdown}` : "ANSWERING";
      row.append(label, meta);
      return row;
    }

    // "answered"
    const row = document.createElement("div");
    row.className = "study-project-row study-project-row--disabled";
    row.dataset.questionId = q.id;
    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = q.label;
    row.append(label);

    const finding = q.finding;
    if (finding !== null) {
      const mergedId = `${starId}/q/${q.id}`;
      if (evidenceIds.has(mergedId)) {
        // A sharpen finding — already a full line in the evidence list above.
        const meta = document.createElement("div");
        meta.className = "study-project-meta holos-caps";
        meta.textContent = `ANSWERED · AS OF ${formatArchiveAge(finding.lightAgeYears)} Y AGO`;
        row.append(meta);
      } else {
        // A plateau finding — never merged into evidence, so this is the
        // only place it renders. Looks like any other evidence line.
        const text = document.createElement("div");
        text.className = "study-archive-text";
        text.textContent = finding.annotation;
        const age = document.createElement("div");
        age.className = "study-archive-age holos-caps";
        age.textContent = `${formatArchiveAge(finding.lightAgeYears)} Y AGO`;
        row.append(text, age);
      }
    }
    return row;
  }

  // ── Render: the Tend ──────────────────────────────────────────────
  // One row per TendRow, in the SERVER's order (tend.ts's sortTendRows
  // — soonest-thing-first, parent then children) — the client never re-sorts.

  private renderTend(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    // The count the hub row used to carry, now beside the title in the
    // display face — a reading of the list, set against its name rather
    // than a second line under it. Empty is the one case it sits out: the
    // body already says "Nothing under way." and would say it twice.
    const titleRow = document.createElement("div");
    titleRow.className = "tend-titlerow";

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "TEND";
    titleRow.append(header);

    if (this.tend.length > 0) {
      const summary = document.createElement("div");
      summary.className = "tend-summary holos-serif";
      summary.textContent = this.tendSummaryLine();
      titleRow.append(summary);
    }

    this.body.append(titleRow);

    if (this.tend.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "Nothing under way.";
      this.body.append(empty);
      return;
    }

    this.body.append(this.hairline());

    for (const row of this.tend) {
      this.body.append(this.buildTendRow(row));
    }
  }

  /** A mission row opens the mission detail; a project row opens the
   *  project detail; any other row with a starId inspects the source (the
   *  study/question-row precedent). Every row is a destination now — the
   *  inert branch survives only as a defensive fallback. */
  private buildTendRow(row: TendRow): HTMLElement {
    const isMission = row.kind === "mission";
    const isProject = row.kind === "project";
    const clickable = isMission || isProject || row.starId !== null;

    let el: HTMLButtonElement | HTMLDivElement;
    if (clickable) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.addEventListener("click", () => {
        if (isMission) {
          const missionId = row.id.startsWith("mission/") ? row.id.slice("mission/".length) : row.id;
          this.focusMission(missionId);
        } else if (isProject) {
          const projectId = row.id.startsWith("project/") ? row.id.slice("project/".length) : row.id;
          this.focusProject(projectId, "tend");
        } else if (row.starId !== null) {
          this.onInspectCb?.(row.starId);
          this.close();
        }
      });
      el = btn;
    } else {
      el = document.createElement("div");
    }
    el.className = row.parentId !== null ? "tend-row tend-row--child" : "tend-row";

    const top = document.createElement("div");
    top.className = "tend-row-top";

    const main = document.createElement("div");
    main.className = "tend-row-main";
    const label = document.createElement("div");
    label.className = "tend-row-label holos-serif";
    label.textContent = row.label;
    const sub = document.createElement("div");
    sub.className = "tend-row-sub";
    sub.textContent = row.sub;
    main.append(label, sub);

    const meta = document.createElement("div");
    meta.className = "tend-row-meta";
    const chip = document.createElement("div");
    chip.className = "tend-badge tend-chip";
    chip.textContent = row.costClass.toUpperCase();
    const state = document.createElement("div");
    state.className =
      row.state === "silent"
        ? "tend-badge tend-row-state tend-row-state--silent"
        : "tend-badge tend-row-state";
    state.textContent = WORK_STATE_LABEL[row.state];
    meta.append(chip, state);

    top.append(main, meta);
    el.append(top);

    const track = this.buildTendTrack(row);
    if (track !== null) el.append(track);

    if (row.nextYear !== null && row.nextLabel !== null) {
      const next = document.createElement("div");
      next.className = "tend-row-next holos-caps";
      const countdown = formatCountdown(row.nextYear);
      next.textContent = countdown !== null ? `${row.nextLabel} IN ${countdown}` : row.nextLabel;
      el.append(next);
    }

    return el;
  }

  /**
   * The row's track: a hairline the fill crosses as the wait runs down, with
   * a travelling tip where the work is now. It is a CLOCK, not a task bar —
   * both ends are years the server already sent (`fromYear` → `nextYear`),
   * and the fraction is derived locally from clock.ts's nowYear, so the 1s
   * ticker advances it without a new sky.
   *
   * Three shapes, and the difference between them is the whole point:
   *  - running: fill and tip, plus a tick where the physics mark sits (a
   *    probe's amendment horizon — once the tip is past it, no beamed change
   *    can overtake the probe).
   *  - silent: the span ends at the year the schedule broke, so the track is
   *    drawn BROKEN — the line stops at the mark and the rest is a gap. No
   *    tip: nothing is travelling. Absence rendered as absence.
   *  - done (returned, landed): no track at all. Nothing is under way, and
   *    an empty rail would be an invitation to read one.
   */
  private buildTendTrack(row: TendRow): HTMLDivElement | null {
    // A STUDY's rail is not time — it is belief. A vigil has no end date to
    // run toward (light keeps arriving for as long as you keep watching), so
    // its progress is how far the leading reading has come: the same share
    // the study sheet draws, in the same shape, one row up. Time rails
    // belong to the things that actually end — questions, missions,
    // projects — and every one of those is a child row under it.
    if (row.kind === "study" && row.starId !== null) {
      const study = this.studiesByStarId.get(row.starId);
      const leader = leadingHypothesis(study?.hypotheses ?? []);
      if (leader === undefined) return null;
      const share = clamp01(leader.share);
      const track = document.createElement("div");
      track.className = "tend-track tend-track--belief";
      const fill = document.createElement("div");
      fill.className = "tend-track-fill";
      fill.style.width = `${(share * 100).toFixed(2)}%`;
      const glow = document.createElement("div");
      glow.className = "tend-track-tip tend-track-tip--belief";
      glow.style.left = `${(share * 100).toFixed(2)}%`;
      track.append(fill, glow);
      return track;
    }

    // Landed work keeps its rail, filled end to end and unlit: a project
    // that stands is not waiting on anything, and a full line says finished
    // where a missing line said nothing at all.
    if (row.kind === "project" && row.state === "standing") {
      const done = document.createElement("div");
      done.className = "tend-track tend-track--done";
      const fill = document.createElement("div");
      fill.className = "tend-track-fill";
      fill.style.width = "100%";
      done.append(fill);
      return done;
    }

    const from = row.fromYear;
    const now = nowYear();
    const isSilent = row.state === "silent";
    // A silence has no end to run toward, so the rail is the time SINCE
    // LAUNCH and the fill stops at the year the schedule broke. The gap
    // after it is the silence itself, and it widens every year nothing
    // comes — which is the one honest thing a bar can say about a probe
    // that has stopped answering.
    const end = isSilent ? now : (row.nextYear ?? row.markYear);
    const fillTo = isSilent ? row.markYear : now;
    if (from === null || end === null || fillTo === null || end <= from) return null;

    const fraction = clamp01((fillTo - from) / (end - from));

    const track = document.createElement("div");
    track.className = isSilent ? "tend-track tend-track--broken" : "tend-track";

    const fill = document.createElement("div");
    fill.className = "tend-track-fill";
    fill.style.width = `${(fraction * 100).toFixed(2)}%`;
    track.append(fill);

    if (isSilent) {
      // The rail resumes past the gap: the schedule still exists, and
      // nothing is travelling along it.
      const tail = document.createElement("div");
      tail.className = "tend-track-tail";
      tail.style.left = `${Math.min(100, fraction * 100 + 8).toFixed(2)}%`;
      track.append(tail);
      return track;
    }

    const tip = document.createElement("div");
    tip.className = "tend-track-tip";
    tip.style.left = `${(fraction * 100).toFixed(2)}%`;
    track.append(tip);

    // The mark is only drawn where it actually falls inside the span.
    const mark = row.markYear;
    if (mark !== null && mark > from && mark < end) {
      const tick = document.createElement("div");
      tick.className = "tend-track-mark";
      tick.style.left = `${(((mark - from) / (end - from)) * 100).toFixed(2)}%`;
      track.append(tick);
    }

    return track;
  }

  // ── Render: the report (AV2) ─────────────────────────────────────────
  // The observatory's annal: frozen record sentences, stamped and routed,
  // in the server's own order (promoted-first if a header fired, else
  // newest-first — protocol.ts's ReportPayload). The client never sorts.
  // NOT in the 1s ticker (startTicking): there is nothing here that counts
  // down, and a re-render mid-scroll would fight the reader's thumb.

  private renderReport(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE REPORT";
    this.body.append(header);

    if (this.reportExplainerText !== null) {
      const note = document.createElement("div");
      note.className = "voice-note";
      note.textContent = this.reportExplainerText;
      this.body.append(note);
    }

    const report = this.report;
    if (report === null) return;

    if (report.header !== null) {
      const headerProse = document.createElement("div");
      headerProse.className = "report-header";
      headerProse.textContent = report.header;
      this.body.append(headerProse);
      this.body.append(this.hairline());
    }

    for (const entry of report.entries) {
      this.body.append(this.buildReportRow(entry));
    }
  }

  /** One row: the buildTendRow skeleton minus the track and the state
   *  badge — a report entry has no clock and no work state, only a frozen
   *  sentence, its stamp, and where a tap on it goes. A <button> when the
   *  route can go anywhere, a plain <div> for `kind: "none"` (the same
   *  clickable/inert split buildTendRow makes). */
  private buildReportRow(entry: ReportEntry): HTMLElement {
    const clickable = entry.route.kind !== "none";

    let el: HTMLButtonElement | HTMLDivElement;
    if (clickable) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.addEventListener("click", () => this.followReportRoute(entry.route));
      el = btn;
    } else {
      el = document.createElement("div");
    }
    el.className = "tend-row";

    const stamp = document.createElement("div");
    // The caps/tabular chrome family (tend-mission-clock-value's precedent)
    // at --holos-text-xs, not --holos-text-xxs: a date is a reading, not an
    // enclosed classifier a thumb learns by shape.
    stamp.className = "report-stamp holos-caps study-tabular";
    stamp.textContent = entry.stamp;
    el.append(stamp);

    const record = document.createElement("div");
    record.className = "report-row-line";
    record.textContent = entry.record;
    el.append(record);

    if (entry.remark !== null) {
      const remark = document.createElement("div");
      remark.className = "report-remark";
      remark.textContent = entry.remark;
      el.append(remark);
    }

    return el;
  }

  /** AV2 routing: study/mission focus the board directly; source is the
   *  Tend-row idiom (inspect the source card, then close the sheet);
   *  project opens the detail sheet with "report" as its return leg, so its
   *  own back button comes home here. `kind: "none"` never reaches this —
   *  buildReportRow renders it as a non-interactive div. */
  private followReportRoute(route: ReportRoute): void {
    switch (route.kind) {
      case "study":
        this.focusStudy(route.starId);
        break;
      case "mission":
        this.focusMission(route.missionId);
        break;
      case "source":
        this.onInspectCb?.(route.starId);
        this.close();
        break;
      case "project":
        this.focusProject(route.projectId, "report");
        break;
      case "none":
        break;
    }
  }

  // ── Render: mission detail ───────────────────────────────────────────

  private buildClockRow(label: string, value: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "tend-mission-clock-row";
    const l = document.createElement("span");
    l.className = "tend-mission-clock-label holos-caps";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "tend-mission-clock-value holos-caps study-tabular";
    v.textContent = value;
    row.append(l, v);
    return row;
  }

  private renderMissionDetail(): void {
    const missionId = this.focusedMissionId;
    const m = missionId === null ? undefined : this.missionsById.get(missionId);
    this.body.innerHTML = "";
    if (missionId === null || m === undefined) {
      // The mission vanished between the tap and this render — see update().
      this.view = "tend";
      this.focusedMissionId = null;
      this.renderTend();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openTend());
    this.body.append(back);

    // Header: the mission's kind, then the target — same anatomy as the
    // study focus header (designation quiet, name loud). A mission survives
    // its source (missions.ts), so a target no longer visible falls back to
    // the Tend row's own "at {name}" text rather than nothing.
    const header = document.createElement("div");
    header.className = "study-focus-header";
    const kicker = document.createElement("div");
    kicker.className = "holos-caps";
    kicker.textContent = m.label;
    header.append(kicker);

    const source = this.sourcesByStarId.get(m.starId);
    if (source !== undefined) {
      const localName = this.localNames.get(m.starId);
      const hasLocalName = localName !== undefined && localName.length > 0;
      if (hasLocalName) {
        const desig = document.createElement("div");
        desig.className = "study-focus-designation holos-caps";
        desig.textContent = source.designation;
        header.append(desig);
      }
      const nameEl = document.createElement("div");
      nameEl.className = "study-focus-name holos-serif";
      nameEl.textContent = hasLocalName ? (localName as string) : source.designation;
      header.append(nameEl);
    } else {
      const tendRow = this.tend.find((r) => r.id === `mission/${m.id}`);
      const fallbackName = tendRow?.sub.replace(/^at /, "") ?? m.starId;
      const nameEl = document.createElement("div");
      nameEl.className = "study-focus-name holos-serif";
      nameEl.textContent = fallbackName;
      header.append(nameEl);
    }
    this.body.append(header);

    this.body.append(this.hairline());

    // Charter — the same reading anatomy the briefing's menu uses (label
    // over quiet gloss), reused wholesale rather than a new quiet-list style.
    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = "CHARTER";
    this.body.append(charterHeader);

    const charterList = document.createElement("div");
    charterList.className = "study-brief-menu";
    for (const c of m.charter) {
      const item = document.createElement("div");
      item.className = "study-hyp-labelcol study-brief-reading";
      const label = document.createElement("span");
      label.className = "study-hyp-label holos-caps";
      label.textContent = c.label;
      const line = document.createElement("span");
      line.className = "study-hyp-gloss";
      line.textContent = c.line;
      item.append(label, line);
      charterList.append(item);
    }
    this.body.append(charterList);

    this.body.append(this.hairline());

    // The clock trio.
    const now = nowYear();
    this.body.append(
      now < m.arrivalYear
        ? this.buildClockRow("ARRIVES", formatCountdown(m.arrivalYear) ?? formatAbsoluteYear(m.arrivalYear))
        : this.buildClockRow("ARRIVED", formatAbsoluteYear(m.arrivalYear)),
    );
    this.body.append(
      now < m.firstWordYear
        ? this.buildClockRow(
            "FIRST WORD",
            formatCountdown(m.firstWordYear) ?? formatAbsoluteYear(m.firstWordYear),
          )
        : this.buildClockRow("FIRST WORD", formatAbsoluteYear(m.firstWordYear)),
    );

    if (m.state === "silent") {
      // The wire carries no explicit silence-onset date (missionWorkState
      // derives "silent" structurally, not as a stamped year) — the last
      // report's arrival, or the first-word promise if none ever landed, is
      // the truest date already on hand. The charter sits right above; the
      // game never explains further.
      const lastReport = m.reports[m.reports.length - 1];
      const sinceYear = lastReport !== undefined ? lastReport.arrivedYear : m.firstWordYear;
      const silentRow = document.createElement("div");
      silentRow.className = "tend-mission-silent holos-caps";
      silentRow.textContent = `SILENT SINCE ${formatAbsoluteYear(sinceYear)}`;
      this.body.append(silentRow);
    } else if (m.state === "standing" && m.nextWordYear !== null) {
      this.body.append(
        this.buildClockRow(
          "NEXT WORD",
          formatCountdown(m.nextWordYear) ?? formatAbsoluteYear(m.nextWordYear),
        ),
      );
    }

    this.body.append(this.hairline());

    const reportsHeader = document.createElement("div");
    reportsHeader.className = "study-section-header holos-caps";
    reportsHeader.textContent = "REPORTS";
    this.body.append(reportsHeader);

    if (m.reports.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-archive-empty";
      empty.textContent = "No word yet.";
      this.body.append(empty);
    } else {
      for (const r of m.reports) {
        const row = document.createElement("div");
        row.className = "study-archive-row";
        const headline = document.createElement("div");
        headline.className = "tend-report-headline holos-caps";
        headline.textContent = r.headline;
        const detail = document.createElement("div");
        detail.className = "study-archive-text";
        detail.textContent = r.detail;
        const age = document.createElement("div");
        age.className = "study-archive-age holos-caps";
        age.textContent = `AS OF ${formatArchiveAge(r.lightAgeYears)} Y AGO`;
        row.append(headline, detail, age);
        this.body.append(row);
      }
    }
  }

  // ── Render: the launch sheet ─────────────────────────────────────────
  // Two steps, no hold-to-commit ceremony (economy-design.md: Ambient = no
  // ceremony) — a kind pick with a live clock preview, then a real charter.

  private buildKindRow(k: MissionKindDef): HTMLButtonElement {
    const selected = this.launchKind === k.kind;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected ? "study-project-row tend-launch-kind-row--selected" : "study-project-row";
    btn.addEventListener("click", () => {
      this.launchKind = k.kind;
      this.renderLaunch();
    });

    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = k.label;
    const line = document.createElement("div");
    line.className = "study-project-line";
    line.textContent = k.line;
    const meta = document.createElement("div");
    meta.className = "study-project-meta holos-caps";
    meta.textContent = `${k.costCompute} COMPUTE`;

    btn.append(label, line, meta);
    return btn;
  }

  private buildClauseRow(c: CharterClauseDef): HTMLButtonElement {
    const selected = this.launchCharter.has(c.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected
      ? "tend-launch-clause-row tend-launch-clause-row--selected"
      : "tend-launch-clause-row";
    btn.addEventListener("click", () => this.toggleClause(c));

    const label = document.createElement("span");
    label.className = "study-hyp-label holos-caps";
    label.textContent = c.label;
    const line = document.createElement("span");
    line.className = "study-hyp-gloss";
    line.textContent = c.line;
    btn.append(label, line);
    return btn;
  }

  /** Tap toggles; at most one clause per group (client-side enforcement —
   *  missions.ts's validateCharter re-checks server-side regardless). */
  private toggleClause(c: CharterClauseDef): void {
    if (this.missionCatalog === null) return;
    const next = new Set(this.launchCharter);
    if (next.has(c.id)) {
      next.delete(c.id);
    } else {
      for (const other of [...next]) {
        const def = this.missionCatalog.clauses.find((cc) => cc.id === other);
        if (def !== undefined && def.group === c.group) next.delete(other);
      }
      next.add(c.id);
    }
    this.launchCharter = next;
    this.renderLaunch();
  }

  private renderLaunch(): void {
    const starId = this.launchStarId;
    const source = starId === null ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";

    // The source faded before the sheet opened (or between renders) — there
    // is nothing to launch at, so fall back rather than render about nothing
    // (renderBrief's precedent).
    if (starId === null || source === undefined) {
      this.view = "hub";
      this.launchStarId = null;
      this.renderHub();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-focus-header";
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;
    if (hasLocalName) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = source.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = hasLocalName ? (localName as string) : source.designation;
    header.append(nameEl);
    this.body.append(header);

    const meta = document.createElement("div");
    meta.className = "holos-caps";
    meta.textContent = `${source.distanceLy.toFixed(1)} LY · AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;
    this.body.append(meta);

    this.body.append(this.hairline());

    const kindHeader = document.createElement("div");
    kindHeader.className = "study-section-header holos-caps";
    kindHeader.textContent = "CHOOSE A KIND";
    this.body.append(kindHeader);

    if (this.missionCatalog !== null) {
      for (const k of this.missionCatalog.kinds) {
        this.body.append(this.buildKindRow(k));
      }
    }

    if (this.launchKind !== null) {
      const F = this.probeFlightYearsPerLy;
      const d = source.distanceLy;
      const preview = document.createElement("div");
      preview.className = "study-focus-lightage";
      preview.textContent = `ARRIVES IN ${formatClockPair(F * d)} · FIRST WORD IN ${formatClockPair((F + 1) * d)}`;
      this.body.append(preview);
    }

    this.body.append(this.hairline());

    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = "WRITE THE CHARTER";
    this.body.append(charterHeader);

    const catalog = this.missionCatalog;
    if (this.launchKind === null || catalog === null) {
      const hint = document.createElement("div");
      hint.className = "study-picker-subtitle";
      hint.textContent = "Choose a kind to write its charter.";
      this.body.append(hint);
    } else {
      const kind = this.launchKind;
      for (const c of catalog.clauses) {
        if (!c.appliesTo.includes(kind)) continue;
        this.body.append(this.buildClauseRow(c));
      }
    }

    this.body.append(this.hairline());

    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "study-verb-btn study-verb-btn--primary";

    const kindDef =
      catalog === null || this.launchKind === null
        ? undefined
        : catalog.kinds.find((k) => k.kind === this.launchKind);
    const count = this.launchCharter.size;
    const validCount = catalog !== null && count >= catalog.minClauses && count <= catalog.maxClauses;
    const free = this.currentFreeCompute();
    const affordable = kindDef !== undefined && free >= kindDef.costCompute;
    const pending = this.pendingLaunchStarId === starId;

    let hint = "";
    if (pending) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCHING…";
    } else if (kindDef === undefined) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCH";
    } else if (!validCount) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCH";
      hint = "PICK TWO OR THREE";
    } else if (!affordable) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCH";
      hint = `${Math.ceil(kindDef.costCompute - free)} SHORT`;
    } else {
      const launchKind = this.launchKind;
      verbBtn.textContent = "LAUNCH";
      verbBtn.addEventListener("click", () => {
        if (launchKind === null) return;
        this.pendingLaunchStarId = starId;
        this.pendingLaunchPriorMissionIds = new Set(this.missions.map((mm) => mm.id));
        this.socket.send({
          type: "launchMission",
          starId,
          kind: launchKind,
          charter: [...this.launchCharter],
        });
        this.renderLaunch();
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);

    if (hint.length > 0) {
      const hintEl = document.createElement("div");
      hintEl.className = "study-brief-meta holos-caps";
      hintEl.textContent = hint;
      this.body.append(hintEl);
    }
  }

  // ── Render: focused view ─────────────────────────────────────────────

  private renderFocused(starId: string): void {
    const s = this.studiesByStarId.get(starId);
    const source = s === undefined ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";
    if (s === undefined || source === undefined) return; // defensive; see update()

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ STUDIES";
    back.addEventListener("click", () => this.openBoard());
    this.body.append(back);

    const leader = leadingHypothesis(s.hypotheses);
    const leaderShare = clamp01(leader?.share ?? 0);
    const smudge = document.createElement("div");
    smudge.className = "study-smudge";
    smudge.style.opacity = (0.3 + leaderShare * 0.6).toFixed(2);
    this.body.append(smudge);

    const header = document.createElement("div");
    header.className = "study-focus-header";
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;
    if (hasLocalName) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = source.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = hasLocalName ? (localName as string) : source.designation;
    header.append(nameEl);
    this.body.append(header);

    const lightAgeLine = document.createElement("div");
    lightAgeLine.className = "study-focus-lightage";
    lightAgeLine.textContent = `The light you are reading left it ${source.lightAgeYears.toFixed(1)} years ago.`;
    this.body.append(lightAgeLine);

    this.body.append(this.hairline());

    // WHAT IT MIGHT BE
    const hypSection = document.createElement("div");
    hypSection.className = "study-section";
    const hypHeader = document.createElement("div");
    hypHeader.className = "study-section-header holos-caps";
    hypHeader.textContent = "WHAT IT MIGHT BE";
    hypSection.append(hypHeader);

    const pcts = hypothesisPercentages(s.hypotheses);
    const maxShare = s.hypotheses.reduce((m, h) => Math.max(m, h.share), 0);
    for (const h of s.hypotheses) {
      const isLeading = h.share === maxShare;
      const row = document.createElement("div");
      row.className = "study-hyp-row";

      const labelCol = document.createElement("span");
      labelCol.className = "study-hyp-labelcol";
      const label = document.createElement("span");
      label.className = "study-hyp-label holos-caps";
      label.textContent = h.label;
      const gloss = document.createElement("span");
      gloss.className = "study-hyp-gloss";
      gloss.textContent = h.gloss;
      labelCol.append(label, gloss);

      const track = document.createElement("div");
      track.className = "study-hyp-track";
      const sharePct = clamp01(h.share) * 100;
      const fill = document.createElement("div");
      fill.className = isLeading ? "study-hyp-fill study-hyp-fill--leading" : "study-hyp-fill";
      fill.style.width = `${sharePct}%`;
      const glow = document.createElement("div");
      glow.className = isLeading ? "study-hyp-glow study-hyp-glow--leading" : "study-hyp-glow";
      glow.style.left = `${sharePct}%`;
      track.append(fill, glow);

      const pct = document.createElement("span");
      pct.className = "study-hyp-pct study-tabular";
      pct.textContent = `${pcts.get(h.id) ?? Math.round(h.share * 100)}%`;

      row.append(labelCol, track, pct);
      hypSection.append(row);
    }
    this.body.append(hypSection);

    const annotation = document.createElement("div");
    annotation.className = "study-annotation";
    annotation.textContent = s.annotationLine;
    this.body.append(annotation);

    this.body.append(this.hairline());

    // The menu's own wording, read by both the evidence tags below and an
    // expanded question's "what it can tell apart" list.
    const hypothesisLabels = new Map(s.hypotheses.map((h) => [h.id, h.label] as const));

    // WHAT THE LIGHT HAS SHOWN
    const archiveSection = document.createElement("div");
    archiveSection.className = "study-section";
    const archiveHeader = document.createElement("div");
    archiveHeader.className = "study-section-header holos-caps";
    archiveHeader.textContent = "WHAT THE LIGHT HAS SHOWN";
    archiveSection.append(archiveHeader);

    if (s.evidence.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-archive-empty";
      empty.textContent = "No light in the record yet.";
      archiveSection.append(empty);
    } else {
      const archiveIntro = document.createElement("div");
      archiveIntro.className = "study-focus-lightage";
      archiveIntro.textContent = "Each entry is how long ago the change happened.";
      archiveSection.append(archiveIntro);

      for (const ev of s.evidence) {
        const row = document.createElement("div");
        row.className = "study-archive-row";

        const age = document.createElement("span");
        age.className = "study-archive-age holos-caps";
        age.textContent = `${formatArchiveAge(ev.lightAgeYears)} Y AGO`;

        const text = document.createElement("span");
        text.className = "study-archive-text";
        text.textContent = ev.annotation;

        row.append(age, text);

        if (ev.latest) {
          const newest = document.createElement("span");
          newest.className = "study-archive-newest holos-caps";
          newest.textContent = "THE NEWEST LIGHT WE HAVE";
          row.append(newest);
        }

        if (ev.moved.length > 0) {
          const tags = document.createElement("div");
          tags.className = "study-archive-tags";
          for (const id of ev.moved) {
            const lbl = hypothesisLabels.get(id);
            if (lbl === undefined) continue; // not in this study's menu — skip silently
            const tag = document.createElement("span");
            tag.className = "study-archive-tag holos-caps";
            tag.textContent = lbl;
            tags.append(tag);
          }
          row.append(tags);
        }

        archiveSection.append(row);
      }
    }
    this.body.append(archiveSection);

    // OPEN QUESTIONS — one row per OpenQuestion (questions.ts's catalog for
    // this study's signal class, always non-empty). Offered folds open into
    // its method, what it can tell apart, and the BUY that spends the
    // compute; pending shows a live countdown; answered either
    // points at the evidence entry above (a sharpen finding — studies.ts's
    // mergeEvidence already folded it in under `${starId}/q/${id}`) or, for
    // a plateau finding (never merged into evidence — assembleQuestion
    // returns move: null for a plateau), renders the finding inline.
    const oqSection = document.createElement("div");
    oqSection.className = "study-open-questions";
    const oqHeader = document.createElement("div");
    oqHeader.className = "study-section-header holos-caps";
    oqHeader.textContent = "OPEN QUESTIONS";
    oqSection.append(oqHeader);

    const evidenceIds = new Set(s.evidence.map((e) => e.id));
    // AV3: capture the row a proposal's `question` route asked to be
    // highlighted, so it can be scrolled into view once the whole render
    // (including the verb row below) is on the DOM.
    let highlightedQuestionEl: HTMLElement | null = null;
    for (const q of s.openQuestions) {
      const questionRow = this.buildQuestionRow(
        starId,
        q,
        evidenceIds,
        s.status !== "grounded",
        hypothesisLabels,
      );
      if (this.highlightQuestionId !== null && q.id === this.highlightQuestionId) {
        highlightedQuestionEl = questionRow;
      }
      oqSection.append(questionRow);
    }
    this.body.append(oqSection);

    this.body.append(this.hairline());

    // Verb row — reversible, a tap, no confirmation.
    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "study-verb-btn";
    if (s.status === "open") {
      verbBtn.textContent = "shelve the study";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "shelveStudy", starId });
      });
    } else {
      // Grounded and shelved both reopen through openStudy, but they are not
      // the same act: resuming a shelved vigil picks the watch back up, while
      // reopening a grounded one is doubting a probe that was there. The
      // reopen stamps a new openedYear server-side, so the report that closed
      // this study can never close it again — only the next word can.
      verbBtn.textContent =
        s.status === "grounded" ? "reopen the study" : "resume the watch";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openStudy", starId });
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);

    // AV3: the one-shot scroll for a proposal's `question` route. Cleared
    // BEFORE scheduling so the 1s tick's re-render of this same view (which
    // calls renderFocused again) never re-scrolls the sheet under the
    // player's thumb.
    if (this.highlightQuestionId !== null) {
      this.highlightQuestionId = null;
      if (highlightedQuestionEl !== null) {
        const target = highlightedQuestionEl;
        requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
      }
    }
  }

  // ── Swipe-down to close ─────────────────────────────────────────────

  private attachSwipe(): void {
    this.topbar.addEventListener("pointerdown", this.onDragStart);
    this.topbar.addEventListener("pointermove", this.onDragMove);
    this.topbar.addEventListener("pointerup", this.onDragEnd);
    this.topbar.addEventListener("pointercancel", this.onDragEnd);
  }

  private readonly onDragStart = (e: PointerEvent): void => {
    // The close button shares this bar; leave it a button.
    if (e.target instanceof Element && e.target.closest("button") !== null) return;
    if (!e.isPrimary || this.dragStartY !== null) return;
    this.topbar.setPointerCapture(e.pointerId);
    // The sheet eases its transform over 320ms; while a thumb is driving it
    // the drag must be the only thing moving it.
    this.sheet.classList.add("dragging");
    this.dragStartY = e.clientY;
    this.dragDy = 0;
  };

  private readonly onDragMove = (e: PointerEvent): void => {
    if (this.dragStartY === null) return;
    this.dragDy = Math.max(0, e.clientY - this.dragStartY);
    this.sheet.style.transform = `translateY(${this.dragDy}px)`;
  };

  private readonly onDragEnd = (): void => {
    if (this.dragStartY === null) return;
    const dy = this.dragDy;
    this.dragStartY = null;
    this.dragDy = 0;
    this.sheet.classList.remove("dragging");
    this.sheet.style.transform = "";
    if (dy > SWIPE_CLOSE_PX) this.close();
  };
}
