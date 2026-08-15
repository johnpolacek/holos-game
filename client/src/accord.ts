// THE MUTUAL QUIET — the compliance rail's chrome (A2.6).
//
// The accord has no stored object behind it: `AccordRail` is derived
// server-side from the moves that have ARRIVED on this side of the light,
// plus one read of the counterpart's observed history against the darkness
// floor. Everything below is CHROME over those wire fields — the
// TRIPWIRE_LABEL/THREAD_STATE_LABEL precedent — and every number it prints
// is arithmetic on a field the wire already carried.
//
// It lives in its own module because TWO surfaces render it: the thread
// (studyboard.ts) and the source card. Neither owns the other, and
// studyboard.ts already imports from sourcecard.ts, so putting the rail in
// either one would either invert that dependency or make it a cycle.
//
// NOTHING HERE CLAIMS WHAT THE WIRE DID NOT SEND. `theirLight` is a BELIEF
// ABOUT THE PAST and the wire says so by carrying `asOfYear` beside it, so
// the light line always states its own age and never reads as a verdict. A
// rail with no light yet says exactly that, rather than guessing at quiet.

import type { AccordRail } from "@holos/protocol";
import { formatEpochYear, nowYear } from "./clock";

/**
 * The headline. Null when there is no understanding to speak of, which is
 * the common case and renders as no rail at all rather than as an absence.
 *
 * `you-offered` deliberately says only OFFERED here: how long an answer
 * could still take is arithmetic on YOUR OWN beam, the thread knows the
 * years and the source card does not, so that half is the thread's
 * (see `accordFlightLine`).
 */
export function accordHeadline(rail: AccordRail): string | null {
  switch (rail.state) {
    case "none":
      return null;
    case "held":
      return rail.heldSinceYear === null
        ? "MUTUAL QUIET · HELD"
        : `MUTUAL QUIET · HELD SINCE ${formatEpochYear(rail.heldSinceYear)}`;
    case "you-offered":
      return "MUTUAL QUIET · OFFERED";
    case "they-offered":
      return "A STANDING QUIET, OFFERED";
    case "declined":
      return "MUTUAL QUIET · DECLINED";
    case "withdrawn":
      return "MUTUAL QUIET · WITHDRAWN";
    case "broken":
      return "MUTUAL QUIET · BROKEN BY LIGHT";
  }
}

/**
 * The compliance read, and the reason the object is not decoration: what
 * their light has done since the accord year, and how old that reading is.
 * Only rendered where an accord actually stands or stood.
 */
export function accordLightLine(rail: AccordRail): string | null {
  if (rail.state !== "held" && rail.state !== "broken") return null;
  if (rail.theirLight === null || rail.asOfYear === null) {
    // No light from the accord era has reached this side yet. Saying so is
    // the honest reading; anything else would be a claim about their now.
    return "THEIR LIGHT SINCE: NONE HAS REACHED US YET";
  }
  const floor = rail.theirLight === "below-the-floor" ? "BELOW THE FLOOR" : "ABOVE THE FLOOR";
  const age = Math.max(0, Math.round(nowYear() - rail.asOfYear));
  return `THEIR LIGHT SINCE: ${floor} · AS OF ${age.toLocaleString("en-US")} Y AGO`;
}

/**
 * The offering side's own arithmetic, from the beam that carried the offer.
 * Until it lands there is nothing to wait for; once it has, the earliest an
 * answer could possibly come back is one more transit. Both halves are
 * computed from the sender's OWN sent/arrival years, so this leaks nothing:
 * it is the same round trip the thread's own countdowns already state.
 */
export function accordFlightLine(
  offerSentYear: number,
  offerArrivesYear: number,
): string {
  const transit = Math.max(0, offerArrivesYear - offerSentYear);
  if (nowYear() < offerArrivesYear) return "IN FLIGHT";
  return `NO ANSWER POSSIBLE BEFORE ${formatEpochYear(offerSentYear + transit * 2)}`;
}
