# HOLOS — Build brief: RS (the report's standings)

*The follow-up to [build-ambient-studies.md](./build-ambient-studies.md):
the Report stops being a caption over nothing. Below the dated annal it
carries a standings list of every study in the sky, so the session review
the AS slice promised (Report → Desk → the rest of the sky) has a spine
even when nothing has happened yet. Origin: playtest feedback — "Instead
of a blank in Report, I was expecting to see a list of all the studies."*

---

## Orientation

The Report today is the annal alone: dated entries, newest first, plus a
caption and an empty state (PR #57, reworded by the terse pass in #62).
On a fresh civilization, or across any quiet stretch, that is a page of
explanation with nothing under it — and the player opening the game's
review surface expected to review something. The design already owes
this: observatory-design.md's wake-report sketch includes "which studies
said nothing at all," and a study that says nothing is exactly what the
annal structurally cannot show. Since AS, every visible source carries a
study, so "the list of all the studies" is a well-defined thing the
client already holds in full.

**The shape: the morning paper.** The annal keeps its identity — what
has happened, dated, pinned, engaged-events only. Below it, a live
STANDINGS section renders where every study stands right now: the
engaged studies first (the portfolio, each row carrying its status
flag), then the rest of the sky. Quiet studies become visible by
construction: a row in the standings with no entry above it is a study
that said nothing, stated by structure rather than bookkeeping.

**Entirely client-side.** The Report page already holds everything it
needs: the report payload (annal), `studiesByStarId` (engaged),
the ambient boards, and `sourcesByStarId`. The row anatomy exists
(`buildSourceRow` / `buildExploreRow` with `STUDY_STATUS_FLAG`), and the
board-from-report door exists (`focusStudy(starId, "report")`). No wire
change, no `report.ts` change, no server change at all. The engaged-only
scope of the annal's *record* is untouched; the standings are live
presentation, not entries — nothing is pinned, dated, or persisted.

## The delta (one stage, client only)

In `renderReport` (client/src/studyboard.ts):

1. The annal renders as today: caption, one-time explainer, header
   prose, entries. Its empty state survives but is re-scoped: it now
   describes an empty *annal* above a full page, not an empty page
   (today's second sentence already reads right; the first may need a
   word — judge in place, R-25 bounds, terse-pass register).
2. Below the entries (or the annal empty state), the standings:
   - A section header in the existing mold, with an R-40 caption saying
     what this half is: where every study stands as of the light in hand.
   - The engaged studies, Desk order, each row `buildExploreRow`-style
     with its `STUDY_STATUS_FLAG`; tap → `focusStudy(starId, "report")`.
   - Then the rest of the sky, Explore's own sort (light age ascending),
     same row anatomy, no flag.
   - Both lists live; re-render on sky like every sibling page.
3. The waiting state ("Reading the record.") applies to the annal only;
   the standings need no payload and render immediately.
4. Docs, one line each: observatory-design.md's report paragraph (the
   "said nothing at all" clause is now shipped structure) and
   ui-design.md's Report section.

Prose rules as always: R-8 (no em dash), §6, observatory deadpan wit 0,
R-40/R-25 bounds, no numerals standing in for meaning; new heading or
caption classes join the Wrapping block's selector lists; type and ink
from tokens only. `audit:dashes` reads client literals; the full suite
runs regardless.

## Decisions proposed (cheap to reverse, so decided here, not ceremonied)

- **Annal first, standings second.** The session opens on what the light
  brought; where everything stands reads below it. On a fresh civ the
  standings are effectively the whole page, which is the expectation
  this brief exists to meet.
- **All studies, both halves.** The user's words were "all the studies,"
  and since AS that means the sky. The engaged/rest split keeps the
  portfolio texture without hiding anything.
- **No per-row "nothing new" marker in v1.** Quiet is already implicit
  (standings row, no entry above). A dim changed-since-last-read marker
  is a clean follow-up if playtest wants it; it is derivable client-side
  from the annal's own entries, still with no server change.
- **No pager, no second door.** Rows open boards; the Desk and Explore
  keep their jobs; the Report does not become navigation chrome.

## The tech frame (binding, and already the shipped economy)

A new mind wakes at singularity with a base instrument tier, and every
study opens at exactly that level: the ambient boards ARE the base
reading, free, on every source, derived from `signal.confidence` (mostly
distance) at the tier the instruments have. Enhancement is always a
compute spend, and the three paths already exist:

- **Improve the tech** — projects. The catalog carries income raisers,
  per-question instrument discounts that apply across every study
  ("Rebuild the spectrograph bank": READ ITS LINES costs less on every
  study), and the confidence lift, which cohort.ts applies to every
  visible source's signal before any board assembles — so better
  instruments sharpen the whole sky, ambient boards included.
- **Ask on one study** — questions, priced per study, discounted by the
  instrument projects above.
- **Go and look** — missions (THE ASSAY, THE SENTINEL) with charters;
  reports fold into any board and can ground an engaged study.

There is also a fourth channel, and it is not a spend: **what others
choose to send you.** A counterpart's finding shared in conversation
already moves a board (traffic.ts reads the menu ids for exactly this),
and the knock rework ([knock-design.md](./knock-design.md)) extends the
same principle to first contact: a named knock carries the sender's
charter line, information given, not bought. The knock's culture part is
deliberately non-actionable (it moves no board, names no coordinates),
so it changes nothing mechanical here; but the frame should be stated
completely: a board sharpens by light, by spend, or by what someone
tells you.

What this binds for the standings: rows render what the current
instruments make of the light, nothing more — the shares already carry
the tier, because they derive from the lifted confidence. The standings
must NOT grow a tier badge, an instrument readout, or any "upgrade here"
chrome: the game's rule is purpose-level choice ("which question, never
which telescope setting"), and tech shows up as sharper boards and
cheaper questions, not as a stat. The enhancement verbs stay where they
live: questions and missions on the board, instruments in Projects, the
Mind proposing both when the sky warrants.

## Invariants

- `report.ts` and the report wire payload are untouched; entries remain
  engaged-events only, pinned and dated exactly as today.
- The standings never persist anything and never claim to be a record:
  live rows, live shares, re-rendered per sky.
- Engagement marks stay chrome and amber; no cyan; no xxs prose.
- Reuse the existing row builders; a third source-row anatomy is a bug.

## Coordination

Branch from **origin/main**. Two chip sessions are in flight (the
CLAUDE.md routes doc fix; the source card closed-status row) — disjoint
files. Local main carries unpushed commits (zoom ladder, pinch
direction, closed-study row); if any land on origin/main first, rebase —
the touched region here is `renderReport` only.

The knock slice ([knock-design.md](./knock-design.md)) is planned from a
separate thread and is sequence-independent of this one: it touches the
hail act in `protocol.ts`, `deriveAiSignals` in traffic.ts,
`CONTACT_DEMAND`, and the ceremony/contact client surfaces — no overlap
with `renderReport`. One free synergy to know about, not to build: a
knock lights a directed-beam source in the sky, every source carries a
study, so a knock's origin lands in these standings by construction —
the Report becomes the place a knock that arrived while you were away
gets noticed, with its board one tap deep.

## Verification

Fresh civ: Report opens on caption + annal empty state + full standings
(every source, no flags), rows open boards, back leg returns to the
Report. Engaged civ: entries above, standings below with the engaged
block flagged and ordered like the Desk. The seven CI checks green.
