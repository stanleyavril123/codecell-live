import type { RoomStore } from "./room";
import { HeartbeatOptions } from "./types";

export function startHeartbeat(store: RoomStore, opts: HeartbeatOptions) {
  const pingIntervalMs = opts.pingIntervalMs ?? 10_000;
  const clientTtlMs = opts.clientTtlMs ?? 30_000;

  const timer = setInterval(() => {
    store.heartbeatTick(Date.now(), clientTtlMs);
  }, pingIntervalMs);

  (timer as any).unref?.();

  return () => clearInterval(timer);
}
