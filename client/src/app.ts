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

type ScreenCleanup = () => void;

export class App {
  private readonly root: HTMLElement;
  private readonly socket: CohortSocket;
  private currentCleanup: ScreenCleanup | null = null;
  private mountedScreen: "none" | "ceremony" | "sky" = "none";

  private catalog: readonly Star[] = [];
  private model: Model | null = null;

  constructor(root: HTMLElement, socket: CohortSocket) {
    this.root = root;
    this.socket = socket;
    this.socket.onMessage((message) => this.handleMessage(message));
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
        this.showSky(message.self, message.sources);
        break;
      case "sourceNamed":
      case "error":
        // Handled by whichever screen is mounted (e.g. ceremony subscribes to
        // the socket directly for become-rejection errors).
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
    this.mount(() => renderCeremony(this.root, candidates, this.socket));
  }

  private showSky(self: SelfView, sources: readonly DetectedSource[]): void {
    // Later sky messages (another civ joined → a new source) just update.
    if (this.mountedScreen === "sky" && this.model !== null) {
      this.model.setSky(self, sources);
      return;
    }

    // First sky this session: decide the opening beat before clearing the
    // marker, then mount the Model.
    const mode: "pullback" | "resume" = hasPendingBecome() ? "pullback" : "resume";
    this.mountedScreen = "sky";
    this.mount(() => {
      const model = new Model(this.root, this.catalog);
      this.model = model;
      model.onSelectSource((source) => {
        // Slice 6 opens the source card from this callback. No-op for now.
        void source;
      });
      model.setSky(self, sources);
      model.enter(mode);
      clearPendingBecome();
      return () => {
        model.destroy();
        if (this.model === model) this.model = null;
      };
    });
  }
}
