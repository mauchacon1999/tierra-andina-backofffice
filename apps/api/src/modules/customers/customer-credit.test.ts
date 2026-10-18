import { beforeAll, describe, expect, test } from "bun:test";

import { toBusinessDate } from "@ta/core";
import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  customerBalanceListSchema,
  customerCreditDetailSchema,
  paymentMethodListSchema,
} from "@ta/validators";
import { and, eq } from "drizzle-orm";

import { call, errorOf, signInOwnStore, type Json, type RoleSession } from "@/testing/http";

let s: RoleSession;
let cardId: string;
let dayCounter = 0;

const MISSING = "01a14314-2825-7000-a1d1-bdf734d05999";

/** A close on its own day with credit sales; returns the customer's id. */
async function customerWithCredit(credits: Json[], name = uniq("Sra. Carmen")): Promise<string> {
  dayCounter += 1;
  const res = await call(s.app, "POST", "/daily-closes", s.owner, {
    businessDate: `2027-02-${String(dayCounter).padStart(2, "0")}`,
    cashDestination: "kept",
    payments: [{ paymentMethodId: cardId, amount: "100" }],
    credits: credits.map((credit) => ({ customerName: name, ...credit })),
  });
  if (res.status !== 201) throw new Error(`close: ${JSON.stringify(res.body)}`);
  const list = customerBalanceListSchema.parse(
    (await call(s.app, "GET", `/customers/credit?search=${encodeURIComponent(name)}`, s.owner))
      .body,
  );
  const customer = list.data.find((c) => c.name === name);
  if (!customer) throw new Error("customer missing");
  return customer.id;
}

const pay = (cookie: string, id: string, body: Json) =>
  call(s.app, "POST", `/customers/${id}/payments`, cookie, body);

beforeAll(async () => {
  s = await signInOwnStore();
  const methods = paymentMethodListSchema.parse(
    (await call(s.app, "GET", "/payment-methods", s.owner)).body,
  ).data;
  cardId = methods.find((m) => m.code === "card_terminal")!.id;
});

describe("GET /api/v1/customers/credit", () => {
  test("each customer with what is owed per currency, and the net total", async () => {
    const name = uniq("Sr. Luis");
    const id = await customerWithCredit(
      [
        { amount: "1200", currency: "VES" },
        { amount: "5", currency: "USD" },
      ],
      name,
    );

    const res = await call(
      s.app,
      "GET",
      `/customers/credit?search=${encodeURIComponent(name)}`,
      s.manager,
    );

    expect(res.status).toBe(200);
    expect(customerBalanceListSchema.parse(res.body)).toMatchObject({
      data: [{ id, name, balance: { VES: "1200.0000", USD: "5.0000" } }],
      total: { VES: "1200.0000", USD: "5.0000" },
    });
  });

  test("owing=true leaves out customers who owe nothing", async () => {
    const id = await customerWithCredit([{ amount: "300", currency: "VES" }]);
    await pay(s.owner, id, { businessDate: "2027-02-27", amount: "300", currency: "VES" });

    const owing = customerBalanceListSchema.parse(
      (await call(s.app, "GET", "/customers/credit?owing=true", s.owner)).body,
    );
    expect(owing.data.some((c) => c.id === id)).toBe(false);
  });

  test("403 for a receiver; 401 without a session", async () => {
    expect((await call(s.app, "GET", "/customers/credit", s.receiver)).status).toBe(403);
    expect((await call(s.app, "GET", "/customers/credit", null)).status).toBe(401);
  });
});

