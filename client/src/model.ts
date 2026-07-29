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
// Under the cyan mote is THE HOME SYSTEM (system.ts) — the player's own star
// with its planets, at real AU laid into the same light-year frame, drawn once
// the camera is within about a light-year. The home world is textured with the
// actual plate its cradle ships (art.ts), the rest are small shaded discs, and
// everything crawls along a real Keplerian orbit. The cyan HOME ring hands off
// from the system-as-a-point to the home planet itself as you come in.
//
// The act opens with a one-shot "pull-back": the camera starts a couple of AU
// off the home planet (concepts/03-02) and dollies out — exponentially, over
// six orders of magnitude — off-axis into the parallax volume (concepts/03-07).
// It plays ONCE, on fresh placement; a resume drops straight into the volume.
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
//
// A2.4 adds two things to the sky and nothing else. First, THE ACTS ALREADY
// SENT: a cyan mote crawling the sightline of a hail in flight, and one
// hairline ring for a broadcast's echo shell. Both are derived from
// `sky.contact.outbound` — the server's own record — and never from anything
// the ceremony is doing locally, so what is on the sky is only ever what
// actually left. Second, a CEREMONY MODE: the camera freezes, the canvas
// becomes a single press target, and a renderer supplied from outside gets
// one call per frame with the camera it needs (see ModelFrame). The Model
// owns the projection and the input; it owns none of the choice.

