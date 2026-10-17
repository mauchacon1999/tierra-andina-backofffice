"use client";

import { compareDecimals, type PurchaseUnit, type SaleUnit } from "@ta/core";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { formatQuantity } from "@/utils/format-number";

export type UnitLabels = {
  /** "Cesta", "Cuenta", "Kilo" */
  purchase: (unit: PurchaseUnit) => string;
  /** "Kilo", "Unidad" */
  sale: (unit: SaleUnit) => string;
  /** "kg" / "und", after quantities in the sale unit. */
  suffix: (unit: SaleUnit) => string;
  /** Packs as counted at Coche: "Cestas", "Cuentas", "Kilos". */
  packs: (unit: PurchaseUnit) => string;
  /** "1 cesta", "3 cestas", "2,5 kilos": a packs amount (decimal string) with its noun. */
  packsCount: (unit: PurchaseUnit, packs: string) => string;
  /** Label of the pack-quantity field ("Kilos aprox. por cesta"); null for kilo products. */
  packQuantity: (purchaseUnit: PurchaseUnit, saleUnit: SaleUnit) => string | null;
  /** "Cesta → Kilo" */
  summary: (purchaseUnit: PurchaseUnit, saleUnit: SaleUnit) => string;
  /** "2 kg": an already formatted quantity in the sale unit. */
  quantity: (quantity: string, saleUnit: SaleUnit) => string;
  /** "24 kg por cesta"; null for kilo products. */
  perPack: (purchaseUnit: PurchaseUnit, quantity: string, saleUnit: SaleUnit) => string | null;
};

const PACK_QUANTITY_KEYS = {
  crate: { kg: "crateKg", unit: "crateUnit" },
  bundle: { kg: "bundleKg", unit: "bundleUnit" },
} as const;

/**
 * Unit names as the shop says them (products.md §1.2 / §2), from the `units` messages.
 * Stable between renders (memoized on the translator), so it can be a memo dependency.
 */
export function useUnitLabels(): UnitLabels {
  const t = useTranslations("units");
  return useMemo(
    (): UnitLabels => ({
      purchase: (unit) => t(`purchase.${unit}`),
      sale: (unit) => t(`sale.${unit}`),
      suffix: (unit) => t(`suffix.${unit}`),
      packs: (unit) => t(`packs.${unit}`),
      packsCount: (unit, packs) =>
        t(`packsCount.${unit}`, {
          quantity: formatQuantity(packs),
          isOne: compareDecimals(packs, "1") === 0 ? "yes" : "no",
        }),
      packQuantity: (purchaseUnit, saleUnit) =>
        purchaseUnit === "kg"
          ? null
          : t(`packQuantity.${PACK_QUANTITY_KEYS[purchaseUnit][saleUnit]}`),
      summary: (purchaseUnit, saleUnit) =>
        t("summary", { purchase: t(`purchase.${purchaseUnit}`), sale: t(`sale.${saleUnit}`) }),
      quantity: (quantity, saleUnit) =>
        t("quantity", { quantity, suffix: t(`suffix.${saleUnit}`) }),
      perPack: (purchaseUnit, quantity, saleUnit) =>
        purchaseUnit === "kg"
          ? null
          : t(`perPack.${purchaseUnit}`, { quantity, suffix: t(`suffix.${saleUnit}`) }),
    }),
    [t],
  );
}
