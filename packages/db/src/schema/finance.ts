import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  creditEntryKind,
  currency,
  expenseKind,
  payablePaymentMethod,
  payableUnit,
  recurrenceFrequency,
} from "./_enums";
import { auditColumns, id, money, quantity, rate, timestamps } from "./_shared";
import { users } from "./auth";
import { supplierPaymentAccounts, suppliers } from "./catalog";
import { dailyCloses } from "./daily-close";
import { stores } from "./organization";
import { purchaseLines, purchaseTrips } from "./purchasing";

// Receivables (customer credit) --------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    name: text("name").notNull(),
    phone: text("phone"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [index("customers_store_id_idx").on(t.storeId)],
);

/**
 * Sold on credit (`credit`) or paid back (`payment`), in the currency it happened in (no rate,
 * like the daily close). Balance per currency = Σ credits − Σ payments.
 */
export const customerCreditEntries = pgTable(
  "customer_credit_entries",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    kind: creditEntryKind("kind").notNull(),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    amount: money("amount").notNull(),
    currency: currency("currency").notNull(),
    dailyCloseId: uuid("daily_close_id").references(() => dailyCloses.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("customer_credit_entries_customer_id_idx").on(t.customerId),
    index("customer_credit_entries_business_date_idx").on(t.businessDate),
    index("customer_credit_entries_daily_close_id_idx").on(t.dailyCloseId),
    check("customer_credit_entries_amount_check", sql`${t.amount} > 0`),
  ],
);

// Payables ---------------------------------------------------------------------------------------

/**
 * A supplier invoice on credit (docs/modules/payables.md). In USD or Bs as agreed with the
 * supplier: lines, total and balance are in `currency`. `number` is sequential per store and
 * shown as CXP-000123. The status (pending, partial, paid, overdue, voided) is derived from the
 * total, the payments, `due_on` and `voided_at` (@ta/core `payableStatus`).
 */
export const payables = pgTable(
  "payables",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    number: integer("number").notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    currency: currency("currency").notNull().default("USD"),
    total: money("total").notNull(),
    issuedOn: date("issued_on", { mode: "string" }).notNull(),
    /** Required on a manual invoice; one created when a Coche trip closes gets it later. */
    dueOn: date("due_on", { mode: "string" }),
    /** The trip or local purchase it came from (its lines on credit from this supplier). */
    tripId: uuid("trip_id").references(() => purchaseTrips.id),
    note: text("note"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: uuid("voided_by").references(() => users.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("payables_store_id_idx").on(t.storeId),
    index("payables_supplier_id_idx").on(t.supplierId),
    index("payables_trip_id_idx").on(t.tripId),
    index("payables_voided_by_idx").on(t.voidedBy),
    unique("payables_store_id_number_key").on(t.storeId, t.number),
    // A trip's credit lines from one supplier are grouped in one invoice.
    unique("payables_trip_id_supplier_id_key").on(t.tripId, t.supplierId),
    check("payables_number_check", sql`${t.number} > 0`),
    check("payables_amount_check", sql`${t.total} >= 0`),
    check("payables_due_on_check", sql`${t.dueOn} IS NULL OR ${t.dueOn} >= ${t.issuedOn}`),
    check("payables_voided_check", sql`${t.voidedBy} IS NULL OR ${t.voidedAt} IS NOT NULL`),
  ],
);

/**
 * One line of an invoice: merchandise (a purchase line, priced by the purchase form; subtotal =
 * its total in the invoice's currency) or a supply typed in the manual form (description,
 * expense category, quantity, unit, unit price; subtotal = quantity × unit price).
 */
export const payableLines = pgTable(
  "payable_lines",
  {
    id: id(),
    payableId: uuid("payable_id")
      .notNull()
      .references(() => payables.id),
    purchaseLineId: uuid("purchase_line_id").references(() => purchaseLines.id),
    description: text("description"),
    expenseCategoryId: uuid("expense_category_id").references(() => expenseCategories.id),
    quantity: quantity("quantity"),
    unit: payableUnit("unit"),
    unitPrice: money("unit_price"),
    subtotal: money("subtotal").notNull(),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("payable_lines_payable_id_idx").on(t.payableId),
    index("payable_lines_expense_category_id_idx").on(t.expenseCategoryId),
    // A purchase line is owed once (domain-model §9.8).
    unique("payable_lines_purchase_line_id_key").on(t.purchaseLineId),
    check(
      "payable_lines_item_check",
      sql`(${t.purchaseLineId} IS NOT NULL AND ${t.description} IS NULL
          AND ${t.expenseCategoryId} IS NULL AND ${t.quantity} IS NULL AND ${t.unit} IS NULL
          AND ${t.unitPrice} IS NULL)
        OR (${t.purchaseLineId} IS NULL AND ${t.description} IS NOT NULL
          AND length(trim(${t.description})) > 0 AND ${t.expenseCategoryId} IS NOT NULL
          AND ${t.quantity} IS NOT NULL AND ${t.unit} IS NOT NULL AND ${t.unitPrice} IS NOT NULL)`,
    ),
    check(
      "payable_lines_amounts_check",
      sql`${t.subtotal} >= 0 AND (${t.quantity} IS NULL OR ${t.quantity} > 0)
        AND (${t.unitPrice} IS NULL OR ${t.unitPrice} >= 0)`,
    ),
  ],
);

/**
 * A payment to an invoice, in the currency of its method, at the payment day's rate (BCV).
 * Keeps USD, Bs and the rate (CLAUDE.md §7), and `applied`: what it took off the balance, in
 * the invoice's currency (@ta/core `settlePayment`).
 */
export const payablePayments = pgTable(
  "payable_payments",
  {
    id: id(),
    payableId: uuid("payable_id")
      .notNull()
      .references(() => payables.id),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    method: payablePaymentMethod("method").notNull(),
    currency: currency("currency").notNull(),
    amountUsd: money("amount_usd").notNull(),
    amountBs: money("amount_bs").notNull(),
    rate: rate("rate").notNull(),
    applied: money("applied").notNull(),
    /** Pago móvil or transfer reference. */
    reference: text("reference"),
    accountId: uuid("account_id").references(() => supplierPaymentAccounts.id),
    note: text("note"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("payable_payments_payable_id_idx").on(t.payableId),
    index("payable_payments_account_id_idx").on(t.accountId),
    check("payable_payments_amounts_check", sql`${t.amountUsd} >= 0 AND ${t.amountBs} >= 0`),
    check("payable_payments_rate_check", sql`${t.rate} > 0`),
    check("payable_payments_applied_check", sql`${t.applied} > 0`),
  ],
);

// Expenses ---------------------------------------------------------------------------------------

/** Expense groups. `code` is the stable key, `name` the Spanish label; editable by the owner. */
export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: expenseKind("kind").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [unique("expense_categories_code_key").on(t.code)],
);

/** Template for a fixed expense (rent, services…). Denominated in USD. */
export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    amountUsd: money("amount_usd").notNull(),
    frequency: recurrenceFrequency("frequency").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("recurring_expenses_store_id_idx").on(t.storeId),
    index("recurring_expenses_category_id_idx").on(t.categoryId),
    check("recurring_expenses_amount_check", sql`${t.amountUsd} >= 0`),
  ],
);

