// The playtest reset — the client half of the Cohort's /dev/forget.
//
// A run's identity is one token in localStorage, and everything the server
// keeps about a player hangs off it. Starting over is therefore two acts in
// a fixed order: the server erases the run (and takes the civilization out
// of the galaxy, so its star returns to the pool rather than becoming an
// unpiloted ghost), and only then does this browser forget who it was.
//
// The order is the whole safety property. Clear the token first and a failed
// forget would leave exactly the ghost the endpoint exists to prevent, with
// no way left to name it — the token WAS the name. So a failed forget throws
// with the token still in place, and the panel offers the tap again.

import { clearPendingBecome } from "./ceremony";
import { clearStoredToken, cohortUrl, readStoredToken } from "./net";
import { unsubscribeLocally } from "./push";

/**
 * Erase this browser's run and reload into a fresh inheritance ceremony.
 *
 * Rejects (token intact, nothing cleared) if the server refuses. Never
 * returns on success: the reload is the last thing it does.
 */
export async function startOver(): Promise<void> {
  const token = readStoredToken();

  // No token means nothing was ever placed under it — there is nothing on
  // the server to erase, and the local clear below is the whole reset.
  if (token !== null) {
    const response = await fetch(cohortUrl("dev/forget"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      throw new Error(`forget refused: ${response.status}`);
    }
  }

  // A5: the seat is gone, so this device's watch goes with it. The server
  // half is /dev/forget, which deletes `push:${token}` along with the rest;
  // this is the browser half, and without it a phone would keep a live
  // subscription pointed at a civilization that is no longer anybody's.
  await unsubscribeLocally();

  clearStoredToken();
  clearPendingBecome();
  window.location.reload();
}
