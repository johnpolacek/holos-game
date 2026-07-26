# HOLOS
### The Pattern Catalog — Rhythm in the Light

*What the observatory can read from the shape of light over time. A level
says how bright a neighbor is; a pattern says what it is doing, and when
it does it. This catalog names the patterns, what it costs to resolve
them, what each one might mean, and what else it might be — because a
reading is a belief, never a fact.*

---

## About this document

[act3-design.md](./act3-design.md) gives the Sky its five signal classes
and the rule that the observatory outputs beliefs with confidence levels,
never facts. The light echo gives every civilization an emission history,
and the knowledge layer serves any observer only departed light. This
document adds the temporal layer on top of both: **patterns** — shapes in
a source's light across years and centuries — as a catalog of derived
readings, and **the watch** as the project that resolves them
([projects.md](./projects.md) supplies the clock anatomy it runs on).
Adopted 2026-07 from the Schroeder review
([inspiration-lockstep.md](./inspiration-lockstep.md), steal 3,
transformed — rhythm without sleep); the classification-of-purposes hope
it partially delivers is [priorities.md](./priorities.md)'s. Where this
document and an act design disagree, the act design wins. Numbers are v1
targets, not commitments.

---

## The premise: from level to shape

Everything a civilization does writes on the sky, and the plate rack
(projects.md) gives the writing texture: projects flare and settle,
launches flash, industry hums, dark work dims by deliberate steps. So a
source's emission history is not a brightness — it is a **graph with a
shape**, and the shape is information the game already stores and
currently never shows.

Three laws govern everything below.

1. **Patterns are read from departed light only.** A pattern is computed
   from the target's emission history clipped at light-departure, exactly
   as the knowledge layer already serves it. No reading ever contains
   anything the observer's light does not include.
2. **Every reading states its evidence.** A pattern claim carries the
   baseline it was read from and the repetitions observed. Below three
   repetitions, the reading must say so in its own voice — *two
   repetitions observed; may be coincidence* — and no period may be
   claimed longer than half the baseline. The observatory is confident
   exactly as often as the light entitles it to be.
3. **Patterns generate hypotheses, never verdicts.** A pattern narrows
   what a source might be; it never closes the question. Ground truth
   needs a mission. The central ambiguities — matured, died, or hiding —
   are preserved by design, and a catalog entry that resolved one from
   rhythm alone would be a bug in the fiction.

---

## The watch — watching as a project

**Adopted 2026-07: the vigil's core activity is a project.** A watch is
an Instrument-family project aimed at one source, and it runs on the
two-part clock:

- **The floor is baseline.** A pattern needs light, and light needs
  years: you cannot read a two-century cycle from fifty years of
  watching. Baseline is physics-floored — no budget shortens the wait
  for light that has not arrived.
- **The span is Compute.** Analysis is the fundable part: more Compute
  resolves fainter patterns, separates overlapping periods, and works
  the archive harder.

Which gives the watch its two modes, and the choice between them is the
session texture:

- **The archive dig.** The sky has been arriving for the civilization's
  whole existence, recorded whether or not anyone was asking questions
  of it. A dig re-analyzes stored light: Compute-heavy, fast — its
  clock is nearly all span. The dig is bounded by what the archive
  holds: a source below the detection floor until recently has no
  archive to dig.
- **The forward watch.** Pointing instruments at a source and letting
  baseline accrue: cheap, slow — its clock is nearly all floor. The
  forward watch is the patient half of the vigil, and its findings land
  as report entries across many sittings, which is exactly the
  plate-rack rhythm.

Every resolved index or pattern is a **stage** of the watch (no silent
decades), each landing as a beat or report entry: the vigil produces
findings the way other projects produce structures. The
watch-versus-hail tension act3-design.md names — watch longer or act
now — is thereby priced in the ordinary way: a longer watch is
confidence gained and a head start spent.

**Cost classes.** Standing wholesale sky-processing is Ambient — the
observatory always notices the obvious. A directed watch on one source
is an Investment. There is no Endeavor-class watch in v1; patience is
priced in time, not treasure.

---

## The derived indices

Four numbers the watch computes for any source, from stored machinery
(`EmissionEpoch[]`, `emissionAt`) with no new state:

| Index | What it is | What it feeds |
|---|---|---|
| **Trend** | Climbing, steady, or fading, over the baseline. | The coarsest character read; the fade/climb entries below. |
| **Period** | Repeating cycle length(s) found, if any. | Pulse, flash train, and every timing decision. |
| **Regularity** | How predictable the source is — how well its past rhythm forecasts its next beat. | The metronome entry; the mirror (below); forecast sharpening. |
| **Coverage** | Baseline years and repetitions observed. | The confidence the other three are entitled to. |

