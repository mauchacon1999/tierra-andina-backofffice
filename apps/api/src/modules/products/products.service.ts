import {
  assertValidProduct,
  cleanProductName,
  InvalidProductDefaultsError,
  InvalidUnitCombinationError,
  normalizeProductName,
} from "@ta/core";
import type { Database, Executor } from "@ta/db";
import {
  PRODUCT_RULE_MESSAGES,
  type CreateProduct,
  type Paginated,
  type ProductListQuery,
  type QuickCreateProduct,
  type UpdateProduct,
} from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import { getStoreSettings } from "@/modules/settings/settings.service";
import type { Actor } from "@/lib/types";

import {
  findAllCategories,
  findCategoryByCode,
  findCategoryById,
  findProductById,
  findProductIdByNormalizedName,
  findProducts,
  insertProduct,
  isProductUsed,
  updateProductById,
  type CategoryRecord,
  type ProductInsert,
  type ProductRecord,
  type ProductRow,
} from "./products.repository";

const TABLE = "products";
/** Category assigned by quick create (products.md §1.6). */
const QUICK_CREATE_CATEGORY_CODE = "other";

export type ProductWithLock = ProductRow & { isUnitLocked: boolean };

function notFound(): AppError {
  return new AppError(ErrorCode.PRODUCT_NOT_FOUND, "El producto no existe");
}

function nameTaken(): AppError {
  return new AppError(
    ErrorCode.PRODUCT_NAME_TAKEN,
    "Ya existe un producto con ese nombre",
    undefined,
    {
      fieldErrors: { name: ["Ya existe un producto con ese nombre"] },
    },
  );
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = error instanceof Error ? (error.cause ?? error) : error;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "23505" &&
    "constraint_name" in cause &&
    cause.constraint_name === constraint
  );
}

/** Applies the @ta/core product rules; turns domain errors into API errors with field details. */
function checkRules(product: {
  purchaseUnit: ProductRecord["purchaseUnit"];
  saleUnit: ProductRecord["saleUnit"];
  defaultPackQuantity: string | null;
  lastShrinkage: string;
  lastMargin: string;
}): void {
  try {
    assertValidProduct(product);
  } catch (error) {
    if (error instanceof InvalidUnitCombinationError) {
      const message = PRODUCT_RULE_MESSAGES.INVALID_UNIT_COMBINATION;
      throw new AppError(ErrorCode.INVALID_UNIT_COMBINATION, message, undefined, {
        fieldErrors: { saleUnit: [message] },
      });
    }
    if (error instanceof InvalidProductDefaultsError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        (fieldErrors[issue.field] ??= []).push(PRODUCT_RULE_MESSAGES[issue.code]);
      }
      throw new AppError(
        ErrorCode.INVALID_PRODUCT_DEFAULTS,
        "Revisa la cantidad por bulto, la merma y el margen",
        undefined,
        { fieldErrors },
      );
    }
    throw error;
  }
}

async function requireCategory(db: Executor, categoryId: string): Promise<CategoryRecord> {
  const category = await findCategoryById(db, categoryId);
  if (!category) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND, "La categoría no existe", undefined, {
      fieldErrors: { categoryId: ["La categoría no existe"] },
    });
  }
  return category;
}

async function requireProduct(db: Executor, id: string): Promise<ProductRow> {
  const product = await findProductById(db, id);
  if (!product) throw notFound();
  return product;
}

