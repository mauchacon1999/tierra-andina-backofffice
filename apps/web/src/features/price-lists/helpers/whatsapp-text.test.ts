import type { ManualPriceRow } from "@ta/validators";
import { describe, expect, it } from "vitest";

import { buildWhatsappText, whatsappRows } from "@/features/price-lists/helpers/whatsapp-text";

const row = (name: string, overrides: Partial<ManualPriceRow> = {}): ManualPriceRow => ({
  productId: `0199f000-0000-7000-8000-00000000000${name.length}`,
  productName: name,
  saleUnit: "kg",
  lastPurchase: { priceUsd: "0.8000", per: "saleUnit", purchaseUnit: "kg" },
  priceUsd: "2.2500",
  priceBs: "450.0000",
  shareOnWhatsapp: true,
  ...overrides,
});

describe("whatsappRows", () => {
  it("keeps only the products switched on that have a price, in order", () => {
    const rows = [
      row("Aguacate"),
      row("Cebolla", { shareOnWhatsapp: false }),
      row("Ñame", { priceBs: null }),
      row("Tomate"),
    ];

    expect(whatsappRows(rows).map((r) => r.productName)).toEqual(["Aguacate", "Tomate"]);
  });
});

describe("buildWhatsappText", () => {
  it("a title line, then one line per product", () => {
    const text = buildWhatsappText(whatsappRows([row("Aguacate"), row("Tomate")]), {
      title: "*Precios*",
      line: (r) => `${r.productName}: ${r.priceBs}`,
    });

    expect(text).toBe("*Precios*\nAguacate: 450.0000\nTomate: 450.0000");
  });
});
