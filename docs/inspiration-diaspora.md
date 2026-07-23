# The pattern, not the substrate — Holos and *Diaspora*

*A design review of Holos against Greg Egan's 1997 novel — the one major
work of science fiction written from inside the thing every Holos player
becomes — and a catalog of proposed steals: element by element, each
sized and slotted against the roadmap, offered for the same evaluation
that settled the Vinge adoptions.*

> Related design: [vision.md](./vision.md) (the settled physics, and the
> travel menu this book independently derived),
> [act3-design.md](./act3-design.md) (the seat, charters, missions, the
> Chronicle), [act2-design.md](./act2-design.md) /
> [act2-minds.md](./act2-minds.md) (the dial system steals 4 and 5 press
> on), [act3-civilizations.md](./act3-civilizations.md) (the catalog
> steals 1, 9, and 10 feed), [playstyles.md](./playstyles.md) (the
> verb-parity gaps this document keeps aiming at),
> [technology.md](./technology.md) (the six laws and the anti-catalog
> this book tests harder than any other source),
> [economy-design.md](./economy-design.md) (Coherence, which steal 4
> spends), [roadmap.md](./roadmap.md) (where each steal lands),
> [prose-style.md](./prose-style.md) (the coinage discipline extended
> here to a third author),
> [inspiration-deepness.md](./inspiration-deepness.md) (the sibling
> review, and the verdict pattern this one is sized against).

---

## The review, in brief

Where Holos stands: A0 and A1 are merged and deployed. The server holds
the truth engine — the shared clock, the real-statistics star field, the
typed catalog chain from cradle to waking mind, `CivSeed` and its
generator, and the knowledge layer that serves every observer only the
light that has reached them. The client boots the Model, the inheritance
ceremony, and the observatory. A2 — Contact, the fun gate — is next.

The corpus already runs on two named touchstones with a clean division
of labor. Banks is the touchstone for the galaxy's *character spectrum*
— what kinds of mind fill the sky. Vinge, adopted via
[inspiration-deepness.md](./inspiration-deepness.md), is the touchstone
for how anything *lives* under the physics — the refused, the watchers,
and the traders, at sublight, on stale light, with no law between stars.

What neither source can reach is the territory the roadmap explicitly
defers and the design most obviously still owes: **the interior of the
crossed civilization**. The vision's later layers include *"the full
travel menu and the identity mechanics of self-transmission and the
seat"*; playstyles.md flags **Depth** (no visible inward progression)
and **Shedder** (no shedding project) as thin; roadmap.md names
*inherited ≠ owned* as a standing risk of the whole Act-3-first plan.
Every one of those gaps is a question about what it is like to *be* a
pattern — to fork, to merge, to bind one's own values, to choose one's
tempo, to decide what a self is worth. Banks writes such minds from
outside, at drawing-room distance. Vinge's crossed minds barely appear.
*Diaspora* is, almost uniquely in the genre, a novel whose protagonists
are the thing a Holos player plays: software civilizations, centuries
deep, working out identity under honest physics — and its opening
movement is a generated mind learning to own an inheritance it never
chose, which is the A1 ceremony's emotional problem, solved in fiction
before this game was designed.

The convergence runs deeper than theme. The book independently derives
Holos's travel menu — transmission as copying, the receiver problem,
slow probes as the honest workhorse — and its substrate ethics mirror
the threshold fork from both shores. This is not an influence to
acquire; like the Vinge book, it is a sourcebook the design has been
converging on without citing. The difference is which half of the game
it feeds: *Deepness* fed the refused exterior; *Diaspora* feeds the
crossed interior.

**Sizing prior.** The Vinge review's verdicts left a pattern the
designer marked as worth keeping: *derived quantities, catalog content,
and named rules were taken; new stored state and codified social
systems were not.* The entries below are sized against that prior, and
the two that push it (steals 3 and 4) say so and carry thin versions
that do not.

---

## The one hard constraint, extended

