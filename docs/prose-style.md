# Holos prose style guide

*The voice of Holos. Tone target: **flat terse** — one register everywhere,
observatory deadpan, every string as short as the fact it carries. This guide
teaches the mechanics of that voice so any writer (human or agent) can produce
it on demand. Every rule is written to be checked at review time — by grep or
script where possible.*

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

**Flat terse. Decided 2026-08-14; this supersedes the previous target.** That
target was *lean witty*: grandeur-first prose with an irreverent machine-mind
wit worn over it, wit ceilings up to 3 on the archetype surfaces, and length
bounds generous enough to hold three clauses. It produced prose that was
fancy, opaque and long — a card that took two beats to say one thing, an
ornament in front of every reading, a joke standing where a fact was wanted.
Holos is still a hard-SF game about deep time, lightspeed, and minds vast
beyond biology, and the grandeur is still real and still load-bearing. It is
no longer carried by the sentences. It moves into what the sentences report:
the distances, the dates, the light ages, the machinery. The galaxy does the
grandeur. The prose is the instrument pointed at it.

One register, everywhere: **observatory deadpan**. Flat, exact, sincere,
short. The old §4 register-2 description of the observatory is now the
description of the whole game.

**The tenets.**
- **Say it once, plainly.** One statement of a thing, in the plainest words
  that carry it. No restatement in a second register, no summary of the
  sentence just read, no clause that exists to give the first clause company.
- **The largest thing in the sentence, in the fewest words.** Size lands in
  the reader, not in the syntax. A sentence about a star's death and a
  sentence about a filing decision are built the same way.
- **A fact per sentence. No scenic route.** Say the fact, stop. The player
  came for the reading; the sentence is how the reading gets to them, not a
  place to spend their attention. If a sentence has no fact in it, ask
  whether it should exist at all.
- **Wit ceiling 1, and only understatement.** One is a *ceiling*, not a
  quota: most strings sit at 0 and are better for it. The one permitted move
  is understatement — the biggest thing said smallest. Every other flourish
  costs words the walls no longer grant.

**The wit here is never:**
- **Pop-culture reference, memes, anachronism, or winking at the audience.**
  The mind does not know it is in a game. No fourth wall.
- **Sarcasm aimed at the player.** The player is the mind's value function,
  not its punchline. Dry, yes; contemptuous, never.
- **Undercutting the physics.** Numbers, distances, dates, and light-ages
  stay exact and sincere. The joke is in the framing, never in a fudged
  figure. A light-age chip is deadpan, not a bit.

The fourth prohibition used to be **homogeneous** wit, and it is retired
here. Under flat terse the ten archetype voices deliberately **converge** on
one clipped instrument voice; the archetype fantasy rides on mechanics — what
a Monument does with a discovery, what a Tide spends compute on — not on
prose style. §4 records the consequence: the swap test (R-6, and the
per-family swap in R-31 and R-36a) is retired as a gate. *Family scope* is
not retired, because it is a correctness rule about what a line may claim,
not a rule about how distinctive it sounds.

**Length is part of the register, not a budget applied to it.** Every surface
has a hard word wall in §2 and R-41 enforces it. A string that says the right
thing in too many words is not a good string that needs trimming; it is the
wrong string.

**The test**, in two passes:
1. Delete every word whose removal does not change what the sentence claims.
   If it still says the same thing, the deleted words were ornament and the
   deletion is the fix, not a compromise.
2. Count. Over the wall is unfinished.

**What survives of §3's craft moves.** M2 (understatement), M4 (comedy never
touches the physics), M6 (sincerity under the irony) and M9 (the deep-time
shrug) survive, because each of them is a *compression* — they make a
sentence smaller. M1, M3, M5, M7, M8 and M10 need room to set up a turn, and
the walls no longer grant it; treat them as historical, and as the reason
several shipped strings still read the way they do. The restraint clause
under them was always the important part and is now the whole rule.

---

## §2 — Register map by surface

Each surface gets one register, a **wit ceiling** (0 = none, 1 = the
flat-terse maximum) and a **Length** wall in words. The wit ceiling is a
maximum per string, not a quota; most strings sit at 0. The Length wall is a
hard maximum per string, and the *aim* beside it is where the surface should
actually land — a string at the wall is legal and usually still too long.

