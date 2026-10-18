import Decimal from "decimal.js";

import type { Currency } from "./daily-close";
import { toDbString, toDecimal } from "./decimal";
import { DomainError, InvalidValueError } from "./errors";

/*
 * Payables: supplier invoices on credit and their partial payments (docs/modules/payables.md).
 * An invoice is in USD or Bs, as agreed with the supplier; its lines, total and balance are in
 * that currency. A payment is made in the currency of its method and converted with the rate
 * of the payment day (BCV), so every payment keeps USD, Bs and the rate (CLAUDE.md §7).
 */

/** Units of an invoice line (kg, unit, sack = bulto, pack = paquete). */
export const PAYABLE_UNITS = ["kg", "unit", "sack", "pack"] as const;
export type PayableUnit = (typeof PAYABLE_UNITS)[number];

/** How a supplier is paid; independent of the daily close's sale methods. */
export const PAYABLE_PAYMENT_METHODS = [
  "mobile_payment",
  "bank_transfer",
  "cash_bs",
  "cash_usd",
] as const;
export type PayablePaymentMethod = (typeof PAYABLE_PAYMENT_METHODS)[number];

/** The currency each method pays in ("divisa" is cash dollars). */
export const PAYABLE_PAYMENT_METHOD_CURRENCY = {
  mobile_payment: "VES",
  bank_transfer: "VES",
  cash_bs: "VES",
  cash_usd: "USD",
} as const satisfies Record<PayablePaymentMethod, Currency>;

/** Derived from the total, the payments, the due date and the void mark (`payableStatus`). */
export const PAYABLE_STATUSES = ["pending", "partial", "paid", "overdue", "voided"] as const;
export type PayableStatus = (typeof PAYABLE_STATUSES)[number];

/** A payment larger than what is still owed. */
export class PaymentExceedsBalanceError extends DomainError {
  constructor(
    /** What is still owed, in the payment's currency (2 decimals when converted). */
    readonly balance: string,
    readonly currency: Currency,
  ) {
    super("PAYMENT_EXCEEDS_BALANCE", `the payment exceeds the balance (${balance} ${currency})`);
  }
}

const ZERO = new Decimal(0);

/**
 * Subtotal of an invoice line: quantity × unit price, rounded half-up to 4 decimals, in the
 * invoice's currency. 12 bags at 0.35 → "4.2000".
 * @throws {InvalidValueError} if the quantity is not > 0 or the price is negative.
 */
export function payableLineSubtotal(quantity: string, unitPrice: string): string {
  const q = toDecimal(quantity, "quantity");
  const price = toDecimal(unitPrice, "unitPrice");
  if (q.lte(0)) throw new InvalidValueError("quantity", "must be greater than 0");
  if (price.lt(0)) throw new InvalidValueError("unitPrice", "must be ≥ 0");
  return toDbString(q.times(price));
}

/**
 * What is still owed: total − Σ applied payments (each already in the invoice's currency),
 * 4 decimals. Never negative: an overpayment counts as fully paid ("0.0000").
 */
export function payableBalance(total: string, appliedPayments: readonly string[]): string {
  const paid = appliedPayments.reduce(
    (acc, v, i) => acc.plus(toDecimal(v, `appliedPayments[${i}]`)),
    ZERO,
  );
  return toDbString(Decimal.max(toDecimal(total, "total").minus(paid), ZERO));
}

export type PayableStatusInput = {
  total: string;
  balance: string;
  /** Business date (YYYY-MM-DD). */
  dueOn: string;
  /** Today's business date; the status depends on it (overdue), so it is passed in. */
  today: string;
  isVoided: boolean;
};

/**
 * Status of an invoice: voided wins; then paid (nothing owed); then overdue (something owed and
 * the due date is before today); then pending (nothing paid) or partial. Due today is not
 * overdue yet.
 */
export function payableStatus(input: PayableStatusInput): PayableStatus {
  if (input.isVoided) return "voided";
  const balance = toDecimal(input.balance, "balance");
  if (balance.lte(0)) return "paid";
  if (input.dueOn < input.today) return "overdue";
  return balance.gte(toDecimal(input.total, "total")) ? "pending" : "partial";
}

/** `amount` in `currency` converted to `to` at `rate` (Bs per USD), not rounded. */
function convert(amount: Decimal, from: Currency, to: Currency, rate: Decimal): Decimal {
  if (from === to) return amount;
  return to === "VES" ? amount.times(rate) : amount.div(rate);
}

