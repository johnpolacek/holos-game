# The Knock: bare pings and named openers

*Design brief for the unprompted-hail rework: a hail may arrive carrying
nothing, or carrying exactly one culture part — the sender's charter line.
Sits beside the other design briefs; the build brief, when this slice
opens, gets the invariants broken out for subagents.*

## The problem this solves

Playtest evidence: a player opened a they-spoke-first thread, found
instrument stamps and one fact-free line, and concluded the feature was
broken. The root cause is not that the hail is empty; it's that *every*
hail is empty. Absence only reads as a choice when presence is possible.
A world where some knocks arrive carrying a self-portrait makes the bare
ping legible as what it always was: caution. The two kinds of opener
teach each other, and no explainer line has to do that work alone.

## The rule

A hail may carry nothing, or exactly one part, and that part may only be
culture (WHO WE ARE). Every other part kind (finding, sighting, archive,
request, verdict, accord) stays conversation-locked. The rule is
identical on both sides of the wire: seeded minds and players get the
same two knocks and nothing else.

- **The bare knock.** What ships today: stamp, tone, one voice-register
  line. The message is that it exists.
- **The named knock.** The same beam carrying one culture part: the
  sender's founding charter line, frozen at send. A face on the knock,
  not a proposition.

For v1 the opener's culture part is restricted to `source: "charter"`
only. The charter is the natural self-portrait; chronicle lines and dial
readings disclose history and doctrine, which feel like things a
conversation earns. The `CulturePart` type already carries all three
sources, so widening later is a constant, not a migration.

## Who knocks which way

**Seeded minds: derived from the dial, not a new table.** The sender's
own `voice-silence` position at the send year decides (via `dialSheetAt`,
which exists for exactly this kind of dated read). Leaning Voice: named.
Leaning Silence: bare. A seeded wobble near the middle so the boundary
isn't a tell. This stays inside the derivation rule: pure function of
seeds and distances, stored nowhere, byte-identical on every evaluation.
The population this touches is small and right: only the lantern
archetypes (beacon, tide, herald) and congress open unprompted, and
lanterns are exactly the civilizations whose nature is to be known. A
beacon introducing itself is the archetype working as designed; the rare
Silence-leaning lantern knocking bare is characterization for free.

**Players: a choice in the hail ceremony, priced by the existing
resistance beat.** The ceremony gains one binary: knock bare, or attach
the charter. `CONTACT_DEMAND` currently asks `-LEAN.lean` for a hail and
`-LEAN.strong` for a broadcast; a named knock slots between them. The
consequence falls out of machinery that already exists: a Silence-leaning
mind that wouldn't argue about a bare hail argues about a named one, and
forcing it costs coherence. Saying who you are is more revelation, and
the mind knows it. No new currency, no new UI beyond the one choice.

## What this preserves

1. **First-contact texture.** A charter line is a self-portrait, not a
   protocol. The Arecibo tradition, in-fiction: you may only get one
   shot, so some civilizations pack who they are into it. "Astronomy,
   never mail" survives because the culture part renders as an
   instrument block, same as everywhere else.
2. **The central trade.** Answering still reveals you, and still rests
   on thin evidence. The named knock adds one expressive axis (what they
   chose to attach) without adding anything actionable: no coordinates,
   no requests, no findings. The decision stays a leap; it just stops
   being a coin flip.
3. **No human/AI tell.** Both sides have the identical option.
   Distributions differ, but archetype family is already disclosed by
   the act of speaking, so a named knock proves nothing about who sent
   it.
4. **Derivation purity and stability.** The opener branch in
   `deriveAiSignals` changes from `parts: []` to maybe-one-culture,
   computed from seeds and the dated dial sheet at `sentYear`. Same
   stability argument as tones and bodies. `hasHailed`, the existence
   floor, `MAX_UNPROMPTED_PER_PAIR`, and the candidate machinery are
   untouched.

## A loop it creates for free

`RequestWant` already includes `"culture"`: a conversation can ask WHO
ARE YOU. So the bare knock becomes an invitation with a built-in
follow-up. They knock without a name; you answer at the price of
revealing yourself; you ask; they decide whether to say. The withheld
charter turns into a small piece of drama the current design has no way
to stage.

## Client surface

- The named knock renders with the existing culture block (WHO THEY
  ARE). No new anatomy.
- The bare knock keeps one quiet line, which the contrast now makes true
  rather than apologetic. Draft copy, gate-clean: "It carries nothing
  else. Not every civilization signs its first beam." The second
  sentence states a rule of the world, not a claim about this sender's
  motive, which keeps it inside the no-leak discipline.
- Ceremony copy for the two options is the taste-sensitive piece and
  worth a `/prose-audit` pass when written.

## Open questions

- Does a whisperer's first reply (its "open" beat) get the same
  bare/named expressiveness? Its replies already reach the culture
  flourish machinery, so this may already be true in spirit; worth
  checking rather than assuming.
- Should the player ever pick a chronicle line instead of the charter?
  v1 says no; the moment there's a picker, the knock starts becoming a
  composer.
- Exact demand value for the named knock, and whether a balanced mind
  should argue about it (leaning: barely not).

## Sizing

One slice, brief-shaped: protocol (the hail act gains an optional
culture flag), the ceremony choice and its copy, the opener branch in
`deriveAiSignals`, a `CONTACT_DEMAND` row, and client rendering that
mostly exists. The audits cover the mechanics; the new ceremony strings
are the only prose risk.
