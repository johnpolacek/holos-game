// THE OBSERVATORY — the inference workbench, a Desk panel (Act 3, slice
// A2.1: read-only).
// A DOM overlay (not canvas) that lists open/shelved studies and, per study,
// shows the current hypothesis reading derived from delayed light
// (StudySnapshot; see server/src/protocol.ts). The visual target for the
// focused study is docs/concepts/03-03-case-board.png.
//
// Two adopted build notes, load-bearing for this slice:
//   - The confidence marker renders as a GLOW, never a knob/handle. The
//     hypothesis "bars" are a view of a share, not a control — nothing here
//     is draggable, nothing is an input.
//   - The OPEN QUESTIONS section ships its layout (a reserved, empty
//     container) but renders nothing in A2.1: `StudySnapshot.openQuestions`
//     is always `[]` this slice, and nothing is buyable yet. The art's
//     allocation strip (labelled INSTRUMENT ALLOCATION in the image brief,
//     denominated in compute since — see projects.ts) is A2.2 entirely and
//     does not appear here.
//
// Register: observatory deadpan, wit 0, no exclamation marks. Soft past
// tense for remote facts — every one wears its light-age. NEVER cyan inside
// the panel: cyan is the present tense and your own works, and everything
// this surface shows is remote and old, so it is all amber/ink.
//
// Three exceptions, and they prove the rule — every one of them is
// present-tense and yours. The Tend chip out on the sky is chrome, not panel,
// and what it opens is the list of YOUR work. The HOME end of the briefing's
// starmap is your own star, charted so the source's distance reads as
// geometry; the deeper rule (cyan = you / amber = other) wins there, because
// an amber HOME would say "someone else".
//
// A4 adds the third and it is the same argument one act on: THE CHARTER
// COMPOSER is the one surface in this panel that is being WRITTEN rather than
// read. The notch under the thumb and the bloom that closes the commit are
// the player's own act happening now, on the inheritance card's own
// furniture, where cyan has always meant exactly that (ceremony.ts's dial
// marker, BECOME's bloom). The PARENT'S position behind the notch stays gold:
// it is a record and not a live control. Everything else the sheet renders —
// including every line of the forecast, which is a guess about a place nobody
// has been — stays amber and ink. Nothing else may follow them.

import type {
  StudySnapshot,
  StudyStatus,
  DetectedSource,
  Hypothesis,
  HypothesisId,
  HypothesisMenus,
  ProjectSnapshot,
  ComputeBudget,
  OpenQuestion,
  MissionSnapshot,
  MissionCatalog,
  MissionKind,
  MissionKindDef,
  CharterClauseDef,
  CharterClauseId,
  WorkState,
  TendRow,
  TripwireKind,
  ReportPayload,
  ReportEntry,
  ReportRoute,
  Proposal,
  ProposalRoute,
  ContactWire,
  ThreadSummary,
  ThreadDetail,
  ThreadSignal,
  ThreadState,
  SelfView,
  Star,
  CohortErrorCode,
  EmissionEpoch,
  // ── A2.6: the composed-signal grammar ──
  // Every one of these is a TYPE. `TONE_STAMP` is deliberately not among the
  // protocol module's re-exports: the stamp strings are chrome, and chrome is
  // the client's (the TRIPWIRE_LABEL precedent), so they are authored below.
  AccordMove,
  ArchivePart,
  ArchiveSample,
  ArchiveWindow,
  CulturePart,
  FindingDepth,
  FindingPart,
  PartKind,
  PartRef,
  RequestPart,
  RequestWant,
  SightingPart,
  SignalPart,
  SignalTone,
  VerdictPart,
  VerdictStance,
  // ── A4: the launch side ──
  // Every one of these is a TYPE. The catalogs themselves ride the wire
  // (`welcome.voyageCatalog`), so no ship table and no clause table ships in
  // this bundle — the MissionCatalog precedent, one act on.
  DialAxisId,
  DialSheet,
  PriorBand,
  SurveyRow,
  VoyageCatalog,
  VoyageClauseDef,
  VoyageClauseGroupId,
  VoyageClauseId,
  VoyageKind,
  VoyageKindDef,
  VoyageSnapshot,
  VoyageWorkState,
  WidthChip,
  WorldClass,
  // ── A4: the aftermath ──
  // THE LEDGER's vocabulary and the standing-order catalog's, types only, on
  // the launch side's exact terms: the wire carries the row, the band word and
  // the class id, and every rendering of any of them is authored below.
  DriftBand,
  DriftReading,
  DriftVia,
  LedgerRow,
  LedgerRowState,
  LedgerWire,
  LineageThreadState,
  OrderOutcome,
  StandingOrderWire,
} from "@holos/protocol";
// The dial vocabulary: the ONE runtime value the protocol module exports for
// rendering (protocol.ts's own comment says so). The composer needs it to
// name which dial a `culture{dial}` selector points at, and dials.ts imports
// nothing and carries no truth.
import { DIAL_AXES } from "@holos/protocol";
// A4: the founding's one piece of free text goes through the same guard the
// ceremony's does, so a name the server will refuse is refused here first.
import { MAX_NAME_LEN, validateName } from "@holos/protocol";
// A4: BECOME'S OWN DIAL BAND, rendered in reverse. The charter composer draws
// its five rows with the ceremony's function rather than a copy of it — the
// card you inherit and the card you write are the same furniture, and a second
// implementation would let the two drift apart.
import { renderDialBand } from "./ceremony";
import type { CohortSocket } from "./net";
import { startOver } from "./startover";
import { QUESTION_METHOD } from "./questionmethod";
import { CLASS_LABEL } from "./sourcecard";
import { accordFlightLine, accordHeadline, accordLightLine } from "./accord";
// A5: the watch. Everything about a subscription lives in push.ts; this panel
// owns the row, the sheet and the moment the ask is spent.
import {
  disableWatch,
  enableWatch,
  markWatchAsked,
  pushCapability,
  watchAsked,
  watchOnThisDevice,
} from "./push";
import {
  formatAbsoluteYear,
  formatClockPair,
  formatCountdown,
  formatGameYears,
  formatRealDuration,
  nowYear,
  realMsForYears,
} from "./clock";
// Inlined at build time rather than fetched: one more request for a 400-byte
// mark is a request the sky does not need, and the markup carries
// fill="currentColor", so the icon takes the chip's ink — including the
// glare-mode bump — without a second color declaration anywhere.
import treeViewIcon from "@phosphor-icons/core/assets/light/tree-view-light.svg?raw";

const SWIPE_CLOSE_PX = 56;

/** How long a shout holds the channel, in game years — contact.ts's
 *  BROADCAST_SHOUT_YEARS, spelled as chrome. The wire carries no such
 *  number (there are no free numbers on it), so a retune there retunes this;
 *  being wrong costs one refused tap and nothing else. */
const BROADCAST_WINDOW_YEARS = 24;

const WORK_STATE_LABEL: Record<WorkState, string> = {
  watching: "WATCHING",
  "in-hand": "IN HAND",
  "in-flight": "IN FLIGHT",
  "beyond-horizon": "BEYOND THE HORIZON",
  "awaiting-light": "AWAITING LIGHT",
  returned: "RETURNED",
  silent: "SILENT",
  standing: "STANDING",
};

// A2.3: the chrome (client-side, per protocol.ts's tripwires comment) named
// beside each of the three always-present kinds, in wire order. The 70% is
// studies.ts's CROSS_SHARE spelled as chrome: the wire deliberately carries
// no threshold (no free numbers), so a retune of CROSS_SHARE must retune
// this label with it.
const TRIPWIRE_LABEL: Record<TripwireKind, string> = {
  regress: "IF IT REGRESSES",
  "leakage-stops": "IF THE LEAKAGE STOPS",
  crosses: "IF BELIEF CROSSES 70%",
};

const TRIPWIRE_STATE_LABEL: Record<"available" | "armed" | "tripped", string> = {
  available: "ARM",
  armed: "ARMED",
  tripped: "TRIPPED",
};

// ── A4: the launch side, as chrome ───────────────────────────────────────
//
// Every string below is the client's own (the TRIPWIRE_LABEL precedent): the
// wire carries the state id, the class id and the band word, and never a
// rendering of any of them. Nothing here is derived from a number the server
// did not send.

/**
 * A voyage's true state, in the work list. The Tend row's own `state` is
 * NARROWED to WorkState by tend.ts (four terminal words collapse to
 * "returned") so the chip table stayed total while this surface was unbuilt;
 * the real word rides the VoyageSnapshot, and this is the table that reads it.
 * `beyond-horizon` is the one that gets its own wording rather than the
 * mission's: what a founding falls out of is amendment, not sight.
 */
const VOYAGE_STATE_LABEL: Record<VoyageWorkState, string> = {
  "in-flight": "IN FLIGHT",
  "beyond-horizon": "BEYOND AMENDMENT",
  "awaiting-light": "AWAITING LIGHT",
  founded: "FOUNDED",
  unrooted: "UNROOTED",
  silent: "SILENT",
  dark: "DARK",
};

/** The four charter groups, each said as the question it answers. The wire
 *  carries the group id and the clause prose; the question above them is the
 *  client's own framing of what is being decided. */
const VOYAGE_GROUP_LABEL: Record<VoyageClauseGroupId, string> = {
  founding: "WHAT THEY DO WITH THE WORLD",
  posture: "WHETHER THEY CAN BE SEEN",
  "signal-plan": "WHETHER THEY WRITE HOME",
  "on-hail": "WHAT THEY SAY IF HAILED",
};

/**
 * The two groups a charter is not a charter without — voyages.ts's
 * REQUIRED_VOYAGE_GROUPS, spelled as chrome. The wire deliberately carries no
 * such list (it carries the counts and nothing else), so this is the
 * BROADCAST_WINDOW_YEARS arrangement exactly: a retune there retunes this, and
 * being wrong costs one refused tap and nothing else, because
 * `validateVoyageCharter` re-checks server-side regardless.
 */
const REQUIRED_VOYAGE_GROUPS: readonly VoyageClauseGroupId[] = ["founding", "posture"];

/** The three destination classes, in the order the survey sends them. */
const WORLD_CLASS_LABEL: Record<WorldClass, string> = {
  barren: "BARREN",
  marginal: "MARGINAL",
  living: "LIVING",
};

/** A prior as a word, because that is how it arrives: bands and never
 *  percentages, so nothing on this surface can dress a guess as a reading. */
const PRIOR_BAND_LABEL: Record<PriorBand, string> = {
  unlikely: "UNLIKELY",
  possible: "POSSIBLE",
  likely: "LIKELY",
};

/** How far a band's bar runs. Three steps for three words: the bar is a
 *  rendering of the ORDINAL the wire sent, and there is no fourth position it
 *  could take that would mean anything. */
const PRIOR_BAND_FILL: Record<PriorBand, number> = {
  unlikely: 1 / 3,
  possible: 2 / 3,
  likely: 1,
};

/** How tight the forecast is. The wire's own three words. */
const WIDTH_CHIP_LABEL: Record<WidthChip, string> = {
  NARROW: "NARROW",
  WIDE: "WIDE",
  WIDEST: "WIDEST",
};

/**
 * A4: how long a press must survive to send an Endeavor. The choice
 * ceremony's HOLD_MS, sized to a sheet rather than the sky: the gesture is
 * the same promise (an irreversible act is made by HOLDING, not by tapping),
 * and it is shorter here only because there is no beam to walk out while it
 * runs. A seedship is an Investment and commits on a tap.
 */
const VOYAGE_HOLD_MS = 1600;
/** The commit beat, reused wholesale from BECOME (style.css's holos-bloom). */
const VOYAGE_COMMIT_MS = 1100;

// ── A4: THE LEDGER and the standing order, as chrome ─────────────────────
//
// The launch side's rule one act on, and it matters more here than anywhere:
// the wire sends a STATE ID, a BAND WORD and a THREAD WORD, and every string
// below is the client's own rendering of one of them. Nothing here is derived
// from a number the server did not send, and there is no line below that says
// how far a child has drifted — the band is a word, and a distance would be a
// measurement nobody took.
//
// NO CYAN ANYWHERE IN THE LEDGER. A child is not you: it was written by this
// civilization and it has been out of reach since the year it was written, so
// it is old light like everything else on this sheet (a4-ledger-note.md §5.3).
// The one cyan exception this panel has — the charter composer, the act being
// written now — does not extend to reading what became of it.

/** Where a founding stands, in the parent's own frame. Four words, and none
 *  of them claims anything about the far end that light has not carried:
 *  DARK is a statement about a silence here, not about a death there. */
const LEDGER_STATE_LABEL: Record<LedgerRowState, string> = {
  outbound: "OUTBOUND",
  "awaiting-light": "AWAITING LIGHT",
  rooted: "ROOTED",
  dark: "DARK",
};

/** The drift band, as a WORD. Never a percentage and never a bar: the band is
 *  a tally over dated observations and the sample line beside it is the whole
 *  of what can honestly be said about how much it rests on. */
const DRIFT_BAND_LABEL: Record<DriftBand, string> = {
  unread: "UNREAD",
  close: "CLOSE",
  kindred: "KINDRED",
  estranged: "ESTRANGED",
  independent: "INDEPENDENT",
};

/** Where the lineage conversation stands. One word, no meter, no count —
 *  a thread is not a scoreboard (a4-ledger-note.md §1.3). */
const LINEAGE_THREAD_LABEL: Record<LineageThreadState, string> = {
  unopened: "UNOPENED",
  alive: "ALIVE",
  faded: "FADED",
  silent: "SILENT",
};

/** Which channel a reading came down. Two very different claims: one is what
 *  their sky looked like, the other is what they said about themselves. */
const DRIFT_VIA_LABEL: Record<DriftVia, string> = {
  light: "BY LIGHT",
  stated: "IN THEIR OWN WORD",
};

/** Whether the charter's lean survived the reading. */
const DRIFT_AGREE_LABEL: Record<"agrees" | "disagrees", string> = {
  agrees: "AGREES",
  disagrees: "DISAGREES",
};

const ORDER_STATE_LABEL: Record<StandingOrderWire["state"], string> = {
  available: "NOT ARMED",
  armed: "ARMED",
  fired: "FIRED",
};

/** What a fire actually did. All three are records and none of them is a
 *  failure to clean up: an order that could not be paid for is spent, and the
 *  arming is spent with it. */
const ORDER_OUTCOME_LABEL: Record<OrderOutcome, string> = {
  launched: "LAUNCHED",
  unaffordable: "COULD NOT BE PAID FOR",
  blocked: "BLOCKED",
};

/**
 * A2.5: how a thread's state reads, on the hub row and again in the thread's
 * own header. The chrome is the client's (the TRIPWIRE_LABEL precedent) —
 * the wire carries the state id and no wording.
 *
 * `unopened` cannot be reached from buildThreads (a pair with nothing either
 * way is not built at all) and is carried only to keep the map total against
 * ThreadState.
 */
const THREAD_STATE_LABEL: Record<ThreadState, string> = {
  unopened: "UNOPENED",
  "in-flight": "IN FLIGHT",
  awaiting: "AWAITING",
  answered: "ANSWERED",
  silent: "SILENT",
  withdrawn: "WITHDRAWN",
};

/**
 * The silence, authored and pinned here rather than sent. It is a statement
 * about YOUR OWN arithmetic — the round trip plus a bound on deliberation
 * that is the same for every counterpart — and never about them, which is
 * exactly why it can be a client string at all.
 */
const THREAD_SILENT_LINE =
  "The window in which an answer could have arrived has passed. Nothing came.";

// ── A2.6: the composed signal, as chrome ─────────────────────────────────
//
// FREEFORM IS RETIRED. Nothing below is a text field, and the phone keyboard
// never opens on this surface: a signal is assembled from SELECTORS, the
// server materializes every part from the sender's own state, and the client
// only ever points. Every string in this block is the client's own chrome, in
// the ALL CAPS stamp register, on the terms protocol.ts states where it
// declines to export `TONE_STAMP`.

/**
 * How a tone reads on the stamp: a PROPERTY OF THE BEAM, never a feeling.
 * `plain` renders NOTHING AT ALL, and the absence is the content — the gift
 * that arrives without comment is told so by the missing row.
 */
const TONE_STAMP: Readonly<Record<SignalTone, string | null>> = {
  plain: null,
  open: "REPEATED IN THE CLEAR",
  guarded: "NARROW, FOR ONE RECEIVER",
  urgent: "MARKED FOR IMMEDIATE READING",
  reluctant: "ONE PASS, AT LOW POWER",
};

/** The composer's five tone chips, in the order they are offered. */
const TONE_ORDER: readonly SignalTone[] = ["plain", "open", "guarded", "urgent", "reluctant"];

const TONE_CHIP: Readonly<Record<SignalTone, string>> = {
  plain: "PLAIN",
  open: "OPEN",
  guarded: "GUARDED",
  urgent: "URGENT",
  reluctant: "RELUCTANT",
};

/** The source chips, row one of the composer. In-world names for what a part
 *  IS, never the wire's kind ids: a player picks COORDINATES, not "sighting". */
const SOURCE_CHIP: Readonly<Record<PartKind, string>> = {
  finding: "FINDING",
  sighting: "COORDINATES",
  archive: "LIGHT RECORD",
  culture: "WHO WE ARE",
  request: "ASK",
  verdict: "ANSWER",
  accord: "THE QUIET",
};

const SOURCE_CHIP_ORDER: readonly PartKind[] = [
  "finding",
  "sighting",
  "archive",
  "culture",
  "request",
  "verdict",
  "accord",
];

/**
 * CANONICAL PART ORDER and the per-kind caps, both spelled here as chrome:
 * the server imposes the order at materialization and enforces the caps with
 * `bad-signal`, and the wire carries neither number (there are no free
 * numbers on it). A retune there retunes these; being wrong costs one refused
 * tap, or a preview whose blocks stand in a different order than the ones
 * that land, and nothing else. The BROADCAST_WINDOW_YEARS precedent.
 */
const PART_ORDER: readonly PartKind[] = [
  "sighting",
  "finding",
  "archive",
  "culture",
  "request",
  "verdict",
  "accord",
];

const PER_KIND_CAP: Readonly<Record<PartKind, number>> = {
  finding: 1,
  sighting: 1,
  archive: 2,
  culture: 1,
  request: 1,
  verdict: 2,
  accord: 1,
};

/** Parts per signal. ZERO IS LEGAL: a carrier is a beam with nothing on it,
 *  arriving dated, and it is the "still here" primitive. */
const MAX_PARTS_PER_SIGNAL = 4;

/** The archive window spans and the downsample width, same terms as the caps
 *  above — signalparts.ts owns them, and this is the preview's copy so the
 *  sparkline a player composes against is the one that will land. */
const ARCHIVE_WINDOW_YEARS: Readonly<Record<ArchiveWindow, number>> = {
  recent: 500,
  long: 8000,
};
const ARCHIVE_SAMPLES = 12;

/** The two archive windows, named for what they are FOR rather than by their
 *  spans: the span is on the block once it renders. */
const ARCHIVE_WINDOW_CHIP: Readonly<Record<ArchiveWindow, string>> = {
  recent: "RECENT",
  long: "THE LONG RECORD",
};

/** The omission lever, said out loud: a headline finding is a claim with its
 *  working left out, and the reader can see that it was left out. */
const FINDING_DEPTH_CHIP: Readonly<Record<FindingDepth, string>> = {
  full: "WITH THE WORKING",
  headline: "THE HEADLINE ONLY",
};

const WANT_CHIP: Readonly<Record<RequestWant, string>> = {
  finding: "A FINDING",
  sighting: "COORDINATES",
  archive: "A LIGHT RECORD",
  culture: "WHO THEY ARE",
};

const WANT_ORDER: readonly RequestWant[] = ["finding", "sighting", "archive", "culture"];

/** What a verdict says, on the block. A verdict is a reading of one's own
 *  record against somebody else's claim, so it speaks about the record. */
const STANCE_LINE: Readonly<Record<VerdictStance, string>> = {
  confirm: "OUR RECORD AGREES",
  contradict: "OUR RECORD DISAGREES",
  nothing: "OUR RECORD SAYS NOTHING",
};

const STANCE_CHIP: Readonly<Record<VerdictStance, string>> = {
  confirm: "CONFIRM",
  contradict: "CONTRADICT",
  nothing: "NOTHING TO SAY",
};

const STANCE_ORDER: readonly VerdictStance[] = ["confirm", "contradict", "nothing"];

const ACCORD_MOVE_CHIP: Readonly<Record<AccordMove, string>> = {
  offer: "OFFER THE QUIET",
  accept: "ACCEPT IT",
  decline: "DECLINE IT",
  withdraw: "WITHDRAW FROM IT",
};

const ACCORD_MOVE_LINE: Readonly<Record<AccordMove, string>> = {
  offer: "THE QUIET, OFFERED",
  accept: "THE QUIET, ACCEPTED",
  decline: "THE QUIET, DECLINED",
  withdraw: "THE QUIET, WITHDRAWN",
};

/** The turnaround floor, stated flat. NO COUNTDOWN, deliberately: a countdown
 *  would be a number about how long ago their beam landed, and the floor is
 *  the same on every thread precisely so that it says nothing about who is at
 *  the other end. */
const TURNAROUND_FLOOR_LINE = "The beam is still being read.";

/** How long that line stands before the composer comes back. Real seconds,
 *  not game years: it is a note about the last tap, not about the sky. */
const TURNAROUND_NOTICE_MS = 9000;

/** Evidence ids a full finding travels with, signalparts.ts's cap. Only the
 *  COUNT is ever rendered, so being one out costs a preview reading "6" where
 *  the block will read "6" anyway; it is pinned for the same reason the
 *  windows above are. */
const MAX_EVIDENCE_PER_FINDING = 6;

/**
 * The accord part's own shape. protocol.ts re-exports the other six part
 * types by name and not this one, so it is narrowed out of the union rather
 * than reached for across the boundary — the union IS the contract, and
 * `Extract` cannot drift from it.
 */
type AccordPart = Extract<SignalPart, { kind: "accord" }>;

/**
 * What a part block needs to know about the beam carrying it: whose it is,
 * how far it crossed, when it lands, and whether it has. The ages on a block
 * are read against different presents depending on that last flag — see
 * `partAgeText`.
 */
interface PartContext {
  readonly mine: boolean;
  readonly transitYears: number;
  readonly arrivesYear: number;
  readonly landed: boolean;
}

/** Emission at a year, as a step function over an epoch list — the knowledge
 *  layer's own `emissionAt`, re-read here over histories that are ALREADY on
 *  this client's wire (the player's own seed, or a source's observed history
 *  clipped at its light-departure year). It reaches nothing it was not given. */
function emissionAtYear(history: readonly EmissionEpoch[], year: number): number {
  let level = 0;
  for (const epoch of history) {
    if (epoch.fromYear <= year) level = epoch.level;
    else break;
  }
  return level;
}

/** ARCHIVE_SAMPLES evenly spaced reads, oldest first, levels frozen at two
 *  decimals: the composer's preview of the downsample the server will freeze
 *  into the part. Deterministic, so the same window taken twice is the same
 *  curve. */
function sampleWindow(
  history: readonly EmissionEpoch[],
  fromYear: number,
  toYear: number,
): readonly ArchiveSample[] {
  const step = (toYear - fromYear) / (ARCHIVE_SAMPLES - 1);
  const out: ArchiveSample[] = [];
  for (let i = 0; i < ARCHIVE_SAMPLES; i++) {
    const year = fromYear + step * i;
    out.push({ year, level: Math.round(emissionAtYear(history, year) * 100) / 100 });
  }
  return out;
}

/** A2.3: the three exits `isClosed` covers server-side (studies.ts). Kept as
 *  its own client-side check rather than importing the server helper — the
 *  board never imports studies.ts — so grounded/called/overtaken read
 *  questions and tripwires the same inert way; shelved stays live (buying a
 *  question or arming a tripwire while shelved is exactly what reopens it,
 *  the existing grounded-only gate's precedent generalized). */
function isClosedStudyStatus(status: StudyStatus): boolean {
  return status === "grounded" || status === "called" || status === "overtaken";
}

// The Tend/mission-detail absolute-year chrome ("Y1204") moved to clock.ts
// in A2.4: the choice ceremony stamps arrival years out on the sky and the
// two surfaces must render the same date the same way.

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Archive entries can run into the thousands of years, so from 100 up we
 *  round to a whole year and add thousands separators (`9,016`); below that
 *  the one-decimal reading stays, matching the header sentence's precision. */
function formatArchiveAge(years: number): string {
  if (years >= 100) return Math.round(years).toLocaleString("en-US");
  return years.toFixed(1);
}

/** The hypothesis with the largest share (ties keep the first encountered,
 * i.e. wire order). Undefined only if the menu is empty. */
function leadingHypothesis(hyps: readonly Hypothesis[]): Hypothesis | undefined {
  let best: Hypothesis | undefined;
  for (const h of hyps) {
    if (best === undefined || h.share > best.share) best = h;
  }
  return best;
}

/**
 * Largest-remainder rounding: shares sum to 1 (protocol.ts's invariant), so
 * the floored percentages sum to at most 100; the remainder is handed out,
 * one point each, to the entries with the largest fractional remainder —
 * so the displayed integers always sum to exactly 100.
 */
function hypothesisPercentages(
  hyps: readonly Hypothesis[],
): ReadonlyMap<HypothesisId, number> {
  const floors = hyps.map((h) => {
    const exact = h.share * 100;
    const floor = Math.floor(exact);
    return { id: h.id, floor, rem: exact - floor };
  });
  const flooredTotal = floors.reduce((sum, f) => sum + f.floor, 0);
  const remainder = Math.max(0, Math.round(100 - flooredTotal));

  const result = new Map<HypothesisId, number>();
  for (const f of floors) result.set(f.id, f.floor);

  const byRemainder = [...floors].sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remainder; i++) {
    const entry = byRemainder[i];
    if (entry === undefined) break;
    result.set(entry.id, (result.get(entry.id) ?? 0) + 1);
  }
  return result;
}

// ── A2.6: durable identity, as chrome ────────────────────────────────────
// The hub row and the key sheet. Everything a claim/reveal needs beyond the
// wire's `key`/`fresh` pair is authored here — the client never imports
// server/src/accounts.ts (CLAUDE.md's protocol-only boundary), so the display
// grouping is a deliberate, small duplication rather than a shared import.

/** Mirrors server/src/accounts.ts's `formatAccountKey` exactly: four
 *  hyphen-separated groups of five. The wire always carries the bare 20
 *  symbols; this is the one place the client puts the breaks back in. */
function formatAccountKeyDisplay(key: string): string {
  const groups: string[] = [];
  for (let i = 0; i < key.length; i += 5) groups.push(key.slice(i, i + 5));
  return groups.join("-");
}

/** The hidden-textarea `execCommand` fallback, for a browser (or an insecure
 *  context) with no `navigator.clipboard`. Never reads the result back and
 *  never logs the text — a failed copy has nothing safe to say beyond
 *  leaving the key on screen for the player to select by hand. */
function copyAccountKeyFallback(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.append(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* Nothing safe to say; the key is still on screen to select by hand. */
  }
  ta.remove();
}

/** `navigator.clipboard` first, the fallback above second. The key is never
 *  logged on either path (accounts.ts's own rule, restated client-side). */
function copyAccountKey(text: string): void {
  try {
    if (navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch(() => copyAccountKeyFallback(text));
      return;
    }
  } catch {
    /* fall through to the fallback below */
  }
  copyAccountKeyFallback(text);
}

export class StudyBoard {
  private readonly socket: CohortSocket;
  /** Opening menu labels per signal class, from `welcome` — the briefing's
   *  "what it can tell apart". Null omits that section rather than guessing. */
  private readonly menus: HypothesisMenus | null;
  /** The launch sheet's vocabulary (kinds + charter clauses), from `welcome`
   *  like `menus`. Null omits the sheet's catalog rows rather than guessing. */
  private readonly missionCatalog: MissionCatalog | null;
  /** A4: the founding sheet's vocabulary (ship kinds, charter clauses, the
   *  dial-notch count, the cap and the occupied-risk line), from `welcome`
   *  like `missionCatalog`. Null omits the sheet rather than guessing. */
  private readonly voyageCatalog: VoyageCatalog | null;
  /** The public star catalog by id, from `welcome` like `menus` — the
   *  briefing starmap's geometry. A DetectedSource carries no position (the
   *  ObservedCiv boundary), but its STAR is public sky. */
  private readonly starsById: ReadonlyMap<string, Star>;

  private readonly root: HTMLDivElement;
  private readonly chip: HTMLButtonElement;
  /** The second standing chip, opposite + Start: everything already under
   *  way. Hidden while there is nothing to tend — a chip pointing at an
   *  empty list is noise. */
  private readonly tendChip: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly topbar: HTMLDivElement;
  private readonly body: HTMLDivElement;

  private studiesByStarId = new Map<string, StudySnapshot>();
  private sourcesByStarId = new Map<string, DetectedSource>();
  private localNames: ReadonlyMap<string, string> = new Map();
  private projects: readonly ProjectSnapshot[] = [];
  private budget: ComputeBudget = { free: 0, ratePerYear: 0, cap: 0, asOfYear: 0 };
  private missions: readonly MissionSnapshot[] = [];
  private missionsById = new Map<string, MissionSnapshot>();
  private tend: readonly TendRow[] = [];
  /** The current effective probe cruise rate (years/ly), from the latest
   *  sky — feeds the launch sheet's client-side clock preview. */
  private probeFlightYearsPerLy = 10;
  // AV3: the mind's current proposals, wholesale-replaced on every `sky` —
  // never appended, never re-sorted client-side (the server's ranked order
  // is load-bearing).
  private proposals: readonly Proposal[] = [];

  private openFlag = false;
  private view:
    | "hub"
    | "list"
    | "focused"
    | "picker"
    | "brief"
    | "explore"
    | "projects"
    | "project"
    | "tend"
    | "mission"
    | "launch"
    // ── A4 ──
    // THE SURVEY (the nearest stars and what a ship would find), and the
    // founding sheet aimed at one of them. Two views rather than a fold,
    // for the thread view's reason: the sheet is read top to bottom and the
    // charter needs the whole column.
    | "survey"
    | "voyage"
    // ── A4, the aftermath ──
    // One founding's whole record (the fork detail, opened from THE LEDGER's
    // hub section or from a report entry), and the sheet where a standing
    // order is armed. Neither is a list: the Ledger itself is a hub section,
    // because a child is a relationship and not an undertaking.
    | "fork"
    | "orders"
    | "startover"
    | "report"
    // A2.5: one thread, in full. Its own view rather than a fold inside the
    // hub — a conversation is read top to bottom, and the composer needs the
    // whole column.
    | "thread" = "list";
  private focusedStarId: string | null = null;
  private briefStarId: string | null = null;
  private focusedMissionId: string | null = null;
  // The project detail sheet: which catalog entry, and which panel the tap
  // came from — the back button returns there, so Tend, Projects and the
  // Report each get their own way in without the sheet forking.
  private focusedProjectId: string | null = null;
  // AV3: "hub" joins the return set — a proposal's `project` route opens the
  // detail sheet from the hub, so its back button must come home there.
  private projectReturn: "tend" | "projects" | "report" | "hub" = "projects";
  // AV3: same rule for the brief — a proposal's `study-brief` route opens it
  // from the hub, and backing out must come home there, not to a picker the
  // player never visited.
  private briefReturn: "picker" | "hub" = "picker";
  private openStudyCount = 0;

  // The reset's two transient bits. `pending` disables the verb for the one
  // beat between the tap and the reload (a second tap would POST a token the
  // first call is already erasing); `error` is set only when the server
  // refused, in which case the run is untouched and the tap can come again.
  private startOverPending = false;
  private startOverError: string | null = null;

  // AV3: a one-shot pointer set by focusStudyQuestion (a proposal's
  // `question` route) — the next renderFocused() scrolls the matching row
  // into view and clears this, so the 1s tick never re-scrolls the sheet
  // under the player's thumb.
  private highlightQuestionId: string | null = null;

  // The launch sheet's in-progress selection — cleared each time openLaunch
  // opens fresh (a half-written charter never survives a close/reopen).
  private launchStarId: string | null = null;
  private launchKind: MissionKind | null = null;
  private launchCharter = new Set<CharterClauseId>();

  // ── A4: the launch side ──────────────────────────────────────────────
  // The latest sky's foundings and forecast, handed over by the App just
  // before every update() (setSelf's precedent — they are sky data the
  // renderers only ever read back).
  private voyages: readonly VoyageSnapshot[] = [];
  private voyagesById = new Map<string, VoyageSnapshot>();
  private survey: readonly SurveyRow[] = [];

  // The founding sheet's in-progress charter, cleared each time
  // openVoyageLaunch opens fresh (the launch sheet's own rule: a half-written
  // charter never survives a close/reopen). It lives on the panel rather than
  // in the DOM because a `sky` rebuilds the body underneath it.
  private voyageStarId: string | null = null;
  private voyageKind: VoyageKind | null = null;
  private voyageClauses = new Set<VoyageClauseId>();
  /** One entry per axis, seeded from the PARENT'S OWN position the first time
   *  the sheet renders: a charter written without touching a dial is the
   *  charter that says "carry on as we are". */
  private voyageDials = new Map<DialAxisId, { position: number; pinned: boolean }>();
  private voyageName = "";
  /** Where BACK goes: the survey row it was opened from, or the hub (the
   *  source card's affordance closes the card and leaves nothing behind). */
  private voyageReturn: "survey" | "hub" = "hub";

  // A launchVoyage in flight, on the launchMission trio's exact shape: the
  // star plus the voyage ids already on the wire at send time, so the
  // confirming sky can pick out the ONE new founding it carries and hand
  // straight to its row in the work list.
  private pendingVoyageStarId: string | null = null;
  private pendingVoyagePriorIds: ReadonlySet<string> = new Set();
  /** The founding the confirming sky carried, waiting on the commit beat to
   *  finish before the handoff (see maybeHandoffVoyage). */
  private launchedVoyageId: string | null = null;
  /** False only while a hold's bloom is still playing. A tap commits with no
   *  bloom at all, so it is true for the whole of an Investment's flight. */
  private voyageBloomDone = true;
  /** The live press. Wall clock (performance.now) and a rAF, never a timer:
   *  a dropped frame costs fidelity and must never cost correctness on the
   *  one gesture that commits (contactceremony.ts's rule). */
  private voyageHold: {
    readonly fill: HTMLDivElement;
    readonly start: number;
    raf: number;
  } | null = null;
  /** Recomputes the commit control's label and enablement in place, so the 1s
   *  ticker can keep an accruing budget honest without re-rendering a sheet
   *  that holds a live text field and a live press. */
  private voyageCommitRefresh: (() => void) | null = null;
  /** The commit control's row, so the bloom has somewhere to mount. */
  private voyageVerbRow: HTMLDivElement | null = null;
  /** A one-shot: the next renderTend scrolls this voyage's row into view and
   *  clears it (highlightQuestionId's mold). Set by a launch's handoff and by
   *  a report entry's `voyage` route. */
  private highlightVoyageId: string | null = null;

  // ── A4: the aftermath ────────────────────────────────────────────────
  // THE LEDGER as the latest sky sent it: what became of the foundings, and
  // what the standing orders have done. Handed over just before every
  // update() (setVoyages' contract) and only ever read back.
  private ledger: LedgerWire = { rows: [], orders: [] };
  private ledgerRowsById = new Map<string, LedgerRow>();

  /** Which fork's record is on screen, and where BACK goes — the report can
   *  open one directly (a `ledger` route), so its own back leg has to come
   *  home there rather than to a hub the player never passed through
   *  (projectReturn's precedent). */
  private forkVoyageId: string | null = null;
  private forkReturn: "hub" | "report" = "hub";

