// Loads the initial data. Safe to run more than once.
// Usage: bun run db:seed            (main database)
//        bun run db:seed -- --test  (test database)
import { z } from "zod";

import { createDb } from "../src/client";
import { seed } from "../src/seed";
import { targetDatabaseUrl } from "./_target";

const envSchema = z.object({
  SEED_OWNER_EMAIL: z.email(),
  SEED_OWNER_PASSWORD: z.string().min(8, "must have at least 8 characters"),
  SEED_OWNER_NAME: z.string().min(1).optional(),
});

const env = envSchema.safeParse(process.env);
if (!env.success) {
  for (const issue of env.error.issues)
    console.error(`✗ ${issue.path.join(".")}: ${issue.message}`);
  console.error("Check .env at the repo root (template: .env.example).");
  process.exit(1);
}

const { name, url } = targetDatabaseUrl();
const conn = createDb(url, { max: 1 });
try {
  const result = await seed(conn.db, {
    ownerEmail: env.data.SEED_OWNER_EMAIL,
    ownerPassword: env.data.SEED_OWNER_PASSWORD,
    ...(env.data.SEED_OWNER_NAME ? { ownerName: env.data.SEED_OWNER_NAME } : {}),
  });
  console.log(`✓ ${name}: seed applied (store ${result.storeId}, owner ${result.ownerId})`);
} finally {
  await conn.close();
}
