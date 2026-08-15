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
// shallow and cheap. The spend sentence of each paragraph names the work,
// which is where the depth is, and the two questions that lean hardest on a
// span of record close on what happens when the record is genuinely too
// short: the answer says so in words, which is the honest thing an
// instrument can report and the only thing the plateau gates ever do. Under
// the flat-terse walls (§2: 24 words, aim 16) that is all a paragraph has
// room for. NO DIGITS in these sentences, ever: the
// cost shown beside them is effective (project discounts apply), so a
// literal number here could be made a lie by a landed project.
//
// Register: observatory deadpan, wit 0 (prose-style.md §2's studyboard row).

import type { QuestionId } from "@holos/protocol";

export const QUESTION_METHOD: Readonly<Record<QuestionId, string>> = {
  "weigh-it":
    "Years of the source's position are already logged. The spend solves them for a mass, set against the heat.",
  "temperature-over-time":
    "Every arrival's temperature is already logged. The spend reduces them to one cooling curve. Too short a record, and it says so.",
  "read-its-lines":
    "The light is already in hand; splitting it is not. The spend matches its lines against rock, air, life and industry.",
  "time-its-shadows":
    "Every dimming is already logged. The spend fits them to one schedule and looks for an orbit. Too few crossings, nothing fits.",
  "catch-its-edges":
    "Polarization is already recorded and almost never read. The spend reads it: angle and glint separate surface from atmosphere from sea.",
  "listen-off-axis":
    "A beam aimed elsewhere still spills, already archived under the noise. The spend digs it out to find the axis.",
};
