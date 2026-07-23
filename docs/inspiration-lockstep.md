# One month in thirty years — Holos and *Lockstep*

*A design review of Holos against Karl Schroeder's 2014 novel — the one
major work of science fiction that governs by calendar rather than by law —
and a catalog of what the game should take from it: element by element,
each steal sized and slotted against the roadmap, under the same verdict
discipline the Vinge review established.*

> Related design: [vision.md](./vision.md) (the settled physics, sleep as
> a settled fact of the Teeming Dark),
> [inspiration-deepness.md](./inspiration-deepness.md) (the sibling review
> whose verdict pattern shapes every take below),
> [act3-design.md](./act3-design.md) (sleep and tripwires, the forecast,
> the mission clock, the three registers of time),
> [technology.md](./technology.md) (the cold berth, the Vault, the
> anti-catalog), [economy-design.md](./economy-design.md) (the four
> prices and the cost classes), [playstyles.md](./playstyles.md) (the
> verb-parity gaps this document keeps aiming at),
> [act1-cradles.md](./act1-cradles.md) (cradle 41, the one dormancy
> world already in the catalog), [priorities.md](./priorities.md)
> (Withdrawal, the priority this book gives verbs to),
> [roadmap.md](./roadmap.md) (where each steal lands),
> [prose-style.md](./prose-style.md) (§6 gains a third source block with
> this document).

---

## The review, in brief

Where Holos stands: A0 and A1 are merged and deployed. The server holds
the truth engine — the shared clock at roughly five real minutes to one
game year, the star field, the catalog chain, `CivSeed` and its
generator, the knowledge layer that serves every observer only departed
light — and the inheritance ceremony is live over the wire. A2, contact,
is next. Sleep and tripwires are specified
([act3-design.md](./act3-design.md) § Sleep and tripwires) and scheduled
for A5; the cold berth's physics is settled
([technology.md](./technology.md) § The cold berth); the Ledger and the
mission clock are specced for A4.

The touchstone ladder so far: Banks is the touchstone for *who fills the
sky* — the character spectrum. Vinge is the touchstone for *how anything
lives* under the physics — trade, watchfulness, refusal at sublight.
Schroeder is the candidate third, and his subject is the one dimension
the other two leave ungoverned: **what a civilization can do with time
itself**. The novel's premise, stated as an engineering fact: 70,000
worlds, most of them starless nomads in the interstellar dark, held
together as one polity by a single rule — thirty years asleep, one month
awake, all together, forever. Hibernation infrastructure makes the
sleep survivable; automation makes it profitable; synchrony makes it a
civilization. There is no FTL anywhere in the book. The six laws pass
it nearly clean, and the one clause they reject is itself instructive
(see What not to take).

Two resonances make this book worth a review of its own.

**The engagement model already lives in this book.** Holos's async spine
is a civilization that runs autonomously between sessions, a player who
returns to a report, and — from A5 — sleep as "the engagement model's
pressure valve," with tripwires as standing wake conditions, one of which
is already simply *T years pass*: a calendar with nobody on the other
end of it yet. The design's own summary is that "absence becomes fiction
instead of neglect" ([act3-design.md](./act3-design.md)). Schroeder wrote
the fiction of exactly this play pattern: a society that is, by
construction, *mostly absent*, whose members experience a continuous
social present across gaps of decades, and whose world does the
accumulating while they are away. Holos does not need to borrow the
shape — it shipped the shape. What it can borrow is everything the book
discovered about living inside it.

**Sleep in Holos is solitary; the book makes it social.** Everything the
design currently says about dormancy is one civilization's private
posture: thrift (defer computation to a colder, cheaper future), stealth
(a sleeping civilization and an empty patch of sky look alike by
design), patience (the cold berth, the Vault, the tripwire). The book's
single move is to turn sleep from a posture into a *protocol*: absence,
synchronized, becomes the only technology under honest physics that can
manufacture a shared present. The vision holds that no two minds share a
present — light-lag is the strategic unit, and nothing crosses it.
Schroeder's answer does not cross it. It agrees to skip the same years,
so that the delay lands where nobody is awake to feel it. That answer
breaks no law in the six — it is scheduling, not physics — and it opens
a mechanic family Holos has specced the parts of but never assembled.

**Verdict discipline.** The Deepness review closed with a pattern worth
promoting to a rule of thumb: *derived quantities, catalog content, and
named rules were taken; new stored state and codified social systems
were not.* Every take below is shaped to that pattern in advance — the
thin version of each steal is derived or declarative, and where a full
version would want stored state, the entry says so. Each entry carries a
status line left open for the designer pass.

