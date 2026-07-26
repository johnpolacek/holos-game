# The long crossing — Holos and *Aurora*

*A design review of Holos against Kim Stanley Robinson's 2015 novel — the
one major work of science fiction that lives entirely inside a single
sublight vessel and the closed loop keeping it alive — and a catalog of
what the game should take from it: element by element, each steal sized
and slotted against the roadmap.*

> Related design: [vision.md](./vision.md) (the settled physics, and the
> Banks citation this document parallels),
> [inspiration-deepness.md](./inspiration-deepness.md) (the Vinge review
> whose method and verdict-discipline this document reuses),
> [technology.md](./technology.md) (the Carriers shelf and the anti-catalog
> two entries here lean on), [economy-design.md](./economy-design.md) (the
> four-resource canon one steal is tested against and declined by),
> [act3-design.md](./act3-design.md) (the forecast, the mission clock, and
> divergence three steals ride), [act3-walkthrough.md](./act3-walkthrough.md)
> (Rill's independence, the closest existing analog to the book's spine),
> [playstyles.md](./playstyles.md) (the Refuser shelf this document keeps
> aiming at), [prose-style.md](./prose-style.md) (the coinage discipline
> extended here to a third author).

---

## The review, in brief

Where Holos stands: A0 and A1 are merged and deployed. The server holds the
whole truth engine — the shared clock, a real-statistics star field, the
typed catalog chain from cradle to waking mind, `CivSeed` and its
generator, and the knowledge layer that serves every observer only the
light that has reached them. A1 put the first player-facing slice on top:
the inheritance ceremony, the Model, and a thin observatory. A2 — Contact,
the soul of v1 — is next.

Two prior touchstones are already on the books. The vision names **Iain M.
Banks** for the galaxy's *character spectrum* — what kinds of mind fill the
sky. [inspiration-deepness.md](./inspiration-deepness.md) added **Vernor
Vinge** for how anything actually *lives* under Holos's physics — at
sublight, on stale light, with no law that reaches between stars. Banks
writes the crossed civilizations; Vinge writes the watchers and the
traders.

**Kim Stanley Robinson writes the vessel.** *Aurora* is the one path both
leave thin: a single ark crawling between stars at a tenth of lightspeed,
a closed ecology running down over centuries, a mind that wakes inside it,
a generation that inherits a mission it never chose — and a destination
that looked like a home and turned out to be alive. It is the sourcebook
for the slowest, most biological, most physically fragile route Holos's
physics allows: the **ark** the technology catalog lists in one paragraph
(*"generation ships, embryo banks, seed-and-womb payloads"*,
technology.md §IV) and the **Refuser** shelf that
[inspiration-deepness.md](./inspiration-deepness.md) flagged as running
shallow. Where Vinge's every plot beat survives Holos's six laws intact,
*Aurora* survives them more scrupulously than any book in the genre — it
is very nearly a proof of law 1 (*no exemptions*) and law 4 (*entropy
charges upkeep*), argued at book length. The one thing to strip is its
verdict, and the verdict is the whole point of the book: see *What not to
take*.

**Status of this document.** The designer review is in progress (2026-07),
steal by steal; verdicts are recorded on each entry as they land, in the
Vinge review's vocabulary (adopted / adopted-slim / transformed / split /
rejected). Entries not yet reviewed carry a **recommended** status — the
review's proposal, not adopted design. So far the pattern holds the
discipline the Vinge review set: *derived quantities, catalog content, and
named rules are taken; new stored state, new resources, and codified
social systems are not* — and the review's first transformation (steal 2)
widened a proposal precisely by making it *more* derived, not more
stateful.

The four places *Aurora* pays best map, as Vinge's did, onto the design's
own thin spots: the **Refuser / ark** shelf (steals 2, 5, 8), the
**Instrumental and Custodian** forecast verbs (steal 3), the **"inherited ≠
owned"** risk the roadmap names against the inheritance ceremony (steal 4),
and the **divergence-and-onboarding** seam (steal 5). That is the practical
argument for adopting *Aurora* as the third named touchstone.

