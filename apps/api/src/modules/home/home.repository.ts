import { and, count, eq, inArray, isNull } from "drizzle-orm";

import { type Executor, schema } from "@ta/db";

const {
  customerCreditEntries,
  customers,
  payables,
  payablePayments,
  purchaseLines,
  purchaseTrips,
  shoppingListItems,
} = schema;

export type CreditEntryRow = {
  kind: "credit" | "payment";
  currency: "VES" | "USD";
  amount: string;
};

/** Every fiado movement of the store. The balance is all of them, not one week. */
export async function findCreditEntries(db: Executor, storeId: string): Promise<CreditEntryRow[]> {
  return db
    .select({
      kind: customerCreditEntries.kind,
      currency: customerCreditEntries.currency,
      amount: customerCreditEntries.amount,
    })
    .from(customerCreditEntries)
    .innerJoin(customers, eq(customers.id, customerCreditEntries.customerId))
    .where(eq(customers.storeId, storeId));
}

export type OpenPayableRow = { id: string; total: string; currency: "USD" | "VES" };

/** Invoices not voided. Payments are loaded separately; a paid one has no balance left. */
export async function findOpenPayables(db: Executor, storeId: string): Promise<OpenPayableRow[]> {
  return db
    .select({ id: payables.id, total: payables.total, currency: payables.currency })
    .from(payables)
    .where(and(eq(payables.storeId, storeId), isNull(payables.voidedAt)));
}

/** `applied` is in the invoice's currency. */
export type PayablePaymentRow = { payableId: string; applied: string };

export async function findPayablePaymentAmounts(
  db: Executor,
  payableIds: readonly string[],
): Promise<PayablePaymentRow[]> {
  if (payableIds.length === 0) return [];
  return db
    .select({
      payableId: payablePayments.payableId,
      applied: payablePayments.applied,
    })
    .from(payablePayments)
    .where(inArray(payablePayments.payableId, [...payableIds]));
}

/** Products still waiting to be bought at Coche. */
export async function countOpenShoppingItems(db: Executor, storeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(shoppingListItems)
    .where(and(eq(shoppingListItems.storeId, storeId), eq(shoppingListItems.status, "open")));
  return row?.total ?? 0;
}

/** Purchase lines the truck has not confirmed yet. */
export async function countPendingReceipts(db: Executor, storeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(purchaseLines)
    .innerJoin(purchaseTrips, eq(purchaseTrips.id, purchaseLines.tripId))
    .where(and(eq(purchaseTrips.storeId, storeId), eq(purchaseLines.receiptStatus, "pending")));
  return row?.total ?? 0;
}
