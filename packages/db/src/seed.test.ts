import { describe, expect, test } from "bun:test";

import { verifyPassword } from "better-auth/crypto";
import { count, eq } from "drizzle-orm";

import {
  accounts,
  expenseCategories,
  memberships,
  paymentMethods,
  productCategories,
  settings,
  stores,
  users,
} from "./schema";
import { seed } from "./seed";
import { SEED_STORE } from "./seed-data";
import { TEST_OWNER } from "./testing/preload";
import { testConnection } from "./testing/test-db";

// The preload already ran the seed once on the test database.
const { db } = testConnection();

async function counts(): Promise<Record<string, number>> {
  const tables = {
    stores,
    users,
    accounts,
    memberships,
    settings,
    paymentMethods,
    productCategories,
    expenseCategories,
  };
  const result: Record<string, number> = {};
  for (const [name, table] of Object.entries(tables)) {
    const [row] = await db.select({ n: count() }).from(table);
    result[name] = row?.n ?? 0;
  }
  return result;
}

const EXPECTED = {
  stores: 1,
  users: 1,
  accounts: 1,
  memberships: 1,
  settings: 6,
  paymentMethods: 4,
  productCategories: 5,
  expenseCategories: 6,
};

describe("seed", () => {
  test("creates exactly the rows of domain-model §9.10", async () => {
    expect(await counts()).toEqual(EXPECTED);
  });

  test("is idempotent: running it twice more adds nothing and keeps the same ids", async () => {
    const first = await seed(db, TEST_OWNER);
    const second = await seed(db, TEST_OWNER);

    expect(second).toEqual(first);
    expect(await counts()).toEqual(EXPECTED);
  });

  test("creates the store and an owner membership", async () => {
    const store = await db.query.stores.findFirst({ where: eq(stores.name, SEED_STORE.name) });
    const owner = await db.query.users.findFirst({ where: eq(users.email, TEST_OWNER.ownerEmail) });
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, owner?.id ?? ""),
    });

    expect(store?.timezone).toBe("America/Caracas");
    expect(membership).toMatchObject({ storeId: store?.id, role: "owner", isActive: true });
  });

  test("stores the owner password as a Better Auth credential hash", async () => {
    const owner = await db.query.users.findFirst({ where: eq(users.email, TEST_OWNER.ownerEmail) });
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.userId, owner?.id ?? ""),
    });

    expect(account?.providerId).toBe("credential");
    expect(account?.accountId).toBe(owner?.id);
    expect(account?.password).not.toBe(TEST_OWNER.ownerPassword);
    expect(
      await verifyPassword({ hash: account?.password ?? "", password: TEST_OWNER.ownerPassword }),
    ).toBe(true);
  });

  test("stores decimal settings as JSON strings, never floats", async () => {
    const rows = await db.select({ key: settings.key, value: settings.value }).from(settings);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    expect(byKey).toEqual({
      usd_rounding_step: "0.05",
      bs_rounding_step: "1",
      sale_rate_mode: "manual",
      sale_rate_markup_pct: "0",
      default_margin: "0.50",
      receiver_can_see_prices: false,
    });
  });

  test("loads payment methods, product and expense categories by code", async () => {
    const methods = await db
      .select({ code: paymentMethods.code, currency: paymentMethods.currency })
      .from(paymentMethods)
      .orderBy(paymentMethods.sortOrder);
    const productCodes = await db
      .select({ code: productCategories.code })
      .from(productCategories)
      .orderBy(productCategories.sortOrder);
    const expenseRows = await db
      .select({ code: expenseCategories.code, kind: expenseCategories.kind })
      .from(expenseCategories);

    expect(methods).toEqual([
      { code: "card_terminal", currency: "VES" },
      { code: "cash_bs", currency: "VES" },
      { code: "cash_usd", currency: "USD" },
      { code: "mobile_payment", currency: "VES" },
    ]);
    expect(productCodes.map((r) => r.code)).toEqual([
      "fruit",
      "vegetable",
      "greens",
      "tubers",
      "other",
    ]);
    expect(expenseRows.map((r) => r.code).sort()).toEqual([
      "bags",
      "bleach",
      "coffee",
      "drinking_water",
      "sugar",
      "unloading_labor",
    ]);
    expect(new Set(expenseRows.map((r) => r.kind))).toEqual(new Set(["variable"]));
  });

  test("uses UUID v7 primary keys", async () => {
    const owner = await db.query.users.findFirst({ where: eq(users.email, TEST_OWNER.ownerEmail) });

    expect(owner?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
