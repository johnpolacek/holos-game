// THE SOURCE CARD — the thin observatory (Act 3, slice A1: read-and-name
// only). A bottom-sheet DOM overlay that opens when the Model reports a
// tapped DetectedSource and closes on null-selection, backdrop tap, or
// swipe-down.
//
// Everything here is framed as aged light: the age chip, the belief line,
// and the light-history strip are all past tense, because that is what
// they are — light that departed the target long ago. The strip is
// PAST-ONLY: its right edge is `asOfYear`, the newest light this cohort
// holds. NOTHING is ever drawn to the right of that edge; there is no
// future here (concepts/03-01 shows future ticks — that is wrong).
//
// Read-and-name, plus two affordance rows: the study verb (A2.1) and the
// mission verb (A2.2, DISPATCH A PROBE) — both fire a starId callback and
// leave the App to decide what happens (open a sheet vs. focus something
// already under way). No contact verbs, no time-scrubbing (later slices).

import {
  MAX_NAME_LEN,
  validateName,
  type StudyStatus,
  type CohortServerMessage,
  type DetectedSource,
  type EmissionEpoch,
  type SignalClass,
} from "@holos/protocol";
import type { CohortSocket } from "./net";

/** In-world display labels for the five v1 signal classes (act3-design.md). */
export const CLASS_LABEL: Readonly<Record<SignalClass, string>> = {
  "infrared-excess": "DARK NODE",
  "transit-shadows": "TRANSIT SHADOWS",
  "directed-beam": "DIRECTED BEAM",
  "broadcast-leakage": "BROADCAST LEAKAGE",
  biosignature: "LIVING WORLD",
};

/** The mission-affordance row's state, as App derives it from `sky.missions`
 *  for the currently open source: "live" (a mission still under way — the
 *  row focuses it), "inactive" (every mission on this star has returned or
 *  gone silent — the row still opens the launch sheet), "none" (nothing
 *  ever dispatched here). */
export type MissionCardState = "none" | "live" | "inactive";

const SWIPE_CLOSE_PX = 56;
const CHART_H = 46; // css px, the light-history strip's height
const CHART_PAD_TOP = 6;
const CHART_PAD_BOTTOM = 4;
const CHART_TICKS = 4; // intervals -> 5 axis labels, earliest..edge

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Chronological copy — the generator writes epochs in order, but nothing
 * here should assume it; the strip's step function requires it sorted. */
function sortEpochs(history: readonly EmissionEpoch[]): EmissionEpoch[] {
  return [...history].sort((a, b) => a.fromYear - b.fromYear);
}

interface AxisTick {
  readonly label: string;
}

/** Evenly spaced PAST-ONLY labels, counting back from the right edge
 * (`asOfYear`, offset 0) to `earliest`. Never a positive offset. */
function axisTicks(earliest: number, asOfYear: number): AxisTick[] {
  const span = Math.max(1, asOfYear - earliest);
  const ticks: AxisTick[] = [];
  for (let i = 0; i <= CHART_TICKS; i++) {
    const year = earliest + (span * i) / CHART_TICKS;
    const offset = Math.round(year - asOfYear);
    ticks.push({ label: offset === 0 ? "0 Y" : `${offset} Y` });
  }
  return ticks;
}

/** An optimistic override of the local name while a nameSource is in flight,
 * or a confirmed revert target. `name: ""` means "showing the affordance". */
interface NameOverride {
  readonly name: string;
}

export class SourceCard {
  private readonly socket: CohortSocket;

  private readonly root: HTMLDivElement;
  private readonly backdrop: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly grabzone: HTMLDivElement;

  private readonly designationEl: HTMLSpanElement;
  private readonly nameArea: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly ageChip: HTMLDivElement;
  private readonly thumb: HTMLDivElement;
  private readonly classEl: HTMLSpanElement;
  private readonly confEl: HTMLSpanElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly axisEl: HTMLDivElement;
  private readonly studyBtn: HTMLButtonElement;
  private readonly missionBtn: HTMLButtonElement;

  private onCloseCb: (() => void) | null = null;
  private onStudyActionCb: ((starId: string) => void) | null = null;
  private onMissionActionCb: ((starId: string) => void) | null = null;

  private source: DetectedSource | null = null;
  private localNames: ReadonlyMap<string, string> = new Map();
  private editing = false;
  private pendingSend = false;
  private nameOverride: NameOverride | null = null;
  private studyStatus: StudyStatus | null = null;
  private missionState: MissionCardState | null = null;
  private explainerEl: HTMLDivElement | null = null;

