#!/usr/bin/env node
// Print one live seat's sky — the whole state a client renders from.
//
// This is the troubleshooting workhorse: when something on production looks
// wrong (a study stuck, a mission past its arrival, a compute rate that does
// not match a landed project, a proposal that should not be there), this is
// the state the client was rendering when it looked wrong. It is the player's
// view and nothing more: `sources` is DetectedSource, so what is withheld from
// the browser is withheld from here too.
//
// Usage:
//   npm run prod:sky
//   npm run prod:sky -- --seat phone --json
//   npm run prod:sky -- --host localhost:8787

import { withSeat, has } from "./seat.mjs";

const argv = process.argv.slice(2);

/** A star as the player knows it: their own name for it, else its designation. */
function starLabel(sky, starId) {
  const local = sky.localNames?.[starId];
  const source = sky.sources.find((s) => s.starId === starId);
  const designation = source?.designation ?? starId;
  return local === undefined || local === "" ? designation : `${local} (${designation})`;
}

await withSeat(argv, async (seat) => {
  // The placed arm of onHello sends `sky` unprompted, so Seat.open already has
  // it. No re-request: the fewer frames a read tool puts on the wire the better.
  const sky = seat.lastSky;

  if (has(argv, "json")) {
    console.log(JSON.stringify(sky, null, 2));
    return;
  }

  const self = sky.self;
  const year = Math.floor(sky.nowYear);
  console.log(`${self.seed.name}  ${self.designation}  year ${year} AE`);
  console.log(`archetype ${self.seed.archetype}, posture ${self.seed.posture}, ${self.seed.ageBand}`);

  const b = sky.budget;
  console.log(
    `\ncompute: ${Math.floor(b.free)} free of ${b.cap} cap, ` +
      `+${b.ratePerYear}/y as of year ${Math.floor(b.asOfYear)}`,
  );

  console.log(`\nsources (${sky.sources.length})`);
  for (const s of [...sky.sources].sort((a, c) => a.distanceLy - c.distanceLy)) {
    console.log(
      `  ${starLabel(sky, s.starId).padEnd(34)} ${s.distanceLy.toFixed(1)} ly, ` +
        `light ${Math.floor(s.lightAgeYears)} y old`,
    );
  }

  console.log(`\nstudies (${sky.studies.length})`);
  for (const s of sky.studies) {
    const lead = [...s.hypotheses].sort((a, c) => c.share - a.share)[0];
    const share = lead === undefined ? "" : ` leading ${lead.label} ${(lead.share * 100).toFixed(0)}%`;
    console.log(`  ${starLabel(sky, s.starId).padEnd(34)} ${s.status}, ${s.signalClass}${share}`);
  }

  console.log(`\nmissions (${sky.missions.length})`);
  for (const m of sky.missions) {
    const next = m.nextWordYear === null ? "no further word due" : `next word year ${Math.floor(m.nextWordYear)}`;
    const missed = m.missedWordYear === null ? "" : `, silent since year ${Math.floor(m.missedWordYear)}`;
    console.log(`  ${m.label.padEnd(34)} ${m.state}, ${next}${missed}`);
    console.log(`    ${starLabel(sky, m.starId)}, launched ${Math.floor(m.launchedYear)}, arrives ${Math.floor(m.arrivalYear)}`);
  }

  console.log(`\nprojects (${sky.projects.filter((p) => p.status !== "available").length} taken)`);
  for (const p of sky.projects.filter((p) => p.status !== "available")) {
    const lands = p.landsYear === null ? "" : `, lands year ${Math.floor(p.landsYear)}`;
    console.log(`  ${p.label.padEnd(34)} ${p.status}${lands}`);
  }

  if (sky.proposals.length > 0) {
    console.log(`\nproposals (${sky.proposals.length})`);
    for (const p of sky.proposals) {
      console.log(`  [${p.verb}] ${p.line}`);
      // AV4 fills `stance`; at the AV3 floor it is always null.
      if (p.stance !== null) console.log(`    > ${p.stance}`);
    }
  }

  console.log(`\ntend rows: ${sky.tend.length}, probe speed ${sky.probeFlightYearsPerLy} y/ly`);
});
