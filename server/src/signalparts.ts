// Signal parts — the composed-signal grammar (A2.6).
//
// ===========================================================================
// SELECTORS, NEVER CONTENT. READ THIS BEFORE THE CODE.
// ===========================================================================
//
// A2.5 shipped freeform prose to seeded counterparts and refused it between
// players, which made the refusal itself a human/AI oracle: type anything,
// read the error code, know your counterpart. A2.6 retires freeform
// EVERYWHERE and replaces it with this: the client sends SELECTORS (PartRef,
// below), and the server MATERIALIZES every part from the sender's own state
// at send time and freezes it into the act.
//
// The consequence is the whole design. No player-influenced number and no
// player-authored string exists anywhere in a part. A sender cannot state a
// share, a class, a level, a year or a label; they can only POINT at
// something they already hold. Fabrication is structurally impossible, and
// v1 deception is therefore exactly four things: SELECTION (which true
// things), OMISSION (a finding without its evidence list), TONE (which has
// no truth conditions), and TIMING. That is a richer game than lying, and it
// is the one that needs no moderation surface, because there is no player
// content to report.
//
// The one authored token in the whole game (`validateName`'s names) NEVER
// travels: no field below can hold it, the recipient renders their OWN local
// name beside the designation, and the greppable form of that claim is that
// `validateName` and `localNames` appear nowhere in this module.
//
// NO FORWARDING. Every materializer arm reads the SENDER'S own study, sky or
// seed state. A finding somebody sent you is not re-exportable, so one leak
// cannot become seven; scarcity survives contact.
//
// NO CLOCK, NO RNG, NO STORAGE. Every function here is pure and total. The
// caller supplies `nowYear`; nothing here draws, and nothing here writes.
// Canonical part order is imposed at materialization (`PART_ORDER`) so two
// senders who chose the same parts emit byte-identical lists: composition
// order is not a fingerprint.

import type { CivId, CivSeed } from "./civseed";
import { DIAL_AXES, type DialAxisId } from "./dials";
import { civAtStar, type Galaxy } from "./galaxy";
import { emissionAt, visibleSky, type SignalClass } from "./knowledge";
import type { HypothesisId } from "./protocol";
import type { QuestionId } from "./questions";
import type { StoredStudy } from "./studies";
// Type-only, erased at build: the parity table names the counterpart classes
// traffic.ts owns, and traffic.ts imports this module's runtime values in
// turn. Neither module reads the other at module-initialization time.
import type { CounterpartClass } from "./traffic";

// ---------------------------------------------------------------------------
// The vocabulary
// ---------------------------------------------------------------------------

/** The seven kinds a signal can carry. A `knowledge` part (a project
 *  discount the recipient may choose to take) is RESERVED and deliberately
 *  absent: the first part with a mechanical effect on the recipient needs
 *  accept machinery, and that is not this stage. */
export type PartKind =
  | "finding"
  | "sighting"
  | "archive"
  | "culture"
  | "request"
  | "verdict"
  | "accord";

export const PART_KINDS: readonly PartKind[] = [
  "finding",
  "sighting",
  "archive",
  "culture",
  "request",
  "verdict",
  "accord",
];

/**
 * CANONICAL ORDER, imposed server-side at materialization. The composer may
 * add parts in any order it likes; what leaves is always in this one. A
 * player's rhetoric lives in WHAT they include and in the tone, never in the
 * ordering, because an ordering that survived to the wire would be a
 * fingerprint distinguishing one composer from another.
 */
export const PART_ORDER: readonly PartKind[] = [
  "sighting",
  "finding",
  "archive",
  "culture",
  "request",
  "verdict",
  "accord",
];

/**
 * Exactly one per signal, top-level. Two honest axes (who else may hear, how
 * fast to read) plus the sender's own cost. NONE OF THEM IS VERIFIABLE and
 * all of them can lie, which is precisely why they stay: a tone has no truth
 * conditions, so a mismatch between tone and payload is a real move rather
 * than a bug.
 */
export type SignalTone = "plain" | "open" | "guarded" | "urgent" | "reluctant";

export const SIGNAL_TONES: readonly SignalTone[] = [
  "plain",
  "open",
  "guarded",
  "urgent",
  "reluctant",
];

/**
 * How a tone reads on the instrument stamp: a PROPERTY OF THE BEAM, never a
 * feeling. `plain` renders nothing at all, and that is deliberate content —
 * the walkthrough's gift arrives without comment, and the absence of a row
 * is how the reader is told so.
 *
 * Chrome, in the ALL CAPS stamp register. The prose half of a tone lives in
 * voice.ts's TONE_CLAUSE and is a different string for a different place.
 */
export const TONE_STAMP: Readonly<Record<SignalTone, string | null>> = {
  plain: null,
  open: "REPEATED IN THE CLEAR",
  guarded: "NARROW, FOR ONE RECEIVER",
  urgent: "MARKED FOR IMMEDIATE READING",
  reluctant: "ONE PASS, AT LOW POWER",
};

