#!/usr/bin/env node
// Render the Open Graph / social share card (client/public/og-image.png,
// 1200x630) from primitives: the Holos mark (amber ring + blue dot, same
// geometry as the app icons) and the "HOLOS" wordmark set in Cinzel — the
// display face shipped in client/public/fonts. Deterministic; no external art.
//
// The wordmark is rendered from scripts/assets/cinzel.ttf (freetype cannot
// read the shipped .woff2, so a committed .ttf copy is the build input). Tweak
// and re-run:  npm run og

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "client", "public", "og-image.png");
const FONT = join(ROOT, "scripts", "assets", "cinzel.ttf");

const W = 1200;
const H = 630;

const FIELD = "#070B12";
const AMBER = "#d99a53";
const BLUE = "#3b82f6";
const TITLE = "#e8edf5";
const MUTED = "#8b95a7";

// Deterministic faint starfield — a fixed scatter, no RNG (keeps re-runs
// byte-stable). Values are hand-picked to sit clear of the centered mark/text.
const STARS = [
  [80, 70, 1.1, 0.5], [190, 130, 0.8, 0.35], [300, 60, 1.4, 0.6], [70, 300, 0.9, 0.4],
  [150, 470, 1.2, 0.45], [95, 560, 0.7, 0.3], [1120, 90, 1.3, 0.55], [1040, 200, 0.9, 0.4],
  [1150, 330, 1.1, 0.5], [980, 520, 0.8, 0.35], [1100, 560, 1.0, 0.45], [1180, 470, 0.7, 0.3],
  [420, 40, 0.8, 0.35], [780, 55, 1.0, 0.45], [860, 120, 0.7, 0.3], [560, 600, 0.9, 0.4],
  [700, 585, 0.7, 0.3], [360, 585, 1.0, 0.4],
];

const cx = W / 2;
const markY = 210; // mark sits above the wordmark
const markR = 46; // ring radius
const strokeW = markR * 0.16;
const dotR = markR * 0.3;

const stars = STARS.map(
  ([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#cdd6e5" opacity="${o}"/>`,
).join("");

const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${FIELD}"/>
  <radialGradient id="glow" cx="50%" cy="33%" r="55%">
    <stop offset="0%" stop-color="#12203a" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="${FIELD}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${stars}
  <circle cx="${cx}" cy="${markY}" r="${markR}" fill="none" stroke="${AMBER}" stroke-width="${strokeW}"/>
  <circle cx="${cx}" cy="${markY}" r="${dotR}" fill="${BLUE}"/>
</svg>`;

/** Render text via freetype (fontfile) into an rgba PNG buffer, fit to a box. */
async function text(str, { width, height, color, spacing = 0 }) {
  const svg = await sharp({
    text: {
      text: `<span foreground="${color}" letter_spacing="${spacing}">${str}</span>`,
      fontfile: FONT,
      font: "Cinzel",
      rgba: true,
      width,
      height,
      align: "center",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return svg;
}

const wordmark = await text("HOLOS", { width: 560, height: 96, color: TITLE, spacing: 14000 });
const tagline = await text(
  "Raise a world to superintelligence — then reach across a galaxy built from real physics",
  { width: 940, height: 60, color: MUTED, spacing: 1000 },
);

const wmData = wordmark.data;
const wmW = wordmark.info.width;
const wmH = wordmark.info.height;
const tgData = tagline.data;
const tgW = tagline.info.width;
const tgH = tagline.info.height;

await sharp(Buffer.from(bg))
  .composite([
    { input: wmData, left: Math.round(cx - wmW / 2), top: 300 },
    { input: tgData, left: Math.round(cx - tgW / 2), top: 300 + wmH + 34 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`wrote ${OUT} (${W}x${H})  wordmark ${wmW}x${wmH}, tagline ${tgW}x${tgH}`);
