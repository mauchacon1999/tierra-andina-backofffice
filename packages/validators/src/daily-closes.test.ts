import { describe, expect, test } from "bun:test";

import { submitDailyCloseSchema, updateDailyCloseSchema } from "./daily-closes";
import { formatValidationMessage as text } from "./messages";

const CARD = "01a14314-2825-7000-a1d1-bdf734d05981";
const USD = "01a14314-2825-7000-a1d1-bdf734d05982";

const TUESDAY = {
  businessDate: "2026-10-13",
  cardBatch: " 16 ",
  cashDestination: "kept" as const,
  payments: [
    { paymentMethodId: CARD, amount: "163344" },
    { paymentMethodId: USD, amount: "18000" },
  ],
};

const errors = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), text(i.message)]));

describe("submitDailyCloseSchema", () => {
  test("amounts only: payments, batch, cash destination; credits and expenses default to none", () => {
    expect(submitDailyCloseSchema.parse(TUESDAY)).toEqual({
      ...TUESDAY,
      cardBatch: "16",
      credits: [],
      expenses: [],
    });
  });

  test("a credit sale names an existing customer or a new one, never both or none", () => {
    const withCredit = (credit: object) =>
      submitDailyCloseSchema.safeParse({
        ...TUESDAY,
        credits: [{ amount: "1200", currency: "VES", ...credit }],
      });

    expect(withCredit({ customerName: "  Sra.   María " }).data?.credits[0]).toEqual({
      customerName: "Sra. María",
      amount: "1200",
      currency: "VES",
    });
    expect(withCredit({ customerId: CARD }).success).toBe(true);
    expect(errors(withCredit({}))).toEqual({
      "credits.0.customerName": "Elige un cliente o escribe su nombre",
    });
    expect(withCredit({ customerId: CARD, customerName: "Ana" }).success).toBe(false);
  });

  test("expenses need a concept and a positive amount in a currency", () => {
    const parsed = submitDailyCloseSchema.safeParse({
      ...TUESDAY,
      expenses: [{ concept: " ", amount: "0", currency: "USD" }],
    });
    expect(errors(parsed)).toEqual({
      "expenses.0.concept": "Escribe en qué se gastó",
      "expenses.0.amount": "El monto debe ser mayor que 0",
    });
  });

  test("each payment method once; amounts are ≥ 0 decimals with a dot", () => {
    expect(
      errors(
        submitDailyCloseSchema.safeParse({
          ...TUESDAY,
          payments: [
            { paymentMethodId: CARD, amount: "1" },
            { paymentMethodId: CARD, amount: "2" },
          ],
        }),
      ),
    ).toEqual({ payments: "Cada forma de pago va una sola vez" });
    expect(
      errors(
        submitDailyCloseSchema.safeParse({
          ...TUESDAY,
          payments: [{ paymentMethodId: CARD, amount: "163.344,00" }],
        }),
      ),
    ).toEqual({
      "payments.0.amount": "El monto debe ser un número con punto decimal (p. ej. 15.50)",
    });
  });

  test("no rate field: a close is amounts only", () => {
    expect(submitDailyCloseSchema.parse({ ...TUESDAY, rate: "210" })).not.toHaveProperty("rate");
  });
});

describe("updateDailyCloseSchema", () => {
  test("same contents without the date (the day of a close does not change)", () => {
    const { businessDate: _date, ...body } = TUESDAY;
    expect(updateDailyCloseSchema.parse(body)).toMatchObject({ cardBatch: "16" });
  });
});