  private dragStartY: number | null = null;
  private dragDy = 0;
  /** True once a pointerdown lands on the backdrop itself — the guard that
   * separates a real dismissal tap from the opening tap's trailing click. */
  private backdropArmed = false;

  constructor(container: HTMLElement, socket: CohortSocket) {
    this.socket = socket;

    this.root = document.createElement("div");
    this.root.className = "source-card-root";

    this.backdrop = document.createElement("div");
    this.backdrop.className = "source-card-backdrop";
    // The sky tap that OPENS this card ends with a click the browser
    // dispatches after the pointerup — by which time the backdrop is already
    // up and catches it, closing the card inside the same gesture. Only a
    // click whose pointerdown also landed on the backdrop is a dismissal.
    this.backdrop.addEventListener("pointerdown", () => {
      this.backdropArmed = true;
    });
    this.backdrop.addEventListener("click", () => {
      if (!this.backdropArmed) return;
      this.backdropArmed = false;
      this.requestClose();
    });

    this.sheet = document.createElement("div");
    this.sheet.className = "source-card-sheet";

    // The pill is 4px tall; a thumb aiming at it mostly misses. The zone
    // around it is what the swipe actually listens on.
    this.grabzone = document.createElement("div");
    this.grabzone.className = "source-card-grabzone";
    const grabber = document.createElement("div");
    grabber.className = "source-card-grabber";
    this.grabzone.append(grabber);

    const header = document.createElement("div");
    header.className = "source-card-header";
    this.header = header;

    const idLine = document.createElement("div");
    idLine.className = "source-card-idline";

    this.designationEl = document.createElement("span");
    this.designationEl.className = "source-card-designation holos-caps";

    const sep = document.createElement("span");
    sep.className = "source-card-idsep";
    sep.textContent = "|";

    this.nameArea = document.createElement("div");
    this.nameArea.className = "source-card-name-area";

    idLine.append(this.designationEl, sep, this.nameArea);

    this.ageChip = document.createElement("div");
    this.ageChip.className = "source-card-age holos-caps";

    header.append(idLine, this.ageChip);

    const hr = document.createElement("hr");
    hr.className = "holos-hairline source-card-hairline";

    const beliefRow = document.createElement("div");
    beliefRow.className = "source-card-belief-row";

    this.thumb = document.createElement("div");
    this.thumb.className = "source-card-thumb";

    const belief = document.createElement("div");
    belief.className = "source-card-belief";
    this.classEl = document.createElement("span");
    this.classEl.className = "source-card-class holos-caps";
    const beliefSep = document.createElement("span");
    beliefSep.className = "source-card-belief-sep";
    beliefSep.textContent = "·";
    this.confEl = document.createElement("span");
    this.confEl.className = "source-card-confidence";
    belief.append(this.classEl, beliefSep, this.confEl);

    beliefRow.append(this.thumb, belief);

    const chartWrap = document.createElement("div");
    chartWrap.className = "source-card-chart";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "source-card-canvas";
    this.axisEl = document.createElement("div");
    this.axisEl.className = "source-card-axis";
    chartWrap.append(this.canvas, this.axisEl);

    const studyRow = document.createElement("div");
    studyRow.className = "source-card-study-row";
    this.studyBtn = document.createElement("button");
    this.studyBtn.type = "button";
    this.studyBtn.className = "source-card-study-affordance";
    this.studyBtn.textContent = "OPEN A STUDY";
    this.studyBtn.addEventListener("click", () => {
      if (this.source !== null) this.onStudyActionCb?.(this.source.starId);
    });
    studyRow.append(this.studyBtn);

    // Second affordance row, same anatomy, mission-launch verbs instead of
    // the study verb. App decides what a tap means (open the launch sheet
    // vs. focus a live mission's detail) — this card only reports the tap.
    const missionRow = document.createElement("div");
    missionRow.className = "source-card-mission-row";
    this.missionBtn = document.createElement("button");
    this.missionBtn.type = "button";
    this.missionBtn.className = "source-card-mission-affordance";
    this.missionBtn.textContent = "DISPATCH A PROBE";
    this.missionBtn.addEventListener("click", () => {
      if (this.source !== null) this.onMissionActionCb?.(this.source.starId);
    });
    missionRow.append(this.missionBtn);

    this.sheet.append(this.grabzone, header, hr, beliefRow, chartWrap, studyRow, missionRow);
    this.root.append(this.backdrop, this.sheet);
    container.append(this.root);

    this.attachSwipe();
    window.addEventListener("resize", this.onWindowResize);
  }

