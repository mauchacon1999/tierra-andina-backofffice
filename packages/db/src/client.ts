import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type CreateDbOptions = {
  /** Maximum connections in the pool. */
  max?: number;
  /** Seconds before a connection attempt is aborted. */
  connectTimeout?: number;
};

function buildDb(url: string, options: CreateDbOptions) {
  const client = postgres(url, {
    max: options.max ?? 10,
    connect_timeout: options.connectTimeout ?? 5,
    onnotice: () => {},
  });
  const db = drizzle(client, { schema });

  return {
    db,
    client,
    /** Runs SELECT 1. Throws if the database does not answer. */
    ping: async (): Promise<void> => {
      await db.execute(sql`select 1`);
    },
    close: (): Promise<void> => client.end({ timeout: 5 }),
  };
}

export type DbClient = ReturnType<typeof buildDb>;
export type Database = DbClient["db"];

/** Creates an independent Drizzle client (e.g. for tests or the test database). */
export function createDb(url: string, options: CreateDbOptions = {}): DbClient {
  return buildDb(url, options);
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[@ta/db] DATABASE_URL is not set. Copy .env.example to .env at the repo root.",
    );
  }
  return url;
}

// Default instance. postgres.js is lazy: no connection is opened until the first query.
const defaultClient = createDb(requireDatabaseUrl());

export const db: Database = defaultClient.db;
export const ping: () => Promise<void> = defaultClient.ping;
export const closeDb: () => Promise<void> = defaultClient.close;
