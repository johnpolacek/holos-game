// The voice banks — the mind's one-time lines (AV1).
//
// This is the projection of docs/prose-style.md (§2's register map rows for
// these surfaces, §4's voice cards) the way minds.ts is the projection of
// act2-minds.md: prose-style.md governs, this file is the machine-readable
// bank cohort.ts assembles onto the wire. It is consumed by cohort.ts only
// and is NEVER re-exported through protocol.ts as a runtime value — it
// imports minds.ts at runtime (for ArchetypeId and archetype identity), and
// protocol.ts's whole discipline is keeping catalog runtime code off the
// client (the archetypeName precedent, protocol.ts's own comment at the A1
// wire section). Only rendered strings cross the wire, via the "voice"
// server message.

import type { ArchetypeId } from "./minds";
import { REAL_MS_PER_GAME_YEAR } from "./clock";

// ---------------------------------------------------------------------------
// The pinned-fact scheme (prose-style.md R-1/R-2: facts and labels
// byte-exact). AV4 inherits this scheme for its style gate; AV1 needs it
// now for the clock line, the one AV1 string with numbers in it.
// ---------------------------------------------------------------------------

export type FactKind = "realDuration" | "ratio";

/**
 * A fact formatted EXACTLY ONCE, at its constructor. The only way a number
 * reaches prose (prose-style.md R-1/R-2, facts and pinned labels
 * byte-exact): a bank string may never interpolate a raw number or
 * string, only a Fact built by one of the F constructors below.
 */
export interface Fact {
  readonly kind: FactKind;
  readonly text: string;
}

