# HOLOS
### The forest, read closely — a source study of Cixin Liu

*What* The Dark Forest *and* Death's End *already gave this design, what
they still have to give, and what they offer that we should decline.
Status: **source study — direction, not yet adopted.** Nothing here is
scheduled; each proposal names the slice or open question it would land
in. The prose-style rule extends to Liu exactly as it does to Banks: we
borrow the craft, never the coinages — no wallfacers, sophons, or
droplets on any surface a player reads. House names below are
indicative, offered in the usual way: to be replaced by better ones.*

> Related: [vision.md](./vision.md) (§ The dark forest, played for
> real), [act3-design.md](./act3-design.md) (contact, conflict, sleep,
> anomalies), [technology.md](./technology.md) (the conflict shelf and
> the anti-catalog), [playstyles.md](./playstyles.md) (the neutrality
> rules), [priorities.md](./priorities.md) (posture as consequence),
> [roadmap.md](./roadmap.md) (where slices land).

---

## Why Liu, and why now

The trilogy is the genre's deepest treatment of exactly Holos's
premises: minds separated by real distance, intent unreadable at range,
every message irreversible, every decision made on stale information.
Where most space fiction spends FTL to escape those constraints, Liu
spends three volumes inside them — which makes the books less an
influence to import than a neighboring derivation from the same axioms,
worth auditing line by line for results we haven't reached yet.

And the timing is right. The build sits between A1 (the Sky) and A2
(contact); the letter format is about to be decided; conflict tuning is
an open question the design has deliberately parked. The trilogy is,
among other things, several hundred pages of playtest notes on both.

One framing rule governs everything below. Liu derives a **theorem**:
in his galaxy, hiding is correct and revelation is death, and every
civilization that survives has learned this. Holos derives a
**climate**: the galaxy leans dark because dark tends to survive deep
time, but the lean is a statistic of the AI population, never a verdict
on the player — *being found is not losing; it is a different game*
(playstyles.md, rule 2). The study's discipline is to import Liu's
**pressures** and refuse his **conclusion**. Every proposal below was
checked against the five neutrality rules; where one bends a rule, the
tension is named rather than smuggled.

---

## I. The audit — what the design already holds

Most of the trilogy is already here, arrived at independently from
shared premises — which is the strongest form of fidelity, since it
means the physics is doing the work rather than the homage.

| In the books | In Holos | Where |
|---|---|---|
| The dark forest strike — a relativistic mass, unheralded, fired on old information | The relativistic strike: "arriving barely behind the light that announces it," launched on stale data, unrecallable; intends dread, not tempo | act3-design § Conflict; technology.md VI |
| Broadcasting a star's coordinates as an execution | Third-party coordinates in letters as "the currency of betrayal, or of warning; nothing says which" | act3-design § Contact; act3-walkthrough |
| Chains of suspicion — reasoning about the other's reasoning, forever unresolved | The knowledge layer itself: every fact about another mind is aged light; the vigil is the suspicion given a screen | knowledge.ts; A1–A2 |
| Hiding as survival; the silent universe as evidence | Masks, the Dark Node, Visibility Collapse, the Teeming Dark; elders mostly dark as population statistics | technology.md II; act3-civilizations |
| Hibernation as one-way travel to a better-provisioned future | Sleep: emissions near zero, compute deferred to a colder, cheaper cosmic future, tripwires standing watch | act3-design § Sleep |
| The bunker, the shelters, survival through the strike | The three defenses: dispersal, darkness, and the Vault — destruction without erasure | act3-design § Conflict |
| Being listened to before you know anyone is there | The watched reveal (open question); gravitational-lens observatories on a young world's focal line | act3-design; act3-walkthrough Day 1 |
| The message from a place that can never be reached | The anomaly seed: a hail from a galaxy already over the cosmic-expansion edge — audible, forever unanswerable | act3-design § Anomalies |
| Deterrence eras — decades of peace purchased by a visible threat | Deterrence performed on the sky: visible capability, visible restraint, the light echo as reputation | act3-design § Conflict |

Two structural echoes are worth naming beyond the table. First, v1's
"dread without teeth" posture — shipping the fear of the strike years
before the strike — is precisely the trilogy's own pacing: the books
run hundreds of pages on anticipated violence per page of delivered
violence, and are scarier for it. Second, Holos's founding credibility
rule (nothing promissory binds; only sunk, physical commitments are
credible) is the exact lesson the books teach by counterexample, twice,
at civilizational cost.

