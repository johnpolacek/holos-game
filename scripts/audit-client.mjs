// The client-surface audit (prose-style.md §6 + R-24/R-24a).
//
//   npm run build && npm run audit:client
//
// Runs the §6 rule table over every string the client ships, and R-24's
// chrome bounds over the ALL-CAPS strings among them.
//
// WHY IT DID NOT EXIST. The server's prose meets §6 twice in CI
// (audit:voice over the voice banks, audit:catalog over everything else in
// server/src). The client's prose met it nowhere. Two audits already read
// every literal in client/src — audit:dashes and audit:dating — and each
// checks exactly the one rule it is named for (R-8, R-33). So a chrome
// label coined against §6, or a caps line grown past every bound R-24
// grants, would ship with no check but the judgement pass (/prose-audit),
// which runs when somebody thinks to run it. The KN slice's review surfaced
// the gap; this closes it. It is the same hole audit:catalog was written
// into one tier down, and the fix leans on the same lesson the voice.ts
// exclusion taught there: fail closed twice rather than open once.
//
// THE §6 HALF makes the trade every §6 audit makes: the rule table is
// IMPORTED from the compiled output (run `npm run build` first), so it
// cannot drift from the §6 that ships, and the sources are SCRAPED rather
// than imported, because a browser module does not load in a bare node
// process and should not have to. Strings under three words are skipped as
// identifiers, keys and class names, exactly as audit:catalog skips them —
// EXCEPT in caps, where the chrome check below reads everything (§6 carries
// two case-insensitive rules, the §8 comms register, and a two-word label
// can trip one).
//
// THE R-24 HALF reads the ladder of bounds, not one bound. A string with
// letters and no lowercase among them is chrome, and chrome is three things:
//
//   - a LABEL (R-24): a set phrase naming a thing a thumb can press or a
//     state it can recognise. ≤ 6 words.
//   - a SUB-LINE or a COMPOSED line (R-24a): a whole sentence set in caps
//     under a label, or a pinned stem carrying an interpolated fact.
//     Microcopy's bound worn in chrome's typography: ≤ 12 words, counted on
//     the stem alone.
//   - nothing. There is no third bound; 13 words of caps is a failure
//     whatever the string believes itself to be.
//
// The label/sub-line line is a judgement call — R-24a defines a sub-line by
// what it does, and no scanner can read intent — so the judgement is
// RECORDED rather than guessed: a caps string over six words must appear in
// SUB_LINES below, and an entry nothing matches any more is itself a
// failure. Both directions fail closed: the unregistered long label breaks
// the build, and so does the registry rotting under an edit.
//
// Interpolations are masked out before anything is measured, because R-24a
// bounds a composed line on its stem alone (the fact is bounded at its own
// source), and word counting is strict: the record separator counts as a
// word. Erring strict is safe when registration is the escape valve, and it
// keeps this count the same count audit:voice's checkChrome runs.
//
// COVERAGE is audit:dashes' surface map minus the half audit:catalog
// already owns: every .ts under client/src (fails CLOSED — a module added
// next slice is scanned by default; NOT_A_SURFACE is where an exemption
// would be argued, and it is empty), the service worker's notification
// lines, the social-card build script, and — §6 only, they are markup and
// css, not chrome — the document head, the web manifest, and style.css's
// `content:` lines.
//
// WHAT IT CANNOT SEE: case. Most of §6 turns on it (\bMind\b convicts the
// ship-AI noun and acquits the core vocabulary), and an ALL-CAPS surface
// erases it, so MIND in chrome answers only to the two case-insensitive
// rules. audit:voice's checkChrome makes the identical trade over the
// proposal verbs; the case-sensitive concepts in caps stay a human read.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "server/dist/bannedterms.js");

let rules;
try {
  ({ BANNED_RULES: rules } = await import(pathToFileURL(DIST).href));
} catch (err) {
  console.error(`could not load ${DIST}. Run \`npm run build\` first.\n${String(err)}`);
  process.exit(1);
}

const compiled = rules.map((r) => ({ ...r, re: new RegExp(r.source, r.flags) }));

/**
 * FAILS CLOSED, and today that closes over everything: every module under
 * client/src is scanned and none is exempt. The set exists so that the day a
 * client module genuinely carries non-surface strings — a shader, a table of
 * `why`-style design notes like contest.ts's — the exemption is argued here,
 * with the reason, instead of the module quietly never being read
 * (audit:catalog's header tells the story of how an allowlist went wrong
 * inside one merge; this is the same choice one tier down).
 */
