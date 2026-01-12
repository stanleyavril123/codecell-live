import { Router } from "express";
export const internalRouter = Router();
import { jobService } from "../services/jobService";

internalRouter.post("/jobs/:jobId/chunk", (req, res) => {
  const jobId = req.params.jobId;
  console.log("[internal] Received chunk for job:", jobId);
  console.log("[internal] Body:", JSON.stringify(req.body));

  const hasJob = jobService.hasJob(jobId);

  console.log("[internal] Job exists in map?", hasJob);
  const ok = jobService.pushChunk(jobId, req.body);
  if (!ok) {
    console.warn("[internal] pushChunk returned false for jobId:", jobId);
    return res.status(404).json({ errors: "unknown job or clients" });
  }
  return res.sendStatus(204);
});
