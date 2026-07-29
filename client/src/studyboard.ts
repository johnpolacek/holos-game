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
  StudyStatus,
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
  TripwireKind,
  ReportPayload,
  ReportEntry,
  ReportRoute,
  Proposal,
  ProposalRoute,
  ContactWire,
  ThreadSummary,
  ThreadDetail,
  ThreadSignal,
  ThreadState,
  SelfView,
  Star,
} from "@holos/protocol";
// A2.5: the two runtime pieces of the signal contract. `sanitizeSignalText`
// is PURE and is the server's own door, imported rather than re-implemented
// so a retune there retunes the composer with it. The client pre-check is
// never authoritative: the server runs the same function again and owns the
// refusal (`signal-rejected`).
import { MAX_SIGNAL_LEN, sanitizeSignalText } from "@holos/protocol";
import type { CohortSocket } from "./net";
import { QUESTION_METHOD } from "./questionmethod";
import { CLASS_LABEL } from "./sourcecard";
import {
  formatAbsoluteYear,
  formatClockPair,
  formatCountdown,
  formatGameYears,
  nowYear,
} from "./clock";
// Inlined at build time rather than fetched: one more request for a 400-byte
// mark is a request the sky does not need, and the markup carries
// fill="currentColor", so the icon takes the chip's ink — including the
// glare-mode bump — without a second color declaration anywhere.
import treeViewIcon from "@phosphor-icons/core/assets/light/tree-view-light.svg?raw";

const SWIPE_CLOSE_PX = 56;

/** How long a shout holds the channel, in game years — contact.ts's
 *  BROADCAST_SHOUT_YEARS, spelled as chrome. The wire carries no such
 *  number (there are no free numbers on it), so a retune there retunes this;
 *  being wrong costs one refused tap and nothing else. */
const BROADCAST_WINDOW_YEARS = 24;

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

// A2.3: the chrome (client-side, per protocol.ts's tripwires comment) named
// beside each of the three always-present kinds, in wire order. The 70% is
// studies.ts's CROSS_SHARE spelled as chrome: the wire deliberately carries
// no threshold (no free numbers), so a retune of CROSS_SHARE must retune
// this label with it.
const TRIPWIRE_LABEL: Record<TripwireKind, string> = {
  regress: "IF IT REGRESSES",
  "leakage-stops": "IF THE LEAKAGE STOPS",
  crosses: "IF BELIEF CROSSES 70%",
};

const TRIPWIRE_STATE_LABEL: Record<"available" | "armed" | "tripped", string> = {
  available: "ARM",
  armed: "ARMED",
  tripped: "TRIPPED",
};

/**
 * A2.5: how a thread's state reads, on the hub row and again in the thread's
 * own header. The chrome is the client's (the TRIPWIRE_LABEL precedent) —
 * the wire carries the state id and no wording.
 *
 * `unopened` cannot be reached from buildThreads (a pair with nothing either
 * way is not built at all) and is carried only to keep the map total against
 * ThreadState.
 */
const THREAD_STATE_LABEL: Record<ThreadState, string> = {
  unopened: "UNOPENED",
  "in-flight": "IN FLIGHT",
  awaiting: "AWAITING",
  answered: "ANSWERED",
  silent: "SILENT",
  withdrawn: "WITHDRAWN",
};

/**
 * The silence, authored and pinned here rather than sent. It is a statement
 * about YOUR OWN arithmetic — the round trip plus a bound on deliberation
 * that is the same for every counterpart — and never about them, which is
 * exactly why it can be a client string at all.
 */
const THREAD_SILENT_LINE =
  "The window in which an answer could have arrived has passed. Nothing came.";

/** The composer's remaining-count appears only once the room left is worth
 *  watching. Above this it is a number nobody asked for. */
const SIGNAL_REMAINING_VISIBLE = 40;

/** A2.3: the three exits `isClosed` covers server-side (studies.ts). Kept as
 *  its own client-side check rather than importing the server helper — the
 *  board never imports studies.ts — so grounded/called/overtaken read
 *  questions and tripwires the same inert way; shelved stays live (buying a
 *  question or arming a tripwire while shelved is exactly what reopens it,
 *  the existing grounded-only gate's precedent generalized). */
function isClosedStudyStatus(status: StudyStatus): boolean {
  return status === "grounded" || status === "called" || status === "overtaken";
}

