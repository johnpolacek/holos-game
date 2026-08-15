// The part-parity audit (A2.6, the indistinguishability ledger).
//
//   npm run audit:parity
//
// ASSERTS PART_PARITY IS TOTAL IN BOTH DIRECTIONS:
//
//   (a) every part kind a HUMAN can compose is emitted by some seeded
//       counterpart class, and
//   (b) every part kind a counterpart emits is offered in the human
//       composer's own selector vocabulary.
//
// WHY THIS IS WORTH A SCRIPT. A2.6's whole claim is that a signal's bytes say
// nothing about whether a person or a seeded civilization composed it. The
// wire shapes carry that at the level of one message; they cannot carry it at
// the level of a POPULATION. If some part kind only ever arrives from an AI —
// or only ever leaves from a player — then after a handful of exchanges the
// kind itself is the tell, and no amount of shape parity covers it. That is
// the failure this audit exists to make impossible to ship by accident.
//
// It reads SOURCE rather than importing the module, for the same reason
// audit-names.mjs does: the thing under test is a hand-maintained table, and
// scraping it is what catches a row that was edited without being thought
// about. The gate audit imports its subject instead, because there the thing
// under test is code.
//
// HONEST LIMIT, stated the way B's note states it: this proves the LEDGER is
// total, and it proves each kind is constructible on the counterpart side. It
// does not prove the two distributions match. It removes proofs, not
// evidence.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const partsSrc = readFileSync(join(root, "server/src/signalparts.ts"), "utf8");
const trafficSrc = readFileSync(join(root, "server/src/traffic.ts"), "utf8");

const failures = [];
const fail = (msg) => failures.push(msg);

/** The body of a top-level declaration, from its opening brace or bracket to
 *  `\n];` — audit-voice.mjs's `block`, one terminator over. */
function block(src, declaration, terminator = "\n];") {
  const start = src.indexOf(declaration);
  if (start < 0) throw new Error(`no declaration matching: ${declaration}`);
  const end = src.indexOf(terminator, start);
  if (end < 0) throw new Error(`could not find the end of: ${declaration}`);
  return src.slice(start, end);
}

/** Double-quoted string literals, in order. */
function quoted(text) {
  return [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
}

// --- the three vocabularies -------------------------------------------------

// 1. The kinds that exist at all.
const partKinds = quoted(block(partsSrc, "export const PART_KINDS: readonly PartKind[] = ["));

// 2. The kinds a HUMAN composer may select — the `case` labels of
//    `parsePartRef`, which is the one door a client's selector comes through.
//    Scraped from the switch itself rather than from a list beside it, so a
//    kind that was added to the type and never given a parse arm fails here.
const parseArms = [
  ...block(partsSrc, "export function parsePartRef(", "\n}").matchAll(/case "([a-z-]+)":/g),
].map((m) => m[1]);

// 3. The counterpart classes that exist.
const classLine = /export type CounterpartClass =([^;]+);/.exec(trafficSrc);
if (classLine === null) throw new Error("traffic.ts has no CounterpartClass union");
const counterpartClasses = quoted(classLine[1]);

// 4. The ledger itself.
const parityBlock = block(partsSrc, "export const PART_PARITY: readonly PartParityRow[] = [");
const rows = [
  ...parityBlock.matchAll(
    /kind:\s*"([a-z-]+)",\s*aiClasses:\s*\[([^\]]*)\],\s*human:\s*(true|false)/g,
  ),
].map((m) => ({
  kind: m[1],
  aiClasses: quoted(m[2]),
  human: m[3] === "true",
}));

// WHICH ARM BUILDS EACH KIND ON THE COUNTERPART SIDE. A tripwire against
// drift, not a proof of behavior: a row may claim a class emits a kind long
// after the arm that did so was deleted, and this is what notices. `archive`
// is built through signalparts.ts's shared `buildArchivePart` (one shape for
// the light record on both paths), so its pattern names the call and not a
// literal.
const PRODUCER = {
  finding: /kind: "finding"/,
  sighting: /kind: "sighting"/,
  archive: /buildArchivePart\(/,
  culture: /kind: "culture"/,
  request: /kind: "request"/,
  verdict: /kind: "verdict"/,
  accord: /kind: "accord"/,
};

// --- the checks -------------------------------------------------------------

if (partKinds.length === 0) fail("PART_KINDS scraped empty — the audit is not testing anything");
if (rows.length === 0) fail("PART_PARITY scraped empty — the audit is not testing anything");
if (counterpartClasses.length === 0) fail("CounterpartClass scraped empty");

// Direction (a): every kind that exists has a row, and that row names at
// least one counterpart class that emits it.
for (const kind of partKinds) {
  const row = rows.find((r) => r.kind === kind);
  if (row === undefined) {
    fail(`part kind "${kind}" has no PART_PARITY row: no counterpart emits it`);
    continue;
  }
  if (row.aiClasses.length === 0) {
    fail(`part kind "${kind}" is emitted by no counterpart class: it would be a human-only tell`);
  }
  for (const cls of row.aiClasses) {
    if (!counterpartClasses.includes(cls)) {
      fail(`part kind "${kind}" names "${cls}", which is not a CounterpartClass`);
    }
    if (cls === "silent") {
      fail(`part kind "${kind}" names the silent class, which never speaks`);
    }
  }
  const producer = PRODUCER[kind];
  if (producer === undefined) {
    fail(`part kind "${kind}" has no producer pattern in this audit — add one`);
  } else if (!producer.test(trafficSrc)) {
    fail(`part kind "${kind}" is claimed emitted, but traffic.ts builds no such part`);
  }
}

// Direction (b): every kind in the ledger exists, and is offered to humans —
// both by the flag and, load-bearingly, by an actual parse arm.
for (const row of rows) {
  if (!partKinds.includes(row.kind)) {
    fail(`PART_PARITY names "${row.kind}", which is not a part kind`);
  }
  if (!row.human) {
    fail(`part kind "${row.kind}" is not offered to humans: it would be a counterpart-only tell`);
  }
  if (!parseArms.includes(row.kind)) {
    fail(`part kind "${row.kind}" has no arm in parsePartRef: a human cannot select it`);
  }
}

// One row per kind, no duplicates: a second row would let two different
// claims about the same kind both pass.
const seen = new Set();
for (const row of rows) {
  if (seen.has(row.kind)) fail(`PART_PARITY has two rows for "${row.kind}"`);
  seen.add(row.kind);
}

// And a parse arm with no kind behind it: the vocabulary must not be wider
// than the ledger, or a selector exists that nothing accounts for.
for (const arm of parseArms) {
  if (!partKinds.includes(arm)) fail(`parsePartRef accepts "${arm}", which is not a part kind`);
}

// Every speaking class must speak at least one kind. A class that emitted
// nothing would be indistinguishable from silence, which is a different
// class with a different meaning.
for (const cls of counterpartClasses) {
  if (cls === "silent") continue;
  if (!rows.some((r) => r.aiClasses.includes(cls))) {
    fail(`counterpart class "${cls}" emits no part kind at all`);
  }
}

// --- the report -------------------------------------------------------------

console.log(`part kinds        ${partKinds.length}`);
console.log(`parity rows       ${rows.length}`);
console.log(`human parse arms  ${parseArms.length}`);
console.log(`speaking classes  ${counterpartClasses.filter((c) => c !== "silent").length}`);
for (const row of rows) {
  console.log(`  ${row.kind.padEnd(9)} ${row.aiClasses.join(", ")}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\npart parity holds in both directions");
