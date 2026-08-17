// Web push — the transport half of A5's standing watch, and NOTHING ELSE.
//
// THIS MODULE IMPORTS NOTHING FROM THE GAME, and that is the whole no-leak
// argument rather than a tidiness preference. It cannot see a star, a
// civilization, a study or a year, so there is no code path in it that COULD
// put a fact on a push service's wire even if a later change tried. Its
// greppable form:
//
//   grep -nE 'from "' server/src/push.ts     # expect nothing at all
//
// PAYLOAD-FREE, and for the same reason. The POST body is empty: RFC 8291
// content encryption would mean storing every subscriber's `p256dh` and `auth`
// secrets in the Durable Object, and a server that holds no key material
// cannot encrypt a fact by accident. The service worker shows a fixed line it
// carries in its own source; the content waits behind the tap, in the game,
// through the cone as always.
//
//   grep -rn "p256dh\|applicationServerKey\|getKey(" server/src   # expect zero
//
// THE DER TRAP, named here because it is the one thing a builder gets wrong.
// `crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, …)` returns the raw
// IEEE P1363 form — 64 bytes, r ‖ s — which is exactly what JWS ES256 wants.
// There is no DER anywhere in this file and there must never be one. The
// internet is full of raw-to-DER helpers because OpenSSL and Node's legacy
// `crypto.sign` emit DER (0x30 …), and a signature built that way is rejected
// by every push service with a 401. If you ever see a signature starting 0x30
// and running seventy-odd bytes, you are on the wrong API.

/**
 * The four bindings this module reads. `CohortEnv` extends it, so the Worker's
 * view of its own configuration is declared once, here, where it is used — the
 * `VoiceGenEnv` precedent.
 *
 * Both key secrets absent is the DEFAULT and the silent-absence case (the
 * ANTHROPIC_API_KEY precedent): `welcome.push` is null, no service worker is
 * registered, no hub row renders, and nothing warns until something would
 * actually have used it.
 */
export interface PushEnv {
  /** The VAPID private key as a compact JWK JSON string. A Workers secret
   *  (`npx wrangler secret put HOLOS_VAPID_PRIVATE_JWK`); never in the repo. */
  readonly HOLOS_VAPID_PRIVATE_JWK?: string;
  /** The matching public key: the raw uncompressed P-256 point (65 bytes,
   *  0x04 ‖ X ‖ Y) as unpadded base64url. Also a secret, and set with the
   *  private half or not at all — see `vapidPublicKey`'s assertion. */
  readonly HOLOS_VAPID_PUBLIC_KEY?: string;
  /** The `sub` claim: a syntactically valid mailto: or https: URI. Public by
   *  definition (it travels in every JWT), so it lives in wrangler.jsonc. */
  readonly HOLOS_VAPID_SUBJECT?: string;
  /** Short-circuits delivery for local testing: "on" logs the request and
   *  answers a synthetic 201 without opening a socket. A bare status code
   *  ("410", "500") answers THAT instead, which is what makes the
   *  subscription-gone and service-trouble branches testable without a push
   *  service. Belongs in `.dev.vars` and nowhere else. */
  readonly HOLOS_PUSH_DRY_RUN?: string;
}

/** One device's subscription. NO `p256dh` AND NO `auth`: see the header. */
export interface StoredPushSub {
  /** base64url(sha256(endpoint)) truncated — stable, and short enough to log
   *  without the endpoint itself (which is a bearer capability). */
  readonly id: string;
  readonly endpoint: string;
  /** The first characters of the VAPID public key this subscription was made
   *  with. A subscription is bound to its application server key, so a
   *  rotation strands every existing one; this is what lets the send path
   *  delete them instead of pushing into the void forever. */
  readonly keyId: string;
  readonly addedRealMs: number;
  readonly failures: number;
}

/** `push:${token}` — INFRASTRUCTURE, never game truth. The alarm may write
 *  this and nothing else. */
