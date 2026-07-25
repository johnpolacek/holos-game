// The Docket — derivation module for A2.2 (ui-design.md's Docket panel,
// systems-a.md §4).
//
// ONE DERIVED LIST. It stores nothing: `buildDocket` is assembled per sky
// send from the three state records that already exist (studies, projects,
// missions) plus nothing new. Every date on a row is derived from a
// purchase-time stamp (`startedYear` / `boughtYear` / `launchedYear`) plus
// catalog constants — never a stored date of its own.
//
// NO-BACKLOG RULE. Available projects and offered questions are not
// undertakings — nothing has been committed to yet, so they are not rows.
// Answered questions leave the Docket too: they have become evidence on the
// study, which is where the player reads them. A study row appears only if
// it has at least one child, so an idle vigil (a study with no purchase
// under way) is not clutter.
//
// PARENTING IS BY STAR, ONE LEVEL DEEP. A question or mission row's
// `parentId` is `study/${starId}` exactly when an OPEN (not shelved) study
// exists on that star, else null — a mission launched with no study open
// is a top-level row.

import { hasLanded, landedYear, projectById, type CostClass, type ProjectState } from "./projects";
import type { DocketState } from "./missions";
import type { MissionSnapshot, StudySnapshot } from "./protocol";

export type DocketKind = "study" | "project" | "question" | "mission";

/**
 * One undertaking. `nextYear` is the ONE date the row is waiting on; the
 * client renders it as a clock pair with `nextLabel` as its caption.
 */
export interface DocketRow {
  readonly id: string;
  readonly kind: DocketKind;
  readonly label: string; // the purpose, mind's register
  readonly sub: string; // one line: what it is for
  readonly costClass: CostClass; // the class chip
  readonly state: DocketState;
  readonly nextYear: number | null;
  readonly nextLabel: string | null; // "LANDS" | "ANSWERS" | "ARRIVES" | "FIRST WORD" | "NEXT WORD"
  /** One level of linkage: the id of the study row this hangs under, or null. */
  readonly parentId: string | null;
  /** The star this row concerns, so the client can offer "inspect". */
  readonly starId: string | null;
}

function nameFor(
  starId: string,
  localNames: Readonly<Record<string, string>>,
  designations: Readonly<Record<string, string>>,
): string {
  return localNames[starId] ?? designations[starId] ?? starId;
}

/** Mission nextYear/nextLabel by state (systems-a.md §4). */
function missionNextDate(m: MissionSnapshot): { nextYear: number | null; nextLabel: string | null } {
  switch (m.state) {
    case "in-flight":
    case "beyond-horizon":
      return { nextYear: m.arrivalYear, nextLabel: "ARRIVES" };
    case "awaiting-light":
      return { nextYear: m.firstWordYear, nextLabel: "FIRST WORD" };
    case "standing":
      return { nextYear: m.nextWordYear, nextLabel: "NEXT WORD" };
    case "returned":
    case "silent":
      return { nextYear: null, nextLabel: null };
    case "in-hand":
      // Never applies to a mission (systems-a.md §3.6); defensive fallback.
      return { nextYear: null, nextLabel: null };
  }
}

const STUDY_PREFIX = "study/";

/**
 * Group rows by `parentId ?? id`; group sort key = min non-null `nextYear`
 * in the group (`+Infinity` when all null), tiebreak by group id; within a
 * group, the parent first, then children by `nextYear` then `id`.
 * Deterministic payload, soonest-thing-first reading order.
 */
