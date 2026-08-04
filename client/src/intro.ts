// THE INTRO (S0.1) — the four beats between BECOME and the home screen.
//
// ONE CAMERA MOVE, four places it rests. The star's limb, the system, the
// first light-year, the sixty-light-year volume: the whole sequence is a
// single recession staged on the Model's own camera, at one second per decade
// of distance, so the scale is felt as travel rather than read off a caption.
// Nothing auto-advances — a tap launches the next leg — and the line for the
// leg's destination fades in while the camera is still moving, so words
// always arrive mid-flight and never sit on a static frame.
//
// The purpose is SHOWN. The four served lines are the only prose on screen;
// the only words this file adds are the two chrome labels and the aria-label.
// Beat four's silence before Begin is deliberate and is not filled.
//
// What beat four draws is deliberately OUTSIDE the shipped detection grammar:
// a real source's core brightens with confidence and its alpha never falls
// below the floor the Model draws it at, and these have no core and breathe
// down to nothing. They assert no neighbor, because at that moment the
// knowledge layer has not served one. The Model's own amber is held at
// setSourceReveal(0) for the whole sequence and eased back in at Begin: what
// resolves is the instrument, not a sky that moved.
//
// A sibling overlay root in the voicebeat.ts mold (see style.css's "The
// intro" block for the z-index contract). The canvas underneath is the tap
// target, through the Model's ceremony input; only Skip and Begin take a
// pointer. For its lifetime this owns the ceremony input, the ceremony frame
// callback, the DOM overlay's visibility and the source reveal, and it hands
// every one of them back at Begin, at a skip, or at destroy().

import { Sprite, Texture } from "pixi.js";
import {
  COLOR_HOME,
  COLOR_ORRERY,
  COLOR_SOURCE,
  type CameraView,
  type CeremonyInput,
  type Model,
  type ModelFrame,
} from "./model";
import { AU_LY } from "./system";

export type IntroOutcome = "finished" | "skipped";

export interface IntroOptions {
  /** Beats one to four, served text, used verbatim. */
  readonly lines: readonly [string, string, string, string];
  /** The player's own starId. Drives the smudge field, so a replay stands
   *  under the same sky. */
  readonly seed: string;
  /** True from the Mind page: save the camera, dolly in, dolly back out. */
  readonly replay: boolean;
  /** Fired exactly once, at the Begin tap or when a skip has landed. Never
   *  from destroy(). */
  readonly onDone: (outcome: IntroOutcome) => void;
}

// ── Timings. Wall clock (performance.now) throughout, never frame counts.

/** The rate the whole sequence travels at: one second per decade of distance.
 *  Every leg's duration falls out of this and the two poses it runs between,
 *  so no leg has a hand-set length to drift out of step with the others. */
const MS_PER_DECADE = 1000;
/** Where in a leg the next line arrives. Past halfway, so the words land with
 *  the camera still moving and the beat they name already forming. */
const LINE_AT_LEG = 0.55;
/** The line's fade in. The CSS owns both directions (the fade out is 220ms,
 *  and either exit overrides it through --intro-out-ms); this one is here
 *  because beat four's silence is measured from the line having settled. */
const LINE_IN_MS = 320;
/** Beat one's line, after the first frame — not after construction, which is
 *  before the renderer exists. */
const FIRST_LINE_MS = 400;
/** The way out, offered late enough that it is not the first thing read. */
const SKIP_IN_MS = 1600;
/** The silence at beat four, between the line settling and Begin. */
const BEGIN_DELAY_MS = 1400;
/** Begin: the prose and the smudges leave while the instrument resolves. */
const REVEAL_MS = 700;
/** A skip: the art goes quickly, the camera still travels. */
const SKIP_ART_MS = 400;
const SKIP_MS_MIN = 900;
const SKIP_MS_MAX = 2200;
/** A replay's approach and its return. Same rate, both clamped. */
const REPLAY_IN_MIN = 600;
const REPLAY_MS_MAX = 2600;
/** One advance per tap. The ceremony press path already rejects the trailing
 *  press of the gesture that mounted this. */
const TAP_DEBOUNCE_MS = 220;

/** Beat three's pose: the first light-year, at the home angles. */
const BEAT3_DIST_LY = 0.25;
/** Belt and braces for a system that never arrived (the Model falls back the
 *  same way): a G star's opening frame. */
const FALLBACK_OPENING_AU = 3;
const FALLBACK_INTRO_AU = 0.00986;

// ── Beat one: the limb ───────────────────────────────────────────────────

const DISC_TEX_SIZE = 512;
const SOFT_TEX_SIZE = 256;
/** The corona, as a multiple of the disc's drawn radius. */
const CORONA_MUL = 1.25;
const CORONA_ALPHA = 0.5;
/** Where the disc hands over to the Model's own sun. Above the high mark the
 *  disc is the frame; by the low mark the Model's glow (clamped at 200 px)
 *  is the star, and drawing a second one over it would be two suns. */
