import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import type { Database } from "./client";

const MIGRATIONS_FOLDER = path.join(import.meta.dir, "..", "migrations");

/** Applies pending migrations from packages/db/migrations (same files drizzle-kit uses). */
export async function migrateDatabase(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

/**
 * Drops every table, type and the migration history, then migrates from scratch.
 * Destructive: callers must make sure the target is a local/test database.
 */
export async function resetDatabase(db: Database): Promise<void> {
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrateDatabase(db);
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** True when the URL points at this machine; used to refuse destructive scripts elsewhere. */
export function isLocalDatabaseUrl(url: string): boolean {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}
