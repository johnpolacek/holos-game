// How each bought question is actually answered — the paragraph the drill-in
// on an OPEN QUESTIONS row reads before the spend.
//
// PRESENTATION, NOT TRUTH. This is a fixed gloss of an instrument's method,
// keyed by QuestionId and identical for every source, every class and every
// player. Nothing here is derived from a civ, a sky or a study, so it can
// never leak occupancy: it says what the question COULD distinguish and how,
// never what it found. The server stays the one source of truth for
// everything that varies — cost, clock, `separates`, the finding itself —
// and none of that lives here.
//
// THE PREMISE, RESTATED ONCE PER QUESTION (questions.ts's header,
// observatory-design.md § "Questions — the verb"): no new hardware and no
// launch. The photons are already home and already logged; what is finite is
// the capacity to reason about them. So every paragraph opens on what the
// archive already holds and then names the inference the compute buys.
//
// EACH PARAGRAPH ALSO ANSWERS ITS OWN PRICE TAG. The catalog's costs and
// clocks encode one rule: patience is cheap and haste is dear. A question
// that must wait for the record to lengthen (a cooling curve, a schedule of
// crossings) thinks little and waits long; a question that brute-forces
// light already in hand (polarization, lines) answers fast and spends deep.
// The closing sentence of each paragraph says which kind this one is and
// why, so the COST and ANSWERS IN rows under it read as physics rather
// than as arbitrary constants. NO DIGITS in these sentences, ever: the
// numbers shown beside them are effective (project discounts and haste
// apply), so a literal "twelve years" here could be made a lie by a
// landed project.
//
// Register: observatory deadpan, wit 0 (prose-style.md §2's studyboard row).

import type { QuestionId } from "@holos/protocol";

export const QUESTION_METHOD: Readonly<Record<QuestionId, string>> = {
  "weigh-it":
    "Years of the source's position, and of the starlight passing behind it, are already in the record. Solving it for a mass is the expensive part; the mass is then set against the heat. The clock is the orbit's own: a wobble gives up a mass only after enough of its swing has been watched.",
  "temperature-over-time":
    "Every arrival of this light was logged with its temperature. The spend re-reduces the whole record into one cooling curve, and asks whether the curve bends the way an unattended body's bends. The thinking is light and the wait is long, because a curve is only as honest as its span: drift shows slowly, and holding steady proves itself only over time.",
  "read-its-lines":
    "The light is already in hand; splitting it into lines is not. The spend takes the accumulated spectra apart and matches each line against what rock, air, life, and industry are known to leave. Nothing here waits on new light, so the answer comes quickly; matching every line against every catalog is what runs deep.",
  "time-its-shadows":
    "Every dimming this source has shown is already logged. The spend fits them all to one schedule of depth, spacing and drift, and asks whether an orbit can account for the timing. A schedule proves itself only across many crossings, so the fit is cheap and the clock waits on the crossings.",
  "catch-its-edges":
    "Polarization is recorded along with everything else and almost never read. The spend reads it: how the light is angled, and where it glints, which separates a surface from an atmosphere from a sea. Almost none of this waits on the sky; the work is nearly all inference, quick to finish and dear to run.",
  "listen-off-axis":
    "A beam aimed elsewhere still spills at its edges, and the spill is in the archive under the noise. The spend pulls the sidelobes out to see what shape they make and where the axis points. Digging under the noise is heavy work, and the shape firms up only as more of the spill arrives.",
};
