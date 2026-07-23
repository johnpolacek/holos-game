#!/usr/bin/env node
// Render the Holos mark at each target size. Geometry is calculated in target
// pixels so large icons keep the intended ring weight and visible center dot.

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "client", "public");

const AMBER = "#d99a53";
const BLUE = "#3b82f6";
const FIELD = "#070B12";

const REGULAR_MARK = {
  paddingRatio: 0.125,
  strokeRatio: 0.07,
  dotRatio: 0.14,
};

const ICONS = [
  { file: "favicon-16.png", size: 16, ...REGULAR_MARK, strokeRatio: 0.08 },
  { file: "favicon-32.png", size: 32, ...REGULAR_MARK },
  {
    file: "apple-touch-icon.png",
    size: 180,
    paddingRatio: 0.15,
    strokeRatio: 0.07,
    dotRatio: 0.14,
    background: FIELD,
  },
  { file: "icon-192.png", size: 192, ...REGULAR_MARK },
  { file: "icon-512.png", size: 512, ...REGULAR_MARK },
  {
    file: "icon-192-maskable.png",
    size: 192,
    paddingRatio: 0.2,
    strokeRatio: 0.08,
    dotRatio: 0.15,
    background: FIELD,
  },
  {
    file: "icon-512-maskable.png",
    size: 512,
    paddingRatio: 0.2,
    strokeRatio: 0.08,
    dotRatio: 0.15,
    background: FIELD,
  },
];

function renderSvg({ size, paddingRatio, strokeRatio, dotRatio, background }) {
  const center = size / 2;
  const strokeWidth = size * strokeRatio;
  const ringRadius = center - size * paddingRatio - strokeWidth / 2;
  const dotRadius = size * dotRatio;
  const field = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
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
