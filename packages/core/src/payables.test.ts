import { describe, expect, test } from "bun:test";

import { InvalidValueError } from "./errors";
import {
  balanceInBs,
  PAYABLE_PAYMENT_METHOD_CURRENCY,
  PAYABLE_PAYMENT_METHODS,
  PaymentExceedsBalanceError,
  payableBalance,
  payableCode,
  payableLineSubtotal,
  payableStatus,
  settlePayment,
} from "./payables";

describe("payableLineSubtotal", () => {
  test("12 packs of bags at 0.35 USD → 4.20", () => {
    expect(payableLineSubtotal("12", "0.35")).toBe("4.2000");
  });

  test("2.5 kg of banana at 1.30 → 3.25; a free item at 0 → 0", () => {
    expect(payableLineSubtotal("2.5", "1.30")).toBe("3.2500");
    expect(payableLineSubtotal("3", "0")).toBe("0.0000");
  });

  test("rounds half-up to 4 decimals", () => {
    expect(payableLineSubtotal("0.333", "0.15")).toBe("0.0500");
    expect(payableLineSubtotal("1.5", "0.33335")).toBe("0.5000");
  });

  test("rejects a quantity ≤ 0 or a negative price", () => {
    expect(() => payableLineSubtotal("0", "1")).toThrow(InvalidValueError);
    expect(() => payableLineSubtotal("1", "-1")).toThrow(InvalidValueError);
    expect(() => payableLineSubtotal("x", "1")).toThrow(TypeError);
  });
});

describe("payableBalance", () => {
  test("total minus the applied payments", () => {
    expect(payableBalance("100", ["30", "20.5"])).toBe("49.5000");
  });

  test("no payments → the total", () => {
    expect(payableBalance("100", [])).toBe("100.0000");
  });

  test("never negative", () => {
    expect(payableBalance("100", ["60", "60"])).toBe("0.0000");
  });
});

describe("payableStatus", () => {
  const base = {
    total: "100",
    balance: "100",
    dueOn: "2026-10-20",
    today: "2026-10-18",
    isVoided: false,
  };

  test("nothing paid and not due → pending", () => {
    expect(payableStatus(base)).toBe("pending");
  });

  test("something paid → partial", () => {
    expect(payableStatus({ ...base, balance: "40" })).toBe("partial");
  });

  test("nothing owed → paid, even past the due date", () => {
    expect(payableStatus({ ...base, balance: "0", today: "2026-11-01" })).toBe("paid");
  });

  test("owed after the due date → overdue, pending or partial alike", () => {
    expect(payableStatus({ ...base, today: "2026-10-21" })).toBe("overdue");
    expect(payableStatus({ ...base, balance: "40", today: "2026-10-21" })).toBe("overdue");
  });

  test("due today is not overdue yet", () => {
    expect(payableStatus({ ...base, today: "2026-10-20" })).toBe("pending");
  });

  test("voided wins over everything", () => {
    expect(payableStatus({ ...base, isVoided: true, today: "2026-11-01" })).toBe("voided");
    expect(payableStatus({ ...base, isVoided: true, balance: "0" })).toBe("voided");
  });
});

describe("balanceInBs", () => {
  test("a USD invoice is converted at the day's BCV rate, 2 decimals", () => {
    expect(balanceInBs("100", "USD", "201.555")).toBe("20155.50");
    expect(balanceInBs("33.33335", "USD", "200")).toBe("6666.67");
  });

  test("a Bs invoice is fixed (the rate is ignored)", () => {
    expect(balanceInBs("15000", "VES", "201.555")).toBe("15000.00");
  });

  test("rejects a negative balance or a rate ≤ 0", () => {
    expect(() => balanceInBs("-1", "USD", "200")).toThrow(InvalidValueError);
    expect(() => balanceInBs("10", "USD", "0")).toThrow(InvalidValueError);
  });
});

