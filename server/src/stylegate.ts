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
export type GenSurface = "remark" | "arrival" | "stance" | "record";

export type GateReason =
  | "empty"
  | "newline"
  | "too-long-chars"
  | "markup"
  | "quote"
  | "exclamation"
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
  | "pinned-token";

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
  remark: { maxWords: 22, maxSentences: 2, maxChars: 200 }, // R-31
  arrival: { maxWords: 34, maxSentences: 3, maxChars: 320 }, // R-26
  stance: { maxWords: 22, maxSentences: 2, maxChars: 200 }, // R-36
  record: { maxWords: 34, maxSentences: 2, maxChars: 400 }, // R-32 — no call sites
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
