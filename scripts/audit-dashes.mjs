// The dash audit (prose-style.md §3, R-8).
//
//   npm run audit:dashes
//
// Asserts that NO EM DASH REACHES A PLAYER SURFACE. It reads every string
// literal in the client and server sources, plus the handful of non-TS files
// whose contents are shipped verbatim (the document head, the web manifest,
// the social-card tagline), and fails on U+2014 anywhere in one.
//
// WHY A SCRIPT AND NOT A GREP. A bare `grep —` over the sources is unusable:
// the modules are heavily commented and the commentary is where the essayist
// register lives, which is fine — a comment is not a surface. The distinction
// the rule actually draws is between a COMMENT and a STRING, and drawing it
// needs a tokenizer, not a pattern. So this scans with a small comment-aware
// scanner and reports only what a player could read.
//
// WHAT IT DOES NOT COVER. `docs/*.md` narration is essayist prose about the
// game rather than prose in it, and keeps its dashes. The exception is prose
// QUOTED from a bank into a doc (§7's verbatim mirrors, the walkthrough's
// scene quotes): that is player prose sitting in a doc, it is bound by R-8,
// and it stays a human read because no scanner can tell a quotation from a
// paraphrase.
//
// Its companion is `stylegate.ts`'s EM_DASH rule, which enforces R-8 on the
// half of the prose no author ever sees: the lines AV4 generates at runtime.
// This script covers the authored half. Between them there is no surface a
// dash can reach.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** U+2014. The one character the rule is about. */
const EM_DASH = "—";

const failures = [];
const fail = (msg) => failures.push(msg);

/**
 * The characters after which a `/` opens a REGEX rather than divides. Regex
 * literals have to be skipped whole: `stylegate.ts`'s markup rule holds a
 * backtick inside a character class, and a scanner that took it for a template
 * would swallow the next two hundred lines of commentary as one string.
 */
const REGEX_POSITION = new Set([..."=(,:[!&|?{};+-*%<>~^", "\n"]);

/**
 * String and template literals, with comments and regexes removed. Deliberately
 * a scanner and not a parser: it needs to know only where a literal starts and
 * ends, and getting that wrong in either direction is a loud failure (a missed
 * literal shows up as an em dash it should have caught, a runaway one as a
 * false positive on a comment) rather than a silent one.
 */
function literals(src) {
  const found = [];
  let i = 0;
  let line = 1;
  let prev = "\n";
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") {
      line++;
      prev = "\n";
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }
    if (c === "/" && REGEX_POSITION.has(prev)) {
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) {
          i++;
          break;
        } else if (src[i] === "\n") {
          // Not a regex after all. Rewind rather than run away.
          break;
        }
        i++;
      }
      prev = "/";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      const startLine = line;
      let text = "";
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          text += src[i] + src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        // An unterminated single- or double-quoted literal is a scan error,
        // not a string that spans lines. Only a template may cross a newline.
        if (src[i] === "\n") {
          line++;
          if (quote !== "`") break;
        }
        text += src[i];
        i++;
      }
      found.push({ line: startLine, text });
      prev = quote;
      continue;
    }
    if (c !== " " && c !== "\t") prev = c;
    i++;
  }
  return found;
}

/** CSS has only block comments, and only `content` can put text on a screen. */
function cssText(src) {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return stripped
    .split("\n")
    .map((text, index) => ({ line: index + 1, text }))
    .filter((row) => row.text.includes("content:"));
}

/**
 * `bannedterms.ts` is GENERATED from prose-style.md §6 (`npm run sync:banned`)
 * and holds no prose: every string in it is a regex source or the §6 comment
 * that disambiguates it, and neither is ever rendered. Auditing it would only
 * ever report the doc's own punctuation back at itself, and "fix" it by
 * editing a file whose contents are not editable.
 */
const NOT_A_SURFACE = new Set(["server/src/bannedterms.ts"]);

function tsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? tsFiles(join(dir, entry.name))
        : entry.name.endsWith(".ts") && !NOT_A_SURFACE.has(relative(root, join(dir, entry.name)))
          ? [join(dir, entry.name)]
          : [],
    );
}

function audit(file, rows) {
  const rel = relative(root, file);
  let hits = 0;
  for (const row of rows) {
    if (!row.text.includes(EM_DASH)) continue;
    hits++;
    fail(`${rel}:${row.line}\n      ${row.text.trim().slice(0, 200)}`);
  }
  return hits;
}

// --- the shipped surfaces --------------------------------------------------

const sources = [
  ...tsFiles(join(root, "client/src")),
  ...tsFiles(join(root, "server/src")),
  // The social card is drawn from this file's own tagline literal.
  join(root, "scripts/build-og.mjs"),
];

let scanned = 0;
for (const file of sources) {
  const rows = literals(readFileSync(file, "utf8"));
  scanned += rows.length;
  audit(file, rows);
}

const css = join(root, "client/src/style.css");
audit(
  css,
  cssText(readFileSync(css, "utf8")),
);

// Whole-file checks: neither has a comment syntax worth stripping, and every
// byte in them is either markup or text a crawler will quote back at a reader.
for (const file of [join(root, "client/index.html"), join(root, "client/public/manifest.webmanifest")]) {
  const rows = readFileSync(file, "utf8")
    .split("\n")
    .map((text, index) => ({ line: index + 1, text }));
  audit(file, rows);
}

if (scanned === 0) {
  fail("scraped zero string literals: the audit is not testing anything");
}

console.log(`string literals scanned  ${scanned}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} em dash(es) on a player surface (R-8):`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nRewrite the line. A colon sets up a payoff, a semicolon joins two whole\n" +
      "clauses, a comma carries an aside, and a full stop is always available.",
  );
  process.exit(1);
}
console.log("\nno em dash reaches a player surface");
