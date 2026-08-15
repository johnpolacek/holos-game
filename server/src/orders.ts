// Standing orders — what the mind is licensed to do while nobody is watching
// (a4-ledger-note.md §3, with a4-synthesis.md's rulings binding).
//
// THE STANDING-ORDER INVARIANT lives in cohort.ts's header, beside the
// presence rule, because it is a claim about what may be COMMITTED in absence
// and cohort.ts is where committing happens. This module is the catalog and
// the arithmetic: the one armable class, the condition, the target choice, and
// the three outcomes a fire can have.
//
// IT READS NO TRUTH AND MINTS NO CONE. Everything the condition looks at is
// handed in — the candidate rows are built by the caller from the sky it has
// ALREADY assembled (studies.ts's `TripwireBoard` discipline, one module
// over), so a standing order can only ever fire on something the player could
// have read for themselves had they been looking. That is what makes it an
// order and not an oracle.
//
// THREE BOUNDS, and they are the whole safety argument:
//
//   1. ONE FIRE PER ARMING. `firedYear` is set on the settle that fires and
//      never cleared; re-arming is a fresh, present act by a live socket.
//   2. THE CATALOG IS THE BOUND, NOT A BUDGET. There is exactly one class, it
//      dispatches an Ambient-class instrument, and nothing here can be
//      widened by spending more.
//   3. A FIRE THAT CANNOT BE PAID FOR NEVER BECOMES A DEBT. It fizzles, the
//      arming is spent, and the annal says so. Not queued (an invisible
//      open-ended claim on a pool), and not partial (a Sentinel is not
//      divisible).

import type { CivId, EmissionEpoch } from "./civseed";
import { MADE_HEAT_FLOOR } from "./knowledge";
import {
  missionKindById,
  MAX_MISSIONS_PER_TOKEN,
  type CharterClauseId,
  type MissionKind,
} from "./missions";
// Type-only: protocol.ts names this module's vocabulary and this module names
// protocol.ts's wire shape. Erased at build, exactly as missions.ts and
// protocol.ts have always leaned on each other.
import type { StandingOrderWire } from "./protocol";

/** Slop on float year comparisons. missions.ts's EPS, same reason. */
const EPS = 1e-6;

// ---------------------------------------------------------------------------
// The catalog (a4-ledger-note §3.1)
// ---------------------------------------------------------------------------

/**
 * ONE CLASS, and the count is the design rather than a starting point. An
 * armable catalog is a list of things a player has agreed may happen without
 * them, and every entry on it has to earn the sentence "I would have done
 * that myself." A sentinel toward something that has just started making heat
 * inside twenty light-years earns it: it reveals nothing, asks nothing, and
 * the alternative is finding out about the neighbours a century late because
 * the tab was closed.
 */
export type OrderClass = "warm-movement-sentinel";

/** What a fire actually did. All three are reported; none of them is a
 *  failure the player has to clean up. */
export type OrderOutcome = "launched" | "unaffordable" | "blocked";

/** How far out the condition looks. Inside this, a neighbour that has just
 *  begun to run hot is close enough to be worth an instrument now rather than
 *  a decision later. */
export const WARM_RADIUS_LY = 20;

export interface OrderClassDef {
  readonly orderClass: OrderClass;
  readonly label: string; // chrome, ALL CAPS
  readonly line: string; // the order as written
  /** What it dispatches. Ambient class, and it must stay that way: an order
   *  may commit only what the mind is already licensed to commit in absence. */
  readonly missionKind: MissionKind;
  readonly costCompute: number;
  readonly radiusLy: number;
}

/** The sentinel's own price, read from the mission catalog rather than
 *  restated — an order that could drift out of step with what it dispatches
 *  would be a receipt for something else. */
const SENTINEL_COST_COMPUTE = missionKindById("sentinel")?.costCompute ?? 0;

export const ORDER_CLASSES: readonly OrderClassDef[] = [
  {
    orderClass: "warm-movement-sentinel",
    label: "THE WARM MOVEMENT ORDER",
    line: "If anything inside twenty light-years first runs hot, send the Sentinel unasked. An instrument beats a late decision.",
    missionKind: "sentinel",
    costCompute: SENTINEL_COST_COMPUTE,
    radiusLy: WARM_RADIUS_LY,
  },
];

/** Takes `string` so handlers validate untrusted input without a cast
 *  (missions.ts's `missionKindById` precedent). */
export function orderClassById(id: string): OrderClassDef | undefined {
  return ORDER_CLASSES.find((c) => c.orderClass === id);
}

/** The order's name as it reads inside a sentence — `label` is chrome and
 *  cannot be dropped into prose. */
export function orderProseName(orderClass: OrderClass): string {
  return orderClass === "warm-movement-sentinel" ? "the warm movement order" : orderClass;
}