export type AccordForm = "mutual-quiet";
export type AccordMove = "offer" | "accept" | "decline" | "withdraw";
export const ACCORD_MOVES: readonly AccordMove[] = ["offer", "accept", "decline", "withdraw"];

export type VerdictStance = "confirm" | "contradict" | "nothing";
export type ArchiveWindow = "recent" | "long";
export type RequestWant = "finding" | "sighting" | "archive" | "culture";
export type CultureSource = "charter" | "chronicle" | "dial";

/** Whether a finding travels with its evidence list. The omission lever, and
 *  the whole of "depth": a headline finding is a claim with the working left
 *  out, and the reader can see that it was left out. */
export type FindingDepth = "headline" | "full";

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

/** Parts per signal. ZERO IS LEGAL AND SHIPS: an empty carrier is a beam
 *  with nothing on it, arriving dated, and it is the most light-lag-native
 *  utterance in the game (the "still here" / "acknowledged" primitive). It is
 *  bounded by the same cooldown and thread caps as everything else. */
export const MAX_PARTS_PER_SIGNAL = 4;

// The PARSE-layer bounds (wire element count, per-string code points,
// serialized size) live in protocol.ts beside `MAX_CHARTER_CLAUSES_ON_WIRE`,
// which is the same kind of number for the same reason: they bound an
// untrusted payload before anything walks it, and they are the parse layer's
// business rather than the vocabulary's.

/** How many of one kind may ride one signal. Two archives make a comparison
 *  and two verdicts make a reply to a two-part signal; everything else says
 *  what it has to say once. */
export const PER_KIND_CAP: Readonly<Record<PartKind, number>> = {
  finding: 1,
  sighting: 1,
  archive: 2,
  culture: 1,
  request: 1,
  verdict: 2,
  accord: 1,
};

/** Evidence ids carried on a full finding. */
export const MAX_EVIDENCE_PER_FINDING = 6;

/** Samples in one archive window. Twelve is a sparkline a thumb can read and
 *  a downsample nobody can mine for a level the sender did not choose to
 *  show. */
export const ARCHIVE_SAMPLES = 12;

/** The two archive windows, in game years. `recent` is a few centuries — the
 *  span a dark turn hides in; `long` reaches back past an industrial rise to
 *  the biosphere era, which is what makes the self-disclosure handshake worth
 *  making. */
export const ARCHIVE_WINDOW_YEARS: Readonly<Record<ArchiveWindow, number>> = {
  recent: 500,
  long: 8000,
};

/** Levels are frozen at two decimals. Not privacy: an honest instrument
 *  readout, and a stable number the reader can compare across two archives
 *  without chasing float noise. */
function quantize(level: number): number {
  return Math.round(level * 100) / 100;
}

// ---------------------------------------------------------------------------
// The parts themselves — what actually travels
// ---------------------------------------------------------------------------
//
// EVERY FIELD BELOW IS SERVER-WRITTEN. Read the materializer as the contract:
// each one is copied out of the sender's own frozen state or computed from
// it, and there is no arm anywhere that copies a number or a string off the
// wire into a part.

/**
 * A belief the sender FROZE when they called a study, sent on as theirs.
 * `share`, `label`, `gloss`, `calledYear` and `asOfYear` are StoredCall's own
 * bytes; the sender chose which study, and nothing else about it.
 *
 * DOUBLE AGEING is why the two years both travel: the reader can compute
 * `arrivedYear − asOfYear` as (sender to subject) + (call to send) + (sender
 * to reader), and CHECK that arithmetic against the sender's known catalog
 * position. Honesty checked by geometry rather than by moderation.
 */
export interface FindingPart {
  readonly kind: "finding";
  readonly subjectStarId: string;
  readonly hypothesisId: HypothesisId;
  /** Catalog literals, frozen with the call. The recipient has the menus but
   *  not the id-to-label map, so the label travels rather than being looked
   *  up; both are studies.ts's own strings and neither is player-authored. */
  readonly label: string;
  readonly gloss: string;
  readonly share: number;
  /** `grounded` is RESERVED: a grounded study has no frozen belief to send,
   *  so A2.6 materializes findings from called studies only. The value is in
   *  the vocabulary so the wire shape does not move the day one gains one. */
  readonly basis: "called" | "grounded";
  /** The target year the frozen belief speaks to. */
  readonly asOfYear: number;
  /** The sender's home year at the call. */
  readonly calledYear: number;
  /** The questions bought before the call. EMPTY means headline: the claim
   *  travelled without its working, and the reader can see that it did. */
  readonly evidence: readonly QuestionId[];
}

/**
 * Something in the sender's own sky, named. NEVER carries a controller: who
 * is behind a source is not a fact the sky serves, and it would be the
 * strongest oracle in the game if a part could carry it.
 */
export interface SightingPart {
  readonly kind: "sighting";
  readonly subjectStarId: string;
  readonly signalClass: SignalClass;
  readonly asOfYear: number;
}

export interface ArchiveSample {
  readonly year: number;
  readonly level: number;
}

