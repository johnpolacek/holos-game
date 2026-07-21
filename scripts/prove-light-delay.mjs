#!/usr/bin/env node
// A0 acceptance proof (build-a0.md § Done when): seed a galaxy, then show
// the server answering "what does observer X see of civ Y, as of its
// light?" for any pair — including two observers who legitimately
// DISAGREE about a third civilization's present because their
// light-distances differ.
//
// Run against a local dev server:
//   npm run dev:server        (terminal 1)
//   node scripts/prove-light-delay.mjs   (terminal 2)

const BASE = process.env.HOLOS_URL ?? "http://localhost:8787";
const COHORT = `${BASE}/parties/cohort/proof`;

async function api(method, path, body) {
  const res = await fetch(`${COHORT}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const fmt = (n, d = 1) => Number(n).toFixed(d);

function describeView(view) {
  if (view.signal === null) return "nothing (no light has arrived)";
  const s = view.signal;
  return `${s.classification} at emission ${fmt(s.emissionLevel, 2)} (confidence ${s.confidence})`;
}

console.log(`\n=== A0 proof: the map is the past ===\n`);

// 1. Seed a deterministic galaxy: N AI civs + one player civ.
const seeded = await api("POST", "/dev/seed", { seedKey: "a0-proof", aiCivs: 12 });
console.log(
  `Seeded cohort "proof" (seedKey=${seeded.seedKey}): ${seeded.starCount} stars, ${seeded.civs.length} civs (1 player + ${seeded.civs.length - 1} AI).`,
);
for (const c of seeded.civs) {
  console.log(
    `  ${c.id.padEnd(11)} ${c.name.padEnd(14)} ${c.controller.padEnd(6)} ${c.ageBand.padEnd(5)} ${c.posture.padEnd(6)} ${String(c.archetype).padEnd(9)} ${fmt(c.distanceFromPlayerLy)} ly from player`,
  );
}

// 2. Pull every observer's sky (the pairwise query, exercised in full).
const state = await api("GET", "/dev/state");
const civs = state.civs;
const skies = new Map();
for (const civ of civs) {
  const { sky } = await api("GET", `/dev/sky?observer=${civ.id}`);
  skies.set(civ.id, sky);
}
const pairCount = [...skies.values()].reduce((n, sky) => n + sky.length, 0);
console.log(`\nQueried ${pairCount} observer→target views (every pair) at game year ${fmt(state.nowYear, 3)}.`);

// 3. Find two observers that disagree about a third civ's present.
let best = null;
for (const target of civs) {
  const views = [];
  for (const observer of civs) {
    if (observer.id === target.id) continue;
    const view = skies.get(observer.id).find((v) => v.targetId === target.id);
    if (view) views.push(view);
  }
  for (const a of views) {
    for (const b of views) {
      if (a.observerId >= b.observerId) continue;
      const clsA = a.signal?.classification ?? "nothing";
      const clsB = b.signal?.classification ?? "nothing";
      const emA = a.signal?.emissionLevel ?? 0;
      const emB = b.signal?.emissionLevel ?? 0;
      const disagrees = clsA !== clsB || Math.abs(emA - emB) >= 0.15;
      if (!disagrees) continue;
      const spread = Math.abs(a.distanceLy - b.distanceLy);
      if (best === null || spread > best.spread) {
        best = { target, a, b, spread, classDiffers: clsA !== clsB };
      }
    }
  }
}

if (best === null) {
  console.error("\nFAIL: no pair of observers disagrees about any third civ.");
  process.exit(1);
}

const { target, a, b } = best;
const truth = civs.find((c) => c.id === target.id);
console.log(`\n--- The disagreement ---`);
console.log(`Target: ${target.id} "${target.name}" (${target.posture} ${target.archetype}, ${target.ageBand})`);
console.log(`  truth now (year ${fmt(state.nowYear, 2)}): emission ${fmt(truth.emissionNow, 2)}`);
console.log(`  emission history: ${truth.emissionHistory.map((e) => `year ${fmt(e.fromYear, 0)} → ${fmt(e.level, 2)}`).join(", ")}`);
for (const view of [a, b]) {
  console.log(
    `\nObserver ${view.observerId} — ${fmt(view.distanceLy)} ly away, so it sees light that departed at year ${fmt(view.asOfYear, 1)} (${fmt(view.lightAgeYears)} years stale):`,
  );
  console.log(`  sees: ${describeView(view)}`);
}
console.log(
  `\nBoth observers are being told the truth — as of their light. They disagree about ${target.id}'s present because their light-distances differ by ${fmt(best.spread)} ly.${best.classDiffers ? " One of them does not even classify it as the same kind of source." : ""}`,
);

// 4. Prove the alarm-driven scheduler: a dev event ~3 real seconds out.
const scheduled = await api("POST", "/dev/event", {
  inYears: 0.01,
  note: "proof ping (0.01 game years ≈ 3 real seconds)",
});
console.log(`\nScheduled clock event at game year ${fmt(scheduled.scheduled.atYear, 3)}; waiting 5s for the alarm...`);
await new Promise((r) => setTimeout(r, 5000));
const events = await api("GET", "/dev/events");
if (events.fired.length === 0) {
  console.error("FAIL: scheduled event did not fire.");
  process.exit(1);
}
const fired = events.fired[events.fired.length - 1];
console.log(`Alarm fired: "${fired.note}" at game year ${fmt(fired.firedAtYear, 3)} (scheduled for ${fmt(fired.atYear, 3)}).`);

console.log(`\n=== A0 proof complete: truth is served only as light. ===\n`);
