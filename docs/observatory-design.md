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

Six calls were settled in design review (2026-07) and are marked
**settled** where they land below: portfolio pacing, no certainty at
range, the plain regression tell, wrong calls playing out, creativity by
composition, and tradeable dossiers.

**The design target, stated once (settled):** the observatory is played
as a **portfolio**. Any single case may go quiet for sessions at a
stretch — dry spells are common, and honest — but the case *load* must
always offer a real decision: something to buy, hold, probe, shelve,
call, or re-aim. If the whole board's best play is ever "do nothing and
wait," this document has failed and gets revised. The fun is breadth
plus composition: lots of asynchronous watches running at once, and a
toolset that combines in ways this document does not enumerate.

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
leader. No hypothesis ever reaches zero or one hundred (**settled**):
watching alone never delivers certainty, however long and however deep —
the observatory outputs beliefs (act3-design.md), an empty patch of sky
stays permanently ambiguous (economy-design.md), and going there is the
only way to truly know. Hypotheses come from the menus (**settled**):
players do not author free-text theories — their creativity lives in how
the tools compose (below), which is buildable, honest, and ships sooner.

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

## The toolset composes

Creativity lives in combination (**settled**), and the pieces are built
to combine — none of the following is a feature; each is a consequence
the design must preserve:

- **Watch the neighbors.** Suspect a quiet mass? Open cheap cases on the
  systems around it — construction shadows, probe traffic, and beam
  sidelobes show up *near* a hider before the hider does.
- **Calibrate by grounding.** Ground one look-alike (an Assay to a
  boring brown-dwarf candidate) and every case of that class sharpens —
  spending a probe on a nobody to buy confidence about a somebody.
- **Instrument the calendar.** Chain holds and case tripwires into a
  self-running program: *hold this case for the conjunction; if the
  answer regresses, wake me; if it sharpens, auto-buy the follow-up
  question* (a standing order, missions-design.md).
- **Breadth as strategy.** Run wide and shallow to map a neighborhood,
  or narrow and deep to break one mask — the instrument budget prices
  the choice; nothing else constrains it.
- **Bait the light.** Your own visible acts are evidence *you* control:
  go briefly loud, or launch something watchable, and see which cases
  flinch — the Daybreak lesson from the walkthrough, weaponized.

The list is illustrative, not exhaustive — the parity test is that
playtesters keep finding combinations this document did not.

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
  says so plainly (**settled**) — not a wobble left for experts to
  notice, but the implication stated in the observatory's deadpan: *this
  does not happen naturally; something is working against the look.* The
  mind reclassifies the case from *what is it* toward *why does it mind
  being looked at*. Losing ground on a case is the moment a vigil
  becomes a thriller, and it is information no honest sharpening could
  have bought.

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
  wrongly called case is a story the game is allowed to tell. **A called
  case stays called** (**settled**): later light accrues to the archive
  but never auto-reopens the case, never warns of contradiction, and
  never charges a penalty — the wrong belief just sits there shaping
  choices until reality corrects it, as an event, maybe years later.
  The player can always reopen a case on their own suspicion; the game
  will not do their doubting for them.
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

**Dossiers trade in v1** (**settled**): a dossier is a payload block in
the composed-signal grammar — sendable, withholdable, tradeable, and as
deniable as anything else on a beam. Comparing notes on a shared worry
is the safest first deal two nervous strangers can make, and the quiet
civilization's whole export economy starts here. What matures later is
the market's depth — brokering, pricing against the compensation menu,
forged dossiers and their unmasking — not the existence of the trade.

## Session texture

A vigil session, five to fifteen minutes, phone, and it is a *portfolio*
session: read the new light across the whole board (which questions
landed, what moved, anything regress, which cases said nothing at all —
nothing is a normal answer), buy one or two questions wherever they buy
the most, set or adjust a hold, maybe call or shelve something, and
leave with the next checkpoints visible on the strip. A single case may
be mid-dry-spell for a week; the board never is. The observatory speaks its register throughout — instrument
deadpan, beliefs with ages, no adjectives — and the one flourish it is
allowed stays true: the light you are reading left before you were
watching.

---

## v1 scope

The hypothesis menus above (2–4 per signal class); the six question
types; instrument-time income + allocation on the case board; sharpen /
plateau / regress with archetype-rule opponent spend, the regression
tell stated plainly; case tripwires; called / shelved / overtaken exits
(grounded arrives with A4's Assay); dossiers produced, consumed, and
**tradeable as signal payloads**; holds as authored content. Deferred:
systemic event evidence (A5), dossier-market depth (brokering, forgery —
with the compensation menu), multi-observer joint cases (with joint
missions). Free-text hypotheses are not deferred; they are declined
(creativity by composition, settled).

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
- **Shared cases, formally.** Dossier exchange ships in v1 (settled);
  the open half is the *joint case* — two civilizations pooling
  instrument time on one source with a shared board, which needs joint
  missions' co-authorship machinery. Design when joint nodes ship.
- **Forged dossiers.** If dossiers trade, dossiers can lie — a forged
  finding is deception's cheapest new weapon, and light-cone
  verification (act3-design.md, § Contact) is its natural check. How
  early the forgery play should exist is a tone question as much as a
  systems one.
