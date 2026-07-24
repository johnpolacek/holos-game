// THE CASE BOARD — the observatory Desk panel (Act 3, slice A2.1: read-only).
// A DOM overlay (not canvas) that lists open/shelved cases and, per case,
// shows the current hypothesis reading derived from delayed light
// (CaseSnapshot; see server/src/protocol.ts). The visual target for the
// focused case is docs/concepts/03-03-case-board.png.
//
// Two adopted build notes, load-bearing for this slice:
//   - The confidence marker renders as a GLOW, never a knob/handle. The
//     hypothesis "bars" are a view of a share, not a control — nothing here
//     is draggable, nothing is an input.
//   - The OPEN QUESTIONS section ships its layout (a reserved, empty
//     container) but renders nothing in A2.1: `CaseSnapshot.openQuestions`
//     is always `[]` this slice, and nothing is buyable yet. The art's
//     INSTRUMENT ALLOCATION strip is A2.2 entirely and does not appear here.
//
// Register: observatory deadpan, wit 0, no exclamation marks. Soft past
// tense for remote facts — every one wears its light-age. NEVER cyan here;
// cyan is HOME-only, this surface is all amber/ink.

import type {
  CaseSnapshot,
  DetectedSource,
  Hypothesis,
  HypothesisId,
} from "@holos/protocol";
import type { CohortSocket } from "./net";

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

export class CaseBoard {
  private readonly socket: CohortSocket;

  private readonly root: HTMLDivElement;
  private readonly chip: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly grabber: HTMLDivElement;
  private readonly body: HTMLDivElement;

  private casesByStarId = new Map<string, CaseSnapshot>();
  private sourcesByStarId = new Map<string, DetectedSource>();
  private localNames: ReadonlyMap<string, string> = new Map();

  private openFlag = false;
  private view: "list" | "focused" = "list";
  private focusedStarId: string | null = null;

  private dragStartY: number | null = null;
  private dragDy = 0;

  constructor(container: HTMLElement, socket: CohortSocket) {
    this.socket = socket;

    this.root = document.createElement("div");
    this.root.className = "case-board-root";

    this.chip = document.createElement("button");
    this.chip.type = "button";
    this.chip.className = "case-chip holos-caps";
    this.chip.textContent = "CASES · 0";
    this.chip.addEventListener("click", () => this.openBoard());

    this.backdrop = document.createElement("div");
    this.backdrop.className = "case-board-backdrop";
    this.backdrop.addEventListener("click", () => this.close());

    this.sheet = document.createElement("div");
    this.sheet.className = "case-board-sheet";

    this.grabber = document.createElement("div");
    this.grabber.className = "case-board-grabber";

    this.body = document.createElement("div");
    this.body.className = "case-board-body";

    this.sheet.append(this.grabber, this.body);
    this.root.append(this.chip, this.backdrop, this.sheet);
    container.append(this.root);

    this.attachSwipe();
    this.renderList();
  }