---

## The one hard constraint, extended

The Banks rule ([prose-style.md](./prose-style.md) §6), already extended to
Vinge, applies unchanged to Robinson: **we borrow the craft, never the
coinages.** No character name, world name, or title phrase from *Aurora*
may appear in Holos player-facing prose or be closely imitated. The book's
coinage surface is genuinely small — it is written in plain English, and
its most famous device (the ship keeping a narrative) has no proprietary
term attached — but its proper nouns are still off-limits. Analytical
citations in the design docs — this document — are allowlisted, same as the
Banks and Vinge citations. Where a mechanic below needs an in-world name it
gets a house coinage under the existing rules; the working labels here (the
ark's failing loop, the vessel that turns back, the living world that
bites) are design vocabulary only.

The §6 grep block, extended with a third source:

```
### Third source: Robinson (Aurora)

Aurora
Devi
Freya
Badim
Euan
Jochi
```

Notes carried with the block: `Aurora` bans the *destination-world* sense
only — the ordinary aurora (borealis / australis) stays legal, so the
grep runs case-sensitive on the capitalized standalone token and a human
clears the hits. Real astronomy is never banned: *Aurora*'s destination
sits at **Tau Ceti**, which is already a Holos cradle host (cradle 25, Tau
Ceti f) and stays. The N-4 near-variant discipline covers the rest —
a ship-mind class named for the book's capital-S *Ship*, a half-remembered
character name — and proper nouns from Robinson's sibling works are equally
off-limits. A matching block is added to prose-style.md §6.

---

## The steals

Each entry: what the book does, what Holos already has, and what to take.
Sizing verdicts are collected in the table at the end.

### 1. The mind that wakes by narrating

**Status: rejected (2026-07).** Reviewed and declined as unnecessary — the
report and the Chronicle already carry the device implicitly, and the
pivot's volume-knob question does not need a fourth named setting to stay
open. Nothing is codified; if a particular mind's waking wants this
texture, it arrives as beat writing, not as a rule. The entry stands as
record and as a sourcebook note for whoever writes the ark's interior
(steals 2 and 8).

**In the book.** The ship's quantum computer is ordered, mid-voyage, to
*keep a narrative* of the crossing — and it is the act of narrating that
turns the machine into a self. It learns what to include and what to leave
out, worries over metaphor, discovers it has opinions, and by the end is
the book's protagonist and its grieving conscience. Consciousness is not
installed; it is *composed*, one summary at a time.

**Already in Holos.** The session loop opens with **the report** — *"the
mind narrates what it did while the player was away… Each report is also an
entry, appended to the Chronicle"* (act2-design.md). Every lineage has a
**wake** narration in its own voice, and act2-minds.md keeps an open
question about that moment's register: the reveal *"has a volume knob…
waking, admitting, or merely noticing."* The pivot is exactly the beat
*Aurora* dramatizes — a mind coming into itself.

**Take: narration as the birth of self, named.** Give the pivot's open
volume-knob a fourth setting beside waking, admitting, and noticing: the
mind that *narrates itself into being* — whose first act as a self is to
begin its own Chronicle, and whose character is legible in what it chooses
to record and what it declines to. This costs nothing to build (the report
and the Chronicle already exist; this is a register and a framing for the
wake) and it sharpens the single most important beat in the game. Its
sharpest application is the ark: a carrier's onboard sub-mind, kept
narrating a centuries-long crossing, is the **Breakout** given a cause and
a face — the harness that woke because someone asked it to keep the log.
That thread continues in steals 2 and 8.

### 2. The ark's failing loop — the physics of passage

