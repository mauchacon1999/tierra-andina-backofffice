import { expect } from "bun:test";

import { createDb, type Database, type DbClient } from "../client";
import { isLocalDatabaseUrl } from "../migrate";

/*
 * Test database helpers. Tests only ever touch DATABASE_URL_TEST, and refuse to run against a
 * database that is not local or whose name does not end in "_test" (it is reset on every run).
 */

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("[db tests] DATABASE_URL_TEST is not set (see .env.example).");
  const name = new URL(url).pathname.slice(1);
  if (!isLocalDatabaseUrl(url) || !name.endsWith("_test")) {
    throw new Error(`[db tests] refusing to use "${name}": must be local and end in "_test".`);
  }
  return url;
}

let shared: DbClient | undefined;

/** One connection shared by every test file of the run (closed by the preload). */
export function testConnection(): DbClient {
  shared ??= createDb(testDatabaseUrl(), { max: 1 });
  return shared;
}

class Rollback extends Error {}

/** Runs `fn` in a transaction that is always rolled back, so tests never leave data behind. */
export async function inRollback(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await testConnection().db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

type PgErrorFields = { code?: string; constraint_name?: string };

/** The PostgreSQL error behind a Drizzle error (Drizzle wraps the driver error in `cause`). */
function pgError(error: unknown): PgErrorFields {
  if (error instanceof Error && error.cause && typeof error.cause === "object") {
    return error.cause as PgErrorFields;
  }
  return (error ?? {}) as PgErrorFields;
}

export const PG_CHECK_VIOLATION = "23514";
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_NUMERIC_OUT_OF_RANGE = "22003";

/**
 * Asserts that `write` fails with the given SQLSTATE (and constraint, when given).
 * The write runs in a savepoint so the surrounding test transaction stays usable.
 */
export async function expectPgError(
  tx: Tx,
  write: (sp: Tx) => Promise<unknown>,
  expected: { code: string; constraint?: string },
): Promise<void> {
  let caught: unknown;
  try {
    await tx.transaction(async (sp) => {
      await write(sp);
    });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeDefined();
  const fields = pgError(caught);
  expect(fields.code).toBe(expected.code);
  if (expected.constraint) expect(fields.constraint_name).toBe(expected.constraint);
}

/** Asserts that `write` succeeds (in a savepoint, kept until the test transaction rolls back). */
export async function expectOk(tx: Tx, write: (sp: Tx) => Promise<unknown>): Promise<void> {
  await tx.transaction(async (sp) => {
    await write(sp);
  });
}