  update(
    cases: readonly CaseSnapshot[],
    sources: readonly DetectedSource[],
    localNames: ReadonlyMap<string, string>,
  ): void {
    this.casesByStarId = new Map(cases.map((c) => [c.starId, c] as const));
    this.sourcesByStarId = new Map(sources.map((s) => [s.starId, s] as const));
    this.localNames = localNames;
    this.updateChip();

    if (this.view === "focused" && this.focusedStarId !== null) {
      if (this.casesByStarId.has(this.focusedStarId)) {
        this.renderFocused(this.focusedStarId);
      } else {
        // The focused case vanished from this payload — fall back to list.
        this.view = "list";
        this.focusedStarId = null;
        this.renderList();
      }
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

  focusCase(starId: string): void {
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
    this.root.remove();
  }

  // ── Render: chrome ──────────────────────────────────────────────────

  private updateChip(): void {
    let n = 0;
    for (const c of this.casesByStarId.values()) {
      if (c.status === "open") n++;
    }
    this.chip.textContent = `CASES · ${n}`;
  }

  private hairline(): HTMLHRElement {
    const hr = document.createElement("hr");
    hr.className = "holos-hairline case-hairline";
    return hr;
  }

  // ── Render: list view ────────────────────────────────────────────────

  private renderList(): void {
    this.body.innerHTML = "";

    const header = document.createElement("div");
    header.className = "case-board-header holos-caps";
    header.textContent = "THE CASE BOARD";
    this.body.append(header);

    const all = [...this.casesByStarId.values()];
    if (all.length === 0) {
      const empty = document.createElement("div");
      empty.className = "case-board-empty";
      empty.textContent = "No cases open.";
      this.body.append(empty);
      return;
    }

    const open = all.filter((c) => c.status === "open");
    const shelved = all.filter((c) => c.status === "shelved");

    for (const c of open) {
      const row = this.buildRow(c, false);
      if (row !== null) this.body.append(row);
    }

    if (shelved.length > 0) {
      const divider = document.createElement("div");
      divider.className = "case-board-divider holos-caps";
      divider.textContent = "SHELVED";
      this.body.append(divider);
      for (const c of shelved) {
        const row = this.buildRow(c, true);
        if (row !== null) this.body.append(row);
      }
    }
  }

  /** A case with no matching DetectedSource is skipped entirely (defensive:
   * should not happen, but there is nothing sane to render). */
  private buildRow(c: CaseSnapshot, dimmed: boolean): HTMLButtonElement | null {
    const source = this.sourcesByStarId.get(c.starId);
    if (source === undefined) return null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = dimmed ? "case-row case-row--dim" : "case-row";
    btn.addEventListener("click", () => this.focusCase(c.starId));

    const top = document.createElement("div");
    top.className = "case-row-top";
    const desig = document.createElement("span");
    desig.className = "case-row-designation holos-caps";
    desig.textContent = source.designation;
    top.append(desig);

    const localName = this.localNames.get(c.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "case-row-name holos-serif";
      nm.textContent = localName;
      top.append(nm);
    }

    const bottom = document.createElement("div");
    bottom.className = "case-row-bottom";

    const hyp = document.createElement("span");
    hyp.className = "case-row-hyp";
    const leader = leadingHypothesis(c.hypotheses);
    if (leader !== undefined) {
      const pcts = hypothesisPercentages(c.hypotheses);
      const pct = pcts.get(leader.id) ?? Math.round(leader.share * 100);
      const label = document.createElement("span");
      label.textContent = leader.label;
      const percent = document.createElement("span");
      percent.className = "case-tabular";
      percent.textContent = `${pct}%`;
      hyp.append(label, percent);
    }

    const age = document.createElement("span");
    age.className = "case-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    bottom.append(hyp, age);
    btn.append(top, bottom);
    return btn;
  }

  // ── Render: focused view ─────────────────────────────────────────────

  private renderFocused(starId: string): void {
    const c = this.casesByStarId.get(starId);
    const source = c === undefined ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";
    if (c === undefined || source === undefined) return; // defensive; see update()

    const back = document.createElement("button");
    back.type = "button";
    back.className = "case-back holos-caps";
    back.textContent = "‹ CASES";
    back.addEventListener("click", () => this.openBoard());
    this.body.append(back);

    const leader = leadingHypothesis(c.hypotheses);
    const leaderShare = clamp01(leader?.share ?? 0);
    const smudge = document.createElement("div");
    smudge.className = "case-smudge";
    smudge.style.opacity = (0.3 + leaderShare * 0.6).toFixed(2);
    this.body.append(smudge);

    const header = document.createElement("div");
    header.className = "case-focus-header";
    const desig = document.createElement("div");
    desig.className = "case-focus-designation holos-caps";
    desig.textContent = source.designation;
    const localName = this.localNames.get(starId);
    const nameEl = document.createElement("div");
    nameEl.className = "case-focus-name holos-serif";
    nameEl.textContent =
      localName !== undefined && localName.length > 0 ? localName : source.designation;
    const ageChip = document.createElement("div");
    ageChip.className = "case-focus-age holos-caps";
    ageChip.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;
    header.append(desig, nameEl, ageChip);
    this.body.append(header);

    this.body.append(this.hairline());

    // CURRENT HYPOTHESES
    const hypSection = document.createElement("div");
    hypSection.className = "case-section";
    const hypHeader = document.createElement("div");
    hypHeader.className = "case-section-header holos-caps";
    hypHeader.textContent = "CURRENT HYPOTHESES";
    hypSection.append(hypHeader);

    const pcts = hypothesisPercentages(c.hypotheses);
    const maxShare = c.hypotheses.reduce((m, h) => Math.max(m, h.share), 0);
    for (const h of c.hypotheses) {
      const isLeading = h.share === maxShare;
      const row = document.createElement("div");
      row.className = "case-hyp-row";

      const label = document.createElement("span");
      label.className = "case-hyp-label holos-caps";
      label.textContent = h.label;

      const track = document.createElement("div");
      track.className = "case-hyp-track";
      const sharePct = clamp01(h.share) * 100;
      const fill = document.createElement("div");
      fill.className = isLeading ? "case-hyp-fill case-hyp-fill--leading" : "case-hyp-fill";
      fill.style.width = `${sharePct}%`;
      const glow = document.createElement("div");
      glow.className = isLeading ? "case-hyp-glow case-hyp-glow--leading" : "case-hyp-glow";
      glow.style.left = `${sharePct}%`;
      track.append(fill, glow);

      const pct = document.createElement("span");
      pct.className = "case-hyp-pct case-tabular";
      pct.textContent = `${pcts.get(h.id) ?? Math.round(h.share * 100)}%`;

      row.append(label, track, pct);
      hypSection.append(row);
    }
    this.body.append(hypSection);

    const annotation = document.createElement("div");
    annotation.className = "case-annotation";
    annotation.textContent = c.annotationLine;
    this.body.append(annotation);

    this.body.append(this.hairline());

    // LIGHT ARCHIVE
    const archiveSection = document.createElement("div");
    archiveSection.className = "case-section";
    const archiveHeader = document.createElement("div");
    archiveHeader.className = "case-section-header holos-caps";
    archiveHeader.textContent = "LIGHT ARCHIVE";
    archiveSection.append(archiveHeader);

    if (c.evidence.length === 0) {
      const empty = document.createElement("div");
      empty.className = "case-archive-empty";
      empty.textContent = "No light in the record yet.";
      archiveSection.append(empty);
    } else {
      const labelById = new Map(c.hypotheses.map((h) => [h.id, h.label] as const));
      const sorted = [...c.evidence].sort((a, b) => b.asOfYear - a.asOfYear);
      for (const ev of sorted) {
        const row = document.createElement("div");
        row.className = "case-archive-row";

        const age = document.createElement("span");
        age.className = "case-archive-age holos-caps";
        age.textContent = `${ev.lightAgeYears.toFixed(1)} Y AGO`;

        const text = document.createElement("span");
        text.className = "case-archive-text";
        text.textContent = ev.annotation;

        row.append(age, text);

        if (ev.moved.length > 0) {
          const tags = document.createElement("div");
          tags.className = "case-archive-tags";
          for (const id of ev.moved) {
            const lbl = labelById.get(id);
            if (lbl === undefined) continue; // not in this case's menu — skip silently
            const tag = document.createElement("span");
            tag.className = "case-archive-tag holos-caps";
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
    oqSection.className = "case-open-questions";
    this.body.append(oqSection);

    this.body.append(this.hairline());

    // Verb row — reversible, a tap, no confirmation.
    const verbRow = document.createElement("div");
    verbRow.className = "case-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "case-verb-btn";
    if (c.status === "open") {
      verbBtn.textContent = "shelve the case";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "shelveCase", starId });
      });
    } else {
      verbBtn.textContent = "resume the watch";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openCase", starId });
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