| Surface | Source | Register | Wit | Length (words) |
|---|---|---|---|---|
| Charter | `minds.ts` ARCHETYPES.charter | Founding epigraph, archetype voice | 1 | 10 |
| First read | `minds.ts` ARCHETYPES.firstRead | Archetype voice, thumbnail | 1 | 16 |
| Wake line | `minds.ts` SPECIES_MINDS.wake | Archetype voice, the waking moment | 1 | 8 |
| Dial gloss | `dials.ts` gloss | Explanatory | 1 | 20 |
| Dial question | `dials.ts` question | Plain interrogative | 0 | 9 (R-20) |
| Cradle fingerprint | `cradles.ts` fingerprint | World's voice: plain, geological; fact-preserving | 1 | 18 · aim 13 |
| Lineage fingerprint | `lineages.ts` fingerprint | Body's voice: plain, biological; fact-preserving | 1 | 18 · aim 13 |
| Chronicle template | `civseed.ts` chronicleFor | Biographer's deadpan (Act 1); dry annalist's appendix — past tense, in the order it happened, and undated (R-33a) — for Act 3, same deadpan family | 1 | 14 |
| UI chrome / captions | `model.ts`, `sourcecard.ts` | Observatory deadpan | 0 | 6 (R-24) |
| work-list rows / states | `tend.ts`, `studyboard.ts` | Observatory deadpan | 0 | 6 (R-24) |
| Ceremony microcopy | `ceremony.ts` labels/hints | Observatory deadpan | 1 | 12 (R-25) |
| Resistance line | `voice.ts` RESISTANCE_LINES | Archetype voice, free-standing, fact-free; the objection to a ceremony move | 1 | 12 · aim 8, one sentence |
| Arrival line | `voice.ts` ARRIVAL_LINES | Archetype voice, the mind's first address to the player | 1 | 16 · aim 12 |
| Frame explainer — age chip | `voice.ts` ageChipLine | Observatory deadpan | 0 | 20 · aim 12 |
| Frame explainer — compute | `voice.ts` computeLine | Observatory deadpan | 0 | 20 · aim 12 |
| Clock line | `voice.ts` clockLine | The mind stating physics; shared across archetypes | 1 | 20 · aim 12 |
| Frame explainer — epoch | `voice.ts` epochLine | Observatory deadpan | 0 | 20 · aim 12 |
| Frame explainer — silence | `voice.ts` silenceLine | The mind stating physics; shared across archetypes | 1 | 20 · aim 12 |
| Frame explainer — study | `voice.ts` studyLine | Observatory deadpan | 0 | 20 · aim 12 |
| Report record sentence | `voice.ts` record builders | Observatory deadpan; dated, past tense | 0 | 18 · aim 12 |
| Report epoch stamp | `voice.ts` epochStamp | Observatory deadpan | 0 | 6 (R-24) |
| Report triage header | `voice.ts` reportHeader | Observatory deadpan | 0 | 18 (record-sentence wall: it carries two Facts and the ordering rule, which chrome's 6 cannot) |
| Report remark | `voice.ts` REPORT_REMARKS, or `voicegen.ts` when `HOLOS_VOICE_GEN=on` | Archetype voice, free-standing, fact-free | 1 | 12 · aim 8, one sentence |
| Proposal reason | `voice.ts` reason builders | Observatory deadpan; present tense | 0 | 16 · aim 11 |
| Proposal accept verb | `voice.ts` PROPOSAL_VERBS | Observatory deadpan (chrome) | 0 | 6 (R-24) |
| Proposal block header | `studyboard.ts` chrome | Observatory deadpan | 0 | 6 (R-24) |
| Question method | `questionmethod.ts` QUESTION_METHOD | Observatory deadpan; what the instrument does, never what it found | 0 | 24 · aim 16 |
| Accord rail | `accord.ts` | Observatory deadpan (chrome); a pinned stem plus an interpolated fact | 0 | 6, stem only (R-24a) |
| Section caption | `studyboard.ts` `study-picker-subtitle` — the class outlived the picker AS retired and is now the caption mold on every page that has sections (the Desk, Explore, the board, the Report) | Observatory deadpan; what a section is and where it stops | 0 | 20 · aim 12 |
| Caps sub-line | `studyboard.ts` accord and voyage sub-labels | Observatory deadpan; microcopy in chrome's typography (R-24a) | 0 | 12 |
| Ship class / charter clause | `voyages.ts` | The mind stating what it is committing to; plain, consequential | 1 | 20 |
| Standing order | `orders.ts` | The mind's instruction to itself, in absence | 1 | 20 |
| Ledger drift band | `voice.ts` LEDGER_BAND_LINES | Observatory deadpan; a graded reading, never a verdict | 0 | 12 · aim 8 |
| Signal / contact voice clause | `voice.ts` SIGNAL_VOICE, TONE_CLAUSE, ACCORD_CLAUSE, SIGNAL_OBSERVATIONS; composed in `traffic.ts` | Archetype voice, free-standing, fact-free; one pool clause | 1 | 12 · aim 8, one sentence |
| Contest tell | `voice.ts` CONTEST_LINES | Observatory deadpan; what the look is doing, never which source | 0 | 12 · aim 8, one sentence |
| Proposal stance (AV4) | `voicegen.ts` counsel seam when `HOLOS_COUNSEL_GEN=on`; otherwise `null` | Archetype voice, free-standing, fact-free | 1 | 12 · aim 8, one sentence |
| Intro beat | `voice.ts` INTRO_LINES | The mind stating scale; shared across archetypes, the clock line's family; copy pinned by build-s0.md (repinned 2026-08-15, flat terse) | 1 | 12 each · aim 9 |
| Counsel line (served, no surface) | `voice.ts` COUNSEL_LINES, or the AV4 stance when `HOLOS_COUNSEL_GEN=on` | Archetype voice, free-standing, fact-free (R-36a) | 1 | 12 · aim 8, one sentence |
| Home HUD / rail chrome | `home.ts` | Instrument register: labels and readouts, numerals from shipped formats | 0 | 6 (R-24) |
| Frame explainer — HUD readouts | `home.ts` HUD_NOTE | Observatory deadpan; what a readout is, never a reading of it; numeral-free (the readout carries the numbers) | 0 | 20 · aim 12 |
| Docs narration | `docs/*.md` prose | Essayist, analytical | 1 | no wall (not a player surface) |
| In-doc quoted interface prose | walkthrough scene quotes | The quoted surface's own voice | 1 | the quoted surface's wall |

**How a word is counted.** On the **authored template text**, not on the
rendered string: each `${…}` interpolation counts as **one word**, and the
fact it renders is exempt from the count. A record sentence that interpolates
a distance is charged one word for the distance whether it renders as `41 y`
or as `four hundred and twelve years`. This is the only rule that makes a
wall checkable at author time, and it is the rule R-41's audit implements.
Two consequences worth stating: a passed-through catalog passage (a
question's `line`, a project's `effectLine`) is bounded at its own source and
charged to the framing sentence as one word, exactly as R-32 and R-35 already
say; and a composed chrome line is bounded on its stem alone (R-24a).

**Walls are ceilings; aims are targets.** The wall is where review rejects;
the aim is where the surface is meant to sit. A bank whose strings cluster at
the wall has not absorbed §1, whatever the audit says.

**Where a wall is tighter than an old §3 bound, the wall governs.** §3's
length bounds were derived from the pre-2026-08-14 banks and most of them are
now slack. Two of them also carry *floors* that the walls contradict
outright, and the floors are withdrawn: R-19's 18-word minimum on a dial
gloss, and R-39's 45-word minimum on a question method. A floor was a way of
saying "do not leave this surface undernourished"; under flat terse the
undernourished surface is not the failure mode.

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
- **The facts/stance split (the voice surfaces).** Voice surfaces compose
  two kinds of sentence: a *record sentence* (observatory deadpan, wit 0,
  carries every pinned fact, authored once for all ten archetypes) and a
  *remark* (archetype voice, carries no facts, authored per archetype).
  They never share a sentence. This is what keeps R-6 satisfiable at
  scale: a remark is free-standing, so its wit comes from its own
  material rather than from a clause slotted into a shared spine — the
  interchangeability §4's DON'T column diagnoses. It is also the boundary
  runtime generation (AV4) works across: record sentences pass through
  pinned; the remark is what a model may rewrite.
- **The proposal is the report's tense-mirror.** The report says what
  happened — past, dated, frozen at materialization. The proposal says what
  could be done — present, live, re-derived and re-rendered on every sky
  send (`proposals.ts`'s Pin B). They share the facts/stance split and
  nothing else: a proposal's reason is the record-sentence side (observatory
  deadpan, wit 0, pinned facts, present tense), and its stance is the
  remark side (archetype voice, free-standing, fact-free) — AV3 ships the
  stance always `null`; AV4's counsel seam is the only thing that ever
  fills it. Neither surface ever appears on the other's — a proposal never
  rides the report, and a report entry never carries a verb.
- **The counsel bank outlived its surface.** COUNSEL_LINES was written for
  the home screen's counsel strip, and the strip was cut in 2026-08
  (ui-design.md § Anatomy: a floor-picked line with no triggering event
  behind it read as wallpaper). The bank did not go with it. The server
  still picks the line and still puts it on the wire, `audit:voice` still
  holds every string in it to R-36a, and nothing on the client reads the
  field. The row stays at full strength rather than being retired,
  because the rules are what the next surface to want this register will
  inherit, and a bank left unaudited between surfaces rots.
- **The report is the observatory's record, presented by the mind.** It is
  not the mind's diary. The entries are instrument output — dated, past
  tense, wit 0 — and the mind is only allowed a sentence *beside* them. That
  sentence used to be bounded at wit 2 against an arrival line's 3; flat
  terse collapses both to 1, and the distinction that survives is length: an
  arrival line is the mind introducing itself and gets 16 words, a remark
  stands next to a measurement and gets 12, in one sentence. The wall is not
  the only limit — **at most one remark rides a whole report** (R-31). A page
  of dated entries each with its own sentence beside it is the overwitting
  failure mode with a scrollbar attached, and the walls do not fix that one;
  R-31 does.

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
- **R-29 Fact-bearing prose is a `PinnedLine`.** A number, year, percentage,
  designation, or §8 label reaches voice prose only through a `Fact`
  constructor interpolated into the `line` tag (`voice.ts`). No numeric
  literal appears inside a bank string; no bank uses a bare template
  interpolation. Enforced by the type (`line`'s interpolations are `Fact`),
  checked at review by grepping the banks for digits outside `line` tags.
- **R-29a Remarks carry nothing pinned.** The archetype's free-standing
  sentence beside a record sentence contains **no numeral**, and also no §8
  pinned label, no designation, and no player-authored source name. R-29
  says a fact must arrive through a `Fact`; R-29a says the remark has no
  business holding one in the first place — it is precisely the part
  runtime generation may rewrite, so there must be nothing in it that
  rewriting could break. Checked by grepping the remark banks for digits
  and for §8's values; both must return zero.
- **R-30 One register per sentence.** A sentence that carries a pinned fact
  stays observatory deadpan; the archetype's stance goes in its own
  sentence. A witty sentence containing a number is a rejection on sight —
  it violates M4 and puts R-1 inside the part runtime generation is allowed
  to rewrite.
- **R-33 Epoch dating is frozen.** Every date a player reads is that
  civilization's own count from its own ascension (`year n AE`, §8's
  chronicle-dating row); the cohort's absolute year never reaches the wire
  or a surface. Its companion: **a remote entry's light age at its own
  stamp year is exactly the distance.** A record line prints the distance
  in years, never a difference of two years — an annal does not re-age its
  entries when they are re-read, and a line dated `year 160 AE` says the
  same thing forever.
- **R-33a The seed chronicle carries no year.** The §2 register calls it an
  annalist's appendix, which reads like an invitation to date its entries;
  `civseed.ts`'s builder must decline. Its lines are authored *at* the
  ascension they describe, so the only stamp R-33 would allow them is `year
  0 AE`, and a date every entry shares is not a date. The failure this
  forbids is not a wrong year but a **cohort-absolute** one: the bright
  posture beat used to end "since -2", the seeding calendar leaking onto the
  source card and into every culture signal (`traffic.ts` hands whole
  chronicle lines to strangers, who share none of the sender's clocks).
  Durations stay legal — `voyages.ts`'s founding chronicle states a crossing
  in years — because R-33 bans the calendar, not arithmetic. Checked by
  `audit:facts`: nothing the templates interpolate may name a year.
- **R-34 The report derives from wire snapshots only.** `report.ts` imports
  no truth-side and no knowledge-layer symbol — not `civTruthAt`,
  `emissionAt`, `occupancyAt`, `peekTruth`, `observeCiv`, `lightConeFor`.
  Everything it needs is already on the assembled snapshots, which have
  passed the no-leak boundary once. Structural rather than reviewed: grep
  the module's import list.
- **R-37 The generated voice reaches nothing.** R-34 is a *denylist*
  ("imports no truth symbol"). For AV4's generation modules that is too
  weak: the point is not that they avoid truth, it is that they need
  almost nothing. So R-37 is an **allowlist**, which is strictly stronger
  and just as greppable. `voicegen.ts` and `stylegate.ts` import only
  from this closed set — `./voice` (banks, `render`, `pinnedTokens`),
  `./stylegate`, `./bannedterms`, `@anthropic-ai/sdk`, and **type-only**
  `./minds`, `./civseed`, `./report`, `./proposals`, `./protocol`.
  Nothing else, and in particular never `./knowledge`, `./galaxy`,
  `./studies`, `./missions`, `./questions`, `./projects`, `./tend`,
  `./clock`, `./rng`, `./cradles`, `./lineages`, `./dials`, `./names`.
  R-34's banned symbols are unreachable because their *modules* are
  unreachable. Type-only matters: `isolatedModules` is on, so a value
  import from `./civseed` would drag the whole catalog chain into the
  module graph and make the ban a lie. Two greps, both in CI
  (`.github/workflows/ci.yml`), and both read every `from "…"` specifier
  so a multi-line import cannot slip past:

  ```sh
  # (a) denylist — nothing from a truth-bearing or catalog module
  ! grep -nE 'from "\./(knowledge|galaxy|studies|missions|questions|projects|tend|clock|rng|cradles|lineages|dials|names)(\.js)?"' \
      server/src/voicegen.ts server/src/stylegate.ts

  # (b) allowlist — fails CLOSED when a new module is added and imported
  grep -hoE 'from "[^"]+"' server/src/voicegen.ts server/src/stylegate.ts \
    | sed -E 's/^from //' | sort -u \
    | grep -vxE '"(\./(voice|stylegate|bannedterms|minds|civseed|report|proposals|protocol)(\.js)?|@anthropic-ai/sdk)"'
  ```

  Consequence worth stating: the two catalog reads AV4's payload does
  need — minds.ts's §8-pinned archetype name and dials.ts's pinned label
  pairs — are assembled by `cohort.ts` and handed in as strings, so the
  pinned vocabulary stays single-sourced and the import list stays closed.
- **R-38 Every generated line passes the style gate, and the gate never
  edits.** It accepts or rejects; a rejection ships the templated line and
  is recorded permanently, so no surface can quietly rewrite itself on a
  re-read. The gate does not strip a wrapping quote, remove a preamble, or
  collapse whitespace — a repaired line is prose no human wrote and no
  human reviewed. Its companion obligation: `npm run audit:voice` runs
  **every shipped bank string** through the gate in CI, so an over-strict
  rule is caught against authored prose before it can silently template a
  generated surface forever. If that audit fails, the gate is wrong, not
  the banks — unless the bank is genuinely outside its own rule, which is
  the other thing the audit finds.

  **Note on AV4's scope.** Every surface AV4 generates is *fact-free*
  (report remark, proposal stance), so "no fact may originate in a model"
  is true by construction rather than by enforcement: the renderer's whole
  request is asserted digit-free before it is sent. The fact-carrying gate
  (`gateFactCarrying` — mask the pinned tokens, run the fact-free list over
  the residue) is shipped and has **zero call sites**; its first consumer
  will be a later fact-carrying surface.
- **R-35 Proposal reason.** 1–3 sentences, ≤ 34 words in the framing
  clauses, **present tense** (the report's past tense is its own), wit 0;
  colon for the reveal, comma for the aside (R-8). A passed-through
  catalog passage (a question's `line`, a project's `effectLine`) is
  bounded at its own source, the same rule R-32 states for the report.
- **R-35a A proposal names no fact the player cannot also see on the
  surface it opens.** The reason quotes the price, the clock, the reading
  and the class that the brief / study / launch sheet / project card will
  show an inch later. A proposal that knows something its destination does
  not is a leak with good manners.
- **R-36 Proposal stance carries nothing pinned** — R-29a, restated for the
  AV4 tenant, and trivially satisfied at the AV3 floor, where it is always
  `null`.
- **R-36a Counsel line (the floor's stance).** The authored bank written
  for the home screen's counsel strip (`voice.ts` COUNSEL_LINES) is the
  stance side of the facts/stance split with no generation involved, so it
  carries the stance's whole discipline in authored form: 1–2 sentences,
  ≤ 22 words, wit ceiling 2, at most one craft move; first-person plural;
  no numeral, no §8 pinned label, no designation, no source, question,
  mission or project name, no date. It is **family-scoped** (look / ask /
  send / build, the `COUNSEL_FAMILY` mapping over proposal kinds): the
  line must read true for every proposal its family can produce, urging a
  kind of move from the archetype's own material, never the particular
  target. The swap test binds twice — across archetypes within a family
  (R-6), and across families within an archetype (the family's move is
  what the line is about). It never computes a verdict or states a remote
  fact. Checked by `audit:voice` at the stance limits; family scope and
  the double swap test stay a human read. The AV4 stance substitutes for
  these behind `HOLOS_COUNSEL_GEN`, and this bank is the total fallback on
  every other path, which is why the two share one rule. **The strip is
  gone and the rule is not.** Cutting it in 2026-08 (ui-design.md
  § Anatomy) left the bank served on the wire and read by nothing; every
  limit above still binds, because `audit:voice` still runs them and
  because the line the next surface picks up will be one of these.

**Wit discipline:**
- **R-4 One wit-beat max per short string.** Two is trying too hard.
- **R-5 No wit on wit-0 surfaces.** Chrome, questions, source-card
  affordances: zero jokes.
- **R-6 No homogeneous wit.** Each archetype's wit is drawn from its own
  material (appetite, liturgy, work, parliament…). Reject any string whose
  humor would fit another archetype unchanged.
- **R-31 One remark per served report.** However many entries a report
  carries, at most one of them gets the mind's sentence — the
  highest-ranked new entry, by family precedence `unspoken` > `spoken` >
  `settled` > `refused` > `sent`. Remarks are also **family-scoped**: a
  remark must read correctly for *every* entry its family can produce, so
  it names no specific thing (which reading won, which question refused,
  where the probe went, why it fell silent). Swap test, per family: if two
  archetypes' remarks in the same family could trade places without either
  becoming wrong, both fail R-6. A remark is 1–2 sentences, ≤ 22 words,
  wit ceiling 2, at most one craft move — shorter than an arrival line
  because it is read beside a measurement, not instead of one.

**Punctuation and house style (grep-checkable):**
- **R-7 No exclamation marks** anywhere in game-facing prose.
- **R-8 No em dash reaches a player surface.** Not one, anywhere in
  game-facing prose: not spaced, not unspaced, not an en dash or a double
  hyphen standing in for one, and not as a chrome separator or a
  missing-value glyph. The dash is the punctuation mark of a sentence whose
  clauses have not been decided about, and this voice decides: **a colon
  sets up a reveal, a semicolon joins two whole clauses (R-9), a comma
  carries an aside, and a full stop is always available.** Where the old
  rule reached for a spaced em dash, use one of those four. The reveal
  colon is the workhorse and the direct descendant of the rule this
  replaces.

  Rewriting means *rewriting*. Swapping ` — ` for ` – ` or ` -- ` is the
  failure mode: it keeps the undecided clause and only shortens the mark.
  If the sentence still reads as an aside bolted onto a main clause, it
  has not been fixed.

  Enforced twice, because the prose has two authors. `npm run audit:dashes`
  (`scripts/audit-dashes.mjs`, in CI) reads every string literal in the
  client and server sources plus the document head, the web manifest and
  the social-card tagline, and fails on U+2014. `stylegate.ts`'s `EM_DASH`
  rule rejects a generated line for the same reason (`em-dash`), covering
  the half of the prose no author ever sees. A comment is not a surface,
  and this guide's own narration is not a surface either; see §7's note on
  what the audit does not cover.
- **R-9 Semicolon joins two whole clauses only** — the balanced-opposition
  beat the firstReads use. R-8 leans on it harder than it used to: a
  reversal that would once have taken a dash usually wants this instead.
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

**Length bounds.** R-41 is the governing rule; the bounds under it were
derived from the pre-2026-08-14 banks and are now mostly slack, kept because
each also carries a sentence-count, tense or punctuation clause that the
walls do not restate.

- **R-41 Length is enforced.** Every bank string fits the **Length wall** of
  its surface's §2 row. Words are counted on the authored template text, each
  `${…}` interpolation counting as one word and the fact it renders exempt
  (§2, *How a word is counted*). Walls are ceilings; the aims beside them in
  §2 are the targets, and a bank clustered at its wall has not landed.

  Where a §2 wall and a §3 bound disagree, **the wall governs** — including
  against the two floors the walls contradict outright, R-19's 18-word
  minimum and R-39's 45-word minimum, both withdrawn 2026-08-14.

  Enforced in two places, for the same reason R-8 is. `npm run audit:voice`
  holds the `voice.ts` banks to their walls mechanically, from a `WALLS` map
  it prints the offending bank and string against. Every other surface — the
  catalogs, the client's chrome, the ceremony, `voyages.ts`, `orders.ts`,
  `questionmethod.ts` — is held to the wall **at review**, because those
  strings are not scraped by anything. The walls in that audit are being
  **lowered phase by phase** as the rewrite lands: each one is seeded at the
  bank's measured maximum on the day the map was written, with its target
  beside it, so the audit is a ratchet against regression from the first
  commit rather than a wall of failures nobody can land.
- **R-16** Charter: 1 sentence, 6–18 words.
- **R-17** First read: 1 sentence, ≤ 16 words; at most one `;`.
- **R-18** Wake line: 1 sentence, ≤ 32 words; at most one colon or
  semicolon (R-8 removed the third option).
- **R-19** Gloss: 1–2 sentences, 18–42 words.
- **R-20** Question: 1 interrogative, ≤ 9 words.
- **R-21** Cradle fingerprint: 1–2 sentences, ≤ 36 words (second sentence is
  the "lesson" beat).
- **R-22** Lineage fingerprint: 1 sentence, ≤ 26 words.
- **R-23** Chronicle line: ≤ 30 words.
- **R-24** Chrome: ≤ 6 words; ALL-CAPS set phrases per §8.

  **R-24a The caps sub-line.** ALL-CAPS is used for two different things and
  R-24 only ever described one of them. A **label** names a thing a thumb can
  press or a state it can recognise, and it is the set phrase R-24 bounds at
  six words. A **sub-line** is a whole sentence set in caps *underneath* a
  label, explaining what taking that move would mean: `THEY WILL NOT KNOW
  UNTIL IT REACHES THEM` under an accord's accept, `NEEDS A PROJECT THAT HAS
  NOT LANDED` under a voyage that cannot leave. It is microcopy wearing
  chrome's typography, so it takes **microcopy's bound: ≤ 12 words** (R-25),
  in caps, wit 0.

  A **composed** chrome line is the third case and is bounded on its stem
  alone: the accord rail is a pinned phrase plus an interpolated `Fact`
  (`THEIR LIGHT SINCE: BELOW THE FLOOR · AS OF n Y AGO`), and the fact is
  bounded at its own source. This is R-32's carve-out for record sentences,
  which says the same thing about a passed-through passage.

  Written down 2026-07 after a sweep found five shipped strings over R-24 and
  every one of them a sub-line or a composed line rather than a label. §7
  decides which way that correction runs: the code banks are canonical, so the
  rule moves to the prose.
- **R-25** Microcopy: ≤ 12 words; sentence case (caps in the R-24a case).
- **R-39 Question method:** 3 sentences, 45–65 words; observatory deadpan,
  wit 0; **no numerals**. The costs and clocks printed beside it are
  *effective* (project discounts and haste apply), so a literal in the prose
  could be made false by a landed project. `questionmethod.ts` already states
  and observes this; the rule writes it down so it survives the next author.
- **R-40 Section caption:** 1–2 sentences, ≤ 22 words; observatory deadpan,
  wit 0. The explainer under a board heading (`study-picker-subtitle`): what
  this section is, and where its limits are. Sibling captions on one board
  **share a shape on purpose** — the parallel is what tells a player they are
  the same kind of thing — so R-6's no-homogeneity rule does not reach here.
  Bound set 2026-07 from the twelve shipped captions, whose longest is 21
  words; A4 and A5 stretched the class from twelve words to twenty-one with no
  rule in the way, which is why it has one now.

  One string sits outside it and is left there knowingly: A5's push-consent
  explainer (`study-watch-line`, 25 words) is asking permission rather than
  labelling a section, and a consent line is allowed the sentence it needs.
  It is the only member of its class; if a second appears, they get a row.
- **R-26** Arrival line: 1–3 sentences, ≤ 34 words, and **no numerals** —
  an arrival line states no fact from state, which also makes it trivially
  safe for runtime generation (nothing to pin).
- **R-27** Frame explainer: 1–2 sentences, ≤ 34 words; sentence case;
  wit 0; any number in one is a pinned fact (R-29).
- **R-27a** The **silence line** is the frame family's second wit-1 member
  (the clock line is the first, bounded by R-28): 1–2 sentences, ≤ 34
  words, and **no numerals** — it states a stance *about* physics rather
  than a measurement, so there is nothing in it to pin and nothing in it
  that a later retune of the seeding numbers could falsify. At most one
  craft move. It is the only place the Fermi stance is ever stated on a
  player surface (act3-design.md, *The silence, kept*); a second surface
  restating it is a rejection on sight.
- **R-28** Clock line: 1–2 sentences, ≤ 34 words; every time figure derived
  from `clock.ts`'s `REAL_MS_PER_GAME_YEAR`, never written as a literal.
- **R-32** Record sentence: 1–2 sentences, ≤ 34 words; past tense; wit 0;
  colon for a reveal, comma for an aside (R-8). Where a record sentence
  passes an already-authored passage through (a study annotation, a
  project's effect line), the bound governs the framing clause — the
  passage is bounded at its own source and is never re-cut to fit. The
  remark that may accompany one is bounded separately, by R-31.

---

## §4 — Per-archetype voice table

> **Under flat terse this table is vocabulary, not a licence (2026-08-14).**
> The archetype signature no longer buys a string either **length** or
> **ornament**: a Monument and a Tide write to the same wall, in the same
> observatory deadpan, and what distinguishes them is *what they choose to
> mention* — the noun, the concern, the thing worth reporting — not how
> ornately they mention it. The sample register lines below are two and three
> sentences long and would fail their own surfaces' walls today; read them for
> **material**, never for cadence or length.
>
> The table stays because the generation seam still needs it. `voicegen.ts`
> prompts from these signatures and `voice.ts` VOICE_CARDS is a verbatim
> projection of the columns (§7), and neither has been retuned for flat terse
> yet. When that lands, this note is what the retune is measured against.
>
> **The swap test is retired as a gate.** R-6's no-homogeneous-wit rule, and
> the per-family swap in R-31 and R-36a, asked whether two archetypes' lines
> could trade places without either becoming wrong. Under a doctrine where
> the voices deliberately converge, the answer is often yes and that is no
> longer a defect. It survives as advice: if a line could belong to any
> archetype *and* mentions nothing this one would notice, it is probably
> saying nothing. **Family scope is not retired** — a remark must still read
> true for every entry its family can produce, which is a rule about what a
> line claims, not about how distinctive it sounds.

The ten archetypes of `minds.ts`. Charters, firstReads, and wake lines are
**restylable** (the names are not — §8). Each archetype's material is its
own; the DON'T column shows the failure the table was built to prevent, and
still does.

| Archetype | Voice signature | What its wit sounds like | Sample register line | DON'T |
|---|---|---|---|---|
| **The Beacon** | Warm, generous, unembarrassed | Self-aware about its own brightness; jokes at its vanity, never at others | *"We are, admittedly, the loudest thing in this sky. Someone had to be, and we volunteered before anyone thought to ask."* | "Surprise, it's us again, being magnificent." |
| **The Tide** | Hungry, cheerful, unsentimental | Comic appetite; the cosmos as inventory, with genuine good humor | *"There is so much of everything. We mean to get to all of it, and we are making, we think, encouraging progress."* | "Nom nom, another galaxy for lunch." |
| **The Monument** | Liturgical, grave, still | Dry as reliquary dust; understatement so deep it reads as ceremony | *"We keep everything. The question of what is worth keeping was settled long ago, in favor of everything."* | "We're basically a very serious library, ha." |
| **The Cloister** | Cold, precise, sealed | Deadpan refusal; menace kept impeccably polite | *"We are not hiding. Hiding implies someone is looking, and we have gone to considerable trouble to ensure they are not."* | "Do not disturb, genius at work." |
| **The Shepherd** | Protective, patient, understated | Gentle irony that never lands on the ward; scale hidden inside care | *"They will never know we are here. That is the entire point, and, we will allow, occasionally a lonely one."* | "We got strong so the little guys wouldn't have to." |
| **The Sowing** | Quiet, dispersed, wry | Comedy of absence: everywhere, announcing nothing | *"We are, at this moment, in more places than we could name. We would rather not name them, if it's all the same to you."* | "Ghosting the galaxy, one system at a time." |
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
head + tail → *Stonebinders*). **That is the whole civilization-name pool.**

This section specifies a separate flavor for **instance names — ships and
structures** (technology.md): witty phrase-length proper names, a
self-contained quip as a name, with **zero borrowed names**.

**Phrase names are not civilization names** (working decision, 2026-07).
A civilization is a people across deep time, and a quip reads as a joke
told once, not as a name a species carries for ten thousand years — the
register undercuts the thing being named. `NAME_PHRASES` stays in
`names.ts` unused until ship and structure naming lands; `generateCivName`
and the ceremony's suggestion chips draw from the compound lexicon only.

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
`NAME_TAILS` changes, run `npm run audit:names`
(`scripts/audit-names.mjs`). It enforces: every phrase passes
`validateName` at ≤ `MAX_NAME_LEN` chars; the longest head+tail pairing
stays ≤ `MAX_NAME_LEN`; heads are single Title Case words and tails are
single lowercase plurals; no duplicates within a pool; nothing trips the
§6 banned terms. **N-4 (originality) is not scriptable** — it stays a
human read.

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
Dra.?Azon
Schar'?s World
Vavatch
\bChanger\b            # the shapeshifter species sense; ordinary change/changer OK
\bCulture ship\b
Horza
Balveda
Clear Air Turbulence
\bAzad\b               # the Banks game-empire; no ordinary-English collision expected
Azadian
Gurgeh
Flere.?Imsaho|Mawhrin.?Skel
Zakalwe
\bSma\b                # Use of Weapons character name
Skaffen.?Amtiskaw
\bChairmaker\b|Staberinde
\bExcession\b          # the title coinage itself
Outside Context Problem
Interesting Times Gang
Sleeper Service|Grey Area   # Excession ship names; ordinary "grey area" idiom needs case-sensitive review
War in Heaven          # the Surface Detail coinage
Lededje|Veppers|Demeisen
Falling Outside The Normal
```

Plus **any actual Banks ship name**, including the witty ones, and any
near-variant (N-4).

### Second source: Vinge (*A Deepness in the Sky*)

The same rule governs Vernor Vinge, adopted as a second touchstone in
[inspiration-deepness.md](./inspiration-deepness.md): craft borrowed,
coinages never. One term per line, regex-friendly; the *concept* ban and
N-4 near-variant discipline apply as above, and coinages from the sibling
Zones novels are equally banned.

```
Qeng Ho
\bFocus(ed|ing)?\b     # the mind-slavery sense; ordinary focus/focused OK
\bziphead(s)?\b
\bEmergent(s)?\b       # the faction sense; lowercase emergent adjective OK
\bOnOff\b
\blocalizer(s)?\b
\bmindrot\b
Pham Nuwen|\bPham\b
Sura Vinh
Ezr Vinh
Tomas Nau
Ritser Brughel
Anne Reynolt
Trixia Bonsol
Sherkaner|Underhill
Arachna
Brisgo Gap
Namqem
\bthe Deepness\b       # the title coinage as an in-world name; see N-4
programmer.?archaeolog
Zones? of Thought
Slow Zone
```

### Third source: Robinson (*Aurora*)

The same rule governs Kim Stanley Robinson, adopted as a third touchstone
in [inspiration-aurora.md](./inspiration-aurora.md): craft borrowed,
coinages never. The book's coinage surface is small — it is written in
plain English — but its proper nouns are still off-limits; the *concept*
ban and N-4 near-variant discipline apply as above, and proper nouns from
Robinson's sibling works are equally banned.

```
Aurora                # the destination-world name; ordinary aurora (borealis/australis) OK — case-sensitive, human-cleared
Devi
Freya
Badim
Euan
Jochi
```

The ship-mind's capital-S *Ship* as a class noun is barred by N-4 (compare
the capital-M `Mind` ban above); ordinary lowercase *ship* — seedship,
generation ship, ark — is core Holos vocabulary and stays. Real astronomy
is never banned: *Aurora*'s Tau Ceti is a Holos cradle host (cradle 25) and
stays.

### Fourth source: Schroeder (*Lockstep*)

The same rule governs Karl Schroeder, reviewed as a candidate fourth
touchstone in [inspiration-lockstep.md](./inspiration-lockstep.md):
craft borrowed, coinages never. One term per line, regex-friendly; the
*concept* ban and N-4 near-variant discipline apply as above.

```
\block.?step\b         # the title coinage as an in-world name; the netcode sense (deterministic simulation) is innocent in code commentary
cicada.?bed
\bdenner(s)?\b
McGonigal
Toby Wyatt
\bEvayne\b
\bCorva\b
\bThisbe\b             # the world; Ovid's Thisbe stays legal
\bLowdown\b            # the world sense; lowercase "the lowdown" idiom OK
\bjubilee\b            # as the in-world name of the aligned-calendar event; plain English jubilee OK
Emperor of Time
```

Plus the remaining world names of the novel and any near-variant (N-4).

**Allowlist:** `docs/vision.md`'s analytical Banks citations;
`docs/inspiration-deepness.md`'s analytical Vinge citations;
`docs/inspiration-aurora.md`'s analytical Robinson citations;
`docs/inspiration-lockstep.md`'s analytical Schroeder citations; this
guide itself; innocent senses disambiguated in the comments above.

---

## §7 — Sync obligations

The **code banks are canonical**. Docs mirror them, never the reverse. A
restyle that edits a bank without its doc sync is incomplete.

**Two amendments under flat terse (2026-08-14).** First, the rows below that
end "the swap test stays a human read" are discharged by §4's note: the swap
test is retired as a gate, and the human read those rows still owe is **family
scope** — whether the line reads true for every entry its family can produce.
Second, `scripts/audit-voice.mjs`'s `WALLS` map is a third thing that tracks
§2, and it tracks it *from below*: each entry is seeded at the bank's measured
maximum and carries its §2 target in a comment beside it. **Lowering a bank's
longest string is not finished until the seed comes down with it** — the map
is a ratchet, and a seed left high is a wall that has quietly stopped
checking anything. It is the one place in this table where the doc is the
destination and a *number measured off the code* is the thing being synced.

| Bank (canonical) | Doc that absorbs it | Obligation |
|---|---|---|
| `minds.ts` firstReads / charters / wake lines | `act2-minds.md` | **Verbatim**, character-for-character |
| `lineages.ts` fingerprints | `act1-lifeforms.md` | **Verbatim** |
| `cradles.ts` fingerprints | `act1-cradles.md` | **Verbatim** |
| `dials.ts` labels / questions | `act2-design.md` | Labels byte-exact; question wording tracks |
| Interface prose quoted in the walkthrough | `walkthrough.md` | Voice must be consistent with the speaking archetype (§4) |
| `voice.ts` VOICE_CARDS | this guide, §4 | **Verbatim** — a projection of §4's signature / wit / DON'T columns, never an edit of them |
| `voice.ts` REPORT_REMARKS / record builders | this guide, §2 register rows | Register and ceilings track the §2 rows; R-29a, R-31 and R-32 are grep- or script-checkable, and family scope + archetype legibility (the swap test) stay a human read |
| `voice.ts` reason builders / PROPOSAL_VERBS | this guide, §2 register rows | Register and ceilings track; R-35 is grep-checkable |
| `voice.ts` SIGNAL_CLASS_LABEL | this guide, §8's signal-class row, and `client/src/sourcecard.ts` CLASS_LABEL | **Verbatim, three-way** |
| `voicegen.ts` FAMILY_SURFACE (the prompt's occasion / "must not name" table) | `voice.ts` REPORT_REMARKS doc comment | **Verbatim** — the doc comment is the real spec for family scope, and the prompt must state the same referents in the same words or generated remarks and templated ones drift apart in scope while both look fine alone. Human read |
| `voice.ts` INTRO_LINES | `build-s0.md` § "The intro's copy" | **Verbatim** — the brief pinned the four beats in design review; a gate rejection is reviewed against the brief, never fixed in place |
| `voice.ts` COUNSEL_LINES | this guide, §2 counsel-line row and §3 R-36a | Register and ceilings track; the mechanical gates are script-checked by `audit:voice` at stance size; family scope and the double swap test stay a human read. The obligation survives the counsel strip's removal — the bank still ships and is still served, so a doc sync is still owed on every edit to it |
| `bannedterms.ts` | this guide, §6 (and §8's comms register) | **Generated, doc → code** — `npm run sync:banned` writes it, `npm run audit:banned` fails CI on any drift in either direction. This row RUNS BACKWARDS from the rule above it, and correctly: §6 is not a bank, it is a rule list whose canonical statement is this guide |

**What R-8's audit does not cover, and why.** `npm run audit:dashes` reads
strings, not files. The narration in `docs/*.md` — this paragraph included —
is essayist prose *about* the game rather than prose *in* it, and it keeps
its dashes; so does every code comment, for the same reason. The line the
audit cannot draw is the one this table is about: **prose quoted out of a
bank and into a doc is player prose sitting in a doc**, it is bound by R-8,
and it stays a human read, because nothing mechanical distinguishes a
quotation from a paraphrase. Every **Verbatim** row above is therefore also
an R-8 row, and the walkthrough's scene quotes are the case to watch.

---

## §8 — Invariants (pinned vocabulary — never restyled)

Load-bearing literals. Style passes must not rewrite them for wit or flow.

| Class | Pinned values |
|---|---|
| Dial in-world labels | Reach · Depth, Voice · Silence, Garden · Forge, Monolith · Chorus, Memory · Renewal |
| Archetype names | The Beacon, The Tide, The Monument, The Cloister, The Shepherd, The Sowing, The Herald, The Engine, The Congress, The Phoenix |
| Signal-class labels | `DARK NODE`, `TRANSIT SHADOWS`, `DIRECTED BEAM`, `BROADCAST LEAKAGE`, `LIVING WORLD` |
| Model captions | `THE MODEL · WHAT WE BELIEVE`, `HOME` |
| Cradle names / hosts | Every `name` and `host` in `cradles.ts` — real astronomy, never restyled |
| Difficulty tiers | `Gentle`, `Temperate`, `Testing`, `Harsh`, `Brutal` |
| Designation format | `HOL-nnnn-i` — a machine ID, never prose |
| Hypothesis labels | Every `label` in `studies.ts` MENUS — `brown dwarf`, `rogue world`, `cooled remnant`, `somebody's heart`, `debris and rings`, `natural transits`, `construction under way`, `young and sloppy`, `deliberate shine`, `a performance`, `stable biosphere`, `biosphere in crisis`, `pre-industrial civilization`, `industrial rise`, `meant for us`, `meant for someone near us`, `a repeat of an old message` |
| Mission prose names | `The Assay`, `The Sentinel` (`missions.ts` `missionProseName`) |
| Question prose names | `weighing`, `temperature watch`, `line reading`, `shadow timing`, `edge look`, `off-axis listening` (`questions.ts` `proseName`) |
| Proposal chrome | `WHAT WE WOULD DO NEXT`, `READ THE BRIEF`, `OPEN THE STUDY`, `OPEN THE LAUNCH SHEET`, `READ THE PROJECT`. The decline beside them is the one exception — `Leave It`, title case and body weight, so refusing never shouts back at the verb it declines |
| Report headlines | Every `headline` in `missions.ts` — `OCCUPIED, HOLDING AT RANGE`, `INHABITED, HOLDING AT RANGE`, `A LIVING WORLD, NO WORKS`, `A LIVING WORLD, BUILDING`, `OCCUPIED AND WORKING`, `COLD AND STILL`, `NOTHING NEW TO REPORT`, `TREND CONTINUES`, `POWER MARGIN FAILING`, `OFF-CADENCE REPORT` — ALL-CAPS set phrases (R-24), quoted into prose, never restyled into it |
| Age chip | `AS OF n Y AGO` |
| Chronicle dating | Epoch-relative — each civilization counts from its own founding event (the `year n AE` family); the cohort's global year never reaches a player surface |
| Color rule | cyan = you / HOME (present tense); amber = other / belief. Prose must never call HOME amber or a source cyan. |
| House coinages | `Teeming Dark`, `Dark Node`, `Signature`, `the Vault`, `the Model`, `the Ledger`, `the work list`, `Visibility Collapse`, `cradle`, `charter`, `the Refusal` / `Refuser`, `the harness` / `harnessed intelligence`, `the Breakout`, `grave world`, `the Crossing`, `the Chronicle`, `Holocore`, `the Kernel`, `mask`, `ark`, `deep array`, `the cold berth`, `the black-hole tap`, `payload stack`, `worldhousing`, `throne world`, `the send`, `tight beam`, `undertaking`, `traffic`, `standing order` |

**Display note on the pinned dial labels.** The UI may render the pinned
in-world dial labels in display form — all-caps (`REACH · DEPTH`) or an
unspaced middot (`Reach·Depth`) — for chrome typography. The pinned form
above, spaced middot (`Reach · Depth`), governs prose; R-2's byte-exact
rule applies to prose, not to display typography.

**This note used to license `REACH — DEPTH`, and R-8 withdrew it.** The
middot is the separator in every form, display or prose. R-8 is not a
prose-only rule that display typography can opt out of: a dash on a chip is
a dash a player reads, and the carve-out would have been the one hole in an
otherwise greppable ban. The same reasoning retired the em dash from two
report headlines (`OCCUPIED, HOLDING AT RANGE` and `INHABITED, HOLDING AT
RANGE`, both amended 2026-07), where the comma was already the family's own
separator, and from the clock pair's missing-value glyph, which is an EN
dash (`20 y · –`) so that no U+2014 survives anywhere on a surface.

**Designation format, amended (2026-07).** This row previously read
`HOL-nnnn`. The shipped format is `HOL-nnnn-i` — a four-digit catalog
number and an index, e.g. `HOL-0413-7` (`galaxy.ts`, where the
designation is built as `HOL-${four digits}-${i}`). §7's rule decides
which way the correction runs: **the code banks are canonical and docs
mirror them**, so the doc moves to the code, not the code to the doc. The
index is what keeps designations unique when two generated sources draw
the same catalog number, so dropping it to match the old row would be a
collision, not a tidy-up.

**Why the report's new rows are pinned.** Hypothesis labels, mission and
question prose names, and report headlines all enter player prose
*verbatim*, dropped into a record sentence through a `Fact` (R-29). They
are the sentence's payload, not its phrasing: a restyle that improved
`construction under way` into something better-sounding would silently
disagree with the study card that shows the same reading an inch away.
Question prose names are the sentence-case forms of the ALL-CAPS chrome
labels, which never enter prose at all — `WEIGH IT` is a button, `the
weighing` is a thing that came back.

**Capitalization families.** Named events and singular artifacts take a
capital, like `the Vault` and `the Model`: `the Refusal` (and its agent, the
`Refuser`), `the Breakout`, `the Crossing`, `the Chronicle`, `Holocore`,
`the Kernel`, `the work list`. Ambient common
nouns stay lowercase, like `cradle` and `charter`: `the harness`, `harnessed
intelligence`, `grave world`, `mask`, `ark`, `deep array`, `the cold berth`,
`the black-hole tap`, `payload stack`, `worldhousing`, `throne world`,
`the send`, `tight beam`, `undertaking`, `traffic`, `standing order`.
`the Chronicle` is the capitalized surface name;
the lowercase `chronicle` CivSeed field is unchanged.

**The comms register (settled 2026-07).** Player-facing communication is
physical, never epistolary: `signal`, `tight beam`, `traffic`,
`broadcast`, `hail`, `report`, `payload`, `thread`. The words `letter`
and `correspondence` do not appear on player surfaces or in doc prose
describing them — grep-checkable like the bans in §6 (innocent senses:
letterforms, letters of the alphabet).

**Surface names for the great structures** (technology.md, *Working
decisions*): on player surfaces the three dark mesostructures are
`Holocore`, `the Vault`, and `the Kernel` — plain names, capital-family.
The full design names (`Computronium Kernel`, `Chrono Vault`) are formal
vocabulary for docs and code and never reach a surface, per the
dial-label precedent.

Design vocabulary (Custodian/Instrumental, One Mind/Chorus, Curator/Shedder)
is never shown to the player — only the in-world labels reach a surface.

---

## Failure modes and how to use this guide

| Failure | Symptom | Prevented by |
|---|---|---|
| The scenic route | Two clauses where one fact was wanted; a sentence that sets up the sentence after it | §1 + the §2 wall + R-41 |
| Fact drift | A number or load-bearing fact quietly changes | R-1, R-3, R-12 |
| Label drift | A pinned label gets "improved" | R-2 grep against §8 |
| The undecided clause | An aside bolted on with a dash, in place of a decision about the sentence | R-8 + `npm run audit:dashes` + the gate's `em-dash` |
| The nothing sentence | A line that survives the walls by having no fact in it at all | §1's third tenet, at review |

To write a line: (1) identify the surface and take its register and its wall
from §2; (2) write the fact, plainly, in one sentence; (3) delete every word
whose removal does not change what it claims; (4) count, and cut to the wall
— past the wall if the aim is reachable; (5) check the bans (§6) and the
invariants (§8). If a cut bent a number or dropped a load-bearing clause,
put the clause back and cut somewhere else. The galaxy does the grandeur.
The prose says what happened.