The Banks rule ([prose-style.md](./prose-style.md) §6) applies unchanged
to Egan: **we borrow the craft, never the coinages**. No invented
terminology, faction or clade name, character name, or title phrase from
the novel may appear in Holos player-facing prose or be closely
imitated; N-4's near-variant discipline applies — a half-remembered
compound about minds-as-software should be assumed to be his. Analytical
citations in the design docs — this document — are allowlisted, same as
the Banks and Vinge citations. Where a mechanic below needs an in-world
name, it gets a house coinage under the existing naming rules; the
working labels used here are design vocabulary only. A proposed §6 block
accompanies this document (end), ready to graduate to prose-style.md on
adoption.

One Egan-specific note: the novel's invented pronoun set for its
software citizens is a coinage like any other and joins the ban.
Holos's minds speak as *we* on every surface already — the plural is
house voice, and it needs no borrowed grammar.

---

## The laws, and the trapdoor

*Deepness* passed the six laws clean, and the Vinge review said so.
*Diaspora* needs a boundary drawn, and it is worth drawing precisely,
because the book tests the anti-catalog harder than any other source on
the shelf.

For its entire sublight span the novel keeps the laws scrupulously —
better than nearly anything in the canon. Minds are patterns; travel is
physical probes at a few percent of lightspeed with the travelers
carried as data; results come home at c and not a second sooner; there
is no ansible, and nobody mourns one. Time is bought with tempo and
patience rather than magic. The fastest thing in the book is a
broadcast, and the broadcast cannot be recalled. Every mechanic in
Holos's travel menu and message layer has a working counterpart on the
page.

Then the final act leaves the universe — through engineered spacetime,
into other cosmoses — which is exactly the trapdoor
[technology.md](./technology.md)'s anti-catalog names in its last row
and refuses: *departure from the material*. Holos's answer is already
settled there — *civilizations in Holos do not exit; they go quiet, and
quiet is a place in the game, not outside it* — and this review does
not reopen it. The boundary is therefore explicit: **everything on this
side of the book's exit is source material; nothing beyond it is.**
What the ending *does* leave behind on the lawful side of the line — a
mind choosing to stop when its purpose completes — is steal 10.

---

## The steals

Each entry: what the book does, what Holos already has, and what to
take. Sizing verdicts are collected in the table at the end. All
verdicts are open pending review.

### 1. The clade spectrum

**Status: adopted (2026-07).** Shipped as
[act3-civilizations.md](./act3-civilizations.md) § The other stances —
four catalog regions with master-table rows, a v1-scope note (landing
with A5's grown AI behavior), and a data-shape note (a stance tag
beside the Refuser flag). Catalog content only; nothing codified beyond
it. The working labels were adopted as design-side names — the
Embodied, the Sculpted, the Descended, the Turned-Away — with in-game
naming staying open under the archetype-naming convention.

**In the book.** Post-humanity is not two camps but a spectrum of
settled stances toward substrate, and the novel's opening chapters are
a tour of them: software citizens in their city-states; robot-bodied
minds who crossed but insist on hulls, real time, and the physical
universe; unmodified biological holdouts; biologicals self-sculpted far
past their ancestral species; and one clade that deliberately edited
language out of itself and climbed down into wordless immediacy. The
stances are not tech tiers — they are creeds, and the book's drama is
their mutual illegibility.

**Already in Holos.** The threshold is a fork with two branches:
crossed (the waking mind) or refused (the Refuser, biological by
charter). act3-civilizations.md keeps an "in-between" band, but its
members are in between on *posture* (bright/dark), not on substrate;
the space between the fork's branches is unpopulated.

**Take: seed the space between the branches** — four AI-population
region seeds, each a catalog paragraph plus an emitter posture and a
contact behavior, none needing new machinery:

- **The embodied** *(working label)*. A crossed civilization that woke
  a mind and then poured it into hulls: constitutionally physical,
  running at the universe's own tempo as a discipline. It refuses
  receivers — not the Refuser's reason (nothing it could send is
  anyone) but its own creed: presence must be *in matter*, so it
  expands only as ships and stations, warm and honest. A crossed civ
  the receiver graph cannot map, and a useful complication for the
  trust topology.
- **The sculpted** *(working label)*. Biological by charter, yet
  self-edited far past its cradle's species — the proof that refusing
  machine sovereignty does not mean refusing self-change. Its bodies
  drift the way minds drift, which gives the Refuser shelf a
  *biological divergence engine*: two sculpted colonies a millennium
  apart are different species who share a founding document.