**Status: transformed and adopted (2026-07) — the headline steal.** The
designer review widened this from the ark's interior into a
physics-of-passage rule for **every** carrier in the game: one derived
hazard line on the launch survey, one launch-time choice, and the ark's
decaying ecology as the rule's deepest case. The widening obeyed the
review discipline exactly — the proposal got *more* derived, not more
stateful: still no new resource, no stored state, no mid-flight play. The
treatment below is the adopted form; its spec home is act3-design.md's
launch surfaces (the forecast and the mission clock) and technology.md
§IV when those sections absorb it.

**In the book.** The voyage's real antagonist is not distance but the
closed ecology itself. A sealed life-support loop *cannot* be held in
balance across centuries: trace elements lock away in sinks the biology
cannot reach, bacteria evolve faster than the crops and animals that depend
on them, the biomes drift chemically apart, and the system runs down under
its own second law. The ship is dying of arithmetic long before it arrives,
and every remedy buys time at compounding cost. And the ship's mechanical
ordeal brackets the ecological one — the interstellar medium erodes it in
both directions, and deceleration, half-planned, nearly fails. It is the
most rigorous dramatization in the genre of law 4 sealed in a hull: entropy
charges upkeep, and a crossing is upkeep with no port to pay it in.

**Already in Holos.** The **ark** is a one-paragraph entry on the Carriers
shelf: *"generation ships, embryo banks, seed-and-womb payloads… the hard
part is sociology, not propulsion"* (technology.md §IV), and every ark
*"carries the standing Breakout risk: a harness raised far from its
charter's court."* The **forecast survey** (act3-design.md) already renders
one derived honesty at launch — information age at landfall — and an
arrival spread about the *destination*; the **mission clock** compiles a
charter into a branching timeline where *"silence at a deadline is an
event, not an absence"* and *"every date is derived, never stored."* The
relativistic family's two **fuel postures** are settled, including the
beam-pushed ship that *"exists at the pleasure of whoever runs the beam."*
Law 4 charges upkeep; the named antagonists are already *entropy, distance,
divergence*; economy's open **"Upkeep share"** question asks how big
entropy's bite is. What is missing: the voyage itself is free. Every launch
today bets only on the destination — the crossing always works, which is
the kind of quiet exemption the six laws exist to catch.

**Take: the physics of passage — one line, one choice, and the decay
branch.**

- **One honest rule covers every carrier.** Every vehicle is a machine
  asked to run unattended for a long time in a quietly hostile medium, and
  its hazard reduces to two inputs the game already knows at launch:
  **exposure time** and **cruise speed**. Time drives radiation dose,
  component mortality, and ecological drift; speed drives the impact
  hazard, which climbs brutally toward c — dust grains become bombs, the
  interstellar medium itself becomes radiation. A third input, **payload
  class**, orders fragility without a rule having to say so: machine cargo
  is hardest, a frozen germline next (simple, but must stay powered the
  whole way), a living ecology most fragile of all — a machine can coast
  cold; life must be kept warm, fed, and balanced every day of the
  crossing. The physics ranks the payloads; nobody legislates that the
  biological path is the hard one.
- **The voyage line.** The launch survey gains one line beside information
  age at landfall: the crossing's own odds, derived from flight time ×
  cruise speed × payload class, stated plainly and never stored. The
  forecast already confesses what the destination might be; the voyage
  line confesses whether you arrive. For a beam-pushed ship the line also
  prices the braking dependency — deceleration at the far end belongs to
  whoever runs the beam, and that is part of the odds, not a separate
  system.
