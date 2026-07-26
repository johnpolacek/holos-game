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
import type { SignalClass } from "./protocol";
import type { ProposalKind } from "./proposals";

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

/**
 * Observatory deadpan, wit 0 (R-27). Shown once, on the first report open
 * — the fifth frame line. It teaches the one thing the report's stamps
 * assume: every date on this surface is the civilization's own count from
 * its own ascension (prose-style.md §8's chronicle-dating row, R-33). No
 * other clock appears anywhere on a player surface, so the line does not
 * offer a conversion; there is nothing to convert to.
 */
const EPOCH_LINE: PinnedLine =
  line`Every date in this record is counted from our own ascension. It is our year; no one else keeps it, and nothing else's calendar appears here.`;

export function epochLine(): string {
  return render(EPOCH_LINE);
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
// House rules for every string in this block (R-32): observatory deadpan,
// wit 0, PAST tense, 1–2 sentences, ≤ 34 words, colon for a reveal, spaced
// em-dash for an aside, no exclamation mark, no §6 term, and none of the
// epistolary vocabulary §8's comms register rules out.
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
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} came back. It moved the study toward ${F.label(readingLabel)}, on light ${F.years(distanceLy)} old.`;
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
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} came back empty. On light ${F.years(distanceLy)} old, the instrument could not separate one explanation from another.`;
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
  return line`${F.label(missionName)} reported from ${F.source(sourceName)} and closed the study: it named a reading, ${F.label(readingLabel)}, on light ${F.years(distanceLy)} old.`;
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
  return line`${F.label(missionName)} departed for ${F.source(sourceName)}, ${F.years(distanceLy)} away. Nothing it says can reach us for ${F.years(firstWordYears)}.`;
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
  return line`${F.label(missionName)} sent its first word from ${F.source(sourceName)}: ${F.label(headline)}. That word is ${F.years(distanceLy)} old.`;
}

/** A routine cadence report — the same shape, drier, because by now it is
 *  the ordinary case and the ordinary case must read as ordinary. */
export function recordProbeReport(
  missionName: string,
  sourceName: string,
  headline: string,
  distanceLy: number,
): PinnedLine {
  return line`${F.label(missionName)} reported again from ${F.source(sourceName)}: ${F.label(headline)}. The report is ${F.years(distanceLy)} old.`;
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
  return line`${F.label(missionName)} at ${F.source(sourceName)} did not send the word it promised for ${F.epochYear(missedEpochYear)}. Nothing has come since, and anything that explains it is ${F.years(distanceLy)} away.`;
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
 * thing the ordering would otherwise be lying about: the promoted entry
 * sits first out of chronological order.
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
    return line`${F.years(spanYears)} passed unread. ${F.tally(newCount, "entry", "entries")} landed in that time; the first stands out of order because it changes the most. The record keeps a fixed number of entries, and the oldest have been let go.`;
  }
  return line`${F.years(spanYears)} passed unread. ${F.tally(newCount, "entry", "entries")} landed in that time; the first stands out of order because it changes the most.`;
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
      "It has gone out. We send these the way we do everything — early, often, and hungry for what comes after.",
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
      "It has gone quiet. So have we, in most places, most of the time — but we did not choose this one.",
      "Nothing more from it. We are used to hearing nothing; we are less used to minding.",
    ],
  },
  herald: {
    settled: [
      "We know it, and so, in time, will everyone within range of us. Knowing alone has never been enough for us.",
      "Settled — and already going out, aimed at ears that will not exist for a long while yet.",
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
 * second sentence restates in prose what the brief screen it opens already
 * says in chrome ("NO COMPUTE · NO CLOCK · REVERSIBLE") — R-35a, a proposal
 * names no fact its destination does not also show.
 */
export function reasonFirstWatch(
  sourceName: string,
  classLabel: string,
  distanceLy: number,
  confidence: number,
): PinnedLine {
  return line`${F.source(sourceName)} carries one reading and no study: ${F.label(classLabel)}, ${F.years(distanceLy)} away, at ${F.percent(confidence)} confidence. A watch costs no compute and can be put down again.`;
}

/**
 * The returning-player case: every open study is waiting on light and
 * nothing is affordable, so the honest move is a free one. Same shape as
 * `reasonFirstWatch` minus the confidence figure — a watch is offered on
 * its own merits here, not as "the sharpest smudge."
 */
export function reasonWiden(sourceName: string, classLabel: string, distanceLy: number): PinnedLine {
  return line`Every study open is waiting on light, and nothing on any of them is affordable. ${F.source(sourceName)} is unwatched: ${F.label(classLabel)}, ${F.years(distanceLy)} away. Watching costs nothing.`;
}

/**
 * A study with nothing under way while the allocation would cover it.
 * `questionLine` is questions.ts's own already-authored plain-words gloss,
 * passed through verbatim (the `recordSkyArrival` precedent) and set as an
 * aside because it is lowercase and unterminated in its own catalog entry.
 */
export function reasonQuestion(
  sourceName: string,
  questionProseName: string,
  questionLine: string,
  costCompute: number,
  integrationYears: number,
): PinnedLine {
  return line`Nothing is under way on the ${F.source(sourceName)} study. The ${F.label(questionProseName)} — ${F.label(questionLine)} — costs ${F.compute(costCompute)} and answers in ${F.years(integrationYears)}.`;
}

/**
 * The instrument plateaued — questions.ts's own limit, not a die roll (see
 * `recordQuestionPlateaued`'s "the instrument could not separate one
 * explanation from another") — and the ground is the honest next step.
 * `missionName` is always `The Assay` at this stage (§8-pinned).
 */
export function reasonProbePlateau(
  sourceName: string,
  questionProseName: string,
  missionName: string,
  costCompute: number,
  firstWordYears: number,
): PinnedLine {
  return line`The ${F.label(questionProseName)} on ${F.source(sourceName)} came back empty, and the board has not moved. ${F.label(missionName)} costs ${F.compute(costCompute)}, and its first word reaches us ${F.years(firstWordYears)} after launch.`;
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
  return line`Every question this class admits has been put to ${F.source(sourceName)}, and no reading holds. ${F.label(missionName)} costs ${F.compute(costCompute)}, and its first word reaches us ${F.years(firstWordYears)} after launch.`;
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
  return line`Nothing is being built. One project is within the allocation: ${F.label(projectLabel)}, ${F.compute(costCompute)}, standing ${F.years(durationYears)} later. ${F.label(effectLine)}`;
}
