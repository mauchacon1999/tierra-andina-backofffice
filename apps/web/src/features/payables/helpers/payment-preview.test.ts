import { describe, expect, it } from "vitest";

import { fullPaymentAmount, paymentPreview } from "@/features/payables/helpers/payment-preview";

const USD_INVOICE = { balance: "20", payableCurrency: "USD", rate: "201.555" } as const;

describe("paymentPreview", () => {
  it("a pago móvil in Bs takes its dollars off a USD invoice", () => {
    expect(paymentPreview({ ...USD_INVOICE, method: "mobile_payment" }, "2015.55")).toEqual({
      applied: "10.0000",
      isFullPayment: false,
    });
  });

  it("the exact balance in Bs settles it", () => {
    expect(paymentPreview({ ...USD_INVOICE, method: "mobile_payment" }, "4031.10")).toEqual({
      applied: "20.0000",
      isFullPayment: true,
    });
  });

  it("is null for more than the balance, an empty amount or no rate", () => {
    expect(paymentPreview({ ...USD_INVOICE, method: "cash_usd" }, "21")).toBeNull();
    expect(paymentPreview({ ...USD_INVOICE, method: "cash_usd" }, "")).toBeNull();
    expect(paymentPreview({ ...USD_INVOICE, method: "mobile_payment", rate: "" }, "10")).toBeNull();
  });
});

describe("fullPaymentAmount", () => {
  it("in the method's currency", () => {
    expect(fullPaymentAmount({ ...USD_INVOICE, method: "mobile_payment" })).toBe("4031.10");
    expect(fullPaymentAmount({ ...USD_INVOICE, method: "cash_usd" })).toBe("20.0000");
  });

  it("is null without a valid rate", () => {
    expect(fullPaymentAmount({ ...USD_INVOICE, method: "mobile_payment", rate: "x" })).toBeNull();
  });
});
