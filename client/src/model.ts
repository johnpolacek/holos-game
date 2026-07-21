// THE MODEL — the 3D sky (Act 3, slice A1).
//
// A hand-rolled CPU orbit camera over a Pixi stage. Two kinds of things live
// here and must read as opposites at a glance:
//
//   • CATALOG STARS — crisp point sprites, colored by true spectral class
//     (M dull red → K orange → G yellow-white → F white). Certainty.
//   • DETECTED SOURCES — soft amber radial-gradient smudges whose RADIUS
//     grows as confidence falls (radius ∝ 1 − confidence) and whose core
//     brightens as confidence rises. Belief, not a resolved object.
//
// Plus the one present-tense object: the CYAN HOME mote (crisp point + thin
// ring) at the player's own civ. Cyan is reserved for HOME — never a catalog
// star, never a source. Amber/warm is for the detected sources.
//
// The act opens with a one-shot "pull-back": the camera starts close on the
// home system (a light orrery of concentric rings + a warm central star,
// concepts/03-02) and dollies out and off-axis into the parallax volume
// (concepts/03-07). It plays ONCE, on fresh placement; a resume drops
// straight into the volume.
//
// Text stays in the DOM overlay (canvas for places, DOM for prose): the
// caption and the tracking HOME label.

import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { DetectedSource, SelfView, Star, Vec3Ly } from "@holos/protocol";

// ── Tuning ────────────────────────────────────────────────────────────────

const FOV = 0.95; // vertical field of view, radians (~54°)
const NEAR = 0.5; // near clip in light-years of camera depth
const DPR_MAX = 2;

const DIST_HOME = 5; // dolly distance close on the home system (orrery)
const DIST_VOLUME = 60; // dolly distance out in the parallax volume
const PULLBACK_MS = 2600;

// Volume-view resting camera angles (slightly off-axis, per 03-07).
const VOLUME_AZ = 0.5;
const VOLUME_EL = 0.32;
// Pull-back starts near face-on to the orrery rings (03-02).
const HOME_AZ = 0.12;
const HOME_EL = 0.1;

const ORBIT_SPEED = 0.006; // radians per screen pixel dragged
const EL_LIMIT = 1.35; // clamp elevation so the view never flips

const TAP_MOVE_PX = 10; // a drag beyond this is not a tap
const TAP_MS = 400;
const THUMB_PX = 32; // tap hit radius for source selection

const STAR_TEX_SIZE = 48;
const GLOW_TEX_SIZE = 128;

const MAX_FIELD_LY = 30; // for distance antiquing of catalog stars

// Catalog point sizing (crisp).
const STAR_PX = 2.0;
const STAR_PX_MIN = 0.8;
const STAR_PX_MAX = 3.4;

// Source smudge sizing (soft; radius ∝ 1 − confidence).
const SMUDGE_BASE_PX = 10;
const SMUDGE_GROW_PX = 64;
const SMUDGE_MIN_PX = 8;
const SMUDGE_MAX_PX = 92;

const HOME_PX = 2.6;
const HOME_RING_PX = 9;

/** True-color by spectral class: M dull red → K orange → G yellow-white → F white. */
const SPECTRAL_TINT: Readonly<Record<Star["spectralClass"], number>> = {
  M: 0xcf5b43,
  K: 0xf0a35e,
  G: 0xf7ecc4,
  F: 0xeef1ff,
};

const COLOR_HOME = 0x5fe0e6; // cyan — you, the present tense
const COLOR_SOURCE = 0xdf9b52; // amber — belief / other
const COLOR_SELECT = 0xb79b63; // gold hairline for a selected source
const COLOR_ORRERY = 0xb79b63;
const COLOR_ORRERY_STAR = 0xf6d98f;

/** Callback fired on tap: the selected source, or null when tapping empty sky. */
export type SelectSourceCallback = (source: DetectedSource | null) => void;

