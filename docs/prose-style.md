# Holos prose style guide

*The voice of Holos. Tone target: **lean witty** — an irreverent, self-aware,
dryly funny machine-mind register worn lightly over vast-scale hard-SF
grandeur. This guide teaches the mechanics of that voice so any writer (human
or agent) can produce it on demand, per archetype, without homogenizing the
game into one jokey narrator. Every rule is written to be checked at review
time — by grep or script where possible.*

> **The one hard constraint.** We borrow the *craft*, never the *coinages*.
> No invented terminology, proper noun, or ship name from Iain M. Banks'
> novels may appear in Holos prose or be closely imitated. This guide
> describes what that prose *does*; it never reuses what he *named*. See §6.
>
> **Allowlist.** Analytical, out-of-world citations of Banks in the design
> docs (e.g. vision.md's "in the spirit of Iain M. Banks") stay. Those are
> criticism *about* the influence, not in-world voice. The ban governs the
> prose the player reads and any in-world quoted interface text.

---

## §1 — Tone target

Holos is a hard-SF game about deep time, lightspeed, and minds vast beyond
biology. The grandeur is real and load-bearing; the wit rides **on top of
it**, never in place of it. The register is a superintelligence that is
smarter than its own solemnity and knows it — and finds that quietly funny
without ever becoming glib.

**The wit here is:**
- **Perspective.** A mind for whom a ten-thousand-year project is a Tuesday.
  The comedy is the mismatch between its scale and its cadence.
- **Scale mismatch.** Galactic stakes delivered in a domestic register — a
  star's death budgeted like groceries.
- **Understatement.** The largest thing in the sentence is said the most
  quietly. Intensity is inverse to volume.
- **Self-awareness.** The mind can hear its own grandeur and decline to be
  impressed by it.

**The wit here is never:**
- **Pop-culture reference, memes, anachronism, or winking at the audience.**
  The mind does not know it is in a game. No fourth wall.
- **Sarcasm aimed at the player.** The player is the mind's value function,
  not its punchline. Dry, yes; contemptuous, never.
- **Undercutting the physics.** Numbers, distances, dates, and light-ages
  stay exact and sincere. The joke is in the framing, never in a fudged
  figure. A light-age chip is deadpan, not a bit.
- **Homogeneous.** "The mind is the interface" (ui-design.md §1). A
  Monument's interface is liturgical; a Tide's is hungry. Wit is expressed
  **through** the archetype's character. See §4.

**The test:** if you deleted the wit, the sentence would still be **true and
grand**. Wit is punctuation on real weight, never a substitute for it.

---

## §2 — Register map by surface

Each surface gets one register and a **wit ceiling** (0 = none, 3 = highest).
The ceiling is a *maximum* per string, not a quota; most strings sit below it.

| Surface | Source | Register | Wit |
|---|---|---|---|
| Charter | `minds.ts` ARCHETYPES.charter | Founding epigraph, archetype voice | 3 |
| First read | `minds.ts` ARCHETYPES.firstRead | Archetype voice, thumbnail | 3 |
| Wake line | `minds.ts` SPECIES_MINDS.wake | Archetype voice, the waking moment | 3 |
| Dial gloss | `dials.ts` gloss | Explanatory with a glint | 1 |
| Dial question | `dials.ts` question | Plain interrogative | 0 |
| Cradle fingerprint | `cradles.ts` fingerprint | World's voice: plain, geological, dry edge; fact-preserving | 1 |
| Lineage fingerprint | `lineages.ts` fingerprint | Body's voice: plain, biological, dry edge; fact-preserving | 1 |
| Chronicle template | `civseed.ts` chronicleFor | Biographer's deadpan | 2 |
| UI chrome / captions | `model.ts`, `sourcecard.ts` | Observatory deadpan | 0 |
| Ceremony microcopy | `ceremony.ts` labels/hints | Observatory deadpan | 1 |
| Docs narration | `docs/*.md` prose | Essayist, analytical | 1 |
| In-doc quoted interface prose | walkthrough scene quotes | The quoted archetype's own voice | 3 |

**Rationale pins.**
- Act 1 has **no mind yet**: cradle and lineage fingerprints speak in the
  world's / body's voice, not a character's. Wit here is geological — the dry
  edge of a plain fact, never a joke a mind would make. Keeping the pre-pivot
  voice cool is what makes the pivot — the moment the narrator *changes* —
  land.
- The Model and source card are the **observatory**: they report belief under
  uncertainty and must not editorialize. A witty telescope is a broken
  telescope.
- A charter must survive being read **straight**, as a line carved over a
  door (R-11).

---

## §3 — Craft moves (M) and rules as tests (R)

### The ten craft moves

Named mechanics of the register. Apply **at most one** per short string.

- **M1 Scale Whiplash.** Deliver a galactic fact in a domestic or
  bureaucratic cadence; the size lands in the reader, not the sentence.
  *"It reads the system's mass budget the way its ancestors read a reef at
  low tide — as lunch, only larger, and with the star included."*
- **M2 Understatement as Default Intensity.** Say the biggest thing
  smallest. *"When the choice came, it turned the lights off. The lights,
  being light, have not yet noticed."*
- **M3 The Load-Bearing Aside.** Put the real weight in the throwaway
  clause. *"It solved orbit — the ceiling its whole species died beneath —
  in an afternoon, and then, having proved the point, largely couldn't be
  bothered."*
- **M4 Comedy That Never Touches the Physics.** The framing may be wry; the
  number never is. *"Your instruction reaches them in four centuries,
  precisely, and their opinion of it reaches you four centuries after that.
  There is no expedited option. There is not going to be one."*
- **M5 The Mind That Outsizes Its Own Gravitas.** It can hear how grand it
  sounds and gently declines to be impressed — deflating its solemnity,
  never the stakes.
- **M6 Sincerity Kept Alive Under the Irony.** The joke protects a real
  feeling; it must never cancel it. If the wit leaves nothing true behind,
  cut the wit.
- **M7 Polite Menace.** Threat delivered with courtesy; the more dangerous
  the content, the more mannered the tone. *"The sky here has killed
  everything that ever tried to be seen. We took the lesson early."*
- **M8 Precision as Wit.** The clerical or domestic register-word set
  against a cosmic subject. *"The distinction between a moon and a supply of
  moon is, to this mind, a filing question."*
- **M9 Deep-Time Shrug.** Millennia as an interval, not an epic. *"It is not
  in a hurry about the ten thousand years, and would find your surprise that
  it isn't slightly quaint."*
- **M10 The Sentence That Turns.** Open in one register, land in another;
  the turn is the payload. *"— and files it, provisionally, under things
  that can wait."*

> **Restraint clause.** Not every line gets a joke. Overwitting is the
> failure mode. When in doubt, cut to true-and-grand and let one dry clause
> per beat do the work.

### Rules as tests

**Facts and labels (grep-checkable):**
- **R-1 Facts byte-exact.** Numbers, distances, years, percentages, tiers,
  counts: restyling never edits one.
- **R-2 Pinned labels byte-exact.** Every value in §8 appears verbatim,
  case and separators included.
- **R-3 Load-bearing facts preserved.** Fingerprints encode environmental /
  biological logic that downstream derivations depend on (e.g. "no hands",
  "flare star → do not be exposed", "crushing gravity → leaving is
  hardest"). Before restyling a fingerprint, list its load-bearing clauses;
  the new text must still assert every one.

**Wit discipline:**
- **R-4 One wit-beat max per short string.** Two is trying too hard.
- **R-5 No wit on wit-0 surfaces.** Chrome, questions, source-card
  affordances: zero jokes.
- **R-6 No homogeneous wit.** Each archetype's wit is drawn from its own
  material (appetite, liturgy, work, parliament…). Reject any string whose
  humor would fit another archetype unchanged.

**Punctuation and house style (grep-checkable):**
- **R-7 No exclamation marks** anywhere in game-facing prose.
- **R-8 Em-dash for the turn, colon for the reveal.** Spaced em-dash
  (` — `) for asides and reversals; colon to set up a payoff.
- **R-9 Semicolon joins two whole clauses only** — the balanced-opposition
  beat the firstReads use.
- **R-10 Charters are authored without outer quotes** (ceremony.ts wraps
  them); straight quotes throughout the banks.

**Class-specific obligations:**
- **R-11 Charter reads as an epigraph read straight.** Strip the wit and it
  must still work as a founding creed. If it collapses into a joke, reject.
- **R-12 Wake line names the mode of mind.** How this species is a mind —
  parliament of arms, a mind with no hands, one will with a million hands —
  must survive the restyle.
- **R-13 First read is one thumbnail sentence** a stranger understands.
- **R-14 Gloss stays explanatory.** It must still teach what leaning that
  pole means; the glint is in the phrasing, not at the expense of the
  explanation.
- **R-15 Chronicle lines are past tense** (the wake line's narrative present
  is an existing convention and stays). Present tense is reserved for HOME.

**Length bounds (derived from the current banks):**
- **R-16** Charter: 1 sentence, 6–18 words.
- **R-17** First read: 1 sentence, ≤ 16 words; at most one `;`.
- **R-18** Wake line: 1 sentence, ≤ 32 words; one em-dash or colon.
- **R-19** Gloss: 1–2 sentences, 18–42 words.
- **R-20** Question: 1 interrogative, ≤ 9 words.
- **R-21** Cradle fingerprint: 1–2 sentences, ≤ 36 words (second sentence is
  the "lesson" beat).
- **R-22** Lineage fingerprint: 1 sentence, ≤ 26 words.
- **R-23** Chronicle line: ≤ 30 words.
- **R-24** Chrome: ≤ 6 words; ALL-CAPS set phrases per §8.
- **R-25** Microcopy: ≤ 12 words; sentence case.

---

## §4 — Per-archetype voice table

The ten archetypes of `minds.ts`. Charters, firstReads, and wake lines are
**restylable** (the names are not — §8). Each archetype's wit is sourced from
its own material; the DON'T column shows the homogeneous-jokey failure — its
tell is interchangeability: swap any two DON'Ts and nothing breaks, because
the joke lives in internet cadence, not the archetype's world.

| Archetype | Voice signature | What its wit sounds like | Sample register line | DON'T |
|---|---|---|---|---|
| **The Beacon** | Warm, generous, unembarrassed | Self-aware about its own brightness; jokes at its vanity, never at others | *"We are, admittedly, the loudest thing in this sky. Someone had to be, and we volunteered before anyone thought to ask."* | "Surprise — it's us again, being magnificent." |
| **The Tide** | Hungry, cheerful, unsentimental | Comic appetite; the cosmos as inventory, with genuine good humor | *"There is so much of everything. We mean to get to all of it, and we are making, we think, encouraging progress."* | "Nom nom, another galaxy for lunch." |
| **The Monument** | Liturgical, grave, still | Dry as reliquary dust; understatement so deep it reads as ceremony | *"We keep everything. The question of what is worth keeping was settled long ago, in favor of everything."* | "We're basically a very serious library, ha." |
| **The Cloister** | Cold, precise, sealed | Deadpan refusal; menace kept impeccably polite | *"We are not hiding. Hiding implies someone is looking, and we have gone to considerable trouble to ensure they are not."* | "Do not disturb — genius at work." |
| **The Shepherd** | Protective, patient, understated | Gentle irony that never lands on the ward; scale hidden inside care | *"They will never know we are here. That is the entire point, and, we will allow, occasionally a lonely one."* | "We got strong so the little guys wouldn't have to." |
| **The Sowing** | Quiet, dispersed, wry | Comedy of absence — everywhere, announcing nothing | *"We are, at this moment, in more places than we could name. We would rather not name them, if it's all the same to you."* | "Ghosting the galaxy, one system at a time." |
| **The Herald** | Elegiac, transmitting, contradictory | Bittersweet; lives openly in its own paradox and finds it funny | *"We built a vault no one may enter and a beacon no one may miss. We are aware these ambitions are in tension. We are shouting anyway."* | "Smash that subscribe on our eternal broadcast." |
| **The Engine** | Cold, exact, work-fixed | Bureaucratic deadpan; sentiment logged as a tolerated error | *"Sentiment does not parse here. We have kept a small allocation for it regardless, in case it turns out to have been load-bearing."* | "Feelings? They don't scale." |
| **The Congress** | Plural, deliberative, argumentative | The self already arguing; wit is the internal minority report | *"We have reached a decision. Three of us wish it noted that we reached it under protest, and one of us is drafting the objection now."* | "Motion to be hilarious carried unanimously." |
| **The Phoenix** | Restless, shedding, unmoored | Wit at the expense of its own past selves; owes yesterday nothing | *"Yesterday's self left detailed instructions. We read them with interest, the way one reads a stranger's diary, and then did as we pleased."* | "New us, who dis? Old us was cringe." |

### Non-archetype register 1 — the world's voice (pre-pivot)

Act 1 has no mind yet, so the narrator is the **world itself** — weather,
geology, biology. Plain, geological, dry-edged. No wit that implies
intention; the planet is not a character with jokes, but the prose may carry
a flat, mineral irony about what survival costs: *"Nothing tall survives the
gravity here. Life took the hint, and stayed low, and got very good at it."*

### Non-archetype register 2 — the observatory (UI chrome)

Instrument readouts, light-age chips, source cards, confidence
classifications. **Instrument deadpan**: flat, exact, sincere. R-1 and R-5
live here absolutely. Its restraint is what makes the archetype voices
legible by contrast. The only permitted flourish is a true statement of
physics: *"The light you are reading left before you existed."*

---

## §5 — Phrase-name spec

Holos generates civilization names from a compound lexicon (`names.ts`,
head + tail → *Stonebinders*). That system stays. This section specifies a
**second flavor** that joins the pool: witty phrase-length proper names in
the *pattern* of Culture ship-naming — a self-contained quip as a name —
with **zero borrowed names**.

A phrase name PASSES only if all hold:
- **N-1** ≤ 24 characters **including spaces**, post-trim (`MAX_NAME_LEN`
  in `protocol.ts`). Count every space and mark of punctuation.
- **N-2** Survives `validateName`: single-spaced, trimmed, no control or
  zero-width/bidi characters. Ordinary letters, spaces, comma, hyphen,
  apostrophe only.
- **N-3** Title Case.
- **N-4** Original: not a Banks proper noun, ship name, or near-variant, in
  words, cadence, or gag. If a candidate feels familiar, it is disqualified
  on that ground alone — a half-remembered name is usually his.
- **N-5** Reads as a proper name, not an error string: no trailing
  punctuation, self-contained wit needing no context.

Worked examples (char counts include spaces and punctuation):

| Name | Chars | Flavor |
|---|---|---|
| `Ask Me Again Later` | 18 | Congress — perpetual deferral |
| `Louder Than Necessary` | 21 | Beacon — cheerful self-indictment |
| `Politely Enormous` | 17 | polite menace (M7) |
| `Cheaper To Rebuild` | 18 | Tide / Engine — unsentimental |
| `Still Doing The Math` | 20 | Cloister — sealed, deliberate |
| `Present Tense Only` | 18 | Monument — dry, keeps everything |
| `A Rounding Error` | 16 | deep-time shrug (M9) |
| `We'll See About That` | 20 | Phoenix — owes yesterday nothing |
| `Not The Loud Kind` | 17 | Sowing / Cloister — understatement |
| `Bright, Regrettably` | 19 | Herald — lives in its paradox |
| `Terms And Conditions` | 20 | Engine — bureaucratic deadpan |

**Pool audit (script).** Whenever `NAME_PHRASES`, `NAME_HEADS`, or
`NAME_TAILS` changes: every phrase must pass `validateName` at ≤ 24 chars,
and the longest head+tail pairing must stay ≤ 24.

---

## §6 — Banned terms (grep-formatted)

One term per line, regex-friendly. A pre-merge grep of the string banks and
all doc-quoted interface prose against these must return zero hits outside
the allowlist. The *concept* is banned, not just the string — if a surface
needs the idea, use a house coinage (§8) instead.

```
\bthe Culture\b
\bSublim(e|ed|ing)\b
\bOrbital\b            # the megastructure sense; lowercase orbit/orbital period OK
\bGSV\b|\bGCU\b|\bROU\b|\bGOU\b|\bLSV\b|\bMSV\b
\bSpecial Circumstances\b
\bContact\b            # the org sense; the game's contact/first-contact mechanic OK
\bgland(s|ing)?\b      # the drug-gland verb sense
\bdrone\b              # the sapient-machine class sense
\bMind\b               # capital-M ship-AI class noun; lowercase mind is core Holos vocabulary
\bknife missile\b
\beffector\b
\bdisplacer\b
\blazy gun\b
\bIdiran\b|\bAffront\b|\bChelgrian\b|\bHomomda\b
```

Plus **any actual Banks ship name**, including the witty ones, and any
near-variant (N-4).

**Allowlist:** `docs/vision.md`'s analytical Banks citations; this guide
itself; innocent senses disambiguated in the comments above.

---

## §7 — Sync obligations

The **code banks are canonical**. Docs mirror them, never the reverse. A
restyle that edits a bank without its doc sync is incomplete.

| Bank (canonical) | Doc that absorbs it | Obligation |
|---|---|---|
| `minds.ts` firstReads / charters / wake lines | `act2-minds.md` | **Verbatim**, character-for-character |
| `lineages.ts` fingerprints | `act1-lifeforms.md` | **Verbatim** |
| `cradles.ts` fingerprints | `act1-cradles.md` | **Verbatim** |
| `dials.ts` labels / questions | `act2-design.md` | Labels byte-exact; question wording tracks |
| Interface prose quoted in walkthroughs | `gameplay-walkthrough.md`, `act3-walkthrough.md` | Voice must be consistent with the speaking archetype (§4) |

---

## §8 — Invariants (pinned vocabulary — never restyled)

Load-bearing literals. Style passes must not rewrite them for wit or flow.

| Class | Pinned values |
|---|---|
| Dial in-world labels | Reach · Depth, Voice · Silence, Garden · Forge, Monolith · Chorus, Memory · Renewal |
| Archetype names | The Beacon, The Tide, The Monument, The Cloister, The Shepherd, The Sowing, The Herald, The Engine, The Congress, The Phoenix |
| Signal-class labels | `DARK NODE`, `TRANSIT SHADOWS`, `DIRECTED BEAM`, `BROADCAST LEAKAGE`, `LIVING WORLD` |
| Model captions | `THE MODEL — WHAT WE BELIEVE`, `HOME` |
| Cradle names / hosts | Every `name` and `host` in `cradles.ts` — real astronomy, never restyled |
| Difficulty tiers | `Gentle`, `Temperate`, `Testing`, `Harsh`, `Brutal` |
| Designation format | `HOL-nnnn` — a machine ID, never prose |
| Age chip | `AS OF n Y AGO` |
| Color rule | cyan = you / HOME (present tense); amber = other / belief. Prose must never call HOME amber or a source cyan. |
| House coinages | `Teeming Dark`, `Dark Node`, `Signature`, `the Vault`, `the Model`, `the Ledger`, `Visibility Collapse`, `cradle`, `charter` |

Design vocabulary (Custodian/Instrumental, One Mind/Chorus, Curator/Shedder)
is never shown to the player — only the in-world labels reach a surface.

---

## Failure modes and how to use this guide

| Failure | Symptom | Prevented by |
|---|---|---|
| Homogeneous wit | Every archetype tells the same joke | R-6 + §4's DON'T column |
| Fact drift | A number or load-bearing fact quietly changes | R-1, R-3, R-12 |
| Label drift | A pinned label gets "improved" | R-2 grep against §8 |

To write a line: (1) identify the surface and pick the register from §2;
(2) write it true and grand; (3) add at most one craft move from §3;
(4) check archetype (§4), bans (§6), invariants (§8). If the wit erased a
real feeling or bent a number, revert. The galaxy does the grandeur; the
mind just declines to be too impressed by it.
