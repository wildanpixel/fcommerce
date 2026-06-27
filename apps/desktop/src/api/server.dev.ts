import { startApiServer } from "./server.js";

const server = await startApiServer();
console.log(`Marketplace Intelligence OS API running on http://127.0.0.1:${server.port}/api`);

process.on("SIGINT", () => {
  void server.close().then(() => process.exit(0));
});
