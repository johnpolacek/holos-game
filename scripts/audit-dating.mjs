// The dating audit (prose-style.md §3, R-33).
//
//   npm run audit:dating
//
// Asserts that THE COHORT'S ABSOLUTE YEAR NEVER REACHES A PLAYER SURFACE.
// Every date a player reads is that civilization's own count from its own
// ascension ("4 AE"); the cohort's own calendar is an internal number, and a
// stamp built from it — "Y1204", or the bare 1204 — is the failure R-33
// names.
//
// WHY A SCRIPT WHEN THE CLIENT ALREADY ENFORCES IT. `clock.ts` exports one
// date formatter, `formatEpochYear`, which subtracts the epoch anchor before
// it renders; there is no absolute-year formatter left to call. That is
// structure, and structure is the strong half of the rule. It is not the
// whole of it. A surface can still hand-roll `Y${Math.round(year)}` in the
// component that needs it, or drop a raw `…Year` wire field straight into a
// label, and both read as ordinary code at review. That is exactly how the
// formatter this audit was written to replace came to exist: one surface
// needed a stamp, wrote one, a second surface copied it, and it survived to
// a docs pass. The structure keeps the mistake from being convenient; this
// keeps it from being silent.
//
// THE THREE CHECKS.
//
//   1. THE STAMP. A literal `Y` against a digit or an interpolation —
//      "Y1204", `Y${year}` — is the shape the old formatter emitted and the
//      one a component would reach for again. Nothing else in the client
//      writes a capital Y hard against a number.
//   2. THE RAW FIELD. Inside a template, an identifier ending in `Year` is a
//      DATE on the cohort's calendar, and it may reach the string only
//      through one of the formatters named below. `${m.arrivalYear}` and
//      `${Math.round(nowYear())}` are the two ways to leak one by hand.
//   3. THE SECOND FORMATTER. `clock.ts` may not grow a new exported
//      `format…` without it being named here. The allowlist in check 2 is
//      only as good as its knowledge of what exists, and a formatter that
//      appears in the module the rule is built on is the one thing that
//      would rot it quietly.
//
// The naming convention is what makes check 2 mechanical, and it is worth
// stating because the audit depends on it: `…Year` (singular) is a date,
// `…Years` is a span, `…PerYear` is a rate. A span and a rate are arithmetic
// and R-33 bans the calendar, not arithmetic, so only the singular is read.
//
// WHAT IT DOES NOT COVER. It reads string literals, so a year assembled by
// concatenation or parked in a local before it is interpolated passes
// through. It reads shapes, not values: a formatter on the allowlist is
// trusted with whatever it is handed. A year handed to a row builder rather
// than a template is out of scope on purpose and is not a hole: those
// parameters are typed `string` (`buildClockRow(label, value)`), so the
// compiler rejects the raw number. A template is the one place a number
// silently becomes text, which is why it is the one place this reads. And it
// stops at `client/src` — the
// server's half of R-33 is `voice.ts`'s `epochStamp`, which builds the same
// AE stamp for the report's annal, and R-33a's no-year chronicle, which
// `audit:facts` checks.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The formatters a `…Year` value may pass through on its way into a string.
 *
 * The first five are `clock.ts`'s, and they are the whole of the rule: each
 * either subtracts the epoch anchor before rendering (the two AE stamps) or
 * renders a SPAN, which carries no calendar (the countdown, the clock pair,
 * the game-year count).
 *
 * `formatArchiveAge` is the one entry that is not a clock formatter, and it
 * is here because two of its call sites compute their span from two date
 * fields (`${formatArchiveAge(Math.max(0, ctx.arrivesYear - asOfYear))} Y
 * AGO`). It renders a bare count of years and its parameter is named `years`;
 * the difference of two cohort dates is a duration, and a duration is not a
 * date. This is the audit's one act of trust, and it is the shape of entry to
 * be sparing with: the list is what a year is allowed to disappear into.
 */
const FORMATTERS = [
  "formatEpochYear",
  "formatEpochYearPrecise",
  "formatCountdown",
  "formatClockPair",
  "formatGameYears",
  "formatArchiveAge",
];