/**
 * A windowed, downsampled light record: the sender's own emission history
 * (the self-disclosure handshake, dark turn included) or the observed history
 * of a source they are studying. The window is chosen from two named spans
 * and RESOLVED SERVER-SIDE, so a client cannot ask for an arbitrary slice and
 * cannot ask for one that runs past its own light.
 */
export interface ArchivePart {
  readonly kind: "archive";
  readonly subjectStarId: string;
  /** True iff the subject is the sender's own home. The reader is told, and
   *  it is the difference between a disclosure and a report. */
  readonly ofSelf: boolean;
  readonly fromYear: number;
  readonly toYear: number;
  readonly samples: readonly ArchiveSample[];
}

/**
 * Who we are, in the game's own catalog prose. Three sources, all of them
 * server-held content: the founding epigraph (minds.ts), one line of the
 * legible history (civseed.ts's chronicle), or one dial read as its in-world
 * pole and gloss (dials.ts).
 *
 * VERIFIED AT AUTHORING TIME, and stated here so the next builder inherits
 * the check: NONE of these three sources interpolates `CivSeed.name`.
 * `archetypeById(a).charter` is a catalog literal; `chronicleFor` composes
 * cradle and lineage names, fingerprints and the waking line, and never the
 * civilization's own name; a dial gloss is a `DialPole` literal. The
 * civilization's name is not a fact about it that travels.
 *
 * A chronicle line also carries NO YEAR (R-33, and civseed.ts states why at
 * the posture beat). It matters most here: a culture part is frozen at send
 * and read by a stranger light-years and centuries later, so a cohort-absolute
 * year on one would be the one date in the game that means nothing to whoever
 * received it.
 */
export interface CulturePart {
  readonly kind: "culture";
  readonly source: CultureSource;
  /** Chronicle line index, or dial axis index. 0 for a charter. */
  readonly index: number;
  /** Dial only: which axis this reads. */
  readonly axis: DialAxisId | null;
  /** Dial only: the in-world pole this civilization leans to. */
  readonly pole: string | null;
  /** The catalog prose, frozen at send. */
  readonly text: string;
}

/**
 * KN: THE ONE CONSTRUCTION OF A CHARTER PART, and every path that emits one
 * goes through it — the human composer's charter arm below, the counterpart's
 * opening flourish (traffic.ts's `aiCulture`), and the named opener on both
 * sides. That is not tidiness: the knock's claim is that a named opener says
 * NOTHING about who sent it, and the strongest form of that claim is a single
 * constructor rather than four literals that currently agree.
 *
 * `index` is 0 because a civilization has one charter. `axis` and `pole` are
 * dial-only fields and stay null, which is what makes this shape byte-identical
 * to the one A2.6 already shipped.
 */
export function charterPart(seed: CivSeed): CulturePart {
  return {
    kind: "culture",
    source: "charter",
    index: 0,
    axis: null,
    pole: null,
    // A catalog literal (`archetypeById(a).charter`, copied onto the seed at
    // generation), frozen here at send. Nothing source-specific and nothing
    // actionable: a self-portrait, not a proposition.
    text: seed.charter,
  };
}

/** Trade needs a way to WANT. A request names a kind and, optionally, a star
 *  in the sender's own sky; it obliges nobody and is answered or not. */
export interface RequestPart {
  readonly kind: "request";
  readonly want: RequestWant;
  readonly subjectStarId: string | null;
}

/**
 * An answer to a part of an already-delivered signal in THIS thread. The
 * reference resolves to a signal that has actually landed on the sender, so a
 * verdict can never be about something the counterpart has not sent yet.
 *
 * `signalId` holds the UNDERLYING id in storage and is re-rendered into each
 * viewer's own `sig/N` namespace by `renderPartsForViewer` on the way out.
 * The underlying id never reaches the wire (traffic.ts mints the ordinals).
 */
export interface VerdictPart {
  readonly kind: "verdict";
  readonly signalId: string;
  readonly partIndex: number;
  readonly stance: VerdictStance;
}

/**
 * A move in the mutual quiet. NO STORED OBJECT stands behind it: the
 * understanding is DERIVED from the moves each side has actually received
 * (`deriveAccord`), which is what makes the lag asymmetry fall out for free
 * and what keeps a thread cap from ever locking someone into an accord.
 *
 * `ref` carries the underlying id of the offer being answered, on the same
 * terms as `VerdictPart.signalId`.
 */
export interface AccordPart {
  readonly kind: "accord";
  readonly form: AccordForm;
  readonly move: AccordMove;
  readonly ref: string | null;
}

export type SignalPart =
  | FindingPart
  | SightingPart
  | ArchivePart
  | CulturePart
  | RequestPart
  | VerdictPart
  | AccordPart;

// ---------------------------------------------------------------------------
// The selectors — everything a client is allowed to say
// ---------------------------------------------------------------------------
//
// FLAT OBJECTS OF BARE SCALARS, every one of them. No nesting anywhere, which
// is what lets the parse layer in protocol.ts be a shallow walk with a string
// bound and a finite-integer check, and lets THIS module own the vocabulary
// and the error code (the `launchMission.kind` precedent).

