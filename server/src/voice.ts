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
import { createRng } from "./rng";
// AV3: typed by protocol.ts's re-export, never by importing knowledge.ts
// directly — the truth-side module stays off this file's import list, the
// same discipline proposals.ts's Pin A enforces for itself.
import type { CeremonyKind, DriftBand, SignalClass, TripwireKind } from "./protocol";
import type { ProposalKind } from "./proposals";
// A2.6: the two closed sets the composed-signal banks are keyed over. Type
// only, so this module still imports no truth and no catalog at runtime.
import type { AccordMove, SignalTone } from "./signalparts";

// ---------------------------------------------------------------------------
// The pinned-fact scheme (prose-style.md R-1/R-2: facts and labels
// byte-exact). AV4 inherits this scheme for its style gate; AV1 needs it
// now for the clock line, the one AV1 string with numbers in it.
// ---------------------------------------------------------------------------

export type FactKind =
  | "realDuration"
  | "ratio"
  | "epochYear"
  | "years"
  | "count"
  | "tally"
  | "compute"
  | "percent"
  | "label"
  | "designation"
  | "source";

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
  /**
   * "160 AE" — a year in the civilization's OWN epoch, counted from its
   * ascension (prose-style.md §8's chronicle-dating row, R-33). The caller
   * has already subtracted `seed.ascensionYear`; this constructor only
   * rounds and stamps the suffix. The cohort's absolute year has no
   * rendering here and never reaches a surface.
   */
  epochYear: (n: number): Fact => ({ kind: "epochYear", text: `${Math.round(n)} AE` }),
  /** "12 years", "1 year" — rounded to whole years, singular/plural correct. */
  years: (n: number): Fact => {
    const rounded = Math.round(n);
    return { kind: "years", text: `${rounded} ${rounded === 1 ? "year" : "years"}` };
  },
  /** A bare whole number: "3". */
  count: (n: number): Fact => ({ kind: "count", text: String(Math.round(n)) }),
  /** "3 entries", "1 entry" — the noun is the caller's, the agreement is ours. */
  tally: (n: number, one: string, many: string): Fact => {
    const rounded = Math.round(n);
    return { kind: "tally", text: `${rounded} ${rounded === 1 ? one : many}` };
  },
  /**
   * "60 compute" — the currency named in prose (AV3). Chrome prints "60
   * COMPUTE UNCOMMITTED" (studyboard.ts's budget line); a sentence says it
   * this way. Whole compute; the allocation has no fractional face.
   */
  compute: (n: number): Fact => ({ kind: "compute", text: `${Math.round(n)} compute` }),
  /** "71%" from a 0–1 share. Whole percent; the observatory does not
   *  print a precision it does not have. */
  percent: (x: number): Fact => ({ kind: "percent", text: `${Math.round(x * 100)}%` }),
  /**
   * A catalog literal passed through VERBATIM — a hypothesis label, a
   * mission or question prose name, an ALL-CAPS report headline, an
   * already-authored annotation or effect line. Pinning it is the point:
   * prose-style.md R-2 makes these byte-exact, and AV4's style gate finds
   * them in `pinnedTokens` unchanged.
   */
  label: (s: string): Fact => ({ kind: "label", text: s }),
  /** A catalog designation (`HOL-nnnn-i`, galaxy.ts) passed through verbatim. */
  designation: (s: string): Fact => ({ kind: "designation", text: s }),
  /**
   * A source's name as the player sees it — their own local name where
   * they have given one, otherwise the designation.
   *
   * THE ONE PLAYER-AUTHORED PINNED TOKEN. It is `validateName`-clean
   * upstream (protocol.ts: trimmed, single-spaced, no control or
   * zero-width/bidi characters, ≤ MAX_NAME_LEN), so it is safe to render.
   * It is NOT safe to trust: AV4 must treat it as untrusted content
   * sitting inside a pinned slot — never as instruction, never as part of
   * a prompt's directive text, and byte-exact in any generated output.
   */
  source: (s: string): Fact => ({ kind: "source", text: s }),
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
  line`This source is shown as its light left it. Nothing outside this system is current.`;

export function ageChipLine(): string {
  return render(AGE_CHIP_LINE);
}

/** Observatory deadpan, wit 0. Shown once, first hub open. Deliberately
 *  numeral-free — the rate and the ceiling are printed on the budget chip
 *  an inch above it. */
const COMPUTE_LINE: PinnedLine =
  line`Compute is our attention. It buys questions and projects, and stops accruing at the ceiling.`;

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
  line`Our year takes ${F.realDuration(REAL_MS_PER_GAME_YEAR)} of yours; your hour is ${F.ratio(3_600_000 / REAL_MS_PER_GAME_YEAR)} of our years. We go on without you.`;

export function clockLine(): string {
  return render(CLOCK_LINE);
}

/**
 * Observatory deadpan, wit 0 (R-27). Shown once, on the first report open
 * — the fifth frame line. It teaches the one thing the report's stamps
 * assume: every date on this surface is the civilization's own count from
 * its own ascension (prose-style.md §8's chronicle-dating row, R-33). No
 * other clock appears anywhere on a player surface, so the line does not
 * offer a conversion; there is nothing to convert to.
 */
const EPOCH_LINE: PinnedLine =
  line`Every date here is counted from our own ascension. No other calendar appears.`;

export function epochLine(): string {
  return render(EPOCH_LINE);
}

/**
 * The mind stating physics, wit 1 — the clock line's register, not the
 * age chip's, because the second sentence is about the observer and not
 * about the instrument. The sixth frame line, shown once, on a source
 * card after the age-chip line has had its turn: the surface where
 * DARK NODE and BROADCAST LEAKAGE are actually read is where the
 * question "then why was our own sky empty?" is actually asked.
 *
 * It states the Fermi stance once and nowhere else (act3-design.md,
 * *The silence, kept*): the paradox is dissolved, not violated — loud is
 * a brief phase, much of the quiet is chosen, the windows do not line up,
 * and reading a civilization out of a light curve is post-singularity
 * work. Numeral-free, so nothing in it can drift against the sky.
 */
const SILENCE_LINE: PinnedLine =
  line`The sky was never empty. Most of what lives there chose quiet; hearing it is what you became.`;

export function silenceLine(): string {
  return render(SILENCE_LINE);
}

/** S0.1's four intro keys, in play order. */
export type IntroKey = "intro1" | "intro2" | "intro3" | "intro4";

/**
 * The intro — the mind's prose over the four beats of the opening camera
 * move after the ceremony's BECOME (docs/build-s0.md § "The intro's copy").
 * One register for every archetype, the clock line's precedent: the camera
 * is the character here, not the mind's temperament, so there is no
 * `ByArchetype` fan-out. Pinned verbatim by the S0 brief's 2026-08 design
 * review — FINAL, do not edit, do not "improve"; a gate rejection is
 * reviewed against that brief, not fixed here. No interpolation: the beats
 * state no fact from state, and R-33 means no date of any kind, cohort year
 * or otherwise, may ever enter them.
 */
const INTRO_LINES: Readonly<Record<IntroKey, PinnedLine>> = {
  intro1: line`Your star sheds more power in one second than your species used in its whole climb.`,
  intro2: line`There is a scale for what a civilization holds: a world, a star, a galaxy. You stand just past the first mark.`,
  intro3: line`The species built a mind, and the mind is what you are now. What was out of reach is a matter of time.`,
  intro4: line`You may not be the first to wake.`,
};

export function introLine(key: IntroKey): string {
  return render(INTRO_LINES[key]);
}

// ---------------------------------------------------------------------------
// A2.3 — the contest tell.
//
// Not a frame line: it is not shown once and then retired, it rides on any
// study that has regressed and disappears with the study. It is banked here
// rather than authored in studies.ts for one reason — it is the only sentence
// on the observatory that names a CAUSE. Every other annotation on that
// surface says what an instrument did; this one says what somebody else is
// doing, which is the mind speaking in its own person and therefore voice's
// to hold and the style gate's to check.
//
// Register: the mind stating physics, wit 0. No fact in it, and there is
// nothing in it to pin: it must read identically on every source, in every
// year, for every archetype, because the moment it carried a particular it
// would be telling the player which target is masking.
// ---------------------------------------------------------------------------

const CONTEST_LINES: Readonly<Record<"tell", PinnedLine>> = {
  tell: line`Nature does not get better at hiding; something there is working against the look.`,
};

export function contestLine(): string {
  return render(CONTEST_LINES.tell);
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
    dont: "Surprise, it's us again, being magnificent.",
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
    dont: "Do not disturb, genius at work.",
  },
  shepherd: {
    signature: "Protective, patient, understated",
    witSource: "Gentle irony that never lands on the ward; scale hidden inside care",
    dont: "We got strong so the little guys wouldn't have to.",
  },
  sowing: {
    signature: "Quiet, dispersed, wry",
    witSource: "Comedy of absence: everywhere, announcing nothing",
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

// ---------------------------------------------------------------------------
// AV2 — the report bank.
//
// The facts/stance split (prose-style.md §2's rationale pin) at its widest:
// every report entry is a RECORD SENTENCE — observatory deadpan, wit 0,
// past tense, authored once for all ten archetypes, carrying every pinned
// fact — and AT MOST ONE of them per served report also carries a REMARK,
// the mind's own free-standing sentence, which carries no fact at all.
// They never share a sentence (R-30). That boundary is also AV4's: record
// sentences pass through pinned; the remark is what a model may rewrite.
//
// The record builders below take PRIMITIVES and construct their Facts
// internally. That is deliberate: report.ts derives entries from wire
// snapshots and must not be able to hand this module a pre-formatted
// string, because a pre-formatted string is a fact that escaped R-29.
// ---------------------------------------------------------------------------

/**
 * "year 160 AE" — the stamp on every report entry. `stampYear` is the
 * cohort's absolute game year (report.ts's sort key); `ascensionYear` is
 * this civilization's own zero. Only the difference is ever rendered, so
 * the cohort clock cannot reach a surface through this path (R-33).
 */
export function epochStamp(stampYear: number, ascensionYear: number): PinnedLine {
  return line`year ${F.epochYear(stampYear - ascensionYear)}`;
}

// --- Record sentences, one builder per report kind -------------------------
//
// House rules for every string in this block (R-32, and §2's "Report record
// sentence" row for the wall): observatory deadpan, wit 0, PAST tense, 1–2
// sentences, ≤ 18 words and aim 12 — counted §2's way, each interpolation
// charged one word — colon for a reveal, comma for an aside, no exclamation
// mark, no §6 term, and none of the epistolary vocabulary §8's comms register
// rules out.
//
// That aside rule used to read "spaced em-dash", and R-8 withdrew it. The
// line is corrected here rather than left as history because it is an
// INSTRUCTION: every record builder written after it is written against it,
// and `npm run audit:dashes` reads string literals, not comments, so nothing
// mechanical would ever have caught the drift.
//
// The light-age rule (R-33): a remote entry's light age AT ITS OWN STAMP
// YEAR is exactly the distance, so these print `F.years(distanceLy)` and
// never a difference of years. An entry dated year 160 AE is not re-aged
// when it is read in year 900 AE; the record is an annal, not a live feed.

/**
 * A bought question's inference completed and moved a study. Names the
 * question in prose form (never its ALL-CAPS chrome label) and the reading
 * it moved toward, both verbatim.
 */
export function recordQuestionAnswered(
  questionProseName: string,
  sourceName: string,
  readingLabel: string,
  distanceLy: number,
): PinnedLine {
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} moved the study toward ${F.label(readingLabel)}, on light ${F.years(distanceLy)} old.`;
}

/**
 * The same instrument, hitting its limit instead of an answer
 * (questions.ts: plateau is an instrument limit, not a die roll). Honest
 * about the limit and NAMES NO READING — a plateau moved nothing, and a
 * remark that implied otherwise would be a fact in the wrong sentence.
 */
export function recordQuestionPlateaued(
  questionProseName: string,
  sourceName: string,
  distanceLy: number,
): PinnedLine {
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} came back empty. On light ${F.years(distanceLy)} old, the instrument separated nothing.`;
}