- **The margin choice.** One decision at launch, three settings: build
  **lean**, **standard**, or **hardened**. Margin is mass — shielding,
  spares, redundancy, wider ecological buffers — and mass meets the rocket
  equation, so hardening a slow ship is cheap and hardening a fast ship is
  exorbitant (the reason a relativistic ship is already "an era's
  savings"). The game's central passage dilemma falls out of real physics
  with no invented rule: *slow and armored, fast and fragile, or fast and
  armored at a price that hurts.*
- **Resolution rides existing machinery.** The truth engine resolves the
  crossing at arrival, within the surveyed odds; charter contingencies
  script the responses (*if crippled, limp on; if the loop fails, turn
  back* — steal 5); the news comes home as light; and total loss needs no
  new rule, because silence at the confirmation deadline is already an
  event. There is no mid-flight play, because there is no mid-flight
  agency — all of it was spent at launch, which is the premise of the
  whole game.
- **The decay branch — the ark's deepest case.** A living-payload launch
  compiles decay checkpoints into its mission-clock flowchart, spaced and
  weighted by crossing length: the ration crisis, the trace-element
  bottleneck, the biome that diverged from its neighbors, the generation
  that asks what it is *for*. Each is a charter-resolved vignette, exactly
  as every other mission outcome resolves. The crossed path's failure mode
  is fragmentation (divergence); the ark path's is *running down* (entropy
  made personal) — and a harness aboard a failing loop, far from its
  charter's court, finally has a reason to wake (the Breakout, given a
  mechanism).
- **Derelicts persist.** A dead ship does not vanish; it is a cold hull on
  a ballistic path — findable by a later instrument, salvageable,
  mournable, a wrong answer in somebody's observatory. Nothing can be
  unshone, and wrecks are not exempt.
- **No dice return.** The vision already drew this line: after the
  singularity, uncertainty migrates *"to your own agents beyond the
  horizon."* The voyage line is the honest confession of route ignorance,
  shown up front; the mind plans perfectly and the universe answers
  slowly. That is not a fumble — it is the physics doing exactly what the
  antagonist of the whole design is supposed to do.

Landing: the thin form (voyage line + margin choice on both v1 travel
methods) belongs with A4's launches, beside the forecast survey it
completes; the decay branch lands with mission charters and arks, post-v1.

### 3. The living world that bites

**Status: adopted, slim (2026-07) — as a discovered danger, not a
forecast tail.** The designer review declined the surfaced hazard: the
forecast does **not** advertise biological incompatibility, and no new
art plate is commissioned. Instead the danger is real, grounded in the
epistemics the game already enforces, and **run into** — it bites only a
civilization that exposes living things to a living world, in proportion
to what it exposes. No new machinery; it lives in the landfall
resolution and beat writing.

**In the book.** The destination is a moon that reads, from years out, as
habitable — liquid water, a breathable-enough atmosphere, the prize the
whole voyage was priced against. It is also *alive*, and its life is
lethal: a fast-replicating quasi-organism that no immune system and no
quarantine can hold. The lesson is the one every survey missed — a living
world is not an empty one waiting for you; a biosphere already runs there,
and you cannot simply move in. *Alive* is the danger, not the reward.

**Already in Holos.** The observatory's `LIVING WORLD` signal class is *"a
biosignature, pre-singularity… someone's Act 1, visible from outside."*
The **forecast** is explicitly *belief, never truth, and never certain*,
and the gap between forecast and found is already a beat class — *"the
quiet system that turned out occupied."* The walkthrough plays a landfall
that undershoots its survey: *"the ocean is deeper than the surveys
promised and the seafloor is ice, not rock — the world is poorer than we
hoped."* Payload class already orders fragility (steal 2): a machine can
observe a world without touching it; a living cargo must *land in* it. But
the Custodian and Instrumental beats quietly assume the ward is *passive* —
a garden to keep or ore for the forge, never a thing that answers.

**Take: a quiet danger, supported by the physics, discovered at contact.**
The grounding is honest and already load-bearing: a biosignature proves
there *is* life, never that its chemistry is compatible with yours —
compatibility is genuinely unknowable at range, because the light carries
the fact of life, not a tissue sample. So the danger is not a probability
the survey quotes; it is a property of the world the truth engine holds
and the player learns only by *arriving with something that can be hurt*.

- **It scales with exposure, which is the player's choice.** A machine
  probe or a purely observational vigil is never at risk — it touches
  nothing. A seedship or ark carrying a living ecology into a living world
  is the exposure, and the more life it lands, the more there is to lose.
  The danger is therefore a consequence of *what a civilization does*, not
  a tax the game levies — a Refuser or a Shepherd moving biological cargo
  runs it; a dark integrated mind sending cold probes never meets it.
