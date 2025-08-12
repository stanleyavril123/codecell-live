import { v4 as uuid } from "uuid";
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

    this.jobs.set(job.id, job);

    // fake code run : ...

    setTimeout(() => {
      this.broadcast(job.id, { type: "stdout", data: "hello from stub\\n" });
      this.broadcast(job.id, { type: "exit", data: 0 });
      this.jobs.delete(job.id);
    }, 100);

    return job.id;
  }

  attach(jobId: string, ws: WebSocket) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return ws.close();
    }
    job.sockets.add(ws);
  }

  detach(jobId: string, ws: WebSocket) {
    this.jobs.get(jobId)?.sockets.delete(ws);
  }

  private broadcast(jobId: string, chunk: unknown) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const msg = JSON.stringify(chunk);

    job.sockets.forEach((s) => {
      s.readyState === s.OPEN && s.send(msg);
    });
  }
}

export const jobService = new JobService();