describe("POST /api/v1/customers/:id/payments", () => {
  test("a payment lowers its own currency; the history comes newest first", async () => {
    const id = await customerWithCredit([{ amount: "1200", currency: "VES" }]);

    const res = await pay(s.owner, id, {
      businessDate: "2027-02-28",
      amount: "500",
      currency: "VES",
    });

    expect(res.status).toBe(201);
    const detail = customerCreditDetailSchema.parse(res.body);
    expect(detail.balance).toEqual({ VES: "700.0000", USD: "0.0000" });
    expect(detail.entries.map((e) => [e.kind, e.amount, e.dailyCloseId === null])).toEqual([
      ["payment", "500.0000", true],
      ["credit", "1200.0000", false],
    ]);
  });

  test("paying in the other currency leaves money in the customer's favor", async () => {
    const id = await customerWithCredit([{ amount: "1200", currency: "VES" }]);

    const detail = customerCreditDetailSchema.parse(
      (await pay(s.owner, id, { businessDate: "2027-02-28", amount: "3", currency: "USD" })).body,
    );

    expect(detail.balance).toEqual({ VES: "1200.0000", USD: "-3.0000" });
  });

  test("the manager writes today's payments only; audited", async () => {
    const id = await customerWithCredit([{ amount: "100", currency: "VES" }]);

    const past = await pay(s.manager, id, {
      businessDate: "2027-02-28",
      amount: "10",
      currency: "VES",
    });
    expect(past.status).toBe(422);
    expect(errorOf(past.body).code).toBe("PAYMENT_DATE_LOCKED");

    const today = await pay(s.manager, id, {
      businessDate: toBusinessDate(new Date()),
      amount: "10",
      currency: "VES",
    });
    expect(today.status).toBe(201);
    const entryId = customerCreditDetailSchema
      .parse(today.body)
      .entries.find((e) => e.kind === "payment")!.id;
    const [log] = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.tableName, "customer_credit_entries"),
          eq(schema.auditLogs.recordId, entryId),
        ),
      );
    expect(log?.action).toBe("insert");
  });

  test("400 for an amount of 0, 404 for an unknown customer, 403 for a receiver", async () => {
    const id = await customerWithCredit([{ amount: "100", currency: "VES" }]);
    const body = { businessDate: "2027-02-28", amount: "0", currency: "VES" };

    expect((await pay(s.owner, id, body)).status).toBe(400);
    expect((await pay(s.owner, MISSING, { ...body, amount: "1" })).status).toBe(404);
    expect((await pay(s.receiver, id, { ...body, amount: "1" })).status).toBe(403);
  });
});

describe("DELETE /api/v1/customers/:id/payments/:entryId and PATCH /:id", () => {
  test("the owner takes back a mistaken payment; credit sales stay with their close", async () => {
    const id = await customerWithCredit([{ amount: "100", currency: "VES" }]);
    const paid = customerCreditDetailSchema.parse(
      (await pay(s.owner, id, { businessDate: "2027-02-28", amount: "40", currency: "VES" })).body,
    );
    const [payment, credit] = paid.entries;

    const fromClose = await call(
      s.app,
      "DELETE",
      `/customers/${id}/payments/${credit!.id}`,
      s.owner,
    );
    expect(fromClose.status).toBe(409);
    expect(errorOf(fromClose.body).code).toBe("CREDIT_ENTRY_FROM_CLOSE");

    expect(
      (await call(s.app, "DELETE", `/customers/${id}/payments/${payment!.id}`, s.manager)).status,
    ).toBe(403);
    const res = await call(s.app, "DELETE", `/customers/${id}/payments/${payment!.id}`, s.owner);
    expect(customerCreditDetailSchema.parse(res.body).balance.VES).toBe("100.0000");

    const again = await call(s.app, "DELETE", `/customers/${id}/payments/${payment!.id}`, s.owner);
    expect(errorOf(again.body).code).toBe("CREDIT_ENTRY_NOT_FOUND");
  });

  test("the owner edits name and phone", async () => {
    const id = await customerWithCredit([{ amount: "100", currency: "VES" }]);

    const res = await call(s.app, "PATCH", `/customers/${id}`, s.owner, {
      name: "  Sra.  Carmen Rojas ",
      phone: "0414-1112233",
    });

    expect(customerCreditDetailSchema.parse(res.body)).toMatchObject({
      name: "Sra. Carmen Rojas",
      phone: "0414-1112233",
    });
    expect((await call(s.app, "PATCH", `/customers/${id}`, s.manager, { phone: "" })).status).toBe(
      403,
    );
    expect((await call(s.app, "PATCH", `/customers/${id}`, s.owner, {})).status).toBe(400);
  });
});
