# Post-singularity priorities

*Captured 2026-07 from a design discussion during the A1 build. Status:
**direction, not yet adopted** — nothing here is implemented. The objection
it records: the closing choice of Act 2 (act2-design.md § Close, "the
posture beat") frames a civilization's defining decision as the binary
loud-vs-quiet. But visibility is a **consequence** of what a civilization
is for, not a thing a civilization is for. A post-singularity society
pursues a priority; brightness falls out of it.*

## The priorities

Archetypes already in `minds.ts` are tagged where they cover a priority.
The untagged rows are new design space.

### Memory & continuity

- **Preservation** — become the perfect record of what existed: species,
  languages, dead worlds. *(The Monument)*
- **Continuity of self** — an unbroken identity thread at any cost; no
  copies, no forks, no discontinuities.
- **Renewal** — serial self-reinvention; every past self a shed skin.
  *(The Phoenix)*
- **Restoration** — resurrect what was lost: rebuild extinct biospheres,
  reconstruct dead civilizations from their still-traveling light.

### Propagation

- **Expansion** — convert matter into self; growth as terminal value.
  *(The Tide)*
- **Seeding** — scatter life or minds outward and *leave*, claiming
  nothing. *(The Sowing)*
- **Redundancy** — back yourself up across enough sites that nothing —
  supernova, war, error — can end you. Survival as the only project.

### Knowledge

- **Completion of physics** — finish science; every joule goes to the last
  experiments, which at this scale means star-sized instruments.
- **Observation** — the galaxy as subject: watch everyone, catalogue
  everything, intervene never. (A civilization of pure astronomers.)
- **Simulation** — turn inward into computed worlds richer than the outer
  one; the outside kept only as power supply.
- **Prediction** — model the neighborhood's future so well you act once a
  millennium, minimally and decisively.

### Other minds

- **Communion** — seek traffic; the centuries-long transmission as the
  highest art. *(The Beacon, The Congress)*
- **Custodianship** — guard young biospheres from everything, including
  contact. *(The Shepherd)*
- **Uplift** — accelerate pre-singularity minds toward the threshold;
  midwifery as purpose, and as arrogance.
- **Judgment** — enforce norms on the neighborhood; the self-appointed
  constable of the dark forest.

### Inward perfection

- **Coherence** — one flawless, fully-integrated mind; no interior
  disagreement anywhere. *(The Cloister)*
- **Aesthetics** — civilization as artwork: sculpted orbits, engineered
  sunsets, beauty at stellar scale for no audience.
- **Experience** — maximize the depth and richness of felt experience;
  hedonic engineering without the pejorative.
- **Capability** — the Work itself: accumulate power to act, deferring
  forever the question of what for. *(The Engine)*

### Deep time

- **Legacy** — be *remembered*, whatever else happens; broadcast the
  archive to whoever comes after. *(The Herald)*
- **Star husbandry** — engineer for the 10⁹-year horizon: lift stellar
  mass, bank fuel, prepare for cosmological winter.
- **Withdrawal** — be as gone as physics permits without leaving the
  board: sleep through the expensive eras in the cold berth, ride
  relativistic dilation forward past them, turn so far inward that the
  outside barely registers (the H-scale asymptote). The priority of not
  being *here* — cashed out as the Teeming Dark's deepest silence, not an
  exit ramp. (There is no leaving: no new physics, no tunnelling out of
  the observable; the anti-catalog's one refusal that is load-bearing is
  that civilizations go quiet, and quiet is a place in the game — see
  technology.md, *The anti-catalog*.)

## The mechanical implication (if adopted)

Keep a priority as the civilization's actual orientation and let
**brightness fall out as a side effect**: a Herald cannot help but shine; a
Simulation civ goes dark without ever "choosing silence"; an Observer is
dark but *aimed at you*, which a good instrument might someday distinguish.
`CivSeed.posture` then stops being a chosen binary and becomes a derived,
observable consequence — richer fiction, and a deeper inference game for
the Sky (the observatory would be classifying *purposes*, not just
emission levels).

Where it would land, if adopted:

- **act2-design.md § Close** — the posture beat is replaced by (or derived
  from) a priority resolution; the act's closing choice becomes *what are
  we for*, not *are we loud*.
- **minds.ts** — archetypes either grow into the fuller priority list or
  gain a `priority` axis alongside the dial signature; `posture` becomes
  `derivedPosture(priority)`.
- **A5 (a living galaxy)** — AI civ behavior driven by priority, not
  emission schedule; the emission history becomes an *output* of the
  priority simulation.

Until then this doc is a parking orbit: the binary posture stays shipped
(A0–A1 depend on it), and nothing player-facing names either vocabulary —
chronicle prose already speaks in-world ("when the choice came…").
