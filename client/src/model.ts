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
// Behind all of that is THE COSMOS (cosmos.ts) — the Milky Way as a particle
// disk we are standing inside, the Local Group at its real distances, and the
// cosmic web out to a few hundred megaparsecs' worth of light-years. It is
// scenery: never tappable, never sent over the wire, and colored so it can
// never be mistaken for the game. The zoom runs from 4 ly to 4×10⁸ ly and the
// layers hand off to each other by camera distance, so pulling back far
// enough turns the neighborhood into a band of the galaxy, then the galaxy
// into one spiral among the Local Group, then that into a knot of the web.
//
// Text stays in the DOM overlay (canvas for places, DOM for prose): the
// tracking HOME label, the landmark names, and the scale readout.

import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { DetectedSource, SelfView, Star, Vec3Ly } from "@holos/protocol";
import {
  buildCosmos,
  buildGalaxyCanvases,
  cosmosLandmarks,
  GALAXY_TEX_SIZE,
  milkyWayBillboard,
  type CosmosBillboard,
  type CosmosGalaxy,
  type CosmosGlow,
  type CosmosLandmark,
  type CosmosParticle,
} from "./cosmos";

// ── Tuning ────────────────────────────────────────────────────────────────

const FOV = 0.95; // vertical field of view, radians (~54°)
const NEAR = 0.5; // near clip in light-years of camera depth
const DPR_MAX = 2;

const DIST_HOME = 5; // dolly distance close on the home system (orrery)
const DIST_VOLUME = 60; // dolly distance out in the parallax volume
const PULLBACK_MS = 2600;

// The whole range the camera can reach: from inside the home system to far
// enough out that the cosmic web is a texture. Zoom is multiplicative in
// both gestures, so crossing eight orders of magnitude is a handful of
// pinches rather than a scroll marathon.
const DIST_MIN = 4;
const DIST_MAX = 4e8;
/** Wheel zoom rate — one notch (~100 deltaY) is about ×1.15. */
const WHEEL_K = 0.0014;

// ── Layer hand-off ────────────────────────────────────────────────────────
//
// Every band below is a pair of camera distances in light-years, crossfaded
// with a smoothstep in LOG space — the only space in which "300 to 3,000" and
// "2 million to 20 million" are the same size of transition.

/** The game itself — catalog stars, source smudges, the HOME text label.
 *  Gone by 3,000 ly, where a 25 ly neighborhood is a single point anyway. */
const NEAR_FADE_LO = 300;
const NEAR_FADE_HI = 3_000;
/** The Milky Way never leaves (it IS the night sky) but it sits back while
 *  the game is on screen, so the catalog stays the brightest thing there. */
const MW_DIM_LO = 300;
const MW_DIM_HI = 20_000;
const MW_DIM_NEAR = 0.55;
/** The Local Group arrives once our own galaxy starts to be an object. */
const LG_FADE_LO = 20_000;
const LG_FADE_HI = 200_000;
/** The web arrives once the Local Group is a huddle. */
const WEB_FADE_LO = 2e6;
const WEB_FADE_HI = 2e7;
/** GALACTIC CENTER only wants naming once the neighborhood has gone. Each
 *  landmark carries its own fade-OUT band (cosmos.ts, `labelOut`), so a name
 *  dies while the thing it names is still a separate thing on screen. */
const GC_LABEL_LO = 2_000;
const GC_LABEL_HI = 10_000;
/** Where the Milky Way stops being a place we are inside and becomes one more
 *  galaxy in the huddle: the particle disk hands off to a single sprite. */
const MW_BILLBOARD_LO = 1.2e6;
const MW_BILLBOARD_HI = 4e6;
/** How far out the cyan HOME ring starts standing down. It never vanishes —
 *  it is the way back — but at half a billion light-years it must not be the
 *  loudest thing in the universe. */
const HOME_SOFT_LO = 1e4;
const HOME_SOFT_HI = 1e6;

// Backdrop sizing. Milky Way particles are point sources: their drawn size
// barely tracks depth (a star does not swell because you flew nearer a
// different arm), it only gives the near side of the disk some presence.
const MW_SIZE_REF_LY = 26_000;
const MW_PX_MIN = 0.9;
const MW_PX_MAX = 3.0;
/**
 * Point-splat flux conservation. A splat that has hit MW_PX_MIN cannot get
 * any smaller, so past that point its brightness has to fall instead — the
 * standard trick, and the reason the disk stops burning white. The knee is
 * where the floor starts binding for every particle at once (the disk is
 * 100 kly across and 26 kly off-center, so by 300 kly the whole thing is
 * outside the camera and shrinking together); inside it nothing changes at
 * all, which is the promise the near views are owed. Beyond it the alpha
 * carries the honest inverse-square, which holds SURFACE brightness constant
 * as the disk shrinks — the galaxy looks the same, just smaller.
 */
