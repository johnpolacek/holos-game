# HOLOS — Physics audit: where authored drama overrides the real universe

*2026-08. Instigated by a playtest observation: READ ITS LINES advertises
"the light is already in hand" and "the answer comes quickly," then dates
its answer eight years out. The owner's ruling, which this audit takes as
its standard: **favor physics always, over gameplay considerations.** That
is not a new pillar — it is vision.md pillar 1 ("Grounded in the real
universe... The constraints are real, and the game is what you build
inside them") applied without exceptions. This document is a full sweep of
the systems layer against that standard: what already honors it, what
violates it, and what each fix touches.*

---

## 1. The measuring stick

What real physics actually makes slow, expensive, or impossible for a
freshly post-singularity civilization — and, just as important, what it
makes free:

- **Light-time is sovereign.** Nothing about a source can be known sooner
  than its light arrives. This is the one delay that can never be bought
  down, and the game's antagonist by design (vision.md pillar 3).
- **The photon budget is real.** Information about a source is carried by
  the photons collected from it. Received flux falls as 1/d²; what a fixed
  aperture learns per year falls with it. Faint and far means slow or
  impossible; collecting area and baseline buy it back. This is the honest
  currency behind "confidence."
- **Time-domain measurements need the sky to change.** An orbit gives up a
  mass only across its arc; a cooling curve is only as honest as its span;
  a transit schedule proves itself only across crossings. But a
  civilization that has been recording everything continuously *already
  holds the baseline*. The honest wait is the **shortfall**: how much more
  record is needed beyond what the archive already spans — usually zero,
  occasionally "wait for the next crossing," never a flat constant.
- **Computation is fast and, at these scales, nearly free.** Analysis of
  data in hand has no physically meaningful latency for a mind running
  planetary-scale hardware: cross-matching spectra against catalogs is
  microseconds; even deep model-space inference (atmosphere retrievals,
  orbit solutions over centuries of astrometry) parallelizes to hours, not
  years. Energy cost sits far above the Landauer floor but far below
  anything a K0.7+ civilization notices. A freshly ascended mind may be
  compute-*poor* — its stock and rate are genuinely bounded — so a price
  in compute can bind. **The rule that falls out: compute may price a
  question; it may never date one.** Latency comes from light-time,
  photon starvation, or baseline shortfall — nothing else.
- **The rocket equation is merciless.** Carried fuel caps Δv at a few
  times exhaust velocity; even ideal fusion exhaust (~0.05–0.08c) makes
  0.5c-and-stop a mass-ratio absurdity. Beamed power escapes the equation
  on departure — and nothing escapes it on arrival. **Deceleration is the
  forgotten half of every voyage**, and it is as visible as the launch:
  a torch braking into a system points its flare at the neighborhood it
  is arriving in.
- **Thermodynamics bounds concealment.** Work radiates. Hiding means
  redirecting waste heat, banking it temporarily, or genuinely not
  computing — all bounded, none free — and some channels (neutrinos)
  cannot be shaped at all.

## 2. What the game already gets right — the spine to protect

The audit found the knowledge and mission layers largely honest, and
several touches better than genre standard. None of this should move:

- **Light at exactly 1 ly per game year**, stated once
  (`clock.ts:54-56`, `lightDelayYears` is the identity) and honored
  everywhere: `peekTruth` returns `null` outside the cone rather than
  approximating (`knowledge.ts:116-119`), `lightHistory` is clipped
  strictly at the departure year, and there is no channel — telescope,
  answer, or report — that outruns it.
- **The archive is continuous and free** (`knowledge.ts`, systems-a.md
  §F2): photons arrive whether or not anyone attends, observation is
  stateless and total, collection costs nothing. This is exactly the
  right model for an advanced civ and it is the premise the question
  layer should be held to.
- **Mission reports are "not fresher, only sharper"**
  (`missions.ts:15-17`): a report emitted at the target in year E arrives
  home at E+d, the same year the telescope shows. The probe clock trio —
  amendment horizon L+(f−1)d, arrival L+f·d, first word L+(f+1)d — is
  correct arithmetic, and the observation that a fast ship is a nearly
  ungovernable one (`voyages.ts:126-128`) is real physics played
  straight.
- **The star field is the real neighborhood**: 0.004 stars/ly³
  (`galaxy.ts:64`, the actual local density) and an M76/K12/G8/F4
  spectral mix.
- **The instrument catalog is real instruments**: the solar gravitational
  lens at 550+ AU (`focal-line-observatory`, `focal-line-constellation`),
  pulsar timing arrays, long-baseline interferometry ("Resolution was
  never about the mirror, only about how far apart you are willing to
  stand" — correct), and the cold-logic annex's Landauer framing
  ("thinking costs less the colder it is done... near the floor of what
  the universe permits").
- **The neutrino watch as the unmaskable channel** (`projects.ts:237`):
  "heat can be shaped and delayed and diluted, and none of that touches a
  neutrino." That is the thermodynamics of concealment done right, with
  the counter-instrument priced.
- **Beamed signals degrade by inverse square** (`traffic.ts:397-401`,
  `receivedFraction = ref/(ref + d²)`), and AI reply latency is framed as
  deliberation and temperament, never as signal speed.
- **No FTL anywhere.** The sweep found no channel — state, knowledge,
  economy, or UI — that moves information faster than the cone.

## 3. Violations, ranked

### P0-1 · Question latency is authored drama, not physics

**The finding.** Every bought question carries a flat
`integrationYears` from the catalog (`questions.ts:139-194`):

| question | measures | costCompute | integrationYears | honest latency |
|---|---|---:|---:|---|
| READ ITS LINES | spectroscopy of archived light | 225 | 8 | **0** |
| CATCH ITS EDGES | polarization of archived light | 270 | 6 | **0** |
| LISTEN OFF-AXIS | sidelobe dig in the archive | 165 | 10 | **0** |
| WEIGH IT | astrometric arc | 180 | 12 | archive shortfall, usually 0 |
| TIME ITS SHADOWS | transit schedule | 120 | 18 | archive shortfall, usually 0 |
| TAKE ITS TEMPERATURE | cooling curve span | 135 | 24 | archive shortfall, usually 0 |

The game's own fiction already convicts these numbers. The method prose
(`client/src/questionmethod.ts:34-47`) says of the lines: "Nothing here
waits on new light, so the answer comes quickly"; of the edges: "Almost
none of this waits on the sky... quick to finish"; and questions.ts's own
header opens "PHYSICS FIRST. Photons already at home are a free archive."
The archive model (§2) means the baseline-bound questions are *also*
mostly instant: at purchase time the record already spans centuries to
millennia (seeded emission histories reach back 3,000–9,000 years), so
the orbital arc, the cooling span, and the crossings are already in hand.
The plateau gates already handle the genuinely short record honestly —
`temperature-over-time` refuses with "the record needs a second arrival"
(`questions.ts:404-406`), which is the *correct* physics answer: not a
countdown, a statement of what the archive lacks.

**The fix.** Replace the flat constant with a derived shortfall:
`answersInYears = max(0, baselineNeededYears − archiveSpanYears)`, where
archive-bound questions (lines, edges, off-axis) have
`baselineNeededYears = 0` and the three time-domain questions carry a
baseline need that the (almost always sufficient) archive is measured
against. Answers with zero shortfall land the year they are bought; the
freeze-at-purchase rule, the wire shape, and `answersYearFor` as the
single source all survive unchanged — the number feeding them changes.
The compute **cost stays**: a freshly ascended mind is genuinely
compute-bounded (`drawStocks`: compute = 120·(1+E+I)), and deep
model-space inference is the one thing it can honestly be short of. Price
the question; never date it.

**Knock-ons, enumerated:**

- *Haste projects lose their stat.* `long-baseline-optical` (30% sooner),
  `occultation-network` (50% sooner), and `sky-vault` (20% sooner on all
  six) currently buy down a number that mostly ceases to exist. The
  physically honest retarget: a finer instrument needs **less baseline**
  (a sharper astrometric solution resolves a mass from a smaller fraction
  of the orbit's swing; a denser occultation net needs fewer crossings) —
  so haste becomes a reduction of `baselineNeededYears`, which only bites
  when the archive is genuinely short, plus a confidence or discount
  component so the project is never a dead purchase. `sky-vault`'s own
  line already argues the honest version: "a question put to a thousand
  years of record is half answered before it is bought" — make that
  literal: the Vault extends usable `archiveSpanYears`.
- *The cost/clock inverse dies.* "Patience cheap, haste dear"
  (systems-a.md §2.2) was the pricing logic; with latency gone, cost
  should re-anchor on inference depth alone (lines and edges deep and
  dear; shadows and temperature shallow and cheap — which the current
  costs already roughly encode).
- *Contest arithmetic survives.* Windows are `(T_prev, T_now]` in target
  years with endpoints `answersYear − distanceLy`; with instant answers
  the window between looks becomes player-paced rather than
  catalog-padded, which is exactly the pacing note contest.ts already
  states (rungs accrue while a study *sits*, not while a question runs).
  First-look-never-regresses is unchanged.
- *UI.* The `ANSWERS IN N Y · ≈M M` row reads `ANSWERS NOW` (or is
  omitted) at zero shortfall; the work-list `answering` state becomes
  rare and honest (a real wait for a real crossing). The clock-pair
  convention stays for the cases that keep a date.
- *Prose.* questionmethod.ts is already right and needs at most touch-ups
  where it currently apologizes for the wait ("the clock waits on the
  crossings" stays true — but only fires when crossings are actually
  outstanding). `audit:facts` couplings on the haste effectLines
  (`projects.ts:190,201,263`) must be retuned with the effects.

**What this does to the game, honestly.** The observatory loses its egg
timer. What remains slow is everything that is *really* slow: light-cone
staleness, probes (first word at L+11d), voyages, sentinel cadence, beam
round trips, mask cadences. The "which question, on which study" decision
survives on cost alone. This is pillar 3 working as designed — the
authored latency was a second, fake antagonist competing with distance,
and distance wins the job back.

### P0-2 · The seedship's chemistry sentence

`voyages.ts:170`: "Everything a founding needs, **moving slowly enough
that chemistry can pay for it.**" The seedship cruises at 0.1c
(`SEEDSHIP_FLIGHT_YEARS_PER_LY = 10`). Chemical exhaust is ~4.5 km/s;
0.1c is 30,000 km/s. No mass ratio makes chemistry pay for that — this is
the one sentence in the shipped prose that states a physical
impossibility as fact. Keep the speed (0.1c is the technology.md canon
for seedships and is honest for fusion or beam-assisted launch); fix the
sentence. One line, plus its `audit:facts` exemption note
(`audit-facts.mjs:198-200`) if the replacement stops naming a span.

### P1-3 · The torch's fuel, and every voyage's missing deceleration

Two problems in one hull (`voyages.ts:183`, torch: 0.5c, "bought with
fuel carried aboard").

- *The mass ratio.* At ideal fusion exhaust (~0.07c), 0.5c out **plus
  0.5c stopped at the far end** needs a mass ratio around e^(1.0/0.07) —
  about 10⁶. Options, in order of least disturbance: reframe the fuel
  (antimatter-catalyzed, which buys the exhaust velocity and keeps the
  "burned where anyone can see it" flare); make the departure beam-boosted
  with carried fuel for braking only (the 8-year departure flare at level
  0.45 already reads as a boost phase); or lower the cruise to 0.2–0.25c.
  The first preserves every shipped number.
- *The arrival flare.* A torch braking into a system radiates its drive
  flare **at** the destination neighborhood for years — the loudest
  announcement possible, currently absent. The sail is worse: 0.8c with
  no decelerator at the far end has no story at all (magsail/drag braking
  takes decades and is itself observable). Add an arrival-side emission
  epoch to torch and sail voyages, sized like the departure epoch. This
  is not just honesty — it is *gameplay from physics*: an incoming
  colony ship should be watchable by everyone in range, which is the
  dark-forest tension the design wants for free.

### P1-4 · Confidence falls off linearly; light falls off by the square

`confidenceFor` (`knowledge.ts:308-311`) charges a flat 0.01 per
light-year — and its own comment already confesses ("Placeholder shape
for A1"). Meanwhile traffic.ts degrades beams by `ref/(ref + d²)` —
the codebase disagrees with itself about how light dims. Received flux
goes as level/d²; confidence (which stands in for SNR) should be a
function of that flux against an aperture term, clamped to the existing
[0.2, 0.95] band so studies.ts's sharpness mapping is untouched. The
plateau gates that are secretly distance gates (`confidence < 0.35` on
weigh-it and catch-its-edges) then become honest photon-starvation
gates. Collecting-area projects (deep-array and kin) become the natural
carriers of aperture, which also gives P0-1's retargeted projects a
physical stat to move. Retune the constants so the *current* 25 ly field
plays roughly the same; the shape is the fix, not the difficulty.

### P2-5 · Detection is range-free

`DETECTION_FLOOR = 0.015` (`knowledge.ts:279`) admits a source into the
sky at the same emission level whether it sits at 3 ly or 50. Physically
the threshold is received flux, so it should scale with 1/d². At the
current 25 ly field this is defensible — a post-singularity civ with
system-scale collectors plausibly sees every biosphere inside 50 ly — so
this can wait, but it must be fixed before the field ever grows, and the
`FOUND_DARK_LEVEL = 0.01 < DETECTION_FLOOR` coupling (`voyages.ts:1254`)
must move with it.

### P2-6 · The beam classification floor is flat

`BEAM_RECEIVED_LEVEL = 0.4` (`contact.ts:164`) classifies a received
beam at the same level regardless of distance, while traffic.ts computes
the honest received fraction for the same beam's *content*. Low stakes
(it is a classification floor, not a measurement, and the code says so),
but the two should eventually draw from one falloff.

### P2-7 · Bankable compute and the attention ceiling

Physically, computation is a rate and energy is the stock; "uncommitted
compute" saturating at 110 years of income (`ATTENTION_YEARS`,
`projects.ts:326`) is an abstraction with a fairness job (away-time must
not stockpile). Verdict: **keep it** — "the attention of a bounded mind"
is a defensible fiction, the multiplayer constraint is real, and P0-1
removes the part that was actually offensive to physics (compute pricing
*time*). If the owner ever wants the fully honest version, the stock
becomes banked energy and question costs fall toward zero while scarcity
moves entirely to instruments and launches — a much larger economy
redesign, flagged here and not recommended now.

### P2-8 · Superintelligences that take years to reply

Counterpart deliberation runs 0.4–2.5 game years (`traffic.ts:250-256`).
A superintelligence answers in seconds; the delay is only honest as
*choice* — protocol, caution, contempt, committee. traffic.ts already
frames it exactly that way (deliberation and temperament, never signal
speed or incapacity), so this passes — with the standing rule that no
future prose may ever attribute the delay to thinking time as a
capability limit.

**Also examined and passed:** mask tiers and cadences (contest.ts) —
concealment as ongoing directional-radiating/heat-banking work is
thermodynamically defensible, the unmaskable neutrino channel prices its
limit, and `banked` civs radiating 0.02–0.06 are consistent with minds
that are genuinely mostly idle; emission "levels" as abstract broadband
brightness — an abstraction, not a violation; `SILENCE_DECLARED_YEARS =
288` and sentinel cadence 25 y — protocol constants, not physics claims;
future-dated emission epochs — pre-authored truth that cannot leak
through the cone, correct by construction.

## 4. Order of work

1. **Slice 1 (P0-1):** derived answer latency (archive shortfall model),
   haste-project retarget, plateau copy, UI `ANSWERS NOW` state,
   questionmethod touch-ups, audit:facts recouple. This is the slice the
   playtest complaint points at, and everything else layers cleanly on
   top of it.
2. **Slice 2 (P0-2 + P1-3):** the seedship sentence; torch fuel
   reframe; arrival flares for torch and sail.
3. **Slice 3 (P1-4):** flux-based confidence, constants retuned to hold
   current difficulty at 25 ly.
4. **Later, before the field grows (P2-5, P2-6):** flux-based detection
   and a unified beam falloff.

Each slice leaves every check green on its own and none blocks the
others past slice 1.
