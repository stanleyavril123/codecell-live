import { v4 as uuid } from "uuid";
import { ChunkSchema, OutputChunk } from "../../shared/chunks";
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
      ws.send(JSON.stringify(job.buffer[i]));
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
      console.log("chunk error", r.error);
      return false;
    }
    job.buffer.push(r.data);

    job.sockets.forEach((ws) => ws.send(JSON.stringify(r.data)));
    if (r.data.type === "exit") {
      job.closed = true;
    }
    //TODOOO
    //  - validate the chunk
    //  - add to buffer
    //  - send to all attached sockets
    //  - handle "exit" chunks (mark closed / cleanup later)

    return true;
  }
}
export const jobService = new JobService();
