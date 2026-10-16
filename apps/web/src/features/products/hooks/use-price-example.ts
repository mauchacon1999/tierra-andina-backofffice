"use client";

import { percentToFraction, priceLine, type PurchaseUnit, type SaleUnit } from "@ta/core";
import { decimalSchema } from "@ta/validators";
import { useMemo, useState } from "react";

import { USD_ROUNDING_STEP } from "@/features/products/helpers/product-form-values";
import { PURCHASE_UNIT_LABELS, SALE_UNIT_SUFFIX } from "@/features/products/helpers/unit-labels";
import { formatQuantity, formatUsd } from "@/utils/format-number";

export type PriceExampleInput = {
  purchaseUnit: PurchaseUnit;
  saleUnit: SaleUnit;
  defaultPackQuantity: string;
  lastShrinkage: string;
  lastMarginPercent: string;
};

export type UsePriceExampleResult = {
  sampleCost: string;
  setSampleCost: (value: string) => void;
  /** "Cesta a 20,00 $ → 22 kg útiles → 0,91 $/kg → venta 1,40 $/kg", or null if incomplete. */
  example: string | null;
};

const sampleCostSchema = decimalSchema("El costo");

/**
 * Live "what would it cost" line under the product form (products.md §2), computed with
 * @ta/core `priceLine` (supplier rate = BCV rate, so no rate effect). Not saved.
 */
export function describePriceExample(input: PriceExampleInput, sampleCost: string): string | null {
  if (!sampleCostSchema.safeParse(sampleCost).success) return null;
  const suffix = SALE_UNIT_SUFFIX[input.saleUnit];
  const isKg = input.purchaseUnit === "kg";
  try {
    const pricing = priceLine({
      quotedPriceUsd: sampleCost,
      // A kg product is priced per kilo: one kilo, no shrinkage.
      grossQuantity: isKg ? "1" : input.defaultPackQuantity,
      shrinkage: isKg ? "0" : input.lastShrinkage || "0",
      supplierRate: "1",
      bcvRate: "1",
      margin: percentToFraction(input.lastMarginPercent),
      usdRoundingStep: USD_ROUNDING_STEP,
    });
    const sale = `venta ${formatUsd(pricing.salePriceUsd)}/${suffix}`;
    if (isKg) return `Kilo a ${formatUsd(sampleCost)} → ${sale}`;
    return [
      `${PURCHASE_UNIT_LABELS[input.purchaseUnit]} a ${formatUsd(sampleCost)}`,
      `${formatQuantity(pricing.usableQuantity)} ${suffix} útiles`,
      `${formatUsd(pricing.unitCostUsd)}/${suffix}`,
      sale,
    ].join(" → ");
  } catch {
    // Incomplete or invalid inputs (no pack quantity yet, shrinkage ≥ pack…): show nothing.
    return null;
  }
}

export function usePriceExample(input: PriceExampleInput): UsePriceExampleResult {
  const [sampleCost, setSampleCost] = useState("");
  const { purchaseUnit, saleUnit, defaultPackQuantity, lastShrinkage, lastMarginPercent } = input;
  const example = useMemo(
    () =>
      describePriceExample(
        { purchaseUnit, saleUnit, defaultPackQuantity, lastShrinkage, lastMarginPercent },
        sampleCost,
      ),
    [purchaseUnit, saleUnit, defaultPackQuantity, lastShrinkage, lastMarginPercent, sampleCost],
  );
  return { sampleCost, setSampleCost, example };
}
