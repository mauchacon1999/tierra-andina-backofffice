import { priceInBs } from "@ta/core";
import type { Executor } from "@ta/db";
import type { PriceList } from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";
import type { LineRecord } from "@/modules/purchases/purchases.repository";

import {
  findCurrentList,
  findListLines,
  insertList,
  insertListLines,
  type PriceListLineRow,
  type PriceListRecord,
} from "./price-lists.repository";

const LIST_TABLE = "price_lists";
const LINE_TABLE = "price_list_lines";

export type PricedProduct = {
  productId: string;
  unitCostUsd: string;
  margin: string;
  priceUsd: string;
  sourcePurchaseLineId: string | null;
};

/**
 * Prices to publish: the previous list, with this trip laid on top.
 * Pending and received lines replace that product; a partial line uses the received cost;
 * a missing line leaves the previous price. Later lines of the same product win.
 * Returns undefined when the trip has nothing that can be sold.
 */
export function pricesFromTrip(
  previous: readonly PricedProduct[],
  lines: readonly LineRecord[],
): PricedProduct[] | undefined {
  const byProduct = new Map<string, PricedProduct>();
  for (const product of previous) byProduct.set(product.productId, { ...product });

  let soldSomething = false;
  for (const line of lines) {
    if (line.receiptStatus === "missing") continue;
    soldSomething = true;
    const partial = line.receiptStatus === "partial";
    byProduct.set(line.productId, {
      productId: line.productId,
      unitCostUsd: partial ? requiredReceived(line, "receivedUnitCostUsd") : line.unitCostUsd,
      margin: line.margin,
      priceUsd: partial ? requiredReceived(line, "receivedSalePriceUsd") : line.salePriceUsd,
      sourcePurchaseLineId: line.id,
    });
  }
  if (!soldSomething || byProduct.size === 0) return undefined;
  return [...byProduct.values()];
}

export function toPriceListDto(list: PriceListRecord, lines: PriceListLineRow[]): PriceList {
  if (!list.publishedAt) throw new Error("published price list has no publishedAt");
  return {
    id: list.id,
    tripId: list.tripId,
    saleRate: list.saleRate,
    publishedAt: list.publishedAt.toISOString(),
    lines: lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName,
      saleUnit: line.saleUnit,
      unitCostUsd: line.unitCostUsd,
      margin: line.margin,
      priceUsd: line.priceUsd,
      priceBs: line.priceBs,
    })),
  };
}

/** The list in force, or undefined when the shop has never published one. */
export async function getCurrentPriceList(
  db: Executor,
  storeId: string,
): Promise<{ list: PriceListRecord; lines: PriceListLineRow[] } | undefined> {
  const list = await findCurrentList(db, storeId);
  if (!list) return undefined;
  return { list, lines: await findListLines(db, list.id) };
}

export async function requireCurrentPriceList(
  db: Executor,
  storeId: string,
): Promise<{ list: PriceListRecord; lines: PriceListLineRow[] }> {
  const current = await getCurrentPriceList(db, storeId);
  if (!current)
    throw new AppError(ErrorCode.PRICE_LIST_NOT_FOUND, "Todavía no hay lista de precios");
  return current;
}

/**
 * Publishes the shop's prices from a trip that is closing (domain-model §3.4).
 *
 * Products that arrived (received, partial or still pending) replace their previous price.
 * A partial receipt uses the cost of what arrived. Missing goods keep the previous price.
 * Products not bought on this trip stay, with Bs recomputed at this sale rate.
 * A trip where nothing can be sold, and no list yet, publishes nothing.
 *
 * Runs in the caller's transaction. `saleRate` and `bsRoundingStep` are the day's configuration.
 */
export async function publishFromTrip(
  tx: Executor,
  actor: Actor,
  input: {
    tripId: string;
    lines: LineRecord[];
    saleRate: string;
    bsRoundingStep: string;
    now: Date;
  },
): Promise<PriceListRecord | undefined> {
  const previous = await getCurrentPriceList(tx, actor.storeId);
  const priced = pricesFromTrip(
    (previous?.lines ?? []).map((line) => ({
      productId: line.productId,
      unitCostUsd: line.unitCostUsd,
      margin: line.margin,
      priceUsd: line.priceUsd,
      sourcePurchaseLineId: line.sourcePurchaseLineId,
    })),
    input.lines,
  );
  if (!priced) return undefined;

  const list = await insertList(tx, {
    storeId: actor.storeId,
    tripId: input.tripId,
    saleRate: input.saleRate,
    status: "published",
    publishedAt: input.now,
    publishedBy: actor.userId,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await recordAudit(tx, actor, {
    tableName: LIST_TABLE,
    recordId: list.id,
    action: "insert",
    changes: list,
  });

  const rows = priced.map((product) => ({
    priceListId: list.id,
    productId: product.productId,
    unitCostUsd: product.unitCostUsd,
    margin: product.margin,
    priceUsd: product.priceUsd,
    priceBs: priceInBs(product.priceUsd, input.saleRate, input.bsRoundingStep),
    sourcePurchaseLineId: product.sourcePurchaseLineId,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  }));
  const inserted = await insertListLines(tx, rows);
  for (const row of inserted) {
    await recordAudit(tx, actor, {
      tableName: LINE_TABLE,
      recordId: row.id,
      action: "insert",
      changes: row,
    });
  }
  return list;
}

function requiredReceived(
  line: LineRecord,
  field: "receivedUnitCostUsd" | "receivedSalePriceUsd",
): string {
  const value = line[field];
  if (!value) throw new Error(`partial line ${line.id} is missing ${field}`);
  return value;
}
