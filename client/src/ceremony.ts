// The inheritance ceremony (concepts/03-00-inheritance.png). DOM, not canvas
// — "canvas for places, DOM for prose". A vertical carousel of CivCards; the
// focused card is the full read, neighbors peek (world + species + archetype
// only); clicking BECOME commits the player's civilization.

import {
  DIAL_AXES,
  MAX_NAME_LEN,
  NAME_HEADS,
  NAME_PHRASES,
  NAME_TAILS,
  validateName,
  type CivCard,
  type DialAxis,
  type DialSetting,
} from "@holos/protocol";
import { worldArt } from "./art";
import type { CohortSocket } from "./net";

const PENDING_KEY = "holos.pendingBecome";

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

/** Cradle-tinted gradient for the world panel — the base layer, shown on its
 * own for cradles without a plate (id 41) and as the fallback beneath the real
 * planet plate if it fails to load. */
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

/** Reusable dial band: pole labels (in-world only) + earned position + the
 * allowed range it was drawn from. Tapping the row expands an in-world
 * explanation — the axis question and what leaning each way means. */
function renderDialBand(axis: DialAxis, setting: DialSetting): HTMLElement {
  const item = document.createElement("div");
  item.className = "dial-item";

  const row = document.createElement("div");
  row.className = "dial-row";
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");
  row.setAttribute("aria-expanded", "false");

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

  const explain = document.createElement("div");
  explain.className = "dial-explain";
  const question = document.createElement("p");
  question.className = "dial-question";
  question.textContent = axis.question;
  explain.append(question);
  for (const pole of [axis.left, axis.right]) {
    const reading = document.createElement("p");
    reading.className = "dial-reading";
    const term = document.createElement("span");
    term.className = "dial-reading-term";
    term.textContent = pole.inWorld;
    reading.append(term, document.createTextNode(pole.gloss));
    explain.append(reading);
  }

  const toggle = (e: Event): void => {
    e.stopPropagation(); // don't re-trigger the card's focus/scroll handler
    const open = item.classList.toggle("open");
    row.setAttribute("aria-expanded", open ? "true" : "false");
  };
  row.addEventListener("click", toggle);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(e);
    }
  });

  item.append(row, explain);
  return item;
}

interface CardState {
  readonly card: CivCard;
  readonly el: HTMLElement;
  readonly nameInput: HTMLInputElement;
  readonly nameHint: HTMLElement;
  readonly becomeButton: HTMLButtonElement;
  committed: boolean;
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
  // The wide crop suits the panel's banner shape; the gradient sits under it as
  // a fallback so a missing/failed plate (or unplated cradle 41) still tints.
  const worldPlate = worldArt(card.seed.cradleId, "wide");
  const worldGradient = cradleGradient(card.seed.cradleId);
  worldPanel.style.background =
    worldPlate !== null
      ? `url("${worldPlate}") center / cover no-repeat, ${worldGradient}`
      : worldGradient;

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
  const dialHint = document.createElement("p");
  dialHint.className = "dial-hint";
  dialHint.textContent = "Tap a dial to read what it means.";
  dialSheet.append(dialHint);
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

  // Suggested names: the name this civilization already bore, plus fresh
  // pairings from the shared lexicon. Tapping a chip fills the field (still
  // editable); the field starts empty — naming stays the deliberate act.
  const chipsRow = document.createElement("div");
  chipsRow.className = "name-chips";
  const composeSuggestion = (taken: ReadonlySet<string>): string => {
    for (let attempt = 0; attempt < 10; attempt++) {
      // Two flavors in the pool: ~35% a phrase name, otherwise a head+tail
      // compound. Mirrors the server generator's dual pool.
      let name: string;
      if (Math.random() < 0.35) {
        name =
          NAME_PHRASES[Math.floor(Math.random() * NAME_PHRASES.length)] ??
          "A Rounding Error";
      } else {
        const head = NAME_HEADS[Math.floor(Math.random() * NAME_HEADS.length)] ?? "Dawn";
        const tail = NAME_TAILS[Math.floor(Math.random() * NAME_TAILS.length)] ?? "keepers";
        name = `${head}${tail}`;
      }
      if (!taken.has(name)) return name;
    }
    return `${NAME_HEADS[0] ?? "Stone"}${NAME_TAILS[0] ?? "binders"}`;
  };
  const makeChip = (name: string): HTMLButtonElement => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "name-chip";
    chip.textContent = name;
    chip.addEventListener("click", () => {
      nameInput.value = chip.textContent ?? "";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    return chip;
  };
  const inheritedChip = makeChip(card.seed.name);
  const rolledA = makeChip("");
  const rolledB = makeChip("");
  const reroll = (): void => {
    const taken = new Set([card.seed.name]);
    rolledA.textContent = composeSuggestion(taken);
    taken.add(rolledA.textContent ?? "");
    rolledB.textContent = composeSuggestion(taken);
  };
  reroll();
  const rerollButton = document.createElement("button");
  rerollButton.type = "button";
  rerollButton.className = "name-chip name-chip-reroll";
  rerollButton.textContent = "⟳";
  rerollButton.setAttribute("aria-label", "other names");
  rerollButton.addEventListener("click", reroll);
  chipsRow.append(inheritedChip, rolledA, rolledB, rerollButton);

  nameField.append(nameCaption, nameInput, chipsRow, nameHint);
  detailExtra.append(nameField);

  // Dramatic commit button: a single click/tap consummates the choice into
  // the cyan bloom on the card.
  const becomeWrap = document.createElement("div");
  becomeWrap.className = "become-wrap";
  const becomeButton = document.createElement("button");
  becomeButton.type = "button";
  becomeButton.className = "become-button";
  becomeButton.disabled = true;
  const becomeLabel = document.createElement("span");
  becomeLabel.className = "become-label";
  becomeLabel.textContent = "Become";
  becomeButton.append(becomeLabel);
  becomeWrap.append(becomeButton);
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
    committed: false,
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
        state.becomeButton.classList.add("committing");
        // Re-send the become: it is idempotent per token server-side (an
        // already-placed run just gets its sky again), so a commit lost to
        // a flaky network retries instead of freezing this card forever.
        socket.send({
          type: "become",
          candidateId: pending.candidateId,
          name: pending.name,
        });
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
    if (state.committed || state.becomeButton.disabled) return;
    const name = validateName(state.nameInput.value);
    if (name === null) return; // guarded by disabled button; defensive only
    state.committed = true;
    state.becomeButton.disabled = true;
    writePending({ candidateId: state.card.candidateId, name });
    state.el.classList.add("committing");
    state.becomeButton.classList.add("committing");
    socket.send({ type: "become", candidateId: state.card.candidateId, name });
  }

  const buttonCleanups: Array<() => void> = [];
  for (const state of cardStates) {
    const onClick = (): void => commit(state);
    const onInput = (): void => {
      // Typing again after a server rejection re-enables the field.
      updateBecomeEnabled(state);
    };

    state.becomeButton.addEventListener("click", onClick);
    state.nameInput.addEventListener("input", onInput);

    buttonCleanups.push(() => {
      state.becomeButton.removeEventListener("click", onClick);
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
    state.becomeButton.classList.remove("committing");
    state.nameHint.textContent = message.message;
    state.nameHint.classList.add("visible");
    updateBecomeEnabled(state);
  });

  return () => {
    unsubscribe();
    carousel.removeEventListener("scroll", onScroll);
    if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
    for (const cleanup of buttonCleanups) cleanup();
  };
}
