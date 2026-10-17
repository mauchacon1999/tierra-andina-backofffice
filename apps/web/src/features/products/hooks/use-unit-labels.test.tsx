import { renderHook } from "@testing-library/react";
import type { Product } from "@ta/validators";
import { describe, expect, it } from "vitest";

import { describeProduct } from "@/features/products/helpers/describe-product";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

const labels = () => renderHook(() => useUnitLabels(), { wrapper: IntlTestWrapper }).result.current;

describe("useUnitLabels", () => {
  it.each([
    ["crate", "kg", "Kilos aprox. por cesta"],
    ["crate", "unit", "Unidades aprox. por cesta"],
    ["bundle", "kg", "Kilos aprox. por cuenta"],
    ["bundle", "unit", "Rollitos por cuenta"],
  ] as const)("pack quantity label of %s + %s is %s (products.md §2)", (purchase, sale, label) => {
    expect(labels().packQuantity(purchase, sale)).toBe(label);
  });

  it("kilo products have no pack quantity", () => {
    expect(labels().packQuantity("kg", "kg")).toBeNull();
    expect(labels().perPack("kg", "1", "kg")).toBeNull();
  });

  it("names units as the shop says them", () => {
    const l = labels();
    expect(l.summary("crate", "kg")).toBe("Cesta → Kilo");
    expect(l.packs("bundle")).toBe("Cuentas");
    expect(l.suffix("unit")).toBe("und");
  });

  it("agrees the packs noun with the amount (1 cuenta, 3 cuentas, 2,5 kilos)", () => {
    const l = labels();
    expect(l.packsCount("bundle", "1.0000")).toBe("1 cuenta");
    expect(l.packsCount("crate", "3.0000")).toBe("3 cestas");
    expect(l.packsCount("kg", "2.5000")).toBe("2,5 kilos");
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

  it("builds the texts with es-VE numbers", () => {
    expect(describeProduct(product, labels())).toEqual({
      units: "Cuenta → Unidad",
      pack: "28 und por cuenta",
      shrinkage: "2 und",
      margin: "50 %",
    });
  });

  it("has no pack text for kilo products", () => {
    const kilo: Product = {
      ...product,
      purchaseUnit: "kg",
      saleUnit: "kg",
      defaultPackQuantity: null,
    };
    expect(describeProduct(kilo, labels()).pack).toBeNull();
  });
});
