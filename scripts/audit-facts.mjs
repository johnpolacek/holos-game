// The restated-fact audit (prose-style.md R-1, R-29).
//
//   npm run audit:facts
//
// R-29 puts every fact in voice prose behind a `Fact` constructor, so a number
// a player reads cannot drift from the number the game runs on. The CATALOGS
// are outside that scheme by design: a project's `effectLine` and a standing
// order's `line` are plain strings authored beside the structured fields they
// describe, and they ship to the client as prose, already formatted.
//
// Which means every one of them is a hand-maintained echo. `effectLine` says
// "Raises the compute income by 6 a year" and `effect.addRatePerYear` says 6,
// and NOTHING has been checking that those two agree. Retune the effect, leave
// the sentence, and the receipt the player reads is simply false — no type
// error, no failing audit, no digit out of place for R-29 to catch, because
// R-29 governs voice.ts and these are catalogs.
//
// Spelling the number out hides it further. `orders.ts` says "twenty
// light-years" while `WARM_RADIUS_LY` says 20; a grep for digits finds nothing
// to check. orders.ts states the principle itself, one field above the one
// that breaks it: the sentinel's cost is read from the mission catalog rather
// than restated, because "an order that could drift out of step with what it
// dispatches would be a receipt for something else". This audit applies that
// sentence to the rest of the catalog.
//
// EVERY COUPLING IS DECLARED, not inferred. A regex that went looking for
// "numbers near prose" would be a guess, and a guess that passes is worse than
// no audit. Each check below names the prose, the structured field, and how the
// one is written from the other.
//
// THE LIMIT, STATED PLAINLY: this audit knows only the couplings written into
// it. A NEW effect kind whose prose restates a NEW field is not covered until
// someone adds it here, and nothing will announce that. What it does guarantee
// is that the couplings it names cannot drift, and that a retune of an existing
// field is caught the same day. Treat the check list as the spec for what
// catalog prose is allowed to restate, and extend it when the prose does.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

/** Spelled forms this game actually uses. Extend as prose does. */
const WORD_NUMBER = new Map([
  ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["twelve", 12], ["twenty", 20], ["thirty", 30], ["forty", 40],
  ["fifty", 50], ["sixty", 60], ["hundred", 100],
]);

/** "a tenth" / "an eighth" — the fraction words the probe lines use. */
const WORD_FRACTION = new Map([
  ["half", 1 / 2], ["third", 1 / 3], ["quarter", 1 / 4], ["fifth", 1 / 5],
  ["sixth", 1 / 6], ["eighth", 1 / 8], ["tenth", 1 / 10], ["twentieth", 1 / 20],
]);

const failures = [];
const checks = [];

function check(what, prose, expected, actual) {
  checks.push(what);
  if (expected !== actual) {
    failures.push({ what, prose, expected, actual });
  }
}

/** questions.ts's ALL-CAPS chrome label for an id. */
let QUESTION_LABELS = null;
function questionLabel(id) {
  if (QUESTION_LABELS === null) {
    QUESTION_LABELS = new Map(
      [...read("server/src/questions.ts").matchAll(/id:\s*"([\w-]+)",\s*\n\s*label:\s*"([^"]+)"/g)]
        .map((m) => [m[1], m[2]]),
    );
  }
  return QUESTION_LABELS.get(id) ?? null;
}

/** Every question the catalog defines, so "all six" can be told from "some". */
function allQuestionLabels() {
  questionLabel("");
  return [...QUESTION_LABELS.values()];
}

// ---------------------------------------------------------------------------
// projects.ts — `effectLine` against `effect`
// ---------------------------------------------------------------------------

const projects = read("server/src/projects.ts");

/**
 * Split the array into records FIRST, then read each one on its own. A single
 * regex spanning `id` to `effect` walks straight across the record boundary and
 * pairs one project's prose with the next one's numbers — which is how the
 * first draft of this audit reported six failures against a catalog that was
 * correct. An audit that cannot be trusted when it fails is worth less than
 * none, so the parse is boring on purpose.
 */
