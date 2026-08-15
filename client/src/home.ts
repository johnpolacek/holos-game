// THE HYBRID HOME SHELL (S0.2) — the HUD band above the map and the five-tab
// bottom rail. Chrome only: no game logic, no socket, no state beyond what the
// caller hands in through the setters below.
// The Model stays the centerpiece underneath this — see style.css's "hybrid
// home shell" block for the z-index/stacking contract (above the map and any
// open board page, below the voice beat / contact ceremony / reclaim / intro
// overlays).
//
// Three fixed, safe-area-aware siblings, appended directly to the App's own
// root the way .model-root / .source-card-root / .study-board-root are:
//   - .home-hud    — the civ's name beside the cyan mark, and the standing
//                    lines (designation, the ticking year), all text the
//                    CALLER formats. The compute meter lives in the band too:
//                    a thin bar + tiny label (setCompute).
//   - .home-note   — the what-this-means note the band's readouts toggle
//                    (HUD_NOTE below), pinned just under the band; hidden
//                    until a readout is tapped.
//   - .home-rail   — Report · Sky · Work · Family · Mind, five equal tabs.
//                    onTab fires on every tap, including the active tab's
//                    own — the caller decides what a re-tap means.
//
// Between the two sat the counsel strip (S0.3): one argued line from the mind
// over a Talk affordance. Cut 2026-08 — the line spoke with nothing at stake
// and read as wallpaper, and Talk was the third way to reach a Mind page the
// rail already opens one tap below it. The sky keeps the height. What the
// mind says on arrival is the open question the next slice answers.
//
// Every string this module renders is either handed in verbatim by the
// caller (the name, the two standing lines, a badge count) or pinned below
// (the five tab labels, and the two what-this-means notes the band's
// readouts toggle). Nothing here formats a number, derives a game state, or
// narrates a game event — that would make this a second source of truth for
// something the server already said once. The notes are not that: fixed
// text about what a readout IS, never a reading of the value it shows
// (sourcecard.ts's CLASS_EXPLAINER drew this line first).

/** The five rail tabs, in the shipped order. */
export type RailTab = "report" | "sky" | "work" | "family" | "mind";

const TAB_ORDER: readonly RailTab[] = ["report", "sky", "work", "family", "mind"];

/** The one place the tab words are spelled — exactly these five, and no
 *  other player-visible string in this module besides them (an aria-label
 *  per button restates the same word, and a badge count is the caller's
 *  own numeral). */
const TAB_LABEL: Readonly<Record<RailTab, string>> = {
  report: "Report",
  sky: "Sky",
  // "Projects" over "Work" (designer call, 2026-08 phone check): the word
  // names what the page actually holds, where Work named a category.
  work: "Projects",
  // "Reach" over "Family" (designer call, 2026-08): the page is the outward
  // register — the survey, voyages, forks, the Ledger, standing orders —
  // and the word names the question it answers. The masthead moved to the
  // Mind page's head in the same revision. The tab id keeps the name it
  // shipped under.
  family: "Reach",
  mind: "Mind",
};

/** The band's two tappable readouts: the standing lines (designation and
 *  ticking year, one note between them — a thumb reads them as one block)
 *  and the compute meter. */
type HudNoteKind = "standing" | "compute";

/** What the two readouts mean, in general — never a reading of the values
 *  they currently show. Observatory register, wit 0 (prose-style.md §2's
 *  frame-explainer family; sourcecard.ts's CLASS_EXPLAINER is the
 *  precedent): fixed text behind a tap on the readout itself, pinned
 *  byte-exact. Deliberately numeral-free — every number a note could quote
 *  is already printed on the readout the tap came from, and a second copy
 *  here would be the drift the module header forbids. */
const HUD_NOTE: Readonly<Record<HudNoteKind, string>> = {
  standing:
    "The designation is our star's catalog name. The year counts from our ascension, and never pauses.",
  compute:
    "Compute pays for questions and projects. The number is what is free to spend; it accrues on its own, up to a ceiling. The bar is how full.",
};