/** An expense actually paid. */
export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    /** Optional: expenses written in a daily close only have a concept. */
    categoryId: uuid("category_id").references(() => expenseCategories.id),
    concept: text("concept").notNull(),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    /** In the currency it was paid in (no rate, like the daily close). */
    amount: money("amount").notNull(),
    currency: currency("currency").notNull(),
    /** Set when the manager wrote it in that day's close. */
    dailyCloseId: uuid("daily_close_id").references(() => dailyCloses.id),
    recurringExpenseId: uuid("recurring_expense_id").references(() => recurringExpenses.id),
    note: text("note"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("expenses_store_id_idx").on(t.storeId),
    index("expenses_category_id_idx").on(t.categoryId),
    index("expenses_business_date_idx").on(t.businessDate),
    index("expenses_daily_close_id_idx").on(t.dailyCloseId),
    index("expenses_recurring_expense_id_idx").on(t.recurringExpenseId),
    check("expenses_amount_check", sql`${t.amount} > 0`),
    check("expenses_concept_check", sql`length(trim(${t.concept})) > 0`),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const customersRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, { fields: [customers.storeId], references: [stores.id] }),
  creditEntries: many(customerCreditEntries),
}));

export const customerCreditEntriesRelations = relations(customerCreditEntries, ({ one }) => ({
  customer: one(customers, {
    fields: [customerCreditEntries.customerId],
    references: [customers.id],
  }),
  dailyClose: one(dailyCloses, {
    fields: [customerCreditEntries.dailyCloseId],
    references: [dailyCloses.id],
  }),
}));

export const payablesRelations = relations(payables, ({ one, many }) => ({
  store: one(stores, { fields: [payables.storeId], references: [stores.id] }),
  supplier: one(suppliers, { fields: [payables.supplierId], references: [suppliers.id] }),
  trip: one(purchaseTrips, { fields: [payables.tripId], references: [purchaseTrips.id] }),
  lines: many(payableLines),
  payments: many(payablePayments),
}));

export const payableLinesRelations = relations(payableLines, ({ one }) => ({
  payable: one(payables, { fields: [payableLines.payableId], references: [payables.id] }),
  purchaseLine: one(purchaseLines, {
    fields: [payableLines.purchaseLineId],
    references: [purchaseLines.id],
  }),
  expenseCategory: one(expenseCategories, {
    fields: [payableLines.expenseCategoryId],
    references: [expenseCategories.id],
  }),
}));

export const payablePaymentsRelations = relations(payablePayments, ({ one }) => ({
  payable: one(payables, { fields: [payablePayments.payableId], references: [payables.id] }),
  account: one(supplierPaymentAccounts, {
    fields: [payablePayments.accountId],
    references: [supplierPaymentAccounts.id],
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  recurringExpenses: many(recurringExpenses),
  expenses: many(expenses),
  payableLines: many(payableLines),
}));

export const recurringExpensesRelations = relations(recurringExpenses, ({ one, many }) => ({
  store: one(stores, { fields: [recurringExpenses.storeId], references: [stores.id] }),
  category: one(expenseCategories, {
    fields: [recurringExpenses.categoryId],
    references: [expenseCategories.id],
  }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  store: one(stores, { fields: [expenses.storeId], references: [stores.id] }),
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  recurringExpense: one(recurringExpenses, {
    fields: [expenses.recurringExpenseId],
    references: [recurringExpenses.id],
  }),
}));

export const dailyClosesFinanceRelations = relations(dailyCloses, ({ many }) => ({
  creditEntries: many(customerCreditEntries),
}));

export const suppliersFinanceRelations = relations(suppliers, ({ many }) => ({
  payables: many(payables),
}));

export const purchaseLinesFinanceRelations = relations(purchaseLines, ({ one }) => ({
  payableLine: one(payableLines),
}));

export const storesFinanceRelations = relations(stores, ({ many }) => ({
  customers: many(customers),
  payables: many(payables),
  recurringExpenses: many(recurringExpenses),
  expenses: many(expenses),
}));
