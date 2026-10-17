import { fractionToPercent, normalizeDecimal } from "@ta/core";
import { DEFAULT_STORE_SETTINGS, type ProductDetail, type ProductFormValues } from "@ta/validators";

/** Empty create form; the margin starts at the store default (`settings.defaultMargin`). */
export function emptyProductForm(defaultMargin: string): ProductFormValues {
  return { ...EMPTY_PRODUCT_FORM, lastMarginPercent: fractionToPercent(defaultMargin) };
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  categoryId: "",
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "",
  lastShrinkage: "0",
  lastMarginPercent: fractionToPercent(DEFAULT_STORE_SETTINGS.defaultMargin),
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
