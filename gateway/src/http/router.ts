import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { internalRouter } from "./internal";
import { appRouter } from "./trpc";


export function createApp() {
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

  app.use("/internal", internalRouter);

  return app;
}

