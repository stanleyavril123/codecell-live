import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { jobService } from "./jobService";
import { startSandboxRun } from "./sandboxClient";

const t = initTRPC.create();

export const appRouter = t.router({
  runCode: t.procedure
    .input(
      z.object({
        language: z.enum(["js", "ts", "py", "php", "cs", "java"]),
        source: z.string().max(32_000),
      }),
    )
    .output(z.object({ jobId: z.string() }))
    .mutation(({ input }) => {
      const jobId = jobService.create(input);
      startSandboxRun({
        jobId,
        language: input.language,
        source: input.source,
      });
      return { jobId };
    }),
});

export type AppRouter = typeof appRouter;