const DISC_FADE_HI_PX = 260;
const DISC_FADE_LO_PX = 110;
/** Granulation: a few darker cells, drifting, well inside the limb. */
const BLOTCH_COUNT = 3;
const BLOTCH_ALPHA = 0.13;
const BLOTCH_R_MIN = 0.16;
const BLOTCH_R_MAX = 0.27;
const BLOTCH_REACH = 0.5;
const BLOTCH_DRIFT_S = 26;

// ── Beat two: the scale rail ─────────────────────────────────────────────

const RAIL_IN_MS = 400;
const RAIL_OUT_MS = 400;
const RAIL_Y_FRAC = 0.66;
/** The hairline, as a fraction of the width. */
const RAIL_SPAN_FRAC = 0.62;
const RAIL_ALPHA = 0.35;
const RISER_ALPHA = 0.22;
const RAIL_TICK_PX = 4;
/** How far apart the marks may sit. The first mark is under the home world
 *  wherever the world's own orbit has put it; outside this band the third
 *  mark would leave the screen, and a scale whose last mark is off the frame
 *  cannot be read at all. */
const MARK_GAP_MIN_FRAC = 0.11;
const MARK_GAP_MAX_FRAC = 0.24;
/** Where you stand: just past the first mark, as a share of one interval. */
const YOU_FRAC = 0.12;
const YOU_PX = 3;

// ── Beat three: the waking rings ─────────────────────────────────────────

/** Light does not ease: radius is strictly linear in time. */
const RING_SPEED_LY_S = 0.05;
const RING_EVERY_MS = 550;
const RING_MAX_ALIVE = 4;
const RING_ALPHA = 0.3;
/** A ring dies where it reaches this share of the screen's half-height. */
const RING_EDGE_FRAC = 0.9;
/** Reduced motion: the rings step instead of sweeping. */
const RING_STEP_S = 0.25;

// ── Beat four: the ambiguous sky ─────────────────────────────────────────

const SMUDGE_COUNT = 6;
const SMUDGE_MIN_LY = 25;
const SMUDGE_MAX_LY = 55;
/** Their spread across the screen plane, in light-years. Squeezed on the
 *  horizontal because a phone held upright is the frame being composed for. */
const SMUDGE_SPREAD_MIN_LY = 5;
const SMUDGE_SPREAD_MAX_LY = 14;
const SMUDGE_SPREAD_X_MUL = 0.55;
const SMUDGE_PX_MIN = 88;
const SMUDGE_PX_MAX = 96;
const SMUDGE_ALPHA_MIN = 0.08;
const SMUDGE_ALPHA_MAX = 0.12;
/** The breath, slow and out of phase, some of it down to nothing. */
const SMUDGE_PERIOD_MIN_S = 7;
const SMUDGE_PERIOD_MAX_S = 13;
const SMUDGE_SWING_MIN = 0.35;
const SMUDGE_SWING_MAX = 1;
/** Nothing ambiguous is drawn over the one thing that is not. */
const SMUDGE_HOME_CLEAR_PX = 80;

type Beat = 1 | 2 | 3 | 4;
type Phase = "idle" | "approach" | "hold" | "leg" | "finish";
type EndKind = "begin" | "skip";

interface Ring {
  readonly born: number;
  /** The radius it dies at, fixed at emission: light dims as it spreads, and
   *  a camera that pulls back afterwards must not brighten it again. */
  readonly maxLy: number;
}

/** One granulation cell: where it sits on the face, how big, how it drifts. */
interface Blotch {
  readonly angle: number;
  readonly drift: number;
  readonly reach: number;
  readonly size: number;
  readonly sprite: Sprite;
}

interface Smudge {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly px: number;
  readonly alpha: number;
  readonly periodS: number;
  readonly phase: number;
  readonly swing: number;
  readonly sprite: Sprite;
}

export class Intro {
  private readonly model: Model;
  private readonly lines: readonly string[];
  private readonly seed: string;
  private readonly replay: boolean;
  private readonly onDoneCb: (outcome: IntroOutcome) => void;

  private readonly root: HTMLDivElement;
  private readonly lineEl: HTMLParagraphElement;
  private readonly skipBtn: HTMLButtonElement;
  private readonly beginBtn: HTMLButtonElement;

  private phase: Phase = "idle";
  private beat: Beat = 1;
  /** The intro's clock, started on the first ceremony frame and never at
   *  construction: before the renderer exists there is nothing to time. */
  private clock: number | null = null;
  private released = false;
  private doneFired = false;

  private legStart = 0;
  private legMs = 1;
  private beatStart = 0;
  private lastTapAt = 0;

  private lineAt: number | null = null;
  private lineText = "";
  private lineSettledAt: number | null = null;
  private skipShown = false;
  private beginShown = false;

  private endKind: EndKind = "begin";
  private endStart = 0;
  private revealStart: number | null = null;
  private returning = false;

