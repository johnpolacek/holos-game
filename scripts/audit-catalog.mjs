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
// So the ~380 player-facing strings in cradles.ts, lineages.ts, dials.ts,
// studies.ts, missions.ts, projects.ts, questions.ts, civseed.ts and minds.ts
// met §6 nowhere in CI. They are clean today (this audit was written against a
// green run, which is the only honest time to add one); nothing would have
// said so on the day they stopped being.
//
// The rule table is IMPORTED from the compiled output, exactly as audit:voice
// imports the gate, so this cannot drift from the §6 that ships. Scraping the
// sources rather than importing them is the same trade audit:voice makes and
// for the same reason: cohort.ts is the only module that may pull the catalog
// chain into a process.

import { readFileSync } from "node:fs";
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
 * The catalogs that carry player-facing prose. voice.ts is absent because
 * audit:voice already runs the whole gate over it, which is strictly more than
 * this check does.
 */
const CATALOGS = [
  "cradles",
  "lineages",
  "dials",
  "civseed",
  "minds",
  "studies",
  "missions",
  "projects",
  "questions",
  "signalparts",
];

// contest.ts is absent from that list on purpose: its `why` fields are
// documented in the module as design notes that never reach a surface and
// never cross the wire, which is the audit-dashes NOT_A_SURFACE precedent.
// Nothing WITHIN a listed module is excluded. Over-inclusion is safe for a ban
// check and mildly useful: §6 bans the CONCEPT, so a coinage sitting in an
// internal failure reason is still worth being told about.

const compiled = rules.map((r) => ({ ...r, re: new RegExp(r.source, r.flags) }));

/** Comments are not surfaces (R-8's note, applied to §6 for the same reason). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const failures = [];
let scanned = 0;

for (const name of CATALOGS) {
  const file = `server/src/${name}.ts`;
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
