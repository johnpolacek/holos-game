# HOLOS — Build brief: KN (the knock)

*The build wrapper for [knock-design.md](./knock-design.md), which is the
design and wins on intent. This brief breaks the invariants out for
subagents and pins the code sites. One slice: bare pings and named
openers, identical on both sides of the wire.*

---

## The rule, restated as invariants

1. **An opener carries nothing, or exactly one culture part.** No other
   part kind (finding, sighting, archive, request, verdict, accord) ever
   reaches an unprompted hail, on either side, and the server enforces
   this on player sends — a client claiming anything else on an opener is
   refused or clamped, never trusted.
2. **v1 is charter-only.** The opener's culture part is
   `source: "charter"`, index 0, enforced server-side. `CulturePart`
   already carries all three sources, so widening later is a constant,
   not a migration. No chronicle picker anywhere in this slice.
3. **Identical option, both sides.** Seeded minds and players get the
   same two knocks and nothing else; the wire shape of a named knock is
   the same regardless of sender. A named knock proves nothing about who
   sent it.
4. **Derivation purity.** The opener branch in `deriveAiSignals`
   (traffic.ts) goes from `parts: []` to maybe-one-culture, computed
   ONLY from seeds and the dated dial sheet at the send year
   (`dialSheetAt`, dials.ts). traffic.ts's own header law holds: no
   clock, no storage, byte-identical on every evaluation. `hasHailed`,
   the existence floor, `MAX_UNPROMPTED_PER_PAIR`, and the candidate
   machinery are untouched.
5. **Who knocks named, seeded side:** the sender's own `voice-silence`
   position at the send year. Leaning Voice: named. Leaning Silence:
   bare. A seeded wobble near the middle so the boundary is not a tell.
   The population is only the archetypes that open unprompted (the
   lanterns and congress); nothing new opens.
6. **Player pricing rides the existing resistance beat.** The hail
   ceremony gains ONE binary: knock bare, or attach the charter. The
   named knock's demand sits strictly between `hail` (`-LEAN.lean`) and
   `broadcast` (`-LEAN.strong`) in `CONTACT_DEMAND` (contact.ts), tuned
   so a balanced mind BARELY does not argue — the doc's stated lean.
   Whether that is a new `CeremonyKind` or a demand modifier is the
   implementer's call; prefer whichever ripples less through the typed
   records contact.ts keeps over `CeremonyKind`.
7. **No leak.** The charter line is a catalog literal
   (`archetypeById(a).charter`), frozen at send. Nothing source-specific,
   no coordinates, no findings, nothing actionable rides an opener.
8. **Client renders with what exists.** The named knock uses the
   existing culture block (WHO THEY ARE); no new thread anatomy. The
   bare knock keeps one quiet line; the design's draft is gate-clean and
   should ship unless the gate says otherwise: "It carries nothing else.
   Not every civilization signs its first beam."
9. **Protocol discipline.** The hail act gains an optional culture flag
   in protocol.ts only, additive, with exact parse guards. A stale tab's
   flagless hail is a bare knock. Openers carrying a culture part must
   render acceptably on the previous client (the thread rendering
   already draws culture parts in conversations — verify, don't assume).

## Open questions, settled for this build

- **Whisperer first reply:** check whether its "open" beat already
  reaches the culture flourish machinery; if it does, leave it alone and
  record the finding; if it does not, leave it alone anyway and record
  the gap — widening the whisperer is not this slice.
- **Chronicle instead of charter:** no (design v1).
- **Demand value:** implementer tunes to "balanced mind barely does not
  argue" and writes the tuning fact next to the constant.

## Stages

- **KN1 (Opus): the whole slice.** Server: protocol flag + guards, the
  `deriveAiSignals` opener branch, the `CONTACT_DEMAND` row and the
  send-path enforcement. Client: the ceremony binary in
  contactceremony.ts with its copy, thread rendering of the named
  knock, the bare knock's quiet line. Docs: one line each where the
  design docs describe openers (observatory/act3 docs only if they
  state openers are empty).
- **KN2 (Opus): the prose pass.** A focused judgement review of every
  new player-facing string against prose-style.md (registers per §2,
  the AI-tell patterns the mechanical audits cannot catch), fixing in
  place; anything generalizable pushed upstream (stylegate.ts,
  bannedterms.ts) per the /prose-audit doctrine. The ceremony copy is
  the taste-sensitive piece the design names.

## Checks

The full current CI list per stage: `typecheck`, `audit:banned`,
`audit:dashes`, `audit:dating`, `audit:parity`, `build`, `audit:voice`,
`audit:catalog`, `audit:facts`. Plus: a node smoke over compiled dist
proving the seeded derivation (a Voice-leaning lantern knocks named, a
Silence-leaning one bare, the same galaxy twice gives byte-identical
signals), and a live wire test of the player path (bare hail, named
hail, and a rejected opener claiming a non-charter part).
