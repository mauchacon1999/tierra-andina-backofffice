import type Decimal from "decimal.js";

import { toDecimal } from "./decimal";
import { DomainError } from "./errors";
import { MAX_MARGIN } from "./pricing";

/*
 * Product rules (docs/modules/products.md §1 and §3). Pure functions, no I/O.
 */

export const PURCHASE_UNITS = ["crate", "bundle", "kg"] as const;
export const SALE_UNITS = ["kg", "unit"] as const;

export type PurchaseUnit = (typeof PURCHASE_UNITS)[number];
export type SaleUnit = (typeof SALE_UNITS)[number];

const SALE_UNITS_BY_PURCHASE_UNIT: Record<PurchaseUnit, readonly SaleUnit[]> = {
  crate: ["kg", "unit"],
  bundle: ["kg", "unit"],
  // Bought by kilo and sold by unit is not allowed until the owner confirms the rule (§8).
  kg: ["kg"],
};

/** Valid sale units for a purchase unit (§1.2). */
export function allowedSaleUnits(purchaseUnit: PurchaseUnit): readonly SaleUnit[] {
  return SALE_UNITS_BY_PURCHASE_UNIT[purchaseUnit];
}

/** True if the purchase/sale unit pair is allowed (§1.2). */
export function isValidUnitCombination(purchaseUnit: PurchaseUnit, saleUnit: SaleUnit): boolean {
  return allowedSaleUnits(purchaseUnit).includes(saleUnit);
}

/** Crates and bundles need an approximate pack quantity; kilos do not (§1.2). */
export function requiresPackQuantity(purchaseUnit: PurchaseUnit): boolean {
  return purchaseUnit !== "kg";
}

/** Display name: trimmed, inner whitespace collapsed to one space. Case and accents kept. */
export function cleanProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Comparison key for uniqueness (§1.4): cleaned, lowercase, without accents.
 * "Cebollín" and " cebollin " → "cebollin".
 * The ñ is kept: it is a letter in Spanish, not an accented n ("Ñame" ≠ "Name").
 */
export function normalizeProductName(name: string): string {
  return (
    cleanProductName(name)
      .toLowerCase()
      .normalize("NFD")
      // Drop every combining mark except the tilde of "ñ" (n + U+0303).
      .replace(/(?<!n)̃|[̀-̂̄-ͯ]/g, "")
      .normalize("NFC")
  );
}

export type ProductDefaultsInput = {
  purchaseUnit: PurchaseUnit;
  /** Approx. sale units per pack; null for kg products. */
  defaultPackQuantity: string | null;
  /** Usual shrinkage in the sale unit. */
  lastShrinkage: string;
  /** Usual margin as a fraction (0.50 = 50 %). */
  lastMargin: string;
};

export type ProductDefaultsIssueCode =
  | "PACK_QUANTITY_REQUIRED"
  | "PACK_QUANTITY_NOT_ALLOWED"
  | "PACK_QUANTITY_NOT_POSITIVE"
  | "SHRINKAGE_NEGATIVE"
  | "SHRINKAGE_NOT_BELOW_PACK"
  | "MARGIN_OUT_OF_RANGE";

export type ProductDefaultsIssue = {
  field: "defaultPackQuantity" | "lastShrinkage" | "lastMargin";
  code: ProductDefaultsIssueCode;
};

/**
 * Checks the product's purchase-form defaults (§3): pack quantity > 0 when required and null
 * for kg; 0 ≤ shrinkage < pack quantity (when there is one); margin between 0 and 5.
 * Returns every problem found (empty array = valid) so forms can show them all at once.
 * @throws {TypeError} if a value is not a decimal string.
 */