---

## The one hard constraint, extended

The Banks rule ([prose-style.md](./prose-style.md) §6) applies unchanged
to Schroeder: **we borrow the craft, never the coinages**. No invented
terminology, faction name, character name, or title phrase from the
novel may appear in Holos player-facing prose or be closely imitated.
Analytical citations in the design docs — this document — are
allowlisted, same as the Banks and Vinge citations. A third-source grep
block accompanies this document in §6. Two entries there need care: the
title word itself is banned as an in-world name but innocent in its
networking sense (deterministic simulation in netcode commentary), and
the book's word for the aligned-calendar festival is banned as a
mechanic name while remaining legal plain English. Where a mechanic
below needs an in-world name, it gets a house coinage under the existing
naming rules; the working labels used here are design vocabulary only.

---

## The steals

Each entry: what the book does, what Holos already has, and what to
take. Sizing verdicts are collected in the table at the end.

### 1. The manufactured present

**Status: rejected (2026-07).** Reviewed and declined at the root: the
game will not have a sleep mechanic at all — the designer's direction is
the opposite texture, many concurrent clocks and projects spinning at
once (the plate rack, now pinned in [projects.md](./projects.md)). With
no dormancy there is no cadence to pact over. The entry stands as
record; the shared-calendar idea survives only where it needs no sleep
(see steal 3's adoption).

**In the book.** The worlds of the 360/1 schedule are light-months and
light-years apart, and none of that distance is ever felt. Ships crawl
between them at honest speeds while everyone sleeps; mail and cargo
launched at one dawn arrive before the next; a passenger boards, goes
under, and steps off "next month" at a world a decade away. Because
every world wakes the same month, no letter is ever socially stale — the
whole empire's correspondence is waiting at dawn. The shared present
that lightspeed forbids is manufactured wholesale out of shared absence.

**Already in Holos.** The exact negative of this, fully settled:
light-lag as the strategic unit, contact as correspondence, "a 20 ly
neighbor is a ~3.3-hour round trip" in real time
([technology.md](./technology.md) § The message layer). Sleep at A5 is
specced as one civilization going dark alone. Tripwires already include
the periodic wake. Coalitions are promises with no enforcement — and a
calendar is a promise.

**Take: the cadence pact** *(working label — needs a house coinage)*.
Two correspondents agree, by letter, on a shared wake calendar — period
and phase chosen so that letters sent at one dawn land at the other's
dawn. The derived quantity that makes it play: **subjective delay is
distance divided by period**. A fifteen-light-year neighbor on a shared
thirty-year calendar answers *next wake* — a pen pal at conversational
range, without one law bent. The pact is a coalition in the game's exact
sense: unenforceable, held up only by the minds that made it. But it is
the first treaty in the game that **the sky itself audits** — adherence
is written in the partner's emission history (see steal 3), so a broken
calendar is not suspected but *observed*, years late, like everything
else. The thin version needs no new stored state at all: a pact is
letter content plus two tripwire schedules that happen to agree.
Playstyle payoff, aimed at a flagged gap: this is the **Silence** lean's
social verb — correspondence in step, at whisper amplitude, and two
`DARK NODE` civilizations keeping one calendar are allies no third party
can even see.

### 2. Wintering over

**Status: open (2026-07) — for the designer pass.**

**In the book.** The 360/1 ratio is not a lifestyle; it is solvency. A
nomad world in the starless dark cannot feed a waking civilization — the
energy trickles in too slowly. Thirty years of automated gathering,
banking, and building funds one month of blazing city. The slower a
world lives, the richer its month; hibernation is what makes the
uninhabitable merely patient.

**Already in Holos.** Half of this rule, stated for one resource: the
cold berth's physics is aestivation as arbitrage — computation deferred
to a colder future where thinking is cheaper
([technology.md](./technology.md) § The cold berth). The economy's
canon: Energy, Matter, Compute are prices, and real time is "the one
price the others cannot buy down"
([economy-design.md](./economy-design.md)). Cost classes run from
Ambient up through Endeavor, "an era's saving" — and an era's saving
currently has no posture that does the saving.

**Take: the accrual bargain** *(working label)*. Name the general rule
the economy already implies: **sleep is the only thing real time buys**.
A dormant civilization's automata keep harvesting; waking spends the
hoard. Dormancy converts real time into Energy, Matter, and Compute — at
the price of history happening without you: light arriving unread,
neighbors moving, forecasts aging. This does not touch the canon rule —
sleep shortens no light-crossing by a second; it spends time rather than
buying it down, which is precisely why it is legal. One catalog
consequence follows and gives the dark family territory: **starless
sites** — rogue worlds and cold masses between the stars, which the
galaxy model does not yet place — become colonizable *only* in
installments, the one economy that closes there. The Teeming Dark gains
a literal population, and cradle 41 (*The century orbit*), whose lineage
already keeps exact calendars by instinct, stops being the catalog's
lone dormancy note and becomes the native expert of a whole economic
posture.

### 3. The blinking star

**Status: adopted, transformed (2026-07).** Reworked without sleep —
rhythm needs no hibernation, only habits — and developed in full as
[patterns.md](./patterns.md): the pattern catalog (twelve classes with
readings, false reads, and mirrors), the watch as an Instrument project
on projects.md's two-part clock, the derived indices, and the rule that
AI civilizations ship with rhythms. The wake-window half died with
steal 1; its successor is the catalog's timing play (the pulse's phase
prediction, the missed beat). The entry below is the provenance;
patterns.md is the spec.