The audit's verdict: there is no "add dark forest" work item. What
remains is a short list of specific instruments the trilogy built that
the design has not — and a short list of its instruments we should
refuse on purpose.

---

## II. The refusals — what we take from Liu by declining

**The sophon.** Instantaneous surveillance and a lock on a rival's
physics. Banned twice over — by law one of the catalog (no exemptions)
and by the game's heart: instant knowledge of another mind's present
would delete the knowledge layer, and with it the vigil, the mirror of
suspicion, the whole epistemic game. Note that the sophon's *narrative*
function survives legitimately: every civilization in Holos is watched
without its consent — by everyone downstream of its own old light — and
nothing it learns can be kept from the sky forever. The dread of being
known is native; only the impossible instrument is refused.

**Dimensional strikes, curvature wakes, pocket universes.** Anti-catalog
material, refused with the rest of the exemptions. One salvage: the
curvature drive's permanent visible trail is Liu independently arriving
at a Holos law — travel writes evidence on the sky. Our relativistic
drives are already "the second-loudest thing a civilization can do";
§ III.6 collects what that implies.

**The theorem as physics.** Making hide-or-die true would break
neutrality rule 1 (prices, not verdicts) and rule 2 (the theory
populates the galaxy; it does not police the player). The theorem
enters the game anyway, correctly, in § IV — as something believed
rather than something true.

**The free execution.** In the books, revelation costs almost nothing
and existence is fragile — the right asymmetry for horror, the wrong
one for a persistent world people log into. Holos already prices the
teeth (strikes are Epochal, gated deep in the energy ladder); the same
pricing discipline must hold for betrayal (§ IV).

**Despair as register.** Liu's tone is cosmic horror played entirely
straight; Holos is lean wit riding on grandeur. What crosses the gap is
a craft, not a mood: the flat delivery of enormous facts. In this game
that register already has an owner — the observatory, which does not
editorialize, which is exactly what makes "the source has stopped" a
terrible sentence.

---

## III. The seams — ten instruments worth taking

Each entry: what the books built, the hard-physics translation, the
mechanic, and where it lands. Ordered roughly by how soon the roadmap
could want it.

### 1. The letter that survives its interceptors

*The books:* intelligence smuggled through a censored channel inside
fairy tales — a surface any hostile reader can enjoy, a depth only the
intended reader can unwrap, keyed by a shared past no interceptor owns.

*The seam:* A2 must decide the letter format, and act3-design leaves
interception of directed beams deliberately unsettled. Liu's answer
serves both: build the composed language in **layers**. Every letter
has a surface reading, complete in itself. Correspondents who share
history — prior letters, exchanged Vault fragments, verification
challenges already passed — hold keys that open deeper readings of the
same composed parts. Intimacy is bandwidth: a long correspondence
literally enlarges what can be said, which gives the centuries-long
letter a progression arc and gives interception a native answer — a
captured letter honestly yields its surface, and nothing says whether
the surface is all there is. Deception needs no new rule; a false
surface is just emission you chose.

*Lands:* A2, now — this is the study's most immediate consequence, an
argument that composed-not-freeform buys depth rather than merely
dodging moderation.

### 2. The mirror — your light, read back

*The books:* the chain of suspicion is second-order reasoning — what
does the other think I am, and what will they do about it — and every
strategic mind in the trilogy lives or dies by how well it runs that
loop.

*The seam:* the knowledge layer already computes everything needed to
run the loop honestly: your own emission history, clipped at light
departure, is exactly what any given observer has of you. A3 renders
your echo shell; the missing surface is the readback. Pick any known
source on the Model and see **yourself as their instrument sees you** —
your signal class, their plausible confidence band, the bright years of
you still in flight toward them, the dark turn they will not learn for
another century. No telepathy, no leak: the same `observeCiv`, run in
reverse, plus an honest model of instrument quality you cannot fully
know (their read is rendered as a band, not a point — suspicion about
the suspicion, which is the books again).

The mirror sharpens everything nearby. The choice ceremony can show a
hail's consequence in it — who else eventually stands inside this
shell, and when. The mask contest gets its scoreboard: masking without
a mirror is acting without a monitor. And the vigil earns its second
question — not only *what is that*, but *what are we, over there*.

