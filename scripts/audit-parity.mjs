// The part-parity audit (A2.6, the indistinguishability ledger).
//
//   npm run audit:parity
//
// ASSERTS PART_PARITY IS TOTAL IN BOTH DIRECTIONS, AND HONEST ABOUT WHO:
//
//   (a) every part kind a HUMAN can compose is emitted by some seeded
//       counterpart class,
//   (b) every part kind a counterpart emits is offered in the human
//       composer's own selector vocabulary, and
//   (c) every row's `aiClasses` matches, exactly, the classes whose arms of
//       `composeAiParts` build that kind — a row may neither understate its
//       emitters (the congress arm leads with its charter too) nor keep
//       claiming an arm that was deleted.
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
// evidence. The membership check in (c) is syntactic in the same spirit: it
// proves which arms NAME which builders, not that every named path comes up
// in play — and it fails on any construct it cannot attribute rather than
// guessing.

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

// --- who builds what, read off composeAiParts itself ------------------------
//
// WHICH CLASSES BUILD WHICH KINDS. `composeAiParts` is the one function that
// composes counterpart parts (the hail path beside it sends an empty list),
// so its switch arms ARE the answer, and this scrape attributes every part
// builder to the arms that reach it. The tripwire this replaces proved each
// kind was built SOMEWHERE in traffic.ts; it could not see WHO, so a row
// understating its emitters passed for as long as nobody read both files in
// one sitting.
//
// FAIL-CLOSED: a call this scrape cannot resolve, a class conditional it was
// never taught, or a kind it does not know each FAIL rather than pass. And
// the final check is an exact two-way match, so a builder routed AROUND the
// scrape shrinks a computed set until the row it can no longer support
// fails: the drift surfaces either way, instead of passing quietly.

/** The body of a top-level `function` declaration, `block`-style — except an
 *  object-literal RETURN TYPE ends its line `} {`, a column-zero brace that
 *  does not close the function (composeAiParts declares one). */
function fnBody(src, declaration) {
  const start = src.indexOf(declaration);
  if (start < 0) throw new Error(`no declaration matching: ${declaration}`);
  let from = start;
  for (;;) {
    const brace = src.indexOf("\n}", from);
    if (brace < 0) throw new Error(`could not find the end of: ${declaration}`);
    if (src.startsWith("\n} {", brace)) {
      from = brace + "\n} {".length;
      continue;
    }
    return src.slice(start, brace);
  }
}

