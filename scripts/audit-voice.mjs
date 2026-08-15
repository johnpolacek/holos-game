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
// SECOND JOB: THE LENGTH WALLS (prose-style.md §2, R-41). Flat terse gives
// every surface a hard word ceiling, and the gate's LIMITS cannot carry it —
// LIMITS is what the STYLE GATE enforces on generated prose at runtime, and
// dropping it to the §2 wall in one commit would reject the templated
// fallbacks the gate exists to fall back to. So the walls live here, in
// WALLS, applied to the authored banks only.
//
// WALLS IS A RATCHET, NOT A TARGET. Every entry is seeded at the bank's
// MEASURED MAXIMUM on the day it was written (2026-08-14), with its §2 target
// in the comment beside it. Seeded that way the audit is green from the first
// commit and still catches the next long string somebody adds, which is the
// only version of this check that can exist before the rewrite lands. Each
// phase of the rewrite lowers the seeds it earned: shortening a bank's
// longest string is not finished until its number here comes down with it
// (prose-style.md §7 says the same thing from the doc side). A seed left high
// is a wall that has quietly stopped checking anything.
//
// Words are counted the way §2 says to count them: on the AUTHORED template
// text, with each `${…}` interpolation charged as one word and the fact it
// renders exempt. That is the only count an author can check before a render
// exists.
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

/**
 * R-41's word ceilings, one per audited bank. Seeded 2026-08-14 at each
 * bank's measured maximum; the arrow is the §2 wall it is being walked down
 * to, LOWERED AS THE REWRITE LANDS, PHASE BY PHASE. A bank with no entry here
 * fails the audit rather than skipping the check.
 *
 * Every entry is a KEYED BANK, because a keyed bank is what `block()` can
 * find and `quoted()`/`tagged()` can pull strings out of. voice.ts's other
 * half is not reachable that way: the frame explainers are standalone consts,
 * and the record sentences and proposal reasons are assembled inside their
 * builder functions from interpolated Facts. Those have no entry here and are
 * held to their §2 walls AT REVIEW, exactly as R-41 says of every surface
 * outside this bank file.
 */
const WALLS = {
  "arrival line": 16, // AT its §2 wall (aim 12) — the flat-terse pass landed this bank
  "intro beat": 23, // -> 12 each, lowered as the rewrite lands, phase by phase
  "report remark": 12, // AT its §2 wall (aim 8) — the flat-terse pass landed this bank
  "contest line": 12, // AT its §2 wall (aim 8) — the flat-terse pass landed this bank
  "resistance line": 12, // AT its §2 wall (aim 8) — the flat-terse pass landed this bank
  "signal observation": 22, // -> 12 (aim 8), lowered as the rewrite lands, phase by phase
  "signal voice": 22, // -> 12 (aim 8), lowered as the rewrite lands, phase by phase
  "tone clause": 22, // -> 12 (aim 8), lowered as the rewrite lands, phase by phase
  "accord clause": 22, // -> 12 (aim 8), lowered as the rewrite lands, phase by phase
  "ledger band line": 12, // AT its §2 wall (aim 8) — the flat-terse pass landed this bank
  "counsel line": 12, // AT its §2 wall (aim 8) — the flat-terse pass landed this bank
  // Not a bank: the worst-case COMPOSITION checked at the bottom of this
  // file, two clauses joined. It falls out of the two banks above it, so it
  // comes down on its own as they do; it is listed so the composed surface —
  // the thing a stranger actually reads — has a wall of its own.
  "signal composition": 44, // -> 24, lowered as the rewrite lands, phase by phase
};

/**
 * §2's counting rule: the authored template text, each `${…}` interpolation
 * charged as one word. Nothing here renders, so the placeholder stands in for
 * the fact and the fact itself is never counted.
 */
function words(line) {
  return line
    .replace(/\$\{[^}]*\}/g, "interpolation")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

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

/** One row per bank for the closing summary, in check order. */
const sizes = [];

function check(label, strings, limits) {
  if (strings.length === 0) fail(`${label}: scraped zero strings — the audit is not testing anything`);
  // Fails CLOSED: a bank added without a wall is a bank nobody bounded.
  const wall = WALLS[label];
  if (wall === undefined) {
    fail(`${label}: no WALLS entry. Add one, seeded at this bank's measured maximum (R-41).`);
  }
  let widest = 0;
  for (const line of strings) {
    const verdict = gateFactFree(line, limits);
    if (!verdict.ok) {
      fail(`${label}: rejected as "${verdict.reason}"${verdict.detail ? ` (${verdict.detail})` : ""}\n      ${line}`);
    }
    const n = words(line);
    if (n > widest) widest = n;
    if (wall !== undefined && n > wall) {
      fail(`${label}: ${n} words, over its ceiling of ${wall} (R-41)\n      ${line}`);
    }
  }
  sizes.push({ label, count: strings.length, widest, wall });
  return strings.length;
}