function sortDocketRows(rows: readonly DocketRow[]): readonly DocketRow[] {
  const groups = new Map<string, DocketRow[]>();
  for (const row of rows) {
    const key = row.parentId ?? row.id;
    const list = groups.get(key);
    if (list === undefined) groups.set(key, [row]);
    else list.push(row);
  }

  const groupKeySortValue = (key: string): number => {
    const list = groups.get(key);
    if (list === undefined) return Infinity;
    let min = Infinity;
    for (const r of list) {
      if (r.nextYear !== null && r.nextYear < min) min = r.nextYear;
    }
    return min;
  };

  const groupIds = [...groups.keys()].sort((a, b) => {
    const diff = groupKeySortValue(a) - groupKeySortValue(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const out: DocketRow[] = [];
  for (const key of groupIds) {
    const list = groups.get(key);
    if (list === undefined) continue;
    const parent = list.find((r) => r.id === key);
    const children = list
      .filter((r) => r.id !== key)
      .sort((a, b) => {
        const an = a.nextYear ?? Infinity;
        const bn = b.nextYear ?? Infinity;
        return an !== bn ? an - bn : a.id.localeCompare(b.id);
      });
    if (parent !== undefined) out.push(parent);
    out.push(...children);
  }
  return out;
}

/**
 * Assembles the whole Docket from the three state records that already
 * exist plus the two new ones (studies, missions). `studies` is the
 * already-derived wire `StudySnapshot[]` for this sky send — its
 * `openQuestions` carry the state/boughtYear/answersYear this module reads,
 * so buildDocket never re-derives a question's clock itself.
 */
export function buildDocket(input: {
  readonly nowYear: number;
  readonly projectState: ProjectState;
  readonly studies: readonly StudySnapshot[];
  readonly missions: readonly MissionSnapshot[];
  readonly localNames: Readonly<Record<string, string>>;
  readonly designations: Readonly<Record<string, string>>;
}): readonly DocketRow[] {
  const { projectState, studies, missions, localNames, designations } = input;
  const openStudyStarIds = new Set(
    studies.filter((s) => s.status === "open").map((s) => s.starId),
  );
  const parentFor = (starId: string): string | null =>
    openStudyStarIds.has(starId) ? `${STUDY_PREFIX}${starId}` : null;

  const rows: DocketRow[] = [];

  // Project rows: running (in-hand) or standing; available is not a row.
  for (const p of projectState.started) {
    const def = projectById(p.id);
    if (def === undefined) continue;
    const landed = hasLanded(def, p, input.nowYear);
    rows.push({
      id: `project/${p.id}`,
      kind: "project",
      label: def.label,
      sub: def.line,
      costClass: def.costClass,
      state: landed ? "standing" : "in-hand",
      nextYear: landed ? null : landedYear(def, p),
      nextLabel: landed ? null : "LANDS",
      parentId: null,
      starId: null,
    });
  }

  // Question rows: pending only; offered/answered are not rows.
  for (const study of studies) {
    for (const q of study.openQuestions) {
      if (q.state !== "pending" || q.answersYear === null) continue;
      rows.push({
        id: `question/${study.starId}/${q.id}`,
        kind: "question",
        label: q.label,
        sub: q.line,
        costClass: q.costClass,
        state: "in-hand",
        nextYear: q.answersYear,
        nextLabel: "ANSWERS",
        parentId: parentFor(study.starId),
        starId: study.starId,
      });
    }
  }

  // Mission rows: every mission is a row, whatever its state.
  for (const m of missions) {
    const { nextYear, nextLabel } = missionNextDate(m);
    rows.push({
      id: `mission/${m.id}`,
      kind: "mission",
      label: m.label,
      sub: `at ${nameFor(m.starId, localNames, designations)}`,
      costClass: m.costClass,
      state: m.state,
      nextYear,
      nextLabel,
      parentId: parentFor(m.starId),
      starId: m.starId,
    });
  }

  // Study parent rows: only if they have at least one child, and their
  // nextYear/nextLabel mirror the earliest child's.
  const childrenByStar = new Map<string, DocketRow[]>();
  for (const row of rows) {
    if (row.parentId === null || !row.parentId.startsWith(STUDY_PREFIX)) continue;
    const starId = row.parentId.slice(STUDY_PREFIX.length);
    const list = childrenByStar.get(starId);
    if (list === undefined) childrenByStar.set(starId, [row]);
    else list.push(row);
  }
  for (const study of studies) {
    if (study.status !== "open") continue;
    const children = childrenByStar.get(study.starId);
    if (children === undefined || children.length === 0) continue;
    let best: DocketRow | null = null;
    let bestNextYear = Infinity;
    for (const c of children) {
      const y = c.nextYear;
      if (y === null) continue;
      if (best === null || y < bestNextYear || (y === bestNextYear && c.id < best.id)) {
        best = c;
        bestNextYear = y;
      }
    }
    rows.push({
      id: `${STUDY_PREFIX}${study.starId}`,
      kind: "study",
      label: nameFor(study.starId, localNames, designations),
      sub: study.annotationLine,
      costClass: "ambient",
      state: "in-hand",
      nextYear: best?.nextYear ?? null,
      nextLabel: best?.nextLabel ?? null,
      parentId: null,
      starId: study.starId,
    });
  }

  return sortDocketRows(rows);
}