/**
 * Every `format…` `clock.ts` is known to export. Check 3 asserts the module's
 * exports are a subset of this, so a new date formatter cannot appear beside
 * the allowlist without being noticed by it. `formatRealDuration` sits here
 * and not in FORMATTERS above because it takes milliseconds: no year reaches
 * it, so it grants a year no passage.
 */
const KNOWN_CLOCK_FORMATTERS = new Set([...FORMATTERS, "formatRealDuration"]);

/**
 * FAILS CLOSED. Every module under client/src is scanned, except the one
 * named below and only for check 2, so a surface added next slice is covered
 * by default rather than by somebody remembering to list it. (audit:catalog
 * makes the same choice and its comment says why: a hand-maintained file list
 * is the same drift the audit exists to catch, one level up.)
 *
 * `clock.ts` is where the subtraction happens. It is the one module that
 * holds a cohort year and an ascension year in the same expression, because
 * that expression is the rule's implementation — exempting it from check 2 is
 * exempting the formatter from the check that everything goes through the
 * formatter. It stays subject to checks 1 and 3, which are the two that
 * matter there: it may not stamp a `Y1204`, and it may not quietly grow a
 * second way to.
 */
const ARITHMETIC = new Set(["client/src/clock.ts"]);

/** A capital Y hard against a digit or an interpolation: "Y1204", `Y${n}`. */
const STAMP = /(?<![\w$])Y(?=\d|\$\{)/g;

/** An identifier whose last word is `Year`: `arrivalYear`, `nowYear`, `year`. */
const YEAR_ID = /(?<![\w$])[\w$]*[Yy]ear(?![\w$])/g;

/** `…PerYear` is a rate (compute per year), not a date. */
const RATE = /[Pp]er[Yy]ear$/;

const failures = [];
const fail = (file, line, note, text) =>
  failures.push(`${file}:${line}  ${note}\n      ${text.trim().slice(0, 160)}`);

/**
 * The characters after which a `/` opens a REGEX rather than divides. Regex
 * literals have to be skipped whole or a character class swallows the rest of
 * the file as a string (audit-dashes.mjs hit this and its comment says how).
 */
const REGEX_POSITION = new Set([..."=(,:[!&|?{};+-*%<>~^", "\n"]);

/**
 * String and template literals, with comments and regexes removed, PLUS the
 * source of every `${…}` inside a template.
 *
 * Deliberately a scanner and not a parser, for the reason audit-dashes.mjs
 * gives: it needs to know only where a literal starts and ends, and getting
 * that wrong is loud in either direction. It differs from that one in
 * tracking the interpolations rather than flattening them, because half this
 * rule is about what goes INTO a string rather than what a string says, and
 * that means brace depth and a stack: a template inside an interpolation
 * inside a template is ordinary code here.
 */
function scan(src) {
  const literals = [];
  const exprs = [];
  const stack = [];
  let i = 0;
  let line = 1;
  let prev = "\n";

  while (i < src.length) {
    const c = src[i];
    const mode = stack.length > 0 ? stack[stack.length - 1] : null;

    // --- inside a template's TEXT ---------------------------------------
    if (mode !== null && mode.kind === "template") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        literals.push({ line: mode.startLine, text: src.slice(mode.start, i) });
        stack.pop();
        prev = "`";
        i++;
        continue;
      }
      if (c === "$" && src[i + 1] === "{") {
        stack.push({ kind: "expr", start: i + 2, startLine: line, depth: 1 });
        i += 2;
        prev = "{";
        continue;
      }
      if (c === "\n") line++;
      i++;
      continue;
    }

    // --- code: the top level, or inside an interpolation ------------------
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
    if (c === "`") {
      stack.push({ kind: "template", start: i + 1, startLine: line });
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
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
        // An unterminated quoted literal is a scan error, not a string that
        // spans lines. Only a template may cross a newline.
        if (src[i] === "\n") {
          line++;
          break;
        }
        text += src[i];
        i++;
      }
      literals.push({ line: startLine, text });
      prev = quote;
      continue;
    }
    if (mode !== null && mode.kind === "expr") {
      if (c === "{") {
        mode.depth++;
        i++;
        prev = "{";
        continue;
      }
      if (c === "}") {
        mode.depth--;
        if (mode.depth === 0) {
          exprs.push({ line: mode.startLine, text: src.slice(mode.start, i) });
          stack.pop();
          prev = "}";
          i++;
          continue;
        }
        i++;
        prev = "}";
        continue;
      }
    }
    if (c !== " " && c !== "\t") prev = c;
    i++;
  }
  return { literals, exprs };
}

