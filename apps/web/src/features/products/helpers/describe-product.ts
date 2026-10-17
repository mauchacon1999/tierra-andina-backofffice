import type { Product } from "@ta/validators";

import type { UnitLabels } from "@/features/products/hooks/use-unit-labels";
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

/** Texts for a product in lists and cards, with the unit labels of the current language. */
export function describeProduct(product: Product, labels: UnitLabels): ProductDescription {
  return {
    units: labels.summary(product.purchaseUnit, product.saleUnit),
    pack:
      product.defaultPackQuantity === null
        ? null
        : labels.perPack(
            product.purchaseUnit,
            formatQuantity(product.defaultPackQuantity),
            product.saleUnit,
          ),
    shrinkage: labels.quantity(formatQuantity(product.lastShrinkage), product.saleUnit),
    margin: formatPercentFromFraction(product.lastMargin),
  };
}