export interface PushState {
  readonly version: 1;
  readonly subs: readonly StoredPushSub[];
  /** Firing keys already pushed for, newest last. The hard idempotency
   *  guarantee: a given firing is pushed at most once, ever. */
  readonly notified: readonly string[];
  /** When the last push went out. */
  readonly notifiedRealMs: number;
  /** When a placed connection for this seat was last live. `notifiedRealMs >
   *  seenRealMs` is the one-push-per-absence policy. */
  readonly seenRealMs: number;
}

export const MAX_SUBS_PER_TOKEN = 8;
export const MAX_NOTIFIED_KEYS = 32;
export const MAX_SUB_FAILURES = 5;
const JWT_LIFETIME_SEC = 12 * 3600; // the spec cap is 24h
const JWT_CACHE_SLACK_SEC = 60;
const PUSH_TTL_SEC = 43200;
const PUSH_TOPIC = "holoswatch";

/**
 * The endpoint bound, mirroring protocol.ts's `MAX_PUSH_ENDPOINT_CHARS`. A
 * copy rather than an import, because this module imports nothing from the
 * game (see the header) and because the two gates are deliberately separate:
 * the parse layer refuses an over-long endpoint before any handler sees it,
 * and this refuses it again before anything is fetched. Drift shows up as a
 * refusal, never as a request.
 */
const MAX_ENDPOINT_CHARS = 1024;

/**
 * The push services this Worker will talk to, by host suffix. THE PRIMARY SSRF
 * GATE: the endpoint is a URL an untrusted client handed us, and everything
 * else here is defence in depth. An unknown host is refused and LOGGED WITH
 * THE HOST NAME, so a browser we have not met shows up as a line in
 * `wrangler tail` rather than as a support ticket.
 */
const PUSH_HOST_SUFFIXES: readonly string[] = [
  ".googleapis.com",
  ".push.apple.com",
  ".push.services.mozilla.com",
  ".notify.windows.com",
  ".push.microsoft.com",
];

// ---------------------------------------------------------------------------
// base64url
// ---------------------------------------------------------------------------

export function b64uEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64uDecode(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

const UTF8 = new TextEncoder();

// ---------------------------------------------------------------------------
// The key material, and the assertion that the pair is a pair
// ---------------------------------------------------------------------------

interface VapidJwk {
  readonly kty: string;
  readonly crv: string;
  readonly d: string;
  readonly x: string;
  readonly y: string;
}

/** Verdicts are cached per configured pair, so the parse and the comparison
 *  happen once per Worker rather than once per welcome. */
let keyVerdict: { readonly fingerprint: string; readonly publicKey: string | null } | null = null;
let mismatchLogged = false;
let missingLogged = false;

function fingerprintOf(env: PushEnv): string {
  return `${env.HOLOS_VAPID_PRIVATE_JWK ?? ""}|${env.HOLOS_VAPID_PUBLIC_KEY ?? ""}`;
}

function parseVapidJwk(raw: string): VapidJwk | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const jwk = data as Record<string, unknown>;
  const fields = ["kty", "crv", "d", "x", "y"] as const;
  for (const field of fields) {
    if (typeof jwk[field] !== "string" || (jwk[field] as string).length === 0) return null;
  }
  if (jwk["kty"] !== "EC" || jwk["crv"] !== "P-256") return null;
  return {
    kty: jwk["kty"] as string,
    crv: jwk["crv"] as string,
    d: jwk["d"] as string,
    x: jwk["x"] as string,
    y: jwk["y"] as string,
  };
}

/** The 65-byte uncompressed point the JWK's coordinates describe, base64url.
 *  Each coordinate is left-padded to 32 bytes: a leading-zero X or Y encodes
 *  short, and a naive concatenation would silently produce a different key. */
function rawPublicKeyFrom(jwk: VapidJwk): string | null {
  const x = b64uDecode(jwk.x);
  const y = b64uDecode(jwk.y);
  if (x.length > 32 || y.length > 32) return null;
  const point = new Uint8Array(65);
  point[0] = 0x04;
  point.set(x, 1 + (32 - x.length));
  point.set(y, 33 + (32 - y.length));
  return b64uEncode(point);
}