  /** The pose a replay interrupted, so it can be given back. */
  private readonly savedView: CameraView | null;
  private homeView: CameraView | null = null;

  private railFrom = 0;
  private rings: Ring[] = [];
  private ringsEmitting = false;
  private lastRingAt = 0;
  private smudges: Smudge[] | null = null;
  private smudgeFade = 0;

  private discTex: Texture | null = null;
  private softTex: Texture | null = null;
  private coronaTex: Texture | null = null;
  private readonly ownedTex: Texture[] = [];
  private disc: Sprite | null = null;
  private corona: Sprite | null = null;
  private blotches: Blotch[] = [];

  private readonly reduced: boolean;

  constructor(container: HTMLElement, model: Model, opts: IntroOptions) {
    this.model = model;
    this.lines = opts.lines;
    this.seed = opts.seed;
    this.replay = opts.replay;
    this.onDoneCb = opts.onDone;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.savedView = opts.replay ? model.cameraView() : null;

    this.root = document.createElement("div");
    this.root.className = "intro-root";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Your first look at the sky");

    // ONE line node for all four beats: it never moves, so the words replace
    // each other in place and the eye keeps its position on the screen.
    this.lineEl = document.createElement("p");
    this.lineEl.className = "intro-line";
    this.lineEl.setAttribute("aria-live", "polite");

    this.skipBtn = document.createElement("button");
    this.skipBtn.type = "button";
    this.skipBtn.className = "intro-skip holos-caps";
    this.skipBtn.textContent = "Skip";
    this.skipBtn.addEventListener("click", () => this.skip());

    this.beginBtn = document.createElement("button");
    this.beginBtn.type = "button";
    this.beginBtn.className = "intro-begin holos-caps";
    this.beginBtn.textContent = "Begin";
    this.beginBtn.addEventListener("click", () => this.finish());

    this.root.append(this.lineEl, this.skipBtn, this.beginBtn);
    container.append(this.root);

    // The Model's own layers are the stage: the labels come off entirely
    // (they name a neighborhood the first two beats are inside of), and the
    // amber is held at zero until Begin eases it back.
    this.model.setOverlayHidden(true);
    this.model.setSourceReveal(0);
    this.model.setCeremonyInput(this.input);
    this.model.onCeremonyFrame((frame) => this.draw(frame));
    window.addEventListener("keydown", this.onKeyDown);
  }

  /** Unconditional teardown. Hands back everything this held and says
   *  nothing: the caller already knows, and destroy() is not an outcome. */
  destroy(): void {
    this.release();
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private readonly input: CeremonyInput = {
    onPress: () => this.advance(),
    onRelease: () => {
      /* nothing here holds; a press is the whole gesture */
    },
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.skip();
    }
  };

  private advance(): void {
    if (this.released || this.phase === "finish") return;
    const now = performance.now();
    if (now - this.lastTapAt < TAP_DEBOUNCE_MS) return;
    this.lastTapAt = now;

    // A leg is already carrying the player somewhere, and the approach is
    // not theirs to interrupt. Only a beat at rest answers a tap.
    if (this.phase !== "hold") return;

    if (this.beat === 4) {
      // The silence before Begin belongs to the player: waiting it out is one
      // reading of it, and asking for the way on is the other.
      if (this.beginShown) this.finish();
      else this.showBegin();
      return;
    }
    this.launchLeg(now);
  }

  // ── The sequence ──────────────────────────────────────────────────────

  /** First frame. Everything downstream is timed from here. */
  private begin(now: number): void {
    this.homeView =
      this.model.introPose() ??
      this.model.openingPose() ?? {
        distLy: FALLBACK_INTRO_AU * AU_LY,
        ...anglesOf(this.model.cameraView()),
      };

    if (!this.replay) {
      this.enterBeat(1, now);
      return;
    }
    // A replay was called from somewhere else in the sky: dolly in rather
    // than cut, at the same rate every other leg runs at.
    const to = this.beatPose(1);
    const ms = clamp(
      MS_PER_DECADE * decades(this.model.cameraView().distLy, to.distLy),
      REPLAY_IN_MIN,
      REPLAY_MS_MAX,
    );
    this.phase = "approach";
    this.model.dollyTo(to.distLy, to.az, to.el, ms, () => {
      if (this.phase === "approach") this.enterBeat(1, performance.now());
    });
  }

  /** Arrive at a beat and hold there. */
  private enterBeat(beat: Beat, now: number): void {
    if (this.released || this.phase === "finish") return;
    this.phase = "hold";
    this.beat = beat;
    this.beatStart = now;
    if (beat === 1) {
      // Beat one is the only line not already on its way in from a leg.
      this.lineAt = now + FIRST_LINE_MS;
      this.lineText = this.lines[0] ?? "";
    }
    if (beat === 3) {
      this.ringsEmitting = true;
      this.lastRingAt = 0;
    } else {
      this.ringsEmitting = false;
    }
  }

