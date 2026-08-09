// S0.4, THE THUMB TEST. A focused study's detail is more than a phone holds
// at once, and there are two honest places to put the overflow: the docked
// board page that has always carried it (PAGE), or the map-anchored source
// card the drill-in came from (CARD). Which one reads better is not a
// question anyone can answer at a desk, so both ship and this module is the
// single thing that chooses between them.
//
// PAGE is the control and the default. `main` auto-deploys, so an unknown
// value, a wiped store, a browser that refuses storage — every failure here
// lands on the surface that already worked, never on the experiment.
//
// The choice is a query param that writes itself through to storage, because
// the test is a sitting on a phone: flip once, then reload, background the
// tab, come back an hour later, and the build under the thumb is still the
// one being judged rather than whatever the last link said.

export type OverflowMode = "page" | "card";

const STORE_KEY = "holos.overflow";
/** The strip of sky left above the card in CARD mode, tunable per load. Zero
 *  is a legitimate setting (the card against the HUD); the upper bound is
 *  only there so a typo cannot push the card off the screen entirely and
 *  leave no way back but the URL bar. */
const SKY_MAX_REM = 20;

function isMode(value: string | null): value is OverflowMode {
  return value === "page" || value === "card";
}

/** Read once per load and then frozen. A mode that could change mid-session
 *  would move the study out from under a thumb that is halfway through
 *  reading it, and what the test would then be measuring is the swap. */
let mode: OverflowMode | null = null;

export function overflowMode(): OverflowMode {
  if (mode === null) mode = readMode();
  return mode;
}

function readMode(): OverflowMode {
  const param = new URLSearchParams(window.location.search).get("overflow");
  if (isMode(param)) {
    try {
      window.localStorage.setItem(STORE_KEY, param);
    } catch {
      // Safari in private browsing throws on write rather than quietly
      // dropping it. Losing the stickiness costs a query param; taking the
      // shell down over a preference does not happen.
    }
    return param;
  }
  try {
    const stored = window.localStorage.getItem(STORE_KEY);
    if (isMode(stored)) return stored;
  } catch {
    // Same store, same refusal, same answer: fall through to the control.
  }
  return "page";
}

/** How much sky the card leaves above itself in CARD mode, in rem, or null
 *  to keep the stylesheet's own number. Param only, deliberately: this is a
 *  dial that gets turned a dozen times in one sitting (`?overflow=card&sky=8`)
 *  and a height that outlived the sitting would be a mystery the next day. */
export function detailSkyRem(): number | null {
  const raw = new URLSearchParams(window.location.search).get("sky");
  if (raw === null) return null;
  const rem = Number.parseFloat(raw);
  if (!Number.isFinite(rem) || rem < 0 || rem > SKY_MAX_REM) return null;
  return rem;
}