export class Home {
  private readonly root: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private readonly nameEl: HTMLSpanElement;
  private readonly standing: HTMLDivElement;
  private designationEl: HTMLButtonElement | null = null;
  private yearEl: HTMLButtonElement | null = null;
  private readonly meter: HTMLButtonElement;
  private readonly meterLabel: HTMLDivElement;
  private readonly meterFill: HTMLDivElement;
  private readonly rail: HTMLDivElement;
  private readonly tabButtons: Readonly<Record<RailTab, HTMLButtonElement>>;
  private badgeEl: HTMLSpanElement | null = null;
  // The what-this-means note the readouts toggle: one surface, whichever of
  // the two texts the last tap asked for, or hidden. Null = hidden.
  private readonly noteEl: HTMLDivElement;
  private openNote: HudNoteKind | null = null;

  constructor(container: HTMLElement, opts: { readonly onTab: (tab: RailTab) => void }) {
    this.root = document.createElement("div");
    this.root.className = "home-root";

    // ── The HUD band ──────────────────────────────────────────────────────
    this.hud = document.createElement("div");
    this.hud.className = "home-hud";

    const identity = document.createElement("div");
    identity.className = "home-identity";

    const mark = document.createElement("span");
    mark.className = "home-mark";
    identity.append(mark);

    this.nameEl = document.createElement("span");
    this.nameEl.className = "home-name";
    identity.append(this.nameEl);

    this.standing = document.createElement("div");
    this.standing.className = "home-standing";

    this.hud.append(identity, this.standing);

    // ── The compute meter ────────────────────────────────────────────────
    // In the HUD band, under the name (moved from bottom right, 2026-08:
    // down there it shared the counsel strip's zone and overlapped TALK).
    // The strip is gone now, but the band is the better home regardless: it
    // stays up whenever the HUD does. A thin bar and a tiny label, both fed
    // by the caller. A button since the tap-to-explain pass: tapping it
    // toggles the compute note.
    this.meter = document.createElement("button");
    this.meter.type = "button";
    this.meter.className = "home-meter";
    this.meter.addEventListener("click", () => this.toggleNote("compute"));
    this.meterLabel = document.createElement("div");
    this.meterLabel.className = "home-meter-label";
    const track = document.createElement("div");
    track.className = "home-meter-track";
    this.meterFill = document.createElement("div");
    this.meterFill.className = "home-meter-fill";
    track.append(this.meterFill);
    this.meter.append(this.meterLabel, track);

    // ── The rail ──────────────────────────────────────────────────────────
    this.rail = document.createElement("div");
    this.rail.className = "home-rail";
    this.rail.setAttribute("role", "tablist");

    const buttons: Partial<Record<RailTab, HTMLButtonElement>> = {};
    for (const tab of TAB_ORDER) {
      const label = TAB_LABEL[tab];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rail-tab";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", label);
      btn.textContent = label;
      // A tab tap also stands the note down: the tap says "take me
      // somewhere", and a note left pinned over the arriving page would
      // outlive the question it answered.
      btn.addEventListener("click", () => {
        this.setNote(null);
        opts.onTab(tab);
      });
      buttons[tab] = btn;
      this.rail.append(btn);
    }
    this.tabButtons = buttons as Readonly<Record<RailTab, HTMLButtonElement>>;

    // ── The what-this-means note ──────────────────────────────────────────
    // One fixed surface under the band, holding whichever HUD_NOTE the last
    // readout tap asked for. voice-note is the explainer anatomy the source
    // card and the board pages already use; home-note is the floating box
    // (the band is overflow: hidden and fixed-height, so the note cannot
    // live inside it). A tap on the note itself dismisses it.
    this.noteEl = document.createElement("div");
    this.noteEl.className = "voice-note home-note";
    this.noteEl.hidden = true;
    this.noteEl.addEventListener("click", () => this.setNote(null));

