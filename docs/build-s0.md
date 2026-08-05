# HOLOS — Build brief: S0 (the frame)

*The launch brief for a fresh thread building slice **S0** — Phase S's
first slice: the intro, the hybrid home, and the counsel strip. The 2026-08
playtest's complaint was verbatim: "I'm not sure what I'm supposed to do…
I want clear direction." S0 answers it with frame, not systems — near-zero
new gameplay machinery, all presentation and voice. Part of the
just-in-time `build-*.md` series; source of sequence and scope is
[roadmap.md](./roadmap.md) § Phase S, which wins on any disagreement;
[stakes-design.md](./stakes-design.md) is the premise. The layout and copy
below were settled against a visual mock in design review (2026-08); this
brief is that mock's record.*

---

## Orchestration

Per [CLAUDE.md § Build orchestration](../CLAUDE.md): **Fable as
orchestrator** — plan, decompose, synthesize, keep context lean. Send
**reasoning-heavy work to Opus** (deep-reasoner) and **mechanical work to
Sonnet** (fast-worker). The **high-stakes calls** — run Opus twice with
different framings and synthesize — are:

1. **The information-architecture migration.** Every shipped surface (the
   study board's hub, studies, the work list, the Ledger, threads, the
   source card) must find its home under the five-tab rail without
   rebuilding any of them. What re-homes where, what the Sky tab owns
   versus what a page owns, and how deep the longest reach gets — this is
   the slice's shape, and getting it wrong rebuilds S1–S4 on sand.
2. **The intro's staging on the Model.** The four beats and the shipped
   pull-back must read as one continuous camera move, not a slideshow
   bolted in front of a game. Where each beat's visual comes from (live
   Model, staged scene, or drawn overlay) and how the sequence hands off
   to the home screen.

Fable — not the subagents — holds the invariants below, verifies them in
every subagent's output, keeps `typecheck`/`build` and the audit suite
green, and commits. Prose authored by subagents is reviewed against
[prose-style.md](./prose-style.md) before it lands.

## Orientation

S0 makes four things true, one stage each:

- **S0.1 — The intro.** Four beats after the inheritance ceremony's
  BECOME, seconds each, tap-to-advance, a faint skip from beat one, ending
  on Begin. Played once; replayable from the Mind page. The purpose is
  shown, never stated — there is no banner, no tutorial line that says
  what the player is for. Beat four's silence is the drama.
- **S0.2 — The hybrid home.** A home screen with the Model as its
  centerpiece: HUD (civ name with the cyan mark, year, resource chips)
  above the map, the bottom rail below — **Report · Sky · Work · Family ·
  Mind** — with Sky as the landing tab. Every shipped surface re-homes
  under a rail tab; the most important verbs surface within two taps.
  *(Amended 2026-08, on the S0.2 phone check: the rail shipped as
  **Report · Sky · Projects · Reach · Mind**. Work was renamed Projects,
  the word for what the page holds. Family became Reach, the outward
  register — the survey, voyages, forks, the Ledger, standing orders —
  and its masthead (world plate + charter) re-homed to the Mind page's
  head, so Mind opens with who the civilization is before what it
  proposes; Reach is also where S2's reach-arc exposure readout and the
  family register naturally land. The HUD ships the name, the
  designation and a two-decimal epoch year that visibly ticks; the
  resource chip became the compute meter, a thin bar bottom right. The
  rail and name wear the titling face, the rail in amber; instrument
  readouts wear a self-hosted mono face. The report's session auto-open
  was retired for a calm unread badge on the Report tab. ui-design.md's
  S0.4 revision records the shipped layout in full.)*
