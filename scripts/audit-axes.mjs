// The instrument audit (build-instruments.md, decisions 2 and 4).
//
//   npm run build && npm run audit:axes
//
// FOUR CLAIMS, AND THE FIRST ONE IS THE IMPORT ITSELF.
//
// projects.ts derives the axis ladders rather than authoring them: it
// partitions the catalog by `placement.axis` and chains each partition through
// `after`, and it THROWS at module load on a chain that is malformed (no root,
// two roots, two rungs sharing a predecessor, an `after` naming an unknown
// project or one on another axis, a cycle). A throw at module load inside a
// Durable Object is a total outage, so the point of this script is that the
// first place a bad chain speaks is a red check and never production. Nothing
// else in CI imports the compiled catalog: `audit:catalog` scrapes
// `server/src` by design, because cohort.ts is the only module that may pull
// the catalog chain into a process. This one may import projects.js and only
// projects.js — its sole import is `import type { QuestionId }`, erased at
// build, so it pulls no truth chain behind it.
//
// It also PRINTS the derived ladders. The brief's twelve-row table stops
// existing in code once the order lives as `after` pointers scattered across
// seventeen entries, and reviewing "is BASELINE right?" otherwise means
// grepping placements. The print is a mitigation, not a proof.
//
// The other three claims:
//
//   (2) Every axis-placed project is in exactly one ladder. Unstatable in the
//       types (a project names exactly one axis, and ladders are built out of
//       ProjectDefs) but cheap to assert, and it is what would break first if
//       `axisLadders` were ever rewritten to author membership instead.
//
//   (3) LEANS ON NEVER CONTRADICTS A GRANT. A question's `leansOn` names the
//       terms of the reconstruction it is limited by, and the drill-in shows
//       them as chips. If a project discounts a question from an axis that
//       question does not lean on, the player is reading two claims that
//       disagree: one says this term does not bound the measurement, the other
//       charges less for it because of that term. The catalog is the authority
//       on which; this only asserts they agree.
//
//   (4) NO DISCOUNT STACK NEEDS THE FLOOR. questions.ts's EFFECT_KEEP_FLOOR
//       (25% of catalog base) is a backstop, and a stack that reaches it has
//       stopped being priced by the catalog and started being priced by the
//       clamp. The bar here is 0.30, above the floor on purpose, so a retune
//       is caught before it lands on it.
//
// `leansOn` is SCRAPED from server/src/questions.ts rather than imported: that
// module reaches contest.ts, galaxy.ts and knowledge.ts at runtime, and
// scraping is also what catches a table row edited without being thought about
// (audit-names.mjs's and audit-parity.mjs's argument, one more time).

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "server/dist/projects.js");

let AXES, AXIS_ORDER, AXIS_LADDERS, PROJECTS;
try {
  ({ AXES, AXIS_ORDER, AXIS_LADDERS, PROJECTS } = await import(pathToFileURL(DIST).href));
} catch (err) {
  console.error(
    `could not load ${DIST}. Run \`npm run build\` first.\n` +
      `(If the build is current, this IS the check: a malformed axis chain throws\n` +
      `at module load, and the message below says which axis and why.)\n${String(err)}`,
  );
  process.exit(1);
}

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------------------------------------------------------------------------
// (1) Every axis has a ladder, and the display order is the key set.
// ---------------------------------------------------------------------------

const axisIds = Object.keys(AXES);
for (const id of axisIds) {
  if (!AXIS_ORDER.includes(id)) fail(`axis ${id} is in AXES but not in AXIS_ORDER`);
  if (AXIS_LADDERS[id] === undefined) fail(`axis ${id} has no ladder`);
}
for (const id of AXIS_ORDER) {
  if (AXES[id] === undefined) fail(`AXIS_ORDER names ${id}, which is not an axis`);
}

// ---------------------------------------------------------------------------
// (2) Every axis-placed project is in exactly one ladder.
// ---------------------------------------------------------------------------

const placed = PROJECTS.filter((p) => p.placement.on === "axis");
for (const def of placed) {
  const inLadders = AXIS_ORDER.filter((axis) => (AXIS_LADDERS[axis] ?? []).includes(def.id));
  if (inLadders.length !== 1) {
    fail(
      `${def.id} sits on ${def.placement.axis} but appears in ${inLadders.length} ladder(s)` +
        (inLadders.length > 0 ? `: ${inLadders.join(", ")}` : ""),
    );
  }
}
const laddered = new Set(AXIS_ORDER.flatMap((axis) => [...(AXIS_LADDERS[axis] ?? [])]));
for (const id of laddered) {
  if (!PROJECTS.some((p) => p.id === id)) fail(`ladder rung ${id} is not a catalog entry`);
}

// ---------------------------------------------------------------------------
// questions.ts, scraped: id -> leansOn
// ---------------------------------------------------------------------------

/** The record splitter audit-facts.mjs uses, for the same reason it does:
 *  a regex spanning one entry's prose to the next entry's fields is how an
 *  audit reports failures against a correct catalog. */