    this.hud.append(this.meter);
    this.root.append(this.hud, this.noteEl, this.rail);
    container.append(this.root);
  }

  /** A readout tap: open this note, swap to it from the other, or close it
   *  when it is the one already up. */
  private toggleNote(kind: HudNoteKind): void {
    this.setNote(this.openNote === kind ? null : kind);
  }

  private setNote(kind: HudNoteKind | null): void {
    this.openNote = kind;
    if (kind === null) {
      this.noteEl.hidden = true;
    } else {
      this.noteEl.textContent = HUD_NOTE[kind];
      // Anchored under the readout that asked: standing sits on the band's
      // right margin, the meter on its left. On a phone the note spans the
      // band's own padding and the classes only pick which edge it hugs.
      this.noteEl.classList.toggle("home-note--standing", kind === "standing");
      this.noteEl.classList.toggle("home-note--compute", kind === "compute");
      this.noteEl.hidden = false;
    }
    this.syncNoteToggles();
  }

  /** aria-expanded on every toggle that is currently in the DOM — called
   *  after any toggle is created as well as on every open/close, so a
   *  standing line rebuilt by setStanding cannot come back stale. */
  private syncNoteToggles(): void {
    this.designationEl?.setAttribute("aria-expanded", String(this.openNote === "standing"));
    this.yearEl?.setAttribute("aria-expanded", String(this.openNote === "standing"));
    this.meter.setAttribute("aria-expanded", String(this.openNote === "compute"));
  }

  /** Highlights the active tab only — never fires onTab. */
  setActiveTab(tab: RailTab): void {
    for (const t of TAB_ORDER) {
      this.tabButtons[t].classList.toggle("rail-tab--active", t === tab);
    }
  }

  /** The Report tab's arrival count. Zero removes the badge entirely rather
   *  than showing it empty or at rest on zero. */
  setReportBadge(count: number): void {
    const reportBtn = this.tabButtons.report;
    if (count <= 0) {
      this.badgeEl?.remove();
      this.badgeEl = null;
      return;
    }
    if (this.badgeEl === null) {
      this.badgeEl = document.createElement("span");
      this.badgeEl.className = "rail-badge";
      reportBtn.append(this.badgeEl);
    }
    this.badgeEl.textContent = String(count);
  }

  /** The civ's name beside the cyan mark. Rendered verbatim. */
  setIdentity(name: string): void {
    this.nameEl.textContent = name;
  }

  /** The two right-hand standing lines: the star's designation over the
   *  ticking year. Both pre-formatted by the caller; either one null hides
   *  that line rather than rendering it empty. Each line is a button since
   *  the tap-to-explain pass — both toggle the one standing note, because a
   *  thumb reads the block as one thing. */
  setStanding(designation: string | null, year: string | null): void {
    if (designation === null) {
      this.designationEl?.remove();
      this.designationEl = null;
    } else {
      if (this.designationEl === null) {
        this.designationEl = this.makeStandingToggle("home-standing-designation");
        this.standing.prepend(this.designationEl);
      }
      this.designationEl.textContent = designation;
    }

    if (year === null) {
      this.yearEl?.remove();
      this.yearEl = null;
    } else {
      if (this.yearEl === null) {
        this.yearEl = this.makeStandingToggle("home-standing-year");
        this.standing.append(this.yearEl);
      }
      this.yearEl.textContent = year;
    }

    // Both lines gone means nothing on screen says what the note is about.
    if (this.designationEl === null && this.yearEl === null && this.openNote === "standing") {
      this.setNote(null);
    }
    // After the fields are settled, so a just-built line starts with the
    // right aria-expanded rather than none.
    this.syncNoteToggles();
  }

  private makeStandingToggle(className: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.addEventListener("click", () => this.toggleNote("standing"));
    return btn;
  }

  /** The compute meter: a 0..1 fill and its tiny label, both the caller's.
   *  Null hides the meter whole (no budget to draw is not an empty bar). */
  setCompute(state: { readonly fill: number; readonly label: string } | null): void {
    if (state === null) {
      this.meter.classList.add("home-meter--empty");
      // A hidden meter cannot be re-tapped to dismiss its own note.
      if (this.openNote === "compute") this.setNote(null);
      return;
    }
    this.meter.classList.remove("home-meter--empty");
    this.meterLabel.textContent = state.label;
    const pct = Math.min(1, Math.max(0, state.fill)) * 100;
    this.meterFill.style.width = `${pct}%`;
  }

  /** Ceremonies and the intro take the whole shell off screen. The HUD and
   *  the rail are fixed descendants of `this.root`, so `visibility: hidden`
   *  on the root already reaches them (style.css's home-root--hidden
   *  comment); no extra class is needed here.
   *
   *  setPageOpen and setCardOpen lived here until the counsel strip was cut
   *  (2026-08): both existed only to stand the strip down under an open page
   *  or a raised source card. The HUD stays up over both by design and the
   *  rail is what a page docks against, so neither has anything left to do. */
  setHidden(hidden: boolean): void {
    // The note goes down with the shell rather than merely out of sight:
    // a ceremony ends on a different beat than it began, and a note still
    // pinned up from before it would answer a question no longer asked.
    if (hidden) this.setNote(null);
    this.root.classList.toggle("home-root--hidden", hidden);
  }

  destroy(): void {
    this.root.remove();
  }
}