*Lands:* A3 (the light-echo slice) — the cheapest large win in this
study.

### 3. The vigil under a clock — the Oncoming

*The books:* the whole first crisis is one fact with a date — they are
coming, arrival in four centuries — and that countdown reorganizes a
civilization's entire interior life.

*The seam:* Holos gets this situation for free the moment anything
relativistic flies toward someone: the drive is bright by design and
light outruns the ship, so a 0.5c torch announces itself decades ahead.
When the observatory resolves a decelerating plume *aimed here*, the
vigil — until now an open-ended watch — acquires an arrival window.
Colony ship, embassy, ark, and slug all wear similar fire. The one
thing distance always granted, time to think, is suddenly finite and
counted.

Honest thermodynamics keeps it a contest rather than a jump-scare:
deceleration profiles are information (braking reads differently from
ramming), masks can blur a plume, instruments can sharpen it.
Correspondence during approach is possible and strange — letters cross
the ship mid-flight; you may find yourself writing to a crew that
launched before your civilization ascended. And the ceremony cuts both
ways: every relativistic launch of ours starts this clock in somebody
else's sky, which the launch screen should have the manners to say.

*Lands:* A4 builds the physics (flight clocks, both fuel postures); A5
makes it happen to the player via AI behavior; the conflict layer
arms it. Note the dread works unarmed — in a v1 without strikes, an
Oncoming is still the loudest question in the sky.

### 4. Deterrence is a reading, not a stockpile

*The books:* deterrence lives in the enemy's estimate of one holder's
resolve — quantified, brutally, as a probability that collapses in the
minutes after the sword changes hands to a gentler holder.

*The seam:* act3-design has deterrence performed on the sky —
capability and restraint, both legible. Liu adds the third term:
**willingness**, which is not in the arsenal but in the read of
character. When the conflict layer ships, an observer's deterrence
assessment should be a function the player can partly see and partly
steer: capability from the light echo, restraint from the record,
willingness inferred from the chronicle and drift evidence the sky has
collected. A civilization that has visibly softened — drifted toward
Garden, correspondence-rich, grievances answered with envoys — deters
less, and can watch itself deter less in the mirror. Its gentleness is
also public. Prices, not verdicts: the same read that weakens
deterrence is what makes neighbors answer your hails.

The corollary beat is the handover: succession moments — a seat fleeing
as the Crossing, a fork inheriting the family's deterrent posture, a
throne world passing to an heir the sky has never read — are
discontinuities the whole neighborhood reprices at once. The books
spend their tensest chapter inside exactly that gap.

*Lands:* the conflict layer; this is a design answer to part of the
conflict-tuning open question, since deterrence-that-holds is the mode
in which the teeth exist and are never used.

### 5. The dead hand

*The books:* the deterrent that finally works is automated and sunk — a
broadcast wired to its holder's destruction, credible precisely because
no one has to be brave at the moment it matters.

*The seam:* composes entirely from existing parts. Tripwires already
express standing conditions; broadcast already exists as the
irreversible voice. Wire one to the other: if the homeworld goes dark
outside a declared sleep, transmit the archive — the killer's
coordinates as best the instruments knew them, the chronicle, the Vault
index — omnidirectionally, forever. A civilization with a visible dead
hand is expensive to kill quietly, which is most of what deterrence is
for.

The Holos twist is that visibility cuts both ways, per the founding
physics: a secret dead hand deters nobody, and a visible one is a
target — locate the transmitter, kill it first, then kill its owner.
That is not a flaw; it is the mask-versus-instrument contest given a
mortal stake, and it prices paranoia honestly (redundant transmitters
are Matter, Energy, and Signature like everything else).

*Lands:* conflict layer. Cost class Endeavor, standing upkeep, plus
whatever the visible variant spends in Signature.

### 6. The demonstration — a spell cast on a dead star

*The books:* deterrence is established not by argument but by
exhibition — a curse pronounced on an uninhabited star, and then a long
wait while the proof crosses space toward every watcher at once.

*The seam:* proof-by-light is already the game's native rhythm — act
now, and the confirmation arrives in everyone's sky on its own
schedule. The demonstration is a verb built on that rhythm: perform a
capability on a system where no one lives. Strike a dead rock. Denounce
an empty star and let the neighborhood watch what, if anything, comes.
It is deterrence theater with a real bill — Epochal energy, a permanent
chronicle entry, a Signature bloom — and a payoff that arrives on light
delay, possibly long after the crisis it was commissioned to answer.
Patience as a weapons program.

