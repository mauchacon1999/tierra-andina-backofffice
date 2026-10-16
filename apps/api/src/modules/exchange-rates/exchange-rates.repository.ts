import { type Executor, schema } from "@ta/db";
import { and, between, desc, eq, isNull, or } from "drizzle-orm";

const { exchangeRates } = schema;

export type RateKind = (typeof exchangeRates.$inferSelect)["kind"];
export type RateRecord = typeof exchangeRates.$inferSelect;

/** The store's rows (market, sale) plus the global BCV rows, for dates in [from, to]. */
export async function findRatesInRange(
  db: Executor,
  storeId: string,
  from: string,
  to: string,
): Promise<RateRecord[]> {
  return db
    .select()
    .from(exchangeRates)
    .where(
      and(
        between(exchangeRates.businessDate, from, to),
        or(
          and(isNull(exchangeRates.storeId), eq(exchangeRates.kind, "bcv")),
          eq(exchangeRates.storeId, storeId),
        ),
      ),
    )
    .orderBy(desc(exchangeRates.businessDate));
}

/** Inserts or replaces the rate of one kind for one day (BCV rows have no store). */
export async function upsertRate(
  db: Executor,
  values: {
    storeId: string | null;
    businessDate: string;
    kind: RateKind;
    value: string;
    userId: string;
  },
): Promise<RateRecord> {
  const [row] = await db
    .insert(exchangeRates)
    .values({
      storeId: values.storeId,
      businessDate: values.businessDate,
      kind: values.kind,
      value: values.value,
      createdBy: values.userId,
      updatedBy: values.userId,
    })
    // The unique constraint is NULLS NOT DISTINCT, so the global BCV row also conflicts here.
    .onConflictDoUpdate({
      target: [exchangeRates.storeId, exchangeRates.businessDate, exchangeRates.kind],
      set: { value: values.value, updatedBy: values.userId, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error("upsert of exchange rate returned no row");
  return row;
}
