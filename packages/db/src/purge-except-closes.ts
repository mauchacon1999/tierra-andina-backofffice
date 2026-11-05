import { count, inArray, isNotNull, isNull, notInArray, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import type { Executor } from "./client";
import {
  customerCreditEntries,
  customers,
  dailyClosePayments,
  dailyCloses,
  employees,
  exchangeRates,
  expenses,
  payableLines,
  payablePayments,
  payables,
  payrollPayments,
  priceListLines,
  priceLists,
  products,
  purchaseLines,
  purchaseTrips,
  recurringExpenses,
  salaryAdvances,
  shoppingListItems,
  supplierClaims,
  supplierPaymentAccounts,
  suppliers,
  tasks,
} from "./schema";

/*
 * One-off cleanup (owner, 2026-11-04): the only real data loaded so far are the daily closes, so
 * everything else operational goes. docs/database.md has the command.
 */

/** Tables that stay untouched: the closes, what they point to, access, setup and the log. */
export const KEPT_TABLES = [
  "daily_closes",
  "daily_close_payments",
  "payment_methods",
  "products",
  "product_categories",
  "employees",
  "payroll_payments",
  "salary_advances",
  "expense_categories",
  "stores",
  "memberships",
  "settings",
  "users",
  "sessions",
  "accounts",
  "verifications",
  "push_subscriptions",
  // Kept on purpose: it is the only trace left of what this cleanup removes.
  "audit_logs",
] as const;

type PurgeStep = { name: string; table: PgTable; where?: (db: Executor) => SQL };

const closeCustomerIds = (db: Executor) =>
  db
    .select({ id: customerCreditEntries.customerId })
    .from(customerCreditEntries)
    .where(isNotNull(customerCreditEntries.dailyCloseId));

/** What goes, children before parents so the foreign keys never complain. */
const PURGE_STEPS: readonly PurgeStep[] = [
  { name: "payable_payments", table: payablePayments },
  { name: "payable_lines", table: payableLines },
  { name: "payables", table: payables },
  { name: "supplier_claims", table: supplierClaims },
  { name: "shopping_list_items", table: shoppingListItems },
  { name: "price_list_lines", table: priceListLines },
  { name: "price_lists", table: priceLists },
  { name: "purchase_lines", table: purchaseLines },
  { name: "purchase_trips", table: purchaseTrips },
  { name: "supplier_payment_accounts", table: supplierPaymentAccounts },
  { name: "suppliers", table: suppliers },
  { name: "exchange_rates", table: exchangeRates },
  { name: "tasks", table: tasks },
  // Those written in a close stay with it.
  { name: "expenses", table: expenses, where: () => isNull(expenses.dailyCloseId) },
  {
    name: "customer_credit_entries",
    table: customerCreditEntries,
    where: () => isNull(customerCreditEntries.dailyCloseId),
  },
  { name: "recurring_expenses", table: recurringExpenses },
  // customer_id is NOT NULL, so NOT IN cannot be fooled by a NULL.
  {
    name: "customers",
    table: customers,
    where: (db) => notInArray(customers.id, closeCustomerIds(db)),
  },
];

/** The names of the tables this cleanup empties or thins out, in deletion order. */
export function purgedTableNames(): string[] {
  return PURGE_STEPS.map((step) => step.name);
}

export type TableCounts = Record<string, number>;

async function countRows(db: Executor, table: PgTable, where?: SQL): Promise<number> {
  const [row] = await db.select({ total: count() }).from(table).where(where);
  return row?.total ?? 0;
}

/** Rows the purge would delete per table. Only reads. */
export async function previewPurge(db: Executor): Promise<TableCounts> {
  const result: TableCounts = {};
  for (const step of PURGE_STEPS) {
    result[step.name] = await countRows(db, step.table, step.where?.(db));
  }
  return result;
}

/** Rows that must survive, per table: what the owner checks before and after. */
export async function countKeptData(db: Executor): Promise<TableCounts> {
  return {
    daily_closes: await countRows(db, dailyCloses),
    daily_close_payments: await countRows(db, dailyClosePayments),
    close_expenses: await countRows(db, expenses, isNotNull(expenses.dailyCloseId)),
    close_credit_entries: await countRows(
      db,
      customerCreditEntries,
      isNotNull(customerCreditEntries.dailyCloseId),
    ),
    customers_in_closes: await countRows(
      db,
      customers,
      inArray(customers.id, closeCustomerIds(db)),
    ),
    products: await countRows(db, products),
    employees: await countRows(db, employees),
    payroll_payments: await countRows(db, payrollPayments),
    salary_advances: await countRows(db, salaryAdvances),
  };
}

export class KeptDataChangedError extends Error {
  constructor(before: TableCounts, after: TableCounts) {
    super(`kept data changed: ${JSON.stringify({ before, after })}`);
    this.name = "KeptDataChangedError";
  }
}

/**
 * Deletes everything operational except the daily closes and what they need (`KEPT_TABLES`,
 * plus the expenses, credit entries and customers tied to a close). Run it inside a transaction:
 * it throws `KeptDataChangedError` if a kept count moved, so the caller's transaction rolls back.
 * @returns the rows deleted per table.
 * @throws {KeptDataChangedError} if the data that must survive changed.
 */
export async function purgeExceptCloses(tx: Executor): Promise<TableCounts> {
  const before = await countKeptData(tx);
  const deleted = await previewPurge(tx);
  // A close's expense may name a recurring expense that is about to go; the expense stays.
  await tx
    .update(expenses)
    .set({ recurringExpenseId: null })
    .where(isNotNull(expenses.recurringExpenseId));
  for (const step of PURGE_STEPS) {
    await tx.delete(step.table).where(step.where?.(tx));
  }
  const after = await countKeptData(tx);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new KeptDataChangedError(before, after);
  }
  return deleted;
}
