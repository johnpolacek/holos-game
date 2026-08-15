// AV4 tenant 1, verified locally — does a generated report remark appear,
// read in register, and stay byte-identical on a re-read?
//
//   npm run dev:server                     # terminal 1 (localhost:8787)
//   npm run dev:client                     # terminal 2 (localhost:5173)
//   node scripts/phonecheck/av4-remark.mjs # terminal 3
//
// SETUP. Playwright is not a repo dependency (the game ships no test suite;
// see CLAUDE.md). Install it once into any scratch directory and run this
// script from there, or `npm i --no-save playwright` at the repo root. The
// browser binary is already on this image at /opt/pw-browsers/chromium.
//
// WHAT IT NEEDS in .dev.vars (gitignored) to exercise the GENERATED path:
//
//   HOLOS_VOICE_GEN=on
//   ANTHROPIC_API_KEY=sk-ant-...
//
// Without the key it still runs, and still checks everything structural —
// it just reports the remark as TEMPLATED, which is the correct flag-off
// behaviour and worth confirming on its own.
//
// WHY THE CLOCK SKIP. A report entry files when the light brings something
// new, and at the production clock (5 real minutes per game year) a fresh
// civilization takes hours to fill a report — which is by design; the report
// was built for the overnight return, not the refresh loop. `POST /dev/skip`
// (local hosts only) re-anchors the shared clock forward so the same
// behaviour is testable in seconds.
//
// THE ONE SUBTLETY worth knowing before reading a failure here: the report
// serves what is NEW since it was last read, so opening it twice in a row
// legitimately shows the second one empty. The byte-identity check therefore
// re-reads WITHIN one serve window (back out, reopen) rather than reloading.

import { chromium } from "playwright";

const CLIENT = process.env.HOLOS_CLIENT ?? "http://localhost:5173";
const SERVER = process.env.HOLOS_SERVER ?? "http://localhost:8787";
const ROOM = process.env.HOLOS_ROOM ?? "genesis";
const SKIP_YEARS = Number(process.env.HOLOS_SKIP_YEARS ?? 140);

const results = [];
let step = 0;
function ok(name, cond, detail = "") {
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + String(detail).replace(/\n/g, " ") : ""}`);
  if (!cond) process.exitCode = 1;
}

async function skipClock(years) {
  const res = await fetch(`${SERVER}/parties/cohort/${ROOM}/dev/skip`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ years }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`/dev/skip ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

// Everything here is localhost, so the browser must NOT use an egress proxy
// even when one is configured in the environment — `--no-proxy-server` is the
// flag that guarantees it (Chromium's implicit loopback bypass is easy to
// disable by accident with a bypass list).
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-proxy-server"],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const page = await ctx.newPage();
async function shot(name) {
  const p = `av4-${String(++step).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: p });
  console.log("shot:", p);
}

// Open the report from wherever the panel currently is.
//
// Always via CLOSE-then-reopen rather than the back button: the panel's back
// label is view-dependent ("‹ BACK" on the report, "‹ STUDIES" on a focused
// study), so matching it is fragile, while `.study-board-close` is one button
// present in every view.
async function openReport() {
  if (await page.locator(".voice-beat-root.open").count()) {
    await page.locator(".voice-beat-root").click({ position: { x: 195, y: 700 } });
    await page.waitForTimeout(500);
  }
  if (await page.locator(".study-board-root.open").count()) {
    await page.locator(".study-board-close").first().click();
    await page.waitForTimeout(500);
  }
  await page.locator("button, .study-chip", { hasText: /start/i }).first().click();
  await page.waitForTimeout(700);
  await page.locator(".study-board-root button", { hasText: /the report/i }).first().click();
  await page.waitForTimeout(900);
  return {
    remark: await page.locator(".report-remark").first().textContent().catch(() => null),
    entries: await page.locator(".report-row-line").count().catch(() => 0),
  };
}

try {
  await page.goto(CLIENT, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("button", { hasText: /become/i }).first().click({ timeout: 30000 });
  await page.locator(".voice-beat-root.open").waitFor({ state: "visible", timeout: 20000 });
  await page.locator(".voice-beat-root").click({ position: { x: 195, y: 700 } });
  await page.waitForTimeout(800);

  // Begin a watch, so the report has a study to file arrivals against.
  await page.locator("button, .study-chip", { hasText: /start/i }).first().click();
  await page.waitForTimeout(700);
  if (await page.locator(".proposal-accept").count()) {
    await page.locator(".proposal-accept").first().click();
    await page.waitForTimeout(800);
    const begin = page.locator("button", { hasText: /begin the watch/i }).first();
    if (await begin.count()) {
      await begin.click();
      await page.waitForTimeout(1000);
    }
  }
  ok("began a watch from the proposal", true);

  // BUY A QUESTION. This step is not optional decoration — it is what makes
  // the check meaningful. A watching study files only `sky-arrival` entries,
  // and those are family "record", the one family that carries NO remark
  // (report.ts; `asRemarkFamily` returns null for it). So a civilization that
  // only watches can skip a thousand years and never produce a remark to
  // judge. A bought question answers into family "settled", which does.
  const buy = page.locator(".study-project-row:not(.study-project-row--disabled)").first();
  if (await buy.count()) {
    await buy.click();
    await page.waitForTimeout(1200);
    ok("bought a question", true);
  } else {
    ok("bought a question", false, "no affordable question row in the focused study");
  }

  // Skip past the question's integration so the answer lands and files.
  const skipped = await skipClock(SKIP_YEARS);
  console.log(`clock: ${skipped.fromYear} -> ${skipped.nowYear} (+${skipped.skippedYears}y)`);
  // The skip pushes a fresh sky; give the DO a moment to materialize entries
  // and (with the flag on) to finish the out-of-band pool generation.
  await page.waitForTimeout(6000);

  const first = await openReport();
  await shot("report");
  ok("the report filed entries after the skip", first.entries > 0, `${first.entries} entries`);

  if (first.remark === null) {
    ok("a remark is attached", false, "no .report-remark in the served report");
  } else {
    console.log("\nREMARK:", JSON.stringify(first.remark), "\n");
    ok("remark is fact-free (no digits)", !/\p{N}/u.test(first.remark));
    ok("remark carries no designation", !/HOL-/.test(first.remark));
    ok("remark has no exclamation", !first.remark.includes("!"));

    // Re-read inside the same serve window.
    const second = await openReport();
    const again = second.remark;
    ok("re-read is byte-identical", again === first.remark, again === first.remark ? "" : JSON.stringify(again));
    await shot("report-reread");

    console.log(
      "\nIs this the GENERATED remark or the shipped bank's? Grep the dev-server log for",
      "\n`[remarks]` — an `outcome=accepted` line for this family means generated.",
      "\nWith no key you should see the missing-key warning and a templated remark.\n",
    );
  }
} catch (e) {
  results.push("ERROR " + e.message.split("\n")[0]);
  await shot("error");
  process.exitCode = 1;
} finally {
  console.log(results.join("\n"));
  await browser.close();
}
