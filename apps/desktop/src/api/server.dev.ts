import { startApiServer } from "./server.js";

const configuredPort = Number(process.env.MIO_API_PORT ?? "4123");
const server = await startApiServer(Number.isFinite(configuredPort) ? configuredPort : 4123);
console.log(`Marketplace Intelligence OS API running on http://127.0.0.1:${server.port}/api`);

process.on("SIGINT", () => {
  void server.close().then(() => process.exit(0));
});