function records(source, arrayName) {
  const start = source.indexOf(`export const ${arrayName}`);
  if (start < 0) return [];
  const body = source.slice(start);
  const out = [];
  // Top-level entries of the array sit at exactly two spaces of indent.
  const re = /\n {2}\{\n([\s\S]*?)\n {2}\},/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push(m[1]);
  return out;
}

let projectCount = 0;
for (const record of records(projects, "PROJECTS")) {
  const idHit = record.match(/id:\s*"([\w-]+)"/);
  const lineHit = record.match(/effectLine:\s*"([^"]+)"/);
  const effectHit = record.match(/effect:\s*\{([\s\S]*)\}/);
  if (!idHit || !lineHit || !effectHit) continue;
  const id = idHit[1];
  const line = lineHit[1];
  const effect = effectHit[1];
  projectCount += 1;
  const num = (field) => {
    const hit = effect.match(new RegExp(`${field}:\\s*(-?[\\d.]+)`));
    return hit ? Number(hit[1]) : null;
  };

  // "Raises the compute income by 6 a year"
  const rate = num("addRatePerYear");
  if (rate !== null) {
    const said = line.match(/by (\d+) a year/);
    check(`${id}: income rate`, line, rate, said ? Number(said[1]) : null);
  }

  // "cost 40% less compute" / "costs 20% less compute". The only percent a
  // project effect carries is a question discount: nothing in the catalog
  // moves a question's clock, because a question has none (physics-audit.md
  // P0-1). A `percent` on any future effect kind lands here too.
  const percent = num("percent");
  if (percent !== null) {
    const said = line.match(/(\d+)%/);
    check(`${id}: percent`, line, percent, said ? Number(said[1]) : null);
  }

  // "five points higher" — confidence is stored as a fraction, said in points.
  const conf = num("addConfidence");
  if (conf !== null) {
    const said = line.match(/(\w+) points? higher/);
    const points = said ? (WORD_NUMBER.get(said[1]) ?? Number(said[1])) : null;
    check(`${id}: confidence points`, line, Math.round(conf * 100), points);
  }

  // "at an eighth of lightspeed, up from a tenth"
  const cruise = num("cruiseFractionOfC");
  if (cruise !== null) {
    const said = line.match(/an? (\w+) of lightspeed/);
    const frac = said ? (WORD_FRACTION.get(said[1]) ?? null) : null;
    check(`${id}: cruise fraction`, line, cruise, frac);
  }

  // The question chrome the line recites, against `questionIds`.
  //
  // A SUBSET must be named: "WEIGH IT and CATCH ITS EDGES cost 30% less
  // compute" is a promise about those two, and the player has no other way to
  // know which. THE WHOLE SET must NOT be: sky-vault reaches every question
  // and says "Every question on every study", which is both better prose and
  // drift-proof. So the check flips on which case it is, and the failure mode
  // it really guards is a line that enumerates five of six.
  const ids = [...effect.matchAll(/"([a-z-]+)"/g)].map((q) => q[1]);
  if (/questionIds/.test(effect) && ids.length > 0) {
    const labels = ids.map((q) => questionLabel(q)).filter((l) => l !== null);
    if (labels.length === allQuestionLabels().length) {
      const named = labels.filter((l) => line.includes(l));
      check(
        `${id}: reaches every question, so names none`,
        line,
        "",
        named.length === 0 ? "" : `enumerates instead of generalizing: ${named.join(", ")}`,
      );
    } else {
      const missing = labels.filter((l) => !line.includes(l));
      check(
        `${id}: names ${labels.length} question label(s)`,
        line,
        "",
        missing.length === 0 ? "" : `missing from the prose: ${missing.join(", ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// voyages.ts — a ship class's `line` against the physics it is sold on
//
// Every one of these is a spelled fraction: "Half of lightspeed" over
// TORCH_FLIGHT_YEARS_PER_LY = 2, "Four fifths" over SAIL = 1.25. A player
// choosing between a torch and a sail is choosing on those words, so a retune
// that left them behind would be mis-selling the ship, and no digit check
// anywhere would see it.
//
// The seedship's "It arrives in a century" is deliberately NOT checked: it is
// a crossing time for a typical neighborhood hop, not a constant restated, and
// pinning it would be inventing a coupling the catalog does not claim.
// ---------------------------------------------------------------------------

/** "half" / "a tenth" / "four fifths" -> a number, or null. */
function spokenFraction(phrase) {
  const words = phrase.toLowerCase().trim().split(/\s+/);
  if (words.length === 1) return WORD_FRACTION.get(words[0]) ?? null;
  const [first, second] = words;
  if (first === "a" || first === "an") return WORD_FRACTION.get(second) ?? null;
  // "four fifths" — a numerator word over a pluralised denominator word.
  const n = WORD_NUMBER.get(first);
  const d = WORD_FRACTION.get(second.replace(/s$/, ""));
  return n !== undefined && d !== undefined ? n * d : null;
}

const voyages = read("server/src/voyages.ts");
const voyageConst = (name) => {
  const hit = voyages.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`));
  return hit ? Number(hit[1]) : null;
};

