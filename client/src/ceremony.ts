// The inheritance ceremony (concepts/03-00-inheritance.png,
// concepts/03-00b-become-hold.png). DOM, not canvas — "canvas for places,
// DOM for prose". A vertical carousel of CivCards; the focused card is the
// full read, neighbors peek (world + species + archetype only); holding
// BECOME for ~1200ms commits the player's civilization.

import {
  DIAL_AXES,
  MAX_NAME_LEN,
  validateName,
  type CivCard,
  type DialAxis,
  type DialSetting,
} from "@holos/protocol";
import type { CohortSocket } from "./net";

const HOLD_MS = 1200;
const PENDING_KEY = "holos.pendingBecome";
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface PendingBecome {
  readonly candidateId: string;
  readonly name: string;
}

function readPending(): PendingBecome | null {
  const raw = localStorage.getItem(PENDING_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>)["candidateId"] === "string" &&
      typeof (parsed as Record<string, unknown>)["name"] === "string"
    ) {
      return parsed as PendingBecome;
    }
  } catch {
    /* fall through */
  }
  return null;
}

function writePending(pending: PendingBecome): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

function clearPending(): void {
  localStorage.removeItem(PENDING_KEY);
}

/** Called by the router once the player is confirmed placed, so a stale
 * in-flight marker never lingers past a successful `become`. */
export function clearPendingBecome(): void {
  clearPending();
}

/** True when a `become` was committed this session but not yet consumed by
 * the sky — the router reads this to choose the pull-back vs. resume beat. */
export function hasPendingBecome(): boolean {
  return readPending() !== null;
}

/** Placeholder world panel: a gradient tinted by the cradle id. Real planet
 * art is deferred to a later slice. */
function cradleGradient(cradleId: number): string {
  const hue = (cradleId * 47) % 360;
  return (
    `radial-gradient(120% 90% at 50% 15%, hsl(${hue} 50% 24%) 0%, ` +
    `hsl(${hue} 42% 11%) 55%, #050308 100%)`
  );
}

function dialPct(position: number): number {
  return ((position + 1) / 2) * 100;
}

/** Reusable dial-band row: pole labels (in-world only) + earned position +
 * the allowed range band it was drawn from. */
function renderDialBand(axis: DialAxis, setting: DialSetting): HTMLElement {
  const row = document.createElement("div");
  row.className = "dial-row";

  const left = document.createElement("span");
  left.className = "dial-pole dial-pole--left";
  left.textContent = axis.left.inWorld;

  const track = document.createElement("div");
  track.className = "dial-track";

  const range = document.createElement("div");
  range.className = "dial-range";
  const minPct = dialPct(setting.min);
  const maxPct = dialPct(setting.max);
  range.style.left = `${minPct}%`;
  range.style.width = `${Math.max(0, maxPct - minPct)}%`;

  const marker = document.createElement("div");
  marker.className = "dial-marker";
  marker.style.left = `${dialPct(setting.position)}%`;

  track.append(range, marker);

  const right = document.createElement("span");
  right.className = "dial-pole dial-pole--right";
  right.textContent = axis.right.inWorld;

  row.append(left, track, right);
  return row;
}

interface CardState {
  readonly card: CivCard;
  readonly el: HTMLElement;
  readonly nameInput: HTMLInputElement;
  readonly nameHint: HTMLElement;
  readonly becomeButton: HTMLButtonElement;
  readonly ringFill: SVGCircleElement;
  readonly glyph: HTMLElement;
  holding: boolean;
  committed: boolean;
  holdStart: number;
  raf: number | null;
}

function setRingProgress(state: CardState, progress: number): void {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
  state.ringFill.style.strokeDashoffset = String(offset);
}

function updateBecomeEnabled(state: CardState): void {
  const value = state.nameInput.value;
  const valid = validateName(value) !== null;
  state.becomeButton.disabled = !valid || state.committed;
  if (value.length > 0 && !valid) {
    state.nameHint.textContent = `Name must be 1–${MAX_NAME_LEN} characters.`;
    state.nameHint.classList.add("visible");
  } else {
    state.nameHint.textContent = "";
    state.nameHint.classList.remove("visible");
  }
}

