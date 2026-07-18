import type * as Party from "partykit/server";
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

/**
 * The single authoritative game room. All player state lives here;
 * clients only send move intents and render what the room broadcasts.
 */
export default class Room implements Party.Server {
  private readonly players = new Map<string, PlayerState>();

  constructor(private readonly room: Party.Room) {}

  onConnect(conn: Party.Connection): void {
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
    this.room.broadcast(encode({ type: "join", player }), [conn.id]);
  }

  onMessage(message: string | ArrayBuffer, sender: Party.Connection): void {
    if (typeof message !== "string") return;
    const msg = parseClientMessage(message);
    if (msg === null) return;

    const player = this.players.get(sender.id);
    if (player === undefined) return;

    player.x = clamp01(msg.x);
    player.y = clamp01(msg.y);
    this.room.broadcast(
      encode({ type: "move", id: player.id, x: player.x, y: player.y }),
    );
  }

  onClose(conn: Party.Connection): void {
    if (!this.players.delete(conn.id)) return;
    this.room.broadcast(encode({ type: "leave", id: conn.id }));
  }
}

function encode(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

Room satisfies Party.Worker;
