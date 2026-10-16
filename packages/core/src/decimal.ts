import Decimal from "decimal.js";

/*
 * Money, rates, kilos and margins travel as strings and are computed with decimal.js,
 * never with `number`: 0.1 + 0.2 must be "0.3", not 0.30000000000000004.
 */

function toDecimal(value: string, name: string): Decimal {
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) throw new Error("not finite");
    return d;
  } catch {
    throw new TypeError(`${name} is not a valid decimal number: "${value}"`);
  }
}

/**
 * Exact sum of two decimal strings.
 * Returns plain notation (never exponential), with no rounding applied.
 * @throws {TypeError} if either argument is not a finite decimal number.
 */
export function sum(a: string, b: string): string {
  return toDecimal(a, "a").plus(toDecimal(b, "b")).toFixed();
}
