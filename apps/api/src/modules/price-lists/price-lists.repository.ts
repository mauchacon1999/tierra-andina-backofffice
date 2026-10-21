import { type Executor, schema } from "@ta/db";
import { and, asc, desc, eq } from "drizzle-orm";

const { priceLists, priceListLines, products, purchaseLines, purchaseTrips } = schema;

export type PriceListRecord = typeof priceLists.$inferSelect;
export type PriceListInsert = typeof priceLists.$inferInsert;
export type PriceListLineRecord = typeof priceListLines.$inferSelect;
export type PriceListLineInsert = typeof priceListLines.$inferInsert;
export type PriceListLineRow = PriceListLineRecord & {
  productName: string;
  saleUnit: (typeof products.$inferSelect)["saleUnit"];
};

/** The published list in force: the one published last. */
export async function findCurrentList(
  db: Executor,
  storeId: string,
): Promise<PriceListRecord | undefined> {
  const [row] = await db
    .select()
    .from(priceLists)
    .where(and(eq(priceLists.storeId, storeId), eq(priceLists.status, "published")))
    .orderBy(desc(priceLists.publishedAt), desc(priceLists.id))
    .limit(1);
  return row;
}

export async function findListLines(
  db: Executor,
  priceListId: string,
): Promise<PriceListLineRow[]> {
  return db
    .select({
      id: priceListLines.id,
      priceListId: priceListLines.priceListId,
      productId: priceListLines.productId,
      unitCostUsd: priceListLines.unitCostUsd,
      margin: priceListLines.margin,
      priceUsd: priceListLines.priceUsd,
      priceBs: priceListLines.priceBs,
      sourcePurchaseLineId: priceListLines.sourcePurchaseLineId,
      createdAt: priceListLines.createdAt,
      updatedAt: priceListLines.updatedAt,
      createdBy: priceListLines.createdBy,
      updatedBy: priceListLines.updatedBy,
      productName: products.name,
      saleUnit: products.saleUnit,
    })
    .from(priceListLines)
    .innerJoin(products, eq(products.id, priceListLines.productId))
    .where(eq(priceListLines.priceListId, priceListId))
    .orderBy(asc(products.name), asc(priceListLines.id));
}

export async function insertList(db: Executor, values: PriceListInsert): Promise<PriceListRecord> {
  const [row] = await db.insert(priceLists).values(values).returning();
  if (!row) throw new Error("insert into price_lists returned no row");
  return row;
}

export async function insertListLines(
  db: Executor,
  values: PriceListLineInsert[],
): Promise<PriceListLineRecord[]> {
  if (values.length === 0) return [];
  return db.insert(priceListLines).values(values).returning();
}

export type ManualProductRow = {
  id: string;
  name: string;
  saleUnit: (typeof products.$inferSelect)["saleUnit"];
  shareOnWhatsapp: boolean;
};

/** Active products for "Precio manual", by name. */
export async function findActiveProducts(db: Executor): Promise<ManualProductRow[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      saleUnit: products.saleUnit,
      shareOnWhatsapp: products.shareOnWhatsapp,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name), asc(products.id));
}

export type LastPurchaseRow = {
  id: string;
  productId: string;
  purchaseUnit: (typeof purchaseLines.$inferSelect)["purchaseUnit"];
  packs: string | null;
  grossQuantity: string;
  quotedPriceUsd: string;
  unitCostUsd: string;
  receiptStatus: (typeof purchaseLines.$inferSelect)["receiptStatus"];
  receivedUnitCostUsd: string | null;
};

/**
 * Each product's latest purchase line in the store (newest business day, then newest line),
 * from any trip or local purchase. `productId` narrows it to one product.
 */
export async function findLastPurchases(
  db: Executor,
  storeId: string,
  productId?: string,
): Promise<LastPurchaseRow[]> {
  const where = and(
    eq(purchaseTrips.storeId, storeId),
    productId ? eq(purchaseLines.productId, productId) : undefined,
  );
  return db
    .selectDistinctOn([purchaseLines.productId], {
      id: purchaseLines.id,
      productId: purchaseLines.productId,
      purchaseUnit: purchaseLines.purchaseUnit,
      packs: purchaseLines.packs,
      grossQuantity: purchaseLines.grossQuantity,
      quotedPriceUsd: purchaseLines.quotedPriceUsd,
      unitCostUsd: purchaseLines.unitCostUsd,
      receiptStatus: purchaseLines.receiptStatus,
      receivedUnitCostUsd: purchaseLines.receivedUnitCostUsd,
    })
    .from(purchaseLines)
    .innerJoin(purchaseTrips, eq(purchaseTrips.id, purchaseLines.tripId))
    .where(where)
    .orderBy(
      purchaseLines.productId,
      desc(purchaseTrips.businessDate),
      desc(purchaseLines.createdAt),
      desc(purchaseLines.id),
    );
}
