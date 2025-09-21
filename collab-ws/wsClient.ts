import { WebSocket } from "ws";
import { Outgoing } from "../shared/messages";
import { close } from "inspector";

export type CollabWSOpts = {
  url: string;
  padId: string;
  userId: string;
  name: string;
  handlers: Handlers;
};

export type RangeXY = {
  yStart: number;
  xStart: number;
  yEnd: number;
  xEnd: number;
};

export type Peer = { userId: string; name: string; color: string };

type Handlers = {
  onWelcome(peers: Peer[], you: { userId: string; color: string }): void;
  onPeerJoin(user: Peer): void;
  onPeerLeave(userId: string): void;
  onCursor(userId: string, range: RangeXY): void;
  onOpen?(): void;
  onClose?(): void;
  onError?(e: unknown): void;
};

export function createCollabWS(opts: CollabWSOpts) {
  const ws = new WebSocket(opts.url);
  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({
        tag: "join",
        padId: opts.padId,
        userId: opts.userId,
        name: opts.name,
      }),
    );
    opts.handlers.onOpen?.();
  });

  ws.addEventListener("message", (event) => {
    const msg: Outgoing = JSON.parse(event.data as string);
    switch (msg.tag) {
      case "welcome":
        opts.handlers.onWelcome(msg.peers, msg.you);
        break;
      case "peer-join":
        opts.handlers.onPeerJoin(msg.user);
        break;
      case "peer-leave":
        opts.handlers.onPeerLeave(msg.userId);
        break;
      case "cursor":
        opts.handlers.onCursor(msg.userId, msg.range);
        break;
      case "ping":
        ws.send(
          JSON.stringify({
            tag: "pong",
          }),
        );
        break;
    }
  });
  return {
    sendCursor(range: Range) {
      try {
        ws.send(JSON.stringify({ tag: "cursor", range }));
      } catch (error) {
        console.log(error);
      }
    },

    close() {
      try {
        ws.close();
      } catch (error) {
        console.log(error);
      }
    },
  };
}
