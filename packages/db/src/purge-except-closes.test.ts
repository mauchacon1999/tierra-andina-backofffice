import { describe, expect, test } from "bun:test";

import { eq, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";

import {
  countKeptData,
  KEPT_TABLES,
  previewPurge,
  purgedTableNames,
  purgeExceptCloses,
} from "./purge-except-closes";
import * as schema from "./schema";
import { createBase, inRollback, valid, type Tx } from "./testing";

const {
  customerCreditEntries,
  customers,
  dailyClosePayments,
  dailyCloses,
  employees,
  exchangeRates,
  expenses,
  payables,
  payrollPayments,
  products,
  purchaseTrips,
  recurringExpenses,
  salaryAdvances,
  suppliers,
  tasks,
} = schema;

/** A store with a real close (payment, expense, fiado) and data that should go around it. */
async function scenario(tx: Tx) {
  const b = await createBase(tx);
  await tx.insert(dailyClosePayments).values(valid.dailyClosePayment(b));
  const [closeExpense] = await tx
    .insert(expenses)
    .values(
      valid.expense(b, {
        dailyCloseId: b.dailyClose.id,
        recurringExpenseId: b.recurringExpense.id,
      }),
    )
    .returning();
  const [looseExpense] = await tx.insert(expenses).values(valid.expense(b)).returning();
  const [closeCredit] = await tx
    .insert(customerCreditEntries)
    .values(valid.creditEntry(b, { dailyCloseId: b.dailyClose.id }))
    .returning();
  const [looseCredit] = await tx
    .insert(customerCreditEntries)
    .values(valid.creditEntry(b, { kind: "payment" }))
    .returning();
  const [strangerCustomer] = await tx
    .insert(customers)
    .values({ storeId: b.store.id, name: "Sin cierre" })
    .returning();
  await tx.insert(exchangeRates).values(valid.exchangeRate(b));
  await tx.insert(tasks).values({ storeId: b.store.id, title: "Limpiar", assigneeId: b.user.id });
  return { b, closeExpense, looseExpense, closeCredit, looseCredit, strangerCustomer };
}

describe("purgeExceptCloses", () => {
  test("every table of the schema is either kept or purged, never forgotten", () => {
    const names = (Object.values(schema) as unknown[])
      .filter((value): value is PgTable => is(value, PgTable))
      .map((table) => getTableConfig(table).name)
      .sort();

    expect([...KEPT_TABLES, ...purgedTableNames()].sort()).toEqual(names);
  });

  test("the closes, their payments, expenses and fiados stay; the rest goes", async () => {
    await inRollback(async (tx) => {
      const s = await scenario(tx);

      await purgeExceptCloses(tx);

      expect(
        await tx.select().from(dailyCloses).where(eq(dailyCloses.id, s.b.dailyClose.id)),
      ).toHaveLength(1);
      expect(
        await tx
          .select()
          .from(dailyClosePayments)
          .where(eq(dailyClosePayments.dailyCloseId, s.b.dailyClose.id)),
      ).toHaveLength(1);
      expect((await tx.select().from(expenses)).map((row) => row.id)).toEqual([s.closeExpense!.id]);
      expect((await tx.select().from(customerCreditEntries)).map((row) => row.id)).toEqual([
        s.closeCredit!.id,
      ]);
      expect((await tx.select().from(customers)).map((row) => row.id)).toEqual([s.b.customer.id]);
      expect(await tx.select().from(products).where(eq(products.id, s.b.product.id))).toHaveLength(
        1,
      );

      for (const table of [
        payables,
        purchaseTrips,
        suppliers,
        exchangeRates,
        tasks,
        recurringExpenses,
      ]) {
        expect(await tx.select().from(table)).toEqual([]);
      }
    });
  });

  test("employees stay with their payroll and advances", async () => {
    await inRollback(async (tx) => {
      const s = await scenario(tx);
      await tx.insert(salaryAdvances).values(valid.salaryAdvance(s.b));

      await purgeExceptCloses(tx);

      expect(
        await tx.select().from(employees).where(eq(employees.id, s.b.employee.id)),
      ).toHaveLength(1);
      expect(
        await tx
          .select()
          .from(payrollPayments)
          .where(eq(payrollPayments.employeeId, s.b.employee.id)),
      ).toHaveLength(1);
      expect(
        await tx
          .select()
          .from(salaryAdvances)
          .where(eq(salaryAdvances.employeeId, s.b.employee.id)),
      ).toHaveLength(1);
    });
  });

  test("an expense of a close survives losing its recurring expense", async () => {
    await inRollback(async (tx) => {
      const s = await scenario(tx);

      await purgeExceptCloses(tx);

      const [row] = await tx.select().from(expenses).where(eq(expenses.id, s.closeExpense!.id));
      expect(row?.recurringExpenseId).toBeNull();
    });
  });

  test("the preview deletes nothing and tells exactly what the purge deletes", async () => {
    await inRollback(async (tx) => {
      await scenario(tx);

      const preview = await previewPurge(tx);
      const again = await previewPurge(tx);
      expect(again).toEqual(preview);
      expect(preview.customers).toBeGreaterThanOrEqual(1);
      expect(preview.customer_credit_entries).toBeGreaterThanOrEqual(1);

      expect(await purgeExceptCloses(tx)).toEqual(preview);
      for (const total of Object.values(await previewPurge(tx))) expect(total).toBe(0);
    });
  });

  test("the counts of what stays do not move", async () => {
    await inRollback(async (tx) => {
      await scenario(tx);
      const before = await countKeptData(tx);

      await purgeExceptCloses(tx);

      expect(await countKeptData(tx)).toEqual(before);
      expect(before.daily_closes).toBeGreaterThanOrEqual(1);
      expect(before.close_expenses).toBeGreaterThanOrEqual(1);
    });
  });
});