/** The line a match sits on, given the line the literal started on. */
function lineOf(row, index) {
  let line = row.line;
  for (let i = 0; i < index; i++) if (row.text[i] === "\n") line++;
  return line;
}

/**
 * The expression with every allowlisted formatter CALL removed, arguments and
 * all. What survives is the part of the interpolation that reaches the string
 * unmediated, and a date has no business being in it.
 */
function stripFormatterCalls(expr) {
  let out = expr;
  for (;;) {
    let cut = false;
    for (const name of FORMATTERS) {
      const at = new RegExp(`(?<![\\w$])${name}\\s*\\(`).exec(out);
      if (at === null) continue;
      const open = at.index + at[0].length - 1;
      const close = matchingParen(out, open);
      if (close === -1) continue;
      out = out.slice(0, at.index) + out.slice(close + 1);
      cut = true;
      break;
    }
    if (!cut) return out;
  }
}

/** The index of the `)` closing the `(` at `open`, or -1. Quote-aware: an
 *  argument may be a string, and a string may hold a paren. */
function matchingParen(src, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote !== null) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function tsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? tsFiles(join(dir, entry.name))
      : entry.name.endsWith(".ts")
        ? [join(dir, entry.name)]
        : [],
  );
}

// --- checks 1 and 2, over every client surface -----------------------------

let literalCount = 0;
let exprCount = 0;

for (const file of tsFiles(join(root, "client/src"))) {
  const rel = relative(root, file);
  const { literals, exprs } = scan(readFileSync(file, "utf8"));
  literalCount += literals.length;
  exprCount += exprs.length;

  for (const row of literals) {
    STAMP.lastIndex = 0;
    let m;
    while ((m = STAMP.exec(row.text)) !== null) {
      fail(rel, lineOf(row, m.index), "absolute-year stamp", row.text);
    }
  }

  if (ARITHMETIC.has(rel)) continue;

  for (const row of exprs) {
    const rest = stripFormatterCalls(row.text);
    YEAR_ID.lastIndex = 0;
    let m;
    while ((m = YEAR_ID.exec(rest)) !== null) {
      if (RATE.test(m[0])) continue;
      // One report per interpolation. A second date in the same `${…}` is the
      // same leak, and the fix is the same edit.
      fail(rel, lineOf(row, 0), `a year reaches the string through \`${m[0]}\``, `\${${row.text}}`);
      break;
    }
  }
}

// --- check 3: clock.ts grew no new formatter -------------------------------

const clockSrc = readFileSync(join(root, "client/src/clock.ts"), "utf8");
const exported = /export\s+function\s+(\w+)/g;
let e;
while ((e = exported.exec(clockSrc)) !== null) {
  const name = e[1];
  if (!name.startsWith("format") || KNOWN_CLOCK_FORMATTERS.has(name)) continue;
  const line = clockSrc.slice(0, e.index).split("\n").length;
  fail(
    "client/src/clock.ts",
    line,
    "a formatter the dating audit does not know",
    `export function ${name}`,
  );
}

if (literalCount === 0 || exprCount === 0) {
  fail("scripts/audit-dating.mjs", 0, "scraped nothing", "the audit is not testing anything");
}

console.log(`string literals scanned  ${literalCount}`);
console.log(`interpolations scanned   ${exprCount}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} absolute-year leak(s) on a player surface (R-33):`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nEvery date a player reads is that civilization's own count from its own\n" +
      "ascension. Send the year through clock.ts's formatEpochYear (or a span\n" +
      "through formatClockPair/formatCountdown); do not stamp the cohort's.",
  );
  process.exit(1);
}
console.log("\nno absolute game year reaches a player surface");