- **S0.3 — The counsel strip.** One argued line from the mind between map
  and rail, with **Talk** opening the Mind page. Floor-picked counsel
  (AV3's deterministic enumerator) serves the line; the AV4 seam renders
  it in voice behind the existing flags, template fallback always. The
  arrival line lands here: after beat four, the home screen's first
  counsel line is the mind's per-archetype first read.
- **S0.4 — The thumb test and the sync.** The one open UX call — overflow
  detail on map-anchored cards versus dashboard pages — prototyped both
  ways and decided on a phone. ui-design.md revised to the reboot's
  layout; prose-style.md §2's register map gains the new surfaces.

### The intro's copy (settled 2026-08, design review)

Pinned, subject only to the mechanical gates:

1. *The measure* — the star's limb filling the frame:
   **"Your star sheds more power in one second than your species used in
   its whole climb."**
2. *Where you sit* — the scale rail, three marks, the cyan point just
   past the first: **"There is a scale for what a civilization holds: a
   world, a star, a galaxy. You stand just past the first mark."**
3. *The new state* — the waking rings: **"The species built a mind, and
   the mind is what you are now. What was out of reach is a matter of
   time."**
4. *The sky* — an ambiguous sky, faint warm smudges that could be
   civilizations or could be nothing: **"You may not be the first to
   wake."** Then Begin.

Beat two shows the scale and never names it: "Kardashev" is design
vocabulary (vision.md § Source framework) and does not reach a surface.
Beat four's visual must not assert neighbors exist — no confirmed amber
sources, only ambiguity — because the line's uncertainty is the knowledge
layer's own, and the art may not claim what no instrument could.

### Decisions already made (do not reopen)

- **Hybrid home** — the map is the heart, the rail is the dashboard half
  (roadmap.md § The UX reboot). The kept ingredient is *the spatial
  feeling of having a place in a real sky*; layout decisions protect it.
- **Drawn over stated** is the paradigm, but S0 draws nothing new: the
  mirror, exposure arcs, and trajectory labels are S1/S2. S0's job is to
  not build prose surfaces where geometry will go.
- **Cyan is you, amber is other** — the shipped invariant, unchanged.
- **The purpose is shown, not stated.** The banner ("You are trying to
  continue to exist") was mocked and cut in review. It does not return.
- **The counsel argues; it never computes verdicts** and knows only what
  the knowledge layer serves (stakes-design.md § Judging intent). Intent
  never appears as a readout anywhere, this slice or ever.
- **Calm by design.** The Report tab waits to be read; its badge shows a
  count of arrived entries and nothing pulses, pushes, or nags.
- **The sim stays authoritative.** The voice renders state into prose;
  no gameplay value originates in a bank or a prompt.

## What the build already gives you (read the code, it is the real spec)

- `client/src/ceremony.ts` — the inheritance flow the intro follows;
  `client/src/model.ts` — the pull-back camera the beats stage on;
  `client/src/app.ts` — the boot path that decides what a session opens
  on.
- `client/src/studyboard.ts` — the hub and desk being re-homed. Its verbs
  are the ones to unbury; none of its systems change.
- The voice machinery: `voice.ts` banks, `stylegate.ts`, `bannedterms.ts`,
  `voicegen.ts`, and the AV4 counsel seam behind `HOLOS_VOICE_GEN` /
  `HOLOS_COUNSEL_GEN` (both off; floor fallback always). The intro lines
  and any new counsel strings are bank strings: they ship in `voice.ts`
  and pass `audit:voice`.
- `server/src/knowledge.ts` — `ObservedCiv` remains the only remote-civ
  shape that crosses the wire; the counsel strip and Report are consumers,
  never new paths around it.
- `server/src/protocol.ts` — the one file for any wire growth. S0 should
  need little to none; if the Mind page's Talk needs a message, it is
  added there with guards, like every message before it.

## Staging

Each stage is a small PR merged to `main` and phone-checked on the
deployed URL before the next begins — `main` auto-deploys, so every stage
ships whole.

1. **S0.1** — the intro sequence on the Model, the replay entry on a
   stub Mind page.
2. **S0.2** — the home shell: HUD, rail, tab pages, the re-homing of
   every shipped surface. The largest stage; the IA migration lands here.
3. **S0.3** — the counsel strip and the Mind page's Talk, on the shipped
   AV3 floor + AV4 seam.
4. **S0.4** — the thumb test (both overflow prototypes on a phone, call
   recorded in roadmap.md § The UX reboot), ui-design.md revised, §2
   register map synced.

## Done when

- A new player inherits, plays four beats, lands on the hybrid home, and
  the designer's playtest answer to "do you know what to do next?" is
  yes — with the three most useful verbs reachable in two taps or fewer.
- The intro replays from the Mind page; a returning player never sees it
  uninvited.
- Every feature that worked before S0 is reachable from the rail — no
  shipped surface is orphaned.
- `typecheck`, `build`, and the full audit suite are green in CI;
  ui-design.md and prose-style.md §2 match what shipped.

## Guardrails

- **No new gameplay systems.** No mirror, no scarcity, no exposure, no
  attack anything — those are S1–S3. Server changes are limited to what
  the counsel and Report surfaces consume.
- **Light-cone legality everywhere**: nothing on the home screen, the
  intro, or a counsel line may state a remote fact that has not arrived
  as light.
- **Tokens only**: type from the `--holos-text-*` ladder, ink from the
  tiers, no hard-coded sizes or colors. Rail labels are reading type at
  xs, not xxs — they are lone unenclosed labels, and xxs is for enclosed
  classifiers only (style.css says why).
- **The prose gates bind**: no em dash on any surface (R-8), no numeral
  in the mind's prose (spelled numbers in beats and counsel; numerals
  belong to the instrument register), no cohort year anywhere in the
  intro (R-33 — the beats carry no dates at all), and every new string
  through the style gate.
- **Do not reopen settled copy.** The four beat lines are pinned above;
  if a gate rejects one, the fix is reviewed against this brief, not
  improvised.
- **Every merge is shippable** — `main` auto-deploys; a half-done stage
  does not merge.