export type PartRef =
  | { readonly kind: "finding"; readonly starId: string; readonly depth: FindingDepth }
  | { readonly kind: "sighting"; readonly starId: string }
  | { readonly kind: "archive"; readonly starId: string; readonly window: ArchiveWindow }
  | { readonly kind: "culture"; readonly source: CultureSource; readonly index: number }
  | {
      readonly kind: "request";
      readonly want: RequestWant;
      readonly starId: string | null;
    }
  | {
      readonly kind: "verdict";
      readonly signalId: string;
      readonly partIndex: number;
      readonly stance: VerdictStance;
    }
  | { readonly kind: "accord"; readonly move: AccordMove; readonly ref: string | null };

function isOneOf<T extends string>(pool: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (pool as readonly string[]).includes(v);
}

function str(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}

function nonNegInt(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return null;
  return v;
}

/**
 * The VOCABULARY layer: one selector, or null. Called by the handler, never
 * by the parse layer — protocol.ts has already bounded the array, bounded
 * every string and rejected every non-finite number, and everything left is a
 * question about what the words MEAN, which is this module's business.
 *
 * UNKNOWN KIND IS A REJECTION AND NEVER A SKIP. Silently dropping a part a
 * client sent would let a client probe the server's version by watching which
 * of its parts survived.
 */
export function parsePartRef(raw: unknown): PartRef | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  switch (row["kind"]) {
    case "finding": {
      const starId = str(row, "starId");
      const depth = row["depth"];
      if (starId === null || !isOneOf<FindingDepth>(["headline", "full"], depth)) return null;
      return { kind: "finding", starId, depth };
    }
    case "sighting": {
      const starId = str(row, "starId");
      if (starId === null) return null;
      return { kind: "sighting", starId };
    }
    case "archive": {
      const starId = str(row, "starId");
      const window = row["window"];
      if (starId === null || !isOneOf<ArchiveWindow>(["recent", "long"], window)) return null;
      return { kind: "archive", starId, window };
    }
    case "culture": {
      const source = row["source"];
      const index = nonNegInt(row, "index");
      if (!isOneOf<CultureSource>(["charter", "chronicle", "dial"], source)) return null;
      if (index === null) return null;
      return { kind: "culture", source, index };
    }
    case "request": {
      const want = row["want"];
      const starIdRaw = row["starId"];
      if (!isOneOf<RequestWant>(["finding", "sighting", "archive", "culture"], want)) {
        return null;
      }
      if (starIdRaw !== null && typeof starIdRaw !== "string") return null;
      return { kind: "request", want, starId: starIdRaw };
    }
    case "verdict": {
      const signalId = str(row, "signalId");
      const partIndex = nonNegInt(row, "partIndex");
      const stance = row["stance"];
      if (signalId === null || partIndex === null) return null;
      if (!isOneOf<VerdictStance>(["confirm", "contradict", "nothing"], stance)) return null;
      return { kind: "verdict", signalId, partIndex, stance };
    }
    case "accord": {
      const move = row["move"];
      const refRaw = row["ref"];
      if (!isOneOf<AccordMove>(ACCORD_MOVES, move)) return null;
      if (refRaw !== null && typeof refRaw !== "string") return null;
      return { kind: "accord", move, ref: refRaw };
    }
    default:
      return null;
  }
}

/** The whole array, or null if ANY element is unreadable. */
export function parsePartRefs(raw: readonly unknown[]): readonly PartRef[] | null {
  const out: PartRef[] = [];
  for (const element of raw) {
    const ref = parsePartRef(element);
    if (ref === null) return null;
    out.push(ref);
  }
  return out;
}

/** The tone vocabulary, on the same terms: parsed as a bare string on the
 *  wire, given meaning here. */
export function parseTone(raw: string): SignalTone | null {
  return isOneOf<SignalTone>(SIGNAL_TONES, raw) ? raw : null;
}

// ---------------------------------------------------------------------------
// The thread's own view, as the materializer needs it
// ---------------------------------------------------------------------------

/**
 * One already-delivered signal in the thread the sender is speaking into,
 * flattened to what a reference has to resolve against. Built by the caller
 * from the same merged list `buildThreads` renders, so a reference is legal
 * here exactly when the client could see the row it names.
 */
export interface ThreadRefRow {
  /** The opaque per-thread wire id the client saw: `sig/0`, `sig/1`. */
  readonly wireId: string;
  /** The underlying act or derived id. NEVER on the wire. */
  readonly internalId: string;
  readonly from: "you" | "them";
  /** The year THIS SENDER learned of it. */
  readonly learnedYear: number;
  readonly partKinds: readonly PartKind[];
  /** Accord moves this row carried, for `deriveAccord`. */
  readonly accord: { readonly move: AccordMove; readonly ref: string | null } | null;
}

// ---------------------------------------------------------------------------
// The mutual quiet
// ---------------------------------------------------------------------------

