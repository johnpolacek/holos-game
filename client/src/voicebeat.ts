// THE VOICE BEAT (AV1) — the mind's first words, spoken over the pulled-back
// sky. One line, a light scrim, tap anywhere (or Continue, or Escape) to
// dismiss. Never gates gameplay: no network dependency, no timeout, no state
// to get stuck in — if the voice message never arrived, the beat simply
// never mounts (app.ts's playArrival returns early on an undefined line).
//
// A self-contained overlay, a sibling root appended to the App container —
// deliberately NOT inside .model-overlay (that layer is pointer-events: none
// by contract and carries the HOME/landmark labels). See style.css's
// "Voice beat / inline explainers" block for the z-index/stacking contract.

const FADE_FALLBACK_MS = 400; // just past the 320ms CSS transition

export class VoiceBeat {
  private readonly root: HTMLDivElement;
  private readonly scrim: HTMLDivElement;
  private readonly onDismissCb: () => void;

  private dismissed = false;
  /** True once a pointerdown lands on the root itself — the guard that
   *  separates a real dismissal tap from a trailing click of the gesture
   *  that was already under way when the beat mounted (the source card's
   *  backdrop uses the same idiom). */
  private armed = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.dismiss();
  };

  constructor(container: HTMLElement, text: string, onDismiss: () => void) {
    this.onDismissCb = onDismiss;

    this.root = document.createElement("div");
    this.root.className = "voice-beat-root";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "A word from your civilization");

    this.scrim = document.createElement("div");
    this.scrim.className = "voice-beat-scrim";

    const beat = document.createElement("div");
    beat.className = "voice-beat";

    const line = document.createElement("p");
    line.className = "voice-beat-line";
    line.textContent = text;

    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "voice-beat-dismiss holos-caps";
    dismissBtn.textContent = "Continue";
    dismissBtn.addEventListener("click", () => this.dismiss());

    beat.append(line, dismissBtn);
    this.root.append(this.scrim, beat);
    container.append(this.root);

    // Tap anywhere on the root to dismiss, armed the same way the source
    // card's backdrop is (sourcecard.ts): only a click whose pointerdown
    // also landed on this root counts as a real dismissal.
    this.root.addEventListener("pointerdown", () => {
      this.armed = true;
    });
    this.root.addEventListener("click", () => {
      if (!this.armed) return;
      this.armed = false;
      this.dismiss();
    });

    window.addEventListener("keydown", this.onKeyDown);

    // Commit the closed state in one paint, then add .open on the next frame
    // so the scrim/line fade-in actually transitions instead of landing
    // already-open in the same paint as the mount.
    requestAnimationFrame(() => {
      this.root.classList.add("open");
    });
  }

  private dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    // Drop .open first: pointer-events: none takes effect immediately, so
    // the very next touch reaches the canvas rather than this fading beat.
    this.root.classList.remove("open");
    this.onDismissCb();
    window.removeEventListener("keydown", this.onKeyDown);

    let removed = false;
    const finish = (): void => {
      if (removed) return;
      removed = true;
      this.root.remove();
    };
    this.scrim.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, FADE_FALLBACK_MS);
  }

  /** Removes everything unconditionally — no fade, no onDismiss callback
   *  (the caller already knows: this is teardown, not a player dismissal). */
  destroy(): void {
    this.dismissed = true;
    window.removeEventListener("keydown", this.onKeyDown);
    this.root.remove();
  }
}
