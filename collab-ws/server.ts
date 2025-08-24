import http from "http";
import { WebSocket } from "ws";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

const rooms = new Map();
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

wss.on('connection', (ws) => {})

