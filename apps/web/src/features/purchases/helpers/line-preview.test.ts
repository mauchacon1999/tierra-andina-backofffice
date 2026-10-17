import type { PurchaseLineFormValues } from "@ta/validators";
import { describe, expect, it } from "vitest";

import { computeLinePreview } from "@/features/purchases/helpers/line-preview";

// Tomato crate of docs/domain-model.md §3.3, bought at the Coche rate 201 with BCV 200.
const TOMATO: PurchaseLineFormValues = {
  productId: "01a14314-2825-7000-a1d1-bdf734d05981",
  supplierId: "",
  stallReference: "",
  packs: "1",
  grossQuantity: "24",
  shrinkage: "2",
  quotedPriceUsd: "20",
  supplierRate: "",
  marginPercent: "50",
  paymentStatus: "paid",
};
const TRIP = { bcvRate: "200", marketRate: "201", usdRoundingStep: "0.05" };

describe("computeLinePreview", () => {
  it("uses the trip's Coche rate when no supplier rate is typed: 4020 Bs, 0.9136 $/kg, sells at 1.40", () => {
    expect(computeLinePreview(TOMATO, TRIP)).toEqual({
      usableQuantity: "22.0000",
      realCostUsd: "20.1000",
      unitCostUsd: "0.9136",
      salePriceUsd: "1.4000",
      amountBs: "4020.0000",
      supplierRate: "201",
    });
  });

  it("a typed supplier rate wins over the Coche rate", () => {
    const preview = computeLinePreview({ ...TOMATO, supplierRate: "200" }, TRIP);

    expect(preview?.supplierRate).toBe("200");
    expect(preview?.realCostUsd).toBe("20.0000");
    expect(preview?.amountBs).toBe("4000.0000");
  });

  it.each([
    ["no price yet", { quotedPriceUsd: "" }],
    ["no gross quantity", { grossQuantity: "" }],
    ["shrinkage equal to the gross quantity", { shrinkage: "24" }],
    ["margin above 500 %", { marginPercent: "600" }],
    ["no product", { productId: "" }],
  ])("null while the line is incomplete or invalid (%s)", (_case, change) => {
    expect(computeLinePreview({ ...TOMATO, ...change }, TRIP)).toBeNull();
  });
});
