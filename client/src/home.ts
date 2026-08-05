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
//                    lines (year, compute), all text the CALLER formats.
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
  private yearEl: HTMLSpanElement | null = null;
  private computeEl: HTMLSpanElement | null = null;
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

    this.root.append(this.hud, seam, this.rail);
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

  /** The year line and the compute chip. Both pre-formatted by the caller;
   *  either one null hides that line rather than rendering it empty. */
  setStanding(year: string | null, compute: string | null): void {
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

    if (compute === null) {
      this.computeEl?.remove();
      this.computeEl = null;
    } else {
      if (this.computeEl === null) {
        this.computeEl = document.createElement("span");
        this.computeEl.className = "home-standing-compute";
        this.standing.append(this.computeEl);
      }
      this.computeEl.textContent = compute;
    }
  }

  /** Ceremonies and the intro take the whole shell off screen. */
  setHidden(hidden: boolean): void {
    this.root.classList.toggle("home-root--hidden", hidden);
  }

  destroy(): void {
    this.root.remove();
  }
}
