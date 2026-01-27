import * as http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { RoomManger } from "./roomManager";
import { startHeartbeat } from "./ws/heartbeat";
import { handleConnection } from "./ws/connection";


const server = http.createServer();
const wss = new WebSocketServer({ server, path: "/ws" });
const store = new RoomManger();
startHeartbeat(store, { pingIntervalMs: 10_000, clientTtlMs: 30_000 })

wss.on("connection", (ws: WebSocket) => handleConnection(ws, store))

const PORT = Number(process.env.PORT || 4100);
server.listen(PORT, () => console.log(`collab-ws listening on :${PORT} /ws`));
