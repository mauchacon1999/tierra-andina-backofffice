import { amountInBs, priceLine, type LinePricing } from "@ta/core";
import { purchaseLineFormSchema, type PurchaseLineFormValues } from "@ta/validators";

export type LinePreview = LinePricing & {
  /** Bs paid: quoted USD × the trip's Coche rate. */
  amountBs: string;
  /** The trip's Coche rate, the only rate a line uses. */
  supplierRate: string;
};

export type LinePreviewContext = {
  bcvRate: string;
  marketRate: string;
  usdRoundingStep: string;
  /** The product's shrinkage. Empty until a product is chosen. */
  shrinkage: string;
};

/**
 * Live cost of the line being typed, with the same @ta/core functions the API uses, so the
 * preview matches what is saved. The price in dollars is turned into bolívares with the
 * trip's Coche rate, and the shrinkage is the product's. Null while the values are
 * incomplete or invalid.
 */
export function computeLinePreview(
  values: PurchaseLineFormValues,
  context: LinePreviewContext,
): LinePreview | null {
  const parsed = purchaseLineFormSchema.safeParse(values);
  if (!parsed.success || !parsed.data.margin || context.shrinkage.trim() === "") return null;
  const line = parsed.data;
  try {
    const pricing = priceLine({
      quotedPriceUsd: line.quotedPriceUsd,
      grossQuantity: line.grossQuantity,
      shrinkage: context.shrinkage,
      supplierRate: context.marketRate,
      bcvRate: context.bcvRate,
      margin: line.margin,
      usdRoundingStep: context.usdRoundingStep,
    });
    return {
      ...pricing,
      amountBs: amountInBs(line.quotedPriceUsd, context.marketRate),
      supplierRate: context.marketRate,
    };
  } catch {
    // e.g. the product's shrinkage is not below the quantity, or a margin above 500 %.
    return null;
  }
}