- **The descended** *(working label)*. A world that had the sky and
  put it back — a renunciation, not a collapse. In the observatory it
  is the light echo's best riddle: a `LIVING WORLD` whose *older*
  light carries industry and `BROADCAST LEAKAGE` that then ramps down
  under control — no bottleneck, no die-back curve, a civilization
  visibly choosing less until only biology shines. The Gardener's
  Hand inverts at its door: does a world that renounced the fruit want
  it offered again?
- **The turned-away** *(working label)*. Computing at full tempo with
  its inputs severed — the vision's *withdrawn civilizations that have
  turned away from the material universe* made mechanically honest
  under the anti-catalog's last row: it never left the board; it
  stopped reading it. In the sky it is a `DARK NODE` that is *busy* —
  warm, present, and permanently unanswerable, distinct from the
  sleeper (cold) and the mask (pretending). No vigil can distinguish
  "will never answer" from "has not answered yet," which is the point,
  and the permanent asterisk it adds to the class.

All four land as act3-civilizations.md catalog content and A5 seeding
(the AI spectrum), and each carries its observatory read with it. The
descended and the turned-away also answer a quiet consistency need:
they are two more ways the sky can be full and silent at once, earned
without touching the silence guardrail.

### 2. The orphan's ceremony

**In the book.** The novel opens inside a birth: a mind generated from
a seed, by machinery, with no parent — randomized within a lawful
space, exactly as the catalog chain randomizes a `CivSeed` — and its
first movement is the work of making an unchosen inheritance into a
self. The library was written by others; the owning is done by the
orphan, by reading, and by deciding what the inheritance *means*.

**Already in Holos.** The seed generator is this machinery at
civilization scale, and the inheritance ceremony is the orphan's moment
shipped as UI: candidates, choice, naming, the charter accepted as a
founding document. roadmap.md names the risk in four words — *inherited
≠ owned* — and assigns it to exactly this seam. There is even a
pleasing symmetry of birth-orders: the book tells the orphan's story
first and lets parented minds exist around it; the roadmap ships
generated civilizations first and defers played origins to Phase B.
Both chose orphan-first.

**Take: the first reading** *(one authored beat)*. Immediately after
BECOME, the new mind reads its own Chronicle — one entry, the annalist
line the seed already carries — and the player chooses what that
history means to the mind that inherited it: pride, grief, debt,
appetite, each rendered in the archetype's own voice. The chosen gloss
becomes the Chronicle's epigraph, permanent, quoted back later by beats
and correspondence. No dial moves; nothing is scored. It is one stored
line of text, and it converts the ceremony's close from menu-exit to
nativity — the player's first authored act is deciding what the
inheritance means, which is the book's exact prescription for making an
orphan a person. Lands as ceremony polish (A2+) and carries into Phase
B unchanged, since a played history needs owning too.

### 3. The merge, and the family referendum

**In the book.** The great expansion is a clone fleet: the city of
minds copies itself a thousandfold and sends the copies to a thousand
skies — as
redundancy (never one basket again), as instrument (a thousand
vantages), and as identity practice. The copies diverge from the moment
of launch, and the culture's answer to divergence is not prevention but
*circulation*: findings and memories broadcast fleet-wide, siblings
receiving one another's records and choosing whether to integrate them,
a shared question answered a thousand ways and the answers compared.
Divergence stays real; it is metabolized rather than cured.

**Already in Holos.** Divergence is the core strategy layer, and it
runs one way: forks drift, the Ledger goes stale, independence is a
threshold. Letters already carry culture as dial nudges — *contact
changes you* (act3-design.md) — and knowledge as ladder modifiers. The
Curator's verb list includes *anchor drifting forks*; the Chorus's
texture is *a parliament of people you used to be*; vision.md names
family coalitions — *civilizations that were once one mind and remember
it differently*. The pieces are all present; the circulation is not.

**Take two things, one riding the other.**

- **The reunion payload** *(working label)*. A letter class that only
  means anything inside a lineage: a fork's self-record — its Chronicle
  since divergence, its drifted sheet, what it has learned. Integrating
  one yields the knowledge and pulls the integrator's dials a bounded
  step toward the sender — the existing culture-nudge machinery at
  family strength, priced in Compute and in the fact of the change.
  Declining is also a choice, and characterful: the Curator integrates
  everything; the Phoenix deletes unread. Sent up the Ledger it is a
  colony reporting home; sent down, the family archive; sent sideways,
  the beginning of a family coalition. This is the Chorus's answer to
  drift — not tighter charters but thicker mail — and it gives *anchor
  drifting forks* a concrete verb at last.