const MW_FLUX_KNEE_LY = 300_000;
/**
 * Galaxies are real objects with a real diameter, so they project honestly.
 * Below RESOLVE_PX the 256 px galaxy texture is minified so hard that whether
 * a sprite samples its own core is a coin flip, and a field of them shimmers
 * into nothing — so under that size a galaxy stops being drawn as a disk and
 * becomes what an unresolved galaxy actually is: a point source. The mote is
 * sized to carry the same flux the disk had at the hand-off, so the swap is a
 * change of shape and not of brightness.
 */
const GALAXY_RESOLVE_PX = 10;
const GALAXY_MOTE_PX = 6.3;
const GALAXY_PX_MAX = 2_600;
/** A galaxy's drawn diameter against its catalog one. Galaxies are bigger
 *  than the isophote they are measured to, and the payoff scales need the
 *  Local Group to read as galaxies rather than as dust. */
const GALAXY_DISPLAY_MUL = 1.9;
/** The display stretch every deep-field image has: a lift on the tier's own
 *  alphas, and a floor under how far a mote may dim, so the far side of the
 *  web reads as structure instead of as noise. Both are honest about what
 *  they are — presentation, not physics. */
const GALAXY_GAIN = 2;
const GALAXY_MOTE_FLOOR = 0.18;

// Volume-view resting camera angles (slightly off-axis, per 03-07).
const VOLUME_AZ = 0.5;
const VOLUME_EL = 0.32;
// Pull-back starts near face-on to the orrery rings (03-02).
const HOME_AZ = 0.12;
const HOME_EL = 0.1;

const ORBIT_SPEED = 0.006; // radians per screen pixel dragged
const EL_LIMIT = 1.35; // clamp elevation so the view never flips

// Tap tolerances, set for a thumb rather than a mouse. Movement — not
// duration — is what separates a tap from an orbit: aiming carefully at a
// distant smudge takes real time, and discarding those taps made sources
// feel inert (every near-miss became a small rotation instead).
const TAP_MOVE_PX = 16; // a drag beyond this is not a tap
const TAP_MS = 900;
/** Floor for the tap hit radius; a smudge drawn larger is tappable to its
 *  full drawn radius (see sourceScreen) — what looks like the source IS the
 *  target, and an uncertain source is a big soft one. */
const THUMB_PX = 32;

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
// Pale cyan, not warm: the home system is you, the one present-tense place
// (cyan = own civ), and the orrery star hands off to the cyan HOME mote.
const COLOR_ORRERY_STAR = 0x9fe8ec;

/** Callback fired on tap: the selected source, or null when tapping empty sky. */
export type SelectSourceCallback = (source: DetectedSource | null) => void;

interface StarSprite {
  readonly sprite: Sprite;
  readonly pos: Vec3Ly;
  readonly sizeMul: number;
  /** F and G stars get a second, much softer sprite under the point, so the
   *  bright end of the catalog reads as a star with light around it rather
   *  than as a slightly larger dot. */
  readonly halo: Sprite | null;
}

/** A backdrop star. Screen-sized, since it is a point source. */
interface ParticleSprite {
  readonly sprite: Sprite;
  readonly item: CosmosParticle;
}

/** A backdrop haze. World-sized, so perspective inflates it as you approach. */
interface GlowSprite {
  readonly sprite: Sprite;
  readonly item: CosmosGlow;
}

/** A backdrop galaxy. World-sized, for the same reason. `tex` is kept so the
 *  sprite can swap back to its disk after a spell as an unresolved mote. */
interface GalaxySprite {
  readonly sprite: Sprite;
  readonly item: CosmosGalaxy;
  readonly tex: Texture;
}

