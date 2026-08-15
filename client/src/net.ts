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
const ACCOUNT_KEY = "holos.account";

const PARTY = "cohort";
const ROOM = "genesis";

/**
 * Where the Cohort answers. Dev runs Vite (5173) and `wrangler dev` (8787)
 * as separate processes, so dev defaults to localhost:8787 unless overridden
 * for LAN/phone testing; production serves client + server from one origin.
 */
function cohortHost(): string {
  return (
    import.meta.env.VITE_PARTYKIT_HOST ??
    (import.meta.env.DEV ? "localhost:8787" : window.location.host)
  );
}

/** A URL on the Cohort's HTTP surface — same host, party and room the
 *  socket below connects to, so the two can never drift apart. */
export function cohortUrl(path: string): string {
  return `${window.location.protocol}//${cohortHost()}/parties/${PARTY}/${ROOM}/${path}`;
}


/**
 * A2.6, DURABLE IDENTITY: this device holds ONE of these two, never both.
 *
 *  - `holos.token` is the anonymous seat id. It is a credential only while the
 *    seat is unclaimed; the moment an account exists the server refuses it
 *    (`token-claimed`), so keeping it would only ever mean offering a dead
 *    credential on every reconnect.
 *  - `holos.account` is the account key: a bearer secret that travels in the
 *    body of the `hello` frame over TLS and never in a URL.
 *
 * The XOR is maintained here and nowhere else — every write below either sets
 * one and clears the other, or leaves both alone.
 */
export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** The account key this device holds, if it has been claimed or signed into. */
export function readStoredAccount(): string | null {
  return localStorage.getItem(ACCOUNT_KEY);
}

/** Forget who this browser is. The next `hello` mints a fresh identity, so
 *  the caller had better mean it — see startover.ts, the only caller. */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Adopt a key: the account becomes this device's credential and the seat id
 *  stops being one. Both halves happen together, which is what makes the XOR
 *  above a property rather than a habit. */
function storeAccount(key: string): void {
  localStorage.setItem(ACCOUNT_KEY, key);
  clearToken();
}

export type CohortMessageListener = (message: CohortServerMessage) => void;

/**
 * Thin typed wrapper around partysocket. Owns the CREDENTIAL round-trip — send
 * what this device holds on `hello`, persist what comes back — and hands out a
 * subscribe/callback API so screens never touch the raw WebSocket.
 */
export class CohortSocket {
  private readonly socket: PartySocket;
  private readonly listeners = new Set<CohortMessageListener>();
  /**
   * A key submitted by `signIn` and not yet proved. It is held here rather
   * than written straight to storage because a wrong key must not become this
   * device's identity: it is committed only when a `welcome` comes back saying
   * the server accepted it, and dropped on `bad-account`.
   */
  private pendingAccount: string | null = null;

  constructor() {
    this.socket = new PartySocket({
      host: cohortHost(),
      party: PARTY,
      room: ROOM,
    });

    this.socket.addEventListener("open", () => {
      this.sendHello();
    });

    this.socket.addEventListener("message", (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      const message = parseCohortServerMessage(event.data);
      if (message === null) return;

      this.absorbCredentials(message);

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

  /**
   * A2.6: sign in with an account key ON THE LIVE SOCKET. There is no
   * reconnect and no reload — `hello` is answerable at any time, and the
   * server's precedence rule (a non-null account ignores the token whole)
   * makes the outcome the same whatever this device was holding a moment ago.
   *
   * The RAW typing is sent: folding and validating a key is
   * `normalizeAccountKey`'s job, on the server, where the answer is
   * authoritative.
   */
  signIn(key: string): void {
    this.pendingAccount = key;
    this.send({ type: "hello", token: null, account: key });
  }

  /**
   * THE PRECEDENCE, client side: if this device holds an account key it sends
   * that and NO token. The two are never sent together, so the server's rule
   * and this one cannot disagree about which credential a session used.
   */
  private sendHello(): void {
    const account = readStoredAccount();
    this.send({
      type: "hello",
      token: account === null ? readStoredToken() : null,
      account,
    });
  }

  /** Everything that writes a credential to this device, in one place. */
  private absorbCredentials(message: CohortServerMessage): void {
    if (message.type === "welcome") {
      // Non-null ONLY on an anonymous welcome: an account-authenticated
      // session is told nothing to store, because it already holds the one
      // credential it should have.
      if (message.token !== null) storeToken(message.token);
      if (message.account) {
        // The server accepted a key for this seat. If this session is the one
        // that submitted it, that is the moment it becomes ours.
        if (this.pendingAccount !== null) storeAccount(this.pendingAccount);
        else clearToken();
        this.pendingAccount = null;
      } else {
        this.pendingAccount = null;
      }
      return;
    }
    // The claim ceremony and the quiet re-read both land here, and either one
    // means this device holds an account: adopting the key on both is what
    // makes a claim survive the reload the player is about to do.
    if (message.type === "accountKey") {
      storeAccount(message.key);
      return;
    }
    if (message.type === "error") {
      // The seat this token names now belongs to an account. The token is
      // spent, and the client task's re-onboarding sheet takes it from here.
      if (message.code === "token-claimed") clearToken();
      // A key that was not accepted never becomes this device's identity.
      if (message.code === "bad-account") this.pendingAccount = null;
    }
  }
}
