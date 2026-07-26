// The report — derivation module for AV2 (docs/build-voice.md § AV2,
// prose-style.md's report rows and rules R-29a/R-31/R-32/R-33/R-34).
//
// PURE OVER WIRE SNAPSHOTS, THE buildTendList PRECEDENT (tend.ts). This
// module derives report entries from the StudySnapshot[] / MissionSnapshot[]
// / ProjectSnapshot[] / DetectedSource[] a sky send has ALREADY assembled —
// it stores nothing itself and reads no persisted state. It imports NO
// truth-side symbol and NO knowledge-layer read: not `civTruthAt`, not
// `emissionAt`, not `occupancyAt`, not `peekTruth`, not `observeCiv`, not
// `lightConeFor`. That is a structural, grep-checkable guarantee (R-34) —
// unlike the belief modules (studies.ts, missions.ts) that read truth
// through a LightCone, this one physically cannot, because it never
// receives a Galaxy or a LightCone as an argument.
//
// STORED, MATERIALIZED ON DERIVE. Unlike the Tend (which is rebuilt fresh on
// every sky send and never persisted), the report's whole point is an annal
// that survives the source fading, the study reopening, or a project's
// confidence lifting later — none of which may rewrite what already
// happened. `deriveReportEntries` is the pure candidate producer;
// `mergeReportEntries` is the accretion step cohort.ts calls against
// persisted `ReportState`, adding only entries whose ids are not already
// stored and never deleting or re-rendering one that is (the "frozen prose"
// rule — a stored `record`/`stamp` string is never recomputed once written).
//
// FROZEN PROSE, ONE MORE TIME. Every builder in voice.ts's AV2 bank takes
// PRIMITIVES and renders internally; this module calls each builder exactly
// once per candidate entry and stores the RENDERED string (`render()`) plus
// its pinned tokens (`pinnedTokens()`), never the `PinnedLine` itself. A
// re-read of the same report is therefore byte-identical even though the
// hypotheses/annotations feeding a *live* study snapshot keep moving.

import type { ArchetypeId } from "./minds";
import { missionProseName, SILENCE_GRACE_YEARS } from "./missions";
import type {
  DetectedSource,
  Hypothesis,
  HypothesisId,
  MissionSnapshot,
  ProjectSnapshot,
  ReportEntry,
  ReportPayload,
  ReportRoute,
  StudySnapshot,
} from "./protocol";
import { questionById } from "./questions";
import {
  epochStamp,
  pinnedTokens,
  recordProbeFirstWord,
  recordProbeLaunched,
  recordProbeReport,
  recordProbeSilent,
  recordProjectLanded,
  recordQuestionAnswered,
  recordQuestionPlateaued,
  recordSkyArrival,
  recordStudyGrounded,
  render,
  reportHeader,
  reportRemark,
  type RemarkFamily,
} from "./voice";

// ---------------------------------------------------------------------------
// The catalog — 9 kinds, 6 families (av2-synthesis.md's table).
// ---------------------------------------------------------------------------

export type ReportKind =
  | "question-answered"
  | "question-plateaued"
  | "probe-launched"
  | "probe-first-word"
  | "probe-report"
  | "probe-silent"
  | "sky-arrival"
  | "study-grounded"
  | "project-landed";

export type ReportFamily = "settled" | "refused" | "sent" | "spoken" | "unspoken" | "record";

/**
 * One materialized entry. Frozen at derive time: `stamp`, `record`, and
 * `pinned` are never recomputed once stored, even though a live study's
 * hypotheses/annotation keep moving under a re-derivation of the SAME
 * source year after year. `stampYear` is the sort key and the header-span
 * arithmetic's input — it is never sent on the wire (only `stamp`, the
 * already-rendered "year N AE", crosses; see protocol.ts's ReportEntry).
 */
export interface StoredReportEntry {
  readonly id: string;
  readonly kind: ReportKind;
  readonly family: ReportFamily;
  readonly stampYear: number;
  readonly stamp: string;
  readonly record: string;
  readonly pinned: readonly string[];
  readonly route: ReportRoute;
}

