import { z } from "zod";

export const UserZ = z.object({
  userId: z.string(),
  name: z.string(),
  color: z.string(),
});

export const RangeZ = z.object({
  yStart: z.number().int().nonnegative(),
  xStart: z.number().int().nonnegative(),
  yEnd: z.number().int().nonnegative(),
  xEnd: z.number().int().nonnegative(),
});

export const JoinMsgZ = z.object({
  tag: z.literal("join"),
  padId: z.string(),
  userId: z.string().optional(),
  name: z.string().optional(),
});

export const PongMsgZ = z.object({ tag: z.literal("pong") });
export const CursorMsgZ = z.object({ tag: z.literal("cursor"), range: RangeZ });

export const IncomingZ = z.discriminatedUnion("tag", [
  JoinMsgZ,
  PongMsgZ,
  CursorMsgZ,
]);

export const WelcomeMsgZ = z.object({
  tag: z.literal("welcome"),
  you: z.object({ userId: z.string(), color: z.string() }),
  peers: z.array(UserZ),
});

export const PeerJoinMsgZ = z.object({
  tag: z.literal("peer-join"),
  user: UserZ,
});

export const PeerLeaveMsgZ = z.object({
  tag: z.literal("peer-leave"),
  userId: z.string(),
});

export const ServerCursorZ = z.object({
  tag: z.literal("cursor"),
  userId: z.string(),
  range: RangeZ,
});

export const PingMsgZ = z.object({
  tag: z.literal("ping"),
  time: z.number().int(),
});

export const OutgoingZ = z.discriminatedUnion("tag", [
  WelcomeMsgZ,
  PeerJoinMsgZ,
  PeerLeaveMsgZ,
  ServerCursorZ,
  PingMsgZ,
]);

export type Range = z.infer<typeof RangeZ>;
export type JoinMsg = z.infer<typeof JoinMsgZ>;
export type PongMsg = z.infer<typeof PongMsgZ>;
export type CursorMsg = z.infer<typeof CursorMsgZ>;
export type Incoming = z.infer<typeof IncomingZ>;
export type WelcomeMsg = z.infer<typeof WelcomeMsgZ>;
export type PeerJoinMsg = z.infer<typeof PeerJoinMsgZ>;
export type PeerLeaveMsg = z.infer<typeof PeerLeaveMsgZ>;
export type ServerCursor = z.infer<typeof ServerCursorZ>;
export type PingMsg = z.infer<typeof PingMsgZ>;
export type Outgoing = z.infer<typeof OutgoingZ>;

export function parseIncoming(raw: unknown): Incoming | null {
  const r = IncomingZ.safeParse(raw);
  return r.success ? r.data : null;
}
