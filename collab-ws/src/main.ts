import * as http from "http";
import { WebSocketServer } from "ws";
import { RoomManger } from "./roomManager";
import { startHeartbeat } from "./ws/heartbeat";
import { handleConnection } from "./ws/connection";


const server = http.createServer();
const wss = new WebSocketServer({ server, path: "/ws" });
const roomManager = new RoomManger();
startHeartbeat(roomManager, { pingIntervalMs: 10_000, clientTtlMs: 30_000 })

wss.on("connection", (ws) => handleConnection(ws, roomManager))

const PORT = Number(process.env.PORT || 4100);
server.listen(PORT, () => console.log(`collab-ws listening on :${PORT} /ws`));
