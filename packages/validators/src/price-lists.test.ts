import { describe, expect, test } from "bun:test";

import { productWhatsappSchema, setManualPriceSchema } from "./price-lists";

const errorsOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("setManualPriceSchema", () => {
  test("accepts a bolívar price with up to 4 decimals", () => {
    expect(setManualPriceSchema.parse({ priceBs: "450.5" })).toEqual({ priceBs: "450.5" });
  });

  test("rejects 0, negatives, commas and text", () => {
    expect(errorsOf(setManualPriceSchema.safeParse({ priceBs: "0" }))).toEqual([
      "decimal.positive|subject=price",
    ]);
    expect(errorsOf(setManualPriceSchema.safeParse({ priceBs: "-1" }))).toEqual([
      "decimal.negative|subject=price",
    ]);
    expect(errorsOf(setManualPriceSchema.safeParse({ priceBs: "450,5" }))).toEqual([
      "decimal.format|subject=price",
    ]);
    expect(setManualPriceSchema.safeParse({ priceBs: 450 }).success).toBe(false);
  });
});

describe("productWhatsappSchema", () => {
  test("takes on or off", () => {
    expect(productWhatsappSchema.parse({ shareOnWhatsapp: true })).toEqual({
      shareOnWhatsapp: true,
    });
  });

  test("anything else asks for it", () => {
    expect(errorsOf(productWhatsappSchema.safeParse({}))).toEqual(["product.whatsappRequired"]);
  });
});
