// Order matters: env is validated before @ta/db is initialized.
import { env } from "@/env";

import { closeDb, db, ping } from "@ta/db";

import { createApp } from "@/app";
import { createAuth } from "@/lib/auth";

const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: env.BETTER_AUTH_URL,
  webOrigin: env.WEB_ORIGIN,
});
const app = createApp({ webOrigin: env.WEB_ORIGIN, pingDb: ping, db, auth });

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
