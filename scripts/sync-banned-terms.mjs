// The §6 projection: docs/prose-style.md → server/src/bannedterms.ts.
//
//   node scripts/sync-banned-terms.mjs            regenerate the module
//   node scripts/sync-banned-terms.mjs --check    fail on any drift
//
// Direction is doc → code, which INVERTS §7's "code banks are canonical"
// rule, and the inversion is deliberate: §7 governs banks — prose a player
// reads, where the shipped code is the thing. §6 is not a bank. It is a rule
// list whose canonical statement is the guide ("the one hard constraint"),
// and bannedterms.ts is only its runtime projection for AV4's style gate.
//
// --check runs in CI beside typecheck, so editing §6 without regenerating
// fails, and hand-editing the generated module fails too. That closes the
// loop in both directions, which is what §7's table is really asking for.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC = join(root, "docs/prose-style.md");
const OUT = join(root, "server/src/bannedterms.ts");

const doc = readFileSync(DOC, "utf8");

/** The text between two `## ` headings. */
function section(heading, next) {
  const start = doc.indexOf(heading);
  if (start < 0) throw new Error(`prose-style.md has no heading ${heading}`);
  const end = doc.indexOf(next, start);
  if (end < 0) throw new Error(`prose-style.md has no heading ${next}`);
  return doc.slice(start, end);
}

/** Every fenced block in a section, in document order. */
function fences(text) {
  return [...text.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1]);
}

const banned = section("## §6 — Banned terms", "## §7 — Sync obligations");
const blocks = fences(banned);

// One fenced block per source, in document order. The first is Banks — §6
// opens with it and gives it no `### nth source:` heading, because the guide
// is written against Banks by default. Every later block is introduced by
// one, and the label is that heading's author, lowercased. Deriving the
// labels from the doc rather than a fixed list is what lets a new source
// (Robinson, Schroeder, whoever the next review adopts) land as a doc edit
// plus a regenerate, with no change here.
const headings = [...banned.matchAll(/^### \w+ source: (\w+)/gm)].map((m) =>
  m[1].toLowerCase(),
);
const LABELS = ["banks", ...headings];
if (blocks.length !== LABELS.length) {
  throw new Error(
    `§6 holds ${blocks.length} fenced blocks but ${LABELS.length} sources ` +
      `(${LABELS.join(", ")}). Every source past Banks needs a ` +
      `"### <ordinal> source: <Author>" heading and exactly one block.`,
  );
}

// Case sensitivity is the DEFAULT, deliberately: §6 is written as grep input
// and several rules depend on case (\bMind\b vs. mind, \bContact\b vs.
// contact, \bFocus(ed|ing)?\b vs. focus, \bEmergent(s)?\b). Compiling with no
// `i` flag reproduces the doc's own grep semantics exactly.
const rules = [];

blocks.forEach((block, i) => {
  const label = LABELS[i];
  for (const raw of block.split("\n")) {
    if (raw.trim().length === 0) continue;
    const hash = raw.indexOf("#");
    const source = (hash >= 0 ? raw.slice(0, hash) : raw).trim();
    const comment = hash >= 0 ? raw.slice(hash + 1).trim() : "";
    if (source.length === 0) continue;
    try {
      new RegExp(source);
    } catch (err) {
      throw new Error(`§6 line is not a valid regex: ${source} (${String(err)})`);
    }
    rules.push({ source, flags: "", note: comment.length > 0 ? `${label} — ${comment}` : label });
  }
});

// §8's comms register states its ban in prose rather than as a regex, and
// names only the innocent senses (letterforms, letters of the alphabet), so
// these two are the only case-insensitive rules.
const COMMS = "**The comms register (settled 2026-07).**";
if (!doc.includes(COMMS)) throw new Error("prose-style.md §8 has no comms-register paragraph");
rules.push({ source: "\\bletter(s)?\\b", flags: "i", note: "comms register, prose-style.md §8" });
rules.push({ source: "\\bcorrespondence\\b", flags: "i", note: "comms register, prose-style.md §8" });

const lit = (s) => JSON.stringify(s);

const body = rules
  .map((r) => `  { source: ${lit(r.source)}, flags: ${lit(r.flags)}, note: ${lit(r.note)} },`)
  .join("\n");

const generated = `// GENERATED FILE — do not edit by hand.
//
// Source: docs/prose-style.md §6 (one block per source: ${LABELS.join(", ")})
// plus §8's comms register. Regenerate with \`npm run sync:banned\`; verify with
// \`npm run audit:banned\`, which CI runs beside typecheck.
//
// The runtime projection of a doc-level grep: stylegate.ts is the only
// consumer, and it is the one place a generated line meets §6 before a
// player does. Every rule is compiled CASE-SENSITIVELY unless its \`flags\`
// say otherwise — §6 is written as grep input and several of its rules turn
// on case (\\bMind\\b is a ship-AI class noun; lowercase mind is core Holos
// vocabulary).

export interface BannedRule {
  /** Regex source, verbatim from the guide. */
  readonly source: string;
  /** Regex flags. Empty means case-sensitive, which is §6's own reading. */
  readonly flags: string;
  /** Where the rule comes from, and any innocent sense the guide allows. */
  readonly note: string;
}

export const BANNED_RULES: readonly BannedRule[] = [
${body}
];
`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    console.error(`${OUT} is missing. Run: npm run sync:banned`);
    process.exit(1);
  }
  if (current !== generated) {
    console.error(
      "bannedterms.ts has drifted from prose-style.md §6.\n" +
        "Either §6 was edited without regenerating, or the module was hand-edited.\n" +
        "Fix with: npm run sync:banned",
    );
    process.exit(1);
  }
  console.log(`bannedterms.ts is in sync with prose-style.md §6 (${rules.length} rules)`);
} else {
  writeFileSync(OUT, generated, "utf8");
  console.log(`wrote ${OUT} (${rules.length} rules)`);
}
