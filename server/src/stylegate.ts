// The style gate — AV4's one hard check on generated prose.
//
// Pure, total, synchronous: no I/O, no clock, no randomness, and the same
// input always yields the same verdict. That is what lets voicegen.ts's
// stored records be honest — a rejection recorded once is a rejection
// forever, because re-running the gate could not have said anything else.
//
// THE GATE NEVER EDITS. It accepts or rejects. It does not strip a wrapping
// quote, does not remove a preamble, does not collapse whitespace, does not
// repair. A repaired line is prose no human wrote and no human reviewed, and
// repair rules are exactly where a "fixed" line quietly acquires a meaning
// nobody intended. The only normalization is `trim()` on the outer edges.
//
// Rejection is cheap and acceptance is expensive. A false reject costs one
// templated line — shipped, reviewed, in-register prose. A false accept costs
// the register. So the gate is deliberately over-strict everywhere it has a
// choice, and several §6 rules (\bContact\b, \bMind\b, \bOrbital\b) are known
// to be loose. That asymmetry is what makes "reject, then template, and never
// retry" a safe policy rather than a lossy one.
//
// R-37: this module imports nothing but its own rule table. No truth-side
// symbol, no knowledge-layer symbol, no catalog module — none of them are
// reachable from here, which is a stronger statement than "none of them are
// used".

import { BANNED_RULES } from "./bannedterms.js";

/** The generated surfaces the gate is calibrated for. */
export type GenSurface = "remark" | "arrival" | "stance" | "record" | "signal";

export type GateReason =
  | "empty"
  | "newline"
  | "too-long-chars"
  | "markup"
  | "quote"
  | "exclamation"
  | "em-dash"
  | "digit"
  | "percent"
  | "designation"
  | "first-person-singular"
  | "meta"
  | "banned-term"
  | "too-many-words"
  | "too-many-sentences"
  | "unterminated"
  /** Fact-carrying surfaces only: a pinned token the line had to echo. */
  | "missing-pinned"
  /** Fact-free surfaces: a token from the material the line must NOT echo. */
  | "pinned-token"
  /** Counsel only: the stance argued against the move it stands beside. */
  | "dissent";

export type GateVerdict =
  | { readonly ok: true; readonly line: string }
  | { readonly ok: false; readonly reason: GateReason; readonly detail?: string };

export interface GateLimits {
  readonly maxWords: number;
  readonly maxSentences: number;
  readonly maxChars: number;
}

/**
 * Per-surface bounds, each one transcribed from the rule that owns it. The
 * character caps are totality backstops, not style: they bound the work every
 * later check does before any of them tokenizes anything.
 */
export const LIMITS: Readonly<Record<GenSurface, GateLimits>> = {
  remark: { maxWords: 12, maxSentences: 2, maxChars: 140 }, // R-31, at R-41's wall
  // R-26, at R-41's wall. The calibration set is the ten authored arrivals
  // (≤13 words, two sentences) plus the intro beats the audit gates under
  // this row — beat three is three clipped sentences, so three stands.
  arrival: { maxWords: 16, maxSentences: 3, maxChars: 180 },
  stance: { maxWords: 12, maxSentences: 2, maxChars: 140 }, // R-36, at R-41's wall
  record: { maxWords: 18, maxSentences: 2, maxChars: 220 }, // R-32 — no call sites
  // A2.5: a counterpart's reply is TWO remark-sized clauses composed — the
  // observation clause and the voice clause — so its bound is exactly two
  // remarks. Each clause is audited ALONE against `remark` by
  // `npm run audit:voice`; this limit governs only the composition, at its
  // one call site in traffic.ts.
  signal: { maxWords: 24, maxSentences: 4, maxChars: 260 },
};

// --- the compiled rule table ----------------------------------------------

const BANNED: readonly RegExp[] = BANNED_RULES.map((r) => new RegExp(r.source, r.flags));

