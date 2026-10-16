import { fractionToPercent, normalizeDecimal } from "@ta/core";
import type { ProductDetail, ProductFormValues } from "@ta/validators";

/** Margin shown on a new product until store settings are exposed by the API (§9.1: 0.50). */
// TODO(ender): read `default_margin` and `usd_rounding_step` from a settings endpoint once it exists.
export const DEFAULT_MARGIN_PERCENT = "50";
export const USD_ROUNDING_STEP = "0.05";

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  categoryId: "",
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "",
  lastShrinkage: "0",
  lastMarginPercent: DEFAULT_MARGIN_PERCENT,
};

/** Stored product → form text values ("24.0000" → "24", "0.5000" → "50" %). */
export function productToFormValues(product: ProductDetail): ProductFormValues {
  return {
    name: product.name,
    categoryId: product.categoryId,
    purchaseUnit: product.purchaseUnit,
    saleUnit: product.saleUnit,
    defaultPackQuantity:
      product.defaultPackQuantity === null ? "" : normalizeDecimal(product.defaultPackQuantity),
    lastShrinkage: normalizeDecimal(product.lastShrinkage),
    lastMarginPercent: fractionToPercent(product.lastMargin),
  };
}

/** API field names → form field names (the margin is edited as a percent). */
export function toFormField(apiField: string): keyof ProductFormValues | null {
  if (apiField === "lastMargin") return "lastMarginPercent";
  return apiField in EMPTY_PRODUCT_FORM ? (apiField as keyof ProductFormValues) : null;
}
