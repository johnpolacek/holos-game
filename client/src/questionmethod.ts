// How each bought question is actually answered — the paragraph the drill-in
// on an OPEN QUESTIONS row reads before the spend.
//
// PRESENTATION, NOT TRUTH. This is a fixed gloss of an instrument's method,
// keyed by QuestionId and identical for every source, every class and every
// player. Nothing here is derived from a civ, a sky or a study, so it can
// never leak occupancy: it says what the question COULD distinguish and how,
// never what it found. The server stays the one source of truth for
// everything that varies — cost, `separates`, the finding itself —
// and none of that lives here.
//
// THE PREMISE, RESTATED ONCE PER QUESTION (questions.ts's header,
// observatory-design.md § "Questions — the verb"): no new hardware and no
// launch. The photons are already home and already logged; what is finite is
// the capacity to reason about them. So every paragraph opens on what the
// archive already holds and then names the inference the compute buys.
//
// EACH PARAGRAPH ALSO ANSWERS ITS OWN PRICE TAG. There is no clock to
// explain: a question answers the year it is bought, because the archive is
// continuous and already spans millennia when the spend is made
// (physics-audit.md P0-1). So the only number under a paragraph is the cost,
// and the cost is inference depth — matching every line against every
// catalog runs deep and prices dear; fitting a schedule of crossings is
// shallow and cheap. The closing sentence of each paragraph says where the
// depth is, and, for the three questions that lean on a span of record,
// what happens when the record is genuinely too short: the answer says so
// in words, which is the honest thing an instrument can report and the only
// thing the plateau gates ever do. NO DIGITS in these sentences, ever: the
// cost shown beside them is effective (project discounts apply), so a
// literal number here could be made a lie by a landed project.
//
// Register: observatory deadpan, wit 0 (prose-style.md §2's studyboard row).

import type { QuestionId } from "@holos/protocol";

export const QUESTION_METHOD: Readonly<Record<QuestionId, string>> = {
  "weigh-it":
    "Years of the source's position, and of the starlight passing behind it, are already in the record. Solving it for a mass is the expensive part; the mass is then set against the heat. The swing a solution needs was watched long before the question was put, so what is bought here is the solving and not the watching.",
  "temperature-over-time":
    "Every arrival of this light was logged with its temperature. The spend re-reduces the whole record into one cooling curve, and asks whether the curve bends the way an unattended body's bends. A curve is only as honest as its span, and the span is already in hand; where the record is too short to hold a curve at all, the answer says so rather than guessing at one.",
  "read-its-lines":
    "The light is already in hand; splitting it into lines is not. The spend takes the accumulated spectra apart and matches each line against what rock, air, life, and industry are known to leave. Nothing here waits on new light, so the answer comes back on the same day it is asked for; matching every line against every catalog is what runs deep.",
  "time-its-shadows":
    "Every dimming this source has shown is already logged. The spend fits them all to one schedule of depth, spacing and drift, and asks whether an orbit can account for the timing. A schedule proves itself across many crossings, and the crossings are already in the record; where too few of them rise out of the noise, the fit comes back empty and says so.",
  "catch-its-edges":
    "Polarization is recorded along with everything else and almost never read. The spend reads it: how the light is angled, and where it glints, which separates a surface from an atmosphere from a sea. None of this waits on the sky; the work is all inference, quick to finish and dear to run.",
  "listen-off-axis":
    "A beam aimed elsewhere still spills at its edges, and the spill is in the archive under the noise. The spend pulls the sidelobes out to see what shape they make and where the axis points. Digging under the noise is heavy work, and every bit of it is done on spill already collected.",
};