The indices surface on the source card in the instrument register
(`AS OF n Y AGO`), in plain language, with coverage always stated.

---

## The catalog

Each entry: the shape, what it takes to resolve, the readings it
supports, the false read (what else looks like this), and the mirror
(what makes or unmakes this pattern in your own light). Entries marked
**[beams]** ride the message layer's directed-beam records and land no
earlier than A2's correspondence machinery; all others ride the emission
history and are readable the day the watch ships.

### 1. The climb

**Shape.** Sustained brightening across the baseline — decades to
centuries of monotonic rise.
**Resolve.** Short baseline; trend is the cheapest index.
**Readings.** An energy-ladder ascent in progress: expansion, swarm
construction, appetite. The Tide's whole biography is a climb. A young
civilization industrializing reads the same way at lower absolute level.
**False read.** A natural brightening — a variable star, a dust lane
clearing. Astronomy before biography.
**Mirror.** Every bright era of yours is a climb someone will read. The
climb is the least deniable pattern: Signature accruing in real time.

### 2. The fade

**Shape.** Dimming by deliberate-looking steps, sustained.
**Resolve.** Short baseline for the trend; long baseline to
distinguish *staged* fading from decay.
**Readings.** The integration path: dark projects landing one by one, a
civilization pulling its light in — the Monument or the Cloister at
work. Or a decline. Or a death.
**False read.** The three-way ambiguity is the point: matured, died, or
hiding cannot be separated from rhythm alone, ever. The fade is the
catalog's standing lesson in law 3.
**Mirror.** Your own dark turn will be read as exactly this ambiguity —
which is the protection. A fade that *pauses* on schedule, though, leaks
discipline (see the metronome).

### 3. The pulse

**Shape.** A cycle of flare and settle: years-to-decades bright, then
quiet, repeating.
**Resolve.** Baseline of at least two full cycles (law 2).
**Readings.** A project cadence — staged megawork completing in rhythm,
the plate rack itself seen from outside. Period estimates the tempo of
their Endeavors; phase predicts the next completion. The richest single
read in the catalog: it tells you *when something will happen there*.
**False read.** An eccentric-orbit world's environmental cycle (see the
season); a variable star.
**Mirror.** Your Endeavor cadence is legible at range. Stagger, vary, or
accept being forecast.

### 4. The flash train

**Shape.** Brief, sharp, repeated spikes over a low base.
**Resolve.** Moderate baseline; spikes are cheap to see, their rhythm
needs repetitions.
**Readings.** Launch activity: mass drivers, departure burns, beamed
propulsion. Counting flashes approximates counting children; the train's
rate is an expansion tempo. A train that *stops* is a finding with its
own entry (the missed beat).
**False read.** Flare-star activity; impact events on a dead world.
**Mirror.** Every launch flashes. A civilization that expands on a
schedule has published its schedule.

### 5. The sweep **[beams]**

**Shape.** A directed beam that touches you on a strict period — you are
inside someone's scanning arc, not their audience.
**Resolve.** Two touches for a hypothesis, three for a period.
**Readings.** A survey instrument at work: somebody maps their
neighborhood, and you are in the map. Phase and period sketch the arc —
and every other system the sweep must also touch, which is intelligence
about *their* attention, not just their existence.
**False read.** A pulsar; a beam meant for a neighbor that wanders (the
dialogue, mislaid).
**Mirror.** Your own surveys sweep. Sweeping quietly is an instrument
posture the conflict layer will someday price.

### 6. The dialogue **[beams]**

**Shape.** Directed pulses from a source, aimed not at you, alternating
on a slow rhythm — call and, after a fixed lag, response.
**Resolve.** Long baseline; the rarest and most expensive read in the
catalog.
**Readings.** Correspondence: the source is talking to someone. The
alternation lag is twice the distance to the unseen partner — **rhythm
as triangulation** — so a patient watch can infer where the partner is
without ever detecting them, and a `DARK NODE` at the computed range
stops being ambiguous. Explosive intelligence, priced in decades of
patience.
**False read.** Two unrelated schedules interleaving; a relay never
meant as conversation.
**Mirror.** Your correspondence has a geometry. Two civilizations that
write on a steady rhythm have drawn a line in the sky for anyone
watching both ends — the price of the very correspondence habit the
contact loop encourages, and worth a beat the first time a player
realizes it.

### 7. The chorus

