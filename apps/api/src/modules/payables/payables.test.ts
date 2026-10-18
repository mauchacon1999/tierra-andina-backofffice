import { beforeAll, describe, expect, test } from "bun:test";

import { toBusinessDate } from "@ta/core";
import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  expenseCategoryListSchema,
  mobilePaymentDataSchema,
  payableDetailSchema,
  payableListSchema,
  supplierDetailSchema,
  supplierSchema,
  type PayableDetail,
} from "@ta/validators";
import { and, eq } from "drizzle-orm";

import { call, errorOf, signInOwnStore, type Json, type RoleSession } from "@/testing/http";

let s: RoleSession;
let packaging: string;
let food: string;

const MISSING = "01a14314-2825-7000-a1d1-bdf734d05999";
const PAST = { issuedOn: "2020-01-02", dueOn: "2020-01-09" };
const FUTURE = { issuedOn: "2026-10-18", dueOn: "2099-01-01" };

async function newSupplier(): Promise<string> {
  const res = await call(s.app, "POST", "/suppliers", s.owner, {
    name: uniq("Bolsas"),
    kind: "local",
  });
  return supplierSchema.parse(res.body).id;
}

/** 10 packs of bags at 1.50 + 20 loaves at 0.50 = 25. */
const bagsAndBread = (supplierId: string, extra: Json = {}): Json => ({
  supplierId,
  ...FUTURE,
  lines: [
    {
      description: "Bolsas medianas",
      expenseCategoryId: packaging,
      quantity: "10",
      unit: "pack",
      unitPrice: "1.50",
    },
    {
      description: "Pan campesino",
      expenseCategoryId: food,
      quantity: "20",
      unit: "unit",
      unitPrice: "0.50",
    },
  ],
  ...extra,
});

async function newInvoice(extra: Json = {}): Promise<PayableDetail> {
  const res = await call(
    s.app,
    "POST",
    "/payables",
    s.owner,
    bagsAndBread(await newSupplier(), extra),
  );
  if (res.status !== 201) throw new Error(`payable: ${JSON.stringify(res.body)}`);
  return payableDetailSchema.parse(res.body);
}

const pay = (id: string, body: Json) =>
  call(s.app, "POST", `/payables/${id}/payments`, s.owner, body);
const MOBILE = { paidOn: "2026-10-18", method: "mobile_payment", rate: "200" };

beforeAll(async () => {
  s = await signInOwnStore();
  const categories = expenseCategoryListSchema.parse(
    (await call(s.app, "GET", "/expense-categories", s.owner)).body,
  ).data;
  packaging = categories.find((c) => c.code === "packaging")!.id;
  food = categories.find((c) => c.code === "food")!.id;
});