// Every `ai*` builder, mapped to the kinds it can construct — by `kind:`
// literal, by the shared `buildArchivePart` (one shape for the light record
// on both paths), or transitively through another builder it falls back to
// (aiCultureDial reaches for aiCulture on a bad axis draw).
const helperBodies = new Map(
  [...trafficSrc.matchAll(/\nfunction (ai\w+)\(/g)].map((m) => [
    m[1],
    fnBody(trafficSrc, `function ${m[1]}(`),
  ]),
);
for (const [name, body] of helperBodies) {
  for (const call of body.matchAll(/\b(ai\w+)\(/g)) {
    if (!helperBodies.has(call[1])) {
      fail(`builder ${name} calls ${call[1]}(), which this audit cannot resolve to a part kind`);
    }
  }
}
const helperKinds = new Map([...helperBodies.keys()].map((name) => [name, new Set()]));
for (let settled = false; !settled; ) {
  settled = true;
  for (const [name, body] of helperBodies) {
    const kinds = helperKinds.get(name);
    const before = kinds.size;
    for (const m of body.matchAll(/kind: "([a-z-]+)"/g)) kinds.add(m[1]);
    if (body.includes("buildArchivePart(")) kinds.add("archive");
    for (const call of body.matchAll(/\b(ai\w+)\(/g)) {
      for (const k of helperKinds.get(call[1]) ?? []) kinds.add(k);
    }
    if (kinds.size !== before) settled = false;
  }
}

const compose = fnBody(trafficSrc, "function composeAiParts(");
const switchAt = compose.indexOf("switch (input.cls)");
if (switchAt < 0) throw new Error("composeAiParts has no switch on input.cls");
// The two local answerers are defined before the switch but run per CALLER,
// so their text leaves the shared prologue and attributes by arm below.
const answerRequestBody = block(compose, "const answerRequest = ", "\n  };");
const prologue = compose.slice(0, switchAt).replace(answerRequestBody, "");
const switchBody = block(compose, "switch (input.cls)", "\n  }");
const armMatches = [...switchBody.matchAll(/case "([a-z]+)":/g)];
const arms = armMatches.map((m, i) => ({
  cls: m[1],
  body: switchBody.slice(
    m.index + m[0].length,
    i + 1 < armMatches.length ? armMatches[i + 1].index : switchBody.length,
  ),
}));

// EVERY call in composeAiParts must be one the attribution understands: a
// scraped `ai*` builder, or a name on this list of known non-producers. A
// part built through anything else would escape the ledger, so an
// unrecognized name is a failure to be taught, not a shrug.
const NON_PRODUCERS = new Set([
  "composeAiParts", // its own declaration line
  "createRng",
  "Set",
  "map",
  "findIndex",
  "has",
  "push",
  "chance",
  "answerRequest",
  "answerCulture",
  "capParts",
]);
for (const m of compose.matchAll(/\b(\w+)\(/g)) {
  if (NON_PRODUCERS.has(m[1]) || helperBodies.has(m[1])) continue;
  fail(`composeAiParts calls ${m[1]}(), which this audit cannot attribute to a class`);
}

// The ONE class-conditional form the attribution reads: a guard on
// `input.cls` choosing between two builders (the whisperer answering a
// sighting request with itself). The guarded branch belongs to that class
// alone; the other branch to every other class reaching the line. Anything
// else that branches on `input.cls` fails until it is taught here.
const ternaryRe = /input\.cls === "([a-z]+)"\s*\?\s*(ai\w+)\([^)]*\)\s*:\s*(ai\w+)\(/g;
function guardedCalls(text) {
  const guarded = [];
  const rest = text.replace(ternaryRe, (whole, cls, then, other) => {
    if (!counterpartClasses.includes(cls)) {
      fail(`composeAiParts guards on class "${cls}", which is not a CounterpartClass`);
    }
    guarded.push({ cls, then, other });
    return "";
  });
  if (/input\.cls\s*[!=]==/.test(rest)) {
    fail("composeAiParts branches on input.cls in a form this audit cannot attribute");
  }
  return { guarded, rest };
}

const speaking = counterpartClasses.filter((c) => c !== "silent");
/** kind -> Set of classes whose arms build it. */
const builds = new Map(partKinds.map((k) => [k, new Set()]));
const attribute = (kind, cls, where) => {
  const set = builds.get(kind);
  if (set === undefined) fail(`composeAiParts builds kind "${kind}" (${where}), which is not a part kind`);
  else set.add(cls);
};
const attributeText = (text, cls, where) => {
  for (const m of text.matchAll(/kind: "([a-z-]+)"/g)) attribute(m[1], cls, where);
  for (const m of text.matchAll(/\b(ai\w+)\(/g)) {
    for (const kind of helperKinds.get(m[1]) ?? []) attribute(kind, cls, where);
  }
};
const attributeGuarded = (guarded, cls, where) => {
  for (const t of guarded) {
    for (const kind of helperKinds.get(t.cls === cls ? t.then : t.other) ?? []) {
      attribute(kind, cls, where);
    }
  }
};

// The shared prologue (the accord push) runs for every class that reaches
// the composer at all, and the silent class never does — deriveAiSignals
// returns before composing, which the silent-arm check below stands behind.
if (/input\.cls\s*[!=]==/.test(prologue)) {
  fail("composeAiParts branches on input.cls before the switch in a form this audit cannot attribute");
}
for (const cls of speaking) attributeText(prologue, cls, "shared prologue");

const answer = guardedCalls(answerRequestBody);
for (const arm of arms) {
  if (!counterpartClasses.includes(arm.cls)) {
    fail(`composeAiParts has an arm for "${arm.cls}", which is not a CounterpartClass`);
    continue;
  }
  const { guarded, rest } = guardedCalls(arm.body);
  attributeText(rest, arm.cls, `the ${arm.cls} arm`);
  attributeGuarded(guarded, arm.cls, `the ${arm.cls} arm`);
  if (arm.body.includes("answerRequest()")) {
    attributeText(answer.rest, arm.cls, "answerRequest");
    attributeGuarded(answer.guarded, arm.cls, "answerRequest");
  }
}

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

// Direction (c): each row's aiClasses equals the attribution, both ways. The
// silent class may not build anything — silence is its whole meaning.
if (arms.length === 0) fail("composeAiParts scraped no class arms — the attribution is not testing anything");
for (const kind of partKinds) {
  const built = builds.get(kind) ?? new Set();
  if (built.has("silent")) {
    fail(`the silent arm of composeAiParts builds a "${kind}" part`);
    built.delete("silent");
  }
  const row = rows.find((r) => r.kind === kind);
  if (row === undefined) continue; // direction (a) already failed it
  for (const cls of built) {
    if (!row.aiClasses.includes(cls)) {
      fail(`the ${cls} arm of composeAiParts builds a "${kind}" part its PART_PARITY row does not claim`);
    }
  }
  for (const cls of row.aiClasses) {
    if (!built.has(cls)) {
      fail(`PART_PARITY claims "${cls}" emits "${kind}", but no arm of composeAiParts builds one for it`);
    }
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