export interface ReportState {
  readonly version: 1;
  /** Fixed at first creation (loadReportState's lazy-create-and-persist-once
   *  idiom in cohort.ts, projects.ts's precedent) — nothing stamped before
   *  this ever materializes, so a run that predates AV2 starts empty and
   *  fills honestly rather than back-filling its whole history at once. */
  readonly sinceYear: number;
  /** Advanced ONLY on placement-path serves (cohort.ts's sendReport with
   *  `advance: true`) — a requestReport re-read never moves it. */
  readonly lastServedYear: number;
  /** Set once the CAP has evicted anything, and never cleared. */
  readonly trimmed: boolean;
  /** Ascending by (stampYear, id) — the annal's own reading order. */
  readonly entries: readonly StoredReportEntry[];
}

export const REPORT_CAP = 100;
export const REPORT_ON_WIRE = 40;
/** Triage header fires at ≥6 new entries served at once... */
export const REPORT_HEADER_MIN_NEW = 6;
/** ...or a ≥120-game-year gap since the report was last opened, whichever
 *  comes first (a short absence with a big batch still earns the header). */
export const REPORT_HEADER_MIN_SPAN_YEARS = 120;

export function newReportState(nowYear: number): ReportState {
  return { version: 1, sinceYear: nowYear, lastServedYear: nowYear, trimmed: false, entries: [] };
}

// ---------------------------------------------------------------------------
// Derivation input — everything a sky send has already assembled. No
// archetype here: the record sentences are archetype-neutral by design
// (voice.ts's facts/stance split), and the one archetype-dependent thing on
// this surface — the remark — is picked at SERVE time (buildReportPayload),
// never stored, so it is not a derivation input either.
// ---------------------------------------------------------------------------

export interface DeriveReportEntriesInput {
  readonly studies: readonly StudySnapshot[];
  readonly missions: readonly MissionSnapshot[];
  readonly projects: readonly ProjectSnapshot[];
  /** For distanceLy (every remote entry's light age at its own year — R-33)
   *  and as a designation fallback. A study/source pairing not found here
   *  is the accepted "faded below the wire" limit (see deriveReportEntries'
   *  doc comment) — the entry simply never materializes. */
  readonly sources: readonly DetectedSource[];
  /** The player's own labels — tend.ts's `nameFor` precedent: local name
   *  wins, else the designation. */
  readonly localNames: Readonly<Record<string, string>>;
  /**
   * Every relevant star's catalog designation, keyed the same way
   * cohort.ts already builds it for buildTendList — NOT limited to
   * currently-visible sources. A mission can outlive its source's
   * visibility (missions.ts: "missions survive their sources"), so a
   * probe-silent entry years after the source faded still needs a name;
   * `sources` alone cannot supply one by then, but this can, because it is
   * built from the public star catalog, not from a per-civ detection.
   */
  readonly designations: Readonly<Record<string, string>>;
  readonly ascensionYear: number;
  readonly nowYear: number;
  /** Candidates with `stampYear < sinceYear` are filtered out — the
   *  ReportState's own `sinceYear`, threaded through so this module never
   *  reads persisted state itself. */
  readonly sinceYear: number;
}

// ---------------------------------------------------------------------------
// Naming — tend.ts's nameFor, restated here rather than imported (tend.ts
// does not export it, and this module must not depend on tend.ts's other
// internals). Kept byte-for-byte the same precedence.
// ---------------------------------------------------------------------------

function nameFor(
  starId: string,
  localNames: Readonly<Record<string, string>>,
  designations: Readonly<Record<string, string>>,
): string {
  return localNames[starId] ?? designations[starId] ?? starId;
}

/** The highest-share hypothesis, unrestricted. Used for study-grounded,
 *  where there is no `moved` list to restrict against — the study is
 *  closed, and the lead reading is simply whichever one is. */
function leadHypothesis(hypotheses: readonly Hypothesis[]): Hypothesis | undefined {
  let best: Hypothesis | undefined;
  for (const h of hypotheses) {
    if (best === undefined || h.share > best.share) best = h;
  }
  return best;
}

/** The highest-share hypothesis AMONG those a specific finding moved — "the
 *  reading it moved toward" for a question-answered record sentence. Reuses
 *  the study's current wire-assembled shares (the same approximation
 *  buildTendList makes: read what the sky already computed, never re-derive
 *  it here). */
