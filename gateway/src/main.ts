import http, { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { jobService } from "./services/jobService";
import { createApp } from "./http/router";

const app = createApp()
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/stream" });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) return ws.close();

  jobService.attach(jobId, ws);
  ws.on("close", () => jobService.detach(jobId, ws));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Gateway ready:
  • HTTP  : http://localhost:${PORT}/trpc
  • WS    : ws://localhost:${PORT}/stream?jobId=<jobId>`);
});