/**
 * The application server key the client subscribes with, or null when push is
 * off for this deployment.
 *
 * THE BOOT ASSERTION LIVES HERE. The public half is its own secret so the
 * client can be handed it with no crypto at request time, which means nothing
 * else would ever notice if the two halves came from different keypairs. So
 * the point is rebuilt from the JWK's own coordinates and compared: a mismatch
 * logs once and DISABLES push, rather than minting subscriptions that no
 * signature this Worker can produce will ever be allowed to deliver to.
 */
export function vapidPublicKey(env: PushEnv): string | null {
  const fingerprint = fingerprintOf(env);
  const cached = keyVerdict;
  if (cached !== null && cached.fingerprint === fingerprint) return cached.publicKey;

  const publicKey = ((): string | null => {
    const rawJwk = env.HOLOS_VAPID_PRIVATE_JWK;
    const declared = env.HOLOS_VAPID_PUBLIC_KEY;
    if (
      rawJwk === undefined ||
      rawJwk.length === 0 ||
      declared === undefined ||
      declared.length === 0
    ) {
      return null;
    }
    const jwk = parseVapidJwk(rawJwk);
    if (jwk === null) {
      console.warn("[push] HOLOS_VAPID_PRIVATE_JWK is not a P-256 private JWK: notifications are off");
      return null;
    }
    const rebuilt = rawPublicKeyFrom(jwk);
    if (rebuilt === null || rebuilt !== declared) {
      if (!mismatchLogged) {
        mismatchLogged = true;
        console.error(
          "[push] the VAPID keypair does not match: HOLOS_VAPID_PUBLIC_KEY is not the public half of HOLOS_VAPID_PRIVATE_JWK. Notifications are off until both are set from one generation.",
        );
      }
      return null;
    }
    return declared;
  })();

  keyVerdict = { fingerprint, publicKey };
  return publicKey;
}

/** The `keyId` a subscription made with the current key carries. */
export function keyIdFor(publicKey: string): string {
  return publicKey.slice(0, 8);
}

/** The one warning a dev-mode deployment ever prints, and only when a seat
 *  actually asked for something push would have done. */
export function warnPushUnconfigured(): void {
  if (missingLogged) return;
  missingLogged = true;
  console.warn(
    "[push] a seat asked to subscribe but no VAPID keypair is configured: notifications are off",
  );
}

let signingKeyCache: { readonly fingerprint: string; readonly key: CryptoKey } | null = null;

