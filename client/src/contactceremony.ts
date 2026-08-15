// THE CHOICE CEREMONY (A2.4) — hail one, speak to everyone, or stay dark,
// staged out on the Model rather than inside a sheet.
//
// The whole slice turns on one rule: A CHOICE THIS IRREVERSIBLE IS MADE BY
// HOLDING, NOT BY TAPPING. So there is exactly one way to commit — a live
// press that survives 2,800 milliseconds of wall clock on the canvas — and
// the frame loop is the only thing that can decide it has. Nothing else in
// this file, and nothing outside it, can reach `completeHold`.
//
// What the hold buys is the flight. The beam's whole crossing is compressed
// into the press: a cyan hairline walks out to the target with the year at
// its head counting up, or a shell walks out through the neighborhood and
// stamps each source with the year your voice will reach it. Then the press
// completes and the preview COLLAPSES INWARD into a bloom at HOME, and what
// is left behind is the real thing, crawling at the clock's rate, which is to
// say motionless for the rest of the session. The collapse is the tell that
// the ceremony was not a cancel: a cancel fades in place and says nothing.
//
// Three rules the rendering obeys and the review checks:
//   • CAMERAS EASE, LIGHT DOES NOT. The arming move smoothsteps; every
//     wavefront is strictly linear in radius.
//   • NOTHING AT THE TARGET REACTS. The amber smudge does not brighten,
//     pulse or condense as the thread lands. What completes at the far end
//     is yours — your ring closing, your arrival stamp.
//   • YOUR VOICE IS CYAN, and everything it touches keeps its own color.
//
// Under resistance the mind's objection is rendered as prose with a coherence
// chip beneath it, the hold takes exactly as long, and the beam is drawn
// dimmer and with a slow brightness tremor. No text anywhere marks the
// forcing. The chip was the whole statement.
//
// A sibling overlay root, the voicebeat.ts precedent — pointer-events: none
// except the STAY DARK word, because the canvas underneath owns the press.

import type { ContactStance, DetectedSource, Vec3Ly } from "@holos/protocol";
import { COLOR_HOME, COLOR_SELECT, type CeremonyInput, type ModelFrame, type Model } from "./model";
import { formatAbsoluteYear, nowYear } from "./clock";
import type { CohortSocket } from "./net";
import { Sprite, type Texture } from "pixi.js";

/** The two acts that write. Stay dark is a choice, not an act (contact.ts). */
export type ContactKind = "hail" | "broadcast";

// ── Timings. Every one of them is wall clock (performance.now), never a
// frame count: a dropped frame costs fidelity and must never cost
// correctness, least of all on the one gesture that commits.

/** How long a press must survive. The number is the ceremony. */
const HOLD_MS = 2800;
/** The share of the hold the wavefront is still travelling for. The rest is
 *  the held breath at the far end — the only stillness in the ceremony. */
const DRAW_FRACTION = 0.86;
/** The commit beat, reused wholesale from BECOME (style.css's holos-bloom). */
const COMMIT_MS = 1100;
/** The inward rush, inside the commit beat. */
const COLLAPSE_MS = 520;
/** The bloom starts after the collapse has already begun to read. */
const BLOOM_DELAY_MS = 240;
/** An early release. Fades in place, says nothing, re-arms. */
const CANCEL_MS = 320;

/** When the aim ring starts drawing itself, and how long it takes. */
const RING_DELAY_MS = 200;
const RING_MS = 500;
/** When the press affordance appears. */
const HINT_MS = 260;
/** Under resistance the press is inert until the objection has finished
 *  writing itself in. The line gets to be read before it can be overruled. */
const OBJECTION_MS = 700;

/** How long an arrival stamp stays after a commit, and its closing fade. */
const STAMP_HOLD_MS = 4000;
const STAMP_FADE_MS = 1200;
/** How long a stamp pushed out of the budget takes to leave. */
const STAMP_DROP_MS = 1500;
/** The budget (storyboard §9). Newest kept; a small phone is the case this
 *  is sized for, so it is the cap everywhere. */
const MAX_STAMPS = 6;
/** Two stamps closer than this on screen are one unreadable stamp — the
 *  landmark-label rule, reused. */
const STAMP_MIN_GAP_PX = 28;
/** How far off its anchor a stamp sits (the landmark-label transform). */
const STAMP_DX = 10;
const STAMP_DY = -8;
/** The leading-edge readout sits above the shell it is reading, not beside
 *  it; its horizontal centering is the stylesheet's (a negative em margin,
 *  since the inline transform owns the other axis). */
const STAMP_EDGE_DY = -20;

/** The crossing glint: your wavefront's marker at a source, not the source
 *  reacting to it. */
const GLINT_MS = 260;
const GLINT_SIZE_MUL = 1.6;

/** The shell's reach: the farthest source, plus a margin, so the sweep
 *  finishes visibly past the last stamp rather than exactly on it. */
const R_MAX_MUL = 1.08;