/**
 * Where the understanding stands FROM ONE SIDE OF THE LIGHT. Each side
 * derives its own view from ARRIVED moves only, so between an offer landing
 * and its acceptance arriving back the two sides genuinely disagree about
 * whether the accord exists, and neither of them is wrong. That window is the
 * object's whole point; it is not a bug to be closed.
 */
export type AccordState =
  | "none"
  | "you-offered"
  | "they-offered"
  | "held"
  | "declined"
  | "withdrawn"
  | "broken";

export interface AccordView {
  readonly state: AccordState;
  /** The offer the next move must answer, in underlying-id form. */
  readonly openOfferId: string | null;
  /** The year the accepting move was learned, from this side. This is the
   *  rail's HELD SINCE, and it is your own rack's year — the other side's
   *  rack says a different one, and both are right. */
  readonly heldSinceYear: number | null;
  /**
   * WHOSE ACCEPTANCE it was, which is what the compliance read needs and the
   * rail does not. The window compliance is measured over starts when the
   * accord became true IN THE COUNTERPART'S OWN FRAME: their acceptance left
   * them one transit before you learned of it, and your acceptance reaches
   * them one transit after you sent it. Without this the read would be off by
   * a round trip in one direction and by nothing in the other, which is
   * exactly the sort of quiet asymmetry a lag game must not have.
   */
  readonly acceptedBy: "you" | "them" | null;
  /** An offer has been made by this side at some point. One per ordered
   *  pair, ever — the `hasHailed` precedent. */
  readonly hasOffered: boolean;
}

/**
 * Fold the moves into a view. LAST MOVE WINS, in learned order, and every
 * move is a send by somebody, so presence is already paid for.
 *
 * `broken` is not reachable from here: a breach is read off the
 * counterpart's LIGHT rather than off any message, which is what makes the
 * accord impossible to trap someone in. traffic.ts flips `held` to `broken`
 * when the compliance rail says so.
 */
export function deriveAccord(rows: readonly ThreadRefRow[]): AccordView {
  const moves = rows
    .filter((r) => r.accord !== null)
    .slice()
    .sort((a, b) => a.learnedYear - b.learnedYear || a.wireId.localeCompare(b.wireId));

  let state: AccordState = "none";
  let openOfferId: string | null = null;
  let heldSinceYear: number | null = null;
  let acceptedBy: "you" | "them" | null = null;
  let hasOffered = false;

  for (const row of moves) {
    const accord = row.accord;
    if (accord === null) continue;
    switch (accord.move) {
      case "offer":
        if (row.from === "you") hasOffered = true;
        // A second offer while one is live changes nothing: the first is the
        // one on the table, and offering twice is not a way to reset.
        if (state === "held") break;
        state = row.from === "you" ? "you-offered" : "they-offered";
        openOfferId = row.internalId;
        heldSinceYear = null;
        acceptedBy = null;
        break;
      case "accept":
        if (state !== "you-offered" && state !== "they-offered") break;
        state = "held";
        heldSinceYear = row.learnedYear;
        acceptedBy = row.from;
        openOfferId = null;
        break;
      case "decline":
        if (state !== "you-offered" && state !== "they-offered") break;
        state = "declined";
        openOfferId = null;
        break;
      case "withdraw":
        if (state === "none") break;
        state = "withdrawn";
        openOfferId = null;
        heldSinceYear = null;
        acceptedBy = null;
        break;
    }
  }

  return { state, openOfferId, heldSinceYear, acceptedBy, hasOffered };
}

/** Which accord moves this side may legally make right now. Read by the
 *  materializer to answer a hostile selector, and by nothing else. */
function accordMoveAvailable(view: AccordView, move: AccordMove): boolean {
  switch (move) {
    case "offer":
      // One live understanding per ordered pair, and one offer ever.
      return !view.hasOffered && view.state === "none";
    case "accept":
    case "decline":
      // Only an offer that has actually LANDED on this side can be answered.
      return view.state === "they-offered";
    case "withdraw":
      return view.state === "held" || view.state === "you-offered";
  }
}

// ---------------------------------------------------------------------------
// The materializer
// ---------------------------------------------------------------------------

/** Everything the materializer may read. There is deliberately no arm for
 *  anything received: parts come from the sender's OWN state, and forwarding
 *  is not expressible. */
export interface MaterializeInput {
  readonly galaxy: Galaxy;
  readonly senderId: CivId;
  readonly nowYear: number;
  /** The sender's own stored studies, keyed by starId. */
  readonly studies: Readonly<Record<string, StoredStudy>>;
  /** The thread the sender is speaking into, as they can see it. */
  readonly thread: readonly ThreadRefRow[];
  readonly accord: AccordView;
}

export type MaterializeFailure = {
  readonly ok: false;
  readonly code: "bad-signal" | "part-unavailable";
  readonly message: string;
};

export type MaterializeResult =
  | { readonly ok: true; readonly parts: readonly SignalPart[] }
  | MaterializeFailure;

