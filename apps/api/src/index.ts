// Order matters: env is validated before @ta/db is initialized.
import { env } from "@/env";

import { closeDb, ping } from "@ta/db";

import { createApp } from "@/app";

const app = createApp({ webOrigin: env.WEB_ORIGIN, pingDb: ping });

const server = Bun.serve({ port: env.API_PORT, fetch: app.fetch });
console.log(`✓ Tierra Andina API on http://localhost:${server.port} (${env.NODE_ENV})`);

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down…`);
  await server.stop();
  await closeDb();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
