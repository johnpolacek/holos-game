# HOLOS — Build brief: AV (the voice)

*The launch brief for a fresh thread building slice **AV** — the narrator
slice: the mind becomes the voice of the interface. The game's machinery
shipped ahead of its storyteller; this slice closes that gap with the
frame, the report, the mind's proposals, and a generated-voice seam. Part
of the just-in-time `build-*.md` series; source of sequence and scope is
[roadmap.md](./roadmap.md), which wins on any disagreement. AV was decided
2026-07 and runs **before A2.3** — the confusion it fixes is on the
critical path of the A2 fun gate, and every stage below is small,
shippable, and independent of the contest work.*

---

## Orchestration

Per [CLAUDE.md § Build orchestration](../CLAUDE.md): run this slice with
**Fable as orchestrator** — plan, decompose, synthesize, keep context
lean. Send **reasoning-heavy work to Opus** (deep-reasoner) and
**mechanical work to Sonnet** (fast-worker). The **high-stakes calls** —
run Opus twice with different framings and synthesize — are:

1. **The report's composition model** (AV2): what gets logged per player,
   how a span of absence triages into a readable digest (the walkthrough's
   wake report is the mature form; AV2 ships the thin one), and how the
   per-observer report stays inside the light cone by construction.
2. **The voice architecture** (AV1/AV2/AV4 share it): full per-archetype
   string banks versus a base bank with per-archetype inflection; where
   templates end and generation begins; and the pinned-fact scheme that
   keeps R-1 facts byte-exact through either path.

Fable — not the subagents — holds the invariants below, verifies them in
every subagent's output, keeps `typecheck`/`build` green, and commits.
Prose authored by subagents is reviewed against
[prose-style.md](./prose-style.md) before it lands; the grep-checkable
rules (§3, §6, §8) run at review time, every time.

## Orientation

The story already exists on paper. walkthrough.md scripts a whole season
of it, and prose-style.md teaches any writer to produce the voice. But the
shipped game never speaks it: the pull-back — the one narrative gesture in
a new player's first session — is wordless; nothing states the frame (the
clock, the light delay, the shared sky); `compute` is a bare number; the
only affordance on the first screen is `+ Start`; and the mind — the
narrator the whole design assumes — has no line anywhere. The walkthrough
names the device this slice builds:

> *the interface has a narrator now, and it is not a tutorial voice; it is
> the civilization.*

AV makes four things true, one stage each:

- **AV1** — the mind speaks the frame: a first line after the pull-back,
  and the handful of one-time explainers that turn raw chrome legible.
- **AV2** — the report: every session opens on *what the light brought
  while you were away*, in the mind's own voice.
- **AV3** — the mind proposes: one or two candidate undertakings surfaced
  from the state of the sky, so "what do I do" is answered in the fiction.
- **AV4** — the generated-voice seam: the Cohort DO can render an entry
  through the Claude API, behind a flag, cached forever, with the
  templated banks as the permanent fallback.

Decisions already made (do not reopen):

- **prose-style.md is the voice's law.** Registers and wit ceilings per
  surface (§2), archetype voices (§4), banned coinages (§6), pinned
  vocabulary (§8). New surfaces this slice creates are *added to §2's
  register map* as part of the slice — that table is a sync obligation,
  not documentation to catch up later.
- **The sim stays authoritative.** The voice renders state into prose. It
  never invents a fact, never decides an outcome, and no gameplay value
  originates in a bank or a prompt. This is the narrative twin of the
  server-authority rule in CLAUDE.md.
- **Calm by design.** The report waits to be read: no badges, no unread
  counts, no notifications. Absence is fiction, not neglect
  (act3-design.md § Sleep; the presence rule binds proposals too).
- **The moderation question stays parked.** Nothing here touches
  human-pair signal format (vision.md § Decisions). AV4's generation is
  the player's own mind narrating its own knowledge — no player-to-player
  text is generated anywhere in this slice.
- **The LLM-run counterpart is not this slice.** An AI civ answering
  hails in freeform archetype voice lands with A2.5's traffic and should
  be built *on AV4's seam* — but it is A2.5's scope. One seam, two
  tenants, built one at a time.

## What the build already gives you (read the code, it is the real spec)

- `server/src/cohort.ts` — the Cohort DO already keeps an `eventLog`
  (capped at the last 100 entries) plus the alarm-driven
  `ScheduledEvent`/`FiredEvent` queue. Today only wake alarms use it and
  no client surface renders it. This is the report's spine — but it is
  truth-side; the per-player report must be derived per observer, and
  every remote fact in it must already have arrived as light.
