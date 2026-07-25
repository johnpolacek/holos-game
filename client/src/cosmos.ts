// THE COSMOS — the sky behind the game.
//
// Everything in this module is scenery. None of it comes from the server,
// none of it is gameplay, and nothing in it is ever tappable. It exists
// because the neighborhood a cohort lives in is twenty-five light-years
// across and the universe is not: a sky made only of the catalog reads as a
// screensaver of dots. So we build the real thing around it, at the scales we
// currently believe it has, in the same cohort-centric frame the gameplay
// stars use (origin = cohort center, units = light-years).
//
// Three tiers, each a couple of orders of magnitude past the last:
//
//   A — THE MILKY WAY, as a 3D object we are inside. A particle disk with a
//       bar, a bulge and four logarithmic arms, its center 26,000 ly away
//       toward l = 0. From the neighborhood it reads as the band across the
//       sky; from a few hundred thousand light-years out it reads as a
//       barred spiral, seen from wherever the orbit happens to have put you.
//       That emergent second reading is the whole reason it is built in 3D
//       instead of painted on a backdrop.
//   B — THE LOCAL GROUP. Real members at their real distances, drawn as
//       procedurally textured galaxy sprites: the Magellanic Clouds, the
//       Sagittarius dwarf, Andromeda and Triangulum, plus the swarm of faint
//       dwarfs that hangs around both big spirals.
//   C — THE COSMIC WEB, out to ~350 Mly. Virgo, Fornax and Coma as named
//       anchors, filaments of field galaxies strung between cluster nodes,
//       and genuine emptiness between them — the Local Void is left as a hole
//       in the sky, because it is one.
//
// Deterministic by construction: one fixed seed drives a local mulberry32, so
// every client sees the same universe and nothing has to be sent over the
// wire. Directions for the named objects are their real galactic coordinates
// (l, b), resolved through the galactic basis below; their distances are the
// honest ones. Everything unnamed is invented filler and says so.

// ── Vectors, noise, small helpers ─────────────────────────────────────────

/** A point in the cohort-centric frame, light-years. Structurally the same
 *  shape as the protocol's Vec3Ly, deliberately not imported: nothing here
 *  is protocol, and the backdrop must never depend on server types. */
export interface CosmosVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The one seed for the whole universe. Fixed, so the sky is the same sky in
 *  every browser and every session — a landmark you learned last week is
 *  still where you left it. */
const COSMOS_SEED = 0x5eed_c057;

type Rnd = () => number;

