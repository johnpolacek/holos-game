// How each bought question is actually answered — the two paragraphs the
// drill-in on an OPEN QUESTIONS row reads before the spend.
//
// PRESENTATION, NOT TRUTH. This is a fixed gloss of an instrument's method,
// keyed by QuestionId and identical for every source, every class and every
// player. Nothing here is derived from a civ, a sky or a study, so it can
// never leak occupancy: it says what the question COULD distinguish and how,
// never what it found. The server stays the one source of truth for
// everything that varies — cost, `separates`, `leansOn`, the finding itself —
// and none of that lives here.
//
// THE PREMISE, RESTATED ONCE PER QUESTION (questions.ts's header,
// observatory-design.md § "Questions — the verb"): no new hardware and no
// launch. The photons are already home and already logged; what is finite is
// the capacity to reason about them.
//
// TWO BLOCKS, AND THEY SPLIT THAT PREMISE IN HALF (build-instruments.md
// decision 6). `running` is ALREADY RUNNING: what the standing read produces
// for free on this question, and the exact point where it stops. `buys` is
// WHAT THE SPEND BUYS: the reconstruction the compute pays for, and why that
// work is what it costs. The drill-in renders them in that order, then the
// server's `separates` chips, then LEANS ON — the axes the question is
// limited by, resolved to their labels through the welcome catalog. There is
// deliberately NO "where the spend buys nothing" block: a plateau finding
// already says so, as an answer, in the year it happens.
//
// EACH PAIR ALSO ANSWERS ITS OWN PRICE TAG. There is no clock to explain: a
// question answers the year it is bought, because the archive is continuous
// and already spans millennia when the spend is made (physics-audit.md
// P0-1). So the only number under the pair is the cost, and the cost is
// inference depth — matching every line against every catalog runs deep and
// prices dear; fitting a schedule of crossings is shallow and cheap. `buys`
// names the work, which is where the depth is, and closes on why it prices
// where it does.
//
// THE WALL (§2): each block 60 words, aim 40, observatory deadpan, wit 0.
// NO DIGITS in either sentence, ever: the cost shown beside them is
// effective (project discounts apply), so a literal number here could be
// made a lie by a landed project, and a depth stated as "the deep end" stays
// true under every discount. Constants of nature, if one is ever needed, are
// spelled in words the way the project blocks spell them.
//
// Register: observatory deadpan, wit 0 (prose-style.md §2's studyboard row).

import type { QuestionId } from "@holos/protocol";

export const QUESTION_METHOD: Readonly<
  Record<QuestionId, { readonly running: string; readonly buys: string }>
> = {
  "weigh-it": {
    running:
      "The source's position is logged at every epoch and fitted, cheaply, as one body swinging around one center. That gives a mass with everything unmodelled folded into it, which is a mass you cannot set against a heat.",
    buys: "Mass is a motion, and the motion is a small fraction of what the array can resolve, spread across epochs that were never registered to each other. The spend puts every epoch in one frame and solves the wander jointly rather than in turn. One fit, many epochs: dearer than a curve, cheaper than a search.",
  },
  "temperature-over-time": {
    running:
      "Total power in a band, epoch by epoch, with the star suppressed just enough to leave what is beside it. Nothing here needs a phase, so samples of this kind simply add.",
    buys: "A joint solution in place of a sequence of averages. The spend suppresses the star properly at every epoch, then fits the whole run at once for emissivity, thermal mass, rotation and orbit. Few unknowns and no bank to build, which is why it prices at the shallow end.",
  },
  "read-its-lines": {
    running:
      "One broad band, reconstructed once, kept current. Enough to place the source in a class. Not enough to name anything in it.",
    buys: "A spectrum is not one reconstruction. It is one per channel, each with its own deconvolution and its own starlight suppression, and then a search across compositions in which every candidate has to be radiated through a model atmosphere before it can be scored at all. Two costs multiplied, which is why it prices at the deep end.",
  },
  "time-its-shadows": {
    running:
      "When the array happens to be on the source, a fall in brightness is timed and filed with its depth. What comes out is a list of events in the order they were caught. Nothing in the list says which of them are the same body coming around again.",
    buys: "The spend folds the whole record against every plausible period in turn and scores each fold on depth and duration together, until one schedule accounts for the list or none does. Few unknowns and a shallow search, which is why it prices low. Too few crossings and nothing is preferred, and the answer says so.",
  },
  "catch-its-edges": {
    running:
      "Polarization arrives with everything else and is recorded with everything else. The standing read averages it away, because an average over the whole orbit and the whole band is the same number for a sea, a desert and a cloud.",
    buys: "Glint is a geometry: the fraction of light that comes back polarized depends on phase angle, and one angle tells nothing. The spend reconstructs the source separately at each angle the record holds, then fits surface, atmosphere and liquid against the whole sweep. Many reconstructions, each of them faint, which is the price.",
  },
  "listen-off-axis": {
    running:
      "The array's pairs are correlated as the light lands, and the standing read stacks them without regard to phase. That is cheap, and it costs: added that way, a million samples are worth a thousand.",
    buys: "Stacked in phase they are worth all million, which needs every sample's phase across centuries, through the source's own motion and the medium in between. Nobody has that. The spend builds a bank of trial phase models, restacks the whole archive under each, and keeps the one that lights up. The bank is the price.",
  },
};
