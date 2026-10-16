import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { cashDestination, currency, dailyCloseStatus } from "./_enums";
import { auditColumns, id, money, rate, timestamps } from "./_shared";
import { users } from "./auth";
import { stores } from "./organization";

/**
 * How the shop gets paid (card terminal, mobile payment, cash Bs, cash USD). Records, not
 * columns, so new methods need no migration. `code` is the stable key, `name` the Spanish label.
 */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    currency: currency("currency").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [unique("payment_methods_code_key").on(t.code)],
);

/**
 * One close per store and business day, submitted by the manager.
 * total_usd = Σ payments converted at `rate` + credit sold (computed in @ta/core).
 */
export const dailyCloses = pgTable(
  "daily_closes",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    rate: rate("rate").notNull(),
    totalUsd: money("total_usd").notNull(),
    creditSoldBs: money("credit_sold_bs").notNull().default("0"),
    cashDestination: cashDestination("cash_destination").notNull(),
    status: dailyCloseStatus("status").notNull().default("submitted"),
    note: text("note"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    // Also serves lookups by store_id (leading column).
    unique("daily_closes_store_id_business_date_key").on(t.storeId, t.businessDate),
    index("daily_closes_business_date_idx").on(t.businessDate),
    index("daily_closes_submitted_by_idx").on(t.submittedBy),
    check("daily_closes_rate_check", sql`${t.rate} > 0`),
    check("daily_closes_amounts_check", sql`${t.totalUsd} >= 0 AND ${t.creditSoldBs} >= 0`),
  ],
);

/** Amount collected per payment method in a close. `amount` is in the method's currency. */
export const dailyClosePayments = pgTable(
  "daily_close_payments",
  {
    id: id(),
    dailyCloseId: uuid("daily_close_id")
      .notNull()
      .references(() => dailyCloses.id),
    paymentMethodId: uuid("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id),
    amount: money("amount").notNull(),
    amountUsd: money("amount_usd").notNull(),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    // Also serves lookups by daily_close_id (leading column).
    unique("daily_close_payments_daily_close_id_payment_method_id_key").on(
      t.dailyCloseId,
      t.paymentMethodId,
    ),
    index("daily_close_payments_payment_method_id_idx").on(t.paymentMethodId),
    check("daily_close_payments_amounts_check", sql`${t.amount} >= 0 AND ${t.amountUsd} >= 0`),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
  dailyClosePayments: many(dailyClosePayments),
}));

export const dailyClosesRelations = relations(dailyCloses, ({ one, many }) => ({
  store: one(stores, { fields: [dailyCloses.storeId], references: [stores.id] }),
  submitter: one(users, { fields: [dailyCloses.submittedBy], references: [users.id] }),
  payments: many(dailyClosePayments),
}));

export const dailyClosePaymentsRelations = relations(dailyClosePayments, ({ one }) => ({
  dailyClose: one(dailyCloses, {
    fields: [dailyClosePayments.dailyCloseId],
    references: [dailyCloses.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [dailyClosePayments.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

export const storesDailyCloseRelations = relations(stores, ({ many }) => ({
  dailyCloses: many(dailyCloses),
}));