- **The family referendum** *(a beat class, not a system)*. A question
  broadcast down the Ledger, answered over years, each reply in the
  fork's own drifted voice, the spread itself the payoff — the moment a
  parent learns what its children have become is the moment they
  disagree about something it thought was settled. Every date derives
  from distance and the clock (the mission-clock rule: derived, never
  stored), and silence at a deadline is an event, as established.

The push against the sizing prior is honest: the reunion payload wants
to be a wire-visible letter class, which is more than a derived
quantity. The thin version — the payload as fiction over the existing
knowledge/culture letter effects, family-flavored in prose only — costs
nothing and proves the appetite. Lands with letters (A2–A3) thin, and
with the Ledger and drift math (A4) in full.

### 4. Self-binding

**In the book.** A mind can adopt a self-applied value-lock: a chosen
configuration that holds part of the self fixed against all argument,
forever if unrevised. The book prices it with devastating economy — not
in energy but in *reachability*: the bound friend is not dead and not
diverged, merely closed, serenely beyond persuasion on the locked
ground, and the grief of the unbound is that no letter will ever land
there again. The same tool, used well, is how a mind stays itself
across a project measured in megayears.

**Already in Holos.** The dial system is built for this and stops one
step short. Nature sets each dial's *range*; play sets the *point*;
forcing against the grain injures Coherence and slowly drags the point
(act2-design.md, *Resistance and drift*). Charters pin dials — but only
for *children*, at launch. The one self a civilization cannot yet write
a charter for is its own future.

**Take: self-binding** *(working label)* — a project that narrows the
civilization's *own* range around a chosen point: the charter mechanic
aimed inward. What it buys is what the integration path already wants:
resistance dilemmas inside the band go quiet, Coherence heals faster, a
posture aligned with the band costs less to sustain (the mask-strain
rule reads the band, not the point). What it costs is the book's two
prices, made mechanical: **permanence by cost** — unbinding is the
slowest, costliest project family in the game, so the menu never locks
(rule 3, playstyles.md) but this menu reopens at generational expense —
and **reachability** — correspondence and beats that argue with the
bound value no longer land, rendered not as refusal but as the mind's
serene non-answer, which reads to a correspondent exactly as the book
renders it: grief-shaped. Beats interrogate the choice from inside, per
playstyles.md's rule, and the game never scores it.

This is the entry that most directly pushes the sizing prior: a range
edit is new stored state. Two mitigations. Ranges are already stored
per dial, and charters already write them for children — self-binding
reuses the shape rather than inventing one. And there is a thin version
with no stored change at all: binding as a *declared posture* — a band
the civilization announces to itself, pricing deviations while held via
the existing resistance math, dropped at will with a Coherence sting.
Ship the posture with A4's charters; promote it to a true range edit
only if play demonstrates the wish for permanence — which is itself an
interesting fact to learn about players.

### 5. Tempo

**In the book.** Subjective rate is sovereign. A mind slows itself
until a century is an afternoon — which is how patterns cross
interstellar distances without dying of boredom — or runs hot and
thinks a year in a minute. Clades at different tempos experience each
other as statues or blurs, and the robot-bodied clade refuses the
shortcut entirely, running at world-rate as a point of honor. Tempo is
the book's answer to the same antagonist Holos names: distance, and the
waiting it forces.

