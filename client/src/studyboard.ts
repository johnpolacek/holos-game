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
// tense for remote facts — every one wears its light-age. NEVER cyan here;
// cyan is HOME-only, this surface is all amber/ink.

import type {
  StudySnapshot,
  DetectedSource,
  Hypothesis,
  HypothesisId,
  HypothesisMenus,
  ProjectSnapshot,
  ComputeBudget,
} from "@holos/protocol";
import type { CohortSocket } from "./net";
import { CLASS_LABEL } from "./sourcecard";
import { formatClockPair, formatCountdown, nowYear } from "./clock";

const SWIPE_CLOSE_PX = 56;

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

  private readonly root: HTMLDivElement;
  private readonly chip: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly topbar: HTMLDivElement;
  private readonly body: HTMLDivElement;

  private studiesByStarId = new Map<string, StudySnapshot>();
  private sourcesByStarId = new Map<string, DetectedSource>();
  private localNames: ReadonlyMap<string, string> = new Map();
  private projects: readonly ProjectSnapshot[] = [];
  private budget: ComputeBudget = { free: 0, ratePerYear: 0, asOfYear: 0 };

  private openFlag = false;
  private view:
    | "hub"
    | "list"
    | "focused"
    | "picker"
    | "brief"
    | "explore"
    | "projects" = "list";
  private focusedStarId: string | null = null;
  private briefStarId: string | null = null;
  private openStudyCount = 0;

  // The star a `begin the watch` is in flight for. The confirming `sky`
  // carries the new study and hands straight to the focused board — without
  // this the picker row simply vanished in place and the tap read as a
  // dead end. Cleared by any sky that does not confirm, and by any server
  // error, so the verb can never sit stuck mid-flight.
  private pendingBeginStarId: string | null = null;

  // A single 1s ticker, live while the panel is open, so the hub's compute
  // allocation line and any running project's countdown stay current without
  // a new `sky` message — both derive from clock.ts's locally-interpolated
  // nowYear(), never from server polling.
  private tickHandle: number | null = null;

  private onInspectCb: ((starId: string) => void) | null = null;

  private dragStartY: number | null = null;
  private dragDy = 0;

  constructor(
    container: HTMLElement,
    socket: CohortSocket,
    menus: HypothesisMenus | null,
  ) {
    this.socket = socket;
    this.menus = menus;

    this.root = document.createElement("div");
    this.root.className = "study-board-root";

    this.chip = document.createElement("button");
    this.chip.type = "button";
    this.chip.className = "study-chip holos-caps";
    this.chip.textContent = "+ START";
    this.chip.addEventListener("click", () => this.openHub());

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
    this.root.append(this.chip, this.backdrop, this.sheet);
    container.append(this.root);

    this.attachSwipe();
    window.addEventListener("keydown", this.onKeyDown);
    this.renderList();
  }

  update(
    studies: readonly StudySnapshot[],
    sources: readonly DetectedSource[],
    localNames: ReadonlyMap<string, string>,
    projects: readonly ProjectSnapshot[],
    budget: ComputeBudget,
  ): void {
    this.studiesByStarId = new Map(studies.map((s) => [s.starId, s] as const));
    this.sourcesByStarId = new Map(sources.map((s) => [s.starId, s] as const));
    this.localNames = localNames;
    this.projects = projects;
    this.budget = budget;
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
      if (this.view === "hub") this.renderHub();
      else if (this.view === "projects") this.renderProjects();
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
  private buildBudgetLine(): HTMLDivElement {
    const line = document.createElement("div");
    line.className = "study-budget-line holos-caps";
    line.textContent = `${Math.floor(this.currentFreeCompute())} COMPUTE UNCOMMITTED · +${this.budget.ratePerYear}/Y`;
    return line;
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

  // ── Render: chrome ──────────────────────────────────────────────────

  /** The chip's text never changes now (always "+ START"); this still runs
   * on every update() to keep the open-study count fresh for the hub's
   * "Your studies · n" row. */
  private updateChip(): void {
    let n = 0;
    for (const s of this.studiesByStarId.values()) {
      if (s.status === "open") n++;
    }
    this.openStudyCount = n;
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

    this.body.append(this.hairline());

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
      this.buildHubRow("Start a mission", "Arrives with the Docket.", false, () => {
        /* inert */
      }),
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
    const shelved = all.filter((s) => s.status === "shelved");

    for (const s of open) {
      const row = this.buildRow(s, false);
      if (row !== null) this.body.append(row);
    }

    if (shelved.length > 0) {
      const divider = document.createElement("div");
      divider.className = "study-board-divider holos-caps";
      divider.textContent = "SHELVED";
      this.body.append(divider);
      for (const s of shelved) {
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

  private openBrief(starId: string): void {
    this.view = "brief";
    this.briefStarId = starId;
    this.pendingBeginStarId = null;
    this.renderBrief();
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
      this.view = "picker";
      this.briefStarId = null;
      this.renderPicker();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openPicker());
    this.body.append(back);

    // The same identity block the picker row carries, so the source reads as
    // itself across the tap.
    const identity = document.createElement("div");
    identity.className = "study-brief-identity";
    identity.append(this.sourceSmudge(source.signal.confidence));
    identity.append(this.buildSourceIdentity(source));
    this.body.append(identity);

    this.body.append(this.hairline());

    this.body.append(
      this.buildBriefSection(
        "WHAT A STUDY IS",
        "A standing watch on one source. Its light goes on arriving at its own delay, and every arrival is filed here and read against the stories still in play.",
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
        "Nothing to open, nothing to hold, and no limit on how many stand at once. The light arrives whether or not you attend to it, so watching spends only patience. Compute buys questions — the inference that separates one reading from another — and no question has been put to this source.",
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
    verbBtn.className = "study-verb-btn study-verb-btn--primary";
    if (this.pendingBeginStarId === starId) {
      verbBtn.disabled = true;
      verbBtn.textContent = "opening the watch…";
    } else {
      verbBtn.textContent = "begin the watch";
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

  /** Releases a begin that no `sky` will ever confirm (the server answered
   *  with an error instead), so the verb does not sit disabled forever. */
  handleServerError(): void {
    if (this.pendingBeginStarId === null) return;
    this.pendingBeginStarId = null;
    if (this.view === "brief") this.renderBrief();
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
      "What the observatory can build. Each one raises the income for good.";
    this.body.append(subtitle);

    this.body.append(this.buildBudgetLine());

    this.body.append(this.hairline());

    for (const p of this.projects) {
      this.body.append(this.buildProjectRow(p));
    }
  }

  private buildProjectRow(p: ProjectSnapshot): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-project-row";

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
      btn.disabled = true;
      btn.classList.add("study-project-row--disabled");
      const countdown = p.landsYear === null ? null : formatCountdown(p.landsYear);
      meta.textContent = countdown !== null ? `LANDS IN ${countdown}` : "LANDING";
    } else if (p.status === "standing") {
      btn.disabled = true;
      btn.classList.add("study-project-row--disabled");
      meta.textContent = `+${p.addRatePerYear}/Y`;
      flag = document.createElement("span");
      flag.className = "study-project-flag holos-caps";
      flag.textContent = "STANDING";
    } else {
      // "available"
      const free = this.currentFreeCompute();
      const affordable = free >= p.costCompute;
      const base = `${p.costCompute} COMPUTE · ${formatClockPair(p.durationYears)} · +${p.addRatePerYear}/Y`;
      if (affordable) {
        btn.addEventListener("click", () => {
          this.socket.send({ type: "startProject", projectId: p.id });
        });
        meta.textContent = base;
      } else {
        btn.disabled = true;
        btn.classList.add("study-project-row--disabled");
        const shortfall = Math.ceil(p.costCompute - free);
        meta.textContent = `${base} · ${shortfall} SHORT`;
      }
    }

    btn.append(label, line, meta);
    if (flag !== null) btn.append(flag);
    return btn;
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

      const labelById = new Map(s.hypotheses.map((h) => [h.id, h.label] as const));
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
            const lbl = labelById.get(id);
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

    // OPEN QUESTIONS — the snapshot's openQuestions is always [] this slice,
    // so nothing buyable renders here yet. What does render is the state of
    // the watch itself: a study opened a moment ago has no new evidence and
    // bars sitting at their opening prior, which without a word reads as a
    // second dead end. This says what will move it, and what has not been
    // asked. A2.2 fills the rest in.
    const oqSection = document.createElement("div");
    oqSection.className = "study-open-questions";
    const oqHeader = document.createElement("div");
    oqHeader.className = "study-section-header holos-caps";
    oqHeader.textContent = "THE WATCH";
    const oqBody = document.createElement("div");
    oqBody.className = "study-brief-body";
    oqBody.textContent =
      s.status === "open"
        ? "Standing. New light from this source is added to the record above as it arrives, and the readings move with it. No question has been put to the source."
        : "Shelved. Nothing new is being filed, and the readings hold where they were left.";
    oqSection.append(oqHeader, oqBody);
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
      verbBtn.textContent = "resume the watch";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openStudy", starId });
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);
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
