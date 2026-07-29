// The gate audit (prose-style.md §3, R-38).
//
//   npm run build && npm run audit:voice
//
// Runs EVERY SHIPPED BANK STRING through the style gate and asserts all of
// them pass. This is the highest-value check AV4 has: it validates the gate
// against a hundred-odd lines of hand-authored, style-guide-conformant prose,
// and it catches an over-strict rule — a §6 false positive, a word count off
// by one, a punctuation rule reaching further than its guide row — BEFORE that
// rule can silently template a generated surface forever. If it fails, the
// gate is wrong, not the banks. (R-8's dash rule is the live example: the gate
// learned it, and this audit is what proved no shipped bank string still had
// one. Its authored-side companion is `npm run audit:dashes`.)
//
// It also makes the gate a retroactive test of the banks themselves: if a
// shipped remark ever acquires a numeral or a banned term, CI now says so.
//
// The gate is IMPORTED from the compiled output rather than re-implemented or
// scraped, so the audit cannot drift from the code that ships (a departure
// from audit-names.mjs's source-scraping, justified because the thing under
// test here is code, not a literal pool). The bank strings are scraped from
// voice.ts, which the audit cannot import for the same reason cohort.ts is
// the only consumer: it pulls the catalog chain in behind it.

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "server/dist/stylegate.js");

let gate;
try {
  gate = await import(pathToFileURL(DIST).href);
} catch (err) {
  console.error(`could not load ${DIST}. Run \`npm run build\` first.\n${String(err)}`);
  process.exit(1);
}
const { gateFactFree, gateFactCarrying, LIMITS } = gate;

const source = readFileSync(join(root, "server/src/voice.ts"), "utf8");

/** The body of a top-level declaration, from its opening brace to `\n};`. */
function block(declaration) {
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`voice.ts has no declaration matching: ${declaration}`);
  const end = source.indexOf("\n};", start);
  if (end < 0) throw new Error(`could not find the end of: ${declaration}`);
  return source.slice(start, end);
}

/** Double-quoted string literals, in order. The banks use straight quotes
 *  throughout (R-10) and none of them contains an escaped quote. */
function quoted(text) {
  return [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
}

/** Backtick-tagged `line` templates. Every arrival line is one, and none of
 *  them interpolates — an arrival line states no fact from state (R-26). */
function tagged(text) {
  return [...text.matchAll(/line`([^`]*)`/g)].map((m) => m[1]);
}

const failures = [];
const fail = (msg) => failures.push(msg);

function check(label, strings, limits) {
  if (strings.length === 0) fail(`${label}: scraped zero strings — the audit is not testing anything`);
  for (const line of strings) {
    const verdict = gateFactFree(line, limits);
    if (!verdict.ok) {
      fail(`${label}: rejected as "${verdict.reason}"${verdict.detail ? ` (${verdict.detail})` : ""}\n      ${line}`);
    }
  }
  return strings.length;
}

const arrivals = tagged(block("const ARRIVAL_LINES: ByArchetype<PinnedLine> = {"));
const remarks = quoted(block("export const REPORT_REMARKS: ByArchetype<"));
// A2.3's contest tell. It is fact-free by construction (nothing in it may be
// particular to a source, or it would name which target is masking), so it is
// checked against the remark bounds like the rest of the fact-free prose.
const contest = tagged(block("const CONTEST_LINES: Readonly<Record<\"tell\", PinnedLine>> = {"));
// A2.4's resistance bank. Twenty plain strings, the REPORT_REMARKS shape, and
// fact-free by construction — the objection names the kind of act and nothing
// particular about the target — so it is checked against the remark bounds.
const resistance = quoted(block("export const RESISTANCE_LINES: ByArchetype<"));

const arrivalCount = check("arrival line", arrivals, LIMITS.arrival);
const remarkCount = check("report remark", remarks, LIMITS.remark);
const contestCount = check("contest line", contest, LIMITS.remark);
const resistanceCount = check("resistance line", resistance, LIMITS.remark);

// The fact-carrying gate has ZERO call sites in AV4 (every generated surface
// is fact-free by construction), so it is exercised here instead — masking a
// pinned token out of a line must leave a residue the fact-free list accepts,
// and a line missing a pinned token must be rejected.
const carrier = "The weighing came back, and it moved the study on light 41 years old.";
const okCarrier = gateFactCarrying(carrier, ["41 years"], LIMITS.record);
if (!okCarrier.ok) fail(`fact-carrying gate rejected a well-formed carrier: ${okCarrier.reason}`);
const missing = gateFactCarrying(carrier, ["63 years"], LIMITS.record);
if (missing.ok || missing.reason !== "missing-pinned") {
  fail("fact-carrying gate accepted a line that dropped its pinned token");
}
const invented = gateFactCarrying(
  "The weighing came back at 41 years, at ninety percent of 90%.",
  ["41 years"],
  LIMITS.record,
);
if (invented.ok) fail("fact-carrying gate accepted an unpinned figure in the residue");

console.log(`arrival lines   ${arrivalCount}`);
console.log(`report remarks  ${remarkCount}`);
console.log(`contest lines   ${contestCount}`);
console.log(`resistance      ${resistanceCount}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nevery shipped bank string passes the gate");
