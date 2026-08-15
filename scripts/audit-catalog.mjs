// The catalog audit (prose-style.md §6).
//
//   npm run build && npm run audit:catalog
//
// §6 states an obligation in prose: "A pre-merge grep of the string banks and
// all doc-quoted interface prose against these must return zero hits outside
// the allowlist." Until now that grep was a human promise. This is the grep.
//
// WHY IT DID NOT EXIST. Three audits already touch §6 and none of them covers
// the catalogs:
//
//   audit:banned  checks §6 <-> bannedterms.ts are IN SYNC. It never reads a
//                 bank; a perfectly synced rule table proves nothing about the
//                 prose it is meant to govern.
//   audit:voice   runs the gate (which compiles §6) over every bank string in
//                 voice.ts, and voice.ts ONLY. Its own header says why: it
//                 scrapes one file because importing the catalogs would drag
//                 the whole chain in behind them.
//   audit:names   runs a hand-maintained SUBSET of §6 over the name pools.
//
// So every player-facing string outside voice.ts — the cradles, the lineages,
// the dials, the studies, the missions, the projects, the questions, the
// charters a colony carries — met §6 nowhere in CI. They are clean today (this
// audit was written against a green run, which is the only honest time to add
// one); nothing would have said so on the day they stopped being.
//
// The rule table is IMPORTED from the compiled output, exactly as audit:voice
// imports the gate, so this cannot drift from the §6 that ships. Scraping the
// sources rather than importing them is the same trade audit:voice makes and
// for the same reason: cohort.ts is the only module that may pull the catalog
// chain into a process.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "server/dist/bannedterms.js");

let rules;
try {
  ({ BANNED_RULES: rules } = await import(pathToFileURL(DIST).href));
} catch (err) {
  console.error(`could not load ${DIST}. Run \`npm run build\` first.\n${String(err)}`);
  process.exit(1);
}

/**
 * FAILS CLOSED. Every module in server/src is scanned except the four named
 * below, so a module added next slice is covered by default rather than by
 * somebody remembering to list it.
 *
 * This started as an allowlist of ten catalogs and was wrong within one merge:
 * the A4/A5 slices landed voyages.ts and orders.ts, both carrying real
 * player-facing prose (charter clauses, landfall headlines), and neither was on
 * the list. A hand-maintained file list is the same drift this audit exists to
 * catch, one level up. R-37's CI grep makes the same choice for the same
 * reason, and its comment says so: it "fails CLOSED when a new module is added".
 *
 * Over-inclusion is cheap here. A module with no prose contributes no strings,
 * and §6 bans the CONCEPT, so a coinage sitting in an internal failure reason
 * is still worth being told about.
 */
const NOT_A_SURFACE = new Set([
  // The ban list itself. Every rule in it would match itself.
  // (audit-dashes.mjs excludes it for exactly this reason.)
  "bannedterms.ts",
  // voice.ts is deliberately NOT here. audit:voice runs the whole gate over
  // it, but only over a hand-maintained block list — a bank that list misses
  // would meet no check at all if this audit skipped the file. Scanning it
  // here is redundant for the listed banks and load-bearing for anything the
  // list has not caught up to. Fail closed twice rather than open once.
  // `why` fields: both modules document them as design notes kept beside the
  // numbers they explain, never a surface and never across the wire.
  "contest.ts",
  "behavior.ts",
]);

const compiled = rules.map((r) => ({ ...r, re: new RegExp(r.source, r.flags) }));

/** Comments are not surfaces (R-8's note, applied to §6 for the same reason). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const modules = readdirSync(join(root, "server/src"))
  .filter((f) => f.endsWith(".ts") && !NOT_A_SURFACE.has(f))
  .sort();

const failures = [];
let scanned = 0;

for (const name of modules) {
  const file = `server/src/${name}`;
  const src = stripComments(readFileSync(join(root, file), "utf8"));
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const text = m[1];
    // Fewer than three words is an identifier, a key or an enum member, not
    // prose. The §8 pinned labels that ARE shorter than that are covered by
    // audit:parity, which checks them against the guide directly.
    if (text.split(/\s+/).length < 3) continue;
    scanned += 1;
    const line = src.slice(0, m.index).split("\n").length;
    for (const rule of compiled) {
      if (rule.re.test(text)) {
        failures.push({ file, line, rule: rule.source, note: rule.note, text });
      }
    }
  }
}

if (scanned === 0) {
  console.error("scraped zero catalog strings — the audit is not testing anything");
  process.exit(1);
}

console.log(`catalog strings scanned  ${scanned}`);
console.log(`modules scanned          ${modules.length}`);
console.log(`§6 rules applied         ${compiled.length}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} §6 hit(s) in a catalog bank:`);
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}  /${f.rule}/  (${f.note})`);
    console.error(`    ${f.text}`);
  }
  console.error(
    "\n§6 bans the concept, not only the string. If a surface needs the idea,\n" +
      "use a house coinage from §8 instead.",
  );
  process.exit(1);
}

console.log("\nno §6 term reaches a catalog bank");
