// Preloaded by packages/db/bunfig.toml: fresh schema + seed on the test database, once per run.
import { afterAll } from "bun:test";

import { resetDatabase } from "../migrate";
import { seed } from "../seed";
import { testConnection } from "./test-db";

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