const NOT_A_SURFACE = new Set([]);

/** R-24: a label's six words. */
const LABEL_MAX = 6;
/** R-24a: a sub-line takes microcopy's bound (R-25), in caps. */
const SUB_LINE_MAX = 12;

/**
 * R-24a's registry: every ALL-CAPS string over LABEL_MAX words, by its
 * masked, whitespace-normalized text. An entry here is a recorded judgement
 * that the string is a sub-line or a composed line, not a label that grew.
 * Each carries the site it was judged at; two sites sharing a text share an
 * entry, because the judgement is about the string.
 *
 * Adding to this list is the deliberate act the audit exists to force. The
 * question to answer before adding: does this line sit UNDER a label,
 * explaining what taking the move would mean (sub-line), or is it a pinned
 * stem carrying an interpolated fact (composed)? If it is neither, it is a
 * label past its bound, and the fix is the string, not this list.
 */
const SUB_LINES = new Set([
  // accord.ts, the accord rail (R-24a's own composed-line example). The
  // no-light-yet reading is the honest fallback of the same rail.
  "THEIR LIGHT SINCE: NONE HAS REACHED US YET",
  "THEIR LIGHT SINCE: · AS OF Y AGO",
  // studyboard.ts, the accord brief's standing row: three pinned stems
  // joined by record separators, each a label within its own bound.
  "STANDING · PAID ONCE · THE GRANT HOLDS",
  // studyboard.ts, the accord picker's subs — what taking each move would
  // mean, under the move's own chip. Two of these are R-24a's cited
  // examples.
  "NEITHER OF US SHINES AT THE OTHER. ONE OFFER, EVER",
  "THEY WILL NOT KNOW UNTIL IT REACHES THEM",
  "THE HONEST EXIT, WHILE THERE IS BUDGET FOR ONE",
  // studyboard.ts, the voyage board: the occupied warning and the blocked
  // reading (another R-24a citation), plus two composed clocks.
  "SOMETHING IS ALREADY THERE · AS OF Y AGO",
  "NEEDS A PROJECT THAT HAS NOT LANDED",
  "EVERYTHING WE KNOW WILL BE OLD AT LANDFALL",
  // studyboard.ts, the standing order's price line: cost and radius are
  // interpolated facts, the stem names what they are.
  "COMPUTE AT FIRE TIME · WITHIN LY",
]);

const failures = [];
const fail = (file, line, note, text) =>
  failures.push(`${file}:${line}  ${note}\n      ${text.trim().slice(0, 160)}`);

/**
 * The characters after which a `/` opens a REGEX rather than divides. Regex
 * literals have to be skipped whole or a character class swallows the rest
 * of the file as a string (audit-dashes.mjs hit this and its comment says
 * how).
 */
const REGEX_POSITION = new Set([..."=(,:[!&|?{};+-*%<>~^", "\n"]);

/**
 * String and template literals, with comments and regexes removed, and each
 * `${…}` in a template MASKED to a single space. audit-dating's scanner is
 * the mould (brace depth and a stack, because a template inside an
 * interpolation inside a template is ordinary code in the client); it
 * differs in what it keeps. That one tracks the interpolation SOURCE,
 * because R-33 is about what goes into a string. This rule is about what a
 * string says around its facts, so the source is dropped and the authored
 * text kept — a string inside an interpolation still surfaces as its own
 * literal.
 */
function scan(src) {
  const literals = [];
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
        mode.text += src[i] + (src[i + 1] ?? "");
        i += 2;
        continue;
      }
      if (c === "`") {
        literals.push({ line: mode.startLine, text: mode.text });
        stack.pop();
        prev = "`";
        i++;
        continue;
      }
      if (c === "$" && src[i + 1] === "{") {
        mode.text += " ";
        stack.push({ kind: "expr", depth: 1 });
        i += 2;
        prev = "{";
        continue;
      }
      if (c === "\n") line++;
      mode.text += c;
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
      stack.push({ kind: "template", text: "", startLine: line });
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
          text += src[i] + (src[i + 1] ?? "");
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
        i++;
        prev = "}";
        if (mode.depth === 0) stack.pop();
        continue;
      }
    }
    if (c !== " " && c !== "\t") prev = c;
    i++;
  }
  return literals;
}

