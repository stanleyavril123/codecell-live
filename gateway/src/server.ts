import express from "express";
import http, { IncomingMessage } from "http";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { WebSocketServer, WebSocket } from "ws";
import { appRouter } from "./router";
import { jobService } from "./jobService";

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  }),
);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/stream" });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    ws.close();
    return;
  }

  jobService.attach(jobId, ws);
  ws.on("close", () => jobService.detach(jobId, ws));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

server.listen(PORT, () => {
  console.log(`Gateway ready:
     • HTTP  : http://localhost:${PORT}/trpc         (POST JSON here)
     • WS    : ws://localhost:${PORT}/stream/<jobId> (live stdout/stderr)`);
});