function badSignal(message: string): MaterializeFailure {
  return { ok: false, code: "bad-signal", message };
}

function unavailable(message: string): MaterializeFailure {
  return { ok: false, code: "part-unavailable", message };
}

/**
 * Selectors in, frozen parts out.
 *
 * THE HONESTY INVARIANT, which is what the whole module exists to hold: a
 * legal selector yields a part whose every field equals the sender's server
 * state at send, and a hostile one — a foreign starId, an out-of-range
 * ordinal, an unowned study, a reference to a signal in another thread or to
 * one that has not landed — yields an error and MATERIALIZES NOTHING. There
 * is no partial result and no arm that clamps a bad selector into a good one.
 *
 * Order of business: structural bounds (count, per-kind caps) first, because
 * they are decidable from the sender's bytes alone; then per-part resolution
 * against the sender's own state; then canonical ordering.
 */
export function materializeParts(
  refs: readonly PartRef[],
  input: MaterializeInput,
): MaterializeResult {
  if (refs.length > MAX_PARTS_PER_SIGNAL) return badSignal("too many parts");

  const counts = new Map<PartKind, number>();
  for (const ref of refs) {
    const next = (counts.get(ref.kind) ?? 0) + 1;
    if (next > PER_KIND_CAP[ref.kind]) return badSignal("too many parts of one kind");
    counts.set(ref.kind, next);
  }

  const out: SignalPart[] = [];
  for (const ref of refs) {
    const part = materializeOne(ref, input);
    if ("ok" in part) return part;
    out.push(part);
  }

  return { ok: true, parts: orderParts(out) };
}

/**
 * Canonical order, imposed on BOTH paths. `sort` is stable (ES2019 onward),
 * so two archives keep the order the composer put them in relative to each
 * other — they are a comparison, and which is first is the comparison's
 * direction rather than a fingerprint.
 */
export function orderParts(parts: readonly SignalPart[]): readonly SignalPart[] {
  const rank = (p: SignalPart): number => PART_ORDER.indexOf(p.kind);
  return parts.slice().sort((a, b) => rank(a) - rank(b));
}

/**
 * The archive builder, shared by both paths so a windowed light record has
 * ONE shape in the game. traffic.ts hands it a counterpart's light-view of
 * the player (the universal source a seeded civilization can always speak
 * from); the human path hands it the sender's own history or an observed one.
 */
export function buildArchivePart(
  subjectStarId: string,
  ofSelf: boolean,
  history: readonly { readonly fromYear: number; readonly level: number }[],
  toYear: number,
  window: ArchiveWindow,
): ArchivePart {
  const fromYear = toYear - ARCHIVE_WINDOW_YEARS[window];
  return {
    kind: "archive",
    subjectStarId,
    ofSelf,
    fromYear,
    toYear,
    samples: sampleWindow(history, fromYear, toYear),
  };
}

/** Which moves this side may make right now, for the composer's chips and
 *  for the wire rail. The same predicate the materializer refuses on, so a
 *  chip the client shows is a chip the server will accept. */
export function accordAvailability(view: AccordView): {
  readonly canOffer: boolean;
  readonly canAccept: boolean;
  readonly canDecline: boolean;
  readonly canWithdraw: boolean;
} {
  return {
    canOffer: accordMoveAvailable(view, "offer"),
    canAccept: accordMoveAvailable(view, "accept"),
    canDecline: accordMoveAvailable(view, "decline"),
    canWithdraw: accordMoveAvailable(view, "withdraw"),
  };
}

function materializeOne(ref: PartRef, input: MaterializeInput): SignalPart | MaterializeFailure {
  switch (ref.kind) {
    case "finding":
      return materializeFinding(ref.starId, ref.depth, input);
    case "sighting":
      return materializeSighting(ref.starId, input);
    case "archive":
      return materializeArchive(ref.starId, ref.window, input);
    case "culture":
      return materializeCulture(ref.source, ref.index, input);
    case "request":
      return materializeRequest(ref.want, ref.starId, input);
    case "verdict":
      return materializeVerdict(ref.signalId, ref.partIndex, ref.stance, input);
    case "accord":
      return materializeAccord(ref.move, ref.ref, input);
  }
}

function materializeFinding(
  starId: string,
  depth: FindingDepth,
  input: MaterializeInput,
): FindingPart | MaterializeFailure {
  const study = input.studies[starId];
  if (study === undefined) return unavailable("no study there");
  // Only a CALLED study carries a frozen belief. A grounded one settled from
  // the ground and froze nothing, and re-deriving its distribution here would
  // send a belief that had moved since — the exact thing freezing exists to
  // prevent (studies.ts: the call is never scored against the live board).
  const call = study.called;
  if (study.status !== "called" || call === null) return unavailable("that study made no call");
  const evidence: QuestionId[] =
    depth === "headline"
      ? []
      : study.bought
          .filter((b) => b.boughtYear <= call.calledYear)
          .slice(0, MAX_EVIDENCE_PER_FINDING)
          .map((b) => b.id);
  return {
    kind: "finding",
    subjectStarId: study.starId,
    hypothesisId: call.hypothesisId as HypothesisId,
    label: call.label,
    gloss: call.gloss,
    share: call.share,
    basis: "called",
    asOfYear: call.asOfYear,
    calledYear: call.calledYear,
    evidence,
  };
}