describe("settlePayment", () => {
  test("a USD invoice paid in dollars: applied as is, Bs kept at the rate", () => {
    expect(
      settlePayment({
        payableCurrency: "USD",
        balance: "100",
        amount: "40",
        currency: "USD",
        rate: "200",
      }),
    ).toEqual({
      applied: "40.0000",
      amountUsd: "40.0000",
      amountBs: "8000.0000",
      isFullPayment: false,
    });
  });

  test("a USD invoice paid in Bs at the BCV rate", () => {
    expect(
      settlePayment({
        payableCurrency: "USD",
        balance: "100",
        amount: "5000",
        currency: "VES",
        rate: "200",
      }),
    ).toEqual({
      applied: "25.0000",
      amountUsd: "25.0000",
      amountBs: "5000.0000",
      isFullPayment: false,
    });
  });

  test("paying in Bs exactly the balance shown (2 decimals) settles it with nothing left", () => {
    // 33.3333 USD × 201.555 = 6718.4932… → shown as 6718.49 Bs.
    const paid = settlePayment({
      payableCurrency: "USD",
      balance: "33.3333",
      amount: "6718.49",
      currency: "VES",
      rate: "201.555",
    });
    expect(paid.applied).toBe("33.3333");
    expect(paid.isFullPayment).toBe(true);
    expect(payableBalance("33.3333", [paid.applied])).toBe("0.0000");
  });

  test("a Bs invoice paid in Bs: the full balance", () => {
    expect(
      settlePayment({
        payableCurrency: "VES",
        balance: "15000",
        amount: "15000",
        currency: "VES",
        rate: "200",
      }),
    ).toEqual({
      applied: "15000.0000",
      amountUsd: "75.0000",
      amountBs: "15000.0000",
      isFullPayment: true,
    });
  });

  test("a Bs invoice paid in dollars is converted at the rate", () => {
    expect(
      settlePayment({
        payableCurrency: "VES",
        balance: "15000",
        amount: "50",
        currency: "USD",
        rate: "200",
      }),
    ).toEqual({
      applied: "10000.0000",
      amountUsd: "50.0000",
      amountBs: "10000.0000",
      isFullPayment: false,
    });
  });

  test("rejects more than the balance, telling it in the payment's currency", () => {
    expect(() =>
      settlePayment({
        payableCurrency: "USD",
        balance: "10",
        amount: "10.01",
        currency: "USD",
        rate: "200",
      }),
    ).toThrow(PaymentExceedsBalanceError);

    try {
      settlePayment({
        payableCurrency: "USD",
        balance: "10",
        amount: "2000.01",
        currency: "VES",
        rate: "200",
      });
      throw new Error("expected PaymentExceedsBalanceError");
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentExceedsBalanceError);
      expect((error as PaymentExceedsBalanceError).balance).toBe("2000.00");
      expect((error as PaymentExceedsBalanceError).currency).toBe("VES");
      expect((error as PaymentExceedsBalanceError).code).toBe("PAYMENT_EXCEEDS_BALANCE");
    }
  });

  test("rejects a payment on a paid invoice", () => {
    expect(() =>
      settlePayment({
        payableCurrency: "USD",
        balance: "0",
        amount: "1",
        currency: "USD",
        rate: "200",
      }),
    ).toThrow(PaymentExceedsBalanceError);
  });

  test("rejects an amount ≤ 0, one too small to apply, or a rate ≤ 0", () => {
    const base = { payableCurrency: "USD", balance: "10", currency: "VES", rate: "200" } as const;
    expect(() => settlePayment({ ...base, amount: "0" })).toThrow(InvalidValueError);
    expect(() => settlePayment({ ...base, amount: "0.00001" })).toThrow(InvalidValueError);
    expect(() => settlePayment({ ...base, amount: "10", rate: "0" })).toThrow(InvalidValueError);
  });
});

describe("payment methods", () => {
  test("pago móvil, transfer and cash Bs pay in Bs; divisa in dollars", () => {
    expect(PAYABLE_PAYMENT_METHODS.map((m) => PAYABLE_PAYMENT_METHOD_CURRENCY[m])).toEqual([
      "VES",
      "VES",
      "VES",
      "USD",
    ]);
  });
});

describe("payableCode", () => {
  test("CXP- and the number with at least 6 digits", () => {
    expect(payableCode(123)).toBe("CXP-000123");
    expect(payableCode(1)).toBe("CXP-000001");
    expect(payableCode(1234567)).toBe("CXP-1234567");
  });

  test("rejects 0, negatives and fractions", () => {
    expect(() => payableCode(0)).toThrow(InvalidValueError);
    expect(() => payableCode(-1)).toThrow(InvalidValueError);
    expect(() => payableCode(1.5)).toThrow(InvalidValueError);
  });
});