function records(source, arrayName) {
  const start = source.indexOf(`export const ${arrayName}`);
  if (start < 0) return [];
  const body = source.slice(start);
  const out = [];
  const re = /\n {2}\{\n([\s\S]*?)\n {2}\},/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push(m[1]);
  return out;
}

const questionsSrc = readFileSync(join(root, "server/src/questions.ts"), "utf8");
const leansOn = new Map();
for (const record of records(questionsSrc, "QUESTIONS")) {
  const idHit = record.match(/id:\s*"([\w-]+)"/);
  const leansHit = record.match(/leansOn:\s*\[([^\]]*)\]/);
  if (!idHit) continue;
  if (!leansHit) {
    fail(`question ${idHit[1]} has no leansOn`);
    continue;
  }
  const axes = [...leansHit[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  for (const axis of axes) {
    if (AXES[axis] === undefined) {
      fail(`question ${idHit[1]} leans on ${axis}, which is not an axis`);
    }
  }
  leansOn.set(idHit[1], axes);
}
if (leansOn.size === 0) {
  console.error("scraped zero questions from questions.ts — the audit is not testing anything");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// (3) A project that discounts a question sits on an axis that question leans
//     on. The chips and the grant say the same thing or the audit says so.
// ---------------------------------------------------------------------------

let grantChecks = 0;
for (const def of PROJECTS) {
  if (def.effect.kind !== "question-discount") continue;
  if (def.placement.on !== "axis") continue;
  const axis = def.placement.axis;
  for (const questionId of def.effect.questionIds) {
    const axes = leansOn.get(questionId);
    grantChecks += 1;
    if (axes === undefined) {
      fail(`${def.id} discounts ${questionId}, which is not in the question catalog`);
      continue;
    }
    if (!axes.includes(axis)) {
      fail(
        `${def.id} is on ${axis} and discounts ${questionId}, whose LEANS ON does not name ` +
          `${axis} (it names ${axes.join(", ")})`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// (4) The stacks, against a bar set above the floor.
//
// THE ALLOWLIST IS ONE ROW AND IT IS EXPLICIT. TIME ITS SHADOWS stacked to
// 0.28 the day the occultation net shipped at 50% (net 0.5 × pulsar clocks 0.7
// × the Vault 0.8), which is below this bar and above questions.ts's floor.
// IN1 deliberately does not deepen it: photometry needs no frequency-plane
// coverage, so `fill-the-plane` names the four reconstructions that do and
// leaves this one alone. It is recorded here rather than waived, so a retune
// that made it WORSE still fails.
// ---------------------------------------------------------------------------

const STACK_BAR = 0.3;
const KNOWN_GRAZERS = new Map([["time-its-shadows", 0.28]]);

const stacks = new Map();
for (const questionId of leansOn.keys()) {
  let keep = 1;
  for (const def of PROJECTS) {
    if (def.effect.kind !== "question-discount") continue;
    if (!def.effect.questionIds.includes(questionId)) continue;
    keep *= 1 - def.effect.percent / 100;
  }
  stacks.set(questionId, keep);
}

for (const [questionId, keep] of stacks) {
  const grazer = KNOWN_GRAZERS.get(questionId);
  if (grazer !== undefined) {
    if (keep < grazer - 1e-9) {
      fail(
        `${questionId} stacks to ${keep.toFixed(3)}, below the ${grazer} this audit records as ` +
          `its known floor grazer. Deepening it needs the allowlist updated and the call re-made.`,
      );
    }
    continue;
  }
  if (keep < STACK_BAR - 1e-9) {
    fail(
      `${questionId} stacks to ${keep.toFixed(3)}, under the ${STACK_BAR} bar. A stack that ` +
        `reaches EFFECT_KEEP_FLOOR is priced by the clamp and not by the catalog.`,
    );
  }
}

// ---------------------------------------------------------------------------

console.log("the ladders, as derived:\n");
for (const axis of AXIS_ORDER) {
  const def = AXES[axis];
  const rungs = AXIS_LADDERS[axis] ?? [];
  const chain = rungs.length > 0 ? rungs.join(" > ") : "(no rungs yet)";
  console.log(`  ${def.label.padEnd(20)} ${def.inherited.label} > ${chain}`);
}

const programs = PROJECTS.filter((p) => p.placement.on === "none").map((p) => p.id);
console.log(`\n  on no axis          ${programs.join(", ")}`);

console.log("\nthe discount stacks (keep fraction, lower is a deeper discount):\n");
for (const [questionId, keep] of stacks) {
  const note = KNOWN_GRAZERS.has(questionId) ? "  (known floor grazer)" : "";
  console.log(`  ${questionId.padEnd(22)} ${keep.toFixed(3)}${note}`);
}

console.log(`\naxes                     ${axisIds.length}`);
console.log(`projects on an axis      ${placed.length}`);
console.log(`grant/lean pairs checked ${grantChecks}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} instrument problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nevery rung is on one ladder, every grant is on a term its question leans on");