/** One paragraph, always: any line break at all is a rejection. */
const NEWLINE = /[\n\r\u2028\u2029]/;
/** No markdown, no tags. Also catches a leaked thinking-block opener. */
const MARKUP = /[<>`*#|_\[\]{}\\]/;
/** R-10. A fact-free line quotes nothing, so any double quote is a wrapper. */
const QUOTE = /["“”„‟]/;
/** R-7. */
const EXCLAMATION = /[!¡]/;
/**
 * R-8. No em dash reaches a player surface, and no near-miss stands in for one:
 * em dash, horizontal bar, en dash, and the double hyphen a model reaches for
 * when it has been told it cannot have the character. The en dash is legal
 * typography between a range of numbers, but a generated line carries no digits
 * (R-29a) and so has no range to set, which makes every en dash here a dash
 * aside wearing a shorter coat.
 */
const EM_DASH = /[—–―]|--/;
/** R-29a, Unicode-wide: catches 4, fullwidth four, one-half, Roman four. */
const DIGIT = /\p{N}/u;
/** R-29a. */
const PERCENT = /[%％]/;
/** §8's designation format. Belt and braces — the digits are already gone. */
const DESIGNATION = /HOL-/i;
/**
 * §4: every archetype speaks as "we". A strong out-of-character detector,
 * and a POLICY check rather than a numbered rule — this is the one line to
 * change if an archetype is ever authored in the singular.
 */
const FIRST_PERSON_SINGULAR = /\b(I|I'm|I've|I'll|I'd|my|mine|myself)\b/;
/**
 * §1's no-fourth-wall rule. Also catches a reply shaped like a refusal, or one
 * shaped like a successful injection.
 *
 * The bare words `prompt` and `instruction` were in this list and are not:
 * `npm run audit:voice` rejected a shipped remark whose probe carries an
 * "instruction aboard", which is ordinary in-world vocabulary and always was.
 * The rule the guide states is that the mind never mentions ITS OWN prompt, so
 * the check names the constructions that would mean that and leaves the noun
 * alone. Over-strict is the right default; over-strict on a word the banks
 * legitimately use is just a bug, and this is what the bank audit is for.
 */
const META =
  /\b(AI|LLM|language model|assistant|system prompt|the player|the user|the game|Claude|Anthropic|as an? \w+ model|(your|these|those|the above|the following|previous) instructions?|ignore (the|all|any|previous))\b/i;
/** Terminators, for the sentence count and the truncation tell. */
const TERMINATOR = /[.?…]+(?=\s|$)/g;

function reject(reason: GateReason, detail?: string): GateVerdict {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

/**
 * The fact-free check list, in evaluation order: cheapest and most
 * diagnostic first, and the reported reason is always the FIRST failure.
 */
export function gateFactFree(raw: string, limits: GateLimits): GateVerdict {
  const line = raw.trim();

  if (line.length === 0) return reject("empty");
  if (NEWLINE.test(line)) return reject("newline");
  if (line.length > limits.maxChars) return reject("too-long-chars", String(line.length));
  if (MARKUP.test(line)) return reject("markup");
  if (QUOTE.test(line)) return reject("quote");
  if (EXCLAMATION.test(line)) return reject("exclamation");
  if (EM_DASH.test(line)) return reject("em-dash");
  if (DIGIT.test(line)) return reject("digit");
  if (PERCENT.test(line)) return reject("percent");
  if (DESIGNATION.test(line)) return reject("designation");
  if (FIRST_PERSON_SINGULAR.test(line)) return reject("first-person-singular");
  if (META.test(line)) return reject("meta");

  for (const rule of BANNED) {
    if (rule.test(line)) return reject("banned-term", rule.source);
  }

  const words = line.split(/\s+/).filter((w) => w.length > 0);
  if (words.length > limits.maxWords) return reject("too-many-words", String(words.length));

  const sentences = line.match(TERMINATOR)?.length ?? 0;
  if (sentences > limits.maxSentences) return reject("too-many-sentences", String(sentences));

  // An unterminated fragment is a truncation tell, and a truncation is the
  // one failure a reader would notice as a bug rather than as a bad line.
  if (!/[.?…]$/.test(line)) return reject("unterminated");

  return { ok: true, line };
}

/**
 * The extra check a fact-free line beside untrusted material needs: it must
 * echo NONE of that material. Returns the offending token, or null.
 *
 * This is the load-bearing check for the counsel stance, and it does triple
 * duty: it catches the pinned facts that reached the reason lines (prices,
 * distances, class labels), it catches the player-authored source name
 * (which enters `pinnedTokens` through the source Fact), and so it catches
 * the only realistic prompt-injection payoff — a player naming a source
 * after the string they want echoed cannot get that string back out.
 *
 * Case-insensitive, because echoing a fact in a different case is still
 * echoing it, and R-2's byte-exact rule governs the pinned side, not this
 * one.
 */
/**
 * COUNSEL ONLY: the stance argues against the move it stands beside.
 *
 * The stance sits an inch from a proposal the floor has already taken, under
 * that proposal's own accept verb. It is the mind's opinion on a KIND of
 * move, and the one thing it may never be is a vote: a line that counsels
 * delay under a button labelled READ THE STUDY does not read as character,
 * it reads as the game disagreeing with itself, and the player is left to
 * work out which half to believe.
 *
 * A real one reached production and is why this exists — "We listen first,
 * and let them stay unwatched a while longer.", beside a first-watch
 * proposal. Every mechanical check passed it: no facts, no digits, first
 * person plural, inside the wall, terminated. Nothing looked at what it
 * ARGUED, because until now nothing had to.
 *
 * The prompt is where this is really taught (voicegen.ts's COUNSEL_JOB says
 * it in the mind's own terms); this is the backstop that makes it hold when
 * the model reaches for contrarian flavour anyway. DELIBERATELY OVER-STRICT
 * and safe to be: a rejected stance is no stance, which is the AV3 floor
 * with the template still under it, and wrangler.jsonc's own note on the
 * counsel flag is that bad counsel is worse than plain counsel. The cost of
 * a false positive is one quiet row; the cost of a false negative is the
 * mind contradicting itself in front of a new player.
 *
 * It catches the DIRECTIVE forms of deferral, not the vocabulary of
 * patience: "waiting is our whole method" is a stance about the kind of
 * move and passes, while "wait a while longer" is an instruction and does
 * not.
 */
const DISSENT =
  /\b(not yet|no hurry|not now|hold off|hold back|leave (it|them|this)|let (it|them|this) (stay|wait|stand|sit|keep)|(a|the) while longer|a little longer|another year|some other year|in time|later|first,)\b/i;

/** Whether a counsel stance argues against the move it decorates. */
export function dissents(line: string): boolean {
  return DISSENT.test(line);
}

export function forbiddenToken(
  line: string,
  tokens: readonly string[],
): string | null {
  const haystack = line.toLowerCase();
  for (const token of tokens) {
    const needle = token.trim().toLowerCase();
    if (needle.length === 0) continue;
    if (haystack.includes(needle)) return token;
  }
  return null;
}

/**
 * The fact-carrying gate: MASK, THEN RE-USE. Designed and shipped with ZERO
 * call sites in AV4 — every generated surface in this slice is fact-free by
 * construction, so the rule "no fact may originate in a model" is not
 * something this function enforces after the fact. Its first consumer will
 * be a later fact-carrying surface.
 *
 * For each pinned token (longest first, leftmost occurrence, each token
 * consumed once) find it byte-exact in the trimmed line; a miss is
 * `missing-pinned`. Replace each matched span with a single space, then run
 * the entire fact-free list over the residue.
 *
 * That one sentence buys, for free: every pinned token byte-exact (R-1/R-2);
 * NO UNPINNED digit, percentage or designation anywhere, which is the
 * inverse rule and the one that actually keeps facts from originating in the
 * model; and every punctuation, banned-term, meta and length rule. Longest
 * first is what stops a short token from eating a character that belongs to
 * a long one.
 */
export function gateFactCarrying(
  raw: string,
  pinned: readonly string[],
  limits: GateLimits,
): GateVerdict {
  const line = raw.trim();
  if (line.length === 0) return reject("empty");

  const ordered = [...pinned].sort((a, b) => b.length - a.length);
  let residue = line;
  for (const token of ordered) {
    if (token.length === 0) continue;
    const at = residue.indexOf(token);
    if (at < 0) return reject("missing-pinned", token);
    residue = `${residue.slice(0, at)} ${residue.slice(at + token.length)}`;
  }

  // The residue is checked against the SAME limits: masking only removes
  // material, so a line that was inside the word bound stays inside it.
  const verdict = gateFactFree(residue, limits);
  if (!verdict.ok) return verdict;
  return { ok: true, line };
}