function leadMovedHypothesis(
  hypotheses: readonly Hypothesis[],
  moved: readonly HypothesisId[],
): Hypothesis | undefined {
  let best: Hypothesis | undefined;
  for (const h of hypotheses) {
    if (!moved.includes(h.id)) continue;
    if (best === undefined || h.share > best.share) best = h;
  }
  return best;
}

function inWindow(stampYear: number, sinceYear: number, nowYear: number): boolean {
  return stampYear >= sinceYear && stampYear <= nowYear;
}

// ---------------------------------------------------------------------------
// Per-kind candidate builders
// ---------------------------------------------------------------------------

function questionEntries(input: DeriveReportEntriesInput): StoredReportEntry[] {
  const { studies, sources, localNames, designations, ascensionYear, nowYear, sinceYear } = input;
  const out: StoredReportEntry[] = [];
  for (const study of studies) {
    // Accepted limit (av2-synthesis.md): a question that answers while its
    // source has faded below the wire never materializes — `studies` only
    // ever carries snapshots for currently-visible sources (cohort.ts's
    // sendSky), so this is simply "no match this call", not a special case.
    const source = sources.find((s) => s.starId === study.starId);
    if (source === undefined) continue;
    const sourceName = nameFor(study.starId, localNames, designations);

    for (const q of study.openQuestions) {
      if (q.state !== "answered" || q.finding === null || q.answersYear === null) continue;
      const stampYear = q.answersYear;
      if (!inWindow(stampYear, sinceYear, nowYear)) continue;
      const def = questionById(q.id);
      if (def === undefined) continue; // defensive: the catalog is closed and total

      const stamp = render(epochStamp(stampYear, ascensionYear));

      if (q.finding.shape === "plateau") {
        const record = recordQuestionPlateaued(def.proseName, sourceName, source.distanceLy);
        out.push({
          id: `q/${study.starId}/${q.id}`,
          kind: "question-plateaued",
          family: "refused",
          stampYear,
          stamp,
          record: render(record),
          pinned: pinnedTokens(record),
          route: { kind: "study", starId: study.starId },
        });
        continue;
      }

      // sharpen: name the reading it moved toward. Every sharpen()-built
      // Finding in questions.ts carries at least one role multiplier > 1,
      // so `moved` should never be empty here; if a future finding shape
      // ever produces one anyway, skip rather than name nothing (a record
      // sentence with no reading would be a fact-shaped hole).
      const lead = leadMovedHypothesis(study.hypotheses, q.finding.moved);
      if (lead === undefined) continue;
      const record = recordQuestionAnswered(def.proseName, sourceName, lead.label, source.distanceLy);
      out.push({
        id: `q/${study.starId}/${q.id}`,
        kind: "question-answered",
        family: "settled",
        stampYear,
        stamp,
        record: render(record),
        pinned: pinnedTokens(record),
        route: { kind: "study", starId: study.starId },
      });
    }
  }
  return out;
}

