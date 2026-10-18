import { type Executor, schema } from "@ta/db";
import { and, asc, count, desc, eq, getTableColumns, gte, inArray, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const {
  dailyCloses,
  dailyClosePayments,
  paymentMethods,
  customerCreditEntries,
  customers,
  expenses,
  users,
} = schema;

export type CloseRecord = typeof dailyCloses.$inferSelect;
export type CloseInsert = typeof dailyCloses.$inferInsert;
export type CloseRow = CloseRecord & { submitterName: string; approverName: string | null };

export type PaymentRow = typeof dailyClosePayments.$inferSelect & {
  code: string;
  name: string;
  currency: (typeof paymentMethods.$inferSelect)["currency"];
  sortOrder: number;
};
export type PaymentInsert = typeof dailyClosePayments.$inferInsert;
export type CreditRow = typeof customerCreditEntries.$inferSelect & { customerName: string };
export type CreditInsert = typeof customerCreditEntries.$inferInsert;
export type ExpenseRecord = typeof expenses.$inferSelect;
export type ExpenseInsert = typeof expenses.$inferInsert;

const submitter = alias(users, "submitter");
const approver = alias(users, "approver");

const closeWithNames = {
  ...getTableColumns(dailyCloses),
  submitterName: submitter.name,
  approverName: approver.name,
};

function selectCloses(db: Executor) {
  return db
    .select(closeWithNames)
    .from(dailyCloses)
    .innerJoin(submitter, eq(submitter.id, dailyCloses.submittedBy))
    .leftJoin(approver, eq(approver.id, dailyCloses.approvedBy));
}

export async function findCloseByDate(
  db: Executor,
  storeId: string,
  businessDate: string,
): Promise<CloseRow | undefined> {
  const [row] = await selectCloses(db)
    .where(and(eq(dailyCloses.storeId, storeId), eq(dailyCloses.businessDate, businessDate)))
    .limit(1);
  return row;
}

export async function findCloseById(
  db: Executor,
  storeId: string,
  id: string,
): Promise<CloseRow | undefined> {
  const [row] = await selectCloses(db)
    .where(and(eq(dailyCloses.storeId, storeId), eq(dailyCloses.id, id)))
    .limit(1);
  return row;
}

/** Closes between two business days (inclusive), newest first. */
export async function findClosesInRange(
  db: Executor,
  storeId: string,
  from: string,
  to: string,
): Promise<CloseRow[]> {
  return selectCloses(db)
    .where(
      and(
        eq(dailyCloses.storeId, storeId),
        gte(dailyCloses.businessDate, from),
        lte(dailyCloses.businessDate, to),
      ),
    )
    .orderBy(desc(dailyCloses.businessDate));
}

export async function countSubmittedCloses(db: Executor, storeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(dailyCloses)
    .where(and(eq(dailyCloses.storeId, storeId), eq(dailyCloses.status, "submitted")));
  return row?.total ?? 0;
}

export async function findPayments(
  db: Executor,
  closeIds: readonly string[],
): Promise<PaymentRow[]> {
  if (closeIds.length === 0) return [];
  return db
    .select({
      ...getTableColumns(dailyClosePayments),
      code: paymentMethods.code,
      name: paymentMethods.name,
      currency: paymentMethods.currency,
      sortOrder: paymentMethods.sortOrder,
    })
    .from(dailyClosePayments)
    .innerJoin(paymentMethods, eq(paymentMethods.id, dailyClosePayments.paymentMethodId))
    .where(inArray(dailyClosePayments.dailyCloseId, [...closeIds]))
    .orderBy(asc(paymentMethods.sortOrder));
}

export async function findCredits(db: Executor, closeIds: readonly string[]): Promise<CreditRow[]> {
  if (closeIds.length === 0) return [];
  return db
    .select({ ...getTableColumns(customerCreditEntries), customerName: customers.name })
    .from(customerCreditEntries)
    .innerJoin(customers, eq(customers.id, customerCreditEntries.customerId))
    .where(inArray(customerCreditEntries.dailyCloseId, [...closeIds]))
    .orderBy(asc(customerCreditEntries.createdAt), asc(customerCreditEntries.id));
}

export async function findExpenses(
  db: Executor,
  closeIds: readonly string[],
): Promise<ExpenseRecord[]> {
  if (closeIds.length === 0) return [];
  return db
    .select()
    .from(expenses)
    .where(inArray(expenses.dailyCloseId, [...closeIds]))
    .orderBy(asc(expenses.createdAt), asc(expenses.id));
}

export async function insertClose(db: Executor, values: CloseInsert): Promise<CloseRecord> {
  const [row] = await db.insert(dailyCloses).values(values).returning();
  if (!row) throw new Error("insert into daily_closes returned no row");
  return row;
}

export async function updateCloseById(
  db: Executor,
  id: string,
  values: Partial<CloseInsert>,
): Promise<CloseRecord> {
  const [row] = await db.update(dailyCloses).set(values).where(eq(dailyCloses.id, id)).returning();
  if (!row) throw new Error(`update of daily close ${id} returned no row`);
  return row;
}

export async function insertPayments(db: Executor, rows: PaymentInsert[]): Promise<void> {
  if (rows.length > 0) await db.insert(dailyClosePayments).values(rows);
}

export async function insertCredits(db: Executor, rows: CreditInsert[]): Promise<void> {
  if (rows.length > 0) await db.insert(customerCreditEntries).values(rows);
}

export async function insertExpenses(db: Executor, rows: ExpenseInsert[]): Promise<void> {
  if (rows.length > 0) await db.insert(expenses).values(rows);
}

export async function deleteCloseById(db: Executor, id: string): Promise<void> {
  await db.delete(dailyCloses).where(eq(dailyCloses.id, id));
}

/** Removes the contents of a close before writing the corrected ones, or before deleting it. */
export async function deleteCloseContents(db: Executor, closeId: string): Promise<void> {
  await db.delete(dailyClosePayments).where(eq(dailyClosePayments.dailyCloseId, closeId));
  await db.delete(customerCreditEntries).where(eq(customerCreditEntries.dailyCloseId, closeId));
  await db.delete(expenses).where(eq(expenses.dailyCloseId, closeId));
}