/** THE ONE RESTRAINT ON COORDINATES: you may only name a star in YOUR OWN
 *  visible sky. A civilization nobody can see is unleakable, which makes
 *  darkness the thesis it is meant to be, and it costs a leaker one
 *  observation of their own for every star they give away. */
function materializeSighting(
  starId: string,
  input: MaterializeInput,
): SightingPart | MaterializeFailure {
  const seen = visibleSky(input.galaxy, input.senderId, input.nowYear).find(
    (o) => o.starId === starId,
  );
  if (seen === undefined) return unavailable("nothing of yours is there");
  return {
    kind: "sighting",
    subjectStarId: seen.starId,
    signalClass: seen.signal.classification,
    asOfYear: seen.asOfYear,
  };
}

function materializeArchive(
  starId: string,
  window: ArchiveWindow,
  input: MaterializeInput,
): ArchivePart | MaterializeFailure {
  const self = civAtStar(input.galaxy, starId);
  const ofSelf = self !== undefined && self.seed.id === input.senderId;
  const span = ARCHIVE_WINDOW_YEARS[window];

  // Self-disclosure: the sender's OWN history, sampled at years at or before
  // now. `emissionAt` breaks on the first future epoch, so a seeded dark turn
  // that has not happened yet cannot be sampled and cannot leak.
  if (ofSelf) {
    const history = self.seed.emissionHistory;
    const toYear = input.nowYear;
    return {
      kind: "archive",
      subjectStarId: starId,
      ofSelf: true,
      fromYear: toYear - span,
      toYear,
      samples: sampleWindow(history, toYear - span, toYear),
    };
  }

  // A third party: the OBSERVED history, already clipped strictly at the
  // sender's own light-departure year by the knowledge layer. A study record
  // is what makes the star the sender's business; an OPEN one is enough,
  // which is what gives a first exchange something to trade.
  if (input.studies[starId] === undefined) return unavailable("no study there");
  const seen = visibleSky(input.galaxy, input.senderId, input.nowYear).find(
    (o) => o.starId === starId,
  );
  if (seen === undefined) return unavailable("nothing of yours is there");
  const toYear = seen.asOfYear;
  return {
    kind: "archive",
    subjectStarId: starId,
    ofSelf: false,
    fromYear: toYear - span,
    toYear,
    samples: sampleWindow(seen.signal.lightHistory, toYear - span, toYear),
  };
}

/** ARCHIVE_SAMPLES evenly spaced reads, oldest first. Deterministic, so two
 *  archives of the same window taken in the same year are byte-identical and
 *  the downsample is never a fingerprint. */
function sampleWindow(
  history: readonly { readonly fromYear: number; readonly level: number }[],
  fromYear: number,
  toYear: number,
): readonly ArchiveSample[] {
  const step = (toYear - fromYear) / (ARCHIVE_SAMPLES - 1);
  const out: ArchiveSample[] = [];
  for (let i = 0; i < ARCHIVE_SAMPLES; i++) {
    const year = fromYear + step * i;
    out.push({ year, level: quantize(emissionAt(history, year)) });
  }
  return out;
}

function materializeCulture(
  source: CultureSource,
  index: number,
  input: MaterializeInput,
): CulturePart | MaterializeFailure {
  // Resolved by civ id rather than by star, so a sender whose own star lookup
  // ever failed could not fall through to somebody else's charter.
  const me = input.galaxy.civs.find((c) => c.seed.id === input.senderId);
  if (me === undefined) return unavailable("no self there");
  switch (source) {
    case "charter":
      return charterPart(me.seed);
    case "chronicle": {
      const line = me.seed.chronicle[index];
      if (line === undefined) return unavailable("no such line");
      return { kind: "culture", source: "chronicle", index, axis: null, pole: null, text: line };
    }
    case "dial": {
      const axis = DIAL_AXES[index];
      if (axis === undefined) return unavailable("no such dial");
      const dial = me.seed.dials[axis.id];
      const leaning = dial.position < 0 ? axis.left : axis.right;
      return {
        kind: "culture",
        source: "dial",
        index,
        axis: axis.id,
        pole: leaning.inWorld,
        text: leaning.gloss,
      };
    }
  }
}

function materializeRequest(
  want: RequestWant,
  starId: string | null,
  input: MaterializeInput,
): RequestPart | MaterializeFailure {
  if (starId === null) return { kind: "request", want, subjectStarId: null };
  const mine = input.galaxy.civs.find((c) => c.seed.id === input.senderId);
  const isSelf = mine !== undefined && mine.starId === starId;
  const seen =
    isSelf ||
    visibleSky(input.galaxy, input.senderId, input.nowYear).some((o) => o.starId === starId);
  if (!seen) return unavailable("nothing of yours is there");
  return { kind: "request", want, subjectStarId: starId };
}