function missionEntries(input: DeriveReportEntriesInput): StoredReportEntry[] {
  const { missions, localNames, designations, ascensionYear, nowYear, sinceYear } = input;
  const out: StoredReportEntry[] = [];

  for (const m of missions) {
    const sourceName = nameFor(m.starId, localNames, designations);
    const missionName = missionProseName(m.kind);

    // probe-launched
    if (inWindow(m.launchedYear, sinceYear, nowYear)) {
      const firstWordYears = m.firstWordYear - m.launchedYear;
      const record = recordProbeLaunched(missionName, sourceName, m.distanceLy, firstWordYears);
      out.push({
        id: `m/${m.id}/launched`,
        kind: "probe-launched",
        family: "sent",
        stampYear: m.launchedYear,
        stamp: render(epochStamp(m.launchedYear, ascensionYear)),
        record: render(record),
        pinned: pinnedTokens(record),
        route: { kind: "mission", missionId: m.id },
      });
    }

    // probe-first-word (ordinal 1) / probe-report (ordinal ≥ 2)
    for (const r of m.reports) {
      const stampYear = r.arrivedYear;
      if (!inWindow(stampYear, sinceYear, nowYear)) continue;
      const stamp = render(epochStamp(stampYear, ascensionYear));
      if (r.ordinal === 1) {
        const record = recordProbeFirstWord(missionName, sourceName, r.headline, m.distanceLy);
        out.push({
          id: `m/${m.id}/r/${r.ordinal}`,
          kind: "probe-first-word",
          family: "spoken",
          stampYear,
          stamp,
          record: render(record),
          pinned: pinnedTokens(record),
          route: { kind: "mission", missionId: m.id },
        });
      } else {
        const record = recordProbeReport(missionName, sourceName, r.headline, m.distanceLy);
        out.push({
          id: `m/${m.id}/r/${r.ordinal}`,
          kind: "probe-report",
          family: "record",
          stampYear,
          stamp,
          record: render(record),
          pinned: pinnedTokens(record),
          route: { kind: "mission", missionId: m.id },
        });
      }
    }

    // probe-silent: stamps at the missed word's year (an annal orders by
    // when things happened, not by when we noticed), but only MATERIALIZES
    // once the grace window has fully elapsed — a schedule miss inside
    // SILENCE_GRACE_YEARS isn't a silence yet, missions.ts's own bar for
    // calling it one.
    if (m.state === "silent" && m.missedWordYear !== null) {
      const missedWordYear = m.missedWordYear;
      const graceElapsed = nowYear >= missedWordYear + SILENCE_GRACE_YEARS;
      if (graceElapsed && inWindow(missedWordYear, sinceYear, nowYear)) {
        // recordProbeSilent's third argument is already ascension-relative
        // (voice.ts's asymmetry note) — unlike epochStamp, it does its own
        // subtraction, so the caller must not pre-round it.
        const record = recordProbeSilent(
          missionName,
          sourceName,
          missedWordYear - ascensionYear,
          m.distanceLy,
        );
        out.push({
          id: `m/${m.id}/silent`,
          kind: "probe-silent",
          family: "unspoken",
          stampYear: missedWordYear,
          stamp: render(epochStamp(missedWordYear, ascensionYear)),
          record: render(record),
          pinned: pinnedTokens(record),
          route: { kind: "mission", missionId: m.id },
        });
      }
    }
  }
  return out;
}

function skyArrivalEntries(input: DeriveReportEntriesInput): StoredReportEntry[] {
  const { studies, sources, localNames, designations, ascensionYear, nowYear, sinceYear } = input;
  const out: StoredReportEntry[] = [];
  for (const study of studies) {
    const source = sources.find((s) => s.starId === study.starId);
    if (source === undefined) continue; // same accepted limit as questionEntries
    const sourceName = nameFor(study.starId, localNames, designations);

    for (const e of study.evidence) {
      if (e.kind !== "arrival") continue; // "answer"/"report" are their own kinds above
      const stampYear = e.asOfYear + source.distanceLy;
      if (!inWindow(stampYear, sinceYear, nowYear)) continue;
      const record = recordSkyArrival(sourceName, source.distanceLy, e.annotation);
      out.push({
        // Reuses studies.ts's own evidence id (`${starId}/epoch-${i}`,
        // deriveEvidence) rather than re-deriving one from `fromYear` — it
        // is already a stable, float-free id keyed to the epoch's position
        // in the light history, which is exactly what the "no float years
        // in ids" rule is asking for.
        id: `arr/${e.id}`,
        kind: "sky-arrival",
        family: "record",
        stampYear,
        stamp: render(epochStamp(stampYear, ascensionYear)),
        record: render(record),
        pinned: pinnedTokens(record),
        route: { kind: "source", starId: study.starId },
      });
    }
  }
  return out;
}

