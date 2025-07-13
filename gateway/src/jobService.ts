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

  enqueue(req: { language: string; source: string }): string {
    const job: Job = {
      id: uuid(),
      req,
      sockets: new Set(),
      status: "queued",
    };

    this.jobs.set(job.id, job);

    // fake code run : ...

    return job.id;
  }

  attach(jobId: string, ws: WebSocket) {}

  detach(jobId: string, ws: WebSocket) {}

  private brodcast(jobId: string, chunk: unknown) {}
}

export const jobService = new JobService();