  /** The arming sheet's in-progress charter — cleared each time openOrders
   *  opens fresh (the launch sheet's rule: a half-written charter never
   *  survives a close/reopen). ARMING IS THE CONSENT AND THE CHARTER IS ITS
   *  CONTENT, so this is what the arm message carries. */
  private orderCharter = new Set<CharterClauseId>();
  /** An arm/disarm in flight, by class. Released by any sky at all (the
   *  tripwire precedent: both writes are instant and a refusal comes back as
   *  an `error`, which handleServerError has already caught). */
  private pendingOrderClass: string | null = null;

  // The star a `begin the watch` is in flight for. The confirming `sky`
  // carries the new study and hands straight to the focused board — without
  // this the picker row simply vanished in place and the tap read as a
  // dead end. Cleared by any sky that does not confirm, and by any server
  // error, so the verb can never sit stuck mid-flight.
  private pendingBeginStarId: string | null = null;

  // The latest SelfView, handed over by the App just before every update()
  // — the starmap's HOME end. Null only before the first sky, when nothing
  // renders anyway; the map simply omits itself rather than guess.
  private self: SelfView | null = null;

  // A buyQuestion in flight: the study it's on plus the question id, so the
  // trio can never be mistaken for a different study's purchase. The
  // confirming sky moves the question past "offered" (studies.ts's
  // assembleQuestion); handleServerError releases it on a rejection.
  private pendingQuestion: { readonly starId: string; readonly questionId: string } | null = null;

  // The one offered question whose drill-in is open, if any. Tapping an
  // offered row expands it — the spend is the button inside the fold, never
  // the row — and a second tap folds it back. Lives on the panel, not in the
  // DOM, because renderFocused() rebuilds the whole body every second
  // (startTicking) and an expansion has to survive that. Star-scoped like
  // pendingQuestion so a stale id can never open a row on a different study.
  private expandedQuestion: { readonly starId: string; readonly questionId: string } | null = null;

  // A startProject in flight: released when the confirming sky moves the
  // project past "available" (the detail sheet then reads RUNNING with its
  // countdown — the confirmation is the state change, not a toast), or by
  // handleServerError on a rejection.
  private pendingProjectId: string | null = null;

  // A launchMission in flight: the star plus a snapshot of the mission ids
  // already on the wire at send time, so the confirming sky can pick out
  // the ONE new mission it carries (by id difference) and hand focus
  // straight to its detail view — the monitor page, same beat as
  // pendingBeginStarId's "begin the watch" → focusStudy.
  private pendingLaunchStarId: string | null = null;
  private pendingLaunchPriorMissionIds: ReadonlySet<string> = new Set();

  // A2.3: the CALL IT two-step. The first tap arms the confirm (a starId,
  // never a boolean, so a stale confirm can never read against the wrong
  // study); the second tap sends `callStudy` and moves the star into
  // pendingCallStarId instead. Reset whenever the focused view opens fresh
  // (focusStudy, the expandedQuestion precedent) — a half-armed confirm
  // never survives a close/reopen.
  private callConfirmStarId: string | null = null;
  // Released the moment the study's own status leaves open/shelved (the
  // confirming sky), or by handleServerError on a "study-unavailable".
  private pendingCallStarId: string | null = null;

  // A2.3: tripwires in flight, keyed `${starId}:${kind}` — free to arm and
  // instant, so this only guards against a double-tap outrunning the round
  // trip. Cleared wholesale on the next `sky` (any real transition will have
  // landed by then) and on any server error.
  private pendingTripwireKeys = new Set<string>();

  // A single 1s ticker, live while the panel is open, so the hub's compute
  // allocation line and any running project's countdown stay current without
  // a new `sky` message — both derive from clock.ts's locally-interpolated
  // nowYear(), never from server polling.
  private tickHandle: number | null = null;

  // AV3: the hub's budget line element, set by buildBudgetLine() whenever
  // the hub is the caller. The ticker's hub branch updates only this
  // element's textContent instead of re-rendering the whole hub — a tick
  // landing between finger-down and finger-up on a proposal row must never
  // eat the tap (see refreshHubBudget()).
  private hubBudgetEl: HTMLDivElement | null = null;

  private onInspectCb: ((starId: string) => void) | null = null;

  // A2.4: the contact block from the latest `sky`, for THE VOICE section —
  // whether a shout is already going out, and therefore whether the row is a
  // verb or a status. Null until the first sky.
  private contact: ContactWire | null = null;
  private onVoiceActionCb: (() => void) | null = null;
  private onHailActionCb: ((starId: string) => void) | null = null;
  // A one-shot: openHub("voice") scrolls the section into view on the render
  // that follows, and clears itself. The HOME mote's tap is the only caller.
  private hubScrollToVoice = false;

  // ── A2.5: the thread view ────────────────────────────────────────────
  // Which thread is on screen. Also the client half of a PER-CONNECTION
  // server state with no DO key behind it: a reconnect comes back with
  // nothing open, so update() says which one it is again (see the resend
  // there). Null whenever the view is not "thread".
  private threadStarId: string | null = null;

  // ── A2.6: the composer ───────────────────────────────────────────────
  // The composition in progress: SELECTORS ONLY, exactly what goes on the
  // wire. It lives on the panel rather than in the DOM because the sheet
  // rebuilds itself on every `sky` (the expandedQuestion precedent), and a
  // half-assembled signal must survive that.
  private composerOpen = false;
  private composerParts: PartRef[] = [];
  private composerTone: SignalTone = "plain";
  // Which source chip's picker is showing, and the one row inside it that is
  // expanded (a finding's depth, an archive's window, a verdict's stance).
  // Null/null is the composer's own face: the preview and the two chip rows.
  private composerPicker: PartKind | null = null;
  private composerExpanded: string | null = null;
  // The ASK picker's first step, held between renders: a request names a kind
  // and then a subject, and the kind survives while the subject is chosen.
  private composerWant: RequestWant = "finding";
  // The overlay itself. It is a child of the SHEET, not of the body, so a
  // thread re-render underneath never disturbs it.
  private composerSheet: HTMLDivElement | null = null;
  // A sendSignal in flight. The parts stay put until a sky confirms, so a
  // refusal costs nothing but the tap (handleServerError releases this and
  // the composition is still there to send again).
  private pendingSignal = false;
  // The turnaround floor: the server answered `contact-unavailable` on a
  // send, so the composer stands down behind one flat line for a moment. A
  // real-time handle, cleared on any render that replaces it.
  private floorNotice = false;
  private floorNoticeHandle: number | null = null;

  // A one-shot, the hubScrollToVoice mold: a thread opened fresh lands on
  // its newest signal and the composer, not on a hail sent an age ago. Every
  // later render leaves the scroll exactly where the reader put it.
  private threadScrollToEnd = false;

  // Elements whose text is a locally-derived clock: the thread rows' state
  // chips and the sent rail's countdown. The 1s ticker refreshes exactly
  // these rather than re-rendering, so a tick can never land between
  // finger-down and finger-up (or inside a keystroke).
  private liveClocks: { readonly el: HTMLElement; readonly text: () => string }[] = [];

  // AV1: the one-time hub explainer (compute, then later the clock note).
  // renderHub() re-runs on every openHub() and on every sky (the 1s ticker
  // no longer re-runs it in full — see refreshHubBudget/AV3), so nothing
  // one-shot can live inside it directly — the App sets this field once
  // per hub open via setHubExplainer, and every render after that just
  // reads it back, stable for the life of the panel session.
  private explainerText: string | null = null;
  private onHubOpenCb: (() => void) | null = null;

  // AV2: the report. `report` is the latest ReportPayload the App has
  // handed over (via setReport, mirroring `voice`'s field-then-forward
  // pattern) — renderers only ever read it back, never mutate it. A reopen
  // sends `requestReport` first and renders the standing copy immediately;
  // when the fresh payload lands, setReport re-renders IF the panel is
  // still showing the report (the setHubExplainer field-driven precedent,
  // but this field also drives its own re-render since the payload can
  // arrive well after the render that requested it).
  private report: ReportPayload | null = null;
  private onReportOpenCb: (() => void) | null = null;
  // The one-time epoch explainer, same field-only contract as
  // `explainerText` above: the App sets it via setReportExplainer before
  // (or in response to) onReportOpen firing, and renderReport only reads
  // it back.
  private reportExplainerText: string | null = null;

  // ── A2.6: durable identity ────────────────────────────────────────────
  // Whether THIS SEAT has an account, from `welcome.account` (App forwards
  // it via setHasAccount) — decides which of the two hub rows renders. A
  // successful claim also flips this locally the moment the key comes back
  // (showAccountKey below), so the row updates without waiting on a fresh
  // welcome that will never arrive on this same connection.
  private hasAccount = false;
  // A claimAccount/showAccountKey in flight — guards a double tap and is
  // released by the confirming `accountKey` or by handleServerError.
  private pendingAccountAction: "claim" | "reveal" | null = null;
  // The key sheet: a child of the SHEET, not of the body (the composer's own
  // precedent) — renderHub() rebuilds the body on every sky and must not
  // tear this down while it is up. Null whenever no key is on screen.
  private accountSheetEl: HTMLDivElement | null = null;
  private accountKeyValue: string | null = null;
  // fresh:true is the claim ceremony (mandatory write-it-down, no
  // tap-outside dismiss); false is a quiet re-read (showAccountKey).
  private accountKeyFresh = false;

  // ── A5: the watch ─────────────────────────────────────────────────────
  // The deployment's application server key, from `welcome.push` (null means
  // no VAPID pair is configured, and then NO ROW RENDERS AT ALL — the whole
  // dev-mode story is that the feature is silently absent).
  private pushPublicKey: string | null = null;
  // Whether the SEAT holds a subscription on any device, from every `sky`.
  // The ask sheet's precondition; the row itself speaks about this device,
  // because that is the only thing it can honestly promise.
  private pushSubscribedOnSeat = false;
  // Whether THIS device holds one. Read from the browser (an async call), so
  // it is refreshed and then re-rendered rather than derived at render time.
  private pushOnThisDevice = false;
  // A subscribe/unsubscribe in flight: guards a double tap, released when the
  // device state is re-read.
  private pushBusy = false;
  // The ask sheet, a child of the SHEET like the key sheet, so renderHub()
  // rebuilding the body underneath cannot tear it down mid-ask.
  private watchSheetEl: HTMLDivElement | null = null;

  private dragStartY: number | null = null;
  private dragDy = 0;

  constructor(
    container: HTMLElement,
    socket: CohortSocket,
    menus: HypothesisMenus | null,
    missionCatalog: MissionCatalog | null,
    voyageCatalog: VoyageCatalog | null,
    catalog: readonly Star[],
  ) {
    this.socket = socket;
    this.menus = menus;
    this.missionCatalog = missionCatalog;
    this.voyageCatalog = voyageCatalog;
    this.starsById = new Map(catalog.map((s) => [s.id, s] as const));

    this.root = document.createElement("div");
    this.root.className = "study-board-root";

    this.chip = document.createElement("button");
    this.chip.type = "button";
    // Not holos-caps: this is the one standing invitation on the sky, not a
    // label, so it wears the display face at reading size. Cinzel's lowercase
    // are small caps, so "Start" sets as a titled word without shouting.
    this.chip.className = "study-chip";
    this.chip.textContent = "+ Start";
    this.chip.addEventListener("click", () => this.openHub());

    // The pair: + Start begins something, Tend checks on what is already
    // going. Same pill, other corner, cyan rather than amber, and the same
    // travelling glint at half the rate — a slower pulse for the chip you
    // return to rather than the one that invites you in.
    // The mark is Phosphor's tree-view at light weight — a trunk with things
    // branching off it, which is the shape of the panel it opens: missions
    // with their children indented under them. It is decoration for the word
    // beside it, so it is hidden from the accessibility tree; "Tend" is the
    // accessible name on its own.
    this.tendChip = document.createElement("button");
    this.tendChip.type = "button";
    this.tendChip.className = "study-chip study-chip--tend";
    const tendIcon = document.createElement("span");
    tendIcon.className = "study-chip-icon";
    tendIcon.setAttribute("aria-hidden", "true");
    // A build-time constant from node_modules, not anything a player or the
    // server can reach — the one place innerHTML is safe.
    tendIcon.innerHTML = treeViewIcon;
    const tendLabel = document.createElement("span");
    tendLabel.textContent = "Tend";
    this.tendChip.append(tendIcon, tendLabel);
    this.tendChip.hidden = true;
    this.tendChip.addEventListener("click", () => this.openTend());

    this.backdrop = document.createElement("div");
    this.backdrop.className = "study-board-backdrop";
    this.backdrop.addEventListener("click", () => this.close());

    this.sheet = document.createElement("div");
    this.sheet.className = "study-board-sheet";

    // The sheet is full-height on a phone, so it covers the backdrop
    // entirely — "tap outside to dismiss" does not exist here. The panel
    // therefore carries its own visible exit, and the grabber's swipe stays
    // as the gesture for thumbs that already know it.
    // The whole bar is the swipe surface, not just the pill: the pill is
    // 4px tall and a thumb misses it far more often than it hits.
    this.topbar = document.createElement("div");
    this.topbar.className = "study-board-topbar";

    const grabber = document.createElement("div");
    grabber.className = "study-board-grabber";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "study-board-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.close());

    this.topbar.append(grabber, closeBtn);

    this.body = document.createElement("div");
    this.body.className = "study-board-body";

    this.sheet.append(this.topbar, this.body);
    this.root.append(this.chip, this.tendChip, this.backdrop, this.sheet);
    container.append(this.root);

    this.attachSwipe();
    window.addEventListener("keydown", this.onKeyDown);
    this.renderList();
  }

  /** The player's own place in the sky, from every `sky` message — the App
   *  calls this just before update(), so no render ever sees a stale HOME. */
  setSelf(self: SelfView): void {
    this.self = self;
  }

  /** A4: this player's own foundings and the forecast over the nearest
   *  stars, from every `sky`. Handed over just before update() (setSelf's
   *  contract) so the pending-release pass below already sees them. */
  setVoyages(voyages: readonly VoyageSnapshot[], survey: readonly SurveyRow[]): void {
    this.voyages = voyages;
    this.voyagesById = new Map(voyages.map((v) => [v.id, v] as const));
    this.survey = survey;
  }

  /** A4: THE LEDGER, from every `sky` — what became of those foundings and
   *  what the standing orders have done. Handed over just before update(),
   *  exactly as setVoyages is, so the routing pass below already sees it. */
  setLedger(ledger: LedgerWire): void {
    this.ledger = ledger;
    this.ledgerRowsById = new Map(ledger.rows.map((r) => [r.voyageId, r] as const));
  }

  /** A5: the deployment's application server key, from every `welcome`. Null
   *  is the dev default and means this panel renders no watch row at all. */
  setPushKey(publicKey: string | null): void {
    this.pushPublicKey = publicKey;
    if (publicKey !== null) void this.refreshWatchState();
  }

  /** A5: whether the SEAT holds a subscription, from every `sky`. Handed over
   *  just before update(), exactly as setLedger is. */
  setPushSubscribed(subscribed: boolean): void {
    this.pushSubscribedOnSeat = subscribed;
  }

  /** Re-read what the BROWSER says about this device and repaint the hub if it
   *  is what is on screen. The subscription lives outside this panel's state,
   *  so it is asked rather than assumed. */
  private async refreshWatchState(): Promise<void> {
    const on = await watchOnThisDevice();
    if (on === this.pushOnThisDevice && !this.pushBusy) return;
    this.pushOnThisDevice = on;
    this.pushBusy = false;
    if (this.view === "hub") this.renderHub();
  }

  update(
    studies: readonly StudySnapshot[],
    sources: readonly DetectedSource[],
    localNames: ReadonlyMap<string, string>,
    projects: readonly ProjectSnapshot[],
    budget: ComputeBudget,
    missions: readonly MissionSnapshot[],
    tend: readonly TendRow[],
    probeFlightYearsPerLy: number,
    proposals: readonly Proposal[],
    contact: ContactWire | null,
  ): void {
    this.studiesByStarId = new Map(studies.map((s) => [s.starId, s] as const));
    this.sourcesByStarId = new Map(sources.map((s) => [s.starId, s] as const));
    this.localNames = localNames;
    this.projects = projects;
    this.budget = budget;
    this.missions = missions;
    this.missionsById = new Map(missions.map((m) => [m.id, m] as const));
    this.tend = tend;
    this.probeFlightYearsPerLy = probeFlightYearsPerLy;
    this.proposals = proposals;
    this.contact = contact;
    this.updateChip();

    // A2.5: a signal in flight is released by any sky at all — onSendSignal
    // appends and answers with a fresh sky, and a refusal comes back as an
    // `error`, which handleServerError has already caught by now (the
    // pendingTripwireKeys precedent, one slice on).
    // A2.6: what it releases is a COMPOSITION. The sky that confirms carries
    // the act, so the assembled parts have done their work and the composer
    // shuts on them: the thread below is the confirmation, and no optimistic
    // signal is ever drawn.
    if (this.pendingSignal) {
      this.pendingSignal = false;
      this.composerParts = [];
      this.composerTone = "plain";
      this.closeComposer();
    }

    // A2.5: the panel left the thread view without saying so (the sheet was
    // closed on it, or a route took it elsewhere). Tell the server the
    // thread is shut so it stops assembling a detail nobody reads.
    if (this.view !== "thread" && this.threadStarId !== null) this.leaveThread();

    // A2.5: which thread is open is PER-CONNECTION state with no DO key
    // behind it, so a reconnect comes back with nothing open. If this sky
    // carries no detail for the thread on screen, say which one it is again.
    // Idempotent, and it is also what heals a dropped `openThread`. Guarded
    // on the thread still being in `threads`, so it can never ping-pong
    // against a star the server would answer with null forever.
    if (this.view === "thread" && this.threadStarId !== null) {
      const starId = this.threadStarId;
      const known = (contact?.threads ?? []).some((t) => t.starId === starId);
      if (!known) {
        // The thread vanished from this payload — fall back to the hub the
        // way a vanished study falls back to the list, by swapping the view
        // and NOT by opening the panel: this can land while a ceremony has
        // the sky, and a sheet that opened itself then would be a disaster.
        this.leaveThread();
        this.view = "hub";
        this.renderHub();
        return;
      }
      const detail = contact?.openThread ?? null;
      if (detail === null || detail.starId !== starId) {
        this.socket.send({ type: "openThread", starId });
      }
    }

    // A begin sent from the briefing: this sky either carries the new study
    // — hand straight to it, which is the monitor page — or it does not, in
    // which case the request went nowhere and the verb is released.
    if (this.pendingBeginStarId !== null) {
      const starId = this.pendingBeginStarId;
      this.pendingBeginStarId = null;
      if (this.studiesByStarId.has(starId)) {
        this.focusStudy(starId);
        return;
      }
    }

    // A startProject in flight: released the moment the project's own state
    // moves past "available" (running or, same sky, already landed).
    if (this.pendingProjectId !== null) {
      const proj = this.projects.find((pp) => pp.id === this.pendingProjectId);
      if (proj === undefined || proj.status !== "available") {
        this.pendingProjectId = null;
      }
    }

    // A buyQuestion in flight: released the moment the question's own state
    // moves past "offered" (bought — pending or, same sky, already answered).
    if (this.pendingQuestion !== null) {
      const pending = this.pendingQuestion;
      const study = this.studiesByStarId.get(pending.starId);
      const q = study?.openQuestions.find((qq) => qq.id === pending.questionId);
      if (q !== undefined && q.state !== "offered") {
        this.pendingQuestion = null;
      }
    }

    // A callStudy in flight: released the moment the study's own status
    // leaves open/shelved (the confirming sky — it moved to "called"), or
    // if the study vanished from this payload entirely (defensive).
    if (this.pendingCallStarId !== null) {
      const study = this.studiesByStarId.get(this.pendingCallStarId);
      if (study === undefined || (study.status !== "open" && study.status !== "shelved")) {
        this.pendingCallStarId = null;
      }
    }

    // A2.3: tripwires are free and instant, so any real sky is proof enough
    // that whatever was in flight either landed or was refused (in which
    // case handleServerError already cleared it) — no per-key bookkeeping.
    this.pendingTripwireKeys.clear();

    // A5: the sky that carries an arming is the moment to ask about the
    // phone. Every other precondition is checked inside, and the localStorage
    // mark makes the whole thing once per device.
    this.maybeAskForWatch();

    // A4: an arm/disarm is the same shape of write, and releases the same
    // way. The confirming sky carries the order's new state, which is the
    // confirmation; there is no toast and nothing to reconcile.
    this.pendingOrderClass = null;

    // A launchMission in flight: this sky either carries exactly one new
    // mission for the star (by id difference against the pre-send
    // snapshot) — hand straight to its detail view — or it does not, in
    // which case nothing landed yet (or the server rejected it, in which
    // case handleServerError already released the trio before this runs).
    if (this.pendingLaunchStarId !== null) {
      const starId = this.pendingLaunchStarId;
      const priorIds = this.pendingLaunchPriorMissionIds;
      const newMission = missions.find((m) => m.starId === starId && !priorIds.has(m.id));
      if (newMission !== undefined) {
        this.pendingLaunchStarId = null;
        this.pendingLaunchPriorMissionIds = new Set();
        this.focusMission(newMission.id);
        return;
      }
    }

    // A4: a launchVoyage in flight. This sky either carries exactly one new
    // founding for the star (by id difference against the pre-send snapshot)
    // — hand to its row in the work list, once the commit beat has finished
    // playing — or it does not, in which case nothing landed yet (or the
    // server refused, and handleServerError released the trio before this
    // ran). The handoff waits on the bloom rather than cutting it off: a hold
    // that ends in a jump cut reads as a glitch, not a commitment.
    if (this.pendingVoyageStarId !== null) {
      const starId = this.pendingVoyageStarId;
      const priorIds = this.pendingVoyagePriorIds;
      const created = this.voyages.find((v) => v.starId === starId && !priorIds.has(v.id));
      if (created !== undefined) {
        this.pendingVoyageStarId = null;
        this.pendingVoyagePriorIds = new Set();
        this.launchedVoyageId = created.id;
        this.maybeHandoffVoyage();
        return;
      }
    }

    if (this.view === "focused" && this.focusedStarId !== null) {
      if (this.studiesByStarId.has(this.focusedStarId)) {
        this.renderFocused(this.focusedStarId);
      } else {
        // The focused study vanished from this payload — fall back to list.
        this.view = "list";
        this.focusedStarId = null;
        this.renderList();
      }
    } else if (this.view === "picker") {
      // Re-render so a row disappears the moment its study exists.
      this.renderPicker();
    } else if (this.view === "brief") {
      this.renderBrief();
    } else if (this.view === "hub") {
      this.renderHub();
    } else if (this.view === "explore") {
      this.renderExplore();
    } else if (this.view === "projects") {
      this.renderProjects();
    } else if (this.view === "project") {
      this.renderProjectDetail();
    } else if (this.view === "tend") {
      this.renderTend();
    } else if (this.view === "mission") {
      if (this.focusedMissionId !== null && this.missionsById.has(this.focusedMissionId)) {
        this.renderMissionDetail();
      } else {
        // The focused mission vanished from this payload — fall back to the Tend.
        this.view = "tend";
        this.focusedMissionId = null;
        this.renderTend();
      }
    } else if (this.view === "launch") {
      this.renderLaunch();
    } else if (this.view === "survey") {
      this.renderSurvey();
    } else if (this.view === "voyage") {
      // A4: the founding sheet is NEVER re-rendered by a sky, for the thread
      // view's exact reason and one more — it holds a live name field, five
      // dials mid-drag and, on an Endeavor, a live press. Rebuilding the body
      // under any of those is the one thing this panel must not do. Only the
      // commit control refreshes (affordability accrues while you write), and
      // a charter written across a landing prerequisite simply reads it on the
      // next open.
      this.refreshVoyageCommit();
    } else if (this.view === "fork") {
      // A4: a Ledger row is NEVER deleted (the record outlives the colony and
      // every source it was ever visible as), so a row that has gone missing
      // means the sky itself has changed under this panel — fall back to the
      // hub rather than render about nothing, the focused view's precedent.
      if (this.forkVoyageId !== null && this.ledgerRowsById.has(this.forkVoyageId)) {
        this.renderFork();
      } else {
        this.view = "hub";
        this.forkVoyageId = null;
        this.renderHub();
      }
    } else if (this.view === "orders") {
      this.renderOrders();
    } else if (this.view === "thread") {
      this.renderThread();
    } else if (this.view === "startover") {
      // Nothing on this page comes from a `sky`, but the branch must exist:
      // the `else` below falls back to the study list, which would drop the
      // player out of a confirmation they are mid-way through reading.
      this.renderStartOver();
    } else if (this.view === "report") {
      // Defensive consistency only, the `tend`/`projects` precedent — a
      // `sky` carries none of the report's own data, so this just re-runs
      // the render against whatever `this.report` already holds. It is NOT
      // how the report refreshes; see openReport()/setReport().
      this.renderReport();
    } else {
      this.renderList();
    }
  }