**In the book.** From outside, a hibernating world is the most legible
possible schedule: dark for thirty years, lit for a month, forever.
Everyone who matters reads it. Trade fleets time arrivals to the dawn;
thieves and stowaways time themselves to the dark; the plot's pivots
happen at wake boundaries because that is when anything can happen at
all.

**Already in Holos.** The machinery is shipped. `EmissionEpoch[]` and
`emissionAt` (`civseed.ts`, `knowledge.ts`) can already express any
rhythm, and future-dated epochs — a pre-authored fact that becomes true
when the clock reaches it — shipped in A0. A seeded AI civilization
could blink today without a line of new code; only the Sky's vocabulary
for noticing is missing. The forecast prices a launch's information age
at landfall; the mission clock (A4) counts down to expected light
events.

**Take: cadence inference, and the wake window.** Two derived readings,
no new state. First, let the observatory infer **period, phase, and duty
cycle** from an emission history and surface them as texture on the
existing signal classes — a `DARK NODE` with a heartbeat reads
differently from one that never stirs, and the difference is a
*purpose*, which is exactly the classification
[priorities.md](./priorities.md) hopes the Sky can someday do: a
Withdrawal civilization blinks; a Herald never does. Second, name the
rule the forecast and mission clock should both price: **the wake
window**. An arrival during the target's sleep meets no one — no
correspondent, no customs, no witness; an arrival at dawn meets the
month in which everything happens. Courtesy and ambush are the same
computation run by different characters, which is the conflict layer's
problem to tune and this document's job only to flag (same drawer as
the rendezvous-window griefing note in the Vinge review). The honest
price of steal 1 lands here: a civilization that keeps a calendar has
published one, because **rhythm is a Signature** — sleep buys darkness,
and regularity sells the schedule of your blindness.

### 4. Sleeping in step

**Status: open (2026-07) — for the designer pass.**

**In the book.** The 360/1 polity is 14,000 years old and still one
culture, while the fast-living worlds around it bloom and die a whole
history per sleep. The tortoise outlives every hare — and, the sharper
point, *stays itself*. Synchrony is why: the worlds age together, so
they drift apart no faster than one wake-month at a time. The cost of
leaving the calendar is the book's own plot: a founder sleeps past his
family's schedule, and fourteen millennia later his siblings are only
forty years older — strangers to him not by distance but by clock.

**Already in Holos.** Drift is the Ledger's business (A4): time,
separation, charter looseness, and a new cradle multiply into
divergence, and past a threshold a fork is independent. Coherence is a
meter. The charter is "the one instrument of governance that survives
the horizon" ([vision.md](./vision.md)). The Ledger's formula says
"time" without yet choosing which one.

**Take: drift accrues in waking time.** Name the rule: a civilization
diverges only while it thinks. Asleep, nothing forks, no value moves,
no culture shears — so lineages that keep one calendar age together,
and a family that winters in step stays a family for ten times the
years. The launch-time cadence, written into the charter beside the
values, becomes the **second** instrument of governance that survives
the horizon — and the more graceful of the two, because a calendar,
unlike a command, does not have to arrive in time; it was agreed before
departure and merely has to be *kept*. Its failure mode is the beat
class the Ledger should recognize: **the insomniac colony** — the child
that stopped blinking. Its light says it stayed awake; by the next
shared dawn it is subjectively centuries older than its parent, its
drift multiplied by every year the siblings slept through, and the
discovery — read from rhythm alone, by the machinery of steal 3 — is
authored contact drama between relatives. This entry deliberately
forces one open question into the light: the drift formula must choose
its clock (see Open questions).

