import { v4 as uuid } from "uuid";
import { ChunkSchema, OutputChunk } from "../../shared/schemas";
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
    console.log("[gateway] Creating job:", job.id, "with req:", req);
    this.jobs.set(job.id, job);

    return job.id;
  }

  attach(jobId: string, ws: WebSocket) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn("[internal] pushChunk returned false for jobId:", jobId);
      return ws.close();
    }
    job.sockets.add(ws);

    for (const ch of job.buffer) {
      ws.send(JSON.stringify(ch));
    }

    if (job.closed) {
      ws.close(1000, "job complete");
    }
  }

  detach(jobId: string, ws: WebSocket) {
    this.jobs.get(jobId)?.sockets.delete(ws);
  }

  hasJob(id: string) {
    return this.jobs.has(id);
  }

  public pushChunk(jobId: string, raw: unknown): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const parsed = ChunkSchema.safeParse(raw);
    if (!parsed.success) {
      return false;
    }
    const chunk: OutputChunk = parsed.data;

    job.buffer.push(chunk);

    const payload = JSON.stringify(chunk);
    for (const ws of job.sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }

    if (chunk.type === "exit") {
      job.closed = true;
      setTimeout(() => {
        if (this.jobs.get(jobId)?.sockets.size === 0) this.jobs.delete(jobId);
      }, 10_000);
    }
    return true;
  }
}

export const jobService = new JobService();
