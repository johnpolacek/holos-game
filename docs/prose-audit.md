# Prose audit

- [Pass 1 — the server banks](#pass-1--voicets-mindsts) (`voice.ts`, `minds.ts`)
- [Pass 2 — the client chrome](#pass-2--the-client-chrome)
- [Pass 3 — the server catalogs](#pass-3--the-server-catalogs)
- [Pass 4 — A4 and A5](#pass-4--a4-and-a5)
- [Closing state](#closing-state)

---

## Pass 1 — `voice.ts`, `minds.ts`

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

---

## Pass 2 — the client chrome

`model.ts`, `sourcecard.ts`, `studyboard.ts`, `ceremony.ts`,
`contactceremony.ts`, `cosmos.ts`, `system.ts`, `accord.ts`, `startover.ts`,
`questionmethod.ts`, `voicebeat.ts`, `clock.ts`, `app.ts`, plus
`client/index.html` and the social-card copy in `scripts/build-og.mjs`. About
14,000 lines of client, roughly 310 candidate player-facing strings after
filtering out selectors, class names and identifiers.

**The chrome is in better shape than the banks.** The AI-vocabulary sweep
returned **zero** hits across the entire client, against one in the server
banks. The ALL-CAPS chrome is compliant with R-24 everywhere it is a set
phrase. The §8 pinned labels are byte-exact. There is no wit on a wit-0
surface anywhere I could find, which is the failure this pass was most likely
to turn up and did not.

What it did turn up is mostly **spec coverage** rather than prose: two shipped
surfaces that no §2 row describes and no length rule bounds.

| | Count |
|---|---|
| Applied | 1 |
| Proposed, not applied | 4 |
| Considered and kept | 3 |

### Applied

#### A4 — `§2`'s register map is missing two shipped surfaces

`accord.ts` and `questionmethod.ts` both render player-facing prose and
neither has a row in the register map. `questionmethod.ts` cites "prose-style
§2's studyboard row" in its own header, but that row covers "work-list rows /
states" and these are 55-word explanatory paragraphs; `accord.ts` calls itself
"the compliance rail's chrome" in its header and appears in §2 not at all.

Added both rows, transcribing the register each file already declares for
itself. §7's sync obligation decides the direction: the code is canonical and
the doc mirrors it, so this is the doc catching up rather than a new decision.

**Rule:** §2, §7.

### Proposed, not applied

#### P4 — The accord rail exceeds R-24, and R-24 has no composition clause

R-24 bounds chrome at six words. The rail's longest state renders as:

> `THEIR LIGHT SINCE: BELOW THE FLOOR · AS OF 240 Y AGO`

Eleven words. Its shortest failing sibling, `THEIR LIGHT SINCE: NONE HAS
REACHED US YET`, is eight.

The rail is not really a set phrase, though. It is a pinned stem plus an
interpolated fact, which is the same construction R-32 already carves out for
record sentences: "the bound governs the framing clause". R-24 has no
equivalent sentence, so as written it is violated by shipped code.

**Proposed amendment to R-24**, following R-32's existing precedent rather
than inventing a mechanism: *the bound governs the set phrase. A composed
chrome line (a pinned stem plus an interpolated `Fact`, as in the accord rail)
is bounded on its stem; the fact is bounded at its own source.*

**Not applied because** amending a rule in the style guide is the author's
call, not the audit's. The alternative is shortening the rail, which I would
not recommend: every word in it is load-bearing and `AS OF n Y AGO` is §8
pinned.

**Rule:** R-24.

#### P5 — The question-method paragraphs have no length rule

Six paragraphs, 52 to 62 words, three sentences each, remarkably consistent —
clearly written to a spec, but not to one the guide records. The nearest rule
is R-19 (gloss: 1 to 2 sentences, 18 to 42 words), which they overflow by
design: `questionmethod.ts`'s header documents a deliberate three-move
structure (what the archive already holds, what the compute buys, why the
price is what it is).

**Proposed:** a new bound, R-39, matching the shipped consistency rather than
constraining it: *Question method: 3 sentences, 45 to 65 words; observatory
deadpan, wit 0; no numerals (the costs and clocks beside it are effective and
a literal would be falsifiable by a landed project).*

The numeral prohibition is not new; `questionmethod.ts` already states and
observes it. Writing it down is what makes it survive the next author.

**Rule:** none exists, which is the finding.

#### P6 — The social card and the meta description ship three different taglines

| Where | Text |
|---|---|
| `index.html` meta description | "A hard science fiction civilization game where you raise a world to superintelligence and then guide its immortal future **out into** a galaxy built from real physics." |
| `index.html` og: and twitter:description | "Raise a world to superintelligence, then **guide its immortal future across** a galaxy built from real physics." |
| `build-og.mjs`, rendered into the image | "Raise a world to superintelligence, then **reach across** a galaxy built from real physics" |

The second and third appear **together**, in the same social-card preview: the
image says one tagline and the description under it says another. Pattern 12
(elegant variation) on the one string where variation has no upside.

There is a real constraint behind the divergence: the image tagline renders
into a fixed 940px box, and the description version is 105 characters against
the image's 84. So the short form exists for a reason. But "reach across a
galaxy" and "guide its immortal future across a galaxy" do not promise the
same game, and "immortal future" is the more distinctive of the two: deep time
is what Act 3 actually is.

**Not applied because** the tagline is marketing voice and the image is a
checked-in binary that would need regenerating (`npm run og`). Recommend
picking one short form that fits 940px and using it in all three places.

**Rule:** none; §8's spirit (a load-bearing phrase does not get restyled).

#### P7 — A negative triple in the watch explainer

`studyboard.ts`, the longest string on the board:

> "**Nothing to open, nothing to hold, and no limit on how many stand at
> once.** The light arrives whether or not you attend to it, so watching
> spends only patience. Compute buys questions, the inference that separates
> one reading from another, and no question has been put to this source."

Patterns 9 and 10 together: three negations in parallel, reaching for
comprehensiveness. All three make the same point (watching costs you nothing),
so the third is padding the cadence rather than adding a claim.

**Not applied:** authored voice, and the surface is teaching a real mechanic
where over-explaining is the safer failure.

**Rule:** R-4 (one wit beat), loosely. **Pattern:** 9, 10.

### Considered and kept

#### K5 — The parallel section captions

"Everything your instruments have found. **Tap one to look closer.**" /
"Sources your instruments have found. **Tap one to read the brief.**" / "What
the observatory can build. **Tap one to read what it grants.**"

And the sibling family: "What the light brought while you were away", "What
the observatory can build", "What your civilization can begin now".

Parallel captions across sibling sections are good interface writing: the
shared shape is what tells a player these are the same kind of thing. This is
the one place a template is a feature.

#### K6 — `1–24` in the ceremony's name hint is a legal en dash

`Name must be 1–${MAX_NAME_LEN} characters.` uses U+2013 on a player surface.
Not an R-8 violation: the rule bans an en dash "standing in for" an em dash,
and `stylegate.ts`'s own note allows that "the en dash is legal typography
between a range of numbers". This is a numeric range. `audit:dashes` reads
U+2014 only, so it would not have caught it either way; checked by hand and
cleared.

#### K7 — `I HAVE WRITTEN IT DOWN` is first-person singular, correctly

The gate's `FIRST_PERSON_SINGULAR` rule enforces §4's "every archetype speaks
as we". This button is not the mind speaking: it is the **player**
acknowledging they saved their key, and it is the one surface in the game
where the player has a voice. Correct as written.

---

## Pass 3 — the server catalogs

`cradles.ts`, `lineages.ts`, `dials.ts`, `civseed.ts`, `signalparts.ts`,
`questions.ts`, `missions.ts`, `projects.ts`, `studies.ts`, `tend.ts`,
`contest.ts`, `proposals.ts`, `report.ts`, `contact.ts`, `names.ts`. About
8,900 lines, 413 player-facing strings.

This completes the sweep. Every file named in `/prose-audit`'s three passes has
now been read.

**The catalogs are the cleanest prose in the repo.** The findings are two
authored-voice calls and one gap in what CI was watching.

| | Count |
|---|---|
| Applied | 1 |
| Proposed, not applied | 2 |
| Recorded | 3 |

### Applied

#### A5 — `npm run audit:catalog`: §6 now runs over the catalogs

§6 states an obligation in prose: "A pre-merge grep of the string banks and all
doc-quoted interface prose against these must return zero hits outside the
allowlist." That grep was a human promise. Three audits already touch §6 and
none of them covered the catalogs:

| Audit | What it actually does |
|---|---|
| `audit:banned` | Checks §6 and `bannedterms.ts` are **in sync**. Never reads a bank; a perfectly synced rule table proves nothing about the prose it governs. |
| `audit:voice` | Runs the whole gate (which compiles §6) over every bank string in **`voice.ts`, and `voice.ts` only** — its own header says why. |
| `audit:names` | Runs a hand-maintained **subset** of §6 over the name pools. |

So 413 player-facing strings across nine catalogs, `minds.ts` included, met §6
nowhere in CI. `audit:dashes` was the only automated check that reached them,
and it tests one character.

The new script imports the compiled `bannedterms.js` the same way `audit:voice`
imports the compiled gate, so it cannot drift from the §6 that ships, and it
scrapes sources rather than importing them for the same reason `audit:voice`
does: `cohort.ts` is the only module that may pull the catalog chain into a
process.

**They are clean: 658 strings across 31 modules, 78 rules, zero hits.** That is
the only honest time to add an audit, and it is also the point. Verified twice
against planted coinages to confirm it fails, then restored.

**It fails closed**, and it had to. The first version was an allowlist of ten
catalog files, and it was wrong within one merge: A4 and A5 landed `voyages.ts`
and `orders.ts` while this audit was being written, both carrying real
player-facing prose (charter clauses, landfall headlines, the warm movement
order), and neither was on the list. A hand-maintained file list is the same
drift this audit exists to catch, one level up.

So it now scans every module in `server/src` except an explicit four-name
`NOT_A_SURFACE` set: `bannedterms.ts` (it *is* the ban list, the
`audit-dashes` precedent), `voice.ts` (`audit:voice` runs the whole gate over
it, which is strictly more), and `contest.ts` plus `behavior.ts`, whose `why`
fields are documented in their own modules as design notes that never reach a
surface. R-37's CI grep makes the same choice for the same stated reason: it
"fails CLOSED when a new module is added".

The second control confirmed the fix rather than the original: a coinage
planted in `voyages.ts` — the module the allowlist had missed — is caught.

**Rule:** §6. Wired into `package.json` and CI after `build`.

### Proposed, not applied

#### P10 — Half the cradle fingerprints run a three-item list

21 of 41. The shape is consistent enough to read as the bank's default cadence
rather than a series of choices:

- "steady light, a survivable sky, time to develop without constant catastrophe"
- "deep time, little energy, a civilization that grows slow, patient, thrifty with light"
- "built low, braced, and wind-wise"
- "abundant metal, scarce water and air, a savage gravity well"
- "sheltering from flares in caves, deep water, or shadow"

Some are true enumerations, where three environmental facts are what there is to
say. Others reach the third item for rhythm.

**This one is visible in play**, which is what separates it from the arrival
lines (K2). Fingerprints reach the player through `civseed.ts`'s chronicle
lines, and the ceremony is a **carousel** of candidate CivCards: a player scrolls
several worlds in a row before choosing, reading one fingerprint after another
on the same surface. A cadence shared by half the bank is legible there in a way
a once-per-run line never is.

There is a structural pressure behind it worth naming: R-21 gives 36 words for
one or two sentences, and a comma-triple is the most compact way to pack three
environmental facts into that budget. So this is not carelessness, it is the
bound doing what bounds do.

**Not applied:** 21 authored strings, and the fix is per-string judgment about
which third item earns its place.

**Rule:** R-21 (indirectly). **Pattern:** 10.

#### P11 — "Rare, and important." editorializes on the world's voice

`cradles.ts`, the sunlit ocean world:

> "A warm world-ocean under a familiar yellow sun, continents absent: an
> aquatic civilization with a clear view of the stars. **Rare, and important.**"

§4's non-archetype register 1 is the world's own voice: "No wit that implies
intention; the planet is not a character with jokes." *Rare* is a fact about the
galaxy. *Important* is a value judgment, and not one the world could hold: it is
the designer telling the player this cradle matters, in a register that has no
one to say it.

**Proposed:** cut to "Rare." or drop the sentence. The preceding clause already
earns the point.

**Not applied:** authored voice, and it may be a deliberate nudge.

**Rule:** §4 (world's voice). **Pattern:** 1 (significance inflation), in the
one form the override does not protect: this fails §1's own test, because with
the emphasis deleted the sentence is not less grand, only less directive.

### Recorded

#### K8 — P1's tic is confined to the archetype banks

The `, which ...` comment clause is **36** occurrences in `voice.ts` and **3**
across the other 8,900 lines of server (2 in `lineages.ts`, 1 in `questions.ts`,
all three load-bearing).

This sharpens P1 rather than softening it. The tic is not a house habit that
happens to show up in the banks; it lives exactly where the archetype voice is
written, and nowhere else. That is precisely the surface R-6 governs.

#### K9 — Four modules carry no authored prose at all

`tend.ts`, `report.ts`, `proposals.ts` and `contact.ts` scrape to **zero**
prose strings. Every sentence they put on a surface is composed through
`voice.ts`'s builders.

That is R-29's architecture working: a module that derives from state cannot
hand a pre-formatted string to a surface, because it has no strings. Worth
recording as the thing to preserve, not a gap.

#### K10 — Two string families are correctly not surfaces

`contest.ts`'s `MASK_RULES.why` fields are documented in the module as design
notes that never reach a surface and never cross the wire. `signalparts.ts`'s
lowercase strings ("no such dial", "that move is not open") are
`unavailable()` failure reasons; no client path renders them.

Both were checked and excluded. `audit:catalog` omits `contest.ts` for this
reason, on the `audit-dashes` `NOT_A_SURFACE` precedent.

---

## Closing state

Every file in `/prose-audit`'s scope has been read: ~23,000 lines, roughly 1,100
player-facing strings.

| Pass | Applied | Proposed | Recorded |
|---|---|---|---|
| 1 — server banks | 3 | 3 | 4 |
| 2 — client chrome | 1 | 4 | 3 |
| 3 — server catalogs | 1 | 2 | 3 |

Six audits green: `dashes`, `banned`, `voice`, `names`, `parity`, `catalog`.

**The one theme across all three passes.** Every finding that mattered was a
*distribution*, not a string: a clause shape spread across ten archetypes, a
list shape spread across half a bank, a rule that had drifted out of a comment,
a surface no register row described, an obligation no script enforced. None of
them is visible one line at a time, which is why the mechanical audits could not
see any of them and why the gate is the wrong instrument for most. The prompt
and the audit script are the two places this kind of finding can actually be
made to stick.

---

## Not audited: A4 and A5

The A4 travel half and the A5 slices (grown behavior, web push, seeding) landed
on `main` while this audit was being written. Their prose has **not** been read
against prose-style.md. `audit:catalog` covers them for §6 from this commit
forward, and `audit:dashes` always did, but neither is a judgement pass.

The new surfaces, for whoever runs `/prose-audit` next:

- `voyages.ts` — ship-class descriptions, charter clause labels and bodies,
  the landfall headlines (`ARRIVED, THE WORLD WAS TAKEN`,
  `ROOTED ON A LIVING WORLD`, and their siblings).
- `orders.ts` — standing-order labels and bodies.
- `lineage.ts` — one string.
- The additions to `voice.ts` (about 155 lines), `civseed.ts`, `dials.ts`,
  `studies.ts`, `tend.ts` and `report.ts`.
- Client: the `studyboard.ts` additions (about 2,300 lines) and `push.ts`.

`behavior.ts` needs no pass: its strings are `why` design notes, and it is in
`audit:catalog`'s `NOT_A_SURFACE` set for that reason.

**One thing seen in passing and not chased.** `orders.ts`'s warm movement order
reads "If anything inside **twenty light-years** starts running hot…". A
spelled-out numeral in prose satisfies R-29's digit check while doing the thing
R-29 exists to prevent: it is a fact that can drift from the constant it
describes, and nothing would catch it if the radius were ever retuned. Worth a
look when that slice gets its pass; it may well be pinned correctly somewhere I
did not read.

---

## Pass 4 — A4 and A5

`voyages.ts`, `orders.ts`, `lineage.ts`, `worlds.ts`, the additions to
`voice.ts`, `civseed.ts`, `dials.ts`, `studies.ts`, `tend.ts` and `report.ts`,
and on the client the `studyboard.ts` additions and `push.ts`. 107 new
player-facing strings.

The A4/A5 prose is strong. "A beam home is a line drawn between two systems,
and anyone can follow a line at both ends" is the charter clause bank at its
best, and the ship classes, the landfall headlines and the Ledger's drift bands
all hold their registers. The humanizer's vocabulary tells are absent again.

The findings are two rules that did not exist and one bug class that nothing
was checking.

| | Count |
|---|---|
| Applied | 4 |
| Recorded | 2 |

### Applied

#### A6 — `npm run audit:facts`: catalog prose that restates a number

**This is the real find of the pass.** R-29 puts every fact in voice prose
behind a `Fact` so it cannot drift from the number the game runs on. The
catalogs are outside that scheme: a project's `effectLine` and a ship class's
`line` are plain strings authored beside the fields they describe, and they
ship to the client already formatted. Every one is a hand-maintained echo.

Nothing was checking them. Retune the effect, leave the sentence, and the
receipt the player reads is false — no type error, no failing audit, and no
stray digit for R-29 to catch, because R-29 governs `voice.ts` and these are
catalogs. **Spelling the number out hides it completely:**

| Prose says | The field says |
|---|---|
| `orders.ts`: "inside **twenty** light-years" | `WARM_RADIUS_LY = 20` |
| `voyages.ts`: "**Half** of lightspeed" | `TORCH_FLIGHT_YEARS_PER_LY = 2` |
| `voyages.ts`: "**Four fifths** of lightspeed" | `SAIL_FLIGHT_YEARS_PER_LY = 1.25` |
| `voyages.ts`: "The flare lasts **eight** years" | `departureYears: 8` |
| `projects.ts`: "**five** points higher" | `addConfidence: 0.05` |
| `projects.ts`: "an **eighth** of lightspeed" | `cruiseFractionOfC: 0.125` |
| `projects.ts` ×4: "by **N** a year" | `addRatePerYear` |
| `projects.ts` ×4: "**N**% sooner / less" | `percent` |

`orders.ts` states the principle itself, one field above the one that breaks
it: the sentinel's cost is read from the mission catalog rather than restated,
because "an order that could drift out of step with what it dispatches would be
a receipt for something else". The audit applies that sentence to the rest of
the catalog.

**22 couplings across 13 projects and 3 ship classes; all agree today.** Also
checks the question chrome a project's prose recites against its `questionIds`,
with the case split that matters: a *subset* must be named (the player has no
other way to know which two questions got cheaper), the *whole set* must not
be (`sky-vault` says "Every question on every study", which is both better
prose and drift-proof).

Controlled five ways before shipping: a retuned income rate, a retuned order
radius against a spelled word, a question added to an effect, a retuned sail
fraction, and a retuned flare. All five fail loudly; the catalog restores
clean.

**Its limit is stated in its own header.** It knows only the couplings written
into it. A new effect kind whose prose restates a new field is not covered
until someone adds it, and nothing will announce that. Treat the check list as
the spec for what catalog prose may restate.

*(The first draft of this audit reported six failures against a correct
catalog: one regex spanning `id` to `effect` walked across the record boundary
and paired one project's prose with the next one's numbers. It now splits into
records first. An audit that cannot be trusted when it fails is worth less than
none.)*

**Rule:** R-1, R-29. Wired into `package.json` and CI.

#### A7 — R-24a, the caps sub-line

A sweep found five shipped ALL-CAPS strings over R-24's six-word bound, and not
one of them is a label:

| | |
|---|---|
| 10w | `NEITHER OF US SHINES AT THE OTHER. ONE OFFER, EVER` |
| 9w | `THE HONEST EXIT, WHILE THERE IS BUDGET FOR ONE` |
| 8w | `THEIR LIGHT SINCE: NONE HAS REACHED US YET` |
| 8w | `THEY WILL NOT KNOW UNTIL IT REACHES THEM` |
| 7w | `NEEDS A PROJECT THAT HAS NOT LANDED` |

ALL-CAPS does two jobs and R-24 only described one. A **label** names a thing a
thumb presses; that is the six-word set phrase. A **sub-line** is a whole
sentence in caps *under* a label, saying what the move would mean. It is
microcopy wearing chrome's typography, so R-24a gives it microcopy's bound of
12 words. All five conform.

The accord rail is the third case and gets its own clause: a **composed** line
is bounded on its stem, the fact bounded at its own source, which is R-32's
existing carve-out restated. That closes pass 2's P4.

§7 decides the direction: five independent authoring decisions across three
slices all landed on the same shape, so the code is telling us the rule was
under-specified. The rule moved to the prose, not the other way.

#### A8 — R-39 and R-40, the two missing bounds

R-39 (question method: 3 sentences, 45–65 words, no numerals) closes pass 2's
P5. R-40 (section caption: 1–2 sentences, ≤ 22 words) is new here: the
`study-picker-subtitle` class holds twelve shipped strings and **A4/A5 stretched
it from twelve words to twenty-one with no rule in the way**. The bound is set
from what shipped; all twelve conform.

R-40 also says the thing pass 2 recorded as K5: sibling captions on one board
share a shape *on purpose*, so R-6's no-homogeneity rule does not reach them.

One string is knowingly left outside: A5's push-consent explainer
(`study-watch-line`, 25 words) is asking permission rather than labelling a
section, and it is the only member of its class.

#### A9 — Five new §2 rows

Section caption, caps sub-line, ship class / charter clause, standing order,
and the Ledger drift band. Same transcription-of-shipped-register move as A4,
and it means every surface A4 and A5 added now has a register on record.

### Recorded

#### K11 — The charter clause triples are diegetic

"Bank the heat, bury the works, and put nothing above the rock that a telescope
could resolve" is a three-item list, and so is "One order, one firing, and a
fresh hand to arm it again". Both are instruction sets: the enumeration is the
content, not a reach for comprehensiveness. Same call as K3.

Likewise "Not a refusal, not an acknowledgment: nothing" (pattern 11) — the
negation *is* the clause's meaning, and it is the best line in the answer-nothing
charter.

#### K12 — British spellings, all in comments

`neighbour`, `centre`, `defence`, `honour`, `recognise` appear in nine files
against an overwhelmingly American codebase (`catalog`, `color`, `center`,
`neighbor`, `behavior`). Every instance is in a comment or a `why` design note.
**Zero reach a player surface**, so this is house-style noise rather than a
prose defect, and not worth a commit on its own. Worth knowing if a `why` field
is ever promoted to a surface.

#### The seedship's century, not checked

`voyages.ts` says a seedship "arrives in a century", which is a crossing time
for a typical neighborhood hop rather than a constant restated. `audit:facts`
deliberately does not pin it: inventing a coupling the catalog does not claim
would make the audit lie about what it guarantees.

---

## Pass 5 — the watch proposals (scoped)

Scoped re-audit, on a direct complaint from the game's owner: the two
proposal reasons that offer a free watch both closed on a price tag.

- `voice.ts` `reasonFirstWatch`: "…A watch costs no compute and can be put
  down again."
- `voice.ts` `reasonWiden`: "…Watching costs nothing."

This is not one of the humanizer's 35 patterns; both sentences would pass
every mechanical rule the gate has. It is a register finding under §1's own
test: with nothing deleted, neither sentence is *grand*. The proposal reason
is the mind's argument for its opening move, the first prose a new player
reads under WHAT WE WOULD DO NEXT, and the argument it made was an
accountant's: what the move costs, not what it is. The wonder was left
entirely to the destination screen (the brief's "The light arrives whether
or not you attend to it, so watching spends only patience"), so the surface
that had to earn the tap was the flattest one in the chain.

The stacking made it worse. AV4's counsel seam writes the archetype's stance
beside the reason, and the prompt's invitation to write "what it costs us in
the thing we actually mind losing" is answered in kind when the reason's own
tail is a price: a shipped Tide stance read "Watching costs us nothing we
would have eaten anyway" directly under "A watch costs no compute". Two cost
sentences, stacked, on the surface that exists to say what watching is for.

| | Count |
|---|---|
| Applied | 2 |
| Recorded | 2 |

### Applied

#### A11 — `reasonFirstWatch`: the price tag becomes the physics

> …at n% confidence. ~~A watch costs no compute and can be put down again.~~
> **Its light keeps arriving whether we look or not. A watch is the looking.**

Drafted twice on the deep-reasoner with different framings (a physics pass
and a meaning pass) and synthesized. The chosen tail restates the brief's own
cost sentence from the mind's side of the glass: the first clause is the
brief's "the light arrives whether or not you attend to it" said as *we*, so
the same reading holds on both sides of the tap (the picker/brief identity
precedent), and the closing definition is the observatory's one licensed
flourish, a true statement of physics. 23 framing words, three sentences
(R-35's ceiling), present tense, wit 0, no numeral, nothing named that the
brief does not show (R-35a). The free/reversible fact still reaches the
player: it is the brief's WHAT IT COSTS section and its
`NO COMPUTE · NO CLOCK · REVERSIBLE` chrome, one tap away, where a costs
question belongs.

#### A12 — `reasonWiden`: the unread arrival

> Every open study is waiting on light, and nothing on any of them is
> affordable. HOL-nnnn-i is unwatched: LABEL, n years away. ~~Watching costs
> nothing.~~ **Its light is arriving now, and no one here is reading it.**

The occasion is a stall (nothing affordable, everything waiting), and the
honest argument for widening was never the price: it is that this source's
light is landing, continuously, with nobody at the far end. The tail states
that and nothing else. The first sentence keeps "affordable": it is the
bookkeeping fact that *causes* this proposal, in a sentence about
bookkeeping being stuck, and softening it would blur the occasion. 30
framing words, present tense, wit 0. The two reasons no longer share a
closing beat ("the looking" / "no one here is reading it" are complementary
sides of one truth, not the same claim twice), and first-watch is
serve-exclusive besides, so they never co-render.

### Recorded

#### K13 — No gate rule, and why

The tell was a register choice on an authored, fact-carrying line. A regex
cannot hold "costs no compute and can be put down again" apart from
`reasonQuestion`'s "it costs 40 and answers in 6", which R-35a *requires* to
state its price. Rejection here would be a judgement about which sentence
owed the player wonder, and the gate never judges; it counts. Nothing added.

#### K14 — The counsel prompt is not the offender

The stacked Tide stance looks like a prompt failure and is not. The prompt
already declares thought-overlap a failure ("An overlap of thought is as bad
as an overlap of wording") and already bans naming a price; the cost-themed
stance was legal under both because it priced nothing and the overlap was
with the *reason's* theme, which the prompt cannot see as a fault when the
angle it offers ("what it costs us in the thing we actually mind losing") is
archetype material. With the reason's tail no longer a price, the pairing
reads as intended. No prompt change, so no PROMPT_VERSION bump; cached
stances were written "for the kind of move, not for this one"
(`voicegen.ts`'s own note at the set-fingerprint), so they remain valid
beside the new reason text.

---

## Pass 6 — the surfaces the first-session read never reached

Scope: the source card, the contact thread, Projects, voyages, Reach and the
Mind page. These are the pages the 2026-08-16 first-session evaluation
(arrival note, stakes glosses, row temperature) did not get to, swept with
both lenses now that **R-42** exists to name the second one.

The humanizer's yield here is close to nil, which is the same result passes
1 to 5 got and is worth stating plainly: the vocabulary tells are absent,
the register is consistent, and the archetypes stay distinct. Every finding
below is R-42 or R-40. That is the shape of this codebase's remaining prose
debt: not sentences that sound wrong, sentences that read well and ask for
nothing.

| | Count |
|---|---|
| Applied | 6 |
| Reported, not applied | 3 |

### Applied

#### P1 — `voyages.ts:214` THE TORCH describes its flare and never says what it costs

```
Half of lightspeed, on fuel it carries. The flare lasts eight years, and again at the far end.
```

Its two siblings each close on what being seen means: the seedship "arrives
unannounced", the sail "brakes in plain view at the far end". The torch
states the flare as a fact of the engine and stops. On the surface where a
player commits a founding, the most irreversible act in the game, one of the
three options does not tell them what it spends. R-42.

Applied: `The flare lasts eight years, and again at the far end, where anyone
looking will see us.`

**`audit:facts` rejected the first attempt, correctly.** It read "It flares
for eight years at each end, in view of everyone" and reported two
disagreements: it could no longer find the eight against `departureYears`,
and with "far end" gone it scored the line as saying nothing about an
arrival while `brakingLevel` says the braking is seen. Both were true. The
script keys on the phrasings *because* they are the couplings, so the fix
was to keep them and hang the stake off the end rather than to loosen the
patterns. A guard that a rewrite can talk its way past is not a guard, and
this one caught a real regression inside a prose-only change.

#### P2 — `voyages.ts:354` the reporting clause names no consequence, while its opposite does

```
Send one word home when it is decided, whatever the decision was.
```

Against "Send no word", whose line is `A beam home draws a line anyone can
follow at both ends.` One option states a risk, the other states a
procedure, and a pair like that reads as the game recommending the silent
one. The reporting clause has a real stake and it is the plain one: choose
otherwise and nobody here ever learns how it ended. R-42.

Applied: `Send one word home when it is decided, whatever it was. Without it
we never learn how this ended.`

#### P3, P4 — `projects.ts:239, :297` the confidence floor is stated as a mechanism

```
Holds the floor under every signal's confidence five points higher.
Holds the floor under every signal's confidence ten points higher.
```

Every other `effectLine` in the catalog says plainly what changes ("Raises
the compute income by 6 a year, for good"). These two name an instrument
behaviour and leave the player to derive what it buys, which is that fewer
readings stay too faint to trust. R-42. The numerals are byte-exact through
the edit (R-1), and `audit:facts` still passes on both couplings.

Applied: `Holds every signal's confidence five points higher, so fewer
readings stay too faint to trust.` (and `ten` likewise)

#### P5 — `studyboard.ts` the Mind page has no caption

Every sibling page states what it is under its header, which is R-40's whole
point and the reason the Report gained one: "the tab is the first thing a
fresh civ opens, and it used to land on a bare title over nothing". THE MIND
goes header, hairline, masthead. It is also the least self-evident word in
the rail: Report, Sky and Projects name their contents, and THE MIND names
a thing a new player has just been told they *are*.

Applied: `Who we are, and what we would do next.`

#### P6 — `studyboard.ts` Reach opens on a section header, with no page title and no caption

Reach is the only rail page that starts on a `study-section-header` (THE
LEDGER) rather than a page header, so it has neither a title nor an R-40
caption. Applied both, after the existing empty guard so the page still
renders nothing in the case that guard is protecting.

Applied: header `REACH`, caption `What we have sent outward, and what became
of it.`

#### P7 — `studyboard.ts` the Projects caption instructs instead of reassuring

```
What the observatory can build. Tap one to read what it grants.
```

"Tap one" is the affordance describing itself, the same cut already made on
the Report caption. But the sentence is carrying something real underneath
the instruction, and it should not simply be deleted: the picker-to-brief
pattern means a tap does **not** spend, and a player who fears that a tap
buys will not tap. Said as a consequence rather than as an instruction, it
gets shorter and keeps the reassurance.

Applied: `What the observatory can build. Reading one costs nothing.`

### Reported, not applied

#### P8 — `projects.ts:190` negative parallelism (humanizer 9)

```
Resolution was never about the mirror, only about how far apart you are
willing to stand.
```

The "never X, only Y" shape is the pattern. Kept: it is correcting a belief
the player actually holds (that a bigger instrument is a better one), which
is the one job negative parallelism does honestly, and the line is the
clearest statement of interferometry in the catalog. Flagging it here so the
next sweep does not rediscover it as new.

#### P9, P10 — `projects.ts:238, :249` rule of three (humanizer 10)

```
heat can be shaped and delayed and diluted
slow thoughts, cheap ones, and a very great many of them at once
```

Both are triples. Kept, and deliberately: the first is polysyndeton doing
real work (three verbs, three distinct evasions, and the neutrino defeats
all of them), and the second is M9's deep-time shrug landing a joke about
scale. The rule-of-three tell is a cadence a model falls into when it has
nothing to say; these have something to say. Recorded rather than silently
passed over.

### Recorded

#### P11 — nothing new for the gate, and why

Pass 3 of this command asks what becomes a mechanical rule. Nothing here
does. Every finding is R-42 or R-40, and R-42's own text says it is not
grep-checkable and never will be: no regex sees whether a sentence gives a
reader a reason to care. The generation-path half of R-42 already landed
with the rule itself, in `voicegen.ts`'s `COUNSEL_JOB`, and it reaches no
other prompt on purpose (a remark stands beside a record, which R-42 exempts
by name). No `stylegate.ts` change, no `PROMPT_VERSION` bump.
