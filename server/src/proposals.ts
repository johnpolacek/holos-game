// AV3 — the mind proposes. The candidate enumerator (docs/build-voice.md
// § AV3, av3-design.md).
//
// PURE OVER WIRE SNAPSHOTS, REPORT.TS's DISCIPLINE (R-34) EXTENDED. This
// module imports NO truth-side and NO knowledge-layer symbol — not
// `civTruthAt`, `emissionAt`, `occupancyAt`, `peekTruth`, `observeCiv`, not
// `lightConeFor` — and receives no `Galaxy` and no `LightCone`, so it
// physically cannot read truth. Everything it needs is already on the wire
// snapshots `assembleSkyState` returns (cohort.ts), which have passed the
// no-leak boundary once. Structural, grep-checkable on this file's import
// list, exactly as R-34 is for report.ts.
//
// LIVE, NEVER FROZEN — the opposite of the report. report.ts materializes
// entries once and never re-renders them; proposals are re-derived and
// re-rendered on EVERY sky send and stored nowhere except as declines
// (fingerprints). This module therefore reads no clock: it takes no
// `nowYear`, because every time-derived quantity it needs is already
// resolved on a snapshot (ProjectSnapshot.status, OpenQuestion.state /
// costCompute, MissionSnapshot.state, ComputeBudget.free). Nothing in it can
// drift.
//
// NO ARCHETYPE HERE, deliberately — same omission report.ts's
// DeriveReportEntriesInput makes: the floor's prose is archetype-neutral by
// design, and the one archetype-dependent thing on this surface (AV4's
// counsel stance) is applied at serve time by a LATER module, never here.
//
// TWO EXPORTED FUNCTIONS, AND THE SPLIT IS AV4's SEAM. `enumerateProposals`
// is the declined-filtered, priority-ranked, UNCAPPED candidate list — the
// closed set AV4's counsel reasons over. `serveProposals` is the floor's own
// serve step: first-watch exclusivity, the one-starId rule, the cap of 2,
// and rendering PinnedLine → wire string. Banks and PinnedLines never cross
// the wire (report.ts's split, one more time) — `ProposalCandidate.reason`
// and `.fingerprint` stay server-side; only `serveProposals`'s rendered
// `Proposal[]` does.

import type {
  ComputeBudget,
  DetectedSource,
  Hypothesis,
  MissionSnapshot,
  OpenQuestion,
  Proposal,
  ProposalRoute,
  ProjectSnapshot,
  StudySnapshot,
  WorkState,
} from "./protocol";
import { MAX_MISSIONS_PER_TOKEN, MISSION_KINDS, missionProseName } from "./missions";
import { questionById } from "./questions";
import { STUDY_LEAD_MARGIN, STUDY_LEAD_THRESHOLD } from "./studies";
import {
  PROPOSAL_VERBS,
  SIGNAL_CLASS_LABEL,
  reasonFirstWatch,
  reasonProbeExhausted,
  reasonProbePlateau,
  reasonProject,
  reasonQuestion,
  reasonWiden,
  render,
  type PinnedLine,
} from "./voice";

// ---------------------------------------------------------------------------
// Shared input — everything already in scope at cohort.ts's sendSky.
// ---------------------------------------------------------------------------

