import Decimal from "decimal.js";

import { toDecimal } from "./decimal";
import { InvalidValueError } from "./errors";

/**
 * Rounds `value` UP to the next multiple of `step` (prices never round down, so rounding
 * never eats the margin). Exact multiples stay as they are.
 *
 * The result has as many decimals as `step`: roundUpToStep("1.36365", "0.05") → "1.40",
 * roundUpToStep("293.2", "1") → "294".
 * @throws {InvalidValueError} if step ≤ 0.
 * @throws {TypeError} if an argument is not a decimal number.
 */
export function roundUpToStep(value: string, step: string): string {
  const v = toDecimal(value, "value");
  const s = toDecimal(step, "step");
  if (s.lte(0)) throw new InvalidValueError("step", "must be greater than 0");

  const rounded = v.div(s).toDecimalPlaces(0, Decimal.ROUND_CEIL).times(s);
  return rounded.toFixed(s.decimalPlaces());
}
