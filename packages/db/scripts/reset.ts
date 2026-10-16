// Drops and re-creates the database schema, then applies every migration.
// Usage: bun run db:reset            (main database)
//        bun run db:reset -- --test  (test database)
import { createDb } from "../src/client";
import { isLocalDatabaseUrl, resetDatabase } from "../src/migrate";
import { targetDatabaseUrl } from "./_target";

const { name, url } = targetDatabaseUrl();

if (process.env.NODE_ENV === "production" || !isLocalDatabaseUrl(url)) {
  console.error(`✗ Refusing to reset "${name}": only local, non-production databases.`);
  process.exit(1);
}

const conn = createDb(url, { max: 1 });
try {
  await resetDatabase(conn.db);
  console.log(`✓ ${name}: schema dropped and migrations applied`);
} finally {
  await conn.close();
}