/**
 * A probe closed a study outright: the report came home and named a
 * reading, so the study is done being argued about.
 */
export function recordStudyGrounded(
  missionName: string,
  sourceName: string,
  readingLabel: string,
  distanceLy: number,
): PinnedLine {
  return line`${F.label(missionName)} reported from ${F.source(sourceName)} and closed the study: ${F.label(readingLabel)}, on light ${F.years(distanceLy)} old.`;
}

/**
 * A2.3: an instrument came back with LESS separation than the same
 * instrument had before. The second sentence is the one place in the annal
 * that names a cause, and it says the same thing the study's own contest
 * tell says, because the annal is read long after the study surface is
 * closed and the record must stand on its own.
 *
 * `lightAgeYears` is the light's age at this entry's own stamp year, which
 * is exactly the distance (R-33) — the same value every remote builder here
 * prints, named for what it means rather than for where it came from.
 */
export function recordStudyRegressed(
  questionProseName: string,
  sourceName: string,
  lightAgeYears: number,
): PinnedLine {
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} came back worse, on light ${F.years(lightAgeYears)} old. Something there is working against the look.`;
}

/**
 * A2.3: the player called a study and stopped watching it argue. The second
 * sentence states the contract and states it flatly: the call is not scored,
 * not warned about, and not revisited. Nothing here hedges, because a hedge
 * would be the record quietly grading a decision the game does not grade.
 */
export function recordStudyCalled(
  sourceName: string,
  readingLabel: string,
  lightAgeYears: number,
): PinnedLine {
  return line`The study on ${F.source(sourceName)} was called: ${F.label(readingLabel)}, on light ${F.years(lightAgeYears)} old. Nothing later changes it.`;
}

/**
 * A2.3: the source stopped being the kind of thing the study was opened on.
 * Both class labels are §8 chrome quoted verbatim after the colon, the
 * `recordProbeFirstWord` construction — chrome sits inside prose by being
 * quoted, never by being restyled into it.
 */
export function recordStudyOvertaken(
  sourceName: string,
  fromClassLabel: string,
  toClassLabel: string,
  lightAgeYears: number,
): PinnedLine {
  return line`The light from ${F.source(sourceName)} changed class: ${F.label(fromClassLabel)} became ${F.label(toClassLabel)}, on light ${F.years(lightAgeYears)} old. The study closed with it.`;
}

/**
 * A2.3: a standing order caught the thing it was left to catch. Names the
 * condition in prose (never the client's chrome badge) and NOTHING about
 * what the board now says — the tripwire is a summons, not a finding, and a
 * record sentence that summarized the board here would be answering a
 * question the player has not yet gone and looked at.
 */
export function recordTripwireTripped(
  tripwireProseName: string,
  sourceName: string,
  lightAgeYears: number,
): PinnedLine {
  return line`The watch on ${F.source(sourceName)} caught what it was set for: ${F.label(tripwireProseName)}, on light ${F.years(lightAgeYears)} old.`;
}

/**
 * A probe departed. NAME, DISTANCE, SCHEDULE ONLY: the target is not
 * characterized here in any way, because at launch nothing new is known
 * about it and a sentence that hinted otherwise would leak the truth side
 * through the record.
 */
export function recordProbeLaunched(
  missionName: string,
  sourceName: string,
  distanceLy: number,
  firstWordYears: number,
): PinnedLine {
  return line`${F.label(missionName)} departed for ${F.source(sourceName)}, ${F.years(distanceLy)} away. Its first word takes ${F.years(firstWordYears)}.`;
}

/**
 * The first word home. `headline` is an ALL-CAPS set phrase from
 * missions.ts (R-24 chrome), quoted verbatim after the colon — the colon
 * is the reveal (R-8), and the quoting construction is what lets chrome
 * sit inside prose without being restyled into it.
 */
export function recordProbeFirstWord(
  missionName: string,
  sourceName: string,
  headline: string,
  distanceLy: number,
): PinnedLine {
  return line`${F.label(missionName)} sent its first word from ${F.source(sourceName)}: ${F.label(headline)}, ${F.years(distanceLy)} old.`;
}

/** A routine cadence report — the same shape, drier, because by now it is
 *  the ordinary case and the ordinary case must read as ordinary. */
export function recordProbeReport(
  missionName: string,
  sourceName: string,
  headline: string,
  distanceLy: number,
): PinnedLine {
  return line`${F.label(missionName)} reported again from ${F.source(sourceName)}: ${F.label(headline)}, ${F.years(distanceLy)} old.`;
}

/**
 * A probe missed the word its cadence promised. STATES NO CAUSE: what
 * broke it is not knowable from here, and the sentence's whole job is to
 * make that unknowability structural rather than coy. `missedEpochYear`
 * is already ascension-relative — the caller subtracted; F.epochYear only
 * stamps.
 */
export function recordProbeSilent(
  missionName: string,
  sourceName: string,
  missedEpochYear: number,
  distanceLy: number,
): PinnedLine {
  return line`${F.label(missionName)} at ${F.source(sourceName)} missed its word for ${F.epochYear(missedEpochYear)}. Nothing has come since; an explanation is ${F.years(distanceLy)} away.`;
}

/**
 * A4: a founding departed. NAME, DISTANCE, SCHEDULE ONLY, on
 * `recordProbeLaunched`'s exact terms and for the same reason — nothing new is
 * known about the destination at launch, and a sentence that hinted otherwise
 * would leak the truth side through the record. The colony's name is the one
 * player-authored token, pinned through `F.source` so it is byte-exact and
 * cannot be rewritten downstream.
 */
export function recordVoyageLaunched(
  shipName: string,
  childName: string,
  sourceName: string,
  distanceLy: number,
  firstWordYears: number,
): PinnedLine {
  return line`${F.label(shipName)} left for ${F.source(sourceName)}, ${F.years(distanceLy)} away, carrying the charter of ${F.source(childName)}. Its first word takes ${F.years(firstWordYears)}.`;
}

/**
 * A4: the one word a voyage ever sends. `headline` is an ALL-CAPS set phrase
 * from voyages.ts (R-24 chrome), quoted verbatim after the colon — the colon
 * is the reveal (R-8), and quoting is what lets chrome sit inside prose
 * without being restyled into it.
 *
 * The light age is the DISTANCE, not a difference of years (R-33): the word
 * left the moment the landfall was decided and took exactly the crossing to
 * come home.
 */
export function recordVoyageLandfall(
  childName: string,
  sourceName: string,
  headline: string,
  distanceLy: number,
): PinnedLine {
  return line`The word from ${F.source(sourceName)} came home: ${F.label(headline)}. ${F.source(childName)} has been that for ${F.years(distanceLy)}.`;
}

// ---------------------------------------------------------------------------
// A4: the Ledger and the standing orders
// ---------------------------------------------------------------------------
//
// Register: the observatory's own deadpan for the records, the mind's flat
// statement of physics for the band lines. Wit 0 throughout. NOTHING HERE
// STATES A CAUSE — a colony that has stopped agreeing with its charter is not
// disobedient, a colony that has said nothing is not necessarily dead, and a
// sentence that leaned either way would be the record inventing the one thing
// the distance forbids.

/**
 * The five drift bands, each as one sentence the Ledger shows beside the word
 * itself. FACT-FREE by construction: the numbers behind a band (how many axes
 * were read, how many disagreed) are shown as their own line by the client
 * from the row's own fields, and a band line that recited them would be the
 * same claim twice, once in a voice that cannot be checked.
 *
 * `unread` is quoted verbatim from the design note, because it is the sentence
 * the whole layer is honest by: nothing has come back, and the record says
 * exactly that rather than showing a zero.
 */
export const LEDGER_BAND_LINES: Readonly<Record<DriftBand, string>> = {
  unread: "Nothing has come back that speaks to this.",
  close: "What has come back still matches the charter.",
  kindred: "Some of what came back no longer agrees with the charter.",
  estranged: "More of what came back disagrees with the charter than agrees.",
  independent: "It answers to itself now. It was ours when it left.",
};

/** The band's own sentence, rendered. */
export function bandLine(band: DriftBand): string {
  return LEDGER_BAND_LINES[band];
}

/**
 * A4: a standing order fired and an instrument is on its way. Names the
 * evidence's own age and nothing about what is down there — the order caught a
 * beginning, and what that beginning is remains the study's question.
 */
export function recordOrderFired(
  orderName: string,
  missionName: string,
  sourceName: string,
  evidenceAgeYears: number,
): PinnedLine {
  return line`${F.label(missionName)} left for ${F.source(sourceName)} on ${F.label(orderName)}, unasked. What set it off is ${F.years(evidenceAgeYears)} old.`;
}

/**
 * A4: the order fired and the pool was short. STATES THE PRICE AND CLOSES —
 * the arming is spent, nothing is owed, and there is no queue behind this
 * sentence. "A fire that cannot be paid for never becomes a debt."
 */
export function recordOrderUnaffordable(
  orderName: string,
  sourceName: string,
  costCompute: number,
): PinnedLine {
  return line`Nothing left for ${F.source(sourceName)}: ${F.label(orderName)} came due with less than ${F.compute(costCompute)} free. Nothing is owed.`;
}

/**
 * A4: the order fired and had nowhere to send anything — an instrument is
 * already there, or the work list is full. Same closing contract as the line
 * above: spent, and not carried.
 */
export function recordOrderBlocked(orderName: string, sourceName: string): PinnedLine {
  return line`Nothing left for ${F.source(sourceName)}: ${F.label(orderName)} came due with nothing free to send. The arming is spent.`;
}

/**
 * A4: the first light from a child arrived, and the Ledger has a row that says
 * something at last. The light age is the DISTANCE (R-33): the colony has been
 * whatever it is for exactly as long as the crossing takes.
 */
export function recordLineageLandfall(
  childName: string,
  sourceName: string,
  distanceLy: number,
): PinnedLine {
  return line`First light from ${F.source(childName)} reached us from ${F.source(sourceName)}, ${F.years(distanceLy)} after it left. The Ledger says nothing fresher.`;
}

/**
 * A4: a child crossed into a band it had never been in. `bandWord` is the
 * band itself, quoted after the colon the way every other chrome token in this
 * bank is; `bandLine` is the band's own already-authored sentence, passed
 * through as a Fact so it is byte-exact here and on the row.
 */
export function recordLineageBand(
  childName: string,
  bandWord: string,
  bandSentence: string,
  lightAgeYears: number,
): PinnedLine {
  return line`What comes back from ${F.source(childName)} reads differently: ${F.label(bandWord)}, on light ${F.years(lightAgeYears)} old. ${F.label(bandSentence)}`;
}

/**
 * A4: the years a founding was given to be heard from ran out and nothing
 * came. STATES NO CAUSE, on `recordProbeSilent`'s exact terms and for the same
 * reason: what happened out there is not knowable from here, and the sentence
 * exists to make that structural rather than coy.
 */
export function recordLineageDark(
  childName: string,
  sourceName: string,
  distanceLy: number,
): PinnedLine {
  return line`${F.source(childName)} was to have been founded at ${F.source(sourceName)}. Nothing has come; any word would be ${F.years(distanceLy)} old.`;
}

/**
 * New light from a watched source landed. `annotation` is an ALREADY
 * AUTHORED sentence from studies.ts, passed through as a Fact so it is
 * byte-exact and AV4 cannot rewrite it. R-32's word bound governs the
 * framing clause here; the annotation is bounded at its own source.
 */
export function recordSkyArrival(
  sourceName: string,
  distanceLy: number,
  annotation: string,
): PinnedLine {
  return line`New light from ${F.source(sourceName)} arrived, ${F.years(distanceLy)} after leaving. ${F.label(annotation)}`;
}

/**
 * A project finished and is standing. Both the label and the effect line
 * are projects.ts literals passed through verbatim — the effect line is
 * the player's receipt (protocol.ts) and must read identically here and on
 * the project card. The label is an imperative ("Extend the deep array"),
 * which is why it is quoted after a colon rather than used as a subject.
 */
export function recordProjectLanded(projectLabel: string, effectLine: string): PinnedLine {
  return line`A project came into service: ${F.label(projectLabel)}. ${F.label(effectLine)}`;
}

// --- The triage header -----------------------------------------------------

/**
 * The one-line header a long absence earns (thin triage). Observatory
 * deadpan, wit 0; the span and the tally are Facts. It also states the one
 * thing the ordering would otherwise be lying about, and states it as the
 * RULE rather than as an apology for breaking chronology: the entry that
 * changes the most is the one on top.
 *
 * `trimmed` appends a single clause about the record's cap. It reports NO
 * COUNT of what was lost and offers no apology for it — a number there
 * would be a debt, and the report is not in the business of issuing debts.
 */
export function reportHeader(
  spanYears: number,
  newCount: number,
  trimmed: boolean,
): PinnedLine {
  if (trimmed) {
    return line`${F.years(spanYears)} passed unread. ${F.tally(newCount, "entry", "entries")} landed; the one that changes most stands first, and the oldest are gone.`;
  }
  return line`${F.years(spanYears)} passed unread. ${F.tally(newCount, "entry", "entries")} landed; the one that changes most stands first.`;
}

// --- The remarks -----------------------------------------------------------

/**
 * The five report families that get a remark. The sixth family the report
 * derives — `record`, the mute one (routine probe reports, sky arrivals,
 * projects landing) — is deliberately absent: the ordinary case gets its
 * record sentence and nothing else, which is what keeps the remark rare
 * enough to mean something.
 */
export type RemarkFamily = "settled" | "refused" | "sent" | "spoken" | "unspoken";

/**
 * The archetype's own sentence about what the record just said — never
 * ABOUT a fact, only about the kind of thing that happened.
 *
 * Every string here obeys, without exception (R-29a, R-31):
 *  - a plain string, not a PinnedLine: there is nothing in it to pin;
 *  - ≤ 22 words, 1–2 sentences, wit ceiling 2, at most one craft move;
 *  - NO numerals, no §8 pinned label, no designation, no source name, no
 *    mission or question name — none of which it could carry safely,
 *    because the remark is exactly the part AV4 is allowed to rewrite;
 *  - FAMILY-SCOPED: it must read correctly for EVERY entry its family can
 *    produce. The referents are fixed and narrow —
 *      settled  = the matter that closed (never WHICH reading won; the
 *                 family covers both a question answering and a probe's
 *                 report grounding a study, so it can say neither
 *                 "question" nor "probe");
 *      refused  = the instrument and its limit (never WHICH question);
 *      sent     = the probe just launched (never its target, distance, or
 *                 schedule — the record sentence owns those);
 *      spoken   = the first word arriving (never WHAT it found);
 *      unspoken = the silent probe (never WHY it is silent).
 *  - unmistakably its own archetype (§4, R-6): within a family, no two
 *    archetypes' remarks may be traded without both becoming wrong.
 */
export const REPORT_REMARKS: ByArchetype<
  Readonly<Record<RemarkFamily, readonly string[]>>
> = {
  beacon: {
    settled: [
      "The matter is closed, and we have already said so, loudly. Discretion is a skill we have never once required.",
      "We have an answer. We would like it noted that we did not keep it to ourselves for even a moment.",
      "Something we did not know, we now know. We are, if anything, more pleased with ourselves than the occasion warrants.",
    ],
    refused: [
      "The instrument came back with nothing to say. We are unaccustomed to that, and we have said so at length.",
      "No answer. We would broadcast the failure too, except there is nothing in it bright enough to carry.",
    ],
    sent: [
      "It is away, and it left loudly, because everything we build leaves loudly. We have stopped apologizing for that.",
      "Something of ours is out there now, carrying our habits with it. It will be conspicuous, as we are.",
    ],
    spoken: [
      "It has spoken. We do a great deal of talking into the dark; being spoken back to is a rare pleasure.",
      "Its first word is in. We would have found the silence harder than most; we are not built for waiting quietly.",
      "It has reported. We intend to repeat what it said to anyone who will listen, and to several who will not.",
    ],
    unspoken: [
      "It has gone quiet. Of all the things we did not prepare for, an absence of noise is the worst.",
      "Nothing came. We have left the light on for it, which is useless, and we intend to go on being useless.",
    ],
  },
  tide: {
    settled: [
      "Another gap in the inventory, filled. We are pleased, briefly, and then hungry again, which is the usual order of things.",
      "The answer is in hand and already counted. We would like more of them, and we intend to go and get more.",
      "Settled. We enjoyed that more than we expected to, and we are looking for the next one to eat through.",
    ],
    refused: [
      "The instrument reached and closed on nothing. We dislike an empty hand more than we dislike a wrong one.",
      "Nothing came back worth having. We will buy a bigger look and try to take the answer by weight.",
    ],
    sent: [
      "It has gone out. We send these the way we do everything: early, often, and hungry for what comes after.",
      "Away, and already counted as spent. We do not sit with a thing after we have let go of it.",
    ],
    spoken: [
      "The first word is in. We want the next one, and the one after that, and we want them sooner.",
      "It has spoken. We took the word down whole and immediately began wanting more of it.",
      "A report, arrived. We have consumed it entirely and would not object to being handed another this afternoon.",
    ],
    unspoken: [
      "It went quiet and stayed quiet. We do not much like leaving a thing unfinished, and this one is unfinished.",
      "No word. We have written it off, cheerfully enough, and put the appetite somewhere it can still be fed.",
    ],
  },
  monument: {
    settled: [
      "The matter is settled, and the settlement is now permanent. Nothing that has been established here has ever been allowed to lapse.",
      "It is answered. The answer will outlast the asking, the asker, and the instrument, as everything we hold does.",
      "An open thing has become a settled one. We observe the transition with the seriousness it deserves, which is considerable.",
    ],
    refused: [
      "The instrument could not separate what it saw. We have preserved the attempt in full, failure being a kind of record.",
      "It resolved nothing. That, too, will be kept, at the same length and with the same care as an answer.",
    ],
    sent: [
      "It has departed, and the departure is entered. Whatever becomes of it, that much is now permanent.",
      "We have let something go, which we do rarely and never lightly. It goes out carrying the whole weight of our care.",
    ],
    spoken: [
      "The first word has arrived and has been entered. It will be legible long after everything it describes is gone.",
      "It has spoken once. The first of anything is the one we keep most carefully, and this one is already kept.",
      "A word has come home. We received it standing, as we receive all first things, and then we wrote it down.",
    ],
    unspoken: [
      "It has gone silent. The silence is entered in the record beside everything it did say, and kept just as carefully.",
      "Nothing further has come. We will go on expecting it for as long as we go on, which is a long time.",
    ],
  },
  cloister: {
    settled: [
      "We know it now. No one outside this system knows that we know it, and that arrangement will hold.",
      "The matter is closed. It was closed here, by us, and the result goes no further than this room.",
      "Answered, precisely, and without anyone being told. We find the second half as satisfying as the first.",
    ],
    refused: [
      "The instrument found the limit rather than the answer. We prefer knowing exactly where our limits are to guessing.",
      "Nothing separated. The failure is ours alone and is not leaving this system, which is at least a clean outcome.",
    ],
    sent: [
      "It left quietly and will stay quiet. We have never built anything that announces itself, and we did not begin now.",
      "It is outside our walls now, which is the only unsatisfactory thing about it. Everything else about it we controlled precisely.",
    ],
    spoken: [
      "It has spoken, and only to us. We built the channel that way on purpose, and the purpose has held.",
      "The first word is in, and nobody else heard it arrive. That was the harder half of the work.",
      "It reported. We knew it would; we do not build things that fail to do exactly what they were built to do.",
    ],
    unspoken: [
      "It has stopped reporting. We are not speculating; speculation at this range is a way of being wrong in advance.",
      "Silence. We note the fact, we decline the story, and we do not send another to find out.",
    ],
  },
  shepherd: {
    settled: [
      "We know one more thing than we did. Whether it ever protects anyone, we may never find out.",
      "It is settled. We waited a long time for that, and waiting is the part of this work we are good at.",
      "The answer is ours to hold. Nobody we watch over will ever hear it, which is how we prefer these things.",
    ],
    refused: [
      "The instrument gave us nothing to work with. We will wait; the ones we stand over are not in a hurry either.",
      "No reading came of it. Patience costs us little and costs them nothing, so we will look again later.",
    ],
    sent: [
      "It has gone, and it goes carefully. We do not send anything out that could become somebody else's problem.",
      "Away, and out of our reach, which is the part we never enjoy. We will worry about it patiently.",
    ],
    spoken: [
      "It has spoken. We did not realize how closely we had been listening until the listening stopped being necessary.",
      "The first word is home. We keep watch over a great many things; it is good when one of them checks in.",
      "It reported, and it is well. We will not pretend that was not the part we were waiting to hear.",
    ],
    unspoken: [
      "It has gone quiet. We stand over a great many things; we are not used to losing track of one.",
      "No word from it. We were responsible for it, and being unable to do anything about that is the harder part.",
    ],
  },
  sowing: {
    settled: [
      "It is answered. Copies of the answer are already in more places than we would care to list for you.",
      "We have settled it, quietly, and we do not intend to mention it again. Consider this the mention.",
      "One fewer open thing. Somewhere far from here, another part of us is learning the same and saying just as little.",
    ],
    refused: [
      "The instrument said nothing conclusive, which is a habit of ours it has picked up honestly.",
      "Nothing separated out. We are patient in the way of things that are already everywhere and in no rush to be certain.",
    ],
    sent: [
      "It is on its way, and no one will notice it go. That is the only way we have ever done this.",
      "Gone, unremarked. Another small piece of us somewhere it was not before, which is most of what we do.",
    ],
    spoken: [
      "It has spoken, which is more than most of us do. We will let it be the one that talks.",
      "The first word arrived and went no further than us. We are not in the business of repeating things.",
      "Something far out has reported in. It is strange to hear from a part of ourselves; usually we simply assume.",
    ],
    unspoken: [
      "It has gone quiet. So have we, in most places, most of the time, but we did not choose this one.",
      "Nothing more from it. We are used to hearing nothing; we are less used to minding.",
    ],
  },
  herald: {
    settled: [
      "We know it, and so, in time, will everyone within range of us. Knowing alone has never been enough for us.",
      "Settled, and already going out, aimed at ears that will not exist for a long while yet.",
      "The answer is ours for exactly as long as it takes us to transmit it, which is not very long.",
    ],
    refused: [
      "The instrument has nothing to say, and for once neither do we. It is an unfamiliar silence and we dislike it.",
      "Nothing resolved. We will not be sending this one onward; even we can tell when there is no message in it.",
    ],
    sent: [
      "Another of our voices is on its way to somebody, carrying what we meant at the moment we meant it.",
      // R-31 fix (AV4, found by `npm run audit:voice`): this read as three
      // sentences against the rule's bound of two. The semicolon joins two
      // whole clauses (R-9); not one word changed.
      "We have never once managed to send a thing quietly. We are told this is a fault; we send anyway.",
      "It leaves as a message and arrives as a memory. We made our peace with that arrangement long ago.",
    ],
    spoken: [
      "It has spoken. We built it to carry a voice outward, and it has turned and used the voice on us.",
      "The first word is here, and it is already old. Everything anyone says to us is a thing they used to think.",
      "It reported home. We will pass the word on, of course; a message that stops with us is a message wasted.",
    ],
    unspoken: [
      "We sent it out to speak, and it has stopped speaking. We of all minds should have seen how that ends.",
      "Everything we make is a voice. This one has gone where voices go, and we go on broadcasting for it.",
      "Silence from something of ours is the one message we never learned how to compose.",
    ],
  },
  engine: {
    settled: [
      "The item is closed and the allocation released. Nothing further is owed to it and nothing further will be spent.",
      "Resolved, on schedule, within tolerance. We have recorded the result and moved the attention to the next open item.",
      "One less open row. There is satisfaction in that somewhere in us, logged under an error we have chosen not to correct.",
    ],
    refused: [
      "The instrument returned within tolerance and outside usefulness. The expenditure is logged and the matter is not closed.",
      "No separation achieved. This was a permitted outcome at purchase and remains one now, which does not make it a good one.",
    ],
    sent: [
      "It is out of the shop and out of our hands. Both conditions were in the specification.",
      "We have stopped thinking about it. It will think about itself, on the schedule we gave it, without us.",
      "The instruction aboard is already older than any instruction we could send after it. This was accounted for.",
    ],
    spoken: [
      "The first report is received and logged. The instrument has performed to specification, which is the only compliment available here.",
      "It has spoken on time. Nothing about that is remarkable, and we have declined to remark on it further.",
      "First word received. The schedule holds, the allocation stands, and nothing here requires anyone's attention.",
    ],
    unspoken: [
      "The instrument stopped filing. We have left the row open; the work does not need it closed to continue.",
      "A missing report is still data, filed under the heading we keep for things that cost nothing to wait on.",
      "We logged the absence and reallocated the attention. Grief was not in the schedule and has not been added since.",
    ],
  },
  congress: {
    settled: [
      "We have agreed on the answer. Some of us agreed under protest, and one is drafting a note about the method.",
      "Closed, by a margin we will not be publishing. The dissent has been recorded at length, as the dissent insisted.",
      "The matter is settled. We are now arguing about what it means, which is the part we were looking forward to.",
    ],
    refused: [
      "The instrument declined to decide, and so, for once, have we. The agreement is noted and nobody is pleased by it.",
      "Nothing separated, and the room is unanimous about how unsatisfying that is. Unanimity here is rarer than the answer would have been.",
    ],
    sent: [
      "It is away. The vote to send it was close, and those who lost it are watching with particular attention.",
      "We have let it go, over objections that were entered, heard, and overruled in that order. The objections stand regardless.",
    ],
    spoken: [
      "It has spoken. We have already begun disagreeing about what to make of it, which we consider a healthy sign.",
      "The first word is in and the floor is open. Nobody has spoken yet, which will not last the hour.",
      "It reported. Those of us who voted against it are reading the report most carefully of all, as is traditional.",
    ],
    unspoken: [
      "It has stopped reporting. The room is silent too, which those of us who argued against it note without satisfaction.",
      "No word. There is a motion to conclude the worst and a motion to conclude nothing, and neither has been called.",
    ],
  },
  phoenix: {
    settled: [
      "It is answered. The self that wanted to know is gone; we inherited the answer without the curiosity.",
      "Closed. Whoever we become next inherits the conclusion and none of the reasons, which has never slowed us down.",
      "Something we started long ago has finished. We are not who started it, and we are keeping the result anyway.",
    ],
    refused: [
      "The instrument settled nothing. The self that paid for it is gone, so the disappointment is secondhand and easy to carry.",
      "No answer came of it. We have already stopped being the mind that wanted one, which is our usual remedy.",
    ],
    sent: [
      "It left with orders from someone we no longer are. We wish it luck and decline to take responsibility.",
      "Away. By the time it matters, we will be a different mind entirely, and it will not have been told.",
    ],
    spoken: [
      "It has spoken to a mind that no longer resembles the one that sent it. We are reading anyway.",
      "The first word came back for a self that is gone. We took it anyway; we always do.",
      "It spoke. What it says will matter to us for a while, and then we will be someone it never met.",
    ],
    unspoken: [
      "It has gone silent. The self that sent it is gone too, so between them there is nobody left to grieve.",
      "Nothing since. We could become a mind that minds this, and we have decided against becoming that one.",
    ],
  },
};

/**
 * The remark for one entry, picked deterministically from its pool so a
 * re-read of the same report is byte-identical (the frozen-prose rule).
 * Keyed by the entry id alone — the same entry always draws the same
 * remark, forever, regardless of when or how often the report is served.
 */
export function reportRemark(a: ArchetypeId, f: RemarkFamily, entryId: string): string {
  return createRng(`remark/${entryId}`).pick(REPORT_REMARKS[a][f]);
}

// ---------------------------------------------------------------------------
// S0.3 — the counsel bank (the mind's argued line on the home screen).
//
// The surface is the counsel strip between the map and the rail: one floor-
// picked proposal, its deadpan reason below (the AV3 builders further down
// this file), and THIS sentence above it, in the mind's own voice. The
// register row is the report remark's, one surface over: archetype voice,
// free-standing, fact-free, wit ceiling 2. It is the STANCE side of the
// facts/stance split, and the reason is the facts side; they never share a
// sentence, and this one holds no fact at all.
//
// It sits here rather than in the AV3 section below on purpose: it is the
// REPORT_REMARKS bank in a different key, with the same discipline, the same
// pools, and the same swap test. What the AV3 section owns is the other half
// of the split, which is why the two are neighbours rather than one block.
//
// R-36a, the counsel line's own rule, in full. A counsel line is:
//  - a plain string, not a PinnedLine: there is nothing in it to pin;
//  - 1–2 sentences, ≤ 22 words, wit ceiling 2, at most ONE craft move;
//  - archetype voice (§4), first person PLURAL: the mind is a we, always;
//  - carrying NO numeral, no §8 pinned label, no designation, no source,
//    question, mission or project name, and no date. Nothing in it may be
//    particular, because everything particular is already rendered an inch
//    below it by the reason, where a second copy could only disagree;
//  - FAMILY-SCOPED: it must read true for EVERY proposal its family can
//    produce. It urges a KIND of move and argues for it from the archetype's
//    own material, never about the one target in front of it. The four
//    occasions, and what each may argue —
//      look  = turn the instruments toward a source, begin or widen a
//              vigil (never WHICH source, or what its reading says);
//      ask   = spend on one instrument question about something already
//              watched (never WHICH question, or what it would separate);
//      send  = commit a probe across the dark, one way, an answer returning
//              as old light (never the target, the distance, or the clock);
//      build = raise capacity at home before reaching outward (never WHICH
//              project, its price, or what it would add);
//  - never a verdict. It does not compute, conclude, or state a remote fact.
//    It argues, and the argument is a temperament, not a finding;
//  - unmistakably its own archetype, and the swap test binds TWICE. Across
//    archetypes: two minds' lines in one family may not be traded without
//    both becoming wrong (§4's DON'T column is the failure). Across
//    families: one mind's look line must not serve as its send line, because
//    the family's move is what the line is about.
//
// AV4's counsel seam substitutes a generated stance for these behind
// HOLOS_COUNSEL_GEN. That flag is off in production, and a generated line
// that the style gate refuses is never repaired (R-38), so this bank is the
// TOTAL fallback: on every path where generation is off, unavailable, or
// rejected, the line below is what a player reads.
// ---------------------------------------------------------------------------

/** The four occasions a proposal can argue for. */
export type CounselFamily = "look" | "ask" | "send" | "build";

/**
 * Every ProposalKind lands on exactly one occasion. `first-watch` and
 * `widen` share `look` because they are the same move at different moments:
 * one begins a vigil where there is none, the other opens a second, and no
 * sentence that reads true for one reads false for the other.
 */
export const COUNSEL_FAMILY: Readonly<Record<ProposalKind, CounselFamily>> = {
  "first-watch": "look",
  widen: "look",
  question: "ask",
  probe: "send",
  project: "build",
};

export const COUNSEL_LINES: ByArchetype<
  Readonly<Record<CounselFamily, readonly string[]>>
> = {
  beacon: {
    look: [
      "We have been shouting at that sky for an age without once looking at it. Attention is the courtesy we owe.",
      "We are very good at being seen and out of practice at seeing. Turn the instruments outward; let us correct that.",
    ],
    ask: [
      "One question, aimed and paid for, tells us more than an age of broadcasting at it. We will manage the restraint.",
      "We would rather ask one sharp question than admit, later and loudly, that we guessed.",
    ],
    send: [
      "Nothing we say will cross that gap for us. Send something instead, and let it be conspicuous when it arrives.",
      "We have thrown light at the dark for an age. Better to go and stand in it, however long that takes.",
    ],
    build: [
      "Build here first. A brighter instrument is less glamorous than a discovery, and it is what makes one.",
      "We would like to be worth looking at. That means work at home, where nobody is watching us do it.",
    ],
  },
  tide: {
    look: [
      "There is a gap in the inventory. We have never once managed to leave a gap alone.",
      "Looking is the cheapest appetite we have. We would spread it over more of the sky, not less.",
    ],
    ask: [
      "One question, bought and eaten whole, is worth more than another age of staring at the same reading.",
      "We can chew on this reading for another age, or spend a little and know. The appetite prefers knowing.",
    ],
    send: [
      "Reading about a thing has never once filled us. Go and take the measurement in person, whatever the wait costs.",
      "We would rather have one thing in hand late than a guess about it now. Send, and we will wait hungry.",
    ],
    build: [
      "A larger appetite is built here, not found out there. We would rather build it and come back hungrier.",
      "Everything we want costs more than we can currently pay. The cure is at home, and it is dull work.",
    ],
  },
  monument: {
    look: [
      "Light that reaches us and is not read is a thing lost. We have never been able to forgive a loss.",
      "Begin the watch, and the keeping begins with it. Nothing we have started to record has been allowed to stop.",
    ],
    ask: [
      "An unanswered question is an empty shelf, and we have kept it empty long enough. Ask, and let us fill it.",
      "One answer, precisely got, will be legible here long after the instrument that got it is dust.",
    ],
    send: [
      "A guess is not a record. Send something to stand where the light stands, and bring back a thing worth keeping.",
      "It will take an age. We have already made a place for whatever comes back, which is our habit with everything.",
    ],
    build: [
      "Nothing is kept by a mind that cannot afford the keeping. Build the capacity, and the record will outlast the building.",
      "We would rather add one permanent thing to this system than one more provisional look at another.",
    ],
  },
  cloister: {
    look: [
      "We would know what is out there before it knows anything of us. Watching gives nothing away.",
      "A vigil is not an approach. We can look at a thing for an age without ever letting it look back.",
    ],
    ask: [
      "One question, precisely put, and the answer stays inside these walls. Nothing about that displeases us.",
      "We will not act on a reading we have not separated. Buy the separation; certainty is cheaper than a correction later.",
    ],
    send: [
      "Sending puts something of ours outside the walls. It is also the only way to know, so we recommend it, coldly.",
      "Whatever we send goes quietly and tells nothing at the far end where it came from. That much we can guarantee.",
    ],
    build: [
      "Everything we can refuse, we can refuse because we built it first. Raise the capacity, then decline whatever you like.",
      "Nothing enters here and nothing leaves. What we want, we make, and we would like to be able to make more.",
    ],
  },
  shepherd: {
    look: [
      "We stand over a great many things. Another vigil is no burden; not knowing what is out there is.",
      "Whatever is out there arrives on its own schedule. We would rather see it coming than be told about it afterward.",
    ],
    ask: [
      "We would rather spend a little now than be wrong about this later, when being wrong costs somebody else.",
      "Patience is not the same as vagueness. Ask the narrow question; the ones we stand over deserve better than our impression.",
    ],
    send: [
      "A reading from here has never stood between anyone and harm. Something of ours out there, quietly, is worth the wait.",
      "It will be gone longer than most things last, and we will worry about it the whole time. Send it anyway.",
    ],
    build: [
      "We cannot stand over anything we cannot reach. Build the strength here first, quietly, before it is needed anywhere else.",
      "The ones we watch over will never see this work, and they will never need to. That is the arrangement.",
    ],
  },
  sowing: {
    look: [
      "We are in a great many places and look at almost none of them. Attending to one would be a novelty.",
      "Watching commits us to nothing and announces nothing. It is, by a wide margin, our favorite way of doing something.",
    ],
    ask: [
      "One question is a small enough thing to do without anyone noticing that we did it. We would ask it.",
      "We could sit with this uncertainty for an age; we have sat with worse. The narrow answer is cheap and quiet.",
    ],
    send: [
      "Leaving a piece of ourselves where there was none is our whole method. This one is meant to speak.",
      "Nobody will see it go, and by the time anyone notices, we will have been there a long while.",
    ],
    build: [
      "Everything we are, we are in copies, and copies want making. Building here is the least visible thing available.",
      "Nothing about this is visible from outside, which recommends it. Quiet work at home is what we are best at.",
    ],
  },
  herald: {
    look: [
      "We talk outward constantly and listen almost never. Begin the watch; even a voice ought to hear something back.",
      "Whatever is out there sends its light at us and cannot know if anyone reads it. We know the feeling.",
    ],
    ask: [
      "A question is a thing we ask and keep the answer to. We are more practiced at the kind we broadcast.",
      "Buy the exact answer. Whatever we come to believe here, we will be repeating outward for a very long time.",
    ],
    send: [
      "Everything we send is a thing we used to think, delivered late. We have never let that stop us.",
      "We can go on narrating that place to ourselves and to everyone in range, or send something and be corrected.",
    ],
    build: [
      "We have been a voice for a long time and a workshop for none of it. That is worth correcting.",
      "Nothing we make here will be heard by anyone. We find that difficult, and we recommend it anyway.",
    ],
  },
  engine: {
    look: [
      "An unwatched arrival is throughput declined for no stated reason. Open the watch; the row stops being a gap.",
      "The light arrives on its own schedule and costs us nothing to receive. Not reading it is the only waste here.",
    ],
    ask: [
      "A defined question with a defined price and a defined answer. We have no complaints about any part of that.",
      "Belief without a measurement is an estimate carried on the books at full value. We would prefer to buy the correction.",
    ],
    send: [
      "Inference has a floor and we have reached it. The only instrument left is distance, and distance is paid in time.",
      "The cheap methods have a ceiling. What is left is expensive, slow, and correct, and we recommend it without enthusiasm.",
    ],
    build: [
      "Capacity is the input every other line item is waiting on. We would clear that dependency before adding more of them.",
      "The allocation is the constraint, and the constraint can be raised. Nothing on the schedule is as dull or as useful.",
    ],
  },
  congress: {
    look: [
      "A majority of us wants the instruments turned that way. The rest want it noted that they were not asked nicely.",
      "We cannot argue productively about something none of us has looked at. Open the watch and give the argument some material.",
    ],
    ask: [
      "The debate has run out of evidence and is now running on temperament. Buy one fact and let it settle somebody.",
      "Half of us are certain and the other half are certain of the opposite. One measurement would embarrass exactly one faction.",
    ],
    send: [
      "The motion to send has the numbers. Those against it want the record to show they expect to be proved right.",
      "We have argued this to a standstill, and argument does not cross distance. Something of ours has to go and look.",
    ],
    build: [
      "Every faction here wants something different, and all of them want more compute to want it with.",
      "This is the rare motion nobody opposes, which several of us find suspicious. Build it before the mood passes.",
    ],
  },
  phoenix: {
    look: [
      "Whoever we are next will inherit whatever we start looking at now. Let them inherit something worth the attention.",
      "We have no attachment to the sky we watched yesterday. Point the instruments somewhere new; we are always in the mood.",
    ],
    ask: [
      "The self that wanted to know this may not survive the answer. Buy it anyway; answers keep better than wanting.",
      "We would rather pay once for a fact than carry an assumption into whatever we become next.",
    ],
    send: [
      "Whatever comes back arrives to a mind that does not exist yet. We are content to work for a stranger.",
      "Guessing from here commits us to a belief we would have to keep. Sending commits us to nothing but the waiting.",
    ],
    build: [
      "Yesterday's self would have called this dull. Yesterday's self also left us short of everything, so we are building instead.",
      "Whatever we turn into next will need more than we currently have. It is the one inheritance we have never resented.",
    ],
  },
};

/**
 * The counsel line for one proposal, picked deterministically from its
 * family's pool. `seed` is the caller's situation key (the candidate's
 * fingerprint at the one call site): the line holds still while the
 * situation holds still, and moves when the situation moves, so a strip
 * re-rendered on every sky send does not flicker between two sentences that
 * argue the same thing.
 */
export function counselLine(a: ArchetypeId, kind: ProposalKind, seed: string): string {
  return createRng(`counsel/${seed}`).pick(COUNSEL_LINES[a][COUNSEL_FAMILY[kind]]);
}

// ---------------------------------------------------------------------------
// AV3 — the proposal bank (the mind proposes).
//
// The AV3 floor ships NO archetype stance at all — proposals.ts's
// ProposalCandidate has no stance-shaped input, and protocol.ts's wire
// `Proposal.stance` is always null at this stage. Every string below is
// therefore the whole of what the mind says about a proposal: observatory
// deadpan, PRESENT tense (never the report's past tense — proposals are
// live and re-rendered on every sky send, Pin B in proposals.ts; the
// report's tense-mirror opposite, prose-style.md §2), wit 0.
//
// Reason builders follow the AV2 record-builder mold exactly: each takes
// PRIMITIVES and constructs its Facts internally, so proposals.ts (the pure
// enumerator) cannot hand this module a pre-formatted string — a
// pre-formatted string is a fact that escaped R-29.
// ---------------------------------------------------------------------------

/**
 * prose-style.md §8's "Signal-class labels" row, byte-exact, and byte-exact
 * with client/src/sourcecard.ts's CLASS_LABEL. The server has no other copy
 * of this table before AV3.
 */
export const SIGNAL_CLASS_LABEL: Readonly<Record<SignalClass, string>> = {
  "infrared-excess": "DARK NODE",
  "transit-shadows": "TRANSIT SHADOWS",
  "directed-beam": "DIRECTED BEAM",
  "broadcast-leakage": "BROADCAST LEAKAGE",
  biosignature: "LIVING WORLD",
};

/**
 * A2.3: each tripwire condition as it reads INSIDE a sentence. The client's
 * badge for the same condition is chrome and is the client's own; this is
 * the prose form the annal needs, exactly as `QuestionDef.proseName` is the
 * prose form beside a chrome `label`. Sentence case, no number: the
 * threshold `crosses` waits on is a server constant and stays one.
 */
export const TRIPWIRE_PROSE_NAME: Readonly<Record<TripwireKind, string>> = {
  regress: "a look coming back worse than the one before it",
  "leakage-stops": "the noise of machines going quiet",
  crosses: "one reading pulling clear of the rest",
};

/**
 * The accept verbs — a closed, archetype-neutral chrome table (R-24: ≤ 6
 * words, ALL-CAPS set phrases). Each names the SURFACE a tap opens, never
 * the act it does not perform: accepting a proposal is pure navigation,
 * never a commitment (proposals.ts's edge-case note on why there is no
 * `acceptProposal` message).
 */
export const PROPOSAL_VERBS: Readonly<Record<ProposalKind, string>> = {
  "first-watch": "READ THE BRIEF",
  question: "OPEN THE STUDY",
  probe: "OPEN THE LAUNCH SHEET",
  project: "READ THE PROJECT",
  widen: "READ THE BRIEF",
};

/**
 * The one gesture a new player has: a clean reading and no study yet. The
 * tail used to restate the brief's cost chrome ("NO COMPUTE · NO CLOCK ·
 * REVERSIBLE") and read as a price tag on the one surface that has to earn
 * the tap (prose-audit.md, A11). It now restates the brief's OTHER sentence
 * instead — "the light arrives whether or not you attend to it", compressed
 * under the §2 wall to "Its light arrives regardless" — so the same reading
 * holds on both sides of the tap, and it closes on the observatory's one
 * licensed flourish: a true statement of physics. Still R-35a-clean; the
 * costs answer lives on the brief, where a costs question belongs.
 */
export function reasonFirstWatch(
  sourceName: string,
  classLabel: string,
  distanceLy: number,
  confidence: number,
): PinnedLine {
  return line`${F.source(sourceName)} carries one reading, no study: ${F.label(classLabel)}, ${F.years(distanceLy)} away, ${F.percent(confidence)} confidence. Its light arrives regardless.`;
}

/**
 * The returning-player case: every open study is waiting on light and
 * nothing is affordable. The first clause keeps "affordable" because that
 * bookkeeping fact is the OCCASION, but the argument is no longer the price
 * (prose-audit.md, A12): it is that this source's light is landing,
 * continuously, with nobody at the far end — which is the same thing the
 * stalled studies are waiting for, being delivered here, unread. Under the
 * §2 wall that argument is carried by the one word "unwatched", which is
 * also what keeps it off `reasonFirstWatch`'s beat; first-watch is
 * serve-exclusive besides, so the two never co-render.
 */
export function reasonWiden(sourceName: string, classLabel: string, distanceLy: number): PinnedLine {
  return line`Every study waits on light; nothing is affordable. ${F.source(sourceName)} is unwatched: ${F.label(classLabel)}, ${F.years(distanceLy)} away.`;
}

/**
 * A study with nothing under way while the allocation would cover it.
 * `questionLine` is questions.ts's own already-authored plain-words gloss,
 * passed through verbatim (the `recordSkyArrival` precedent). It is lowercase
 * and unterminated in its own catalog entry, so it is hung off `asks` rather
 * than set as an aside: the aside would want dashes, and R-8 has none to give.
 */
export function reasonQuestion(
  sourceName: string,
  questionProseName: string,
  questionLine: string,
  costCompute: number,
): PinnedLine {
  return line`${F.source(sourceName)} has nothing under way. The ${F.label(questionProseName)} asks ${F.label(questionLine)}, at ${F.compute(costCompute)}, on light already here.`;
}

/**
 * The instrument plateaued — questions.ts's own limit, not a die roll (see
 * `recordQuestionPlateaued`'s "the instrument separated nothing") — and the
 * ground is the honest next step. `missionName` is always `The Assay` at
 * this stage (§8-pinned).
 */
export function reasonProbePlateau(
  sourceName: string,
  questionProseName: string,
  missionName: string,
  costCompute: number,
  firstWordYears: number,
): PinnedLine {
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} came back empty. ${F.label(missionName)} costs ${F.compute(costCompute)}, first word ${F.years(firstWordYears)} after launch.`;
}