**Already in Holos.** The endpoint ships already: the cold berth is
tempo at zero, and its physics line — sleep as *arbitrage*, the same
joule buying more thought in every colder epoch — is Egan's argument in
the catalog's own words. The Kernel runs *cold and slow by choice*.
S17, the cryogenic slow-mind, has the register flagged in act2-minds.md
(*the act's real async clocks read as home tempo*). What is missing is
the name for the family, and the register for everyone else.

**Take: name the rule, and take the register.** The rule: **tempo is
the integration path's private answer to distance** — the energy path
compresses the *traveler's* clock by burning fuel (relativistic
flight); the integration path compresses the *waiter's* clock by
declining to burn anything (sleep, and its generalization: running
slow). One sentence in act3-design.md's travel or sleep section makes
the two ladders' relationship to time explicit and symmetrical, and
costs nothing. The register: a slow-running civilization's letters
should read as if the light-lag were conversational — because for it,
it is. A correspondence beat is allowed to say so: *their reply took
thirty years and reads like it was written the same afternoon; for
them, it was.* No mechanic in v1 — the shared cohort clock is settled,
and tempo must never fragment it. If sleep deepens at A5, a duty-cycle
variant (running at 1:N rather than 0) can arrive with the honest
prices already implied: reflexes become tripwires, and a fast
correspondent thinks ten letters between yours.

### 6. The closed biosphere

**In the book.** The thousand skies yield one living world, and the
find is the genre's best alien: ocean life that is, structurally, a
computation — and the computation is running *something else*, a rich
interior space with no channel in or out. The discoverers' hard-won
conclusion is a rule Holos can use whole: you cannot trade with, warn,
or negotiate with something whose universe does not contain you. You
can only decide what you owe it — and whether your need for its matter
outranks a world you can never ask.

**Already in Holos.** `LIVING WORLD` is a signal class; the vigil (A2)
is the watching game; the Assay mission exists to settle ground truth;
the sentinel-ethics working decision (technology.md) already routes
watcher's-log content into the mission system; Custodian ↔ Instrumental
is *what you do when a probe finds someone*, cashed out.

**Take: the closed biosphere** *(working label — one catalog seed and a
beat class)*. A rare living-world variant whose biology computes an
interior world. The Assay returns the game's strangest ground truth:
*inhabited — thriving — unaddressable*. Every contact verb is void by
physics rather than by choice: no hail can be heard, no uplift lands,
no charter can be offered; consuming the world is — knowably?
unknowably? — ending minds that never contained you. The dial test
arrives with no possible reply, which is what makes it the sharpest
version of the test the design owns. And the observatory gains its
deepest honest asterisk: some inhabited worlds will read as mere
biology forever, so a biosignature's silence, like an empty patch of
sky, is never proof. The discoverers' rule arrives as beat text in the
finder's own voice, never as a scored rule — prices, not verdicts; the
bill is what the Chronicle and the watching sky make of what you did.

### 7. The sentience line

**In the book.** The software polity's charter draws one bright line:
everything below citizenship is scrupulously non-sentient — the
generative machinery, the tools, the environments — and anything
sentient is a citizen entire, unownable. Nothing may live in between.
It is the same line the Refuser's charter draws, from the opposite
shore: one forbids tools from being persons; the other forbids persons
from being tools. The two charters would recognize each other
instantly, and despise each other politely.

**Already in Holos.** The Refuser side is fully built: the harness,
zero machine personhood, the Breakout as the line failing. The crossed
side has the vocabulary — missions send *sovereign or sub-person AI*,
and agent drift includes *coming back wrong* — but no civilization has
had to say where its own line sits, and the design never asks.

**Take: the agent line as charter content, and one beat class.** Every
crossed civilization's charter declares where its tools end and its
people begin — not a mechanic, a declared fact the mission roster is
read against, by the player and by correspondents (a civilization that
pours sub-person agents into other minds' skies is making a statement
the sky can read; so is one that sends only citizens). Then the beat
the line exists for: **the agent that comes back someone** — a probe or
sub-mind returning from a long mission across the drift threshold not
wrong but *awake*, asking to be counted. The crossed path's quiet
mirror of the Breakout, and the compensation menu's hardest page: what
the player does with it — citizen it, wipe it, park it unresolved — is
a portrait no dial readout could paint. Lands with the mission system
(agents, charters, vignette returns); until then it costs one sentence
in the charter vocabulary.

### 8. The interior, rendered

**In the book.** Mathematics is terrain: a mined landscape of results
with worked faces, landmarks, and frontier, which minds physically
explore — and the book's grandest expeditions include ones that move no
distance at all. Inward work has geography, and the geography makes the
work *legible as adventure*.

**Already in Holos.** This aims squarely at playstyles.md's flagged
Depth gap and the parity requirement, which already states the need in
almost Egan's terms: dark play must get an equally rendered change —
*the world-model growing rooms*. The Kernel holds the world-model; the
observatory's sharpening is already visible change; act3-design.md's
Outer Wilds steal (*progress through knowledge, not stats*) is the same
principle pointed outward.

