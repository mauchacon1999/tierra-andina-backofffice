import { type Executor, schema } from "@ta/db";
import { normalizeProductName } from "@ta/core";
import type { ProductListQuery } from "@ta/validators";
import { and, asc, count, eq, getTableColumns, ilike, ne, type SQL } from "drizzle-orm";

const { products, productCategories, purchaseLines, priceListLines } = schema;

export type ProductRecord = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;
export type ProductRow = ProductRecord & { categoryName: string };
export type CategoryRecord = typeof productCategories.$inferSelect;

const productWithCategory = {
  ...getTableColumns(products),
  categoryName: productCategories.name,
};

/** Escapes LIKE wildcards so a search for "50%" matches the text, not everything. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function listFilters(query: ProductListQuery): SQL | undefined {
  const conditions: SQL[] = [eq(products.isActive, query.isActive)];
  if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
  if (query.purchaseUnit) conditions.push(eq(products.purchaseUnit, query.purchaseUnit));
  if (query.search) {
    const needle = escapeLike(normalizeProductName(query.search));
    if (needle) conditions.push(ilike(products.normalizedName, `%${needle}%`));
  }
  return and(...conditions);
}

/** One page of products (with category name), ordered by name, plus the total count. */
export async function findProducts(
  db: Executor,
  query: ProductListQuery,
): Promise<{ rows: ProductRow[]; total: number }> {
  const where = listFilters(query);
  const [rows, [totals]] = await Promise.all([
    db
      .select(productWithCategory)
      .from(products)
      .innerJoin(productCategories, eq(productCategories.id, products.categoryId))
      .where(where)
      .orderBy(asc(products.normalizedName))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(products).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function findProductById(db: Executor, id: string): Promise<ProductRow | undefined> {
  const [row] = await db
    .select(productWithCategory)
    .from(products)
    .innerJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(eq(products.id, id))
    .limit(1);
  return row;
}

/** Id of the product with this normalized name, ignoring `exceptId` (the one being edited). */
export async function findProductIdByNormalizedName(
  db: Executor,
  normalizedName: string,
  exceptId?: string,
): Promise<string | undefined> {
  const conditions = [eq(products.normalizedName, normalizedName)];
  if (exceptId) conditions.push(ne(products.id, exceptId));
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions))
    .limit(1);
  return row?.id;
}

export async function insertProduct(db: Executor, values: ProductInsert): Promise<ProductRecord> {
  const [row] = await db.insert(products).values(values).returning();
  if (!row) throw new Error("insert into products returned no row");
  return row;
}

export async function updateProductById(
  db: Executor,
  id: string,
  values: Partial<ProductInsert>,
): Promise<ProductRecord> {
  const [row] = await db.update(products).set(values).where(eq(products.id, id)).returning();
  if (!row) throw new Error(`update of product ${id} returned no row`);
  return row;
}

/** True when a purchase line or price list line references the product (units are locked). */
export async function isProductUsed(db: Executor, id: string): Promise<boolean> {
  const [inPurchases, inPriceLists] = await Promise.all([
    db
      .select({ id: purchaseLines.id })
      .from(purchaseLines)
      .where(eq(purchaseLines.productId, id))
      .limit(1),
    db
      .select({ id: priceListLines.id })
      .from(priceListLines)
      .where(eq(priceListLines.productId, id))
      .limit(1),
  ]);
  return inPurchases.length > 0 || inPriceLists.length > 0;
}

export async function findCategoryById(
  db: Executor,
  id: string,
): Promise<CategoryRecord | undefined> {
  const [row] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .limit(1);
  return row;
}

export async function findCategoryByCode(
  db: Executor,
  code: string,
): Promise<CategoryRecord | undefined> {
  const [row] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.code, code))
    .limit(1);
  return row;
}

export async function findAllCategories(db: Executor): Promise<CategoryRecord[]> {
  return db
    .select()
    .from(productCategories)
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
}