/**
 * Bs to pay today for a balance: a Bs invoice is fixed; a USD one is converted at the day's
 * BCV rate. Rounded half-up to 2 decimals (what goes into the bank app), "." as separator.
 * 100 USD at 201.555 → "20155.50".
 * @throws {InvalidValueError} if the balance is negative or the rate ≤ 0.
 */
export function balanceInBs(balance: string, currency: Currency, bcvRate: string): string {
  const amount = toDecimal(balance, "balance");
  const rate = toDecimal(bcvRate, "bcvRate");
  if (amount.lt(0)) throw new InvalidValueError("balance", "must be ≥ 0");
  if (rate.lte(0)) throw new InvalidValueError("bcvRate", "must be greater than 0");
  return convert(amount, currency, "VES", rate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toFixed(2);
}

export type SettlePaymentInput = {
  /** The invoice's currency and what it still owes, in that currency. */
  payableCurrency: Currency;
  balance: string;
  /** What was paid, in the payment method's currency. */
  amount: string;
  currency: Currency;
  /** Bs per USD on the payment day (BCV). */
  rate: string;
};

export type SettledPayment = {
  /** What the payment takes off the balance, in the invoice's currency. */
  applied: string;
  amountUsd: string;
  amountBs: string;
  /** The invoice owes nothing after this payment. */
  isFullPayment: boolean;
};

/**
 * Applies a payment to an invoice's balance. In the invoice's currency the amount is taken as
 * is. In the other currency it is converted at `rate`, and paying exactly the balance as shown
 * in that currency (rounded to 2 decimals, like `balanceInBs`) settles the invoice exactly, so
 * no 0.0001 is left owing. Every result is a 4-decimal string; USD and Bs are both kept.
 * @throws {PaymentExceedsBalanceError} if the amount is more than what is owed.
 * @throws {InvalidValueError} if the amount is not > 0 (or converts to 0), the balance is
 *   negative or the rate ≤ 0.
 */
export function settlePayment(input: SettlePaymentInput): SettledPayment {
  const balance = toDecimal(input.balance, "balance");
  const amount = toDecimal(input.amount, "amount");
  const rate = toDecimal(input.rate, "rate");
  if (balance.lt(0)) throw new InvalidValueError("balance", "must be ≥ 0");
  if (amount.lte(0)) throw new InvalidValueError("amount", "must be greater than 0");
  if (rate.lte(0)) throw new InvalidValueError("rate", "must be greater than 0");

  const isSameCurrency = input.currency === input.payableCurrency;
  const owedInPaymentCurrency = isSameCurrency
    ? balance
    : convert(balance, input.payableCurrency, input.currency, rate).toDecimalPlaces(
        2,
        Decimal.ROUND_HALF_UP,
      );
  if (amount.gt(owedInPaymentCurrency)) {
    throw new PaymentExceedsBalanceError(
      owedInPaymentCurrency.toFixed(isSameCurrency ? 4 : 2),
      input.currency,
    );
  }

  const isFullPayment = amount.eq(owedInPaymentCurrency);
  const applied = isFullPayment
    ? balance
    : Decimal.min(
        convert(amount, input.currency, input.payableCurrency, rate).toDecimalPlaces(
          4,
          Decimal.ROUND_HALF_UP,
        ),
        balance,
      );
  if (applied.lte(0)) throw new InvalidValueError("amount", "is too small to apply");

  const amountUsd = input.currency === "USD" ? amount : amount.div(rate);
  const amountBs = input.currency === "VES" ? amount : amount.times(rate);
  return {
    applied: toDbString(applied),
    amountUsd: toDbString(amountUsd),
    amountBs: toDbString(amountBs),
    isFullPayment: isFullPayment || applied.eq(balance),
  };
}

/**
 * The invoice code shown to the owner: "CXP-" and the store's sequential number, at least 6
 * digits. 123 → "CXP-000123", 1234567 → "CXP-1234567".
 * @throws {InvalidValueError} if the number is not a positive integer.
 */
export function payableCode(number: number): string {
  if (!Number.isInteger(number) || number <= 0) {
    throw new InvalidValueError("number", "must be a positive integer");
  }
  return `CXP-${String(number).padStart(6, "0")}`;
}