  /** Launch the leg out of the beat now held, and schedule its line. */
  private launchLeg(now: number): void {
    const next = (this.beat + 1) as Beat;
    const to = this.beatPose(next);
    const ms = Math.max(1, MS_PER_DECADE * decades(this.model.cameraView().distLy, to.distLy));

    this.phase = "leg";
    this.legStart = now;
    this.legMs = ms;
    if (this.beat === 2) this.railFrom = now; // the rail leaves with the camera
    this.ringsEmitting = false;

    this.lineEl.classList.remove("visible");
    this.lineSettledAt = null;
    this.lineAt = now + ms * LINE_AT_LEG;
    this.lineText = this.lines[next - 1] ?? "";

    this.model.dollyTo(to.distLy, to.az, to.el, ms, () => {
      if (this.phase === "leg") this.enterBeat(next, performance.now());
    });
  }

  private beatPose(beat: Beat): CameraView {
    const home = this.homeView ?? this.model.cameraView();
    if (beat === 1) {
      return this.model.introPose() ?? home;
    }
    if (beat === 2) {
      return (
        this.model.openingPose() ?? {
          distLy: FALLBACK_OPENING_AU * AU_LY,
          ...anglesOf(home),
        }
      );
    }
    if (beat === 3) return { distLy: BEAT3_DIST_LY, ...anglesOf(home) };
    return this.model.volumePose();
  }

  // ── The two exits ─────────────────────────────────────────────────────

  /** Begin. The words and the ambiguity leave while the amber the knowledge
   *  layer actually serves eases in underneath: whatever is there resolves,
   *  and an empty sky resolves too. */
  private finish(): void {
    if (this.released || this.phase === "finish") return;
    this.phase = "finish";
    this.endKind = "begin";
    this.endStart = performance.now();
    this.revealStart = this.endStart;
    this.closeChrome(REVEAL_MS);
    this.fire("finished");
  }

  /** Skip. Never a cut: the camera makes the whole journey, faster. */
  private skip(): void {
    if (this.released || this.phase === "finish") return;
    this.phase = "finish";
    this.endKind = "skip";
    this.endStart = performance.now();
    this.revealStart = null;
    this.closeChrome(SKIP_ART_MS);

    const to = this.model.volumePose();
    const ms = clamp(
      MS_PER_DECADE * decades(this.model.cameraView().distLy, to.distLy),
      SKIP_MS_MIN,
      SKIP_MS_MAX,
    );
    this.model.dollyTo(to.distLy, to.az, to.el, ms, () => {
      if (this.phase === "finish" && this.revealStart === null) {
        this.revealStart = performance.now();
      }
    });
  }

  /** Take the prose and the chrome off screen over `ms`. */
  private closeChrome(ms: number): void {
    this.root.style.setProperty("--intro-out-ms", `${ms}ms`);
    this.lineAt = null;
    this.lineEl.classList.remove("visible");
    this.skipBtn.classList.remove("visible");
    this.beginBtn.classList.remove("visible");
  }

  private showBegin(): void {
    if (this.beginShown) return;
    this.beginShown = true;
    this.beginBtn.classList.add("visible");
    // One way on at a time. Skipping what has already been seen is not an
    // offer worth keeping on the screen.
    this.skipBtn.classList.remove("visible");
  }

  private fire(outcome: IntroOutcome): void {
    if (this.doneFired) return;
    this.doneFired = true;
    this.onDoneCb(outcome);
  }

  /** Hand back the camera, the input, the labels and the DOM. Idempotent. */
  private release(): void {
    if (this.released) return;
    this.released = true;
    this.model.setCeremonyInput(null);
    this.model.onCeremonyFrame(null);
    this.model.setOverlayHidden(false);
    this.model.setSourceReveal(1);
    window.removeEventListener("keydown", this.onKeyDown);

    this.disc?.destroy();
    this.disc = null;
    this.corona?.destroy();
    this.corona = null;
    for (const b of this.blotches) b.destroy();
    this.blotches = [];
    for (const s of this.smudges ?? []) s.sprite.destroy();
    this.smudges = null;
    for (const tex of this.ownedTex) tex.destroy(true);
    this.ownedTex.length = 0;
    this.discTex = null;
    this.softTex = null;
    this.coronaTex = null;
    this.root.remove();
  }

  // ── The frame ─────────────────────────────────────────────────────────

  private draw(frame: ModelFrame): void {
    if (this.released) return;
    const now = performance.now();
    if (this.clock === null) {
      this.clock = now;
      this.begin(now);
    }

    this.tickChrome(now);
    const fade = this.artFade(now);
    if (fade > 0.004) {
      this.drawLimb(frame, now, fade);
      this.drawRail(frame, now, fade);
      this.drawRings(frame, now, fade);
    } else {
      this.hideLimb();
    }
    this.drawSmudges(frame, now, fade);
    this.tickEnding(now);
  }

