// The shared clock — server-authoritative game time.
//
// Act 3's working decision (act3-design.md § The clocks): telescoping time
// collapses to one shared clock at the interstellar act, targeted at
// 5 real minutes ≈ 1 game year. The ratio is a tuning target, not
// scripture — hence a single tunable constant.
//
// The load-bearing convention: game time is measured in YEARS (fractional)
// and light crosses exactly one light-year per game year. So the
// light-delay between two points in the galaxy, in game years, IS their
// distance in light-years — distance and staleness are the same number,
// which is the whole design ("every fact stale by exactly its distance").
//
// Game year 0 is the cohort's creation moment; negative years are the
// deep past, which is where seeded civilizations' emission histories live
// (an elder's bright years happened long before any player arrived).

/** Tunable: how much real time one game year takes. */
export const REAL_MS_PER_GAME_YEAR = 5 * 60 * 1000;

/**
 * The clock's persistent anchor. Kept as an (epoch real-time, epoch
 * game-year) pair so a future ratio retune can re-anchor without
 * rewriting history.
 */
export interface ClockState {
  readonly epochRealMs: number;
  readonly epochGameYear: number;
}

export function newClock(nowRealMs: number): ClockState {
  return { epochRealMs: nowRealMs, epochGameYear: 0 };
}

/** The authoritative game year at a real timestamp. */
export function gameYearAt(clock: ClockState, realMs: number): number {
  return (
    clock.epochGameYear + (realMs - clock.epochRealMs) / REAL_MS_PER_GAME_YEAR
  );
}

/** The real timestamp at which a game year occurs — the alarm scheduler's inverse. */
export function realMsAtGameYear(clock: ClockState, gameYear: number): number {
  return (
    clock.epochRealMs + (gameYear - clock.epochGameYear) * REAL_MS_PER_GAME_YEAR
  );
}

/**
 * Light-delay in game years across a distance in light-years. Identity by
 * convention — kept as a named function so every knowledge-layer read
 * says what it means.
 */
export function lightDelayYears(distanceLy: number): number {
  return distanceLy;
}
