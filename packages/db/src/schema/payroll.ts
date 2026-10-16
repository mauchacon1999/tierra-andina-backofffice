import { relations, sql } from "drizzle-orm";
import { boolean, check, date, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id, money, rate, timestamps } from "./_shared";
import { users } from "./auth";
import { stores } from "./organization";

/** Shop employees. `user_id` links the ones who also use the app. */
export const employees = pgTable(
  "employees",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    name: text("name").notNull(),
    jobTitle: text("job_title"),
    weeklySalaryUsd: money("weekly_salary_usd").notNull(),
    userId: uuid("user_id").references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("employees_store_id_idx").on(t.storeId),
    index("employees_user_id_idx").on(t.userId),
    check("employees_weekly_salary_check", sql`${t.weeklySalaryUsd} >= 0`),
  ],
);

/** Saturday payment of a week. One per employee and week. */
export const payrollPayments = pgTable(
  "payroll_payments",
  {
    id: id(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    salaryUsd: money("salary_usd").notNull(),
    advancesUsd: money("advances_usd").notNull().default("0"),
    paidUsd: money("paid_usd").notNull(),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    note: text("note"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    // Prevents paying the same week twice; also serves lookups by employee_id.
    unique("payroll_payments_employee_id_week_start_key").on(t.employeeId, t.weekStart),
    check(
      "payroll_payments_amounts_check",
      sql`${t.salaryUsd} >= 0 AND ${t.advancesUsd} >= 0 AND ${t.paidUsd} >= 0`,
    ),
  ],
);

/** Advance paid during the week, settled by a later payroll payment. */
export const salaryAdvances = pgTable(
  "salary_advances",
  {
    id: id(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    amountUsd: money("amount_usd").notNull(),
    amountBs: money("amount_bs").notNull(),
    rate: rate("rate").notNull(),
    payrollPaymentId: uuid("payroll_payment_id").references(() => payrollPayments.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("salary_advances_employee_id_idx").on(t.employeeId),
    index("salary_advances_payroll_payment_id_idx").on(t.payrollPaymentId),
    check("salary_advances_amounts_check", sql`${t.amountUsd} >= 0 AND ${t.amountBs} >= 0`),
    check("salary_advances_rate_check", sql`${t.rate} > 0`),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const employeesRelations = relations(employees, ({ one, many }) => ({
  store: one(stores, { fields: [employees.storeId], references: [stores.id] }),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  payrollPayments: many(payrollPayments),
  salaryAdvances: many(salaryAdvances),
}));

export const payrollPaymentsRelations = relations(payrollPayments, ({ one, many }) => ({
  employee: one(employees, {
    fields: [payrollPayments.employeeId],
    references: [employees.id],
  }),
  advances: many(salaryAdvances),
}));

export const salaryAdvancesRelations = relations(salaryAdvances, ({ one }) => ({
  employee: one(employees, { fields: [salaryAdvances.employeeId], references: [employees.id] }),
  payrollPayment: one(payrollPayments, {
    fields: [salaryAdvances.payrollPaymentId],
    references: [payrollPayments.id],
  }),
}));

export const storesPayrollRelations = relations(stores, ({ many }) => ({
  employees: many(employees),
}));