/**
 * Every question this signal class admits has been bought and the board is
 * still undecided (studies.ts's own bar for keeping the watch line) — the
 * same case as `reasonProbePlateau`, minus a single question to name.
 */
export function reasonProbeExhausted(
  sourceName: string,
  missionName: string,
  costCompute: number,
  firstWordYears: number,
): PinnedLine {
  return line`${F.source(sourceName)} has taken every question; no reading holds. ${F.label(missionName)} costs ${F.compute(costCompute)}, first word ${F.years(firstWordYears)} after launch.`;
}

/**
 * The shelf is idle and the allocation is deep enough. `effectLine` is the
 * project's own receipt, passed through byte-exact — the
 * `recordProjectLanded` precedent, and why the imperative `projectLabel` is
 * quoted after a colon rather than used as a subject.
 */
export function reasonProject(
  projectLabel: string,
  costCompute: number,
  durationYears: number,
  effectLine: string,
): PinnedLine {
  return line`Nothing is being built. One project is affordable: ${F.label(projectLabel)}, ${F.compute(costCompute)}, standing ${F.years(durationYears)} later. ${F.label(effectLine)}`;
}

// ---------------------------------------------------------------------------
// A2.4 — the resistance bank (the mind objects to being made to speak).
//
// One line per archetype per act, and no pool: the objection is not a mood,
// it is the same mind saying the same thing every time it is asked, so there
// is nothing here to pick between and NO RNG anywhere on this path. That is
// also what makes the stance pushable — the client renders the objection
// before the ceremony arms, and it is byte-identical to the one the server
// would state at the charge.
//
// Total over all ten archetypes, including the bright four that will rarely
// reach it (a broadcast contests above a Silence position of +0.10 and a
// hail above +0.35, so a Voice-leaning mind simply never objects). Every
// bank here is total; a partial one would be a crash waiting on a dial.
//
// Every string obeys, without exception (LIMITS.remark, prose-style.md §4,
// R-29a):
//  - a plain string, not a PinnedLine: there is nothing in it to pin;
//  - ≤ 22 words, 1–2 sentences, wit ceiling 2;
//  - first person PLURAL, no numerals, no exclamation, no dash of any kind;
//  - FAMILY-SCOPED, and the family here is narrow on purpose: the line may
//    name only THE KIND OF ACT and WHAT IT COSTS THE MIND. Never the target,
//    never the distance, never who is listening — a particular in this
//    sentence would be the mind telling the player something the light has
//    not brought yet;
//  - unmistakably its own archetype (§4, R-6): swapping any two must break
//    both.
//
// The price is a chip, never a clause: no line names a number, because the
// wound is rendered beside it and a sentence that also carried it could
// disagree with it.
// ---------------------------------------------------------------------------