describe("POST /api/v1/payables", () => {
  test("a supplies invoice: sequential code, subtotals and total in USD, pending", async () => {
    const first = await newInvoice();
    const second = await newInvoice();

    expect(first).toMatchObject({
      currency: "USD",
      total: "25.0000",
      paid: "0.0000",
      balance: "25.0000",
      status: "pending",
      payments: [],
    });
    expect(first.code).toMatch(/^CXP-\d{6}$/);
    expect(Number(second.code.slice(4))).toBe(Number(first.code.slice(4)) + 1);
    expect(first.lines.map((l) => [l.description, l.expenseCategoryName, l.subtotal])).toEqual([
      ["Bolsas medianas", "Empaque", "15.0000"],
      ["Pan campesino", "Alimentación", "10.0000"],
    ]);
  });

  test("an invoice in bolívares keeps its total in Bs", async () => {
    const invoice = await newInvoice({
      currency: "VES",
      lines: [
        {
          description: "Pan",
          expenseCategoryId: food,
          quantity: "30",
          unit: "unit",
          unitPrice: "50",
        },
      ],
    });
    expect(invoice).toMatchObject({ currency: "VES", total: "1500.0000" });
  });

  test("audited with its lines", async () => {
    const invoice = await newInvoice();
    const [log] = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.tableName, "payables"), eq(schema.auditLogs.recordId, invoice.id)),
      );
    expect(log?.action).toBe("insert");
    expect((log?.changes as { lines: unknown[] }).lines).toHaveLength(2);
  });

  test("400 for a due date before the issue date or no lines", async () => {
    const supplierId = await newSupplier();
    const res = await call(
      s.app,
      "POST",
      "/payables",
      s.owner,
      bagsAndBread(supplierId, { dueOn: "2026-10-17", lines: [] }),
    );
    expect(res.status).toBe(400);
    expect(Object.keys(errorOf(res.body).details?.fieldErrors as object).sort()).toEqual([
      "dueOn",
      "lines",
    ]);
  });

  test("422 for an unknown supplier or expense category, on the field", async () => {
    const unknownSupplier = await call(s.app, "POST", "/payables", s.owner, bagsAndBread(MISSING));
    expect(unknownSupplier.status).toBe(422);
    expect(errorOf(unknownSupplier.body)).toMatchObject({ code: "SUPPLIER_NOT_FOUND" });

    const body = bagsAndBread(await newSupplier());
    (body.lines as Json[])[1]!.expenseCategoryId = MISSING;
    const unknownCategory = await call(s.app, "POST", "/payables", s.owner, body);
    expect(unknownCategory.status).toBe(422);
    expect(errorOf(unknownCategory.body).details?.fieldErrors).toEqual({
      "lines.1.expenseCategoryId": ["Elige una categoría de la lista"],
    });
  });

  test("403 for a manager or a receiver; 401 without a session", async () => {
    const body = bagsAndBread(MISSING);
    expect((await call(s.app, "POST", "/payables", s.manager, body)).status).toBe(403);
    expect((await call(s.app, "GET", "/payables", s.receiver)).status).toBe(403);
    expect((await call(s.app, "GET", "/expense-categories", s.manager)).status).toBe(403);
    expect((await call(s.app, "GET", "/payables", null)).status).toBe(401);
  });
});

describe("GET /api/v1/payables", () => {
  test("filters by supplier and status; the balance adds up the filter per currency", async () => {
    const supplierId = await newSupplier();
    const overdue = payableDetailSchema.parse(
      (await call(s.app, "POST", "/payables", s.owner, bagsAndBread(supplierId, PAST))).body,
    );
    const pending = payableDetailSchema.parse(
      (await call(s.app, "POST", "/payables", s.owner, bagsAndBread(supplierId))).body,
    );
    await pay(pending.id, { ...MOBILE, method: "cash_usd", amount: "5" });

    const all = payableListSchema.parse(
      (await call(s.app, "GET", `/payables?supplierId=${supplierId}`, s.owner)).body,
    );
    expect(all.data.map((p) => [p.code, p.status])).toEqual([
      [pending.code, "partial"],
      [overdue.code, "overdue"],
    ]);
    expect(all).toMatchObject({ total: 2, page: 1, balance: { USD: "45.0000", VES: "0.0000" } });

    const onlyOverdue = payableListSchema.parse(
      (
        await call(
          s.app,
          "GET",
          `/payables?supplierId=${supplierId}&status=overdue&pageSize=1`,
          s.owner,
        )
      ).body,
    );
    expect(onlyOverdue.data.map((p) => p.id)).toEqual([overdue.id]);
    expect(onlyOverdue.balance.USD).toBe("25.0000");
  });

  test("400 for an unknown status; 404 for an invoice of another store", async () => {
    expect((await call(s.app, "GET", "/payables?status=open", s.owner)).status).toBe(400);
    const res = await call(s.app, "GET", `/payables/${MISSING}`, s.owner);
    expect(res.status).toBe(404);
    expect(errorOf(res.body).code).toBe("PAYABLE_NOT_FOUND");
  });
});

