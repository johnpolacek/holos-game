// THE HYBRID HOME SHELL (S0.2) — the HUD band above the map, the reserved
// counsel seam, and the five-tab bottom rail. Chrome only: no game logic, no
// socket, no state beyond what the caller hands in through the setters below.
// The Model stays the centerpiece underneath this — see style.css's "hybrid
// home shell" block for the z-index/stacking contract (above the map and any
// open board page, below the voice beat / contact ceremony / reclaim / intro
// overlays).
//
// Three fixed, safe-area-aware siblings, appended directly to the App's own
// root the way .model-root / .source-card-root / .study-board-root are:
//   - .home-hud    — the civ's name beside the cyan mark, and the standing
//                    lines (designation, the ticking year), all text the
//                    CALLER formats. The compute meter is a fourth sibling,
//                    bottom right: a thin bar + tiny label (setCompute).
//   - .counsel-seam — empty in S0.2. S0.3 fills it; this slice only reserves
//                    the zero-height slot between the map and the rail.
//   - .home-rail   — Report · Sky · Work · Family · Mind, five equal tabs.
//                    onTab fires on every tap, including the active tab's
//                    own — the caller decides what a re-tap means.
//
// Every string this module renders is either handed in verbatim by the
// caller (the name, the two standing lines, a badge count) or one of the
// five pinned tab words below. Nothing here formats a number, derives a
// game state, or narrates — that would make this a second source of truth
// for something the server already said once.

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
  work: "Work",
  family: "Family",
  mind: "Mind",
};

export class Home {
  private readonly root: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private readonly nameEl: HTMLSpanElement;
  private readonly standing: HTMLDivElement;
  private designationEl: HTMLSpanElement | null = null;
  private yearEl: HTMLSpanElement | null = null;
  private readonly meter: HTMLDivElement;
  private readonly meterLabel: HTMLDivElement;
  private readonly meterFill: HTMLDivElement;
  private readonly rail: HTMLDivElement;
  private readonly tabButtons: Readonly<Record<RailTab, HTMLButtonElement>>;
  private badgeEl: HTMLSpanElement | null = null;

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
    // Bottom right, mirroring the Model's scale readout bottom left: a thin
    // bar and a tiny label, both fed by the caller. Hidden while a board
    // page is open (setPageOpen) — floating chrome does not sit on top of a
    // page a player is reading.
    this.meter = document.createElement("div");
    this.meter.className = "home-meter";
    this.meterLabel = document.createElement("div");
    this.meterLabel.className = "home-meter-label";
    const track = document.createElement("div");
    track.className = "home-meter-track";
    this.meterFill = document.createElement("div");
    this.meterFill.className = "home-meter-fill";
    track.append(this.meterFill);
    this.meter.append(this.meterLabel, track);

    // ── The counsel seam (S0.3 fills it; empty here by contract) ─────────
    const seam = document.createElement("div");
    seam.className = "counsel-seam";

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
      btn.addEventListener("click", () => opts.onTab(tab));
      buttons[tab] = btn;
      this.rail.append(btn);
    }
    this.tabButtons = buttons as Readonly<Record<RailTab, HTMLButtonElement>>;

    this.root.append(this.hud, seam, this.meter, this.rail);
    container.append(this.root);
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
   *  that line rather than rendering it empty. */
  setStanding(designation: string | null, year: string | null): void {
    if (designation === null) {
      this.designationEl?.remove();
      this.designationEl = null;
    } else {
      if (this.designationEl === null) {
        this.designationEl = document.createElement("span");
        this.designationEl.className = "home-standing-designation";
        this.standing.prepend(this.designationEl);
      }
      this.designationEl.textContent = designation;
    }

    if (year === null) {
      this.yearEl?.remove();
      this.yearEl = null;
    } else {
      if (this.yearEl === null) {
        this.yearEl = document.createElement("span");
        this.yearEl.className = "home-standing-year";
        this.standing.append(this.yearEl);
      }
      this.yearEl.textContent = year;
    }
  }

  /** The compute meter: a 0..1 fill and its tiny label, both the caller's.
   *  Null hides the meter whole (no budget to draw is not an empty bar). */
  setCompute(state: { readonly fill: number; readonly label: string } | null): void {
    if (state === null) {
      this.meter.classList.add("home-meter--empty");
      return;
    }
    this.meter.classList.remove("home-meter--empty");
    this.meterLabel.textContent = state.label;
    const pct = Math.min(1, Math.max(0, state.fill)) * 100;
    this.meterFill.style.width = `${pct}%`;
  }

  /** A board page covers the map; floating chrome stands down while one is
   *  up so it never sits over the page a player is reading. */
  setPageOpen(open: boolean): void {
    this.meter.classList.toggle("home-meter--paged", open);
  }

  /** Ceremonies and the intro take the whole shell off screen. */
  setHidden(hidden: boolean): void {
    this.root.classList.toggle("home-root--hidden", hidden);
  }

  destroy(): void {
    this.root.remove();
  }
}
