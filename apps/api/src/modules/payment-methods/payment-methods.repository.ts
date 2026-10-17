import { type Executor, schema } from "@ta/db";
import { and, asc, eq, inArray } from "drizzle-orm";

const { paymentMethods } = schema;

export type PaymentMethodRecord = typeof paymentMethods.$inferSelect;

export async function findActivePaymentMethods(db: Executor): Promise<PaymentMethodRecord[]> {
  return db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.name));
}

export async function findActivePaymentMethodsByIds(
  db: Executor,
  ids: readonly string[],
): Promise<PaymentMethodRecord[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.isActive, true), inArray(paymentMethods.id, [...ids])));
}