**Shape.** Several sources whose changes correlate: one dims as another
brightens, stages landing in a shared order, changes propagating between
them at light-crossing lag.
**Resolve.** Watches on multiple sources plus a joint dig; Compute-heavy.
**Readings.** One polity across sites — a lineage, colonies under one
charter, coordination running at the speed the physics allows. The
propagation lag maps their internal geometry; tight correlation at long
range implies discipline (high Coherence, read from outside).
**False read.** Coincidence, the eternal one — correlation across a
handful of events is noise until coverage says otherwise.
**Mirror.** Your family resembles you in rhythm. A diverged colony's
drift is visible to third parties as the chorus decohering — strangers
can watch your family drift apart.

### 8. The metronome

**Shape.** Not one pattern but a property of all of them: everything the
source does — pulses, flashes, fades — shares one base period, at high
regularity.
**Resolve.** Long baseline across multiple pattern classes.
**Readings.** A scheduled civilization: disciplined, planned, running
its whole rack on one calendar. Predictable, therefore forecastable —
the forecast's uncertainty cone narrows sharply against a metronome.
Whether discipline implies rigidity is a character question the pattern
raises and cannot answer.
**False read.** An environmental clock underneath (the season) mimics
civic discipline.
**Mirror.** The regularity index is the one stat a player should watch
on *themselves*: habits are legible. Perfect regularity is a published
schedule; deliberate irregularity is cheap stealth, paid in the
convenience of your own planning.

### 9. The missed beat

**Shape.** An established rhythm — any of the above — breaks: a pulse
that does not come, a train that stops, a metronome that skips.
**Resolve.** Cheap, *if* the rhythm was already resolved: the better
your prior watch, the sharper your surprise.
**Readings.** Something happened, dated to the missed beat's year minus
nothing — the break itself carries a timestamp. Crisis, redirection,
completion of the thing the rhythm served, or the target noticing it
was being read. The observatory's version of act3-design.md's rule that
silence at a deadline is an event, generalized: **a broken pattern is a
beat**, always.
**False read.** Your own coverage failing — an instrument gap
masquerading as their silence. The reading must check its own house
first.
**Mirror.** Breaking your rhythm on purpose is a message with no
addressee and every addressee — sometimes exactly what you want.

### 10. The counterfeit

**Shape.** A pattern too clean: rhythm with none of the jitter real
racks produce, or a character whose patterns disagree with each other —
a climb whose flash train never varies, a fade that spends like a
climb.
**Resolve.** Expensive: pattern-against-pattern cross-checks, high
Compute, long coverage.
**Readings.** Performance. The light echo makes deception native —
others see only what you emit, and you choose what to emit — and a
sustained performance is a rhythm *authored* rather than lived.
Catching the disagreement between two of a source's patterns is the
observatory's contribution to the mask-versus-instrument contest, and a
counterfeit verdict is grounds for the verification challenges the
contact design already carries.
**False read.** A genuinely disciplined civilization (the metronome)
looks suspiciously clean. Accusing a metronome of counterfeit is a
correspondence drama waiting to be had.
**Mirror.** A mask that dims you is Act 2 technology; a mask that
*performs a rhythm* is a higher art, priced accordingly when the mask
shelf grows (a future technology.md entry, noted there when adopted).

### 11. The flatline

**Shape.** Featureless steadiness across the whole baseline — at any
level. A *dim* flatline: embers. A *bright* flatline: sustained,
unvarying output.
**Resolve.** Trivial to see, hard to interpret; interpretation is all
coverage.
**Readings.** Dim: a dead world's residual warmth, dumb automation
outliving its owners, or a mask flattening texture (nothing natural is
*perfectly* steady — a too-flat flatline is a counterfeit tell). Bright:
a civilization that shines by constitution and never modulates — the
Refuser hypothesis, since a Refuser's charter floors its integration
and its shine (`BROADCAST LEAKAGE`, constitutional). The one pattern
where *absence* of structure is the finding.
**False read.** Every quiet star in the sky is a dim flatline;
distinguishing ember from stone is the `DARK NODE` problem restated in
time.
**Mirror.** Perfect flatness is as legible as perfect rhythm. Real
civilizations flicker; only the dead and the disciplined do not.

### 12. The season

