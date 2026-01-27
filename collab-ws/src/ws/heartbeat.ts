import { RoomManger } from "../roomManager";
import { HeartbeatOptions } from "../shared/types";

export function startHeartbeat(roomManager: RoomManger, opts: HeartbeatOptions) {
  const pingIntervalMs = opts.pingIntervalMs ?? 10_000;
  const clientTtlMs = opts.clientTtlMs ?? 30_000;

  const timer = setInterval(() => {
    roomManager.heartbeatTick(Date.now(), clientTtlMs);
  }, pingIntervalMs);

  (timer as any).unref?.();

  return () => clearInterval(timer);
}
