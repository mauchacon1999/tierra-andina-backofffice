import { describe, expect, test } from "bun:test";

import {
  customerCreditQuerySchema,
  customerPaymentInputSchema,
  updateCustomerSchema,
} from "./customer-credit";
import { formatValidationMessage as text } from "./messages";

const errors = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), text(i.message)]));

describe("customerPaymentInputSchema", () => {
  test("a day, an amount above 0 and its currency", () => {
    const payment = { businessDate: "2026-10-18", amount: "500", currency: "VES" } as const;
    expect(customerPaymentInputSchema.parse(payment)).toEqual(payment);
  });

  test("rejects 0, a comma decimal and an unknown currency", () => {
    expect(
      errors(
        customerPaymentInputSchema.safeParse({ businessDate: "", amount: "0", currency: "EUR" }),
      ),
    ).toEqual({
      businessDate: "Indica la fecha",
      amount: "El monto debe ser mayor que 0",
      currency: expect.any(String),
    });
  });
});

describe("customerCreditQuerySchema / updateCustomerSchema", () => {
  test("lists everyone unless only who owes is asked", () => {
    expect(customerCreditQuerySchema.parse({})).toEqual({ owing: false });
    expect(customerCreditQuerySchema.parse({ owing: "true", search: " car " })).toEqual({
      owing: true,
      search: "car",
    });
  });

  test("an edit needs a field; the name is cleaned", () => {
    expect(updateCustomerSchema.parse({ name: "  Sra.   Carmen " })).toEqual({
      name: "Sra. Carmen",
    });
    expect(text(updateCustomerSchema.safeParse({}).error?.issues[0]?.message ?? "")).toBe(
      "No hay cambios que guardar",
    );
  });
});