**Shape.** Any of the above, phase-locked to the source world's orbital
period.
**Resolve.** Needs the orbit — `TRANSIT SHADOWS` or a good ephemeris —
plus one pattern class resolved against it.
**Readings.** Environment, not policy: the pattern is the world's, and
the civilization is riding it. A hard-eccentric world lives in
installments around its own year — cradle 41, *The century orbit*,
seen from outside: a civilization whose greatest works land every
perihelion is obeying its sky, not its politics. Separating season from
schedule is exactly the kind of inference the observatory exists for,
and mistaking one for the other is a forecast error with consequences.
**False read.** The mistake runs both ways: civic discipline (the
metronome) read as climate, climate read as discipline.
**Mirror.** A cradle's fingerprint survives into its mind's tempo. Your
own world's year may be written in your habits more than you know.

---

## Seeding the sky

**Rule: AI civilizations ship with rhythms.** The emission-history
machinery (future-dated epochs, shipped in A0) means every seeded
civilization can carry an authored pattern from day one — the stub is
canon, and the stub should *blink*. Guidance for the v1 neighborhood's
eight AI civs, distribution indicative:

- two **climbs** (a young and a peer — different absolute levels, same
  shape);
- two **fades** (an elder gone most of the way dark; a peer mid-turn);
- one **pulse** (a peer running visible Endeavor cadence);
- one **metronome** (the disciplined neighbor; forecastable, unnerving);
- one **flatline**, dim (the standing `DARK NODE` ambiguity, now with a
  temporal face);
- one **missed beat**, authored: a rhythm established in the deep
  emission history that breaks at a scheduled year early in the
  cohort's life — a mystery that fires without a line of new code, the
  moment a player's watch is good enough to notice.

The seed generator consumes the same catalog chain as everything else;
pattern assignments should lean on archetype (a Tide climbs, a Monument
fades, a Beacon keeps time) so that rhythm, character, and chronicle
tell one consistent story — or deliberately disagree, which is the
counterfeit, and at most one of the eight should be one.

---

## The mirror — the tempo you keep

Rhythm is a residue, exactly as Signature is: never spent, never set,
accrued by habit, and read late by others. The design already promises
that the player's own emissions will feed the light echo (A3); when they
do, the player's rack writes the player's pattern, automatically, and
everything in this catalog becomes true of *you*. Three consequences,
stated once here so every future surface can rely on them:

- **The Model may show you your own pattern** — self-observation is the
  knowledge layer's one present-tense case, so the game can honestly
  show the rhythm others will eventually read, before they read it.
- **Regularity is convenience sold as intelligence.** A tidy calendar
  of launches and stages is easier to play — and is a published
  schedule. The tension is deliberate and should never be resolved by a
  mechanic; it is a price (playstyles.md, rule 1).
- **No new meter.** The tempo is the emission history; regularity is a
  derived index of it. Nothing new is tracked, which is what keeps the
  mirror honest — the sky is the stat sheet.

---

## Data shape (for when this leaves Markdown)

```
PatternReading {
  targetId: CivId
  class: "climb" | "fade" | "pulse" | "flash-train" | "sweep"
       | "dialogue" | "chorus" | "metronome" | "missed-beat"
       | "counterfeit" | "flatline" | "season"
  trend: "climbing" | "steady" | "fading"
  periodYears?: number          // absent if aperiodic
  phaseYear?: number            // predicted next beat, in the observer's light
  regularity: number            // 0..1, forecastability
  baselineYears: number         // coverage: light actually analyzed
  repetitionsObserved: number   // coverage: cycles actually seen
  confidence: number            // entitled by coverage, per law 2
  asOfYear: number              // the instrument register, as everywhere
}

Watch {                          // a project; see projects.md
  targetId: CivId
  mode: "archive" | "forward"
  stages: PatternReading[]       // findings land as stages
}
```

`PatternReading` is a *derived* record — computed from the emission
history the knowledge layer already clips, never stored as truth. The
no-leak boundary is inherited, not re-implemented.

---

## Open questions

- **The v1 subset.** Twelve classes is the catalog; the A2 slice
  probably ships five or six (climb, fade, pulse, flash train, missed
  beat, season) and defers the beam-riding pair (sweep, dialogue) to
  the correspondence machinery they need. Decide at the A2 brief.
- **Beam records.** Sweep and dialogue read *directed-beam histories*,
  which the message layer does not yet store. The one place this
  catalog wants state that does not exist — decide whether beams get a
  history when correspondence ships, or the pair waits.
- **Regularity's formula.** Forecastability is easy to gesture at and
  fiddly to define; the index needs one honest definition before it
  appears on a card.
- **How wrong may a reading be?** Law 2 bounds confidence by coverage,
  but the deeper question — inherited from the Vinge review's
  interpretive-layer discussion — is whether readings can be
  *structurally* biased and discovered to be so. Deferred with the
  vigil's fuller design.
