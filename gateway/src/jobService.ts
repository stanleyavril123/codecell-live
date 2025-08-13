import { v4 as uuid } from "uuid";
import { ChunkSchema } from "../../shared/schemas";
import WebSocket from "ws";

type Job = {
  id: string;
  req: { language: string; source: string };
  sockets: Set<WebSocket>;
  status: "queued" | "running" | "finished" | "error";
};

class JobService {
  private jobs = new Map<string, Job>();

  create(req: { language: string; source: string }): string {
    const job: Job = {
      id: uuid(),
      req,
      sockets: new Set(),
      status: "queued",
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
  }

  detach(jobId: string, ws: WebSocket) {
    this.jobs.get(jobId)?.sockets.delete(ws);
  }

  hasJob(id: string) {
    return this.jobs.has(id);
  }
  private broadcast(jobId: string, chunk: unknown) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const msg = JSON.stringify(chunk);

    job.sockets.forEach((s) => {
      s.readyState === s.OPEN && s.send(msg);
    });
    return true;
  }
  public pushChunk(jobId: string, chunk: unknown): boolean {
    const paresd = ChunkSchema.safeParse(chunk);
    if (!paresd.success) {
      return false;
    }
    return this.broadcast(jobId, paresd.data);
  }
}

export const jobService = new JobService();