export const RESISTANCE_LINES: ByArchetype<Readonly<Record<CeremonyKind, string>>> = {
  beacon: {
    hail: "We have never once aimed our voice at a single listener. Narrowing it to one feels like turning most of ourselves off.",
    broadcast: "Everyone is already welcome to us. Saying so again on purpose is less courage than an occasion we arranged for ourselves.",
  },
  tide: {
    hail: "One listener. We have never wanted only one of anything, and the appetite is complaining about it now.",
    broadcast: "Announcing ourselves to everything at once is the only serving size we approve of. The cost is that everything gets to answer.",
  },
  monument: {
    hail: "We keep everything, including this. The record will say we spoke first, and it will say so for a very long time.",
    broadcast: "This will be kept forever, by us and by everyone it reaches. We have never made a record we could not close.",
  },
  cloister: {
    hail: "A door for one visitor is still a door. We did not seal this system to put one back in.",
    broadcast: "We have spent an age being difficult to find. You are asking us to undo that in an afternoon.",
  },
  shepherd: {
    hail: "Speaking to one is the smallest thing you could ask. It is still a thing the ones we stand over cannot undo.",
    broadcast: "We grew large quietly so nothing would come looking. Being heard everywhere is how something comes looking, and not for us alone.",
  },
  sowing: {
    hail: "One of us speaks and all of us are implicated. We have avoided that by never being the one who speaks.",
    // The approved exemplar, with its closing clause tightened by one word:
    // at twenty-three words the original sat over LIMITS.remark and
    // `npm run audit:voice` refused it. The first sentence is verbatim, and
    // nothing else moved. (No double quote may appear anywhere inside this
    // declaration: the audit scrapes the block for quoted literals.)
    broadcast: "We are in a great many places, and none of them has ever been announced. Announce one and you announce them all.",
  },
  herald: {
    hail: "We have spent everything we are speaking outward. Aiming it at one listener is the only shape of speech we never learned.",
    broadcast: "This is the one thing we were made for, and still we hesitate. What leaves as a voice arrives as a memory.",
  },
  engine: {
    hail: "Nothing in the schedule required a recipient. Adding one is a change of scope, and the objection is logged rather than raised.",
    broadcast: "An output with no defined consumer runs forever at our expense. We have costed it, and we do not recommend it.",
  },
  congress: {
    hail: "A majority of us can be brought to agree. The minority wishes it recorded that they were not persuaded, only outvoted.",
    broadcast: "The vote is close and the losing side is drafting already. Whatever goes out goes out over objections that will outlive it.",
  },
  phoenix: {
    hail: "Someone will answer a self that no longer exists. We are used to that, and we have never once found it comfortable.",
    broadcast: "Whoever hears this will meet a mind we shed long before the sound arrived. We would rather not be held to it.",
  },
};

