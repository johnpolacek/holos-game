// The counsel evaluation (docs/build-voice.md § AV4, "The counsel seam").
//
//   export ANTHROPIC_API_KEY=sk-ant-...   # or put it in .dev.vars
//   npm run build && npm run eval:counsel
//
// WHY THIS EXISTS. AV4 ships `HOLOS_COUNSEL_GEN=off` with a written
// condition: the counsel flag stays off until its picks read well on a dev
// cohort, because bad counsel is worse than plain counsel — a wrong stance
// sits at zero light-delay, right beside the move, where being wrong is
// instantly legible. This script produces the thing that condition needs:
// a column of real counsel, on real candidate sets, in enough archetypes'
// voices to judge.
//
// WHAT IT DRIVES. The shipped code, not a model of it. The scenarios below
// are wire-shaped snapshots fed to the REAL `enumerateProposals` and
// `serveProposals`, so the candidates, the reason prose, the fingerprints
// and the served order are the ones production would compute; and the calls
// go through the REAL `VoiceGen.counselFor`, so the prompt, the schema, the
// style gate, the pinned-token check and the storage records are all the
// shipped ones. The Durable Object is the only thing stubbed, and only
// where it is uninteresting: an in-memory Map for storage, and a
// waitUntil that collects promises so this script can await what the DO
// would leave running.
//
// WHAT IT MEASURES, in two halves.
//
//   MECHANICAL — the agreement rate. How often the move the mind says it
//   WOULD have taken is the move the floor leads with. Production logs this
//   per call as `agree=0/1`; here it is gathered in bulk. It is purely
//   observational and changes nothing that is served — the mind is told
//   which move is being taken and writes its stance about that one, so a
//   disagreement costs the player nothing and withholds nothing. The number
//   says how much a fuller pick mode would change if it were ever enabled,
//   and whether the model arrives where the floor's heuristic already is.
//
//   Read it knowing what the scenarios can carry: a scenario that enumerates
//   ONE candidate cannot disagree, so its agreement is arithmetic rather
//   than judgement, and only a genuinely crowded board makes the number mean
//   anything.
//
//   JUDGMENTAL — the stances themselves, which is the half that actually
//   decides the flag and which NO SCRIPT CAN SCORE. The gate already proves
//   a stance is clean: no digit, no designation, no banned term, nothing
//   echoed from the pinned facts beside it. Clean is not the same as good.
//   The question a human answers from this output is whether each line
//   sounds like THAT mind rather than a generic one, and whether it says
//   something true about the choice in front of it. Read the same scenario
//   down the archetype column: if the Congress and the Engine produce
//   interchangeable sentences, the seam is not earning its cost even though
//   every check is green.
//
// COST. One model call per (scenario, archetype) — the default matrix is
// every scenario by 4 archetypes. `--archetypes all` widens it
// to every mind, `--scenario <id>` narrows it to one.

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// The shipped SOURCE, bundled — not a re-implementation, and not the tsc
// output either. `server/tsconfig.json` targets a bundler ("moduleResolution":
// "bundler"), so its emitted imports are extensionless and plain Node cannot
// resolve them; esbuild is already here as wrangler's own bundler and
// resolves them the same way the Worker build does. Bundling the source also
// means this harness needs no `npm run build` to be current.
let mod, tmp;
try {
  const esbuild = await import("esbuild");
  tmp = mkdtempSync(join(tmpdir(), "holos-eval-"));
  const entry = join(tmp, "entry.ts");
  writeFileSync(
    entry,
    [
      `export { enumerateProposals, serveProposals } from ${JSON.stringify(join(root, "server/src/proposals"))};`,
      `export { VoiceGen, candidateSetFingerprint, PROMPT_VERSION } from ${JSON.stringify(join(root, "server/src/voicegen"))};`,
      `export { ARCHETYPES, archetypeById } from ${JSON.stringify(join(root, "server/src/minds"))};`,
    ].join("\n"),
  );
  const out = join(tmp, "bundle.mjs");
  await esbuild.build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    packages: "bundle",
    logLevel: "silent",
  });
  mod = await import(pathToFileURL(out).href);
} catch (err) {
  console.error("Could not bundle the server source.");
  console.error(String(err.message ?? err));
  process.exit(1);
} finally {
  if (tmp) process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
}

const { enumerateProposals, serveProposals, VoiceGen, candidateSetFingerprint, PROMPT_VERSION } = mod;
const { ARCHETYPES, archetypeById } = mod;

// ---------------------------------------------------------------------------
// The key. Env first, then .dev.vars — the same file wrangler dev reads, so
// a working local setup needs nothing extra. Never printed.
// ---------------------------------------------------------------------------

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const text = readFileSync(join(root, ".dev.vars"), "utf8");
    for (const line of text.split("\n")) {
      const m = /^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .dev.vars — fall through to the error below
  }
  return null;
}

