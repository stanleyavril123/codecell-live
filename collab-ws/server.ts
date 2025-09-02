import * as http from "http";
import { RawData, WebSocket } from "ws";
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
const PING_INTERVAL_MS = 10_000;
const CLIENT_TTL_MS = 30_000;

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
    } catch { }
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
  ws.on("message", (raw: RawData) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const msg = parseIncoming(parsed);
    if (!msg) return;

    switch (msg.tag) {
      case "join": {
        sess.padId = String(msg.padId || "");
        sess.userId = String(msg.userId || nanoid());
        sess.name = String(msg.name || "guest");

        if (!sess.padId) return;

        const room = getRoom(sess.padId);
        const color = assignColor(room, sess.userId);

        room.clients.set(sess.userId, { ws, sess, color });

        const peers = [...room.clients.entries()]
          .filter(([uid]) => uid !== sess.userId)
          .map(([uid, c]) => ({
            userId: uid,
            name: c.sess.name ?? "guest",
            color: c.color,
          }));

        ws.send(
          JSON.stringify({
            tag: "welcome",
            you: { userId: sess.userId, color },
            peers,
          } as Outgoing),
        );
        broadcast(
          sess.padId,
          {
            tag: "peer-join",
            user: { userId: sess.userId, name: sess.name ?? "guest", color },
          },
          sess.userId,
        );
        break;
      }
      case "pong": {
        sess.lastPong = Date.now();
        break;
      }
      case "cursor": {
        if (!sess.padId || !sess.userId) return;
        broadcast(
          sess.padId,
          { tag: "cursor", userId: sess.userId, range: msg.range },
          sess.userId,
        );
        break;
      }
    }
  });
  ws.on("close", () => cleanup(sess));
  ws.on("error", () => cleanup(sess));
});

setInterval(() => {
  for (const [, room] of rooms) {
    for (const [uid, c] of room.clients) {
      try {
        c.ws.send(
          JSON.stringify({ tag: "ping", time: Date.now() } as Outgoing),
        );
      } catch { }
      if (Date.now() - c.sess.lastPong > CLIENT_TTL_MS) {
        try {
          c.ws.close();
        } catch { }
        room.clients.delete(uid);
        broadcast(c.sess.padId!, { tag: "peer-leave", userId: uid });
      }
    }
  }
}, PING_INTERVAL_MS);

const PORT = Number(process.env.PORT || 4100);
server.listen(PORT, () => console.log(`collab-ws listening on :${PORT} /ws`));