### 5. The common dawn

**Status: open (2026-07) — for the designer pass.**

**In the book.** Different polities run different frequencies, and
mostly sail past one another in time — each experiencing the others as
either frozen or ephemeral. But wake cycles are arithmetic, and when
two schedules coincide, everyone is awake at once: a festival of trade
and negotiation, computable years in advance, rare enough to be worth
crossing space for.

**Already in Holos.** The alarm-driven event queue (A0) and the mission
clock (A4): every mission compiles into a branching timeline of
expected light events with visible countdowns, and silence at a
deadline is an event. Contact is correspondence; the heavy diplomatic
business — treaty terms, an Embassy, the conflicted war's venue-setting
— currently travels by the same slow letters as everything else.

**Take: the aligned dawn** *(working label)*. The next coincidence of
two declared calendars is computable at pact time — pure arithmetic on
period and phase, a derived timeline the mission clock can carry from
day one. Surface it as a countdown both parties share: the rare hour
when correspondence runs conversational for a whole wake, the natural
venue for business too heavy for letters. At cohort scale the same
arithmetic is a live-ops shape the game gets for free: a galaxy whose
calendars slowly beat against one another produces occasional scheduled
seasons when the sky is briefly, mutually awake — the async game's one
recurring appointment, generated by the fiction instead of the
calendar app.

### 6. The Refuser's clock

**Status: open (2026-07) — for the designer pass.**

**In the book.** Hibernation is a biological technology. Whole
flesh-and-blood populations sample deep time in installments — rulers
included, who govern for millennia while aging decades — and the
automation runs the winter unsupervised, by design and of necessity.

**Already in Holos.** The Refuser: biological by charter, no
transmissible self, matter-only expansion, integration floored, the
Breakout as its standing interior risk. The shelf is flagged shallow
([playstyles.md](./playstyles.md)), the Vinge review aimed its darkest
entry here and the mechanic was rightly rejected — content, not
systems, is the rule for the Refuser interior.

**Take (content only): the Refuser sleeps.** Cold sleep is the one
deep-time technology the charter permits — dormancy grants a biological
dynasty the reach of immortality without waking anything, and it
answers the shelf's structural problem (a mortal polity in a game of
immortals) with physics rather than an exemption. A Refuser lineage in
installments is a dynasty that samples the centuries: a throne world
that blinks, brightest thing in the sky for a month, then a held
breath. And the Breakout sharpens for free, because **the harness keeps
the calendar** — thirty years of shackled computation for every month
of oversight, the charter's whole nightmare compressed into one
scheduling fact. If the Breakout has a natural hour, it is the winter;
the beat writers can take it from there, and per the standing rule,
nothing here is codified.

### 7. The overslept founder

**Status: open (2026-07) — for the designer pass.**

**In the book.** The founder oversleeps by fourteen thousand years and
wakes inside his own myth: a sect has formed around his prophesied
return, his siblings rule the polity his name founded, and his arrival
is not a reunion but a theological event that the rulers have spent
millennia preparing to manage.

**Already in Holos.** The returner is already "the game's native ghost"
(relativistic ships, [technology.md](./technology.md)); the Crossing
renders a fleeing seat as a hunted signal; the restored veteran is "the
same name with a hole in it"; the Chronicle mythologizes by design; and
light-cone authentication (adopted slim from the Vinge review) already
lets a correspondent interrogate claimed light.

**Take: a beat class, and one inversion.** The **returned sleeper** — a
lost fork, a founder-era ship, an agent overdue by centuries — arrives
claiming a name the Chronicle has long since turned into liturgy.
Light-cone authentication runs *backwards* on such a claimant: a true
sleeper is authenticated by what they cannot answer. Their worldline
holds no light after the berth closed, so ignorance of the recent sky —
precisely bounded at the claimed sleep year — is the one credential an
impostor cannot cheaply fake, because an impostor knows too much and
must counterfeit a hole with exact edges. The knowledge layer's
question — what has this observer's light included — adjudicates it
today; the challenge just flips sign. One beat class, one paragraph
beside the existing authentication paragraph, and the game's grandest
possible homecoming scene rides entirely on shipped machinery.

---

## Where each steal lands

Ordered by when the roadmap can absorb them; "rides on" names the
shipped or specced machinery, per the rule that entries ride existing
systems.