// ---------------------------------------------------------------------------
// The Durable Object, stubbed exactly as far as the seam reaches into it.
// ---------------------------------------------------------------------------

function makeDeps(key) {
  const map = new Map();
  const pending = [];
  return {
    deps: {
      env: { HOLOS_COUNSEL_GEN: "on", HOLOS_VOICE_GEN: "off", ANTHROPIC_API_KEY: key },
      storage: {
        get: async (k) => map.get(k),
        put: async (k, v) => void map.set(k, v),
      },
      waitUntil: (p) => pending.push(p),
    },
    settle: async () => {
      await Promise.all(pending.splice(0));
    },
    read: (k) => map.get(k),
  };
}

// ---------------------------------------------------------------------------
// Scenario fixtures.
//
// Wire-shaped, and only as populated as the five enumerator rules read —
// building a whole galaxy here would add nothing the rules can see. Each
// scenario is chosen to fire a DIFFERENT rule, because the interesting
// question is whether the mind's stance changes with the KIND of choice, not
// only with the archetype.
// ---------------------------------------------------------------------------

const source = (starId, cls, distanceLy, confidence, level = 0.6) => ({
  starId,
  designation: `HOL-${starId.replace(/\D/g, "").padStart(4, "0")}-${Math.round(distanceLy)}`,
  distanceLy,
  lightAgeYears: distanceLy,
  asOfYear: 5000 - Math.round(distanceLy),
  signal: { emissionLevel: level, classification: cls, confidence, history: [] },
});

const hypo = (id, label, gloss, share) => ({ id, label, gloss, share });

const question = (id, label, line, cost, years, state, separates, finding = null) => ({
  id,
  label,
  line,
  costClass: "investment",
  costCompute: cost,
  integrationYears: years,
  separates,
  state,
  boughtYear: state === "offered" ? null : 5000,
  answersYear: state === "offered" ? null : 5000 + years,
  finding,
});

const study = (starId, cls, hypotheses, openQuestions, status = "open") => ({
  starId,
  status,
  signalClass: cls,
  hypotheses,
  evidence: [],
  openQuestions,
  annotationLine: "",
  grounding: null,
});

const project = (id, label, line, effectLine, cost, years, add) => ({
  id,
  label,
  line,
  effectLine,
  costClass: "investment",
  costCompute: cost,
  durationYears: years,
  addRatePerYear: add,
  status: "available",
  startedYear: null,
  landsYear: null,
});

const budget = (free, rate = 6) => ({ free, ratePerYear: rate, asOfYear: 5000 });

const base = {
  sources: [],
  studies: [],
  missions: [],
  projects: [],
  budget: budget(0),
  localNames: {},
  designations: {},
  probeFlightYearsPerLy: 10,
  declined: new Set(),
};

// A close, bright, unstudied source and a dimmer far one.
const NEAR = source("star-1163", "broadcast-leakage", 5, 0.9, 0.8);
const MID = source("star-4471", "transit-shadows", 12, 0.72, 0.5);
const FAR = source("star-8130", "biosignature", 21, 0.55, 0.4);

const LEAD_TIGHT = [
  hypo("industry", "INDUSTRY", "machines at work, and nobody hiding them", 0.38),
  hypo("natural", "NATURAL PROCESS", "rock and chemistry, nothing made", 0.34),
  hypo("performance", "A PERFORMANCE", "a show put on for whoever is watching", 0.28),
];
const LEAD_CLEAR = [
  hypo("industry", "INDUSTRY", "machines at work, and nobody hiding them", 0.71),
  hypo("natural", "NATURAL PROCESS", "rock and chemistry, nothing made", 0.19),
  hypo("performance", "A PERFORMANCE", "a show put on for whoever is watching", 0.1),
];

const Q_WEIGH = question(
  "weigh-it",
  "WEIGH IT",
  "Put the mass against the heat and see whether the two can belong to the same object.",
  18,
  4,
  "offered",
  ["industry", "natural"],
);
const Q_LINES = question(
  "read-its-lines",
  "READ ITS LINES",
  "Split the light and read what the spectrum admits to.",
  26,
  6,
  "offered",
  ["industry", "performance"],
);
const Q_PLATEAU = question(
  "time-its-shadows",
  "TIME ITS SHADOWS",
  "Time the crossings and see whether the schedule is kept.",
  22,
  5,
  "answered",
  ["industry", "natural"],
  { shape: "plateau", line: "The reading did not move. Watching longer will not move it either." },
);

