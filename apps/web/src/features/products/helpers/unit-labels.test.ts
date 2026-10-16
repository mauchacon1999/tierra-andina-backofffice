import type { Product } from "@ta/validators";
import { describe, expect, it } from "vitest";

import { describeProduct } from "@/features/products/helpers/describe-product";
import { packQuantityLabel, unitsSummary } from "@/features/products/helpers/unit-labels";

describe("packQuantityLabel (products.md §2)", () => {
  it.each([
    ["crate", "kg", "Kilos aprox. por cesta"],
    ["crate", "unit", "Unidades aprox. por cesta"],
    ["bundle", "kg", "Kilos aprox. por cuenta"],
    ["bundle", "unit", "Rollitos por cuenta"],
  ] as const)("%s + %s → %s", (purchaseUnit, saleUnit, label) => {
    expect(packQuantityLabel(purchaseUnit, saleUnit)).toBe(label);
  });

  it("has no pack quantity for kilo products", () => {
    expect(packQuantityLabel("kg", "kg")).toBeNull();
  });
});

describe("describeProduct", () => {
  const product: Product = {
    id: "p1",
    name: "Cilantro",
    categoryId: "c1",
    categoryName: "Hojas y aliños",
    purchaseUnit: "bundle",
    saleUnit: "unit",
    defaultPackQuantity: "28.0000",
    lastShrinkage: "2.0000",
    lastMargin: "0.5000",
    isActive: true,
    createdAt: "2026-10-16T00:00:00.000Z",
    updatedAt: "2026-10-16T00:00:00.000Z",
  };

  it("builds the Spanish texts with es-VE numbers", () => {
    expect(describeProduct(product)).toEqual({
      units: "Cuenta → Unidad",
      pack: "28 und por cuenta",
      shrinkage: "2 und",
      margin: "50 %",
    });
    expect(unitsSummary("crate", "kg")).toBe("Cesta → Kilo");
  });

  it("has no pack text for kilo products", () => {
    expect(
      describeProduct({ ...product, purchaseUnit: "kg", saleUnit: "kg", defaultPackQuantity: null })
        .pack,
    ).toBeNull();
  });
});