interface StarSprite {
  readonly sprite: Sprite;
  readonly pos: Vec3Ly;
  readonly sizeMul: number;
}

interface SourceSprite {
  readonly sprite: Sprite;
  readonly source: DetectedSource;
  readonly pos: Vec3Ly;
}

interface Projected {
  ok: boolean;
  x: number;
  y: number;
  depth: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function length(v: Vec3Ly): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** A white radial-gradient sprite texture, tinted per-sprite at draw time. */
function radialTexture(size: number, stops: readonly [number, number][]): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Model: no 2d context for gradient texture");
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, alpha] of stops) {
    grad.addColorStop(offset, `rgba(255,255,255,${alpha})`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

export class Model {
  private readonly container: HTMLElement;
  private readonly catalog: readonly Star[];

  private readonly root: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly homeLabel: HTMLDivElement;

  private readonly app: Application;
  private ready = false;
  private destroyed = false;

  // Scene layers (built once the renderer is ready).
  private starLayer: Container | null = null;
  private sourceLayer: Container | null = null;
  private orreryGfx: Graphics | null = null;
  private homeGfx: Graphics | null = null;
  private homeMote: Sprite | null = null;
  private selectionGfx: Graphics | null = null;

  private pointTex: Texture | null = null;
  private glowTex: Texture | null = null;

  private stars: StarSprite[] = [];
  private sources: SourceSprite[] = [];

  // Camera.
  private az = VOLUME_AZ;
  private el = VOLUME_EL;
  private dist = DIST_VOLUME;
  private target: Vec3Ly = { x: 0, y: 0, z: 0 };
  private homePos: Vec3Ly = { x: 0, y: 0, z: 0 };

  // Pull-back animation.
  private animating = false;
  private animStart = 0;
  private orreryAlpha = 0;

  // Buffered calls that arrive before the async renderer is ready.
  private pendingSky: { self: SelfView; sources: readonly DetectedSource[] } | null = null;
  private pendingEnter: "pullback" | "resume" | null = null;

  // Interaction.
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private lastOrbit: { x: number; y: number } | null = null;
  private pinchDist = 0;
  private tapDown: { x: number; y: number; t: number; moved: boolean } | null = null;
  private selectedStarId: string | null = null;
  private selectCb: SelectSourceCallback | null = null;

  private readonly sourceScreen = new Map<string, { x: number; y: number }>();
  private readonly proj: Projected = { ok: false, x: 0, y: 0, depth: 0 };

  constructor(container: HTMLElement, catalog: readonly Star[]) {
    this.container = container;
    this.catalog = catalog;

    this.root = document.createElement("div");
    this.root.className = "model-root";

    this.overlay = document.createElement("div");
    this.overlay.className = "model-overlay";

    const caption = document.createElement("div");
    caption.className = "model-caption holos-caps";
    caption.textContent = "THE MODEL — WHAT WE BELIEVE";

    this.homeLabel = document.createElement("div");
    this.homeLabel.className = "model-home-label holos-caps";
    this.homeLabel.textContent = "HOME";
    this.homeLabel.style.opacity = "0";

    this.overlay.append(this.homeLabel, caption);
    this.root.append(this.overlay);
    this.container.append(this.root);

    this.app = new Application();
    void this.init();
  }

  private async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.root,
      background: 0x050409,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, DPR_MAX),
      autoDensity: true,
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    // Canvas sits under the DOM overlay.
    this.root.insertBefore(this.app.canvas, this.overlay);
    this.app.canvas.classList.add("model-canvas");

    this.pointTex = radialTexture(STAR_TEX_SIZE, [
      [0, 1],
      [0.16, 0.95],
      [0.4, 0.24],
      [0.72, 0.04],
      [1, 0],
    ]);
    this.glowTex = radialTexture(GLOW_TEX_SIZE, [
      [0, 1],
      [0.22, 0.52],
      [0.46, 0.17],
      [0.72, 0.035],
      [1, 0],
    ]);

    this.buildLayers();
    this.attachInput();
    this.app.ticker.add(this.tick);
    this.ready = true;

    if (this.pendingSky !== null) {
      this.applySky(this.pendingSky.self, this.pendingSky.sources);
      this.pendingSky = null;
    }
    if (this.pendingEnter !== null) {
      this.applyEnter(this.pendingEnter);
      this.pendingEnter = null;
    }
  }

  private buildLayers(): void {
    const pointTex = this.pointTex;
    if (pointTex === null) return;

    this.orreryGfx = new Graphics();

    this.starLayer = new Container();
    this.starLayer.sortableChildren = true;

    this.sourceLayer = new Container();
    this.sourceLayer.sortableChildren = true;

    this.selectionGfx = new Graphics();

    this.homeGfx = new Graphics();
    this.homeMote = new Sprite(pointTex);
    this.homeMote.anchor.set(0.5);
    this.homeMote.tint = COLOR_HOME;
    this.homeMote.blendMode = "add";

    // Build the catalog star sprites once (the catalog is fixed for a cohort).
    for (const star of this.catalog) {
      const sprite = new Sprite(pointTex);
      sprite.anchor.set(0.5);
      sprite.tint = SPECTRAL_TINT[star.spectralClass];
      sprite.blendMode = "add";
      // Antique with distance from the cohort center: farther = older/fainter.
      const r = clamp(length(star.position) / MAX_FIELD_LY, 0, 1);
      sprite.alpha = lerp(0.95, 0.32, r);
      const sizeMul = lerp(1.1, 0.68, r);
      this.starLayer.addChild(sprite);
      this.stars.push({ sprite, pos: star.position, sizeMul });
    }

    // Draw order: orrery (foreground you pull away from) fades to reveal the
    // volume; stars behind, sources over stars, home + selection on top.
    this.app.stage.addChild(
      this.starLayer,
      this.sourceLayer,
      this.orreryGfx,
      this.selectionGfx,
      this.homeGfx,
      this.homeMote,
    );
  }

  // ── Public API ────────────────────────────────────────────────────────

  /** Update the sky. Called on every `sky` message; safe before ready. */
  setSky(self: SelfView, sources: readonly DetectedSource[]): void {
    if (!this.ready) {
      this.pendingSky = { self, sources };
      return;
    }
    this.applySky(self, sources);
  }

  /**
   * Begin the view. "pullback" plays the one-shot act-opening dolly-out from
   * the home system; "resume" drops straight into the volume. Safe before
   * ready.
   */
  enter(mode: "pullback" | "resume"): void {
    if (!this.ready) {
      this.pendingEnter = mode;
      return;
    }
    this.applyEnter(mode);
  }

  onSelectSource(cb: SelectSourceCallback): void {
    this.selectCb = cb;
  }

  resize(): void {
    if (this.ready) this.app.resize();
  }

  destroy(): void {
    this.destroyed = true;
    // Listeners and the renderer only exist once the async init completed.
    if (this.ready) {
      this.detachInput();
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true });
    }
    this.pointTex?.destroy(true);
    this.glowTex?.destroy(true);
    this.root.remove();
  }

  // ── Sky / enter application ──────────────────────────────────────────

  private applySky(self: SelfView, sources: readonly DetectedSource[]): void {
    const glowTex = this.glowTex;
    const sourceLayer = this.sourceLayer;
    if (glowTex === null || sourceLayer === null) return;

    this.homePos = self.position;
    this.target = self.position; // orbit around HOME; keeps it centered

    // Rebuild the source smudges from scratch (≤ ~24, trivial).
    for (const s of this.sources) s.sprite.destroy();
    this.sources = [];
    this.sourceScreen.clear();

    const byId = new Map<string, Star>();
    for (const star of this.catalog) byId.set(star.id, star);

    for (const source of sources) {
      const star = byId.get(source.starId);
      if (star === undefined) continue; // no catalog position → cannot place
      const sprite = new Sprite(glowTex);
      sprite.anchor.set(0.5);
      sprite.tint = COLOR_SOURCE;
      sprite.blendMode = "add";
      sourceLayer.addChild(sprite);
      this.sources.push({ sprite, source, pos: star.position });
    }

    // Drop a selection that no longer corresponds to a live source.
    if (
      this.selectedStarId !== null &&
      !this.sources.some((s) => s.source.starId === this.selectedStarId)
    ) {
      this.selectedStarId = null;
    }
  }

  private applyEnter(mode: "pullback" | "resume"): void {
    if (mode === "pullback") {
      this.animating = true;
      this.animStart = performance.now();
      this.az = HOME_AZ;
      this.el = HOME_EL;
      this.dist = DIST_HOME;
      this.orreryAlpha = 1;
    } else {
      this.animating = false;
      this.az = VOLUME_AZ;
      this.el = VOLUME_EL;
      this.dist = DIST_VOLUME;
      this.orreryAlpha = 0;
    }
  }

  // ── Projection ────────────────────────────────────────────────────────

  private projectInto(
    px: number,
    py: number,
    pz: number,
    cx: number,
    cy: number,
    focal: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
  ): void {
    const dx = px - this.target.x;
    const dy = py - this.target.y;
    const dz = pz - this.target.z;
    // yaw around Y
    const x1 = dx * cosAz + dz * sinAz;
    const z1 = -dx * sinAz + dz * cosAz;
    // pitch around X
    const y2 = dy * cosEl - z1 * sinEl;
    const z2 = dy * sinEl + z1 * cosEl;
    const depth = this.dist - z2;
    if (depth <= NEAR) {
      this.proj.ok = false;
      return;
    }
    this.proj.ok = true;
    this.proj.x = cx + (focal * x1) / depth;
    this.proj.y = cy - (focal * y2) / depth;
    this.proj.depth = depth;
  }

  // ── Frame loop ────────────────────────────────────────────────────────

  private readonly tick = (): void => {
    if (!this.ready) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const cx = w / 2;
    const cy = h / 2;
    const focal = h * 0.5 / Math.tan(FOV / 2);

    if (this.animating) this.stepPullback();

    const sinAz = Math.sin(this.az);
    const cosAz = Math.cos(this.az);
    const sinEl = Math.sin(this.el);
    const cosEl = Math.cos(this.el);

    // Catalog stars.
    for (const item of this.stars) {
      const p = item.pos;
      this.projectInto(p.x, p.y, p.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
      if (!this.proj.ok) {
        item.sprite.visible = false;
        continue;
      }
      item.sprite.visible = true;
      item.sprite.position.set(this.proj.x, this.proj.y);
      const sizePx = clamp(
        STAR_PX * item.sizeMul * (DIST_VOLUME / this.proj.depth),
        STAR_PX_MIN,
        STAR_PX_MAX,
      );
      item.sprite.scale.set(sizePx / 16);
      item.sprite.zIndex = -this.proj.depth;
    }

    // Detected sources — soft smudges; radius ∝ (1 − confidence).
    this.sourceScreen.clear();
    for (const item of this.sources) {
      const p = item.pos;
      this.projectInto(p.x, p.y, p.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
      if (!this.proj.ok) {
        item.sprite.visible = false;
        continue;
      }
      const conf = clamp(item.source.signal.confidence, 0, 1);
      const radiusPx = clamp(
        (SMUDGE_BASE_PX + (1 - conf) * SMUDGE_GROW_PX) * (DIST_VOLUME / this.proj.depth),
        SMUDGE_MIN_PX,
        SMUDGE_MAX_PX,
      );
      item.sprite.visible = true;
      item.sprite.position.set(this.proj.x, this.proj.y);
      item.sprite.scale.set(radiusPx / (GLOW_TEX_SIZE / 2));
      item.sprite.alpha = 0.22 + conf * 0.5; // core brightens as belief firms
      item.sprite.zIndex = -this.proj.depth;
      this.sourceScreen.set(item.source.starId, { x: this.proj.x, y: this.proj.y });
    }

    this.drawOrrery(cx, cy, focal);
    this.drawHome(cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
    this.drawSelection();
  };

  private stepPullback(): void {
    const t = (performance.now() - this.animStart) / PULLBACK_MS;
    const p = smoothstep(t);
    this.dist = lerp(DIST_HOME, DIST_VOLUME, p);
    this.az = lerp(HOME_AZ, VOLUME_AZ, p);
    this.el = lerp(HOME_EL, VOLUME_EL, p);
    // Rings fade out over the first ~two-thirds of the pull-back.
    this.orreryAlpha = 1 - smoothstep((t - 0.1) / 0.55);
    if (t >= 1) {
      this.animating = false;
      this.orreryAlpha = 0;
    }
  }

  private drawOrrery(cx: number, cy: number, focal: number): void {
    const g = this.orreryGfx;
    if (g === null) return;
    g.clear();
    if (this.orreryAlpha <= 0.001) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const a = this.orreryAlpha;
    // The home system is at the camera target → screen center, depth = dist.
    const scale = focal / this.dist;
    // A few concentric rings + faint spokes + a warm central star (03-02).
    const ringRadii = [1.4, 2.4, 3.6, 5.0];
    for (const rly of ringRadii) {
      g.circle(cx, cy, rly * scale).stroke({
        width: 1,
        color: COLOR_ORRERY,
        alpha: 0.28 * a,
      });
    }
    const spokeR = 5.0 * scale;
    for (let i = 0; i < 4; i++) {
      const ang = (Math.PI / 4) * i;
      const dx = Math.cos(ang) * spokeR;
      const dy = Math.sin(ang) * spokeR;
      g.moveTo(cx - dx, cy - dy)
        .lineTo(cx + dx, cy + dy)
        .stroke({ width: 1, color: COLOR_ORRERY, alpha: 0.1 * a });
    }
    g.circle(cx, cy, Math.max(2, 0.25 * scale)).fill({
      color: COLOR_ORRERY_STAR,
      alpha: 0.9 * a,
    });
  }

  private drawHome(
    cx: number,
    cy: number,
    focal: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
  ): void {
    const gfx = this.homeGfx;
    const mote = this.homeMote;
    if (gfx === null || mote === null) return;

    this.projectInto(
      this.homePos.x,
      this.homePos.y,
      this.homePos.z,
      cx,
      cy,
      focal,
      sinAz,
      cosAz,
      sinEl,
      cosEl,
    );
    gfx.clear();
    if (!this.proj.ok) {
      mote.visible = false;
      this.homeLabel.style.opacity = "0";
      return;
    }
    const x = this.proj.x;
    const y = this.proj.y;

    mote.visible = true;
    mote.position.set(x, y);
    mote.scale.set(HOME_PX / 12);

    // Thin cyan ring — the one present-tense object.
    gfx.circle(x, y, HOME_RING_PX).stroke({ width: 1, color: COLOR_HOME, alpha: 0.85 });
    gfx.circle(x, y, HOME_RING_PX + 3).stroke({ width: 1, color: COLOR_HOME, alpha: 0.18 });

    // Track the DOM HOME label just to the right of the mote (hidden while
    // the rings still dominate the pull-back).
    const labelAlpha = this.animating ? clamp((1 - this.orreryAlpha) * 0.9, 0, 0.75) : 0.75;
    this.homeLabel.style.opacity = String(labelAlpha);
    this.homeLabel.style.transform = `translate(${x + HOME_RING_PX + 8}px, ${y - 8}px)`;
  }

  private drawSelection(): void {
    const g = this.selectionGfx;
    if (g === null) return;
    g.clear();
    if (this.selectedStarId === null) return;
    const at = this.sourceScreen.get(this.selectedStarId);
    if (at === undefined) return;
    g.circle(at.x, at.y, THUMB_PX * 0.9).stroke({ width: 1, color: COLOR_SELECT, alpha: 0.7 });
  }

  // ── Interaction ───────────────────────────────────────────────────────

  private attachInput(): void {
    const c = this.app.canvas;
    c.style.touchAction = "none";
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    c.addEventListener("pointerleave", this.onPointerUp);
  }

  private detachInput(): void {
    const c = this.app.canvas as HTMLCanvasElement | undefined;
    if (c === undefined) return;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    c.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("pointercancel", this.onPointerUp);
    c.removeEventListener("pointerleave", this.onPointerUp);
  }

  private localPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.animating) return; // the pull-back is a cutscene, not a control
    const pt = this.localPoint(e);
    this.pointers.set(e.pointerId, pt);
    if (this.pointers.size === 1) {
      this.lastOrbit = pt;
      this.tapDown = { x: pt.x, y: pt.y, t: performance.now(), moved: false };
    } else {
      // A second finger cancels any pending tap and starts a pinch.
      this.tapDown = null;
      this.lastOrbit = null;
      this.pinchDist = this.pointerSpread();
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const existing = this.pointers.get(e.pointerId);
    if (existing === undefined) return;
    const pt = this.localPoint(e);
    this.pointers.set(e.pointerId, pt);

    if (this.pointers.size >= 2) {
      const spread = this.pointerSpread();
      if (this.pinchDist > 0 && spread > 0) {
        // "Pinch out to the sky": spreading fingers dollies out to the volume.
        this.dist = clamp(this.dist * (spread / this.pinchDist), DIST_HOME, DIST_VOLUME);
      }
      this.pinchDist = spread;
      return;
    }

    if (this.lastOrbit !== null) {
      const dx = pt.x - this.lastOrbit.x;
      const dy = pt.y - this.lastOrbit.y;
      this.az -= dx * ORBIT_SPEED;
      this.el = clamp(this.el + dy * ORBIT_SPEED, -EL_LIMIT, EL_LIMIT);
      this.lastOrbit = pt;
      if (this.tapDown !== null) {
        const md = Math.hypot(pt.x - this.tapDown.x, pt.y - this.tapDown.y);
        if (md > TAP_MOVE_PX) this.tapDown.moved = true;
      }
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    const had = this.pointers.delete(e.pointerId);
    if (!had) return;

    // Resolve a tap → source selection.
    if (this.pointers.size === 0 && this.tapDown !== null) {
      const { x, y, t, moved } = this.tapDown;
      this.tapDown = null;
      this.lastOrbit = null;
      if (!moved && performance.now() - t <= TAP_MS) {
        this.selectAt(x, y);
      }
      return;
    }

    // Dropping from two fingers to one: hand control back to orbit cleanly.
    if (this.pointers.size === 1) {
      const remaining = [...this.pointers.values()][0];
      this.lastOrbit = remaining ?? null;
      this.pinchDist = 0;
    } else {
      this.lastOrbit = null;
    }
    this.tapDown = null;
  };

  private pointerSpread(): number {
    const pts = [...this.pointers.values()];
    const a = pts[0];
    const b = pts[1];
    if (a === undefined || b === undefined) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private selectAt(x: number, y: number): void {
    let bestId: string | null = null;
    let bestDist = THUMB_PX;
    for (const [starId, at] of this.sourceScreen) {
      const d = Math.hypot(at.x - x, at.y - y);
      if (d < bestDist) {
        bestDist = d;
        bestId = starId;
      }
    }
    this.selectedStarId = bestId;
    const hit = bestId === null ? null : this.sources.find((s) => s.source.starId === bestId);
    this.selectCb?.(hit?.source ?? null);
  }
}
