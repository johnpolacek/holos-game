#!/usr/bin/env node
// Print one live seat's report — AV2's annal, as the player reads it.
//
// The wire carries the REPORT_ON_WIRE (40) newest entries, promoted-first when
// report.ts's triage fires a header, else newest-first. Older entries stay in
// stored state and are not reachable from a client seat; this tool is a reader,
// not an exporter.
//
// Usage:
//   npm run prod:report                     # .seats/default against playholos.com
//   npm run prod:report -- --seat phone
//   npm run prod:report -- --json
//   npm run prod:report -- --host localhost:8787

import { withSeat, has } from "./seat.mjs";

const argv = process.argv.slice(2);

await withSeat(argv, async (seat) => {
  // `advance: false` on this path (onRequestReport): a re-read never consumes
  // the "new since" marker a second time. The handshake already moved it once
  // — see Seat.open — and that is the whole cost of looking.
  const { report } = await seat.ask({ type: "requestReport" }, "report");

  if (has(argv, "json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (report.header !== null) console.log(`${report.header}\n`);
  for (const entry of report.entries) {
    console.log(entry.stamp);
    console.log(`  ${entry.record}`);
    // IN3's technical body, frozen at landing under the record it explains.
    // Marked with its own prefix for the same reason the remark is: three
    // kinds of sentence stack on one entry now, and a read has to be able to
    // tell which is which without counting lines.
    if (entry.detail !== null) console.log(`  | ${entry.detail}`);
    // AV4's one remark per served report, attached to the highest-ranked new
    // entry. Marked so a read can tell the frozen record from the archetype's
    // line about it.
    if (entry.remark !== null) console.log(`  > ${entry.remark}`);
    console.log("");
  }
  const n = report.entries.length;
  console.error(`# ${n} ${n === 1 ? "entry" : "entries"}`);
});
