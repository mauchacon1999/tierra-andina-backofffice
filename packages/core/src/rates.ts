import { toDbString, toDecimal } from "./decimal";
import { InvalidValueError } from "./errors";

/**
 * Bs paid for a USD amount at a rate (domain-model §9.4: amount_bs = quoted_price_usd ×
 * supplier_rate). Rounded half-up to 4 decimals. "60" at 201 → "12060.0000".
 * @throws {InvalidValueError} if the amount is negative or the rate ≤ 0.
 */
export function amountInBs(amountUsd: string, rate: string): string {
  const usd = toDecimal(amountUsd, "amountUsd");
  const r = toDecimal(rate, "rate");
  if (usd.lt(0)) throw new InvalidValueError("amountUsd", "must be ≥ 0");
  if (r.lte(0)) throw new InvalidValueError("rate", "must be greater than 0");
  return toDbString(usd.times(r));
}

/** Exact sum of decimal strings as a 4-decimal string; "0.0000" for an empty list. */
export function sumDecimals(values: readonly string[]): string {
  return toDbString(
    values.reduce((acc, v, i) => acc.plus(toDecimal(v, `values[${i}]`)), toDecimal("0", "zero")),
  );
}
