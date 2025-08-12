import { Router } from "express";
import { jobService } from "./jobService";

export const internalRouter = Router();

internalRouter.post("/jobs/:jobId/chunk", (req, res) => {
  const jobId = req.params.jobId;
  const ok = jobService.pushChunk(jobId, req.body);
  if (!ok) {
    return res.status(404).json({ errors: "unknown job or clients" });
  }
  return res.sendStatus(204);
});
