import { type Executor, schema } from "@ta/db";
import { and, asc, desc, eq } from "drizzle-orm";

const { supplierPaymentAccounts, suppliers } = schema;

export type SupplierRecord = typeof suppliers.$inferSelect;
export type SupplierInsert = typeof suppliers.$inferInsert;
export type AccountRecord = typeof supplierPaymentAccounts.$inferSelect;
export type AccountInsert = typeof supplierPaymentAccounts.$inferInsert;

export async function findActiveSuppliers(db: Executor): Promise<SupplierRecord[]> {
  return db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(asc(suppliers.name));
}

export async function findSupplierById(
  db: Executor,
  id: string,
): Promise<SupplierRecord | undefined> {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return row;
}

export async function insertSupplier(
  db: Executor,
  values: SupplierInsert,
): Promise<SupplierRecord> {
  const [row] = await db.insert(suppliers).values(values).returning();
  if (!row) throw new Error("insert into suppliers returned no row");
  return row;
}

export async function updateSupplierById(
  db: Executor,
  id: string,
  values: Partial<SupplierInsert>,
): Promise<SupplierRecord> {
  const [row] = await db.update(suppliers).set(values).where(eq(suppliers.id, id)).returning();
  if (!row) throw new Error(`supplier ${id} vanished`);
  return row;
}

/** Active accounts first, then the oldest first. */
export async function findAccounts(db: Executor, supplierId: string): Promise<AccountRecord[]> {
  return db
    .select()
    .from(supplierPaymentAccounts)
    .where(eq(supplierPaymentAccounts.supplierId, supplierId))
    .orderBy(desc(supplierPaymentAccounts.isActive), asc(supplierPaymentAccounts.createdAt));
}

export async function findAccount(
  db: Executor,
  supplierId: string,
  id: string,
): Promise<AccountRecord | undefined> {
  const [row] = await db
    .select()
    .from(supplierPaymentAccounts)
    .where(
      and(eq(supplierPaymentAccounts.id, id), eq(supplierPaymentAccounts.supplierId, supplierId)),
    )
    .limit(1);
  return row;
}

export async function insertAccount(db: Executor, values: AccountInsert): Promise<AccountRecord> {
  const [row] = await db.insert(supplierPaymentAccounts).values(values).returning();
  if (!row) throw new Error("insert into supplier_payment_accounts returned no row");
  return row;
}

export async function updateAccountById(
  db: Executor,
  id: string,
  values: Partial<AccountInsert>,
): Promise<AccountRecord> {
  const [row] = await db
    .update(supplierPaymentAccounts)
    .set(values)
    .where(eq(supplierPaymentAccounts.id, id))
    .returning();
  if (!row) throw new Error(`account ${id} vanished`);
  return row;
}
