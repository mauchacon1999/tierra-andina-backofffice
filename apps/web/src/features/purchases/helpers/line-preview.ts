import { amountInBs, priceLine, type LinePricing } from "@ta/core";
import { purchaseLineFormSchema, type PurchaseLineFormValues } from "@ta/validators";

export type LinePreview = LinePricing & {
  /** Bs paid to the stall: quoted USD × supplier rate. */
  amountBs: string;
  /** The rate used: the one typed or the trip's Coche rate. */
  supplierRate: string;
};

export type LinePreviewContext = {
  bcvRate: string;
  marketRate: string;
  usdRoundingStep: string;
};

/**
 * Live cost of the line being typed, with the same @ta/core functions the API uses, so the
 * preview matches what is saved. Null while the values are incomplete or invalid.
 */
export function computeLinePreview(
  values: PurchaseLineFormValues,
  context: LinePreviewContext,
): LinePreview | null {
  const parsed = purchaseLineFormSchema.safeParse(values);
  if (!parsed.success || !parsed.data.margin) return null;
  const line = parsed.data;
  const supplierRate = line.supplierRate ?? context.marketRate;
  try {
    const pricing = priceLine({
      quotedPriceUsd: line.quotedPriceUsd,
      grossQuantity: line.grossQuantity,
      shrinkage: line.shrinkage,
      supplierRate,
      bcvRate: context.bcvRate,
      margin: line.margin,
      usdRoundingStep: context.usdRoundingStep,
    });
    return { ...pricing, amountBs: amountInBs(line.quotedPriceUsd, supplierRate), supplierRate };
  } catch {
    // e.g. a margin above 500 %: the form shows nothing until the value is valid.
    return null;
  }
}