The inverse case comes free: wreckage with no visible author is an
anomaly seed (the machinery already exists) — a contradiction in the
sky that every civilization in range must answer from its own
character, and the answers reveal the answerers.

*Lands:* conflict layer, plus anomaly content that could arrive
earlier, since a demonstration performed by an AI elder is v1-safe
dread — evidence of teeth, with no teeth shipped.

### 7. The open hand — proving harmlessness

*The books:* the late, hard-won conclusion — hiding fails eventually
and deterrence fails catastrophically; the only stable safety is
*credible harmlessness*, declared physically, at the price of
never being dangerous again.

*The seam:* Liu's implementation (a system that rewrites its own
physics into a prison) is anti-catalog. But the logic names a posture
Holos is missing. A civilization can hide, and it can deter; it cannot
yet **prove it cannot strike**. Under honest thermodynamics the proof
exists: strike capability lives in specific, legible places — deep
energy-ladder rungs, beam batteries, launch infrastructure — so
harmlessness can be performed as *living visibly below the threshold*,
in full view, for long enough that every watcher's instruments agree.
For an ascended mind it is a verb: dismantle the strike-capable stock
in sight of the sky — eject the beam battery into the star, and let
five decades of stellar spectra co-sign the claim. Irreversible,
because credibility in this game is physical or it is nothing; the
founding rule, pointed at peace for once.

Two honest complications, named rather than hidden. First, this bends
neutrality rule 3 — *the menu never locks* — the only proposal here
that does. The precedent is the Refusal, which floors a ladder by
constitution: Holos already allows self-binding when the binding *is*
the identity choice, and the open hand must be built as exactly that —
a chosen constitution, never a treaty demand the interface can
transmit. Second, the Refuser is nearly this posture by accident —
bright, legible, charter-floored — right up until its energy ladder,
its only ladder, climbs into strike range. A Refuser approaching that
rung becomes the sky's most interesting object, which is not a problem
but a story.

*Lands:* conflict layer, late; it needs strikes to exist before
renouncing them means anything. It answers the griefing question from
the target's side — the provably harmless make poor victims and good
neighbors — and gives the coalition system its strongest physical
promise.

### 8. The appointment — sleep as a shared calendar

*The books:* hibernation is one-way time travel, and its most humane
use is the kept appointment — relationships conducted across centuries
by two parties agreeing when to exist next.

*The seam:* sleep and tripwires exist; letters at range cost years. The
appointment is a pact: two correspondents sleep between letters,
tripwired on each other's replies. Subjectively, a conversation;
objectively, centuries passing between sentences. Distant friendship
becomes playable at any range — the pair pace each other down deep
time, and the Ledger can render the strange shape of it: two
civilizations whose histories are mostly absence, synchronized. The
trust content is real, and verifiable the only way anything here is —
a sleeping correspondent's emissions stay flat, and the sky will say so.

The engagement shape is worth noticing out loud: an appointment is a
self-scheduled return visit, which is the rhythm the game already wants
players to have, arrived at diegetically instead of by notification
badge.

*Lands:* A5 (sleep) composed with A2 (threads). Small, warm, and
cheap.

### 9. The explosion problem — why elders watch cradles

*The books:* the deep fear is not the rival's arsenal but the rival's
*curve* — a watched civilization can leapfrog its watcher inside one
round trip, so the only safe reads are old reads, which is no safety at
all. The impossible instrument exists to cap the curve.

*The seam:* Holos bans the cap (no suppression at range, ever), which
makes the fear rational and *unanswerable* — an elder cannot slow a
cradle; it can only watch it, tend it, or end it, and every read of the
young world's progress is decades stale. Make that fear legible where
it lives: the observatory. For a LIVING WORLD or a young bright civ,
the decision-relevant output is not *what is it* but *how fast* — a
growth read with honest error bars, where the interesting state is the
fork (steady versus explosive) that the instruments cannot yet resolve.
That fork is what turns a Custodian's vigil tender and an Instrumental
civilization's vigil cold, using the same data. It is also the entire
stakes ledger of the Gardener's Hand and the Counter-Hand, priced
before either ships.

