// The Tend — derivation module for A2.2 (ui-design.md's Tend panel,
// systems-a.md §4).
//
// ONE DERIVED LIST. It stores nothing: `buildTendList` is assembled per sky
// send from the three state records that already exist (studies, projects,
// missions) plus nothing new. Every date on a row is derived from a
// purchase-time stamp (`startedYear` / `boughtYear` / `launchedYear`) plus
// catalog constants — never a stored date of its own.
//
// NO-BACKLOG RULE. Available projects and offered questions are not
// undertakings — nothing has been committed to yet, so they are not rows.
// Answered questions leave the Tend too: they have become evidence on the
// study, which is where the player reads them. A study row appears only if
// it has at least one child, so an idle vigil (a study with no purchase
// under way) is not clutter.
//
// PARENTING IS BY STAR, ONE LEVEL DEEP. A question or mission row's
// `parentId` is `study/${starId}` exactly when an OPEN (not shelved) study
// exists on that star, else null — a mission launched with no study open
// is a top-level row.

import { hasLanded, landedYear, projectById, type CostClass, type ProjectState } from "./projects";
import { SENTINEL_CADENCE_YEARS, type WorkState } from "./missions";
import type { MissionSnapshot, StudySnapshot, VoyageSnapshot } from "./protocol";

export type TendKind = "study" | "project" | "question" | "mission" | "voyage";

/**
 * One undertaking. `nextYear` is the ONE date the row is waiting on; the
 * client renders it as a clock pair with `nextLabel` as its caption.
 */