const arrivals = tagged(block("const ARRIVAL_LINES: ByArchetype<PinnedLine> = {"));
// S0.1's intro beats. Fact-free by construction (they state nothing from
// state, R-33's no-date rule included) and one register for every
// archetype, so they are checked at arrival size like the arrival lines
// themselves — four short beats, the same length ceiling the ceremony's
// own first words sit under.
const intros = tagged(block("const INTRO_LINES: Readonly<Record<IntroKey, PinnedLine>> = {"));
const remarks = quoted(block("export const REPORT_REMARKS: ByArchetype<"));
// A2.3's contest tell. It is fact-free by construction (nothing in it may be
// particular to a source, or it would name which target is masking), so it is
// checked against the remark bounds like the rest of the fact-free prose.
const contest = tagged(block("const CONTEST_LINES: Readonly<Record<\"tell\", PinnedLine>> = {"));
// A2.4's resistance bank. Twenty plain strings, the REPORT_REMARKS shape, and
// fact-free by construction — the objection names the kind of act and nothing
// particular about the target — so it is checked against the remark bounds.
const resistance = quoted(block("export const RESISTANCE_LINES: ByArchetype<"));
// A2.5's traffic banks. A counterpart's reply is an observation clause and a
// voice clause COMPOSED, and each half is authored to remark size on its own —
// so each half is audited against LIMITS.remark here, exactly like every other
// fact-free bank, and the COMPOSITION is gated against LIMITS.signal at its one
// call site in traffic.ts. Auditing the halves is the stronger test: it is what
// guarantees the fallback path (observation clause alone, on a rejected
// composition) can only ever emit a line the gate already accepts.
const observations = quoted(block("export const SIGNAL_OBSERVATIONS: Readonly<"));
const signalVoice = quoted(block("export const SIGNAL_VOICE: ByArchetype<"));
// A2.6's composed-signal banks. A signal's body is an OPENING CLAUSE plus a
// voice clause: the opening is the tone spoken (TONE_CLAUSE) unless the beam
// carries a move in the mutual quiet, in which case it is the move spoken
// (ACCORD_CLAUSE). Both banks are drawn on by BOTH paths — a seeded
// counterpart and a player composing with chips produce lines from the same
// pool, which is what makes a body useless as evidence about who sent it — so
// each is audited exactly like every other fact-free bank, at remark size.
const toneClauses = quoted(block("export const TONE_CLAUSE: Readonly<"));
const accordClauses = quoted(block("export const ACCORD_CLAUSE: Readonly<"));
// A4's drift bands. One sentence per band, shown on the Ledger row beside the
// band word itself, and fact-free by construction — the sample the band was
// computed from is its own line, built by the client from the row's fields, so
// a band line that recited it would be the same claim twice in a voice that
// cannot be checked. Checked at remark size like every other fact-free bank.
const bandLines = quoted(block("export const LEDGER_BAND_LINES: Readonly<"));
// AV4's counsel bank. Fact-free by construction (R-36a: a counsel line names
// no source, no number, no date, only the shape of the move), so it is
// checked here like every other bank. It is checked at STANCE size, not
// remark size, because the AV4 stance (protocol.ts's Proposal.stance)
// substitutes for it behind the counsel flag and the two must fit the same
// home-strip row.
const counselLines = quoted(block("export const COUNSEL_LINES: ByArchetype<"));

check("arrival line", arrivals, LIMITS.arrival);
check("intro beat", intros, LIMITS.arrival);
check("report remark", remarks, LIMITS.remark);
check("contest line", contest, LIMITS.remark);
check("resistance line", resistance, LIMITS.remark);
check("signal observation", observations, LIMITS.remark);
check("signal voice", signalVoice, LIMITS.remark);
check("tone clause", toneClauses, LIMITS.remark);
check("accord clause", accordClauses, LIMITS.remark);
check("ledger band line", bandLines, LIMITS.remark);
check("counsel line", counselLines, LIMITS.stance);

// The composition is what actually ships, so prove it fits: every opening
// against every voice clause would be the exhaustive test, but the bound is
// decided by the LONGEST of each, and a cross product of the worst cases is
// the only pair that can fail.
//
// SIGNAL_OBSERVATIONS is checked here even though A2.6 retired it from the
// body: the bank is still shipped and still audited (voice.ts says why), and
// keeping it in the worst-case set costs nothing and catches the day somebody
// composes with it again.
const longest = (pool) =>
  pool.reduce((best, s) => (s.split(/\s+/).length > best.split(/\s+/).length ? s : best), "");
const openings = [...observations, ...toneClauses, ...accordClauses];
const worstComposition = `${longest(openings)} ${longest(signalVoice)}`;
const composed = gateFactFree(worstComposition, LIMITS.signal);
if (!composed.ok) {
  fail(
    `signal composition: the longest opening clause and the longest voice clause compose to "${composed.reason}"\n      ${worstComposition}`,
  );
}
const composedWords = words(worstComposition);
if (composedWords > WALLS["signal composition"]) {
  fail(
    `signal composition: ${composedWords} words, over its ceiling of ${WALLS["signal composition"]} (R-41)\n      ${worstComposition}`,
  );
}
sizes.push({
  label: "signal composition",
  count: 1,
  widest: composedWords,
  wall: WALLS["signal composition"],
});

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

// Strings, then the bank's longest against its ceiling. The gap in the last
// column is the work R-41's ratchet is waiting on: when it closes, the
// ceiling in WALLS comes down to the §2 wall in the comment beside it.
console.log("bank                  n   longest   ceiling");
for (const { label, count, widest, wall } of sizes) {
  console.log(
    `${label.padEnd(20)} ${String(count).padStart(3)}   ${String(widest).padStart(7)}   ${String(wall ?? "none").padStart(7)}`,
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nevery shipped bank string passes the gate and fits its ceiling");
