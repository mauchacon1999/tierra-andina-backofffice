import { type Executor, schema } from "@ta/db";
import { and, asc, desc, eq, inArray, max, sql, sum } from "drizzle-orm";

const {
  expenseCategories,
  payableLines,
  payablePayments,
  payables,
  products,
  purchaseLines,
  stores,
  suppliers,
} = schema;

export type PayableRecord = typeof payables.$inferSelect;
export type PayableInsert = typeof payables.$inferInsert;
export type PayableLineInsert = typeof payableLines.$inferInsert;
export type PaymentRecord = typeof payablePayments.$inferSelect;
export type PaymentInsert = typeof payablePayments.$inferInsert;

export type PayableRow = PayableRecord & { supplierName: string };

/**
 * Locks the store row until the transaction ends, so two invoices created at the same time
 * cannot take the same number.
 */
export async function lockStore(tx: Executor, storeId: string): Promise<void> {
  await tx.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).for("update");
}

/** The next invoice number of the store (1 for the first). Call after `lockStore`. */
export async function nextPayableNumber(tx: Executor, storeId: string): Promise<number> {
  const [row] = await tx
    .select({ last: max(payables.number) })
    .from(payables)
    .where(eq(payables.storeId, storeId));
  return (row?.last ?? 0) + 1;
}

export async function insertPayable(db: Executor, values: PayableInsert): Promise<PayableRecord> {
  const [row] = await db.insert(payables).values(values).returning();
  if (!row) throw new Error("insert into payables returned no row");
  return row;
}

export async function updatePayableById(
  db: Executor,
  id: string,
  values: Partial<PayableInsert>,
): Promise<PayableRecord> {
  const [row] = await db.update(payables).set(values).where(eq(payables.id, id)).returning();
  if (!row) throw new Error(`payable ${id} vanished`);
  return row;
}

/** One invoice of the store with its supplier's name; `forUpdate` locks it (payments). */
export async function findPayable(
  db: Executor,
  storeId: string,
  id: string,
  { forUpdate = false }: { forUpdate?: boolean } = {},
): Promise<PayableRow | undefined> {
  const query = db
    .select({ payable: payables, supplierName: suppliers.name })
    .from(payables)
    .innerJoin(suppliers, eq(suppliers.id, payables.supplierId))
    .where(and(eq(payables.id, id), eq(payables.storeId, storeId)))
    .limit(1);
  const [row] = forUpdate ? await query.for("update", { of: payables }) : await query;
  return row ? { ...row.payable, supplierName: row.supplierName } : undefined;
}

/** Every invoice of the store (optionally one supplier's), newest first. */
export async function findStorePayables(
  db: Executor,
  storeId: string,
  supplierId?: string,
): Promise<PayableRow[]> {
  const rows = await db
    .select({ payable: payables, supplierName: suppliers.name })
    .from(payables)
    .innerJoin(suppliers, eq(suppliers.id, payables.supplierId))
    .where(
      and(
        eq(payables.storeId, storeId),
        supplierId ? eq(payables.supplierId, supplierId) : undefined,
      ),
    )
    .orderBy(desc(payables.issuedOn), desc(payables.number));
  return rows.map((row) => ({ ...row.payable, supplierName: row.supplierName }));
}

/** Σ applied per invoice (in each invoice's currency); invoices without payments are absent. */
export async function findPaidTotals(
  db: Executor,
  payableIds: readonly string[],
): Promise<Map<string, string>> {
  if (payableIds.length === 0) return new Map();
  const rows = await db
    .select({ payableId: payablePayments.payableId, paid: sum(payablePayments.applied) })
    .from(payablePayments)
    .where(inArray(payablePayments.payableId, [...payableIds]))
    .groupBy(payablePayments.payableId);
  return new Map(rows.map((row) => [row.payableId, row.paid ?? "0"]));
}

