import Decimal from "decimal.js";

/*
 * Money, rates, kilos and margins travel as strings and are computed with decimal.js,
 * never with `number`: 0.1 + 0.2 must be "0.3", not 0.30000000000000004.
 */

/** Scale of numeric(14,4) columns: every stored value has 4 decimals. */
export const DB_SCALE = 4;

/**
 * Parses a decimal string. Throws TypeError for anything that is not a finite number.
 * Internal helper shared by the other modules of @ta/core.
 */
export function toDecimal(value: string, name: string): Decimal {
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) throw new Error("not finite");
    return d;
  } catch {
    throw new TypeError(`${name} is not a valid decimal number: "${value}"`);
  }
}

/** Rounds half-up to the DB scale and returns plain notation ("0.9091", "20.1000"). */
export function toDbString(value: Decimal): string {
  return value.toDecimalPlaces(DB_SCALE, Decimal.ROUND_HALF_UP).toFixed(DB_SCALE);
}

/**
 * Exact sum of two decimal strings.
 * Returns plain notation (never exponential), with no rounding applied.
 * @throws {TypeError} if either argument is not a finite decimal number.
 */
export function sum(a: string, b: string): string {
  return toDecimal(a, "a").plus(toDecimal(b, "b")).toFixed();
}

/**
 * Shortest plain form of a decimal string: "24.0000" → "24", "0.5000" → "0.5".
 * For showing stored numeric(14,4) values in inputs. Exact, no rounding.
 * @throws {TypeError} if the value is not a decimal number.
 */
export function normalizeDecimal(value: string): string {
  return toDecimal(value, "value").toFixed();
}

/**
 * Compares two decimal strings exactly: -1 if a < b, 0 if equal, 1 if a > b.
 * @throws {TypeError} if a value is not a decimal number.
 */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  return toDecimal(a, "a").comparedTo(toDecimal(b, "b")) as -1 | 0 | 1;
}
