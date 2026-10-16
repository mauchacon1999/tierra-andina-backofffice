import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { settings, stores } from "./schema";
import { inRollback } from "./testing/test-db";

describe("createDb jsonb handling", () => {
  // Regression: postgres.js and Drizzle both parsed jsonb, turning "0.05" into 0.05.
  test("keeps JSON strings, numbers, booleans and objects with their type", async () => {
    await inRollback(async (tx) => {
      const [store] = await tx.insert(stores).values({ name: "JSON store" }).returning();
      if (!store) throw new Error("no store");
      const values: Record<string, unknown> = {
        decimal_as_string: "0.05",
        integer_string: "1",
        real_number: 3,
        flag: false,
        nested: { step: "0.05", list: [1, "2"] },
      };
      await tx
        .insert(settings)
        .values(Object.entries(values).map(([key, value]) => ({ storeId: store.id, key, value })));

      const rows = await tx
        .select({ key: settings.key, value: settings.value })
        .from(settings)
        .where(eq(settings.storeId, store.id));

      expect(Object.fromEntries(rows.map((r) => [r.key, r.value]))).toEqual(values);
    });
  });
});
