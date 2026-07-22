// Tiny screen router. Holds the latest CohortServerMessage-derived state and
// swaps the mounted view: the inheritance ceremony or the Model (the 3D sky).
//
// The Model mounts on the first `sky` message (which carries the SelfView and
// the detected sources); the star catalog is retained from `welcome`. The
// pull-back-vs-resume decision lives here: a `sky` that arrives while a
// `become` this session is still pending → the one-shot "pullback"; any other
// placed sky (a reconnect/resume) → "resume".

import type {
  CohortServerMessage,
  CivCard,
  DetectedSource,
  SelfView,
  Star,
} from "@holos/protocol";
import type { CohortSocket } from "./net";
import { clearPendingBecome, hasPendingBecome, renderCeremony } from "./ceremony";
import { Model } from "./model";
import { SourceCard } from "./sourcecard";

type ScreenCleanup = () => void;

export class App {
  private readonly root: HTMLElement;
  private readonly socket: CohortSocket;
  private currentCleanup: ScreenCleanup | null = null;
  private mountedScreen: "none" | "ceremony" | "sky" = "none";

  private catalog: readonly Star[] = [];
  private model: Model | null = null;
  private sourceCard: SourceCard | null = null;

  // The canonical client-side store of the player's private source labels —
  // one Map instance, mutated in place from `sky` (wholesale replace) and
  // `sourceNamed` (single-key update), and shared by reference with
  // whichever SourceCard is currently mounted.
  private readonly localNames = new Map<string, string>();

  constructor(root: HTMLElement, socket: CohortSocket) {
    this.root = root;
    this.socket = socket;
    this.socket.onMessage((message) => this.handleMessage(message));

    // Calm-cadence refresh: the phone slept and light moved on without us.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.mountedScreen === "sky") {
        this.socket.send({ type: "requestSky" });
      }
    });
  }

  private handleMessage(message: CohortServerMessage): void {
    switch (message.type) {
      case "welcome":
        // Retain the public catalog; the sky renders sources at their catalog
        // star's position. A placed welcome is followed immediately by `sky`,
        // which is what actually mounts the Model.
        this.catalog = message.catalog;
        break;
      case "offer":
        this.showCeremony(message.candidates);
        break;
      case "sky":
        this.localNames.clear();
        for (const [starId, name] of Object.entries(message.localNames)) {
          this.localNames.set(starId, name);
        }
        this.showSky(message.self, message.sources);
        break;
      case "sourceNamed":
        if (message.name === "") this.localNames.delete(message.starId);
        else this.localNames.set(message.starId, message.name);
        this.sourceCard?.handleServerMessage(message);
        break;
      case "error":
        // The ceremony subscribes to the socket directly for become-
        // rejection errors; the source card only reacts while it has a
        // nameSource request in flight, so forwarding unconditionally is
        // safe even outside the sky screen.
        this.sourceCard?.handleServerMessage(message);
        break;
    }
  }

  private mount(render: () => ScreenCleanup | void): void {
    this.currentCleanup?.();
    this.root.innerHTML = "";
    const cleanup = render();
    this.currentCleanup = cleanup ?? null;
  }

  private showCeremony(candidates: readonly CivCard[]): void {
    if (this.mountedScreen === "ceremony") return;
    this.mountedScreen = "ceremony";
    this.model = null;
    this.sourceCard = null;
    this.mount(() => renderCeremony(this.root, candidates, this.socket));
  }

  private showSky(self: SelfView, sources: readonly DetectedSource[]): void {
    // Later sky messages (another civ joined, or the calm-cadence refresh)
    // just update the Model and, if a card is open, its live source data.
    if (this.mountedScreen === "sky" && this.model !== null) {
      this.model.setSky(self, sources);
      this.sourceCard?.setLocalNames(this.localNames);
      const openId = this.sourceCard?.currentStarId() ?? null;
      if (openId !== null) {
        const updated = sources.find((s) => s.starId === openId);
        if (updated !== undefined) this.sourceCard?.setSource(updated);
        // else: the Model's setSky above already fired onSelectSource(null)
        // for a selection that no longer corresponds to a live source.
      }
      return;
    }

    // First sky this session: decide the opening beat before clearing the
    // marker, then mount the Model + its source card.
    const mode: "pullback" | "resume" = hasPendingBecome() ? "pullback" : "resume";
    this.mountedScreen = "sky";
    this.mount(() => {
      const model = new Model(this.root, this.catalog);
      const sourceCard = new SourceCard(this.root, this.socket);
      this.model = model;
      this.sourceCard = sourceCard;

      model.onSelectSource((source) => {
        if (source === null) sourceCard.close();
        else sourceCard.open(source, this.localNames);
      });
      sourceCard.onClose(() => model.clearSelection());

      model.setSky(self, sources);
      model.enter(mode);
      clearPendingBecome();
      return () => {
        model.destroy();
        sourceCard.destroy();
        if (this.model === model) this.model = null;
        if (this.sourceCard === sourceCard) this.sourceCard = null;
      };
    });
  }
}