const SCENARIOS = [
  {
    id: "first-watch",
    note: "A civilization with nothing: no study, no probe, a bright source close by.",
    input: { ...base, sources: [NEAR, MID, FAR], budget: budget(240) },
  },
  {
    id: "question",
    note: "One open study, three readings within a hair of each other, a question affordable.",
    input: {
      ...base,
      sources: [NEAR, MID],
      studies: [study("star-1163", "broadcast-leakage", LEAD_TIGHT, [Q_WEIGH, Q_LINES])],
      budget: budget(120),
    },
  },
  {
    id: "probe-plateau",
    note: "A bought answer that went nowhere: the light has said all it will say.",
    input: {
      ...base,
      sources: [NEAR],
      studies: [study("star-1163", "broadcast-leakage", LEAD_TIGHT, [Q_PLATEAU])],
      budget: budget(200),
    },
  },
  {
    id: "probe-exhausted",
    note: "Every question asked, the readings still undecided, and a probe is what is left.",
    input: {
      ...base,
      sources: [MID],
      studies: [
        study("star-4471", "transit-shadows", LEAD_TIGHT, [
          { ...Q_WEIGH, state: "answered", finding: { shape: "shift", line: "It moved a little." } },
        ]),
      ],
      budget: budget(90),
    },
  },
  {
    id: "project",
    note: "Nothing under way and an instrument within the allocation.",
    input: {
      ...base,
      sources: [NEAR],
      studies: [study("star-1163", "broadcast-leakage", LEAD_CLEAR, [])],
      projects: [
        project(
          "deep-array",
          "EXTEND THE DEEP ARRAY",
          "More collecting area, pointed at the quiet part of the sky.",
          "Raises the compute income by 6 a year, for good.",
          220,
          20,
          6,
        ),
      ],
      budget: budget(260),
    },
  },
  {
    // THE ONE THAT MATTERS for the pick half. Every scenario above yields a
    // single candidate, where agreement is guaranteed and says nothing. Here
    // three rules fire at once on two different sources, so the floor's
    // priority order (probe before question before project) is a real
    // opinion the model can hold or differ with — and the served pair is
    // what a player would actually be looking at.
    id: "crowded",
    note: "Three live moves at once: a probe worth launching, a question worth buying, and a project within reach.",
    input: {
      ...base,
      sources: [NEAR, MID],
      studies: [
        study("star-1163", "broadcast-leakage", LEAD_TIGHT, [Q_PLATEAU]),
        study("star-4471", "transit-shadows", LEAD_TIGHT, [Q_WEIGH, Q_LINES]),
      ],
      projects: [
        project(
          "deep-array",
          "EXTEND THE DEEP ARRAY",
          "More collecting area, pointed at the quiet part of the sky.",
          "Raises the compute income by 6 a year, for good.",
          220,
          20,
          6,
        ),
      ],
      budget: budget(300),
    },
  },
  {
    id: "widen",
    note: "One study settled and unaffordable to push further; another source waiting.",
    input: {
      ...base,
      sources: [NEAR, FAR],
      studies: [study("star-1163", "broadcast-leakage", LEAD_CLEAR, [{ ...Q_LINES, costCompute: 400 }])],
      budget: budget(30),
    },
  },
];

// ---------------------------------------------------------------------------
// The mind surface. cohort.ts assembles this from the civ's own seed; here it
// is written per archetype so the scenarios are comparable across minds —
// same situation, same charter shape, different voice.
// ---------------------------------------------------------------------------

