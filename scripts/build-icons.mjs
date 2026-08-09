#!/usr/bin/env node
// Render the Holos mark at each target size. Geometry is calculated in target
// pixels so large icons keep the intended ring weight and visible center dot.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "client", "public");

const AMBER = "#d99a53";
const BLUE = "#3b82f6";
const FIELD = "#070B12";

// A thin amber ring around a small blue dot, the way the home marker reads in
// the sky. The ring carries the mark; the dot is a point, not a pupil.
const REGULAR_MARK = {
  paddingRatio: 0.125,
  strokeRatio: 0.04,
  dotRatio: 0.05,
};

// Under about 48px those ratios fall below a device pixel and both the ring and
// the dot grey out, so the favicons are pinned to whole pixels instead: at 16 a
// 1px ring around a 2px dot, at 32 a 1.5px ring around a 3.5px dot. Those are
// the floors, not the design.
const FAVICON_32 = { paddingRatio: 0.125, strokeRatio: 0.047, dotRatio: 0.055 };
const FAVICON_16 = { paddingRatio: 0.125, strokeRatio: 0.0625, dotRatio: 0.0625 };

// Maskable icons sit inside a 0.2 safe-area inset, so the mark is drawn smaller
// than the tile. Nudge the weights up by the same fraction the old pair used, so
// the ring survives whatever mask the launcher crops it with.
const MASKABLE_MARK = {
  paddingRatio: 0.2,
  strokeRatio: 0.045,
  dotRatio: 0.055,
  background: FIELD,
};

const ICONS = [
  { file: "favicon-16.png", size: 16, ...FAVICON_16 },
  { file: "favicon-32.png", size: 32, ...FAVICON_32 },
  {
    file: "apple-touch-icon.png",
    size: 180,
    paddingRatio: 0.15,
    strokeRatio: 0.04,
    dotRatio: 0.05,
    background: FIELD,
  },
  { file: "icon-192.png", size: 192, ...REGULAR_MARK },
  { file: "icon-512.png", size: 512, ...REGULAR_MARK },
  { file: "icon-192-maskable.png", size: 192, ...MASKABLE_MARK },
  { file: "icon-512-maskable.png", size: 512, ...MASKABLE_MARK },
];

function renderSvg({ size, paddingRatio, strokeRatio, dotRatio, background, scalable }) {
  const center = size / 2;
  const strokeWidth = size * strokeRatio;
  const ringRadius = center - size * paddingRatio - strokeWidth / 2;
  const dotRadius = size * dotRatio;
  const field = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "";
  const box = scalable ? "" : ` width="${size}" height="${size}"`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"${box} viewBox="0 0 ${size} ${size}">`,
    field,
    `<circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="${AMBER}" stroke-width="${strokeWidth}"/>`,
    `<circle cx="${center}" cy="${center}" r="${dotRadius}" fill="${BLUE}"/>`,
    "</svg>",
  ].join("");
}

await mkdir(PUBLIC_DIR, { recursive: true });

for (const icon of ICONS) {
  const output = join(PUBLIC_DIR, icon.file);
  let image = sharp(Buffer.from(renderSvg(icon)));
  if (icon.background) image = image.flatten({ background: icon.background });
  await image.png({ compressionLevel: 9 }).toFile(output);
  console.log(`wrote ${output} (${icon.size}x${icon.size})`);
}

// favicon.svg is what a browser reaches for first, and it is drawn at favicon
// sizes, so it takes the 32px geometry. Emitting it here is what keeps it from
// drifting away from the PNGs beside it.
const faviconSvg = join(PUBLIC_DIR, "favicon.svg");
await writeFile(faviconSvg, `${renderSvg({ size: 32, ...FAVICON_32, scalable: true })}\n`);
console.log(`wrote ${faviconSvg}`);
