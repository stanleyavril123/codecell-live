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

function getRoom(padId: string) {
  if (!rooms.has(padId)) {
    rooms.set(padId, { clients: new Map(), colors: new Map() });
  }
  return rooms.get(padId);
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
  ws.on("message", (raw) => { });
});