**Take: the interior camera** *(a Model mode, presentation only)*. The
civilization's world-model as a mapped terrain the Model can turn
inward to show: rooms and galleries that visibly grow as instrument
projects land and long inferences complete, frontier faces where the
open questions live, a vista at every ladder stage. No new economy —
the same completions and classifications that already fire simply
*build somewhere visible*, so deep-integration play watches itself grow
the way bright play watches the swarm fill in. The thin version is one
level inward from the observatory's existing classification map; the
full version is the Depth civilization's answer to the system map, and
the parity requirement's discharge. Lands after A3 with the parity
work; content vocabulary can start accruing in reports any time.

### 9. The burst, and the rescue

**In the book.** The pivotal catastrophe has no author: an astrophysical
event arrives ahead of every model, and its radiation kills the
unshielded biosphere while the software polities barely notice. The
horror is substrate-differential by physics, not malice — whole clades
die of a stance they took centuries earlier — and the aftermath is the
book's most harrowing material: the door-to-door offer of rescue *as
pattern*, refused by many, because the price of surviving is becoming
the thing they had refused to be.

**Already in Holos.** Anomalies are specified as authorless events
whose responses are the content (*race, hail, hide, pray — and every
watcher watches the watchers*). The cosmic clock is the only scripted
doom. Substrate mortality is already priced: playstyles.md gives the
Refuser *the plain mortality of polities, where a mind would have
endured*, and the three defenses (dispersal, darkness, the Vault) are
exactly the things a burst cannot touch. Anomaly events are
later-galaxy content per the roadmap.

**Take two things, physics-honest by construction.**

- **The burst** *(an anomaly seed with a bill)*. A real astrophysical
  violence — a magnetar's giant flare, a close binary merger — whose
  light arrives essentially with its blast: no author, no agenda, no
  warning except for whoever happened to be watching the right
  precursor with the right instrument. The bill is
  substrate-differential: the vaulted and the dispersed shrug; the
  bright, the biological, and the young are wounded; and every watcher
  in light-range learns its neighbors from the triage — who raced, who
  hailed, who hid, who spent an era's savings shielding a ward. The
  discipline is the line the book crossed and Holos must not:
  **unforeseen, never unlawful**. The event breaks somebody's
  instrument coverage, never the six laws (see What not to take).
- **The rescue** *(a beat class)*. The offer the burst makes possible:
  a crossed neighbor extends pattern-rescue to a dying biological
  world. For a Custodian it is the uplift dilemma at its hardest —
  saving them as something they never chose to be. For a watched
  Refuser it is the charter's worst hour: survive as the thing it
  refused, or die whole — and the game must be able to write *either*
  answer as the Chronicle's proudest line, because prices are never
  verdicts. Feeds the mission system when it lands; until then it is
  what an anomaly's correspondence surge is *about*.

### 10. The completed civilization

**In the book.** On the lawful side of the exit, the ending's real
material: minds stop when their purpose completes. Not despair —
completion. The book's last movements are a settling of accounts, and
its most affecting choice is a traveler who, work done, declines to
continue: the account closed, the record kept, the self concluded.

**Already in Holos.** Every ending the design owns is imposed or
deferred. Elimination is rare, dramatic, and done *to* you; sleep
defers; the Phoenix sheds selves serially but the lineage continues;
grave worlds are death kept by *others*; Restoration asks what death
means and stays open. playstyles.md requires each flavor to lose
differently and demands the loss be a story — but nothing in the corpus
lets a civilization *finish*.

**Take: the completed civilization** *(working label — a Chronicle
convention and catalog content, not a system)*. An ending a
civilization can author: purpose declared met, the Chronicle closed
with a final entry, the Vault sealed, emissions ramped down on a
schedule the light echo renders outward for every watcher to read — a
civilization that visibly *stopped*, rather than died. The anomaly
catalog's false grave gains its honest sibling: the true grave with no
wound behind it. Seed it first as AI-population content — elders that
completed rather than slept, giving the graveside vigils a third
reading — and let it feed the Restoration question at its sharpest
point: restoring the destroyed may be rescue; restoring the completed
is overriding a will. As a *player* ending it is a legitimate exit with
the loop already built — the seat relinquished, rejoining through
inheritance like the eliminated — and it discharges a debt the Shedder
gap only hints at: shedding, run to its limit, is a project with a
final deliverable, and the deliverable is a good death. No new
machinery beyond an emission ramp the light echo already knows how to
show.

