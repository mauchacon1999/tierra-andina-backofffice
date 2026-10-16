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
  // postgres.js parses json/jsonb and Drizzle's jsonb column parses any string again, so the
  // JSON string "0.05" came back as the number 0.05. Drizzle already disables the json
  // serializers; disabling the parsers too makes Drizzle the only one that parses.
  const rawJson = (value: string): string => value;
  client.options.parsers[114] = rawJson;
  client.options.parsers[3802] = rawJson;
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

/** A transaction handle, as received by `db.transaction(async (tx) => …)`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything that can run queries: the database or an open transaction. */
export type Executor = Database | Transaction;
