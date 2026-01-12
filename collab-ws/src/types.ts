export type Sess = {
  id: string;
  padId: string | null;
  userId: string | null;
  name: string | null;
  lastPong: number;
};

export type Client = { ws: WebSocket; sess: Sess; color: string };

export type Room = { clients: Map<string, Client>; colors: Map<string, string> };

export type HeartbeatOptions = {
  pingIntervalMs?: number;
  clientTtlMs?: number;
};
