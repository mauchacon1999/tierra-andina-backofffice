import { describe, expect, it } from "vitest";

import { countPendingReceipt, effectiveCosts } from "@/features/purchases/helpers/line-receipt";
import { OPEN_TRIP, TOMATO_LINE } from "@/testing/purchase-fixtures";

describe("effectiveCosts", () => {
  it("as bought until a partial receipt; then the cost of what arrived", () => {
    expect(effectiveCosts(TOMATO_LINE)).toEqual({ unitCostUsd: "0.9136", salePriceUsd: "1.4000" });
    expect(
      effectiveCosts({
        ...TOMATO_LINE,
        receiptStatus: "partial",
        receivedUnitCostUsd: "1.8273",
        receivedSalePriceUsd: "2.7500",
      }),
    ).toEqual({ unitCostUsd: "1.8273", salePriceUsd: "2.7500" });
  });
});

describe("countPendingReceipt", () => {
  it("counts the purchases not checked at the truck", () => {
    const trip = {
      ...OPEN_TRIP,
      lines: [
        TOMATO_LINE,
        { ...TOMATO_LINE, id: "x", receiptStatus: "received" as const },
        { ...TOMATO_LINE, id: "y", receiptStatus: "missing" as const },
      ],
    };
    expect(countPendingReceipt(trip)).toBe(1);
  });
});
