import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../gateway/src/http/trpc";

export const trpc = createTRPCReact<AppRouter>();
