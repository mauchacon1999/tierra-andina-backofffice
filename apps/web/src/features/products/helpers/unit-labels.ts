import type { PurchaseUnit, SaleUnit } from "@ta/core";

/** Spanish labels per unit, as the shop says them (products.md §1.2 / §2). */
export const PURCHASE_UNIT_LABELS = {
  crate: "Cesta",
  bundle: "Cuenta",
  kg: "Kilo",
} as const satisfies Record<PurchaseUnit, string>;

export const SALE_UNIT_LABELS = {
  kg: "Kilo",
  unit: "Unidad",
} as const satisfies Record<SaleUnit, string>;

/** Suffix shown after quantities in the sale unit. */
export const SALE_UNIT_SUFFIX = {
  kg: "kg",
  unit: "und",
} as const satisfies Record<SaleUnit, string>;

const PACK_NOUN = { crate: "cesta", bundle: "cuenta" } as const;

/**
 * Label of the pack-quantity field (products.md §2): "Kilos aprox. por cesta",
 * "Rollitos por cuenta"… Null for kg products (no pack quantity).
 */
export function packQuantityLabel(purchaseUnit: PurchaseUnit, saleUnit: SaleUnit): string | null {
  if (purchaseUnit === "kg") return null;
  if (purchaseUnit === "bundle" && saleUnit === "unit") return "Rollitos por cuenta";
  const what = saleUnit === "kg" ? "Kilos" : "Unidades";
  return `${what} aprox. por ${PACK_NOUN[purchaseUnit]}`;
}

/** "Cesta → Kilo" for lists and cards. */
export function unitsSummary(purchaseUnit: PurchaseUnit, saleUnit: SaleUnit): string {
  return `${PURCHASE_UNIT_LABELS[purchaseUnit]} → ${SALE_UNIT_LABELS[saleUnit]}`;
}
