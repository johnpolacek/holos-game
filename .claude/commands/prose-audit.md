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
specification. Everything else in this command — including the humanizer — is a
lens applied underneath it, never above it.

If the `/humanizer` skill is installed, use it as the detection pass. If it is
not, apply its criteria directly: AI-tell cadence (rule-of-three lists, "not just
X but Y", "it's worth noting", symmetrical clause pairs), hedging and
throat-clearing, abstraction where a concrete noun was available, uniform
sentence length, and copy that describes a feeling instead of stating a fact and
letting the feeling land.

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
become a mechanical rule, not just a hand edit: a `stylegate.ts` rule, a
`bannedterms.ts` entry, a tightened `voicegen.ts` prompt, or a new audit script
wired into `package.json` and `.github/workflows/ci.yml`. An improvement that
only lives in an edited string will not survive the next generated line.

## Guardrails

Where the humanizer and `prose-style.md` disagree, `prose-style.md` wins. Log
every such conflict in the report rather than resolving it silently.

- **R-1 / R-2 / R-3.** Numbers, dates, distances, tiers, §8 pinned labels and the
  load-bearing clauses of a fingerprint are byte-exact. Before restyling a
  fingerprint, list its load-bearing clauses and show the new text still asserts
  each one.
- **R-8.** No em dash, en dash, horizontal bar or double hyphen on any player
  surface. A humanizer reaches for a cadence dash by reflex; here it is a CI
  failure. Colon, semicolon, comma, full stop.
- **§2 register map.** Each surface has a wit ceiling. Observatory-deadpan
  surfaces (wit 0 — UI chrome, work-list rows, dial questions, the frame
  explainers) do not get warmed up, humanized, or given personality. Flatness
  there is the design, not a defect.
- **§4.** Do not homogenize the archetypes. A Monument and a Tide must not
  converge on one voice because both got the same edit.
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
only its own file.

Write `docs/prose-audit.md` **before** editing. Every finding as: `file:line` —
the quoted string — the tell — the proposed replacement — the `prose-style.md`
rule it lives under. Mark findings you are *not* acting on and say why (usually:
the rule that forbids the fix). That table gets read before the diffs land.

Then apply the edits and the rule changes. Green before committing:

```sh
npm run typecheck && npm run build && npm run audit:dashes && npm run audit:banned \
  && npm run audit:voice && npm run audit:names && npm run audit:parity
```

`audit:voice` runs every shipped bank string through the gate, so it is the check
that proves an edit did not break the gate contract. If it fails after a
`stylegate.ts` change, decide deliberately whether the gate is wrong or the bank
is, and say which in the commit message.

Commit in small single-purpose commits — audit doc, bank edits, chrome edits,
gate and rule changes, each on its own. Do not open a PR unless asked.
