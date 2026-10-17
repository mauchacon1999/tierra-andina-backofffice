import type { Database, Executor } from "@ta/db";
import type { CreateShoppingListItem, ShoppingListItem } from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";
import { findProduct } from "@/modules/products/products.service";

import {
  findItem,
  findItemsForLine,
  findOldestOpenForProduct,
  findOpenItems,
  insertItem,
  updateItemById,
  type ShoppingItemRow,
} from "./shopping-list.repository";

const TABLE = "shopping_list_items";

export function toShoppingItemDto(row: ShoppingItemRow): ShoppingListItem {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    note: row.note,
    status: row.status,
    purchaseLineId: row.purchaseLineId,
    createdAt: row.createdAt.toISOString(),
  };
}

/** What is still to buy, oldest first. */
export async function listOpenItems(db: Executor, storeId: string): Promise<ShoppingItemRow[]> {
  return findOpenItems(db, storeId);
}

/**
 * Adds a product the shop is missing. The same product may be requested more than once;
 * each request is checked off by its own purchase line.
 * @throws AppError PRODUCT_NOT_FOUND
 */
export async function addShoppingItem(
  db: Database,
  actor: Actor,
  input: CreateShoppingListItem,
): Promise<ShoppingItemRow> {
  const product = await findProduct(db, input.productId);
  if (!product || !product.isActive) {
    throw new AppError(
      ErrorCode.PRODUCT_NOT_FOUND,
      "El producto no existe o está inactivo",
      undefined,
      {
        fieldErrors: { productId: ["El producto no existe o está inactivo"] },
      },
    );
  }
  return db.transaction(async (tx) => {
    const row = await insertItem(tx, {
      storeId: actor.storeId,
      productId: product.id,
      requestedBy: actor.userId,
      note: input.note || null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: row.id,
      action: "insert",
      changes: row,
    });
    const listed = await findItem(tx, actor.storeId, row.id);
    if (!listed) throw new Error("shopping list item missing after insert");
    return listed;
  });
}

/** Drops an open request (it will not be bought). @throws SHOPPING_ITEM_NOT_FOUND, SHOPPING_ITEM_NOT_OPEN */
export async function dropShoppingItem(
  db: Database,
  actor: Actor,
  id: string,
): Promise<ShoppingItemRow> {
  const before = await findItem(db, actor.storeId, id);
  if (!before) throw new AppError(ErrorCode.SHOPPING_ITEM_NOT_FOUND, "El faltante no existe");
  if (before.status !== "open") {
    throw new AppError(ErrorCode.SHOPPING_ITEM_NOT_OPEN, "Ese faltante ya no está pendiente");
  }
  const { productName: _productName, ...beforeRecord } = before;
  return db.transaction(async (tx) => {
    const after = await updateItemById(tx, id, { status: "dropped", updatedBy: actor.userId });
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: id,
      action: "update",
      changes: diffChanges(beforeRecord, after),
    });
    const listed = await findItem(tx, actor.storeId, id);
    if (!listed) throw new Error("shopping list item missing after drop");
    return listed;
  });
}

/**
 * Checks off the oldest open request for this product, linking it to the purchase line.
 * No request: nothing to do (a product can be bought without having been on the list).
 * Runs in the caller's transaction.
 */
export async function claimOpenItem(
  tx: Executor,
  actor: Actor,
  productId: string,
  lineId: string,
): Promise<void> {
  const open = await findOldestOpenForProduct(tx, actor.storeId, productId);
  if (!open) return;
  const after = await updateItemById(tx, open.id, {
    status: "bought",
    purchaseLineId: lineId,
    updatedBy: actor.userId,
  });
  await recordAudit(tx, actor, {
    tableName: TABLE,
    recordId: open.id,
    action: "update",
    changes: diffChanges(open, after),
  });
}

/**
 * Puts back the requests this line had checked off (the line was deleted or now buys
 * another product). Runs in the caller's transaction.
 */
export async function releaseItemsForLine(
  tx: Executor,
  actor: Actor,
  lineId: string,
): Promise<void> {
  const linked = await findItemsForLine(tx, lineId);
  for (const before of linked) {
    const after = await updateItemById(tx, before.id, {
      status: "open",
      purchaseLineId: null,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: before.id,
      action: "update",
      changes: diffChanges(before, after),
    });
  }
}
