import { type Executor, schema } from "@ta/db";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";

const { customers } = schema;

export type CustomerRecord = typeof customers.$inferSelect;
export type CustomerInsert = typeof customers.$inferInsert;

const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`);

export async function findCustomers(
  db: Executor,
  storeId: string,
  search: string | undefined,
): Promise<CustomerRecord[]> {
  const conditions = [eq(customers.storeId, storeId), eq(customers.isActive, true)];
  if (search) conditions.push(ilike(customers.name, `%${escapeLike(search)}%`));
  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(asc(customers.name))
    .limit(30);
}

export async function findCustomersByIds(
  db: Executor,
  storeId: string,
  ids: readonly string[],
): Promise<CustomerRecord[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(customers)
    .where(and(eq(customers.storeId, storeId), inArray(customers.id, [...ids])));
}

export async function findCustomerByName(
  db: Executor,
  storeId: string,
  name: string,
): Promise<CustomerRecord | undefined> {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.storeId, storeId), sql`lower(${customers.name}) = lower(${name})`))
    .limit(1);
  return row;
}

export async function insertCustomer(
  db: Executor,
  values: CustomerInsert,
): Promise<CustomerRecord> {
  const [row] = await db.insert(customers).values(values).returning();
  if (!row) throw new Error("insert into customers returned no row");
  return row;
}
