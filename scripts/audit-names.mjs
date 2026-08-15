// Pool audit for the name lexicon (prose-style.md §5).
//
// Run whenever NAME_HEADS, NAME_TAILS, or NAME_PHRASES changes:
//
//   node scripts/audit-names.mjs
//
// Checks the rules the spec names, plus the ones the pools imply:
// every head+tail pairing fits MAX_NAME_LEN, every phrase passes
// validateName, nothing is duplicated, nothing trips the §6 banned terms.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "server/src/names.ts"), "utf8");
const protocol = readFileSync(join(root, "server/src/protocol.ts"), "utf8");

const MAX_NAME_LEN = Number(protocol.match(/MAX_NAME_LEN = (\d+)/)?.[1]);
if (!Number.isInteger(MAX_NAME_LEN)) {
  throw new Error("could not read MAX_NAME_LEN from protocol.ts");
}

/** Pull a string-literal array out of names.ts by export name. */
function pool(name) {
  const start = source.indexOf(`export const ${name} = [`);
  if (start < 0) throw new Error(`no export named ${name}`);
  const end = source.indexOf("] as const;", start);
  const body = source.slice(start, end);
  return [...body.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

// §6 banned terms that could plausibly collide with a name pool. The full
// list lives in prose-style.md; these are the ones a lexicon might trip.
const BANNED = [
  /\bthe Culture\b/i, /\bsublim(e|ed|ing)\b/i, /\borbital\b/i,
  /\bspecial circumstances\b/i, /\bgland(s|ing)?\b/i, /\bdrone(s)?\b/i,
  /\bknife missile\b/i, /\beffector(s)?\b/i, /\bdisplacer(s)?\b/i,
  /\blazy gun\b/i, /\bidiran\b/i, /\baffront\b/i, /\bchelgrian\b/i,
  /\bhomomda\b/i, /dra.?azon/i, /schar'?s world/i, /vavatch/i,
  /\bchanger(s)?\b/i, /\bculture ship\b/i, /horza/i, /balveda/i,
  /clear air turbulence/i, /\bazad(ian)?\b/i, /gurgeh/i,
  /flere.?imsaho|mawhrin.?skel/i, /zakalwe/i, /skaffen.?amtiskaw/i,
  /\bchairmaker\b|staberinde/i, /\bexcession\b/i,
];

const failures = [];
const fail = (msg) => failures.push(msg);

function checkDuplicates(label, list) {
  const seen = new Set();
  for (const entry of list) {
    const key = entry.toLowerCase();
    if (seen.has(key)) fail(`${label}: duplicate "${entry}"`);
    seen.add(key);
  }
}

function checkBanned(label, list) {
  for (const entry of list) {
    for (const pattern of BANNED) {
      if (pattern.test(entry)) fail(`${label}: "${entry}" trips banned term ${pattern}`);
    }
  }
}

const heads = pool("NAME_HEADS");
const tails = pool("NAME_TAILS");
const phrases = pool("NAME_PHRASES");

checkDuplicates("NAME_HEADS", heads);
checkDuplicates("NAME_TAILS", tails);
checkDuplicates("NAME_PHRASES", phrases);
checkBanned("NAME_HEADS", heads);
checkBanned("NAME_TAILS", tails);
checkBanned("NAME_PHRASES", phrases);

// Heads: Title Case, letters only, no spaces — they concatenate onto a tail.
for (const head of heads) {
  if (!/^[A-Z][a-z]+$/.test(head)) fail(`NAME_HEADS: "${head}" is not a single Title Case word`);
}

// Tails: lowercase, letters only, plural. They follow a head directly.
for (const tail of tails) {
  if (!/^[a-z]+$/.test(tail)) fail(`NAME_TAILS: "${tail}" is not a single lowercase word`);
  if (!tail.endsWith("s")) fail(`NAME_TAILS: "${tail}" is not plural`);
}

// The binding constraint: the LONGEST pairing must still fit the field.
const longestHead = heads.reduce((a, b) => (b.length > a.length ? b : a), "");
const longestTail = tails.reduce((a, b) => (b.length > a.length ? b : a), "");
const worst = `${longestHead}${longestTail}`;
if (worst.length > MAX_NAME_LEN) {
  fail(`longest pairing "${worst}" is ${worst.length} chars, over MAX_NAME_LEN ${MAX_NAME_LEN}`);
}

// Phrases: N-1..N-3 and N-5, the mechanically checkable ones. N-4
// (originality) is a human judgement and cannot be scripted.
for (const phrase of phrases) {
  if (phrase.length > MAX_NAME_LEN) {
    fail(`NAME_PHRASES: "${phrase}" is ${phrase.length} chars, over ${MAX_NAME_LEN}`);
  }
  if (!/^[A-Za-z',\- ]+$/.test(phrase)) fail(`NAME_PHRASES: "${phrase}" has stray characters`);
  if (phrase !== phrase.trim().replace(/\s+/g, " ")) fail(`NAME_PHRASES: "${phrase}" is not single-spaced`);
  if (/[.,!?]$/.test(phrase)) fail(`NAME_PHRASES: "${phrase}" ends in punctuation (N-5)`);
  for (const word of phrase.split(" ")) {
    if (!/^[A-Z]/.test(word) && !/^(a|an|and|the|of|to|for|in|on|at|or|nor)$/i.test(word)) {
      fail(`NAME_PHRASES: "${phrase}" is not Title Case`);
    }
  }
}

const combos = heads.length * tails.length;
console.log(`heads   ${heads.length}`);
console.log(`tails   ${tails.length}`);
console.log(`combos  ${combos.toLocaleString("en-US")}`);
console.log(`phrases ${phrases.length} (reserved for ship/structure names)`);
console.log(`longest pairing  ${worst} (${worst.length}/${MAX_NAME_LEN})`);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nall checks pass");
