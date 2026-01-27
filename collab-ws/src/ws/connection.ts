import { RoomManger } from "../roomManager";
import WebSocket, { RawData } from "ws";
import { Sess } from "../shared/types";
import { Outgoing, parseIncoming } from "../../../shared/messages";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

export function handleConnection(ws: WebSocket, roomManger: RoomManger) {

  const sess: Sess = {
    id: nanoid(),
    padId: null,
    userId: null,
    name: null,
    lastPong: Date.now(),
  };
  ws.on("message", (raw: RawData) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const msg = parseIncoming(parsed);
    if (!msg) return;

    switch (msg.tag) {
      case "join": {
        sess.padId = String(msg.padId || "");
        sess.userId = String(msg.userId || nanoid());
        sess.name = String(msg.name || "guest");

        if (!sess.padId) return;

        const room = roomManger.getRoom(sess.padId);
        const color = roomManger.assignColor(room, sess.userId);

        room.clients.set(sess.id, { ws, sess, color });
        const peersMap = new Map<string, { userId: string; name: string; color: string }>();

        for (const [, c] of room.clients) {
          if (!c.sess.userId) continue;
          if (c.sess.userId === sess.userId) continue;
          if (!peersMap.has(c.sess.userId)) {
            peersMap.set(c.sess.userId, {
              userId: c.sess.userId,
              name: c.sess.name ?? "guest",
              color: c.color,
            });
          }
        }

        const peers = [...peersMap.values()];

        ws.send(
          JSON.stringify({
            tag: "welcome",
            you: { userId: sess.userId, color },
            peers,
          } as Outgoing),
        );
        roomManger.broadcast(
          sess.padId,
          {
            tag: "peer-join",
            user: { userId: sess.userId, name: sess.name ?? "guest", color },
          },
          sess.id,
        );
        break;
      }
      case "pong": {
        sess.lastPong = Date.now();
        break;
      }
      case "cursor": {
        if (!sess.padId || !sess.userId) return;
        roomManger.broadcast(
          sess.padId,
          { tag: "cursor", userId: sess.userId, range: msg.range },
          sess.id,
        );
        break;
      }
    }
  });
  ws.on("close", () => roomManger.cleanup(sess));
  ws.on("error", () => roomManger.cleanup(sess));
}
