import { type Executor, schema } from "@ta/db";
import type { TripListQuery } from "@ta/validators";
import { and, asc, count, desc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";

const { purchaseTrips, purchaseLines, products, suppliers } = schema;

export type TripRecord = typeof purchaseTrips.$inferSelect;
export type TripInsert = typeof purchaseTrips.$inferInsert;
export type TripRow = TripRecord & { lineCount: number };
export type LineRecord = typeof purchaseLines.$inferSelect;
export type LineInsert = typeof purchaseLines.$inferInsert;
export type LineRow = LineRecord & {
  productName: string;
  saleUnit: (typeof products.$inferSelect)["saleUnit"];
  supplierName: string | null;
};

// Column references are spelled out: inside a selected sql`` Drizzle renders columns without
// their table, so `trip_id = id` would compare against purchase_lines.id and always count 0.
const lineCount = sql<number>`(
  select count(*)::int from ${purchaseLines} as pl
  where pl.trip_id = ${sql.identifier("purchase_trips")}.${sql.identifier("id")}
)`;
const tripWithCount = { ...getTableColumns(purchaseTrips), lineCount };

export async function insertTrip(db: Executor, values: TripInsert): Promise<TripRecord> {
  const [row] = await db.insert(purchaseTrips).values(values).returning();
  if (!row) throw new Error("insert into purchase_trips returned no row");
  return row;
}

/** A trip of the store (other stores' trips are invisible). */
export async function findTrip(
  db: Executor,
  storeId: string,
  id: string,
): Promise<TripRow | undefined> {
  const [row] = await db
    .select(tripWithCount)
    .from(purchaseTrips)
    .where(and(eq(purchaseTrips.id, id), eq(purchaseTrips.storeId, storeId)))
    .limit(1);
  return row;
}

/** Trips of the store, newest business date first; on the same day open ones first (enum order). */
export async function findTrips(
  db: Executor,
  storeId: string,
  query: TripListQuery,
): Promise<{ rows: TripRow[]; total: number }> {
  const conditions: SQL[] = [eq(purchaseTrips.storeId, storeId)];
  if (query.status) conditions.push(eq(purchaseTrips.status, query.status));
  const where = and(...conditions);
  const [rows, [totals]] = await Promise.all([
    db
      .select(tripWithCount)
      .from(purchaseTrips)
      .where(where)
      .orderBy(
        desc(purchaseTrips.businessDate),
        asc(purchaseTrips.status),
        desc(purchaseTrips.createdAt),
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(purchaseTrips).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function updateTripById(
  db: Executor,
  id: string,
  values: Partial<TripInsert>,
): Promise<TripRecord> {
  const [row] = await db
    .update(purchaseTrips)
    .set(values)
    .where(eq(purchaseTrips.id, id))
    .returning();
  if (!row) throw new Error(`update of trip ${id} returned no row`);
  return row;
}

/** Open trips of a store, newest business day first. */
export async function findOpenTrips(db: Executor, storeId: string): Promise<TripRow[]> {
  return db
    .select(tripWithCount)
    .from(purchaseTrips)
    .where(and(eq(purchaseTrips.storeId, storeId), eq(purchaseTrips.status, "open")))
    .orderBy(desc(purchaseTrips.businessDate), desc(purchaseTrips.createdAt));
}

/** Lines of a trip with product and supplier names, in the order they were bought. */
export async function findTripLines(db: Executor, tripId: string): Promise<LineRow[]> {
  return db
    .select({
      ...getTableColumns(purchaseLines),
      productName: products.name,
      saleUnit: products.saleUnit,
      supplierName: suppliers.name,
    })
    .from(purchaseLines)
    .innerJoin(products, eq(products.id, purchaseLines.productId))
    .leftJoin(suppliers, eq(suppliers.id, purchaseLines.supplierId))
    .where(eq(purchaseLines.tripId, tripId))
    .orderBy(asc(purchaseLines.createdAt), asc(purchaseLines.id));
}

export async function findLine(
  db: Executor,
  tripId: string,
  lineId: string,
): Promise<LineRecord | undefined> {
  const [row] = await db
    .select()
    .from(purchaseLines)
    .where(and(eq(purchaseLines.id, lineId), eq(purchaseLines.tripId, tripId)))
    .limit(1);
  return row;
}

export async function insertLine(db: Executor, values: LineInsert): Promise<LineRecord> {
  const [row] = await db.insert(purchaseLines).values(values).returning();
  if (!row) throw new Error("insert into purchase_lines returned no row");
  return row;
}

export async function updateLineById(
  db: Executor,
  id: string,
  values: Partial<LineInsert>,
): Promise<LineRecord> {
  const [row] = await db
    .update(purchaseLines)
    .set(values)
    .where(eq(purchaseLines.id, id))
    .returning();
  if (!row) throw new Error(`update of purchase line ${id} returned no row`);
  return row;
}

export async function deleteLineById(db: Executor, id: string): Promise<void> {
  await db.delete(purchaseLines).where(eq(purchaseLines.id, id));
}

/** Real cost (USD) and amount paid (Bs) of every line of a trip, to recompute its totals. */
export async function findLineAmounts(
  db: Executor,
  tripId: string,
): Promise<{ realCostUsd: string; amountBs: string }[]> {
  return db
    .select({ realCostUsd: purchaseLines.realCostUsd, amountBs: purchaseLines.amountBs })
    .from(purchaseLines)
    .where(eq(purchaseLines.tripId, tripId));
}