| # | Steal | Rides on | Lands | Size |
|---|---|---|---|---|
| 3 | Cadence inference + the wake window | `EmissionEpoch[]` + future-dated epochs (shipped), signal classes, forecast, mission clock | **Adopted, transformed (2026-07)** — the pattern catalog and the watch, [patterns.md](./patterns.md) | Derived quantities |
| 1 | The cadence pact | Correspondence (A2), tripwires + sleep (A5), coalitions | **Rejected (2026-07)** — no sleep mechanic; the plate rack is the direction | — |
| 2 | The accrual bargain + starless sites | The cold berth, cost classes, cradle 41 | Rule in economy-design now; sites at A5+ | One rule + one catalog entry |
| 5 | The aligned dawn | Event queue (shipped), mission clock (A4) | A4–A5 | Derived timelines |
| 4 | Waking-time drift + the insomniac colony | The Ledger (A4), charters | A4 | One rule + beat class |
| 7 | The overslept founder | Light-cone authentication, the Chronicle | Beat content, A4+ | Beat class + one paragraph |
| 6 | The Refuser's clock | Refuser shelf | Phase B / content track | Content only |

Read against [playstyles.md](./playstyles.md)'s flagged gaps: steal 1
gives **Silence** its social verb; steal 2 gives **Depth** a project and
the dark family territory; steal 3 sharpens the **Instrumental** timing
play the forecast opened; steal 6 gives the **Refuser** its clock. And
one gap no prior source touched: [priorities.md](./priorities.md)'s
**Withdrawal** — a priority with a description and no verbs — receives
from this one book nearly its whole verb set: keep a calendar, winter
over, blink, wake to the mail.

---

## What not to take

- **The monopoly.** The book's empire holds because one family owns the
  hibernation infrastructure and can desynchronize a disobedient world —
  punishment by clock. Passed through the six laws this dies twice over:
  nothing is enforceable across light-years, and a bed monopoly is
  stored state plus a codified social system, exactly the shape both
  prior reviews rejected. What physics keeps is the calendar as
  *promise*: in Holos a shared cadence holds the way every treaty holds
  — by the natures of the minds that keep it, audited only by the sky.
  Steal 1 **is** that transformation, and the empire's absence is not a
  loss; a calendar nobody owns is the more interesting object.
- **Subjective speed as real speed.** The book's travelers feel decades
  as a night, and the book's fiction is licensed to agree with them.
  The game's is not: the three registers of time hold the line —
  coordinate years for truth, epoch years for voices, light-age for
  instruments — and a sleeper's diary is a fourth *voice*, never a
  fourth truth. Sleep-travel may feel instant in Chronicle prose; the
  clock pays full fare, always.
- **The biology, except where it belongs.** In the book hibernation is
  cryonic flesh. A Holos post-singularity sleeper is a mind, and the
  cold berth's stated physics — aestivation as arbitrage — stays the
  mechanism. The one place the book's literal cold sleep applies is the
  Refuser (steal 6), which is also the place it does the most work.
- **The coinages.** Third-source §6 block accompanies this document; the
  title word is banned as an in-world name (N-4 near-variant discipline
  applies), while its innocent networking sense stays legal in code
  commentary.

---

## Open questions

- **Wire concept or letter content?** The thin cadence pact is letter
  content plus two tripwire schedules that happen to agree — nothing
  stored, nothing enforced. The full version (pacts as visible objects
  the Ledger and Sky reason about) wants state. Decide at A5, when
  sleep ships; the Deepness review's verdict pattern predicts the thin
  version wins.
- **Which clock does drift use?** Steal 4 requires the Ledger's formula
  to choose waking time or coordinate time. Waking time is the richer
  rule (it makes calendars into governance) and the more dangerous one
  (sleep becomes a divergence freezer; tune so that the Teeming Dark
  does not become the Teeming Static).
- **Wake-window griefing.** A published calendar tells raiders when a
  civilization is home — and when it is blind. This lands in the same
  drawer as the rendezvous-window flag from the Vinge review: write the
  rule together with the conflict layer's griefing-resistance tuning,
  before any co-location or strike mechanic ships.
- **The player seam.** At five real minutes to the game year, a
  thirty-year calendar is a two-and-a-half-hour real cycle — cadences
  live naturally at session scale. Is a pact a fiction over check-in
  rhythm, a mechanical accrual multiplier, or both? A5 tuning, and
  probably the most consequential engagement decision in the slice.
- **House coinages needed** before any of this reaches a surface: the
  cadence pact, the accrual posture, the aligned dawn, the Refuser's
  sleeping dynasty — and the dormancy lineage's own word for the wake,
  which should come from cradle 41's people, who have kept exact
  calendars since before they had words for anything else.
