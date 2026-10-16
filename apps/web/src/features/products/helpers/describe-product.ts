import type { Product } from "@ta/validators";

import { SALE_UNIT_SUFFIX, unitsSummary } from "@/features/products/helpers/unit-labels";
import { formatPercentFromFraction, formatQuantity } from "@/utils/format-number";

export type ProductDescription = {
  /** "Cesta → Kilo" */
  units: string;
  /** "24 kg por cesta", or null for kg products. */
  pack: string | null;
  /** "2 kg" */
  shrinkage: string;
  /** "50 %" */
  margin: string;
};

const PACK_NOUN = { crate: "cesta", bundle: "cuenta" } as const;

/** Human texts for a product in lists and cards (Spanish, es-VE numbers). */
export function describeProduct(product: Product): ProductDescription {
  const suffix = SALE_UNIT_SUFFIX[product.saleUnit];
  return {
    units: unitsSummary(product.purchaseUnit, product.saleUnit),
    pack:
      product.purchaseUnit === "kg" || product.defaultPackQuantity === null
        ? null
        : `${formatQuantity(product.defaultPackQuantity)} ${suffix} por ${PACK_NOUN[product.purchaseUnit]}`,
    shrinkage: `${formatQuantity(product.lastShrinkage)} ${suffix}`,
    margin: formatPercentFromFraction(product.lastMargin),
  };
}
