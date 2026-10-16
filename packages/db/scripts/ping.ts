// Checks the connection to the main and the test database.
// Usage: bun run db:ping (from the repo root)
import { createDb } from "../src/client";

const targets = [
  ["main", process.env.DATABASE_URL],
  ["test", process.env.DATABASE_URL_TEST],
] as const;

let failed = false;

// Drizzle wraps the driver error; the real cause (e.g. ECONNREFUSED) is in `cause`.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;
    return [code, cause.message].filter(Boolean).join(" — ") || error.message;
  }
  return error.message;
}

for (const [name, url] of targets) {
  if (!url) {
    console.error(`✗ ${name}: environment variable not set`);
    failed = true;
    continue;
  }
  const conn = createDb(url, { max: 1, connectTimeout: 3 });
  const dbName = new URL(url).pathname.slice(1);
  try {
    await conn.ping();
    console.log(`✓ ${name} (${dbName}): OK`);
  } catch (error) {
    console.error(`✗ ${name} (${dbName}): ${describeError(error)}`);
    failed = true;
  } finally {
    await conn.close();
  }
}

process.exit(failed ? 1 : 0);
