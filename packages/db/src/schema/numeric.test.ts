import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { createBase, validPurchaseLine } from "../testing/fixtures";
import { expectPgError, inRollback, PG_NUMERIC_OUT_OF_RANGE } from "../testing/test-db";
import { purchaseLines, purchaseTrips } from ".";

/*
 * numeric(14,4) columns must round-trip as exact strings (CLAUDE.md §7).
 * PostgreSQL always returns the declared scale, so "20" comes back as "20.0000": compare with
 * decimal.js in @ta/core, never with string equality on user input.
 */
describe("numeric(14,4) columns", () => {
  test('keep 4-decimal values exactly ("0.9091" stays "0.9091")', async () => {
    await inRollback(async (tx) => {
      const b = await createBase(tx);
      const [row] = await tx
        .select({ unitCostUsd: purchaseLines.unitCostUsd, margin: purchaseLines.margin })
        .from(purchaseLines)
        .where(eq(purchaseLines.id, b.line.id));

      expect(row?.unitCostUsd).toBe("0.9091");
      expect(typeof row?.unitCostUsd).toBe("string");
      expect(row?.margin).toBe("0.5000");
    });
  });

  test("round-trip the extremes of numeric(14,4) without float drift", async () => {
    await inRollback(async (tx) => {
      const b = await createBase(tx);
      const values = ["0.0001", "0.1000", "9999999999.9999", "1234567890.1234", "20.0000"];
      for (const value of values) {
        const [trip] = await tx
          .insert(purchaseTrips)
          .values({
            storeId: b.store.id,
            businessDate: "2026-10-15",
            bcvRate: value,
            totalUsd: value,
          })
          .returning({ bcvRate: purchaseTrips.bcvRate, totalUsd: purchaseTrips.totalUsd });

        expect(trip?.bcvRate).toBe(value);
        expect(trip?.totalUsd).toBe(value);
      }
    });
  });

  test("pad integers to the declared scale", async () => {
    await inRollback(async (tx) => {
      const b = await createBase(tx);
      const [row] = await tx
        .insert(purchaseLines)
        .values(validPurchaseLine(b.trip.id, b.product.id, null, { quotedPriceUsd: "60" }))
        .returning({ quotedPriceUsd: purchaseLines.quotedPriceUsd });

      expect(row?.quotedPriceUsd).toBe("60.0000");
    });
  });

  test("round a 5th decimal half away from zero (validators must reject it first)", async () => {
    await inRollback(async (tx) => {
      const b = await createBase(tx);
      const [trip] = await tx
        .insert(purchaseTrips)
        .values({ storeId: b.store.id, businessDate: "2026-10-15", bcvRate: "200.12345" })
        .returning({ bcvRate: purchaseTrips.bcvRate });

      expect(trip?.bcvRate).toBe("200.1235");
    });
  });

  test("reject values with more than 10 integer digits", async () => {
    await inRollback(async (tx) => {
      const b = await createBase(tx);
      await expectPgError(
        tx,
        (sp) =>
          sp
            .insert(purchaseTrips)
            .values({ storeId: b.store.id, businessDate: "2026-10-15", bcvRate: "12345678901" }),
        { code: PG_NUMERIC_OUT_OF_RANGE },
      );
    });
  });
});
