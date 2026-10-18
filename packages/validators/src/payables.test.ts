import { describe, expect, test } from "bun:test";

import { formatValidationMessage as text } from "./messages";
import {
  payableInputSchema,
  payableLineInputSchema,
  payablePaymentInputSchema,
  supplierPaymentAccountInputSchema,
} from "./payables";

const SUPPLIER = "01a14314-2825-7000-a1d1-bdf734d05981";
const FOOD = "01a14314-2825-7000-a1d1-bdf734d05982";
const PACKAGING = "01a14314-2825-7000-a1d1-bdf734d05983";

const errors = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), text(i.message)]));

const BREAD_LINE = {
  description: "Pan campesino",
  expenseCategoryId: FOOD,
  quantity: "20",
  unit: "unit",
  unitPrice: "0.50",
} as const;
const BAGS_LINE = {
  description: " Bolsas medianas ",
  expenseCategoryId: PACKAGING,
  quantity: "10",
  unit: "pack",
  unitPrice: "1.50",
} as const;

describe("supplierPaymentAccountInputSchema", () => {
  test("stores phone and cédula the way the banks want them", () => {
    expect(
      supplierPaymentAccountInputSchema.parse({
        bankCode: "0102",
        phone: "0414-123.45.67",
        idDocument: "v-12.345.678",
      }),
    ).toEqual({ bankCode: "0102", phone: "04141234567", idDocument: "V12345678" });
  });

  test("rejects an unknown bank, a landline and a cédula without letter", () => {
    const result = supplierPaymentAccountInputSchema.safeParse({
      bankCode: "0999",
      phone: "0212-1234567",
      idDocument: "12345678",
    });
    expect(errors(result)).toEqual({
      bankCode: "Elige un banco de la lista",
      phone: "El teléfono debe tener 11 dígitos y empezar por 0412, 0414, 0416, 0422, 0424 o 0426",
      idDocument: "Escribe la cédula o RIF con su letra (V, E, J, G o P) y sin puntos",
    });
  });
});

describe("payableLineInputSchema", () => {
  test("a supply: description without extra spaces and its expense category", () => {
    expect(payableLineInputSchema.parse(BAGS_LINE)).toEqual({
      ...BAGS_LINE,
      description: "Bolsas medianas",
    });
  });

  test("needs a description and an expense category", () => {
    const result = payableLineInputSchema.safeParse({
      quantity: "1",
      unit: "unit",
      unitPrice: "2",
      description: "  ",
    });
    expect(errors(result)).toEqual({
      description: "Escribe qué se compró",
      expenseCategoryId: "Elige la categoría del gasto",
    });
  });

  test("quantity > 0, a known unit and a valid price", () => {
    const result = payableLineInputSchema.safeParse({
      ...BAGS_LINE,
      quantity: "0",
      unit: "crate",
      unitPrice: "1,5",
    });
    expect(Object.keys(errors(result)).sort()).toEqual(["quantity", "unit", "unitPrice"]);
    expect(errors(result).quantity).toBe("La cantidad debe ser mayor que 0");
  });
});

describe("payableInputSchema", () => {
  const INVOICE = {
    supplierId: SUPPLIER,
    issuedOn: "2026-10-18",
    dueOn: "2026-10-25",
    lines: [BREAD_LINE, BAGS_LINE],
  };

  test("defaults to USD; an empty note is no note", () => {
    const parsed = payableInputSchema.parse({ ...INVOICE, note: " " });
    expect(parsed.currency).toBe("USD");
    expect(parsed.note).toBeUndefined();
    expect(parsed.lines).toHaveLength(2);
  });

  test("accepts an invoice in bolívares", () => {
    expect(payableInputSchema.parse({ ...INVOICE, currency: "VES" }).currency).toBe("VES");
  });

  test("the due date may be the issue date but not before it", () => {
    expect(payableInputSchema.safeParse({ ...INVOICE, dueOn: "2026-10-18" }).success).toBe(true);
    expect(errors(payableInputSchema.safeParse({ ...INVOICE, dueOn: "2026-10-17" }))).toEqual({
      dueOn: "El vencimiento no puede ser antes de la emisión",
    });
  });

  test("needs a supplier, a due date and at least one line", () => {
    const result = payableInputSchema.safeParse({ issuedOn: "2026-10-18", lines: [] });
    expect(errors(result)).toEqual({
      supplierId: "Elige el proveedor",
      dueOn: "Indica la fecha",
      lines: "Agrega al menos una línea",
    });
  });

  test("at most 50 lines", () => {
    const lines = Array.from({ length: 51 }, () => BREAD_LINE);
    expect(errors(payableInputSchema.safeParse({ ...INVOICE, lines }))).toEqual({
      lines: "Una factura admite como máximo 50 líneas",
    });
  });
});

describe("payablePaymentInputSchema", () => {
  const PAYMENT = {
    paidOn: "2026-10-20",
    method: "mobile_payment",
    amount: "5000",
    rate: "201.5",
  } as const;

  test("method, amount and the day's rate; reference and account are optional", () => {
    expect(
      payablePaymentInputSchema.parse({ ...PAYMENT, reference: " 001234 ", accountId: SUPPLIER }),
    ).toEqual({ ...PAYMENT, reference: "001234", accountId: SUPPLIER });
  });

  test("rejects an unknown method, a zero amount and a zero rate", () => {
    const result = payablePaymentInputSchema.safeParse({
      ...PAYMENT,
      method: "card_terminal",
      amount: "0",
      rate: "0",
    });
    expect(errors(result)).toEqual({
      method: "Elige cómo se pagó",
      amount: "El monto debe ser mayor que 0",
      rate: "La tasa debe ser mayor que 0",
    });
  });
});
