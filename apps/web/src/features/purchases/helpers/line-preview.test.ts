import type { PurchaseLineFormValues } from "@ta/validators";
import { describe, expect, it } from "vitest";

import { computeLinePreview } from "@/features/purchases/helpers/line-preview";

// Tomato crate of docs/domain-model.md §3.3, bought at the Coche rate 201 with BCV 200.
const TOMATO: PurchaseLineFormValues = {
  productId: "01a14314-2825-7000-a1d1-bdf734d05981",
  packs: "",
  grossQuantity: "24",
  quotedPriceUsd: "20",
  marginPercent: "50",
  paymentStatus: "paid",
  supplierId: "",
};
const TRIP = { bcvRate: "200", marketRate: "201", usdRoundingStep: "0.05", shrinkage: "2" };

describe("computeLinePreview", () => {
  it("prices the dollars with the trip's Coche rate: 4020 Bs, 0.9136 $/kg, sells at 1.40", () => {
    expect(computeLinePreview(TOMATO, TRIP)).toEqual({
      usableQuantity: "22.0000",
      realCostUsd: "20.1000",
      unitCostUsd: "0.9136",
      salePriceUsd: "1.4000",
      amountBs: "4020.0000",
      supplierRate: "201",
    });
  });

  it("works when the crates were left empty", () => {
    expect(computeLinePreview(TOMATO, TRIP)?.amountBs).toBe("4020.0000");
  });

  it.each([
    ["no price yet", { quotedPriceUsd: "" }, {}],
    ["no gross quantity", { grossQuantity: "" }, {}],
    ["product shrinkage not below the quantity", {}, { shrinkage: "24" }],
    ["margin above 500 %", { marginPercent: "600" }, {}],
    ["no product", { productId: "" }, { shrinkage: "" }],
  ] as const)("null while the line is incomplete or invalid (%s)", (_case, change, context) => {
    expect(computeLinePreview({ ...TOMATO, ...change }, { ...TRIP, ...context })).toBeNull();
  });
});