/** mulberry32 — thirty lines of arithmetic instead of a dependency. */
function mulberry32(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal, Box–Muller. Used wherever "scattered around" is the
 *  honest description: arm width, cluster cores, filament thickness. */
function gauss(rnd: Rnd): number {
  const u = Math.max(1e-9, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Pick a tint from a palette. Palettes are non-empty by inspection; the
 *  fallback is only there to satisfy noUncheckedIndexedAccess. */
function pick(rnd: Rnd, arr: readonly number[]): number {
  return arr[Math.floor(rnd() * arr.length)] ?? 0xffffff;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function len(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/** A uniformly distributed direction on the sphere. */
function randomDir(rnd: Rnd): CosmosVec3 {
  const cosTheta = rnd() * 2 - 1;
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = rnd() * Math.PI * 2;
  return { x: sinTheta * Math.cos(phi), y: cosTheta, z: sinTheta * Math.sin(phi) };
}

// ── The galactic basis ────────────────────────────────────────────────────
//
// The gameplay frame has no preferred plane, so we choose one for the galaxy
// and then everything else — every real (l, b) in this file — resolves
// through it. Tilted well off the camera's resting horizon on purpose: the
// Milky Way should cross the sky at an angle, the way it does.

const GAL_TILT = 1.02; // radians between the galactic plane and the x–z plane
const GAL_SPIN = 0.62; // where the plane's ascending node falls

/** Unit normal — toward the north galactic pole (b = +90°). */
const GAL_N: CosmosVec3 = {
  x: Math.sin(GAL_TILT) * Math.cos(GAL_SPIN),
  y: Math.cos(GAL_TILT),
  z: Math.sin(GAL_TILT) * Math.sin(GAL_SPIN),
};

/** In-plane unit vector toward the galactic center (l = 0, b = 0). It is
 *  ŷ × n normalized — perpendicular to the pole by construction, and the
 *  tilt above keeps the two well clear of parallel. */
const GAL_U: CosmosVec3 = (() => {
  const x = GAL_N.z;
  const y = 0;
  const z = -GAL_N.x;
  const m = len(x, y, z);
  return { x: x / m, y: y / m, z: z / m };
})();

/** In-plane unit vector toward l = 90°. Completes a right-handed triad. */
const GAL_V: CosmosVec3 = {
  x: GAL_N.y * GAL_U.z - GAL_N.z * GAL_U.y,
  y: GAL_N.z * GAL_U.x - GAL_N.x * GAL_U.z,
  z: GAL_N.x * GAL_U.y - GAL_N.y * GAL_U.x,
};

/** Galactic coordinates → the cohort frame. `l`/`b` in degrees, `d` in ly. */
function galactic(lDeg: number, bDeg: number, d: number): CosmosVec3 {
  const l = (lDeg * Math.PI) / 180;
  const b = (bDeg * Math.PI) / 180;
  const cb = Math.cos(b);
  const ux = cb * Math.cos(l);
  const vy = cb * Math.sin(l);
  const nz = Math.sin(b);
  return {
    x: (GAL_U.x * ux + GAL_V.x * vy + GAL_N.x * nz) * d,
    y: (GAL_U.y * ux + GAL_V.y * vy + GAL_N.y * nz) * d,
    z: (GAL_U.z * ux + GAL_V.z * vy + GAL_N.z * nz) * d,
  };
}

/** A point in the galactic disk: galactocentric radius, azimuth, height. */
function disk(radius: number, azimuth: number, height: number): CosmosVec3 {
  const a = radius * Math.cos(azimuth);
  const b = radius * Math.sin(azimuth);
  return {
    x: GAL_CENTER.x + GAL_U.x * a + GAL_V.x * b + GAL_N.x * height,
    y: GAL_CENTER.y + GAL_U.y * a + GAL_V.y * b + GAL_N.y * height,
    z: GAL_CENTER.z + GAL_U.z * a + GAL_V.z * b + GAL_N.z * height,
  };
}

// ── Tier A: the Milky Way ─────────────────────────────────────────────────

/** Our distance from the galactic center. ~8 kpc, the modern figure. */
export const SUN_GALACTOCENTRIC_LY = 26_000;

const GAL_CENTER: CosmosVec3 = {
  x: GAL_U.x * SUN_GALACTOCENTRIC_LY,
  y: GAL_U.y * SUN_GALACTOCENTRIC_LY,
  z: GAL_U.z * SUN_GALACTOCENTRIC_LY,
};

const DISK_RADIUS_LY = 50_000;
const DISK_SCALE_LENGTH_LY = 10_000;
const DISK_SCALE_HEIGHT_LY = 950;

const BAR_HALF_LY = 7_000;
const BAR_WIDTH_LY = 2_300;
const BAR_HEIGHT_LY = 1_600;
/** The bar's long axis sits ~25° off the Sun–center line, as ours does. */
const BAR_ANGLE = 0.44;

const ARM_COUNT = 4;
/** tan(12.5°) — the winding of a Perseus/Scutum-class arm. */
const ARM_PITCH = 0.2217;
const ARM_R_IN_LY = 13_000; // arms start where the bar ends
const ARM_R_OUT_LY = 48_000;

/** No backdrop particle may sit close enough to the cohort to be mistaken
 *  for a catalog star. The neighborhood is 25 ly; this is twenty times it. */
const EXCLUSION_LY = 500;

// Weighted toward the arms: the smooth disk is the sea the structure sits in,
// and if the two are evenly matched the galaxy reads as a fuzzy ball from
// outside instead of as a spiral.
const N_BULGE = 1_150;
const N_DISK = 1_750;
const N_ARM = 2_700;

// Palettes. Two colors are off-limits everywhere in this file: the cyan that
// means HOME and the amber that means a detected source. The bulge runs
// yellow-cream rather than amber, and the dust runs frankly red, so nothing
// in the backdrop can be mistaken for something the game is telling you.
/** Warm, crowded, old — the bar and bulge. */
const BULGE_TINTS = [0xffd79a, 0xffcf8f, 0xffdca8, 0xffe4b8] as const;
/** The general disk: yellow-white, the Sun's own family. */
const DISK_TINTS = [0xfff0d2, 0xffe6bd, 0xf6f0e2, 0xffdfae, 0xe9dcc4] as const;
/** Arms: young, hot, blue-white. Never teal — teal is HOME. */
const ARM_TINTS = [0xc9dcff, 0xdfeaff, 0xa9c6ff, 0xeef4ff] as const;
/** Dust-lane reddening scattered through the arms. */
const DUST_TINTS = [0xff8a55, 0xe0663c, 0xffa070] as const;

/** One backdrop star. Sized in screen pixels rather than light-years: these
 *  are point sources, and a point source does not get bigger because you
 *  flew closer to a different part of the galaxy. */
export interface CosmosParticle {
  readonly pos: CosmosVec3;
  readonly tint: number;
  /** Base drawn size in px at the reference depth; the Model scales it. */
  readonly sizePx: number;
  readonly alpha: number;
}

/** A soft luminous haze — what makes the galaxy read as an object rather
 *  than confetti. Sized in light-years, so perspective handles it honestly. */
export interface CosmosGlow {
  readonly pos: CosmosVec3;
  readonly tint: number;
  readonly sizeLy: number;
  readonly alpha: number;
}

/** A galaxy: tiers B and C. `baseSizeLy` is a physical diameter, so the
 *  projection decides how big it looks and Andromeda is genuinely the
 *  largest thing in the sky because it genuinely is. */
export interface CosmosGalaxy {
  readonly pos: CosmosVec3;
  /** Index into buildGalaxyCanvases(). */
  readonly tex: number;
  readonly tint: number;
  readonly baseSizeLy: number;
  readonly alpha: number;
  readonly rotation: number;
}

export interface CosmosLandmark {
  readonly name: string;
  readonly pos: CosmosVec3;
  /** Which tier's fade gates the label. */
  readonly tier: "milkyway" | "localgroup" | "web";
}

export interface Cosmos {
  readonly milkyWay: readonly CosmosParticle[];
  readonly glows: readonly CosmosGlow[];
  readonly localGroup: readonly CosmosGalaxy[];
  readonly web: readonly CosmosGalaxy[];
}

/** Rejection guard: keep the neighborhood clear of scenery. */
function outsideExclusion(p: CosmosVec3): boolean {
  return len(p.x, p.y, p.z) >= EXCLUSION_LY;
}

function buildBulge(rnd: Rnd, out: CosmosParticle[]): void {
  // Two populations sharing one look: a boxy bar and the rounder bulge it
  // sits inside. Both fatter in z than the disk, both distinctly orange.
  const cosB = Math.cos(BAR_ANGLE);
  const sinB = Math.sin(BAR_ANGLE);
  for (let i = 0; i < N_BULGE; i++) {
    let pos: CosmosVec3 = GAL_CENTER;
    let guard = 0;
    do {
      if (rnd() < 0.55) {
        // Bar: long, narrow, thick.
        const t = (rnd() * 2 - 1) * BAR_HALF_LY;
        const w = gauss(rnd) * BAR_WIDTH_LY * 0.5;
        const h = gauss(rnd) * BAR_HEIGHT_LY * 0.5;
        const a = t * cosB - w * sinB;
        const b = t * sinB + w * cosB;
        pos = disk(Math.hypot(a, b), Math.atan2(b, a), h);
      } else {
        // Bulge: a squashed spheroid, r^3-weighted toward the middle.
        const r = 4_600 * Math.pow(rnd(), 0.62);
        const d = randomDir(rnd);
        const a = d.x * r;
        const b = d.y * r;
        const h = d.z * r * 0.55;
        pos = disk(Math.hypot(a, b), Math.atan2(b, a), h);
      }
      guard++;
    } while (!outsideExclusion(pos) && guard < 8);
    out.push({
      pos,
      tint: pick(rnd, BULGE_TINTS),
      sizePx: 0.85 + Math.pow(rnd(), 3) * 1.5,
      alpha: 0.3 + rnd() * 0.32,
    });
  }
}

function buildDisk(rnd: Rnd, out: CosmosParticle[]): void {
  for (let i = 0; i < N_DISK; i++) {
    let pos: CosmosVec3 = GAL_CENTER;
    let guard = 0;
    do {
      // Exponential radial falloff, truncated at the disk edge.
      let r = 0;
      for (let k = 0; k < 12; k++) {
        r = -DISK_SCALE_LENGTH_LY * Math.log(Math.max(1e-9, rnd()));
        if (r >= 1_500 && r <= DISK_RADIUS_LY) break;
        r = clamp(r, 1_500, DISK_RADIUS_LY);
      }
      // The thin disk flares thicker toward the center, where the bulge is.
      const hz = DISK_SCALE_HEIGHT_LY * (1 + 2.2 * Math.exp(-r / 7_000));
      const h =
        clamp(-hz * Math.log(Math.max(1e-9, rnd())), 0, hz * 4) *
        (rnd() < 0.5 ? -1 : 1);
      pos = disk(r, rnd() * Math.PI * 2, h);
      guard++;
    } while (!outsideExclusion(pos) && guard < 8);
    out.push({
      pos,
      tint: pick(rnd, DISK_TINTS),
      sizePx: 0.8 + Math.pow(rnd(), 3) * 1.6,
      alpha: 0.22 + rnd() * 0.3,
    });
  }
}

function buildArms(rnd: Rnd, out: CosmosParticle[]): void {
  // Four logarithmic arms, R = R_in · e^(k·φ). Over this radius range that
  // is a little under one full turn each — which is what a 12.5° pitch
  // actually gives you, and why real spirals look wound rather than pinwheel.
  for (let i = 0; i < N_ARM; i++) {
    const arm = Math.floor(rnd() * ARM_COUNT);
    let pos: CosmosVec3 = GAL_CENTER;
    let guard = 0;
    do {
      // Weight the inner arms, where the star formation is.
      const r = ARM_R_IN_LY + (ARM_R_OUT_LY - ARM_R_IN_LY) * Math.pow(rnd(), 1.35);
      const phi = (arm * 2 * Math.PI) / ARM_COUNT + Math.log(r / ARM_R_IN_LY) / ARM_PITCH;
      // Arms are ridges, not wires: scatter across and along, wider outward.
      // Narrow enough to hold as ridges, wide enough not to look drawn.
      const width = 800 + r * 0.022;
      const dr = gauss(rnd) * width;
      const dphi = (gauss(rnd) * width * 0.9) / r;
      const hz = DISK_SCALE_HEIGHT_LY * 0.75;
      const h = clamp(-hz * Math.log(Math.max(1e-9, rnd())), 0, hz * 3) * (rnd() < 0.5 ? -1 : 1);
      pos = disk(Math.max(2_000, r + dr), phi + dphi, h);
      guard++;
    } while (!outsideExclusion(pos) && guard < 8);
    const dusty = rnd() < 0.14;
    out.push({
      pos,
      tint: dusty ? pick(rnd, DUST_TINTS) : pick(rnd, ARM_TINTS),
      sizePx: dusty ? 0.8 + rnd() * 0.9 : 0.95 + Math.pow(rnd(), 2.4) * 1.9,
      alpha: dusty ? 0.18 + rnd() * 0.2 : 0.34 + rnd() * 0.4,
    });
  }
}

function buildGlows(rnd: Rnd): CosmosGlow[] {
  // A handful only. Each is huge and very faint, and each must sit at least
  // 1.6× its own radius away from us — otherwise the camera ends up inside a
  // glow at neighborhood zoom and the whole sky washes to a flat smear.
  const out: CosmosGlow[] = [];
  const push = (pos: CosmosVec3, sizeLy: number, tint: number, alpha: number): void => {
    if (len(pos.x, pos.y, pos.z) < sizeLy * 1.6) return;
    out.push({ pos, sizeLy, tint, alpha });
  };

  // The bulge, layered — this is the brightening toward Sagittarius.
  push(GAL_CENTER, 21_000, 0xffd9a8, 0.07);
  push(GAL_CENTER, 12_000, 0xffe3ba, 0.09);
  push(GAL_CENTER, 6_500, 0xfff0d8, 0.1);
  for (let i = 0; i < 5; i++) {
    const a = BAR_ANGLE + (rnd() - 0.5) * 0.3;
    const t = (rnd() * 2 - 1) * BAR_HALF_LY;
    push(
      disk(Math.abs(t), t < 0 ? a + Math.PI : a, gauss(rnd) * 700),
      6_000 + rnd() * 4_000,
      0xffdcae,
      0.045 + rnd() * 0.03,
    );
  }

  // Arm haze — a few soft patches riding the far arms, so the band has
  // brightness structure and not just grain.
  for (let i = 0; i < 18; i++) {
    const arm = Math.floor(rnd() * ARM_COUNT);
    const r = ARM_R_IN_LY + (ARM_R_OUT_LY - ARM_R_IN_LY) * rnd();
    const phi = (arm * 2 * Math.PI) / ARM_COUNT + Math.log(r / ARM_R_IN_LY) / ARM_PITCH;
    push(
      disk(r, phi + (rnd() - 0.5) * 0.12, gauss(rnd) * 500),
      7_000 + rnd() * 9_000,
      rnd() < 0.35 ? 0xffc9a8 : 0x9fc0f0,
      0.028 + rnd() * 0.025,
    );
  }
  return out;
}

// ── Tier B: the Local Group ───────────────────────────────────────────────
//
// Texture indices, shared by both galaxy tiers.
const TEX_SPIRAL = 0;
const TEX_SPIRAL_BARRED = 1;
const TEX_SPIRAL_INCLINED = 2;
const TEX_ELLIPTICAL = 3;
const TEX_IRREGULAR = 4;
const TEX_DWARF = 5;

/** The named members, with their real galactic coordinates and distances. */
const LOCAL_GROUP_NAMED: readonly {
  readonly name: string;
  readonly l: number;
  readonly b: number;
  readonly distLy: number;
  readonly tex: number;
  readonly sizeLy: number;
  readonly tint: number;
  readonly alpha: number;
  readonly rotation: number;
  readonly landmark: boolean;
}[] = [
  // Tidally shredded, wrapped around the far side of our own bulge. Faint
  // because it is: you cannot see it, you infer it.
  {
    name: "Sagittarius Dwarf",
    l: 5.6, b: -14.2, distLy: 65_000,
    tex: TEX_DWARF, sizeLy: 10_000, tint: 0xf2e2cf, alpha: 0.13, rotation: 0.6,
    landmark: false,
  },
  {
    name: "Large Magellanic Cloud",
    l: 280.5, b: -32.9, distLy: 163_000,
    tex: TEX_IRREGULAR, sizeLy: 14_000, tint: 0xe8effc, alpha: 0.8, rotation: 2.1,
    landmark: true,
  },
  {
    name: "Small Magellanic Cloud",
    l: 302.8, b: -44.3, distLy: 200_000,
    tex: TEX_IRREGULAR, sizeLy: 7_000, tint: 0xe4ecfb, alpha: 0.62, rotation: 0.9,
    landmark: true,
  },
  // The biggest thing out there, and inclined ~77° to our line of sight.
  {
    name: "Andromeda",
    l: 121.2, b: -21.6, distLy: 2_540_000,
    tex: TEX_SPIRAL_INCLINED, sizeLy: 150_000, tint: 0xffffff, alpha: 0.9, rotation: 0.55,
    landmark: true,
  },
  {
    name: "Triangulum",
    l: 133.6, b: -31.3, distLy: 2_730_000,
    tex: TEX_SPIRAL, sizeLy: 60_000, tint: 0xf2f6ff, alpha: 0.55, rotation: 2.8,
    landmark: true,
  },
];

const N_LOCAL_DWARFS = 38;

function buildLocalGroup(rnd: Rnd): CosmosGalaxy[] {
  const out: CosmosGalaxy[] = [];
  for (const m of LOCAL_GROUP_NAMED) {
    out.push({
      pos: galactic(m.l, m.b, m.distLy),
      tex: m.tex,
      tint: m.tint,
      baseSizeLy: m.sizeLy,
      alpha: m.alpha,
      rotation: m.rotation,
    });
  }

  // The unnamed dwarfs. Invented individually, but distributed the way the
  // real ones are: most of them are satellites of one of the two big spirals,
  // and only a minority are free-floating out in the Group.
  const m31 = galactic(121.2, -21.6, 2_540_000);
  for (let i = 0; i < N_LOCAL_DWARFS; i++) {
    const roll = rnd();
    let pos: CosmosVec3;
    if (roll < 0.42) {
      // Ours: a halo of satellites out to ~900 kly.
      const d = 90_000 + Math.pow(rnd(), 0.7) * 800_000;
      const u = randomDir(rnd);
      pos = { x: u.x * d, y: u.y * d, z: u.z * d };
    } else if (roll < 0.78) {
      // Andromeda's, clustered on M31.
      pos = {
        x: m31.x + gauss(rnd) * 190_000,
        y: m31.y + gauss(rnd) * 190_000,
        z: m31.z + gauss(rnd) * 190_000,
      };
    } else {
      // Free-floating out in the Group.
      const d = 1_200_000 + rnd() * 1_900_000;
      const u = randomDir(rnd);
      pos = { x: u.x * d, y: u.y * d, z: u.z * d };
    }
    out.push({
      pos,
      tex: rnd() < 0.65 ? TEX_DWARF : TEX_IRREGULAR,
      tint: rnd() < 0.5 ? 0xf0e6d6 : 0xdfe8fa,
      baseSizeLy: 4_000 + rnd() * 8_000,
      alpha: 0.1 + rnd() * 0.2,
      rotation: rnd() * Math.PI * 2,
    });
  }
  return out;
}

// ── Tier C: the cosmic web ────────────────────────────────────────────────

interface WebNode {
  readonly name: string | null;
  readonly pos: CosmosVec3;
  readonly richness: number; // how many galaxies sit in the node itself
  readonly spreadLy: number;
}

/** The Local Void: a real hole, roughly toward l ≈ 45°, b ≈ +15°, and the
 *  thing that makes the web read as structure rather than static. Nothing is
 *  placed within this cone. */
const VOID_DIR = galactic(45, 15, 1);
const VOID_COS = Math.cos((36 * Math.PI) / 180);

function inVoid(p: CosmosVec3): boolean {
  const m = len(p.x, p.y, p.z);
  if (m <= 0) return false;
  const dot = (p.x * VOID_DIR.x + p.y * VOID_DIR.y + p.z * VOID_DIR.z) / m;
  return dot > VOID_COS;
}

const N_WEB_ANON_NODES = 13;
const N_WEB_FIELD = 130;

function buildWeb(rnd: Rnd): { galaxies: CosmosGalaxy[]; nodes: WebNode[] } {
  const nodes: WebNode[] = [
    // Real anchors. Virgo is the one we are actually falling toward.
    { name: "Virgo Cluster", pos: galactic(279, 74, 54_000_000), richness: 62, spreadLy: 4_200_000 },
    { name: "Fornax Cluster", pos: galactic(236, -53.9, 62_000_000), richness: 26, spreadLy: 3_000_000 },
    { name: "Coma Cluster", pos: galactic(58, 88, 320_000_000), richness: 44, spreadLy: 12_000_000 },
  ];
  for (let i = 0; i < N_WEB_ANON_NODES; i++) {
    let pos = { x: 0, y: 0, z: 0 };
    for (let guard = 0; guard < 24; guard++) {
      const d = 30_000_000 + Math.pow(rnd(), 0.8) * 320_000_000;
      const u = randomDir(rnd);
      pos = { x: u.x * d, y: u.y * d, z: u.z * d };
      if (!inVoid(pos)) break;
    }
    nodes.push({
      name: null,
      pos,
      richness: 6 + Math.floor(rnd() * 13),
      spreadLy: 2_500_000 + rnd() * 9_000_000,
    });
  }

  const galaxies: CosmosGalaxy[] = [];
  const pushGalaxy = (pos: CosmosVec3, big: boolean): void => {
    if (inVoid(pos)) return;
    const roll = rnd();
    const tex =
      roll < 0.34
        ? TEX_SPIRAL
        : roll < 0.52
          ? TEX_SPIRAL_BARRED
          : roll < 0.68
            ? TEX_SPIRAL_INCLINED
            : roll < 0.88
              ? TEX_ELLIPTICAL
              : TEX_IRREGULAR;
    const elliptical = tex === TEX_ELLIPTICAL;
    galaxies.push({
      pos,
      tex,
      tint: elliptical ? 0xffe0bb : 0xeaf0ff,
      baseSizeLy: (big ? 90_000 : 45_000) + rnd() * (big ? 90_000 : 65_000),
      alpha: 0.22 + rnd() * 0.3,
      rotation: rnd() * Math.PI * 2,
    });
  };

  // Cluster cores — the swarms.
  for (const node of nodes) {
    for (let i = 0; i < node.richness; i++) {
      // Centrally concentrated, with the giants in the middle.
      const s = node.spreadLy * Math.pow(rnd(), 0.55);
      const u = randomDir(rnd);
      pushGalaxy(
        { x: node.pos.x + u.x * s, y: node.pos.y + u.y * s, z: node.pos.z + u.z * s },
        node.name !== null && i < 4,
      );
    }
  }

  // Filaments. Each node reaches for its two nearest neighbors and the pair
  // gets strung with galaxies; the edges dedupe, so the result is a graph and
  // not a starburst. Everything between the strands stays empty, which is the
  // point — voids are most of the volume.
  const seen = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a === undefined) continue;
    const ranked = nodes
      .map((n, j) => ({ j, n, d: len(n.pos.x - a.pos.x, n.pos.y - a.pos.y, n.pos.z - a.pos.z) }))
      .filter((e) => e.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    for (const edge of ranked) {
      const key = i < edge.j ? `${i}:${edge.j}` : `${edge.j}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const b = edge.n;
      const count = clamp(Math.round(edge.d / 7_500_000), 8, 24);
      const sigma = clamp(edge.d * 0.05, 1_500_000, 9_000_000);
      for (let k = 0; k < count; k++) {
        const t = rnd();
        pushGalaxy(
          {
            x: lerp(a.pos.x, b.pos.x, t) + gauss(rnd) * sigma,
            y: lerp(a.pos.y, b.pos.y, t) + gauss(rnd) * sigma,
            z: lerp(a.pos.z, b.pos.z, t) + gauss(rnd) * sigma,
          },
          false,
        );
      }
    }
  }

  // A sparse field, so the filaments are not the only thing out there.
  for (let i = 0; i < N_WEB_FIELD; i++) {
    const d = 15_000_000 + Math.pow(rnd(), 0.75) * 340_000_000;
    const u = randomDir(rnd);
    pushGalaxy({ x: u.x * d, y: u.y * d, z: u.z * d }, false);
  }

  return { galaxies, nodes };
}

// ── The one build entry point ─────────────────────────────────────────────

let built: Cosmos | null = null;
let landmarks: readonly CosmosLandmark[] | null = null;

/** Build (once) the whole backdrop. Deterministic; safe to call repeatedly —
 *  the result is memoized, since it is the same universe every time. */
export function buildCosmos(): Cosmos {
  if (built !== null) return built;
  const rnd = mulberry32(COSMOS_SEED);

  const milkyWay: CosmosParticle[] = [];
  buildBulge(rnd, milkyWay);
  buildDisk(rnd, milkyWay);
  buildArms(rnd, milkyWay);
  const glows = buildGlows(rnd);
  const localGroup = buildLocalGroup(rnd);
  const web = buildWeb(rnd);

  const marks: CosmosLandmark[] = [
    { name: "Galactic Center", pos: GAL_CENTER, tier: "milkyway" },
  ];
  for (const m of LOCAL_GROUP_NAMED) {
    if (!m.landmark) continue;
    marks.push({ name: m.name, pos: galactic(m.l, m.b, m.distLy), tier: "localgroup" });
  }
  for (const node of web.nodes) {
    if (node.name === null) continue;
    marks.push({ name: node.name, pos: node.pos, tier: "web" });
  }
  landmarks = marks;

  built = { milkyWay, glows, localGroup, web: web.galaxies };
  return built;
}

/** The ~8 named places worth labelling. Available after buildCosmos(). */
export function cosmosLandmarks(): readonly CosmosLandmark[] {
  if (landmarks === null) buildCosmos();
  return landmarks ?? [];
}

// ── Galaxy textures ───────────────────────────────────────────────────────
//
// Six canvases, built once and shared by every galaxy sprite in tiers B and
// C. Color is baked in rather than left to the sprite tint, because a galaxy
// is two colors at once — a warm old core inside a blue-white disk — and a
// tint can only be one. Per-item tint stays as a gentle modulation on top.

export const GALAXY_TEX_SIZE = 256;

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: readonly [number, number, number],
  alpha: number,
): void {
  if (r <= 0.3 || alpha <= 0.002) return;
  const [cr, cg, cb] = rgb;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
  g.addColorStop(0.42, `rgba(${cr},${cg},${cb},${alpha * 0.34})`);
  g.addColorStop(0.72, `rgba(${cr},${cg},${cb},${alpha * 0.08})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const ARM_RGB: readonly [number, number, number] = [188, 214, 255];
const HALO_RGB: readonly [number, number, number] = [126, 158, 214];
const CORE_RGB: readonly [number, number, number] = [255, 226, 178];
const KNOT_RGB: readonly [number, number, number] = [255, 196, 200];
const OLD_RGB: readonly [number, number, number] = [255, 216, 168];

function newCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = GALAXY_TEX_SIZE;
  canvas.height = GALAXY_TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("cosmos: no 2d context for a galaxy texture");
  // Galaxies are made of light: overlapping structure adds rather than
  // occludes, the same way the sprites do once they are on the stage.
  ctx.globalCompositeOperation = "lighter";
  return { canvas, ctx };
}

function drawSpiral(
  ctx: CanvasRenderingContext2D,
  rnd: Rnd,
  opts: { readonly arms: number; readonly pitch: number; readonly bar: boolean; readonly squash: number },
): void {
  const s = GALAXY_TEX_SIZE;
  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.scale(1, opts.squash);
  ctx.translate(-c, -c);

  blob(ctx, c, c, s * 0.46, HALO_RGB, 0.1);
  blob(ctx, c, c, s * 0.34, HALO_RGB, 0.11);

  const rIn = s * 0.09;
  const rOut = s * 0.44;
  const span = Math.log(rOut / rIn) / opts.pitch;
  for (let a = 0; a < opts.arms; a++) {
    const phi0 = (a * 2 * Math.PI) / opts.arms + rnd() * 0.16;
    for (let i = 0; i < 54; i++) {
      const t = i / 53;
      const phi = span * t;
      const r = rIn * Math.exp(opts.pitch * phi);
      const jitter = s * 0.012 * gauss(rnd);
      const x = c + Math.cos(phi + phi0) * r + jitter;
      const y = c + Math.sin(phi + phi0) * r + jitter;
      blob(ctx, x, y, s * (0.026 + 0.022 * t), ARM_RGB, 0.13 * (1 - t * 0.55));
      if (rnd() < 0.16) blob(ctx, x, y, s * 0.012, KNOT_RGB, 0.3);
    }
  }

  if (opts.bar) {
    const ang = rnd() * Math.PI;
    for (let i = -9; i <= 9; i++) {
      const t = i / 9;
      blob(
        ctx,
        c + Math.cos(ang) * t * s * 0.19,
        c + Math.sin(ang) * t * s * 0.19,
        s * 0.048,
        OLD_RGB,
        0.14 * (1 - Math.abs(t) * 0.5),
      );
    }
  }

  blob(ctx, c, c, s * 0.15, CORE_RGB, 0.5);
  blob(ctx, c, c, s * 0.07, [255, 244, 224], 0.85);
  ctx.restore();
}

function drawElliptical(ctx: CanvasRenderingContext2D, rnd: Rnd): void {
  const s = GALAXY_TEX_SIZE;
  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(rnd() * Math.PI);
  ctx.scale(1, 0.62 + rnd() * 0.26);
  ctx.translate(-c, -c);
  blob(ctx, c, c, s * 0.44, OLD_RGB, 0.11);
  blob(ctx, c, c, s * 0.26, OLD_RGB, 0.2);
  blob(ctx, c, c, s * 0.13, CORE_RGB, 0.55);
  blob(ctx, c, c, s * 0.05, [255, 246, 228], 0.9);
  ctx.restore();
}

function drawIrregular(ctx: CanvasRenderingContext2D, rnd: Rnd): void {
  const s = GALAXY_TEX_SIZE;
  const c = s / 2;
  blob(ctx, c, c, s * 0.4, HALO_RGB, 0.09);
  // A drifting clump of star-forming knots — no core, no symmetry. The
  // Magellanic Clouds are a bar with the wreckage of a disk around it.
  const ax = rnd() * Math.PI;
  for (let i = 0; i < 22; i++) {
    const t = (rnd() * 2 - 1) * s * 0.3;
    const off = gauss(rnd) * s * 0.09;
    const x = c + Math.cos(ax) * t - Math.sin(ax) * off;
    const y = c + Math.sin(ax) * t + Math.cos(ax) * off;
    blob(ctx, x, y, s * (0.035 + rnd() * 0.07), ARM_RGB, 0.1 + rnd() * 0.17);
    if (rnd() < 0.4) blob(ctx, x, y, s * 0.016, KNOT_RGB, 0.35);
  }
  blob(ctx, c, c, s * 0.09, [255, 240, 220], 0.34);
}

function drawDwarf(ctx: CanvasRenderingContext2D, rnd: Rnd): void {
  const s = GALAXY_TEX_SIZE;
  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(rnd() * Math.PI);
  ctx.scale(1, 0.7 + rnd() * 0.25);
  ctx.translate(-c, -c);
  // Barely there on purpose: a dwarf spheroidal is a smudge you argue about.
  blob(ctx, c, c, s * 0.42, [214, 220, 236], 0.1);
  blob(ctx, c, c, s * 0.24, [226, 228, 242], 0.12);
  blob(ctx, c, c, s * 0.09, [244, 242, 250], 0.22);
  ctx.restore();
}

/** The six shared galaxy textures, in the order the `tex` indices use. */
export function buildGalaxyCanvases(): HTMLCanvasElement[] {
  const rnd = mulberry32(COSMOS_SEED ^ 0x9e3779b9);
  const out: HTMLCanvasElement[] = [];

  const spiral = newCanvas();
  drawSpiral(spiral.ctx, rnd, { arms: 2, pitch: 0.26, bar: false, squash: 1 });
  out.push(spiral.canvas);

  const barred = newCanvas();
  drawSpiral(barred.ctx, rnd, { arms: 2, pitch: 0.22, bar: true, squash: 0.9 });
  out.push(barred.canvas);

  const inclined = newCanvas();
  drawSpiral(inclined.ctx, rnd, { arms: 4, pitch: 0.2, bar: false, squash: 0.3 });
  out.push(inclined.canvas);

  const elliptical = newCanvas();
  drawElliptical(elliptical.ctx, rnd);
  out.push(elliptical.canvas);

  const irregular = newCanvas();
  drawIrregular(irregular.ctx, rnd);
  out.push(irregular.canvas);

  const dwarf = newCanvas();
  drawDwarf(dwarf.ctx, rnd);
  out.push(dwarf.canvas);

  return out;
}