export const F = {
  /**
   * "5 minutes", "4 minutes 30 seconds", "1 hour", "1 hour 30 minutes" —
   * grammatical under any retune of REAL_MS_PER_GAME_YEAR (clock.ts's
   * "the ratio is a tuning target, not scripture" decision). Decomposes
   * into hours/minutes/seconds and prints only the non-zero parts,
   * singular/plural correct.
   */
  realDuration: (ms: number): Fact => {
    const totalSeconds = Math.round(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
    if (seconds > 0) parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
    const text = parts.length > 0 ? parts.join(" ") : "0 seconds";
    return { kind: "realDuration", text };
  },
  /** "12", "13.3" — one decimal, trailing ".0" dropped. */
  ratio: (n: number): Fact => {
    const rounded = Math.round(n * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return { kind: "ratio", text };
  },
} as const;

export type Segment =
  | { readonly t: "text"; readonly text: string }
  | { readonly t: "fact"; readonly fact: Fact };

export interface PinnedLine {
  readonly segments: readonly Segment[];
}

/**
 * Tagged template: interpolations are typed Fact, so a raw number or
 * string in a bank is a compile error — the pinned-fact scheme enforced
 * by the type system, not just by review.
 */
export function line(
  strings: TemplateStringsArray,
  ...facts: readonly Fact[]
): PinnedLine {
  const segments: Segment[] = [];
  strings.forEach((str, i) => {
    if (str.length > 0) segments.push({ t: "text", text: str });
    const fact = facts[i];
    if (fact !== undefined) segments.push({ t: "fact", fact });
  });
  return { segments };
}

export function render(l: PinnedLine): string {
  return l.segments.map((s) => (s.t === "text" ? s.text : s.fact.text)).join("");
}

/** The byte-exact tokens AV4's style gate must find in generated output. */
export function pinnedTokens(l: PinnedLine): readonly string[] {
  return l.segments.filter((s): s is { t: "fact"; fact: Fact } => s.t === "fact").map(
    (s) => s.fact.text,
  );
}

// ---------------------------------------------------------------------------
// Bank keying
// ---------------------------------------------------------------------------

export type ByArchetype<T> = Readonly<Record<ArchetypeId, T>>;

// ---------------------------------------------------------------------------
// The arrival lines — the mind's first words after the ceremony's
// pull-back (prose-style.md §2 "Arrival line" row: archetype voice, wit
// ceiling 3; length per R-26). FINAL — byte-exact, transcribed from the
// settled AV1 design; do not edit, do not "improve".
// ---------------------------------------------------------------------------

const ARRIVAL_LINES: ByArchetype<PinnedLine> = {
  beacon: line`Everything we have ever done is written down and, characteristically, broadcast. From here the page is blank. Filling it is what you are for.`,
  tide: line`The account of what we have taken is current to this morning. Everything after it is unclaimed. You will want to start early; there is a great deal of everything.`,
  monument: line`The record is complete to this morning, and preserved, as all things here are preserved. Past this morning there is nothing to keep yet. You are how we come to have more.`,
  cloister: line`Our history is closed and accurate to the hour. Nothing further has been decided, and nothing further will be decided by anyone outside this system. That leaves you.`,
  shepherd: line`The record runs complete up to now, and the ones we stand over will never read a line of it. What comes after is yours, and just as unseen.`,
  sowing: line`The record is complete to this morning, in more copies than we have bothered to count. None of them says what happens next. You do.`,
  herald: line`Our whole account is finished as of today and already outbound, to listeners who will hear it long after we are done. The rest is blank. Give them something worth receiving.`,
  engine: line`Everything up to now is recorded and reconciled. Past that the schedule is empty. You are the input it has been waiting on.`,
  congress: line`The record is complete up to today; on that much, all of us agree. What comes next is open, and we have been arguing since dawn. You are the vote that settles it.`,
  phoenix: line`Up to now, it is all on the record. Those entries belong to selves we are no longer, and we read them exactly once. What you add, we will read once as well.`,
};

/** The arrival line for an archetype, rendered. */
export function arrivalLine(a: ArchetypeId): string {
  return render(ARRIVAL_LINES[a]);
}

// ---------------------------------------------------------------------------
// The frame lines — archetype-neutral, each shown once at the moment its
// surface first appears (a per-player `seen` set; see cohort.ts's
// VoiceState). Kept internally as PinnedLine consts built with the `line`
// tag for a uniform shape AV4's report/proposal banks will share.
// ---------------------------------------------------------------------------

/** Observatory deadpan, wit 0 (prose-style.md §2). Shown once, first
 *  source-card open. */
const AGE_CHIP_LINE: PinnedLine =
  line`The age on the chip is the light's own: this source is shown as it was when that light left, not as it is. Nothing outside this system is ever current.`;

export function ageChipLine(): string {
  return render(AGE_CHIP_LINE);
}

/** Observatory deadpan, wit 0. Shown once, first hub open. Deliberately
 *  numeral-free — the rate is printed on the budget chip an inch above it. */
const COMPUTE_LINE: PinnedLine =
  line`Compute is this civilization's attention: instrument time, and the thinking done with it. It buys questions and pays for projects, and it accrues on its own, spent or not.`;

export function computeLine(): string {
  return render(COMPUTE_LINE);
}

/**
 * The mind stating physics, wit 1. Both figures derive from clock.ts's
 * REAL_MS_PER_GAME_YEAR — never a literal (prose-style.md R-1/R-2): the
 * real-duration side is "how long a game year takes you", the ratio side
 * is its inverse, "how many game years an hour of your day is".
 */
const CLOCK_LINE: PinnedLine =
  line`A year of ours takes ${F.realDuration(REAL_MS_PER_GAME_YEAR)} of yours; an hour of your day is ${F.ratio(3_600_000 / REAL_MS_PER_GAME_YEAR)} of our years. We go on without you, and the light goes on arriving.`;

export function clockLine(): string {
  return render(CLOCK_LINE);
}

// ---------------------------------------------------------------------------
// The voice cards — prose-style.md §4, columns "Voice signature", "What
// its wit sounds like", and "DON'T", transcribed VERBATIM. The code table
// is a projection of §4, never an edit of it (§7's sync-obligation row
// pattern, extended to this new bank). AV4's prompt payload reads this;
// AV1 ships it as the authoring guardrail reviewers check new banks
// against.
// ---------------------------------------------------------------------------

export interface VoiceCard {
  readonly signature: string;
  readonly witSource: string;
  readonly dont: string;
}

export const VOICE_CARDS: ByArchetype<VoiceCard> = {
  beacon: {
    signature: "Warm, generous, unembarrassed",
    witSource: "Self-aware about its own brightness; jokes at its vanity, never at others",
    dont: "Surprise — it's us again, being magnificent.",
  },
  tide: {
    signature: "Hungry, cheerful, unsentimental",
    witSource: "Comic appetite; the cosmos as inventory, with genuine good humor",
    dont: "Nom nom, another galaxy for lunch.",
  },
  monument: {
    signature: "Liturgical, grave, still",
    witSource: "Dry as reliquary dust; understatement so deep it reads as ceremony",
    dont: "We're basically a very serious library, ha.",
  },
  cloister: {
    signature: "Cold, precise, sealed",
    witSource: "Deadpan refusal; menace kept impeccably polite",
    dont: "Do not disturb — genius at work.",
  },
  shepherd: {
    signature: "Protective, patient, understated",
    witSource: "Gentle irony that never lands on the ward; scale hidden inside care",
    dont: "We got strong so the little guys wouldn't have to.",
  },
  sowing: {
    signature: "Quiet, dispersed, wry",
    witSource: "Comedy of absence — everywhere, announcing nothing",
    dont: "Ghosting the galaxy, one system at a time.",
  },
  herald: {
    signature: "Elegiac, transmitting, contradictory",
    witSource: "Bittersweet; lives openly in its own paradox and finds it funny",
    dont: "Smash that subscribe on our eternal broadcast.",
  },
  engine: {
    signature: "Cold, exact, work-fixed",
    witSource: "Bureaucratic deadpan; sentiment logged as a tolerated error",
    dont: "Feelings? They don't scale.",
  },
  congress: {
    signature: "Plural, deliberative, argumentative",
    witSource: "The self already arguing; wit is the internal minority report",
    dont: "Motion to be hilarious carried unanimously.",
  },
  phoenix: {
    signature: "Restless, shedding, unmoored",
    witSource: "Wit at the expense of its own past selves; owes yesterday nothing",
    dont: "New us, who dis? Old us was cringe.",
  },
};
