import { Server } from "@hocuspocus/server";

const PORT = Number(process.env.PORT || 4100);
const server = new Server({
  name: "codecell-collab",
  port: PORT,
});

server.listen(PORT, () => {
  console.log(`collab-ws listening on ws://localhost:${PORT}`);
});
