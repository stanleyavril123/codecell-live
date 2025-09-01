import * as http from "http";
import { WebSocket } from "ws";
import { customAlphabet } from "nanoid";
import { parseIncoming, Outgoing } from "../shared/messages";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

type Sess = {
  id: string;
  padId: string | null;
  userId: string | null;
  name: string | null;
  lastPong: number;
};

type Client = { ws: WebSocket; sess: Sess; color: string };

type Room = { clients: Map<string, Client>; colors: Map<string, string> };

const rooms = new Map<string, Room>();

const color_palette = [
  "#60a5fa",
  "#f472b6",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#f97316",
];

function getRoom(padId: string): Room {
  let room = rooms.get(padId);
  if (!room) {
    room = { clients: new Map(), colors: new Map() };
    rooms.set(padId, room);
  }
  return room;
}

function assignColor(room: Room, userId: string): string {
  let color = room.colors.get(userId);
  if (!color) {
    color = color_palette[room.colors.size % color_palette.length];
    room.colors.set(userId, color);
  }
  return color;
}

function broadcast(
  padId: string,
  msg: Outgoing,
  senderId: string | null = null,
): void {
  const room = rooms.get(padId);
  if (!room) return;
  const str = JSON.stringify(msg);
  for (const [clientId, client] of room.clients) {
    if (clientId === senderId) continue;
    try {
      client.ws.send(str);
    } catch {}
  }
}

function cleanup(sess: Sess): void {
  if (!sess.padId || !sess.userId) return;
  const room = rooms.get(sess.padId);
  if (!room) return;
  if (room.clients.delete(sess.userId)) {
    broadcast(sess.padId, { tag: "peer-leave", userId: sess.userId });
  }
}

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  const sess: Sess = {
    id: nanoid(),
    padId: null,
    userId: null,
    name: null,
    lastPong: Date.now(),
  };
  ws.on("message", (raw) => {});
});