  /** Fired when the card dismisses itself (backdrop tap / swipe-down) — the
   * owner should clear the Model's selection ring to match. Never fired for
   * a null-selection close (the caller already knows in that case). */
  onClose(cb: () => void): void {
    this.onCloseCb = cb;
  }

  /** Fired when the study-affordance row is tapped, with the open source's
   * starId. The card does not send wire messages itself and does not know
   * what happens next — that is the App's call (open a study vs. focus the
   * existing one). */
  onStudyAction(cb: (starId: string) => void): void {
    this.onStudyActionCb = cb;
  }

  /** Fired when the mission-affordance row is tapped, with the open source's
   *  starId. Same contract as onStudyAction: the card sends no wire message
   *  and decides nothing — that is the App's call (open the launch sheet vs.
   *  focus a live mission's detail). */
  onMissionAction(cb: (starId: string) => void): void {
    this.onMissionActionCb = cb;
  }

  isOpen(): boolean {
    return this.source !== null;
  }

  currentStarId(): string | null {
    return this.source?.starId ?? null;
  }

  open(source: DetectedSource, localNames: ReadonlyMap<string, string>): void {
    this.source = source;
    this.backdropArmed = false;
    this.localNames = localNames;
    this.editing = false;
    this.pendingSend = false;
    this.nameOverride = null;
    this.studyStatus = null;
    this.missionState = null;
    this.setExplainer(null); // a second source never inherits the first's note
    this.renderAll();
    this.renderStudyRow();
    this.renderMissionRow();
    this.root.classList.add("open");
  }

  /** AV1: the one-time age-chip explainer, shown at most once ever (App
   *  decides via takeVoice). Renders right after the age chip, before the
   *  hairline; null removes it. */
  setExplainer(text: string | null): void {
    if (text === null) {
      this.explainerEl?.remove();
      this.explainerEl = null;
      return;
    }
    if (this.explainerEl === null) {
      this.explainerEl = document.createElement("div");
      this.explainerEl.className = "voice-note";
      this.header.append(this.explainerEl);
    }
    this.explainerEl.textContent = text;
  }

  /** The study for the currently open source, or null if none exists yet.
   * The App calls this right after open() (and again on every later sky). */
  setStudyStatus(status: StudyStatus | null): void {
    this.studyStatus = status;
    this.renderStudyRow();
  }

  /** The mission-row state for the currently open source, derived by the
   *  App from `sky.missions`. Called right after open() (and again on every
   *  later sky), mirroring setStudyStatus. */
  setMissionState(state: MissionCardState | null): void {
    this.missionState = state;
    this.renderMissionRow();
  }

  /** A later `sky` for the currently open source: refresh belief/age/chart.
   * Leaves an in-progress name edit untouched. */
  setSource(source: DetectedSource): void {
    if (this.source === null || this.source.starId !== source.starId) return;
    this.source = source;
    this.renderAge();
    this.renderBelief();
    this.renderThumb();
    this.renderChart();
    if (!this.editing) this.renderName();
  }

  /** The shared client-side local-names store changed (a `sky` arrived, or
   * another tab named this source). Same map instance as passed to open(). */
  setLocalNames(localNames: ReadonlyMap<string, string>): void {
    this.localNames = localNames;
    if (this.source !== null && !this.editing) this.renderName();
  }

  close(): void {
    this.root.classList.remove("open");
    this.source = null;
    this.editing = false;
    this.pendingSend = false;
    this.nameOverride = null;
    this.studyStatus = null;
    this.missionState = null;
  }

  /** Route sourceNamed/error while this card is open. `error` lacks a
   * starId on the wire, so a bad-name error is attributed to us only while
   * we have a request in flight (mirrors the ceremony's own pattern). */
  handleServerMessage(message: CohortServerMessage): void {
    if (this.source === null) return;
    if (message.type === "sourceNamed" && message.starId === this.source.starId) {
      this.pendingSend = false;
      this.nameOverride = null; // the shared localNames map is canonical now
      this.editing = false;
      this.renderName();
      return;
    }
    if (message.type === "error" && message.code === "bad-name" && this.pendingSend) {
      this.pendingSend = false;
      this.nameOverride = null;
      this.editing = false;
      this.renderName(); // revert to the prior/canonical name
      this.showHint(message.message);
    }
  }