export function validateProductDefaults(input: ProductDefaultsInput): ProductDefaultsIssue[] {
  const issues: ProductDefaultsIssue[] = [];
  const pack =
    input.defaultPackQuantity === null
      ? null
      : toDecimal(input.defaultPackQuantity, "defaultPackQuantity");
  const shrinkage = toDecimal(input.lastShrinkage, "lastShrinkage");
  const margin = toDecimal(input.lastMargin, "lastMargin");

  if (requiresPackQuantity(input.purchaseUnit)) {
    if (pack === null)
      issues.push({ field: "defaultPackQuantity", code: "PACK_QUANTITY_REQUIRED" });
    else if (pack.lte(0)) {
      issues.push({ field: "defaultPackQuantity", code: "PACK_QUANTITY_NOT_POSITIVE" });
    }
  } else if (pack !== null) {
    issues.push({ field: "defaultPackQuantity", code: "PACK_QUANTITY_NOT_ALLOWED" });
  }

  if (shrinkage.lt(0)) issues.push({ field: "lastShrinkage", code: "SHRINKAGE_NEGATIVE" });
  else if (pack !== null && pack.gt(0) && shrinkage.gte(pack)) {
    issues.push({ field: "lastShrinkage", code: "SHRINKAGE_NOT_BELOW_PACK" });
  }

  if (margin.lt(0) || margin.gt(MAX_MARGIN)) {
    issues.push({ field: "lastMargin", code: "MARGIN_OUT_OF_RANGE" });
  }
  return issues;
}

/** Raised when a purchase/sale unit pair is not allowed. */
export class InvalidUnitCombinationError extends DomainError {
  constructor(
    readonly purchaseUnit: PurchaseUnit,
    readonly saleUnit: SaleUnit,
  ) {
    super("INVALID_UNIT_COMBINATION", `${purchaseUnit} cannot be sold by ${saleUnit}`);
  }
}

/** Raised when product defaults break the rules of `validateProductDefaults`. */
export class InvalidProductDefaultsError extends DomainError {
  constructor(readonly issues: ProductDefaultsIssue[]) {
    super("INVALID_PRODUCT_DEFAULTS", issues.map((i) => `${i.field}: ${i.code}`).join(", "));
  }
}

/**
 * Throws if units or defaults are invalid; used by the API before writing.
 * @throws {InvalidUnitCombinationError}
 * @throws {InvalidProductDefaultsError}
 */
export function assertValidProduct(input: ProductDefaultsInput & { saleUnit: SaleUnit }): void {
  if (!isValidUnitCombination(input.purchaseUnit, input.saleUnit)) {
    throw new InvalidUnitCombinationError(input.purchaseUnit, input.saleUnit);
  }
  const issues = validateProductDefaults(input);
  if (issues.length > 0) throw new InvalidProductDefaultsError(issues);
}

/** "50" (%) → "0.5" (fraction). Exact; no float. */
export function percentToFraction(percent: string): string {
  return toDecimal(percent, "percent").div(100).toFixed();
}

/** "0.5000" (fraction) → "50" (%). Exact; no float. */
export function fractionToPercent(fraction: string): string {
  return toDecimal(fraction, "fraction").times(100).toFixed();
}

/**
 * Gross quantity (in the sale unit) to pre-fill a purchase line: packs × the product's pack
 * quantity (3 crates × 24 kg → "72"); for kilo products the packs already are kilos.
 * Exact, no rounding. Null when it cannot be estimated (pack product without pack quantity,
 * or packs/pack quantity that are not positive decimals).
 */
export function estimateGrossQuantity(
  packs: string,
  purchaseUnit: PurchaseUnit,
  packQuantity: string | null,
): string | null {
  const count = positiveOrNull(packs);
  if (!count) return null;
  if (!requiresPackQuantity(purchaseUnit)) return count.toFixed();
  const perPack = packQuantity === null ? null : positiveOrNull(packQuantity);
  return perPack ? count.times(perPack).toFixed() : null;
}

function positiveOrNull(value: string): Decimal | null {
  try {
    const d = toDecimal(value, "value");
    return d.gt(0) ? d : null;
  } catch {
    return null;
  }
}
