import { Outgoing } from "../../shared/messages";
import { Room, Sess } from "./types";


const color_palette = [
  "#60a5fa",
  "#f472b6",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#f97316",
];

export class RoomStore {

  private rooms = new Map<string, Room>();

  getRoom(padId: string): Room {
    let room = this.rooms.get(padId);
    if (!room) {
      room = { clients: new Map(), colors: new Map() };
      this.rooms.set(padId, room);
    }
    return room;
  }

  assignColor(room: Room, userId: string): string {
    let color = room.colors.get(userId);
    if (!color) {
      color = color_palette[room.colors.size % color_palette.length];
      room.colors.set(userId, color);
    }
    return color;
  }

  broadcast(
    padId: string,
    msg: Outgoing,
    senderId: string | null = null,
  ): void {
    const room = this.rooms.get(padId);
    if (!room) return;
    const str = JSON.stringify(msg);
    for (const [clientId, client] of room.clients) {
      if (clientId === senderId) continue;
      try {
        client.ws.send(str);
      } catch { }
    }
  }
  cleanup(sess: Sess): void {
    if (!sess.padId || !sess.userId) return;

    const room = this.rooms.get(sess.padId);
    if (!room) return;
    room.clients.delete(sess.id);
    const userStillPresent = [...room.clients.values()].some(
      (c) => c.sess.userId === sess.userId,
    );

    if (!userStillPresent) {
      this.broadcast(sess.padId, { tag: "peer-leave", userId: sess.userId });
    }

    if (room.clients.size === 0) this.rooms.delete(sess.padId);
  }


  heartbeatTick(nowMs: number, ttlMs: number): void {
    for (const [padId, room] of this.rooms) {
      for (const [clientId, c] of room.clients) {
        try {
          c.ws.send(JSON.stringify({ tag: "ping", time: nowMs } as Outgoing));
        } catch { }

        if (nowMs - c.sess.lastPong > ttlMs) {
          try { c.ws.close(); } catch { }
          room.clients.delete(clientId);

          const uid = c.sess.userId;
          if (uid) {
            const stillHere = [...room.clients.values()].some(
              (x) => x.sess.userId === uid,
            );
            if (!stillHere) {
              this.broadcast(padId, { tag: "peer-leave", userId: uid });
            }
          }
        }
      }
      if (room.clients.size === 0) this.rooms.delete(padId);
    }
  }

}

