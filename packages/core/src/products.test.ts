import { describe, expect, test } from "bun:test";

import {
  allowedSaleUnits,
  assertValidProduct,
  cleanProductName,
  estimateGrossQuantity,
  fractionToPercent,
  InvalidProductDefaultsError,
  InvalidUnitCombinationError,
  isValidUnitCombination,
  normalizeProductName,
  percentToFraction,
  requiresPackQuantity,
  validateProductDefaults,
  type ProductDefaultsInput,
} from "./products";

describe("unit rules (products.md §1.2)", () => {
  test("crates and bundles can be sold by kg or by unit; kilos only by kg", () => {
    expect(allowedSaleUnits("crate")).toEqual(["kg", "unit"]);
    expect(allowedSaleUnits("bundle")).toEqual(["kg", "unit"]);
    expect(allowedSaleUnits("kg")).toEqual(["kg"]);
  });

  test.each([
    ["crate", "kg", true],
    ["crate", "unit", true],
    ["bundle", "kg", true],
    ["bundle", "unit", true],
    ["kg", "kg", true],
    ["kg", "unit", false],
  ] as const)("%s → %s is %p", (purchaseUnit, saleUnit, valid) => {
    expect(isValidUnitCombination(purchaseUnit, saleUnit)).toBe(valid);
  });

  test("pack quantity is required for crate and bundle only", () => {
    expect(requiresPackQuantity("crate")).toBe(true);
    expect(requiresPackQuantity("bundle")).toBe(true);
    expect(requiresPackQuantity("kg")).toBe(false);
  });
});

describe("product names (products.md §1.4)", () => {
  test("cleanProductName trims and collapses spaces, keeping case and accents", () => {
    expect(cleanProductName("  Tomate   perita ")).toBe("Tomate perita");
    expect(cleanProductName("Cebollín\t morado")).toBe("Cebollín morado");
  });

  test("normalizeProductName ignores case, accents and spacing", () => {
    expect(normalizeProductName("Cebollín")).toBe("cebollin");
    expect(normalizeProductName("  CEBOLLIN ")).toBe("cebollin");
    expect(normalizeProductName("Ají  dulce")).toBe("aji dulce");
    expect(normalizeProductName("Pingüino")).toBe("pinguino");
  });

  test("keeps the ñ: 'Ñame' and 'Name' are different products", () => {
    expect(normalizeProductName("Ñame")).toBe("ñame");
    expect(normalizeProductName("ñame")).toBe("ñame");
    expect(normalizeProductName("Ñame")).not.toBe(normalizeProductName("Name"));
  });
});

const CRATE: ProductDefaultsInput = {
  purchaseUnit: "crate",
  defaultPackQuantity: "24",
  lastShrinkage: "2",
  lastMargin: "0.5",
};

describe("validateProductDefaults (products.md §3)", () => {
  test("accepts valid crate and kg products", () => {
    expect(validateProductDefaults(CRATE)).toEqual([]);
    expect(
      validateProductDefaults({ ...CRATE, purchaseUnit: "kg", defaultPackQuantity: null }),
    ).toEqual([]);
  });

  test("accepts the margin limits 0 and 5 (0 % and 500 %)", () => {
    expect(validateProductDefaults({ ...CRATE, lastMargin: "0" })).toEqual([]);
    expect(validateProductDefaults({ ...CRATE, lastMargin: "5" })).toEqual([]);
  });

  test.each([
    [
      "crate without pack quantity",
      { defaultPackQuantity: null },
      [{ field: "defaultPackQuantity", code: "PACK_QUANTITY_REQUIRED" }],
    ],
    [
      "pack quantity 0",
      { defaultPackQuantity: "0" },
      [{ field: "defaultPackQuantity", code: "PACK_QUANTITY_NOT_POSITIVE" }],
    ],
    [
      "kg with pack quantity",
      { purchaseUnit: "kg", defaultPackQuantity: "10" },
      [{ field: "defaultPackQuantity", code: "PACK_QUANTITY_NOT_ALLOWED" }],
    ],
    [
      "negative shrinkage",
      { lastShrinkage: "-1" },
      [{ field: "lastShrinkage", code: "SHRINKAGE_NEGATIVE" }],
    ],
    [
      "shrinkage equal to the pack",
      { lastShrinkage: "24" },
      [{ field: "lastShrinkage", code: "SHRINKAGE_NOT_BELOW_PACK" }],
    ],
    [
      "margin above 500 %",
      { lastMargin: "5.0001" },
      [{ field: "lastMargin", code: "MARGIN_OUT_OF_RANGE" }],
    ],
    [
      "negative margin",
      { lastMargin: "-0.1" },
      [{ field: "lastMargin", code: "MARGIN_OUT_OF_RANGE" }],
    ],
  ] as const)("reports %s", (_label, override, issues) => {
    expect(validateProductDefaults({ ...CRATE, ...override })).toEqual([...issues]);
  });

  test("reports every problem at once", () => {
    expect(
      validateProductDefaults({ ...CRATE, defaultPackQuantity: null, lastMargin: "9" }),
    ).toHaveLength(2);
  });

  test("rejects non-numeric values", () => {
    expect(() => validateProductDefaults({ ...CRATE, lastMargin: "mucho" })).toThrow(TypeError);
  });
});

describe("assertValidProduct", () => {
  test("throws InvalidUnitCombinationError for kg → unit", () => {
    expect(() =>
      assertValidProduct({
        ...CRATE,
        purchaseUnit: "kg",
        saleUnit: "unit",
        defaultPackQuantity: null,
      }),
    ).toThrow(InvalidUnitCombinationError);
  });

  test("throws InvalidProductDefaultsError with the issues", () => {
    try {
      assertValidProduct({ ...CRATE, saleUnit: "kg", lastShrinkage: "30" });
      throw new Error("expected an error");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidProductDefaultsError);
      expect((error as InvalidProductDefaultsError).code).toBe("INVALID_PRODUCT_DEFAULTS");
      expect((error as InvalidProductDefaultsError).issues).toEqual([
        { field: "lastShrinkage", code: "SHRINKAGE_NOT_BELOW_PACK" },
      ]);
    }
  });

  test("passes for a valid product", () => {
    expect(() => assertValidProduct({ ...CRATE, saleUnit: "unit" })).not.toThrow();
  });
});

describe("percent ⇄ fraction", () => {
  test("converts exactly, without floats", () => {
    expect(percentToFraction("50")).toBe("0.5");
    expect(percentToFraction("12.5")).toBe("0.125");
    expect(percentToFraction("500")).toBe("5");
    expect(fractionToPercent("0.5000")).toBe("50");
    expect(fractionToPercent("0.0725")).toBe("7.25");
  });
});

describe("estimateGrossQuantity", () => {
  test("packs × pack quantity: 3 tomato crates of 24 kg → 72 kg", () => {
    expect(estimateGrossQuantity("3", "crate", "24.0000")).toBe("72");
    expect(estimateGrossQuantity("1.5", "bundle", "28")).toBe("42");
  });

  test("kilo products: the packs are the kilos", () => {
    expect(estimateGrossQuantity("12.5", "kg", null)).toBe("12.5");
  });

  test.each([
    ["no pack quantity", "3", "crate", null],
    ["zero pack quantity", "3", "crate", "0"],
    ["empty packs", "", "crate", "24"],
    ["zero packs", "0", "kg", null],
    ["not a number", "tres", "crate", "24"],
  ] as const)("null when it cannot be estimated (%s)", (_case, packs, unit, perPack) => {
    expect(estimateGrossQuantity(packs, unit, perPack)).toBeNull();
  });
});