/** Inserts a validated product and its audit row; maps the unique-name race to 409. */
async function insertAudited(
  db: Database,
  actor: Actor,
  values: Omit<ProductInsert, "normalizedName" | "createdBy" | "updatedBy">,
): Promise<ProductRow> {
  const normalizedName = normalizeProductName(values.name);
  if (await findProductIdByNormalizedName(db, normalizedName)) throw nameTaken();

  try {
    const id = await db.transaction(async (tx) => {
      const row = await insertProduct(tx, {
        ...values,
        normalizedName,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
      await recordAudit(tx, actor, {
        tableName: TABLE,
        recordId: row.id,
        action: "insert",
        changes: row,
      });
      return row.id;
    });
    return await requireProduct(db, id);
  } catch (error) {
    // Two creations with the same name at once: the unique index decides.
    if (isUniqueViolation(error, "products_normalized_name_key")) throw nameTaken();
    throw error;
  }
}

/** Paginated product list (search ignores case and accents). */
export async function listProducts(
  db: Database,
  query: ProductListQuery,
): Promise<Paginated<ProductRow>> {
  const { rows, total } = await findProducts(db, query);
  return { data: rows, total, page: query.page, pageSize: query.pageSize };
}

/** One product plus whether its units are locked (used by a purchase or price list line). */
export async function getProduct(db: Database, id: string): Promise<ProductWithLock> {
  const product = await requireProduct(db, id);
  return { ...product, isUnitLocked: await isProductUsed(db, id) };
}

/**
 * Creates a product (products.md §1). Margin defaults to the store's `default_margin`.
 * @throws AppError CATEGORY_NOT_FOUND, INVALID_UNIT_COMBINATION, INVALID_PRODUCT_DEFAULTS,
 *   PRODUCT_NAME_TAKEN
 */
export async function createProduct(
  db: Database,
  actor: Actor,
  input: CreateProduct,
): Promise<ProductRow> {
  await requireCategory(db, input.categoryId);
  const lastMargin = input.lastMargin ?? (await getStoreSettings(db, actor.storeId)).defaultMargin;
  const values = {
    name: cleanProductName(input.name),
    categoryId: input.categoryId,
    purchaseUnit: input.purchaseUnit,
    saleUnit: input.saleUnit,
    defaultPackQuantity: input.defaultPackQuantity,
    lastShrinkage: input.lastShrinkage,
    lastMargin,
  };
  checkRules(values);
  return insertAudited(db, actor, values);
}

/**
 * Quick create from the purchase screen (products.md §1.6): category "other", shrinkage 0,
 * the store's default margin.
 */
export async function quickCreateProduct(
  db: Database,
  actor: Actor,
  input: QuickCreateProduct,
): Promise<ProductRow> {
  const category = await findCategoryByCode(db, QUICK_CREATE_CATEGORY_CODE);
  if (!category) throw new Error(`seed category "${QUICK_CREATE_CATEGORY_CODE}" is missing`);
  return createProduct(db, actor, {
    ...input,
    categoryId: category.id,
    lastShrinkage: "0",
  });
}

/**
 * Updates a product. Units cannot change once the product is used (products.md §1.5); the
 * rules are re-checked on the merged result.
 * @throws AppError PRODUCT_NOT_FOUND, PRODUCT_UNITS_LOCKED, CATEGORY_NOT_FOUND,
 *   INVALID_UNIT_COMBINATION, INVALID_PRODUCT_DEFAULTS, PRODUCT_NAME_TAKEN
 */
export async function updateProduct(
  db: Database,
  actor: Actor,
  id: string,
  patch: UpdateProduct,
): Promise<ProductWithLock> {
  const before = await requireProduct(db, id);
  const isUnitLocked = await isProductUsed(db, id);

  const unitsChange =
    (patch.purchaseUnit !== undefined && patch.purchaseUnit !== before.purchaseUnit) ||
    (patch.saleUnit !== undefined && patch.saleUnit !== before.saleUnit);
  if (unitsChange && isUnitLocked) {
    throw new AppError(
      ErrorCode.PRODUCT_UNITS_LOCKED,
      "Este producto ya se usó en compras o listas de precios: sus unidades no se pueden cambiar. Crea un producto nuevo.",
    );
  }
  if (patch.categoryId && patch.categoryId !== before.categoryId) {
    await requireCategory(db, patch.categoryId);
  }

  const merged = {
    name: patch.name !== undefined ? cleanProductName(patch.name) : before.name,
    categoryId: patch.categoryId ?? before.categoryId,
    purchaseUnit: patch.purchaseUnit ?? before.purchaseUnit,
    saleUnit: patch.saleUnit ?? before.saleUnit,
    defaultPackQuantity:
      patch.defaultPackQuantity !== undefined
        ? patch.defaultPackQuantity
        : before.defaultPackQuantity,
    lastShrinkage: patch.lastShrinkage ?? before.lastShrinkage,
    lastMargin: patch.lastMargin ?? before.lastMargin,
  };
  checkRules(merged);

  const normalizedName = normalizeProductName(merged.name);
  if (
    normalizedName !== before.normalizedName &&
    (await findProductIdByNormalizedName(db, normalizedName, id))
  ) {
    throw nameTaken();
  }

  try {
    await db.transaction(async (tx) => {
      const after = await updateProductById(tx, id, {
        ...merged,
        normalizedName,
        updatedBy: actor.userId,
      });
      await recordAudit(tx, actor, {
        tableName: TABLE,
        recordId: id,
        action: "update",
        changes: diffChanges(before, after),
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, "products_normalized_name_key")) throw nameTaken();
    throw error;
  }
  return { ...(await requireProduct(db, id)), isUnitLocked };
}

/**
 * Deactivates or reactivates a product (soft delete, products.md §1.5). Idempotent: setting
 * the current state again changes nothing and writes no audit row.
 * @throws AppError PRODUCT_NOT_FOUND
 */
export async function setProductActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
): Promise<ProductRow> {
  const before = await requireProduct(db, id);
  if (before.isActive === isActive) return before;

  await db.transaction(async (tx) => {
    const after = await updateProductById(tx, id, { isActive, updatedBy: actor.userId });
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: id,
      action: "update",
      changes: diffChanges(before, after),
    });
  });
  return requireProduct(db, id);
}

/** Product categories ordered for selects. */
export async function listCategories(db: Database): Promise<CategoryRecord[]> {
  return findAllCategories(db);
}

/** A product by id (no lock check), or undefined. For other modules that reference products. */
export async function findProduct(db: Executor, id: string): Promise<ProductRow | undefined> {
  return findProductById(db, id);
}

/**
 * Remembers the margin of the last purchase line as the product's suggestion
 * (products.md §1.3). Shrinkage stays what the owner set on the product. Runs inside the
 * caller's transaction; audits only when the margin changes.
 */
export async function rememberPurchaseDefaults(
  tx: Executor,
  actor: Actor,
  productId: string,
  values: { lastMargin: string },
): Promise<void> {
  const before = await requireProduct(tx, productId);
  const after = await updateProductById(tx, productId, { ...values, updatedBy: actor.userId });
  const changes = diffChanges(before, after);
  if (Object.keys(changes).length === 0) return;
  await recordAudit(tx, actor, {
    tableName: TABLE,
    recordId: productId,
    action: "update",
    changes,
  });
}
