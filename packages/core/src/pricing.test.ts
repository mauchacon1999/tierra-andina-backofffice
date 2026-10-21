import { describe, expect, test } from "bun:test";

import { InvalidValueError, ShrinkageExceedsQuantityError } from "./errors";
import {
  impliedMargin,
  priceInBs,
  priceLine,
  proposeSaleRateList,
  purchasePrice,
  storableMargin,
  totalFromKiloPrice,
  type LinePricingInput,
} from "./pricing";

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

describe("proposeSaleRateList", () => {
  const tomato = { priceUsd: "1.4000", priceBs: "294.0000" };

  test("a sale rate of 211 moves 1.40 USD from 294 Bs to 296 Bs and keeps the dollars", () => {
    expect(proposeSaleRateList([tomato], "211", "1")).toEqual([
      { ...tomato, proposedPriceBs: "296.0000", changed: true },
    ]);
  });

  test("returns undefined when the step absorbs the change", () => {
    expect(
      proposeSaleRateList([{ priceUsd: "0.0500", priceBs: "11.0000" }], "210.01", "1"),
    ).toBeUndefined();
  });

  test("keeps unchanged products in the list and marks only the ones that move", () => {
    const proposed = proposeSaleRateList(
      [tomato, { priceUsd: "0.0500", priceBs: "11.0000" }],
      "210.01",
      "1",
    );
    expect(proposed?.map((line) => line.changed)).toEqual([true, false]);
    expect(proposed?.[1]?.proposedPriceBs).toBe("11.0000");
  });

  test("an empty shelf has nothing to propose", () => {
    expect(proposeSaleRateList([], "211", "1")).toBeUndefined();
  });
});

describe("impliedMargin", () => {
  test("tomato at 1.40 USD over a 0.9091 cost is a 54 % margin", () => {
    expect(impliedMargin("1.4", "0.9091")).toBe("0.5400");
  });

  test("a price equal to the cost is 0 %; below cost is negative", () => {
    expect(impliedMargin("2", "2")).toBe("0.0000");
    expect(impliedMargin("1.5", "2")).toBe("-0.2500");
  });

  test("rounds half-up to 4 decimals", () => {
    expect(impliedMargin("1", "3")).toBe("-0.6667");
  });

  test("null when the cost is 0", () => {
    expect(impliedMargin("1.4", "0")).toBeNull();
  });

  test("throws for a negative price or cost", () => {
    expect(() => impliedMargin("-1", "1")).toThrow(InvalidValueError);
    expect(() => impliedMargin("1", "-1")).toThrow(InvalidValueError);
  });
});

describe("storableMargin", () => {
  test("keeps margins from 0 to 500 %", () => {
    expect(storableMargin("0.0000")).toBe("0.0000");
    expect(storableMargin("0.5400")).toBe("0.5400");
    expect(storableMargin("5")).toBe("5");
  });

  test("null below cost, above 500 % or when unknown", () => {
    expect(storableMargin("-0.2500")).toBeNull();
    expect(storableMargin("5.0001")).toBeNull();
    expect(storableMargin(null)).toBeNull();
  });
});

describe("purchasePrice", () => {
  test("3 tomato crates at 60 USD: 20 USD per crate", () => {
    expect(
      purchasePrice({
        quotedPriceUsd: "60",
        packs: "3",
        grossQuantity: "72",
        purchaseUnit: "crate",
      }),
    ).toEqual({ priceUsd: "20.0000", per: "pack" });
  });

  test("bundles: per bundle, rounded half-up to 4 decimals", () => {
    expect(
      purchasePrice({
        quotedPriceUsd: "10",
        packs: "3",
        grossQuantity: "30",
        purchaseUnit: "bundle",
      }),
    ).toEqual({ priceUsd: "3.3333", per: "pack" });
  });

  test("bought by kilo: per kilo of the gross quantity", () => {
    expect(
      purchasePrice({ quotedPriceUsd: "30", packs: null, grossQuantity: "25", purchaseUnit: "kg" }),
    ).toEqual({ priceUsd: "1.2000", per: "saleUnit" });
  });

  test("crates not counted: per kilo of the gross quantity", () => {
    expect(
      purchasePrice({
        quotedPriceUsd: "20",
        packs: null,
        grossQuantity: "24",
        purchaseUnit: "crate",
      }),
    ).toEqual({ priceUsd: "0.8333", per: "saleUnit" });
  });

  test("throws for 0 packs, 0 kilos or a negative price", () => {
    expect(() =>
      purchasePrice({
        quotedPriceUsd: "20",
        packs: "0",
        grossQuantity: "24",
        purchaseUnit: "crate",
      }),
    ).toThrow(InvalidValueError);
    expect(() =>
      purchasePrice({ quotedPriceUsd: "20", packs: null, grossQuantity: "0", purchaseUnit: "kg" }),
    ).toThrow(InvalidValueError);
    expect(() =>
      purchasePrice({ quotedPriceUsd: "-1", packs: null, grossQuantity: "1", purchaseUnit: "kg" }),
    ).toThrow(InvalidValueError);
  });
});

describe("totalFromKiloPrice", () => {
  test("papaya at 1.20 $/kg × 40 kg is 48 $", () => {
    expect(totalFromKiloPrice("1.2", "40")).toBe("48.0000");
  });

  test("rounds half-up to 4 decimals", () => {
    expect(totalFromKiloPrice("1.2345", "2.5")).toBe("3.0863");
  });

  test("throws for a negative price or no kilos", () => {
    expect(() => totalFromKiloPrice("-1", "40")).toThrow(InvalidValueError);
    expect(() => totalFromKiloPrice("1.2", "0")).toThrow(InvalidValueError);
  });
});
