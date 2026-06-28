import { v4 as uuid } from "uuid";
import { ChunkSchema, type OutputChunk } from "../../../shared/chunks";
import WebSocket from "ws";

type Job = {
  id: string;
  req: { language: string; source: string };
  sockets: Set<WebSocket>;
  status: "queued" | "running" | "finished" | "error";
  buffer: OutputChunk[];
  closed: boolean;
};

class JobService {
  private jobs = new Map<string, Job>();
  create(req: { language: string; source: string }): string {
    const job: Job = {
      id: uuid(),
      req,
      sockets: new Set(),
      status: "queued",
      buffer: [],
      closed: false,
    };

    this.jobs.set(job.id, job);
    return job.id;
  }

  attach(jobId: string, ws: WebSocket) {
    const job = this.jobs.get(jobId);
    if (!job) {
      ws.close();
      return;
    }

    job.sockets.add(ws);
    for (let i = 0; i < job.buffer.length; i++) {
      this.send(ws, job.buffer[i]);
    }

    if (job.closed) {
      ws.close();
    }
  }

  detach(jobId: string, ws: WebSocket) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.sockets.delete(ws);
  }

  hasJob(id: string): boolean {
    return this.jobs.has(id);
  }

  public pushChunk(jobId: string, raw: unknown): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    const r = ChunkSchema.safeParse(raw);

    if (!r.success) {
      job.status = "error";
      console.warn("Invalid job chunk", r.error);
      return false;
    }

    if (job.closed) return false;

    job.status = r.data.type === "exit" ? "finished" : "running";
    job.buffer.push(r.data);

    job.sockets.forEach((ws) => this.send(ws, r.data));
    if (r.data.type === "exit") {
      job.closed = true;
      job.sockets.forEach((ws) => ws.close());
      job.sockets.clear();
    }

    return true;
  }

  private send(ws: WebSocket, chunk: OutputChunk): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(chunk));
  }
}
export const jobService = new JobService();