  /** The line, the way out and the way on, all on the intro's own clock. */
  private tickChrome(now: number): void {
    const started = this.clock ?? now;
    if (this.lineAt !== null && now >= this.lineAt) {
      this.lineAt = null;
      this.lineEl.textContent = this.lineText;
      this.lineEl.classList.add("visible");
      this.lineSettledAt = now + LINE_IN_MS;
    }
    if (!this.skipShown && !this.beginShown && now - started >= SKIP_IN_MS) {
      this.skipShown = true;
      this.skipBtn.classList.add("visible");
    }
    if (
      this.beat === 4 &&
      this.phase === "hold" &&
      !this.beginShown &&
      this.lineSettledAt !== null &&
      now >= this.lineSettledAt + BEGIN_DELAY_MS
    ) {
      this.showBegin();
    }
  }

  /** Everything drawn on the sky fades together at either exit. */
  private artFade(now: number): number {
    if (this.phase !== "finish") return 1;
    const ms = this.endKind === "begin" ? REVEAL_MS : SKIP_ART_MS;
    return 1 - clamp01((now - this.endStart) / ms);
  }

  /** The reveal ease, the replay's return, and the moment this lets go. */
  private tickEnding(now: number): void {
    if (this.phase !== "finish") return;
    const start = this.revealStart;
    if (start === null) return; // a skip still travelling
    const t = clamp01((now - start) / REVEAL_MS);
    this.model.setSourceReveal(smoothstep(t));
    if (t < 1 || this.returning) return;

    if (this.savedView !== null) {
      // A replay borrowed the camera; it gives it back at the same rate,
      // and only then lets go.
      this.returning = true;
      const view = this.savedView;
      const ms = Math.min(
        MS_PER_DECADE * decades(this.model.cameraView().distLy, view.distLy),
        REPLAY_MS_MAX,
      );
      this.model.dollyTo(view.distLy, view.az, view.el, ms, () => {
        this.release();
        this.fire(this.endKind === "begin" ? "finished" : "skipped");
      });
      return;
    }
    this.release();
    this.fire(this.endKind === "begin" ? "finished" : "skipped");
  }

  // ── Beat one: the limb ────────────────────────────────────────────────

  /**
   * The star as a body: an opaque disc at its true projected radius, a soft
   * corona around it, granulation drifting across it. It hands over to the
   * Model's own sun on the way out — the disc shrinks on the honest inverse
   * law and dissolves once the Model's glow is the larger of the two, so
   * there is never a second star in the frame.
   */
  private drawLimb(frame: ModelFrame, now: number, fade: number): void {
    const radiusLy = this.model.starRadiusLy();
    if (radiusLy === null || this.beat > 2) {
      this.hideLimb();
      return;
    }
    const home = this.model.homePosition();
    const p = frame.project(home.x, home.y, home.z);
    if (!p.ok) {
      this.hideLimb();
      return;
    }
    const x = p.x;
    const y = p.y;
    const rPx = (frame.focal * radiusLy) / p.depth;
    const alpha =
      fade * clamp01((rPx - DISC_FADE_LO_PX) / (DISC_FADE_HI_PX - DISC_FADE_LO_PX));
    if (alpha <= 0.004) {
      this.hideLimb();
      return;
    }

    const tint = this.model.starTint() ?? 0xf7ecc4;
    if (this.discTex === null) this.discTex = this.own(starDiscTexture(DISC_TEX_SIZE, tint));
    const corona = this.ensureCorona(frame);
    if (corona !== null) {
      corona.visible = true;
      corona.tint = tint;
      corona.position.set(x, y);
      corona.scale.set((rPx * CORONA_MUL) / (corona.texture.width / 2));
      corona.alpha = CORONA_ALPHA * alpha;
    }
    const disc = this.ensureDisc(frame);
    if (disc === null) return;
    disc.visible = true;
    disc.position.set(x, y);
    disc.scale.set(rPx / (DISC_TEX_SIZE / 2));
    disc.alpha = alpha;

    // Granulation, over the disc rather than under it: cells are a darkening
    // of the surface, so they are drawn on it at normal blend.
    const tSec = this.reduced ? 0 : now / 1000;
    for (const cell of this.ensureBlotches(frame, tint)) {
      const a = cell.angle + (tSec / BLOTCH_DRIFT_S) * Math.PI * 2 * cell.drift;
      cell.sprite.visible = true;
      cell.sprite.position.set(
        x + rPx * cell.reach * Math.cos(a),
        y + rPx * cell.reach * Math.sin(a),
      );
      cell.sprite.scale.set((rPx * cell.size) / (SOFT_TEX_SIZE / 2));
      cell.sprite.alpha = BLOTCH_ALPHA * alpha;
    }
  }

  private hideLimb(): void {
    if (this.disc !== null) this.disc.visible = false;
    if (this.corona !== null) this.corona.visible = false;
    for (const b of this.blotches) b.sprite.visible = false;
  }