/** A DOM overlay name for one of the ~8 places worth naming. */
interface LandmarkLabel {
  readonly el: HTMLDivElement;
  readonly mark: CosmosLandmark;
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

/** A layer's presence at camera distance `d`, crossfading over [lo, hi] in
 *  log space: 0 at or below lo, 1 at or above hi. Every backdrop hand-off is
 *  written with this so the bands read as equal-sized steps, not as one long
 *  fade followed by a cliff. */
function fadeIn(d: number, lo: number, hi: number): number {
  return smoothstep(Math.log(Math.max(d, 1e-6) / lo) / Math.log(hi / lo));
}

/** The scale readout's number: an honest distance, never a zoom percentage. */
function formatDistance(ly: number): string {
  const unit = (v: number, suffix: string): string =>
    `${v < 10 ? v.toFixed(1) : String(Math.round(v))} ${suffix}`;
  if (ly < 1e3) return unit(ly, "ly");
  if (ly < 1e6) return unit(ly / 1e3, "kly");
  if (ly < 1e9) return unit(ly / 1e6, "Mly");
  return unit(ly / 1e9, "Gly");
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
  private readonly scaleLabel: HTMLDivElement;
  private readonly landmarks: LandmarkLabel[] = [];

  private readonly app: Application;
  private ready = false;
  private destroyed = false;

  // Scene layers (built once the renderer is ready). One container per
  // backdrop tier, so hiding a tier is a single `visible = false` rather than
  // a walk over several thousand sprites.
  private mwLayer: Container | null = null;
  private webLayer: Container | null = null;
  private lgLayer: Container | null = null;
  private haloLayer: Container | null = null;
  private starLayer: Container | null = null;
  private sourceLayer: Container | null = null;
  private orreryGfx: Graphics | null = null;
  private homeGfx: Graphics | null = null;
  private homeMote: Sprite | null = null;
  private selectionGfx: Graphics | null = null;

  private pointTex: Texture | null = null;
  private glowTex: Texture | null = null;
  private galaxyTex: Texture[] = [];

  private stars: StarSprite[] = [];
  private sources: SourceSprite[] = [];

  // The backdrop. Static in world space, so it is re-projected only when the
  // camera actually moved (see cameraMoved) — otherwise a still sky costs
  // nothing per frame no matter how many thousand sprites are in it.
  private mwParticles: ParticleSprite[] = [];
  private mwGlows: GlowSprite[] = [];
  private lgGalaxies: GalaxySprite[] = [];
  private webGalaxies: GalaxySprite[] = [];
  private mwBillboard: { sprite: Sprite; item: CosmosBillboard; tex: Texture } | null = null;
  private readonly camCache = {
    az: NaN,
    el: NaN,
    dist: NaN,
    tx: NaN,
    ty: NaN,
    tz: NaN,
    w: NaN,
    h: NaN,
  };

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

  // Screen position AND drawn radius per source, refreshed every frame: the
  // hit test reads the radius so the tappable area is exactly what the player
  // can see (smudges range from 8 to 92 px).
  private readonly sourceScreen = new Map<string, { x: number; y: number; r: number }>();
  private readonly proj: Projected = { ok: false, x: 0, y: 0, depth: 0 };

  constructor(container: HTMLElement, catalog: readonly Star[]) {
    this.container = container;
    this.catalog = catalog;

    this.root = document.createElement("div");
    this.root.className = "model-root";

    this.overlay = document.createElement("div");
    this.overlay.className = "model-overlay";

    this.homeLabel = document.createElement("div");
    this.homeLabel.className = "model-home-label holos-caps";
    this.homeLabel.textContent = "HOME";
    this.homeLabel.style.opacity = "0";

    // The names of the places out there. Faint, capped, and each one only
    // present while the tier it belongs to is faded in.
    for (const mark of cosmosLandmarks()) {
      const el = document.createElement("div");
      el.className = "model-landmark-label holos-caps";
      el.textContent = mark.name;
      el.style.opacity = "0";
      this.landmarks.push({ el, mark });
      this.overlay.append(el);
    }

    // Where you are, in light-years. The zoom crosses eight orders of
    // magnitude; without this the sky stops meaning anything in the middle.
    this.scaleLabel = document.createElement("div");
    this.scaleLabel.className = "model-scale holos-caps";
    this.scaleLabel.textContent = formatDistance(this.dist);

    this.overlay.append(this.homeLabel, this.scaleLabel);
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
    this.galaxyTex = buildGalaxyCanvases().map((canvas) => Texture.from(canvas));

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
    const glowTex = this.glowTex;
    if (pointTex === null || glowTex === null) return;

    this.orreryGfx = new Graphics();

    const tiers = this.buildCosmos(pointTex, glowTex);
    this.mwLayer = tiers.mw;
    this.lgLayer = tiers.lg;
    this.webLayer = tiers.web;

    this.haloLayer = new Container();
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
      // The bright classes carry a halo. Only F and G: an M dwarf that
      // glowed would be a lie about which stars in the field are luminous.
      let halo: Sprite | null = null;
      if (star.spectralClass === "F" || star.spectralClass === "G") {
        halo = new Sprite(glowTex);
        halo.anchor.set(0.5);
        halo.tint = SPECTRAL_TINT[star.spectralClass];
        halo.blendMode = "add";
        halo.alpha = (star.spectralClass === "F" ? 0.2 : 0.13) * lerp(1, 0.35, r);
        this.haloLayer.addChild(halo);
      }
      this.stars.push({ sprite, pos: star.position, sizeMul, halo });
    }

    // Draw order: the cosmos furthest back (web, then the Local Group, then
    // our own galaxy — order is cosmetic under additive blending, but this is
    // the order the distances are in); orrery (the foreground you pull away
    // from) fades to reveal the volume; stars over the backdrop, sources over
    // stars, home + selection on top.
    this.app.stage.addChild(
      tiers.web,
      tiers.lg,
      tiers.mw,
      this.haloLayer,
      this.starLayer,
      this.sourceLayer,
      this.orreryGfx,
      this.selectionGfx,
      this.homeGfx,
      this.homeMote,
    );
  }