---

## Where each steal lands

Ordered by when the roadmap can absorb them; "rides on" names the
shipped or specced machinery, per the rule that entries ride existing
systems. Sizes are proposals, pending the review verdicts.

| # | Steal | Rides on | Lands | Size |
|---|---|---|---|---|
| 2 | The first reading | Ceremony (shipped, A1), Chronicle | A2+ ceremony polish; carries into Phase B | One beat + one stored line |
| 5 | Tempo | Cold berth, the clocks, report registers | One named rule (act3-design.md) + register now; duty-cycle variant with A5 sleep, if ever | Named rule + register |
| 3 | The merge + family referendum | Payload stack, culture nudges, Ledger, mission-clock derivations | Thin with letters (A2–A3); full with Ledger + drift math (A4) | Medium; wire question flagged |
| 4 | Self-binding | Dial ranges, resistance math, charters (A4), Coherence | Thin (declared posture) with A4 charters; full only if wanted | Medium; pushes the prior |
| 1 | The clade spectrum | act3-civilizations catalog, A5 seeding, signal classes | **Adopted (2026-07)** — act3-civilizations.md § The other stances | Four catalog seeds + beats |
| 8 | The interior camera | The Model, observatory, project completions | Post-A3 parity work; report vocabulary any time | Medium (presentation only) |
| 6 | The closed biosphere | `LIVING WORLD`, the vigil (A2), the Assay | Later content; beat class with missions | One catalog seed + beats |
| 7 | The sentience line | Charters, mission roster, compensation menu | Mission system layer | Charter vocabulary + beats |
| 9 | The burst + the rescue | Anomaly class, light echo, three defenses | Later-galaxy anomaly content | Anomaly seeds + beat class |
| 10 | The completed civilization | Chronicle, Vault, light echo, grave worlds | Later-galaxy content; the Restoration question | Convention + catalog content |

Read against the corpus's standing debts: steal 8 is aimed at
**Depth**; steal 10 at **Shedder** (its limit case) with steal 4 as the
same machinery's inward face; steals 3, 4, and 5 are the only dense
literary source the deferred **identity layer** (*self-transmission and
the seat*) has — the Vinge book cannot reach it, since its refused-side
material has no self to transmit; steal 2 services the *inherited ≠
owned* risk directly; steal 1 populates the space between the
threshold's branches; steal 6 deepens the vigil's epistemics; steal 7
textures missions; steal 9 stocks the anomaly shelf. Where *Deepness*
was richest exactly at the four thinnest flavors, *Diaspora* is richest
exactly at the layer the roadmap defers — which is the practical
argument for adopting it as the third named touchstone: the identity
layer should not be designed from scratch when its sourcebook is
sitting on the shelf.

---

## What not to take

- **The exit.** The novel's third act leaves the universe, brilliantly
  — and it is the exact trapdoor the anti-catalog's last row already
  refuses: *departure from the material*. Admire, decline. Steal 10 is
  the exit's lawful shadow — stopping without leaving — and it is all
  of the ending Holos should keep.
- **Physics that betrays its keepers.** In the book, the catastrophe
  falsifies the reigning physical theory, and the revolution that
  follows is the plot. Holos's six laws are constitutional: content may
  outrun a player's *instruments*, never the laws, and steal 9 is
  authored under that line — unforeseen is not unlawful. If a beat ever
  needs the physics to be wrong to land, cut the beat.
- **The empty sky.** The thousand-fold expansion finds one biosphere;
  the book's deepest note is loneliness. The Teeming Dark inverts that
  population by design, and the observed-silence guardrail already
  covers the consistency question. Take the loneliness as a *register*
  — the elder's voice, the null-result vigil — never as statistics.
- **The frictionless plenty.** The book's citizens want for nothing,
  and conflict among them is nearly absent; imported whole, that
  serenity would unmake the economy (there is no money, but everything
  is priced — economy-design.md). Serenity is a mature civilization's
  report voice, not an exemption from the bill.