  // ── Beat two: the scale rail ──────────────────────────────────────────

  /**
   * Three marks at one interval: the world you woke on, the star it goes
   * round, and the same step again with nothing under it. The line names
   * them; the rail carries NO TEXT AT ALL, because a label is how the scale
   * gets a name, and the name is design vocabulary.
   */
  private drawRail(frame: ModelFrame, now: number, fade: number): void {
    let alpha = 0;
    if (this.phase === "hold" && this.beat === 2) {
      alpha = clamp01((now - this.beatStart) / RAIL_IN_MS);
    } else if (this.phase !== "hold" && this.beat === 2 && this.railFrom > 0) {
      alpha = 1 - clamp01((now - this.railFrom) / RAIL_OUT_MS);
    }
    alpha *= fade;
    if (alpha <= 0.004) return;

    const home = this.model.homePosition();
    const star = frame.project(home.x, home.y, home.z);
    if (!star.ok) return;
    const starX = star.x;
    const starY = star.y;
    const world = frame.home;

    const w = frame.width;
    const h = frame.height;
    const railY = Math.min(h * RAIL_Y_FRAC, this.lineEl.offsetTop - 24);
    const gapMin = w * MARK_GAP_MIN_FRAC;
    const gapMax = w * MARK_GAP_MAX_FRAC;
    const raw = world.ok ? world.x - starX : -gapMax;
    const side = raw >= 0 ? 1 : -1;
    const gap = clamp(Math.abs(raw), gapMin, gapMax);

    const m1 = starX + side * gap;
    const m3 = starX - side * gap;
    const half = (w * RAIL_SPAN_FRAC) / 2;
    const x0 = Math.min(Math.min(m1, m3) - gap * 0.3, starX - half);
    const x1 = Math.max(Math.max(m1, m3) + gap * 0.3, starX + half);

    const gfx = frame.gfx;
    gfx
      .moveTo(x0, railY)
      .lineTo(x1, railY)
      .stroke({ width: 1, color: COLOR_ORRERY, alpha: RAIL_ALPHA * alpha });
    for (const mx of [m1, starX, m3]) {
      gfx
        .moveTo(mx, railY - RAIL_TICK_PX)
        .lineTo(mx, railY + RAIL_TICK_PX)
        .stroke({ width: 1, color: COLOR_ORRERY, alpha: RAIL_ALPHA * alpha });
    }

    // Risers to the two things that are in the frame. The third mark gets
    // none: there is nothing there to point at, and that is the beat.
    if (world.ok) {
      gfx
        .moveTo(m1, railY)
        .lineTo(clamp(world.x, 8, w - 8), clamp(world.y, 8, railY - 12))
        .stroke({ width: 1, color: COLOR_ORRERY, alpha: RISER_ALPHA * alpha });
    }
    gfx
      .moveTo(starX, railY)
      .lineTo(starX, clamp(starY, 8, railY - 12))
      .stroke({ width: 1, color: COLOR_ORRERY, alpha: RISER_ALPHA * alpha });

    // Where you stand: a short way past the first mark, in cyan, because it
    // is the one present-tense thing on the rail.
    gfx
      .circle(m1 + (starX - m1) * YOU_FRAC, railY, YOU_PX)
      .fill({ color: COLOR_HOME, alpha: 0.9 * alpha });
  }

  // ── Beat three: the waking rings ──────────────────────────────────────

  /** Wavefronts, strictly linear in radius: the camera eases and light does
   *  not. Emitted only while the beat is held; the ones already out keep
   *  going while the camera leaves, and shrink because it does. */
  private drawRings(frame: ModelFrame, now: number, fade: number): void {
    const home = frame.home;
    if (!home.ok) return;
    const maxPx = (frame.height / 2) * RING_EDGE_FRAC;

    if (this.ringsEmitting && now - this.lastRingAt >= RING_EVERY_MS) {
      this.lastRingAt = now;
      if (this.rings.length >= RING_MAX_ALIVE) this.rings.shift();
      this.rings.push({ born: now, maxLy: (maxPx * home.depth) / frame.focal });
    }
    if (this.rings.length === 0) return;

    const live: Ring[] = [];
    for (const ring of this.rings) {
      let age = (now - ring.born) / 1000;
      if (this.reduced) age = Math.floor(age / RING_STEP_S) * RING_STEP_S;
      const r = RING_SPEED_LY_S * age;
      if (r >= ring.maxLy) continue;
      live.push(ring);
      const t = r / ring.maxLy;
      const alpha = RING_ALPHA * (1 - t) * (1 - t) * fade;
      if (alpha <= 0.004) continue;
      frame.gfx
        .circle(home.x, home.y, (frame.focal * r) / home.depth)
        .stroke({ width: 1, color: COLOR_HOME, alpha });
    }
    this.rings = live;
  }

  // ── Beat four: the ambiguous sky ──────────────────────────────────────

