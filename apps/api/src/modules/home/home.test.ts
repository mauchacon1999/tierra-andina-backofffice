import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection } from "@ta/db/testing";
import { homeBriefingSchema, paymentMethodListSchema, type PaymentMethod } from "@ta/validators";

import { call, errorOf, signInRoles, type Json, type RoleSession } from "@/testing/http";
import { createStore, createUser, signIn } from "@/testing/test-app";

import { getHomeBriefing } from "./home.service";

let s: RoleSession;

beforeAll(async () => {
  s = await signInRoles();
});

describe("GET /api/v1/home", () => {
  test("the owner gets a briefing; the manager and the receiver do not", async () => {
    const res = await call(s.app, "GET", "/home", s.owner);
    expect(res.status).toBe(200);
    const briefing = homeBriefingSchema.parse(res.body);
    expect(briefing.week.from <= briefing.week.to).toBe(true);
    expect((await call(s.app, "GET", "/home", s.manager)).status).toBe(403);
    expect((await call(s.app, "GET", "/home", s.receiver)).status).toBe(403);
    expect(errorOf((await call(s.app, "GET", "/home", null)).body).code).toBe("UNAUTHENTICATED");
  });
});

describe("getHomeBriefing", () => {
  test("sums the week's closes, open debts and fiado without mixing currencies", async () => {
    const store = await createStore();
    const owner = await createUser({ storeId: store.id, role: "owner" });
    const cookie = await signIn(s.app, owner.email, owner.password);
    const methods = Object.fromEntries(
      paymentMethodListSchema
        .parse((await call(s.app, "GET", "/payment-methods", cookie)).body)
        .data.map((method) => [method.code, method]),
    ) as Record<string, PaymentMethod>;

    const kept = await call(s.app, "POST", "/daily-closes", cookie, {
      businessDate: "2027-06-02",
      cashDestination: "kept",
      payments: [
        { paymentMethodId: methods.card_terminal!.id, amount: "163344" },
        { paymentMethodId: methods.cash_bs!.id, amount: "5500" },
        { paymentMethodId: methods.cash_usd!.id, amount: "18000" },
        { paymentMethodId: methods.mobile_payment!.id, amount: "83569" },
      ],
      credits: [{ customerName: "Sra. María", amount: "1200", currency: "VES" }],
    } satisfies Json);
    expect(kept.status).toBe(201);

    const deposited = await call(s.app, "POST", "/daily-closes", cookie, {
      businessDate: "2027-06-03",
      cashDestination: "deposited",
      payments: [
        { paymentMethodId: methods.cash_bs!.id, amount: "2000" },
        { paymentMethodId: methods.cash_usd!.id, amount: "100" },
      ],
    } satisfies Json);
    expect(deposited.status).toBe(201);

    const db = testConnection().db;
    const [supplier] = await db
      .insert(schema.suppliers)
      .values({ name: "Panadería", kind: "local" })
      .returning();
    if (!supplier) throw new Error("could not insert the supplier");
    const invoice = { storeId: store.id, supplierId: supplier.id, issuedOn: "2027-06-01" };
    const [open, settled] = await db
      .insert(schema.payables)
      .values([
        { ...invoice, number: 1, total: "10" },
        { ...invoice, number: 2, total: "3" },
        { ...invoice, number: 3, total: "50", voidedAt: new Date() },
        { ...invoice, number: 4, total: "1500", currency: "VES" },
      ])
      .returning();
    if (!open || !settled) throw new Error("could not insert payables");
    const cashUsd = {
      paidOn: "2027-06-02",
      method: "cash_usd",
      currency: "USD",
      rate: "200",
    } as const;
    await db.insert(schema.payablePayments).values([
      { ...cashUsd, payableId: open.id, amountUsd: "4", amountBs: "800", applied: "4" },
      { ...cashUsd, payableId: settled.id, amountUsd: "3", amountBs: "600", applied: "3" },
    ]);

    const briefing = homeBriefingSchema.parse(await getHomeBriefing(db, store.id, "2027-06-03"));
    expect(briefing.week).toMatchObject({
      from: "2027-05-31",
      to: "2027-06-06",
      closeCount: 2,
      collected: { usd: "18100.0000", bs: "254413.0000" },
      deposited: { usd: "100.0000", bs: "2000.0000" },
      kept: { usd: "18000.0000", bs: "5500.0000" },
    });
    // Bolsas owes 6 of 10 $; the bread is paid; the voided one does not count; 1500 Bs apart.
    expect(briefing.payables).toEqual({
      count: 2,
      remaining: { usd: "6.0000", bs: "1500.0000" },
    });
    expect(briefing.credit).toEqual({ usd: "0.0000", bs: "1200.0000" });
    expect(briefing.alerts.map((alert) => alert.code)).toEqual([
      "closes_pending",
      "rates_missing",
      "no_price_list",
    ]);
    expect(briefing.alerts.find((alert) => alert.code === "closes_pending")?.count).toBe(2);
    expect(briefing.alerts.find((alert) => alert.code === "rates_missing")?.count).toBe(3);
  });
});
