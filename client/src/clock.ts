// THE CLOCK — the client's shared notion of time.
//
// The server sends an anchor (a real-ms timestamp paired with the game year
// it corresponds to) plus the ratio of real milliseconds per game year; the
// client derives "now" locally by interpolating from that anchor, so nothing
// here ever polls the server for time.
//
// Every duration in the game renders as a CLOCK PAIR — game time and real
// time together, everywhere a duration appears (ui-design.md's rule). Reach
// for formatClockPair (or formatCountdown, its landed-aware cousin) by
// default; the narrower formatters exist for the pieces that make it up.

import type { ClockWire } from "@holos/protocol";

let anchor: ClockWire | null = null;

export function setClockAnchor(c: ClockWire): void {
  anchor = c;
}

/** The authoritative game year right now, derived locally. 0 if no anchor yet. */
export function nowYear(): number {
  if (anchor === null) return 0;
  const elapsedRealMs = Date.now() - anchor.epochRealMs;
  return anchor.epochGameYear + elapsedRealMs / anchor.realMsPerGameYear;
}

/** Real milliseconds for a span of game years. 0 if no anchor yet. */
export function realMsForYears(years: number): number {
  if (anchor === null) return 0;
  return years * anchor.realMsPerGameYear;
}

/** Compact real-time duration: "3 h 20 m", "45 m", "2 d 4 h", "12 s". */
export function formatRealDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} m`;

  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remMinutes > 0 ? `${totalHours} h ${remMinutes} m` : `${totalHours} h`;
  }

  const totalDays = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  return remHours > 0 ? `${totalDays} d ${remHours} h` : `${totalDays} d`;
}

/**
 * An ABSOLUTE game year as chrome: "Y1204". For a date that simply is where
 * it is — a mission that already started, an arrival the light has fixed —
 * as opposed to a duration still running down, which always goes through
 * formatCountdown/formatClockPair instead.
 *
 * It lives here rather than in whichever surface first needed it because two
 * surfaces now render the same stamp (the observatory's dates and the choice
 * ceremony's arrival years), and a stamp that reads "Y1204" in one place and
 * "1204" in the other is two facts rather than one.
 */
export function formatAbsoluteYear(year: number): string {
  return `Y${Math.round(year)}`;
}

/**
 * A civilization's own count from its own ascension: "4 AE". The cohort's
 * absolute year is what `nowYear()` returns and what `formatAbsoluteYear`
 * stamps out; this is the OTHER dating, the one a civilization uses about
 * itself, and it is the only one that may stand beside that civilization's
 * own name (prose-style.md R-33, and voice.ts's `epochStamp`, which builds
 * the same stamp server-side for the report's annal).
 *
 * Clamped at zero. A player civ ascended a handful of years before the act
 * opens, so the difference is always positive in practice; a civ still
 * climbing would count from a founding it has not reached, and "-3 AE" is
 * not a date.
 */
export function formatEpochYear(year: number, ascensionYear: number): string {
  return `${Math.max(0, Math.round(year - ascensionYear))} AE`;
}

/**
 * The same epoch count at instrument precision: "127.23 AE", two fixed
 * decimals, for the one readout that watches the year PASS (the HUD). A
 * hundredth of a year is three real seconds on the shipped clock, so the
 * tail visibly ticks. Chronicle stamps and report annals keep the whole-year
 * form above — a date is a year, not a moment; this is a dial, not a date.
 */
export function formatEpochYearPrecise(year: number, ascensionYear: number): string {
  return `${Math.max(0, year - ascensionYear).toFixed(2)} AE`;
}

/** Compact game-time span: "20 y", "1,200 y". Whole years, thousands-separated. */
export function formatGameYears(years: number): string {
  const rounded = Math.max(0, Math.round(years));
  return `${rounded.toLocaleString("en-US")} y`;
}

/** THE CLOCK PAIR — game time first, then real: "20 y · ≈1 h 40 m". Falls
 *  back to an en dash for the real-time half when there is no anchor yet
 *  (the game-time half is always computable). An EN dash, not an em: no U+2014
 *  reaches a player surface, glyph or prose (prose-style.md R-8). */
export function formatClockPair(years: number): string {
  const gamePart = formatGameYears(years);
  if (anchor === null) return `${gamePart} · –`;
  return `${gamePart} · ≈${formatRealDuration(realMsForYears(years))}`;
}

/** A countdown to an absolute game year, as a clock pair. Returns null when
 *  the year has passed (callers render their own landed/returned state). */
export function formatCountdown(toYear: number): string | null {
  const remaining = toYear - nowYear();
  if (remaining <= 0) return null;
  return formatClockPair(remaining);
}