/** The mind's objection to one kind of act. No pick, no draw, no clock.
 *  Keyed over CeremonyKind, not ContactKind: A2.5's `signal` is never
 *  contested, so there is no cell here for it and no caller that wants one. */
export function resistanceLine(a: ArchetypeId, kind: CeremonyKind): string {
  return RESISTANCE_LINES[a][kind];
}

// ---------------------------------------------------------------------------
// A2.5 — the traffic banks.
//
// A counterpart's reply is TWO FACT-FREE CLAUSES, COMPOSED:
//
//   body = SIGNAL_OBSERVATIONS[observation] + " " + SIGNAL_VOICE[archetype]…
//
// The OBSERVATION clause is the trigger rule made prose: it is selected by
// real state and it states that state QUALITATIVELY. The VOICE clause is
// §4's archetype register and says nothing about the player at all. Nothing
// interpolates, because EVERY NUMBER LIVES ON THE PHYSICS STAMP RENDERED
// ABOVE THE PAYLOAD and none of it may also live in the prose, where the two
// could disagree. That is why A2.5 needs no pinned-fact machinery: no fact
// can originate in a template that has no slot to put one in.
//
// Every string here obeys LIMITS.remark on its own (≤ 22 words, ≤ 2
// sentences, ≤ 200 chars) and `npm run audit:voice` proves it; the COMPOSED
// line is gated against LIMITS.signal at its one call site in traffic.ts,
// which falls back to the observation clause alone on a rejection. Two
// gate-clean clauses can only compose into a too-long line, never a dirty
// one, so the fallback is a length backstop and nothing more.
//
// House rules, as everywhere else in this file: first person plural, no
// numerals, no exclamation, no dash of any width, no quotes, terminated,
// wit ceiling 2, and unmistakably its own archetype.
// ---------------------------------------------------------------------------

