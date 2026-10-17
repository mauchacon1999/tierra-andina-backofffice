import { dailyCloseTotals, type CurrencyAmount, type DailyCloseTotals } from "@ta/core";
import { decimalSchema, type DailyCloseFormValues, type PaymentMethod } from "@ta/validators";

const amountSchema = decimalSchema("amount");

/** Only amounts that are already valid count (a half-typed "1." or "1,5" is skipped). */
function valid(amount: string): string | null {
  const parsed = amountSchema.safeParse(amount.trim());
  return parsed.success ? parsed.data : null;
}

function amounts(rows: readonly { amount: string; currency: CurrencyAmount["currency"] }[]) {
  return rows.flatMap((row) => {
    const amount = valid(row.amount);
    return amount === null ? [] : [{ amount, currency: row.currency }];
  });
}

/**
 * Totals of the close being typed, per currency, with the same @ta/core rule the owner's view
 * uses. Each payment takes the currency of its method.
 */
export function liveCloseTotals(
  values: DailyCloseFormValues,
  methods: readonly PaymentMethod[],
): DailyCloseTotals {
  const currencyOf = new Map(methods.map((m) => [m.id, m.currency]));
  const payments = values.payments.flatMap((p) => {
    const currency = currencyOf.get(p.paymentMethodId);
    return currency ? [{ amount: p.amount, currency }] : [];
  });
  return dailyCloseTotals({
    payments: amounts(payments),
    credits: amounts(values.credits),
    expenses: amounts(values.expenses),
  });
}