/** The line a match sits on, given the line the literal started on. */
function lineOf(row, index) {
  let line = row.line;
  for (let i = 0; i < index; i++) if (row.text[i] === "\n") line++;
  return line;
}

function tsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? tsFiles(join(dir, entry.name))
      : entry.name.endsWith(".ts") && !NOT_A_SURFACE.has(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

/** Chrome: at least one letter, none of them lowercase (masked text). */
const hasUpper = /\p{Lu}/u;
const hasLower = /\p{Ll}/u;

const wordsOf = (text) => text.trim().split(/\s+/).filter((w) => w.length > 0);

function checkBanned(file, row, text) {
  for (const rule of compiled) {
    const m = rule.re.exec(text);
    if (m !== null) {
      fail(file, lineOf(row, m.index), `§6 term /${rule.source}/ (${rule.note})`, text);
    }
  }
}

let literalCount = 0;
let proseCount = 0;
let capsCount = 0;
const seenSubLines = new Set();

// --- the literal surfaces: client/src, plus the two shipped scripts --------

const literalSources = [
  ...tsFiles(join(root, "client/src")),
  // A5's notification lines: the only prose a player reads outside the app
  // (audit-dashes.mjs says why it is authored there).
  join(root, "client/public/sw.js"),
  // The social card's tagline. Prose a crawler quotes, not chrome, so it is
  // outside the caps check below.
  join(root, "scripts/build-og.mjs"),
];
const chromeSources = new Set(literalSources.slice(0, -1));

for (const file of literalSources) {
  const rel = relative(root, file);
  for (const row of scan(readFileSync(file, "utf8"))) {
    literalCount++;
    const words = wordsOf(row.text);
    if (words.length === 0) continue;
    const caps = hasUpper.test(row.text) && !hasLower.test(row.text);

    if (caps && chromeSources.has(file)) {
      capsCount++;
      checkBanned(rel, row, row.text);
      const normalized = words.join(" ");
      const registered = SUB_LINES.has(normalized);
      if (registered) seenSubLines.add(normalized);
      if (words.length > SUB_LINE_MAX) {
        fail(
          rel,
          row.line,
          `${words.length} words of ALL-CAPS: past the sub-line bound (R-24a, ≤ ${SUB_LINE_MAX})`,
          row.text,
        );
      } else if (words.length > LABEL_MAX && !registered) {
        fail(
          rel,
          row.line,
          `${words.length} words of ALL-CAPS: past a label's ${LABEL_MAX} (R-24) and not a registered sub-line`,
          row.text,
        );
      }
      continue;
    }

    if (words.length >= 3) {
      proseCount++;
      checkBanned(rel, row, row.text);
    }
  }
}

// A registry entry nothing matches is a judgement about a string that no
// longer exists — an edit slid out from under it. Re-judge the new text.
for (const entry of SUB_LINES) {
  if (!seenSubLines.has(entry)) {
    fail("scripts/audit-client.mjs", 0, "stale SUB_LINES entry: no shipped string matches", entry);
  }
}

// --- the whole-line surfaces: markup and css, §6 only ----------------------

for (const file of ["client/index.html", "client/public/manifest.webmanifest"]) {
  const src = readFileSync(join(root, file), "utf8");
  src.split("\n").forEach((text, index) => {
    checkBanned(file, { line: index + 1, text }, text);
  });
}

{
  const file = "client/src/style.css";
  const stripped = readFileSync(join(root, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  stripped.split("\n").forEach((text, index) => {
    if (text.includes("content:")) checkBanned(file, { line: index + 1, text }, text);
  });
}

if (literalCount === 0 || proseCount === 0 || capsCount === 0) {
  fail("scripts/audit-client.mjs", 0, "scraped nothing", "the audit is not testing anything");
}

console.log(`string literals scanned  ${literalCount}`);
console.log(`prose strings (§6)       ${proseCount}`);
console.log(`ALL-CAPS chrome (R-24)   ${capsCount}`);
console.log(`§6 rules applied         ${compiled.length}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} hit(s) on a client surface:`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\n§6 bans the concept, not only the string: if a surface needs the idea,\n" +
      "use a house coinage from §8. A caps line past six words is either a\n" +
      "sub-line to register (R-24a, with the judgement written down) or a\n" +
      "label to shorten; past twelve it is only ever the second.",
  );
  process.exit(1);
}

console.log("\nno §6 term and no oversized caps line reaches a client surface");