  /**
   * Six warm smudges at seeded points in the volume. Coreless, breathing,
   * some of them sinking to nothing while you watch: everything a detected
   * source's rendering asserts, this withholds. They could be civilizations
   * and they could be nothing, and the art says neither.
   */
  private drawSmudges(frame: ModelFrame, now: number, fade: number): void {
    // In over the last stretch of the leg that arrives at the volume, so the
    // sky is already occupied by the time the camera stops.
    if (this.phase === "leg" && this.beat === 3) {
      this.smudgeFade = clamp01(((now - this.legStart) / this.legMs - 0.6) / 0.4);
    } else if (this.phase === "hold" && this.beat === 4) {
      this.smudgeFade = 1;
    }
    const alphaMul = this.smudgeFade * fade;
    const list = this.smudges ?? (alphaMul > 0 ? this.buildSmudges(frame) : null);
    if (list === null) return;
    if (alphaMul <= 0.004) {
      for (const s of list) s.sprite.visible = false;
      return;
    }

    const home = frame.home;
    const tSec = this.reduced ? 0 : now / 1000;
    for (const s of list) {
      const p = frame.project(s.x, s.y, s.z);
      if (!p.ok) {
        s.sprite.visible = false;
        continue;
      }
      const x = p.x;
      const y = p.y;
      if (home.ok && Math.hypot(x - home.x, y - home.y) < SMUDGE_HOME_CLEAR_PX) {
        s.sprite.visible = false;
        continue;
      }
      const breath = 0.5 + 0.5 * Math.sin((tSec / s.periodS) * Math.PI * 2 + s.phase);
      s.sprite.visible = true;
      s.sprite.position.set(x, y);
      s.sprite.scale.set(s.px / (SOFT_TEX_SIZE / 2));
      s.sprite.alpha = s.alpha * (1 - s.swing * breath) * alphaMul;
    }
  }

  /** The field, laid out once against the volume's own attitude so it reads
   *  as a sky rather than as a ring around the player, and seeded on the
   *  player's star so a replay stands under the same one. */
  private buildSmudges(frame: ModelFrame): Smudge[] | null {
    const tex = this.ensureSoftTex();
    if (tex === null) return null;
    const home = this.model.homePosition();
    const view = this.model.volumePose();
    const sinAz = Math.sin(view.az);
    const cosAz = Math.cos(view.az);
    const sinEl = Math.sin(view.el);
    const cosEl = Math.cos(view.el);
    const rnd = mulberry32(hash32(`${this.seed}:sky`));

    const out: Smudge[] = [];
    for (let i = 0; i < SMUDGE_COUNT; i++) {
      // Laid out in the camera's own frame and rotated back into the world by
      // the inverse of the Model's yaw-then-pitch, so the field composes from
      // the volume and still moves with true parallax on the way there. The
      // horizontal spread is the narrow one because a phone held upright is
      // the frame being composed for.
      const theta = rnd() * Math.PI * 2;
      const spread =
        SMUDGE_SPREAD_MIN_LY + (SMUDGE_SPREAD_MAX_LY - SMUDGE_SPREAD_MIN_LY) * rnd();
      const sx = spread * Math.cos(theta) * SMUDGE_SPREAD_X_MUL;
      const sy = spread * Math.sin(theta);
      // The depth that makes the true separation from home the distance drawn
      // for it. Near side or far side, since either is a place light comes
      // from. The basis is orthonormal, so the three legs are the distance.
      const dist = SMUDGE_MIN_LY + (SMUDGE_MAX_LY - SMUDGE_MIN_LY) * rnd();
      const flat = Math.hypot(sx, sy);
      const sz =
        Math.sqrt(Math.max(dist * dist - flat * flat, 1)) * (rnd() < 0.5 ? -1 : 1);
      const dy = sy * cosEl + sz * sinEl;
      const z1 = -sy * sinEl + sz * cosEl;
      const dx = sx * cosAz - z1 * sinAz;
      const dz = sx * sinAz + z1 * cosAz;

      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.tint = COLOR_SOURCE;
      sprite.blendMode = "add";
      sprite.visible = false;
      frame.sprites.addChild(sprite);
      out.push({
        x: home.x + dx,
        y: home.y + dy,
        z: home.z + dz,
        px: SMUDGE_PX_MIN + (SMUDGE_PX_MAX - SMUDGE_PX_MIN) * rnd(),
        alpha: SMUDGE_ALPHA_MIN + (SMUDGE_ALPHA_MAX - SMUDGE_ALPHA_MIN) * rnd(),
        periodS: SMUDGE_PERIOD_MIN_S + (SMUDGE_PERIOD_MAX_S - SMUDGE_PERIOD_MIN_S) * rnd(),
        phase: rnd() * Math.PI * 2,
        swing: SMUDGE_SWING_MIN + (SMUDGE_SWING_MAX - SMUDGE_SWING_MIN) * rnd(),
        sprite,
      });
    }
    this.smudges = out;
    return out;
  }

