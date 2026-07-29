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
// Register: observatory deadpan, wit 0 (prose-style.md §2's studyboard row).

import type { QuestionId } from "@holos/protocol";

export const QUESTION_METHOD: Readonly<Record<QuestionId, string>> = {
  "weigh-it":
    "Years of the source's position, and of the starlight passing behind it, are already in the record. Solving it for a mass is the expensive part; the mass is then set against the heat.",
  "temperature-over-time":
    "Every arrival of this light was logged with its temperature. The spend re-reduces the whole record into one cooling curve, and asks whether the curve bends the way an unattended body's bends.",
  "read-its-lines":
    "The light is already in hand; splitting it into lines is not. The spend takes the accumulated spectra apart and matches each line against what rock, air, life, and industry are known to leave.",
  "time-its-shadows":
    "Every dimming this source has shown is already logged. The spend fits them all to one schedule of depth, spacing and drift, and asks whether an orbit can account for the timing.",
  "catch-its-edges":
    "Polarization is recorded along with everything else and almost never read. The spend reads it: how the light is angled, and where it glints, which separates a surface from an atmosphere from a sea.",
  "listen-off-axis":
    "A beam aimed elsewhere still spills at its edges, and the spill is in the archive under the noise. The spend pulls the sidelobes out to see what shape they make and where the axis points.",
};
