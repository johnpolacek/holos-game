import {
  Server,
  routePartykitRequest,
  type Connection,
  type WSMessage,
} from "partyserver";
import {
  parseClientMessage,
  type PlayerState,
  type ServerMessage,
} from "./protocol";

const COLORS = [
  0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x14b8a6, 0x3b82f6, 0x8b5cf6,
  0xec4899,
] as const;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function encode(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export { Cohort } from "./cohort";

interface Env {
  Room: DurableObjectNamespace;
  Cohort: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/**
 * The single authoritative game room, a Durable Object. All player state
 * lives here; clients only send move intents and render what the room
 * broadcasts. Reachable at /parties/room/:roomName (partyserver kebab-cases
 * the `Room` binding name into the URL).
 */
export class Room extends Server<Env> {
  private readonly players = new Map<string, PlayerState>();

  onConnect(conn: Connection): void {
    const player: PlayerState = {
      id: conn.id,
      x: 0.2 + Math.random() * 0.6,
      y: 0.2 + Math.random() * 0.6,
      color: COLORS[this.players.size % COLORS.length] ?? 0xffffff,
    };
    this.players.set(conn.id, player);

    conn.send(
      encode({ type: "sync", self: conn.id, players: [...this.players.values()] }),
    );
    this.broadcast(encode({ type: "join", player }), [conn.id]);
  }

  onMessage(sender: Connection, message: WSMessage): void {
    if (typeof message !== "string") return;
    const msg = parseClientMessage(message);
    if (msg === null) return;

    const player = this.players.get(sender.id);
    if (player === undefined) return;

    player.x = clamp01(msg.x);
    player.y = clamp01(msg.y);
    this.broadcast(
      encode({ type: "move", id: player.id, x: player.x, y: player.y }),
    );
  }

  onClose(conn: Connection): void {
    if (!this.players.delete(conn.id)) return;
    this.broadcast(encode({ type: "leave", id: conn.id }));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // WebSocket/game traffic under /parties/* goes to the Room; everything
    // else falls through to the static client assets.
    return (
      (await routePartykitRequest(request, env)) ?? env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