/** Contested rendering: dimmer, and a slow brightness tremor. Brightness
 *  only — a beam that wobbled in POSITION would be a different claim. */
const CONTESTED_ALPHA = 0.62;
const TREMOR_AMP = 0.12;
const TREMOR_HZ = 3.5;

/** The aim ring's floor, matching the Model's thumb radius so the ring lands
 *  on the same circle a tap would have hit. */
const AIM_RING_MIN_PX = 32;
/** The interior wash a broadcast fills its shell with. */
const WASH_ALPHA = 0.05;
/** The bead at HOME when the press lands. */
const BEAD_PX = 7;
const BEAD_ALPHA = 0.9;

/** The thread's alphas: shaft, the step behind the head, the head itself. */
const THREAD_SHAFT_ALPHA = 0.55;
const THREAD_MID_ALPHA = 0.78;
const THREAD_HEAD_ALPHA = 1;
/** Where the two-stop falloff behind the head sits, in screen pixels. */
const THREAD_FALLOFF_PX = 40;
const THREAD_HEAD_PX = 14;
/** The ring a broadcast draws. */
const SHELL_ALPHA = 0.6;
/** The camera distance the thread is one pixel wide at — the Model's own
 *  resting distance in the parallax volume, so a hairline drawn here is the
 *  same hairline the sky is drawn with. */
const THREAD_WIDTH_REF_LY = 60;
const THREAD_WIDTH_MIN = 0.6;
const THREAD_WIDTH_MAX = 2.2;

/** Under reduced motion the shell steps rather than sweeps. The hold's own
 *  length does not bend — the invariant is the invariant. */
const REDUCED_FPS = 12;

/** One source as the ceremony froze it at arming. Everything drawn during a
 *  ceremony comes from this snapshot, so a `sky` landing mid-hold cannot
 *  move a stamp or add a crossing under the player's thumb. */
interface FrozenSource {
  readonly starId: string;
  readonly pos: Vec3Ly;
  readonly distanceLy: number;
}

interface Snapshot {
  readonly kind: ContactKind;
  readonly stance: ContactStance;
  /** Hail only. */
  readonly targetStarId: string | null;
  readonly targetPos: Vec3Ly | null;
  readonly distanceLy: number;
  /** Broadcast only: everything the shell can cross, nearest first. */
  readonly sources: readonly FrozenSource[];
  readonly rMax: number;
  readonly armedAt: number;
  readonly reducedMotion: boolean;
}

type Phase = "off" | "arming" | "holding" | "cancelling" | "committing" | "settling";

/** A year stamped out on the sky. `anchor` is a star id for a crossing, null
 *  for the running year at a thread's head. */
interface Stamp {
  readonly el: HTMLDivElement;
  readonly anchor: string | null;
  /** The leading-edge readout, which rides the top of a shell rather than
   *  sitting beside a place, and so is offset differently. */
  readonly edge: boolean;
  x: number;
  y: number;
  /** Non-null once it has started leaving, with the duration of that leaving. */
  fadeFrom: number | null;
  fadeMs: number;
}

interface Glint {
  readonly sprite: Sprite;
  readonly born: number;
}

export class ContactCeremony {
  private readonly model: Model;
  private readonly socket: CohortSocket;

  private readonly root: HTMLDivElement;
  private readonly objectionEl: HTMLDivElement;
  private readonly costChip: HTMLDivElement;
  private readonly reasonEl: HTMLDivElement;
  private readonly hintEl: HTMLDivElement;
  private readonly stayDarkBtn: HTMLButtonElement;
  private readonly stampLayer: HTMLDivElement;
  private readonly liveRegion: HTMLDivElement;
  private bloomEl: HTMLDivElement | null = null;

  private snapshot: Snapshot | null = null;
  private phase: Phase = "off";

  private holdStart = 0;
  /** The hold's progress at the moment it stopped, so a cancel or a collapse
   *  can render the geometry it actually reached. */
  private frozenT = 0;
  private commitStart = 0;
  private cancelStart = 0;
  private settleStart = 0;
  /** True between the wire send and the next `sky` (or an error). */
  private commitPending = false;
  /** True once the ceremony has been let go of and is only finishing its
   *  fade. Nothing may re-arm it from here — the keyboard listeners outlive
   *  the canvas press target by design (Escape has to keep working), and
   *  without this a stray key would revive a ceremony with no input. */
  private lettingGo = false;

  private stamps: Stamp[] = [];
  private headStamp: Stamp | null = null;
  private readonly crossed = new Set<string>();

  private bead: Sprite | null = null;
  private wash: Sprite | null = null;
  private glints: Glint[] = [];

  private activeCb: ((active: boolean) => void) | null = null;

  constructor(container: HTMLElement, model: Model, socket: CohortSocket) {
    this.model = model;
    this.socket = socket;

    this.root = document.createElement("div");
    this.root.className = "contact-ceremony-root";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "The choice");

