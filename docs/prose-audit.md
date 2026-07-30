# Prose audit — `voice.ts`, `minds.ts`

First run of `/prose-audit`, scoped to the two files that carry the most
authored voice: `server/src/voice.ts` (arrival lines, frame lines, report
remarks, resistance lines, the traffic banks) and `server/src/minds.ts`
(charters, first reads, wake lines). Detection lens:
[jooray/humanizer](https://github.com/jooray/humanizer), 35 patterns from
Wikipedia's *Signs of AI writing*, run in detect mode and filtered through the
reconciliation in `.claude/commands/prose-audit.md`.

Roughly 300 authored strings read. The banks are in good shape: the mechanical
audits are clean, the archetype voices are distinct, and the humanizer's
vocabulary tells are essentially absent (one hit, below). The findings that
matter are structural, and only one of them is on a shipped string.

## Summary

| | Count |
|---|---|
| Applied | 3 |
| Proposed, not applied (authored voice, John's call) | 3 |
| Considered and kept | 4 |

---

## Applied

### A1 — `voice.ts:401` instructs authors to use a spaced em dash

```
// wit 0, PAST tense, 1–2 sentences, ≤ 34 words, colon for a reveal, spaced
// em-dash for an aside, no exclamation mark, no §6 term, and none of the
```

The house-rules block for every record sentence still carries the pre-R-8
instruction. R-32 now reads "colon for a reveal, comma for an aside (R-8)".

This is not a player surface, so `audit:dashes` structurally cannot see it, and
it is the highest-leverage finding in the file: it is the standing instruction
every future record builder is written against, and it tells its reader to
produce the one construction the guide bans. A stale authoring rule reproduces
itself; a stale string does not.

**Rule:** R-8, R-32. **Pattern:** 15 (em dashes), reaching the prose through its
instructions rather than through its strings.

### A2 — `voice.ts:1108` filler phrase, cloister / hail

> "A door for one visitor is still a door. We did not seal this system **in
> order to** put one back in."

The only AI-vocabulary-family hit in ~300 strings. Tightening it also sharpens
the register: Cloister is "cold, precise, sealed" (§4), and the clipped form is
more in character than the padded one.

**Fixed to:** "We did not seal this system to put one back in."
**Rule:** none violated; §4 register improved. **Pattern:** 24 (filler phrases).

### A3 — `voicegen.ts` learns the trailing comment clause, and `PROMPT_VERSION` bumps

The pass-3 half of P1 below. The generated remark is trained on the shipped
bank, so the tic reproduces itself at runtime unless the prompt names it. Added
to `REGISTER` (not `HARD_RULES`: this is a matter of degree, not a token a regex
can name) and bumped `PROMPT_VERSION` v3 → v4.

The bump is mandatory, not housekeeping. `PROMPT_VERSION` lives in the storage
key and the module's own comment states the contract: a prompt change that does
not bump it leaves every previously-accepted line keyed to a version that no
longer describes the prompt that produced it. Nothing is deleted; v3's verdicts
stay in storage, unread.

**Rule:** R-6, R-38. **Pattern:** 3 (superficial appositive analyses).

---

## Proposed, not applied

These are edits to authored voice. The audit's job is to find them; deciding
them is the author's.

### P1 — The trailing `, which ...` clause is a cross-archetype cadence tic

36 occurrences in `voice.ts`. 21 of 124 report remarks and 9 of the signal-voice
pools, and 15 of the 36 are the identical `, which is ...` frame.

Distribution across archetypes:

| congress | sowing | monument | shepherd | phoenix | engine | cloister | tide | herald | beacon |
|---|---|---|---|---|---|---|---|---|---|
| 4 | 3 | 3 | 2 | 2 | 2 | 2 | 1 | 1 | 1 |

All ten. That even spread is the finding, not the count: R-6's test is whether a
construction would fit another archetype unchanged, and §4 names
interchangeability as the tell of homogeneous wit. Each individual instance
reads well. Collectively they are one writer's reflex for closing a sentence,
wearing ten different costumes.

Samples, one per archetype, to show the shape rather than to condemn any single
line:

- tide / settled: "…and then hungry again, **which is the usual order of things**."
- cloister / refused: "…is not leaving this system, **which is at least a clean outcome**."
- shepherd / sent: "…and out of our reach, **which is the part we never enjoy**."
- congress / spoken: "…begun disagreeing about what to make of it, **which we consider a healthy sign**."
- monument / settled: "…with the seriousness it deserves, **which is considerable**."

**Not applied because** thinning 30 shipped strings is a voice decision at a
scale that wants the author's hand, and because A3 already stops the tic from
growing on the generated side. A reasonable target is bringing the report-remark
count from 21 down to roughly six, keeping it where the clause earns its place
(Monument's "which is considerable" is doing real liturgical understatement) and
recasting it where it is only a soft landing.

**No gate rule proposed.** A `, which` prohibition in `stylegate.ts` would fail
`audit:voice` against 36 shipped strings on the next CI run, and it would be the
gate that was wrong: the construction is legitimate English that this bank
merely overuses. Frequency is not something a per-line gate can see. The prompt
is the correct instrument, which is what A3 does.

**Rule:** R-6. **Pattern:** 3.

### P2 — `minds.ts:316`, S9's wake line names no mode of mind (R-12)

> "The sky was never a ceiling, so why would the sky's sky be one?"

R-12: "How this species is a mind — parliament of arms, a mind with no hands,
one will with a million hands — must survive the restyle." Every other wake line
in the bank names a cognitive architecture:

- S1 "a federation of arms that has become a federation of selves"
- S2 "A chorus discovers it holds one more voice than it counted"
- S5 "A reef that has been half-thinking for megayears finally finishes the thought"
- S11 "A mind emphatic that all of it is one self"
- S14 "Two obligate partners cross the threshold together"
- S20 "A being made of captured starlight"

S9 alone gives ambition instead. It is also the bank's only rhetorical question
(pattern 34), and the two facts are related: the question form is what leaves no
room for the architecture.

S9 is the winged grasping flyer: aerial, **unitary** cognition, acoustic/song
signal channel, "an astronomer by instinct, outward by temperament".

**Proposed:** "A single mind that thinks in song, awake now under the sky it has
read all its life and never once called a ceiling."

24 words (R-18 ceiling 32), one sentence, no colon or semicolon, no numeral.
Names the mode of mind (single, song-borne), keeps the original's ceiling
payload, and keeps the astronomer's temperament in "read all its life".

**Not applied because** the existing line has real charm and the replacement is a
rewrite rather than a repair.

**Rule:** R-12. **Pattern:** 34 (rhetorical openers).

### P3 — `minds.ts:332`, S11 names another archetype in-world

> "A mind emphatic that all of it is one self, burning outward **like a Tide**:
> one will, a million hands, a star to feed it."

Two observations, one of which may be intentional.

`The Tide` is a pinned archetype name (§8). S11's own archetype is the Engine, so
the line has one civilization's chronicle describing itself by reference to a
different archetype, which reads as the taxonomy leaking in-world: the mind
would have to know the ten-archetype scheme for the simile to land. Against
that, archetype names *are* player-facing (they head the inheritance card), so
this is not the design-vocabulary violation §8's last line describes. Judgment
call, flagged rather than decided.

Second, "one will, a million hands, a star to feed it" is a rule of three built
on §1's own two-item R-12 example ("one will with a million hands"). The third
item is the appended one. Minor, and Engine's register tolerates a list.

**Rule:** §8 (unclear). **Pattern:** 10 (rule of three).

---

## Considered and kept

Recording these so the next run does not re-litigate them.

### K1 — Nine of ten first reads are `fragment; independent clause`

Not a defect. R-9 names this construction as "the balanced-opposition beat the
firstReads use" — a documented house pattern for that surface, not a tic.

### K2 — All ten arrival lines run the same three moves

Every one is [the record is complete to now] → [after it there is nothing] →
[you are what fills it]. Structurally identical across the bank.

Kept, for two reasons. A player sees exactly one arrival line, once, for their
own archetype, so the repetition is invisible in play. And the three moves *are*
the surface's job: the arrival line is where the mind hands the player the game.
Ten variations on one brief is the correct shape for a brief.

Worth revisiting only if arrival lines ever become AV4-generated, at which point
a bank whose members share one skeleton would teach the model that the skeleton
is the voice. They are not generated today.

### K3 — The rule-of-three instances are diegetic

Pattern 10 fires on several strings, and each is doing the archetype's own work
rather than reaching for false comprehensiveness:

- engine / spoken: "The schedule holds, the allocation stands, and nothing here requires anyone's attention." — a bureaucratic status list, which is the Engine's stated wit source.
- congress / sent: "objections that were entered, heard, and overruled in that order" — parliamentary formula, and "in that order" is the joke.
- cloister / unspoken: "We note the fact, we decline the story, and we do not send another to find out." — a triple refusal, Cloister's whole register.

The humanizer flags the form. Here the form is the content.

### K4 — S17's wake line is close to §1's own example, and correctly so

> §1: "A mind for whom a ten-thousand-year project is a Tuesday."
> S17: "A mind for whom a ten-thousand-year project is a breath."

Not a flattened copy. S17 is the cryogenic slow-mind, and "a breath" encodes that
species' tempo where "Tuesday" would not: Tuesday is domestic-mundane, and this
mind is glacial. The guide's examples illustrate moves, and this is the move
adapted to its species rather than transcribed.

---

## What the mechanical audits already cover

Confirmed clean on this scope, reported here so the next run can skip them:
no em dash or en dash in any string, no curly quotes, no markup, no exclamation
marks, no chatbot or meta artifacts, no §6 coinage, no numeral in a remark. The
humanizer's patterns 15, 16, 17, 18, 19, 20, 21, 22 and 29 have no surface here
because `stylegate.ts` and the CI audits already close them.

The AI-vocabulary sweep (*crucial*, *landscape*, *tapestry*, *showcase*,
*testament*, *serves as*, *boasts*, *at its core*, and the rest) returned exactly
one hit across both files: A2's "in order to".