export type LineRow = {
  id: string;
  subtotal: string;
  description: string | null;
  expenseCategoryId: string | null;
  expenseCategoryName: string | null;
  quantity: string | null;
  unit: "kg" | "unit" | "sack" | "pack" | null;
  unitPrice: string | null;
  purchaseLineId: string | null;
  productId: string | null;
  productName: string | null;
  purchaseUnit: "crate" | "bundle" | "kg" | null;
  packs: string | null;
  grossQuantity: string | null;
};

/** An invoice's lines in the order they were written, with category and product names. */
export async function findLines(db: Executor, payableId: string): Promise<LineRow[]> {
  return db
    .select({
      id: payableLines.id,
      subtotal: payableLines.subtotal,
      description: payableLines.description,
      expenseCategoryId: payableLines.expenseCategoryId,
      expenseCategoryName: expenseCategories.name,
      quantity: payableLines.quantity,
      unit: payableLines.unit,
      unitPrice: payableLines.unitPrice,
      purchaseLineId: payableLines.purchaseLineId,
      productId: purchaseLines.productId,
      productName: products.name,
      purchaseUnit: purchaseLines.purchaseUnit,
      packs: purchaseLines.packs,
      grossQuantity: purchaseLines.grossQuantity,
    })
    .from(payableLines)
    .leftJoin(expenseCategories, eq(expenseCategories.id, payableLines.expenseCategoryId))
    .leftJoin(purchaseLines, eq(purchaseLines.id, payableLines.purchaseLineId))
    .leftJoin(products, eq(products.id, purchaseLines.productId))
    .where(eq(payableLines.payableId, payableId))
    .orderBy(asc(payableLines.id));
}

/** Whether any line of the invoice is merchandise (it then came from the purchase form). */
export async function hasPurchaseLines(db: Executor, payableId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: payableLines.id })
    .from(payableLines)
    .where(
      and(eq(payableLines.payableId, payableId), sql`${payableLines.purchaseLineId} IS NOT NULL`),
    )
    .limit(1);
  return row !== undefined;
}

export async function insertLines(db: Executor, values: PayableLineInsert[]): Promise<void> {
  if (values.length === 0) return;
  await db.insert(payableLines).values(values);
}

export async function deleteLines(db: Executor, payableId: string): Promise<void> {
  await db.delete(payableLines).where(eq(payableLines.payableId, payableId));
}

/** An invoice's payments, oldest first. */
export async function findPayments(db: Executor, payableId: string): Promise<PaymentRecord[]> {
  return db
    .select()
    .from(payablePayments)
    .where(eq(payablePayments.payableId, payableId))
    .orderBy(asc(payablePayments.paidOn), asc(payablePayments.id));
}

export async function insertPayment(db: Executor, values: PaymentInsert): Promise<PaymentRecord> {
  const [row] = await db.insert(payablePayments).values(values).returning();
  if (!row) throw new Error("insert into payable_payments returned no row");
  return row;
}

export async function findPayment(
  db: Executor,
  payableId: string,
  id: string,
): Promise<PaymentRecord | undefined> {
  const [row] = await db
    .select()
    .from(payablePayments)
    .where(and(eq(payablePayments.id, id), eq(payablePayments.payableId, payableId)))
    .limit(1);
  return row;
}

export async function deletePaymentById(db: Executor, id: string): Promise<void> {
  await db.delete(payablePayments).where(eq(payablePayments.id, id));
}

export type TripPayableRow = {
  id: string;
  number: number;
  supplierName: string;
  currency: "USD" | "VES";
  total: string;
};

/** Invoices created from a trip's credit lines, by number. */
export async function findTripPayables(db: Executor, tripId: string): Promise<TripPayableRow[]> {
  return db
    .select({
      id: payables.id,
      number: payables.number,
      supplierName: suppliers.name,
      currency: payables.currency,
      total: payables.total,
    })
    .from(payables)
    .innerJoin(suppliers, eq(suppliers.id, payables.supplierId))
    .where(eq(payables.tripId, tripId))
    .orderBy(asc(payables.number));
}