*Lands:* A2's vigil-as-activity design (this is a hypothesis class,
which the Silence playstyle gap was already asking for), then the
recursion and missions layers.

### 10. The severance — divergence in one scene

*The books:* the fleet that flees discovers, in a single conversation,
that it is no longer one civilization — same species, same hour,
suddenly separate polities reading each other as supplies. The first
true exchange of the dark forest is between siblings.

*The seam:* Holos models divergence as slow drift, and mostly should.
Liu's addition is the discontinuity: some moments sever. A fleeing seat
mid-Crossing choosing which fork to land on — and which to demote to
in-law. Two convoys of one parent, launched in different decades,
resolving that they are bound for the same system and the destination's
Matter does not care that they are family. A fork that learns the
homeworld is gone and finds the charter has no heir clause. These are
drift resolved in a scene instead of a curve — the beat engine's native
material — and they suggest an honest answer to the drift-math open
question: keep the curve coarse in v1, because the sharpest divergence
should be authored, witnessed, and remembered, not integrated.

*Lands:* divergence and missions layers; beat templates can be drafted
whenever Phase B's beat tooling exists.

---

## IV. The doctrine, and two tuning notes

**Cosmic sociology as creed, not physics.** The theorem the game
refuses as law it should embrace as *belief*. In-world, the axioms —
survival first, resources finite, suspicion unresolvable, therefore
strike first and silently — are a doctrine some civilizations hold,
argued in letters, taught to forks in charters, occasionally renounced
in public. priorities.md already reserved the seat: the Judgment row,
the self-appointed constable of the dark forest — to which this study
adds the true believer, the civilization that hunts because it is
certain everyone else eventually will. Hunters exist because they
believe the theorem, not because the game enforces it; regions of the
galaxy are more forested than others exactly where believers cluster,
which gives neighborhoods a climate and gives the player something the
books never gave Luo Ji — the chance to answer the axioms by letter,
over centuries, and be right.

**Pricing betrayal.** The coordinates-broadcast is already in the
design as the currency of betrayal; when the galaxy can act on it
(A5's AI behavior and beyond), its consequence must stay emergent —
who acts on a denunciation depends on who hears it and what they are
for. Never a scripted execution: the books' switchboard-of-death is
refused with the rest of the free kills. And the shout itself is light:
a denunciation permanently identifies the denouncer to everyone in the
shell, which is a Signature and chronicle price the interface should
display with its usual composure.

**The register of dread.** No new rule, one reminder: when a Liu-shaped
horror needs a voice, it belongs to the observatory, whose whole style
contract is flat exactitude. The instrument reporting a terrible thing
plainly is the scariest sentence this game can print, and it is already
legal under R-5.

---

## V. Where it lands

| Instrument | Slice / layer | Open question it touches |
|---|---|---|
| 1. The layered letter | **A2 — decide now** | Player-to-player language |
| 2. The mirror | A3 (light echo) | Masking's scoreboard; the choice ceremony's consequence view |
| 9. The explosion read | A2 vigil, then missions | Vigil-as-activity (playstyles' Silence gap) |
| 8. The appointment | A5 + A2 threads | Engagement pressure valve |
| 3. The Oncoming | A4 physics → A5 behavior → conflict | Interception; arrival dread without teeth |
| 6. The demonstration | Conflict layer (AI-elder variant earlier) | Deterrence theater; anomaly content |
| 4. Deterrence as a reading | Conflict layer | Conflict tuning |
| 5. The dead hand | Conflict layer | Conflict tuning; griefing cost |
| 7. The open hand | Conflict layer, late | Griefing (target-side); rule-3 tension to reconcile |
| 10. The severance | Divergence / missions | Drift math (keep coarse; author the sharp edges) |
| The doctrine | A5 AI behavior; galaxy content | Refuser seeding; priorities adoption |

Two rows touch active slices and are therefore the study's actual
recommendations: the **layered letter** should be on the table when A2
decides the letter format, and the **mirror** should be scoped with A3,
where the light echo already computes everything it needs. Everything
else parks here, the way priorities.md parks — a direction held in
orbit until its slice comes around.

The books end where this game refuses to: with the forest proven right.
Holos is built so that the forest is real, the fear is real, the teeth
will be real — and the theorem stays somebody's opinion. That is the
whole difference between a horror story and a place to live, and it is
worth defending in every mechanic this study ever lands.
