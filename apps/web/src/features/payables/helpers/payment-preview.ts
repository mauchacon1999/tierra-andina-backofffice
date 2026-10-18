import {
  balanceIn,
  PAYABLE_PAYMENT_METHOD_CURRENCY,
  settlePayment,
  type Currency,
  type PayablePaymentMethod,
} from "@ta/core";

export type PaymentContext = {
  /** What the invoice still owes, in its currency. */
  balance: string;
  payableCurrency: Currency;
  method: PayablePaymentMethod;
  rate: string;
};

export type PaymentPreview = { applied: string; isFullPayment: boolean };

/**
 * What a payment being typed would take off the balance (in the invoice's currency), or null
 * while the amount or rate are not valid, or the amount is more than what is owed.
 */
export function paymentPreview(context: PaymentContext, amount: string): PaymentPreview | null {
  try {
    const settled = settlePayment({
      payableCurrency: context.payableCurrency,
      balance: context.balance,
      amount: amount.trim(),
      currency: PAYABLE_PAYMENT_METHOD_CURRENCY[context.method],
      rate: context.rate.trim(),
    });
    return { applied: settled.applied, isFullPayment: settled.isFullPayment };
  } catch {
    return null;
  }
}

/** The amount that pays everything in the method's currency, or null without a valid rate. */
export function fullPaymentAmount(context: PaymentContext): string | null {
  try {
    return balanceIn(
      context.balance,
      context.payableCurrency,
      PAYABLE_PAYMENT_METHOD_CURRENCY[context.method],
      context.rate.trim(),
    );
  } catch {
    return null;
  }
}