function buildCard(card: CivCard): CardState {
  const el = document.createElement("div");
  el.className = "civ-card";

  const scroll = document.createElement("div");
  scroll.className = "civ-card-scroll";

  const worldPanel = document.createElement("div");
  worldPanel.className = "world-panel";
  worldPanel.style.background = cradleGradient(card.seed.cradleId);

  const body = document.createElement("div");
  body.className = "card-body";

  // Always visible (peek + focused): the identity read — cradle + lineage
  // lines of the chronicle, plus the archetype name/first-read. Everything
  // else lives in .detail-extra, hidden for unfocused neighbors.
  const identity = document.createElement("div");
  identity.className = "chronicle chronicle-identity";
  for (const line of card.seed.chronicle.slice(0, 2)) {
    const p = document.createElement("p");
    p.textContent = line;
    identity.append(p);
  }

  const archetypeName = document.createElement("div");
  archetypeName.className = "archetype-name holos-serif";
  archetypeName.textContent = card.archetypeName;

  const archetypeFirstRead = document.createElement("div");
  archetypeFirstRead.className = "chronicle";
  archetypeFirstRead.style.textAlign = "center";
  archetypeFirstRead.textContent = card.archetypeFirstRead;

  const detailExtra = document.createElement("div");
  detailExtra.className = "detail-extra";

  const restOfChronicle = card.seed.chronicle.slice(2);
  if (restOfChronicle.length > 0) {
    const rest = document.createElement("div");
    rest.className = "chronicle";
    for (const line of restOfChronicle) {
      const p = document.createElement("p");
      p.textContent = line;
      rest.append(p);
    }
    detailExtra.append(rest);
  }

  const dialSheet = document.createElement("div");
  dialSheet.className = "dial-sheet";
  for (const axis of DIAL_AXES) {
    dialSheet.append(renderDialBand(axis, card.seed.dials[axis.id]));
  }
  detailExtra.append(dialSheet);

  const charter = document.createElement("div");
  charter.className = "charter";
  charter.textContent = `"${card.seed.charter}"`;
  detailExtra.append(charter);

  const nameField = document.createElement("div");
  nameField.className = "name-field";
  const nameCaption = document.createElement("div");
  nameCaption.className = "holos-caps";
  nameCaption.textContent = "Name your civilization";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = MAX_NAME_LEN * 2; // allow raw typing; validateName trims/collapses
  nameInput.autocomplete = "off";
  nameInput.spellcheck = false;
  const nameHint = document.createElement("div");
  nameHint.className = "name-hint";
  nameField.append(nameCaption, nameInput, nameHint);
  detailExtra.append(nameField);

  const becomeWrap = document.createElement("div");
  becomeWrap.className = "become-wrap";
  const becomeButton = document.createElement("button");
  becomeButton.type = "button";
  becomeButton.className = "become-button";
  becomeButton.textContent = "Become";
  becomeButton.disabled = true;

  const ringWrap = document.createElement("div");
  ringWrap.className = "become-ring-wrap";
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  const track = document.createElementNS(svgNS, "circle");
  track.setAttribute("class", "become-ring-track");
  track.setAttribute("cx", "24");
  track.setAttribute("cy", "24");
  track.setAttribute("r", String(RING_RADIUS));
  const fill = document.createElementNS(svgNS, "circle");
  fill.setAttribute("class", "become-ring-fill");
  fill.setAttribute("cx", "24");
  fill.setAttribute("cy", "24");
  fill.setAttribute("r", String(RING_RADIUS));
  fill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  fill.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
  svg.append(track, fill);
  const glyph = document.createElement("div");
  glyph.className = "become-glyph";
  ringWrap.append(svg, glyph);

  becomeWrap.append(becomeButton, ringWrap);
  detailExtra.append(becomeWrap);

  body.append(identity, archetypeName, archetypeFirstRead, detailExtra);
  scroll.append(worldPanel, body);
  el.append(scroll);

  return {
    card,
    el,
    nameInput,
    nameHint,
    becomeButton,
    ringFill: fill,
    glyph,
    holding: false,
    committed: false,
    holdStart: 0,
    raf: null,
  };
}

/**
 * Mounts the ceremony into `root`. Returns a cleanup function (unsubscribes
 * from the socket) for the router to call on screen swap.
 */
