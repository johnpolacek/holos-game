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
// Read-and-name, plus three affordance rows of identical anatomy: the study
// verb (A2.1), the mission verb (A2.2, DISPATCH A PROBE) and the contact verb
// (A2.4, AIM A BEAM) — each fires a starId callback and leaves the App to
// decide what happens (open a sheet, focus something already under way, or
// stage the choice ceremony out on the sky). No time-scrubbing (later slices).
//
// The third row is the only cyan thing on this card, and it earns it: every
// other line here is somebody else's light, arriving late, and that is why
// they are amber and past tense. A beam you aim is yours and is happening
// now. Once one is in flight the row stops being a verb and becomes the date
// it lands on — there is nowhere to go from here, so it does not pretend.

import {
  MAX_NAME_LEN,
  validateName,
  type AccordRail,
  type StudyStatus,
  type CohortServerMessage,
  type DetectedSource,
  type EmissionEpoch,
  type SignalClass,
} from "@holos/protocol";
import { accordHeadline, accordLightLine } from "./accord";
import { formatAbsoluteYear } from "./clock";
import type { CohortSocket } from "./net";

/** In-world display labels for the five v1 signal classes (act3-design.md). */
export const CLASS_LABEL: Readonly<Record<SignalClass, string>> = {
  "infrared-excess": "DARK NODE",
  "transit-shadows": "TRANSIT SHADOWS",
  "directed-beam": "DIRECTED BEAM",
  "broadcast-leakage": "BROADCAST LEAKAGE",
  biosignature: "LIVING WORLD",
};

/** What each signal CLASS means, in general — never a reading of the source
 *  the card has open. Observatory register, wit 0 (prose-style.md §2's
 *  frame-explainer family, the same register as the age-chip's AV1 note):
 *  these are the info toggle's fixed text, keyed off the class the belief
 *  row's label renders, and pinned byte-exact. */
export const CLASS_EXPLAINER: Readonly<Record<SignalClass, string>> = {
  "infrared-excess":
    "Warmth without light: an infrared excess. A brown dwarf, a rogue world, or somebody's heart; watching narrows it, and only watching.",
  "transit-shadows":
    "Occlusions too regular to look natural: something crosses that star on a schedule. Construction under way is one reading; an odd family of worlds is another.",
  "directed-beam":
    "A signal aimed rather than spilled: tight, coherent, and pointed at this system when it left. It was meant to arrive here.",
  "broadcast-leakage":
    "Unaimed shine: the spill of a civilization that has not gone quiet. Young and sloppy is one reading; deliberate shine is another.",
  biosignature:
    "A biosphere's mark on the light: chemistry that does not stay out of balance on its own. Life, seen from outside, as it was when the light left.",
};

/** Inline pen/edit glyph — stroke only, no fill, so it reads in whatever ink
 *  color the button around it is set to (faint idle, dim on hover/active).
 *  ~16px glyph inside a ≥40px tap target; the button's own CSS pads it out. */
const PEN_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>' +
  "</svg>";

/** Inline "i in a hairline circle" glyph, same anatomy and ink as the pen
 *  above. The dot is a minimal fill (there is no hairline way to draw a
 *  round dot of this size); everything else is stroke. */
const INFO_ICON_SVG =
  '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" ' +
  'stroke-width="1.4" aria-hidden="true">' +
  '<circle cx="10" cy="10" r="7.25"/>' +
  '<line x1="10" y1="9" x2="10" y2="13.5" stroke-linecap="round"/>' +
  '<circle cx="10" cy="6.5" r="0.9" fill="currentColor" stroke="none"/>' +
  "</svg>";

/** The mission-affordance row's state, as App derives it from `sky.missions`
 *  for the currently open source: "live" (a mission still under way — the
 *  row focuses it), "inactive" (every mission on this star has returned or
 *  gone silent — the row still opens the launch sheet), "none" (nothing
 *  ever dispatched here). */
export type MissionCardState = "none" | "live" | "inactive";

/** The contact row's state, as App derives it from `sky.contact.outbound`:
 *  the year a beam already aimed at this source lands, or null when none is
 *  in flight and the row is still a verb. */