// ---------------------------------------------------------------------------
// Persistence — `orders:${token}` (a4-ledger-note §5.2)
// ---------------------------------------------------------------------------

/**
 * One armed order. `firedYear` non-null means it has already fired FOR THIS
 * ARMING and never fires twice without being armed again — studies.ts's
 * `StoredTripwire` contract, field for field, because it is the same contract:
 * an order is a statement about what happens next, made once.
 *
 * The charter rides the record because ARMING IS THE CONSENT AND THE CHARTER
 * IS ITS CONTENT. A player who arms this has authorized a specific dispatch,
 * with a specific contingency table, and the fire may not improvise one.
 */
export interface StoredOrder {
  readonly orderClass: OrderClass;
  readonly armedYear: number;
  readonly charter: readonly CharterClauseId[];
  readonly firedYear: number | null;
  readonly firedStarId: string | null;
  readonly outcome: OrderOutcome | null;
  /** How old the qualifying light was when it fired. FROZEN here rather than
   *  recomputed on read: the order acted on the evidence it had, and the
   *  annal's sentence about it must not age afterwards. */
  readonly evidenceAgeYears: number | null;
}

export interface OrderState {
  readonly version: 1;
  readonly orders: readonly StoredOrder[];
}

export function newOrderState(): OrderState {
  return { version: 1, orders: [] };
}

/** Identity at v1 — the seam exists for a future version bump. */
export function migrateOrderState(stored: OrderState): OrderState {
  return stored;
}

// ---------------------------------------------------------------------------
// The condition (a4-ledger-note §3.2)
// ---------------------------------------------------------------------------

/**
 * One source, as the condition needs it. Built by the caller from the sky it
 * has already assembled: `lightHistory` is the clipped history `observeCiv`
 * produced, so every epoch in it has arrived, and there is no field here a
 * caller could fill from truth even if it wanted to.
 */
export interface OrderCandidate {
  readonly starId: string;
  readonly targetCivId: CivId;
  readonly distanceLy: number;
  readonly lightHistory: readonly EmissionEpoch[];
}

/** The evidence one candidate offers: the epoch that met the condition. */
export interface WarmMovement {
  readonly candidate: OrderCandidate;
  /** The year the qualifying epoch LEFT its star. The report carries its age,
   *  which is the only honest thing to say about how new this news is. */
  readonly fromYear: number;
}

/**
 * Whether one source has JUST STARTED running hot, for an arming made in
 * `armedYear`.
 *
 * Four clauses, and each of them is refusing a different way of being wrong:
 *
 *  - the newest arrived epoch has to be above the made-heat floor, or nothing
 *    is warm at all;
 *  - the news has to have ARRIVED AFTER THE ARMING (`fromYear + d > armedYear`),
 *    or the order is firing on something that was already true when it was
 *    left standing, which is the past and not an event;
 *  - there has to be an earlier epoch BELOW the floor, or this is a source
 *    that has been hot for as long as anyone has been able to see it;
 *  - unless there is only one epoch at all, in which case the source's whole
 *    visible history is this heat, and its beginning is the only beginning
 *    anybody here will ever get.
 */
export function warmMovementHolds(
  candidate: OrderCandidate,
  armedYear: number,
  radiusLy: number,
): WarmMovement | null {
  if (candidate.distanceLy > radiusLy + EPS) return null;
  const sorted = [...candidate.lightHistory].sort((a, b) => a.fromYear - b.fromYear);
  const newest = sorted[sorted.length - 1];
  if (newest === undefined) return null;
  if (newest.level < MADE_HEAT_FLOOR) return null;
  if (newest.fromYear + candidate.distanceLy <= armedYear + EPS) return null;
  const wasCool = sorted.slice(0, -1).some((epoch) => epoch.level < MADE_HEAT_FLOOR);
  if (!wasCool && sorted.length !== 1) return null;
  return { candidate, fromYear: newest.fromYear };
}

/**
 * The one source an order fires at: the NEAREST that qualifies, ties broken on
 * star id. Nearest and not newest, because the order exists to shorten a
 * flight, and a tie-break on the id keeps two sources at identical range from
 * depending on the order a map happened to be walked in.
 */