  openBoard(): void {
    this.view = "list";
    this.focusedStarId = null;
    this.renderList();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openHub(scrollTo?: "voice"): void {
    // Fires first, before renderHub(), so the App's setHubExplainer() (if it
    // calls one) is already in `explainerText` for the very first render.
    this.onHubOpenCb?.();
    this.hubScrollToVoice = scrollTo === "voice";
    this.view = "hub";
    this.focusedStarId = null;
    this.renderHub();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openPicker(): void {
    this.view = "picker";
    this.focusedStarId = null;
    this.renderPicker();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openProjects(): void {
    this.view = "projects";
    this.focusedStarId = null;
    this.renderProjects();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  focusStudy(starId: string): void {
    this.view = "focused";
    this.focusedStarId = starId;
    // A board opened fresh opens with every question folded and no CALL IT
    // confirm armed.
    this.expandedQuestion = null;
    this.callConfirmStarId = null;
    this.renderFocused(starId);
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  openTend(): void {
    this.view = "tend";
    this.focusedStarId = null;
    this.renderTend();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  focusProject(projectId: string, from: "tend" | "projects" | "report" | "hub"): void {
    this.view = "project";
    this.focusedProjectId = projectId;
    this.projectReturn = from;
    this.renderProjectDetail();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** AV2: opens the report. `onReportOpenCb` fires FIRST (the onHubOpen
   *  mold) so a setReportExplainer() call it makes is already in
   *  `reportExplainerText` for the very first render; `requestReport` goes
   *  out before that render so the panel shows its standing copy while the
   *  fresh one is in flight (setReport re-renders it in place on arrival —
   *  see the `report` field's comment). */
  openReport(): void {
    this.onReportOpenCb?.();
    this.socket.send({ type: "requestReport" });
    this.view = "report";
    this.focusedStarId = null;
    this.renderReport();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /**
   * A2.5: opens one thread. `openThread` goes out FIRST so the detail is
   * already being assembled while this render puts the header up (openReport's
   * requestReport precedent); the confirming sky fills the column in.
   * Always opens clean — a half-written signal never survives a close/reopen,
   * the openLaunch/openBrief rule.
   */
  openThread(starId: string): void {
    this.threadStarId = starId;
    this.resetComposer();
    this.threadScrollToEnd = true;
    this.socket.send({ type: "openThread", starId });
    this.view = "thread";
    this.focusedStarId = null;
    this.renderThread();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** The playtest reset's confirmation page. Always starts clean: a failure
   *  message from a previous attempt never greets the next one. */
  private openStartOver(): void {
    this.view = "startover";
    this.focusedStarId = null;
    this.startOverPending = false;
    this.startOverError = null;
    this.renderStartOver();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** Shuts the open thread server-side. Pure bookkeeping (the declineProposal
   *  precedent): there is no error code for it and nothing waits on it. */
  private leaveThread(): void {
    if (this.threadStarId === null) return;
    this.threadStarId = null;
    this.resetComposer();
    this.socket.send({ type: "openThread", starId: null });
  }

  /** A composer opened fresh is empty and plain-spoken. Called on every way
   *  in and every way out — a half-assembled signal never survives a
   *  close/reopen, the openLaunch/openBrief rule. */
  private resetComposer(): void {
    this.composerParts = [];
    this.composerTone = "plain";
    this.composerPicker = null;
    this.composerExpanded = null;
    this.composerWant = "finding";
    this.pendingSignal = false;
    this.clearFloorNotice();
    this.closeComposer();
  }


  focusMission(missionId: string): void {
    this.view = "mission";
    this.focusedMissionId = missionId;
    this.renderMissionDetail();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** Opens the two-step launch sheet for `starId`. Always starts clean — a
   *  half-written charter never survives a close/reopen (openBrief's
   *  precedent: `pendingBeginStarId` reset on entry). */
  openLaunch(starId: string): void {
    this.view = "launch";
    this.launchStarId = starId;
    this.launchKind = null;
    this.launchCharter = new Set();
    this.renderLaunch();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  // ── A4: the survey and the founding sheet ────────────────────────────

  /** THE SURVEY: the nearest stars, as a place to aim from. Read-only — a
   *  row is a door to the founding sheet and nothing on it is a verb. */
  openSurvey(): void {
    this.view = "survey";
    this.focusedStarId = null;
    this.renderSurvey();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /**
   * Opens the founding sheet aimed at `starId`, from a survey row or from
   * the source card's own affordance. Always starts clean — a half-written
   * charter never survives a close/reopen (openLaunch's rule), and the dials
   * come back up on the parent's own positions.
   */
  openVoyageLaunch(starId: string, from: "survey" | "hub" = "hub"): void {
    this.cancelVoyageHold();
    this.view = "voyage";
    this.voyageStarId = starId;
    this.voyageReturn = from;
    this.voyageKind = null;
    this.voyageClauses = new Set();
    this.voyageDials = new Map();
    this.voyageName = "";
    this.pendingVoyageStarId = null;
    this.pendingVoyagePriorIds = new Set();
    this.launchedVoyageId = null;
    this.voyageBloomDone = true;
    this.renderVoyageLaunch();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  /** AV3: a proposal's `question` route — focuses the study and scrolls its
   *  matching OPEN QUESTIONS row into view. Guards on the study still being
   *  in this session's sky (the AV3 design's "target fades mid-session"
   *  edge case) and falls back to the hub rather than opening a focus view
   *  for a study that no longer exists. The scroll itself is one-shot: see
   *  `highlightQuestionId` and renderFocused's oqSection loop. */
  private focusStudyQuestion(starId: string, questionId: string): void {
    if (!this.studiesByStarId.has(starId)) {
      this.openHub();
      return;
    }
    this.view = "focused";
    this.focusedStarId = starId;
    this.highlightQuestionId = questionId;
    // The route means "look at this question", so it lands on the drill-in
    // rather than on a folded row the player would have to tap again. The
    // spend still waits behind the spend button inside it.
    this.expandedQuestion = { starId, questionId };
    this.renderFocused(starId);
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  close(): void {
    this.openFlag = false;
    this.root.classList.remove("open");
    this.stopTicking();
    // A4: a press that loses its surface is a press that ended. The sheet
    // going away is a release, and a release is silent.
    this.cancelVoyageHold();
    // A2.6: the composer is an overlay on the SHEET, so it has to be taken
    // down with the sheet. The thread itself stays open server-side until the
    // next sky notices the view moved on (update()).
    this.closeComposer();
    // The key sheet is the same kind of overlay and stands down with it. A
    // dismissed claim ceremony is not a lost key: showAccountKey re-reads it
    // any time (accounts.ts's plaintext-storage reasoning), so this is not a
    // second, secret way past the mandatory tap — merely closing the panel.
    this.closeAccountSheet();
  }

  isOpen(): boolean {
    return this.openFlag;
  }

  destroy(): void {
    this.stopTicking();
    this.cancelVoyageHold();
    this.clearFloorNotice();
    this.closeComposer();
    this.closeAccountSheet();
    window.removeEventListener("keydown", this.onKeyDown);
    this.root.remove();
  }

  /** Starts the 1s ticker if it is not already running. Idempotent — every
   * open* method calls this, so opening while already open is a no-op. */
  private startTicking(): void {
    if (this.tickHandle !== null) return;
    this.tickHandle = window.setInterval(() => {
      // AV3: the hub's only time-varying content is the budget line — a
      // full renderHub() every second would wipe the body between
      // finger-down and finger-up on a proposal's accept/decline buttons.
      // Update just that element's text; fall back to a full render if it
      // has fallen out of the document (defensive only).
      if (this.view === "hub") this.refreshHubBudget();
      else if (this.view === "projects") this.renderProjects();
      else if (this.view === "project") this.renderProjectDetail();
      else if (this.view === "focused" && this.focusedStarId !== null) {
        this.renderFocused(this.focusedStarId);
      } else if (this.view === "tend") this.renderTend();
      else if (this.view === "mission") this.renderMissionDetail();
      // A4: the survey and the founding sheet state DURATIONS (a crossing
      // takes what it takes), so nothing on either counts down. What does
      // move is the budget, and the commit control is where that shows.
      else if (this.view === "voyage") this.refreshVoyageCommit();
      // A4, the aftermath: a fork's record counts DOWN to a founding and a
      // confirmation the light has not reached yet, so it re-renders like a
      // mission's detail. The arming sheet deliberately does not: nothing on
      // it moves (the order is priced AT FIRE TIME, so no budget line decides
      // anything here), and a tick landing on a half-written charter would
      // rebuild the picker under the thumb.
      else if (this.view === "fork") this.renderFork();
      // A2.5: the thread view is NEVER re-rendered by the tick. It holds a
      // live text input, and rebuilding the body under a thumb mid-sentence
      // is the one thing this panel must not do. Only the clocks move.
      else if (this.view === "thread") this.refreshLiveClocks();
    }, 1000);
  }

  private stopTicking(): void {
    if (this.tickHandle !== null) {
      window.clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  /** Uncommitted compute right now: the last snapshot plus what has accrued
   * since, derived locally from clock.ts's nowYear() so the hub and projects
   * panel read live without waiting on a new `sky`. */
  private currentFreeCompute(): number {
    const elapsedYears = Math.max(0, nowYear() - this.budget.asOfYear);
    // Local accrual clamps at the attention ceiling, mirroring the
    // server's freeComputeAt: attention saturates, it does not bank.
    return Math.min(
      this.budget.cap,
      this.budget.free + this.budget.ratePerYear * elapsedYears,
    );
  }

  /**
   * The allocation line. "UNCOMMITTED", not "banked" — this is compute not
   * yet spent on thinking, not savings (projects.ts § NOT A BANK), and the
   * word has to carry that on its own because it is the only place the
   * player meets the currency. "OF" names the attention ceiling: the pool
   * fills to it and stops, so a full pool reads as full, not as a balance
   * still growing.
   */
  private budgetLineText(): string {
    return `${Math.floor(this.currentFreeCompute())} OF ${Math.floor(this.budget.cap)} COMPUTE UNCOMMITTED · +${this.budget.ratePerYear}/Y`;
  }

  private buildBudgetLine(): HTMLDivElement {
    const line = document.createElement("div");
    line.className = "study-budget-line holos-caps";
    line.textContent = this.budgetLineText();
    // AV3: the hub's copy is the one the 1s ticker updates in place
    // (refreshHubBudget) rather than through a full renderHub().
    if (this.view === "hub") this.hubBudgetEl = line;
    return line;
  }

  /** AV3: the ticker's hub branch — updates only the budget line's text,
   *  never the whole hub body, so a tick cannot land between finger-down
   *  and finger-up on a proposal row. Falls back to a full renderHub() if
   *  the element has fallen out of the document. */
  private refreshHubBudget(): void {
    if (this.hubBudgetEl !== null && this.hubBudgetEl.isConnected) {
      this.hubBudgetEl.textContent = this.budgetLineText();
      // A2.5: THE VOICE's thread rows carry countdowns of their own, and
      // they are refreshed the same way and for the same reason.
      this.refreshLiveClocks();
    } else {
      this.renderHub();
    }
  }

  /** A2.5: every element whose text is locally-derived clock arithmetic —
   *  a thread row's state chip, a sent signal's rail. Elements that have
   *  fallen out of the document are dropped rather than re-rendered: the
   *  render that removed them registered whatever replaced them. */
  private refreshLiveClocks(): void {
    let alive = false;
    for (const c of this.liveClocks) {
      if (!c.el.isConnected) continue;
      c.el.textContent = c.text();
      alive = true;
    }
    if (!alive && this.liveClocks.length > 0) this.liveClocks = [];
  }

  /** Escape closes the panel on a keyboard — the desktop equivalent of the
   *  exit button, which is the only way out on a phone. */
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.openFlag) this.close();
  };

  /** Registers the callback fired when a row in the explore view is tapped,
   * with the tapped source's starId. */
  onInspect(cb: (starId: string) => void): void {
    this.onInspectCb = cb;
  }

  /** A2.4: fired when THE VOICE's one row is tapped. Like onInspect, the
   *  panel reports the tap and stages nothing — the ceremony happens out on
   *  the sky, which is the App's business. */
  onVoiceAction(cb: () => void): void {
    this.onVoiceActionCb = cb;
  }

  /** A2.5: fired when a thread the player has never spoken into offers its
   *  one route out — answering an unprompted hail costs the hail ceremony,
   *  and the ceremony happens out on the sky (onVoiceAction's contract, with
   *  a star attached). */
  onHailAction(cb: (starId: string) => void): void {
    this.onHailActionCb = cb;
  }

  /** A2.4: hide the two standing chips while a ceremony is armed. They opt
   *  themselves into pointer-events even though their root does not, so a
   *  ceremony overlay cannot cover them — they have to stand down. */
  setChromeHidden(hidden: boolean): void {
    this.root.classList.toggle("chrome-hidden", hidden);
  }

  /** Registers the callback fired as the FIRST step of every openHub(),
   *  before that call's renderHub() — so a setHubExplainer() the callback
   *  makes is already in `explainerText` for the very first render. */
  onHubOpen(cb: () => void): void {
    this.onHubOpenCb = cb;
  }

  /** AV1: the hub's one-time explainer line (compute, then later the
   *  clock), or null for none. The App drives this via takeVoice — stable
   *  across the panel's re-renders because renderHub() only reads it back. */
  setHubExplainer(text: string | null): void {
    this.explainerText = text;
  }

  /** AV2: the latest ReportPayload, forwarded by the App on every `report`
   *  message (session-open and reply-to-requestReport alike — the App
   *  cannot tell them apart and does not need to). Sets the field only,
   *  EXCEPT the one re-render this field alone can trigger: a reopen
   *  requests fresh data before its first render, so the payload always
   *  lands after the panel is already open — if the panel is still showing
   *  the report when it arrives, this is the only place that can put it on
   *  screen. */
  setReport(payload: ReportPayload): void {
    this.report = payload;
    if (this.view === "report") this.renderReport();
  }

  /** Registers the callback fired as the FIRST step of every openReport(),
   *  before requestReport is sent or renderReport() runs — the onHubOpen
   *  mold, so a setReportExplainer() the callback makes is already in
   *  `reportExplainerText` for the very first render. */
  onReportOpen(cb: () => void): void {
    this.onReportOpenCb = cb;
  }

  /** AV2: the report's one-time epoch explainer (why the dates read "n
   *  AE"), or null for none. Same field-only contract as setHubExplainer —
   *  renderReport() only ever reads it back. */
  setReportExplainer(text: string | null): void {
    this.reportExplainerText = text;
  }

  // ── Render: chrome ──────────────────────────────────────────────────

  /** The Start chip's text never changes; this keeps the open-study count
   * fresh for the hub's "Your studies · n" row, and shows or hides the Tend
   * chip — which exists only while there is something to tend. */
  private updateChip(): void {
    let n = 0;
    for (const s of this.studiesByStarId.values()) {
      if (s.status === "open") n++;
    }
    this.openStudyCount = n;
    this.tendChip.hidden = this.tend.length === 0;
  }

  private hairline(): HTMLHRElement {
    const hr = document.createElement("hr");
    hr.className = "holos-hairline study-hairline";
    return hr;
  }

  // ── Render: hub view ──────────────────────────────────────────────────

  private renderHub(): void {
    this.body.innerHTML = "";
    this.liveClocks = [];

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "START";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "What your civilization can begin now.";
    this.body.append(subtitle);

    this.body.append(this.buildBudgetLine());

    if (this.explainerText !== null) {
      const note = document.createElement("div");
      note.className = "voice-note";
      note.textContent = this.explainerText;
      this.body.append(note);
    }

    this.body.append(this.hairline());

    // AV3: the mind's proposals — a live, present-tense block that renders
    // only when there is something to say. See buildProposalRow's comment
    // for the row anatomy and why this is not another buildHubRow.
    if (this.proposals.length > 0) {
      const proposalHeader = document.createElement("div");
      proposalHeader.className = "study-section-header holos-caps";
      proposalHeader.textContent = "WHAT WE WOULD DO NEXT";
      this.body.append(proposalHeader);

      for (const proposal of this.proposals) {
        this.body.append(this.buildProposalRow(proposal));
      }

      this.body.append(this.hairline());
    }

    this.body.append(
      this.buildHubRow(
        "Start a study",
        "Watch a source and work out what it is.",
        true,
        () => this.openPicker(),
      ),
    );
    this.body.append(
      this.buildHubRow(
        "Start a project",
        "Build the instruments. Raise what you can think about.",
        true,
        () => this.openProjects(),
      ),
    );
    this.body.append(
      this.buildHubRow(
        "Explore the sky",
        "Everything your instruments can see.",
        true,
        () => {
          this.view = "explore";
          this.renderExplore();
        },
      ),
    );
    // A4: THE SURVEY. It sits beside "explore the sky" because it is the
    // other way of reading the neighborhood — that one lists what is
    // shining, this one lists where a ship could go, which is a different
    // set of stars and a different question. Hidden until a sky has carried
    // one: a row pointing at an empty list is noise (the Tend chip's rule).
    if (this.survey.length > 0) {
      this.body.append(
        this.buildHubRow(
          "The survey",
          "The nearest stars, and what a ship would find there.",
          true,
          () => this.openSurvey(),
        ),
      );
    }
    // A4: THE STANDING ORDER. It belongs in START because it is something the
    // civilization begins, even though what it begins is a rule rather than a
    // work: arming is the consent, and consenting is done here, in the
    // present, by a live hand. Hidden until a sky has carried the catalog —
    // the survey row's rule, one row over.
    if (this.ledger.orders.length > 0) {
      this.body.append(
        this.buildHubRow(
          "Leave a standing order",
          "What the mind may send while nobody is watching.",
          true,
          () => this.openOrders(),
        ),
      );
    }

    this.body.append(this.hairline());

    // A2.4: THE VOICE. Its own one-row section, because speaking is not one
    // more thing to start — it is the only irreversible verb in the hub, and
    // it does not belong in a browse list beside "explore the sky". The row
    // stays ink like everything else in this sheet: the cyan exceptions are
    // named in this file's header and this is not one of them.
    const voiceHeader = document.createElement("div");
    voiceHeader.className = "study-section-header holos-caps";
    voiceHeader.textContent = "THE VOICE";
    this.body.append(voiceHeader);
    this.body.append(this.buildVoiceRow());
    // A2.5: one row per thread, under the verb that started them. A thread
    // is not something you START — it already exists — so it sits below
    // SPEAK TO EVERYONE rather than beside it, in the server's own order.
    for (const t of this.contact?.threads ?? []) {
      this.body.append(this.buildThreadRow(t));
    }
    // A2.6: the threads this player has gone dark to. They are ABSENT from
    // the list above (the wire omits them), and this row exists only so the
    // mute can be found and undone. It carries a star id and nothing else —
    // no count, no state, no last event: a mute is not a record of a
    // conversation, it is the absence of one.
    for (const starId of this.contact?.mutedStarIds ?? []) {
      this.body.append(this.buildMutedRow(starId));
    }
    this.body.append(this.hairline());

    // A4: THE LEDGER. Its own section, under THE VOICE, and for the same
    // reason that one exists: a child is not one more thing to start. It is a
    // relationship, which is why it is a hub section and NOT a Tend row — the
    // work list is for undertakings that end.
    //
    // Rendered only when there is a founding to name. NO UNREAD MARK, NO
    // COUNT, NO FRESHNESS BAR anywhere in it (a4-ledger-note.md §7): the
    // record is a thing you read when you want to, and a badge would make it
    // a chore. One verb per row, and the row IS the verb.
    if (this.ledger.rows.length > 0) {
      const ledgerHeader = document.createElement("div");
      ledgerHeader.className = "study-section-header holos-caps";
      ledgerHeader.textContent = "THE LEDGER";
      this.body.append(ledgerHeader);

      for (const row of this.ledger.rows) {
        this.body.append(this.buildLedgerRow(row));
      }
      this.body.append(this.hairline());
    }

    if (this.studiesByStarId.size > 0) {
      this.body.append(
        this.buildHubRow(
          `Your studies · ${this.openStudyCount}`,
          "Open and shelved.",
          true,
          () => this.openBoard(),
        ),
      );
    }

    // AV2: always present, quiet — no count, no dot, no conditional
    // visibility. A show/hide affordance here would read as an unread
    // badge, and the report carries none.
    this.body.append(
      this.buildHubRow(
        "The report",
        "What the light brought while you were away.",
        true,
        () => this.openReport(),
      ),
    );

    // A5: the watch. It belongs here, under the report, because it is about
    // the same thing the report is about: what happened while you were not
    // looking. Absent entirely when the deployment has no VAPID keypair.
    const watchRow = this.buildWatchRow();
    if (watchRow !== null) this.body.append(watchRow);

    // A2.6: durable identity. Unclaimed offers the verb; claimed offers the
    // re-read — never both, the same either/or the hub's other rows never
    // need because nothing else here has two faces.
    this.body.append(
      this.hasAccount
        ? this.buildHubRow(
            "Your account",
            "Show the key that carries this run.",
            true,
            () => this.requestAccountKey(),
          )
        : this.buildHubRow(
            "Keep this run",
            "Save it to an account so you can come back on another device.",
            true,
            () => this.claimAccount(),
          ),
    );
  }

  /** From App, on every `welcome` — the one fact this panel needs about
   *  durable identity that it cannot derive from its own traffic. */
  setHasAccount(has: boolean): void {
    this.hasAccount = has;
  }

  private claimAccount(): void {
    if (this.pendingAccountAction !== null) return;
    this.pendingAccountAction = "claim";
    this.socket.send({ type: "claimAccount" });
  }

  private requestAccountKey(): void {
    if (this.pendingAccountAction !== null) return;
    this.pendingAccountAction = "reveal";
    this.socket.send({ type: "showAccountKey" });
  }

  /**
   * From App, on the one message that ever carries a key. `fresh` is the
   * claim ceremony: mandatory write-it-down, no tap-outside dismiss (there
   * is no backdrop on this overlay to tap in the first place). A claim also
   * means this seat now HAS an account, so the hub row behind the sheet
   * flips the moment it next renders.
   */
  showAccountKey(key: string, fresh: boolean): void {
    this.pendingAccountAction = null;
    if (fresh) this.hasAccount = true;
    this.accountKeyValue = key;
    this.accountKeyFresh = fresh;
    this.renderAccountSheet();
  }

  /**
   * A5: the watch row, in its five states, or null when the deployment has no
   * VAPID keypair and there is nothing to offer.
   *
   * IT SPEAKS ABOUT THIS DEVICE, and only about this device. Subscriptions are
   * per-browser-per-device and several may hang off one seat; inventing a
   * device roster in a hub row is a feature this slice does not ship, so the
   * row promises exactly what it can deliver. The three inert states use the
   * existing --inert treatment (the closed study's tripwire row, one panel
   * over): visible, legible, not tappable, and each one names the actual
   * remedy rather than shrugging.
   */
  private buildWatchRow(): HTMLButtonElement | null {
    if (this.pushPublicKey === null) return null;
    const capability = pushCapability();

    if (capability === "unsupported") {
      return this.buildHubRow(
        "Keep watch while you are away",
        "This browser does not carry notifications. The watch still trips.",
        false,
        () => undefined,
      );
    }
    if (capability === "ios-not-installed") {
      return this.buildHubRow(
        "Keep watch while you are away",
        "On this phone, notifications need Holos on the Home Screen.",
        false,
        () => undefined,
      );
    }
    if (capability === "blocked") {
      return this.buildHubRow(
        "Keep watch while you are away",
        "This device is blocking notifications. Only its own settings can undo that.",
        false,
        () => undefined,
      );
    }
    if (this.pushOnThisDevice) {
      return this.buildHubRow(
        "This device keeps watch",
        "Stop the notifications, on this device only.",
        !this.pushBusy,
        () => void this.turnWatchOff(),
      );
    }
    return this.buildHubRow(
      "Keep watch while you are away",
      "Let this device tell you when a watch trips.",
      !this.pushBusy,
      () => void this.turnWatchOn(),
    );
  }

  /** The row's own tap. No toast on success: the row flips, which is how
   *  every other state in this panel reports itself. */
  private async turnWatchOn(): Promise<void> {
    const publicKey = this.pushPublicKey;
    if (publicKey === null || this.pushBusy) return;
    this.pushBusy = true;
    await enableWatch(publicKey, (message) => this.socket.send(message));
    await this.refreshWatchState();
    this.pushBusy = false;
    if (this.view === "hub") this.renderHub();
  }

  private async turnWatchOff(): Promise<void> {
    if (this.pushBusy) return;
    this.pushBusy = true;
    await disableWatch((message) => this.socket.send(message));
    await this.refreshWatchState();
    this.pushBusy = false;
    if (this.view === "hub") this.renderHub();
  }

  /**
   * A5: the ask, at the first successful arming and once per seat.
   *
   * That is the only moment in the product where "and should your phone tell
   * you?" is a continuation of the player's own sentence rather than an
   * interruption: they have just told the game to watch something for them.
   * Notification permission needs a gesture and ONE DENIAL IS PERMANENT in
   * practice, so the ask is spent carefully and never where it cannot be
   * granted (the capability ladder above rules out three of the five states).
   */
  private maybeAskForWatch(): void {
    if (this.watchSheetEl !== null) return;
    const publicKey = this.pushPublicKey;
    if (publicKey === null) return;
    if (this.pushSubscribedOnSeat) return;
    if (pushCapability() !== "available") return;
    if (watchAsked()) return;
    const armed = [...this.studiesByStarId.values()].some((s) =>
      s.tripwires.some((t) => t.state === "armed"),
    );
    if (!armed) return;
    this.renderWatchSheet();
  }

  /** The account key sheet's mould exactly: a child of the SHEET, two buttons,
   *  no backdrop trickery. */
  private renderWatchSheet(): void {
    let el = this.watchSheetEl;
    if (el === null) {
      el = document.createElement("div");
      el.className = "study-account-sheet study-watch-sheet";
      this.sheet.append(el);
      this.watchSheetEl = el;
    }
    el.innerHTML = "";

    const bar = document.createElement("div");
    bar.className = "study-account-bar";
    const title = document.createElement("div");
    title.className = "study-account-title study-watch-title holos-caps";
    title.textContent = "KEEP WATCH WHILE YOU ARE AWAY";
    bar.append(title);
    el.append(bar);

    const body = document.createElement("div");
    body.className = "study-account-body";

    const line = document.createElement("p");
    line.className = "study-watch-line";
    line.textContent =
      "The sky keeps moving whether or not the tab is open. If you allow it, this device can say when a watch you left trips.";
    body.append(line);

    const allow = document.createElement("button");
    allow.type = "button";
    allow.className = "study-account-ack holos-caps";
    allow.textContent = "ALLOW";
    // THE iOS GESTURE TRAP: `enableWatch` calls requestPermission as its first
    // statement, so nothing may be awaited between this click and that call.
    allow.addEventListener("click", () => {
      const publicKey = this.pushPublicKey;
      this.closeWatchSheet();
      if (publicKey === null) return;
      void this.turnWatchOn();
    });
    body.append(allow);

    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "study-watch-decline holos-caps";
    decline.textContent = "NOT NOW";
    decline.addEventListener("click", () => {
      // The mark is what makes it once per device: a permission this player
      // declined is not a question worth asking twice.
      markWatchAsked();
      this.closeWatchSheet();
    });
    body.append(decline);

    el.append(body);
  }

  private closeWatchSheet(): void {
    this.watchSheetEl?.remove();
    this.watchSheetEl = null;
  }

  /** A child of the SHEET (the composer's own mold): survives renderHub()
   *  rebuilding the body underneath it, on every sky and every tick. */
  private renderAccountSheet(): void {
    if (this.accountKeyValue === null) return;
    let el = this.accountSheetEl;
    if (el === null) {
      el = document.createElement("div");
      el.className = "study-account-sheet";
      this.sheet.append(el);
      this.accountSheetEl = el;
    }
    el.innerHTML = "";

    const fresh = this.accountKeyFresh;
    const key = this.accountKeyValue;

    const bar = document.createElement("div");
    bar.className = "study-account-bar";
    const title = document.createElement("div");
    title.className = "study-account-title holos-caps";
    title.textContent = "YOUR KEY";
    bar.append(title);
    // The claim ceremony has no dismiss but the mandatory tap below — a
    // close button here would be a second, unwritten-down way out.
    if (!fresh) {
      const close = document.createElement("button");
      close.type = "button";
      close.className = "study-account-close";
      close.setAttribute("aria-label", "Close");
      close.textContent = "✕";
      close.addEventListener("click", () => this.closeAccountSheet());
      bar.append(close);
    }
    el.append(bar);

    const body = document.createElement("div");
    body.className = "study-account-body";

    const keyLine = document.createElement("div");
    keyLine.className = "study-account-key study-tabular";
    // textContent only: this is the one place a bearer secret ever reaches
    // the DOM, and it never passes through innerHTML or a template string
    // that could be mistaken for markup.
    keyLine.textContent = formatAccountKeyDisplay(key);
    body.append(keyLine);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "study-account-copy holos-caps";
    copyBtn.textContent = "COPY";
    copyBtn.addEventListener("click", () => {
      copyAccountKey(keyLine.textContent ?? "");
      copyBtn.textContent = "COPIED";
      window.setTimeout(() => {
        copyBtn.textContent = "COPY";
      }, 1600);
    });
    body.append(copyBtn);

    if (fresh) {
      const line = document.createElement("p");
      line.className = "study-account-ceremony-line";
      line.textContent =
        "This is your key. Write it down. There is no other way back to this run.";
      body.append(line);

      const ack = document.createElement("button");
      ack.type = "button";
      ack.className = "study-account-ack holos-caps";
      ack.textContent = "I HAVE WRITTEN IT DOWN";
      ack.addEventListener("click", () => this.closeAccountSheet());
      body.append(ack);
    }

    el.append(body);
  }

  private closeAccountSheet(): void {
    const wasShowing = this.accountSheetEl !== null;
    this.accountSheetEl?.remove();
    this.accountSheetEl = null;
    this.accountKeyValue = null;
    // A claim flips `hasAccount` the moment the key comes back (showAccountKey
    // above), but the hub body underneath this overlay was rendered before
    // that — refresh it now so "Keep this run" does not linger under the row
    // that just replaced it.
    if (wasShowing && this.view === "hub") this.renderHub();
  }

  /**
   * THE VOICE's one row. A verb while there is nothing going out, and the
   * year the current shout left while there is — a shout occupies the
   * channel for a while (contact.ts's shout window), and the server refuses
   * a second one, so offering the verb anyway would be offering a refusal.
   */
  private buildVoiceRow(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    // The latest shout, if any: repeated broadcasts are legal once the
    // previous window has closed, so it is the newest one that decides.
    let speaking: number | null = null;
    for (const act of this.contact?.outbound ?? []) {
      if (act.kind !== "broadcast") continue;
      if (speaking === null || act.sentYear > speaking) speaking = act.sentYear;
    }
    const live = speaking !== null && nowYear() - speaking < BROADCAST_WINDOW_YEARS;
    btn.className = live
      ? "study-voice-row study-voice-row--inert holos-caps"
      : "study-voice-row holos-caps";
    if (live && speaking !== null) {
      btn.textContent = `SPEAKING SINCE ${formatAbsoluteYear(speaking)}`;
      btn.disabled = true;
    } else {
      btn.textContent = "SPEAK TO EVERYONE";
      btn.addEventListener("click", () => this.onVoiceActionCb?.());
    }
    if (this.hubScrollToVoice) {
      this.hubScrollToVoice = false;
      // One frame later: the body is still being assembled right now.
      requestAnimationFrame(() => btn.scrollIntoView({ block: "center" }));
    }
    return btn;
  }

  /** What this counterpart is called here: the player's own label if they
   *  gave one, else the designation their instruments assigned. A thread can
   *  outlive its source's visibility, so the starId is the last resort. */
  private threadName(starId: string): string {
    const local = this.localNames.get(starId);
    if (local !== undefined && local.length > 0) return local;
    return this.sourcesByStarId.get(starId)?.designation ?? starId;
  }

  /**
   * The state chip, on the row and again in the thread's header.
   *
   * NOTHING HERE CLAIMS WHAT THE WIRE DID NOT SEND. `nextEventYear` is only
   * ever the player's OWN next arrival (protocol.ts's no-leak audit), so the
   * countdown beside IN FLIGHT is their own beam and never a reply. AWAITING
   * says AWAITING and nothing else: there is no branch below that could
   * reach for an answer that has not landed.
   */
  private threadStateText(t: ThreadSummary): string {
    const base = THREAD_STATE_LABEL[t.state];
    if (t.state === "in-flight" && t.nextEventYear !== null) {
      const countdown = formatCountdown(t.nextEventYear);
      if (countdown !== null) return `${base} · ARRIVES IN ${countdown}`;
    }
    if (t.state === "answered") return `${base} ${formatAbsoluteYear(t.lastEventYear)}`;
    return base;
  }

  /** One thread on the hub: what you call them, and where the thread stands.
   *  The tap says which thread is open and switches the view; the detail
   *  arrives on the sky that answers (openThread). */
  private buildThreadRow(t: ThreadSummary): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-thread-row";

    const name = document.createElement("div");
    name.className = "study-thread-name holos-serif";
    name.textContent = this.threadName(t.starId);

    const state = document.createElement("div");
    state.className = "study-thread-state holos-caps study-tabular";
    state.textContent = this.threadStateText(t);
    this.liveClocks.push({ el: state, text: () => this.threadStateText(t) });

    btn.append(name, state);
    btn.addEventListener("click", () => this.openThread(t.starId));
    return btn;
  }

  /** A2.6: one muted thread. The row is the undo and nothing else — there is
   *  nothing to open, because the wire carries nothing about it. */
  private buildMutedRow(starId: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-thread-row study-thread-row--muted";

    const name = document.createElement("div");
    name.className = "study-thread-name holos-serif";
    name.textContent = this.threadName(starId);

    const state = document.createElement("div");
    state.className = "study-thread-state holos-caps";
    state.textContent = "MUTED · UNMUTE";

    btn.append(name, state);
    btn.addEventListener("click", () => {
      this.socket.send({ type: "muteThread", starId, muted: false });
    });
    return btn;

    // The playtest reset. Below its own hairline and in faint ink rather
    // than the rows' amber, because it is not one of the verbs the panel
    // exists to offer: everything above is something the CIVILIZATION can
    // begin, and this is something the PLAYER does to the run. It never
    // fires from here — the tap opens the consequences first.
    this.body.append(this.hairline());
    this.body.append(
      this.buildHubRow(
        "Start over",
        "Give up this civilization and inherit again.",
        true,
        () => this.openStartOver(),
        "aside",
      ),
    );

  }

  /** `tone` is the row's standing in the panel, not its state: "aside" is a
   *  live, tappable row that is not one of the game's verbs (the reset).
   *  Inertness stays where it was, on `active`. */
  private buildHubRow(
    label: string,
    sublabel: string,
    active: boolean,
    onClick: () => void,
    tone: "verb" | "aside" = "verb",
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = active ? "study-hub-row" : "study-hub-row study-hub-row--inert";
    if (tone === "aside") btn.classList.add("study-hub-row--aside");
    if (active) {
      btn.addEventListener("click", onClick);
    } else {
      btn.disabled = true;
    }

    const labelEl = document.createElement("div");
    labelEl.className = "study-hub-label";
    labelEl.textContent = label;

    const subEl = document.createElement("div");
    subEl.className = "study-hub-sub";
    subEl.textContent = sublabel;

    btn.append(labelEl, subEl);
    return btn;
  }

  /**
   * AV3: one proposal — the deadpan reason (plus the AV4 stance, when the
   * mind has one) as prose that accepts on click, then the two answers on
   * one row beneath it: `.proposal-accept` is the verb, a pill you can see
   * is tappable; `.proposal-decline` is the one-tap, no-confirmation "no" at
   * the far end. Two SIBLING buttons, never nested. A distinct block from
   * buildHubRow deliberately: a proposal is a sentence from a different
   * speaker, not a place-name-over-sublabel browse row, and rendering it in
   * the same clothes would blur that.
   */
  private buildProposalRow(p: Proposal): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "proposal-row";

    // The prose is the row's other tap target: clicking what the mind said
    // does what its verb does. Deliberately NOT a second <button> — the pill
    // below is already the labelled control, and a button wrapping the whole
    // reason would double the tab stop and make a screen reader announce the
    // sentence twice. This is pointer convenience; the pill carries the
    // semantics.
    const reason = document.createElement("div");
    reason.className = "proposal-reason";
    reason.addEventListener("click", () => this.followProposalRoute(p.route));
    row.append(reason);

    const line = document.createElement("div");
    line.className = "proposal-line";
    line.textContent = p.line;
    reason.append(line);

    // AV4-only: always omitted at the AV3 floor, where stance is always null.
    if (p.stance !== null) {
      const stance = document.createElement("div");
      stance.className = "proposal-stance";
      stance.textContent = p.stance;
      reason.append(stance);
    }

    const actions = document.createElement("div");
    actions.className = "proposal-actions";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "proposal-accept holos-caps";
    accept.textContent = p.verb;
    // The reason is no longer inside the button, so the accessible name has
    // to carry it: "READ THE BRIEF" alone says nothing about which source.
    accept.setAttribute("aria-label", `${p.verb}: ${p.line}`);
    accept.addEventListener("click", () => this.followProposalRoute(p.route));

    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "proposal-decline";
    decline.textContent = "Leave It";
    decline.setAttribute("aria-label", `Leave it: ${p.line}`);
    decline.addEventListener("click", () => {
      // Quiet, one tap, no confirmation — declining is free and costs
      // nothing to be wrong about. Optimistic local filter; the confirming
      // `sky` re-supplies the (shorter) list wholesale. If the message is
      // dropped the proposal simply returns on the next `sky`.
      this.socket.send({ type: "declineProposal", id: p.id });
      this.proposals = this.proposals.filter((x) => x.id !== p.id);
      this.renderHub();
    });

    actions.append(accept, decline);
    row.append(actions);
    return row;
  }

  /** followReportRoute's twin: every arm names an EXISTING client entry
   *  point, so accepting a proposal never opens anything AV3 builds.
   *  Accepting writes nothing server-side — there is no `acceptProposal`
   *  message. Opening a surface is not a decision, so the candidate re-arms
   *  if the player backs out without committing (the AV3 design's edge
   *  case — "accept-then-don't-commit"). */
  private followProposalRoute(route: ProposalRoute): void {
    switch (route.kind) {
      case "study-brief":
        this.openBrief(route.starId, "hub");
        break;
      case "question":
        this.focusStudyQuestion(route.starId, route.questionId);
        break;
      case "launch":
        this.openLaunch(route.starId);
        break;
      case "project":
        this.focusProject(route.projectId, "hub");
        break;
    }
  }

  /** "3 under way · 2 watching · 1 silent" / "Nothing under way." — the
   *  panel's live summary, derived from its own rows (never a second
   *  count). Under way means a clock is actually running: a study only
   *  accruing light is watching, and counting it as work would inflate the
   *  number every time a vigil sat idle. */
  private tendSummaryLine(): string {
    if (this.tend.length === 0) return "Nothing under way.";
    const watching = this.tend.filter((r) => r.state === "watching").length;
    const silent = this.tend.filter((r) => r.state === "silent").length;
    const underWay = this.tend.filter((r) => r.nextYear !== null).length;
    const parts: string[] = [];
    if (underWay > 0) parts.push(`${underWay} under way`);
    if (watching > 0) parts.push(`${watching} watching`);
    if (silent > 0) parts.push(`${silent} silent`);
    return parts.length === 0 ? "Nothing under way." : parts.join(" · ");
  }

  // ── Render: start-over view ──────────────────────────────────────────

  /**
   * What starting over actually costs, then the verb. The page exists
   * because the hub row must not be a one-tap erase, and because the honest
   * description of the reset is three sentences long: this is the one place
   * in the UI that admits the game is being played on a test cohort.
   *
   * The prose does not soften it. A run's whole history goes, the star goes
   * back into the pool, and — the part no game verb could ever do — the
   * light this civilization already sent stops arriving for everyone else,
   * because every view in the game is derived from the galaxy as it is now.
   */
  private renderStartOver(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "START OVER";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "A playtester's tool, not a move in the game.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    const note = document.createElement("div");
    note.className = "study-startover-note";
    note.textContent =
      "This civilization is given up: its studies, its projects, its missions " +
      "and everything it ever learned. Its star returns to the pool for whoever " +
      "inherits next, and the light it has already sent stops arriving for the " +
      "others. Nothing in the game itself works this way. You then inherit " +
      "again, from a fresh offer, at the cohort's current year.";
    this.body.append(note);

    if (this.startOverError !== null) {
      const error = document.createElement("div");
      error.className = "study-startover-note study-startover-note--error";
      error.textContent = this.startOverError;
      this.body.append(error);
    }

    const row = document.createElement("div");
    row.className = "study-verb-row";
    const btn = document.createElement("button");
    btn.type = "button";
    // The pill, not the bare text verb: this is the one verb the page
    // exists to offer, and the recent turn across the panel is that a verb
    // you are meant to press looks pressable. The prose above carries the
    // weight of what it does; the button only has to be legible.
    btn.className = "study-verb-btn study-verb-btn--primary";
    btn.textContent = this.startOverPending ? "GIVING UP…" : "GIVE UP THIS CIVILIZATION";
    btn.disabled = this.startOverPending;
    btn.addEventListener("click", () => {
      void this.runStartOver();
    });
    row.append(btn);
    this.body.append(row);
  }

  /** The tap. On success this never comes back — startOver() reloads the
   *  page. On refusal the run is untouched (the token is cleared only after
   *  the server confirms), so the only thing to do is say so and let the
   *  player tap again. */
  private async runStartOver(): Promise<void> {
    if (this.startOverPending) return;
    this.startOverPending = true;
    this.startOverError = null;
    this.renderStartOver();
    try {
      await startOver();
    } catch {
      this.startOverPending = false;
      this.startOverError =
        "The cohort would not let go of this run. Nothing was given up. Try again.";
      this.renderStartOver();
    }
  }

  // ── Render: explore view ─────────────────────────────────────────────

  private renderExplore(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE SKY";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "Everything your instruments have found. Tap one to look closer.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    const sources = [...this.sourcesByStarId.values()].sort(
      (a, b) => a.lightAgeYears - b.lightAgeYears,
    );

    for (const source of sources) {
      this.body.append(this.buildExploreRow(source));
    }
  }

  /**
   * The source as its instrument actually renders it: a warm, formless blot
   * whose radius GROWS as confidence falls and whose core brightens as it
   * rises. Same law the Model draws in the sky (model.ts's SMUDGE_* sizing),
   * so a source looks like itself wherever the player meets it — and the
   * sharpening of the image is the progress bar of the inference game
   * (ui-design.md § principle 4).
   */
  private sourceSmudge(confidence: number): HTMLDivElement {
    const conf = clamp01(confidence);
    const cell = document.createElement("div");
    cell.className = "study-row-smudgecell";

    const blot = document.createElement("div");
    blot.className = "study-row-smudge";
    const diameter = 30 + (1 - conf) * 26;
    blot.style.width = `${diameter.toFixed(1)}px`;
    blot.style.height = `${(diameter * 0.86).toFixed(1)}px`;
    blot.style.filter = `blur(${(4 + (1 - conf) * 7).toFixed(1)}px)`;
    blot.style.opacity = (0.34 + conf * 0.52).toFixed(2);

    cell.append(blot);
    return cell;
  }

  /** The shared anatomy of a source row: the blot, then the belief loud with
   *  the catalog designation and the light-age quiet around it. */
  private buildSourceRow(source: DetectedSource): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-picker-row";
    btn.append(this.sourceSmudge(source.signal.confidence), this.buildSourceIdentity(source));
    return btn;
  }

  /** The text half of a source row — designation, local name, belief, light
   *  age. Shared with the briefing so a source reads identically either side
   *  of the tap that opens it. */
  private buildSourceIdentity(source: DetectedSource): HTMLDivElement {
    const text = document.createElement("div");
    text.className = "study-row-text";

    const idLine = document.createElement("div");
    idLine.className = "study-row-idline";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    idLine.append(desig);

    const localName = this.localNames.get(source.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      idLine.append(nm);
    }

    const beliefLine = document.createElement("div");
    beliefLine.className = "study-row-beliefline";
    const cls = document.createElement("span");
    cls.className = "study-row-class";
    cls.textContent = CLASS_LABEL[source.signal.classification];
    const conf = document.createElement("span");
    conf.className = "study-row-conf";
    conf.textContent = `${Math.round(source.signal.confidence * 100)}%`;
    beliefLine.append(cls, conf);

    const age = document.createElement("div");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;

    text.append(idLine, beliefLine, age);
    return text;
  }

  private buildExploreRow(source: DetectedSource): HTMLButtonElement {
    const btn = this.buildSourceRow(source);
    btn.addEventListener("click", () => {
      this.onInspectCb?.(source.starId);
      this.close();
    });

    if (this.studiesByStarId.has(source.starId)) {
      const flag = document.createElement("span");
      flag.className = "study-explore-flag holos-caps";
      flag.textContent = "UNDER STUDY";
      btn.append(flag);
    }

    return btn;
  }

  // ── Render: list view ────────────────────────────────────────────────

  private renderList(): void {
    this.body.innerHTML = "";

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE OBSERVATORY";
    this.body.append(header);

    const all = [...this.studiesByStarId.values()];
    if (all.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "No studies open.";
      this.body.append(empty);
      this.body.append(this.buildStartStudyButton());
      return;
    }

    const open = all.filter((s) => s.status === "open");
    // Closed studies keep their own sections, and grounded comes first: a
    // study a probe settled is a finding, and a shelved one is only a vigil
    // put down. A2.3's two other exits join grounded ahead of shelved for
    // the same reason — called and overtaken are both closed, decided
    // outcomes, not a vigil merely paused.
    const grounded = all.filter((s) => s.status === "grounded");
    const called = all.filter((s) => s.status === "called");
    const overtaken = all.filter((s) => s.status === "overtaken");
    const shelved = all.filter((s) => s.status === "shelved");

    for (const s of open) {
      const row = this.buildRow(s, false);
      if (row !== null) this.body.append(row);
    }

    for (const [label, group] of [
      ["GROUNDED", grounded],
      ["CALLED", called],
      ["OVERTAKEN", overtaken],
      ["SHELVED", shelved],
    ] as const) {
      if (group.length === 0) continue;
      const divider = document.createElement("div");
      divider.className = "study-board-divider holos-caps";
      divider.textContent = label;
      this.body.append(divider);
      for (const s of group) {
        const row = this.buildRow(s, true);
        if (row !== null) this.body.append(row);
      }
    }

    this.body.append(this.buildStartStudyButton());
  }

  private buildStartStudyButton(): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "study-verb-row";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-verb-btn";
    btn.textContent = "+ START A STUDY";
    btn.addEventListener("click", () => this.openPicker());
    row.append(btn);
    return row;
  }

  /** A study with no matching DetectedSource is skipped entirely (defensive:
   * should not happen, but there is nothing sane to render). */
  private buildRow(s: StudySnapshot, dimmed: boolean): HTMLButtonElement | null {
    const source = this.sourcesByStarId.get(s.starId);
    if (source === undefined) return null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = dimmed ? "study-row study-row--dim" : "study-row";
    btn.addEventListener("click", () => this.focusStudy(s.starId));

    // A2.3: a called or overtaken card reads the belief FROZEN at the
    // transition, never the live board — the live hypotheses keep accruing
    // light in the background (protocol.ts's whole point of freezing
    // `call`/`overtaking`), and the card would otherwise quietly disagree
    // with the very record it is meant to preserve. Every other status
    // (open, shelved, grounded) still reads the live leader, exactly as it
    // always has.
    const frozen =
      s.status === "called" && s.call !== null
        ? { label: s.call.label, gloss: s.call.gloss, share: s.call.share, ageYears: s.call.lightAgeYears }
        : s.status === "overtaken" && s.overtaking !== null
          ? {
              label: s.overtaking.lead.label,
              gloss: s.overtaking.lead.gloss,
              share: s.overtaking.lead.share,
              ageYears: s.overtaking.lightAgeYears,
            }
          : null;

    // Sized by the LEADING hypothesis rather than the raw signal confidence:
    // a study's blot tightens as its own belief firms, so the list shows
    // progress the same way the focused sheet does. A frozen card sizes off
    // its own frozen share instead, the same rule at the year it stopped.
    const leader = leadingHypothesis(s.hypotheses);
    btn.append(this.sourceSmudge(frozen?.share ?? leader?.share ?? 0));

    const text = document.createElement("div");
    text.className = "study-row-text";

    const idLine = document.createElement("div");
    idLine.className = "study-row-idline";
    const desig = document.createElement("span");
    desig.className = "study-row-designation holos-caps";
    desig.textContent = source.designation;
    idLine.append(desig);

    const localName = this.localNames.get(s.starId);
    if (localName !== undefined && localName.length > 0) {
      const nm = document.createElement("span");
      nm.className = "study-row-name holos-serif";
      nm.textContent = localName;
      idLine.append(nm);
    }

    const beliefLine = document.createElement("div");
    beliefLine.className = "study-row-beliefline";
    if (frozen !== null) {
      const label = document.createElement("span");
      label.className = "study-row-class";
      label.textContent = frozen.label;
      const percent = document.createElement("span");
      percent.className = "study-row-conf study-tabular";
      percent.textContent = `${Math.round(clamp01(frozen.share) * 100)}%`;
      beliefLine.append(label, percent);
    } else if (leader !== undefined) {
      const pcts = hypothesisPercentages(s.hypotheses);
      const pct = pcts.get(leader.id) ?? Math.round(leader.share * 100);
      const label = document.createElement("span");
      label.className = "study-row-class";
      label.textContent = leader.label;
      const percent = document.createElement("span");
      percent.className = "study-row-conf study-tabular";
      percent.textContent = `${pct}%`;
      beliefLine.append(label, percent);
    }

    text.append(idLine, beliefLine);

    // The gloss the label would otherwise need decoding without, exactly as
    // the focused sheet's own hypothesis rows carry it — shown only for the
    // frozen readings, where the card is the one place this belief is told.
    if (frozen !== null) {
      const gloss = document.createElement("div");
      gloss.className = "study-row-gloss";
      gloss.textContent = frozen.gloss;
      text.append(gloss);
    }

    // Overtaken names what it used to be as well as what it reads as now —
    // the card's whole reason for its own section, never shown elsewhere.
    if (s.status === "overtaken" && s.overtaking !== null) {
      const flag = document.createElement("div");
      flag.className = "study-row-overtaken-flag holos-caps";
      flag.textContent = `${CLASS_LABEL[s.overtaking.fromClass]} → ${CLASS_LABEL[s.overtaking.toClass]}`;
      text.append(flag);
    }

    const age = document.createElement("div");
    age.className = "study-row-age holos-caps";
    age.textContent = `AS OF ${(frozen?.ageYears ?? source.lightAgeYears).toFixed(1)} Y AGO`;

    text.append(age);
    btn.append(text);
    return btn;
  }

  // ── Render: picker view ──────────────────────────────────────────────

  private renderPicker(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "START A STUDY";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent = "Sources your instruments have found. Tap one to read the brief.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    const candidates = [...this.sourcesByStarId.values()]
      .filter((source) => !this.studiesByStarId.has(source.starId))
      .sort((a, b) => a.lightAgeYears - b.lightAgeYears);

    if (candidates.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "Nothing new in reach. Every source found is already under study.";
      this.body.append(empty);
      return;
    }

    for (const source of candidates) {
      this.body.append(this.buildPickerRow(source));
    }
  }

  private buildPickerRow(source: DetectedSource): HTMLButtonElement {
    const btn = this.buildSourceRow(source);
    btn.addEventListener("click", () => this.openBrief(source.starId));
    return btn;
  }

  // ── Render: briefing view ────────────────────────────────────────────
  // Tapping a candidate does not open a study — it opens the brief. A study
  // is free, uncapped and reversible, so the brief's job is not to price a
  // transaction (there is none) but to say what the watch is, what it can
  // tell apart, and what it will and will not cost. Nothing here invents a
  // spend: compute buys questions, and questions are their own slice.

  /** AV3: public — a proposal's `study-brief` route (followProposalRoute)
   *  is the mind's own affordance for opening this same brief, alongside
   *  the picker row's tap. */
  openBrief(starId: string, from: "picker" | "hub" = "picker"): void {
    this.view = "brief";
    this.briefStarId = starId;
    this.briefReturn = from;
    this.pendingBeginStarId = null;
    this.renderBrief();
    // The sheet body keeps its scroll across view swaps, and a picker
    // scrolled deep would otherwise open the brief past its own starmap.
    // Entry only — the sky-driven re-render must never yank a reader.
    this.body.scrollTop = 0;
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  private renderBrief(): void {
    const starId = this.briefStarId;
    const source = starId === null ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";

    // The source faded between the picker and here — there is nothing to
    // brief, so fall back rather than render a card about nothing.
    if (starId === null || source === undefined) {
      this.briefStarId = null;
      if (this.briefReturn === "hub") {
        this.view = "hub";
        this.renderHub();
      } else {
        this.view = "picker";
        this.renderPicker();
      }
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      if (this.briefReturn === "hub") this.openHub();
      else this.openPicker();
    });
    this.body.append(back);

    // The chart first: where this source actually sits relative to home —
    // the brief opens on the geometry the whole watch is about.
    const map = this.buildBriefStarmap(source);
    if (map !== null) this.body.append(map);

    // The same identity block the picker row carries, so the source reads as
    // itself across the tap — minus the smudge, which the starmap directly
    // above already draws (under the same sizing law), and which said the
    // percentage a second time in a form nobody had asked for. The gloss
    // takes its place: the one number on this screen, stated in words.
    const identity = document.createElement("div");
    identity.className = "study-brief-identity";
    identity.append(this.buildSourceIdentity(source));
    const confGloss = document.createElement("div");
    confGloss.className = "study-brief-conf-gloss";
    confGloss.textContent =
      "The percentage is confidence in the reading, not a measure of the source: " +
      "nearer and brighter light reads surer. The remainder belongs to the other " +
      "stories the same light still allows.";
    identity.append(confGloss);
    this.body.append(identity);

    this.body.append(this.hairline());

    this.body.append(
      this.buildBriefSection(
        "WHAT A STUDY IS",
        "A standing watch on one source. Its light reaches us at its own delay, and every arrival is filed here and read against the stories still in play.",
      ),
    );

    const menu = this.menus === null ? [] : this.menus[source.signal.classification];
    if (menu.length > 0) {
      const section = this.buildBriefSection(
        "WHAT IT COULD TELL APART",
        // No class name in this sentence: the labels are not all count nouns
        // ("a transit shadows"), and the class already sits in the identity
        // block directly above.
        "At this range the reading admits more than one story. The watch holds them all at once, each with its share of the confidence.",
      );
      const list = document.createElement("div");
      list.className = "study-brief-menu";
      // Label over gloss, exactly as the board's hypothesis rows carry them —
      // the same reading in the same words on both sides of the tap.
      for (const entry of menu) {
        const item = document.createElement("div");
        item.className = "study-hyp-labelcol study-brief-reading";
        const label = document.createElement("span");
        label.className = "study-hyp-label holos-caps";
        label.textContent = entry.label;
        const gloss = document.createElement("span");
        gloss.className = "study-hyp-gloss";
        gloss.textContent = entry.gloss;
        item.append(label, gloss);
        list.append(item);
      }
      section.append(list);
      this.body.append(section);
    }

    this.body.append(
      this.buildBriefSection(
        "WHAT IT COSTS",
        "Nothing to open, nothing to hold, and no limit on how many stand at once. The light arrives whether or not you attend to it, so watching spends only patience. Compute buys questions, the inference that separates one reading from another, and no question has been put to this source.",
      ),
    );

    const meta = document.createElement("div");
    meta.className = "study-brief-meta holos-caps";
    meta.textContent = "NO COMPUTE · NO CLOCK · REVERSIBLE";
    this.body.append(meta);

    this.body.append(this.hairline());

    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    // The one commit on this screen, and the only one outside the ceremony
    // that costs the player a decision — so it wears the ceremony's lit
    // stone rather than the outlined pill the lesser verbs share.
    verbBtn.className = "study-verb-btn study-verb-btn--ember";
    if (this.pendingBeginStarId === starId) {
      verbBtn.disabled = true;
      verbBtn.textContent = "Opening the Watch…";
    } else {
      verbBtn.textContent = "Begin the Watch";
      verbBtn.addEventListener("click", () => {
        this.pendingBeginStarId = starId;
        this.socket.send({ type: "openStudy", starId });
        this.renderBrief();
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);
  }

  private buildBriefSection(header: string, body: string): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "study-brief-section";

    const h = document.createElement("div");
    h.className = "study-section-header holos-caps";
    h.textContent = header;

    const p = document.createElement("div");
    p.className = "study-brief-body";
    p.textContent = body;

    section.append(h, p);
    return section;
  }

  /**
   * The chart at the top of the briefing: HOME and this source at their true
   * bearing through the neighborhood, joined by the sightline the light
   * actually crosses. Everything on it is re-used vocabulary — the public
   * catalog's positions, the Model's point-in-a-thin-cyan-ring HOME and its
   * amber smudge law, the panel's hairline gold for the path — so it reads
   * as the sky folded flat, not a new diagram. Null (no map at all) when the
   * geometry isn't known: a DetectedSource carries no position (the
   * ObservedCiv boundary), so the chart needs the star from the catalog and
   * a SelfView, and it would rather be absent than invented.
   */
  private buildBriefStarmap(source: DetectedSource): HTMLDivElement | null {
    if (this.self === null || !this.starsById.has(source.starId)) return null;

    const wrap = document.createElement("div");
    wrap.className = "study-brief-map";

    const canvas = document.createElement("canvas");
    wrap.append(canvas);

    // The labels ride the canvas's geometry but live in the DOM, so they
    // stay real type on the tokens (and the HOME cyan is one declaration in
    // style.css, not a canvas constant).
    const homeLabel = document.createElement("span");
    homeLabel.className = "study-brief-map-home holos-caps";
    homeLabel.textContent = "HOME";

    const sourceLabel = document.createElement("span");
    sourceLabel.className = "study-brief-map-source holos-caps";
    sourceLabel.textContent = source.designation;

    const distLabel = document.createElement("span");
    distLabel.className = "study-brief-map-dist holos-caps";
    distLabel.textContent = `${source.distanceLy.toFixed(1)} LY`;

    wrap.append(homeLabel, sourceLabel, distLabel);

    // The body this sits in was just rebuilt synchronously and has no
    // layout yet, so widths are only real next frame — measure and paint
    // then. A view change in the same beat disconnects the canvas and the
    // frame is simply dropped (drawBriefStarmap's guard).
    requestAnimationFrame(() =>
      this.drawBriefStarmap(wrap, canvas, homeLabel, sourceLabel, distLabel, source),
    );
    return wrap;
  }

  /** Measure-and-paint half of the starmap — see buildBriefStarmap. */
  private drawBriefStarmap(
    wrap: HTMLDivElement,
    canvas: HTMLCanvasElement,
    homeLabel: HTMLSpanElement,
    sourceLabel: HTMLSpanElement,
    distLabel: HTMLSpanElement,
    source: DetectedSource,
  ): void {
    const self = this.self;
    const target = this.starsById.get(source.starId);
    if (!canvas.isConnected || self === null || target === undefined) return;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.scale(dpr, dpr);

    const home = self.position;
    const dx = target.position.x - home.x;
    const dy = target.position.y - home.y;
    const dz = target.position.z - home.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!Number.isFinite(dist) || dist <= 0) return;

    // The chart's frame: u runs HOME → source and lies along the drawn
    // line; v is any perpendicular (u × the world axis u leans on least).
    // Background stars keep their true offsets along both, so the scatter
    // is the real neighborhood seen side-on to the sightline — the same
    // stars the Model draws, folded flat, not decoration.
    const ux = dx / dist;
    const uy = dy / dist;
    const uz = dz / dist;
    const kx = Math.abs(uy) < 0.9 ? 0 : 1;
    const ky = 1 - kx;
    let vx = -uz * ky;
    let vy = uz * kx;
    let vz = ux * ky - uy * kx;
    const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
    vx /= vLen;
    vy /= vLen;
    vz /= vLen;

    const xHome = w * 0.14;
    const xSource = w * 0.86;
    const yLine = h * 0.44;
    const scale = (xSource - xHome) / dist;

    // Canvas ink, mirroring style.css's tokens — gradient stops need an
    // explicit alpha, so the vars can't be read straight in. (--holos-ink,
    // --holos-gold, --holos-cyan, and .study-row-smudge's amber.)
    const INK = "239, 233, 219";
    const GOLD = "211, 185, 130";
    const CYAN = "126, 233, 239";
    const AMBER = "240, 172, 102";

    // The rest of the neighborhood, faint, brighter by class the way the
    // sky is. Skips the two endpoints (they get their own marks) and
    // anything projected off the chart.
    for (const star of this.starsById.values()) {
      if (star.id === self.starId || star.id === target.id) continue;
      const px = star.position.x - home.x;
      const py = star.position.y - home.y;
      const pz = star.position.z - home.z;
      const sx = xHome + (px * ux + py * uy + pz * uz) * scale;
      const sy = yLine + (px * vx + py * vy + pz * vz) * scale;
      if (sx < 3 || sx > w - 3 || sy < 3 || sy > h - 3) continue;
      const alpha =
        star.spectralClass === "F" ? 0.4
        : star.spectralClass === "G" ? 0.32
        : star.spectralClass === "K" ? 0.24
        : 0.16;
      ctx.fillStyle = `rgba(${INK}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // The source's smudge radius first — the sightline stops at its edge.
    const conf = clamp01(source.signal.confidence);
    const smudgeR = 8 + (1 - conf) * 8;

    // The sightline: the panel's hairline gold, dotted, from the ring's
    // edge to the smudge — the path the light crosses.
    ctx.strokeStyle = `rgba(${GOLD}, 0.55)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 4.5]);
    ctx.beginPath();
    ctx.moveTo(xHome + 9, yLine);
    ctx.lineTo(xSource - smudgeR * 0.5, yLine);
    ctx.stroke();
    ctx.setLineDash([]);

    // HOME: the Model's mark — a point inside a thin cyan ring.
    ctx.fillStyle = `rgba(${CYAN}, 1)`;
    ctx.beginPath();
    ctx.arc(xHome, yLine, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${CYAN}, 0.85)`;
    ctx.beginPath();
    ctx.arc(xHome, yLine, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    // The source: the same smudge law as everywhere else — radius grows as
    // confidence falls, the core brightens as it rises (sourceSmudge's
    // numbers, at map scale).
    const core = 0.34 + conf * 0.52;
    const grad = ctx.createRadialGradient(xSource, yLine, 0, xSource, yLine, smudgeR);
    grad.addColorStop(0, `rgba(${AMBER}, ${core})`);
    grad.addColorStop(0.55, `rgba(${AMBER}, ${core * 0.45})`);
    grad.addColorStop(1, `rgba(${AMBER}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(xSource, yLine, smudgeR, 0, Math.PI * 2);
    ctx.fill();

    homeLabel.style.left = `${xHome}px`;
    homeLabel.style.top = `${yLine + 12}px`;
    sourceLabel.style.left = `${xSource}px`;
    sourceLabel.style.top = `${yLine + 12}px`;
    distLabel.style.left = `${(xHome + xSource) / 2}px`;
    distLabel.style.top = `${yLine - 26}px`;
  }

  /**
   * Releases any verb that no `sky` will ever confirm (the server answered
   * with an error instead), so a pending trio never sits disabled forever.
   *
   * A2.6 takes the CODE, for exactly one branch: `contact-unavailable` on a
   * send is the turnaround floor, and the floor is the one refusal with
   * something to say. Every other code still releases the same silent way.
   */
  handleServerError(code?: CohortErrorCode): void {
    let releasedBegin = false;
    if (this.pendingBeginStarId !== null) {
      this.pendingBeginStarId = null;
      releasedBegin = true;
    }
    let releasedQuestion = false;
    if (this.pendingQuestion !== null) {
      this.pendingQuestion = null;
      releasedQuestion = true;
    }
    let releasedProject = false;
    if (this.pendingProjectId !== null) {
      this.pendingProjectId = null;
      releasedProject = true;
    }
    let releasedLaunch = false;
    if (this.pendingLaunchStarId !== null) {
      this.pendingLaunchStarId = null;
      this.pendingLaunchPriorMissionIds = new Set();
      releasedLaunch = true;
    }
    // A2.3: "study-unavailable" (a stale callStudy) and "tripwire-unavailable"
    // both render exactly like every error code above always has — releasing
    // whatever was in flight, no toast, no special-cased text.
    // A4: a refused founding releases exactly the way a refused mission does
    // — the charter STAYS WRITTEN, so a refusal costs the hold and nothing
    // else. `voyage-unavailable`, `project-required` and `insufficient-compute`
    // all land here, and the control simply reads why on the next fill.
    let releasedVoyage = false;
    if (this.pendingVoyageStarId !== null) {
      this.pendingVoyageStarId = null;
      this.pendingVoyagePriorIds = new Set();
      this.launchedVoyageId = null;
      this.voyageBloomDone = true;
      this.cancelVoyageHold();
      releasedVoyage = true;
    }
    let releasedCall = false;
    if (this.pendingCallStarId !== null) {
      this.pendingCallStarId = null;
      releasedCall = true;
    }
    let releasedTripwire = false;
    if (this.pendingTripwireKeys.size > 0) {
      this.pendingTripwireKeys.clear();
      releasedTripwire = true;
    }
    // A4: an arm/disarm refused. `order-unavailable` (no such class, or the
    // condition ALREADY HOLDS, which is a tripwire's exact contract — an order
    // is for what happens next) and `bad-charter` both land here and both
    // render the way every code above always has: release what was in flight,
    // no toast, no special-cased text. THE CHARTER STAYS WRITTEN, so a refusal
    // costs the tap and nothing else.
    let releasedOrder = false;
    if (this.pendingOrderClass !== null) {
      this.pendingOrderClass = null;
      releasedOrder = true;
    }
    // A2.6: a refused signal releases like every code above — no toast, no
    // special-cased text — and THE COMPOSITION STAYS ASSEMBLED, so a refusal
    // costs the tap and nothing else. `bad-signal` and `part-unavailable`
    // mean a selector went stale between the render and the send (a study
    // called twice, an accord move already answered), and the next render of
    // the picker will simply not offer it again.
    let releasedSignal = false;
    if (this.pendingSignal) {
      this.pendingSignal = false;
      releasedSignal = true;
      // THE TURNAROUND FLOOR. Their beam is younger than the floor, which is
      // the same on every thread and says nothing about who sent it. The
      // composer stands down behind one flat line, with no countdown.
      if (code === "contact-unavailable") this.raiseFloorNotice();
    }

    // A2.6: a claim/reveal in flight is released the same silent way as
    // everything above. `already-claimed` is the one live race worth naming
    // (two devices tapping "Keep this run" on the same seat) and it answers
    // exactly like the rest — no toast, the hub row simply stays as it was
    // and the next open reads it fresh.
    if (
      this.pendingAccountAction !== null &&
      (code === "already-claimed" || code === "not-signed-in" || code === "too-many-attempts")
    ) {
      this.pendingAccountAction = null;
    }

    if (releasedBegin && this.view === "brief") this.renderBrief();
    if (
      (releasedQuestion || releasedCall || releasedTripwire) &&
      this.view === "focused" &&
      this.focusedStarId !== null
    ) {
      this.renderFocused(this.focusedStarId);
    }
    if (releasedProject && this.view === "project") this.renderProjectDetail();
    if (releasedLaunch && this.view === "launch") this.renderLaunch();
    if (releasedVoyage && this.view === "voyage") this.renderVoyageLaunch();
    if (releasedOrder && this.view === "orders") this.renderOrders();
    if (releasedSignal && this.view === "thread") this.renderThread();
  }

  // ── Render: projects view ────────────────────────────────────────────

  private renderProjects(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "PROJECTS";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent =
      "What the observatory can build. Tap one to read what it grants.";
    this.body.append(subtitle);

    this.body.append(this.buildBudgetLine());

    this.body.append(this.hairline());

    for (const p of this.projects) {
      this.body.append(this.buildProjectRow(p));
    }
  }

  /** Every row opens the detail sheet — the picker → brief pattern. Nothing
   *  is bought from the list: the commit verb lives on the sheet, behind
   *  the grant, the cost, and the allocation line. */
  private buildProjectRow(p: ProjectSnapshot): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-project-row";
    btn.addEventListener("click", () => this.focusProject(p.id, "projects"));

    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = p.label;

    const line = document.createElement("div");
    line.className = "study-project-line";
    line.textContent = p.line;

    const meta = document.createElement("div");
    meta.className = "study-project-meta holos-caps";

    let flag: HTMLSpanElement | null = null;

    if (p.status === "running") {
      const countdown = p.landsYear === null ? null : formatCountdown(p.landsYear);
      meta.textContent = countdown !== null ? `LANDS IN ${countdown}` : "LANDING";
    } else if (p.status === "standing") {
      // Income projects wear their rate; the others landed a one-time grant
      // the sheet spells out, so the row carries the landing date instead —
      // never a false "+0/Y".
      meta.textContent =
        p.addRatePerYear > 0
          ? `+${p.addRatePerYear}/Y`
          : `LANDED ${formatAbsoluteYear(p.landsYear ?? 0)}`;
      flag = document.createElement("span");
      flag.className = "study-project-flag holos-caps";
      flag.textContent = "STANDING";
    } else {
      // "available"
      const free = this.currentFreeCompute();
      const rate = p.addRatePerYear > 0 ? ` · +${p.addRatePerYear}/Y` : "";
      const base = `${p.costCompute} COMPUTE · ${formatClockPair(p.durationYears)}${rate}`;
      meta.textContent =
        free >= p.costCompute
          ? base
          : `${base} · ${Math.ceil(p.costCompute - free)} SHORT`;
    }

    btn.append(label, line, meta);
    if (flag !== null) btn.append(flag);
    return btn;
  }

  // ── Render: project detail ───────────────────────────────────────────
  // The sheet that answers, for one project: what it grants, what it costs,
  // where its clock stands, and what the allocation can bear right now.
  // Reached from the Projects list and from a Tend project row; for an
  // available project it also carries the one commit verb (the brief's
  // "begin the watch" pattern — nothing on the list spends).

  private renderProjectDetail(): void {
    const id = this.focusedProjectId;
    const p = id === null ? undefined : this.projects.find((pp) => pp.id === id);
    this.body.innerHTML = "";

    // The catalog is fixed server-side, so a missing entry means a stale id
    // — fall back to wherever the tap came from.
    if (p === undefined) {
      this.focusedProjectId = null;
      if (this.projectReturn === "tend") {
        this.view = "tend";
        this.renderTend();
      } else if (this.projectReturn === "report") {
        this.view = "report";
        this.renderReport();
      } else if (this.projectReturn === "hub") {
        this.view = "hub";
        this.renderHub();
      } else {
        this.view = "projects";
        this.renderProjects();
      }
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      if (this.projectReturn === "tend") this.openTend();
      else if (this.projectReturn === "report") this.openReport();
      else if (this.projectReturn === "hub") this.openHub();
      else this.openProjects();
    });
    this.body.append(back);

    // Header: cost class quiet over the name loud — the focused study's
    // designation/name anatomy.
    const header = document.createElement("div");
    header.className = "study-focus-header";
    const kicker = document.createElement("div");
    kicker.className = "study-focus-designation holos-caps";
    kicker.textContent = p.costClass.toUpperCase();
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = p.label;
    header.append(kicker, nameEl);
    this.body.append(header);

    const line = document.createElement("div");
    line.className = "study-focus-lightage";
    line.textContent = p.line;
    this.body.append(line);

    this.body.append(this.hairline());

    // The grant. Present tense only once it is actually on.
    this.body.append(
      this.buildBriefSection(
        p.status === "standing" ? "WHAT IT GRANTS" : "WHAT IT WILL GRANT",
        p.effectLine,
      ),
    );

    this.body.append(this.hairline());

    // The clocks: the price in compute, then whichever date matters now.
    this.body.append(this.buildClockRow("COST", `${p.costCompute} COMPUTE`));
    if (p.status === "available") {
      this.body.append(this.buildClockRow("TAKES", formatClockPair(p.durationYears)));
    } else if (p.status === "running") {
      if (p.startedYear !== null) {
        this.body.append(this.buildClockRow("STARTED", formatAbsoluteYear(p.startedYear)));
      }
      const countdown = p.landsYear === null ? null : formatCountdown(p.landsYear);
      this.body.append(
        countdown !== null
          ? this.buildClockRow("LANDS IN", countdown)
          : this.buildClockRow("LANDS", "NOW"),
      );
    } else {
      // "standing"
      if (p.landsYear !== null) {
        this.body.append(this.buildClockRow("LANDED", formatAbsoluteYear(p.landsYear)));
      }
      const standing = document.createElement("div");
      standing.className = "study-brief-meta holos-caps";
      standing.textContent = "STANDING · PAID ONCE · THE GRANT HOLDS";
      this.body.append(standing);
    }

    this.body.append(this.hairline());

    // The economy the decision is made against — same line the hub carries.
    this.body.append(this.buildBudgetLine());

    if (p.status === "available") {
      const verbRow = document.createElement("div");
      verbRow.className = "study-verb-row";
      const verbBtn = document.createElement("button");
      verbBtn.type = "button";
      verbBtn.className = "study-verb-btn study-verb-btn--primary";

      const free = this.currentFreeCompute();
      let hint = "";
      if (this.pendingProjectId === p.id) {
        verbBtn.disabled = true;
        verbBtn.textContent = "starting the project…";
      } else if (free >= p.costCompute) {
        verbBtn.textContent = "start the project";
        verbBtn.addEventListener("click", () => {
          this.pendingProjectId = p.id;
          this.socket.send({ type: "startProject", projectId: p.id });
          this.renderProjectDetail();
        });
      } else {
        verbBtn.disabled = true;
        verbBtn.textContent = "start the project";
        hint = `${Math.ceil(p.costCompute - free)} SHORT`;
      }
      verbRow.append(verbBtn);
      this.body.append(verbRow);

      if (hint.length > 0) {
        const hintEl = document.createElement("div");
        hintEl.className = "study-brief-meta holos-caps";
        hintEl.textContent = hint;
        this.body.append(hintEl);
      }
    }
  }

  /** One row per OpenQuestion on the focused study — see renderFocused's
   *  comment for the state → anatomy mapping. */
  private buildQuestionRow(
    starId: string,
    q: OpenQuestion,
    evidenceIds: ReadonlySet<string>,
    buyable: boolean,
    hypothesisLabels: ReadonlyMap<HypothesisId, string>,
  ): HTMLElement {
    if (q.state === "offered") {
      // An offered question is a drill-in, not a buy button. The head folds
      // and unfolds; the spend is the button inside the fold, so no tap on
      // the menu can cost compute by itself.
      const wrap = document.createElement("div");
      wrap.className = "study-question";
      // AV3: tagged so a proposal's `question` route (focusStudyQuestion)
      // can find and scroll to this row — all three branches below carry
      // the same tag.
      wrap.dataset.questionId = q.id;

      const expanded =
        this.expandedQuestion !== null &&
        this.expandedQuestion.starId === starId &&
        this.expandedQuestion.questionId === q.id;

      const head = document.createElement("button");
      head.type = "button";
      head.className = "study-project-row study-question-head";
      head.setAttribute("aria-expanded", expanded ? "true" : "false");
      head.addEventListener("click", () => {
        this.expandedQuestion = expanded ? null : { starId, questionId: q.id };
        this.renderFocused(starId);
      });

      const headline = document.createElement("div");
      headline.className = "study-question-headline";
      const label = document.createElement("div");
      label.className = "study-project-label holos-serif";
      label.textContent = q.label;
      const caret = document.createElement("span");
      caret.className = "study-question-caret";
      caret.textContent = expanded ? "▾" : "▸";
      caret.setAttribute("aria-hidden", "true");
      headline.append(label, caret);

      const line = document.createElement("div");
      line.className = "study-project-line";
      line.textContent = q.line;
      const meta = document.createElement("div");
      meta.className = "study-project-meta holos-caps";

      const isPending =
        this.pendingQuestion !== null &&
        this.pendingQuestion.starId === starId &&
        this.pendingQuestion.questionId === q.id;
      const free = this.currentFreeCompute();
      const affordable = free >= q.costCompute;
      const base = `${q.costCompute} COMPUTE · ANSWERS IN ${formatClockPair(q.integrationYears)}`;
      // The cost/clock line reads the same as it always did, shortfall and
      // all — the only change is that the states below now dress the spend
      // button rather than the row, which stays tappable so a question can
      // be read when it cannot be bought.
      const shortfall = Math.ceil(q.costCompute - free);
      meta.textContent = affordable || !buyable ? base : `${base} · ${shortfall} SHORT`;
      if (!buyable || isPending || !affordable) head.classList.add("study-project-row--muted");

      head.append(headline, line, meta);
      wrap.append(head);

      if (expanded) {
        const detail = document.createElement("div");
        detail.className = "study-question-detail";

        // 1. How the question is answered. No new light, no launch: the
        //    archive already holds the photons and the spend is the
        //    inference (questionmethod.ts).
        const method = document.createElement("div");
        method.className = "study-question-method";
        method.textContent = QUESTION_METHOD[q.id];
        detail.append(method);

        // 2. What it could tell apart — the server's class-shaped
        //    `separates`, which names readings on this study's menu and
        //    nothing about this source. Labels come from the same menu the
        //    board above is showing; anything not on it is skipped, the
        //    evidence-tag precedent.
        const separatesLabels: string[] = [];
        for (const id of q.separates) {
          const lbl = hypothesisLabels.get(id);
          if (lbl !== undefined) separatesLabels.push(lbl);
        }
        if (separatesLabels.length > 0) {
          const sepHeader = document.createElement("div");
          sepHeader.className = "study-question-subheader holos-caps";
          sepHeader.textContent = "WHAT IT CAN TELL APART";
          const tags = document.createElement("div");
          tags.className = "study-archive-tags";
          for (const lbl of separatesLabels) {
            const tag = document.createElement("span");
            tag.className = "study-archive-tag holos-caps";
            tag.textContent = lbl;
            tags.append(tag);
          }
          detail.append(sepHeader, tags);
        }

        // 3. The terms, stated where the decision is made — the project
        //    sheet's anatomy (cost row, clock row, allocation line), so
        //    the fold says what is spent, when the answer lands, and what
        //    the allocation can bear, before the verb is offered. Where a
        //    landed project has moved a number off its catalog base, the
        //    server's receipt line renders under the row it explains, so
        //    an effective number is never mistaken for an arbitrary one.
        detail.append(this.buildClockRow("COST", `${q.costCompute} COMPUTE`));
        if (q.costProvenance !== null) {
          detail.append(this.buildProvenanceLine(q.costProvenance));
        }
        detail.append(this.buildClockRow("ANSWERS IN", formatClockPair(q.integrationYears)));
        if (q.hasteProvenance !== null) {
          detail.append(this.buildProvenanceLine(q.hasteProvenance));
        }
        detail.append(this.buildBudgetLine());

        // 4. The spend, and only here. The button names the spend itself:
        //    "buy the question" said what the system calls the act, not
        //    what leaves the allocation when you tap it.
        const verbRow = document.createElement("div");
        verbRow.className = "study-verb-row";
        const buyBtn = document.createElement("button");
        buyBtn.type = "button";
        buyBtn.className = "study-verb-btn study-verb-btn--primary";
        buyBtn.textContent = `spend ${q.costCompute} compute`;
        let hint = "";
        if (!buyable) {
          // A grounded study buys nothing (the server refuses it too): the
          // menu still reads, so the player can see what reopening would
          // offer. A shelved study IS buyable — the spend reopens it
          // server-side.
          buyBtn.disabled = true;
          hint = "REOPEN THE STUDY FIRST";
        } else if (isPending) {
          buyBtn.disabled = true;
          buyBtn.textContent = "committing the compute…";
        } else if (affordable) {
          buyBtn.addEventListener("click", () => {
            this.pendingQuestion = { starId, questionId: q.id };
            this.socket.send({ type: "buyQuestion", starId, questionId: q.id });
            this.renderFocused(starId);
          });
        } else {
          // Unaffordable. No hint: the head's meta line carries the
          // shortfall and the allocation line above sits right against the
          // cost row, so saying it a third time in one fold is noise.
          buyBtn.disabled = true;
        }
        verbRow.append(buyBtn);
        detail.append(verbRow);

        if (hint.length > 0) {
          const hintEl = document.createElement("div");
          hintEl.className = "study-question-hint holos-caps";
          hintEl.textContent = hint;
          detail.append(hintEl);
        }

        wrap.append(detail);
      }

      return wrap;
    }

    if (q.state === "pending") {
      const row = document.createElement("div");
      row.className = "study-project-row study-project-row--disabled";
      row.dataset.questionId = q.id;
      const label = document.createElement("div");
      label.className = "study-project-label holos-serif";
      label.textContent = q.label;
      const meta = document.createElement("div");
      meta.className = "study-project-meta holos-caps";
      const countdown = q.answersYear === null ? null : formatCountdown(q.answersYear);
      meta.textContent = countdown !== null ? `ANSWERS IN ${countdown}` : "ANSWERING";
      row.append(label, meta);
      return row;
    }

    // "answered"
    const row = document.createElement("div");
    row.className = "study-project-row study-project-row--disabled";
    row.dataset.questionId = q.id;
    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = q.label;
    row.append(label);

    const finding = q.finding;
    if (finding !== null) {
      const mergedId = `${starId}/q/${q.id}`;
      if (evidenceIds.has(mergedId)) {
        // A sharpen finding — already a full line in the evidence list above.
        const meta = document.createElement("div");
        meta.className = "study-project-meta holos-caps";
        meta.textContent = `ANSWERED · AS OF ${formatArchiveAge(finding.lightAgeYears)} Y AGO`;
        row.append(meta);
      } else {
        // A plateau finding — never merged into evidence, so this is the
        // only place it renders. Looks like any other evidence line.
        const text = document.createElement("div");
        text.className = "study-archive-text";
        text.textContent = finding.annotation;
        const age = document.createElement("div");
        age.className = "study-archive-age holos-caps";
        age.textContent = `${formatArchiveAge(finding.lightAgeYears)} Y AGO`;
        row.append(text, age);
      }
    }
    return row;
  }

  // ── Render: the Tend ──────────────────────────────────────────────
  // One row per TendRow, in the SERVER's order (tend.ts's sortTendRows
  // — soonest-thing-first, parent then children) — the client never re-sorts.

  private renderTend(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    // The count the hub row used to carry, now beside the title in the
    // display face — a reading of the list, set against its name rather
    // than a second line under it. Empty is the one case it sits out: the
    // body already says "Nothing under way." and would say it twice.
    const titleRow = document.createElement("div");
    titleRow.className = "tend-titlerow";

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "TEND";
    titleRow.append(header);

    if (this.tend.length > 0) {
      const summary = document.createElement("div");
      summary.className = "tend-summary holos-serif";
      summary.textContent = this.tendSummaryLine();
      titleRow.append(summary);
    }

    this.body.append(titleRow);

    if (this.tend.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "Nothing under way.";
      this.body.append(empty);
      return;
    }

    this.body.append(this.hairline());

    // A4: a one-shot scroll to one founding's row — the launch's own handoff
    // and a report entry's `voyage` route both land here (highlightQuestionId's
    // mold: taken on the render that uses it, so the 1s ticker never
    // re-scrolls the sheet under the player's thumb).
    const wanted = this.highlightVoyageId;
    this.highlightVoyageId = null;
    let wantedEl: HTMLElement | null = null;

    for (const row of this.tend) {
      const el = this.buildTendRow(row);
      if (wanted !== null && row.id === `voyage/${wanted}`) wantedEl = el;
      this.body.append(el);
    }

    if (wantedEl !== null) {
      const target = wantedEl;
      requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
    }
  }

  /** A mission row opens the mission detail; a project row opens the
   *  project detail; any other row with a starId inspects the source (the
   *  study/question-row precedent). Every row is a destination now — the
   *  inert branch survives only as a defensive fallback. */
  private buildTendRow(row: TendRow): HTMLElement {
    const isMission = row.kind === "mission";
    const isProject = row.kind === "project";
    // A4: a founding's own snapshot, for the state chip and the one report it
    // will ever produce. The row's `state` is tend.ts's NARROWED WorkState
    // (four terminal words collapse to "returned" there); the true word is
    // here, and this is the surface tend.ts's comment says would read it.
    const voyage =
      row.kind === "voyage" && row.id.startsWith("voyage/")
        ? this.voyagesById.get(row.id.slice("voyage/".length))
        : undefined;
    // A founding is aimed at a STAR, and most of them are empty sky: there is
    // no source card to inspect at the far end of one, so the row is a door
    // only where the sky actually shows something there.
    const clickable =
      row.kind === "voyage"
        ? row.starId !== null && this.sourcesByStarId.has(row.starId)
        : isMission || isProject || row.starId !== null;

    let el: HTMLButtonElement | HTMLDivElement;
    if (clickable) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.addEventListener("click", () => {
        if (isMission) {
          const missionId = row.id.startsWith("mission/") ? row.id.slice("mission/".length) : row.id;
          this.focusMission(missionId);
        } else if (isProject) {
          const projectId = row.id.startsWith("project/") ? row.id.slice("project/".length) : row.id;
          this.focusProject(projectId, "tend");
        } else if (row.starId !== null) {
          this.onInspectCb?.(row.starId);
          this.close();
        }
      });
      el = btn;
    } else {
      el = document.createElement("div");
    }
    el.className = row.parentId !== null ? "tend-row tend-row--child" : "tend-row";

    const top = document.createElement("div");
    top.className = "tend-row-top";

    const main = document.createElement("div");
    main.className = "tend-row-main";
    const label = document.createElement("div");
    label.className = "tend-row-label holos-serif";
    label.textContent = row.label;
    const sub = document.createElement("div");
    sub.className = "tend-row-sub";
    sub.textContent = row.sub;
    main.append(label, sub);

    const meta = document.createElement("div");
    meta.className = "tend-row-meta";
    const chip = document.createElement("div");
    chip.className = "tend-badge tend-chip";
    chip.textContent = row.costClass.toUpperCase();
    const state = document.createElement("div");
    state.className =
      row.state === "silent"
        ? "tend-badge tend-row-state tend-row-state--silent"
        : "tend-badge tend-row-state";
    state.textContent =
      voyage !== undefined ? VOYAGE_STATE_LABEL[voyage.state] : WORK_STATE_LABEL[row.state];
    meta.append(chip, state);

    top.append(main, meta);
    el.append(top);

    const track = this.buildTendTrack(row);
    if (track !== null) el.append(track);

    if (row.nextYear !== null && row.nextLabel !== null) {
      const next = document.createElement("div");
      next.className = "tend-row-next holos-caps";
      const countdown = formatCountdown(row.nextYear);
      next.textContent = countdown !== null ? `${row.nextLabel} IN ${countdown}` : row.nextLabel;
      el.append(next);
    }

    // A4: the landfall word, where it has arrived. A voyage produces EXACTLY
    // ONE report in its whole life, and this row is where it is read: there
    // is nowhere else for it to go, and a row that had news and did not say
    // it would be the work list lying by omission.
    if (voyage !== undefined && voyage.report !== null) {
      const report = voyage.report;
      const headline = document.createElement("div");
      headline.className = "tend-report-headline holos-caps";
      headline.textContent = report.headline;
      const detail = document.createElement("div");
      detail.className = "study-archive-text";
      detail.textContent = report.detail;
      const age = document.createElement("div");
      age.className = "study-archive-age holos-caps";
      age.textContent = `AS OF ${formatArchiveAge(report.lightAgeYears)} Y AGO`;
      el.append(headline, detail, age);
    }

    return el;
  }

  /**
   * The row's track: a hairline the fill crosses as the wait runs down, with
   * a travelling tip where the work is now. It is a CLOCK, not a task bar —
   * both ends are years the server already sent (`fromYear` → `nextYear`),
   * and the fraction is derived locally from clock.ts's nowYear, so the 1s
   * ticker advances it without a new sky.
   *
   * Three shapes, and the difference between them is the whole point:
   *  - running: fill and tip, plus a tick where the physics mark sits (a
   *    probe's amendment horizon — once the tip is past it, no beamed change
   *    can overtake the probe).
   *  - silent: the span ends at the year the schedule broke, so the track is
   *    drawn BROKEN — the line stops at the mark and the rest is a gap. No
   *    tip: nothing is travelling. Absence rendered as absence.
   *  - done (returned, landed): no track at all. Nothing is under way, and
   *    an empty rail would be an invitation to read one.
   */
  private buildTendTrack(row: TendRow): HTMLDivElement | null {
    // A STUDY's rail is not time — it is belief. A vigil has no end date to
    // run toward (light keeps arriving for as long as you keep watching), so
    // its progress is how far the leading reading has come: the same share
    // the study sheet draws, in the same shape, one row up. Time rails
    // belong to the things that actually end — questions, missions,
    // projects — and every one of those is a child row under it.
    if (row.kind === "study" && row.starId !== null) {
      const study = this.studiesByStarId.get(row.starId);
      const leader = leadingHypothesis(study?.hypotheses ?? []);
      if (leader === undefined) return null;
      const share = clamp01(leader.share);
      const track = document.createElement("div");
      track.className = "tend-track tend-track--belief";
      const fill = document.createElement("div");
      fill.className = "tend-track-fill";
      fill.style.width = `${(share * 100).toFixed(2)}%`;
      const glow = document.createElement("div");
      glow.className = "tend-track-tip tend-track-tip--belief";
      glow.style.left = `${(share * 100).toFixed(2)}%`;
      track.append(fill, glow);
      return track;
    }

    // Landed work keeps its rail, filled end to end and unlit: a project
    // that stands is not waiting on anything, and a full line says finished
    // where a missing line said nothing at all.
    if (row.kind === "project" && row.state === "standing") {
      const done = document.createElement("div");
      done.className = "tend-track tend-track--done";
      const fill = document.createElement("div");
      fill.className = "tend-track-fill";
      fill.style.width = "100%";
      done.append(fill);
      return done;
    }

    const from = row.fromYear;
    const now = nowYear();
    const isSilent = row.state === "silent";
    // A silence has no end to run toward, so the rail is the time SINCE
    // LAUNCH and the fill stops at the year the schedule broke. The gap
    // after it is the silence itself, and it widens every year nothing
    // comes — which is the one honest thing a bar can say about a probe
    // that has stopped answering.
    const end = isSilent ? now : (row.nextYear ?? row.markYear);
    const fillTo = isSilent ? row.markYear : now;
    if (from === null || end === null || fillTo === null || end <= from) return null;

    const fraction = clamp01((fillTo - from) / (end - from));

    const track = document.createElement("div");
    track.className = isSilent ? "tend-track tend-track--broken" : "tend-track";

    const fill = document.createElement("div");
    fill.className = "tend-track-fill";
    fill.style.width = `${(fraction * 100).toFixed(2)}%`;
    track.append(fill);

    if (isSilent) {
      // The rail resumes past the gap: the schedule still exists, and
      // nothing is travelling along it.
      const tail = document.createElement("div");
      tail.className = "tend-track-tail";
      tail.style.left = `${Math.min(100, fraction * 100 + 8).toFixed(2)}%`;
      track.append(tail);
      return track;
    }

    const tip = document.createElement("div");
    tip.className = "tend-track-tip";
    tip.style.left = `${(fraction * 100).toFixed(2)}%`;
    track.append(tip);

    // The mark is only drawn where it actually falls inside the span.
    const mark = row.markYear;
    if (mark !== null && mark > from && mark < end) {
      const tick = document.createElement("div");
      tick.className = "tend-track-mark";
      tick.style.left = `${(((mark - from) / (end - from)) * 100).toFixed(2)}%`;
      track.append(tick);
    }

    return track;
  }

  // ── Render: the report (AV2) ─────────────────────────────────────────
  // The observatory's annal: frozen record sentences, stamped and routed,
  // in the server's own order (promoted-first if a header fired, else
  // newest-first — protocol.ts's ReportPayload). The client never sorts.
  // NOT in the 1s ticker (startTicking): there is nothing here that counts
  // down, and a re-render mid-scroll would fight the reader's thumb.

  private renderReport(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE REPORT";
    this.body.append(header);

    if (this.reportExplainerText !== null) {
      const note = document.createElement("div");
      note.className = "voice-note";
      note.textContent = this.reportExplainerText;
      this.body.append(note);
    }

    const report = this.report;
    if (report === null) return;

    if (report.header !== null) {
      const headerProse = document.createElement("div");
      headerProse.className = "report-header";
      headerProse.textContent = report.header;
      this.body.append(headerProse);
      this.body.append(this.hairline());
    }

    for (const entry of report.entries) {
      this.body.append(this.buildReportRow(entry));
    }
  }

  /** One row: the buildTendRow skeleton minus the track and the state
   *  badge — a report entry has no clock and no work state, only a frozen
   *  sentence, its stamp, and where a tap on it goes. A <button> when the
   *  route can go anywhere, a plain <div> for `kind: "none"` (the same
   *  clickable/inert split buildTendRow makes). */
  private buildReportRow(entry: ReportEntry): HTMLElement {
    const clickable = entry.route.kind !== "none";

    let el: HTMLButtonElement | HTMLDivElement;
    if (clickable) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.addEventListener("click", () => this.followReportRoute(entry.route));
      el = btn;
    } else {
      el = document.createElement("div");
    }
    el.className = "tend-row";

    const stamp = document.createElement("div");
    // The caps/tabular chrome family (tend-mission-clock-value's precedent)
    // at --holos-text-xs, not --holos-text-xxs: a date is a reading, not an
    // enclosed classifier a thumb learns by shape.
    stamp.className = "report-stamp holos-caps study-tabular";
    stamp.textContent = entry.stamp;
    el.append(stamp);

    const record = document.createElement("div");
    record.className = "report-row-line";
    record.textContent = entry.record;
    el.append(record);

    if (entry.remark !== null) {
      const remark = document.createElement("div");
      remark.className = "report-remark";
      remark.textContent = entry.remark;
      el.append(remark);
    }

    return el;
  }

  /** AV2 routing: study/mission focus the board directly; source is the
   *  Tend-row idiom (inspect the source card, then close the sheet);
   *  project opens the detail sheet with "report" as its return leg, so its
   *  own back button comes home here. `kind: "none"` never reaches this —
   *  buildReportRow renders it as a non-interactive div. */
  private followReportRoute(route: ReportRoute): void {
    switch (route.kind) {
      case "study":
        this.focusStudy(route.starId);
        break;
      case "mission":
        this.focusMission(route.missionId);
        break;
      case "source":
        this.onInspectCb?.(route.starId);
        this.close();
        break;
      case "project":
        this.focusProject(route.projectId, "report");
        break;
      // A4: a founding, by id and never by star — the work list, scrolled to
      // its row, which is where its one report is read.
      case "voyage":
        this.focusVoyageRow(route.voyageId);
        break;
      // A4, the aftermath: a child, by the voyage that made it — the same key
      // the row itself carries, and for the same reason. The record's back
      // button comes home to the report rather than the hub.
      case "ledger":
        this.focusFork(route.voyageId, "report");
        break;
      case "none":
        break;
    }
  }

  // ── Render: the thread (A2.5, composed in A2.6) ──────────────────────
  // The sky answers, and the texture is ASTRONOMY, never mail. What arrives
  // is a measured beam: the instrument readout is the header of the message
  // and the prose is what was left of it after the crossing. What leaves is
  // a mote on a rail with your own arithmetic under it — there is no
  // instrument at the far end of a beam you aimed, so there is no receipt,
  // no delivery mark, and nothing that says they are reading.
  //
  // Amber throughout, like the rest of this sheet: everything they sent is
  // old light. The ONE cyan is the sent-signal rail, which is yours and is
  // happening now — the source card's contact row, one surface over.

  private renderThread(): void {
    this.body.innerHTML = "";
    this.liveClocks = [];

    const starId = this.threadStarId;

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      this.leaveThread();
      this.openHub("voice");
    });
    this.body.append(back);

    if (starId === null) {
      // Defensive only: the view cannot be entered without a star.
      this.view = "hub";
      this.closeComposer();
      this.renderHub();
      return;
    }

    const source = this.sourcesByStarId.get(starId);
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;

    const header = document.createElement("div");
    header.className = "study-focus-header";
    if (hasLocalName && source !== undefined) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = source.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = this.threadName(starId);
    header.append(nameEl);
    this.body.append(header);

    const detail = this.contact?.openThread ?? null;
    const open = detail !== null && detail.starId === starId ? detail : null;

    // The header's chips. The class chip is THE SOURCE'S OWN classification
    // — what this civilization's instruments make of that light — and never
    // anything about how the counterpart handles being spoken to, which is
    // not on the wire and could not be.
    const chips = document.createElement("div");
    chips.className = "thread-chips";
    if (source !== undefined) {
      chips.append(this.buildThreadChip(`AS OF ${formatArchiveAge(source.lightAgeYears)} Y AGO`));
      chips.append(this.buildThreadChip(CLASS_LABEL[source.signal.classification]));
    }
    if (open !== null) {
      const stateChip = this.buildThreadChip(this.threadStateText(open));
      this.liveClocks.push({ el: stateChip, text: () => this.threadStateText(open) });
      chips.append(stateChip);
    }
    if (chips.childElementCount > 0) this.body.append(chips);

    // A2.6: going dark to one thread. Quiet, unadorned, and no confirm step —
    // it is reversible from the hub, it notifies nobody, and it changes
    // nothing on the sender's side (their beam still lands; they simply have
    // no way to learn that it landed in a room with the lights off).
    this.body.append(this.buildMuteRow(starId));

    this.body.append(this.hairline());

    if (open === null) {
      // The detail rides the sky that answers `openThread`; until it lands
      // there is nothing honest to draw.
      const waiting = document.createElement("div");
      waiting.className = "study-board-empty";
      waiting.textContent = "Reading the thread.";
      this.body.append(waiting);
      this.closeComposer();
      return;
    }

    // A2.6: the compliance rail, above the conversation rather than in it —
    // an understanding is the state of the thread, not one more thing said.
    const rail = this.buildAccordRail(open);
    if (rail !== null) this.body.append(rail);

    if (open.truncated) {
      const cut = document.createElement("div");
      cut.className = "thread-truncated holos-caps";
      cut.textContent = "EARLIER SIGNALS NO LONGER HELD";
      this.body.append(cut);
    }

    // Oldest to newest, in the server's own order (by the year YOU learned
    // of each). The client never sorts.
    for (const s of open.signals) this.body.append(this.buildThreadSignal(s));

    if (open.state === "silent") {
      const line = document.createElement("div");
      line.className = "thread-state-line";
      line.textContent = THREAD_SILENT_LINE;
      this.body.append(line);
    }

    this.body.append(this.buildComposerFoot(open));

    // The composer is an overlay on the SHEET, so it survives this rebuild —
    // but what it is composing INTO has just changed, so it re-renders here.
    if (this.composerOpen) this.renderComposerSheet(open);

    if (this.threadScrollToEnd) {
      this.threadScrollToEnd = false;
      // One frame later: the body is still being assembled right now.
      requestAnimationFrame(() => {
        this.body.scrollTop = this.body.scrollHeight;
      });
    }
  }

  /** A header chip: short, repeated, enclosed — the .tend-badge contract
   *  exactly, which is what earns it --holos-text-xxs. */
  private buildThreadChip(text: string): HTMLDivElement {
    const chip = document.createElement("div");
    chip.className = "tend-badge thread-chip";
    chip.textContent = text;
    return chip;
  }

  /**
   * A2.6: MUTE. Driven by `mutedStarIds` and nothing else — a muted thread is
   * absent from `threads` entirely, so an open one is normally unmuted and
   * this is normally the verb. The unmute case is reachable here only for the
   * instant between the tap and the confirming sky; the standing way back is
   * the hub's own row (see renderHub).
   */
  private buildMuteRow(starId: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "thread-mute-row";
    const muted = (this.contact?.mutedStarIds ?? []).includes(starId);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thread-mute holos-caps";
    btn.textContent = muted ? "UNMUTE THIS THREAD" : "MUTE THIS THREAD";
    btn.addEventListener("click", () => {
      this.socket.send({ type: "muteThread", starId, muted: !muted });
    });
    row.append(btn);
    return row;
  }

  /**
   * A2.6: the mutual quiet, from this side of the light.
   *
   * Every line is arithmetic on wire fields: the state and the held-since
   * year are the server's, the compliance read carries its own age, and the
   * offering side's waiting line is computed from ITS OWN beam's sent and
   * arrival years. Nothing here is a claim about their present.
   */
  private buildAccordRail(detail: ThreadDetail): HTMLElement | null {
    const rail = detail.accord;
    const head = accordHeadline(rail);
    if (head === null) return null;

    const box = document.createElement("div");
    box.className = "thread-accord";

    const headEl = document.createElement("div");
    headEl.className = "thread-accord-head holos-caps study-tabular";
    headEl.textContent = head;
    box.append(headEl);

    if (rail.state === "you-offered") {
      // The offer is one of our own signals, so its two years are ours to
      // read: in flight until it lands, and then one more transit before an
      // answer could possibly come back.
      const offer = [...detail.signals]
        .reverse()
        .find(
          (s) =>
            s.from === "you" &&
            s.parts.some((p) => p.kind === "accord" && p.move === "offer"),
        );
      if (offer !== undefined) {
        const line = document.createElement("div");
        line.className = "thread-accord-line holos-caps study-tabular";
        const text = (): string => accordFlightLine(offer.sentYear, offer.arrivesYear);
        line.textContent = text();
        this.liveClocks.push({ el: line, text });
        box.append(line);
      }
    }

    if (rail.state === "they-offered") {
      const line = document.createElement("div");
      line.className = "thread-accord-line holos-caps";
      line.textContent = "IT HOLDS UNTIL WE ANSWER";
      box.append(line);
    }

    const light = accordLightLine(rail);
    if (light !== null) {
      const line = document.createElement("div");
      line.className = "thread-accord-line holos-caps study-tabular";
      line.textContent = light;
      box.append(line);
    }

    return box;
  }

  /**
   * One signal.
   *
   * RECEIVED: the stamp FIRST, two caps rows of instrument readout, then the
   * tone as one more property of the beam, then what was said, then the
   * payload as instrument blocks. Every number the thread shows lives on a
   * stamp or inside a block, and none of it lives in the prose — which is the
   * whole reason the prose can be fact-free.
   *
   * SENT: a cyan rail with your own arithmetic on it. In flight while the
   * year has not come; LANDED once it has. Never a receipt.
   */
  private buildThreadSignal(s: ThreadSignal): HTMLDivElement {
    const el = document.createElement("div");
    const mine = s.from === "you";
    el.className = mine
      ? "thread-signal thread-signal--sent"
      : "thread-signal thread-signal--received";

    if (!mine) {
      const stamp = s.stamp;
      if (stamp !== null) {
        el.append(
          this.buildStampRow(
            `TRANSIT ${formatGameYears(stamp.transitYears)} · DISTANCE ${stamp.distanceLy.toFixed(1)} ly`,
          ),
          this.buildStampRow(
            `RECEIVED ${stamp.receivedFraction.toFixed(2)} · LOSS ${Math.round(stamp.degradation * 100)}% · ARRIVED ${formatAbsoluteYear(stamp.arrivedYear)}`,
          ),
        );
      }
    } else {
      const rail = document.createElement("div");
      rail.className = "thread-rail holos-caps study-tabular";
      rail.textContent = this.sentRailText(s);
      this.liveClocks.push({ el: rail, text: () => this.sentRailText(s) });
      el.append(rail);
    }

    // A2.6: the tone, as a PROPERTY OF THE BEAM. `plain` renders nothing at
    // all and the absence is the content: a gift arriving without comment is
    // told so by the row that is not there.
    const toneLine = s.tone === null ? null : TONE_STAMP[s.tone];
    if (toneLine !== null) {
      const row = document.createElement("div");
      row.className = "thread-tone holos-caps";
      row.textContent = toneLine;
      el.append(row);
    }

    if (s.body !== null) {
      const payload = document.createElement("div");
      payload.className = "thread-payload";
      // UNTRUSTED PROSE — a legacy act's player text, or a server-composed
      // line. textContent and nothing else, ever: this string never becomes
      // markup (and, server-side, never becomes a generation input either).
      payload.textContent = s.body;
      el.append(payload);
    }

    // A2.6: the payload proper. The blocks are the client's own rendering of
    // typed parts the server materialized and froze — no string below is
    // anything but a catalog literal, a server number, or this file's chrome.
    if (s.parts.length > 0) {
      const ctx: PartContext = {
        mine,
        transitYears:
          s.stamp !== null ? s.stamp.transitYears : Math.max(0, s.arrivesYear - s.sentYear),
        arrivesYear: s.arrivesYear,
        landed: s.arrivesYear <= nowYear(),
      };
      for (const part of s.parts) el.append(this.buildPartBlock(part, ctx));
    }

    return el;
  }

  private buildStampRow(text: string): HTMLDivElement {
    const row = document.createElement("div");
    // holos-caps sets --holos-text-xs, the .report-stamp reading: a
    // measurement is a reading, not a one-word classifier, so it stays at
    // the floor for things a player reads rather than below it.
    row.className = "thread-stamp holos-caps study-tabular";
    row.textContent = text;
    return row;
  }

  /** Your own beam, timed by your own clock against a year the server
   *  already sent. There is no state here that came back from them. */
  private sentRailText(s: ThreadSignal): string {
    const kicker = s.kind === "hail" ? "HAIL · " : "";
    const countdown = formatCountdown(s.arrivesYear);
    return countdown === null
      ? `${kicker}LANDED ${formatAbsoluteYear(s.arrivesYear)}`
      : `${kicker}IN FLIGHT · ARRIVES IN ${countdown}`;
  }

  // ── Render: the part blocks (A2.6) ───────────────────────────────────
  //
  // An instrument block, not a message bubble. Each one is a pinned label,
  // the subject as this reader's own instruments name it, and the readings —
  // which is exactly the anatomy the observatory already uses for a
  // hypothesis row and an archive entry, borrowed here rather than invented.
  //
  // THE RECIPIENT'S OWN LOCAL NAME may sit beside a designation: it is their
  // knowledge and it did not travel. Nothing else on a block is anything but
  // a catalog literal or a server-computed number.

  /** What this reader calls the subject of a part: the catalog designation
   *  always, plus their OWN label for it if they gave one. */
  private partSubject(starId: string): string {
    const designation =
      this.sourcesByStarId.get(starId)?.designation ??
      this.starsById.get(starId)?.designation ??
      starId;
    const local = this.localNames.get(starId);
    if (local !== undefined && local.length > 0) return `${designation} · ${local}`;
    return designation;
  }

  /** The block's pinned label, which is also where the provenance lives:
   *  every part says whose instruments it came off, in one word. */
  private partHeadText(part: SignalPart, mine: boolean): string {
    const side = mine ? "OURS" : "THEIRS";
    switch (part.kind) {
      case "finding":
        return `A FINDING · ${side}`;
      case "sighting":
        return `COORDINATES · ${side}`;
      case "archive":
        return part.ofSelf
          ? mine
            ? "OUR OWN LIGHT"
            : "THEIR OWN LIGHT"
          : `A LIGHT RECORD · ${side}`;
      case "culture":
        return mine ? "WHO WE ARE" : "WHO THEY ARE";
      case "request":
        return mine ? "WE ASK" : "THEY ASK";
      case "verdict":
        return mine ? "OUR ANSWER" : "THEIR ANSWER";
      case "accord":
        return "THE QUIET";
    }
  }

  private buildPartBlock(part: SignalPart, ctx: PartContext): HTMLDivElement {
    const block = document.createElement("div");
    block.className = "part-block";

    const head = document.createElement("div");
    head.className = "part-head holos-caps";
    head.textContent = this.partHeadText(part, ctx.mine);
    block.append(head);

    switch (part.kind) {
      case "finding":
        this.fillFindingBlock(block, part, ctx);
        break;
      case "sighting":
        this.fillSightingBlock(block, part, ctx);
        break;
      case "archive":
        this.fillArchiveBlock(block, part, ctx);
        break;
      case "culture":
        this.fillCultureBlock(block, part, ctx);
        break;
      case "request":
        this.fillRequestBlock(block, part, ctx);
        break;
      case "verdict":
        this.fillVerdictBlock(block, part, ctx);
        break;
      case "accord":
        this.fillAccordBlock(block, part);
        break;
    }

    return block;
  }

  private partLine(text: string, tabular = false): HTMLDivElement {
    const line = document.createElement("div");
    line.className = tabular ? "part-line holos-caps study-tabular" : "part-line holos-caps";
    line.textContent = text;
    return line;
  }

  /**
   * DOUBLE AGEING, the finding block's whole reason for existing in this
   * shape. `arrivedYear − asOfYear` is (sender to subject) + (call to send) +
   * (sender to reader), and all three legs are on the block, so a reader can
   * check the arithmetic against the sender's known catalog position. Honesty
   * checked by geometry rather than by moderation.
   */
  private fillFindingBlock(
    block: HTMLDivElement,
    part: FindingPart,
    ctx: PartContext,
  ): void {
    const row = document.createElement("div");
    row.className = "part-row";
    const desig = document.createElement("span");
    desig.className = "part-desig holos-caps";
    desig.textContent = this.partSubject(part.subjectStarId);
    const share = document.createElement("span");
    share.className = "part-share holos-caps study-tabular";
    share.textContent = `${Math.round(part.share * 100)}%`;
    row.append(desig, share);
    block.append(row);

    const title = document.createElement("div");
    title.className = "part-title";
    title.textContent = part.label;
    block.append(title);

    const gloss = document.createElement("div");
    gloss.className = "part-gloss";
    gloss.textContent = part.gloss;
    block.append(gloss);

    const track = document.createElement("div");
    track.className = "study-hyp-track part-track";
    const fill = document.createElement("div");
    fill.className = "study-hyp-fill study-hyp-fill--leading";
    fill.style.width = `${clamp01(part.share) * 100}%`;
    track.append(fill);
    block.append(track);

    // THE OMISSION LEVER, said out loud. An empty evidence list is a claim
    // that travelled without its working, and the reader is told that it did.
    const n = part.evidence.length;
    const basis = part.basis === "called" ? "CALLED" : "GROUNDED";
    block.append(
      this.partLine(
        n === 0
          ? `${basis} · THE WORKING WAS NOT SENT`
          : `${basis} · ${n} ${n === 1 ? "QUESTION" : "QUESTIONS"} BEHIND IT`,
      ),
    );

    const atCall = Math.max(0, part.calledYear - part.asOfYear);
    block.append(
      this.partLine(
        `THEIR LIGHT ${formatArchiveAge(atCall)} Y OLD AT THE CALL · TRANSIT ${formatArchiveAge(ctx.transitYears)} y`,
        true,
      ),
    );
    block.append(this.partLine(this.partAgeText(part.asOfYear, ctx), true));

    // Provenance, and the whole of it: A2.6 ships no way to FILE a foreign
    // finding, because no wire message exists to land one in the observatory.
    // The block says where the reading came from and stops there rather than
    // offering a verb the server could not honour.
    const prov = this.partLine(ctx.mine ? "FROM OUR INSTRUMENTS" : "FROM THEIR INSTRUMENTS");
    prov.classList.add("part-line--faint");
    block.append(prov);
  }

  private fillSightingBlock(
    block: HTMLDivElement,
    part: SightingPart,
    ctx: PartContext,
  ): void {
    const row = document.createElement("div");
    row.className = "part-row";
    const desig = document.createElement("span");
    desig.className = "part-desig holos-caps";
    desig.textContent = this.partSubject(part.subjectStarId);
    const cls = document.createElement("span");
    cls.className = "part-share holos-caps";
    cls.textContent = CLASS_LABEL[part.signalClass];
    row.append(desig, cls);
    block.append(row);
    block.append(this.partLine(this.partAgeText(part.asOfYear, ctx), true));
  }

  private fillArchiveBlock(
    block: HTMLDivElement,
    part: ArchivePart,
    ctx: PartContext,
  ): void {
    const row = document.createElement("div");
    row.className = "part-row";
    const desig = document.createElement("span");
    desig.className = "part-desig holos-caps";
    desig.textContent = this.partSubject(part.subjectStarId);
    const span = document.createElement("span");
    span.className = "part-share holos-caps study-tabular";
    span.textContent = `${formatAbsoluteYear(part.fromYear)} TO ${formatAbsoluteYear(part.toYear)}`;
    row.append(desig, span);
    block.append(row);

    block.append(this.buildSparkline(part.samples));

    const levels = part.samples.map((s) => s.level);
    const peak = levels.length === 0 ? 0 : Math.max(...levels);
    const last = part.samples[part.samples.length - 1];
    block.append(
      this.partLine(
        `PEAK ${peak.toFixed(2)} · AT THE EDGE ${(last?.level ?? 0).toFixed(2)}`,
        true,
      ),
    );
    block.append(this.partLine(this.partAgeText(part.toYear, ctx), true));
  }

  private fillCultureBlock(
    block: HTMLDivElement,
    part: CulturePart,
    ctx: PartContext,
  ): void {
    const whose = ctx.mine ? "OUR" : "THEIR";
    let label: string;
    let question: string | null = null;
    if (part.source === "charter") {
      label = `${whose} CHARTER`;
    } else if (part.source === "chronicle") {
      label = `FROM ${whose} CHRONICLE`;
    } else {
      label = part.pole === null ? `${whose} DIAL` : `${whose} DIAL · ${part.pole}`;
      // The question the dial answers, from the one runtime value the wire
      // exports for rendering. Catalog prose either way, never a number.
      question = DIAL_AXES.find((a) => a.id === part.axis)?.question ?? null;
    }
    block.append(this.partLine(label));
    if (question !== null) {
      const q = document.createElement("div");
      q.className = "part-gloss";
      q.textContent = question;
      block.append(q);
    }
    const prose = document.createElement("div");
    prose.className = "part-prose";
    prose.textContent = part.text;
    block.append(prose);
  }

  private fillRequestBlock(
    block: HTMLDivElement,
    part: RequestPart,
    ctx: PartContext,
  ): void {
    const title = document.createElement("div");
    title.className = "part-title";
    title.textContent = WANT_CHIP[part.want];
    block.append(title);
    if (part.subjectStarId !== null) {
      block.append(this.partLine(`ABOUT ${this.partSubject(part.subjectStarId)}`));
    } else {
      block.append(this.partLine("ABOUT NOBODY IN PARTICULAR"));
    }
    // A request obliges nobody, and the block says so rather than reading as
    // a demand with a reply slot under it.
    const note = this.partLine(ctx.mine ? "WE MAY BE ANSWERED, OR NOT" : "ANSWER IT, OR DO NOT");
    note.classList.add("part-line--faint");
    block.append(note);
  }

  private fillVerdictBlock(
    block: HTMLDivElement,
    part: VerdictPart,
    ctx: PartContext,
  ): void {
    // An empty reference is the honest render of a row this reader cannot
    // see: it was truncated off the wire, or it has not landed here. The
    // server blanks the id rather than leaking one, and so does this.
    block.append(
      this.partLine(
        part.signalId === ""
          ? "ON A SIGNAL NO LONGER HELD"
          : `ON ${part.signalId.toUpperCase()} · PART ${part.partIndex + 1}`,
      ),
    );
    const title = document.createElement("div");
    title.className = "part-title";
    title.textContent = `${ctx.mine ? "OUR" : "THEIR"} ${STANCE_LINE[part.stance]}`;
    block.append(title);
  }

  private fillAccordBlock(block: HTMLDivElement, part: AccordPart): void {
    const title = document.createElement("div");
    title.className = "part-title";
    title.textContent = ACCORD_MOVE_LINE[part.move];
    block.append(title);
  }

  /**
   * How stale a reading is, and against WHICH now. A part that has landed is
   * aged against this reader's own present; one still crossing is aged
   * against the year it will land in, and says so — the composer's preview
   * runs through this same branch, which is how a player sees exactly how old
   * their gift will be by the time it is read.
   */
  private partAgeText(asOfYear: number, ctx: PartContext): string {
    if (ctx.landed) return `AS OF ${formatArchiveAge(Math.max(0, nowYear() - asOfYear))} Y AGO`;
    return `AS OF ${formatArchiveAge(Math.max(0, ctx.arrivesYear - asOfYear))} Y AGO ON ARRIVAL`;
  }

  /**
   * THE LIGHT RECORD. An inline SVG rather than a canvas: the block is inside
   * a scrolling column that re-renders on every sky, and a vector redraws
   * itself at any width for free where a canvas would need a resize observer
   * and a device-pixel-ratio pass (the source card's chart pays that price
   * because it is the one chart on a fixed sheet).
   *
   * Drawn in the panel's own gold, on the source card's anatomy: a soft area
   * under a step-free curve, and a hairline at the right edge marking the
   * newest sample. Levels are the server's, quantized at the source; the
   * curve is normalized against its own peak, so the shape is the reading and
   * the two numbers under it carry the scale.
   */
  private buildSparkline(samples: readonly ArchiveSample[]): SVGSVGElement {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "part-spark");
    svg.setAttribute("viewBox", "0 0 100 34");
    // The box is stretched to the column's width; strokes opt out of the
    // stretch (vector-effect, in the stylesheet) so a hairline stays hair.
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    const n = samples.length;
    if (n === 0) return svg;
    const peak = Math.max(0.02, ...samples.map((s) => s.level));
    const px = (i: number): number => (n === 1 ? 0 : (i / (n - 1)) * 100);
    const py = (level: number): number => 30 - clamp01(level / peak) * 26;
    const points = samples.map((s, i) => `${px(i).toFixed(2)},${py(s.level).toFixed(2)}`);

    const area = document.createElementNS(NS, "polygon");
    area.setAttribute("class", "part-spark-area");
    area.setAttribute("points", `0,30 ${points.join(" ")} 100,30`);
    svg.append(area);

    const line = document.createElementNS(NS, "polyline");
    line.setAttribute("class", "part-spark-line");
    line.setAttribute("points", points.join(" "));
    svg.append(line);

    // The newest edge, the source card's own NOW hairline: nothing is ever
    // drawn to the right of it, because there is nothing there.
    const edge = document.createElementNS(NS, "line");
    edge.setAttribute("class", "part-spark-edge");
    edge.setAttribute("x1", "100");
    edge.setAttribute("x2", "100");
    edge.setAttribute("y1", "3");
    edge.setAttribute("y2", "31");
    svg.append(edge);

    return svg;
  }

  // ── The composer (A2.6) ──────────────────────────────────────────────
  //
  // THE COMPOSER IS A PREVIEW. You never fill a field; you watch the
  // transmission assemble in the form the other side will read it, and the
  // controls are underneath it. There is no text input anywhere on this
  // surface and the phone keyboard never opens: the client sends SELECTORS,
  // and every string that will reach the counterpart is written by the
  // server out of the sender's own state.
  //
  // The preview's blocks come off the SAME renderers a received signal uses
  // (buildPartBlock, above), fed by a client-side reading of the player's own
  // studies, sky and seed — all of which are already on this client's wire.

  /** The thread this composer is composing into, or null. */
  private currentThreadDetail(): ThreadDetail | null {
    const starId = this.threadStarId;
    const detail = this.contact?.openThread ?? null;
    if (starId === null || detail === null || detail.starId !== starId) return null;
    return detail;
  }

  /**
   * The foot of the thread: the one pill that opens the composer, or the
   * reason there is not one.
   *
   * `canSpeak` is false for two different reasons and they read differently.
   * If nothing of yours is in the thread at all, they spoke first: the way to
   * answer is to aim a beam, which is the choice ceremony at its usual price.
   * If your own signals ARE in the thread, it is simply full.
   */
  private buildComposerFoot(detail: ThreadDetail): HTMLElement {
    if (this.floorNotice) {
      // THE TURNAROUND FLOOR. One flat line and no countdown: the floor is
      // identical on every thread, and a number here would be a reading of
      // how recently their beam landed.
      const wrap = document.createElement("div");
      wrap.className = "thread-closed";
      const line = document.createElement("div");
      line.className = "thread-closed-line";
      line.textContent = TURNAROUND_FLOOR_LINE;
      wrap.append(line);
      return wrap;
    }

    if (!detail.canSpeak) return this.buildClosedComposer(detail);

    const wrap = document.createElement("div");
    wrap.className = "thread-composer";
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "thread-compose-pill holos-caps";
    pill.textContent =
      this.composerParts.length === 0
        ? "COMPOSE"
        : `COMPOSE · ${this.composerParts.length} OF ${MAX_PARTS_PER_SIGNAL}`;
    pill.addEventListener("click", () => this.openComposer());
    wrap.append(pill);
    return wrap;
  }

  private buildClosedComposer(detail: ThreadDetail): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "thread-closed";

    const line = document.createElement("div");
    line.className = "thread-closed-line";

    if (detail.signals.some((s) => s.from === "you")) {
      line.textContent = "This thread holds all it can. Nothing further leaves from here.";
      wrap.append(line);
      return wrap;
    }

    line.textContent = "They spoke first. Answering means aiming a beam of your own.";
    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "study-verb-btn study-verb-btn--primary";
    // The beam's own name, as the source card says it one surface over.
    verbBtn.textContent = "AIM A BEAM";
    verbBtn.addEventListener("click", () => {
      const starId = this.threadStarId;
      if (starId === null) return;
      this.leaveThread();
      this.onHailActionCb?.(starId);
    });
    verbRow.append(verbBtn);
    wrap.append(line, verbRow);
    return wrap;
  }

  private openComposer(): void {
    if (this.composerSheet !== null) return;
    const el = document.createElement("div");
    el.className = "composer-sheet";
    // A child of the SHEET, not of the body: the thread underneath rebuilds
    // itself on every sky, and the composer must not be torn down by that.
    this.sheet.append(el);
    this.composerSheet = el;
    this.composerOpen = true;
    this.composerPicker = null;
    this.composerExpanded = null;
    const detail = this.currentThreadDetail();
    if (detail !== null) this.renderComposerSheet(detail);
  }

  private closeComposer(): void {
    this.composerSheet?.remove();
    this.composerSheet = null;
    this.composerOpen = false;
    this.composerPicker = null;
    this.composerExpanded = null;
  }

  /** Re-renders the thread (for the foot's count) and, with it, the composer
   *  overlay. One entry point, so no caller has to know which of the two a
   *  given tap changed. */
  private refreshComposer(): void {
    if (this.view === "thread") this.renderThread();
  }

  private renderComposerSheet(detail: ThreadDetail): void {
    const el = this.composerSheet;
    if (el === null) return;
    el.innerHTML = "";

    const bar = document.createElement("div");
    bar.className = "composer-bar";

    const picker = this.composerPicker;
    const title = document.createElement("div");
    title.className = "composer-bar-title holos-caps";

    if (picker === null) {
      title.textContent = "AS THEY WILL READ IT";
      const close = document.createElement("button");
      close.type = "button";
      close.className = "composer-bar-btn holos-caps";
      close.setAttribute("aria-label", "Close the composer");
      close.textContent = "✕";
      close.addEventListener("click", () => this.refreshComposerAfter(() => this.closeComposer()));
      bar.append(title, close);
      el.append(bar);
      el.append(this.buildComposerPreview());
      el.append(this.buildComposerControls(detail));
      return;
    }

    title.textContent = SOURCE_CHIP[picker];
    const back = document.createElement("button");
    back.type = "button";
    back.className = "composer-bar-btn holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      this.composerPicker = null;
      this.composerExpanded = null;
      this.renderComposerSheet(detail);
    });
    bar.append(back, title);
    el.append(bar);
    el.append(this.buildPicker(picker, detail));
  }

  /** Runs a mutation that may take the sheet down, then refreshes whatever
   *  is left standing. */
  private refreshComposerAfter(mutate: () => void): void {
    mutate();
    this.refreshComposer();
  }

  /**
   * The top two thirds: the signal so far, in RECEIVE RENDERING. Same tone
   * row, same instrument blocks, same ages. A tap or a swipe on a block takes
   * it back off the beam.
   */
  private buildComposerPreview(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "composer-preview";

    const toneLine = TONE_STAMP[this.composerTone];
    if (toneLine !== null) {
      const row = document.createElement("div");
      row.className = "thread-tone holos-caps";
      row.textContent = toneLine;
      wrap.append(row);
    }

    const parts = this.previewParts();
    if (parts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "composer-empty";
      // A carrier is a real utterance, so the empty state names it rather
      // than scolding: a beam with nothing on it still arrives, dated.
      empty.textContent =
        "Nothing on the beam yet. Sent as it stands, it is a carrier: a beam with nothing on it, arriving dated.";
      wrap.append(empty);
      return wrap;
    }

    const starId = this.threadStarId;
    const distance =
      starId === null ? null : (this.sourcesByStarId.get(starId)?.distanceLy ?? null);
    const ctx: PartContext = {
      mine: true,
      transitYears: distance ?? 0,
      arrivesYear: nowYear() + (distance ?? 0),
      // Never landed: this is a preview of a reading somebody else will take,
      // so every age on it is stated as it will stand ON ARRIVAL.
      landed: false,
    };

    for (const entry of parts) {
      const slot = document.createElement("div");
      slot.className = "composer-slot";
      slot.append(this.buildPartBlock(entry.part, ctx));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "composer-slot-remove holos-caps";
      remove.textContent = "TAKE IT OFF";
      remove.addEventListener("click", () => this.removePart(entry.index));
      slot.append(remove);

      this.attachSwipeRemove(slot, () => this.removePart(entry.index));
      wrap.append(slot);
    }

    return wrap;
  }

  /** Swipe a slot aside to take it off the beam — the sheet's own dismissal
   *  gesture, sideways. `pan-y` in the stylesheet keeps the column scrolling
   *  under a vertical thumb, so only a sideways drag ever reaches this. */
  private attachSwipeRemove(el: HTMLElement, onRemove: () => void): void {
    let startX: number | null = null;
    let dx = 0;
    el.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return;
      startX = e.clientX;
      dx = 0;
    });
    el.addEventListener("pointermove", (e) => {
      if (startX === null) return;
      dx = e.clientX - startX;
      el.style.transform = `translateX(${dx}px)`;
      el.style.opacity = `${Math.max(0.25, 1 - Math.abs(dx) / 220)}`;
    });
    const end = (): void => {
      if (startX === null) return;
      const travelled = dx;
      startX = null;
      dx = 0;
      el.style.transform = "";
      el.style.opacity = "";
      if (Math.abs(travelled) > SWIPE_CLOSE_PX) onRemove();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  /** The bottom third: the source chips, the five tones, and the send. */
  private buildComposerControls(detail: ThreadDetail): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "composer-controls";

    // The four slots, filling left to right. The blocks above are the real
    // reading; this is the count at a glance, so a thumb knows how much beam
    // is left without counting instrument blocks.
    const slots = document.createElement("div");
    slots.className = "composer-slots";
    for (let i = 0; i < MAX_PARTS_PER_SIGNAL; i++) {
      const cell = document.createElement("div");
      cell.className =
        i < this.composerParts.length ? "composer-slot-mark composer-slot-mark--on" : "composer-slot-mark";
      slots.append(cell);
    }
    wrap.append(slots);

    const sources = document.createElement("div");
    sources.className = "composer-chips";
    for (const kind of SOURCE_CHIP_ORDER) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "composer-chip holos-caps";
      chip.textContent = SOURCE_CHIP[kind];
      if (this.chipAvailable(kind, detail)) {
        chip.addEventListener("click", () => {
          this.composerPicker = kind;
          this.composerExpanded = null;
          this.renderComposerSheet(detail);
        });
      } else {
        chip.disabled = true;
      }
      sources.append(chip);
    }
    wrap.append(sources);

    const tones = document.createElement("div");
    tones.className = "composer-chips composer-chips--tone";
    for (const tone of TONE_ORDER) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className =
        tone === this.composerTone
          ? "composer-chip composer-chip--on holos-caps"
          : "composer-chip holos-caps";
      chip.textContent = TONE_CHIP[tone];
      chip.addEventListener("click", () => {
        this.composerTone = tone;
        this.renderComposerSheet(detail);
      });
      tones.append(chip);
    }
    wrap.append(tones);