describe("PUT /api/v1/payables/:id and PATCH /:id/terms", () => {
  test("replaces a supplies invoice without payments", async () => {
    const invoice = await newInvoice();
    const res = await call(
      s.app,
      "PUT",
      `/payables/${invoice.id}`,
      s.owner,
      bagsAndBread(invoice.supplierId, {
        lines: [
          {
            description: "Cloro",
            expenseCategoryId: packaging,
            quantity: "2",
            unit: "unit",
            unitPrice: "3",
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(payableDetailSchema.parse(res.body)).toMatchObject({
      code: invoice.code,
      total: "6.0000",
    });
  });

  test("409 PAYABLE_HAS_PAYMENTS once paid in part; the terms can still change", async () => {
    const invoice = await newInvoice();
    await pay(invoice.id, { ...MOBILE, method: "cash_usd", amount: "1" });

    const replaced = await call(
      s.app,
      "PUT",
      `/payables/${invoice.id}`,
      s.owner,
      bagsAndBread(invoice.supplierId),
    );
    expect(errorOf(replaced.body).code).toBe("PAYABLE_HAS_PAYMENTS");

    const terms = await call(s.app, "PATCH", `/payables/${invoice.id}/terms`, s.owner, {
      dueOn: "2026-10-30",
      note: "Paga el viernes",
    });
    expect(payableDetailSchema.parse(terms.body)).toMatchObject({
      dueOn: "2026-10-30",
      note: "Paga el viernes",
    });
  });

  test("422 INVALID_DUE_DATE before the issue date", async () => {
    const invoice = await newInvoice();
    const res = await call(s.app, "PATCH", `/payables/${invoice.id}/terms`, s.owner, {
      dueOn: "2026-10-01",
    });
    expect(res.status).toBe(422);
    expect(errorOf(res.body).code).toBe("INVALID_DUE_DATE");
  });
});

describe("POST /api/v1/payables/:id/void", () => {
  test("voids an invoice without payments; it owes nothing and takes no more payments", async () => {
    const invoice = await newInvoice();
    const voided = payableDetailSchema.parse(
      (await call(s.app, "POST", `/payables/${invoice.id}/void`, s.owner)).body,
    );
    expect(voided.status).toBe("voided");
    expect(voided.voidedAt).not.toBeNull();

    expect(errorOf((await pay(invoice.id, { ...MOBILE, amount: "1" })).body).code).toBe(
      "PAYABLE_VOIDED",
    );
    expect((await call(s.app, "POST", `/payables/${invoice.id}/void`, s.owner)).status).toBe(409);
  });

  test("409 PAYABLE_HAS_PAYMENTS when it has payments", async () => {
    const invoice = await newInvoice();
    await pay(invoice.id, { ...MOBILE, method: "cash_usd", amount: "1" });
    const res = await call(s.app, "POST", `/payables/${invoice.id}/void`, s.owner);
    expect(errorOf(res.body).code).toBe("PAYABLE_HAS_PAYMENTS");
  });
});

describe("POST /api/v1/payables/:id/payments", () => {
  test("a USD invoice paid by pago móvil in Bs at the BCV rate, then the exact rest", async () => {
    const invoice = await newInvoice();

    const first = payableDetailSchema.parse(
      (await pay(invoice.id, { ...MOBILE, amount: "1000", reference: "001234" })).body,
    );
    expect(first).toMatchObject({ paid: "5.0000", balance: "20.0000", status: "partial" });
    expect(first.payments[0]).toMatchObject({
      method: "mobile_payment",
      currency: "VES",
      amountUsd: "5.0000",
      amountBs: "1000.0000",
      rate: "200.0000",
      applied: "5.0000",
      reference: "001234",
    });

    // 20 USD × 201.555 = 4031.10 Bs: paying exactly that settles the invoice.
    const rest = payableDetailSchema.parse(
      (await pay(invoice.id, { ...MOBILE, rate: "201.555", amount: "4031.10" })).body,
    );
    expect(rest).toMatchObject({ balance: "0.0000", status: "paid" });
  });

  test("422 PAYMENT_EXCEEDS_BALANCE telling the balance in the payment's currency", async () => {
    const invoice = await newInvoice();
    const res = await pay(invoice.id, { ...MOBILE, amount: "5000.01" });
    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "PAYMENT_EXCEEDS_BALANCE",
      details: {
        balance: "5000.00",
        currency: "VES",
        fieldErrors: { amount: ["El saldo es 5000.00 Bs"] },
      },
    });
  });

  test("the destination account must be an active account of the supplier", async () => {
    const invoice = await newInvoice();
    const other = await newSupplier();
    const account = supplierDetailSchema.parse(
      (
        await call(s.app, "POST", `/suppliers/${other}/accounts`, s.owner, {
          bankCode: "0102",
          phone: "04141234567",
          idDocument: "V12345678",
        })
      ).body,
    ).accounts[0]!;

    const res = await pay(invoice.id, { ...MOBILE, amount: "10", accountId: account.id });
    expect(res.status).toBe(422);
    expect(errorOf(res.body).code).toBe("INVALID_PAYMENT_ACCOUNT");
  });

  test("400 for a sale method of the daily close; 403 for a manager", async () => {
    const invoice = await newInvoice();
    expect(
      (await pay(invoice.id, { ...MOBILE, method: "card_terminal", amount: "1" })).status,
    ).toBe(400);
    const manager = await call(s.app, "POST", `/payables/${invoice.id}/payments`, s.manager, {
      ...MOBILE,
      amount: "1",
    });
    expect(manager.status).toBe(403);
  });

  test("DELETE takes a mistaken payment back; 404 for an unknown one", async () => {
    const invoice = await newInvoice();
    const paid = payableDetailSchema.parse(
      (await pay(invoice.id, { ...MOBILE, method: "cash_usd", amount: "25" })).body,
    );
    expect(paid.status).toBe("paid");

    const res = await call(
      s.app,
      "DELETE",
      `/payables/${invoice.id}/payments/${paid.payments[0]!.id}`,
      s.owner,
    );
    expect(payableDetailSchema.parse(res.body)).toMatchObject({
      balance: "25.0000",
      status: "pending",
    });

    const missing = await call(
      s.app,
      "DELETE",
      `/payables/${invoice.id}/payments/${MISSING}`,
      s.owner,
    );
    expect(errorOf(missing.body).code).toBe("PAYMENT_NOT_FOUND");
  });
});

describe("GET /api/v1/payables/:id/mobile-payment", () => {
  test("a USD balance in Bs at today's BCV rate, and the text for each active account", async () => {
    const today = toBusinessDate(new Date());
    const db = testConnection().db;
    await db
      .delete(schema.exchangeRates)
      .where(
        and(eq(schema.exchangeRates.kind, "bcv"), eq(schema.exchangeRates.businessDate, today)),
      );
    const invoice = await newInvoice();
    await call(s.app, "POST", `/suppliers/${invoice.supplierId}/accounts`, s.owner, {
      bankCode: "0102",
      phone: "0414-123.45.67",
      idDocument: "V-12.345.678",
    });

    const missing = await call(s.app, "GET", `/payables/${invoice.id}/mobile-payment`, s.owner);
    expect(errorOf(missing.body).code).toBe("BCV_RATE_MISSING");

    await call(s.app, "PUT", `/exchange-rates/${today}`, s.owner, { bcv: "201.555" });
    const data = mobilePaymentDataSchema.parse(
      (await call(s.app, "GET", `/payables/${invoice.id}/mobile-payment`, s.owner)).body,
    );

    // 25 USD × 201.555 = 5038.875 → 5038.88 Bs
    expect(data).toMatchObject({
      businessDate: today,
      balance: "25.0000",
      bcvRate: "201.5550",
      amountBs: "5038.88",
      amountText: "5038,88",
    });
    expect(data.accounts.map((a) => a.clipboard)).toEqual([
      "0102\n04141234567\nV12345678\n5038,88",
    ]);
  });

  test("a Bs invoice is fixed; a paid one answers 409 PAYABLE_SETTLED", async () => {
    const invoice = await newInvoice({
      currency: "VES",
      lines: [
        {
          description: "Pan",
          expenseCategoryId: food,
          quantity: "1",
          unit: "unit",
          unitPrice: "1500",
        },
      ],
    });
    const data = mobilePaymentDataSchema.parse(
      (await call(s.app, "GET", `/payables/${invoice.id}/mobile-payment`, s.owner)).body,
    );
    expect(data).toMatchObject({ bcvRate: null, amountBs: "1500.00", accounts: [] });

    await pay(invoice.id, { ...MOBILE, amount: "1500" });
    const settled = await call(s.app, "GET", `/payables/${invoice.id}/mobile-payment`, s.owner);
    expect(errorOf(settled.body).code).toBe("PAYABLE_SETTLED");
  });
});
