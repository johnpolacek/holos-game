// A5's client half: the permission, the subscription, and the two marks this
// browser keeps about them.
//
// WHAT THIS MODULE PROMISES, AND WHAT IT CANNOT. A push subscription is
// per-browser-per-device. Several may hang off one seat, and nothing here can
// see the others or speak for them: every verb below is about THIS device, and
// the hub row says so in as many words. Turning it off unsubscribes locally
// and tells the server to forget that one endpoint; the phone in the other
// pocket is untouched.
//
// THE ONE THING TO GET RIGHT IS THE GESTURE. `Notification.requestPermission()`
// must be the first statement in the click handler, with nothing awaited
// before it. Registering the service worker first and asking second works on
// desktop Chrome and silently fails on iOS, which is the kind of bug that
// looks like "iOS does not support this" for a month.

import type { CohortClientMessage } from "@holos/protocol";

/** The application server key this device's subscription was made with. A
 *  subscription is BOUND to it, so a VAPID rotation strands every existing
 *  one; comparing on boot is what lets a rotation heal itself. */
const KEY_STORE = "holos.watch.key";
/** That the ask has been spent on this device. One denial is permanent in
 *  practice, so the sheet is offered once and never again. */
const ASKED_STORE = "holos.watch.asked";

const SW_PATH = "/sw.js";

/** Where this device stands, in the order the ladder tests it. Everything but
 *  "available" is a row that states the actual remedy and never asks. */
export type PushCapability =
  | "unsupported"
  | "ios-not-installed"
  | "blocked"
  | "available"
  | "granted";

type Send = (message: CohortClientMessage) => void;

function hasPushApi(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone, iPad, and the iPad that reports itself as a Mac. */
function isIosLike(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
}

/** Added to the Home Screen, which on iOS is the only place Web Push exists
 *  at all (Safari 16.4 and up). The manifest already carries
 *  `display: standalone` and the icon set, so nothing else is needed for the
 *  install to produce a real app. */
function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * The ladder, in order. The iOS branch exists so the line a player reads names
 * the actual remedy instead of shrugging: in a tab on iOS `PushManager` is
 * absent, so the first test would have caught it anyway, and "this browser
 * does not carry notifications" would have been true and useless.
 */
export function pushCapability(): PushCapability {
  if (!hasPushApi()) return "unsupported";
  if (isIosLike() && !isStandalone()) return "ios-not-installed";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted") return "granted";
  return "available";
}

/** Whether the ask has already been spent on this device. */
export function watchAsked(): boolean {
  return localStorage.getItem(ASKED_STORE) !== null;
}

export function markWatchAsked(): void {
  localStorage.setItem(ASKED_STORE, "1");
}

/** The key this device's subscription was made with, if it has one. */
function storedKey(): string | null {
  return localStorage.getItem(KEY_STORE);
}

/**
 * base64url to bytes, for `applicationServerKey`. The one piece of encoding
 * the client owns, and it exists because the subscribe call takes a
 * BufferSource where the wire carries a string.
 */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Registered LAZILY: nothing about the game needs a service worker, so one is
 *  installed the first time a player actually asks for notifications. */
async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!hasPushApi()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (existing !== undefined) return existing;
    return await navigator.serviceWorker.register(SW_PATH);
  } catch (err) {
    console.warn(`[watch] could not register the service worker: ${String(err)}`);
    return null;
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!hasPushApi()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (registration === undefined) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Whether THIS device currently holds a subscription. The hub row combines it
 *  with the server's own `sky.pushSubscribed`, which speaks for the seat. */
export async function watchOnThisDevice(): Promise<boolean> {
  return (await currentSubscription()) !== null;
}

/**
 * Ask, then subscribe, then tell the server. Returns whether this device now
 * holds a watch.
 *
 * THE PERMISSION CALL IS THE FIRST STATEMENT and nothing is awaited before it
 * (see the header). Everything else — the registration, the subscribe, the
 * send — happens after the permission promise resolves, which is the order iOS
 * requires and every other browser tolerates.
 */
export async function enableWatch(publicKey: string, send: Send): Promise<boolean> {
  const permission = await Notification.requestPermission();
  markWatchAsked();
  if (permission !== "granted") return false;

  const registration = await ensureRegistration();
  if (registration === null) return false;
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    localStorage.setItem(KEY_STORE, publicKey);
    send({ type: "pushSubscribe", endpoint: subscription.endpoint });
    return true;
  } catch (err) {
    console.warn(`[watch] could not subscribe: ${String(err)}`);
    return false;
  }
}

/** Off, on this device only. Both halves, in this order: the browser forgets
 *  the subscription and the server forgets the endpoint. */
export async function disableWatch(send: Send): Promise<void> {
  const subscription = await currentSubscription();
  if (subscription === null) return;
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    // The server-side forget below is the half that matters.
  }
  localStorage.removeItem(KEY_STORE);
  send({ type: "pushUnsubscribe", endpoint });
}

/**
 * The local half on its own, for the playtest reset: the run is about to stop
 * being this browser's, and a stranger's phone must not keep buzzing for a
 * civilization that is not theirs. The server half is `/dev/forget`, which
 * deletes `push:${token}` with the rest of the seat.
 */
export async function unsubscribeLocally(): Promise<void> {
  const subscription = await currentSubscription();
  localStorage.removeItem(KEY_STORE);
  localStorage.removeItem(ASKED_STORE);
  if (subscription === null) return;
  try {
    await subscription.unsubscribe();
  } catch {
    // Nothing left to do: the seat is being erased either way.
  }
}

/**
 * THE BOOT RE-SYNC, and it is the only thing that reliably heals a rotated
 * endpoint. Push endpoints rot silently and `pushsubscriptionchange` is
 * unevenly implemented, so on every load where permission is already granted
 * this re-reads the subscription and re-sends it UNCONDITIONALLY. The send is
 * idempotent (the server keys a subscription by the hash of its endpoint), so
 * the cost of doing it every time is one small message.
 *
 * It also handles the other silent death: a VAPID rotation invalidates every
 * existing subscription, so a stored key that no longer matches the one the
 * welcome carried means re-subscribing rather than re-sending.
 */
export async function resyncWatch(publicKey: string, send: Send): Promise<void> {
  if (!hasPushApi() || Notification.permission !== "granted") return;
  const subscription = await currentSubscription();
  if (subscription === null) return;
  if (storedKey() !== publicKey) {
    // The deployment rotated. Drop the stranded subscription and make one
    // against the current key; the server retires the old row on its own the
    // next time it tries to deliver to it.
    try {
      await subscription.unsubscribe();
    } catch {
      // Fall through: the resubscribe below is what matters.
    }
    await enableWatch(publicKey, send);
    return;
  }
  send({ type: "pushSubscribe", endpoint: subscription.endpoint });
}
