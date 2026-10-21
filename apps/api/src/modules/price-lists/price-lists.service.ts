import {
  amountInUsd,
  compareDecimals,
  impliedMargin,
  priceInBs,
  proposeSaleRateList,
  purchasePrice,
  storableMargin,
  toBusinessDate,
} from "@ta/core";
import type { Database, Executor } from "@ta/db";
import type { ManualPriceList, ManualPriceRow, PriceList, PriceProposal } from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";
import { getDailyRates } from "@/modules/exchange-rates/exchange-rates.service";
import { findTrip, type LineRecord } from "@/modules/purchases/purchases.repository";
import { findProduct } from "@/modules/products/products.service";
import { getStoreSettings } from "@/modules/settings/settings.service";

import {
  findActiveProducts,
  findCurrentList,
  findLastPurchases,
  findListLines,
  insertList,
  insertListLines,
  type LastPurchaseRow,
  type ManualProductRow,
  type PriceListLineRow,
  type PriceListRecord,
} from "./price-lists.repository";

const LIST_TABLE = "price_lists";
const LINE_TABLE = "price_list_lines";

export type PricedProduct = {
  productId: string;
  unitCostUsd: string | null;
  margin: string | null;
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

/**
 * The owner's rate-change review for `today` (a business date). Undefined when the shop has
 * never published a list. Dollars are not recomputed; bolívares move only with the sale rate.
 * A BCV move is reported beside that and does not, by itself, create a list.
 */
export async function getPriceProposal(
  db: Executor,
  storeId: string,
  today: string,
): Promise<PriceProposal | undefined> {
  const current = await getCurrentPriceList(db, storeId);
  if (!current) return undefined;

  const [rates, settings, listBcv] = await Promise.all([
    getDailyRates(db, storeId, today),
    getStoreSettings(db, storeId),
    bcvBehindList(db, storeId, current.list),
  ]);
  const saleRate = rates.sale;
  const proposed =
    saleRate !== null && compareDecimals(current.list.saleRate, saleRate) !== 0
      ? proposeSaleRateList(
          current.lines.map((line) => ({ priceUsd: line.priceUsd, priceBs: line.priceBs })),
          saleRate,
          settings.bsRoundingStep,
        )
      : undefined;
  const bcvChanged =
    listBcv !== null && rates.bcv !== null && compareDecimals(listBcv, rates.bcv) !== 0;

  return {
    currentSaleRate: current.list.saleRate,
    proposedSaleRate: proposed && saleRate ? saleRate : null,
    bcvChanged,
    lines: proposed
      ? current.lines.map((line, index) => ({
          id: line.id,
          productId: line.productId,
          productName: line.productName,
          saleUnit: line.saleUnit,
          unitCostUsd: line.unitCostUsd,
          margin: line.margin,
          priceUsd: line.priceUsd,
          priceBs: line.priceBs,
          proposedPriceBs: proposed[index]?.proposedPriceBs ?? line.priceBs,
          changed: proposed[index]?.changed ?? false,
        }))
      : [],
  };
}

/**
 * Publishes the proposed list: same products and USD prices, bolívares at today's sale rate.
 * The previous list stays. `today` is the business date whose sale rate is applied.
 * @throws PRICE_LIST_NOT_FOUND, SALE_RATE_MISSING, PRICE_PROPOSAL_UNCHANGED
 */
export async function publishSaleRateProposal(
  db: Database,
  actor: Actor,
  today: string,
): Promise<PriceList> {
  const preview = await getPriceProposal(db, actor.storeId, today);
  if (!preview) {
    throw new AppError(ErrorCode.PRICE_LIST_NOT_FOUND, "Todavía no hay lista de precios");
  }
  if (!preview.proposedSaleRate) {
    const rates = await getDailyRates(db, actor.storeId, today);
    if (!rates.sale) {
      throw new AppError(
        ErrorCode.SALE_RATE_MISSING,
        "Falta la tasa de venta de hoy. Anótala en Tasas del día.",
        undefined,
        { missing: ["sale"] },
      );
    }
    throw new AppError(
      ErrorCode.PRICE_PROPOSAL_UNCHANGED,
      "La tasa de hoy no cambia ningún precio en bolívares.",
    );
  }

  const saleRate = preview.proposedSaleRate;
  const settings = await getStoreSettings(db, actor.storeId);
  const publishedAt = new Date(`${today}T12:00:00.000Z`);
  const listId = await db.transaction(async (tx) => {
    const current = await requireCurrentPriceList(tx, actor.storeId);
    const proposed = proposeSaleRateList(
      current.lines.map((line) => ({ priceUsd: line.priceUsd, priceBs: line.priceBs })),
      saleRate,
      settings.bsRoundingStep,
    );
    if (!proposed) {
      throw new AppError(
        ErrorCode.PRICE_PROPOSAL_UNCHANGED,
        "La tasa de hoy no cambia ningún precio en bolívares.",
      );
    }
    const list = await insertList(tx, {
      storeId: actor.storeId,
      tripId: null,
      saleRate,
      status: "published",
      publishedAt,
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
    const rows = current.lines.map((line, index) => ({
      priceListId: list.id,
      productId: line.productId,
      unitCostUsd: line.unitCostUsd,
      margin: line.margin,
      priceUsd: line.priceUsd,
      priceBs: proposed[index]?.proposedPriceBs ?? line.priceBs,
      sourcePurchaseLineId: line.sourcePurchaseLineId,
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
    return list.id;
  });

  const lines = await findListLines(db, listId);
  const list = await findCurrentList(db, actor.storeId);
  if (!list || list.id !== listId) throw new Error("published price proposal was not stored");
  return toPriceListDto(list, lines);
}

/** BCV the published list was built against: the trip's rate, or the rate of the publish day. */
async function bcvBehindList(
  db: Executor,
  storeId: string,
  list: PriceListRecord,
): Promise<string | null> {
  if (list.tripId) {
    const trip = await findTrip(db, storeId, list.tripId);
    return trip?.bcvRate ?? null;
  }
  if (!list.publishedAt) return null;
  const rates = await getDailyRates(db, storeId, toBusinessDate(list.publishedAt));
  return rates.bcv;
}

function requiredReceived(
  line: LineRecord,
  field: "receivedUnitCostUsd" | "receivedSalePriceUsd",
): string {
  const value = line[field];
  if (!value) throw new Error(`partial line ${line.id} is missing ${field}`);
  return value;
}

// "Precio manual" (domain-model §3.4) ------------------------------------------------------------

/** What a purchase line cost per sale unit: the cost of what arrived on a partial receipt. */
function lastPurchaseCost(line: LastPurchaseRow): string {
  return line.receiptStatus === "partial" && line.receivedUnitCostUsd
    ? line.receivedUnitCostUsd
    : line.unitCostUsd;
}

function toManualRow(
  product: ManualProductRow,
  inForce: PriceListLineRow | undefined,
  lastPurchase: LastPurchaseRow | undefined,
): ManualPriceRow {
  return {
    productId: product.id,
    productName: product.name,
    saleUnit: product.saleUnit,
    lastPurchase: lastPurchase
      ? { ...purchasePrice(lastPurchase), purchaseUnit: lastPurchase.purchaseUnit }
      : null,
    priceUsd: inForce?.priceUsd ?? null,
    priceBs: inForce?.priceBs ?? null,
    shareOnWhatsapp: product.shareOnWhatsapp,
  };
}

/** The list in force and the rate that turns typed bolívares into dollars. */
async function manualContext(db: Executor, storeId: string, today: string) {
  const current = await getCurrentPriceList(db, storeId);
  const saleRate = current?.list.saleRate ?? (await getDailyRates(db, storeId, today)).sale;
  return { current, saleRate };
}

/**
 * Every active product with what its last purchase cost per crate, bundle or kilo and the price
 * in force. `today` gives the sale rate when there is no list yet.
 */
export async function listManualPrices(
  db: Database,
  storeId: string,
  today: string,
): Promise<ManualPriceList> {
  const [{ current, saleRate }, products, purchases] = await Promise.all([
    manualContext(db, storeId, today),
    findActiveProducts(db),
    findLastPurchases(db, storeId),
  ]);
  const inForce = new Map((current?.lines ?? []).map((line) => [line.productId, line]));
  const lastPurchase = new Map(purchases.map((line) => [line.productId, line]));
  return {
    saleRate,
    data: products.map((product) =>
      toManualRow(product, inForce.get(product.id), lastPurchase.get(product.id)),
    ),
  };
}

/**
 * Sets one product's shelf price in bolívares, typed by the owner. Publishes a new list: the one
 * in force with that product changed (or added). Bs are stored as typed (no rounding); dollars
 * are Bs / the list's sale rate, so no other price moves. The margin is the one the price gives
 * over the cost, kept only within 0–500 %. Saving the same price publishes nothing.
 * The new list and the changed line are audited (the other lines are copies).
 * @throws AppError PRODUCT_NOT_FOUND (missing or inactive), SALE_RATE_MISSING (no list and no
 *   sale rate today)
 */
export async function setManualPrice(
  db: Database,
  actor: Actor,
  productId: string,
  priceBs: string,
  today: string,
  now: Date,
): Promise<ManualPriceRow> {
  const product = await findProduct(db, productId);
  if (!product?.isActive) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, "El producto no existe");

  await db.transaction(async (tx) => {
    const { current, saleRate } = await manualContext(tx, actor.storeId, today);
    if (!saleRate) {
      throw new AppError(
        ErrorCode.SALE_RATE_MISSING,
        "Falta la tasa de venta de hoy. Anótala en Tasas del día.",
        undefined,
        { missing: ["sale"] },
      );
    }
    const lines = current?.lines ?? [];
    const before = lines.find((line) => line.productId === productId);
    if (before && compareDecimals(before.priceBs, priceBs) === 0) return;

    const [lastPurchase] = await findLastPurchases(tx, actor.storeId, productId);
    const unitCostUsd =
      before?.unitCostUsd ?? (lastPurchase ? lastPurchaseCost(lastPurchase) : null);
    const priceUsd = amountInUsd(priceBs, saleRate);
    const changed = {
      productId,
      unitCostUsd,
      margin: storableMargin(unitCostUsd === null ? null : impliedMargin(priceUsd, unitCostUsd)),
      priceUsd,
      priceBs,
      sourcePurchaseLineId: before ? before.sourcePurchaseLineId : (lastPurchase?.id ?? null),
    };

    // The newest list is the one in force; a proposal is stamped at noon of its day.
    const after = current?.list.publishedAt;
    const publishedAt =
      after && after.getTime() >= now.getTime() ? new Date(after.getTime() + 1) : now;
    const list = await insertList(tx, {
      storeId: actor.storeId,
      tripId: null,
      saleRate,
      status: "published",
      publishedAt,
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
    const copies = lines
      .filter((line) => line.productId !== productId)
      .map((line) => ({
        productId: line.productId,
        unitCostUsd: line.unitCostUsd,
        margin: line.margin,
        priceUsd: line.priceUsd,
        priceBs: line.priceBs,
        sourcePurchaseLineId: line.sourcePurchaseLineId,
      }));
    const inserted = await insertListLines(
      tx,
      [...copies, changed].map((line) => ({
        ...line,
        priceListId: list.id,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })),
    );
    const row = inserted.find((line) => line.productId === productId);
    if (!row) throw new Error("manual price line was not stored");
    await recordAudit(tx, actor, {
      tableName: LINE_TABLE,
      recordId: row.id,
      action: "insert",
      changes: { ...row, previousPriceBs: before?.priceBs ?? null },
    });
  });

  const rows = await listManualPrices(db, actor.storeId, today);
  const row = rows.data.find((line) => line.productId === productId);
  if (!row) throw new Error("manual price row vanished");
  return row;
}
