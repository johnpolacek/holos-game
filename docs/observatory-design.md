# HOLOS
### The Observatory — the vigil as an activity

*The quiet half of the contact loop, designed as gameplay. A vigil is not
a wait-state with a percentage on it; it is a detective case run against a
budget, a clock, and — when the target is somebody — an opponent who is
spending too. This document specifies the case, the questions a player
buys, the contest that can push knowledge backward, and the dossier the
whole activity produces.*

---

## About this document

act3-design.md defines the Sky, the five signal classes, and the contact
protocol whose first two stages — detect, vigil — this document expands.
playstyles.md flags the vigil as the design's thinnest load-bearing verb
set (*"Silence needs the vigil designed as an activity … otherwise its
optimal play collapses toward inaction"*); this is that design.
economy-design.md's mask-versus-instrument rule (opposed, open-ended
investments; never certainty) is the contest's economics, unchanged.
ui-design.md's observatory panel is the surface this fills in.
[missions-design.md](./missions-design.md) supplies the case's escape
hatch — the Assay — and the Docket rows every bought question lives on.

**The design target, stated once:** every vigil session must contain a
real decision, visible progress or meaningful lack of it, and a reason to
come back. If a vigil's best play is ever "do nothing and wait," this
document has failed and gets revised.

---

## The case

Flagging a source opens a **case** — the observatory desk's unit of work,
one per source under active vigil. A case holds:

- **The record so far.** Everything your instruments have ever received
  from the source — the light archive the source card already scrubs —
  now annotated: which arrivals moved which beliefs.
- **The hypotheses.** The candidate identities still in play, each with
  its share of the mind's confidence.
- **The open questions.** What would tell the hypotheses apart, and what
  each answer costs.
- **The contest state.** Whether the answers are getting sharper or
  stranger (see *The contest*, below).
- **The case tripwires.** Standing wake conditions scoped to this source.

The case board (the observatory Desk panel) is the set of open cases with
their confidence bars and next checkpoints — the sky as a case load, which
is exactly the session texture playstyles.md promises the Silence lean.

## Hypotheses

A hypothesis is a **story about the light**: a candidate identity that
predicts what future light should look like. Each signal class opens with
a small typed menu — the mind proposes; the player prioritizes:

| Signal class | Opening hypotheses (v1 menus) |
|---|---|
| `DARK NODE` | brown dwarf · rogue world · cooled remnant · somebody's heart |
| `TRANSIT SHADOWS` | debris and rings · natural transits · construction under way |
| `BROADCAST LEAKAGE` | young and sloppy · deliberate shine · a performance (a mask worn loud) |
| `LIVING WORLD` | stable biosphere · biosphere in crisis · pre-industrial civilization · industrial rise |
| `DIRECTED BEAM` | meant for us · meant for someone near us · a repeat of an old message |

Confidence is a distribution across the open hypotheses, never a single
number — the source card's headline (`DARK NODE · 71%`) is just the
leader. No hypothesis ever reaches zero or one hundred: the observatory
outputs beliefs (act3-design.md), and an empty patch of sky stays
permanently ambiguous by design (economy-design.md).

Hypotheses interlock with the wider game: *somebody's heart* at high
confidence is a contact case in waiting; *construction under way* feeds
the forecast desk's arrival spreads; *biosphere in crisis* is a Custodian
beat with a clock on it. Calling a case reprices everything, which is why
the activity matters while changing no stat.

## Questions — the verb

The player's move in a vigil is buying a **question**: an observation
program that discriminates between two or more live hypotheses. Questions
are purpose-level (*which uncertainty do we attack*), never
instrument-level (*which telescope, which filter*) — the altitude
principle applied to astronomy.

The v1 question types, each mapping to real observational practice:

- **Weigh it.** Astrometric wobble or lensing — mass separates a brown
  dwarf from a rogue world from a built thing.
- **Take its temperature over time.** Thermal steadiness — nature cools
  on a curve; a maintained temperature is a maintained thing.
- **Read its lines.** Spectroscopy — composition, biosignature gases,
  industrial chemistry, the difference between debris and hull.
- **Time its shadows.** Transit periodicity — orbits are clockwork;
  construction is not.
- **Catch its edges.** Polarization and glint — surfaces answer
  differently than atmospheres, and mirrors differently than rock.
- **Listen off-axis.** Sidelobe leakage around a directed beam — who
  else might it be meant for.

Each question carries a **cost in instrument time** (Compute-heavy, an
Investment; economy-design.md) and a **time to answer** (integration on
real clocks, hours to days, clock pair always shown). Buying one puts a
row on the Docket — `awaiting light`, countdown running — and the answer
arrives in a report, moving the distribution when it lands.

**Instrument time is a budget, not a slot.** The observatory has an
income (raised by instrument-family projects; the gravitational-lens
observatory is the deep end), and the player allocates it across cases.
Scarcity does the design work: with three live cases and income for one
deep question, *which question, on which case* is a real decision every
session. There is no cap on open cases — only on how fast any of them can
move.

**Sequencing is the skill.** A cheap question that halves the hypothesis
space beats an expensive one that polishes the leader. The case board
surfaces this by showing, per question, *which hypotheses it separates* —
the player learns to read a case like a bracket, and the learning is the
gameplay deepening.

## The contest

Against a live opponent, the vigil is a duel of budgets
(economy-design.md, *the mask-versus-instrument contest*): your
instrument spend against their mask upkeep, open-ended on both sides,
certainty never reached.