export interface EnumerateProposalsInput {
  readonly sources: readonly DetectedSource[];
  readonly studies: readonly StudySnapshot[];
  readonly missions: readonly MissionSnapshot[];
  readonly projects: readonly ProjectSnapshot[];
  readonly budget: ComputeBudget;
  readonly localNames: Readonly<Record<string, string>>;
  readonly designations: Readonly<Record<string, string>>;
  /** sky's `probeFlightYearsPerLy` — the launch sheet's own preview input,
   *  so a probe reason quotes the identical clock the sheet it opens will
   *  show (R-35a). */
  readonly probeFlightYearsPerLy: number;
  /** Fingerprints already declined (this module owns none of this state —
   *  cohort.ts loads it and hands in a read-only view). */
  readonly declined: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// The candidate record and the fingerprint.
// ---------------------------------------------------------------------------

export type ProposalKind = "first-watch" | "question" | "probe" | "project" | "widen";

/**
 * Server-side. The wire form (protocol.ts's `Proposal`) is this with the
 * `reason` PinnedLine rendered and the `fingerprint` dropped — banks and
 * PinnedLines never cross the wire.
 */
export interface ProposalCandidate {
  readonly id: string;
  readonly kind: ProposalKind;
  readonly route: ProposalRoute;
  /** Decline key, AV4 counsel-cache key. Never crosses the wire. Plain
   *  colon-joined ASCII, not hashed — short, and readable in `wrangler
   *  tail`. NO FLOAT EVER ENTERS A FINGERPRINT: only ids, catalog ids, and
   *  small integers (av3-design.md §2's table argues each rule's choice). */
  readonly fingerprint: string;
  /** The deadpan reason. `render()` for the wire, `pinnedTokens()` for
   *  AV4's style gate. */
  readonly reason: PinnedLine;
  /** Lower sorts first. Frozen per kind. */
  readonly priority: number;
}

const PRIORITY: Readonly<Record<ProposalKind, number>> = {
  "first-watch": 10,
  probe: 20,
  question: 30,
  project: 40,
  widen: 50,
};

/** The floor's serve cap — two rows read as a choice, three as a to-do list. */
export const MAX_PROPOSALS_ON_WIRE = 2;

// ---------------------------------------------------------------------------
// Storage — `proposals:${token}`. Declined fingerprints only; nothing else
// to anchor (no sinceYear equivalent), so cohort.ts's loader is a PURE read,
// loadVoiceState's idiom, not loadReportState's lazy-create-and-persist.
// ---------------------------------------------------------------------------

export interface ProposalState {
  readonly version: 1;
  /** Declined fingerprints, oldest first. FIFO, capped. */
  readonly declined: readonly string[];
}

export const DECLINE_CAP = 64;

// ---------------------------------------------------------------------------
// Helpers restated locally rather than imported — the source modules do not
// export them (report.ts's `nameFor` precedent).
// ---------------------------------------------------------------------------

/** localNames wins, else the catalog designation, else the raw starId. */
function nameFor(
  starId: string,
  localNames: Readonly<Record<string, string>>,
  designations: Readonly<Record<string, string>>,
): string {
  return localNames[starId] ?? designations[starId] ?? starId;
}

/** The two largest shares, in order (studies.ts's private `topTwo`, restated). */
function topTwo(
  hypotheses: readonly Hypothesis[],
): { readonly lead: Hypothesis | undefined; readonly runnerUp: Hypothesis | undefined } {
  let lead: Hypothesis | undefined;
  let runnerUp: Hypothesis | undefined;
  for (const h of hypotheses) {
    if (lead === undefined || h.share > lead.share) {
      runnerUp = lead;
      lead = h;
    } else if (runnerUp === undefined || h.share > runnerUp.share) {
      runnerUp = h;
    }
  }
  return { lead, runnerUp };
}

/** in-flight | beyond-horizon | awaiting-light | standing (app.ts's
 *  `isLiveMissionState`, restated). */
function isLiveMission(state: WorkState): boolean {
  return (
    state === "in-flight" ||
    state === "beyond-horizon" ||
    state === "awaiting-light" ||
    state === "standing"
  );
}

/** Highest confidence, tiebreak lowest distance, tiebreak starId — rule 1's
 *  and rule 5's shared pick. */
function pickBrightest(sources: readonly DetectedSource[]): DetectedSource | undefined {
  let best: DetectedSource | undefined;
  for (const s of sources) {
    if (best === undefined) {
      best = s;
      continue;
    }
    if (s.signal.confidence !== best.signal.confidence) {
      if (s.signal.confidence > best.signal.confidence) best = s;
      continue;
    }
    if (s.distanceLy !== best.distanceLy) {
      if (s.distanceLy < best.distanceLy) best = s;
      continue;
    }
    if (s.starId < best.starId) best = s;
  }
  return best;
}

/** null for `project` (no starId on that route); the target star otherwise
 *  — serveProposals's one-target rule reads this. */
function routeStarId(route: ProposalRoute): string | null {
  return route.kind === "project" ? null : route.starId;
}

// ---------------------------------------------------------------------------
// Rule 1 — first-watch (priority 10, exclusive at serve time).
// ---------------------------------------------------------------------------

function ruleFirstWatch(input: EnumerateProposalsInput): ProposalCandidate | undefined {
  const { sources, studies, missions, localNames, designations } = input;
  if (studies.length > 0 || missions.length > 0 || sources.length === 0) return undefined;

  const pick = pickBrightest(sources);
  if (pick === undefined) return undefined;

  const name = nameFor(pick.starId, localNames, designations);
  const classLabel = SIGNAL_CLASS_LABEL[pick.signal.classification];
  return {
    id: `first-watch/${pick.starId}`,
    kind: "first-watch",
    route: { kind: "study-brief", starId: pick.starId },
    fingerprint: `fw:${pick.starId}`,
    reason: reasonFirstWatch(name, classLabel, pick.distanceLy, pick.signal.confidence),
    priority: PRIORITY["first-watch"],
  };
}

// ---------------------------------------------------------------------------
// Rule 2 — question (priority 30).
// ---------------------------------------------------------------------------

interface QuestionPair {
  readonly study: StudySnapshot;
  readonly question: OpenQuestion;
  readonly margin: number;
  readonly separatesLeadOrRunnerUp: boolean;
  readonly menuIndex: number;
}

function ruleQuestion(input: EnumerateProposalsInput): ProposalCandidate | undefined {
  const { studies, missions, budget, localNames, designations } = input;
  const pairs: QuestionPair[] = [];

  for (const study of studies) {
    if (study.status !== "open") continue;
    if (missions.some((m) => m.starId === study.starId && isLiveMission(m.state))) continue;

    const { lead, runnerUp } = topTwo(study.hypotheses);
    if (lead === undefined) continue;
    const margin = runnerUp === undefined ? 1 : lead.share - runnerUp.share;

    study.openQuestions.forEach((q, menuIndex) => {
      if (q.state !== "offered" || q.costCompute > budget.free) return;
      const separatesLeadOrRunnerUp =
        q.separates.includes(lead.id) || (runnerUp !== undefined && q.separates.includes(runnerUp.id));
      pairs.push({ study, question: q, margin, separatesLeadOrRunnerUp, menuIndex });
    });
  }
  if (pairs.length === 0) return undefined;

  pairs.sort((a, b) => {
    if (a.margin !== b.margin) return a.margin - b.margin;
    const aBoost = a.separatesLeadOrRunnerUp ? 0 : 1;
    const bBoost = b.separatesLeadOrRunnerUp ? 0 : 1;
    if (aBoost !== bBoost) return aBoost - bBoost;
    if (a.question.costCompute !== b.question.costCompute) {
      return a.question.costCompute - b.question.costCompute;
    }
    if (a.menuIndex !== b.menuIndex) return a.menuIndex - b.menuIndex;
    return a.study.starId.localeCompare(b.study.starId);
  });

  const winner = pairs[0];
  if (winner === undefined) return undefined;
  const { study, question } = winner;
  const def = questionById(question.id);
  if (def === undefined) return undefined; // defensive: the catalog is closed and total

  const { lead, runnerUp } = topTwo(study.hypotheses);
  const name = nameFor(study.starId, localNames, designations);
  return {
    id: `question/${study.starId}/${question.id}`,
    kind: "question",
    route: { kind: "question", starId: study.starId, questionId: question.id },
    fingerprint: `q:${study.starId}:${question.id}:${lead?.id ?? "none"}:${runnerUp?.id ?? "none"}`,
    reason: reasonQuestion(name, def.proseName, question.line, question.costCompute),
    priority: PRIORITY.question,
  };
}

// ---------------------------------------------------------------------------
// Rule 3 — probe (priority 20).
// ---------------------------------------------------------------------------

type ProbeTrigger = "plateau" | "exhausted";

interface ProbePick {
  readonly study: StudySnapshot;
  readonly trigger: ProbeTrigger;
  readonly plateauQuestion: OpenQuestion | undefined;
  readonly distanceLy: number;
}

function ruleProbe(input: EnumerateProposalsInput): ProposalCandidate | undefined {
  const { studies, missions, sources, budget, probeFlightYearsPerLy, localNames, designations } = input;

  const assay = MISSION_KINDS.find((k) => k.kind === "assay");
  if (assay === undefined) return undefined;
  if (missions.length >= MAX_MISSIONS_PER_TOKEN) return undefined;
  if (budget.free < assay.costCompute) return undefined;

  const picks: ProbePick[] = [];
  for (const study of studies) {
    if (study.status !== "open") continue;
    if (missions.some((m) => m.starId === study.starId && isLiveMission(m.state))) continue;
    const source = sources.find((s) => s.starId === study.starId);
    if (source === undefined) continue;

    const plateauQuestion = study.openQuestions.find(
      (q) => q.state === "answered" && q.finding !== null && q.finding.shape === "plateau",
    );
    if (plateauQuestion !== undefined) {
      picks.push({ study, trigger: "plateau", plateauQuestion, distanceLy: source.distanceLy });
      continue;
    }

    const exhausted = study.openQuestions.every((q) => q.state !== "offered");
    if (!exhausted) continue;
    const { lead, runnerUp } = topTwo(study.hypotheses);
    const undecided =
      lead === undefined ||
      lead.share < STUDY_LEAD_THRESHOLD ||
      (runnerUp === undefined ? 1 : lead.share - runnerUp.share) < STUDY_LEAD_MARGIN;
    if (!undecided) continue;
    picks.push({ study, trigger: "exhausted", plateauQuestion: undefined, distanceLy: source.distanceLy });
  }
  if (picks.length === 0) return undefined;

  picks.sort((a, b) => {
    const aRank = a.trigger === "plateau" ? 0 : 1;
    const bRank = b.trigger === "plateau" ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    if (a.distanceLy !== b.distanceLy) return a.distanceLy - b.distanceLy;
    return a.study.starId.localeCompare(b.study.starId);
  });

  const winner = picks[0];
  if (winner === undefined) return undefined;
  const { study, trigger, plateauQuestion, distanceLy } = winner;

  const name = nameFor(study.starId, localNames, designations);
  const missionName = missionProseName("assay");
  const firstWordYears = (probeFlightYearsPerLy + 1) * distanceLy;

  let answeredCount = 0;
  for (const q of study.openQuestions) {
    if (q.state === "answered") answeredCount += 1;
  }
  const leadId = topTwo(study.hypotheses).lead?.id ?? "none";

  const reason =
    trigger === "plateau" && plateauQuestion !== undefined
      ? reasonProbePlateau(
          name,
          questionById(plateauQuestion.id)?.proseName ?? plateauQuestion.label,
          missionName,
          assay.costCompute,
          firstWordYears,
        )
      : reasonProbeExhausted(name, missionName, assay.costCompute, firstWordYears);

  return {
    id: `probe/${study.starId}`,
    kind: "probe",
    route: { kind: "launch", starId: study.starId },
    fingerprint: `pr:${study.starId}:${trigger}:a${answeredCount}:${leadId}`,
    reason,
    priority: PRIORITY.probe,
  };
}

// ---------------------------------------------------------------------------
// Rule 4 — project (priority 40).
// ---------------------------------------------------------------------------

function ruleProject(input: EnumerateProposalsInput): ProposalCandidate | undefined {
  const { projects, budget } = input;
  if (projects.some((p) => p.status === "running")) return undefined;

  const affordable = projects.filter((p) => p.status === "available" && p.costCompute <= budget.free);
  if (affordable.length === 0) return undefined;

  const withIncome = affordable.filter((p) => p.addRatePerYear > 0);
  const pool = withIncome.length > 0 ? withIncome : affordable;

  let pick: ProjectSnapshot | undefined;
  for (const p of pool) {
    if (pick === undefined) {
      pick = p;
      continue;
    }
    if (withIncome.length > 0) {
      const ratio = p.addRatePerYear / p.costCompute;
      const bestRatio = pick.addRatePerYear / pick.costCompute;
      if (ratio !== bestRatio) {
        if (ratio > bestRatio) pick = p;
        continue;
      }
    } else if (p.costCompute !== pick.costCompute) {
      if (p.costCompute < pick.costCompute) pick = p;
      continue;
    }
    if (p.id < pick.id) pick = p;
  }
  if (pick === undefined) return undefined;

  return {
    id: `project/${pick.id}`,
    kind: "project",
    route: { kind: "project", projectId: pick.id },
    fingerprint: `pj:${pick.id}`,
    reason: reasonProject(pick.label, pick.costCompute, pick.durationYears, pick.effectLine),
    priority: PRIORITY.project,
  };
}

// ---------------------------------------------------------------------------
// Rule 5 — widen (priority 50).
// ---------------------------------------------------------------------------

function ruleWiden(input: EnumerateProposalsInput): ProposalCandidate | undefined {
  const { sources, studies, budget, localNames, designations } = input;

  const openCount = studies.filter((s) => s.status === "open").length;
  if (openCount < 1 || openCount >= 3) return undefined;

  const studiedStarIds = new Set(studies.map((s) => s.starId));
  const unstudied = sources.filter((s) => !studiedStarIds.has(s.starId));
  if (unstudied.length === 0) return undefined;

  const anyAffordable = studies.some(
    (s) =>
      s.status === "open" &&
      s.openQuestions.some((q) => q.state === "offered" && q.costCompute <= budget.free),
  );
  if (anyAffordable) return undefined;

  const pick = pickBrightest(unstudied);
  if (pick === undefined) return undefined;

  const name = nameFor(pick.starId, localNames, designations);
  const classLabel = SIGNAL_CLASS_LABEL[pick.signal.classification];
  return {
    id: `widen/${pick.starId}`,
    kind: "widen",
    route: { kind: "study-brief", starId: pick.starId },
    fingerprint: `wd:${pick.starId}`,
    reason: reasonWiden(name, classLabel, pick.distanceLy),
    priority: PRIORITY.widen,
  };
}

// ---------------------------------------------------------------------------
// The two exported entry points — the split is AV4's seam.
// ---------------------------------------------------------------------------

/**
 * The declined-filtered, priority-ranked, UNCAPPED candidate list. This is
 * the closed candidate list AV4's counsel receives — up to five, one per
 * rule, never the floor's cap of two.
 */
export function enumerateProposals(input: EnumerateProposalsInput): readonly ProposalCandidate[] {
  const all: (ProposalCandidate | undefined)[] = [
    ruleFirstWatch(input),
    ruleQuestion(input),
    ruleProbe(input),
    ruleProject(input),
    ruleWiden(input),
  ];
  const live = all.filter((c): c is ProposalCandidate => c !== undefined);
  const undeclined = live.filter((c) => !input.declined.has(c.fingerprint));
  return undeclined.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

function toWireProposal(c: ProposalCandidate): Proposal {
  return { id: c.id, line: render(c.reason), verb: PROPOSAL_VERBS[c.kind], stance: null, route: c.route };
}

/**
 * The floor's serve step: first-watch exclusivity, the one-starId rule, the
 * cap of two, and render to the wire. `stance` is always `null` here — the
 * AV3 floor ships no archetype stance at all; AV4's counsel seam is the
 * only thing that ever fills it.
 */
export function serveProposals(ranked: readonly ProposalCandidate[]): readonly Proposal[] {
  if (ranked.length === 0) return [];

  // Defensive determinism (§3): priority then id, even though
  // enumerateProposals already returns candidates in this order.
  const sorted = [...ranked].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const first = sorted[0];
  if (first === undefined) return [];

  // The one gesture a new player has: a second row beside the first watch
  // splits it. first-watch's priority (10) is lower than every other kind's,
  // so it is always `first` when it fires at all.
  if (first.kind === "first-watch") return [toWireProposal(first)];

  const chosen: ProposalCandidate[] = [first];
  const usedStarIds = new Set<string>();
  const firstStarId = routeStarId(first.route);
  if (firstStarId !== null) usedStarIds.add(firstStarId);

  for (const candidate of sorted.slice(1)) {
    if (chosen.length >= MAX_PROPOSALS_ON_WIRE) break;
    const starId = routeStarId(candidate.route);
    if (starId !== null && usedStarIds.has(starId)) continue; // one target, one proposal
    chosen.push(candidate);
    if (starId !== null) usedStarIds.add(starId);
  }
  return chosen.map(toWireProposal);
}
