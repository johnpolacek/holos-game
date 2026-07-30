---
description: Audit player-facing prose for AI tells against prose-style.md, and push the fixes upstream into the gate
---

Audit player-facing prose in this repo for quality, and close the loop so the
improvements hold for content written later.

**Scope:** $ARGUMENTS

If that scope line is empty, audit everything below. If it names files, surfaces
or banks, audit only those — but still run pass 3, because a tell found anywhere
is a tell the runtime generator can reproduce.

Read `docs/prose-style.md` in full before touching anything. It is the
specification. Everything else in this command — the humanizer included — is a
lens applied underneath it, never above it.

## The humanizer

The detection pass uses [jooray/humanizer](https://github.com/jooray/humanizer),
a portable skill encoding 35 AI-writing patterns from Wikipedia's *Signs of AI
writing*. Install once:

```
/plugin marketplace add jooray/humanizer
/plugin install humanizer@humanizer
```

Then invoke `/humanizer:humanizer` **in detect mode** — quote the offending
phrase, name the pattern, propose nothing in place. Never its file mode. File
mode rewrites in place, and this repo has strings (R-1 facts, §8 pinned labels)
where an in-place rewrite is a data-loss bug rather than an edit. If the plugin
is not installed, apply the pattern list below from memory of the same source.

Holos surfaces are mostly six-to-twenty-word bank strings, not documents. Roughly
a third of the 35 patterns are document-shaped (heading case, inline-header
lists, section formulas) and simply have no surface here. Read the reconciliation
before running it, or most of the findings will be noise.

### Already enforced, mechanically — do not re-report

`stylegate.ts` rejects these at runtime and the audits catch them in CI. A
finding here means the gate has a hole; say so, and fix the gate rather than the
string.

| Humanizer pattern | Enforced by |
|---|---|
| 15 Em dashes | R-8, `audit:dashes`, `EM_DASH` — Holos is stricter: en dash and `--` too |
| 20 Curly quotes | `QUOTE` rejects every quote character, curly or straight |
| 16, 17, 18, 19 Boldface, inline headers, title case, emoji | `MARKUP` |
| 21, 22, 29 Chatbot artifacts, disclaimers, signposting | `META` |
| 7 (partly) AI vocabulary | only for §6 coinages; see below for the rest |

### The actual yield — report these

Nothing mechanical catches them, and every one is live on a bank string:

3 superficial `-ing` analyses, 7 AI vocabulary (*crucial*, *landscape*,
*tapestry*, *showcase*, *testament*), 8 copula avoidance (*serves as*,
*boasts*), 9 negative parallelism, 10 rule-of-three, 12 elegant variation,
13 false ranges, 24 filler phrases, 25 excessive hedging, 27 hyphenated pair
overuse, 28 authority tropes (*at its core*), 31 diff-anchored writing.

### Overridden by prose-style.md — the guide wins

Do not act on these. They are cases where the humanizer's general instinct is
wrong *for this game*, and running it blind would strip the voice on purpose.

- **35 Colon-reveal constructions.** R-8's own rationale names the colon as the
  sanctioned replacement for the banned dash: "a colon sets up a reveal." The
  humanizer wants those gone. It cannot have them, or R-8 has no legal exit.
- **1 Significance inflation.** §1: the grandeur is real and load-bearing.
  Flag a line only when it fails §1's own test — that with the wit deleted, the
  sentence would still be *true and grand*. Inflation is a lie about scale, not
  the presence of scale.
- **33 Aphorism formulas.** A charter is a founding epigraph. Aphorism is the
  form of that surface, at wit ceiling 3. Applies to `minds.ts` charters only.
- **11, 32 Staccato contrast and manufactured punchlines.** §1's understatement
  move is a short final beat delivered quietly. Flag it when it is drama for its
  own sake; not merely for being short.
- **14 Passive voice.** The observatory deadpan and `civseed.ts`'s annalist
  register are agentless and past-tense by design.
- **12 Elegant variation, against pinned vocabulary.** The anti-repetition
  instinct is the single most dangerous pattern here: §8 labels repeat verbatim
  or they are not pinned. Variation is a finding in *prose*, never in a label.

## Scope — three passes, in this order

**1. Shipped banks (server).** `voice.ts` (`VOICE_CARDS`, `REPORT_REMARKS`,
`RESISTANCE_LINES`, `SIGNAL_OBSERVATIONS`, `SIGNAL_VOICE`, `TONE_CLAUSE`,
`ACCORD_CLAUSE`), `minds.ts` (charter / firstRead / wake), `cradles.ts` and
`lineages.ts` fingerprints, `dials.ts` gloss and question, `civseed.ts` chronicle
templates, `signalparts.ts`, `questions.ts`, `missions.ts`, `projects.ts`,
`studies.ts`, `tend.ts`, `contest.ts`, `proposals.ts`, `report.ts`, `contact.ts`.

**2. Chrome (client).** `model.ts`, `sourcecard.ts`, `studyboard.ts`,
`ceremony.ts`, `contactceremony.ts`, `cosmos.ts`, `system.ts`, `accord.ts`,
`startover.ts`, `questionmethod.ts`, `voicebeat.ts`, `clock.ts`, `app.ts`, plus
`client/index.html` and the OG copy in `scripts/build-og.mjs`.

**3. The generation path.** This is the going-forward half, and it matters more
than passes 1 and 2. Read `voicegen.ts`'s prompts and `stylegate.ts`'s rule
table. Any tell found in pass 1 or 2 that a model could reproduce at runtime must
become a mechanical rule, not just a hand edit. An improvement that only lives in
an edited string will not survive the next generated line.

Where such a rule goes:

- **A new rule constant in `stylegate.ts`**, beside `META` and `MARKUP`. This is
  the home for the humanizer's yield list — AI vocabulary, copula avoidance,
  negative parallelism. Add it to `gateFactFree`'s check list in evaluation
  order, cheapest and most diagnostic first, and give it a `GateReason`.
- **A tightened prompt in `voicegen.ts`**, when the tell is a matter of degree
  rather than a token a regex can name.
- **Not `bannedterms.ts`.** That file is generated: `sync-banned-terms.mjs`
  builds it from `prose-style.md` §6, which holds exactly one fenced block per
  *source novel*, plus §8's comms register. An AI-vocabulary ban has no honest
  home there and adding one means lying in a `### Nth source:` heading. Change
  §6 only for a real coinage, and regenerate with `npm run sync:banned`.

Remember the gate's asymmetry: rejection is cheap, acceptance is expensive. A
false reject costs one templated line; a false accept costs the register. New
rules should be over-strict — but `audit:voice` runs every shipped bank string
through the gate, so an over-strict rule that catches legitimate authored prose
fails CI immediately. That is the design, and it is why the rule and the audit
land in the same commit.

## Guardrails

Where the humanizer and `prose-style.md` disagree, `prose-style.md` wins. Log
every such conflict in the report rather than resolving it silently.

- **R-1 / R-2 / R-3.** Numbers, dates, distances, tiers, §8 pinned labels and the
  load-bearing clauses of a fingerprint are byte-exact. Before restyling a
  fingerprint, list its load-bearing clauses and show the new text still asserts
  each one.
- **R-8.** No em dash, en dash, horizontal bar or double hyphen on any player
  surface. Colon, semicolon, comma, full stop.
- **§2 register map.** Each surface has a wit ceiling. Observatory-deadpan
  surfaces (wit 0 — UI chrome, work-list rows, dial questions, the frame
  explainers) do not get warmed up, humanized, or given personality. Flatness
  there is the design, not a defect.
- **§4.** Do not homogenize the archetypes. A Monument and a Tide must not
  converge on one voice because both got the same edit. Every archetype speaks
  as "we"; `FIRST_PERSON_SINGULAR` is policy, not preference.
- **§6.** No Banks, Vinge, Robinson or Schroeder coinage, and nothing closely
  imitating one.
- **R-29 / R-29a / R-30.** No numeral or pinned label inside a remark bank; a
  fact-bearing sentence stays deadpan and the stance goes in its own sentence.
- **R-37.** `voicegen.ts` and `stylegate.ts` keep their import allowlist. If a
  new rule needs data, it does not get it from a catalog module.
- `style.css` tokens own type and ink. Do not touch presentation.

## Method

Batch by file and run the batches as subagents per CLAUDE.md's topology: Sonnet
for the mechanical sweep of a settled file, Opus for the register-level calls in
`voice.ts`, `minds.ts` and the `voicegen.ts` prompts. The orchestrator owns the
guardrails above and verifies them in every subagent's output — a subagent sees
only its own file, and the override list is exactly the kind of context a
subagent will not have.

Write `docs/prose-audit.md` **before** editing. Every finding as: `file:line` —
the quoted string — the humanizer pattern number and name — the proposed
replacement — the `prose-style.md` rule it lives under. Mark findings you are
*not* acting on and say why (usually: the rule that forbids the fix). That table
gets read before the diffs land.

Then apply the edits and the rule changes. Green before committing:

```sh
npm run typecheck && npm run build && npm run audit:dashes && npm run audit:banned \
  && npm run audit:voice && npm run audit:names && npm run audit:parity
```

If `audit:voice` fails after a `stylegate.ts` change, decide deliberately whether
the gate is wrong or the bank is, and say which in the commit message.

Commit in small single-purpose commits — audit doc, bank edits, chrome edits,
gate and rule changes, each on its own. Do not open a PR unless asked.