function materializeVerdict(
  signalId: string,
  partIndex: number,
  stance: VerdictStance,
  input: MaterializeInput,
): VerdictPart | MaterializeFailure {
  // A verdict resolves ONLY inside this thread, and only to a row that has
  // actually landed on the sender. Anything else is structurally illegal
  // rather than unavailable: the client is naming something that is not
  // there, which is a malformed signal and not a missing capability.
  const row = input.thread.find((r) => r.wireId === signalId);
  if (row === undefined) return badSignal("no such signal here");
  if (partIndex >= row.partKinds.length) return badSignal("no such part there");
  return { kind: "verdict", signalId: row.internalId, partIndex, stance };
}

function materializeAccord(
  move: AccordMove,
  ref: string | null,
  input: MaterializeInput,
): AccordPart | MaterializeFailure {
  if (!accordMoveAvailable(input.accord, move)) return unavailable("that move is not open");
  if (move === "offer" || move === "withdraw") {
    return { kind: "accord", form: "mutual-quiet", move, ref: null };
  }
  // Accept and decline answer the offer that landed. The client may name it;
  // if it names anything else, that is a malformed signal. If it names
  // nothing, the derived open offer is used, because there is exactly one.
  const open = input.accord.openOfferId;
  if (open === null) return unavailable("that move is not open");
  if (ref !== null) {
    const row = input.thread.find((r) => r.wireId === ref);
    if (row === undefined || row.internalId !== open) return badSignal("no such offer here");
  }
  return { kind: "accord", form: "mutual-quiet", move, ref: open };
}

// ---------------------------------------------------------------------------
// The wire pass
// ---------------------------------------------------------------------------

/**
 * Re-render every internal reference into ONE VIEWER'S OWN `sig/N` namespace,
 * on the way out. A reference the viewer cannot see (a row above their
 * truncation, or one that has not landed on them) becomes null rather than
 * leaking an id, which is also the honest render: they cannot see what it
 * points at.
 *
 * This is the only function in the module that touches an id after
 * materialization, and it is the reason the underlying ids never reach a
 * client.
 */
export function renderPartsForViewer(
  parts: readonly SignalPart[],
  wireIdOf: (internalId: string) => string | null,
): readonly SignalPart[] {
  return parts.map((part) => {
    if (part.kind === "verdict") return { ...part, signalId: wireIdOf(part.signalId) ?? "" };
    if (part.kind === "accord") {
      return { ...part, ref: part.ref === null ? null : wireIdOf(part.ref) };
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Part parity
// ---------------------------------------------------------------------------

/**
 * THE INDISTINGUISHABILITY LEDGER, and `npm run audit:parity` is what keeps
 * it honest.
 *
 * The claim it encodes: EVERY PART KIND A HUMAN CAN SEND IS ALSO SENT BY SOME
 * SEEDED COUNTERPART, and every kind a counterpart sends is offered to
 * humans. Without it, one part kind that only ever arrives from an AI (or one
 * a player can send and never receive) is a population-level tell that no
 * amount of byte-level parity in the wire shape would cover.
 *
 * `human: true` on every row is not decoration: it is the second direction of
 * the audit, and a row that ever needs it false is a row that has to be
 * argued about first.
 */
export interface PartParityRow {
  readonly kind: PartKind;
  /** Counterpart classes that emit this kind. Never empty. */
  readonly aiClasses: readonly CounterpartClass[];
  /** Offered in the human composer's own selector vocabulary. */
  readonly human: true;
  /** Where the emitting arm lives, for a reader chasing a row. */
  readonly note: string;
}

export const PART_PARITY: readonly PartParityRow[] = [
  {
    kind: "finding",
    aiClasses: ["congress", "lantern"],
    human: true,
    note: "a reading of a source in its own sky, frozen at its own call year",
  },
  {
    kind: "sighting",
    aiClasses: ["lantern", "congress"],
    human: true,
    note: "reciprocated sighting for sighting; a whisperer refuses, and so may a human",
  },
  {
    kind: "archive",
    aiClasses: ["lantern", "congress", "whisperer"],
    human: true,
    note: "the universal source: its light-view of the player, and its own history",
  },
  {
    kind: "culture",
    aiClasses: ["whisperer", "lantern"],
    human: true,
    note: "charter on the opening beat; a chronicle line in place of a refused sighting",
  },
  {
    kind: "request",
    aiClasses: ["lantern", "whisperer"],
    human: true,
    note: "a lantern wants more; a whisperer asks for the one thing it wants",
  },
  {
    kind: "verdict",
    aiClasses: ["congress"],
    human: true,
    note: "minutes of a meeting: an archive and a verdict on the finding that prompted it",
  },
  {
    kind: "accord",
    aiClasses: ["whisperer", "lantern", "congress"],
    human: true,
    note: "whisperer accepts, lantern declines, congress defers on a close vote then answers",
  },
];