export function warmMovementTarget(
  candidates: readonly OrderCandidate[],
  armedYear: number,
  radiusLy: number,
): WarmMovement | null {
  let best: WarmMovement | null = null;
  for (const candidate of candidates) {
    const held = warmMovementHolds(candidate, armedYear, radiusLy);
    if (held === null) continue;
    if (best === null) {
      best = held;
      continue;
    }
    const closer = held.candidate.distanceLy - best.candidate.distanceLy;
    if (closer < -EPS) best = held;
    else if (Math.abs(closer) <= EPS && held.candidate.starId.localeCompare(best.candidate.starId) < 0) {
      best = held;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// The fire (a4-ledger-note §3.4, §3.5)
// ---------------------------------------------------------------------------

/**
 * What one fire decided. The caller performs it — this module owns the
 * decision and never the write, which is why a settle can be run twice with
 * the same inputs and produce the same answer.
 */
export interface OrderFiring {
  readonly orderClass: OrderClass;
  readonly outcome: OrderOutcome;
  readonly missionKind: MissionKind;
  readonly starId: string;
  readonly targetCivId: CivId;
  readonly distanceLy: number;
  readonly costCompute: number;
  readonly charter: readonly CharterClauseId[];
  /** How old the evidence is: `nowYear − fromYear`. The order fired on light,
   *  and the light is as old as it is. */
  readonly evidenceAgeYears: number;
}

export interface SettleOrdersInput {
  readonly orders: readonly StoredOrder[];
  readonly candidates: readonly OrderCandidate[];
  readonly nowYear: number;
  readonly freeCompute: number;
  /** How many missions this seat already holds, against MAX_MISSIONS_PER_TOKEN. */
  readonly missionCount: number;
  /** Stars where a mission of the dispatched kind is already live. A second
   *  instrument on the same star is the same refusal `onLaunchMission` makes
   *  by hand, made here on the player's behalf. */
  readonly liveOnStarIds: ReadonlySet<string>;
}

/**
 * FOLDS THIS SEND'S FIRINGS INTO THE STORED ORDER RECORD. Returns the SAME
 * ARRAY BY IDENTITY when nothing fired, which is how cohort.ts knows whether
 * it owes a write (studies.ts's `settleTripwires` contract).
 *
 * Priced at fire time, and the arming is spent whatever the price says. The
 * order of the three outcomes is not arbitrary: `blocked` is decided first
 * because it is about whether the dispatch is even wanted (there is already an
 * instrument there, or the work list is full), and only then is the pool asked
 * whether it can pay. A blocked order that also could not have paid reports
 * the reason that would have stopped it first.
 */
export function settleStandingOrders(input: SettleOrdersInput): {
  readonly orders: readonly StoredOrder[];
  readonly firings: readonly OrderFiring[];
} {
  const firings: OrderFiring[] = [];
  let freeCompute = input.freeCompute;
  let missionCount = input.missionCount;
  const liveOnStarIds = new Set(input.liveOnStarIds);
  let changed = false;

  const next = input.orders.map((order) => {
    if (order.firedYear !== null) return order;
    const def = orderClassById(order.orderClass);
    if (def === undefined) return order;
    const found = warmMovementTarget(input.candidates, order.armedYear, def.radiusLy);
    if (found === null) return order;

    const blocked = liveOnStarIds.has(found.candidate.starId) || missionCount >= MAX_MISSIONS_PER_TOKEN;
    const outcome: OrderOutcome = blocked
      ? "blocked"
      : freeCompute + EPS < def.costCompute
        ? "unaffordable"
        : "launched";
    if (outcome === "launched") {
      freeCompute -= def.costCompute;
      missionCount += 1;
      liveOnStarIds.add(found.candidate.starId);
    }
    firings.push({
      orderClass: def.orderClass,
      outcome,
      missionKind: def.missionKind,
      starId: found.candidate.starId,
      targetCivId: found.candidate.targetCivId,
      distanceLy: found.candidate.distanceLy,
      costCompute: def.costCompute,
      charter: order.charter,
      evidenceAgeYears: input.nowYear - found.fromYear,
    });
    changed = true;
    return {
      ...order,
      firedYear: input.nowYear,
      firedStarId: found.candidate.starId,
      outcome,
      evidenceAgeYears: input.nowYear - found.fromYear,
    };
  });

  return { orders: changed ? next : input.orders, firings };
}

/** Every class, always, with the state the server computed. A class with no
 *  stored arming is "available"; the client's own labels are its own. */
export function toWireOrders(orders: readonly StoredOrder[]): readonly StandingOrderWire[] {
  return ORDER_CLASSES.map((def) => {
    const armed = orders.find((o) => o.orderClass === def.orderClass);
    return {
      orderClass: def.orderClass,
      label: def.label,
      line: def.line,
      state:
        armed === undefined
          ? ("available" as const)
          : armed.firedYear !== null
            ? ("fired" as const)
            : ("armed" as const),
      armedYear: armed?.armedYear ?? null,
      firedYear: armed?.firedYear ?? null,
      firedStarId: armed?.firedStarId ?? null,
      outcome: armed?.outcome ?? null,
      evidenceAgeYears: armed?.evidenceAgeYears ?? null,
      charter: armed?.charter ?? [],
      costCompute: def.costCompute,
      radiusLy: def.radiusLy,
    };
  });
}
