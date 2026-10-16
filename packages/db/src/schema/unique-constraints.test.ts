import { describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";

import {
  createBase,
  uniq,
  valid,
  validPayrollPayment,
  validProduct,
  type Base,
} from "../testing/fixtures";
import {
  expectOk,
  expectPgError,
  inRollback,
  PG_UNIQUE_VIOLATION,
  testConnection,
  type Tx,
} from "../testing/test-db";
import {
  dailyClosePayments,
  dailyCloses,
  exchangeRates,
  expenseCategories,
  memberships,
  payables,
  paymentMethods,
  payrollPayments,
  priceListLines,
  productCategories,
  products,
  pushSubscriptions,
  sessions,
  settings,
  supplierClaims,
  users,
} from ".";

type Write = (tx: Tx, b: Base) => Promise<unknown>;
type UniqueCase = { constraint: string; label: string; first: Write; duplicate: Write };

/** Inserts `first`, then `duplicate` must hit `constraint`. One or more cases per constraint. */
const CASES: UniqueCase[] = [
  {
    constraint: "users_email_unique",
    label: "same email",
    first: (tx) => tx.insert(users).values({ name: "A", email: "dup@test.local" }),
    duplicate: (tx) => tx.insert(users).values({ name: "B", email: "dup@test.local" }),
  },
  {
    constraint: "sessions_token_unique",
    label: "same token",
    first: (tx, b) =>
      tx.insert(sessions).values({ userId: b.user.id, token: "tok", expiresAt: new Date() }),
    duplicate: (tx, b) =>
      tx.insert(sessions).values({ userId: b.user.id, token: "tok", expiresAt: new Date() }),
  },
  {
    constraint: "memberships_user_id_store_id_key",
    label: "second role for the same user and store",
    first: (tx, b) =>
      tx.insert(memberships).values({ userId: b.user.id, storeId: b.store.id, role: "manager" }),
    duplicate: (tx, b) =>
      tx.insert(memberships).values({ userId: b.user.id, storeId: b.store.id, role: "receiver" }),
  },
  {
    constraint: "settings_store_id_key_key",
    label: "same key twice in a store",
    first: (tx, b) =>
      tx.insert(settings).values({ storeId: b.store.id, key: "default_margin", value: "0.50" }),
    duplicate: (tx, b) =>
      tx.insert(settings).values({ storeId: b.store.id, key: "default_margin", value: "0.60" }),
  },
  {
    constraint: "push_subscriptions_endpoint_key",
    label: "same browser endpoint",
    first: (tx, b) =>
      tx
        .insert(pushSubscriptions)
        .values({ userId: b.user.id, endpoint: "https://push/1", keys: {} }),
    duplicate: (tx, b) =>
      tx
        .insert(pushSubscriptions)
        .values({ userId: b.user.id, endpoint: "https://push/1", keys: {} }),
  },
  {
    constraint: "product_categories_code_key",
    label: "seeded code 'other' again",
    first: async () => undefined,
    duplicate: (tx) => tx.insert(productCategories).values({ code: "other", name: "Otros 2" }),
  },
  {
    constraint: "products_normalized_name_key",
    label: "same normalized name ('Cebollín' vs 'cebollin')",
    first: (tx, b) =>
      tx
        .insert(products)
        .values(validProduct(b.category.id, { name: "Cebollín", normalizedName: "cebollin" })),
    duplicate: (tx, b) =>
      tx
        .insert(products)
        .values(validProduct(b.category.id, { name: "cebollin", normalizedName: "cebollin" })),
  },
  {
    constraint: "exchange_rates_store_id_business_date_kind_key",
    label: "two global BCV rates for the same day (NULLS NOT DISTINCT)",
    first: (tx, b) =>
      tx.insert(exchangeRates).values(valid.exchangeRate(b, { storeId: null, kind: "bcv" })),
    duplicate: (tx, b) =>
      tx
        .insert(exchangeRates)
        .values(valid.exchangeRate(b, { storeId: null, kind: "bcv", value: "201" })),
  },
  {
    constraint: "exchange_rates_store_id_business_date_kind_key",
    label: "two sale rates for the same store and day",
    first: (tx, b) => tx.insert(exchangeRates).values(valid.exchangeRate(b)),
    duplicate: (tx, b) => tx.insert(exchangeRates).values(valid.exchangeRate(b, { value: "215" })),
  },
  {
    constraint: "supplier_claims_purchase_line_id_key",
    label: "second claim for a purchase line",
    first: (tx, b) => tx.insert(supplierClaims).values(valid.supplierClaim(b)),
    duplicate: (tx, b) => tx.insert(supplierClaims).values(valid.supplierClaim(b)),
  },
  {
    constraint: "price_list_lines_price_list_id_product_id_key",
    label: "same product twice in a price list",
    first: (tx, b) => tx.insert(priceListLines).values(valid.priceListLine(b)),
    duplicate: (tx, b) =>
      tx.insert(priceListLines).values(valid.priceListLine(b, { priceUsd: "1.50" })),
  },
  {
    constraint: "payment_methods_code_key",
    label: "seeded code 'cash_usd' again",
    first: async () => undefined,
    duplicate: (tx) =>
      tx.insert(paymentMethods).values({ code: "cash_usd", name: "Dólares", currency: "USD" }),
  },
  {
    constraint: "daily_closes_store_id_business_date_key",
    label: "second close for the same store and day",
    first: async () => undefined, // the base already has a close on 2026-10-12
    duplicate: (tx, b) =>
      tx.insert(dailyCloses).values(valid.dailyClose(b, { businessDate: "2026-10-12" })),
  },
  {
    constraint: "daily_close_payments_daily_close_id_payment_method_id_key",
    label: "same payment method twice in a close",
    first: (tx, b) => tx.insert(dailyClosePayments).values(valid.dailyClosePayment(b)),
    duplicate: (tx, b) =>
      tx.insert(dailyClosePayments).values(valid.dailyClosePayment(b, { amount: "1" })),
  },
  {
    constraint: "payables_purchase_line_id_key",
    label: "second payable for a purchase line",
    first: (tx, b) => tx.insert(payables).values(valid.payable(b, { purchaseLineId: b.line.id })),
    duplicate: (tx, b) =>
      tx.insert(payables).values(valid.payable(b, { purchaseLineId: b.line.id })),
  },
  {
    constraint: "expense_categories_code_key",
    label: "seeded code 'bags' again",
    first: async () => undefined,
    duplicate: (tx) =>
      tx.insert(expenseCategories).values({ code: "bags", name: "Bolsas 2", kind: "variable" }),
  },
  {
    constraint: "payroll_payments_employee_id_week_start_key",
    label: "paying the same week twice",
    first: async () => undefined, // the base already paid the week of 2026-10-12
    duplicate: (tx, b) => tx.insert(payrollPayments).values(validPayrollPayment(b.employee.id)),
  },
];

describe("UNIQUE constraints", () => {
  test("every UNIQUE constraint in the database has a test case", async () => {
    const rows = await testConnection().db.execute<{ conname: string }>(
      sql`SELECT conname FROM pg_constraint
          WHERE contype = 'u' AND connamespace = 'public'::regnamespace ORDER BY conname`,
    );
    const inDatabase = rows.map((r) => r.conname);
    const tested = [...new Set(CASES.map((c) => c.constraint))].sort();

    expect(inDatabase.length).toBeGreaterThan(0);
    expect(tested).toEqual(inDatabase);
  });

  for (const { constraint, label, first, duplicate } of CASES) {
    test(`${constraint} rejects: ${label}`, async () => {
      await inRollback(async (tx) => {
        const base = await createBase(tx);
        await expectOk(tx, (sp) => first(sp, base));
        await expectPgError(tx, (sp) => duplicate(sp, base), {
          code: PG_UNIQUE_VIOLATION,
          constraint,
        });
      });
    });
  }

  test("different stores or days do not collide", async () => {
    await inRollback(async (tx) => {
      const base = await createBase(tx);
      await expectOk(tx, (sp) => sp.insert(exchangeRates).values(valid.exchangeRate(base)));
      await expectOk(tx, (sp) =>
        sp.insert(exchangeRates).values(valid.exchangeRate(base, { businessDate: "2026-10-13" })),
      );
      await expectOk(tx, (sp) =>
        sp.insert(productCategories).values({ code: uniq("other"), name: "Otros" }),
      );
    });
  });
});