  // ── Sprites ───────────────────────────────────────────────────────────

  private own(tex: Texture | null): Texture | null {
    if (tex !== null) this.ownedTex.push(tex);
    return tex;
  }

  private ensureSoftTex(): Texture | null {
    if (this.softTex === null) this.softTex = this.own(softDiscTexture(SOFT_TEX_SIZE));
    return this.softTex;
  }

  private ensureDisc(frame: ModelFrame): Sprite | null {
    if (this.disc !== null) return this.disc;
    const tex = this.discTex;
    if (tex === null) return null;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    // Normal blend, alone among everything this file draws: a body is opaque,
    // and the star's disc has to COVER what is behind it rather than add to it.
    sprite.blendMode = "normal";
    frame.sprites.addChild(sprite);
    this.disc = sprite;
    return sprite;
  }

  private ensureCorona(frame: ModelFrame): Sprite | null {
    if (this.corona !== null) return this.corona;
    let tex = frame.glowTex;
    if (tex === null) {
      if (this.coronaTex === null) this.coronaTex = this.own(coronaTexture(SOFT_TEX_SIZE));
      tex = this.coronaTex;
    }
    if (tex === null) return null;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.blendMode = "add";
    // Added before the disc, so the disc paints over the middle of it.
    frame.sprites.addChildAt(sprite, 0);
    this.corona = sprite;
    return sprite;
  }

  private ensureBlotches(frame: ModelFrame, tint: number): readonly Blotch[] {
    if (this.blotches.length > 0) return this.blotches;
    const tex = this.ensureSoftTex();
    if (tex === null) return this.blotches;
    const rnd = mulberry32(hash32(`${this.seed}:cells`));
    for (let i = 0; i < BLOTCH_COUNT; i++) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.blendMode = "normal";
      sprite.tint = mix(tint, 0x140b06, 0.55);
      frame.sprites.addChild(sprite);
      this.blotches.push({
        angle: rnd() * Math.PI * 2,
        drift: 0.6 + 0.8 * rnd(),
        reach: BLOTCH_REACH * (0.35 + 0.65 * rnd()),
        size: BLOTCH_R_MIN + (BLOTCH_R_MAX - BLOTCH_R_MIN) * rnd(),
        sprite,
      });
    }
    return this.blotches;
  }
}

// ── Small helpers ───────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** How many orders of magnitude apart two camera distances are. The one
 *  number every leg's duration comes from. */
function decades(from: number, to: number): number {
  const a = Math.max(from, 1e-12);
  const b = Math.max(to, 1e-12);
  return Math.abs(Math.log10(b / a));
}

function anglesOf(view: CameraView): { az: number; el: number } {
  return { az: view.az, el: view.el };
}

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32. Small, seeded, and the same sequence in every browser, which
 *  is the whole requirement: a replay must stand under the same sky. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function rgb(c: number): string {
  return `rgb(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff})`;
}

/** The star's disc: near-white core, the class's own color across the face,
 *  limb-darkened to the edge, and a crisp rim. Physical enough that the
 *  frame reads as a distance off a real body. */
function starDiscTexture(size: number, tint: number): Texture | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return null;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, rgb(mix(tint, 0xffffff, 0.82)));
  grad.addColorStop(0.42, rgb(mix(tint, 0xffffff, 0.3)));
  grad.addColorStop(0.78, rgb(tint));
  grad.addColorStop(0.92, rgb(mix(tint, 0x140b06, 0.24)));
  grad.addColorStop(1, rgb(mix(tint, 0x140b06, 0.46)));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // The rim: one texel of softness and no more. A feathered edge would read
  // as haze, and the whole point of the frame is that this is a surface.
  ctx.globalCompositeOperation = "destination-in";
  const cut = ctx.createRadialGradient(half, half, 0, half, half, half);
  cut.addColorStop(0, "rgba(0,0,0,1)");
  cut.addColorStop(0.992, "rgba(0,0,0,1)");
  cut.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cut;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
  return Texture.from(canvas);
}

/** A soft, CORELESS disc: flat through the middle and falling off at the
 *  edge. The Model's glow has a bright center because a source's core carries
 *  confidence; nothing drawn with this one is claiming any. */
function softDiscTexture(size: number): Texture | null {
  return alphaTexture(size, [
    [0, 0.82],
    [0.4, 0.76],
    [0.72, 0.3],
    [1, 0],
  ]);
}

/** The fallback corona, for a renderer that exposes no glow texture. */
function coronaTexture(size: number): Texture | null {
  return alphaTexture(size, [
    [0, 1],
    [0.24, 0.48],
    [0.52, 0.14],
    [1, 0],
  ]);
}

function alphaTexture(size: number, stops: readonly [number, number][]): Texture | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return null;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, alpha] of stops) {
    grad.addColorStop(offset, `rgba(255,255,255,${alpha})`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}