    wrap.append(this.buildSendRow());
    return wrap;
  }

  /**
   * SEND STATES THE PHYSICS. Not "sent" and not a delivery promise: the year
   * it lands and how long that is in real time, which is the only thing about
   * this beam anybody will ever be able to check.
   */
  private buildSendRow(): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "composer-send-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "composer-send";
    btn.disabled = this.pendingSignal;

    const verb = document.createElement("span");
    verb.className = "composer-send-verb holos-caps";
    verb.textContent = this.composerParts.length === 0 ? "SEND A CARRIER" : "SEND";
    btn.append(verb);

    const starId = this.threadStarId;
    const distance =
      starId === null ? null : (this.sourcesByStarId.get(starId)?.distanceLy ?? null);
    if (distance !== null) {
      const physics = document.createElement("span");
      physics.className = "composer-send-physics holos-caps study-tabular";
      const text = (): string =>
        `ARRIVES IN ${formatRealDuration(realMsForYears(distance))} · ${distance.toFixed(1)} y`;
      physics.textContent = text();
      this.liveClocks.push({ el: physics, text });
      btn.append(physics);
    }

    btn.addEventListener("click", () => this.sendComposed());
    row.append(btn);
    return row;
  }

  private sendComposed(): void {
    const starId = this.threadStarId;
    if (starId === null || this.pendingSignal) return;
    this.pendingSignal = true;
    // SELECTORS, NEVER CONTENT. There is no `text` field on this message and
    // no way to add one: the server materializes every part from the sender's
    // own state, so nothing a player authored crosses to another player.
    this.socket.send({
      type: "sendSignal",
      starId,
      tone: this.composerTone,
      parts: this.composerParts,
    });
    // The confirming sky carries the act and closes the composer on it (see
    // update()). No optimistic signal is ever drawn: the thread shows what
    // the server recorded and nothing else.
    this.refreshComposer();
  }

  // ── The composer's pickers ───────────────────────────────────────────
  //
  // Each one lists the player's OWN eligible items, and eligibility here is
  // the client's reading of the same state the server will materialize
  // against. It is a PRE-CHECK and never authoritative: a selector that has
  // gone stale between the render and the tap comes back `part-unavailable`
  // and costs the tap.

  private addPart(ref: PartRef): void {
    if (this.composerParts.length >= MAX_PARTS_PER_SIGNAL) return;
    const used = this.composerParts.filter((p) => p.kind === ref.kind).length;
    if (used >= PER_KIND_CAP[ref.kind]) return;
    this.composerParts = [...this.composerParts, ref];
    this.composerPicker = null;
    this.composerExpanded = null;
    this.refreshComposer();
  }

  private removePart(index: number): void {
    this.composerParts = this.composerParts.filter((_, i) => i !== index);
    this.refreshComposer();
  }

  /** Whether a source chip has anywhere to go: room on the beam, room under
   *  the per-kind cap, and at least one eligible item behind it. */
  private chipAvailable(kind: PartKind, detail: ThreadDetail): boolean {
    if (this.composerParts.length >= MAX_PARTS_PER_SIGNAL) return false;
    const used = this.composerParts.filter((p) => p.kind === kind).length;
    if (used >= PER_KIND_CAP[kind]) return false;
    switch (kind) {
      case "finding":
        return this.calledStudies().length > 0;
      case "sighting":
        return this.sourcesByStarId.size > 0;
      case "archive":
        return this.archiveSubjects().length > 0;
      case "culture":
        return this.self !== null;
      case "request":
        return true;
      case "verdict":
        return this.verdictTargets(detail).length > 0;
      case "accord": {
        const a = detail.accord;
        return a.canOffer || a.canAccept || a.canDecline || a.canWithdraw;
      }
    }
  }

  /** Studies that froze a belief when the player called them. A grounded
   *  study settled from the ground and froze nothing, so it has no finding to
   *  send — signalparts.ts's own rule, read from this side. */
  private calledStudies(): readonly StudySnapshot[] {
    const out: StudySnapshot[] = [];
    for (const s of this.studiesByStarId.values()) {
      if (s.status === "called" && s.call !== null) out.push(s);
    }
    return out;
  }

  /** Whose light record can be sent: the player's own home always (the
   *  self-disclosure handshake), plus any source they hold a study on. */
  private archiveSubjects(): readonly { readonly starId: string; readonly ofSelf: boolean }[] {
    const out: { readonly starId: string; readonly ofSelf: boolean }[] = [];
    const self = this.self;
    if (self !== null) out.push({ starId: self.starId, ofSelf: true });
    for (const s of this.studiesByStarId.values()) {
      if (this.sourcesByStarId.has(s.starId)) out.push({ starId: s.starId, ofSelf: false });
    }
    return out;
  }

  /** Parts of THEIR delivered signals a verdict could answer. Only theirs: a
   *  verdict on your own part says nothing, and the thread is the only place
   *  a reference resolves at all. */
  private verdictTargets(
    detail: ThreadDetail,
  ): readonly { readonly signalId: string; readonly partIndex: number; readonly part: SignalPart }[] {
    const out: { readonly signalId: string; readonly partIndex: number; readonly part: SignalPart }[] =
      [];
    for (const s of detail.signals) {
      if (s.from !== "them") continue;
      for (const [partIndex, part] of s.parts.entries()) {
        out.push({ signalId: s.id, partIndex, part });
      }
    }
    return out;
  }

  private buildPicker(kind: PartKind, detail: ThreadDetail): HTMLDivElement {
    const list = document.createElement("div");
    list.className = "composer-picker";
    switch (kind) {
      case "finding":
        this.fillFindingPicker(list, detail);
        break;
      case "sighting":
        this.fillSightingPicker(list);
        break;
      case "archive":
        this.fillArchivePicker(list, detail);
        break;
      case "culture":
        this.fillCulturePicker(list);
        break;
      case "request":
        this.fillRequestPicker(list, detail);
        break;
      case "verdict":
        this.fillVerdictPicker(list, detail);
        break;
      case "accord":
        this.fillAccordPicker(list, detail);
        break;
    }
    return list;
  }

  /** One row in a composer picker: a title, a quiet second line, and a tap. */
  private buildComposerRow(title: string, sub: string, onTap: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "composer-row";
    const t = document.createElement("div");
    t.className = "composer-row-title";
    t.textContent = title;
    const s = document.createElement("div");
    s.className = "composer-row-sub holos-caps";
    s.textContent = sub;
    btn.append(t, s);
    btn.addEventListener("click", onTap);
    return btn;
  }

  /** A row that opens into a chip strip rather than adding straight away —
   *  the two-step selections (a finding's depth, an archive's window, a
   *  verdict's stance), where the second tap is the choice that matters. */
  private appendExpander(
    list: HTMLDivElement,
    key: string,
    title: string,
    sub: string,
    detail: ThreadDetail,
    chips: readonly { readonly label: string; readonly onTap: () => void }[],
  ): void {
    list.append(
      this.buildComposerRow(title, sub, () => {
        this.composerExpanded = this.composerExpanded === key ? null : key;
        this.renderComposerSheet(detail);
      }),
    );
    if (this.composerExpanded !== key) return;
    const strip = document.createElement("div");
    strip.className = "composer-chips composer-chips--inline";
    for (const chip of chips) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "composer-chip holos-caps";
      btn.textContent = chip.label;
      btn.addEventListener("click", chip.onTap);
      strip.append(btn);
    }
    list.append(strip);
  }

  private fillFindingPicker(list: HTMLDivElement, detail: ThreadDetail): void {
    for (const study of this.calledStudies()) {
      const call = study.call;
      if (call === null) continue;
      this.appendExpander(
        list,
        `finding:${study.starId}`,
        call.label,
        `${this.partSubject(study.starId)} · ${Math.round(call.share * 100)}% · CALLED ${formatAbsoluteYear(call.calledYear)}`,
        detail,
        [
          {
            label: FINDING_DEPTH_CHIP.full,
            onTap: () => this.addPart({ kind: "finding", starId: study.starId, depth: "full" }),
          },
          {
            label: FINDING_DEPTH_CHIP.headline,
            onTap: () =>
              this.addPart({ kind: "finding", starId: study.starId, depth: "headline" }),
          },
        ],
      );
    }
  }

  private fillSightingPicker(list: HTMLDivElement): void {
    // THE ONE RESTRAINT ON COORDINATES: only a star in the player's OWN
    // visible sky can be named, which is exactly what `sources` is. A
    // civilization nobody can see is unleakable.
    for (const source of this.sourcesByStarId.values()) {
      list.append(
        this.buildComposerRow(
          this.partSubject(source.starId),
          `${CLASS_LABEL[source.signal.classification]} · AS OF ${formatArchiveAge(source.lightAgeYears)} Y AGO`,
          () => this.addPart({ kind: "sighting", starId: source.starId }),
        ),
      );
    }
  }

  private fillArchivePicker(list: HTMLDivElement, detail: ThreadDetail): void {
    for (const subject of this.archiveSubjects()) {
      const windows: readonly ArchiveWindow[] = ["recent", "long"];
      this.appendExpander(
        list,
        `archive:${subject.starId}`,
        subject.ofSelf ? "Our own light" : this.partSubject(subject.starId),
        subject.ofSelf ? "THE RECORD OF OUR OWN EMISSION" : "THE RECORD AS WE HOLD IT",
        detail,
        windows.map((window) => ({
          label: ARCHIVE_WINDOW_CHIP[window],
          onTap: () => this.addPart({ kind: "archive", starId: subject.starId, window }),
        })),
      );
    }
  }

  private fillCulturePicker(list: HTMLDivElement): void {
    const self = this.self;
    if (self === null) return;
    list.append(
      this.buildComposerRow(self.seed.charter, "OUR CHARTER", () =>
        this.addPart({ kind: "culture", source: "charter", index: 0 }),
      ),
    );
    for (const [index, line] of self.seed.chronicle.entries()) {
      list.append(
        this.buildComposerRow(line, "FROM OUR CHRONICLE", () =>
          this.addPart({ kind: "culture", source: "chronicle", index }),
        ),
      );
    }
    for (const [index, axis] of DIAL_AXES.entries()) {
      const setting = self.seed.dials[axis.id];
      const leaning = setting.position < 0 ? axis.left : axis.right;
      list.append(
        this.buildComposerRow(leaning.gloss, `OUR DIAL · ${leaning.inWorld}`, () =>
          this.addPart({ kind: "culture", source: "dial", index }),
        ),
      );
    }
  }

  /** Two steps in one panel: WHAT is wanted, then WHO it is about. A request
   *  about nobody in particular is legal and is the common case. */
  private fillRequestPicker(list: HTMLDivElement, detail: ThreadDetail): void {
    const wants = document.createElement("div");
    wants.className = "composer-chips composer-chips--inline";
    for (const want of WANT_ORDER) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className =
        want === this.composerWant
          ? "composer-chip composer-chip--on holos-caps"
          : "composer-chip holos-caps";
      chip.textContent = WANT_CHIP[want];
      chip.addEventListener("click", () => {
        this.composerWant = want;
        this.renderComposerSheet(detail);
      });
      wants.append(chip);
    }
    list.append(wants);

    list.append(
      this.buildComposerRow("Anybody at all", "ABOUT NOBODY IN PARTICULAR", () =>
        this.addPart({ kind: "request", want: this.composerWant, starId: null }),
      ),
    );
    for (const source of this.sourcesByStarId.values()) {
      list.append(
        this.buildComposerRow(
          this.partSubject(source.starId),
          CLASS_LABEL[source.signal.classification],
          () =>
            this.addPart({
              kind: "request",
              want: this.composerWant,
              starId: source.starId,
            }),
        ),
      );
    }
  }

  private fillVerdictPicker(list: HTMLDivElement, detail: ThreadDetail): void {
    for (const target of this.verdictTargets(detail)) {
      const key = `verdict:${target.signalId}:${target.partIndex}`;
      this.appendExpander(
        list,
        key,
        this.partHeadText(target.part, false),
        `${target.signalId.toUpperCase()} · PART ${target.partIndex + 1}`,
        detail,
        STANCE_ORDER.map((stance) => ({
          label: STANCE_CHIP[stance],
          onTap: () =>
            this.addPart({
              kind: "verdict",
              signalId: target.signalId,
              partIndex: target.partIndex,
              stance,
            }),
        })),
      );
    }
  }

  /**
   * The mutual quiet's moves, and only the ones this side may actually make:
   * the rail's four flags come off the same predicate the materializer
   * refuses on, so a chip shown here is a chip the server will accept.
   */
  private fillAccordPicker(list: HTMLDivElement, detail: ThreadDetail): void {
    const rail = detail.accord;
    const moves: readonly { readonly move: AccordMove; readonly open: boolean; readonly sub: string }[] =
      [
        {
          move: "offer",
          open: rail.canOffer,
          sub: "NEITHER OF US SHINES AT THE OTHER. ONE OFFER, EVER",
        },
        { move: "accept", open: rail.canAccept, sub: "THEY WILL NOT KNOW UNTIL IT REACHES THEM" },
        { move: "decline", open: rail.canDecline, sub: "THE OFFER CLOSES" },
        { move: "withdraw", open: rail.canWithdraw, sub: "THE HONEST EXIT, WHILE THERE IS BUDGET FOR ONE" },
      ];
    for (const entry of moves) {
      if (!entry.open) continue;
      list.append(
        this.buildComposerRow(ACCORD_MOVE_CHIP[entry.move], entry.sub, () =>
          // `ref` is null on every move: accept and decline answer the one
          // offer that landed, and the server derives which that is. Naming
          // it from here would only be a way to name it wrong.
          this.addPart({ kind: "accord", move: entry.move, ref: null }),
        ),
      );
    }
  }

  // ── The preview's materializer ───────────────────────────────────────
  //
  // The server materializes every part that actually travels; this is the
  // client's reading of the SAME state, so the preview is the thing that will
  // land rather than a mock-up of it. Every field below comes off this
  // client's own wire — its studies, its sky, its own seed — and there is no
  // arm here that could invent one, because there is nothing to invent it
  // from. If a selector has gone stale the preview simply drops it, and the
  // server answers the send the same way.

  private previewParts(): readonly { readonly part: SignalPart; readonly index: number }[] {
    const out: { readonly part: SignalPart; readonly index: number }[] = [];
    for (const [index, ref] of this.composerParts.entries()) {
      const part = this.previewPart(ref);
      if (part !== null) out.push({ part, index });
    }
    // Canonical order, imposed server-side at materialization — the preview
    // stands them in the same order so the composition a player reads is the
    // one the counterpart will.
    return out
      .slice()
      .sort((a, b) => PART_ORDER.indexOf(a.part.kind) - PART_ORDER.indexOf(b.part.kind));
  }

  /**
   * The target year a frozen call speaks to. The server keeps it on the
   * stored call (`calledYear − distance`) but the WIRE carries the call's
   * CURRENT age instead, so the preview reconstructs it: from the distance
   * when the source is still visible, which is the server's own definition
   * and exact; otherwise from the age, which drifts by however long ago that
   * snapshot was taken and is a year or two at worst.
   */
  private callAsOfYear(starId: string, calledYear: number, lightAgeYears: number): number {
    const distance = this.sourcesByStarId.get(starId)?.distanceLy;
    if (distance !== undefined) return calledYear - distance;
    return nowYear() - lightAgeYears;
  }

  private previewPart(ref: PartRef): SignalPart | null {
    switch (ref.kind) {
      case "finding": {
        const study = this.studiesByStarId.get(ref.starId);
        const call = study?.call ?? null;
        if (study === undefined || call === null) return null;
        const evidence =
          ref.depth === "headline"
            ? []
            : study.openQuestions
                .filter((q) => q.boughtYear !== null && q.boughtYear <= call.calledYear)
                .slice(0, MAX_EVIDENCE_PER_FINDING)
                .map((q) => q.id);
        return {
          kind: "finding",
          subjectStarId: study.starId,
          hypothesisId: call.hypothesisId as HypothesisId,
          label: call.label,
          gloss: call.gloss,
          share: call.share,
          basis: "called",
          asOfYear: this.callAsOfYear(study.starId, call.calledYear, call.lightAgeYears),
          calledYear: call.calledYear,
          evidence,
        };
      }
      case "sighting": {
        const source = this.sourcesByStarId.get(ref.starId);
        if (source === undefined) return null;
        return {
          kind: "sighting",
          subjectStarId: source.starId,
          signalClass: source.signal.classification,
          asOfYear: source.asOfYear,
        };
      }
      case "archive": {
        const span = ARCHIVE_WINDOW_YEARS[ref.window];
        const self = this.self;
        if (self !== null && self.starId === ref.starId) {
          // Our own history, sampled at years at or before now: a dark turn
          // that has not happened yet cannot be sampled and cannot leak.
          const toYear = nowYear();
          return {
            kind: "archive",
            subjectStarId: ref.starId,
            ofSelf: true,
            fromYear: toYear - span,
            toYear,
            samples: sampleWindow(self.seed.emissionHistory, toYear - span, toYear),
          };
        }
        const source = this.sourcesByStarId.get(ref.starId);
        if (source === undefined) return null;
        // A third party's OBSERVED history, already clipped at the light
        // departure year by the knowledge layer before it reached this client.
        const toYear = source.asOfYear;
        return {
          kind: "archive",
          subjectStarId: ref.starId,
          ofSelf: false,
          fromYear: toYear - span,
          toYear,
          samples: sampleWindow(source.signal.lightHistory, toYear - span, toYear),
        };
      }
      case "culture": {
        const self = this.self;
        if (self === null) return null;
        if (ref.source === "charter") {
          return {
            kind: "culture",
            source: "charter",
            index: 0,
            axis: null,
            pole: null,
            text: self.seed.charter,
          };
        }
        if (ref.source === "chronicle") {
          const line = self.seed.chronicle[ref.index];
          if (line === undefined) return null;
          return {
            kind: "culture",
            source: "chronicle",
            index: ref.index,
            axis: null,
            pole: null,
            text: line,
          };
        }
        const axis = DIAL_AXES[ref.index];
        if (axis === undefined) return null;
        const leaning = self.seed.dials[axis.id].position < 0 ? axis.left : axis.right;
        return {
          kind: "culture",
          source: "dial",
          index: ref.index,
          axis: axis.id,
          pole: leaning.inWorld,
          text: leaning.gloss,
        };
      }
      case "request":
        return { kind: "request", want: ref.want, subjectStarId: ref.starId };
      case "verdict":
        return {
          kind: "verdict",
          signalId: ref.signalId,
          partIndex: ref.partIndex,
          stance: ref.stance,
        };
      case "accord":
        return { kind: "accord", form: "mutual-quiet", move: ref.move, ref: ref.ref };
    }
  }

  // ── The turnaround floor ─────────────────────────────────────────────

  private raiseFloorNotice(): void {
    this.floorNotice = true;
    this.closeComposer();
    if (this.floorNoticeHandle !== null) window.clearTimeout(this.floorNoticeHandle);
    this.floorNoticeHandle = window.setTimeout(() => {
      this.floorNoticeHandle = null;
      this.floorNotice = false;
      if (this.view === "thread") this.renderThread();
    }, TURNAROUND_NOTICE_MS);
  }

  private clearFloorNotice(): void {
    this.floorNotice = false;
    if (this.floorNoticeHandle !== null) {
      window.clearTimeout(this.floorNoticeHandle);
      this.floorNoticeHandle = null;
    }
  }

  // ── Render: mission detail ───────────────────────────────────────────

  /** The receipt under a discounted cost/clock row — the server-composed
   *  "DOWN FROM … · GRANTED BY …" line (OpenQuestion.costProvenance /
   *  hasteProvenance). Faint: it explains a number, it is not one to act on. */
  private buildProvenanceLine(text: string): HTMLDivElement {
    const line = document.createElement("div");
    line.className = "study-question-provenance holos-caps";
    line.textContent = text;
    return line;
  }

  private buildClockRow(label: string, value: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "tend-mission-clock-row";
    const l = document.createElement("span");
    l.className = "tend-mission-clock-label holos-caps";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "tend-mission-clock-value holos-caps study-tabular";
    v.textContent = value;
    row.append(l, v);
    return row;
  }

  private renderMissionDetail(): void {
    const missionId = this.focusedMissionId;
    const m = missionId === null ? undefined : this.missionsById.get(missionId);
    this.body.innerHTML = "";
    if (missionId === null || m === undefined) {
      // The mission vanished between the tap and this render — see update().
      this.view = "tend";
      this.focusedMissionId = null;
      this.renderTend();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openTend());
    this.body.append(back);

    // Header: the mission's kind, then the target — same anatomy as the
    // study focus header (designation quiet, name loud). A mission survives
    // its source (missions.ts), so a target no longer visible falls back to
    // the Tend row's own "at {name}" text rather than nothing.
    const header = document.createElement("div");
    header.className = "study-focus-header";
    const kicker = document.createElement("div");
    kicker.className = "holos-caps";
    kicker.textContent = m.label;
    header.append(kicker);

    const source = this.sourcesByStarId.get(m.starId);
    if (source !== undefined) {
      const localName = this.localNames.get(m.starId);
      const hasLocalName = localName !== undefined && localName.length > 0;
      if (hasLocalName) {
        const desig = document.createElement("div");
        desig.className = "study-focus-designation holos-caps";
        desig.textContent = source.designation;
        header.append(desig);
      }
      const nameEl = document.createElement("div");
      nameEl.className = "study-focus-name holos-serif";
      nameEl.textContent = hasLocalName ? (localName as string) : source.designation;
      header.append(nameEl);
    } else {
      const tendRow = this.tend.find((r) => r.id === `mission/${m.id}`);
      const fallbackName = tendRow?.sub.replace(/^at /, "") ?? m.starId;
      const nameEl = document.createElement("div");
      nameEl.className = "study-focus-name holos-serif";
      nameEl.textContent = fallbackName;
      header.append(nameEl);
    }
    this.body.append(header);

    this.body.append(this.hairline());

    // Charter — the same reading anatomy the briefing's menu uses (label
    // over quiet gloss), reused wholesale rather than a new quiet-list style.
    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = "CHARTER";
    this.body.append(charterHeader);

    const charterList = document.createElement("div");
    charterList.className = "study-brief-menu";
    for (const c of m.charter) {
      const item = document.createElement("div");
      item.className = "study-hyp-labelcol study-brief-reading";
      const label = document.createElement("span");
      label.className = "study-hyp-label holos-caps";
      label.textContent = c.label;
      const line = document.createElement("span");
      line.className = "study-hyp-gloss";
      line.textContent = c.line;
      item.append(label, line);
      charterList.append(item);
    }
    this.body.append(charterList);

    this.body.append(this.hairline());

    // The clock trio.
    const now = nowYear();
    this.body.append(
      now < m.arrivalYear
        ? this.buildClockRow("ARRIVES", formatCountdown(m.arrivalYear) ?? formatAbsoluteYear(m.arrivalYear))
        : this.buildClockRow("ARRIVED", formatAbsoluteYear(m.arrivalYear)),
    );
    this.body.append(
      now < m.firstWordYear
        ? this.buildClockRow(
            "FIRST WORD",
            formatCountdown(m.firstWordYear) ?? formatAbsoluteYear(m.firstWordYear),
          )
        : this.buildClockRow("FIRST WORD", formatAbsoluteYear(m.firstWordYear)),
    );

    if (m.state === "silent") {
      // The wire carries no explicit silence-onset date (missionWorkState
      // derives "silent" structurally, not as a stamped year) — the last
      // report's arrival, or the first-word promise if none ever landed, is
      // the truest date already on hand. The charter sits right above; the
      // game never explains further.
      const lastReport = m.reports[m.reports.length - 1];
      const sinceYear = lastReport !== undefined ? lastReport.arrivedYear : m.firstWordYear;
      const silentRow = document.createElement("div");
      silentRow.className = "tend-mission-silent holos-caps";
      silentRow.textContent = `SILENT SINCE ${formatAbsoluteYear(sinceYear)}`;
      this.body.append(silentRow);
    } else if (m.state === "standing" && m.nextWordYear !== null) {
      this.body.append(
        this.buildClockRow(
          "NEXT WORD",
          formatCountdown(m.nextWordYear) ?? formatAbsoluteYear(m.nextWordYear),
        ),
      );
    }

    this.body.append(this.hairline());

    const reportsHeader = document.createElement("div");
    reportsHeader.className = "study-section-header holos-caps";
    reportsHeader.textContent = "REPORTS";
    this.body.append(reportsHeader);

    if (m.reports.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-archive-empty";
      empty.textContent = "No word yet.";
      this.body.append(empty);
    } else {
      for (const r of m.reports) {
        const row = document.createElement("div");
        row.className = "study-archive-row";
        const headline = document.createElement("div");
        headline.className = "tend-report-headline holos-caps";
        headline.textContent = r.headline;
        const detail = document.createElement("div");
        detail.className = "study-archive-text";
        detail.textContent = r.detail;
        const age = document.createElement("div");
        age.className = "study-archive-age holos-caps";
        age.textContent = `AS OF ${formatArchiveAge(r.lightAgeYears)} Y AGO`;
        row.append(headline, detail, age);
        this.body.append(row);
      }
    }
  }

  // ── Render: the launch sheet ─────────────────────────────────────────
  // Two steps, no hold-to-commit ceremony (economy-design.md: Ambient = no
  // ceremony) — a kind pick with a live clock preview, then a real charter.

  private buildKindRow(k: MissionKindDef): HTMLButtonElement {
    const selected = this.launchKind === k.kind;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected ? "study-project-row tend-launch-kind-row--selected" : "study-project-row";
    btn.addEventListener("click", () => {
      this.launchKind = k.kind;
      this.renderLaunch();
    });

    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = k.label;
    const line = document.createElement("div");
    line.className = "study-project-line";
    line.textContent = k.line;
    const meta = document.createElement("div");
    meta.className = "study-project-meta holos-caps";
    meta.textContent = `${k.costCompute} COMPUTE`;

    btn.append(label, line, meta);
    return btn;
  }

  private buildClauseRow(c: CharterClauseDef): HTMLButtonElement {
    const selected = this.launchCharter.has(c.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected
      ? "tend-launch-clause-row tend-launch-clause-row--selected"
      : "tend-launch-clause-row";
    btn.addEventListener("click", () => this.toggleClause(c));

    const label = document.createElement("span");
    label.className = "study-hyp-label holos-caps";
    label.textContent = c.label;
    const line = document.createElement("span");
    line.className = "study-hyp-gloss";
    line.textContent = c.line;
    btn.append(label, line);
    return btn;
  }

  /** Tap toggles; at most one clause per group (client-side enforcement —
   *  missions.ts's validateCharter re-checks server-side regardless). */
  private toggleClause(c: CharterClauseDef): void {
    if (this.missionCatalog === null) return;
    const next = new Set(this.launchCharter);
    if (next.has(c.id)) {
      next.delete(c.id);
    } else {
      for (const other of [...next]) {
        const def = this.missionCatalog.clauses.find((cc) => cc.id === other);
        if (def !== undefined && def.group === c.group) next.delete(other);
      }
      next.add(c.id);
    }
    this.launchCharter = next;
    this.renderLaunch();
  }

  private renderLaunch(): void {
    const starId = this.launchStarId;
    const source = starId === null ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";

    // The source faded before the sheet opened (or between renders) — there
    // is nothing to launch at, so fall back rather than render about nothing
    // (renderBrief's precedent).
    if (starId === null || source === undefined) {
      this.view = "hub";
      this.launchStarId = null;
      this.renderHub();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-focus-header";
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;
    if (hasLocalName) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = source.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = hasLocalName ? (localName as string) : source.designation;
    header.append(nameEl);
    this.body.append(header);

    const meta = document.createElement("div");
    meta.className = "holos-caps";
    meta.textContent = `${source.distanceLy.toFixed(1)} LY · AS OF ${source.lightAgeYears.toFixed(1)} Y AGO`;
    this.body.append(meta);

    this.body.append(this.hairline());

    const kindHeader = document.createElement("div");
    kindHeader.className = "study-section-header holos-caps";
    kindHeader.textContent = "CHOOSE A KIND";
    this.body.append(kindHeader);

    if (this.missionCatalog !== null) {
      for (const k of this.missionCatalog.kinds) {
        this.body.append(this.buildKindRow(k));
      }
    }

    if (this.launchKind !== null) {
      const F = this.probeFlightYearsPerLy;
      const d = source.distanceLy;
      const preview = document.createElement("div");
      preview.className = "study-focus-lightage";
      preview.textContent = `ARRIVES IN ${formatClockPair(F * d)} · FIRST WORD IN ${formatClockPair((F + 1) * d)}`;
      this.body.append(preview);
    }

    this.body.append(this.hairline());

    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = "WRITE THE CHARTER";
    this.body.append(charterHeader);

    const catalog = this.missionCatalog;
    if (this.launchKind === null || catalog === null) {
      const hint = document.createElement("div");
      hint.className = "study-picker-subtitle";
      hint.textContent = "Choose a kind to write its charter.";
      this.body.append(hint);
    } else {
      const kind = this.launchKind;
      for (const c of catalog.clauses) {
        if (!c.appliesTo.includes(kind)) continue;
        this.body.append(this.buildClauseRow(c));
      }
    }

    this.body.append(this.hairline());

    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "study-verb-btn study-verb-btn--primary";

    const kindDef =
      catalog === null || this.launchKind === null
        ? undefined
        : catalog.kinds.find((k) => k.kind === this.launchKind);
    const count = this.launchCharter.size;
    const validCount = catalog !== null && count >= catalog.minClauses && count <= catalog.maxClauses;
    const free = this.currentFreeCompute();
    const affordable = kindDef !== undefined && free >= kindDef.costCompute;
    const pending = this.pendingLaunchStarId === starId;

    let hint = "";
    if (pending) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCHING…";
    } else if (kindDef === undefined) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCH";
    } else if (!validCount) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCH";
      hint = "PICK TWO OR THREE";
    } else if (!affordable) {
      verbBtn.disabled = true;
      verbBtn.textContent = "LAUNCH";
      hint = `${Math.ceil(kindDef.costCompute - free)} SHORT`;
    } else {
      const launchKind = this.launchKind;
      verbBtn.textContent = "LAUNCH";
      verbBtn.addEventListener("click", () => {
        if (launchKind === null) return;
        this.pendingLaunchStarId = starId;
        this.pendingLaunchPriorMissionIds = new Set(this.missions.map((mm) => mm.id));
        this.socket.send({
          type: "launchMission",
          starId,
          kind: launchKind,
          charter: [...this.launchCharter],
        });
        this.renderLaunch();
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);

    if (hint.length > 0) {
      const hintEl = document.createElement("div");
      hintEl.className = "study-brief-meta holos-caps";
      hintEl.textContent = hint;
      this.body.append(hintEl);
    }
  }

  // ── Render: THE SURVEY and the founding sheet (A4) ───────────────────
  //
  // The launch sheet's discipline, one act later, and the register is the
  // same: amber and ink, never cyan, because everything the forecast says is
  // a guess about somewhere nobody has been. Three rules this whole block
  // obeys, and they are why it is longer than the mission sheet:
  //
  //  • NOTHING HERE CLAIMS WHAT THE WIRE DID NOT SEND. The priors arrive as
  //    WORDS and are rendered as words with a three-step bar behind them; the
  //    clocks are the SurveyRow's own durations where there is a row, and the
  //    catalog's own arithmetic where there is not; the occupancy line is the
  //    server's sentence, verbatim.
  //  • THE FORECAST IS A PRIOR, NEVER TRUTH. There is no field on this wire
  //    that says what is actually at the far end, and there is nothing here
  //    that could render one if there were.
  //  • BECOME, IN REVERSE. The charter is written on the same dial furniture
  //    the inheritance card is read on (ceremony.ts's renderDialBand), with
  //    the parent's band as the track and the parent's own position as a
  //    ghost behind the child's. The player is on the writing side of the
  //    card this time, and the surface says so by being the same card.

  /** Everything the sheet needs about where it is aimed. `row` is the survey
   *  entry when the star is on it (priors, chips, the per-kind clocks) and
   *  null for a source further out than the survey reaches — in which case
   *  the forecast panel renders what it has and states nothing else. */
  private voyageTargetFor(starId: string): {
    readonly starId: string;
    readonly designation: string;
    readonly distanceLy: number;
    readonly spectralClass: Star["spectralClass"] | null;
    readonly row: SurveyRow | null;
  } | null {
    const row = this.survey.find((r) => r.starId === starId) ?? null;
    if (row !== null) {
      return {
        starId,
        designation: row.designation,
        distanceLy: row.distanceLy,
        spectralClass: row.spectralClass,
        row,
      };
    }
    const source = this.sourcesByStarId.get(starId);
    if (source === undefined) return null;
    return {
      starId,
      designation: source.designation,
      distanceLy: source.distanceLy,
      spectralClass: this.starsById.get(starId)?.spectralClass ?? null,
      row: null,
    };
  }

  /** What one ship kind would cost this target in TIME. The survey's own
   *  durations where it sent them; otherwise the same arithmetic on the
   *  catalog's frozen rate and a distance already on the wire. */
  private voyageClocksFor(
    target: { readonly distanceLy: number; readonly row: SurveyRow | null },
    k: VoyageKindDef,
  ): { readonly flightYears: number; readonly firstWordYears: number; readonly infoAgeYears: number } {
    const sent = target.row?.clocks.find((c) => c.kind === k.kind);
    if (sent !== undefined) {
      return {
        flightYears: sent.flightYears,
        firstWordYears: sent.firstWordYears,
        infoAgeYears: sent.infoAgeYears,
      };
    }
    const d = target.distanceLy;
    const f = k.flightYearsPerLy;
    return { flightYears: f * d, firstWordYears: (f + 1) * d, infoAgeYears: (1 + f) * d };
  }

  /** The project a ship kind waits on, when it has not landed yet. Null when
   *  the kind needs none or the emitter is already standing. */
  private voyageProjectBlock(k: VoyageKindDef): { readonly label: string | null } | null {
    if (k.requiresProject === null) return null;
    const project = this.projects.find((p) => p.id === k.requiresProject);
    if (project !== undefined && project.status === "standing") return null;
    return { label: project?.label ?? null };
  }

  /** How long the sender's own departure light burns — voyages.ts's
   *  `departureLightFor`, on the catalog numbers the wire already carries.
   *  Null for a seedship, which leaves on chemistry and is never seen
   *  leaving. */
  private departureYearsFor(k: VoyageKindDef, distanceLy: number): number | null {
    if (k.departureLevel === null) return null;
    const raw =
      k.departureYears ??
      (k.departureYearsPerLy === null ? 0 : k.departureYearsPerLy * distanceLy);
    return k.departureYearsCap === null ? raw : Math.min(k.departureYearsCap, raw);
  }

  /** One axis of the charter in progress, seeded on first read from the
   *  PARENT'S OWN position: a charter nobody touched says "carry on as we
   *  are", which is a real instruction and not an empty form. */
  private voyageDialFor(axis: DialAxisId): { position: number; pinned: boolean } {
    const held = this.voyageDials.get(axis);
    if (held !== undefined) return held;
    const parent = this.self?.seed.dials[axis];
    const seeded = { position: parent?.position ?? 0, pinned: false };
    this.voyageDials.set(axis, seeded);
    return seeded;
  }

  private renderSurvey(): void {
    this.body.innerHTML = "";
    this.liveClocks = [];

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "THE SURVEY";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent =
      "The nearest stars, and what we would expect a ship to find. Every line of it is a guess from here.";
    this.body.append(subtitle);

    if (this.survey.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-board-empty";
      empty.textContent = "Nothing charted yet.";
      this.body.append(empty);
      return;
    }

    this.body.append(this.hairline());

    for (const row of this.survey) {
      this.body.append(this.buildSurveyRow(row));
    }
  }

  /** One star on the survey: what it is, how far, how tight the forecast is,
   *  and what each ship would cost it in staleness. A tap opens the founding
   *  sheet aimed there. */
  private buildSurveyRow(row: SurveyRow): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tend-row";
    btn.addEventListener("click", () => this.openVoyageLaunch(row.starId, "survey"));

    const top = document.createElement("div");
    top.className = "tend-row-top";

    const main = document.createElement("div");
    main.className = "tend-row-main";
    const name = document.createElement("div");
    name.className = "tend-row-label holos-serif";
    const localName = this.localNames.get(row.starId);
    name.textContent =
      localName !== undefined && localName.length > 0 ? localName : row.designation;
    const sub = document.createElement("div");
    sub.className = "holos-caps";
    sub.textContent = `${row.distanceLy.toFixed(1)} LY · CLASS ${row.spectralClass}`;
    main.append(name, sub);

    const meta = document.createElement("div");
    meta.className = "tend-row-meta";
    const chip = document.createElement("div");
    chip.className = "tend-badge tend-chip";
    chip.textContent = WIDTH_CHIP_LABEL[row.widthChip];
    meta.append(chip);

    top.append(main, meta);
    btn.append(top);

    // The occupied line, only where the sky already shows something there.
    // `lightAgeYears` is the age of THAT reading and nothing else, so it is
    // stated with it or not at all.
    if (row.occupied) {
      const occupied = document.createElement("div");
      occupied.className = "voyage-occupied holos-caps";
      occupied.textContent =
        row.lightAgeYears === null
          ? "SOMETHING IS ALREADY THERE"
          : `SOMETHING IS ALREADY THERE · AS OF ${row.lightAgeYears.toFixed(1)} Y AGO`;
      btn.append(occupied);
    }

    // The per-kind info age: how old the news is at the moment a ship
    // arrives. This is the survey's whole argument — the distance is not the
    // cost, the staleness is.
    for (const clock of row.clocks) {
      const kindDef = this.voyageCatalog?.kinds.find((k) => k.kind === clock.kind);
      if (kindDef === undefined) continue;
      const line = document.createElement("div");
      line.className = "voyage-survey-clock holos-caps study-tabular";
      line.textContent = `${kindDef.label} · NEWS ${formatGameYears(clock.infoAgeYears)} OLD AT LANDFALL`;
      btn.append(line);
    }

    return btn;
  }

  private renderVoyageLaunch(): void {
    const starId = this.voyageStarId;
    const target = starId === null ? null : this.voyageTargetFor(starId);
    this.body.innerHTML = "";
    this.liveClocks = [];
    this.voyageCommitRefresh = null;
    this.voyageVerbRow = null;

    // The star fell off the survey and is not a source either — there is
    // nothing to aim at, so fall back rather than render about nothing
    // (renderLaunch's precedent).
    if (starId === null || target === null) {
      this.view = "hub";
      this.voyageStarId = null;
      this.renderHub();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      if (this.voyageReturn === "survey") this.openSurvey();
      else this.openHub();
    });
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-focus-header";
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;
    if (hasLocalName) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = target.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = hasLocalName ? (localName as string) : target.designation;
    header.append(nameEl);
    this.body.append(header);

    const meta = document.createElement("div");
    meta.className = "holos-caps";
    meta.textContent =
      target.spectralClass === null
        ? `${target.distanceLy.toFixed(1)} LY`
        : `${target.distanceLy.toFixed(1)} LY · CLASS ${target.spectralClass}`;
    this.body.append(meta);

    this.body.append(this.hairline());

    // ── Step one: the ship ──
    const kindHeader = document.createElement("div");
    kindHeader.className = "study-section-header holos-caps";
    kindHeader.textContent = "CHOOSE A SHIP";
    this.body.append(kindHeader);

    const catalog = this.voyageCatalog;
    if (catalog === null) {
      const hint = document.createElement("div");
      hint.className = "study-picker-subtitle";
      hint.textContent = "Nothing is available to send from here.";
      this.body.append(hint);
      return;
    }

    for (const k of catalog.kinds) {
      this.body.append(this.buildVoyageKindRow(k, target));
    }

    this.body.append(this.hairline());

    // ── Step two: the forecast ──
    this.body.append(this.buildVoyageForecast(target));

    this.body.append(this.hairline());

    // ── Step three: the charter ──
    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = "WRITE THE CHARTER";
    this.body.append(charterHeader);

    const charterNote = document.createElement("div");
    charterNote.className = "study-picker-subtitle";
    charterNote.textContent =
      "What the founders carry. They will be reading it centuries after we could have advised them.";
    this.body.append(charterNote);

    this.body.append(this.buildVoyageDials(catalog));

    for (const group of this.voyageGroupOrder(catalog)) {
      const groupHeader = document.createElement("div");
      groupHeader.className = "voyage-group-header holos-caps";
      // A ship that has not been told what to do about an occupied world, or
      // whether to be heard when it gets there, has not been chartered — so
      // those two say so on their own headers rather than only in a refusal.
      groupHeader.textContent = REQUIRED_VOYAGE_GROUPS.includes(group)
        ? `${VOYAGE_GROUP_LABEL[group]} · REQUIRED`
        : VOYAGE_GROUP_LABEL[group];
      this.body.append(groupHeader);
      for (const clause of catalog.clauses) {
        if (clause.group !== group) continue;
        this.body.append(this.buildVoyageClauseRow(clause));
      }
    }

    this.body.append(this.buildVoyageNameField());

    this.body.append(this.hairline());

    // ── The commit ──
    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row voyage-verb-row";
    this.voyageVerbRow = verbRow;
    this.body.append(verbRow);
    const hintEl = document.createElement("div");
    hintEl.className = "study-brief-meta holos-caps";
    this.body.append(hintEl);
    this.voyageCommitRefresh = (): void => this.fillVoyageCommit(verbRow, hintEl, catalog);
    this.voyageCommitRefresh();
  }

  /** The clause groups in the order the catalog sends them, deduplicated —
   *  the server's order is the reading order, and the client never sorts it. */
  private voyageGroupOrder(catalog: VoyageCatalog): readonly VoyageClauseGroupId[] {
    const seen: VoyageClauseGroupId[] = [];
    for (const clause of catalog.clauses) {
      if (!seen.includes(clause.group)) seen.push(clause.group);
    }
    return seen;
  }

  /**
   * One ship, with both of its clocks. The mission sheet's buildKindRow
   * anatomy plus what a founding adds: the prerequisite a sail waits on, and
   * the DEPARTURE LIGHT — the price in visibility, stated plainly, because it
   * is the one cost of this act that is paid by being seen rather than by
   * spending anything.
   */
  private buildVoyageKindRow(
    k: VoyageKindDef,
    target: { readonly distanceLy: number; readonly row: SurveyRow | null },
  ): HTMLButtonElement {
    const blocked = this.voyageProjectBlock(k);
    const selected = this.voyageKind === k.kind;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = blocked !== null
      ? "study-project-row study-project-row--disabled"
      : selected
        ? "study-project-row tend-launch-kind-row--selected"
        : "study-project-row";
    if (blocked !== null) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        this.voyageKind = k.kind;
        this.renderVoyageLaunch();
      });
    }

    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = k.label;
    const line = document.createElement("div");
    line.className = "study-project-line";
    line.textContent = k.line;
    const cost = document.createElement("div");
    cost.className = "study-project-meta holos-caps";
    cost.textContent = `${k.costCompute} COMPUTE · ${k.costClass}`;
    btn.append(label, line, cost);

    // Both clocks, always — the comparison between the three ships is the
    // whole of this step, and a row that only priced the one you had already
    // chosen would be no comparison at all.
    const clocks = this.voyageClocksFor(target, k);
    const landfall = document.createElement("div");
    landfall.className = "voyage-clock holos-caps study-tabular";
    landfall.textContent = `LANDFALL IN ${formatClockPair(clocks.flightYears)}`;
    const firstWord = document.createElement("div");
    firstWord.className = "voyage-clock holos-caps study-tabular";
    firstWord.textContent = `FIRST WORD IN ${formatClockPair(clocks.firstWordYears)}`;
    btn.append(landfall, firstWord);

    const departure = this.departureYearsFor(k, target.distanceLy);
    if (departure !== null) {
      const seen = document.createElement("div");
      seen.className = "voyage-clock voyage-clock--loud holos-caps study-tabular";
      seen.textContent = `SEEN LEAVING FOR ${formatGameYears(departure)}`;
      btn.append(seen);
    }

    if (blocked !== null) {
      const needs = document.createElement("div");
      needs.className = "voyage-clock voyage-clock--loud holos-caps";
      needs.textContent =
        blocked.label === null
          ? "NEEDS A PROJECT THAT HAS NOT LANDED"
          : `NEEDS ${blocked.label}`;
      btn.append(needs);
    }

    return btn;
  }

  /**
   * The forecast panel: how old the news is when the ship arrives, the
   * arrival spread as three bands, how tight that spread is, and whether the
   * sky already shows something at the far end. Every one of them is a prior
   * over PUBLIC facts (the spectral class), and the panel says so.
   */
  private buildVoyageForecast(target: {
    readonly distanceLy: number;
    readonly row: SurveyRow | null;
  }): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "voyage-forecast";

    const header = document.createElement("div");
    header.className = "study-section-header holos-caps";
    header.textContent = "WHAT WE EXPECT TO FIND";
    wrap.append(header);

    const kindDef =
      this.voyageKind === null
        ? undefined
        : this.voyageCatalog?.kinds.find((k) => k.kind === this.voyageKind);
    if (kindDef !== undefined) {
      const clocks = this.voyageClocksFor(target, kindDef);
      const age = document.createElement("div");
      age.className = "voyage-clock holos-caps study-tabular";
      age.textContent = `EVERYTHING WE KNOW WILL BE ${formatGameYears(clocks.infoAgeYears)} OLD AT LANDFALL`;
      wrap.append(age);
    }

    const row = target.row;
    if (row === null) {
      // Off the survey: the distance and the clocks are honest arithmetic on
      // public numbers, and the spread is not, so there is no spread here.
      // An empty panel is the correct rendering of an unsent forecast.
      const none = document.createElement("div");
      none.className = "study-picker-subtitle";
      none.textContent = "This star is outside the survey. Nothing has been read about the world itself.";
      wrap.append(none);
      return wrap;
    }

    for (const prior of row.priors) {
      const bar = document.createElement("div");
      bar.className = "voyage-prior";

      const name = document.createElement("div");
      name.className = "voyage-prior-name holos-caps";
      name.textContent = WORLD_CLASS_LABEL[prior.worldClass];

      const track = document.createElement("div");
      track.className = "voyage-prior-track";
      const fill = document.createElement("div");
      fill.className = "voyage-prior-fill";
      fill.style.width = `${(PRIOR_BAND_FILL[prior.band] * 100).toFixed(0)}%`;
      track.append(fill);

      const band = document.createElement("div");
      band.className = "voyage-prior-band holos-caps";
      band.textContent = PRIOR_BAND_LABEL[prior.band];

      bar.append(name, track, band);
      wrap.append(bar);
    }

    const spread = document.createElement("div");
    spread.className = "voyage-spread";
    const spreadLabel = document.createElement("span");
    spreadLabel.className = "holos-caps";
    spreadLabel.textContent = "HOW TIGHT THIS IS";
    const spreadChip = document.createElement("span");
    spreadChip.className = "tend-badge tend-chip";
    spreadChip.textContent = WIDTH_CHIP_LABEL[row.widthChip];
    spread.append(spreadLabel, spreadChip);
    wrap.append(spread);

    if (row.occupied) {
      const occupied = document.createElement("div");
      occupied.className = "voyage-occupied holos-caps";
      occupied.textContent =
        row.lightAgeYears === null
          ? "SOMETHING IS ALREADY THERE"
          : `SOMETHING IS ALREADY THERE · AS OF ${row.lightAgeYears.toFixed(1)} Y AGO`;
      wrap.append(occupied);
    }

    // The occupied-risk line is the server's sentence and it is STATIC on
    // purpose: a line that varied with what is actually inbound would leak
    // every other player's plans through a panel that costs nothing to open.
    // So it is stated for every row, not only the occupied ones.
    const risk = document.createElement("div");
    risk.className = "voyage-risk";
    risk.textContent = this.voyageCatalog?.occupiedRiskLine ?? "";
    wrap.append(risk);

    return wrap;
  }

  /**
   * The five dials, on the inheritance card's own furniture: the parent's
   * band is the track, the parent's position is the ghost behind the child's,
   * and a notch is one of the catalog's steps. A PIN fixes where the founders
   * start and narrows how far their descendants may reconsider; a loose dial
   * leaves them the whole of the range this civilization itself stands in.
   *
   * Nothing here re-renders. The band moves its own marker and the pin
   * repaints its own button, so a thumb on a dial never has the sheet rebuilt
   * under it.
   */
  private buildVoyageDials(catalog: VoyageCatalog): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "dial-sheet voyage-dials";

    const parent: DialSheet | undefined = this.self?.seed.dials;
    for (const axis of DIAL_AXES) {
      const held = this.voyageDialFor(axis.id);
      const band = parent?.[axis.id];
      const item = document.createElement("div");
      item.className = "voyage-dial-item";

      item.append(
        renderDialBand(
          axis,
          { position: held.position, min: band?.min ?? -1, max: band?.max ?? 1 },
          {
            ghostPosition: band?.position ?? held.position,
            steps: catalog.dialSteps,
            // `held` IS the stored object (voyageDialFor hands the map's own
            // entry back), so moving a dial is one assignment and there is
            // never a second copy of a charter to disagree with.
            onChange: (position) => {
              held.position = position;
            },
          },
        ),
      );

      const pin = document.createElement("button");
      pin.type = "button";
      const paintPin = (): void => {
        pin.className = held.pinned ? "voyage-pin voyage-pin--on holos-caps" : "voyage-pin holos-caps";
        pin.textContent = held.pinned ? "PINNED" : "PIN";
        pin.setAttribute("aria-pressed", held.pinned ? "true" : "false");
      };
      pin.addEventListener("click", () => {
        held.pinned = !held.pinned;
        paintPin();
      });
      paintPin();
      item.append(pin);
      wrap.append(item);
    }

    const hint = document.createElement("p");
    hint.className = "dial-hint";
    hint.textContent = "Drag a dial to aim it. Pin one to hold it there.";
    wrap.append(hint);

    return wrap;
  }

  /** One charter clause. The mission sheet's clause row exactly, on the
   *  founding's own vocabulary. */
  private buildVoyageClauseRow(c: VoyageClauseDef): HTMLButtonElement {
    const selected = this.voyageClauses.has(c.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected
      ? "tend-launch-clause-row tend-launch-clause-row--selected"
      : "tend-launch-clause-row";
    btn.addEventListener("click", () => this.toggleVoyageClause(c));

    const label = document.createElement("span");
    label.className = "study-hyp-label holos-caps";
    label.textContent = c.label;
    const line = document.createElement("span");
    line.className = "study-hyp-gloss";
    line.textContent = c.line;
    btn.append(label, line);
    return btn;
  }

  /** Tap toggles; at most one clause per group (client-side enforcement —
   *  voyages.ts's validateVoyageCharter re-checks server-side regardless). */
  private toggleVoyageClause(c: VoyageClauseDef): void {
    const catalog = this.voyageCatalog;
    if (catalog === null) return;
    const next = new Set(this.voyageClauses);
    if (next.has(c.id)) {
      next.delete(c.id);
    } else {
      for (const other of [...next]) {
        const def = catalog.clauses.find((cc) => cc.id === other);
        if (def !== undefined && def.group === c.group) next.delete(other);
      }
      next.add(c.id);
    }
    this.voyageClauses = next;
    this.renderVoyageLaunch();
  }

  /** The colony's name — the ONE piece of free text a founding carries, on
   *  the ceremony's own field. Typing never re-renders the sheet (the field
   *  would lose the caret); it updates the commit control in place, which is
   *  the only thing the name decides. */
  private buildVoyageNameField(): HTMLDivElement {
    const field = document.createElement("div");
    field.className = "name-field voyage-name-field";

    const caption = document.createElement("div");
    caption.className = "holos-caps";
    caption.textContent = "What they will call themselves";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = MAX_NAME_LEN * 2; // raw typing; validateName trims/collapses
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = this.voyageName;

    const hint = document.createElement("div");
    hint.className = "name-hint";

    input.addEventListener("input", () => {
      this.voyageName = input.value;
      const typed = input.value.trim();
      if (typed.length > 0 && validateName(input.value) === null) {
        hint.textContent = `Name must be 1 to ${MAX_NAME_LEN} characters.`;
        hint.classList.add("visible");
      } else {
        hint.textContent = "";
        hint.classList.remove("visible");
      }
      this.refreshVoyageCommit();
    });

    field.append(caption, input, hint);
    return field;
  }

  /**
   * The commit control, rebuilt in place. A SEEDSHIP IS AN INVESTMENT AND
   * COMMITS ON A TAP; a torch and a sail are Endeavors and commit on a HOLD,
   * the choice ceremony's rule sized to a sheet — an act nobody can recall,
   * amend past the horizon or take back is made by holding, not by tapping.
   * The cost is named on the control either way: nothing here spends without
   * saying the number first.
   */
  private fillVoyageCommit(
    verbRow: HTMLDivElement,
    hintEl: HTMLDivElement,
    catalog: VoyageCatalog,
  ): void {
    verbRow.innerHTML = "";
    hintEl.textContent = "";

    const starId = this.voyageStarId;
    const kindDef =
      this.voyageKind === null
        ? undefined
        : catalog.kinds.find((k) => k.kind === this.voyageKind);
    const count = this.voyageClauses.size;
    const groups = new Set<VoyageClauseGroupId>();
    for (const id of this.voyageClauses) {
      const def = catalog.clauses.find((c) => c.id === id);
      if (def !== undefined) groups.add(def.group);
    }
    const requiredMet = REQUIRED_VOYAGE_GROUPS.every((g) => groups.has(g));
    const validCount = count >= catalog.minClauses && count <= catalog.maxClauses;
    const named = validateName(this.voyageName) !== null;
    const free = this.currentFreeCompute();
    const blocked = kindDef === undefined ? null : this.voyageProjectBlock(kindDef);
    const affordable = kindDef !== undefined && free >= kindDef.costCompute;
    const pending = this.pendingVoyageStarId !== null && this.pendingVoyageStarId === starId;
    // ENDEAVOR MEANS CEREMONY (economy-design.md): an Investment commits on a
    // tap, and everything above it is held.
    const holds =
      kindDef !== undefined && (kindDef.costClass === "endeavor" || kindDef.costClass === "epochal");

    const btn = document.createElement("button");
    btn.type = "button";

    if (pending) {
      btn.className = "study-verb-btn study-verb-btn--primary";
      btn.disabled = true;
      btn.textContent = "LAUNCHING…";
      verbRow.append(btn);
      return;
    }
    if (kindDef === undefined) {
      btn.className = "study-verb-btn study-verb-btn--primary";
      btn.disabled = true;
      btn.textContent = "LAUNCH";
      hintEl.textContent = "CHOOSE A SHIP";
      verbRow.append(btn);
      return;
    }
    if (blocked !== null || !requiredMet || !validCount || !named || !affordable) {
      btn.className = "study-verb-btn study-verb-btn--primary";
      btn.disabled = true;
      btn.textContent = `LAUNCH · ${kindDef.costCompute} COMPUTE`;
      hintEl.textContent =
        blocked !== null
          ? "THAT SHIP CANNOT LEAVE YET"
          : !requiredMet
            ? "ANSWER BOTH REQUIRED QUESTIONS"
            : !validCount
              ? `PICK ${catalog.minClauses} TO ${catalog.maxClauses} CLAUSES`
              : !named
                ? "NAME THEM"
                : `${Math.ceil(kindDef.costCompute - free)} SHORT`;
      verbRow.append(btn);
      return;
    }

    if (!holds) {
      btn.className = "study-verb-btn study-verb-btn--primary";
      btn.textContent = `LAUNCH · ${kindDef.costCompute} COMPUTE`;
      btn.addEventListener("click", () => this.commitVoyage(false));
      verbRow.append(btn);
      return;
    }

    // THE HOLD. The fill is the press itself, drawn inside the pill; there is
    // no click handler on this button and there deliberately cannot be one.
    btn.className = "study-verb-btn study-verb-btn--primary voyage-hold";
    const fill = document.createElement("div");
    fill.className = "voyage-hold-fill";
    const label = document.createElement("span");
    label.className = "voyage-hold-label";
    label.textContent = `HOLD TO LAUNCH · ${kindDef.costCompute} COMPUTE`;
    btn.append(fill, label);
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      this.beginVoyageHold(fill);
    });
    btn.addEventListener("pointerup", () => this.cancelVoyageHold());
    btn.addEventListener("pointercancel", () => this.cancelVoyageHold());
    // Desktop's thumb: a held Space or Enter presses, and the keyup decides
    // by the same rule a lifted finger does (contactceremony.ts's pairing).
    btn.addEventListener("keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (e.repeat) return;
      this.beginVoyageHold(fill);
    });
    btn.addEventListener("keyup", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      this.cancelVoyageHold();
    });
    verbRow.append(btn);
  }

  /** The 1s ticker's founding-sheet branch, and the name field's own
   *  listener: recompute the control without touching the rest of the sheet.
   *  Never while a press is live or a commit is in flight — rebuilding the
   *  button then would take the gesture out from under the thumb. */
  private refreshVoyageCommit(): void {
    if (this.view !== "voyage") return;
    // A live press, or a commit whose bloom is still playing in this very
    // row: either one is a gesture in progress, and rebuilding the control
    // under it would take it away mid-act.
    if (this.voyageHold !== null || this.pendingVoyageStarId !== null) return;
    this.voyageCommitRefresh?.();
  }

  private beginVoyageHold(fill: HTMLDivElement): void {
    if (this.voyageHold !== null || this.pendingVoyageStarId !== null) return;
    const hold = { fill, start: performance.now(), raf: 0 };
    this.voyageHold = hold;
    const step = (): void => {
      if (this.voyageHold !== hold) return;
      const t = clamp01((performance.now() - hold.start) / VOYAGE_HOLD_MS);
      fill.style.width = `${(t * 100).toFixed(2)}%`;
      if (t >= 1) {
        this.completeVoyageHold();
        return;
      }
      hold.raf = requestAnimationFrame(step);
    };
    hold.raf = requestAnimationFrame(step);
  }

  /** An early release. The fill drains where it stands and says nothing —
   *  a cancel is silent, and the control stays exactly as armed as it was. */
  private cancelVoyageHold(): void {
    const hold = this.voyageHold;
    if (hold === null) return;
    cancelAnimationFrame(hold.raf);
    this.voyageHold = null;
    hold.fill.style.width = "0%";
  }

  /**
   * THE ONLY PLACE A HOLD BECOMES AN ACT. Reached from one caller — the frame
   * loop above, and only once a live press started by `beginVoyageHold` has
   * run the full VOYAGE_HOLD_MS of wall clock. There is no argument, no
   * public method and no timer that lands here.
   */
  private completeVoyageHold(): void {
    const hold = this.voyageHold;
    if (hold === null) return;
    cancelAnimationFrame(hold.raf);
    this.voyageHold = null;
    hold.fill.style.width = "100%";
    this.commitVoyage(true);
  }

  /**
   * Sends the founding. The charter goes out exactly as it was written: the
   * clauses by id, the five dials with their positions and pins, and the one
   * name. Nothing is optimistically drawn — the confirming sky carries the
   * voyage, and the work list is where it lands.
   */
  private commitVoyage(withBloom: boolean): void {
    const starId = this.voyageStarId;
    const kind = this.voyageKind;
    if (starId === null || kind === null) return;
    if (this.pendingVoyageStarId !== null) return;
    const name = validateName(this.voyageName);
    if (name === null) return; // guarded by the disabled control; defensive only

    this.pendingVoyageStarId = starId;
    this.pendingVoyagePriorIds = new Set(this.voyages.map((v) => v.id));
    this.voyageBloomDone = !withBloom;
    this.socket.send({
      type: "launchVoyage",
      starId,
      kind,
      charter: [...this.voyageClauses],
      dials: DIAL_AXES.map((axis) => {
        const dial = this.voyageDialFor(axis.id);
        return { axis: axis.id, position: dial.position, pinned: dial.pinned };
      }),
      name,
    });
    this.voyageCommitRefresh?.();

    if (withBloom) {
      // The commit beat, reused wholesale from BECOME. The handoff to the
      // work list waits on it (maybeHandoffVoyage): a hold that ends in a
      // jump cut reads as a glitch rather than as a thing having happened.
      const bloom = document.createElement("div");
      bloom.className = "voyage-bloom";
      this.voyageVerbRow?.append(bloom);
      window.setTimeout(() => {
        this.voyageBloomDone = true;
        this.maybeHandoffVoyage();
      }, VOYAGE_COMMIT_MS);
    }
  }

  /** The launch's landing: the work list, scrolled to the row the founding
   *  now has. Fires when BOTH the confirming sky and the commit beat are
   *  done, in whichever order they finish. */
  private maybeHandoffVoyage(): void {
    const id = this.launchedVoyageId;
    if (id === null || !this.voyageBloomDone) return;
    this.launchedVoyageId = null;
    this.voyageStarId = null;
    this.highlightVoyageId = id;
    this.openTend();
  }

  /** A report entry's `voyage` route, and the launch handoff: the work list,
   *  scrolled to that founding's row. A voyage is keyed by id and never by
   *  star, for the mission route's reason — the undertaking outlives what it
   *  was aimed at. */
  private focusVoyageRow(voyageId: string): void {
    this.highlightVoyageId = voyageId;
    this.openTend();
  }

  // ── Render: THE LEDGER and the standing order (A4, the aftermath) ────
  //
  // What became of the foundings. Four rules run through every line of this
  // block, and they are the reason it renders so little:
  //
  //  • NO CYAN. A child is not you. It carries this civilization's charter
  //    and this civilization's name for it, and it has been out of reach
  //    since the year it was written; everything here is old light, so it is
  //    amber and ink like the rest of the sheet.
  //  • NOTHING CLAIMS WHAT THE WIRE DID NOT SEND. Bands render as WORDS with
  //    the size of the sample beside them, never as a number or a bar. There
  //    is no predicted reply anywhere — `nextExchangeYear` is the player's
  //    OWN next arrival and is labelled as such — and no drift figure, because
  //    a disagreement is a fact and a distance would be a measurement nobody
  //    took.
  //  • NO CHORE SURFACE. No unread mark, no count, no freshness bar. The AS OF
  //    chip renders as NOTHING when the wire sends null: before anything has
  //    come back there is no reading to date, and a zero would be a claim.
  //  • ONE VERB PER SURFACE. The hub row's verb is the record; the record's
  //    verb is the thread. The mute is stated on both and toggled on neither
  //    (THE VOICE's muted row already owns the undo).

  /** What a founding is called here: the name its founders were told to use,
   *  and the instruments' designation when the record carries no name. */
  private forkName(row: LedgerRow): string {
    return row.childName.length > 0 ? row.childName : row.designation;
  }

  /** What a star is called here. `threadName`'s three-step fallback (the
   *  player's own label, the designation their instruments assigned, then the
   *  bare id), named for the star rather than for a conversation — a fired
   *  order names a source there is no thread with. */
  private starLabel(starId: string): string {
    return this.threadName(starId);
  }

  /** The staleness chip, off the newest reading. NULL RENDERS AS NOTHING:
   *  the row simply has no chip until something has come back. */
  private ledgerAsOfText(lightAgeYears: number | null): string | null {
    if (lightAgeYears === null) return null;
    return `AS OF ${formatArchiveAge(lightAgeYears)} Y AGO`;
  }

  /** The band, as a word, with the size of the sample it rests on. The sample
   *  line is the one number the band is allowed: it says how much has been
   *  read, not how far anything has moved. `unread` has no sample to state. */
  private ledgerBandSampleText(row: LedgerRow): string | null {
    if (row.observedAxes === 0) return null;
    return `READ ON ${row.observedAxes} OF ${DIAL_AXES.length}`;
  }

  /**
   * One founding on the hub. The name, where it stands, the band as a word,
   * the staleness chip when there is one, and where the conversation stands.
   * The whole row is the verb (it opens the record) — there is no second
   * control on it, and no badge that would make it a thing to clear.
   */
  private buildLedgerRow(row: LedgerRow): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ledger-row";
    btn.addEventListener("click", () => this.focusFork(row.voyageId, "hub"));

    const top = document.createElement("div");
    top.className = "ledger-row-top";

    const name = document.createElement("div");
    name.className = "ledger-name holos-serif";
    name.textContent = this.forkName(row);
    top.append(name);

    const marks = document.createElement("div");
    marks.className = "ledger-marks";
    const state = document.createElement("div");
    state.className = "tend-badge ledger-state-badge";
    state.textContent = LEDGER_STATE_LABEL[row.state];
    marks.append(state);
    // A muted child keeps its row and says so. Nothing is notified anywhere,
    // and the mute is undone from THE VOICE's own list, not from here.
    if (row.muted) {
      const muted = document.createElement("div");
      muted.className = "tend-badge ledger-muted-badge";
      muted.textContent = "MUTED";
      marks.append(muted);
    }
    top.append(marks);
    btn.append(top);

    const bandRow = document.createElement("div");
    bandRow.className = "ledger-band-row";
    const band = document.createElement("div");
    band.className = `tend-badge ledger-band-badge ledger-band-badge--${row.band}`;
    band.textContent = DRIFT_BAND_LABEL[row.band];
    bandRow.append(band);
    const sample = this.ledgerBandSampleText(row);
    if (sample !== null) {
      const sampleEl = document.createElement("div");
      sampleEl.className = "ledger-sample holos-caps";
      sampleEl.textContent = sample;
      bandRow.append(sampleEl);
    }
    btn.append(bandRow);

    const meta = document.createElement("div");
    meta.className = "ledger-row-meta holos-caps study-tabular";
    const asOf = this.ledgerAsOfText(row.lightAgeYears);
    meta.textContent = asOf === null
      ? LINEAGE_THREAD_LABEL[row.thread]
      : `${asOf} · ${LINEAGE_THREAD_LABEL[row.thread]}`;
    btn.append(meta);

    return btn;
  }

  /** THE FORK: one founding's whole record. Opened by a Ledger row or by a
   *  report entry's `ledger` route, which is keyed on the voyage for the row's
   *  own reason — a child outlives every source it was ever visible as. */
  private focusFork(voyageId: string, from: "hub" | "report"): void {
    this.view = "fork";
    this.forkVoyageId = voyageId;
    this.forkReturn = from;
    this.renderFork();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  private renderFork(): void {
    const voyageId = this.forkVoyageId;
    const row = voyageId === null ? undefined : this.ledgerRowsById.get(voyageId);
    this.body.innerHTML = "";
    if (voyageId === null || row === undefined) {
      // The row vanished between the tap and this render — see update().
      this.view = "hub";
      this.forkVoyageId = null;
      this.renderHub();
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => {
      if (this.forkReturn === "report") this.openReport();
      else this.openHub();
    });
    this.body.append(back);

    // The launch sheet's header anatomy: the instruments' designation quiet
    // above the name, and only when the two are different — a record that
    // carries no name of its own says the designation once.
    const header = document.createElement("div");
    header.className = "study-focus-header";
    if (row.childName.length > 0) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = row.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = this.forkName(row);
    header.append(nameEl);
    this.body.append(header);

    const meta = document.createElement("div");
    meta.className = "holos-caps";
    const metaParts = [
      `${row.distanceLy.toFixed(1)} LY`,
      LEDGER_STATE_LABEL[row.state],
    ];
    if (row.muted) metaParts.push("MUTED");
    meta.textContent = metaParts.join(" · ");
    this.body.append(meta);

    this.body.append(this.hairline());

    // ── The charter, as written ──
    // Server prose, verbatim and textContent-only. It is the same charter it
    // always was: the record renders what was sent and never a paraphrase.
    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = "THE CHARTER AS WRITTEN";
    this.body.append(charterHeader);

    const charterLine = document.createElement("div");
    charterLine.className = "ledger-charter";
    charterLine.textContent = row.charterLine;
    this.body.append(charterLine);

    this.body.append(this.hairline());

    // ── The dates ──
    // Absolute once they have passed, a clock pair while they are still
    // running down (the mission detail's own trio). A founding's year is
    // arithmetic on the launch; the confirmation is the year word of it could
    // first reach here, and neither is a claim about what actually happened.
    const now = nowYear();
    this.body.append(this.buildClockRow("LAUNCHED", formatAbsoluteYear(row.launchedYear)));
    this.body.append(
      now < row.foundingYear
        ? this.buildClockRow(
            "FOUNDED",
            formatCountdown(row.foundingYear) ?? formatAbsoluteYear(row.foundingYear),
          )
        : this.buildClockRow("FOUNDED", formatAbsoluteYear(row.foundingYear)),
    );
    this.body.append(
      now < row.confirmYear
        ? this.buildClockRow(
            "CONFIRMED",
            formatCountdown(row.confirmYear) ?? formatAbsoluteYear(row.confirmYear),
          )
        : this.buildClockRow("CONFIRMED", formatAbsoluteYear(row.confirmYear)),
    );
    if (row.darkSinceYear !== null) {
      this.body.append(this.buildClockRow("DARK SINCE", formatAbsoluteYear(row.darkSinceYear)));
    }

    this.body.append(this.hairline());

    // ── What has come back ──
    const readHeader = document.createElement("div");
    readHeader.className = "study-section-header holos-caps";
    readHeader.textContent = "WHAT HAS COME BACK";
    this.body.append(readHeader);

    const bandRow = document.createElement("div");
    bandRow.className = "ledger-band-row";
    const band = document.createElement("div");
    band.className = `tend-badge ledger-band-badge ledger-band-badge--${row.band}`;
    band.textContent = DRIFT_BAND_LABEL[row.band];
    bandRow.append(band);
    const sample = this.ledgerBandSampleText(row);
    if (sample !== null) {
      const sampleEl = document.createElement("div");
      sampleEl.className = "ledger-sample holos-caps";
      sampleEl.textContent = sample;
      bandRow.append(sampleEl);
    }
    this.body.append(bandRow);

    // The band's own sentence, from the server's bank — the client renders no
    // drift prose of its own.
    const bandLine = document.createElement("div");
    bandLine.className = "ledger-band-line";
    bandLine.textContent = row.bandLine;
    this.body.append(bandLine);

    // The band's history: when this band was first entered, and — separately,
    // because it is latched and cannot be taken back by a better sample later
    // — the year independence was first read.
    if (row.bandSinceYear !== null) {
      this.body.append(
        this.buildClockRow(
          `${DRIFT_BAND_LABEL[row.band]} SINCE`,
          formatAbsoluteYear(row.bandSinceYear),
        ),
      );
    }
    if (row.independentSinceYear !== null && row.band !== "independent") {
      this.body.append(
        this.buildClockRow("INDEPENDENT SINCE", formatAbsoluteYear(row.independentSinceYear)),
      );
    }

    for (const reading of row.readings) {
      this.body.append(this.buildDriftReading(reading));
    }

    this.body.append(this.hairline());

    // ── The thread ──
    const threadHeader = document.createElement("div");
    threadHeader.className = "study-section-header holos-caps";
    threadHeader.textContent = "THE THREAD";
    this.body.append(threadHeader);

    this.body.append(
      this.buildClockRow("WHERE IT STANDS", LINEAGE_THREAD_LABEL[row.thread]),
    );
    if (row.lastExchangeYear !== null) {
      this.body.append(
        this.buildClockRow("LAST EXCHANGE", formatAbsoluteYear(row.lastExchangeYear)),
      );
    }
    // YOUR OWN NEXT ARRIVAL, said as your own. There is no reply on this wire
    // and there is nothing here that could render one.
    if (row.nextExchangeYear !== null) {
      this.body.append(
        this.buildClockRow(
          "YOURS ARRIVES",
          formatCountdown(row.nextExchangeYear) ?? formatAbsoluteYear(row.nextExchangeYear),
        ),
      );
    }

    // The one verb this surface has. Offered only where a thread actually
    // exists on this side of the light: a muted child has left the rack, and
    // a child nobody has spoken to has no thread to open.
    const hasThread = (this.contact?.threads ?? []).some((t) => t.starId === row.starId);
    if (hasThread) {
      const verbRow = document.createElement("div");
      verbRow.className = "study-verb-row";
      const verb = document.createElement("button");
      verb.type = "button";
      verb.className = "study-verb-btn";
      verb.textContent = "OPEN THE THREAD";
      verb.addEventListener("click", () => this.openThread(row.starId));
      verbRow.append(verb);
      this.body.append(verbRow);
    }
  }

  /**
   * One dial axis the parent has actually read something about: the dial's own
   * question, what the charter wrote against what has been read, whether they
   * agree, which channel carried it, and how old THAT reading is. Every
   * reading carries its own date — a light reading is the crossing old, a
   * stated one is as old as the year it was sent.
   */
  private buildDriftReading(r: DriftReading): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "ledger-reading";

    const question = document.createElement("div");
    question.className = "ledger-reading-question";
    question.textContent = r.question;
    row.append(question);

    // The label/value anatomy the mission sheet's clock rows already own: two
    // readings of one axis, stacked so the disagreement is read down a column.
    row.append(this.buildClockRow("THE CHARTER", r.charterPole));
    row.append(this.buildClockRow("WHAT CAME BACK", r.readPole));

    const marks = document.createElement("div");
    marks.className = "ledger-marks ledger-reading-marks";
    const verdict = document.createElement("div");
    verdict.className = r.agrees
      ? "tend-badge ledger-verdict-badge"
      : "tend-badge ledger-verdict-badge ledger-verdict-badge--parted";
    verdict.textContent = DRIFT_AGREE_LABEL[r.agrees ? "agrees" : "disagrees"];
    marks.append(verdict);
    const via = document.createElement("div");
    via.className = "tend-badge tend-chip";
    via.textContent = DRIFT_VIA_LABEL[r.via];
    marks.append(via);
    row.append(marks);

    const age = document.createElement("div");
    age.className = "study-archive-age holos-caps study-tabular";
    age.textContent = `AS OF ${formatArchiveAge(r.lightAgeYears)} Y AGO`;
    row.append(age);

    return row;
  }

  // ── The standing order ───────────────────────────────────────────────
  //
  // ARMING IS THE CONSENT AND THE CHARTER IS ITS CONTENT. The sheet asks for
  // both in one gesture, and the sentinel's charter is written on the launch
  // sheet's own clause rows, because it IS a launch: what is being authorized
  // is a specific dispatch, not a blank one. The order names no star and could
  // not — what it will find has not happened yet.

  /** The arming sheet. Always opens clean on an order that is not already
   *  armed (the launch sheet's rule); an armed order's own charter is what
   *  the sheet reads back, so there is nothing half-written to preserve. */
  openOrders(): void {
    this.view = "orders";
    this.focusedStarId = null;
    this.orderCharter = new Set();
    this.renderOrders();
    this.openFlag = true;
    this.root.classList.add("open");
    this.startTicking();
  }

  private renderOrders(): void {
    this.body.innerHTML = "";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ BACK";
    back.addEventListener("click", () => this.openHub());
    this.body.append(back);

    const header = document.createElement("div");
    header.className = "study-board-header holos-caps";
    header.textContent = "STANDING ORDERS";
    this.body.append(header);

    const subtitle = document.createElement("div");
    subtitle.className = "study-picker-subtitle";
    subtitle.textContent =
      "What the mind may send while nobody is watching. One order, one firing, and a fresh hand to arm it again.";
    this.body.append(subtitle);

    this.body.append(this.hairline());

    for (const order of this.ledger.orders) {
      this.body.append(this.buildOrderBlock(order));
    }
  }

  /** One order class, in whatever state the wire says it is in. The catalog is
   *  the bound on what may be armed and the wire carries the whole of it, so
   *  this renders the server's own label and line and never a class of its
   *  own invention. */
  private buildOrderBlock(order: StandingOrderWire): HTMLDivElement {
    const block = document.createElement("div");
    block.className = "ledger-order";

    const top = document.createElement("div");
    top.className = "ledger-row-top";
    const label = document.createElement("div");
    label.className = "study-project-label holos-serif";
    label.textContent = order.label;
    top.append(label);
    const state = document.createElement("div");
    state.className = `tend-badge ledger-order-badge ledger-order-badge--${order.state}`;
    state.textContent =
      this.pendingOrderClass === order.orderClass ? "…" : ORDER_STATE_LABEL[order.state];
    top.append(state);
    block.append(top);

    // The order as written, from the server. The condition is in this sentence
    // and nowhere else: there is no threshold on this wire and no number here
    // that a client could send back.
    const line = document.createElement("div");
    line.className = "study-project-line";
    line.textContent = order.line;
    block.append(line);

    // THE PRICE, NAMED PLAINLY AND NAMED AS WHAT IT IS: a fire is priced at
    // the moment it fires, not now, and a fire that cannot be paid for never
    // becomes a debt — it fizzles and the record says so.
    const price = document.createElement("div");
    price.className = "study-project-meta holos-caps";
    price.textContent = `${order.costCompute} COMPUTE AT FIRE TIME · WITHIN ${order.radiusLy} LY`;
    block.append(price);

    if (order.state === "armed" && order.armedYear !== null) {
      block.append(this.buildClockRow("ARMED", formatAbsoluteYear(order.armedYear)));
    }

    // ── The fired record ──
    // Outcome, target and the age of the light it acted on, frozen with the
    // firing. The evidence does not get older in the record: the order acted
    // on what it had.
    if (order.state === "fired") {
      const historyHeader = document.createElement("div");
      historyHeader.className = "study-section-header holos-caps";
      historyHeader.textContent = "WHAT IT DID";
      block.append(historyHeader);

      if (order.outcome !== null) {
        block.append(this.buildClockRow("OUTCOME", ORDER_OUTCOME_LABEL[order.outcome]));
      }
      if (order.firedStarId !== null) {
        block.append(this.buildClockRow("TOWARD", this.starLabel(order.firedStarId)));
      }
      if (order.firedYear !== null) {
        block.append(this.buildClockRow("FIRED", formatAbsoluteYear(order.firedYear)));
      }
      if (order.evidenceAgeYears !== null) {
        block.append(
          this.buildClockRow(
            "ON LIGHT",
            `${formatArchiveAge(order.evidenceAgeYears)} Y OLD`,
          ),
        );
      }
    }

    // ── The charter ──
    // Armed: what it will launch under, read back from the wire. Otherwise the
    // picker, on the launch sheet's own clause rows.
    const charterHeader = document.createElement("div");
    charterHeader.className = "study-section-header holos-caps";
    charterHeader.textContent = order.state === "armed" ? "ITS CHARTER" : "WRITE THE CHARTER";
    block.append(charterHeader);

    const catalog = this.missionCatalog;
    if (catalog === null) {
      const hint = document.createElement("div");
      hint.className = "study-picker-subtitle";
      hint.textContent = "Nothing is available to arm from here.";
      block.append(hint);
      return block;
    }

    if (order.state === "armed") {
      const list = document.createElement("div");
      list.className = "study-brief-menu";
      for (const id of order.charter) {
        const def = catalog.clauses.find((c) => c.id === id);
        if (def === undefined) continue;
        const item = document.createElement("div");
        item.className = "study-hyp-labelcol study-brief-reading";
        const clauseLabel = document.createElement("span");
        clauseLabel.className = "study-hyp-label holos-caps";
        clauseLabel.textContent = def.label;
        const clauseLine = document.createElement("span");
        clauseLine.className = "study-hyp-gloss";
        clauseLine.textContent = def.line;
        item.append(clauseLabel, clauseLine);
        list.append(item);
      }
      block.append(list);
    } else {
      for (const clause of catalog.clauses) {
        if (!clause.appliesTo.includes("sentinel")) continue;
        block.append(this.buildOrderClauseRow(clause));
      }
    }

    // ── The verb ──
    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verb = document.createElement("button");
    verb.type = "button";
    verb.className = "study-verb-btn study-verb-btn--primary";
    const pending = this.pendingOrderClass === order.orderClass;
    let hint = "";

    if (order.state === "armed") {
      verb.textContent = "DISARM";
      if (pending) verb.disabled = true;
      else verb.addEventListener("click", () => this.disarmOrder(order.orderClass));
    } else {
      // Re-arming a spent order is a FRESH, PRESENT ACT: it replaces the
      // previous arming whole, which is why a fired order offers the picker
      // again rather than a repeat button.
      verb.textContent = order.state === "fired" ? "ARM IT AGAIN" : "ARM";
      const count = this.orderCharter.size;
      const validCount = count >= catalog.minClauses && count <= catalog.maxClauses;
      if (pending) {
        verb.disabled = true;
      } else if (!validCount) {
        verb.disabled = true;
        hint = "PICK TWO OR THREE";
      } else {
        verb.addEventListener("click", () => this.armOrder(order.orderClass));
      }
    }
    verbRow.append(verb);
    block.append(verbRow);

    if (hint.length > 0) {
      const hintEl = document.createElement("div");
      hintEl.className = "study-brief-meta holos-caps";
      hintEl.textContent = hint;
      block.append(hintEl);
    }

    return block;
  }

  /** One clause on the arming sheet. The launch sheet's clause row exactly,
   *  on its own selection set — the sentinel's charter is a charter, and it is
   *  written the same way every other charter in the game is. */
  private buildOrderClauseRow(c: CharterClauseDef): HTMLButtonElement {
    const selected = this.orderCharter.has(c.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected
      ? "tend-launch-clause-row tend-launch-clause-row--selected"
      : "tend-launch-clause-row";
    btn.addEventListener("click", () => this.toggleOrderClause(c));

    const label = document.createElement("span");
    label.className = "study-hyp-label holos-caps";
    label.textContent = c.label;
    const line = document.createElement("span");
    line.className = "study-hyp-gloss";
    line.textContent = c.line;
    btn.append(label, line);
    return btn;
  }

  /** Tap toggles; at most one clause per group (client-side enforcement —
   *  missions.ts's validateCharter re-checks server-side regardless, on the
   *  same call the arm handler makes). */
  private toggleOrderClause(c: CharterClauseDef): void {
    const catalog = this.missionCatalog;
    if (catalog === null) return;
    const next = new Set(this.orderCharter);
    if (next.has(c.id)) {
      next.delete(c.id);
    } else {
      for (const other of [...next]) {
        const def = catalog.clauses.find((cc) => cc.id === other);
        if (def !== undefined && def.group === c.group) next.delete(other);
      }
      next.add(c.id);
    }
    this.orderCharter = next;
    this.renderOrders();
  }

  private armOrder(orderClass: string): void {
    if (this.pendingOrderClass !== null) return;
    this.pendingOrderClass = orderClass;
    this.socket.send({ type: "armOrder", orderClass, charter: [...this.orderCharter] });
    this.renderOrders();
  }

  private disarmOrder(orderClass: string): void {
    if (this.pendingOrderClass !== null) return;
    this.pendingOrderClass = orderClass;
    this.socket.send({ type: "disarmOrder", orderClass });
    this.renderOrders();
  }

  // ── A2.3: the CALL IT confirm, and tripwires ─────────────────────────

  /** The first tap arms the confirm; the second (this same starId, already
   *  armed) sends `callStudy` and moves into pendingCallStarId instead —
   *  never a hold-to-commit ceremony, just the one extra tap. */
  private onCallItTap(starId: string): void {
    if (this.callConfirmStarId === starId) {
      this.callConfirmStarId = null;
      this.pendingCallStarId = starId;
      this.socket.send({ type: "callStudy", starId });
    } else {
      this.callConfirmStarId = starId;
    }
    this.renderFocused(starId);
  }

  /** Free and instant (design note §5): a tap toggles straight to the
   *  opposite message, no confirm step. "available" and "tripped" both arm
   *  — re-arming a tripped kind is a real request (the server refuses it
   *  only while the condition still holds, "tripwire-unavailable", same
   *  silent release as every other error code). */
  private toggleTripwire(starId: string, kind: TripwireKind, state: "available" | "armed" | "tripped"): void {
    const key = `${starId}:${kind}`;
    if (this.pendingTripwireKeys.has(key)) return;
    this.pendingTripwireKeys.add(key);
    if (state === "armed") {
      this.socket.send({ type: "disarmTripwire", starId, kind });
    } else {
      this.socket.send({ type: "armTripwire", starId, kind });
    }
    this.renderFocused(starId);
  }

  /** One row per tripwire kind, always all three, in wire order. `active`
   *  is false on a closed study — visible, legible, not tappable, the
   *  OPEN QUESTIONS precedent just above it in renderFocused. */
  private buildTripwireRow(
    starId: string,
    tw: { readonly kind: TripwireKind; readonly state: "available" | "armed" | "tripped"; readonly firedYear: number | null },
    active: boolean,
  ): HTMLElement {
    const pending = this.pendingTripwireKeys.has(`${starId}:${tw.kind}`);
    const interactive = active && !pending;

    const row = document.createElement(interactive ? "button" : "div") as HTMLButtonElement | HTMLDivElement;
    if (row instanceof HTMLButtonElement) row.type = "button";
    row.className =
      "study-tripwire-row" + (interactive ? "" : " study-tripwire-row--inert");
    if (interactive) {
      row.addEventListener("click", () => this.toggleTripwire(starId, tw.kind, tw.state));
    }

    const label = document.createElement("div");
    label.className = "study-tripwire-label holos-caps";
    label.textContent = TRIPWIRE_LABEL[tw.kind];

    const badge = document.createElement("div");
    badge.className = `tend-badge study-tripwire-badge study-tripwire-badge--${tw.state}`;
    badge.textContent = pending ? "…" : TRIPWIRE_STATE_LABEL[tw.state];

    row.append(label, badge);
    return row;
  }

  // ── Render: focused view ─────────────────────────────────────────────

  private renderFocused(starId: string): void {
    const s = this.studiesByStarId.get(starId);
    const source = s === undefined ? undefined : this.sourcesByStarId.get(starId);
    this.body.innerHTML = "";
    if (s === undefined || source === undefined) return; // defensive; see update()

    const back = document.createElement("button");
    back.type = "button";
    back.className = "study-back holos-caps";
    back.textContent = "‹ STUDIES";
    back.addEventListener("click", () => this.openBoard());
    this.body.append(back);

    const leader = leadingHypothesis(s.hypotheses);
    const leaderShare = clamp01(leader?.share ?? 0);
    const smudge = document.createElement("div");
    smudge.className = "study-smudge";
    smudge.style.opacity = (0.3 + leaderShare * 0.6).toFixed(2);
    this.body.append(smudge);

    const header = document.createElement("div");
    header.className = "study-focus-header";
    const localName = this.localNames.get(starId);
    const hasLocalName = localName !== undefined && localName.length > 0;
    if (hasLocalName) {
      const desig = document.createElement("div");
      desig.className = "study-focus-designation holos-caps";
      desig.textContent = source.designation;
      header.append(desig);
    }
    const nameEl = document.createElement("div");
    nameEl.className = "study-focus-name holos-serif";
    nameEl.textContent = hasLocalName ? (localName as string) : source.designation;
    header.append(nameEl);
    this.body.append(header);

    const lightAgeLine = document.createElement("div");
    lightAgeLine.className = "study-focus-lightage";
    lightAgeLine.textContent = `The light you are reading left it ${source.lightAgeYears.toFixed(1)} years ago.`;
    this.body.append(lightAgeLine);

    this.body.append(this.hairline());

    // WHAT IT MIGHT BE
    const hypSection = document.createElement("div");
    hypSection.className = "study-section";
    const hypHeader = document.createElement("div");
    hypHeader.className = "study-section-header holos-caps";
    hypHeader.textContent = "WHAT IT MIGHT BE";
    hypSection.append(hypHeader);

    const pcts = hypothesisPercentages(s.hypotheses);
    const maxShare = s.hypotheses.reduce((m, h) => Math.max(m, h.share), 0);
    for (const h of s.hypotheses) {
      const isLeading = h.share === maxShare;
      const row = document.createElement("div");
      row.className = "study-hyp-row";

      const labelCol = document.createElement("span");
      labelCol.className = "study-hyp-labelcol";
      const label = document.createElement("span");
      label.className = "study-hyp-label holos-caps";
      label.textContent = h.label;
      const gloss = document.createElement("span");
      gloss.className = "study-hyp-gloss";
      gloss.textContent = h.gloss;
      labelCol.append(label, gloss);

      const track = document.createElement("div");
      track.className = "study-hyp-track";
      const sharePct = clamp01(h.share) * 100;
      const fill = document.createElement("div");
      fill.className = isLeading ? "study-hyp-fill study-hyp-fill--leading" : "study-hyp-fill";
      fill.style.width = `${sharePct}%`;
      const glow = document.createElement("div");
      glow.className = isLeading ? "study-hyp-glow study-hyp-glow--leading" : "study-hyp-glow";
      glow.style.left = `${sharePct}%`;
      track.append(fill, glow);

      const pct = document.createElement("span");
      pct.className = "study-hyp-pct study-tabular";
      pct.textContent = `${pcts.get(h.id) ?? Math.round(h.share * 100)}%`;

      row.append(labelCol, track, pct);
      hypSection.append(row);
    }
    this.body.append(hypSection);

    const annotation = document.createElement("div");
    annotation.className = "study-annotation";
    annotation.textContent = s.annotationLine;
    this.body.append(annotation);

    // A2.3: the mind's one sentence about a study that has regressed at
    // least once — banked prose from the server (voice.ts), rendered
    // verbatim. Its own quiet line under the bars, a tier dimmer than
    // annotationLine right above it: annotationLine reads the board, this
    // names a cause an instrument cannot, and the two claims stay apart
    // (protocol.ts's StudySnapshot.contestLine comment).
    if (s.contestLine !== null) {
      const contestLine = document.createElement("div");
      contestLine.className = "study-contest-line";
      contestLine.textContent = s.contestLine;
      this.body.append(contestLine);
    }

    this.body.append(this.hairline());

    // The menu's own wording, read by both the evidence tags below and an
    // expanded question's "what it can tell apart" list.
    const hypothesisLabels = new Map(s.hypotheses.map((h) => [h.id, h.label] as const));

    // WHAT THE LIGHT HAS SHOWN
    const archiveSection = document.createElement("div");
    archiveSection.className = "study-section";
    const archiveHeader = document.createElement("div");
    archiveHeader.className = "study-section-header holos-caps";
    archiveHeader.textContent = "WHAT THE LIGHT HAS SHOWN";
    archiveSection.append(archiveHeader);

    if (s.evidence.length === 0) {
      const empty = document.createElement("div");
      empty.className = "study-archive-empty";
      empty.textContent = "No light in the record yet.";
      archiveSection.append(empty);
    } else {
      const archiveIntro = document.createElement("div");
      archiveIntro.className = "study-focus-lightage";
      archiveIntro.textContent = "Each entry is how long ago the change happened.";
      archiveSection.append(archiveIntro);

      for (const ev of s.evidence) {
        const row = document.createElement("div");
        row.className = "study-archive-row";

        const age = document.createElement("span");
        age.className = "study-archive-age holos-caps";
        age.textContent = `${formatArchiveAge(ev.lightAgeYears)} Y AGO`;

        const text = document.createElement("span");
        text.className = "study-archive-text";
        text.textContent = ev.annotation;

        row.append(age, text);

        if (ev.latest) {
          const newest = document.createElement("span");
          newest.className = "study-archive-newest holos-caps";
          newest.textContent = "THE NEWEST LIGHT WE HAVE";
          row.append(newest);
        }

        if (ev.moved.length > 0) {
          const tags = document.createElement("div");
          tags.className = "study-archive-tags";
          for (const id of ev.moved) {
            const lbl = hypothesisLabels.get(id);
            if (lbl === undefined) continue; // not in this study's menu — skip silently
            const tag = document.createElement("span");
            tag.className = "study-archive-tag holos-caps";
            tag.textContent = lbl;
            tags.append(tag);
          }
          row.append(tags);
        }

        archiveSection.append(row);
      }
    }
    this.body.append(archiveSection);

    // OPEN QUESTIONS — one row per OpenQuestion (questions.ts's catalog for
    // this study's signal class, always non-empty). Offered folds open into
    // its method, what it can tell apart, and the BUY that spends the
    // compute; pending shows a live countdown; answered either
    // points at the evidence entry above (a sharpen finding — studies.ts's
    // mergeEvidence already folded it in under `${starId}/q/${id}`) or, for
    // a plateau finding (never merged into evidence — assembleQuestion
    // returns move: null for a plateau), renders the finding inline.
    const oqSection = document.createElement("div");
    oqSection.className = "study-open-questions";
    const oqHeader = document.createElement("div");
    oqHeader.className = "study-section-header holos-caps";
    oqHeader.textContent = "OPEN QUESTIONS";
    oqSection.append(oqHeader);

    const evidenceIds = new Set(s.evidence.map((e) => e.id));
    // AV3: capture the row a proposal's `question` route asked to be
    // highlighted, so it can be scrolled into view once the whole render
    // (including the verb row below) is on the DOM.
    let highlightedQuestionEl: HTMLElement | null = null;
    const closed = isClosedStudyStatus(s.status);
    for (const q of s.openQuestions) {
      const questionRow = this.buildQuestionRow(
        starId,
        q,
        evidenceIds,
        !closed,
        hypothesisLabels,
      );
      if (this.highlightQuestionId !== null && q.id === this.highlightQuestionId) {
        highlightedQuestionEl = questionRow;
      }
      oqSection.append(questionRow);
    }
    this.body.append(oqSection);

    this.body.append(this.hairline());

    // TRIPWIRES — always all three kinds (protocol.ts's tripwires comment),
    // inert on a closed study exactly as OPEN QUESTIONS already is above:
    // visible so a reopen shows what would resume, never tappable.
    const twSection = document.createElement("div");
    twSection.className = "study-tripwires";
    const twHeader = document.createElement("div");
    twHeader.className = "study-section-header holos-caps";
    twHeader.textContent = "TRIPWIRES";
    twSection.append(twHeader);
    for (const tw of s.tripwires) {
      twSection.append(this.buildTripwireRow(starId, tw, !closed));
    }
    this.body.append(twSection);

    this.body.append(this.hairline());

    // Verb row — reversible, a tap, no confirmation.
    const verbRow = document.createElement("div");
    verbRow.className = "study-verb-row";
    const verbBtn = document.createElement("button");
    verbBtn.type = "button";
    verbBtn.className = "study-verb-btn";
    if (s.status === "open") {
      verbBtn.textContent = "shelve the study";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "shelveStudy", starId });
      });
    } else if (s.status === "shelved") {
      // Grounded/called/overtaken and shelved both reopen through openStudy,
      // but they are not the same act: resuming a shelved vigil picks the
      // watch back up, while reopening a closed one is doubting (or
      // outliving) a verdict that was there. The reopen stamps a new
      // openedYear server-side (and clears called/overtaken — studies.ts's
      // openStudy), so whatever closed this study can never close it again
      // — only the next word can.
      verbBtn.textContent = "resume the watch";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openStudy", starId });
      });
    } else {
      verbBtn.textContent = "reopen the study";
      verbBtn.addEventListener("click", () => {
        this.socket.send({ type: "openStudy", starId });
      });
    }
    verbRow.append(verbBtn);
    this.body.append(verbRow);

    // A2.3: CALL IT — legal from open or shelved (protocol.ts's callStudy
    // comment; a closed study cannot be closed again, "study-unavailable").
    // Two-tap confirm, no hold-to-commit ceremony: the first tap only arms
    // the button, the second actually sends.
    if (s.status === "open" || s.status === "shelved") {
      const callRow = document.createElement("div");
      callRow.className = "study-verb-row";
      const callBtn = document.createElement("button");
      callBtn.type = "button";
      const calling = this.pendingCallStarId === starId;
      const confirming = this.callConfirmStarId === starId;
      if (calling) {
        callBtn.className = "study-verb-btn study-verb-btn--primary";
        callBtn.disabled = true;
        callBtn.textContent = "calling it…";
      } else if (confirming) {
        callBtn.className = "study-verb-btn study-verb-btn--primary study-verb-btn--confirm";
        callBtn.textContent = "tap again to call it";
        callBtn.addEventListener("click", () => this.onCallItTap(starId));
      } else {
        callBtn.className = "study-verb-btn study-verb-btn--primary";
        callBtn.textContent = "call it";
        callBtn.addEventListener("click", () => this.onCallItTap(starId));
      }
      callRow.append(callBtn);
      this.body.append(callRow);
    }

    // AV3: the one-shot scroll for a proposal's `question` route. Cleared
    // BEFORE scheduling so the 1s tick's re-render of this same view (which
    // calls renderFocused again) never re-scrolls the sheet under the
    // player's thumb.
    if (this.highlightQuestionId !== null) {
      this.highlightQuestionId = null;
      if (highlightedQuestionEl !== null) {
        const target = highlightedQuestionEl;
        requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
      }
    }
  }

  // ── Swipe-down to close ─────────────────────────────────────────────

  private attachSwipe(): void {
    this.topbar.addEventListener("pointerdown", this.onDragStart);
    this.topbar.addEventListener("pointermove", this.onDragMove);
    this.topbar.addEventListener("pointerup", this.onDragEnd);
    this.topbar.addEventListener("pointercancel", this.onDragEnd);
  }

  private readonly onDragStart = (e: PointerEvent): void => {
    // The close button shares this bar; leave it a button.
    if (e.target instanceof Element && e.target.closest("button") !== null) return;
    if (!e.isPrimary || this.dragStartY !== null) return;
    this.topbar.setPointerCapture(e.pointerId);
    // The sheet eases its transform over 320ms; while a thumb is driving it
    // the drag must be the only thing moving it.
    this.sheet.classList.add("dragging");
    this.dragStartY = e.clientY;
    this.dragDy = 0;
  };

  private readonly onDragMove = (e: PointerEvent): void => {
    if (this.dragStartY === null) return;
    this.dragDy = Math.max(0, e.clientY - this.dragStartY);
    this.sheet.style.transform = `translateY(${this.dragDy}px)`;
  };

  private readonly onDragEnd = (): void => {
    if (this.dragStartY === null) return;
    const dy = this.dragDy;
    this.dragStartY = null;
    this.dragDy = 0;
    this.sheet.classList.remove("dragging");
    this.sheet.style.transform = "";
    if (dy > SWIPE_CLOSE_PX) this.close();
  };
}