  /** Instantiate the backdrop's sprites from cosmos.ts's data. Runs once. */
  private buildCosmos(
    pointTex: Texture,
    glowTex: Texture,
  ): { mw: Container; lg: Container; web: Container } {
    const cosmos = buildCosmos();

    // Tier A — the Milky Way. No sortableChildren here or on the web layer:
    // every sprite is additive, so draw order is invisible, and sorting six
    // thousand children on every camera move is the one thing that would
    // cost real milliseconds on a phone.
    const mw = new Container();
    for (const item of cosmos.milkyWay) {
      const sprite = new Sprite(pointTex);
      sprite.anchor.set(0.5);
      sprite.tint = item.tint;
      sprite.alpha = item.alpha;
      sprite.blendMode = "add";
      mw.addChild(sprite);
      this.mwParticles.push({ sprite, item });
    }
    for (const item of cosmos.glows) {
      const sprite = new Sprite(glowTex);
      sprite.anchor.set(0.5);
      sprite.tint = item.tint;
      sprite.alpha = item.alpha;
      sprite.blendMode = "add";
      mw.addChild(sprite);
      this.mwGlows.push({ sprite, item });
    }

    // Tier B — the Local Group. Few enough to sort properly, and the one tier
    // where overlap actually happens (M31 and its dwarfs share a patch of sky).
    const lg = new Container();
    lg.sortableChildren = true;
    for (const item of cosmos.localGroup) {
      lg.addChild(this.makeGalaxySprite(item, this.lgGalaxies));
    }
    // Our own galaxy joins the huddle once it is small enough to be one of
    // them. It rides in the Local Group's layer because that is what it is a
    // member of, and because that layer sorts by depth.
    const bb = milkyWayBillboard();
    const bbTex = this.galaxyTex[bb.tex] ?? this.galaxyTex[0] ?? Texture.WHITE;
    const bbSprite = new Sprite(bbTex);
    bbSprite.anchor.set(0.5);
    bbSprite.tint = bb.tint;
    bbSprite.blendMode = "add";
    bbSprite.visible = false;
    lg.addChild(bbSprite);
    this.mwBillboard = { sprite: bbSprite, item: bb, tex: bbTex };

    // Tier C — the cosmic web.
    const web = new Container();
    for (const item of cosmos.web) {
      web.addChild(this.makeGalaxySprite(item, this.webGalaxies));
    }

    return { mw, lg, web };
  }

