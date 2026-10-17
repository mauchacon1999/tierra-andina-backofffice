import { type Executor, schema } from "@ta/db";
import { and, asc, eq } from "drizzle-orm";

const { shoppingListItems, products } = schema;

export type ShoppingItemRecord = typeof shoppingListItems.$inferSelect;
export type ShoppingItemInsert = typeof shoppingListItems.$inferInsert;
export type ShoppingItemRow = ShoppingItemRecord & { productName: string };

const columns = {
  id: shoppingListItems.id,
  storeId: shoppingListItems.storeId,
  productId: shoppingListItems.productId,
  requestedBy: shoppingListItems.requestedBy,
  note: shoppingListItems.note,
  status: shoppingListItems.status,
  purchaseLineId: shoppingListItems.purchaseLineId,
  createdAt: shoppingListItems.createdAt,
  updatedAt: shoppingListItems.updatedAt,
  createdBy: shoppingListItems.createdBy,
  updatedBy: shoppingListItems.updatedBy,
  productName: products.name,
};

/** Open items of the store, oldest first: that is the order they are bought. */
export async function findOpenItems(db: Executor, storeId: string): Promise<ShoppingItemRow[]> {
  return db
    .select(columns)
    .from(shoppingListItems)
    .innerJoin(products, eq(products.id, shoppingListItems.productId))
    .where(and(eq(shoppingListItems.storeId, storeId), eq(shoppingListItems.status, "open")))
    .orderBy(asc(shoppingListItems.createdAt), asc(shoppingListItems.id));
}

export async function findItem(
  db: Executor,
  storeId: string,
  id: string,
): Promise<ShoppingItemRow | undefined> {
  const [row] = await db
    .select(columns)
    .from(shoppingListItems)
    .innerJoin(products, eq(products.id, shoppingListItems.productId))
    .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.storeId, storeId)))
    .limit(1);
  return row;
}

export async function insertItem(
  db: Executor,
  values: ShoppingItemInsert,
): Promise<ShoppingItemRecord> {
  const [row] = await db.insert(shoppingListItems).values(values).returning();
  if (!row) throw new Error("insert into shopping_list_items returned no row");
  return row;
}

export async function updateItemById(
  db: Executor,
  id: string,
  values: Partial<ShoppingItemInsert>,
): Promise<ShoppingItemRecord> {
  const [row] = await db
    .update(shoppingListItems)
    .set(values)
    .where(eq(shoppingListItems.id, id))
    .returning();
  if (!row) throw new Error(`update of shopping list item ${id} returned no row`);
  return row;
}

/** The oldest open request for this product, if the shop still needs it. */
export async function findOldestOpenForProduct(
  db: Executor,
  storeId: string,
  productId: string,
): Promise<ShoppingItemRecord | undefined> {
  const [row] = await db
    .select()
    .from(shoppingListItems)
    .where(
      and(
        eq(shoppingListItems.storeId, storeId),
        eq(shoppingListItems.productId, productId),
        eq(shoppingListItems.status, "open"),
      ),
    )
    .orderBy(asc(shoppingListItems.createdAt), asc(shoppingListItems.id))
    .limit(1);
  return row;
}

/** Items checked off by this purchase line (usually one). */
export async function findItemsForLine(
  db: Executor,
  lineId: string,
): Promise<ShoppingItemRecord[]> {
  return db.select().from(shoppingListItems).where(eq(shoppingListItems.purchaseLineId, lineId));
}