let voyageCount = 0;
for (const record of records(voyages, "VOYAGE_KINDS")) {
  const kindHit = record.match(/kind:\s*"([\w-]+)"/);
  const lineHit = record.match(/line:\s*"([^"]+)"/);
  const flightHit = record.match(/flightYearsPerLy:\s*(\w+)/);
  if (!kindHit || !lineHit || !flightHit) continue;
  const kind = kindHit[1];
  const line = lineHit[1];
  voyageCount += 1;

  // Speed, said as a fraction of c; stored as years of flight per light-year.
  const yearsPerLy = voyageConst(flightHit[1]) ?? Number(flightHit[1]);
  const said = line.match(/^(.*?) of lightspeed/);
  if (said && Number.isFinite(yearsPerLy) && yearsPerLy > 0) {
    const spoken = spokenFraction(said[1]);
    const actual = 1 / yearsPerLy;
    check(
      `${kind}: cruise fraction of c`,
      line,
      Math.round(actual * 1000) / 1000,
      spoken === null ? null : Math.round(spoken * 1000) / 1000,
    );
  }

  // "The flare lasts eight years" against departureYears.
  const flareHit = record.match(/departureYears:\s*(\d+)/);
  if (flareHit) {
    const flare = line.match(/flare lasts (\w+) years?/);
    const spoken = flare ? (WORD_NUMBER.get(flare[1]) ?? Number(flare[1])) : null;
    check(`${kind}: flare years`, line, Number(flareHit[1]), spoken);
  }
}

// ---------------------------------------------------------------------------
// orders.ts — the order as written, against the radius it fires on
// ---------------------------------------------------------------------------

const orders = read("server/src/orders.ts");
const radiusConst = orders.match(/WARM_RADIUS_LY\s*=\s*(\d+)/);
const orderLine = orders.match(/line:\s*"([^"]+)"/);
if (radiusConst && orderLine) {
  const said = orderLine[1].match(/inside ([\w-]+) light-years/);
  const spoken = said ? (WORD_NUMBER.get(said[1]) ?? Number(said[1])) : null;
  check("warm movement order: radius", orderLine[1], Number(radiusConst[1]), spoken);
} else {
  failures.push({
    what: "warm movement order",
    prose: "(not found)",
    expected: "WARM_RADIUS_LY and a `line:` to check it against",
    actual: "the audit could not find one of them; has orders.ts been restructured?",
  });
}

// ---------------------------------------------------------------------------

if (projectCount === 0) {
  console.error("matched zero projects — the audit is not testing anything");
  process.exit(1);
}

console.log(`projects read            ${projectCount}`);
console.log(`ship classes read        ${voyageCount}`);
console.log(`restated facts checked   ${checks.length}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} restated fact(s) disagree with the field they describe:`);
  for (const f of failures) {
    console.error(`  ${f.what}`);
    console.error(`    prose says     ${JSON.stringify(f.actual)}`);
    console.error(`    the field says ${JSON.stringify(f.expected)}`);
    console.error(`    "${f.prose}"`);
  }
  console.error(
    "\nR-1: restyling never edits a fact, and retuning a field never leaves the\n" +
      "sentence behind. Fix whichever one is wrong, then re-run.",
  );
  process.exit(1);
}

console.log("\nevery restated fact agrees with the field it describes");