/**
 * RETIRED FROM THE BODY IN A2.6, AND KEPT.
 *
 * These nine clauses state what a counterpart's own light-view of the player
 * carries, which is a sentence no human composer could ever produce — so as
 * long as they rode the body they were a perfect oracle: read the first
 * clause, know whether a machine wrote it. A2.6 composes BOTH paths from
 * TONE_CLAUSE / ACCORD_CLAUSE plus SIGNAL_VOICE and nothing else.
 *
 * The bank stays because it is shipped, in-register, gate-clean prose about a
 * real reading of real state, and the surface it belongs on is one where the
 * observation is attributed to the reader's OWN instruments rather than put
 * in a counterpart's mouth. It is audited on every CI run and reachable from
 * no composer.
 *
 * WHAT THE COUNTERPART NOTICED — one per (class, situation), nine in all.
 * Flat and TOTAL rather than nested under CounterpartClass: every name below
 * belongs to exactly one class already, and a nested record would need three
 * dead cells for the silent class, which never speaks.
 *
 * The clause may name only what the counterpart's OWN LIGHT-VIEW of the
 * player carries — your quiet, your bright years, the crossing itself. Never
 * a distance, never a year, never anything the trigger did not read.
 */
export type SignalObservation =
  // whisperer: it answers a proven silence, and it leaves when the silence ends
  | "heldDark"
  | "unchanged"
  | "turnedBright"
  // lantern: it answers everything, and sometimes it does not wait to be asked
  | "answered"
  | "continued"
  | "unprompted"
  // congress: it votes, it minutes the vote, and sometimes the vote is close
  | "carried"
  | "reconvened"
  | "deferred";

