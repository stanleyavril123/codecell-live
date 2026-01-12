import * as http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { RoomStore } from "./room";
import { startHeartbeat } from "./heartbeat";
import { handleConnection } from "./connection";


const server = http.createServer();
const wss = new WebSocketServer({ server, path: "/ws" });
const store = new RoomStore();
startHeartbeat(store, { pingIntervalMs: 10_000, clientTtlMs: 30_000 })

wss.on("connection", (ws: WebSocket) => handleConnection(ws, store))

const PORT = Number(process.env.PORT || 4100);
server.listen(PORT, () => console.log(`collab-ws listening on :${PORT} /ws`));
