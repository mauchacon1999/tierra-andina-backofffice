import { relations, sql } from "drizzle-orm";
import { boolean, check, date, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  creditEntryKind,
  currency,
  expenseKind,
  payableStatus,
  recurrenceFrequency,
} from "./_enums";
import { auditColumns, id, money, rate, timestamps } from "./_shared";
import { suppliers } from "./catalog";
import { dailyCloses, paymentMethods } from "./daily-close";
import { stores } from "./organization";
import { purchaseLines } from "./purchasing";

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
 * Money owed to a supplier (a purchase line on credit, bread, bags, bananas). Denominated in
 * USD; each payment records USD, Bs and the rate used.
 */
export const payables = pgTable(
  "payables",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    /** Nullable like purchase_lines.supplier_id: an unregistered stall is described in `concept`. */
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    concept: text("concept").notNull(),
    amountUsd: money("amount_usd").notNull(),
    issuedOn: date("issued_on", { mode: "string" }).notNull(),
    dueOn: date("due_on", { mode: "string" }),
    purchaseLineId: uuid("purchase_line_id").references(() => purchaseLines.id),
    status: payableStatus("status").notNull().default("open"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("payables_store_id_idx").on(t.storeId),
    index("payables_supplier_id_idx").on(t.supplierId),
    // A purchase line creates at most one payable (domain-model §9.8).
    unique("payables_purchase_line_id_key").on(t.purchaseLineId),
    check("payables_amount_check", sql`${t.amountUsd} >= 0`),
    check("payables_due_on_check", sql`${t.dueOn} IS NULL OR ${t.dueOn} >= ${t.issuedOn}`),
  ],
);

export const payablePayments = pgTable(
  "payable_payments",
  {
    id: id(),
    payableId: uuid("payable_id")
      .notNull()
      .references(() => payables.id),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    amountUsd: money("amount_usd").notNull(),
    amountBs: money("amount_bs").notNull(),
    rate: rate("rate").notNull(),
    paymentMethodId: uuid("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("payable_payments_payable_id_idx").on(t.payableId),
    index("payable_payments_payment_method_id_idx").on(t.paymentMethodId),
    check("payable_payments_amounts_check", sql`${t.amountUsd} >= 0 AND ${t.amountBs} >= 0`),
    check("payable_payments_rate_check", sql`${t.rate} > 0`),
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
  purchaseLine: one(purchaseLines, {
    fields: [payables.purchaseLineId],
    references: [purchaseLines.id],
  }),
  payments: many(payablePayments),
}));

export const payablePaymentsRelations = relations(payablePayments, ({ one }) => ({
  payable: one(payables, { fields: [payablePayments.payableId], references: [payables.id] }),
  paymentMethod: one(paymentMethods, {
    fields: [payablePayments.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  recurringExpenses: many(recurringExpenses),
  expenses: many(expenses),
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
  payable: one(payables),
}));

export const storesFinanceRelations = relations(stores, ({ many }) => ({
  customers: many(customers),
  payables: many(payables),
  recurringExpenses: many(recurringExpenses),
  expenses: many(expenses),
}));