function studyGroundedEntries(input: DeriveReportEntriesInput): StoredReportEntry[] {
  const { studies, sources, localNames, designations, ascensionYear, nowYear, sinceYear } = input;
  const out: StoredReportEntry[] = [];
  for (const study of studies) {
    if (study.status !== "grounded" || study.grounding === null) continue;
    const source = sources.find((s) => s.starId === study.starId);
    if (source === undefined) continue;
    const stampYear = study.grounding.arrivedYear;
    if (!inWindow(stampYear, sinceYear, nowYear)) continue;
    const lead = leadHypothesis(study.hypotheses);
    if (lead === undefined) continue;
    const sourceName = nameFor(study.starId, localNames, designations);
    const record = recordStudyGrounded(
      study.grounding.missionName,
      sourceName,
      lead.label,
      source.distanceLy,
    );
    out.push({
      // Known accepted limit (av2-synthesis.md): a study that is REOPENED
      // loses its grounding on future derives (buildStudySnapshot only
      // attaches `grounding` while `status === "grounded"`) — the stored
      // copy of this entry survives regardless, because materialize only
      // ever adds ids, never removes them.
      id: `s/${study.starId}/grounded/${study.grounding.reportId}`,
      kind: "study-grounded",
      family: "settled",
      stampYear,
      stamp: render(epochStamp(stampYear, ascensionYear)),
      record: render(record),
      pinned: pinnedTokens(record),
      route: { kind: "study", starId: study.starId },
    });
  }
  return out;
}

function projectEntries(input: DeriveReportEntriesInput): StoredReportEntry[] {
  const { projects, ascensionYear, nowYear, sinceYear } = input;
  const out: StoredReportEntry[] = [];
  for (const p of projects) {
    if (p.status !== "standing" || p.landsYear === null) continue;
    const stampYear = p.landsYear;
    if (!inWindow(stampYear, sinceYear, nowYear)) continue;
    const record = recordProjectLanded(p.label, p.effectLine);
    out.push({
      id: `p/${p.id}/landed`,
      kind: "project-landed",
      family: "record",
      stampYear,
      stamp: render(epochStamp(stampYear, ascensionYear)),
      record: render(record),
      pinned: pinnedTokens(record),
      route: { kind: "project", projectId: p.id },
    });
  }
  return out;
}

/**
 * All nine kinds' candidates for this sky send, unfiltered against what is
 * already stored (that is `mergeReportEntries`'s job — this function is
 * stateless and returns the same candidates every time it is given the same
 * snapshots, `nowYear`, and `sinceYear`).
 */
export function deriveReportEntries(
  input: DeriveReportEntriesInput,
): readonly StoredReportEntry[] {
  return [
    ...questionEntries(input),
    ...missionEntries(input),
    ...skyArrivalEntries(input),
    ...studyGroundedEntries(input),
    ...projectEntries(input),
  ];
}

// ---------------------------------------------------------------------------
// Merge — the accretion step against persisted ReportState.
// ---------------------------------------------------------------------------

/**
 * Folds freshly-derived candidates into a stored `ReportState`: drops
 * candidates whose id is already stored (an id, once materialized, is
 * frozen forever — this is the whole no-re-render guarantee), sorts
 * ascending by (stampYear, id), and caps at REPORT_CAP, evicting the
 * OLDEST first. `changed` is false exactly when the stored id SET did not
 * move — including when the cap evicted nothing new and added nothing new
 * — so a caller can skip the write entirely on the common "nothing new this
 * sky send" case.
 */
export function mergeReportEntries(
  stored: ReportState,
  derived: readonly StoredReportEntry[],
): { readonly state: ReportState; readonly changed: boolean } {
  const existingIds = new Set(stored.entries.map((e) => e.id));
  const candidates = derived.filter(
    (e) => e.stampYear >= stored.sinceYear && !existingIds.has(e.id),
  );
  if (candidates.length === 0) {
    return { state: stored, changed: false };
  }

  const combined = [...stored.entries, ...candidates].sort((a, b) => {
    if (a.stampYear !== b.stampYear) return a.stampYear - b.stampYear;
    return a.id.localeCompare(b.id);
  });
  const overCap = combined.length > REPORT_CAP;
  const entries = overCap ? combined.slice(-REPORT_CAP) : combined;
  const trimmed = stored.trimmed || overCap;

  return {
    state: { ...stored, entries, trimmed },
    changed: true,
  };
}

// ---------------------------------------------------------------------------
// Serve-time payload — header triage, promotion, the wire cap.
// ---------------------------------------------------------------------------

/** The five report families that carry a remark (voice.ts's RemarkFamily —
 *  `record` is deliberately excluded, the mute/ordinary case). */
