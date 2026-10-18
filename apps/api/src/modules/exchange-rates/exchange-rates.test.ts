import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection } from "@ta/db/testing";
import { dailyRatesListSchema, dailyRatesSchema, officialBcvRateSchema } from "@ta/validators";
import { and, eq, isNull } from "drizzle-orm";

import { call, errorOf, signInRoles, type RoleSession } from "@/testing/http";

let s: RoleSession;

beforeAll(async () => {
  s = await signInRoles();
});

describe("PUT /api/v1/exchange-rates/:date", () => {
  test("owner sets BCV, Coche and sale rates of a day", async () => {
    const res = await call(s.app, "PUT", "/exchange-rates/2026-09-01", s.owner, {
      bcv: "200",
      market: "201",
      sale: "210",
    });

    expect(res.status).toBe(200);
    expect(dailyRatesSchema.parse(res.body)).toEqual({
      businessDate: "2026-09-01",
      bcv: "200.0000",
      market: "201.0000",
      sale: "210.0000",
    });
  });

  test("stores BCV globally and Coche per store", async () => {
    await call(s.app, "PUT", "/exchange-rates/2026-09-02", s.owner, {
      bcv: "199",
      market: "200.5",
    });
    const rows = await testConnection()
      .db.select()
      .from(schema.exchangeRates)
      .where(eq(schema.exchangeRates.businessDate, "2026-09-02"));

    expect(rows.find((r) => r.kind === "bcv")?.storeId).toBeNull();
    expect(rows.find((r) => r.kind === "market")?.storeId).toBe(s.storeId);
  });

  test("correcting a rate replaces it (no duplicates) and keeps the others", async () => {
    await call(s.app, "PUT", "/exchange-rates/2026-09-03", s.owner, { bcv: "200", market: "201" });
    const res = await call(s.app, "PUT", "/exchange-rates/2026-09-03", s.owner, { market: "202" });
    const bcvRows = await testConnection()
      .db.select()
      .from(schema.exchangeRates)
      .where(
        and(
          eq(schema.exchangeRates.businessDate, "2026-09-03"),
          eq(schema.exchangeRates.kind, "bcv"),
          isNull(schema.exchangeRates.storeId),
        ),
      );

    expect(res.body).toMatchObject({ bcv: "200.0000", market: "202.0000", sale: null });
    expect(bcvRows).toHaveLength(1);
  });

  test("audits every change with the previous value", async () => {
    await call(s.app, "PUT", "/exchange-rates/2026-09-04", s.owner, { market: "201" });
    await call(s.app, "PUT", "/exchange-rates/2026-09-04", s.owner, { market: "203" });
    const logs = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.tableName, "exchange_rates"));
    const day = logs.filter(
      (l) => (l.changes as { businessDate?: string }).businessDate === "2026-09-04",
    );

    expect(day.map((l) => l.action)).toEqual(["insert", "update"]);
    expect(day[1]?.changes).toMatchObject({ value: { from: "201.0000", to: "203.0000" } });
  });

  test("400 for an impossible date, a zero rate or an empty body", async () => {
    const date = await call(s.app, "PUT", "/exchange-rates/2026-02-30", s.owner, { bcv: "200" });
    const zero = await call(s.app, "PUT", "/exchange-rates/2026-09-05", s.owner, { bcv: "0" });
    const empty = await call(s.app, "PUT", "/exchange-rates/2026-09-05", s.owner, {});

    for (const res of [date, zero, empty]) {
      expect(res.status).toBe(400);
      expect(errorOf(res.body).code).toBe("VALIDATION_ERROR");
    }
  });

  test("only the owner can set rates", async () => {
    expect(
      (await call(s.app, "PUT", "/exchange-rates/2026-09-06", s.manager, { bcv: "1" })).status,
    ).toBe(403);
    expect(
      (await call(s.app, "PUT", "/exchange-rates/2026-09-06", s.receiver, { bcv: "1" })).status,
    ).toBe(403);
    expect(
      (await call(s.app, "PUT", "/exchange-rates/2026-09-06", null, { bcv: "1" })).status,
    ).toBe(401);
  });
});

describe("GET /api/v1/exchange-rates/official", () => {
  test("the owner and the manager see the consulted BCV rate; it is not stored", async () => {
    const owner = await call(s.app, "GET", "/exchange-rates/official", s.owner);
    const manager = await call(s.app, "GET", "/exchange-rates/official", s.manager);

    expect(owner.status).toBe(200);
    expect(officialBcvRateSchema.parse(owner.body)).toEqual({
      usd: "880.1159",
      effectiveDate: "2026-10-16",
    });
    expect(manager.status).toBe(200);
    expect((await call(s.app, "GET", "/exchange-rates/official", s.receiver)).status).toBe(403);
    expect((await call(s.app, "GET", "/exchange-rates/official", null)).status).toBe(401);
  });
});

describe("GET /api/v1/exchange-rates", () => {
  test("one day, with nulls for missing rates", async () => {
    await call(s.app, "PUT", "/exchange-rates/2026-09-10", s.owner, { bcv: "205" });
    const res = await call(s.app, "GET", "/exchange-rates/2026-09-10", s.manager);
    const empty = await call(s.app, "GET", "/exchange-rates/2026-09-11", s.owner);

    expect(res.body).toEqual({
      businessDate: "2026-09-10",
      bcv: "205.0000",
      market: null,
      sale: null,
    });
    expect(empty.body).toEqual({ businessDate: "2026-09-11", bcv: null, market: null, sale: null });
  });

  test("a range lists the days with rates, newest first", async () => {
    await call(s.app, "PUT", "/exchange-rates/2026-08-20", s.owner, { bcv: "190", market: "191" });
    await call(s.app, "PUT", "/exchange-rates/2026-08-22", s.owner, { market: "193" });
    const res = await call(s.app, "GET", "/exchange-rates?from=2026-08-19&to=2026-08-23", s.owner);

    expect(dailyRatesListSchema.parse(res.body).data).toEqual([
      { businessDate: "2026-08-22", bcv: null, market: "193.0000", sale: null },
      { businessDate: "2026-08-20", bcv: "190.0000", market: "191.0000", sale: null },
    ]);
  });

  test("receivers cannot read rates; ranges are limited", async () => {
    expect((await call(s.app, "GET", "/exchange-rates/2026-09-10", s.receiver)).status).toBe(403);
    expect(
      (await call(s.app, "GET", "/exchange-rates?from=2026-01-01&to=2026-09-01", s.owner)).status,
    ).toBe(400);
  });
});