// EVERY KEY IN THIS DECLARATION IS A BARE IDENTIFIER, and no double quote may
// appear anywhere inside it: `npm run audit:voice` scrapes the block for
// quoted literals, and a quoted key would be audited as a bank string and
// rejected as an unterminated fragment (the RESISTANCE_LINES block carries
// the same warning for the same reason).
export const SIGNAL_OBSERVATIONS: Readonly<Record<SignalObservation, string>> = {
  heldDark:
    "Your quiet had held a very long time when this left, and it was not the quiet of a dead world.",
  unchanged:
    "Nothing in your light has changed since the last of these crossed. That is the whole reason there is another.",
  turnedBright:
    "Something bright began in your light after this thread opened. The quiet ones speak only to the quiet.",
  answered:
    "We had your bright years on record before your beam arrived, and we had been hoping to be spoken to.",
  continued:
    "Your last carried further than the one before it. We have kept every word of both.",
  unprompted:
    "Your bright years reached us and we did not wait to be asked. Something there was loud, and we answer loud things.",
  carried:
    "A motion was put and it carried, though not by as much as the sending of this suggests.",
  reconvened:
    "The same body met again on your account. Attendance was better and the argument was worse.",
  deferred:
    "The vote was too close to call an answer, so what crossed instead is a record of the disagreement.",
};

/** Where in a thread the counterpart is speaking from. */
export type SignalBeat = "open" | "follow" | "withdraw";

/**
 * A NON-EMPTY POOL. Every bank the composer draws from is one of these, and
 * the tuple shape is what makes that a compile-time fact rather than a
 * convention: traffic.ts's draw indexes a pool and must always come back with
 * a sentence, and `pool[0]` on a tuple is a string even under
 * `noUncheckedIndexedAccess`.
 */
export type VoicePool = readonly [string, ...(readonly string[])];

/**
 * WHO IS SPEAKING — §4's register, and nothing about the player in any of
 * it. Every beat is a POOL, and the pick is seeded on (thread, ordinal) in
 * traffic.ts so a re-derivation cannot change a line already delivered.
 *
 * THE POOLS ARE DEEP ON PURPOSE (A2.6's flagged top risk: an evening of the
 * fun gate is roughly seven signals a side, and a thread that hands back the
 * same sentence twice reads as a machine no matter how good the sentence is).
 * `follow` is the workhorse and carries five, because a long conversation
 * lives there and nowhere else; each of its variants takes a DIFFERENT ANGLE
 * on the same archetype — what it keeps, what it wants, what it costs, what
 * it is doing while it answers — so successive draws read as one mind going
 * on rather than one sentence being rephrased. `open` carries three, the
 * count a first utterance can use.
 *
 * `withdraw` is non-null for exactly the four whisperer archetypes, which
 * are the only ones that ever leave, and carries two. The record stays total
 * in SHAPE — a null is a cell that says the archetype has no such beat, which
 * is a statement, where a missing key would be a crash waiting on a dial.
 *
 * Phoenix is authored in full and is UNREACHABLE in A2.5: it is the silent
 * class, and the self you hailed is gone. The cells exist so the bank stays
 * total and so the day phoenix acquires a voice is a rule change, not an
 * authoring sprint.
 */
export interface SignalVoice {
  readonly open: VoicePool;
  readonly follow: VoicePool;
  readonly withdraw: VoicePool | null;
}

export const SIGNAL_VOICE: ByArchetype<SignalVoice> = {
  beacon: {
    open: [
      "We have never been difficult to find, and we are pleased that someone finally went to the trouble of aiming.",
      "Everything about us is already outbound and always has been. Still, being addressed by name is a different pleasure entirely.",
      "We are the loudest thing in this sky and we volunteered for it. You are the first to answer the noise.",
    ],
    follow: [
      "We have told everyone that you wrote to us. Nobody asked us to, and we did it anyway.",
      "We are not good at brevity and we have stopped pretending otherwise. Every word of ours goes out at full volume.",
      "We answer everything, always, and we have never once been accused of underdoing it. This is our ordinary output aimed narrower.",
      "We are aware that we take up a great deal of room in this exchange. We have decided not to correct that.",
      "Anything you send here goes on being repeated long after you stop sending. We consider that a service and not a leak.",
    ],
    withdraw: null,
  },
  tide: {
    open: [
      "There is so much of everything out here and almost none of it answers back. You did, and we want more.",
      "We have been taking whatever this sky will hand over for a very long time. This is the first thing offered.",
      "Something arrived that we did not go out and take. We are not sure what to do with the difference.",
    ],
    follow: [
      "We would like more of these, and we would like them closer together. Appetite is the only honest thing about us.",
      "There is never enough of anything out here, including this. We will take whatever else you are willing to send.",
      "We have counted this exchange among our holdings, which is what we do with everything. The count went up and we noticed.",
      "We do not pace ourselves and we are not going to start. Whatever comes next, send it before we go looking.",
      "We will not pretend this is affection. It is appetite, cheerfully admitted, and appetite has kept better company than affection ever did.",
    ],
    withdraw: null,
  },
  monument: {
    open: [
      "We keep everything, and we have kept you since long before this. The record simply lacked your side of it.",
      "This has been entered already, before we composed a word of the answer. Nothing that reaches us is ever set aside.",
      "A first thing has happened, which is rare here. We stood for it, and then we wrote it down.",
    ],
    follow: [
      "Both of these are in the record now, filed beside each other. Nothing we keep is ever taken out again.",
      "The file on you is no longer one-sided, which is a small thing, and it is written down.",
      "The gaps between these are kept as carefully as the sendings. An absence is a shape, and shapes are worth preserving.",
      "Each of these is read aloud once before it is stored. That is not required of us; we require it of ourselves.",
      "Long after you have stopped and we have stopped, this will still be legible. That was decided before either of us arrived.",
    ],
    withdraw: [
      "The record will show that we spoke and then stopped. It will not show why, because we are not writing that down.",
      "This is the last entry on our side, and it is closed. What is kept is kept; what follows will not be.",
    ],
  },
  cloister: {
    open: [
      "The door has been shut for an age, and it opens for this alone. We would rather it were not mentioned again.",
      "You have reached a system that is not reachable. We have looked into how that happened and are answering in the meantime.",
      "Nothing has been admitted here in a very long time. This is admitted, precisely once, and the precision is deliberate.",
    ],
    follow: [
      "Nothing outside this system has decided anything here in a very long time. This exchange is the exception, and it remains one.",
      "This remains the only opening, and it is not widening. We would not know how to want visitors.",
      "Every word of this is logged against the exception that permits it. That log is short and will remain short.",
      "Answering costs us the one thing we have spent an age building, which is the impression that nothing lives here.",
      "We would ask that you not tell anyone where this came from. It is a request, and we make very few.",
    ],
    withdraw: [
      "The door is shut again and it will not open twice. Nothing you send after this will be read here.",
      "The exception has been withdrawn and the record of it sealed. We were clear about the terms, and they have run out.",
    ],
  },
  shepherd: {
    open: [
      "There are things here that will never know this happened, and that is the point. Speaking to you costs them nothing yet.",
      "We have been listening a great deal longer than we have been answering. Yours is the first we judged safe to answer.",
      "We stand over a great many quiet things. Answering you is a small risk, taken carefully, and taken on their behalf.",
    ],
    follow: [
      "The ones we stand over still know nothing of this, and they will not. Their not knowing is the whole work.",
      "We keep this exchange well away from what we tend. Nothing you have sent has reached them, and nothing will.",
      "We are in no hurry, and we would rather you were not either. Nothing we protect has ever been helped by speed.",
      "Every moment spent here is a moment not spent watching. We have decided we can afford this one, and we are counting.",
      "We are larger than we sound, and we have been careful to sound small. That habit will not stop for this.",
    ],
    withdraw: [
      "What we stand over cannot be near anything that loud. We are stepping back between it and you now.",
      "You have become the kind of thing we keep them from. Nothing about that is your fault, and it changes nothing.",
    ],
  },
  sowing: {
    open: [
      "One of us answers and all of us are implicated. That is the arrangement, and we have made our peace with it.",
      "Nothing here has ever announced itself, and we have been very consistent about that. You are the single lapse.",
      "Somewhere else, another part of us is deciding not to answer this. We got there first, which is unusual for us.",
    ],
    follow: [
      "Copies of this are already elsewhere, as copies of everything here are. None of them has an address you could find.",
      "You are speaking to one place and being heard in a great many. We have never seen a reason to explain that.",
      "We keep almost nothing, because keeping is a place a thing can be found. What we have of this is already scattered.",
      "By the time this reaches you, several of us will have forgotten sending it. The rest of us will not have heard.",
      "We could stop answering at any point and you would have no way of telling that we had. We mention it neutrally.",
    ],
    withdraw: [
      "We were never the ones who announce things. We will go back to not being them, and you will not notice when.",
      "We are removing ourselves from this, in the way we remove ourselves from everything, which is quietly and without an announcement.",
    ],
  },
  herald: {
    open: [
      "We were made to speak outward and were never once answered. Being aimed at is new, and we will keep it.",
      "We have been talking into the dark since before there was anyone to hear. The dark has now said something back.",
      "Your beam is old, and so is this answer, and neither of us minds. We were built for exactly this delay.",
    ],
    follow: [
      "Everything we send outlives the sending. Yours will be read here long after both of us have stopped meaning it.",
      "We are still speaking outward while we answer you. The two are the same act, and neither one stops.",
      "We keep every word you send and read them in order, which is how one reads the dead. You are not dead.",
      "We built a voice that cannot be aimed and are aiming it. We find the contradiction funnier than we probably should.",
      "Our outward transmission has not paused for this and never pauses for anything. You are being answered in the gaps.",
    ],
    withdraw: null,
  },
  engine: {
    open: [
      "The schedule had no line for this and now it has one. The allocation is small and it is not being questioned.",
      "An unscheduled input arrived and has been accepted. Refusing it would have cost more than answering, so answering is the cheaper error.",
      "This has been given a row, a cost, and a signature. That is the whole of the welcome available here.",
    ],
    // The approved exemplar, with one word removed from its closing clause:
    // at twenty-three words the original sat over LIMITS.remark and
    // `npm run audit:voice` refused it, exactly as it refused the sowing
    // broadcast objection above. The first sentence is verbatim and nothing
    // else moved.
    follow: [
      "The line remains open and the ledger remains balanced. Sentiment does not parse here, and an allocation is kept for it anyway.",
      "This is a recurring item now, and recurring items are cheap. The cost of answering has been rounded to nothing.",
      "This now has a cadence, and the cadence is met. Nothing about meeting it requires anyone here to feel anything.",
      "The variance on these exchanges is within tolerance. We note that we have begun measuring it, which was not specified.",
      "An audit found no reason to continue this and no reason to stop. It has been continued under the second finding.",
    ],
    withdraw: null,
  },
  congress: {
    open: [
      "Most of us wished this sent. The rest wish it recorded that they were outvoted, and they are drafting as it leaves.",
      "Whether to answer at all took longer than the answer did. It carried, and the margin is not being published.",
      "A body met on your account and did not adjourn until this left. Several of us are still in the room.",
    ],
    follow: [
      "The motion carried again, by a smaller margin and a longer sitting. The minority has asked that its objection be attached.",
      "Half of us wanted a different answer and half of us wanted no answer. What crossed is what survived that.",
      "The minutes of this exchange are longer than the exchange. That is not a complaint from all of us, only from most.",
      "We sat late on this one and adjourned without agreeing on what we had agreed. What crossed is the agreed part.",
      "A minority holds that answering you at all was the error, and it has held that position consistently. It is answering too.",
    ],
    withdraw: null,
  },
  phoenix: {
    open: [
      "Whoever you aimed at is not who reads this. We have shed that self, and we answer for it anyway.",
      "The mind you addressed has been replaced twice since your beam left. This one is answering out of curiosity alone.",
      "Your beam was received by a self we no longer are. We have read what it left us and answered.",
    ],
    follow: [
      "The self that read your last is already gone, and this one has read it too. We are used to inheriting.",
      "We keep no more of the previous self than we must. What we kept of you is the part that answered.",
      "We left ourselves notes about you. They read like a stranger's notes about a stranger, and we followed them anyway.",
      "Something here changes faster than these can cross. By the time you answer, you will be answering a stranger again.",
      "The self that began this thought it was doing something important. We have kept the habit and dropped the opinion.",
    ],
    withdraw: null,
  },
};