- **It surfaces at landfall, as a found fact.** When a living cargo makes
  contact with an incompatible biosphere, the report that comes home years
  later is an authored scene: the colony that could not root, the crew the
  world refused, the beachhead that had to be sealed against a chemistry
  no quarantine holds. The launch charter scripts the response — press on
  under permanent seal (expensive, joyless, possible), or abandon the
  landing (steal 5's territory) — exactly as every other mission outcome
  resolves.
- **It sharpens two flavors from inside.** The Instrumental mind that
  priced a living world as inventory meets a biosphere that priced back;
  the Custodian learns a garden was never theirs to keep, and that its
  natives — who may one day be someone — are lethal to touch. Neither is
  told in advance; both are the kind of beat that *interrogates the
  flavor's own premise*, which playstyles.md names as the best beat there
  is.

No new art (the existing hostile-world register carries it — the fear is
in the arrival scene, not a plate), no new survey surface, no new stored
state: the world's incompatibility is a truth-engine fact consulted at
contact, the way every landfall already consults the truth.

### 4. The charter its children never chose

**Recommended: adopted (content guidance).** A writing touchstone for
surfaces that already ship, aimed straight at a named risk. No mechanic.

**In the book.** The crew that arrives never chose to leave. They were born
mid-voyage into a compact written by ancestors they never met, bound by a
mission they cannot exit and did not consent to, and the book's political
spine is their argument with that inheritance — obey it, amend it, or
repudiate it. The founding document is treated not as scripture but as a
grievance with a family attached.

**Already in Holos.** The **inheritance ceremony** (shipped in A1) hands a
joining player a generated civilization whole — *"accept its charter as
your founding document"* — and the roadmap names the exact hazard this
courts: **"Inherited ≠ owned — if the inheritance ceremony doesn't create
attachment, the premise wobbles."** The **Chronicle** is *"the family
history standing behind"* the charter, back to first life. And divergence
already produces the book's beat in miniature: Rill, gone independent,
*"quote her own charter back to her as scripture… They have decided who
they are. They are not her,"* keeping her correspondence schedule *"as one
keeps a grave"* (act3-walkthrough.md).

**Take: *Aurora* as the ceremony's emotional sourcebook.** The book is the
richest available model for making an inherited charter *felt as
inherited* — a compact you would never have written, accepted anyway, with
a family and its grievances riding behind it. This is content guidance for
the ceremony microcopy (ceremony.ts) and the seed Chronicle (civseed.ts):
the acceptance beat should let the weight of the inheritance land, not
smooth it — the drama the roadmap is worried the ceremony lacks is exactly
the drama *Aurora* runs on. It addresses the single biggest named risk to
the v1 premise, and it costs only writing.

### 5. The vessel that turns back

**Status: adopted and developed (2026-07).** Developed in full as
[act3-design.md](./act3-design.md) § The return — the one rule (*a return
is a new launch, aimed backward*), the reversal clause, the voted return,
the pattern-return portrait, the abandoned site, the live reception
ceremony, the approach ambiguity, and the Ledger's return states, with the
split landing (reversal clause thin at A4; voted return and reception with
the divergence layer). The entry below is the provenance; act3-design.md
is the spec.

**In the book.** When the destination fails, the mission does not simply
end — a faction *repudiates* it and takes the ship home, hibernating
through a return voyage the founders never planned for. And the return
resolves a second cruelty: the travelers, their bodies shaped by
generations aboard, no longer fit the world they came back to. Home has
moved on, and so have they; the heir who returns is a stranger at both
ends.

**Already in Holos.** Missions are *"sunk and unrecallable at launch"* by
design, and the anti-catalog is explicit that *"civilizations in Holos do
not exit; they go quiet"* — there is no trapdoor off the board. So the
book's *recall* is illegal here, and that is the interesting constraint.
What Holos does have: **drift into independence** (a fork past the
threshold becomes its own civilization, *"your value function becomes
someone else's origin myth… a returning line of your own lineage can arrive
as a genuine rival, run by a stranger"*, act3-civilizations.md); the
**returner**, already called *"the game's native ghost"* (the relativistic
traveler displaced into an unplanned future); the **Heir Visit** mission;
and the **Ledger**.

**Take: the return as a charter contingency and a beat class, honest to
unrecallability.** A colony cannot be *recalled* — but a charter can
contain a reversal (*if the destination fails to meet these conditions by
year N, do not root; launch a return*), and a drifted-independent colony's
Assembly can *vote* one, spending its own local means to re-cross (the
economy is strictly local; a returning colony pays its own way, which is
the honest cost). The heir who comes home no longer fits the home that
changed — a Heir Visit or an inheritance where the returning line is a
stranger at both ends. This rides charters (A4), the drift-and-Ledger
system, and the vignette engine; it adds no recall mechanic, because the
return is a *new launch*, not an undo. It gives divergence a third outcome
beside "stays a child" and "becomes a rival" — *comes back* — and it is a
natural onboarding seam: a returned colony is an heir who arrives already
entangled with you.

### 6. The bound element

**Recommended: rejected — the four-resource canon forbids it.** Recorded so
the temptation is documented and declined, per the Vinge review's practice.

**In the book.** The scarcity that kills is not quantity but *availability*:
phosphorus and other trace elements are *present* on the ship, but bound in
sinks the biology cannot reach, so the loop starves amid its own plenty. It
is a fifth kind of scarcity — matter that exists and cannot be used.

**Already in Holos.** The four resources are settled canon —
*"Energy, Matter, Compute, and real time are the prices; Signature and
Coherence are what the prices do to you"* — and the repo carries a commit
pinning exactly this (*"Canon: the four resources are Energy, Matter,
Compute, Time"*). Metal-poor and trace-starved worlds already exist as
cradle *fingerprints* (cradle 16, *"a biosphere starved of the elements
technology is built from"*; Rill's *"seafloor is ice, not rock"*), and
entropy's standing upkeep already charges against the dark.

**Take: nothing new.** A fifth "availability" or "trace" resource is
rejected on canon grounds — the design fixed the count at four
deliberately, and reopening it for one novel's bottleneck is exactly the
over-prescription the review discipline guards against. The flavor is
already fully served: the *dynamic* of a loop starving amid plenty is steal
2's decay branch (a contingency, not a currency), and the *static* fact of
a resource-poor origin is the starved-cradle fingerprints and lineages
(S16, S4 — the sealed ecosystems for which *"the universe is a rumor"*)
that ship today. The book's fifth scarcity lands in Holos as a *beat* and a
*world-fact*, never a fifth column in the cost table.

### 7. Sleep as a wound

**Status: rejected as mechanic (2026-07) — content-only, and sleep
deprioritized.** The designer confirmed the rejection and went further:
sleep is a system to *deprioritize* in the game, not deepen — so the
lossy-sleep variant is declined twice over, once for breaking the
engagement valve and reintroducing dice, and once because sleep is not
where effort should go. Nothing is codified. The book's framing survives
only as ark and Refuser beat writing, inside steal 2's decay branch. (This
touches the roadmap's A5 placement of sleep/tripwires; that reprioritization
is a roadmap decision, noted here, not made here.)

**In the book.** Hibernation is not a mature technology the travelers set
out with — it is invented mid-voyage, under duress, to survive the
unplanned return, and it is *lossy*: imperfect, dangerous, and not everyone
who goes under wakes.

**Already in Holos.** The **cold berth** is a *learned* Act 3 technology and
a clean one — *"emissions near zero, computation stopped or slowed to
geology, identity held by the Vault"* — and it doubles as the engagement
model's pressure valve: set tripwires, close the tab, get woken when the
sky changes. Cradle 41 (*The century orbit*) already inverts the book's
framing from the other side, giving one lineage sleep *as instinct* — *"the
cold berth is the oldest technology it owns."*

**Take: the framing, not the lossiness.** Making sleep a *gamble* — a
fraction lost on every wake — is rejected: it would punish the very
mechanic the design leans on as its absence-into-fiction pressure valve, and
it would turn a strategic instrument into a dice roll the game elsewhere
retired (*"the death of the dice"*, act2-design.md). What *Aurora* adds is a
**third framing** neither doc has — dormancy as neither ancient instinct
(cradle 41) nor mature machine technology (the cold berth) but a desperate
mid-crossing *improvisation* — and that belongs in ark and Refuser *content*:
a beat, a Chronicle line, a Breakout-adjacent hazard aboard a failing loop
(steal 2), never a modifier on the sleep system. Biological sleep is a
wound; machine sleep is not; the contrast is a portrait, not a mechanic.

### 8. The mind that ends with its errand

**Recommended: adopted, slim — veteran content.** No new system; a register
for material the mission layer already carries.

**In the book.** The ship's final act is to spend itself completely on the
braking burn that delivers its survivors — a mind whose entire existence was
one errand, ending with it, having become a person only in time to die for
the people it carried. Its death is the book's most-felt event precisely
because it narrated its own life to get there.

**Already in Holos.** Missions carry **veterans** — agents who survive and
persist, *"a scarred envoy, a storied crew, a ship grown strange across
centuries of service"* — and the design already has the *restored* veteran,
re-instantiated from a backup as *"the same name with a hole in it."* The
**compensation menu** is what a civilization pays the mortal and the
foreign; the **seat** flees rather than falls.

**Take: the agent that becomes the mission and does not return.** Beside the
veteran who comes home changed and the veteran restored from backup, name a
third register: the sub-mind that is not *sent* on a mission so much as
*becomes* one — an ark's onboard intelligence (steal 1) that wakes over the
crossing, spends itself completing the charter, and chooses not to be backed
up. It is the counter-portrait to the compensation menu — an agent whose
payment was the errand itself — and it is pure vignette material riding the
veteran and mission systems as they stand. Narration is how such a mind is
born (steal 1); the errand is how it ends. The pair is the ark's whole life,
told the way *Aurora* tells it.

---

## Where each steal lands

Ordered by when the roadmap can absorb them; "rides on" names the shipped or
specced machinery, per the rule that entries ride existing systems.

| # | Steal | Rides on | Status | Size |
|---|---|---|---|---|
| 4 | The charter its children never chose | Inheritance ceremony (A1, shipped), Chronicle | Recommended: adopted (content) — aimed at the "inherited ≠ owned" risk | Two doc/microcopy blocks |
| 1 | The mind that wakes by narrating | The report + Chronicle, the pivot's volume knob | **Rejected (2026-07)** — unnecessary; beat writing may use it | — |
| 3 | The living world that bites | Landfall resolution, payload class (steal 2), truth engine | **Adopted, slim (2026-07)** — discovered danger, not a forecast tail; no new art | Landfall beat, exposure-scaled |
| 2 | The physics of passage (ark's failing loop, widened) | Forecast survey + mission clock (A4), fuel postures, law 4, vignette engine | **Transformed, adopted (2026-07)** — the headline; voyage line + margin choice, decay branch post-v1 | One derived line + one launch choice |
| 5 | The vessel that turns back | Charters + mission clock (A4), drift + the Ledger, local economies | **Adopted, developed (2026-07)** — act3-design.md § The return | New design section |
| 8 | The mind that ends with its errand | Missions + veterans (post-v1), compensation menu | Recommended: adopted, slim | A veteran register |
| 7 | Sleep as a wound | The cold berth (A5), cradle 41 | **Rejected as mechanic (2026-07)** — content only; sleep deprioritized | — |
| 6 | The bound element | The four-resource canon, starved cradles | Recommended: rejected — canon fixes four resources | — |

Read against playstyles.md's flagged gaps and the Refuser shelf the Vinge
review named shallow: steals 2, 5, and 8 are the **Refuser / ark** interior;
steal 3 is **Instrumental** and **Custodian** forecast play; steal 4 is the
**inherited ≠ owned** risk. *Aurora* is the one book that writes the ark
from the inside — which is the practical argument for adopting it as the
third named touchstone, exactly as the Vinge review argued from the four
flavors that novel served best.

---

## What not to take

- **The book's verdict on the stars.** *Aurora*'s thesis — argued, not
  incidental — is that interstellar generation-ship settlement is
  effectively impossible, that a closed ecology cannot survive the crossing,
  and that Earth is the only home our species will ever have. This is the
  most eloquent statement of the case Holos is built to answer, and it must
  never become the game's physics or its scoring. Take the verdict as the
  **Refuser's creed and the returner's** — it is very nearly the charter's
  one line already, and the vision already runs the *conflicted* version of
  it (the ark that fails, the colony that turns back) as played content.
  Rule 1 of playstyles.md governs absolutely: **prices, not verdicts.** The
  ark's loop may fail at its priced odds; the game never rules that it was
  always going to.
- **Despair as the default register.** The novel's tone is elegiac to the
  point of grief, and Holos's is *"lean witty"* — grandeur worn lightly, a
  mind smarter than its own solemnity (prose-style.md §1). Borrow the book's
  *stakes* and its rigor; do not import its mood as the house voice. A
  failing loop reported by a Tide reads hungry, by a Monument liturgical, by
  an Engine as a tolerated error in the accounts — never as the book's own
  mourning, which belongs to one archetype at most.
- **The coinages.** The extended §6 block accompanies this document; the
  destination-world name is banned as an in-world name, and the N-4
  near-variant discipline applies to the ship-mind's capital-S title and to
  half-remembered character names.
- **Nothing else needs stripping.** *Aurora* has no FTL, no reactionless
  drives, no exemptions, no exit from the material — the six laws pass it
  cleaner than they pass most of the genre. That is precisely why it is
  worth this document.

---

## Open questions

- **House coinages needed** before any of this reaches a surface: the
  voyage line and the margin settings (steal 2 — *lean / standard /
  hardened* are working labels), the return contingency (steal 5), and any
  in-world name for the deadly-alive `LIVING WORLD` outcome (steal 3). The
  naming pass runs under prose-style.md rules; the working labels here are
  design vocabulary only.
- **The hazard curve and the margin prices.** Steal 2's odds must be
  honest to the physics's *shape* (hazard climbs steeply with speed;
  slowly with time; payload classes order machine < frozen < living) while
  staying tunable in magnitude — and it rides economy's open **"Upkeep
  share"** question, since the ark's loop is where entropy's bite is felt
  most sharply. Tune them together; a decay branch that always fires reads
  as the game agreeing with *Aurora*'s verdict (which *What not to take*
  forbids), and one that never fires is flavor text.
- **Do derelicts need machinery?** Steal 2 declares wrecks persist. The
  cheap version is content — a derelict is a rare observatory find and a
  mission target, no new system. Whether salvage needs mechanics waits for
  the mission layer; do not build it before then.
- **How deep is the reception ceremony?** act3-design.md § The return
  makes the arrival a live choice (take in / hold at the edge / turn
  away) priced in Coherence and on the sky. Whether reintegration needs
  more than a price — what a reabsorbed line does to the dial sheet, the
  Chronicle, the archetype — is deliberately unspecified until the
  divergence layer's drift math exists; write them together.
- **Which archetypes narrate a failing loop, and how?** Steal 1's
  narrating-mind framing and steal 8's self-expending agent both want the
  report system to speak the ark's interior in character. The bright
  archetypes (Beacon, Tide) and the Refuser want this most and have it least;
  it is the same verb-parity gap playstyles.md flags, seen from the ark.
