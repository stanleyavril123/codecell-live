const COLORS = [
  "#60a5fa",
  "#f472b6",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#f97316",
];

export type CollabIdentity = {
  padId: string;
  userId: string;
  name: string;
  color: string;
  wsUrl: string;
};

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function colorForId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export function getCollabIdentity(): CollabIdentity {
  const params = new URLSearchParams(window.location.search);
  const padId = params.get("pad")?.trim() || "demo";
  const name =
    params.get("user")?.trim() ||
    window.localStorage.getItem("codecell.collab.name") ||
    `Guest ${Math.floor(1000 + Math.random() * 9000)}`;

  const userIdKey = `codecell.collab.userId.${name}`;
  let userId = window.localStorage.getItem(userIdKey);
  if (!userId) {
    userId = randomId("user");
    window.localStorage.setItem(userIdKey, userId);
  }

  window.localStorage.setItem("codecell.collab.name", name);

  return {
    padId,
    userId,
    name,
    color: colorForId(userId),
    wsUrl: import.meta.env.VITE_COLLAB_WS_URL || "ws://localhost:4100",
  };
}
