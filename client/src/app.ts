// Tiny screen router. Holds the latest CohortServerMessage-derived state
// and swaps the mounted view: the inheritance ceremony (this slice) or a
// placeholder sky stub (slice 6 replaces it with the Model + source card).
// Later slices drop in model.ts / sourcecard.ts behind showSky() without
// restructuring this file.

import type { CivCard, CohortServerMessage } from "@holos/protocol";
import type { CohortSocket } from "./net";
import { clearPendingBecome, renderCeremony } from "./ceremony";

type ScreenCleanup = () => void;

export class App {
  private readonly root: HTMLElement;
  private readonly socket: CohortSocket;
  private currentCleanup: ScreenCleanup | null = null;
  private mountedScreen: "none" | "ceremony" | "sky" = "none";

  constructor(root: HTMLElement, socket: CohortSocket) {
    this.root = root;
    this.socket = socket;
    this.socket.onMessage((message) => this.handleMessage(message));
  }

  private handleMessage(message: CohortServerMessage): void {
    switch (message.type) {
      case "welcome":
        if (message.phase === "placed") this.showSky();
        break;
      case "offer":
        this.showCeremony(message.candidates);
        break;
      case "sky":
        this.showSky();
        break;
      case "sourceNamed":
      case "error":
        // Handled by whichever screen is mounted (e.g. ceremony subscribes
        // to the socket directly for become-rejection errors).
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
    this.mount(() => renderCeremony(this.root, candidates, this.socket));
  }

  private showSky(): void {
    clearPendingBecome();
    if (this.mountedScreen === "sky") return;
    this.mountedScreen = "sky";
    this.mount(() => {
      const stub = document.createElement("div");
      stub.className = "sky-stub";
      stub.textContent = "the sky";
      this.root.append(stub);
    });
  }
}