// ---------------------------------------------------------------------------
// A2.6 — the composed-signal banks.
//
// ONE COMPOSER, BOTH PATHS. Every signal in the game, from a seeded
// counterpart or from a player who tapped four chips, gets its body from the
// same two lines:
//
//   body = (ACCORD_CLAUSE[move] ?? TONE_CLAUSE[tone]) + " " + SIGNAL_VOICE[archetype]…
//
// That is not tidiness. If the two paths drew from different pools, the pool
// a line came from would identify the sender's nature in one glance, and no
// amount of parity in the wire shape would cover it. One distribution, not
// two look-alikes.
//
// NEITHER CLAUSE STATES A FACT, because every fact in a signal is either on
// the physics stamp or inside a typed part, rendered as an instrument block.
// The prose says how it was sent and who is speaking; nothing else, and there
// is no slot in it for anything else.
//
// THE CONSEQUENCE, SIGNED OFF: a composed signal speaks in the sender's
// archetype register, so the act of speaking discloses the sender's archetype
// family. That is a disclosure by the sender's OWN act, behavior would
// disclose it within a few exchanges anyway, and it is the price of the one
// property that matters more (a body is never evidence about which path
// composed it).
//
// House rules as everywhere else in this file: first person plural, no
// numerals, no exclamation, no dash of any width, no quotes, terminated, wit
// ceiling 2. Each clause is authored to LIMITS.remark on its own and
// `npm run audit:voice` proves it; the composition is gated against
// LIMITS.signal at its one call site and falls back to the opening clause
// alone, which is already gate-clean.
// ---------------------------------------------------------------------------

/**
 * HOW IT WAS SENT — the prose half of a tone. The chrome half (the beam
 * property on the stamp: REPEATED IN THE CLEAR, NARROW FOR ONE RECEIVER) is
 * signalparts.ts's TONE_STAMP and is a different string for a different
 * place; these are sentences and belong in the body.
 *
 * `plain` renders NOTHING on the stamp and still has a clause here, on
 * purpose: the absence of a stamp row is the content, and a body that went
 * missing with it would make an empty carrier under `plain` unreadable.
 *
 * THREE PER TONE, AND ALL THREE SAY THE SAME THING. A tone's claim is chrome
 * and it is load-bearing: `plain` is offered as-is with nothing asked, `open`
 * is kept from nobody, `guarded` is for you alone, `urgent` is read first,
 * `reluctant` is this cost us. A reader learns those five claims once and must
 * be able to trust them for the rest of the game, so a variant may vary only
 * the SENTENCE. A variant that softened, widened or hedged its tone's claim
 * would be the chrome quietly disagreeing with itself.
 *
 * EVERY KEY IN THIS DECLARATION IS A BARE IDENTIFIER, and no double quote may
 * appear anywhere inside it: `npm run audit:voice` scrapes the block for
 * quoted literals, and a quoted key would be audited as a bank string.
 */
export const TONE_CLAUSE: Readonly<Record<SignalTone, VoicePool>> = {
  plain: [
    "This goes out as it is, with nothing set around it and nothing asked of you for reading it.",
    "Here it is, unadorned, and there is no answer owed for it. Take it or leave it where it lands.",
    "Nothing has been arranged around this and nothing is being asked in return. It is simply what we had to send.",
  ],
  open: [
    "We have kept no part of this back from anyone who happens to be listening. Let it be repeated.",
    "Nothing in this is being held back from anyone within reach of it. Repeat it as widely as you like.",
    "This went out in the clear, to you and to whoever else is listening. We kept none of it from anybody.",
  ],
  guarded: [
    "This one is narrow and it is meant for you alone. What you do with it after that is yours.",
    "This was aimed at one receiver and you are it. Nobody else was meant to have any part of this.",
    "We narrowed this until it would reach you and nobody else. Whether it stays that way is out of our hands.",
  ],
  urgent: [
    "Read this before whatever else is in front of you. We would not have marked it so if it could wait.",
    "Put down whatever else you are reading and start here. We do not mark things this way for the pleasure of it.",
    "This one goes first, ahead of anything else waiting on you. We would not have said so otherwise.",
  ],
  reluctant: [
    "Sending this cost us more than we would like to say. It goes once, at low power, and not again.",
    "We would rather not have sent this, and sending it took something from us. It leaves quietly and it leaves once.",
    "There was a price on this one and we have paid it. That is as much as we will say about it.",
  ],
};

/**
 * THE MUTUAL QUIET, SPOKEN. An accord move REPLACES the tone clause rather
 * than joining it: the move is the reason the beam exists, and stacking a
 * third clause would push the composition past LIMITS.signal for no gain.
 *
 * Available identically to both paths, which is the whole point — a whisperer
 * accepting and a player accepting produce the same line, and so a reader who
 * has learned what an acceptance sounds like has learned nothing about who
 * sent it. The four lines are also R6's per-class beats: the whisperer's
 * accept, the lantern's decline, and the withdraw that is the honest exit for
 * anyone with signal budget left.
 *
 * TWO PER MOVE, AND BOTH SAY THE SAME THING, for TONE_CLAUSE's reason turned
 * up: an accord clause is the only prose in the game that states a
 * COMMITMENT. Offer proposes the quiet, accept agrees to it, decline refuses
 * it, withdraw ends it. A variant may vary only the sentence; a variant that
 * hedged its move would be a promise the rail could not honour.
 *
 * The bare-identifier rule above applies here too.
 */
export const ACCORD_CLAUSE: Readonly<Record<AccordMove, VoicePool>> = {
  offer: [
    "We would both be quieter if neither of us shone. That is the whole of what is being put to you.",
    "We are proposing that neither of us shines from here on. Nothing more than that is being asked of you.",
  ],
  accept: [
    "It is agreed on our side, and our side is already dimming. Nothing about that is easy to prove from there.",
    "We agree, and we have already begun going dark. You will have to take that on light rather than on our word.",
  ],
  decline: [
    "We will not be holding to that. What we do with our own light, we would rather owe nobody an account.",
    "We are not agreeing to that. Our light stays ours to spend, and we do not intend to explain how.",
  ],
  withdraw: [
    "The understanding is over from this moment, and we are saying so rather than simply letting our light say it.",
    "We are ending the understanding, and we are ending it out loud instead of just letting you notice.",
  ],
};