  private makeGalaxySprite(item: CosmosGalaxy, into: GalaxySprite[]): Sprite {
    const tex = this.galaxyTex[item.tex] ?? this.galaxyTex[0] ?? Texture.WHITE;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.tint = item.tint;
    sprite.alpha = item.alpha;
    sprite.rotation = item.rotation;
    sprite.blendMode = "add";
    into.push({ sprite, item, tex });
    return sprite;
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

  /** Deselect without a tap (e.g. the source card's own backdrop/swipe-down
   * dismiss). Does not fire onSelectSource — the closer already knows. */
  clearSelection(): void {
    this.selectedStarId = null;
  }

  /** Select without a tap — the observatory's explore list picks a source by
   * id, and the sky's ring should agree with what the player just chose.
   * Does not fire onSelectSource, for the same reason clearSelection doesn't:
   * the caller is the one driving. */
  selectStar(starId: string): void {
    this.selectedStarId = this.sources.some((s) => s.source.starId === starId)
      ? starId
      : null;
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
    for (const tex of this.galaxyTex) tex.destroy(true);
    this.galaxyTex = [];
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

    // Drop a selection that no longer corresponds to a live source (and tell
    // whoever opened a card off it that there is nothing left to show).
    if (
      this.selectedStarId !== null &&
      !this.sources.some((s) => s.source.starId === this.selectedStarId)
    ) {
      this.selectedStarId = null;
      this.selectCb?.(null);
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

    // How much of the game itself is still on screen. Below this threshold
    // the neighborhood is a single point and everything in it — stars,
    // smudges, the HOME word — stops being drawn AND stops being tappable:
    // an invisible source that still answers a thumb is a trap.
    const nearAlpha = 1 - fadeIn(this.dist, NEAR_FADE_LO, NEAR_FADE_HI);
    const nearVisible = nearAlpha > 0.004;

    const starLayer = this.starLayer;
    const haloLayer = this.haloLayer;
    const sourceLayer = this.sourceLayer;
    if (starLayer !== null) starLayer.visible = nearVisible;
    if (haloLayer !== null) haloLayer.visible = nearVisible;
    if (sourceLayer !== null) sourceLayer.visible = nearVisible;

    if (!nearVisible) {
      this.sourceScreen.clear();
    } else {
      if (starLayer !== null) starLayer.alpha = nearAlpha;
      if (haloLayer !== null) haloLayer.alpha = nearAlpha;
      if (sourceLayer !== null) sourceLayer.alpha = nearAlpha;

      // Catalog stars.
      for (const item of this.stars) {
        const p = item.pos;
        this.projectInto(p.x, p.y, p.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
        if (!this.proj.ok) {
          item.sprite.visible = false;
          if (item.halo !== null) item.halo.visible = false;
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
        if (item.halo !== null) {
          item.halo.visible = true;
          item.halo.position.set(this.proj.x, this.proj.y);
          item.halo.scale.set((sizePx * 3.2) / (GLOW_TEX_SIZE / 2));
        }
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
        this.sourceScreen.set(item.source.starId, {
          x: this.proj.x,
          y: this.proj.y,
          r: radiusPx,
        });
      }
    }

    // The backdrop is static in world space, so it only earns its projection
    // when the camera actually moved (or the window resized). A still sky
    // costs nothing per frame however many thousand sprites are in it.
    if (this.cameraMoved(w, h)) {
      this.projectBackdrop(cx, cy, focal, w, h, sinAz, cosAz, sinEl, cosEl);
    }

    this.drawOrrery(cx, cy, focal);
    this.drawHome(cx, cy, focal, sinAz, cosAz, sinEl, cosEl, nearAlpha);
    this.drawSelection();
  };

  /** True when anything that changes the projection has changed since the
   *  last call — and latches the new values, so it is a one-shot. */
  private cameraMoved(w: number, h: number): boolean {
    const c = this.camCache;
    if (
      c.az === this.az &&
      c.el === this.el &&
      c.dist === this.dist &&
      c.tx === this.target.x &&
      c.ty === this.target.y &&
      c.tz === this.target.z &&
      c.w === w &&
      c.h === h
    ) {
      return false;
    }
    c.az = this.az;
    c.el = this.el;
    c.dist = this.dist;
    c.tx = this.target.x;
    c.ty = this.target.y;
    c.tz = this.target.z;
    c.w = w;
    c.h = h;
    return true;
  }

  /** Culling, done here rather than with Pixi's `cullable` flag: that needs
   *  the CullerPlugin registered and then walks the tree itself, whereas the
   *  projection pass already has the screen position in hand and can drop a
   *  sprite for free. Cheapest possible test, on the frame that computes it. */
  private offscreen(x: number, y: number, w: number, h: number, margin: number): boolean {
    return x < -margin || y < -margin || x > w + margin || y > h + margin;
  }

  // ── The backdrop pass ─────────────────────────────────────────────────

  private projectBackdrop(
    cx: number,
    cy: number,
    focal: number,
    w: number,
    h: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
  ): void {
    // The Milky Way is always there — it is the night sky, not a zoom level.
    // It only stands down in brightness while the game is on screen.
    // ...until the point where it is not the night sky any more but one more
    // galaxy, and the billboard takes it over.
    const mwFar = fadeIn(this.dist, MW_BILLBOARD_LO, MW_BILLBOARD_HI);
    const mwAlpha =
      lerp(MW_DIM_NEAR, 1, fadeIn(this.dist, MW_DIM_LO, MW_DIM_HI)) * (1 - mwFar);
    const lgAlpha = fadeIn(this.dist, LG_FADE_LO, LG_FADE_HI);
    const webAlpha = fadeIn(this.dist, WEB_FADE_LO, WEB_FADE_HI);

    const mw = this.mwLayer;
    if (mw !== null) {
      mw.visible = mwAlpha > 0.004;
    }
    if (mw !== null && mw.visible) {
      mw.alpha = mwAlpha;
      for (const p of this.mwParticles) {
        const pos = p.item.pos;
        this.projectInto(pos.x, pos.y, pos.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
        if (!this.proj.ok) {
          p.sprite.visible = false;
          continue;
        }
        // Point sources: size tracks depth only weakly, so the near arm has
        // some presence without the far side of the disk dissolving.
        const sizePx = clamp(
          p.item.sizePx * Math.pow(MW_SIZE_REF_LY / this.proj.depth, 0.3),
          MW_PX_MIN,
          MW_PX_MAX,
        );
        // Past the knee the splat cannot shrink any further, so the flux comes
        // out of the alpha instead. Without this, five thousand floored
        // sprites pile onto the same forty pixels and the galaxy burns to a
        // solid white lens the moment it is more than a megalight-year away.
        const flux = Math.min(1, (MW_FLUX_KNEE_LY / this.proj.depth) ** 2);
        if (flux <= 0) {
          p.sprite.visible = false;
          continue;
        }
        if (this.offscreen(this.proj.x, this.proj.y, w, h, sizePx * 4 + 8)) {
          p.sprite.visible = false;
          continue;
        }
        p.sprite.visible = true;
        p.sprite.position.set(this.proj.x, this.proj.y);
        p.sprite.scale.set(sizePx / 16);
        p.sprite.alpha = p.item.alpha * flux;
      }
      for (const g of this.mwGlows) {
        const pos = g.item.pos;
        this.projectInto(pos.x, pos.y, pos.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
        if (!this.proj.ok) {
          g.sprite.visible = false;
          continue;
        }
        const radiusPx = (focal * (g.item.sizeLy / 2)) / this.proj.depth;
        if (this.offscreen(this.proj.x, this.proj.y, w, h, radiusPx + 8)) {
          g.sprite.visible = false;
          continue;
        }
        g.sprite.visible = true;
        g.sprite.position.set(this.proj.x, this.proj.y);
        g.sprite.scale.set(radiusPx / (GLOW_TEX_SIZE / 2));
      }
    }

    this.projectGalaxies(
      this.lgLayer, this.lgGalaxies, lgAlpha, true,
      cx, cy, focal, w, h, sinAz, cosAz, sinEl, cosEl,
    );
    this.projectMilkyWayBillboard(cx, cy, focal, w, h, sinAz, cosAz, sinEl, cosEl, mwFar);
    this.projectGalaxies(
      this.webLayer, this.webGalaxies, webAlpha, false,
      cx, cy, focal, w, h, sinAz, cosAz, sinEl, cosEl,
    );

    this.updateLandmarks(cx, cy, focal, w, h, sinAz, cosAz, sinEl, cosEl, lgAlpha, webAlpha);
    this.scaleLabel.textContent = formatDistance(this.dist);
  }

  private projectGalaxies(
    layer: Container | null,
    items: readonly GalaxySprite[],
    tierAlpha: number,
    sorted: boolean,
    cx: number,
    cy: number,
    focal: number,
    w: number,
    h: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
  ): void {
    if (layer === null) return;
    // A tier that has faded out is one property, not a loop over a thousand
    // sprites — which is the whole reason each tier is its own container.
    layer.visible = tierAlpha > 0.004;
    if (!layer.visible) return;
    layer.alpha = tierAlpha;
    const moteTex = this.pointTex;
    for (const g of items) {
      const pos = g.item.pos;
      this.projectInto(pos.x, pos.y, pos.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
      if (!this.proj.ok) {
        g.sprite.visible = false;
        continue;
      }
      const rawPx = (focal * g.item.baseSizeLy * GALAXY_DISPLAY_MUL) / this.proj.depth;
      const reach = Math.max(rawPx * 0.6, GALAXY_MOTE_PX) + 8;
      if (this.offscreen(this.proj.x, this.proj.y, w, h, reach)) {
        g.sprite.visible = false;
        continue;
      }
      g.sprite.visible = true;
      g.sprite.position.set(this.proj.x, this.proj.y);
      this.drawGalaxy(g.sprite, g.tex, moteTex, rawPx, rawPx, g.item.rotation, g.item.alpha);
      if (sorted) g.sprite.zIndex = -this.proj.depth;
    }
  }

  /**
   * One galaxy, at whichever of its two readings its drawn size has earned: a
   * resolved disk with an orientation, or — below GALAXY_RESOLVE_PX, where the
   * 256 px texture is minified past the point of sampling its own core — the
   * point source an unresolved galaxy is. `majorPx`/`minorPx` are the drawn
   * ellipse; they are equal for everything except our own galaxy, which is the
   * one whose inclination we know because we are sitting in it.
   */
  private drawGalaxy(
    sprite: Sprite,
    tex: Texture,
    moteTex: Texture | null,
    majorPx: number,
    minorPx: number,
    rotation: number,
    alpha: number,
  ): void {
    const lit = Math.min(1, alpha * GALAXY_GAIN);
    const extent = Math.max(majorPx, minorPx);
    if (extent >= GALAXY_RESOLVE_PX || moteTex === null) {
      if (sprite.texture !== tex) sprite.texture = tex;
      sprite.rotation = rotation;
      sprite.scale.set(
        Math.min(majorPx, GALAXY_PX_MAX) / GALAXY_TEX_SIZE,
        Math.min(minorPx, GALAXY_PX_MAX) / GALAXY_TEX_SIZE,
      );
      sprite.alpha = lit;
      return;
    }
    if (sprite.texture !== moteTex) sprite.texture = moteTex;
    sprite.rotation = 0;
    sprite.scale.set(GALAXY_MOTE_PX / STAR_TEX_SIZE);
    // The mote holds the disk's flux at the hand-off and dims from there on a
    // square-root stretch rather than the raw inverse square — the same
    // compression every deep-field image is printed with, and the reason the
    // far half of the web is structure instead of an empty frame.
    sprite.alpha = lit * clamp(extent / GALAXY_RESOLVE_PX, GALAXY_MOTE_FLOOR, 1);
  }

  /** Our own galaxy, once it is far enough away to be a sprite (see
   *  cosmos.ts's milkyWayBillboard). Its two in-plane axes are projected
   *  alongside its center, and the pair spans the ellipse the disk makes on
   *  screen — so it arrives already inclined the way the particles were. */
  private projectMilkyWayBillboard(
    cx: number,
    cy: number,
    focal: number,
    w: number,
    h: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
    farAlpha: number,
  ): void {
    const bb = this.mwBillboard;
    if (bb === null) return;
    if (farAlpha <= 0.004) {
      bb.sprite.visible = false;
      return;
    }
    const p = bb.item.pos;
    this.projectInto(p.x, p.y, p.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
    if (!this.proj.ok) {
      bb.sprite.visible = false;
      return;
    }
    const x0 = this.proj.x;
    const y0 = this.proj.y;
    const depth = this.proj.depth;

    const u = bb.item.axisU;
    this.projectInto(p.x + u.x, p.y + u.y, p.z + u.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
    if (!this.proj.ok) {
      bb.sprite.visible = false;
      return;
    }
    const ax = this.proj.x - x0;
    const ay = this.proj.y - y0;

    const v = bb.item.axisV;
    this.projectInto(p.x + v.x, p.y + v.y, p.z + v.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
    if (!this.proj.ok) {
      bb.sprite.visible = false;
      return;
    }
    const bx = this.proj.x - x0;
    const by = this.proj.y - y0;

    // Along the first axis, and across it: the component of the second axis
    // perpendicular to the first is the disk's foreshortened width.
    const la = Math.hypot(ax, ay);
    const across = la > 1e-6 ? Math.abs(ax * by - ay * bx) / la : Math.hypot(bx, by);
    const majorPx = 2 * la * GALAXY_DISPLAY_MUL;
    const minorPx = 2 * across * GALAXY_DISPLAY_MUL;

    const reach = Math.max(majorPx, minorPx, GALAXY_MOTE_PX) * 0.6 + 8;
    if (this.offscreen(x0, y0, w, h, reach)) {
      bb.sprite.visible = false;
      return;
    }
    bb.sprite.visible = true;
    bb.sprite.position.set(x0, y0);
    bb.sprite.zIndex = -depth;
    this.drawGalaxy(
      bb.sprite,
      bb.tex,
      this.pointTex,
      majorPx,
      minorPx,
      Math.atan2(ay, ax),
      bb.item.alpha,
    );
    bb.sprite.alpha *= farAlpha;
  }

  /** The ~8 named places. Each label lives only while its tier is faded in
   *  and its object is actually on screen — a name floating over nothing is
   *  worse than no name. */
  private updateLandmarks(
    cx: number,
    cy: number,
    focal: number,
    w: number,
    h: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
    lgAlpha: number,
    webAlpha: number,
  ): void {
    const gcAlpha = fadeIn(this.dist, GC_LABEL_LO, GC_LABEL_HI);
    for (const { el, mark } of this.landmarks) {
      const inAlpha =
        mark.tier === "milkyway" ? gcAlpha : mark.tier === "localgroup" ? lgAlpha : webAlpha;
      // ...and out again, on the object's own scale. A name has to be gone
      // while what it names is still separable: keep GALACTIC CENTER past a
      // megalight-year and it lands on top of both Magellanic Clouds, and
      // three names on one dot is unreadable in a way no fade can rescue.
      const out = mark.labelOut;
      const tierAlpha = out === null ? inAlpha : inAlpha * (1 - fadeIn(this.dist, out[0], out[1]));
      if (tierAlpha <= 0.02) {
        el.style.opacity = "0";
        continue;
      }
      const p = mark.pos;
      this.projectInto(p.x, p.y, p.z, cx, cy, focal, sinAz, cosAz, sinEl, cosEl);
      if (!this.proj.ok || this.offscreen(this.proj.x, this.proj.y, w, h, 0)) {
        el.style.opacity = "0";
        continue;
      }
      el.style.opacity = String(0.7 * tierAlpha);
      el.style.transform = `translate(${this.proj.x + 10}px, ${this.proj.y - 8}px)`;
    }
  }

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
    nearAlpha: number,
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

    // HOME is the way back, so it is drawn at a fixed pixel size at every
    // zoom — from four light-years to four hundred million, the cyan mote is
    // always findable. What it does give up at extreme distance is loudness:
    // the ring stands down so it stops being the brightest thing in a sky
    // that by then contains a hundred thousand galaxies.
    const homeSoft = 1 - 0.72 * fadeIn(this.dist, HOME_SOFT_LO, HOME_SOFT_HI);

    mote.visible = true;
    mote.position.set(x, y);
    mote.scale.set(HOME_PX / 12);
    mote.alpha = clamp(homeSoft + 0.28, 0, 1);

    // Thin cyan ring — the one present-tense object.
    gfx
      .circle(x, y, HOME_RING_PX)
      .stroke({ width: 1, color: COLOR_HOME, alpha: 0.85 * homeSoft });
    gfx
      .circle(x, y, HOME_RING_PX + 3)
      .stroke({ width: 1, color: COLOR_HOME, alpha: 0.18 * homeSoft });

    // Track the DOM HOME label just to the right of the mote (hidden while
    // the rings still dominate the pull-back, and gone once the neighborhood
    // it names has faded out from under it).
    const base = this.animating ? clamp((1 - this.orreryAlpha) * 0.9, 0, 0.75) : 0.75;
    const labelAlpha = base * nearAlpha;
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
    // Ring the smudge at its drawn size, so the selection reads as "this
    // source" rather than a fixed badge floating over a larger blot.
    const ring = Math.max(THUMB_PX, at.r) * 0.9;
    g.circle(at.x, at.y, ring).stroke({ width: 1, color: COLOR_SELECT, alpha: 0.7 });
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
    // Desktop's pinch. Not passive: the page must not scroll under a zoom.
    c.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private detachInput(): void {
    const c = this.app.canvas as HTMLCanvasElement | undefined;
    if (c === undefined) return;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    c.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("pointercancel", this.onPointerUp);
    c.removeEventListener("pointerleave", this.onPointerUp);
    c.removeEventListener("wheel", this.onWheel);
  }

  /** Wheel zoom. Multiplicative like the pinch, so one notch is the same
   *  fraction of the way out whether you are inside the orrery or halfway to
   *  Coma. deltaMode normalizes Firefox's line/page units to pixels. */
  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.animating) return; // the pull-back is a cutscene, not a control
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    this.dist = clamp(this.dist * Math.exp(e.deltaY * unit * WHEEL_K), DIST_MIN, DIST_MAX);
  };

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
        // "Pinch out to the sky": spreading fingers dollies out. The clamp is
        // the whole reachable universe now, not just the volume view.
        this.dist = clamp(this.dist * (spread / this.pinchDist), DIST_MIN, DIST_MAX);
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
    // Nearest source whose DRAWN extent contains the tap, scored by how far
    // into it the tap fell — so overlapping smudges resolve to the one the
    // player was actually aiming at, not merely the nearest center.
    let bestId: string | null = null;
    let bestScore = 1;
    for (const [starId, at] of this.sourceScreen) {
      const reach = Math.max(THUMB_PX, at.r);
      const score = Math.hypot(at.x - x, at.y - y) / reach;
      if (score < bestScore) {
        bestScore = score;
        bestId = starId;
      }
    }
    this.selectedStarId = bestId;
    const hit = bestId === null ? null : this.sources.find((s) => s.source.starId === bestId);
    this.selectCb?.(hit?.source ?? null);
  }
}