function isRemarkFamily(family: ReportFamily): family is RemarkFamily {
  return family !== "record";
}

const FAMILY_PRECEDENCE: Readonly<Record<RemarkFamily, number>> = {
  unspoken: 0,
  spoken: 1,
  settled: 2,
  refused: 3,
  sent: 4,
};

interface Promoted {
  readonly entry: StoredReportEntry;
  readonly family: RemarkFamily;
}

/**
 * The single entry a served report may attach a remark to: the
 * highest-ranked NEW (stampYear > lastServedYear) remark-bearing entry, by
 * family precedence unspoken > spoken > settled > refused > sent; ties
 * break on later stampYear, then greater id (R-31's cadence). Entries whose
 * family is `record` (mute) are never candidates — a batch that is all
 * routine reports/arrivals/landings promotes nothing, and the served report
 * simply carries no remark that time.
 */
function pickPromoted(newEntries: readonly StoredReportEntry[]): Promoted | undefined {
  let best: Promoted | undefined;
  for (const e of newEntries) {
    if (!isRemarkFamily(e.family)) continue;
    if (best === undefined) {
      best = { entry: e, family: e.family };
      continue;
    }
    const rank = FAMILY_PRECEDENCE[e.family] - FAMILY_PRECEDENCE[best.family];
    if (rank < 0) {
      best = { entry: e, family: e.family };
    } else if (
      rank === 0 &&
      (e.stampYear > best.entry.stampYear ||
        (e.stampYear === best.entry.stampYear && e.id > best.entry.id))
    ) {
      best = { entry: e, family: e.family };
    }
  }
  return best;
}

function sortDesc(entries: readonly StoredReportEntry[]): StoredReportEntry[] {
  return [...entries].sort((a, b) => {
    if (a.stampYear !== b.stampYear) return b.stampYear - a.stampYear;
    return b.id.localeCompare(a.id);
  });
}

/**
 * The wire payload for one serve. `state.lastServedYear` is the OLD marker
 * — callers advance it (cohort.ts's sendReport, placement paths only) only
 * AFTER calling this, since newCount/spanYears/promotion all read against
 * it. The header fires when a genuinely new batch is large (≥6 entries) or
 * old (≥120 game years since last open) — never over an empty report (a
 * requestReport re-read with nothing new gets `header: null`).
 */
export function buildReportPayload(
  state: ReportState,
  nowYear: number,
  archetype: ArchetypeId,
): ReportPayload {
  const newEntries = state.entries.filter((e) => e.stampYear > state.lastServedYear);
  const newCount = newEntries.length;
  const spanYears = nowYear - state.lastServedYear;
  const fireHeader =
    newCount > 0 &&
    (newCount >= REPORT_HEADER_MIN_NEW || spanYears >= REPORT_HEADER_MIN_SPAN_YEARS);

  const promoted = newCount > 0 ? pickPromoted(newEntries) : undefined;

  // The REPORT_ON_WIRE newest entries, with the promoted one folded in even
  // if a large backlog would otherwise have pushed it out of the window
  // (promotion ranks by family, not recency, so it is not guaranteed to
  // already be among the newest-by-stampYear slice).
  let wirePool = sortDesc(state.entries).slice(0, REPORT_ON_WIRE);
  if (promoted !== undefined && !wirePool.some((e) => e.id === promoted.entry.id)) {
    wirePool = sortDesc([...wirePool.slice(0, Math.max(0, REPORT_ON_WIRE - 1)), promoted.entry]);
  }

  const rest = wirePool.filter((e) => promoted === undefined || e.id !== promoted.entry.id);
  const orderedEntries: readonly StoredReportEntry[] =
    fireHeader && promoted !== undefined ? [promoted.entry, ...rest] : wirePool;

  const entries: ReportEntry[] = orderedEntries.map((e) => ({
    id: e.id,
    stamp: e.stamp,
    record: e.record,
    remark:
      promoted !== undefined && e.id === promoted.entry.id
        ? reportRemark(archetype, promoted.family, promoted.entry.id)
        : null,
    route: e.route,
  }));

  const header = fireHeader ? render(reportHeader(spanYears, newCount, state.trimmed)) : null;

  return { header, entries };
}
