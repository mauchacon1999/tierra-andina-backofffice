import { compareDecimals, DB_SCALE, toDbString, toDecimal } from "./decimal";
import { InvalidValueError, ShrinkageExceedsQuantityError } from "./errors";
import { roundUpToStep } from "./rounding";

/** Margins are fractions: 0.50 = 50 %. Allowed range 0–5 (0–500 %). */
export const MAX_MARGIN = "5";

export type LinePricingInput = {
  /** Total quoted for the line, in USD (3 crates at 20 USD → "60"). */
  quotedPriceUsd: string;
  /** Gross quantity in the sale unit (kg or units). */
  grossQuantity: string;
  /** Shrinkage in the sale unit; must be < grossQuantity. */
  shrinkage: string;
  /** Bs per USD charged by the stall. */
  supplierRate: string;
  /** Official Bs per USD of the day. */
  bcvRate: string;
  /** Fraction, 0.50 = 50 %. */
  margin: string;
  /** e.g. "0.05": sale prices are rounded up to this step. */
  usdRoundingStep: string;
};

export type LinePricing = {
  usableQuantity: string;
  realCostUsd: string;
  unitCostUsd: string;
  salePriceUsd: string;
};

function positive(value: string, field: string) {
  const d = toDecimal(value, field);
  if (d.lte(0)) throw new InvalidValueError(field, "must be greater than 0");
  return d;
}

function nonNegative(value: string, field: string) {
  const d = toDecimal(value, field);
  if (d.lt(0)) throw new InvalidValueError(field, "must be ≥ 0");
  return d;
}

/**
 * Cost and sale price of a purchase line (docs/domain-model.md §3.2):
 *
 *   usable_quantity = gross_quantity − shrinkage
 *   real_cost_usd   = quoted_price_usd × supplier_rate / bcv_rate
 *   unit_cost_usd   = real_cost_usd / usable_quantity
 *   sale_price_usd  = round_up(unit_cost_usd × (1 + margin), usd_rounding_step)
 *
 * Rounding: real and unit cost are rounded half-up to 4 decimals (the DB scale) and the sale
 * price is computed from the rounded unit cost, so it can be reproduced from stored data.
 * Every result is a 4-decimal string ("0.9091", "1.4000").
 * @throws {ShrinkageExceedsQuantityError} if shrinkage < 0 or shrinkage ≥ gross quantity.
 * @throws {InvalidValueError} for non-positive quantities/rates/steps, negative price or a
 *   margin outside 0–5.
 */
export function priceLine(input: LinePricingInput): LinePricing {
  const gross = positive(input.grossQuantity, "grossQuantity");
  const shrinkage = toDecimal(input.shrinkage, "shrinkage");
  if (shrinkage.lt(0) || shrinkage.gte(gross)) {
    throw new ShrinkageExceedsQuantityError(input.shrinkage, input.grossQuantity);
  }
  const quoted = nonNegative(input.quotedPriceUsd, "quotedPriceUsd");
  const supplierRate = positive(input.supplierRate, "supplierRate");
  const bcvRate = positive(input.bcvRate, "bcvRate");
  const margin = nonNegative(input.margin, "margin");
  if (margin.gt(MAX_MARGIN)) throw new InvalidValueError("margin", `must be ≤ ${MAX_MARGIN}`);

  const usable = gross.minus(shrinkage);
  const realCost = toDecimal(toDbString(quoted.times(supplierRate).div(bcvRate)), "realCost");
  const unitCost = toDecimal(toDbString(realCost.div(usable)), "unitCost");
  const salePrice = roundUpToStep(unitCost.times(margin.plus(1)).toFixed(), input.usdRoundingStep);

  return {
    usableQuantity: usable.toFixed(DB_SCALE),
    realCostUsd: realCost.toFixed(DB_SCALE),
    unitCostUsd: unitCost.toFixed(DB_SCALE),
    salePriceUsd: toDecimal(salePrice, "salePrice").toFixed(DB_SCALE),
  };
}

/**
 * Sale price in Bs: round_up(sale_price_usd × sale_rate, bs_rounding_step).
 * Returns a 4-decimal string ("294.0000").
 * @throws {InvalidValueError} if the rate or step is ≤ 0 or the price is negative.
 */
export function priceInBs(salePriceUsd: string, saleRate: string, bsRoundingStep: string): string {
  const price = nonNegative(salePriceUsd, "salePriceUsd");
  const rate = positive(saleRate, "saleRate");
  const rounded = roundUpToStep(price.times(rate).toFixed(), bsRoundingStep);
  return toDecimal(rounded, "priceBs").toFixed(DB_SCALE);
}