async function vapidSigningKey(env: PushEnv): Promise<CryptoKey | null> {
  if (vapidPublicKey(env) === null) return null;
  const fingerprint = fingerprintOf(env);
  const cached = signingKeyCache;
  if (cached !== null && cached.fingerprint === fingerprint) return cached.key;
  const jwk = parseVapidJwk(env.HOLOS_VAPID_PRIVATE_JWK ?? "");
  if (jwk === null) return null;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
    signingKeyCache = { fingerprint, key };
    return key;
  } catch (err) {
    console.error(`[push] could not import the VAPID private key: ${String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// The JWT (RFC 8292)
// ---------------------------------------------------------------------------

/** One signature per audience per twelve hours. There are three or four push
 *  services in the world, so this is a handful of signatures per Worker. */
const jwtCache = new Map<string, { readonly jwt: string; readonly expSec: number }>();

function subjectOf(env: PushEnv): string | null {
  const subject = env.HOLOS_VAPID_SUBJECT;
  if (subject === undefined || subject.length === 0) return null;
  // A malformed `sub` is the single most common first-run failure: Apple
  // answers a 400 and names nothing useful. Refuse here instead.
  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) return null;
  return subject;
}

/**
 * The exact `Authorization` header value for one audience, or null when push
 * is not configured. Exported so `/dev/vapid` can show what the Worker would
 * send without sending anything.
 */
export async function vapidAuthorization(env: PushEnv, audience: string): Promise<string | null> {
  const publicKey = vapidPublicKey(env);
  if (publicKey === null) return null;
  const subject = subjectOf(env);
  if (subject === null) {
    console.warn(
      "[push] HOLOS_VAPID_SUBJECT must be a mailto: or https: URI: notifications are off",
    );
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const cacheKey = `${fingerprintOf(env)}|${subject}|${audience}`;
  const cached = jwtCache.get(cacheKey);
  if (cached !== undefined && cached.expSec - JWT_CACHE_SLACK_SEC > nowSec) {
    return `vapid t=${cached.jwt}, k=${publicKey}`;
  }

  const key = await vapidSigningKey(env);
  if (key === null) return null;

  const expSec = nowSec + JWT_LIFETIME_SEC;
  const header = b64uEncode(UTF8.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(UTF8.encode(JSON.stringify({ aud: audience, exp: expSec, sub: subject })));
  const signing = `${header}.${claims}`;
  // Raw P1363, 64 bytes, exactly what JWS wants. No DER. See the header.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, UTF8.encode(signing)),
  );
  const jwt = `${signing}.${b64uEncode(signature)}`;
  jwtCache.set(cacheKey, { jwt, expSec });
  return `vapid t=${jwt}, k=${publicKey}`;
}

// ---------------------------------------------------------------------------
// The endpoint gate
// ---------------------------------------------------------------------------

/**
 * Whether this Worker will POST to `endpoint`. The endpoint is
 * ATTACKER-SUPPLIED — a client hands it over on the socket and the Durable
 * Object then fetches it — so this is the gate, not a sanity check.
 */
export function validatePushEndpoint(endpoint: string): boolean {
  if (endpoint.length === 0 || endpoint.length > MAX_ENDPOINT_CHARS) {
    console.warn(`[push] refusing a push endpoint: length ${endpoint.length}`);
    return false;
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    console.warn("[push] refusing a push endpoint: not a URL");
    return false;
  }
  if (url.protocol !== "https:") {
    console.warn(`[push] refusing a push endpoint on ${url.protocol}//${url.hostname}`);
    return false;
  }
  // A non-default port and credentials in the URL are both ways of aiming a
  // blind POST somewhere it was not meant to go.
  if (url.port !== "" || url.username !== "" || url.password !== "") {
    console.warn(`[push] refusing a push endpoint with a port or credentials: ${url.hostname}`);
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (!PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    console.warn(`[push] refusing a push endpoint on an unknown host: ${host}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * What one POST did, in the four flavours the caller acts on. The response
 * BODY is never read and never echoed: only the status decides anything.
 */
export type PushOutcome = "ok" | "gone" | "retry" | "refused";

export interface PushSendResult {
  readonly status: number;
  readonly outcome: PushOutcome;
}

function dryRunStatus(env: PushEnv): number | null {
  const flag = env.HOLOS_PUSH_DRY_RUN;
  if (flag === undefined || flag.length === 0) return null;
  if (flag === "on") return 201;
  const asStatus = Number(flag);
  return Number.isInteger(asStatus) && asStatus >= 100 && asStatus <= 599 ? asStatus : null;
}

function outcomeFor(status: number): PushOutcome {
  if (status >= 200 && status < 300) return "ok";
  if (status === 404 || status === 410) return "gone";
  if (status >= 500) return "retry";
  return "refused";
}

/**
 * One payload-free push. Empty body, and deliberately NO `Content-Encoding`:
 * `aes128gcm` with nothing under it is a 400 from every service.
 *
 * `TTL` is mandatory in RFC 8030; twelve real hours is roughly a hundred and
 * forty game years, which is the window inside which "a watch tripped" is
 * still worth a buzz. `Topic` is the collapse key, so a phone that has been
 * off for a day wakes to one notification rather than a stack.
 */
export async function sendWebPush(env: PushEnv, endpoint: string): Promise<PushSendResult> {
  if (!validatePushEndpoint(endpoint)) return { status: 0, outcome: "gone" };
  const audience = new URL(endpoint).origin;
  const authorization = await vapidAuthorization(env, audience);
  if (authorization === null) return { status: 0, outcome: "refused" };

  const headers: Record<string, string> = {
    Authorization: authorization,
    TTL: String(PUSH_TTL_SEC),
    Urgency: "normal",
    Topic: PUSH_TOPIC,
  };

  const dry = dryRunStatus(env);
  if (dry !== null) {
    console.log(
      `[push] dry run POST ${new URL(endpoint).host} TTL=${PUSH_TTL_SEC} Topic=${PUSH_TOPIC} jwt=${authorization.slice(8, 24)} status=${dry}`,
    );
    return { status: dry, outcome: outcomeFor(dry) };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      // No body at all. There is nothing to encrypt because there is nothing
      // to say: the line lives in the service worker.
      redirect: "manual",
    });
    if (response.status === 429) {
      console.warn(`[push] rate limited by ${audience}: retry-after ${response.headers.get("retry-after") ?? "unset"}`);
    } else if (response.status >= 400 && response.status < 500) {
      console.warn(`[push] ${audience} refused with ${response.status}`);
    }
    return { status: response.status, outcome: outcomeFor(response.status) };
  } catch (err) {
    console.warn(`[push] could not reach ${audience}: ${String(err)}`);
    return { status: 0, outcome: "retry" };
  }
}

/**
 * Push to every device on one seat and return the subscription list the seat
 * should carry afterwards. THE ONLY STATE THIS TOUCHES IS THE LIST IT WAS
 * HANDED: the caller owns the write, and the only key it may write is
 * `push:${token}`.
 *
 * Retirement has three causes and no retry queue behind any of them: the
 * subscription is gone (404/410), it was made with a key we have rotated away
 * from, or it has failed often enough to stop being worth a wake. The next
 * change point is the retry, and a missed push costs a push and never a fact.
 */
export async function deliverWatch(
  env: PushEnv,
  subs: readonly StoredPushSub[],
): Promise<{ readonly subs: readonly StoredPushSub[]; readonly sent: number }> {
  const publicKey = vapidPublicKey(env);
  if (publicKey === null) return { subs, sent: 0 };
  const currentKeyId = keyIdFor(publicKey);

  const kept: StoredPushSub[] = [];
  let sent = 0;
  for (const sub of subs) {
    if (sub.keyId !== currentKeyId) {
      console.warn(`[push] retiring a subscription made with an older key: ${sub.id}`);
      continue;
    }
    const result = await sendWebPush(env, sub.endpoint);
    if (result.outcome === "ok") {
      sent += 1;
      kept.push(sub.failures === 0 ? sub : { ...sub, failures: 0 });
      continue;
    }
    if (result.outcome === "gone") continue;
    if (result.outcome === "refused") {
      // Our request or our credentials, not the subscription. Keep it: a
      // deleted subscription is unrecoverable and a bad JWT is a fix.
      kept.push(sub);
      continue;
    }
    const failures = sub.failures + 1;
    if (failures >= MAX_SUB_FAILURES) {
      console.warn(`[push] retiring a subscription after ${failures} failures: ${sub.id}`);
      continue;
    }
    kept.push({ ...sub, failures });
  }
  return { subs: kept, sent };
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

export function newPushState(nowRealMs: number): PushState {
  return { version: 1, subs: [], notified: [], notifiedRealMs: 0, seenRealMs: nowRealMs };
}

/** A stable id for one endpoint, so a re-subscribe from the same device
 *  replaces its row instead of adding one. */
export async function subIdFor(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", UTF8.encode(endpoint));
  return b64uEncode(new Uint8Array(digest)).slice(0, 22);
}

/** Add or replace one device's subscription, oldest dropped at the cap. */
export function withSub(state: PushState, sub: StoredPushSub): PushState {
  const others = state.subs.filter((s) => s.id !== sub.id);
  const subs = [...others, sub].slice(-MAX_SUBS_PER_TOKEN);
  return { ...state, subs };
}

export function withoutSub(state: PushState, id: string): PushState {
  const subs = state.subs.filter((s) => s.id !== id);
  return subs.length === state.subs.length ? state : { ...state, subs };
}

/** Record the firings this push covered. Oldest keys drop at the cap, which
 *  is safe because a firing that old has long since been settled by a sky. */
export function withNotified(
  state: PushState,
  keys: readonly string[],
  nowRealMs: number,
): PushState {
  const merged = [...state.notified.filter((k) => !keys.includes(k)), ...keys];
  return {
    ...state,
    notified: merged.slice(-MAX_NOTIFIED_KEYS),
    notifiedRealMs: nowRealMs,
  };
}
