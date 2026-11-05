// One-off cleanup: deletes everything operational except the daily closes (docs/database.md).
// Only shows what would go unless called with --execute --confirm-host=<the database's host>.
// Usage (from packages/db):
//   bun --env-file=../../.env.dev scripts/purge-except-closes.ts
//   bun --env-file=../../.env.dev scripts/purge-except-closes.ts --execute --confirm-host=localhost
import { createDb } from "../src/client";
import { countKeptData, previewPurge, purgeExceptCloses } from "../src/purge-except-closes";
import { targetDatabaseUrl } from "./_target";

const { name, url } = targetDatabaseUrl();
const host = new URL(url).hostname;
const isExecute = process.argv.includes("--execute");
const confirmedHost = process.argv.find((arg) => arg.startsWith("--confirm-host="))?.split("=")[1];

if (isExecute && confirmedHost !== host) {
  console.error(`✗ Refusing to delete: pass --confirm-host=${host} to confirm this database.`);
  process.exit(1);
}

const conn = createDb(url, { max: 1 });
try {
  console.log(`Database: ${name} on ${host}`);
  console.log("Stays:", await countKeptData(conn.db));
  if (!isExecute) {
    console.log("Would delete:", await previewPurge(conn.db));
    console.log("Nothing was changed. Back up first, then add --execute --confirm-host=<host>.");
  } else {
    const deleted = await conn.db.transaction((tx) => purgeExceptCloses(tx));
    console.log("Deleted:", deleted);
    console.log("Stays:", await countKeptData(conn.db));
    console.log("✓ Done");
  }
} finally {
  await conn.close();
}
