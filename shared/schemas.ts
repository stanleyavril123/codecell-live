import { z } from "zod";

export const ChunkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stdout"), data: z.string() }),
  z.object({ type: z.literal("stderr"), data: z.string() }),
  z.object({ type: z.literal("exit"), data: z.number() }),
]);

export type OutputChunk = z.infer<typeof ChunkSchema>;