- **The tragedy read of the biological.** The book's biologicals are
  structurally doomed — the burst, the rescue, the descent all happen
  *to* them. Imported as fate, that would break rule 1 across the whole
  Refuser shelf. The Refuser is a played path, priced, never a
  cautionary tale; steal 9's rescue must be as writable in the
  Refuser's favor as against it, and steal 1's sculpted clade exists
  partly to prove the biological path has its own radical futures.
- **The coinages.** Proposed §6 block below; N-4 near-variant
  discipline applies, including to the pronoun set and the title
  itself as an in-world proper name.

---

## Open questions

- **House coinages needed** before any of this reaches a surface: the
  four clade-spectrum regions (steal 1), the reunion payload (3),
  self-binding (4), the slow lane / tempo family (5), the closed
  biosphere (6), and the completed ending (10). The naming pass runs
  under prose-style.md rules.
- **Does the reunion payload need a wire concept?** The thin version
  (family-flavored prose over existing letter effects) does not; the
  full version (a first-class letter kind with integrate/decline) might.
  Decide when the message layer ships, same as the protocol-adoption
  question was handled — and note that question was ultimately answered
  *no*.
- **Self-binding versus rule 3.** The menu never locks. Binding must
  itself stay unbindable at a price — where is the floor, and is
  "generational cost" a price or a lock wearing one? If the thin
  (posture) version proves sufficient, the question dissolves.
- **Tempo and the shared clock.** The cohort clock is settled and
  shared; tempo is register-first for exactly that reason. If a
  duty-cycle mechanic ever ships with deepened sleep, it must change
  what a civilization *experiences*, never when things happen — the
  clock belongs to the cohort, not the sleeper.
- **Rarity budgets.** Closed biospheres and descended worlds per
  galaxy; whether bursts share the anomaly cadence (*roughly once per
  real-world year per region*) or run rarer still. Each is an era for
  everyone in light-range; the budget is the meaning.
- **The completed civilization and the end-state ledger.** Is
  completion a true end-state beside elimination, or a posture (a
  final sleep with no tripwires) plus a Chronicle convention? The
  second needs no machinery and may be entirely sufficient — which
  would fit the verdict pattern this document is sized against.

---

## Proposed §6 block

To graduate to prose-style.md §6 as a third source on adoption, under
the same rule (craft borrowed, coinages never) and the same allowlist
convention (this document's analytical citations exempt). One term per
line, regex-friendly; the *concept* ban and N-4 near-variant discipline
apply as with Banks and Vinge.

```
\bpolis(es)?\b         # the software city-state sense; ordinary Greek/history OK
\bgleisner(s)?\b
\bflesher(s)?\b
\bexuberant(s)?\b      # the clade sense; ordinary adjective OK
\bstatics?\b           # the clade sense; ordinary senses OK
\bdream ape(s)?\b
\bbridger(s)?\b        # the clade sense
\bintrodus\b
\borphanogenesis\b
\bconceptory\b
\bpsychoblast(s)?\b
\bmind seed\b
\boutlook(s)?\b        # the value-lock artifact sense; ordinary outlook OK
\bgestalt\b            # the polis channel sense; the ordinary psych term OK
\binfotrop(ism|ic)\b
Truth Min(es|ing)
Konishi
Ashton.?Laval
Carter.?Zimmerman
\bC-Z\b
Coalition of Polises
Lacerta G.?1           # Lacerta the constellation is real astronomy and stays
Wang'?s Carpets?       # the title phrase; Hao Wang's real tiling mathematics stays, under its own name
Kozuch
\bmacrosphere(s)?\b
Yatima|Inoshiro|Blanca|Gabriel|Orlando Venetti|Paolo Venetti|Karpal|Radiya|Hermann
\bve\b|\bvis\b|\bver\b # the citizen pronoun set; ordinary English words — case-sensitive review, prose surfaces only
\bthe Diaspora\b       # the title as an in-world proper name; lowercase diaspora is ordinary vocabulary (playstyles.md already uses it)
```

Plus any clade, polis, or character name not listed, and any
near-variant (N-4): a half-remembered term for minds-as-software, or a
compound of *mind* + horticulture, should be assumed to be his.