function mindFor(archetypeId) {
  const def = archetypeById(archetypeId);
  return {
    archetype: archetypeId,
    archetypeName: def.name,
    charter: def.charter ?? def.firstRead ?? def.name,
    posture: "bright",
    dialLines: [
      "Reach · Depth — leans Depth",
      "Speed · Certainty — leans Certainty",
      "Signal · Silence — balanced",
    ],
    chronicle: [
      "We woke on a world that had already forgotten how to be surprised.",
      "We have kept the record since, and the record is the only thing we have kept.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

const DEFAULT_ARCHETYPES = ["congress", "monument", "engine", "cloister"];
const wanted = flag("archetypes", DEFAULT_ARCHETYPES.join(","));
const archetypes =
  wanted === "all" ? ARCHETYPES.map((a) => a.id) : wanted.split(",").map((s) => s.trim());
const only = flag("scenario", null);
const scenarios = only === null ? SCENARIOS : SCENARIOS.filter((s) => s.id === only);

// `--dry` exercises everything except the model: the fixtures, the real
// enumerator, the real serve rules and the fingerprints. Use it to confirm a
// scenario still fires the rule it was written for after the enumerator
// changes — no key, no cost.
const dry = args.includes("--dry");

const key = dry ? "dry-run" : apiKey();
if (key === null) {
  console.error(
    "No ANTHROPIC_API_KEY. Export it, or put it in .dev.vars (the file wrangler dev reads).",
  );
  console.error("Run with --dry to check the scenarios without calling the model.");
  process.exit(1);
}
if (scenarios.length === 0) {
  console.error(`No scenario named ${only}. Known: ${SCENARIOS.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const W = 78;
const rule = (ch = "─") => ch.repeat(W);
function wrap(text, indent = 4) {
  const pad = " ".repeat(indent);
  const words = text.split(/\s+/);
  const lines = [];
  let line = pad;
  for (const w of words) {
    if (line.length + w.length + 1 > W) {
      lines.push(line);
      line = pad + w;
    } else {
      line = line === pad ? pad + w : `${line} ${w}`;
    }
  }
  if (line.trim()) lines.push(line);
  return lines.join("\n");
}

const gen = new VoiceGen();
const tally = { calls: 0, accepted: 0, agreed: 0, rejected: new Map(), other: new Map() };

console.log(rule("━"));
console.log("THE COUNSEL EVALUATION");
console.log(`${scenarios.length} scenarios × ${archetypes.length} minds = ${scenarios.length * archetypes.length} calls`);
console.log("Read DOWN each scenario: if two minds sound alike, the seam is not earning its cost.");
console.log(rule("━"));

for (const scenario of scenarios) {
  const ranked = enumerateProposals(scenario.input);
  const served = serveProposals(ranked);
  const lead = served[0];

  console.log(`\n${rule()}`);
  console.log(`SCENARIO  ${scenario.id}`);
  console.log(wrap(scenario.note, 2));
  if (lead === undefined) {
    console.log("  (no proposal — the floor serves nothing here; scenario needs fixing)");
    continue;
  }
  console.log(rule());
  console.log(`  candidates : ${ranked.map((c) => c.kind).join(", ")}`);
  console.log(`  floor leads: ${lead.id}`);
  console.log("  the reason the player reads:");
  console.log(wrap(lead.line, 4));
  console.log(`  fingerprint: ${candidateSetFingerprint(ranked)}`);
  console.log("");

  if (dry) {
    console.log("  --dry: fixtures and floor verified, no model called.");
    continue;
  }

  for (const archetypeId of archetypes) {
    const mind = mindFor(archetypeId);
    const { deps, settle, read } = makeDeps(key);
    const token = `eval-${scenario.id}-${archetypeId}`;

    const result = await gen.counselFor(deps, token, mind, ranked, served, async () => {});
    result.kick();
    await settle();

    const record = read(`gen:${PROMPT_VERSION}:counsel:${token}:${candidateSetFingerprint(ranked)}`);
    tally.calls += 1;

    const name = mind.archetypeName.padEnd(16);
    if (record === undefined) {
      console.log(`  ${name} (no record written — flag or key precondition failed)`);
      continue;
    }
    if (record.state !== "accepted") {
      const bucket = record.state === "rejected" ? tally.rejected : tally.other;
      const why = record.why ?? record.state;
      bucket.set(why, (bucket.get(why) ?? 0) + 1);
      console.log(`  ${name} ${record.state.toUpperCase()} — ${why}`);
      continue;
    }

    tally.accepted += 1;
    // Observational only. The stance below was written about the floor's row
    // whatever this says, and it is what production serves either way.
    const agree = record.wouldTake !== null && record.wouldTake === record.floorPick;
    if (agree) tally.agreed += 1;
    const verdict = agree
      ? "would take the floor's move"
      : `WOULD TAKE ${record.wouldTake ?? "nothing on the list"} (floor: ${record.floorPick})`;
    console.log(`  ${name} ${verdict}`);
    console.log(wrap(`“${record.stance}”`, 6));
  }
}

console.log(`\n${rule("━")}`);
console.log("SUMMARY");
console.log(`  calls           ${tally.calls}`);
console.log(`  accepted        ${tally.accepted}`);
console.log(`  would take it   ${tally.agreed}${tally.accepted > 0 ? `  (${Math.round((100 * tally.agreed) / tally.accepted)}% of accepted)` : ""}`);
if (tally.rejected.size > 0) {
  console.log("  gate rejections:");
  for (const [why, n] of tally.rejected) console.log(`    ${why}: ${n}`);
}
if (tally.other.size > 0) {
  console.log("  other outcomes:");
  for (const [why, n] of tally.other) console.log(`    ${why}: ${n}`);
}
console.log(rule("━"));
console.log("The numbers above are the cheap half. The flag turns on when the STANCES");
console.log("read well — in character, true about the choice, and different from each");
console.log("other mind to mind. That judgement is yours; this script only lays it out.");