  destroy(): void {
    window.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private requestClose(): void {
    if (this.source === null) return;
    this.close();
    this.onCloseCb?.();
  }

  private readonly onWindowResize = (): void => {
    if (this.source !== null) this.renderChart();
  };

  // ── Render ──────────────────────────────────────────────────────────

  private renderAll(): void {
    this.renderName();
    this.renderAge();
    this.renderBelief();
    this.renderThumb();
    this.renderChart();
  }

  private renderAge(): void {
    if (this.source === null) return;
    const y = Math.round(this.source.lightAgeYears * 10) / 10;
    this.ageChip.textContent = `AS OF ${y.toFixed(1)} Y AGO`;
  }

  private renderBelief(): void {
    if (this.source === null) return;
    const signal = this.source.signal;
    this.classEl.textContent = CLASS_LABEL[signal.classification];
    this.confEl.textContent = `${Math.round(signal.confidence * 100)}%`;
  }

  private renderThumb(): void {
    // A small warm smudge, brightness tracking confidence — the same idea
    // as the Model's amber source sprite, at DOM scale (concepts/03-01).
    const conf = this.source === null ? 0.5 : clamp01(this.source.signal.confidence);
    const alpha = 0.35 + conf * 0.5;
    this.thumb.style.background =
      `radial-gradient(circle at 50% 50%, rgba(217,154,83,${alpha}) 0%, ` +
      `rgba(217,154,83,${alpha * 0.35}) 45%, transparent 75%)`;
  }

  private renderStudyRow(): void {
    if (this.studyStatus === "open") {
      this.studyBtn.textContent = "STUDY OPEN · VIEW";
      this.studyBtn.className =
        "source-card-study-affordance source-card-study-affordance--active";
    } else if (this.studyStatus === "shelved") {
      this.studyBtn.textContent = "STUDY SHELVED · VIEW";
      this.studyBtn.className =
        "source-card-study-affordance source-card-study-affordance--active";
    } else {
      this.studyBtn.textContent = "OPEN A STUDY";
      this.studyBtn.className = "source-card-study-affordance";
    }
  }

  private renderMissionRow(): void {
    if (this.missionState === "live") {
      this.missionBtn.textContent = "MISSION UNDER WAY · VIEW";
      this.missionBtn.className =
        "source-card-mission-affordance source-card-mission-affordance--active";
    } else if (this.missionState === "inactive") {
      this.missionBtn.textContent = "DISPATCH ANOTHER";
      this.missionBtn.className = "source-card-mission-affordance";
    } else {
      this.missionBtn.textContent = "DISPATCH A PROBE";
      this.missionBtn.className = "source-card-mission-affordance";
    }
  }

  private renderName(): void {
    const source = this.source;
    if (source === null) return;
    this.designationEl.textContent = source.designation;
    this.nameArea.innerHTML = "";

    const override = this.nameOverride;
    const stored = this.localNames.get(source.starId);
    const display = override !== null ? override.name : (stored ?? "");

    if (display.length > 0) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "source-card-name holos-serif";
      btn.textContent = display;
      btn.addEventListener("click", () => this.beginEdit(display));
      this.nameArea.append(btn);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "source-card-name-affordance";
      btn.textContent = "name this source";
      btn.addEventListener("click", () => this.beginEdit(""));
      this.nameArea.append(btn);
    }

    const hint = document.createElement("div");
    hint.className = "source-card-name-hint";
    this.nameArea.append(hint);
  }

