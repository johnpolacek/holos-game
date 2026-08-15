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
//
// TWO ANCHORS, AND THE SECOND IS A BOUNDARY. The clock anchor below carries
// the cohort's absolute year, which is the coordinate the wire speaks in and
// the one no player may ever read (prose-style.md R-33: the cohort clock is
// the referee's calendar, and no civilization keeps it). The epoch anchor is
// the player civilization's own zero, and every DATE that reaches a surface
// goes through formatEpochYear, which subtracts one from the other. Nothing
// here exports the absolute year as a string; that is the point.

import type { ClockWire } from "@holos/protocol";

let anchor: ClockWire | null = null;
let ascension: number | null = null;

/** The missing-value glyph, for a formatter asked to render before its
 *  anchor landed. An EN dash, never an em (prose-style.md R-8). */
const NO_VALUE = "–";

export function setClockAnchor(c: ClockWire): void {
  anchor = c;
}

/**
 * THE EPOCH ANCHOR — the player civilization's own year zero, from `sky`'s
 * `self.seed.ascensionYear`. Set once the seat has a civilization; every
 * date-shaped surface string depends on it, so it is set before the sky
 * mounts anything that renders one.
 */
export function setEpochAnchor(ascensionYear: number): void {
  ascension = ascensionYear;
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
 * THE DATE FORMATTER, and the only one. A cohort-absolute game year in,
 * the player civilization's own count from its own ascension out: "160 AE".
 * For a date that simply is where it is — a mission that already started,
 * an arrival the light has fixed — as opposed to a duration still running
 * down, which goes through formatCountdown/formatClockPair instead.
 *
 * It takes the absolute year because that is what every wire field carries;
 * it hands back the only dating a player may read (prose-style.md R-33, and
 * voice.ts's `epochStamp`, which does the same subtraction server-side for
 * the report's annal). One function, so a stamp cannot read "160 AE" on one
 * surface and "Y1204" on the next: that was two facts rather than one, and
 * one of them was the referee's calendar.
 *
 * Renders the missing-value glyph before the epoch anchor lands, rather than
 * falling back to the raw year. There is no anchor-less rendering of a date
 * that is not a leak, so the fallback is to say nothing.
 *
 * Clamped at zero, and callers must stay inside that: this dates events in
 * the PLAYER's own played frame, which begins at their ascension. An
 * instrument reading that reaches back before it (an archive window into the
 * biosphere era) is not a date in this calendar and belongs in the light-age
 * register — `AS OF n Y AGO` — which is what act3-design.md's third register
 * of time is for.
 */
export function formatEpochYear(year: number): string {
  if (ascension === null) return NO_VALUE;
  return `${Math.max(0, Math.round(year - ascension))} AE`;
}

/**
 * The same epoch count at instrument precision: "127.23 AE", two fixed
 * decimals, for the one readout that watches the year PASS (the HUD). A
 * hundredth of a year is three real seconds on the shipped clock, so the
 * tail visibly ticks. Chronicle stamps and report annals keep the whole-year
 * form above — a date is a year, not a moment; this is a dial, not a date.
 */
export function formatEpochYearPrecise(year: number): string {
  if (ascension === null) return NO_VALUE;
  return `${Math.max(0, year - ascension).toFixed(2)} AE`;
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
  if (anchor === null) return `${gamePart} · ${NO_VALUE}`;
  return `${gamePart} · ≈${formatRealDuration(realMsForYears(years))}`;
}

/** A countdown to an absolute game year, as a clock pair. Returns null when
 *  the year has passed (callers render their own landed/returned state). */
export function formatCountdown(toYear: number): string | null {
  const remaining = toYear - nowYear();
  if (remaining <= 0) return null;
  return formatClockPair(remaining);
}
