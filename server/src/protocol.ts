// Wire protocol shared between server and client.
// The client imports these types via the `@holos/protocol` alias.

/** Positions are normalized to [0, 1] in both axes; clients map them to their viewport. */
export interface PlayerState {
  id: string;
  x: number;
  y: number;
  color: number;
}

/** Sent by a client to request moving its own dot. */
export interface MoveMessage {
  type: "move";
  x: number;
  y: number;
}

export type ClientMessage = MoveMessage;

export type ServerMessage =
  | { type: "sync"; self: string; players: PlayerState[] }
  | { type: "join"; player: PlayerState }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "leave"; id: string };

export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (
    msg["type"] === "move" &&
    typeof msg["x"] === "number" &&
    Number.isFinite(msg["x"]) &&
    typeof msg["y"] === "number" &&
    Number.isFinite(msg["y"])
  ) {
    return { type: "move", x: msg["x"], y: msg["y"] };
  }
  return null;
}

export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as { type?: unknown };
  switch (msg.type) {
    case "sync":
    case "join":
    case "move":
    case "leave":
      return data as ServerMessage;
    default:
      return null;
  }
}

// ── Act 3 / Cohort wire (A1) ────────────────────────────────────────────
// Type-only imports → erased from the client bundle (no truth code ships).
import type { CivSeed } from "./civseed";
import type { ObservedCiv, ObservedSignal } from "./knowledge";
import type { Star, Vec3Ly } from "./galaxy";

// Re-exports the client needs to render. Types are erased; DIAL_AXES is the
// ONE runtime value the client genuinely needs (in-world dial pole labels),
// and dials.ts imports nothing and carries no truth.
export { DIAL_AXES } from "./dials";
export type { DialAxisId, DialSetting, DialSheet, DialAxis } from "./dials";
// The name lexicon is presentational vocabulary in the dials.ts mold (its
// module imports nothing at runtime): the ceremony's suggestion chips
// compose from the same word lists the seed generator uses.
export { NAME_HEADS, NAME_TAILS, NAME_PHRASES } from "./names";
export type { CivSeed, EmissionEpoch } from "./civseed";
export type { ObservedSignal, SignalClass } from "./knowledge";
export type { Star, SpectralClass, Vec3Ly } from "./galaxy";

/** Clock anchor; the client computes nowYear locally (no time polling). */
export interface ClockWire {
  readonly epochRealMs: number;
  readonly epochGameYear: number;
}

/**
 * The ONLY remote-civ shape on the wire: a strict narrowing of ObservedCiv
 * (Omit ties it to ObservedCiv so extending the boundary means extending
 * ObservedCiv, never reaching into truth). observerId/targetId dropped;
 * signal guaranteed non-null (undetected civs are withheld entirely).
 */
export type DetectedSource =
  Omit<ObservedCiv, "observerId" | "targetId" | "signal"> & {
    readonly signal: ObservedSignal;
  };

/** The only producer of a DetectedSource — input is an already-observed civ. */
export function toWireSource(
  o: ObservedCiv & { signal: ObservedSignal },
): DetectedSource {
  return {
    starId: o.starId,
    designation: o.designation,
    distanceLy: o.distanceLy,
    lightAgeYears: o.lightAgeYears,
    asOfYear: o.asOfYear,
    signal: o.signal,
  };
}

/** An inheritance candidate / the player's own civ — theirs to see in full. */
export interface CivCard {
  readonly candidateId: string;
  readonly seed: CivSeed;         // the whole record (yours; no leak)
  readonly archetypeName: string; // resolved server-side (keeps minds.ts off client)
  readonly archetypeFirstRead: string;
}

/** The one present-tense civ in the universe: your own, cyan HOME. */
export interface SelfView {
  readonly civId: string;
  readonly seed: CivSeed;
  readonly starId: string;
  readonly designation: string;
  readonly position: Vec3Ly;      // HOME mote location in the Model
}

// client → server (UNTRUSTED — every field guarded on parse)
export type CohortClientMessage =
  | { type: "hello"; token: string | null }
  | { type: "become"; candidateId: string; name: string }
  | { type: "nameSource"; starId: string; name: string } // "" = delete
  | { type: "requestSky" };

// server → client
export type CohortServerMessage =
  | { type: "welcome"; token: string; phase: "choosing" | "placed";
      clock: ClockWire; catalog: readonly Star[] }
  | { type: "offer"; candidates: readonly CivCard[] }
  | { type: "sky"; nowYear: number; self: SelfView;
      sources: readonly DetectedSource[];
      localNames: Readonly<Record<string, string>> }
  | { type: "sourceNamed"; starId: string; name: string }
  | { type: "error"; code: CohortErrorCode; message: string };

export type CohortErrorCode =
  | "bad-name" | "unknown-candidate" | "cohort-full" | "not-placed" | "bad-message";

/** Max civilization / local-source name length (post-trim). */
export const MAX_NAME_LEN = 24;

/**
 * Authoritative name validation (server calls this; client may pre-check).
 * Trims, collapses internal whitespace, rejects control chars, enforces
 * 1..MAX_NAME_LEN. Returns the cleaned name, or null if invalid.
 */
export function validateName(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length < 1 || collapsed.length > MAX_NAME_LEN) return null;
  // Reject C0/C1 controls and invisible/bidi format characters (zero-width
  // spaces, direction overrides, word joiners, BOM) — names must be what
  // they look like.
  for (const ch of collapsed) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return null;
    if (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2060 && code <= 0x206f) ||
      code === 0xfeff
    ) {
      return null;
    }
  }
  return collapsed;
}

/** Untrusted client→server parse. Mirror parseClientMessage's exact style:
 *  JSON.parse in try/catch, object/null checks, per-field typeof guards,
 *  return null on any mismatch. Do NOT validate name length here (the handler
 *  calls validateName and returns a specific error code); only check types. */
export function parseCohortClientMessage(raw: string): CohortClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (
    msg["type"] === "hello" &&
    (msg["token"] === null || typeof msg["token"] === "string")
  ) {
    return { type: "hello", token: msg["token"] };
  }

  if (
    msg["type"] === "become" &&
    typeof msg["candidateId"] === "string" &&
    typeof msg["name"] === "string"
  ) {
    return { type: "become", candidateId: msg["candidateId"], name: msg["name"] };
  }

  if (
    msg["type"] === "nameSource" &&
    typeof msg["starId"] === "string" &&
    typeof msg["name"] === "string"
  ) {
    return { type: "nameSource", starId: msg["starId"], name: msg["name"] };
  }

  if (msg["type"] === "requestSky") {
    return { type: "requestSky" };
  }

  return null;
}

/** Server→client parse, client side. Mirror parseServerMessage exactly:
 *  JSON.parse, object/null check, switch on the discriminant tags above,
 *  cast to CohortServerMessage on match, else null. (Same-origin trust; the
 *  heavy payloads originate from our own server, as with parseServerMessage.) */
export function parseCohortServerMessage(raw: string): CohortServerMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as { type?: unknown };
  switch (msg.type) {
    case "welcome":
    case "offer":
    case "sky":
    case "sourceNamed":
    case "error":
      return data as CohortServerMessage;
    default:
      return null;
  }
}
