import { describe, expect, test } from "bun:test";

import { ShrinkageExceedsQuantityError } from "./errors";
import { priceLine } from "./pricing";
import { InvalidReceiptError, pricePartialReceipt, type PartialReceiptInput } from "./receipt";

// 3 tomato crates (72 kg, shrinkage 6) for 60 USD at the Coche rate 201, BCV 200, margin 50 %.
const THREE_CRATES: PartialReceiptInput = {
  packs: "3",
  receivedPacks: "2",
  quotedPriceUsd: "60",
  grossQuantity: "72",
  shrinkage: "6",
  supplierRate: "201",
  bcvRate: "200",
  margin: "0.5",
  usdRoundingStep: "0.05",
};

describe("pricePartialReceipt", () => {
  test("bought: 66 kg usable, 0.9136 $/kg, sells at 1.40", () => {
    expect(priceLine(THREE_CRATES)).toMatchObject({
      realCostUsd: "60.3000",
      unitCostUsd: "0.9136",
      salePriceUsd: "1.4000",
    });
  });

  test("2 of 3 crates arrive: the same 60.30 $ over 44 kg → 1.3705 $/kg, sells at 2.10", () => {
    expect(pricePartialReceipt(THREE_CRATES)).toEqual({
      receivedQuantity: "48.0000",
      receivedUsableQuantity: "44.0000",
      receivedUnitCostUsd: "1.3705",
      receivedSalePriceUsd: "2.1000",
    });
  });

  test("a weighed quantity wins over the packs share (50 kg → shrinkage 4.1667)", () => {
    expect(pricePartialReceipt({ ...THREE_CRATES, receivedQuantity: "50" })).toEqual({
      receivedQuantity: "50.0000",
      receivedUsableQuantity: "45.8333",
      receivedUnitCostUsd: "1.3156",
      receivedSalePriceUsd: "2.0000",
    });
  });

  test("bundles by unit: 1 of 2 cilantro bundles (56 → 28 bunches, shrinkage 2 → 1)", () => {
    const result = pricePartialReceipt({
      ...THREE_CRATES,
      packs: "2",
      receivedPacks: "1",
      quotedPriceUsd: "20",
      grossQuantity: "56",
      shrinkage: "2",
      supplierRate: "200",
    });

    expect(result.receivedUsableQuantity).toBe("27.0000");
    expect(result.receivedUnitCostUsd).toBe("0.7407");
    expect(result.receivedSalePriceUsd).toBe("1.1500");
  });

  test.each([
    ["no packs received (that is 'missing')", { receivedPacks: "0" }, "receivedPacks"],
    ["every pack received (that is 'received')", { receivedPacks: "3" }, "receivedPacks"],
    ["more than bought", { receivedPacks: "4" }, "receivedPacks"],
    ["zero weighed", { receivedQuantity: "0" }, "receivedQuantity"],
    ["more weight than bought", { receivedQuantity: "72.0001" }, "receivedQuantity"],
  ] as const)("rejects %s", (_case, change, field) => {
    let error: unknown;
    try {
      pricePartialReceipt({ ...THREE_CRATES, ...change });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(InvalidReceiptError);
    expect(error).toMatchObject({ field, code: "INVALID_RECEIPT" });
  });

  test("purchase values are still validated by priceLine", () => {
    expect(() => pricePartialReceipt({ ...THREE_CRATES, shrinkage: "72" })).toThrow(
      ShrinkageExceedsQuantityError,
    );
  });
});
