// Preloaded by apps/api/bunfig.toml: fresh schema + seed on the test database, once per run.
// Turborepo runs the @ta/db tests first (`dependsOn: ["^test"]`), so both never reset the same
// database at the same time.
import { afterAll } from "bun:test";

import { resetDatabase, seed } from "@ta/db";
import { testConnection } from "@ta/db/testing";

export const TEST_OWNER = {
  ownerEmail: "owner@test.local",
  ownerPassword: "test-password-123",
  ownerName: "Test Owner",
} as const;

const { db, close } = testConnection();
await resetDatabase(db);
await seed(db, TEST_OWNER);

afterAll(async () => {
  await close();
});
