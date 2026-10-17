import { describe, expect, test } from "bun:test";

import { dailyCloseTotals, subtractTotals, totalsByCurrency } from "./daily-close";
import { InvalidValueError } from "./errors";

// Tuesday 13/10/2026 from the shop's Excel: card terminal, cash Bs, dollars, mobile payment.
const TUESDAY = [
  { amount: "163344", currency: "VES" },
  { amount: "5500", currency: "VES" },
  { amount: "18000", currency: "USD" },
  { amount: "83569", currency: "VES" },
] as const;

describe("totalsByCurrency", () => {
  test("Tuesday 13/10: 252.413 Bs and 18.000 $ — currencies are never added together", () => {
    expect(totalsByCurrency(TUESDAY)).toEqual({ VES: "252413.0000", USD: "18000.0000" });
  });

  test("exact decimals, zeros allowed, nothing → 0", () => {
    expect(
      totalsByCurrency([
        { amount: "0.1", currency: "USD" },
        { amount: "0.2", currency: "USD" },
        { amount: "0", currency: "VES" },
      ]),
    ).toEqual({ VES: "0.0000", USD: "0.3000" });
    expect(totalsByCurrency([])).toEqual({ VES: "0.0000", USD: "0.0000" });
  });

  test.each([
    ["a negative amount", "-1"],
    ["a malformed amount", "1,5"],
  ])("rejects %s", (_case, amount) => {
    expect(() => totalsByCurrency([{ amount, currency: "VES" }])).toThrow();
  });

  test("negative amounts are a domain error naming the item", () => {
    expect(() => totalsByCurrency([{ amount: "-1", currency: "VES" }])).toThrow(InvalidValueError);
  });
});

describe("subtractTotals", () => {
  test("credits minus payments, per currency, may be negative", () => {
    expect(
      subtractTotals({ VES: "1200.0000", USD: "10.0000" }, { VES: "200.0000", USD: "12.0000" }),
    ).toEqual({ VES: "1000.0000", USD: "-2.0000" });
  });
});

describe("dailyCloseTotals", () => {
  test("collected, credit sold and expenses, each per currency", () => {
    expect(
      dailyCloseTotals({
        payments: TUESDAY,
        credits: [
          { amount: "1200", currency: "VES" },
          { amount: "5", currency: "USD" },
        ],
        expenses: [{ amount: "379", currency: "USD" }],
      }),
    ).toEqual({
      collected: { VES: "252413.0000", USD: "18000.0000" },
      credit: { VES: "1200.0000", USD: "5.0000" },
      expenses: { VES: "0.0000", USD: "379.0000" },
    });
  });
});