- `server/src/knowledge.ts` — `observeSky`/`observeCiv`, `LightCone`,
  `peekTruth`. `ObservedCiv`/`DetectedSource` is still the ONLY remote-civ
  shape that crosses the wire; the report and the AV4 prompt payload are
  new *consumers* of this layer, never new paths around it.
- `server/src/minds.ts`, `civseed.ts`, `dials.ts` — the speaker's
  identity: archetype (name, firstRead, charter), the dial sheet, the
  chronicle machinery. Nothing downstream currently reads the archetype
  for *voice*; this slice is what starts.
- `server/src/studies.ts`, `questions.ts`, `missions.ts` — the game's
  existing authored-prose pattern: annotation lines keyed to state
  (`annotationFor`, the `Finding` tables, probe report templates). The
  voice banks extend this pattern rather than inventing a new one.
- `client/src/studyboard.ts` — the Desk panels, sheets, and the hub. The
  report joins this surface family; the proposal rows ride the hub. It is
  the largest client module; new panels join it, they don't fork it.
- `client/src/app.ts` / `model.ts` — the pull-back beat (`"pullback"`
  mode) that AV1's first line lands on, and the DOM-overlay pattern for
  text above the WebGL sky.

## Read first (docs)

- [roadmap.md](./roadmap.md) — § Where the build is today, § AV.
- [prose-style.md](./prose-style.md) — whole, but especially §2 (the
  register map this slice extends), §3 (rules as tests), §4 (the
  archetype voices the narrator speaks in), §7 (sync obligations), §8
  (pinned vocabulary).