  private renderChart(): void {
    const source = this.source;
    if (source === null) return;
    const asOfYear = source.asOfYear;
    const sorted = sortEpochs(source.signal.lightHistory);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || this.canvas.clientWidth || 280);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(CHART_H * dpr);
    this.canvas.style.height = `${CHART_H}px`;

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, CHART_H);

    const first = sorted[0];
    if (first === undefined) {
      // No history reached us yet — still draw the NOW edge and a bare axis.
      this.drawNowEdge(ctx, cssW);
      this.renderAxisLabels(axisTicks(asOfYear - 100, asOfYear));
      return;
    }

    const earliest = first.fromYear;
    const span = Math.max(1e-6, asOfYear - earliest);
    const x = (year: number): number => ((year - earliest) / span) * cssW;

    const maxLevel = Math.max(0.05, ...sorted.map((e) => e.level));
    const baseline = CHART_H - CHART_PAD_BOTTOM;
    const usableH = CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM;
    const y = (level: number): number => baseline - clamp01(level / maxLevel) * usableH;

    // Step function vertices from the earliest epoch out to the right edge
    // (asOfYear) — the newest light this cohort holds. Nothing is ever
    // plotted past that edge.
    const pts: { x: number; y: number }[] = [{ x: 0, y: y(first.level) }];
    let prevLevel = first.level;
    for (const [i, epoch] of sorted.entries()) {
      if (i === 0) continue;
      const stepX = x(epoch.fromYear);
      pts.push({ x: stepX, y: y(prevLevel) });
      pts.push({ x: stepX, y: y(epoch.level) });
      prevLevel = epoch.level;
    }
    pts.push({ x: cssW, y: y(prevLevel) });

    // Soft area fill under the step line.
    ctx.beginPath();
    ctx.moveTo(0, baseline);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(cssW, baseline);
    ctx.closePath();
    ctx.fillStyle = "rgba(217, 154, 83, 0.16)";
    ctx.fill();

    // The step line itself.
    ctx.beginPath();
    const startPt = pts[0];
    if (startPt !== undefined) ctx.moveTo(startPt.x, startPt.y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "rgba(217, 154, 83, 0.85)";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    this.drawNowEdge(ctx, cssW);
    this.renderAxisLabels(axisTicks(earliest, asOfYear));
  }

  /** A hairline marking NOW at the strip's right edge — the newest light
   * held. The invariant made visible: nothing is drawn to its right. */
  private drawNowEdge(ctx: CanvasRenderingContext2D, cssW: number): void {
    ctx.strokeStyle = "rgba(233, 228, 214, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cssW - 0.5, CHART_PAD_TOP);
    ctx.lineTo(cssW - 0.5, CHART_H - CHART_PAD_BOTTOM);
    ctx.stroke();
  }

  private renderAxisLabels(ticks: readonly AxisTick[]): void {
    this.axisEl.innerHTML = "";
    for (const t of ticks) {
      const span = document.createElement("span");
      span.textContent = t.label;
      this.axisEl.append(span);
    }
  }

  // ── Local naming ────────────────────────────────────────────────────

  private beginEdit(current: string): void {
    if (this.source === null) return;
    this.editing = true;
    this.nameArea.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "source-card-name-input";
    input.value = current;
    input.maxLength = MAX_NAME_LEN * 2; // raw typing room; validateName trims/collapses
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "name this source";

    const hint = document.createElement("div");
    hint.className = "source-card-name-hint";

    this.nameArea.append(input, hint);
    input.focus();
    input.select();

    let settled = false;
    const commit = (): void => {
      if (settled) return;
      settled = true;
      this.commitName(input.value, hint);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur(); // triggers commit via the blur listener below
      } else if (e.key === "Escape") {
        settled = true;
        this.editing = false;
        this.renderName();
      }
    });
    input.addEventListener("blur", commit);
  }

  private showHint(text: string): void {
    const hint = this.nameArea.querySelector<HTMLDivElement>(".source-card-name-hint");
    if (hint !== null) {
      hint.textContent = text;
      hint.classList.add("visible");
    }
  }

  private commitName(raw: string, hint: HTMLDivElement): void {
    if (this.source === null) return;
    const starId = this.source.starId;

    if (raw.trim().length === 0) {
      // Clearing the field deletes the local name.
      this.editing = false;
      this.nameOverride = { name: "" };
      this.pendingSend = true;
      this.renderName();
      this.socket.send({ type: "nameSource", starId, name: "" });
      return;
    }

    const clean = validateName(raw);
    if (clean === null) {
      hint.textContent = `Name must be 1-${MAX_NAME_LEN} characters.`;
      hint.classList.add("visible");
      return; // stay in edit mode for a retry
    }

    this.editing = false;
    this.nameOverride = { name: clean };
    this.pendingSend = true;
    this.renderName();
    this.socket.send({ type: "nameSource", starId, name: clean });
  }

  // ── Swipe-down to close ─────────────────────────────────────────────

  private attachSwipe(): void {
    this.grabzone.addEventListener("pointerdown", this.onDragStart);
    this.grabzone.addEventListener("pointermove", this.onDragMove);
    this.grabzone.addEventListener("pointerup", this.onDragEnd);
    this.grabzone.addEventListener("pointercancel", this.onDragEnd);
  }

  private readonly onDragStart = (e: PointerEvent): void => {
    if (!e.isPrimary || this.dragStartY !== null) return;
    this.grabzone.setPointerCapture(e.pointerId);
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
    if (dy > SWIPE_CLOSE_PX) this.requestClose();
  };
}
