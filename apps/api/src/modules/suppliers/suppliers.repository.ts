import { type Executor, schema } from "@ta/db";
import { asc, eq } from "drizzle-orm";

const { suppliers } = schema;

export type SupplierRecord = typeof suppliers.$inferSelect;
export type SupplierInsert = typeof suppliers.$inferInsert;

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
