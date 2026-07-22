// CohortSocket — the one WebSocket connection to the Act 3 `Cohort` room.
//
// partyserver kebab-cases the class-name binding ("Cohort" -> "cohort"), so
// the party name below must stay lowercase to route correctly.

import PartySocket from "partysocket";
import {
  parseCohortServerMessage,
  type CohortClientMessage,
  type CohortServerMessage,
} from "@holos/protocol";

const TOKEN_KEY = "holos.token";

export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export type CohortMessageListener = (message: CohortServerMessage) => void;

/**
 * Thin typed wrapper around partysocket. Owns the token round-trip (send it
 * on `hello`, persist it the moment `welcome` arrives) and hands out a
 * subscribe/callback API so screens never touch the raw WebSocket.
 */
export class CohortSocket {
  private readonly socket: PartySocket;
  private readonly listeners = new Set<CohortMessageListener>();

  constructor() {
    this.socket = new PartySocket({
      // Mirrors the A0 dot-demo's host derivation: dev runs Vite (5173) and
      // `wrangler dev` (8787) as separate processes, so dev defaults to
      // localhost:8787 unless overridden for LAN/phone testing; production
      // serves client + server from the same origin.
      host:
        import.meta.env.VITE_PARTYKIT_HOST ??
        (import.meta.env.DEV ? "localhost:8787" : window.location.host),
      party: "cohort",
      room: "genesis",
    });

    this.socket.addEventListener("open", () => {
      this.send({ type: "hello", token: readStoredToken() });
    });

    this.socket.addEventListener("message", (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      const message = parseCohortServerMessage(event.data);
      if (message === null) return;

      if (message.type === "welcome") {
        storeToken(message.token);
      }

      for (const listener of this.listeners) listener(message);
    });
  }

  /** Subscribe to every parsed server message. Returns an unsubscribe fn. */
  onMessage(listener: CohortMessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(message: CohortClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}