    // The mind's objection, top third, above HOME — placed there because it
    // has to be readable while the thumb is at the bottom of the screen.
    this.objectionEl = document.createElement("div");
    this.objectionEl.className = "contact-objection";
    this.costChip = document.createElement("div");
    this.costChip.className = "contact-cost-chip holos-caps";
    const objectionWrap = document.createElement("div");
    objectionWrap.className = "contact-objection-wrap";
    objectionWrap.append(this.objectionEl, this.costChip);

    // A refusal that came back from the server. The same slot as the
    // objection: both are reasons the act did not simply happen.
    this.reasonEl = document.createElement("div");
    this.reasonEl.className = "contact-reason";
    objectionWrap.append(this.reasonEl);

    this.stampLayer = document.createElement("div");
    this.stampLayer.className = "contact-stamps";

    this.hintEl = document.createElement("div");
    this.hintEl.className = "contact-hint holos-caps";
    this.hintEl.textContent = "PRESS AND HOLD";

    // Not an ember, not a pill, not beside a primary action: one word, said
    // plainly. Staying dark is a choice with the same standing as the other
    // two, and styling it as a cancel would quietly rank it below them.
    this.stayDarkBtn = document.createElement("button");
    this.stayDarkBtn.type = "button";
    this.stayDarkBtn.className = "contact-staydark";
    this.stayDarkBtn.textContent = "STAY DARK";
    this.stayDarkBtn.addEventListener("click", () => this.chooseStayDark());

    const footer = document.createElement("div");
    footer.className = "contact-footer";
    footer.append(this.hintEl, this.stayDarkBtn);

    // Each stamp is announced once as it lands, so the sweep is a sequence of
    // dates on a screen reader rather than a silent light show.
    this.liveRegion = document.createElement("div");
    this.liveRegion.className = "contact-live";
    this.liveRegion.setAttribute("aria-live", "polite");