export function renderCeremony(
  root: HTMLElement,
  candidates: readonly CivCard[],
  socket: CohortSocket,
): () => void {
  const ceremony = document.createElement("div");
  ceremony.className = "ceremony";

  const carousel = document.createElement("div");
  carousel.className = "ceremony-carousel";

  const topSpacer = document.createElement("div");
  topSpacer.className = "ceremony-spacer";
  const bottomSpacer = document.createElement("div");
  bottomSpacer.className = "ceremony-spacer";

  const slots: HTMLElement[] = [];
  const cardStates: CardState[] = [];

  for (const card of candidates) {
    const state = buildCard(card);
    cardStates.push(state);

    const slot = document.createElement("div");
    slot.className = "card-slot";
    slot.append(state.el);
    slots.push(slot);
  }

  carousel.append(topSpacer, ...slots, bottomSpacer);
  ceremony.append(carousel);
  root.append(ceremony);

  let focusedIndex = 0;

  function setFocus(index: number): void {
    focusedIndex = index;
    cardStates.forEach((state, i) => {
      state.el.classList.toggle("focused", i === index);
    });
  }

  function nearestIndexToCenter(): number {
    const carouselRect = carousel.getBoundingClientRect();
    const centerY = carouselRect.top + carouselRect.height / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    slots.forEach((slot, i) => {
      const r = slot.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  let scrollRaf: number | null = null;
  function onScroll(): void {
    if (scrollRaf !== null) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      const idx = nearestIndexToCenter();
      if (idx !== focusedIndex) setFocus(idx);
    });
  }
  carousel.addEventListener("scroll", onScroll, { passive: true });

  cardStates.forEach((state, i) => {
    state.el.addEventListener("click", () => {
      if (focusedIndex === i) return;
      const slot = slots[i];
      if (slot === undefined) return;
      slot.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  // Restore an in-flight commit across a refresh (best-effort: we cannot
  // know whether the original `become` reached the server, so we just show
  // the same optimistic beat again rather than flashing an interactive
  // ceremony back at the player mid-commit).
  const pending = readPending();
  if (pending !== null) {
    const idx = cardStates.findIndex((s) => s.card.candidateId === pending.candidateId);
    if (idx !== -1) {
      const state = cardStates[idx];
      if (state !== undefined) {
        state.committed = true;
        state.nameInput.value = pending.name;
        state.becomeButton.disabled = true;
        state.el.classList.add("committing");
        state.glyph.classList.add("committing");
        setRingProgress(state, 1);
      }
    }
  }

  setFocus(0);
  // Center the first card without an animated jump on first paint.
  requestAnimationFrame(() => {
    const first = slots[0];
    if (first !== undefined) first.scrollIntoView({ block: "center" });
  });

  function commit(state: CardState): void {
    state.holding = false;
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
    const name = validateName(state.nameInput.value);
    if (name === null) return; // guarded by disabled button; defensive only
    state.committed = true;
    state.becomeButton.disabled = true;
    writePending({ candidateId: state.card.candidateId, name });
    state.el.classList.add("committing");
    state.glyph.classList.add("committing");
    socket.send({ type: "become", candidateId: state.card.candidateId, name });
  }

  function startHold(state: CardState): void {
    if (state.committed || state.becomeButton.disabled) return;
    state.holding = true;
    state.holdStart = performance.now();
    const step = (t: number): void => {
      if (!state.holding) return;
      const progress = (t - state.holdStart) / HOLD_MS;
      setRingProgress(state, progress);
      if (progress >= 1) {
        commit(state);
        return;
      }
      state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  function cancelHold(state: CardState): void {
    if (!state.holding) return;
    state.holding = false;
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
    setRingProgress(state, 0);
  }

  const holdCleanups: Array<() => void> = [];
  for (const state of cardStates) {
    const onPointerDown = (e: PointerEvent): void => {
      e.preventDefault();
      state.becomeButton.setPointerCapture(e.pointerId);
      startHold(state);
    };
    const onPointerUp = (): void => cancelHold(state);
    const onPointerCancel = (): void => cancelHold(state);
    const onInput = (): void => {
      // Typing again after a server rejection re-enables the field.
      updateBecomeEnabled(state);
    };

    state.becomeButton.addEventListener("pointerdown", onPointerDown);
    state.becomeButton.addEventListener("pointerup", onPointerUp);
    state.becomeButton.addEventListener("pointercancel", onPointerCancel);
    state.nameInput.addEventListener("input", onInput);

    holdCleanups.push(() => {
      state.becomeButton.removeEventListener("pointerdown", onPointerDown);
      state.becomeButton.removeEventListener("pointerup", onPointerUp);
      state.becomeButton.removeEventListener("pointercancel", onPointerCancel);
      state.nameInput.removeEventListener("input", onInput);
    });

    updateBecomeEnabled(state);
  }

  const unsubscribe = socket.onMessage((message) => {
    if (message.type !== "error") return;
    if (message.code !== "bad-name" && message.code !== "unknown-candidate" && message.code !== "cohort-full") {
      return;
    }
    const currentPending = readPending();
    if (currentPending === null) return;
    const state = cardStates.find((s) => s.card.candidateId === currentPending.candidateId);
    if (state === undefined) return;

    // Reverse the optimistic commit beat and surface the reason inline.
    clearPending();
    state.committed = false;
    state.el.classList.remove("committing");
    state.glyph.classList.remove("committing");
    setRingProgress(state, 0);
    state.nameHint.textContent = message.message;
    state.nameHint.classList.add("visible");
    updateBecomeEnabled(state);
  });

  return () => {
    unsubscribe();
    carousel.removeEventListener("scroll", onScroll);
    if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
    for (const cleanup of holdCleanups) cleanup();
    for (const state of cardStates) {
      if (state.raf !== null) cancelAnimationFrame(state.raf);
    }
  };
}