export type ContactCardState = { readonly arrivesYear: number } | null;

/** A4: the voyage row's state, as App derives it from `sky.voyages` for the
 *  currently open source. "live" (a founding still under way there — the
 *  server refuses a second, so the row is a state and not a verb), "none"
 *  (nothing has ever been sent, or everything sent has closed). */
export type VoyageCardState = "none" | "live";

/** The study row's label for a source that already has a study, one per
 *  status. A closed study is still somewhere to go — the tap focuses it in
 *  the observatory whatever its status — so every one of these ends in the
 *  same VIEW, and the word before it is the one the board's own dividers
 *  file that study under. Only a source with no study at all reads as a
 *  verb. */
const STUDY_ROW_LABEL: Readonly<Record<StudyStatus, string>> = {
  open: "STUDY OPEN · VIEW",
  shelved: "STUDY SHELVED · VIEW",
  grounded: "STUDY GROUNDED · VIEW",
  called: "STUDY CALLED · VIEW",
  overtaken: "STUDY OVERTAKEN · VIEW",
};

const SWIPE_CLOSE_PX = 56;
// The strip's default height was 46 (css px) before the tap-to-expand pass;
// SMALL keeps roughly two thirds of that so the card reads as a glance, and
// EXPANDED is roughly 2.2x SMALL, the room a denser reading needs.
const CHART_H_SMALL = 30;
const CHART_H_EXPANDED = 66;
const CHART_PAD_TOP = 6;
const CHART_PAD_BOTTOM = 4;
const CHART_TICKS = 4; // intervals -> 5 axis labels, earliest..edge, at SMALL
const CHART_TICKS_EXPANDED = CHART_TICKS * 2; // roughly twice as many, EXPANDED
// Faint horizontal gridlines, EXPANDED only, at even fractions of the max
// level the strip is scaled to. Quarters read as a grid without competing
// with the step line's own alpha.
const CHART_GRID_FRACTIONS = [0.25, 0.5, 0.75] as const;

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
 * (`asOfYear`, offset 0) to `earliest`. Never a positive offset. `intervals`
 * defaults to the small-chart density; the expanded chart passes roughly
 * twice as many. */
