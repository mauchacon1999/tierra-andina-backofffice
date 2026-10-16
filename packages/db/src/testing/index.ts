// Test helpers for packages that run integration tests against DATABASE_URL_TEST
// (import from "@ta/db/testing"; never from production code).
export {
  expectOk,
  expectPgError,
  inRollback,
  PG_CHECK_VIOLATION,
  PG_NUMERIC_OUT_OF_RANGE,
  PG_UNIQUE_VIOLATION,
  testConnection,
  testDatabaseUrl,
} from "./test-db";
export type { Tx } from "./test-db";
export {
  createBase,
  uniq,
  valid,
  validPayrollPayment,
  validProduct,
  validPurchaseLine,
} from "./fixtures";
export type { Base } from "./fixtures";
