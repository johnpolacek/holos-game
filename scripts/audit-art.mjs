// Mechanical gate over the content-art library (docs/content-art-*.md).
// What a machine can check, it checks here so an eyeball pass never has to:
//   - every manifest output file exists at client/public/art/<path>
//   - every file decodes as webp
//   - every crop matches its declared aspect ratio (1:1 / 16:9, small tolerance)
// Color-is-meaning and isolation remain human judgement; this catches the rest.
// Fails closed: any missing file, undecodable file, or wrong-shaped render is
// a failure. Run: npm run audit:art
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const MANIFEST = join(ROOT, "docs", "content-art-manifest.json");
const ART_DIR = join(ROOT, "client", "public", "art");

const RATIO_TOLERANCE = 0.02;
const EXPECTED = {
  sq: 1,
  wide: 16 / 9,
};

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const failures = [];
let checked = 0;

for (const plate of manifest.plates) {
  for (const output of plate.outputs) {
    const rel = output.path;
    const abs = join(ART_DIR, rel);
    checked++;
    const label = `${plate.id} ${plate.name} [${output.ratio}]`;
    try {
      statSync(abs);
    } catch {
      failures.push(`${label}: missing file ${rel}`);
      continue;
    }
    let meta;
    try {
      meta = await sharp(abs).metadata();
    } catch (err) {
      failures.push(`${label}: unreadable image (${err.message})`);
      continue;
    }
    if (meta.format !== "webp") {
      failures.push(`${label}: format is ${meta.format}, expected webp`);
    }
    const { width, height } = meta;
    if (!width || !height) {
      failures.push(`${label}: no dimensions reported`);
      continue;
    }
    const expected = EXPECTED[output.ratio];
    if (!expected) {
      failures.push(`${label}: unknown ratio key ${output.ratio}`);
      continue;
    }
    const actual = width / height;
    if (Math.abs(actual - expected) > RATIO_TOLERANCE) {
      failures.push(
        `${label}: ${width}x${height} is ${actual.toFixed(3)}, expected ${output.ratio}`,
      );
    }
  }
}

console.log(`audit:art — ${checked} outputs across ${manifest.plates.length} plates`);
if (failures.length > 0) {
  console.error(`FAIL (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("OK");
