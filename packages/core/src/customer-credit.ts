import {
  subtractTotals,
  totalsByCurrency,
  type CurrencyAmount,
  type CurrencyTotals,
} from "./daily-close";

/*
 * Customer credit, "fiado" (docs/domain-model.md §6): sold on credit (`credit`) or paid back
 * (`payment`), each in its own currency with no rate (owner, 2026-10-18). Bolívares and dollars
 * are separate balances: a payment in the other currency leaves that balance negative, money
 * in the customer's favor.
 */

export const CREDIT_ENTRY_KINDS = ["credit", "payment"] as const;
export type CreditEntryKind = (typeof CREDIT_ENTRY_KINDS)[number];

export type CreditEntry = CurrencyAmount & { kind: CreditEntryKind };

/**
 * What a customer owes per currency: Σ credits − Σ payments, 4-decimal strings. Negative means
 * the customer paid more than owed in that currency.
 * @throws {InvalidValueError} for a negative or malformed amount.
 */
export function customerCreditBalance(entries: readonly CreditEntry[]): CurrencyTotals {
  return subtractTotals(
    totalsByCurrency(entries.filter((entry) => entry.kind === "credit")),
    totalsByCurrency(entries.filter((entry) => entry.kind === "payment")),
  );
}