import { Application, Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { ContactWire, DetectedSource, OutboundAct, SelfView, Star, Vec3Ly } from "@holos/protocol";
import { worldArt } from "./art";
import { nowYear } from "./clock";
import {
  AU_LY,
  buildHomeSystem,
  orbitPointLy,
  trueAnomalyAt,
  type HomeSystem,
  type MutVec3,
  type Planet,
} from "./system";
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
/**
 * Near clip, in light-years of camera depth. A CONSTANT half-light-year is
 * fine while the camera never comes closer than four, and fatal once it can
 * stand two AU off a planet: everything, including the thing you zoomed in
 * on, is inside the clip. So it is proportional below five light-years and
 * pinned at the old value above — nothing at any distance the camera could
 * already reach changes at all.
 */
const NEAR = 0.5;
const NEAR_FRACTION = 0.1;
const DPR_MAX = 2;

const DIST_VOLUME = 60; // dolly distance out in the parallax volume
const PULLBACK_MS = 4200;
/** Where the pull-back starts if the system somehow is not built yet (it
 *  always is — `enter` follows `setSky` — so this is belt and braces). */
const PULLBACK_FALLBACK_AU = 3;

// The whole range the camera can reach: from a couple of AU off the home
// star out to where the cosmic web is a texture. Zoom is multiplicative in
// both gestures, so crossing thirteen orders of magnitude is a handful of
// pinches rather than a scroll marathon.
const DIST_MIN = 3e-5; // ~1.9 AU
const DIST_MAX = 4e8;
/** Wheel zoom rate — one notch (~100 deltaY) is about ×1.15. */
const WHEEL_K = 0.0014;

// ── Layer hand-off ────────────────────────────────────────────────────────
//
// Every band below is a pair of camera distances in light-years, crossfaded
// with a smoothstep in LOG space — the only space in which "300 to 3,000" and
// "2 million to 20 million" are the same size of transition.

/** The home system — orbit rings, planets, the local sun's glow. It arrives
 *  as the catalog stops being a field and starts being a night sky seen from
 *  inside one system; by a light-year out the whole thing is one mote and the
 *  cyan HOME ring is the only thing left to say about it. The catalog and the
 *  amber sources do NOT stand down under it: from inside the system they are
 *  exactly what they should be — the sky overhead. */
const SYS_FADE_LO = 0.05;
const SYS_FADE_HI = 1;
/** Where the cyan ring stops meaning "this system" and starts meaning "this
 *  planet". Between the two it tracks a lerp of the two screen positions,
 *  which at half a light-year are the same pixel — so there is one ring
 *  throughout and it never jumps. */
const RING_HANDOFF_LO = 0.02;
const RING_HANDOFF_HI = 0.5;
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
// Pull-back starts near face-on to the ecliptic, so the home system's orbits
// read as rings rather than as lines seen edge-on (03-02). The plane in
// system.ts is chosen against these two angles.
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

// ── Home-system sizing ────────────────────────────────────────────────────
//
// Everything in the system is drawn against ONE number: how many pixels an
// astronomical unit currently spans (`focal · AU_LY / depth`). Positions are
// honest — a planet is projected from its real orbit — but SIZES are a
// fraction of the AU scale rather than a physical diameter, because a planet
// at true scale is a millionth of a pixel at every distance from which its
// orbit is visible. It is the same bargain the galaxies make one-way: honest
// where you are, readable how big you look.
//
// Each of the fractions below is capped a second time against the HABITABLE
// ORBIT, because "a fifth of an AU" means something completely different
// around an M dwarf whose home world is a quarter of an AU out than around an
// F star whose home world is nearly two. Without the cap the close-in systems
// draw a planet wider than the ring it sits on, which is not stylization, it
// is a mistake.
const SUN_CORE_AU = 0.05;
const SUN_CORE_HZ = 0.14;
const SUN_CORE_PX_MIN = 2.5;
const SUN_CORE_PX_MAX = 44;
const SUN_GLOW_AU = 0.42;
const SUN_GLOW_HZ = 0.85;
const SUN_GLOW_PX_MIN = 8;
const SUN_GLOW_PX_MAX = 200;
const SUN_GLOW_ALPHA = 0.34;
/** Drawn diameter of a planet, as a fraction of an AU and of its own orbit. */
const PLANET_AU = 0.055;
const PLANET_ORBIT_FRAC = 0.16;
const PLANET_PX_MIN = 1.6;
const PLANET_PX_MAX = 70;
const HOME_PLANET_AU = 0.22;
const HOME_PLANET_ORBIT_FRAC = 0.45;
const HOME_PLANET_PX_MIN = 3;
const HOME_PLANET_PX_MAX = 220;
/** Where the home world stops being a mote and becomes a body — the drawn
 *  diameter, in px, over which the cyan point inside the ring stands down and
 *  lets the world itself be what the ring is around. */
const BODY_READ_PX_LO = 7;
const BODY_READ_PX_HI = 19;
/** Below this drawn radius an orbit is not a ring, it is a dot — skip it. */
const ORBIT_MIN_PX = 2.5;
const ORBIT_SEGMENTS = 56;
/** How far off screen an orbit's path is still worth carrying. Well past any
 *  viewport, and far short of the coordinates a sample just inside the near
 *  plane produces. */
const ORBIT_REACH_PX = 40_000;

const PLANET_TEX_SIZE = 128;
const WORLD_TEX_SIZE = 256;

// ── A2.4: the ceremony's camera, and the acts already sent ────────────────

/** The arming ease (storyboard §2): the same 700ms every ceremony opens with. */
const FRAME_MS = 700;
/** Past this the neighborhood is too small to aim in, so arming dollies back. */
const FRAME_DIST_MAX = 90;
/** How far off center a hail's target may sit, as a fraction of the SHORT
 *  screen axis — a portrait phone is what decides whether a frame is good. */
const FRAME_RADIUS_FRAC = 0.34;
/** Below this fraction of a decade of change the framing ease does nothing at
 *  all: a frame that is already good must not twitch. */
const FRAME_EPS = 0.04;

/** The path a hail has already covered. Faint on purpose — the light is gone,
 *  and what is left is a record of where it went, not a beam. */
const OUTBOUND_PATH_ALPHA = 0.1;
/** The mote at the head, in screen pixels. Fixed size at every zoom: it is a
 *  place in the sky, not an object with a diameter. */
const OUTBOUND_MOTE_PX = 6;
const OUTBOUND_MOTE_ALPHA = 0.55;
/** Once it has arrived the mote parks on the target and stands down. */
const OUTBOUND_ARRIVED_ALPHA = 0.3;
/** A broadcast's echo shell, drawn forever. */
const ECHO_RING_ALPHA = 0.22;
/** Past this drawn radius the shell is a straight line across the screen and
 *  costs tessellation for nothing. */
const ECHO_MAX_PX = 40_000;

/** True-color by spectral class: M dull red → K orange → G yellow-white → F white. */
const SPECTRAL_TINT: Readonly<Record<Star["spectralClass"], number>> = {
  M: 0xcf5b43,
  K: 0xf0a35e,
  G: 0xf7ecc4,
  F: 0xeef1ff,
};

// Exported since A2.4: a ceremony staged on the sky draws in the Model's own
// palette or it is a second game happening on the same screen. Cyan is your
// voice, gold is the line-work you aim with, amber stays what it always was —
// somebody else, seen late.
export const COLOR_HOME = 0x5fe0e6; // cyan — you, the present tense
const COLOR_SOURCE = 0xdf9b52; // amber — belief / other
export const COLOR_SELECT = 0xb79b63; // gold hairline for a selected source
/** The gold the orbit rings are drawn in — the one line-work color in the
 *  Model, shared with a selected source's hairline. */
const COLOR_ORRERY = 0xb79b63;
/** The home world's atmosphere rim. Pale blue-white rather than cyan: the
 *  cyan ring around it is the game speaking, the rim is just air. */
const COLOR_ATMOSPHERE = 0xbfe4ff;

/** Callback fired on tap: the selected source, or null when tapping empty sky. */
export type SelectSourceCallback = (source: DetectedSource | null) => void;

/** A projected point, as handed out to a ceremony renderer. VALID UNTIL THE
 *  NEXT `project` CALL — the Model reuses one scratch record per frame rather
 *  than allocating a few hundred of them (the `proj` field's whole story). */
export interface ScreenPoint {
  readonly ok: boolean;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

/** Where a source's smudge landed this frame, and how wide it was drawn. */
export interface SourceScreen {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * ONE FRAME OF CAMERA, handed to whatever is staging a ceremony on the sky.
 *
 * This is the whole seam: the Model owns the projection, the layers and the
 * textures, and a ceremony renderer owns what it draws with them. Nothing
 * about hailing, shouting or staying dark appears in this file — the Model
 * cannot tell one ceremony from another, and that is deliberate.
 *
 * `gfx` is cleared by the Model before every call, so a renderer that draws
 * nothing leaves nothing behind.
 */
export interface ModelFrame {
  readonly width: number;
  readonly height: number;
  readonly focal: number;
  /** Camera distance, in light-years — the scale a world radius projects at. */
  readonly dist: number;
  /** HOME, this frame. `ok` is false while it is behind the near plane. */
  readonly home: ScreenPoint;
  readonly gfx: Graphics;
  readonly sprites: Container;
  readonly glowTex: Texture | null;
  readonly pointTex: Texture | null;
  project(x: number, y: number, z: number): ScreenPoint;
  sourceAt(starId: string): SourceScreen | undefined;
}

/** The mutable twin the Model writes each frame and hands out as ModelFrame. */
interface MutableModelFrame {
  width: number;
  height: number;
  focal: number;
  dist: number;
  home: ScreenPoint;
  gfx: Graphics;
  sprites: Container;
  glowTex: Texture | null;
  pointTex: Texture | null;
  project(x: number, y: number, z: number): ScreenPoint;
  sourceAt(starId: string): SourceScreen | undefined;
}

/**
 * THE CEREMONY'S HALF OF THE INPUT. While one of these is installed the
 * camera is frozen — no orbit, no pinch, no wheel, no tap-to-select — and the
 * canvas is a single press target. Movement past TAP_MOVE_PX is a release and
 * so is a second finger, which is the same rule a tap has always been held to
 * here, applied to a press that lasts.
 */
export interface CeremonyInput {
  onPress(): void;
  onRelease(): void;
}

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

/** An angle folded into (−π, π]. Two yaws that differ by a full turn are the
 *  same yaw, and the camera should always take the short way between them. */
function wrapPi(a: number): number {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
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

/** The scale readout's number: an honest distance, never a zoom percentage.
 *  Inside the home system a light-year is the wrong ruler — nobody measures
 *  the distance to a planet in millionths of one — so it switches to AU at
 *  the point where the system is the thing on screen. */
function formatDistance(ly: number): string {
  const unit = (v: number, suffix: string): string =>
    `${v < 10 ? v.toFixed(v < 1 ? 2 : 1) : String(Math.round(v))} ${suffix}`;
  if (ly < SYS_FADE_LO) return unit(ly / AU_LY, "AU");
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

/** Clip whatever is already on the canvas to a circle with one pixel of
 *  softness at the limb — the difference between a world and a sticker. */
function clipToCircle(ctx: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.955, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
}

/** Lay a terminator over a circular plate: light from the upper left, the
 *  limb falling into shadow. Cheap, static, and the whole reason a flat
 *  square of art reads as a body with a far side. */
function shadeSphere(ctx: CanvasRenderingContext2D, size: number, depth: number): void {
  const c = size / 2;
  ctx.globalCompositeOperation = "source-atop";
  const g = ctx.createRadialGradient(c * 0.62, c * 0.6, c * 0.06, c, c, c * 1.12);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.45, `rgba(0,0,0,${depth * 0.18})`);
  g.addColorStop(0.78, `rgba(0,0,0,${depth * 0.6})`);
  g.addColorStop(1, `rgba(0,0,0,${depth})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
}

/** The generic planet: a white shaded sphere, tinted per-planet at draw time.
 *  Non-additive — a planet is not a light source, and the moment one blends
 *  like a star the system stops reading as a system. */
function discTexture(size: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Model: no 2d context for the planet disc");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  clipToCircle(ctx, size);
  shadeSphere(ctx, size, 0.82);
  return Texture.from(canvas);
}

/**
 * Where the world actually is inside its plate, as fractions of the plate.
 *
 * The plates are a lit sphere on black, and the sphere is neither centered nor
 * the same size from one to the next — it fills anywhere from two-fifths to
 * four-fifths of the frame. Cropping the frame's own circle would leave a
 * black annulus around the world, which on a black sky reads as a hole cut in
 * the stars, so the disc has to be found rather than assumed.
 *
 * The measurement is the one that survives the plates' own lighting: for each
 * COLUMN, how tall the lit region is. For a disc that height peaks at the
 * center and falls to nothing at the limbs, and the limb glow that ruins a
 * horizontal bounding box is a thin thing with almost no column height. So the
 * tallest column gives the diameter, and the run of near-tallest columns
 * brackets the center.
 */
function plateDisc(
  data: Uint8ClampedArray,
  n: number,
): { cx: number; cy: number; r: number } | null {
  const top = new Int32Array(n).fill(-1);
  const bottom = new Int32Array(n).fill(-1);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = (y * n + x) * 4;
      const lum =
        0.299 * (data[k] ?? 0) + 0.587 * (data[k + 1] ?? 0) + 0.114 * (data[k + 2] ?? 0);
      if (lum <= 10) continue;
      if (top[x] === -1) top[x] = y;
      bottom[x] = y;
    }
  }
  let tallest = 0;
  for (let x = 0; x < n; x++) {
    const t = top[x] ?? -1;
    const b = bottom[x] ?? -1;
    if (t >= 0 && b - t > tallest) tallest = b - t;
  }
  if (tallest < n * 0.1) return null; // not a disc; caller keeps the fallback
  let x0 = n;
  let x1 = -1;
  let sumY = 0;
  let countY = 0;
  for (let x = 0; x < n; x++) {
    const t = top[x] ?? -1;
    const b = bottom[x] ?? -1;
    if (t < 0 || b - t < tallest * 0.9) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    sumY += (t + b) / 2;
    countY++;
  }
  if (x1 < x0 || countY === 0) return null;
  return {
    cx: (x0 + x1) / 2 / n,
    cy: sumY / countY / n,
    r: tallest / 2 / n,
  };
}

/**
 * The home world's actual plate as a body: its disc located, cropped to a
 * circle, nothing else. No terminator is laid over it — every plate arrives
 * already lit, each from its own direction, and a second shadow from a
 * direction the art does not agree with turns a world into a smudge.
 */
function worldTexture(src: PlateSource, size: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Model: no 2d context for the world plate");

  ctx.drawImage(src, 0, 0, size, size);
  const disc = plateDisc(ctx.getImageData(0, 0, size, size).data, size);

  ctx.clearRect(0, 0, size, size);
  if (disc === null) {
    ctx.drawImage(src, 0, 0, size, size);
  } else {
    // A hair of margin so the limb — and the thin haze the art puts on it —
    // lands just inside the crop rather than exactly on it.
    const half = disc.r * 1.06;
    const { w, h } = plateSize(src);
    ctx.drawImage(
      src,
      (disc.cx - half) * w,
      (disc.cy - half) * h,
      half * 2 * w,
      half * 2 * h,
      0,
      0,
      size,
      size,
    );
  }
  clipToCircle(ctx, size);
  return Texture.from(canvas);
}

/** What a loaded plate can actually be backed by. */
type PlateSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** Narrow a Pixi texture's backing resource to something drawImage accepts.
 *  Every image source Pixi builds from a URL is one of these three; the null
 *  return is the honest "then keep the fallback disc" branch. */
function drawableResource(source: unknown): PlateSource | null {
  if (source instanceof HTMLImageElement) return source;
  if (source instanceof HTMLCanvasElement) return source;
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) return source;
  return null;
}

/** An `<img>` reports its layout size in `width`; only `naturalWidth` is the
 *  pixel one, and the crop rectangle is in pixels. */
function plateSize(src: PlateSource): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

/** One planet's sprite plus, for the home world only, its atmosphere rim. */
interface PlanetSprite {
  readonly sprite: Sprite;
  readonly planet: Planet;
  readonly isHome: boolean;
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
  private systemLayer: Container | null = null;
  private orbitGfx: Graphics | null = null;
  private sunGlow: Sprite | null = null;
  private sunCore: Sprite | null = null;
  private atmosphere: Sprite | null = null;
  private homeGfx: Graphics | null = null;
  private homeMote: Sprite | null = null;
  private selectionGfx: Graphics | null = null;
  // A2.4. Two layers, kept apart on purpose: `contactLayer` is what the
  // server says has been sent, `ceremonyGfx`/`ceremonySprites` are what a
  // ceremony is previewing right now. Nothing ever crosses between them.
  private contactLayer: Container | null = null;
  private contactGfx: Graphics | null = null;
  private contactMotes: Sprite[] = [];
  private ceremonyGfx: Graphics | null = null;
  private ceremonySprites: Container | null = null;
  private frame: MutableModelFrame | null = null;

  private pointTex: Texture | null = null;
  private glowTex: Texture | null = null;
  private discTex: Texture | null = null;
  private galaxyTex: Texture[] = [];

  // The home system. Rebuilt only when the star under it actually changes,
  // and its world plate loaded once — the fallback disc renders from the
  // first frame, so the plate arriving is a swap and never a pop of nothing.
  private system: HomeSystem | null = null;
  private systemKey: string | null = null;
  private planets: PlanetSprite[] = [];
  private worldTex: Texture | null = null;
  private worldToken = 0;
  private readonly systemT0 = performance.now();
  private readonly orbitPoint: MutVec3 = { x: 0, y: 0, z: 0 };
  /** Where the home planet landed on screen this frame, and how big — the
   *  cyan ring and the HOME label follow it once the hand-off completes. */
  private homePlanetScreen: { ok: boolean; x: number; y: number; r: number } = {
    ok: false,
    x: 0,
    y: 0,
    r: 0,
  };

  private stars: StarSprite[] = [];
  private sources: SourceSprite[] = [];
  /** Catalog positions by star id. The catalog is public sky and fixed for a
   *  cohort, so a hail already in flight still has somewhere to be drawn even
   *  once its source has faded back below the wire. */
  private readonly starPos = new Map<string, Vec3Ly>();
  /** The player's own committed acts, straight off `sky.contact.outbound`. */
  private outbound: readonly OutboundAct[] = [];

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

  // Pull-back animation. `pullT` is the eased progress, kept so the HOME
  // label can arrive partway through rather than on the first frame.
  private animating = false;
  private animStart = 0;
  private animFrom = DIST_VOLUME;
  private pullT = 0;

  // A2.4's arming ease. Same shape as the pull-back's step (exponential in
  // dist, linear in the angles) because it is the same move, shorter: the
  // one camera gesture the game makes on the player's behalf.
  private framing: {
    readonly start: number;
    readonly fromDist: number;
    readonly toDist: number;
    readonly fromAz: number;
    readonly toAz: number;
    readonly fromEl: number;
    readonly toEl: number;
  } | null = null;

  // Near clip, recomputed per frame from `dist` (see NEAR).
  private near = NEAR;

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
  private selectHomeCb: (() => void) | null = null;
  private pullbackEndCb: (() => void) | null = null;

  // A2.4's input mode. Non-null means the camera is frozen and the canvas is
  // a press target; `ceremonyPress` is the one live press, if any.
  private ceremonyInput: CeremonyInput | null = null;
  private ceremonyPress: { id: number; x: number; y: number } | null = null;
  private ceremonyFrameCb: ((frame: ModelFrame) => void) | null = null;

  // Screen position AND drawn radius per source, refreshed every frame: the
  // hit test reads the radius so the tappable area is exactly what the player
  // can see (smudges range from 8 to 92 px).
  private readonly sourceScreen = new Map<string, { x: number; y: number; r: number }>();
  private readonly proj: Projected = { ok: false, x: 0, y: 0, depth: 0 };
  /** Where HOME landed this frame — the ring's position after the
   *  system/planet hand-off, so the thread of a hail leaves from the same
   *  pixel the cyan ring is drawn around. Also the HOME mote's hit target. */
  private readonly homeScreen: Projected = { ok: false, x: 0, y: 0, depth: 0 };
  /** The frame's camera, latched in `tick` so `project` can be called from
   *  outside the projection pass without re-deriving eight trig terms. */
  private readonly camFrame = {
    cx: 0,
    cy: 0,
    focal: 1,
    sinAz: 0,
    cosAz: 1,
    sinEl: 0,
    cosEl: 1,
  };

  constructor(container: HTMLElement, catalog: readonly Star[]) {
    this.container = container;
    this.catalog = catalog;
    for (const star of catalog) this.starPos.set(star.id, star.position);

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
    this.discTex = discTexture(PLANET_TEX_SIZE);
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

    // The home system. One sortable container: the rings sit behind
    // everything, the sun and the planets sort against each other by depth,
    // so a world on the far side of its orbit passes behind the star.
    this.systemLayer = new Container();
    this.systemLayer.sortableChildren = true;
    this.systemLayer.visible = false;
    this.orbitGfx = new Graphics();
    this.orbitGfx.zIndex = -1e12;
    this.sunGlow = new Sprite(glowTex);
    this.sunGlow.anchor.set(0.5);
    this.sunGlow.blendMode = "add";
    this.sunCore = new Sprite(pointTex);
    this.sunCore.anchor.set(0.5);
    this.sunCore.blendMode = "add";
    this.atmosphere = new Sprite(glowTex);
    this.atmosphere.anchor.set(0.5);
    this.atmosphere.tint = COLOR_ATMOSPHERE;
    this.atmosphere.blendMode = "add";
    this.atmosphere.visible = false;
    this.systemLayer.addChild(this.orbitGfx, this.sunGlow, this.sunCore, this.atmosphere);

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

    // A2.4. The acts already sent ride with the game tier (they fade out with
    // the neighborhood); the ceremony's own layer sits above everything,
    // because a beam being aimed is the loudest thing on the sky while it is
    // happening and nothing may draw over it.
    this.contactLayer = new Container();
    this.contactGfx = new Graphics();
    this.contactLayer.addChild(this.contactGfx);
    this.ceremonyGfx = new Graphics();
    this.ceremonySprites = new Container();

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
    // the order the distances are in); stars over the backdrop, sources over
    // stars; the home system over both, because from inside it those two ARE
    // the night sky behind it; home + selection on top of everything.
    this.app.stage.addChild(
      tiers.web,
      tiers.lg,
      tiers.mw,
      this.haloLayer,
      this.starLayer,
      this.sourceLayer,
      this.systemLayer,
      this.selectionGfx,
      this.contactLayer,
      this.homeGfx,
      this.homeMote,
      this.ceremonyGfx,
      this.ceremonySprites,
    );

    // The one frame record, built once and rewritten in place every tick.
    this.frame = {
      width: 0,
      height: 0,
      focal: 1,
      dist: this.dist,
      home: this.homeScreen,
      gfx: this.ceremonyGfx,
      sprites: this.ceremonySprites,
      glowTex: this.glowTex,
      pointTex: this.pointTex,
      project: (x, y, z) => this.projectPoint(x, y, z),
      sourceAt: (starId) => this.sourceScreen.get(starId),
    };
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

  /** A2.4: the HOME mote answers a thumb too. It is the only present-tense
   *  object on the sky, so tapping it goes where the player's own doings
   *  live; the Model reports the tap and decides nothing. */
  onSelectHome(cb: () => void): void {
    this.selectHomeCb = cb;
  }

  /**
   * A2.4: the player's own committed acts, from every `sky`. THE ONLY INPUT
   * to the in-flight renders — a ceremony's local preview never reaches
   * here, so nothing on the sky can claim a beam the server has not recorded.
   */
  setContact(wire: ContactWire | null): void {
    this.outbound = wire === null ? [] : wire.outbound;
  }

  /** The player's own position in light-years — where every thread starts. */
  homePosition(): Vec3Ly {
    return this.homePos;
  }

  /** Where HOME is on screen as of the last frame. Read by anything that has
   *  to place DOM over it (the commit bloom) rather than draw into the
   *  canvas, which gets the same point through ModelFrame. */
  homeScreenPoint(): ScreenPoint {
    return this.homeScreen;
  }

  /** A catalog star's position, or null if the id is not in this cohort's
   *  catalog. Public sky: the catalog is sent to everyone on `welcome`. */
  starPosition(starId: string): Vec3Ly | null {
    return this.starPos.get(starId) ?? null;
  }

  /**
   * A2.4: enter (or leave, with null) the ceremony input mode. The camera
   * freezes and the canvas becomes one press target; any press already down
   * is dropped without being reported, because entering and leaving are the
   * caller's decisions and never the player's.
   */
  setCeremonyInput(input: CeremonyInput | null): void {
    this.ceremonyInput = input;
    this.ceremonyPress = null;
    this.pointers.clear();
    this.lastOrbit = null;
    this.tapDown = null;
    this.overlay.style.opacity = input === null ? "" : "0.25";
  }

  /** A2.4: the ceremony's per-frame renderer, or null to draw nothing. */
  onCeremonyFrame(cb: ((frame: ModelFrame) => void) | null): void {
    this.ceremonyFrameCb = cb;
    if (cb === null) this.ceremonyGfx?.clear();
  }

  /**
   * THE ARMING EASE (storyboard §2). Dollies back far enough that `spanLy`
   * of sky fits comfortably in frame, and — for a hail — yaws so the target
   * lies in the screen plane rather than foreshortened down the view axis.
   * A frame that is already good does not move at all.
   */
  easeFraming(target: Vec3Ly | null, spanLy: number): void {
    if (!this.ready) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const focal = (h * 0.5) / Math.tan(FOV / 2);

    // How far back the span has to be seen from to sit inside the short
    // axis. A phone held upright is what makes this necessary: sixty
    // light-years of camera distance frames a 25 ly source vertically and
    // pushes it off the side.
    const fit = (focal * Math.max(spanLy, 1e-6)) / (FRAME_RADIUS_FRAC * Math.min(w, h));
    const toDist = clamp(Math.max(DIST_VOLUME, fit), DIST_MIN, DIST_MAX);

    let toAz = this.az;
    let toEl = this.el;
    if (target !== null) {
      const dx = target.x - this.homePos.x;
      const dy = target.y - this.homePos.y;
      const dz = target.z - this.homePos.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 1e-6) {
        // Lay the sightline in the screen plane: solve the yaw that puts the
        // target at the camera's own depth, so the thread runs across the
        // screen at its true length instead of into it. Elevation is left
        // where the player put it — the frame they already recognise.
        const ux = dx / len;
        const uy = dy / len;
        const uz = dz / len;
        const rho = Math.hypot(ux, uz);
        const beta = Math.atan2(ux, uz);
        const k = rho > 1e-6 ? (-uy * Math.tan(this.el)) / rho : 2;
        if (Math.abs(k) <= 1) {
          const a = Math.acos(k);
          const c1 = -beta + a;
          const c2 = -beta - a;
          toAz =
            Math.abs(wrapPi(c1 - this.az)) <= Math.abs(wrapPi(c2 - this.az)) ? c1 : c2;
        } else {
          // Unreachable at this elevation; take the nearest yaw there is.
          toAz = k > 1 ? -beta : -beta + Math.PI;
        }
      }
    }
    // Shortest way round, so a ceremony never spins the sky the long way.
    toAz = this.az + wrapPi(toAz - this.az);

    const distMoves =
      this.dist > FRAME_DIST_MAX ||
      Math.abs(Math.log(toDist / this.dist)) > FRAME_EPS;
    const angleMoves = Math.abs(toAz - this.az) > FRAME_EPS;
    if (!distMoves && !angleMoves) {
      this.framing = null;
      return;
    }
    this.framing = {
      start: performance.now(),
      fromDist: this.dist,
      toDist: distMoves ? toDist : this.dist,
      fromAz: this.az,
      toAz,
      fromEl: this.el,
      toEl,
    };
  }

  /** Fired once, the frame the one-shot dolly-out completes. Never fired for
   *  a "resume" enter — the caller owns that branch. */
  onPullbackEnd(cb: () => void): void {
    this.pullbackEndCb = cb;
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
    this.pullbackEndCb = null;
    this.selectHomeCb = null;
    this.ceremonyFrameCb = null;
    this.ceremonyInput = null;
    // Listeners and the renderer only exist once the async init completed.
    if (this.ready) {
      this.detachInput();
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true });
    }
    this.worldToken++; // orphan any world plate still in flight
    this.pointTex?.destroy(true);
    this.glowTex?.destroy(true);
    this.discTex?.destroy(true);
    this.worldTex?.destroy(true);
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
    this.buildSystem(self);

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

  /**
   * (Re)generate the home system for the star the player woke on. Keyed on
   * star + cradle so the repeat `sky` messages that arrive every time anyone
   * joins do not tear down and rebuild eight sprites and a texture load.
   */
  private buildSystem(self: SelfView): void {
    const key = `${self.starId}:${self.seed.cradleId}`;
    if (key === this.systemKey) return;
    this.systemKey = key;

    const layer = this.systemLayer;
    const discTex = this.discTex;
    if (layer === null || discTex === null) return;

    for (const p of this.planets) p.sprite.destroy();
    this.planets = [];

    const star = this.catalog.find((s) => s.id === self.starId);
    const cls: Star["spectralClass"] = star?.spectralClass ?? "G";
    const system = buildHomeSystem(self.starId, self.seed.cradleId, cls);
    this.system = system;

    const tint = SPECTRAL_TINT[cls];
    if (this.sunGlow !== null) this.sunGlow.tint = tint;
    if (this.sunCore !== null) this.sunCore.tint = tint;

    for (let i = 0; i < system.planets.length; i++) {
      const planet = system.planets[i];
      if (planet === undefined) continue;
      const isHome = i === system.homeIndex;
      const sprite = new Sprite(discTex);
      sprite.anchor.set(0.5);
      sprite.tint = planet.tint;
      layer.addChild(sprite);
      this.planets.push({ sprite, planet, isHome });
    }

    // The home world's plate. The fallback disc above is already on screen,
    // so this is a swap when it lands and nothing at all if it never does.
    this.worldTex?.destroy(true);
    this.worldTex = null;
    this.loadWorldPlate(self.seed.cradleId);
  }

  /** Fetch and circular-crop the cradle's world plate. Fire-and-forget: every
   *  failure path (no plate for the id, a load error, an undrawable resource)
   *  leaves the shaded fallback disc in place, which is a real case — worldArt
   *  is partial over the catalog. */
  private loadWorldPlate(cradleId: number): void {
    const url = worldArt(cradleId, "sq");
    if (url === null) return;
    const token = ++this.worldToken;
    void Assets.load<Texture>(url)
      .then((tex) => {
        if (this.destroyed || token !== this.worldToken) return;
        const src = drawableResource(tex.source.resource);
        if (src === null) return;
        this.worldTex = worldTexture(src, WORLD_TEX_SIZE);
        for (const p of this.planets) {
          if (p.isHome) {
            p.sprite.texture = this.worldTex;
            p.sprite.tint = 0xffffff; // the plate carries its own color now
          }
        }
      })
      .catch(() => {
        /* keep the fallback disc */
      });
  }

  private applyEnter(mode: "pullback" | "resume"): void {
    if (mode === "pullback") {
      this.animating = true;
      this.animStart = performance.now();
      this.pullT = 0;
      this.az = HOME_AZ;
      this.el = HOME_EL;
      // Start a few AU off the home planet — close enough that it is a world
      // with an orbit and not a mote. How close depends on the star: an M
      // dwarf's habitable world is a tenth of an AU out, an F star's is two.
      this.animFrom = (this.system?.openingAu ?? PULLBACK_FALLBACK_AU) * AU_LY;
      this.dist = this.animFrom;
    } else {
      this.animating = false;
      this.pullT = 1;
      this.az = VOLUME_AZ;
      this.el = VOLUME_EL;
      this.dist = DIST_VOLUME;
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
    if (depth <= this.near) {
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
    if (this.framing !== null) this.stepFraming();

    // Proportional below five light-years, the old constant above it (see
    // NEAR). Recomputed here because this is the one place after every input
    // and after the pull-back's step where `dist` is settled for the frame.
    this.near = Math.min(NEAR, this.dist * NEAR_FRACTION);

    const sinAz = Math.sin(this.az);
    const cosAz = Math.cos(this.az);
    const sinEl = Math.sin(this.el);
    const cosEl = Math.cos(this.el);

    // Latch the frame's camera so anything outside the projection pass — the
    // acts already sent, a ceremony's renderer — projects through exactly the
    // same numbers rather than a copy that could drift.
    const cam = this.camFrame;
    cam.cx = cx;
    cam.cy = cy;
    cam.focal = focal;
    cam.sinAz = sinAz;
    cam.cosAz = cosAz;
    cam.sinEl = sinEl;
    cam.cosEl = cosEl;

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
        // Inside the home system the camera sits micro-light-years from its
        // target, and a catalog star a few degrees off the view axis projects
        // to a coordinate with eight digits in front of the point. Cull on the
        // screen position the projection just produced rather than handing
        // Pixi a transform it has no business trying to rasterize.
        if (this.offscreen(this.proj.x, this.proj.y, w, h, STAR_PX_MAX * 4 + 16)) {
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
        // Same cull as the catalog, at the smudge's own drawn radius — so a
        // source whose center is just off the edge still shows the part of it
        // that overlaps the screen, and still answers a thumb there.
        if (this.offscreen(this.proj.x, this.proj.y, w, h, radiusPx + 8)) {
          item.sprite.visible = false;
          continue;
        }
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

    // The home system, and only when it is on screen at all: below the band
    // this is several hundred projections and a rebuilt Graphics path per
    // frame, and at sixty light-years there is nothing there to see.
    const sysAlpha = 1 - fadeIn(this.dist, SYS_FADE_LO, SYS_FADE_HI);
    this.drawSystem(cx, cy, focal, w, h, sinAz, cosAz, sinEl, cosEl, sysAlpha);

    this.drawHome(cx, cy, focal, sinAz, cosAz, sinEl, cosEl, nearAlpha);
    this.drawSelection();
    this.drawOutbound(nearVisible, nearAlpha);
    this.runCeremonyFrame(w, h, focal);
  };

  /** The arming ease. Exponential in distance and linear in the angles — the
   *  pull-back's step, over 700ms instead of 4,200. */
  private stepFraming(): void {
    const f = this.framing;
    if (f === null) return;
    const t = (performance.now() - f.start) / FRAME_MS;
    const p = smoothstep(t);
    this.dist = f.fromDist * Math.pow(f.toDist / f.fromDist, p);
    this.az = lerp(f.fromAz, f.toAz, p);
    this.el = lerp(f.fromEl, f.toEl, p);
    if (t >= 1) {
      this.dist = f.toDist;
      this.az = f.toAz;
      this.el = f.toEl;
      this.framing = null;
    }
  }

  /** Project a world point through the frame's latched camera. The returned
   *  record is the shared scratch one; read it before calling again. */
  private projectPoint(x: number, y: number, z: number): ScreenPoint {
    const c = this.camFrame;
    this.projectInto(x, y, z, c.cx, c.cy, c.focal, c.sinAz, c.cosAz, c.sinEl, c.cosEl);
    return this.proj;
  }

  /**
   * THE ACTS ALREADY SENT (storyboard §7). Derived from `outbound` and the
   * clock and nothing else — no ceremony state reaches this method, so the
   * sky can only ever show what the server recorded.
   *
   * A hail is a mote crawling its own sightline with the covered path behind
   * it; a broadcast is one hairline ring whose radius is the years since it
   * left. Both move at the game clock's rate, which is to say they look
   * motionless for a whole session. That stillness is the point: a thing you
   * sent is out of your hands, and the sky says so by not hurrying.
   */
  private drawOutbound(nearVisible: boolean, nearAlpha: number): void {
    const layer = this.contactLayer;
    const gfx = this.contactGfx;
    if (layer === null || gfx === null) return;

    layer.visible = nearVisible && this.outbound.length > 0;
    for (const mote of this.contactMotes) mote.visible = false;
    gfx.clear();
    if (!layer.visible) return;
    layer.alpha = nearAlpha;

    const home = this.homeScreen;
    const year = nowYear();
    const focal = this.camFrame.focal;
    let moteIndex = 0;

    for (const act of this.outbound) {
      if (act.kind === "broadcast") {
        // The shell swept so far, in light-years, re-derived locally from the
        // year it left — the same arithmetic the server publishes as
        // `shellRadiusLy`, so the two agree without a round trip.
        const r = Math.max(0, year - act.sentYear);
        if (!home.ok || r <= 0) continue;
        const radiusPx = (focal * r) / this.dist;
        if (radiusPx < 1 || radiusPx > ECHO_MAX_PX) continue;
        gfx
          .circle(home.x, home.y, radiusPx)
          .stroke({ width: 1, color: COLOR_HOME, alpha: ECHO_RING_ALPHA });
        continue;
      }

      const starId = act.starId;
      const target = starId === null ? undefined : this.starPos.get(starId);
      if (target === undefined || act.arrivesYear === null) continue;
      const span = act.arrivesYear - act.sentYear;
      const p = span <= 0 ? 1 : clamp((year - act.sentYear) / span, 0, 1);
      const hp = this.projectPoint(
        lerp(this.homePos.x, target.x, p),
        lerp(this.homePos.y, target.y, p),
        lerp(this.homePos.z, target.z, p),
      );
      if (!hp.ok) continue;
      const hx = hp.x;
      const hy = hp.y;
      if (home.ok) {
        gfx
          .moveTo(home.x, home.y)
          .lineTo(hx, hy)
          .stroke({ width: 1, color: COLOR_HOME, alpha: OUTBOUND_PATH_ALPHA });
      }
      const mote = this.outboundMote(moteIndex);
      moteIndex++;
      if (mote === null) continue;
      mote.visible = true;
      mote.position.set(hx, hy);
      mote.scale.set(OUTBOUND_MOTE_PX / 16);
      mote.alpha = p >= 1 ? OUTBOUND_ARRIVED_ALPHA : OUTBOUND_MOTE_ALPHA;
    }
  }

  /** The nth in-flight mote, grown on demand. At most MAX_ACTS_PER_CIV of
   *  these can ever exist, so the pool never needs shrinking. */
  private outboundMote(index: number): Sprite | null {
    const existing = this.contactMotes[index];
    if (existing !== undefined) return existing;
    const tex = this.pointTex;
    const layer = this.contactLayer;
    if (tex === null || layer === null) return null;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.tint = COLOR_HOME;
    sprite.blendMode = "add";
    layer.addChild(sprite);
    this.contactMotes.push(sprite);
    return sprite;
  }

  /** Hand the frame to whoever is staging a ceremony. The Graphics is cleared
   *  first, so a renderer that draws nothing this frame leaves nothing. */
  private runCeremonyFrame(w: number, h: number, focal: number): void {
    const gfx = this.ceremonyGfx;
    const sprites = this.ceremonySprites;
    const frame = this.frame;
    if (gfx === null || sprites === null || frame === null) return;
    gfx.clear();
    const cb = this.ceremonyFrameCb;
    if (cb === null) {
      sprites.visible = false;
      return;
    }
    sprites.visible = true;
    frame.width = w;
    frame.height = h;
    frame.focal = focal;
    frame.dist = this.dist;
    cb(frame);
  }

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

  /**
   * The pull-back. `dist` moves EXPONENTIALLY, not linearly: the dolly runs
   * from a couple of AU to sixty light-years, six orders of magnitude, and a
   * linear lerp across that spends ninety-nine per cent of the animation
   * inside the last decade — you would watch a still frame and then a jump.
   * In log space each decade takes the same share of the run, which is what
   * "pulling back" has always meant.
   */
  private stepPullback(): void {
    const t = (performance.now() - this.animStart) / PULLBACK_MS;
    const p = smoothstep(t);
    this.pullT = p;
    this.dist = this.animFrom * Math.pow(DIST_VOLUME / this.animFrom, p);
    this.az = lerp(HOME_AZ, VOLUME_AZ, p);
    this.el = lerp(HOME_EL, VOLUME_EL, p);
    if (t >= 1) {
      this.animating = false;
      this.pullT = 1;
      this.dist = DIST_VOLUME;
      const cb = this.pullbackEndCb;
      this.pullbackEndCb = null;
      cb?.();
    }
  }

  /**
   * THE HOME SYSTEM. Gold hairline orbits, the local sun as a class-tinted
   * glow, small shaded discs for the other worlds and the cradle's own plate
   * for this one — all of it projected through the same camera as everything
   * else, so the orbits foreshorten honestly and the camera can fly inside
   * the outer ones.
   */
  private drawSystem(
    cx: number,
    cy: number,
    focal: number,
    w: number,
    h: number,
    sinAz: number,
    cosAz: number,
    sinEl: number,
    cosEl: number,
    sysAlpha: number,
  ): void {
    const layer = this.systemLayer;
    const gfx = this.orbitGfx;
    const system = this.system;
    if (layer === null || gfx === null) return;

    this.homePlanetScreen.ok = false;
    if (system === null || sysAlpha <= 0.004) {
      layer.visible = false;
      return;
    }
    layer.visible = true;
    layer.alpha = sysAlpha;

    // One number decides every drawn size in here: how many pixels an AU
    // spans at the star's own depth (which is `dist` — the star IS the camera
    // target, so it sits dead center at depth dist, every frame).
    const pxPerAu = (focal * AU_LY) / this.dist;
    const tSec = (performance.now() - this.systemT0) / 1000;

    // The star. Bigger and much softer than any catalog point: from in here
    // it is not one of the field's stars, it is the daylight.
    const hz = system.habitableAu;
    const glow = this.sunGlow;
    if (glow !== null) {
      glow.position.set(cx, cy);
      const au = Math.min(SUN_GLOW_AU, hz * SUN_GLOW_HZ);
      const r = clamp(au * pxPerAu, SUN_GLOW_PX_MIN, SUN_GLOW_PX_MAX);
      glow.scale.set(r / (GLOW_TEX_SIZE / 2));
      glow.alpha = SUN_GLOW_ALPHA;
      glow.zIndex = -this.dist;
    }
    const core = this.sunCore;
    if (core !== null) {
      core.position.set(cx, cy);
      const au = Math.min(SUN_CORE_AU, hz * SUN_CORE_HZ);
      const r = clamp(au * pxPerAu, SUN_CORE_PX_MIN, SUN_CORE_PX_MAX);
      core.scale.set(r / 16);
      core.zIndex = -this.dist + 1e-9;
    }

    // Orbit paths. Sampled in world space and projected point by point — a
    // screen-space ellipse would be right only from face-on, and the whole
    // reason the plane is tilted is that we are never quite there.
    gfx.clear();
    const p0 = this.orbitPoint;
    for (const item of this.planets) {
      const radiusPx = item.planet.aAu * pxPerAu;
      if (radiusPx < ORBIT_MIN_PX) continue;
      let drawing = false;
      let any = false;
      for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
        const nu = (i / ORBIT_SEGMENTS) * Math.PI * 2;
        orbitPointLy(system, item.planet, nu, p0);
        this.projectInto(
          this.homePos.x + p0.x,
          this.homePos.y + p0.y,
          this.homePos.z + p0.z,
          cx, cy, focal, sinAz, cosAz, sinEl, cosEl,
        );
        // A ring the camera is INSIDE has a stretch of itself behind the near
        // plane, and either side of that gap runs off toward infinity. Break
        // the path at both — at the clip, and at the point where a sample is
        // so far off screen that carrying the line to it is a few thousand
        // square pixels of tessellation nobody will ever see.
        if (!this.proj.ok || Math.abs(this.proj.x) > ORBIT_REACH_PX || Math.abs(this.proj.y) > ORBIT_REACH_PX) {
          drawing = false;
          continue;
        }
        if (drawing) {
          gfx.lineTo(this.proj.x, this.proj.y);
        } else {
          gfx.moveTo(this.proj.x, this.proj.y);
          drawing = true;
        }
        any = true;
      }
      if (any) {
        gfx.stroke({
          width: 1,
          color: COLOR_ORRERY,
          alpha: item.isHome ? 0.34 : 0.2,
        });
      }
    }

    // The planets themselves, crawling.
    const atmo = this.atmosphere;
    if (atmo !== null) atmo.visible = false;
    for (const item of this.planets) {
      const nu = trueAnomalyAt(item.planet, tSec);
      orbitPointLy(system, item.planet, nu, p0);
      this.projectInto(
        this.homePos.x + p0.x,
        this.homePos.y + p0.y,
        this.homePos.z + p0.z,
        cx, cy, focal, sinAz, cosAz, sinEl, cosEl,
      );
      const a = item.planet.aAu;
      const sizePx = item.isHome
        ? clamp(
            Math.min(HOME_PLANET_AU, a * HOME_PLANET_ORBIT_FRAC) * pxPerAu,
            HOME_PLANET_PX_MIN,
            HOME_PLANET_PX_MAX,
          )
        : clamp(
            Math.min(item.planet.sizeMul * PLANET_AU, a * PLANET_ORBIT_FRAC) * pxPerAu,
            PLANET_PX_MIN,
            PLANET_PX_MAX,
          );
      if (!this.proj.ok || this.offscreen(this.proj.x, this.proj.y, w, h, sizePx * 2 + 24)) {
        item.sprite.visible = false;
        continue;
      }
      item.sprite.visible = true;
      item.sprite.position.set(this.proj.x, this.proj.y);
      // Against the sprite's OWN texture width: the home world's plate is
      // twice the size of the generic disc, and a shared divisor would draw
      // it at twice the diameter it was asked for.
      item.sprite.scale.set(sizePx / item.sprite.texture.width);
      item.sprite.zIndex = -this.proj.depth;
      if (!item.isHome) continue;

      this.homePlanetScreen.ok = true;
      this.homePlanetScreen.x = this.proj.x;
      this.homePlanetScreen.y = this.proj.y;
      this.homePlanetScreen.r = sizePx / 2;
      // A hair of air at the limb — enough to say the world has some, not
      // enough to become a second ring around it.
      if (atmo !== null && sizePx > 8) {
        atmo.visible = true;
        atmo.position.set(this.proj.x, this.proj.y);
        atmo.scale.set((sizePx * 0.78) / (GLOW_TEX_SIZE / 2));
        atmo.alpha = 0.3;
        atmo.zIndex = -this.proj.depth - 1e-9;
      }
    }
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
      this.homeScreen.ok = false;
      this.homeLabel.style.opacity = "0";
      return;
    }
    const starX = this.proj.x;
    const starY = this.proj.y;
    const starDepth = this.proj.depth;

    // HOME is the way back, so it is drawn at a fixed pixel size at every
    // zoom — from a couple of AU to four hundred million light-years, the
    // cyan mote is always findable. What it does give up at extreme distance
    // is loudness: the ring stands down so it stops being the brightest thing
    // in a sky that by then contains a hundred thousand galaxies.
    const homeSoft = 1 - 0.72 * fadeIn(this.dist, HOME_SOFT_LO, HOME_SOFT_HI);

    // THE HAND-OFF. Far out, "you" is the star system as one point. Close in,
    // "you" is the world your civ woke on. The ring lerps between the two
    // SCREEN positions rather than switching: at half a light-year the star
    // and its planet are the same pixel, so the transfer costs nothing and
    // there is never a second ring anywhere.
    const planet = this.homePlanetScreen;
    const toPlanet = planet.ok ? 1 - fadeIn(this.dist, RING_HANDOFF_LO, RING_HANDOFF_HI) : 0;
    const x = lerp(starX, planet.x, toPlanet);
    const y = lerp(starY, planet.y, toPlanet);
    // ...and the ring opens up to hold whatever the world is drawn at, so it
    // rings the planet instead of being swallowed by it.
    const ringPx = lerp(HOME_RING_PX, Math.max(HOME_RING_PX, planet.r + 7), toPlanet);

    // The cyan point is the "too small to resolve" reading, and it holds until
    // the world under it is genuinely a body rather than three pixels of
    // texture — keyed on the DRAWN size, not on the layer's fade, because an
    // M dwarf's world is still a mote long after its system has arrived.
    const bodyRead = planet.ok
      ? smoothstep((planet.r * 2 - BODY_READ_PX_LO) / (BODY_READ_PX_HI - BODY_READ_PX_LO))
      : 0;
    mote.visible = true;
    mote.position.set(x, y);
    mote.scale.set(HOME_PX / 12);
    mote.alpha = clamp(homeSoft + 0.28, 0, 1) * (1 - bodyRead);

    // Where HOME ended up, for the tap test and for anything a ceremony
    // draws from here. It is the RING's position, past the hand-off — the
    // thread of a hail must leave from the same pixel the ring encircles.
    this.homeScreen.ok = true;
    this.homeScreen.x = x;
    this.homeScreen.y = y;
    this.homeScreen.depth = starDepth;

    // Thin cyan ring — the one present-tense object.
    gfx
      .circle(x, y, ringPx)
      .stroke({ width: 1, color: COLOR_HOME, alpha: 0.85 * homeSoft });
    gfx
      .circle(x, y, ringPx + 3)
      .stroke({ width: 1, color: COLOR_HOME, alpha: 0.18 * homeSoft });

    // Track the DOM HOME label just to the right of the ring (arriving a
    // beat into the pull-back rather than on its first frame, and gone once
    // the neighborhood it names has faded out from under it).
    const base = this.animating ? clamp((this.pullT - 0.12) / 0.4, 0, 1) * 0.75 : 0.75;
    const labelAlpha = base * nearAlpha;
    this.homeLabel.style.opacity = String(labelAlpha);
    this.homeLabel.style.transform = `translate(${x + ringPx + 8}px, ${y - 8}px)`;
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
    if (this.ceremonyInput !== null) return; // the camera is frozen while armed
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
    const ceremony = this.ceremonyInput;
    if (ceremony !== null) {
      // A second finger is a release, exactly as it cancels a pending tap
      // below: two fingers have always meant "I am moving the camera", and
      // during a ceremony the camera is not moving anywhere.
      if (this.ceremonyPress !== null) {
        this.ceremonyPress = null;
        ceremony.onRelease();
        return;
      }
      this.ceremonyPress = { id: e.pointerId, x: pt.x, y: pt.y };
      ceremony.onPress();
      return;
    }
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
    const ceremony = this.ceremonyInput;
    if (ceremony !== null) {
      const press = this.ceremonyPress;
      if (press === null || press.id !== e.pointerId) return;
      const pt = this.localPoint(e);
      // A drag is a release. The hold has to be a hold — a thumb that
      // wandered was reaching for the camera, and it does not get to
      // half-commit on the way.
      if (Math.hypot(pt.x - press.x, pt.y - press.y) > TAP_MOVE_PX) {
        this.ceremonyPress = null;
        ceremony.onRelease();
      }
      return;
    }
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
    const ceremony = this.ceremonyInput;
    if (ceremony !== null) {
      const press = this.ceremonyPress;
      if (press === null || press.id !== e.pointerId) return;
      this.ceremonyPress = null;
      ceremony.onRelease();
      return;
    }
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

    // A2.4: HOME is on the same scoreboard, at the ring's own reach. It wins
    // ties against a smudge the same way one smudge wins against another —
    // by the tap having landed further inside it — so a source sitting near
    // HOME on screen is still reachable.
    const home = this.homeScreen;
    if (home.ok && this.selectHomeCb !== null) {
      const homeScore = Math.hypot(home.x - x, home.y - y) / THUMB_PX;
      if (homeScore < bestScore) {
        this.selectedStarId = null;
        this.selectHomeCb();
        return;
      }
    }

    this.selectedStarId = bestId;
    const hit = bestId === null ? null : this.sources.find((s) => s.source.starId === bestId);
    this.selectCb?.(hit?.source ?? null);
  }
}