- [walkthrough.md](./walkthrough.md) — the acceptance fiction: the
  ceremony's pull-back line (*"The record is complete up to this
  morning…"*), Day 1 evening's report opening, Days 2–3's
  report → strategy turn → beats loop, and Week 6's triaged wake report
  (the mature form AV2's thin report grows toward).
- [act3-design.md](./act3-design.md) — § The Sky (tense discipline),
  § Sleep and the presence rule.
- [ui-design.md](./ui-design.md) — the Desk surfaces, principles on ages
  and beliefs; the report is a reading surface, not a feed.

## Staging and live preview

AV builds **one stage at a time, in four stages**. Every stage ends
shippable and *shipped*: a small PR, CI green, merged to `main`, checked
on a phone at the deployed URL before the next begins (CLAUDE.md
§ Deployment; merged means released). AV adds no Durable Object
migration, so per-PR preview versions work — but a preview shares
production DO state, so run pre-merge checks against a dev cohort room
name, never the live cohort. AV4 merges with its flag off, which is what
makes it releasable.

## The stages

### AV1 — The first line, and the frame

The mind speaks, and the chrome learns to explain itself once.

Server: a voice bank for the **arrival line** — the mind's first words
after the pull-back, per archetype (register: archetype voice, wit
ceiling 3; the walkthrough's *"The record is complete up to this morning.
What happens next has been left, deliberately, blank. That is what you
are for."* is the register target, not necessarily the shipped line for
every archetype). Client: the line lands as a DOM overlay beat at the end
of the pull-back, dismissed by tap, never shown again.

The frame lines, each shown once at the moment its surface first appears,
then never again (a per-player `seen` set in DO storage):

- the age chip, first time a source card opens (observatory deadpan,
  wit 0 — a true statement of physics, e.g. the §4 register line *"The
  light you are reading left before you existed"* family);
- `compute`, first time the hub opens (what it is, what it buys);
- the clock, once, in-fiction (a game year against real minutes — the
  numbers exact per R-1, the framing the mind's).

This is roughly a dozen strings. Every one gets a row in prose-style §2
before merge.

**Phone check:** a fresh inheritance on a phone — after the pull-back the
mind speaks a line in its archetype's voice; opening the first source
card explains the age chip exactly once; the hub defines compute exactly
once. A second session shows none of them again.

### AV2 — The report

The session-open surface: what the light brought while you were away.

Server: widen event logging so everything notable that happens *to this
player's civilization* lands as a per-player report entry — a question
answered (or plateaued), a probe report or its silence, a study's belief
moving past a threshold, a launch departing, an arrival landing. Entries
about remote sources are generated at the moment their light arrives (the
knowledge layer already gates this — the report states the invariant and
inherits it). Each entry: a game-year stamp in the civ's own epoch
(`year n AE`; the cohort clock never surfaces, per §8), a templated line
in the mind's voice (register: the chronicle's annalist family, wit
ceiling 2; physics stamps within it stay observatory deadpan), and a tap
route to the thing itself (the study, the mission, the source).

Client: the report is what a returning session opens on when it is
non-empty — a Desk panel of dated entries, newest first, with a one-line
triage header when the away span is long (thin version of the wake
report's *bombshells first* structure). No badge anywhere; the report
simply waits.

Banks: entry templates per event kind, inflected per archetype according
to the voice-architecture decision. This is the slice's biggest prose
volume — Sonnet drafts against the style guide, Fable reviews with the
§3/§6/§8 greps.

**Phone check:** buy an overnight question and launch a probe in the
evening; next morning the session opens on a report that reads as the
mind's digest — every entry dated, the question's answer moving a
study's bars, the probe's flight underway — and every line survives the
register map.

*Amendment, recorded during the build.* The brief above says entries
about remote sources are "generated at the moment their light arrives".
Taken literally that has no referent: a Durable Object asleep between
sessions has no moment to generate anything in, and the only machinery
that could manufacture one — the alarm queue — must not become a source
of truth about what happened. So the model is **stamped at arrival,
materialized on the next derive**: an entry carries its true home-side
arrival year as its stamp, and comes into existence the next time the
server derives the report from the already-assembled snapshots. A
civilization that slept for four hundred years reconstructs on the next
read with the identical stamps it would have had if someone had been
watching, which is the property that actually matters and the one the
literal reading was reaching for. The alarm queue stays what it was: a
scheduler, non-authoritative, free to fire late or not at all.

### AV3 — The mind proposes

The default path from "what is going on" to "what do I do."

*(Amended 2026-07, on reopening the determinism question.)* The stage is
**two layers, not one philosophy**. The determinism below is the floor
the counsel stands on, not the ceiling of the experience — AV4 gains a
second tenant (the counsel seam, below) that may pick and pitch with a
model. What stays deterministic is what must be *promised*: the set of
legal proposals, and the rules about firing, repeating, and declining.

Server: a **candidate enumerator** — deterministic rules over the sky,
the studies, and the work list: an unclassified warmth with no study →
the watch is a candidate; a study starved of compute while the budget
idles → the question is a candidate; a returned answer that reprices a
probe → the launch is a candidate. Candidates are **typed records with
stable ids** carrying the facts of their reason — shaped to be *ranked
by something else*. The floor ranks them with rules and surfaces at most
one or two; the counsel seam, when its flag is on, ranks the same closed
set with a model. Each surfaced proposal is a framing line (the
facts/stance split applies: the reason carries the pinned facts, the
stance is the mind's) plus a route into the *existing* brief or sheet —
the proposal opens the same study brief or launch sheet the hub does; it
never re-implements a verb.

Rules of the engine, held as guardrails: proposals never fire anything —
accepting one opens the commitment surface, it does not commit; nothing
irreversible is ever proposed into a one-tap path (the presence rule);
declining is free and silent; a declined candidate does not return until
its **state fingerprint** changes — the fingerprint (a hash of the
candidate's id and the state facts that justify it) is also what the
counsel seam's cache and decline-record key on, so the no-nag promise is
checkable under both layers. The mind proposes, the player chooses; the
`+ Start` hub remains the browse path unchanged.

The enumerator is not a hedge against AV4 — it is the templated floor
AV4's own contract requires under every generated path: no key, flag
off, gate rejection, and API failure all still play, with the rules'
pick and the templated framing.

**Phone check:** a brand-new player lands with no studies — the mind
proposes the first watch, with a reason drawn from the actual generated
sky; accepting opens the study brief; declining leaves a quiet hub and no
repeat of the same proposal next session.

### AV4 — The generated voice, behind a flag

The runtime seam: the same report entries and framing lines, rendered by
a model instead of a template — off by default, template-fallback always.
The seam has **two tenants**: the renderer (report remarks and framing
lines, below) and **the counsel seam** (AV3's selection, at the end of
this stage).

The shape: when composing an entry with the flag on, the Cohort DO calls
the Claude Messages API with a payload built from exactly three things —
the archetype's voice card (its §4 row: signature, wit source, DON'T),
the civ's own `CivSeed` surface (dials, charter, chronicle), and the
light-cone-legal view of whatever the entry is about. The response is
style-gated (below), stored, and served; on any failure the templated
line ships instead.

Invariants, each one testable:

- **The prompt boundary is the knowledge layer.** The model receives
  only what `observeSky`/`observeCiv` would serve that player. It cannot
  leak truth it was never given — the `ObservedCiv` discipline extended
  to one more consumer, by construction.
- **Facts are pinned.** Numbers, distances, years, percentages, class
  labels, designations enter the prompt as literal tokens the model is
  instructed to reproduce verbatim; the output is rejected unless every
  pinned token appears byte-exact (R-1/R-2 as a runtime check), no §6
  banned term appears, and no exclamation mark appears (R-7). A rejected
  render falls back to the template — never a retry loop on the hot path.
- **Generated once, kept forever.** The accepted render is stored in DO
  storage keyed by the entry it renders; re-reads are byte-identical;
  nothing regenerates. (A civilization of Memory would approve.)
- **The flag is off by default** and the fallback path is the same code
  that shipped in AV2 — local dev with no API key runs the whole game.

Mechanics: use `@anthropic-ai/sdk` (fetch-based; works in Workers and
Durable Objects) with the key passed explicitly from the env binding —
`new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })`; there is no
`process.env` in a Worker. The key is a Workers secret
(`wrangler secret put ANTHROPIC_API_KEY`; `.dev.vars` locally) and never
appears in `wrangler.jsonc` or the repo. Model: `claude-opus-5` — voice
quality is the entire point of the seam, so start at the top and only
step down if a cheaper tier provably holds the register; with zero
players, cost is not yet an argument. Requests are short (one entry, a
few hundred tokens of output, modest `max_tokens`); note the current API
has no sampling knobs on this model family — variety comes from the
prompt and the entry's own material, which suits a voice that must stay
in character anyway.

**The counsel seam** *(added 2026-07 — the second tenant).* With the
flag on, AV3's selection and framing may be generated. The model
receives the **closed candidate list** (AV3's typed records, ids and
all), the archetype's voice card, the dial sheet and charter, and
nothing about the sky beyond the facts already inside the candidates —
and returns a pick plus a framing line. The pick MUST name a candidate
id and the line must pass the style gates; anything else falls back to
the floor's pick and template. The response is **cached against the
candidate-set fingerprint** (identical situations get identical
counsel; re-reads are stable) and a decline is recorded against the same
fingerprint, so the no-nag promise survives generation. The model never
invents an undertaking, never prices one, never fires one — it chooses
among legal moves and says why in character. This is the first place an
archetype's nature is allowed to touch gameplay *texture* (which counsel
you hear first) rather than prose alone; it remains barred from gameplay
*truth*.

One caution, owned in the stage rather than discovered later: **bad
counsel is worse than plain counsel** — a mind that proposes the dumb
move looks dumb at zero distance, and it is the one mind light-lag
cannot cover for. The counsel flag stays off until its picks read well
on a dev cohort; that evaluation is part of this stage's phone check,
not an afterthought.

**Phone check:** on a dev cohort with the flag on, a report entry
renders in generated prose that passes the style gates and reads in the
archetype's voice beside its templated siblings; the same entry re-reads
identically after a reload; with the flag off, the same event renders
from the template. Both paths on the same phone, same session. For the
counsel seam: the same sky state yields the same generated pick twice;
a decline holds across a reload; pulling the key mid-session degrades
to the floor without a visible seam.

**AV4, amended (2026-07) — what was built.** Two changes to the shape
above, both narrowing it. The invariants are unchanged.

*The renderer generates a POOL PER (civ, family), not a line per entry.*
R-31 already says a remark is family-scoped: it must read correctly for
every entry its family can produce, naming no reading, target, probe or
cause. The shipped bank is therefore already a pool per (archetype,
family), drawn from with `createRng("remark/" + entryId)` — so AV4
generates that same data structure, three lines for this civilization's
own (archetype, family), and reuses the shipped deterministic pick over
it. Four things follow, and they are the reason for the change: the
payload contains **no digit, no designation, and no player-authored
text** (asserted before every call, not merely intended), so the
injection surface for this tenant is *empty*; family scope is enforced
by structure rather than by instruction, because the model is never
shown the specific event; the cost is bounded absolutely at five calls
per player, ever, rather than one per promoted entry forever; and the
generated pool and the authored one are the same shape, so nothing
downstream can tell them apart. The kick is at `materializeReport`, the
swap-in is in `cohort.ts` on the built payload, and `report.ts`,
`proposals.ts` and `voice.ts` are not modified — flag off is AV2/AV3
byte for byte.

The **arrival line** stays authored. Its payload builder is designed and
its call site is not wired: an arrival line is served sub-second after
`become`, so a generated render would miss the one serve it has, and the
first line a player ever reads is not the place to find that out.

*The counsel ships in conservative mode.* The floor picks and serves
exactly as AV3 shipped; the model receives the closed candidate list as
fixed slots and returns a pick plus a stance, and **the stance attaches
only when its pick equals the row the floor already leads with.**
Disagreement withholds the stance, serves the floor unchanged, and logs
one `agree=0` line. This is the stage's own caution taken seriously: the
blast radii differ by orders of magnitude — a bad stance is a sentence
that reads wrong beside a correct move, a bad pick spends the
allocation — and only one of the two is falsifiable at reading speed. It
also collects the pick data the fuller mode would need to earn its way
on, at zero risk, from the first day; because `pick` is in the cached
record from the start, the records minted now stay valid if that mode is
ever enabled. Both flags (`HOLOS_VOICE_GEN`, `HOLOS_COUNSEL_GEN`) ship
`off`, and the counsel one stays off until its picks read well on a dev
cohort with a real key.

*Gates in CI.* `npm run audit:banned` holds `bannedterms.ts` to
prose-style §6, `npm run audit:voice` runs every shipped bank string
through the style gate, and the R-37 import greps hold the generation
modules to their allowlist. All three run on every PR. The bank audit
earned its place immediately: it found one shipped remark over R-31's
sentence bound, and one gate rule over-strict enough to reject ordinary
in-world vocabulary.

## Done when

Hand the deployed URL to someone who has read none of the docs. Within
one session they can say what is going on and what they chose to do —
and they learned both *from the civilization*, not from a tutorial,
because there still is no tutorial. Concretely: the mind speaks after
the pull-back; the first session's chrome explains itself exactly once;
a return visit opens on the report; the first proposal leads them into
their first study. Every new string sits in prose-style §2 with a
register and a wit ceiling, the §6/§8 greps pass, the tense and color
rules hold (cyan present, amber belief, ages everywhere), and
`typecheck`/`build` are green. AV4 is merged flag-off with its gates
demonstrated on a dev cohort.

## Guardrails

- **The sim is authoritative; the voice only renders.** No fact, price,
  probability, or outcome may originate in a bank, a template, or a
  prompt. If a line needs a number, the number comes from state.
- **The prompt boundary is the knowledge layer — absolute.** AV4's
  payload builder lives beside the other observer reads in
  `knowledge.ts`'s orbit and is reviewed like a wire message: nothing
  about a remote civ beyond `ObservedCiv`/`DetectedSource` and the
  study's own evidence shapes.
- **prose-style.md governs, mechanically.** New surfaces join §2 in the
  same PR that creates them; R-1/R-2 facts byte-exact; one wit-beat max
  (R-4); zero wit on wit-0 surfaces (R-5); no homogeneous wit (R-6); no
  exclamation marks (R-7); the §6 banned-terms grep and the §8 comms
  register run on every bank before merge.
- **Calm by design.** No badges, no unread counts, no push. The report
  waits; tripwires (A2.3) stay the only notifier. Proposals never fire
  ceremonies and never put an irreversible act one tap away
  (act3-design.md, the presence rule).
- **Generated prose is cached forever, deterministic on re-read, and
  always has a template underneath it.** The flag defaults off; the key
  lives only in a Workers secret; a missing key degrades to templates
  silently.
- **Scope**: no new verbs, no new economy, no contest, no signals — AV
  narrates the game that exists. The LLM-run counterpart civ is A2.5's
  tenant on this seam, not this slice's.
- Small single-purpose commits on a feature branch + PR; `npm run
  typecheck` and `npm run build` green at every commit — `main`
  auto-deploys.

## First move

AV1's proposal is small: the arrival-line bank's shape (where it lives,
how an archetype keys it), the one-time-explainer mechanism (the
per-player `seen` set), and the pull-back overlay beat. The two
double-Opus sessions come when their stages open: the **report
composition model** at AV2 (logging shape, per-observer derivation,
absence triage) and the **voice architecture** at whichever of AV1/AV2
first needs a multi-archetype bank (bank shape, inflection strategy, and
the pinned-fact scheme AV4 will inherit). After each go, decompose into
subagent tasks (see *Orchestration*), and integrate + verify the
invariants yourself before each commit — every stage merges to `main`
and is checked on a phone at the deployed URL before the next begins.