export interface TendRow {
  readonly id: string;
  readonly kind: TendKind;
  readonly label: string; // the purpose, mind's register
  readonly sub: string; // one line: what it is for
  readonly costClass: CostClass; // the class chip
  readonly state: WorkState;
  readonly nextYear: number | null;
  readonly nextLabel: string | null; // "LANDS" | "ANSWERS" | "ARRIVES" | "FIRST WORD" | "NEXT WORD"
  /**
   * The year this stretch of waiting BEGAN — the other end of the span the
   * client draws a track across (`fromYear` → `nextYear ?? markYear`). Not
   * always the year the work was commissioned: a standing sentinel's span
   * is one cadence, so its track measures the wait for the NEXT word rather
   * than the decades since launch, which would sit at 99% forever.
   */
  readonly fromYear: number | null;
  /**
   * A physics mark ON the track, where one exists: a mission in flight
   * carries its amendment horizon (past that point no beamed change can
   * overtake the probe), and a silent one carries the year its schedule
   * broke. Null where the wait has no interior event — a project lands or
   * it does not.
   */
  readonly markYear: number | null;
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

interface RowSpan {
  readonly nextYear: number | null;
  readonly nextLabel: string | null;
  readonly fromYear: number | null;
  readonly markYear: number | null;
}

/**
 * Mission nextYear/nextLabel by state (systems-a.md §4), plus the span the
 * client draws its track across. Every date here is already on the
 * snapshot — this only says which pair of them bounds the current wait.
 */
function missionSpan(m: MissionSnapshot): RowSpan {
  switch (m.state) {
    case "in-flight":
    case "beyond-horizon":
      // Launch → arrival, with the horizon marked inside it.
      return {
        nextYear: m.arrivalYear,
        nextLabel: "ARRIVES",
        fromYear: m.launchedYear,
        markYear: m.horizonYear,
      };
    case "awaiting-light":
      // The probe is there; what is crossing is the light. The horizon is
      // behind us and stays marked — the amendment window is closed, and
      // saying so is the point of drawing it.
      return {
        nextYear: m.firstWordYear,
        nextLabel: "FIRST WORD",
        fromYear: m.launchedYear,
        markYear: m.horizonYear,
      };
    case "standing":
      // One cadence, not the whole mission: the wait that is actually
      // running is the wait for the next word.
      return {
        nextYear: m.nextWordYear,
        nextLabel: "NEXT WORD",
        fromYear:
          m.nextWordYear === null ? null : m.nextWordYear - SENTINEL_CADENCE_YEARS,
        markYear: null,
      };
    case "silent":
      // Nothing is coming, so there is no next date. The span ends at the
      // year the schedule broke, and the client draws the break.
      return {
        nextYear: null,
        nextLabel: null,
        fromYear: m.launchedYear,
        markYear: m.missedWordYear,
      };
    case "returned":
      return { nextYear: null, nextLabel: null, fromYear: null, markYear: null };
    case "in-hand":
    case "watching":
      // Neither ever applies to a mission (systems-a.md §3.6) — they are the
      // states of a project or question in hand and of a study only
      // accruing light. Defensive fallback.
      return { nextYear: null, nextLabel: null, fromYear: null, markYear: null };
  }
}

/**
 * A4: the same span question for a voyage, and the same answer wherever the
 * two clocks agree.
 *
 * `state` IS NARROWED, NOT WIDENED. `VoyageWorkState` carries four terminal
 * words a mission has no use for (founded, unrooted, dark, and its own kind of
 * silence), and TendRow.state is `WorkState` — the union the client's chip
 * table is total over. Widening it here would have made the Tend impossible to
 * render until the client caught up, so a closed voyage reads `returned`: the
 * row is finished, which is the one thing a work-list chip is for. The real
 * word is on the VoyageSnapshot, where the voyage's own surface reads it, and
 * the chips grow their own vocabulary when that surface ships.
 */
function voyageSpan(v: VoyageSnapshot): RowSpan {
  switch (v.state) {
    case "in-flight":
    case "beyond-horizon":
      // Launch → landfall, with the amendment horizon marked inside it. The
      // horizon is the whole drama of a fast ship: a sail loses it in under
      // two years, and the track is where that is visible.
      return {
        nextYear: v.landfallYear,
        nextLabel: "LANDFALL",
        fromYear: v.launchedYear,
        markYear: v.horizonYear,
      };
    case "awaiting-light":
      // The ships are down, one way or another; what is still crossing is the
      // word about it.
      return {
        nextYear: v.firstWordYear,
        nextLabel: "FIRST WORD",
        fromYear: v.launchedYear,
        markYear: v.horizonYear,
      };
    case "silent":
      // A word was promised and did not come. The span ends at the year the
      // schedule broke, and the client draws the break.
      return {
        nextYear: null,
        nextLabel: null,
        fromYear: v.launchedYear,
        markYear: v.missedWordYear,
      };
    case "founded":
    case "unrooted":
    case "dark":
      // Closed, and `dark` closes with NO DATE ANYWHERE: the charter said to
      // send no word, so there is nothing late, nothing missing, and nothing
      // the row could honestly point at.
      return { nextYear: null, nextLabel: null, fromYear: null, markYear: null };
  }
}

/** The chip a voyage's state reads as, in the vocabulary the client already
 *  renders (see `voyageSpan`'s note on why it is narrowed rather than
 *  widened). */
function voyageWorkChip(state: VoyageSnapshot["state"]): WorkState {
  switch (state) {
    case "in-flight":
    case "beyond-horizon":
    case "awaiting-light":
    case "silent":
      return state;
    case "founded":
    case "unrooted":
    case "dark":
      return "returned";
  }
}

const STUDY_PREFIX = "study/";

/**
 * Group rows by `parentId ?? id`; group sort key = min non-null `nextYear`
 * in the group (`+Infinity` when all null), tiebreak by group id; within a
 * group, the parent first, then children by `nextYear` then `id`.
 * Deterministic payload, soonest-thing-first reading order.
 */
function sortTendRows(rows: readonly TendRow[]): readonly TendRow[] {
  const groups = new Map<string, TendRow[]>();
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

  const out: TendRow[] = [];
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
 * Assembles the whole Tend from the three state records that already
 * exist plus the two new ones (studies, missions). `studies` is the
 * already-derived wire `StudySnapshot[]` for this sky send — its
 * `openQuestions` carry the state/boughtYear/answersYear this module reads,
 * so buildTendList never re-derives a question's clock itself.
 */
export function buildTendList(input: {
  readonly nowYear: number;
  readonly projectState: ProjectState;
  readonly studies: readonly StudySnapshot[];
  readonly missions: readonly MissionSnapshot[];
  /** A4. Defaulted so every caller that predates voyages keeps compiling and
   *  keeps meaning exactly what it meant. */
  readonly voyages?: readonly VoyageSnapshot[];
  readonly localNames: Readonly<Record<string, string>>;
  readonly designations: Readonly<Record<string, string>>;
}): readonly TendRow[] {
  const { projectState, studies, missions, localNames, designations } = input;
  const voyages = input.voyages ?? [];
  const openStudyStarIds = new Set(
    studies.filter((s) => s.status === "open").map((s) => s.starId),
  );
  const parentFor = (starId: string): string | null =>
    openStudyStarIds.has(starId) ? `${STUDY_PREFIX}${starId}` : null;

  const rows: TendRow[] = [];

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
      fromYear: landed ? null : p.startedYear,
      markYear: null,
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
        fromYear: q.boughtYear,
        markYear: null,
        parentId: parentFor(study.starId),
        starId: study.starId,
      });
    }
  }

  // Mission rows: every mission is a row, whatever its state.
  for (const m of missions) {
    const { nextYear, nextLabel, fromYear, markYear } = missionSpan(m);
    rows.push({
      id: `mission/${m.id}`,
      kind: "mission",
      label: m.label,
      sub: `at ${nameFor(m.starId, localNames, designations)}`,
      costClass: m.costClass,
      state: m.state,
      nextYear,
      nextLabel,
      fromYear,
      markYear,
      parentId: parentFor(m.starId),
      starId: m.starId,
    });
  }

  // A4 voyage rows: every voyage is a row, whatever its state, the mission
  // rule exactly. `parentId` is NULL AND ALWAYS WILL BE: a study is a vigil
  // over a source, and a founding is not evidence about one. Hanging a colony
  // under a study of the star it was sent to would say the two are the same
  // undertaking, and the whole of A4 is that they are not.
  for (const v of voyages) {
    const { nextYear, nextLabel, fromYear, markYear } = voyageSpan(v);
    rows.push({
      id: `voyage/${v.id}`,
      kind: "voyage",
      label: v.label,
      sub: `to ${nameFor(v.starId, localNames, designations)}`,
      costClass: v.costClass,
      state: voyageWorkChip(v.state),
      nextYear,
      nextLabel,
      fromYear,
      markYear,
      parentId: null,
      starId: v.starId,
    });
  }

  // Study rows: EVERY open study, whether or not anything is under way on
  // it. TEND is where a player checks on all three kinds of work at once,
  // and a vigil with nothing bought is still a vigil — it reads `watching`,
  // with no date and no track, which is the honest rendering of a study
  // that is only accruing light. (Closed studies — grounded or shelved —
  // stay out: they are finished or put down, and live on the study board.)
  const childrenByStar = new Map<string, TendRow[]>();
  for (const row of rows) {
    if (row.parentId === null || !row.parentId.startsWith(STUDY_PREFIX)) continue;
    const starId = row.parentId.slice(STUDY_PREFIX.length);
    const list = childrenByStar.get(starId);
    if (list === undefined) childrenByStar.set(starId, [row]);
    else list.push(row);
  }
  for (const study of studies) {
    if (study.status !== "open") continue;
    const children = childrenByStar.get(study.starId) ?? [];
    let best: TendRow | null = null;
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
      state: children.length > 0 ? "in-hand" : "watching",
      nextYear: best?.nextYear ?? null,
      nextLabel: best?.nextLabel ?? null,
      // The parent mirrors the soonest child whole, span included: a study
      // row is a stand-in for the nearest thing happening under it.
      fromYear: best?.fromYear ?? null,
      markYear: best?.markYear ?? null,
      parentId: null,
      starId: study.starId,
    });
  }

  return sortTendRows(rows);
}
