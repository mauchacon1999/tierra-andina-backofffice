import { type Executor, schema } from "@ta/db";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";

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

export type EntryRecord = typeof schema.customerCreditEntries.$inferSelect;
export type EntryInsert = typeof schema.customerCreditEntries.$inferInsert;

export type EntryTotalRow = {
  customerId: string;
  kind: "credit" | "payment";
  currency: "USD" | "VES";
  amount: string;
  lastOn: string;
};

/** Σ amount per customer, kind and currency of the store, with each group's last day. */
export async function findEntryTotals(db: Executor, storeId: string): Promise<EntryTotalRow[]> {
  const { customerCreditEntries } = schema;
  const rows = await db
    .select({
      customerId: customerCreditEntries.customerId,
      kind: customerCreditEntries.kind,
      currency: customerCreditEntries.currency,
      amount: sql<string>`sum(${customerCreditEntries.amount})`,
      lastOn: sql<string>`max(${customerCreditEntries.businessDate})`,
    })
    .from(customerCreditEntries)
    .innerJoin(customers, eq(customers.id, customerCreditEntries.customerId))
    .where(eq(customers.storeId, storeId))
    .groupBy(
      customerCreditEntries.customerId,
      customerCreditEntries.kind,
      customerCreditEntries.currency,
    );
  return rows;
}

export async function findCustomer(
  db: Executor,
  storeId: string,
  id: string,
): Promise<CustomerRecord | undefined> {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.storeId, storeId)))
    .limit(1);
  return row;
}

/** A customer's entries, newest day first. */
export async function findEntries(db: Executor, customerId: string): Promise<EntryRecord[]> {
  const { customerCreditEntries } = schema;
  return db
    .select()
    .from(customerCreditEntries)
    .where(eq(customerCreditEntries.customerId, customerId))
    .orderBy(desc(customerCreditEntries.businessDate), desc(customerCreditEntries.id));
}

export async function insertEntry(db: Executor, values: EntryInsert): Promise<EntryRecord> {
  const [row] = await db.insert(schema.customerCreditEntries).values(values).returning();
  if (!row) throw new Error("insert into customer_credit_entries returned no row");
  return row;
}

export async function findEntry(
  db: Executor,
  customerId: string,
  id: string,
): Promise<EntryRecord | undefined> {
  const { customerCreditEntries } = schema;
  const [row] = await db
    .select()
    .from(customerCreditEntries)
    .where(and(eq(customerCreditEntries.id, id), eq(customerCreditEntries.customerId, customerId)))
    .limit(1);
  return row;
}

export async function deleteEntryById(db: Executor, id: string): Promise<void> {
  await db.delete(schema.customerCreditEntries).where(eq(schema.customerCreditEntries.id, id));
}

export async function updateCustomerById(
  db: Executor,
  id: string,
  values: Partial<CustomerInsert>,
): Promise<CustomerRecord> {
  const [row] = await db.update(customers).set(values).where(eq(customers.id, id)).returning();
  if (!row) throw new Error(`customer ${id} vanished`);
  return row;
}

/** The store's active customers, by name, optionally matching `search` (no limit). */
export async function findAllCustomers(
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
    .orderBy(asc(customers.name));
}
