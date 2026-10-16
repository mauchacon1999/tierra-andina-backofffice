import { describe, expect, test } from "bun:test";

import { InvalidValueError, ShrinkageExceedsQuantityError } from "./errors";
import { priceInBs, priceLine, type LinePricingInput } from "./pricing";

// Reference cases of docs/domain-model.md §3.3.
const TOMATO_CRATE: LinePricingInput = {
  quotedPriceUsd: "20",
  grossQuantity: "24",
  shrinkage: "2",
  supplierRate: "200",
  bcvRate: "200",
  margin: "0.50",
  usdRoundingStep: "0.05",
};

describe("priceLine — reference cases", () => {
  test("tomato crate: usable 22, unit cost 0.9091, price 1.40 USD", () => {
    expect(priceLine(TOMATO_CRATE)).toEqual({
      usableQuantity: "22.0000",
      realCostUsd: "20.0000",
      unitCostUsd: "0.9091",
      salePriceUsd: "1.4000",
    });
  });

  test("supplier rounding: supplier rate 201 makes the real cost 20.10 USD", () => {
    const result = priceLine({ ...TOMATO_CRATE, supplierRate: "201" });

    expect(result.realCostUsd).toBe("20.1000");
    expect(result.unitCostUsd).toBe("0.9136");
  });

  test("cilantro bundle: 28 bunches, shrinkage 2 → usable 26, price 0.60 USD", () => {
    const result = priceLine({
      ...TOMATO_CRATE,
      quotedPriceUsd: "10",
      grossQuantity: "28",
      shrinkage: "2",
    });

    expect(result.usableQuantity).toBe("26.0000");
    expect(result.unitCostUsd).toBe("0.3846");
    expect(result.salePriceUsd).toBe("0.6000");
  });

  test("invalid shrinkage: equal to the gross quantity is an error", () => {
    expect(() => priceLine({ ...TOMATO_CRATE, shrinkage: "24" })).toThrow(
      ShrinkageExceedsQuantityError,
    );
  });
});

describe("priceLine — rules and edge cases", () => {
  test("uses the line total: 3 crates at 20 USD are quoted as 60", () => {
    const result = priceLine({
      ...TOMATO_CRATE,
      quotedPriceUsd: "60",
      grossQuantity: "72",
      shrinkage: "6",
    });

    expect(result.usableQuantity).toBe("66.0000");
    expect(result.unitCostUsd).toBe("0.9091");
    expect(result.salePriceUsd).toBe("1.4000");
  });

  test("zero margin still rounds the price up to the step", () => {
    expect(priceLine({ ...TOMATO_CRATE, margin: "0" }).salePriceUsd).toBe("0.9500");
  });

  test("no shrinkage", () => {
    expect(priceLine({ ...TOMATO_CRATE, shrinkage: "0" }).usableQuantity).toBe("24.0000");
  });

  test("decimal quantities (kilos with grams)", () => {
    const result = priceLine({ ...TOMATO_CRATE, grossQuantity: "23.75", shrinkage: "1.25" });

    expect(result.usableQuantity).toBe("22.5000");
    expect(result.unitCostUsd).toBe("0.8889");
  });

  test.each([
    ["shrinkage above gross", { shrinkage: "25" }, ShrinkageExceedsQuantityError],
    ["negative shrinkage", { shrinkage: "-1" }, ShrinkageExceedsQuantityError],
    ["zero gross quantity", { grossQuantity: "0", shrinkage: "0" }, InvalidValueError],
    ["zero supplier rate", { supplierRate: "0" }, InvalidValueError],
    ["zero BCV rate", { bcvRate: "0" }, InvalidValueError],
    ["negative price", { quotedPriceUsd: "-1" }, InvalidValueError],
    ["negative margin", { margin: "-0.1" }, InvalidValueError],
    ["margin above 500 %", { margin: "5.01" }, InvalidValueError],
  ] as const)("rejects %s", (_label, override, error) => {
    expect(() => priceLine({ ...TOMATO_CRATE, ...override })).toThrow(error);
  });
});

describe("priceInBs", () => {
  test("Bs conversion: 1.40 USD at sale rate 210, Bs step 1 → 294 Bs", () => {
    expect(priceInBs("1.40", "210", "1")).toBe("294.0000");
  });

  test("rounds up to the next bolívar", () => {
    expect(priceInBs("1.40", "210.5", "1")).toBe("295.0000");
  });

  test("rejects a sale rate ≤ 0", () => {
    expect(() => priceInBs("1.40", "0", "1")).toThrow(InvalidValueError);
  });
});