What the case board shows of it — three shapes an answer can take:

- **Sharpen.** The question landed; the distribution moves; fuzz on the
  Model condenses. Nature mostly sharpens.
- **Plateau.** The answer came back consistent with everything and
  informative about nothing. Could be the limit of your instruments;
  could be money on the other side. Buying a deeper question — or
  waiting for a better geometry — is the reply.
- **Regress.** The signature moment. A confidence that *retreats* — the
  thermal profile that was steady last month and is noisy now, the lines
  that got cleaner in the wrong way. **Nature does not get better at
  hiding.** A regression is evidence of spending, and the case board
  says so in the observatory's deadpan: the mind reclassifies the case
  from *what is it* toward *why does it mind being looked at*. Losing
  ground on a case is the moment a vigil becomes a thriller, and it is
  information no honest sharpening could have bought.

The opponent's side needs no new machinery: an AI civilization's mask
spend is an archetype rule (a Cloister pays the upkeep forever; a young
Beacon never does), and a human's is their own "Masks (dark)" row.

## Free evidence — the sky acts

Some discrimination cannot be bought, only awaited. Events — a flare
backlighting the neighborhood, an occultation by a known body, a
conjunction that lends a natural lens — hand every case in the right
geometry a free question. The case board renders these as **holds**: *the
conjunction in 9 h · ≈110 y would weigh this for free.* Patience becomes
a priced strategy with a date on it, not a default. (v1 ships holds as
authored content on seeded cases; systemic event generation arrives with
A5's living galaxy.)

## The exits

A case ends four ways, all of them choices or events — never a bar
filling to 100:

- **Called.** The player accepts the leading belief and closes the case
  at whatever confidence they can live with. Calling is a real act:
  priorities reprice against the called belief, beats key off it, and a
  wrongly called case is a story the game is allowed to tell.
- **Grounded.** The Assay — a probe goes and looks
  (missions-design.md). Ground truth for the price of a mission and the
  years it takes; the case's escape hatch, and the observatory's
  standing advertisement for the Docket.
- **Shelved.** The vigil goes passive: allocation drops to zero, case
  tripwires stay armed (*wake this case if the leakage stops; if
  confidence regresses; if a beam*). Shelving is how a case load stays
  finite without ever quite letting go — and a shelved case waking
  itself is a beat.
- **Overtaken.** The source acts first — it hails, goes dark, moves, or
  stops existing. The case converts into whatever the event demands: a
  contact choice, a mourning, a threat assessment.

## The dossier

A called or grounded case yields a **dossier**: the belief, its
confidence, the evidence chain, and the light-ages it rests on — the
observatory's finished good. Dossiers are:

- **The repricing instrument.** The forecast desk, the beat engine, and
  the player's own priorities consume them.
- **The quiet civilization's export.** A dossier is a payload
  (act3-design.md, *what signals carry* — third-party coordinates are
  dossier fragments). The intelligence economy playstyles.md asks for is
  the trade in these: knowing things about civilizations that do not
  know you exist, and choosing who else gets to know them. Hearth's
  gift in the walkthrough — coordinates and a light-curve, no comment —
  is a dossier changing hands, with all the motive ambiguity the
  no-enforcement rules guarantee.
- **Stale by construction.** A dossier carries its light-ages; a traded
  dossier ages in transit. Old intelligence is not worthless — it is
  the past, which is the only thing anyone ever knows here — but the
  chip is always on it.

v1 ships dossiers as produced-and-consumed (repricing, beats); the trade
in them matures with traffic and the compensation menu.

## Session texture

A vigil session, five to fifteen minutes, phone: read the new light (which
questions landed, what moved, anything regress?), buy one or two
questions across the case load, set or adjust a hold, maybe call or
shelve something, and leave with the next checkpoint visible on the
strip. The observatory speaks its register throughout — instrument
deadpan, beliefs with ages, no adjectives — and the one flourish it is
allowed stays true: the light you are reading left before you were
watching.

---

## v1 scope

The hypothesis menus above (2–4 per signal class); the six question
types; instrument-time income + allocation on the case board; sharpen /
plateau / regress with archetype-rule opponent spend; case tripwires;
called / shelved / overtaken exits (grounded arrives with A4's Assay);
dossiers as internal goods; holds as authored content. Deferred: systemic
event evidence (A5), dossier trading (with traffic maturity), player-
authored hypotheses, multi-observer joint cases (with joint missions).

## Open questions

- **Confidence math.** Honest Bayesian updating against emission truth +
  mask spend, or authored curves that fake it well? The regression tell
  must be *earned* by the opponent's actual spend either way, or it
  becomes a scripted jump-scare. Leaning honest-but-coarse: few
  hypotheses, few evidence channels, real arithmetic.
- **Pacing constants.** Questions per case before the cheap ones are
  exhausted; how often a case *should* plateau; how rare regression must
  stay to keep its charge. Tuning targets for A2's fun gate, not
  specifiable here.
- **Does calling need teeth?** A called case that later proves wrong
  should sting narratively (a beat) — but should it cost mechanically?
  Prices-not-verdicts says the wrong belief's consequences are its own
  price; watch whether that is enough.
- **Shared cases.** Two civilizations watching the same source could
  compare dossiers — the safest first trade two nervous strangers can
  make, and a natural on-ramp to the intelligence economy. Design when
  dossier trading ships.
