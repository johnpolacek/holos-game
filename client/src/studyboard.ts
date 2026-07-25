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
//     INSTRUMENT ALLOCATION strip is A2.2 entirely and does not appear here.
//
// Register: observatory deadpan, wit 0, no exclamation marks. Soft past
// tense for remote facts — every one wears its light-age. NEVER cyan here;
// cyan is HOME-only, this surface is all amber/ink.

import type {
  StudySnapshot,
  DetectedSource,
  Hypothesis,
  HypothesisId,
} from "@holos/protocol";
import type { CohortSocket } from "./net";
import { CLASS_LABEL } from "./sourcecard";

const SWIPE_CLOSE_PX = 56;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
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

  private readonly root: HTMLDivElement;
  private readonly chip: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly grabber: HTMLDivElement;
  private readonly body: HTMLDivElement;

  private studiesByStarId = new Map<string, StudySnapshot>();
  private sourcesByStarId = new Map<string, DetectedSource>();
  private localNames: ReadonlyMap<string, string> = new Map();

  private openFlag = false;
  private view: "hub" | "list" | "focused" | "picker" | "explore" = "list";
  private focusedStarId: string | null = null;
  private openStudyCount = 0;

  private onInspectCb: ((starId: string) => void) | null = null;

  private dragStartY: number | null = null;
  private dragDy = 0;

  constructor(container: HTMLElement, socket: CohortSocket) {
    this.socket = socket;

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
    const topbar = document.createElement("div");
    topbar.className = "study-board-topbar";

    this.grabber = document.createElement("div");
    this.grabber.className = "study-board-grabber";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "study-board-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.close());

    topbar.append(this.grabber, closeBtn);

    this.body = document.createElement("div");
    this.body.className = "study-board-body";

    this.sheet.append(topbar, this.body);
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
  ): void {
    this.studiesByStarId = new Map(studies.map((s) => [s.starId, s] as const));
    this.sourcesByStarId = new Map(sources.map((s) => [s.starId, s] as const));
    this.localNames = localNames;
    this.updateChip();

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
    } else if (this.view === "hub") {
      this.renderHub();
    } else if (this.view === "explore") {
      this.renderExplore();
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
  }

  openHub(): void {
    this.view = "hub";
    this.focusedStarId = null;
    this.renderHub();
    this.openFlag = true;
    this.root.classList.add("open");
  }

  openPicker(): void {
    this.view = "picker";
    this.focusedStarId = null;
    this.renderPicker();
    this.openFlag = true;
    this.root.classList.add("open");
  }

  focusStudy(starId: string): void {
    this.view = "focused";
    this.focusedStarId = starId;
    this.renderFocused(starId);
    this.openFlag = true;
    this.root.classList.add("open");
  }

  close(): void {
    this.openFlag = false;
    this.root.classList.remove("open");
  }

  isOpen(): boolean {
    return this.openFlag;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    this.root.remove();
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
      this.buildHubRow("Start a project", "Arrives with Act 2.", false, () => {
        /* inert */
      }),
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

  private buildExploreRow(source: DetectedSource): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-picker-row";
    btn.addEventListener("click", () => {
      this.onInspectCb?.(source.starId);
      this.close();
    });

    const top = document.createElement("div");
    top.className = "study-row-top";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    top.append(desig);

    const localName = this.localNames.get(source.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      top.append(nm);
    }

    const bottom = document.createElement("div");
    bottom.className = "study-row-bottom";

    const belief = document.createElement("span");
    belief.className = "study-row-hyp";
    belief.textContent = `${CLASS_LABEL[source.signal.classification]} · ${Math.round(source.signal.confidence * 100)}%`;

    const age = document.createElement("span");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    bottom.append(belief, age);
    btn.append(top, bottom);

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

    const top = document.createElement("div");
    top.className = "study-row-top";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    top.append(desig);

    const localName = this.localNames.get(s.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      top.append(nm);
    }

    const bottom = document.createElement("div");
    bottom.className = "study-row-bottom";

    const hyp = document.createElement("span");
    hyp.className = "study-row-hyp";
    const leader = leadingHypothesis(s.hypotheses);
    if (leader !== undefined) {
      const pcts = hypothesisPercentages(s.hypotheses);
      const pct = pcts.get(leader.id) ?? Math.round(leader.share * 100);
      const label = document.createElement("span");
      label.textContent = leader.label;
      const percent = document.createElement("span");
      percent.className = "study-tabular";
      percent.textContent = `${pct}%`;
      hyp.append(label, percent);
    }

    const age = document.createElement("span");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    bottom.append(hyp, age);
    btn.append(top, bottom);
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
    subtitle.textContent = "Sources your instruments have found. Tap one to begin.";
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-picker-row";
    btn.addEventListener("click", () => {
      this.socket.send({ type: "openStudy", starId: source.starId });
    });

    const top = document.createElement("div");
    top.className = "study-row-top";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    top.append(desig);

    const localName = this.localNames.get(source.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      top.append(nm);
    }

    const bottom = document.createElement("div");
    bottom.className = "study-row-bottom";

    const belief = document.createElement("span");
    belief.className = "study-row-hyp";
    belief.textContent = `${CLASS_LABEL[source.signal.classification]} · ${Math.round(source.signal.confidence * 100)}%`;

    const age = document.createElement("span");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    bottom.append(belief, age);
    btn.append(top, bottom);
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
    const desig = document.createElement("div");
    desig.className = "study-focus-designation holos-caps";
    desig.textContent = source.designation;
    const localName = this.localNames.get(starId);
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent =
      localName !== undefined && localName.length > 0 ? localName : source.designation;
    const ageChip = document.createElement("div");
    ageChip.className = "study-focus-age holos-caps";
    ageChip.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;
    header.append(desig, nameEl, ageChip);
    this.body.append(header);

    this.body.append(this.hairline());

    // CURRENT HYPOTHESES
    const hypSection = document.createElement("div");
    hypSection.className = "study-section";
    const hypHeader = document.createElement("div");
    hypHeader.className = "study-section-header holos-caps";
    hypHeader.textContent = "CURRENT HYPOTHESES";
    hypSection.append(hypHeader);

    const pcts = hypothesisPercentages(s.hypotheses);
    const maxShare = s.hypotheses.reduce((m, h) => Math.max(m, h.share), 0);
    for (const h of s.hypotheses) {
      const isLeading = h.share === maxShare;
      const row = document.createElement("div");
      row.className = "study-hyp-row";

      const label = document.createElement("span");
      label.className = "study-hyp-label holos-caps";
      label.textContent = h.label;

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

      row.append(label, track, pct);
      hypSection.append(row);
    }
    this.body.append(hypSection);

    const annotation = document.createElement("div");
    annotation.className = "study-annotation";
    annotation.textContent = s.annotationLine;
    this.body.append(annotation);

    this.body.append(this.hairline());

    // LIGHT ARCHIVE
    const archiveSection = document.createElement("div");
    archiveSection.className = "study-section";
    const archiveHeader = document.createElement("div");
    archiveHeader.className = "study-section-header holos-caps";
    archiveHeader.textContent = "LIGHT ARCHIVE";
    archiveSection.append(archiveHeader);

    if (s.evidence.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-archive-empty";
      empty.textContent = "No light in the record yet.";
      archiveSection.append(empty);
    } else {
      const labelById = new Map(s.hypotheses.map((h) => [h.id, h.label] as const));
      const sorted = [...s.evidence].sort((a, b) => b.asOfYear - a.asOfYear);
      for (const ev of sorted) {
        const row = document.createElement("div");
        row.className = "study-archive-row";

        const age = document.createElement("span");
        age.className = "study-archive-age holos-caps";
        age.textContent = `${ev.lightAgeYears.toFixed(1)} Y AGO`;

        const text = document.createElement("span");
        text.className = "study-archive-text";
        text.textContent = ev.annotation;

        row.append(age, text);

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

    // OPEN QUESTIONS — A2.1 ships the layout only; the snapshot's
    // openQuestions is always [] this slice, so this container stays empty
    // (no header, no rows). A2.2 fills it in.
    const oqSection = document.createElement("div");
    oqSection.className = "study-open-questions";
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
    this.grabber.addEventListener("pointerdown", this.onDragStart);
    this.grabber.addEventListener("pointermove", this.onDragMove);
    this.grabber.addEventListener("pointerup", this.onDragEnd);
    this.grabber.addEventListener("pointercancel", this.onDragEnd);
  }

  private readonly onDragStart = (e: PointerEvent): void => {
    this.grabber.setPointerCapture(e.pointerId);
    this.dragStartY = e.clientY;
    this.dragDy = 0;
  };

  private readonly onDragMove = (e: PointerEvent): void => {
    if (this.dragStartY === null) return;
    this.dragDy = e.clientY - this.dragStartY;
    if (this.dragDy > 0) {
      this.sheet.style.transform = `translateY(${this.dragDy}px)`;
    }
  };

  private readonly onDragEnd = (): void => {
    this.sheet.style.transform = "";
    const dy = this.dragDy;
    this.dragStartY = null;
    this.dragDy = 0;
    if (dy > SWIPE_CLOSE_PX) this.close();
  };
}