function axisTicks(
  earliest: number,
  asOfYear: number,
  intervals: number = CHART_TICKS,
): AxisTick[] {
  const span = Math.max(1, asOfYear - earliest);
  const ticks: AxisTick[] = [];
  for (let i = 0; i <= intervals; i++) {
    const year = earliest + (span * i) / intervals;
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
  /** S0.4: a wrapper around everything below the grab pill. It is
   *  `display: contents` and therefore not a box at all in a card with no
   *  study on it — it exists so a card that IS carrying one has a single node
   *  to turn into a scroller and a single node to reset the scroll on. */
  private readonly scroll: HTMLDivElement;
  /** S0.4: where the focused study's detail is rendered while this card is
   *  its surface. Empty and hidden the rest of the time, which is every card
   *  opened on a source the player is only looking at. */
  private readonly detailEl: HTMLDivElement;

  private readonly designationEl: HTMLSpanElement;
  private readonly nameArea: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly ageChip: HTMLDivElement;
  private readonly thumb: HTMLDivElement;
  private readonly classEl: HTMLSpanElement;
  private readonly confEl: HTMLSpanElement;
  private readonly classInfoBtn: HTMLButtonElement;
  /** The class explainer, under the belief row: setExplainer's note anatomy
   *  (`.voice-note`), always in the DOM and toggled by `hidden` (the accord
   *  rail's own idiom), never rebuilt on every tap. */
  private readonly classExplainerEl: HTMLDivElement;
  private readonly chartWrap: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly axisEl: HTMLDivElement;
  private readonly studyBtn: HTMLButtonElement;
  private readonly missionBtn: HTMLButtonElement;
  private readonly contactBtn: HTMLButtonElement;
  private readonly voyageBtn: HTMLButtonElement;
  /** A2.6: the mutual quiet's rail, above the three affordance rows. Empty
   *  and hidden whenever no understanding stands with this source, which is
   *  the common case. */
  private readonly accordEl: HTMLDivElement;

  private onCloseCb: (() => void) | null = null;
  private onStudyActionCb: ((starId: string) => void) | null = null;
  private onMissionActionCb: ((starId: string) => void) | null = null;
  private onContactActionCb: ((starId: string) => void) | null = null;
  private onVoyageActionCb: ((starId: string) => void) | null = null;

  private source: DetectedSource | null = null;
  private localNames: ReadonlyMap<string, string> = new Map();
  private editing = false;
  private pendingSend = false;
  private nameOverride: NameOverride | null = null;
  private studyStatus: StudyStatus | null = null;
  private missionState: MissionCardState | null = null;
  private contactState: ContactCardState = null;
  private voyageState: VoyageCardState | null = null;
  private accord: AccordRail | null = null;
  private explainerEl: HTMLDivElement | null = null;
  /** Whether the class explainer is open for the currently open source. A
   *  re-open (of this card or a different one) always starts closed. */
  private classExplainerOpen = false;
  /** Whether the light-history chart is showing its expanded, denser
   *  rendering. A card re-open always starts small (renderChart's own
   *  contract). */
  private chartExpanded = false;
  /** S0.4: whether this card is currently the focused study's surface. */
  private detailOpen = false;

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

    this.scroll = document.createElement("div");
    this.scroll.className = "source-card-scroll";

    this.detailEl = document.createElement("div");
    this.detailEl.className = "source-card-detail";
    this.detailEl.hidden = true;

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
    this.classInfoBtn = document.createElement("button");
    this.classInfoBtn.type = "button";
    this.classInfoBtn.className = "source-card-icon-btn source-card-class-info";
    this.classInfoBtn.setAttribute("aria-label", "What this class means");
    this.classInfoBtn.innerHTML = INFO_ICON_SVG;
    this.classInfoBtn.addEventListener("click", () => {
      this.classExplainerOpen = !this.classExplainerOpen;
      this.renderClassExplainer();
    });
    belief.append(this.classEl, beliefSep, this.confEl, this.classInfoBtn);

    beliefRow.append(this.thumb, belief);

    this.classExplainerEl = document.createElement("div");
    this.classExplainerEl.className = "voice-note source-card-class-explainer";
    this.classExplainerEl.hidden = true;

    this.chartWrap = document.createElement("div");
    this.chartWrap.className = "source-card-chart";
    this.chartWrap.setAttribute("role", "button");
    this.chartWrap.setAttribute("tabindex", "0");
    this.chartWrap.setAttribute("aria-label", "Expand the light history");
    this.canvas = document.createElement("canvas");
    this.canvas.className = "source-card-canvas";
    this.axisEl = document.createElement("div");
    this.axisEl.className = "source-card-axis";
    this.chartWrap.append(this.canvas, this.axisEl);
    const toggleChart = (): void => {
      this.chartExpanded = !this.chartExpanded;
      this.renderChart();
    };
    this.chartWrap.addEventListener("click", toggleChart);
    this.chartWrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleChart();
      }
    });

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

    // Third affordance row, same anatomy again, the contact verb. The card
    // sends nothing and stages nothing: the ceremony happens out on the sky,
    // and the App is what knows that.
    const contactRow = document.createElement("div");
    contactRow.className = "source-card-contact-row";
    this.contactBtn = document.createElement("button");
    this.contactBtn.type = "button";
    this.contactBtn.className = "source-card-contact-affordance";
    this.contactBtn.textContent = "AIM A BEAM";
    this.contactBtn.addEventListener("click", () => {
      if (this.source !== null) this.onContactActionCb?.(this.source.starId);
    });
    contactRow.append(this.contactBtn);

    // A4: the fourth row, same anatomy again, the founding verb. THE SURVEY
    // covers the empty stars; this card covers the ones that are shining, and
    // aiming a founding at somebody is allowed — it simply does not root, and
    // the sheet's forecast says so before the tap that spends anything. Amber
    // like the study and probe rows: what a ship crosses is somebody else's
    // sky, and the cyan exception on this card is the beam's alone.
    const voyageRow = document.createElement("div");
    voyageRow.className = "source-card-voyage-row";
    this.voyageBtn = document.createElement("button");
    this.voyageBtn.type = "button";
    this.voyageBtn.className = "source-card-voyage-affordance";
    this.voyageBtn.textContent = "SEND A SHIP";
    this.voyageBtn.addEventListener("click", () => {
      if (this.source !== null) this.onVoyageActionCb?.(this.source.starId);
    });
    voyageRow.append(this.voyageBtn);

    // A2.6: the compliance rail. It sits ABOVE the three verbs because it is
    // a state of the relationship rather than something to do about it, and
    // it is the same two lines the thread renders one surface over (accord.ts
    // owns the chrome, so the two cannot drift).
    this.accordEl = document.createElement("div");
    this.accordEl.className = "source-card-accord";
    this.accordEl.hidden = true;

    // The grab pill stays a direct child of the sheet: it is the one thing
    // that must never scroll away from the thumb. Everything else goes
    // through the wrapper, in the order it has always been in, because with
    // no study on the card the wrapper is `display: contents` and this is
    // still the same flat flex column it was before.
    this.scroll.append(
      header,
      hr,
      beliefRow,
      this.classExplainerEl,
      this.chartWrap,
      this.accordEl,
      studyRow,
      missionRow,
      contactRow,
      voyageRow,
      this.detailEl,
    );
    this.sheet.append(this.grabzone, this.scroll);
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

  /** Fired when the contact-affordance row is tapped, with the open source's
   *  starId. Same contract as the two rows above it: the card reports the
   *  tap and nothing else. Never fires while a beam is already in flight to
   *  this source — that variant is a date, not a verb. */
  onContactAction(cb: (starId: string) => void): void {
    this.onContactActionCb = cb;
  }

  /** A4: fired when the founding-affordance row is tapped, with the open
   *  source's starId. Same contract as the three rows above it — the card
   *  reports the tap, and the App opens the sheet. Never fires while a
   *  founding is already under way to this source: that variant is a state,
   *  not a verb. */
  onVoyageAction(cb: (starId: string) => void): void {
    this.onVoyageActionCb = cb;
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
    this.contactState = null;
    this.voyageState = null;
    this.accord = null;
    this.classExplainerOpen = false; // a re-open always starts with the note closed
    this.chartExpanded = false; // a re-open always starts with the chart small
    this.clearDetail(); // a re-open is a card again, whatever it was carrying
    this.setExplainer(null); // a second source never inherits the first's note
    this.renderAll();
    this.renderClassExplainer();
    this.renderStudyRow();
    this.renderMissionRow();
    this.renderContactRow();
    this.renderVoyageRow();
    this.renderAccord();
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

  /** A2.4: the contact-row state for the currently open source, derived by
   *  the App from `sky.contact.outbound`. Called right after open() (and on
   *  every later sky), mirroring setMissionState. */
  setContactState(state: ContactCardState): void {
    this.contactState = state;
    this.renderContactRow();
  }

  /** A4: the founding row's state for the currently open source, derived by
   *  the App from `sky.voyages`. Called right after open() (and on every
   *  later sky), mirroring setContactState. */
  setVoyageState(state: VoyageCardState | null): void {
    this.voyageState = state;
    this.renderVoyageRow();
  }

  /** A2.6: the mutual quiet standing with this source, or null for none. The
   *  App reads it off the thread summary the sky already carries; this card
   *  derives nothing and only renders (setContactState's contract). */
  setAccord(rail: AccordRail | null): void {
    this.accord = rail;
    this.renderAccord();
  }

  /** A later `sky` for the currently open source: refresh belief/age/chart.
   * Leaves an in-progress name edit untouched. */
  setSource(source: DetectedSource): void {
    if (this.source === null || this.source.starId !== source.starId) return;
    this.source = source;
    this.renderAge();
    this.renderBelief();
    this.renderClassExplainer();
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
    this.contactState = null;
    this.voyageState = null;
    this.accord = null;
    this.classExplainerOpen = false;
    this.chartExpanded = false;
    // Every way out of this card runs through here, so the detail collapses
    // on all of them without a single new call site.
    this.clearDetail();
  }

  /** S0.4: hand the focused study this card as its surface, and give it the
   *  element to render into. Opens (or re-points) the card on `source`
   *  first, so the thing under the detail is the thing the detail is about.
   *
   *  IDEMPOTENT BY CONTRACT: the study rebuilds itself once a second and
   *  calls this every time, so the second call and the six-hundredth must
   *  hand back the same element, untouched, and must not re-open the card,
   *  reset the scroll, or restart the slide-up transition. */
  acquireDetail(
    source: DetectedSource,
    localNames: ReadonlyMap<string, string>,
  ): HTMLDivElement {
    if (this.source === null || this.source.starId !== source.starId) {
      this.open(source, localNames);
    }
    if (!this.detailOpen) {
      this.detailOpen = true;
      this.sheet.classList.add("source-card-sheet--detail");
      this.detailEl.hidden = false;
      // A drill-in starts at the top of what it is about. Only on the way
      // in: doing it on every rebuild would drag the page back up under a
      // thumb once a second.
      this.scroll.scrollTop = 0;
    }
    return this.detailEl;
  }

  /** S0.4: the study is done with this card. The card goes with it — what
   *  was on screen was the study, and leaving the source behind it standing
   *  would read as a second dismissal the player did not ask for. */
  releaseDetail(): void {
    if (this.detailOpen) this.close();
  }

  private clearDetail(): void {
    this.detailOpen = false;
    this.sheet.classList.remove("source-card-sheet--detail");
    this.detailEl.replaceChildren();
    this.detailEl.hidden = true;
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

  /** The info toggle's note, in setExplainer's own anatomy (`.voice-note`).
   *  Reads CLASS_EXPLAINER off the class the belief row is currently
   *  showing — never a reading of this particular source. */
  private renderClassExplainer(): void {
    if (this.source === null || !this.classExplainerOpen) {
      this.classExplainerEl.hidden = true;
      return;
    }
    this.classExplainerEl.textContent =
      CLASS_EXPLAINER[this.source.signal.classification];
    this.classExplainerEl.hidden = false;
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
    const status = this.studyStatus;
    if (status === null) {
      this.studyBtn.textContent = "OPEN A STUDY";
      this.studyBtn.className = "source-card-study-affordance";
      return;
    }
    this.studyBtn.textContent = STUDY_ROW_LABEL[status];
    this.studyBtn.className =
      "source-card-study-affordance source-card-study-affordance--active";
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

  private renderContactRow(): void {
    const inFlight = this.contactState;
    if (inFlight !== null) {
      // A beam already aimed here. It states the year it lands and stops
      // being tappable: there is nothing to open, and a verb that leads
      // nowhere is worse than a date that says everything.
      this.contactBtn.textContent =
        `BEAM IN FLIGHT · ARRIVES ${formatAbsoluteYear(inFlight.arrivesYear)}`;
      this.contactBtn.className =
        "source-card-contact-affordance source-card-contact-affordance--active";
      this.contactBtn.disabled = true;
      return;
    }
    this.contactBtn.textContent = "AIM A BEAM";
    this.contactBtn.className = "source-card-contact-affordance";
    this.contactBtn.disabled = false;
  }

  private renderVoyageRow(): void {
    if (this.voyageState === "live") {
      // One founding per star at a time (voyages.ts's cap), so there is
      // nothing to open and nothing to send: the row states what is true and
      // stops being tappable, the beam row's own rule.
      this.voyageBtn.textContent = "A SHIP IS ALREADY GOING THERE";
      this.voyageBtn.className =
        "source-card-voyage-affordance source-card-voyage-affordance--active";
      this.voyageBtn.disabled = true;
      return;
    }
    this.voyageBtn.textContent = "SEND A SHIP";
    this.voyageBtn.className = "source-card-voyage-affordance";
    this.voyageBtn.disabled = false;
  }

  /** The rail: the headline, then what their light has done since, which is
   *  a BELIEF ABOUT THE PAST and says its own age. Nothing here is a verb —
   *  the moves are the thread's, because a move is a signal. */
  private renderAccord(): void {
    this.accordEl.innerHTML = "";
    const rail = this.accord;
    const head = rail === null ? null : accordHeadline(rail);
    if (rail === null || head === null) {
      this.accordEl.hidden = true;
      return;
    }
    this.accordEl.hidden = false;
    const headEl = document.createElement("div");
    headEl.className = "source-card-accord-line holos-caps";
    headEl.textContent = head;
    this.accordEl.append(headEl);
    const light = accordLightLine(rail);
    if (light !== null) {
      const lightEl = document.createElement("div");
      lightEl.className = "source-card-accord-line source-card-accord-line--quiet holos-caps";
      lightEl.textContent = light;
      this.accordEl.append(lightEl);
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
    }

    // The pen: the naming affordance itself, icon-only. With a name already
    // showing it sits quietly beside it for renaming; with none it is the
    // whole affordance — either way it opens the same edit flow.
    const pen = document.createElement("button");
    pen.type = "button";
    pen.className = "source-card-icon-btn source-card-name-pen";
    pen.setAttribute("aria-label", "Name this source");
    pen.innerHTML = PEN_ICON_SVG;
    pen.addEventListener("click", () => this.beginEdit(display));
    this.nameArea.append(pen);

    const hint = document.createElement("div");
    hint.className = "source-card-name-hint";
    this.nameArea.append(hint);
  }

  private renderChart(): void {
    const source = this.source;
    if (source === null) return;
    const asOfYear = source.asOfYear;
    const sorted = sortEpochs(source.signal.lightHistory);

    // Small by default (a glance); tapping the chart expands it in place —
    // same step line and fill, denser ticks, and gridlines the small chart
    // has no room for.
    const chartH = this.chartExpanded ? CHART_H_EXPANDED : CHART_H_SMALL;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || this.canvas.clientWidth || 280);

    // The expanded density is what the width can HOLD, not a constant: a
    // "-5632 Y" label is ~7 mono characters, and nine of them wrap on a
    // phone. One label per ~58px keeps every label on its own line at any
    // width, capped so a desktop card does not become a ruler.
    const tickIntervals = this.chartExpanded
      ? Math.min(CHART_TICKS_EXPANDED, Math.max(CHART_TICKS + 1, Math.floor(cssW / 58) - 1))
      : CHART_TICKS;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(chartH * dpr);
    this.canvas.style.height = `${chartH}px`;

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, chartH);

    const first = sorted[0];
    if (first === undefined) {
      // No history reached us yet — still draw the NOW edge and a bare axis.
      this.drawNowEdge(ctx, cssW, chartH);
      this.renderAxisLabels(axisTicks(asOfYear - 100, asOfYear, tickIntervals));
      return;
    }

    const earliest = first.fromYear;
    const span = Math.max(1e-6, asOfYear - earliest);
    const x = (year: number): number => ((year - earliest) / span) * cssW;

    const maxLevel = Math.max(0.05, ...sorted.map((e) => e.level));
    const baseline = chartH - CHART_PAD_BOTTOM;
    const usableH = chartH - CHART_PAD_TOP - CHART_PAD_BOTTOM;
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

    // Gridlines, expanded only, drawn before the fill and line so both sit
    // on top of them — hairline and very low alpha, at even fractions of the
    // max level the strip is scaled to.
    if (this.chartExpanded) {
      ctx.strokeStyle = "rgba(233, 228, 214, 0.1)";
      ctx.lineWidth = 1;
      for (const frac of CHART_GRID_FRACTIONS) {
        const gy = y(maxLevel * frac);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(cssW, gy);
        ctx.stroke();
      }
    }

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

    this.drawNowEdge(ctx, cssW, chartH);
    this.renderAxisLabels(axisTicks(earliest, asOfYear, tickIntervals));
  }

  /** A hairline marking NOW at the strip's right edge — the newest light
   * held. The invariant made visible: nothing is drawn to its right. */
  private drawNowEdge(ctx: CanvasRenderingContext2D, cssW: number, chartH: number): void {
    ctx.strokeStyle = "rgba(233, 228, 214, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cssW - 0.5, CHART_PAD_TOP);
    ctx.lineTo(cssW - 0.5, chartH - CHART_PAD_BOTTOM);
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