    this.root.append(objectionWrap, this.stampLayer, footer, this.liveRegion);
    container.append(this.root);
  }

  /** Fired when a ceremony arms and again when it fully lets go — the App
   *  hides the standing sky chrome for the duration. */
  onActive(cb: (active: boolean) => void): void {
    this.activeCb = cb;
  }

  isArmed(): boolean {
    return this.phase !== "off";
  }

  destroy(): void {
    this.teardown();
    this.root.remove();
  }

  // ── Arming ────────────────────────────────────────────────────────────

  /**
   * Aim at one source. `sources` is the live sky, used only to freeze the
   * target's distance; everything rendered afterwards comes from the frozen
   * snapshot.
   */
  armHail(starId: string, stance: ContactStance, sources: readonly DetectedSource[]): void {
    const source = sources.find((s) => s.starId === starId);
    const pos = this.model.starPosition(starId);
    if (source === undefined || pos === null) return;
    this.arm({
      kind: "hail",
      stance,
      targetStarId: starId,
      targetPos: pos,
      distanceLy: source.distanceLy,
      sources: [],
      rMax: source.distanceLy,
      armedAt: performance.now(),
      reducedMotion: prefersReducedMotion(),
    });
  }

  /** Speak to everyone. The shell's reach is the farthest source it can
   *  cross, plus a margin — the neighborhood, as this civ can see it. */
  armBroadcast(stance: ContactStance, sources: readonly DetectedSource[]): void {
    const frozen: FrozenSource[] = [];
    for (const s of sources) {
      const pos = this.model.starPosition(s.starId);
      if (pos === null) continue;
      frozen.push({ starId: s.starId, pos, distanceLy: s.distanceLy });
    }
    frozen.sort((a, b) => a.distanceLy - b.distanceLy);
    const farthest = frozen.length === 0 ? 0 : (frozen[frozen.length - 1]?.distanceLy ?? 0);
    this.arm({
      kind: "broadcast",
      stance,
      targetStarId: null,
      targetPos: null,
      distanceLy: 0,
      sources: frozen,
      rMax: Math.max(1, farthest * R_MAX_MUL),
      armedAt: performance.now(),
      reducedMotion: prefersReducedMotion(),
    });
  }

  private arm(snapshot: Snapshot): void {
    if (this.phase !== "off") this.teardown();
    this.snapshot = snapshot;
    this.phase = "arming";
    this.commitPending = false;
    this.lettingGo = false;
    this.frozenT = 0;
    this.crossed.clear();

    // The objection first: it is what the arming sequence is waiting on.
    const contested = snapshot.stance.contested;
    this.objectionEl.textContent = contested ? (snapshot.stance.line ?? "") : "";
    this.objectionEl.classList.toggle("visible", contested);
    this.costChip.textContent = contested
      ? `COHERENCE −${snapshot.stance.coherenceCost}`
      : "";
    this.costChip.classList.toggle("visible", contested);
    this.reasonEl.textContent = "";
    this.reasonEl.classList.remove("visible");

    this.hintEl.classList.remove("pressed", "nudge");
    // The affordance's own 260ms delay lives in the stylesheet, so the
    // arming sequence is one class here rather than a timer in the frame
    // loop. Under resistance the objection has the same treatment, a beat
    // longer: the line gets to finish before the press means anything.
    this.showChrome(true);

    this.model.setCeremonyInput(this.input);
    this.model.onCeremonyFrame((frame) => this.draw(frame));
    this.model.easeFraming(
      snapshot.targetPos,
      snapshot.kind === "hail" ? snapshot.distanceLy : snapshot.rMax,
    );
    this.root.classList.add("open");
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.activeCb?.(true);
  }

  /** The press affordance and its one alternative, together — they arrive
   *  together and they leave together, because they are one question. */
  private showChrome(on: boolean): void {
    this.hintEl.classList.toggle("visible", on);
    this.stayDarkBtn.classList.toggle("visible", on);
  }

  // ── The sky moved under us ────────────────────────────────────────────

  /**
   * A `sky` landed. The ceremony renders only from its own snapshot, so this
   * has exactly one job: if the source a hail was aimed at is no longer in
   * the sky, there is nothing to aim at. Cancel silently — the player's aim
   * was not wrong, the light simply stopped arriving.
   */
  setSky(sources: readonly DetectedSource[]): void {
    if (this.commitPending) {
      // The commit's own confirming sky. The persistent render is live now
      // and it is the server's, not ours.
      this.commitPending = false;
    }
    const s = this.snapshot;
    if (s === null || s.kind !== "hail" || s.targetStarId === null) return;
    if (this.phase !== "arming" && this.phase !== "holding") return;
    if (!sources.some((src) => src.starId === s.targetStarId)) this.disarm();
  }

  /**
   * Any server error while a commit is in flight reverses it: the bloom
   * stops, the stamps go, and the reason is stated where the objection was.
   * The ceremony stays armed, because a refusal is not a decision.
   */
  handleServerError(message: string): void {
    const s = this.snapshot;
    if (!this.commitPending || s === null) return;
    this.commitPending = false;
    this.lettingGo = false;
    this.bloomEl?.remove();
    this.bloomEl = null;
    this.dropAllStamps(0);
    this.reasonEl.textContent = message;
    this.reasonEl.classList.add("visible");
    this.phase = "arming";
    this.snapshot = { ...s, armedAt: performance.now() };
    this.frozenT = 0;
    this.crossed.clear();
    this.model.setCeremonyInput(this.input);
    this.root.classList.add("open");
    this.showChrome(true);
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private readonly input: CeremonyInput = {
    onPress: () => this.press(),
    onRelease: () => this.release(),
  };

  private press(): void {
    const s = this.snapshot;
    if (s === null || this.lettingGo) return;
    // A cancelled hold left the ceremony armed: a second press picks it back
    // up where the first one started, from zero.
    if (this.phase === "cancelling") this.phase = "arming";
    if (this.phase !== "arming") return;
    // Inert until the affordance is up, and — under resistance — until the
    // objection has finished writing itself in. A press inside that window
    // brightens the hint once and does nothing else.
    const readyAt = s.armedAt + (s.stance.contested ? OBJECTION_MS : HINT_MS);
    if (performance.now() < readyAt) {
      this.hintEl.classList.add("nudge");
      window.setTimeout(() => this.hintEl.classList.remove("nudge"), 420);
      return;
    }
    this.phase = "holding";
    this.holdStart = performance.now();
    this.frozenT = 0;
    this.crossed.clear();
    this.reasonEl.classList.remove("visible");
    this.hintEl.classList.add("pressed");
  }

  private release(): void {
    if (this.phase !== "holding") return;
    // Silent. The thread fades where it stands; the inward rush belongs to
    // the commit alone, and borrowing it here would make a cancel look like
    // one. Nothing is said, and the ceremony stays armed.
    this.phase = "cancelling";
    this.cancelStart = performance.now();
    this.frozenT = this.holdT(performance.now());
    this.hintEl.classList.remove("pressed");
    this.dropAllStamps(CANCEL_MS);
  }

  /** Desktop's thumb. Held Space or Enter arms and holds; the keyup decides
   *  by the same rule the finger does. */
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.phase === "off") return;
    if (e.target === this.stayDarkBtn) return; // the button owns its own keys
    if (e.key === "Escape") {
      e.preventDefault();
      // Mid-hold, Escape is a release — the same silent nothing a lifted
      // thumb is. It only means STAY DARK when there is nothing under way.
      if (this.phase === "holding") this.release();
      else this.chooseStayDark();
      return;
    }
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat) return;
    this.press();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (this.phase === "off") return;
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    this.release();
  };

  // ── The two exits ─────────────────────────────────────────────────────

  /**
   * THE ONLY PLACE A HOLD BECOMES AN ACT. Reached from one caller — the
   * frame loop, and only once a live press started by `press()` has run the
   * full HOLD_MS of wall clock. There is no argument, no public method and
   * no timer that lands here; if you are reading this looking for a
   * programmatic path to a commit, there is not one, and that is the point.
   */
  private completeHold(): void {
    const s = this.snapshot;
    if (s === null || this.phase !== "holding") return;
    this.phase = "committing";
    this.commitStart = performance.now();
    this.frozenT = 1;
    this.commitPending = true;
    this.hintEl.classList.remove("pressed");
    this.showChrome(false);
    // A hail's running year has already stopped: it is the arrival stamp
    // now, and it stays. A broadcast's leading-edge readout was a reading of
    // a moving front, and there is no front any more, so it goes.
    const head = this.headStamp;
    if (s.kind === "broadcast" && head !== null) {
      head.fadeFrom = performance.now();
      head.fadeMs = CANCEL_MS;
    }
    this.headStamp = null;
    this.sendChoice(s.kind, s.targetStarId, s.stance.contested);
    this.mountBloom();
  }

  /**
   * The anti-ceremony. It writes nothing anywhere — the handler validates the
   * word and returns, and the sky afterwards is byte-identical — so this is a
   * choice being NAMED rather than an act being taken. It is sent so the
   * vocabulary is whole, and it is a tap because there is nothing to weigh.
   */
  private chooseStayDark(): void {
    if (this.phase !== "arming" && this.phase !== "cancelling") return;
    if (this.lettingGo) return;
    this.sendChoice("stay-dark", null, false);
    this.disarm();
  }

  /** The one wire call in this file. `acknowledged` is CONSENT and never
   *  price: it is true exactly when the mind's objection was on screen, and
   *  the server recomputes what it charges regardless. */
  private sendChoice(
    choice: ContactKind | "stay-dark",
    starId: string | null,
    acknowledged: boolean,
  ): void {
    this.socket.send({ type: "commitContact", choice, starId, acknowledged });
  }

  /** Hand the camera back and let go of everything, over CANCEL_MS. */
  private disarm(): void {
    if (this.phase === "off" || this.lettingGo) return;
    this.lettingGo = true;
    this.phase = "cancelling";
    this.cancelStart = performance.now();
    this.frozenT = 0;
    this.dropAllStamps(CANCEL_MS);
    this.showChrome(false);
    this.objectionEl.classList.remove("visible");
    this.costChip.classList.remove("visible");
    this.reasonEl.classList.remove("visible");
    this.root.classList.remove("open");
    this.model.setCeremonyInput(null);
    window.setTimeout(() => {
      if (this.lettingGo) this.teardown();
    }, CANCEL_MS);
  }

  private teardown(): void {
    this.phase = "off";
    this.snapshot = null;
    this.commitPending = false;
    this.lettingGo = false;
    this.model.setCeremonyInput(null);
    this.model.onCeremonyFrame(null);
    this.root.classList.remove("open");
    this.bloomEl?.remove();
    this.bloomEl = null;
    for (const stamp of this.stamps) stamp.el.remove();
    this.stamps = [];
    this.headStamp = null;
    this.liveRegion.textContent = "";
    this.bead?.destroy();
    this.bead = null;
    this.wash?.destroy();
    this.wash = null;
    for (const g of this.glints) g.sprite.destroy();
    this.glints = [];
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.activeCb?.(false);
  }

  // ── The frame ─────────────────────────────────────────────────────────

  private holdT(now: number): number {
    return clamp01((now - this.holdStart) / HOLD_MS);
  }

  /** The brightness multiplier the whole beam is drawn through. A reluctant
   *  mind renders a reluctant beam; the dates it stamps stay full strength,
   *  because the arithmetic is not what is in dispute. */
  private beamAlpha(now: number): number {
    const s = this.snapshot;
    if (s === null || !s.stance.contested) return 1;
    if (this.phase === "committing") return 1; // the tremor stops at commit
    if (s.reducedMotion) return CONTESTED_ALPHA;
    return CONTESTED_ALPHA + TREMOR_AMP * Math.sin((now / 1000) * TREMOR_HZ * Math.PI * 2);
  }

  private draw(frame: ModelFrame): void {
    const s = this.snapshot;
    if (s === null) return;
    const now = performance.now();
    const armT = now - s.armedAt;

    if (this.phase === "holding") {
      const t = this.holdT(now);
      if (t >= 1) this.completeHold();
    }

    const fade =
      this.phase === "cancelling"
        ? 1 - clamp01((now - this.cancelStart) / CANCEL_MS)
        : 1;
    const collapse =
      this.phase === "committing" ? clamp01((now - this.commitStart) / COLLAPSE_MS) : 0;

    if (this.phase === "committing" && now - this.commitStart >= COMMIT_MS) {
      // The preview is gone and the real object is the server's now. The
      // stamps outlive it by a breath, then so does the ceremony.
      this.phase = "settling";
      this.settleStart = now;
      this.model.setCeremonyInput(null);
      this.root.classList.remove("open");
      this.dropAllStamps(STAMP_FADE_MS, STAMP_HOLD_MS);
    }
    if (this.phase === "settling" && now - this.settleStart >= STAMP_HOLD_MS + STAMP_FADE_MS) {
      this.teardown();
      return;
    }

    // A cancel that has finished fading draws nothing at all: the sky is
    // byte-identical to what it was before the ceremony armed.
    if (fade > 0.004) {
      if (s.kind === "hail") this.drawHail(frame, s, now, armT, fade, collapse);
      else this.drawBroadcast(frame, s, now, fade, collapse);
    } else {
      if (this.wash !== null) this.wash.visible = false;
      if (this.bead !== null) this.bead.visible = false;
    }

    this.updateStamps(frame, now);
    this.updateGlints(now);
  }

  // ── Hail ──────────────────────────────────────────────────────────────

  private drawHail(
    frame: ModelFrame,
    s: Snapshot,
    now: number,
    armT: number,
    fade: number,
    collapse: number,
  ): void {
    const target = s.targetPos;
    const home = frame.home;
    if (target === null) return;

    const tp = frame.project(target.x, target.y, target.z);
    const targetOk = tp.ok;
    const tx = tp.x;
    const ty = tp.y;

    // THE AIM RING. Gold, the Model's own line-work color: this is the sight
    // you are aiming through, not the source answering.
    const drawing = this.phase !== "settling";
    if (targetOk && drawing) {
      const at = frame.sourceAt(s.targetStarId ?? "");
      const radius = Math.max(AIM_RING_MIN_PX, at?.r ?? 0) * 0.9;
      const sweep = clamp01((armT - RING_DELAY_MS) / RING_MS);
      const t = this.phase === "holding" ? this.holdT(now) : this.frozenT;
      // ...and it closes to solid over the held breath at the far end.
      const closed = clamp01((t - DRAW_FRACTION) / (1 - DRAW_FRACTION));
      if (sweep > 0) {
        const start = -Math.PI / 2;
        const end = start + Math.PI * 2 * sweep;
        frame.gfx
          .moveTo(tx + radius * Math.cos(start), ty + radius * Math.sin(start))
          .arc(tx, ty, radius, start, end)
          .stroke({
            width: 1,
            color: COLOR_SELECT,
            alpha: (0.45 + 0.5 * closed) * fade * (1 - collapse),
          });
      }
    }

    if (this.phase === "arming" || this.phase === "off" || this.phase === "settling") {
      this.bead?.destroy();
      this.bead = null;
      return;
    }

    // THE THREAD. The head is a 3D LERP THEN A PROJECTION, every frame —
    // never a lerp between two screen points. Foreshortening has to be
    // honest, or a beam aimed away from the camera crosses the screen at the
    // same rate as one aimed across it and the depth stops meaning anything.
    const t = this.phase === "holding" ? this.holdT(now) : this.frozenT;
    let p = clamp01(t / DRAW_FRACTION);
    if (this.phase === "committing" && !s.reducedMotion) p *= 1 - collapse;
    const from = this.model.homePosition();
    const head = frame.project(
      lerp(from.x, target.x, p),
      lerp(from.y, target.y, p),
      lerp(from.z, target.z, p),
    );
    const alphaMul =
      this.beamAlpha(now) *
      fade *
      (this.phase === "committing" && s.reducedMotion ? 1 - collapse : 1);

    if (home.ok && head.ok) {
      const width = clamp(
        THREAD_WIDTH_REF_LY / Math.max(frame.dist, 1e-6),
        THREAD_WIDTH_MIN,
        THREAD_WIDTH_MAX,
      );
      this.strokeThread(frame, home.x, home.y, head.x, head.y, width, alphaMul);
    }

    // The bead at HOME: the press, made visible at the one place the whole
    // ceremony is anchored to.
    if (home.ok) {
      const bead = this.ensureBead(frame);
      if (bead !== null) {
        bead.visible = true;
        bead.position.set(home.x, home.y);
        bead.scale.set(BEAD_PX / 64);
        bead.alpha = BEAD_ALPHA * fade;
      }
    }

    // THE RUNNING YEAR at the wavefront. It counts up while the head moves
    // and freezes where it stops, which is the arrival stamp: the same
    // number, having stopped being a preview.
    if (this.phase === "holding" && head.ok) {
      const year = nowYear() + clamp01(t / DRAW_FRACTION) * s.distanceLy;
      const stamp = this.headStamp ?? this.addStamp(null, formatAbsoluteYear(year), head.x, head.y);
      this.headStamp = stamp;
      if (stamp !== null) {
        stamp.el.textContent = formatAbsoluteYear(year);
        stamp.x = head.x;
        stamp.y = head.y;
      }
    }
  }

  /** The thread, with a two-stop falloff behind the head: a faint shaft, a
   *  brighter step, and the head itself at full. */
  private strokeThread(
    frame: ModelFrame,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    alphaMul: number,
  ): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const ux = dx / len;
    const uy = dy / len;
    const seg = (from: number, to: number, alpha: number): void => {
      if (to - from < 0.5) return;
      frame.gfx
        .moveTo(x0 + ux * from, y0 + uy * from)
        .lineTo(x0 + ux * to, y0 + uy * to)
        .stroke({ width, color: COLOR_HOME, alpha: clamp01(alpha * alphaMul) });
    };
    const headFrom = Math.max(0, len - THREAD_HEAD_PX);
    const midFrom = Math.max(0, len - THREAD_FALLOFF_PX);
    seg(0, midFrom, THREAD_SHAFT_ALPHA);
    seg(midFrom, headFrom, THREAD_MID_ALPHA);
    seg(headFrom, len, THREAD_HEAD_ALPHA);
  }

  // ── Broadcast ─────────────────────────────────────────────────────────

  private drawBroadcast(
    frame: ModelFrame,
    s: Snapshot,
    now: number,
    fade: number,
    collapse: number,
  ): void {
    const home = frame.home;
    if (this.phase === "arming" || this.phase === "settling") {
      if (this.wash !== null) this.wash.visible = false;
      return;
    }

    let t = this.phase === "holding" ? this.holdT(now) : this.frozenT;
    // Reduced motion: the shell steps instead of sweeping. The hold's length
    // is untouched — what changes is how much of it you watch move.
    if (s.reducedMotion) {
      const steps = Math.max(1, Math.round((HOLD_MS / 1000) * REDUCED_FPS));
      t = Math.floor(t * steps) / steps;
    }
    // STRICTLY LINEAR IN RADIUS. A wavefront that eased would be a lie about
    // the one thing in this game that never eases.
    const r = t * s.rMax;
    const shown = this.phase === "committing" && !s.reducedMotion ? r * (1 - collapse) : r;
    const alphaMul =
      this.beamAlpha(now) *
      fade *
      (this.phase === "committing" && s.reducedMotion ? 1 - collapse : 1);

    if (home.ok) {
      const radiusPx = (frame.focal * shown) / Math.max(frame.dist, 1e-6);
      frame.gfx
        .circle(home.x, home.y, radiusPx)
        .stroke({ width: 1, color: COLOR_HOME, alpha: clamp01(SHELL_ALPHA * alphaMul) });
      const wash = this.ensureWash(frame);
      if (wash !== null) {
        wash.visible = true;
        wash.position.set(home.x, home.y);
        wash.scale.set(radiusPx / 64);
        wash.alpha = clamp01(WASH_ALPHA * alphaMul);
      }

      // THE LEADING EDGE, read off at twelve o'clock: where the year is now,
      // and the year the front is standing on.
      if (this.phase === "holding") {
        const edge = `${formatAbsoluteYear(nowYear())} → ${formatAbsoluteYear(nowYear() + r)}`;
        const stamp =
          this.headStamp ?? this.addStamp(null, edge, home.x, home.y - radiusPx, "edge");
        this.headStamp = stamp;
        if (stamp !== null) {
          stamp.el.textContent = edge;
          stamp.x = home.x;
          stamp.y = home.y - radiusPx;
        }
      }
    }

    // THE CROSSINGS. In true 3D distance order, never screen order: a source
    // that looks close can stamp late, and that is the whole lesson.
    if (this.phase === "holding") {
      for (const source of s.sources) {
        if (source.distanceLy > r) continue;
        if (this.crossed.has(source.starId)) continue;
        this.crossed.add(source.starId);
        const at = frame.sourceAt(source.starId);
        if (at !== undefined) this.addGlint(frame, at.x, at.y, at.r);
        const year = formatAbsoluteYear(nowYear() + source.distanceLy);
        this.addStamp(source.starId, year, at?.x ?? 0, at?.y ?? 0);
        this.liveRegion.textContent = year;
        // One short tick per distance crossed. Guarded, and skipped whole
        // under reduced motion — this is decoration, not information.
        if (!s.reducedMotion && typeof navigator.vibrate === "function") {
          navigator.vibrate(8);
        }
      }
    }
  }

  // ── Sprites ───────────────────────────────────────────────────────────

  private ensureBead(frame: ModelFrame): Sprite | null {
    if (this.bead !== null) return this.bead;
    const sprite = makeGlow(frame.glowTex, frame.sprites);
    this.bead = sprite;
    return sprite;
  }

  private ensureWash(frame: ModelFrame): Sprite | null {
    if (this.wash !== null) return this.wash;
    const sprite = makeGlow(frame.glowTex, frame.sprites);
    this.wash = sprite;
    return sprite;
  }

  /** Your wavefront's marker at a source it just crossed — cyan, brief, and
   *  gone. Catalog stars get none: a passing radio front does not light a
   *  star, and a glint on one would be a claim about the star. */
  private addGlint(frame: ModelFrame, x: number, y: number, r: number): void {
    const sprite = makeGlow(frame.glowTex, frame.sprites);
    if (sprite === null) return;
    sprite.position.set(x, y);
    sprite.scale.set((Math.max(r, 8) * GLINT_SIZE_MUL) / 64);
    sprite.alpha = 0.9;
    this.glints.push({ sprite, born: performance.now() });
  }

  private updateGlints(now: number): void {
    const live: Glint[] = [];
    for (const g of this.glints) {
      const age = (now - g.born) / GLINT_MS;
      if (age >= 1) {
        g.sprite.destroy();
        continue;
      }
      g.sprite.alpha = 0.9 * (1 - age);
      live.push(g);
    }
    this.glints = live;
  }

  // ── Stamps ────────────────────────────────────────────────────────────

  private addStamp(
    anchor: string | null,
    text: string,
    x: number,
    y: number,
    variant?: "edge",
  ): Stamp | null {
    // Two stamps within a thumb's width of each other are one unreadable
    // stamp. The newer one loses — the older is already being read. The
    // running year at a wavefront is exempt: it is the one stamp that is
    // always moving, and it is what the player is watching.
    if (anchor !== null) {
      for (const other of this.stamps) {
        if (other.fadeFrom !== null || other.anchor === null) continue;
        if (Math.hypot(other.x - x, other.y - y) < STAMP_MIN_GAP_PX) return null;
      }
    }
    const el = document.createElement("div");
    el.className = variant === "edge" ? "contact-stamp contact-stamp--edge" : "contact-stamp";
    el.textContent = text;
    this.stampLayer.append(el);
    const stamp: Stamp = {
      el,
      anchor,
      edge: variant === "edge",
      x,
      y,
      fadeFrom: null,
      fadeMs: 0,
    };
    this.stamps.push(stamp);

    // The budget. Newest kept; the oldest live one starts leaving.
    const live = this.stamps.filter((s) => s.fadeFrom === null && s.anchor !== null);
    if (live.length > MAX_STAMPS) {
      const oldest = live[0];
      if (oldest !== undefined) {
        oldest.fadeFrom = performance.now();
        oldest.fadeMs = STAMP_DROP_MS;
      }
    }
    return stamp;
  }

  private dropAllStamps(fadeMs: number, delayMs = 0): void {
    const at = performance.now() + delayMs;
    for (const stamp of this.stamps) {
      if (stamp.fadeFrom !== null) continue;
      stamp.fadeFrom = at;
      stamp.fadeMs = fadeMs;
    }
    this.headStamp = null;
  }

  private updateStamps(frame: ModelFrame, now: number): void {
    const live: Stamp[] = [];
    for (const stamp of this.stamps) {
      // A crossing stamp follows its source; the camera is frozen, so this is
      // usually the same pixel every frame, and it costs one transform.
      if (stamp.anchor !== null) {
        const at = frame.sourceAt(stamp.anchor);
        if (at !== undefined) {
          stamp.x = at.x;
          stamp.y = at.y;
        }
      }
      let alpha = 1;
      if (stamp.fadeFrom !== null) {
        const age = (now - stamp.fadeFrom) / Math.max(stamp.fadeMs, 1);
        if (age >= 1) {
          stamp.el.remove();
          continue;
        }
        alpha = 1 - clamp01(age);
      }
      const dx = stamp.edge ? 0 : STAMP_DX;
      const dy = stamp.edge ? STAMP_EDGE_DY : STAMP_DY;
      stamp.el.style.opacity = String(alpha);
      stamp.el.style.transform = `translate(${stamp.x + dx}px, ${stamp.y + dy}px)`;
      live.push(stamp);
    }
    this.stamps = live;
  }

  // ── The bloom ─────────────────────────────────────────────────────────

  /** BECOME's beat, reused whole: the same 1,100ms cyan consummation, at the
   *  same register, over HOME instead of over a card. */
  private mountBloom(): void {
    this.bloomEl?.remove();
    const el = document.createElement("div");
    el.className = "contact-bloom";
    const home = this.model.homeScreenPoint();
    el.style.left = `${home.x}px`;
    el.style.top = `${home.y}px`;
    // The bloom comes up UNDER the collapse rather than after it, so the
    // rush inward is lit by what it is rushing into. Delay plus duration is
    // exactly COMMIT_MS: the beat closes when the beat closes.
    el.style.animationDelay = `${BLOOM_DELAY_MS}ms`;
    el.style.animationDuration = `${COMMIT_MS - BLOOM_DELAY_MS}ms`;
    this.root.append(el);
    this.bloomEl = el;
  }
}

// ── Small helpers ───────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** One additive cyan glow sprite on the ceremony's layer. The texture is the
 *  Model's — every soft light in this game is that one gradient. */
function makeGlow(tex: Texture | null, into: { addChild(child: Sprite): unknown }): Sprite | null {
  if (tex === null) return null;
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  sprite.tint = COLOR_HOME;
  sprite.blendMode = "add";
  into.addChild(sprite);
  return sprite;
}
