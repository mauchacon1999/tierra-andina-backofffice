import { toDbString, toDecimal } from "./decimal";
import { InvalidValueError } from "./errors";

/*
 * Daily close (docs/domain-model.md §5). The manager writes amounts only, each in its own
 * currency; there is no rate in a close (owner decision), so bolívares and dollars are never
 * added together: every total is per currency.
 */

export const CURRENCIES = ["VES", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type CurrencyAmount = { amount: string; currency: Currency };

/** One total per currency, 4-decimal strings ("0.0000" when there is nothing). */
export type CurrencyTotals = Record<Currency, string>;

export type DailyCloseTotalsInput = {
  /** Collected per payment method (card terminal, mobile payment, cash Bs, cash USD). */
  payments: readonly CurrencyAmount[];
  /** Sold on credit that day. */
  credits: readonly CurrencyAmount[];
  /** Paid out that day. */
  expenses: readonly CurrencyAmount[];
};

export type DailyCloseTotals = {
  collected: CurrencyTotals;
  credit: CurrencyTotals;
  expenses: CurrencyTotals;
};

/**
 * Exact sum of amounts per currency. Amounts must be ≥ 0 (a payment method with nothing
 * collected is 0).
 * @throws {InvalidValueError} for a negative or malformed amount.
 */
export function totalsByCurrency(items: readonly CurrencyAmount[]): CurrencyTotals {
  const totals = { VES: toDecimal("0", "zero"), USD: toDecimal("0", "zero") };
  items.forEach((item, index) => {
    const amount = toDecimal(item.amount, `amount[${index}]`);
    if (amount.lt(0)) throw new InvalidValueError(`amount[${index}]`, "must be ≥ 0");
    totals[item.currency] = totals[item.currency].plus(amount);
  });
  return { VES: toDbString(totals.VES), USD: toDbString(totals.USD) };
}

/** left − right per currency. The result may be negative (a customer overpaid, for example). */
export function subtractTotals(left: CurrencyTotals, right: CurrencyTotals): CurrencyTotals {
  return {
    VES: toDbString(toDecimal(left.VES, "left.VES").minus(toDecimal(right.VES, "right.VES"))),
    USD: toDbString(toDecimal(left.USD, "left.USD").minus(toDecimal(right.USD, "right.USD"))),
  };
}

/**
 * Totals of a daily close, per currency: what was collected (the "Total del día" of the shop's
 * Excel, split by currency), what was sold on credit and what was paid out.
 * @throws {InvalidValueError} for a negative or malformed amount.
 */
export function dailyCloseTotals(input: DailyCloseTotalsInput): DailyCloseTotals {
  return {
    collected: totalsByCurrency(input.payments),
    credit: totalsByCurrency(input.credits),
    expenses: totalsByCurrency(input.expenses),
  };
}