export type ShelfPrice = {
  priceUsd: string;
  priceBs: string;
};

export type ProposedShelfPrice = ShelfPrice & {
  proposedPriceBs: string;
  /** True when the rounded bolívar price differs from the one in force. */
  changed: boolean;
};

/**
 * The published USD prices at a new sale rate (domain-model §3.2). Dollars stay; bolívares
 * are `priceInBs`. Returns undefined when the rounding step absorbs the move, so there is
 * nothing to approve. The BCV rate is not an input: it does not change a shelf price.
 * @throws {InvalidValueError} when the rate or step cannot price a line.
 */
export function proposeSaleRateList(
  lines: readonly ShelfPrice[],
  saleRate: string,
  bsRoundingStep: string,
): ProposedShelfPrice[] | undefined {
  if (lines.length === 0) return undefined;
  const proposed = lines.map((line) => {
    const proposedPriceBs = priceInBs(line.priceUsd, saleRate, bsRoundingStep);
    return {
      priceUsd: line.priceUsd,
      priceBs: line.priceBs,
      proposedPriceBs,
      changed: compareDecimals(line.priceBs, proposedPriceBs) !== 0,
    };
  });
  return proposed.some((line) => line.changed) ? proposed : undefined;
}

/**
 * Margin a price typed by hand gives over the unit cost ("Precio manual"):
 * margin = price_usd / unit_cost_usd − 1, rounded half-up to 4 decimals ("0.5000" = 50 %).
 * Negative when the price is below cost. Null when the cost is 0 (nothing to compare with).
 * @throws {InvalidValueError} if the price or the cost is negative.
 */
export function impliedMargin(priceUsd: string, unitCostUsd: string): string | null {
  const price = nonNegative(priceUsd, "priceUsd");
  const cost = nonNegative(unitCostUsd, "unitCostUsd");
  if (cost.isZero()) return null;
  return toDbString(price.dividedBy(cost).minus(1));
}

/**
 * The margin a price list can store: the same value when it is within 0–5 (0–500 %), null
 * otherwise (a price below cost, or an unknown margin). Exact, no rounding.
 * @throws {TypeError} if the margin is not a decimal number.
 */
export function storableMargin(margin: string | null): string | null {
  if (margin === null) return null;
  const inRange = compareDecimals(margin, "0") >= 0 && compareDecimals(margin, MAX_MARGIN) <= 0;
  return inRange ? margin : null;
}

export type PurchasePriceInput = {
  /** Total quoted for the line, in USD. */
  quotedPriceUsd: string;
  /** Crates/bundles counted, or null when they were not counted (always null for kg). */
  packs: string | null;
  /** Gross quantity in the sale unit. */
  grossQuantity: string;
  purchaseUnit: "crate" | "bundle" | "kg";
};

export type PurchasePrice = {
  priceUsd: string;
  /** "pack": per crate/bundle; "saleUnit": per kilo or unit of the gross quantity. */
  per: "pack" | "saleUnit";
};

/**
 * What one crate, bundle or kilo cost at the stall ("Precio manual"): quoted_price_usd / packs
 * for crates and bundles whose packs were counted, otherwise quoted_price_usd / gross_quantity
 * (per kilo or unit). Rounded half-up to 4 decimals. 3 crates at 60 USD → 20.0000 per pack.
 * @throws {InvalidValueError} for a negative price or a quantity/packs ≤ 0.
 */
export function purchasePrice(input: PurchasePriceInput): PurchasePrice {
  const price = nonNegative(input.quotedPriceUsd, "quotedPriceUsd");
  if (input.purchaseUnit !== "kg" && input.packs !== null) {
    return { priceUsd: toDbString(price.dividedBy(positive(input.packs, "packs"))), per: "pack" };
  }
  const gross = positive(input.grossQuantity, "grossQuantity");
  return { priceUsd: toDbString(price.dividedBy(gross)), per: "saleUnit" };
}

/**
 * Total of a line bought by kilo from the price of each kilo typed at the stall:
 * total_usd = price_per_kilo_usd × gross_quantity, rounded half-up to 4 decimals (the line
 * stores the total, `quoted_price_usd`). 1.20 $/kg × 40 kg → "48.0000".
 * @throws {InvalidValueError} for a negative price or a quantity ≤ 0.
 */
export function totalFromKiloPrice(pricePerKiloUsd: string, grossQuantity: string): string {
  const price = nonNegative(pricePerKiloUsd, "pricePerKiloUsd");
  return toDbString(price.times(positive(grossQuantity, "grossQuantity")));
}
