import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../gateway/src/router";

export const trpc = createTRPCReact<AppRouter>();