// The Tend/mission-detail absolute-year chrome ("Y1204") moved to clock.ts
// in A2.4: the choice ceremony stamps arrival years out on the sky and the
// two surfaces must render the same date the same way.

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
  private budget: ComputeBudget = { free: 0, ratePerYear: 0, cap: 0, asOfYear: 0 };
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
    | "report"
    // A2.5: one thread, in full. Its own view rather than a fold inside the
    // hub — a conversation is read top to bottom, and the composer needs the
    // whole column.
    | "thread" = "list";
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
  // offered row expands it — the spend is the button inside the fold, never
  // the row — and a second tap folds it back. Lives on the panel, not in the
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

  // A2.3: the CALL IT two-step. The first tap arms the confirm (a starId,
  // never a boolean, so a stale confirm can never read against the wrong
  // study); the second tap sends `callStudy` and moves the star into
  // pendingCallStarId instead. Reset whenever the focused view opens fresh
  // (focusStudy, the expandedQuestion precedent) — a half-armed confirm
  // never survives a close/reopen.
  private callConfirmStarId: string | null = null;
  // Released the moment the study's own status leaves open/shelved (the
  // confirming sky), or by handleServerError on a "study-unavailable".
  private pendingCallStarId: string | null = null;

  // A2.3: tripwires in flight, keyed `${starId}:${kind}` — free to arm and
  // instant, so this only guards against a double-tap outrunning the round
  // trip. Cleared wholesale on the next `sky` (any real transition will have
  // landed by then) and on any server error.
  private pendingTripwireKeys = new Set<string>();

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

  // A2.4: the contact block from the latest `sky`, for THE VOICE section —
  // whether a shout is already going out, and therefore whether the row is a
  // verb or a status. Null until the first sky.
  private contact: ContactWire | null = null;
  private onVoiceActionCb: (() => void) | null = null;
  private onHailActionCb: ((starId: string) => void) | null = null;
  // A one-shot: openHub("voice") scrolls the section into view on the render
  // that follows, and clears itself. The HOME mote's tap is the only caller.
  private hubScrollToVoice = false;

  // ── A2.5: the thread view ────────────────────────────────────────────
  // Which thread is on screen. Also the client half of a PER-CONNECTION
  // server state with no DO key behind it: a reconnect comes back with
  // nothing open, so update() says which one it is again (see the resend
  // there). Null whenever the view is not "thread".
  private threadStarId: string | null = null;

  // The composer's in-progress text, kept on the panel rather than in the
  // DOM because renderThread() rebuilds the whole body on every `sky` (the
  // expandedQuestion precedent) and a half-written signal must survive that.
  // `composerCaret` and the focus flag ride along so the keyboard does not
  // drop when a wake lands mid-sentence.
  private composerDraft = "";
  private composerCaret: number | null = null;
  private composerFocused = false;
  // The live composer's three elements, so the remaining-count and the SEND
  // pill can be refreshed on every keystroke without re-rendering the thread
  // under the player's thumb (refreshHubBudget's precedent).
  private composerEls: {
    readonly input: HTMLTextAreaElement;
    readonly remaining: HTMLDivElement;
    readonly send: HTMLButtonElement;
  } | null = null;
  // A sendSignal in flight, holding the RAW text so a refusal can put the
  // words back in the box. Released by any sky at all (onSendSignal answers
  // with a fresh one) and by handleServerError on a rejection.
  private pendingSignalText: string | null = null;

  // A one-shot, the hubScrollToVoice mold: a thread opened fresh lands on
  // its newest signal and the composer, not on a hail sent an age ago. Every
  // later render leaves the scroll exactly where the reader put it.
  private threadScrollToEnd = false;

  // Elements whose text is a locally-derived clock: the thread rows' state
  // chips and the sent rail's countdown. The 1s ticker refreshes exactly
  // these rather than re-rendering, so a tick can never land between
  // finger-down and finger-up (or inside a keystroke).
  private liveClocks: { readonly el: HTMLElement; readonly text: () => string }[] = [];

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
    contact: ContactWire | null,
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
    this.contact = contact;
    this.updateChip();

    // A2.5: a signal in flight is released by any sky at all — onSendSignal
    // appends and answers with a fresh sky, and a refusal comes back as an
    // `error`, which handleServerError has already caught by now (the
    // pendingTripwireKeys precedent, one slice on).
    this.pendingSignalText = null;

    // A2.5: the panel left the thread view without saying so (the sheet was
    // closed on it, or a route took it elsewhere). Tell the server the
    // thread is shut so it stops assembling a detail nobody reads.
    if (this.view !== "thread" && this.threadStarId !== null) this.leaveThread();

    // A2.5: which thread is open is PER-CONNECTION state with no DO key
    // behind it, so a reconnect comes back with nothing open. If this sky
    // carries no detail for the thread on screen, say which one it is again.
    // Idempotent, and it is also what heals a dropped `openThread`. Guarded
    // on the thread still being in `threads`, so it can never ping-pong
    // against a star the server would answer with null forever.
    if (this.view === "thread" && this.threadStarId !== null) {
      const starId = this.threadStarId;
      const known = (contact?.threads ?? []).some((t) => t.starId === starId);
      if (!known) {
        // The thread vanished from this payload — fall back to the hub the
        // way a vanished study falls back to the list, by swapping the view
        // and NOT by opening the panel: this can land while a ceremony has
        // the sky, and a sheet that opened itself then would be a disaster.
        this.leaveThread();
        this.view = "hub";
        this.renderHub();
        return;
      }
      const detail = contact?.openThread ?? null;
      if (detail === null || detail.starId !== starId) {
        this.socket.send({ type: "openThread", starId });
      }
    }

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

    // A callStudy in flight: released the moment the study's own status
    // leaves open/shelved (the confirming sky — it moved to "called"), or
    // if the study vanished from this payload entirely (defensive).
    if (this.pendingCallStarId !== null) {
      const study = this.studiesByStarId.get(this.pendingCallStarId);
      if (study === undefined || (study.status !== "open" && study.status !== "shelved")) {
        this.pendingCallStarId = null;
      }
    }

    // A2.3: tripwires are free and instant, so any real sky is proof enough
    // that whatever was in flight either landed or was refused (in which
    // case handleServerError already cleared it) — no per-key bookkeeping.
    this.pendingTripwireKeys.clear();

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
    } else if (this.view === "thread") {
      this.renderThread();
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

  openHub(scrollTo?: "voice"): void {
    // Fires first, before renderHub(), so the App's setHubExplainer() (if it
    // calls one) is already in `explainerText` for the very first render.
    this.onHubOpenCb?.();
    this.hubScrollToVoice = scrollTo === "voice";
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
    // A board opened fresh opens with every question folded and no CALL IT
    // confirm armed.
    this.expandedQuestion = null;
    this.callConfirmStarId = null;
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

  /**
   * A2.5: opens one thread. `openThread` goes out FIRST so the detail is
   * already being assembled while this render puts the header up (openReport's
   * requestReport precedent); the confirming sky fills the column in.
   * Always opens clean — a half-written signal never survives a close/reopen,
   * the openLaunch/openBrief rule.
   */
  openThread(starId: string): void {
    this.threadStarId = starId;
    this.composerDraft = "";
    this.composerCaret = null;
    this.composerFocused = false;
    this.pendingSignalText = null;
    this.threadScrollToEnd = true;
    this.socket.send({ type: "openThread", starId });
    this.view = "thread";
    this.focusedStarId = null;
    this.renderThread();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** Shuts the open thread server-side. Pure bookkeeping (the declineProposal
   *  precedent): there is no error code for it and nothing waits on it. */
  private leaveThread(): void {
    if (this.threadStarId === null) return;
    this.threadStarId = null;
    this.composerEls = null;
    this.trackKeyboard(false);
    this.socket.send({ type: "openThread", starId: null });
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
    // spend still waits behind the spend button inside it.
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
    // A2.5: the keyboard inset belongs to a composer that is no longer on
    // screen. The thread itself stays open server-side until the next sky
    // notices the view moved on (update()).
    this.trackKeyboard(false);
  }

  isOpen(): boolean {
    return this.openFlag;
  }

  destroy(): void {
    this.stopTicking();
    this.trackKeyboard(false);
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
      // A2.5: the thread view is NEVER re-rendered by the tick. It holds a
      // live text input, and rebuilding the body under a thumb mid-sentence
      // is the one thing this panel must not do. Only the clocks move.
      else if (this.view === "thread") this.refreshLiveClocks();
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
    // Local accrual clamps at the attention ceiling, mirroring the
    // server's freeComputeAt: attention saturates, it does not bank.
    return Math.min(
      this.budget.cap,
      this.budget.free + this.budget.ratePerYear * elapsedYears,
    );
  }

  /**
   * The allocation line. "UNCOMMITTED", not "banked" — this is compute not
   * yet spent on thinking, not savings (projects.ts § NOT A BANK), and the
   * word has to carry that on its own because it is the only place the
   * player meets the currency. "OF" names the attention ceiling: the pool
   * fills to it and stops, so a full pool reads as full, not as a balance
   * still growing.
   */
  private budgetLineText(): string {
    return `${Math.floor(this.currentFreeCompute())} OF ${Math.floor(this.budget.cap)} COMPUTE UNCOMMITTED · +${this.budget.ratePerYear}/Y`;
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
      // A2.5: THE VOICE's thread rows carry countdowns of their own, and
      // they are refreshed the same way and for the same reason.
      this.refreshLiveClocks();
    } else {
      this.renderHub();
    }
  }

  /** A2.5: every element whose text is locally-derived clock arithmetic —
   *  a thread row's state chip, a sent signal's rail. Elements that have
   *  fallen out of the document are dropped rather than re-rendered: the
   *  render that removed them registered whatever replaced them. */
  private refreshLiveClocks(): void {
    let alive = false;
    for (const c of this.liveClocks) {
      if (!c.el.isConnected) continue;
      c.el.textContent = c.text();
      alive = true;
    }
    if (!alive && this.liveClocks.length > 0) this.liveClocks = [];
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

  /** A2.4: fired when THE VOICE's one row is tapped. Like onInspect, the
   *  panel reports the tap and stages nothing — the ceremony happens out on
   *  the sky, which is the App's business. */
  onVoiceAction(cb: () => void): void {
    this.onVoiceActionCb = cb;
  }

  /** A2.5: fired when a thread the player has never spoken into offers its
   *  one route out — answering an unprompted hail costs the hail ceremony,
   *  and the ceremony happens out on the sky (onVoiceAction's contract, with
   *  a star attached). */
  onHailAction(cb: (starId: string) => void): void {
    this.onHailActionCb = cb;
  }

  /** A2.4: hide the two standing chips while a ceremony is armed. They opt
   *  themselves into pointer-events even though their root does not, so a
   *  ceremony overlay cannot cover them — they have to stand down. */
  setChromeHidden(hidden: boolean): void {
    this.root.classList.toggle("chrome-hidden", hidden);
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
    this.liveClocks = [];

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

    // A2.4: THE VOICE. Its own one-row section, because speaking is not one
    // more thing to start — it is the only irreversible verb in the hub, and
    // it does not belong in a browse list beside "explore the sky". The row
    // stays ink like everything else in this sheet: the cyan exceptions are
    // named in this file's header and this is not one of them.
    const voiceHeader = document.createElement("div");
    voiceHeader.className = "study-section-header holos-caps";
    voiceHeader.textContent = "THE VOICE";
    this.body.append(voiceHeader);
    this.body.append(this.buildVoiceRow());
    // A2.5: one row per thread, under the verb that started them. A thread
    // is not something you START — it already exists — so it sits below
    // SPEAK TO EVERYONE rather than beside it, in the server's own order.
    for (const t of this.contact?.threads ?? []) {
      this.body.append(this.buildThreadRow(t));
    }
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
  }

  /**
   * THE VOICE's one row. A verb while there is nothing going out, and the
   * year the current shout left while there is — a shout occupies the
   * channel for a while (contact.ts's shout window), and the server refuses
   * a second one, so offering the verb anyway would be offering a refusal.
   */
  private buildVoiceRow(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    // The latest shout, if any: repeated broadcasts are legal once the
    // previous window has closed, so it is the newest one that decides.
    let speaking: number | null = null;
    for (const act of this.contact?.outbound ?? []) {
      if (act.kind !== "broadcast") continue;
      if (speaking === null || act.sentYear > speaking) speaking = act.sentYear;
    }
    const live = speaking !== null && nowYear() - speaking < BROADCAST_WINDOW_YEARS;
    btn.className = live
      ? "study-voice-row study-voice-row--inert holos-caps"
      : "study-voice-row holos-caps";
    if (live && speaking !== null) {
      btn.textContent = `SPEAKING SINCE ${formatAbsoluteYear(speaking)}`;
      btn.disabled = true;
    } else {
      btn.textContent = "SPEAK TO EVERYONE";
      btn.addEventListener("click", () => this.onVoiceActionCb?.());
    }
    if (this.hubScrollToVoice) {
      this.hubScrollToVoice = false;
      // One frame later: the body is still being assembled right now.
      requestAnimationFrame(() => btn.scrollIntoView({ block: "center" }));
    }
    return btn;
  }

  /** What this counterpart is called here: the player's own label if they
   *  gave one, else the designation their instruments assigned. A thread can
   *  outlive its source's visibility, so the starId is the last resort. */
  private threadName(starId: string): string {
    const local = this.localNames.get(starId);
    if (local !== undefined && local.length > 0) return local;
    return this.sourcesByStarId.get(starId)?.designation ?? starId;
  }

  /**
   * The state chip, on the row and again in the thread's header.
   *
   * NOTHING HERE CLAIMS WHAT THE WIRE DID NOT SEND. `nextEventYear` is only
   * ever the player's OWN next arrival (protocol.ts's no-leak audit), so the
   * countdown beside IN FLIGHT is their own beam and never a reply. AWAITING
   * says AWAITING and nothing else: there is no branch below that could
   * reach for an answer that has not landed.
   */
  private threadStateText(t: ThreadSummary): string {
    const base = THREAD_STATE_LABEL[t.state];
    if (t.state === "in-flight" && t.nextEventYear !== null) {
      const countdown = formatCountdown(t.nextEventYear);
      if (countdown !== null) return `${base} · ARRIVES IN ${countdown}`;
    }
    if (t.state === "answered") return `${base} ${formatAbsoluteYear(t.lastEventYear)}`;
    return base;
  }

  /** One thread on the hub: what you call them, and where the thread stands.
   *  The tap says which thread is open and switches the view; the detail
   *  arrives on the sky that answers (openThread). */
  private buildThreadRow(t: ThreadSummary): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-thread-row";

    const name = document.createElement("div");
    name.className = "study-thread-name holos-serif";
    name.textContent = this.threadName(t.starId);

    const state = document.createElement("div");
    state.className = "study-thread-state holos-caps study-tabular";
    state.textContent = this.threadStateText(t);
    this.liveClocks.push({ el: state, text: () => this.threadStateText(t) });

    btn.append(name, state);
    btn.addEventListener("click", () => this.openThread(t.starId));
    return btn;
  }

  private buildHubRow(
    label: string,
    sublabel: string,
    active: boolean,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = active ? "study-hub-row" : "study-hub-row study-hub-row--inert";
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
    // put down. A2.3's two other exits join grounded ahead of shelved for
    // the same reason — called and overtaken are both closed, decided
    // outcomes, not a vigil merely paused.
    const grounded = all.filter((s) => s.status === "grounded");
    const called = all.filter((s) => s.status === "called");
    const overtaken = all.filter((s) => s.status === "overtaken");
    const shelved = all.filter((s) => s.status === "shelved");

    for (const s of open) {
      const row = this.buildRow(s, false);
      if (row !== null) this.body.append(row);
    }

    for (const [label, group] of [
      ["GROUNDED", grounded],
      ["CALLED", called],
      ["OVERTAKEN", overtaken],
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

    // A2.3: a called or overtaken card reads the belief FROZEN at the
    // transition, never the live board — the live hypotheses keep accruing
    // light in the background (protocol.ts's whole point of freezing
    // `call`/`overtaking`), and the card would otherwise quietly disagree
    // with the very record it is meant to preserve. Every other status
    // (open, shelved, grounded) still reads the live leader, exactly as it
    // always has.
    const frozen =
      s.status === "called" && s.call !== null
        ? { label: s.call.label, gloss: s.call.gloss, share: s.call.share, ageYears: s.call.lightAgeYears }
        : s.status === "overtaken" && s.overtaking !== null
          ? {
              label: s.overtaking.lead.label,
              gloss: s.overtaking.lead.gloss,
              share: s.overtaking.lead.share,
              ageYears: s.overtaking.lightAgeYears,
            }
          : null;

    // Sized by the LEADING hypothesis rather than the raw signal confidence:
    // a study's blot tightens as its own belief firms, so the list shows
    // progress the same way the focused sheet does. A frozen card sizes off
    // its own frozen share instead, the same rule at the year it stopped.
    const leader = leadingHypothesis(s.hypotheses);
    btn.append(this.sourceSmudge(frozen?.share ?? leader?.share ?? 0));

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
    if (frozen !== null) {
      const label = document.createElement("span");
      label.className = "study-row-class";
      label.textContent = frozen.label;
      const percent = document.createElement("span");
      percent.className = "study-row-conf study-tabular";
      percent.textContent = `${Math.round(clamp01(frozen.share) * 100)}%`;
      beliefLine.append(label, percent);
    } else if (leader !== undefined) {
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

    text.append(idLine, beliefLine);

    // The gloss the label would otherwise need decoding without, exactly as
    // the focused sheet's own hypothesis rows carry it — shown only for the
    // frozen readings, where the card is the one place this belief is told.
    if (frozen !== null) {
      const gloss = document.createElement("div");
      gloss.className = "study-row-gloss";
      gloss.textContent = frozen.gloss;
      text.append(gloss);
    }

    // Overtaken names what it used to be as well as what it reads as now —
    // the card's whole reason for its own section, never shown elsewhere.
    if (s.status === "overtaken" && s.overtaking !== null) {
      const flag = document.createElement("div");
      flag.className = "study-row-overtaken-flag holos-caps";
      flag.textContent = `${CLASS_LABEL[s.overtaking.fromClass]} → ${CLASS_LABEL[s.overtaking.toClass]}`;
      text.append(flag);
    }

    const age = document.createElement("div");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${(frozen?.ageYears ?? source.lightAgeYears).toFixed(1)} Y AGO`;

    text.append(age);
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
    // A2.3: "study-unavailable" (a stale callStudy) and "tripwire-unavailable"
    // both render exactly like every error code above always has — releasing
    // whatever was in flight, no toast, no special-cased text.
    let releasedCall = false;
    if (this.pendingCallStarId !== null) {
      this.pendingCallStarId = null;
      releasedCall = true;
    }
    let releasedTripwire = false;
    if (this.pendingTripwireKeys.size > 0) {
      this.pendingTripwireKeys.clear();
      releasedTripwire = true;
    }
    // A2.5: "signal-rejected", "thread-unavailable" and "freeform-forbidden"
    // all release exactly like every code above always has — no toast, no
    // special-cased text. The one addition is that the words go back in the
    // box: losing what the player wrote would be the second insult.
    let releasedSignal = false;
    if (this.pendingSignalText !== null) {
      this.composerDraft = this.pendingSignalText;
      this.composerCaret = null;
      this.pendingSignalText = null;
      releasedSignal = true;
    }

    if (releasedBegin && this.view === "brief") this.renderBrief();
    if (
      (releasedQuestion || releasedCall || releasedTripwire) &&
      this.view === "focused" &&
      this.focusedStarId !== null
    ) {
      this.renderFocused(this.focusedStarId);
    }
    if (releasedProject && this.view === "project") this.renderProjectDetail();
    if (releasedLaunch && this.view === "launch") this.renderLaunch();
    if (releasedSignal && this.view === "thread") this.renderThread();
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
      // and unfolds; the spend is the button inside the fold, so no tap on
      // the menu can cost compute by itself.
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
      // all — the only change is that the states below now dress the spend
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

        // 3. The terms, stated where the decision is made — the project
        //    sheet's anatomy (cost row, clock row, allocation line), so
        //    the fold says what is spent, when the answer lands, and what
        //    the allocation can bear, before the verb is offered. Where a
        //    landed project has moved a number off its catalog base, the
        //    server's receipt line renders under the row it explains, so
        //    an effective number is never mistaken for an arbitrary one.
        detail.append(this.buildClockRow("COST", `${q.costCompute} COMPUTE`));
        if (q.costProvenance !== null) {
          detail.append(this.buildProvenanceLine(q.costProvenance));
        }
        detail.append(this.buildClockRow("ANSWERS IN", formatClockPair(q.integrationYears)));
        if (q.hasteProvenance !== null) {
          detail.append(this.buildProvenanceLine(q.hasteProvenance));
        }
        detail.append(this.buildBudgetLine());

        // 4. The spend, and only here. The button names the spend itself:
        //    "buy the question" said what the system calls the act, not
        //    what leaves the allocation when you tap it.
        const verbRow = document.createElement("div");
        verbRow.className = "study-verb-row";
        const buyBtn = document.createElement("button");
        buyBtn.type = "button";
        buyBtn.className = "study-verb-btn study-verb-btn--primary";
        buyBtn.textContent = `spend ${q.costCompute} compute`;
        let hint = "";
        if (!buyable) {
          // A grounded study buys nothing (the server refuses it too): the
          // menu still reads, so the player can see what reopening would
          // offer. A shelved study IS buyable — the spend reopens it
          // server-side.
          buyBtn.disabled = true;
          hint = "REOPEN THE STUDY FIRST";
        } else if (isPending) {
          buyBtn.disabled = true;
          buyBtn.textContent = "committing the compute…";
        } else if (affordable) {
          buyBtn.addEventListener("click", () => {
            this.pendingQuestion = { starId, questionId: q.id };
            this.socket.send({ type: "buyQuestion", starId, questionId: q.id });
            this.renderFocused(starId);
          });
        } else {
          // Unaffordable. No hint: the head's meta line carries the
          // shortfall and the allocation line above sits right against the
          // cost row, so saying it a third time in one fold is noise.
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

  // ── Render: the thread (A2.5) ────────────────────────────────────────
  // The sky answers, and the texture is ASTRONOMY, never mail. What arrives
  // is a measured beam: the instrument readout is the header of the message
  // and the prose is what was left of it after the crossing. What leaves is
  // a mote on a rail with your own arithmetic under it — there is no
  // instrument at the far end of a beam you aimed, so there is no receipt,
  // no delivery mark, and nothing that says they are reading.
  //
  // Amber throughout, like the rest of this sheet: everything they sent is
  // old light. The ONE cyan is the sent-signal rail, which is yours and is
  // happening now — the source card's contact row, one surface over.

  private renderThread(): void {
    // Captured BEFORE the body is emptied: removing the textarea drops the
    // focus, and the flag would read false by the time the composer is
    // rebuilt. A wake landing mid-sentence must not close the keyboard.
    const restore = this.composerFocused ? { caret: this.composerCaret } : null;
    this.body.innerHTML = "";
    this.liveClocks = [];
    this.composerEls = null;

    const starId = this.threadStarId;

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      this.leaveThread();
      this.openHub("voice");
    });
    this.body.append(back);

    if (starId === null) {
      // Defensive only: the view cannot be entered without a star.
      this.view = "hub";
      this.renderHub();
      return;
    }

    const source = this.sourcesByStarId.get(starId);
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;

    const header = document.createElement("div");
    header.className = "study-focus-header";
    if (hasLocalName && source !== undefined) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = source.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = this.threadName(starId);
    header.append(nameEl);
    this.body.append(header);

    const detail = this.contact?.openThread ?? null;
    const open = detail !== null && detail.starId === starId ? detail : null;

    // The header's chips. The class chip is THE SOURCE'S OWN classification
    // — what this civilization's instruments make of that light — and never
    // anything about how the counterpart handles being spoken to, which is
    // not on the wire and could not be.
    const chips = document.createElement("div");
    chips.className = "thread-chips";
    if (source !== undefined) {
      chips.append(this.buildThreadChip(`AS OF ${formatArchiveAge(source.lightAgeYears)} Y AGO`));
      chips.append(this.buildThreadChip(CLASS_LABEL[source.signal.classification]));
    }
    if (open !== null) {
      const stateChip = this.buildThreadChip(this.threadStateText(open));
      this.liveClocks.push({ el: stateChip, text: () => this.threadStateText(open) });
      chips.append(stateChip);
    }
    if (chips.childElementCount > 0) this.body.append(chips);

    this.body.append(this.hairline());

    if (open === null) {
      // The detail rides the sky that answers `openThread`; until it lands
      // there is nothing honest to draw.
      const waiting = document.createElement("div");
      waiting.className = "study-board-empty";
      waiting.textContent = "Reading the thread.";
      this.body.append(waiting);
      return;
    }

    if (open.truncated) {
      const cut = document.createElement("div");
      cut.className = "thread-truncated holos-caps";
      cut.textContent = "EARLIER SIGNALS NO LONGER HELD";
      this.body.append(cut);
    }

    // Oldest to newest, in the server's own order (by the year YOU learned
    // of each). The client never sorts.
    for (const s of open.signals) this.body.append(this.buildThreadSignal(s));

    if (open.state === "silent") {
      const line = document.createElement("div");
      line.className = "thread-state-line";
      line.textContent = THREAD_SILENT_LINE;
      this.body.append(line);
    }

    this.body.append(this.buildComposer(open, restore));

    if (this.threadScrollToEnd) {
      this.threadScrollToEnd = false;
      // One frame later: the body is still being assembled right now.
      requestAnimationFrame(() => {
        this.body.scrollTop = this.body.scrollHeight;
      });
    }
  }

  /** A header chip: short, repeated, enclosed — the .tend-badge contract
   *  exactly, which is what earns it --holos-text-xxs. */
  private buildThreadChip(text: string): HTMLDivElement {
    const chip = document.createElement("div");
    chip.className = "tend-badge thread-chip";
    chip.textContent = text;
    return chip;
  }

  /**
   * One signal.
   *
   * RECEIVED: the stamp FIRST, two caps rows of instrument readout, then the
   * payload. Every number the thread shows lives on that stamp and none of
   * it lives in the prose — which is the whole reason the prose can be
   * fact-free and needs no pinned-fact machinery.
   *
   * SENT: a cyan rail with your own arithmetic on it. In flight while the
   * year has not come; LANDED once it has. Never a receipt.
   */
  private buildThreadSignal(s: ThreadSignal): HTMLDivElement {
    const el = document.createElement("div");
    el.className =
      s.from === "you"
        ? "thread-signal thread-signal--sent"
        : "thread-signal thread-signal--received";

    if (s.from === "them") {
      const stamp = s.stamp;
      if (stamp !== null) {
        el.append(
          this.buildStampRow(
            `TRANSIT ${formatGameYears(stamp.transitYears)} · DISTANCE ${stamp.distanceLy.toFixed(1)} ly`,
          ),
          this.buildStampRow(
            `RECEIVED ${stamp.receivedFraction.toFixed(2)} · LOSS ${Math.round(stamp.degradation * 100)}% · ARRIVED ${formatAbsoluteYear(stamp.arrivedYear)}`,
          ),
        );
      }
    } else {
      const rail = document.createElement("div");
      rail.className = "thread-rail holos-caps study-tabular";
      rail.textContent = this.sentRailText(s);
      this.liveClocks.push({ el: rail, text: () => this.sentRailText(s) });
      el.append(rail);
    }

    if (s.body !== null) {
      const payload = document.createElement("div");
      payload.className = "thread-payload";
      // UNTRUSTED PROSE — a player wrote it, or a template composed it.
      // textContent and nothing else, ever: this string never becomes markup
      // (and, server-side, never becomes a generation input either).
      payload.textContent = s.body;
      el.append(payload);
    }

    return el;
  }

  private buildStampRow(text: string): HTMLDivElement {
    const row = document.createElement("div");
    // holos-caps sets --holos-text-xs, the .report-stamp reading: a
    // measurement is a reading, not a one-word classifier, so it stays at
    // the floor for things a player reads rather than below it.
    row.className = "thread-stamp holos-caps study-tabular";
    row.textContent = text;
    return row;
  }

  /** Your own beam, timed by your own clock against a year the server
   *  already sent. There is no state here that came back from them. */
  private sentRailText(s: ThreadSignal): string {
    const kicker = s.kind === "hail" ? "HAIL · " : "";
    const countdown = formatCountdown(s.arrivesYear);
    return countdown === null
      ? `${kicker}LANDED ${formatAbsoluteYear(s.arrivesYear)}`
      : `${kicker}IN FLIGHT · ARRIVES IN ${countdown}`;
  }

  /**
   * The composer, or the reason there is not one.
   *
   * `canSpeak` is false for two different reasons and they read differently.
   * If nothing of yours is in the thread at all, they spoke first: the way
   * to answer is to aim a beam, which is the choice ceremony at its usual
   * price, and that beat is the best one in the stage. If your own signals
   * ARE in the thread, it is simply full, and there is nowhere to route to.
   */
  private buildComposer(
    detail: ThreadDetail,
    restore: { readonly caret: number | null } | null,
  ): HTMLElement {
    if (!detail.canSpeak) return this.buildClosedComposer(detail);

    const wrap = document.createElement("div");
    wrap.className = "thread-composer";

    const input = document.createElement("textarea");
    input.className = "thread-composer-input";
    input.rows = 2;
    input.maxLength = MAX_SIGNAL_LEN;
    // A signal is one paragraph, so the phone's return key sends it.
    input.setAttribute("enterkeyhint", "send");
    input.placeholder = "What you want them to hear.";
    input.value = this.composerDraft;

    const foot = document.createElement("div");
    foot.className = "thread-composer-foot";

    const remaining = document.createElement("div");
    remaining.className = "thread-composer-remaining holos-caps study-tabular";

    const send = document.createElement("button");
    send.type = "button";
    send.className = "thread-send holos-caps";
    send.textContent = "SEND";
    send.addEventListener("click", () => this.sendSignal());

    foot.append(remaining, send);
    wrap.append(input, foot);

    this.composerEls = { input, remaining, send };

    input.addEventListener("input", () => {
      this.composerDraft = input.value;
      this.composerCaret = input.selectionStart;
      this.refreshComposer();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      // An IME is mid-word: Enter is committing a candidate, not sending.
      if (e.isComposing) return;
      // NEWLINE SUPPRESSION. Non-authoritative by design —
      // sanitizeSignalText collapses every whitespace run on the server, so
      // a paste with newlines in it still arrives as one paragraph.
      e.preventDefault();
      this.sendSignal();
    });
    input.addEventListener("focus", () => {
      this.composerFocused = true;
      this.trackKeyboard(true);
    });
    input.addEventListener("blur", () => {
      this.composerFocused = false;
      this.trackKeyboard(false);
    });

    this.refreshComposer();

    if (restore !== null) {
      // One frame later: the body is still being assembled right now (the
      // hubScrollToVoice precedent).
      requestAnimationFrame(() => {
        if (!input.isConnected) return;
        input.focus({ preventScroll: true });
        const caret = restore.caret ?? input.value.length;
        input.setSelectionRange(caret, caret);
      });
    }

    return wrap;
  }

  private buildClosedComposer(detail: ThreadDetail): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "thread-closed";

    const line = document.createElement("div");
    line.className = "thread-closed-line";

    if (detail.signals.some((s) => s.from === "you")) {
      line.textContent = "This thread holds all it can. Nothing further leaves from here.";
      wrap.append(line);
      return wrap;
    }

    line.textContent = "They spoke first. Answering means aiming a beam of your own.";
    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "study-verb-btn study-verb-btn--primary";
    // The beam's own name, as the source card says it one surface over.
    verbBtn.textContent = "AIM A BEAM";
    verbBtn.addEventListener("click", () => {
      const starId = this.threadStarId;
      if (starId === null) return;
      this.leaveThread();
      this.onHailActionCb?.(starId);
    });
    verbRow.append(verbBtn);
    wrap.append(line, verbRow);
    return wrap;
  }

  /** The composer's two live readings, updated per keystroke rather than by
   *  a re-render (refreshHubBudget's reason, with a keyboard up). */
  private refreshComposer(): void {
    const els = this.composerEls;
    if (els === null) return;
    // Code points, not UTF-16 units — MAX_SIGNAL_LEN is counted the same way
    // by the function that will actually judge this text.
    const left = MAX_SIGNAL_LEN - [...els.input.value].length;
    els.remaining.textContent = `${left} LEFT`;
    els.remaining.hidden = left >= SIGNAL_REMAINING_VISIBLE;
    els.send.disabled =
      this.pendingSignalText !== null || sanitizeSignalText(els.input.value) === null;
  }

  private sendSignal(): void {
    const els = this.composerEls;
    const starId = this.threadStarId;
    if (els === null || starId === null || this.pendingSignalText !== null) return;
    // The pre-check is NEVER authoritative: the server runs the same pure
    // function again and answers a refusal with `signal-rejected`. This only
    // keeps a send that could not land from leaving at all.
    const text = sanitizeSignalText(els.input.value);
    if (text === null) return;
    this.pendingSignalText = els.input.value;
    this.composerDraft = "";
    this.composerCaret = null;
    this.socket.send({ type: "sendSignal", starId, text });
    // The confirming sky carries the act; until it does the box is empty and
    // the pill is inert. No optimistic signal is ever drawn: the thread shows
    // what the server recorded and nothing else.
    els.input.value = "";
    this.refreshComposer();
  }

  /**
   * KEYBOARD OCCLUSION. The sheet is pinned to the bottom of the LAYOUT
   * viewport, which an on-screen keyboard does not shrink; visualViewport is
   * the one that does. While the composer holds focus the sheet's bottom is
   * lifted by however much of it the keyboard is covering, and the moment
   * focus leaves, the inset goes back to nothing and the listeners come off.
   */
  private readonly onViewportChange = (): void => {
    const vv = window.visualViewport;
    if (vv === null) return;
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    this.sheet.style.setProperty("--holos-keyboard-inset", `${Math.round(inset)}px`);
  };

  private trackKeyboard(on: boolean): void {
    const vv = window.visualViewport;
    if (vv === null) return;
    if (on) {
      // addEventListener with the same bound function is idempotent, so a
      // second focus costs nothing.
      vv.addEventListener("resize", this.onViewportChange);
      vv.addEventListener("scroll", this.onViewportChange);
      this.onViewportChange();
    } else {
      vv.removeEventListener("resize", this.onViewportChange);
      vv.removeEventListener("scroll", this.onViewportChange);
      this.sheet.style.removeProperty("--holos-keyboard-inset");
    }
  }

  // ── Render: mission detail ───────────────────────────────────────────

  /** The receipt under a discounted cost/clock row — the server-composed
   *  "DOWN FROM … · GRANTED BY …" line (OpenQuestion.costProvenance /
   *  hasteProvenance). Faint: it explains a number, it is not one to act on. */
  private buildProvenanceLine(text: string): HTMLDivElement {
    const line = document.createElement("div");
    line.className = "study-question-provenance holos-caps";
    line.textContent = text;
    return line;
  }

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

  // ── A2.3: the CALL IT confirm, and tripwires ─────────────────────────

  /** The first tap arms the confirm; the second (this same starId, already
   *  armed) sends `callStudy` and moves into pendingCallStarId instead —
   *  never a hold-to-commit ceremony, just the one extra tap. */
  private onCallItTap(starId: string): void {
    if (this.callConfirmStarId === starId) {
      this.callConfirmStarId = null;
      this.pendingCallStarId = starId;
      this.socket.send({ type: "callStudy", starId });
    } else {
      this.callConfirmStarId = starId;
    }
    this.renderFocused(starId);
  }

  /** Free and instant (design note §5): a tap toggles straight to the
   *  opposite message, no confirm step. "available" and "tripped" both arm
   *  — re-arming a tripped kind is a real request (the server refuses it
   *  only while the condition still holds, "tripwire-unavailable", same
   *  silent release as every other error code). */
  private toggleTripwire(starId: string, kind: TripwireKind, state: "available" | "armed" | "tripped"): void {
    const key = `${starId}:${kind}`;
    if (this.pendingTripwireKeys.has(key)) return;
    this.pendingTripwireKeys.add(key);
    if (state === "armed") {
      this.socket.send({ type: "disarmTripwire", starId, kind });
    } else {
      this.socket.send({ type: "armTripwire", starId, kind });
    }
    this.renderFocused(starId);
  }

  /** One row per tripwire kind, always all three, in wire order. `active`
   *  is false on a closed study — visible, legible, not tappable, the
   *  OPEN QUESTIONS precedent just above it in renderFocused. */
  private buildTripwireRow(
    starId: string,
    tw: { readonly kind: TripwireKind; readonly state: "available" | "armed" | "tripped"; readonly firedYear: number | null },
    active: boolean,
  ): HTMLElement {
    const pending = this.pendingTripwireKeys.has(`${starId}:${tw.kind}`);
    const interactive = active && !pending;

    const row = document.createElement(interactive ? "button" : "div") as HTMLButtonElement | HTMLDivElement;
    if (row instanceof HTMLButtonElement) row.type = "button";
    row.className =
      "study-tripwire-row" + (interactive ? "" : " study-tripwire-row--inert");
    if (interactive) {
      row.addEventListener("click", () => this.toggleTripwire(starId, tw.kind, tw.state));
    }

    const label = document.createElement("div");
    label.className = "study-tripwire-label holos-caps";
    label.textContent = TRIPWIRE_LABEL[tw.kind];

    const badge = document.createElement("div");
    badge.className = `tend-badge study-tripwire-badge study-tripwire-badge--${tw.state}`;
    badge.textContent = pending ? "…" : TRIPWIRE_STATE_LABEL[tw.state];

    row.append(label, badge);
    return row;
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

    // A2.3: the mind's one sentence about a study that has regressed at
    // least once — banked prose from the server (voice.ts), rendered
    // verbatim. Its own quiet line under the bars, a tier dimmer than
    // annotationLine right above it: annotationLine reads the board, this
    // names a cause an instrument cannot, and the two claims stay apart
    // (protocol.ts's StudySnapshot.contestLine comment).
    if (s.contestLine !== null) {
      const contestLine = document.createElement("div");
      contestLine.className = "study-contest-line";
      contestLine.textContent = s.contestLine;
      this.body.append(contestLine);
    }

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
    const closed = isClosedStudyStatus(s.status);
    for (const q of s.openQuestions) {
      const questionRow = this.buildQuestionRow(
        starId,
        q,
        evidenceIds,
        !closed,
        hypothesisLabels,
      );
      if (this.highlightQuestionId !== null && q.id === this.highlightQuestionId) {
        highlightedQuestionEl = questionRow;
      }
      oqSection.append(questionRow);
    }
    this.body.append(oqSection);

    this.body.append(this.hairline());

    // TRIPWIRES — always all three kinds (protocol.ts's tripwires comment),
    // inert on a closed study exactly as OPEN QUESTIONS already is above:
    // visible so a reopen shows what would resume, never tappable.
    const twSection = document.createElement("div");
    twSection.className = "study-tripwires";
    const twHeader = document.createElement("div");
    twHeader.className = "study-section-header holos-caps";
    twHeader.textContent = "TRIPWIRES";
    twSection.append(twHeader);
    for (const tw of s.tripwires) {
      twSection.append(this.buildTripwireRow(starId, tw, !closed));
    }
    this.body.append(twSection);

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
    } else if (s.status === "shelved") {
      // Grounded/called/overtaken and shelved both reopen through openStudy,
      // but they are not the same act: resuming a shelved vigil picks the
      // watch back up, while reopening a closed one is doubting (or
      // outliving) a verdict that was there. The reopen stamps a new
      // openedYear server-side (and clears called/overtaken — studies.ts's
      // openStudy), so whatever closed this study can never close it again
      // — only the next word can.
      verbBtn.textContent = "resume the watch";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openStudy", starId });
      });
    } else {
      verbBtn.textContent = "reopen the study";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openStudy", starId });
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);

    // A2.3: CALL IT — legal from open or shelved (protocol.ts's callStudy
    // comment; a closed study cannot be closed again, "study-unavailable").
    // Two-tap confirm, no hold-to-commit ceremony: the first tap only arms
    // the button, the second actually sends.
    if (s.status === "open" || s.status === "shelved") {
      const callRow = document.createElement("div");
      callRow.className = "study-verb-row";
      const callBtn = document.createElement("button");
      callBtn.type = "button";
      const calling = this.pendingCallStarId === starId;
      const confirming = this.callConfirmStarId === starId;
      if (calling) {
        callBtn.className = "study-verb-btn study-verb-btn--primary";
        callBtn.disabled = true;
        callBtn.textContent = "calling it…";
      } else if (confirming) {
        callBtn.className = "study-verb-btn study-verb-btn--primary study-verb-btn--confirm";
        callBtn.textContent = "tap again to call it";
        callBtn.addEventListener("click", () => this.onCallItTap(starId));
      } else {
        callBtn.className = "study-verb-btn study-verb-btn--primary";
        callBtn.textContent = "call it";
        callBtn.addEventListener("click", () => this.onCallItTap(starId));
      }
      callRow.append(callBtn);
      this.body.append(callRow);
    }

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
