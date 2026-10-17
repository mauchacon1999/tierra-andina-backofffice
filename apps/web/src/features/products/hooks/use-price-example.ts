"use client";

import { percentToFraction, priceLine, type PurchaseUnit, type SaleUnit } from "@ta/core";
import { decimalSchema } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useUnitLabels, type UnitLabels } from "@/features/products/hooks/use-unit-labels";
import { formatQuantity, formatUsd } from "@/utils/format-number";

export type PriceExampleInput = {
  purchaseUnit: PurchaseUnit;
  saleUnit: SaleUnit;
  defaultPackQuantity: string;
  lastShrinkage: string;
  lastMarginPercent: string;
  /** Store setting `usdRoundingStep`, e.g. "0.05". */
  usdRoundingStep: string;
};

export type UsePriceExampleResult = {
  sampleCost: string;
  setSampleCost: (value: string) => void;
  /** "Cesta a 20,00 $ → 22 kg útiles → 0,91 $/kg → venta 1,40 $/kg", or null if incomplete. */
  example: string | null;
};

const sampleCostSchema = decimalSchema("price");

type PackExample = {
  unit: string;
  cost: string;
  usable: string;
  unitCost: string;
  sale: string;
  suffix: string;
};

/** Texts of the example in the current language (`products.priceExample` messages). */
export type PriceExampleText = {
  units: UnitLabels;
  pack: (values: PackExample) => string;
  kilo: (values: Pick<PackExample, "cost" | "sale" | "suffix">) => string;
};

export function usePriceExampleText(): PriceExampleText {
  const t = useTranslations("products.priceExample");
  return {
    units: useUnitLabels(),
    pack: (values) => t("pack", values),
    kilo: (values) => t("kilo", values),
  };
}

/**
 * Live "what would it cost" line under the product form (products.md §2), computed with
 * @ta/core `priceLine` (supplier rate = BCV rate, so no rate effect). Not saved.
 */
export function describePriceExample(
  input: PriceExampleInput,
  sampleCost: string,
  text: PriceExampleText,
): string | null {
  if (!sampleCostSchema.safeParse(sampleCost).success) return null;
  const suffix = text.units.suffix(input.saleUnit);
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
      usdRoundingStep: input.usdRoundingStep,
    });
    const cost = formatUsd(sampleCost);
    const sale = formatUsd(pricing.salePriceUsd);
    if (isKg) return text.kilo({ cost, sale, suffix });
    return text.pack({
      unit: text.units.purchase(input.purchaseUnit),
      cost,
      usable: formatQuantity(pricing.usableQuantity),
      unitCost: formatUsd(pricing.unitCostUsd),
      sale,
      suffix,
    });
  } catch {
    // Incomplete or invalid inputs (no pack quantity yet, shrinkage ≥ pack…): show nothing.
    return null;
  }
}

export function usePriceExample(input: PriceExampleInput): UsePriceExampleResult {
  const [sampleCost, setSampleCost] = useState("");
  const text = usePriceExampleText();
  // Cheap to compute: no memo, so it always follows the latest form values and messages.
  return { sampleCost, setSampleCost, example: describePriceExample(input, sampleCost, text) };
}
