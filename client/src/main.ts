import { Application, Graphics } from "pixi.js";
import PartySocket from "partysocket";
import {
  parseServerMessage,
  type ClientMessage,
  type PlayerState,
} from "@holos/protocol";

const MOVE_SEND_INTERVAL_MS = 50;
const DOT_RADIUS = 18;
const LERP_FACTOR = 0.25;

interface Dot {
  state: PlayerState;
  gfx: Graphics;
}

async function main(): Promise<void> {
  const container = document.getElementById("app");
  if (container === null) throw new Error("Missing #app container");

  const app = new Application();
  await app.init({
    resizeTo: container,
    background: 0x0b0f1a,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  container.appendChild(app.canvas);

  // In production the game server is this same Worker, so connect to our
  // own origin. In dev, Vite (5173) and `wrangler dev` (8787) are separate
  // processes; VITE_PARTYKIT_HOST overrides for LAN/phone testing.
  const socket = new PartySocket({
    host:
      import.meta.env.VITE_PARTYKIT_HOST ??
      (import.meta.env.DEV ? "localhost:8787" : window.location.host),
    party: "room",
    room: "main",
  });

  const dots = new Map<string, Dot>();
  let selfId: string | null = null;

  function addDot(state: PlayerState): void {
    const gfx = new Graphics().circle(0, 0, DOT_RADIUS).fill(state.color);
    gfx.position.set(state.x * app.screen.width, state.y * app.screen.height);
    app.stage.addChild(gfx);
    dots.set(state.id, { state, gfx });
  }

  function removeDot(id: string): void {
    const dot = dots.get(id);
    if (dot === undefined) return;
    dot.gfx.destroy();
    dots.delete(id);
  }

  socket.addEventListener("message", (event: MessageEvent) => {
    if (typeof event.data !== "string") return;
    const msg = parseServerMessage(event.data);
    if (msg === null) return;

    switch (msg.type) {
      case "sync": {
        selfId = msg.self;
        for (const id of dots.keys()) removeDot(id);
        for (const player of msg.players) addDot(player);
        break;
      }
      case "join": {
        removeDot(msg.player.id);
        addDot(msg.player);
        break;
      }
      case "move": {
        const dot = dots.get(msg.id);
        if (dot === undefined) return;
        dot.state.x = msg.x;
        dot.state.y = msg.y;
        break;
      }
      case "leave": {
        removeDot(msg.id);
        break;
      }
    }
  });

  // Pointer input: while pressed, send the (normalized) pointer position as
  // a move intent, throttled. The server echoes authoritative positions back.
  let pointerActive = false;
  let pendingMove: ClientMessage | null = null;
  let lastSentAt = 0;

  function queueMove(clientX: number, clientY: number): void {
    pendingMove = {
      type: "move",
      x: clientX / app.screen.width,
      y: clientY / app.screen.height,
    };
  }

  const canvas = app.canvas;
  canvas.addEventListener("pointerdown", (e) => {
    pointerActive = true;
    canvas.setPointerCapture(e.pointerId);
    queueMove(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointerActive) return;
    queueMove(e.clientX, e.clientY);
  });
  const endPointer = (): void => {
    pointerActive = false;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  app.ticker.add(() => {
    const now = performance.now();
    if (
      pendingMove !== null &&
      socket.readyState === WebSocket.OPEN &&
      now - lastSentAt >= MOVE_SEND_INTERVAL_MS
    ) {
      socket.send(JSON.stringify(pendingMove));
      pendingMove = null;
      lastSentAt = now;
    }

    for (const { state, gfx } of dots.values()) {
      const targetX = state.x * app.screen.width;
      const targetY = state.y * app.screen.height;
      gfx.position.set(
        gfx.position.x + (targetX - gfx.position.x) * LERP_FACTOR,
        gfx.position.y + (targetY - gfx.position.y) * LERP_FACTOR,
      );
      gfx.alpha = state.id === selfId ? 1 : 0.85;
    }
  });
}

void main();
