import {
  amountInBs,
  InvalidReceiptError,
  InvalidValueError,
  priceLine,
  pricePartialReceipt,
  ShrinkageExceedsQuantityError,
  sumDecimals,
} from "@ta/core";
import type { Database, Executor } from "@ta/db";
import {
  message,
  SHRINKAGE_BELOW_GROSS_MESSAGE,
  type OpenTrip,
  type SetReceipt,
  type Paginated,
  type PurchaseLineFields,
  type TripListQuery,
  type UpdatePurchaseLine,
} from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";
import { getDailyRates } from "@/modules/exchange-rates/exchange-rates.service";
import { publishFromTrip } from "@/modules/price-lists/price-lists.service";
import { findProduct, rememberPurchaseDefaults } from "@/modules/products/products.service";
import { getStoreSettings } from "@/modules/settings/settings.service";
import { claimOpenItem, releaseItemsForLine } from "@/modules/shopping-list/shopping-list.service";
import { getSupplier } from "@/modules/suppliers/suppliers.service";

import {
  deleteLineById,
  findLine,
  findLineAmounts,
  findOpenTrips,
  findTrip,
  findTripLines,
  findTrips,
  insertLine,
  insertTrip,
  updateLineById,
  updateTripById,
  type LineInsert,
  type LineRecord,
  type LineRow,
  type TripRow,
} from "./purchases.repository";

export type TripWithLines = TripRow & { lines: LineRow[] };

const FIELD_MESSAGES: Record<string, string> = {
  margin: "El margen debe estar entre 0 % y 500 %",
  quotedPriceUsd: "El precio no puede ser menor que 0",
  supplierRate: "La tasa debe ser mayor que 0",
  grossQuantity: "La cantidad bruta debe ser mayor que 0",
};

function invalidLine(fieldErrors: Record<string, string[]>): AppError {
  return new AppError(ErrorCode.INVALID_PURCHASE_LINE, "Revisa los datos de la compra", undefined, {
    fieldErrors,
  });
}

async function requireTrip(db: Executor, storeId: string, id: string): Promise<TripRow> {
  const trip = await findTrip(db, storeId, id);
  if (!trip) throw new AppError(ErrorCode.TRIP_NOT_FOUND, "La jornada de compra no existe");
  return trip;
}

async function requireOpenTrip(db: Executor, storeId: string, id: string): Promise<TripRow> {
  const trip = await requireTrip(db, storeId, id);
  if (trip.status !== "open") {
    throw new AppError(ErrorCode.TRIP_CLOSED, "La jornada está cerrada: ya no se puede modificar");
  }
  return trip;
}

/** Product and supplier referenced by a line must exist (and the product be active). */
async function checkReferences(
  db: Executor,
  productId: string,
  supplierId: string | null | undefined,
) {
  const product = await findProduct(db, productId);
  if (!product || !product.isActive) {
    throw new AppError(
      ErrorCode.LINE_PRODUCT_INVALID,
      "El producto no existe o está inactivo",
      undefined,
      { fieldErrors: { productId: ["El producto no existe o está inactivo"] } },
    );
  }
  const supplier = supplierId ? await getSupplier(db, supplierId) : undefined;
  if (supplierId && !supplier) {
    throw new AppError(ErrorCode.SUPPLIER_NOT_FOUND, "El proveedor no existe", undefined, {
      fieldErrors: { supplierId: ["El proveedor no existe"] },
    });
  }
  return { product, supplier };
}

type LineValues = {
  quotedPriceUsd: string;
  grossQuantity: string;
  shrinkage: string;
  supplierRate: string;
  margin: string;
};

/** Costs of a line with @ta/core; domain errors become 422 with field messages. */
function computeLine(values: LineValues, bcvRate: string, usdRoundingStep: string) {
  try {
    const pricing = priceLine({ ...values, bcvRate, usdRoundingStep });
    return { ...pricing, amountBs: amountInBs(values.quotedPriceUsd, values.supplierRate) };
  } catch (error) {
    if (error instanceof ShrinkageExceedsQuantityError) {
      throw invalidLine({ shrinkage: [SHRINKAGE_BELOW_GROSS_MESSAGE] });
    }
    if (error instanceof InvalidValueError) {
      throw invalidLine({ [error.field]: [FIELD_MESSAGES[error.field] ?? "Valor inválido"] });
    }
    throw error;
  }
}

/** Recomputes Σ real cost (USD) and Σ amount paid (Bs) of the trip and stores them. */
async function refreshTotals(tx: Executor, actor: Actor, tripId: string): Promise<void> {
  const amounts = await findLineAmounts(tx, tripId);
  await updateTripById(tx, tripId, {
    totalUsd: sumDecimals(amounts.map((a) => a.realCostUsd)),
    totalBs: sumDecimals(amounts.map((a) => a.amountBs)),
    updatedBy: actor.userId,
  });
}

/**
 * Opens a purchase trip for a business day, copying that day's BCV and Coche rates (set in
 * "Tasas del día"). The copy keeps the trip's costs stable if the day's rates are corrected.
 * @throws AppError DAY_RATES_MISSING when the BCV or the Coche rate of the day is not set.
 */
export async function openTrip(db: Database, actor: Actor, input: OpenTrip): Promise<TripRow> {
  const rates = await getDailyRates(db, actor.storeId, input.businessDate);
  const missing = (["bcv", "market"] as const).filter((kind) => rates[kind] === null);
  if (!rates.bcv || !rates.market) {
    throw new AppError(
      ErrorCode.DAY_RATES_MISSING,
      "Registra la tasa BCV y la tasa de Coche del día antes de abrir la jornada",
      undefined,
      { missing },
    );
  }
  const { bcv, market } = rates;
  const id = await db.transaction(async (tx) => {
    const trip = await insertTrip(tx, {
      storeId: actor.storeId,
      businessDate: input.businessDate,
      bcvRate: bcv,
      marketRate: market,
      note: input.note || null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "purchase_trips",
      recordId: trip.id,
      action: "insert",
      changes: trip,
    });
    return trip.id;
  });
  return requireTrip(db, actor.storeId, id);
}

/** The store's trips, newest first. */
export async function listTrips(
  db: Database,
  storeId: string,
  query: TripListQuery,
): Promise<Paginated<TripRow>> {
  const { rows, total } = await findTrips(db, storeId, query);
  return { data: rows, total, page: query.page, pageSize: query.pageSize };
}

/** A trip with its lines. @throws AppError TRIP_NOT_FOUND */
export async function getTrip(db: Database, storeId: string, id: string): Promise<TripWithLines> {
  const trip = await requireTrip(db, storeId, id);
  return { ...trip, lines: await findTripLines(db, id) };
}

/**
 * Closes an open trip and publishes sale prices for what can be sold (domain-model §3.4).
 * Needs the day's sale rate. @throws TRIP_NOT_FOUND, TRIP_CLOSED, SALE_RATE_MISSING
 */
export async function closeTrip(db: Database, actor: Actor, id: string): Promise<TripWithLines> {
  const before = await requireOpenTrip(db, actor.storeId, id);
  const rates = await getDailyRates(db, actor.storeId, before.businessDate);
  const saleRate = rates.sale;
  if (!saleRate) {
    throw new AppError(
      ErrorCode.SALE_RATE_MISSING,
      "Falta la tasa de venta de ese día. Anótala en Tasas del día antes de cerrar.",
      undefined,
      { missing: ["sale"] },
    );
  }
  const settings = await getStoreSettings(db, actor.storeId);
  const now = new Date();
  await db.transaction(async (tx) => {
    const after = await updateTripById(tx, id, { status: "closed", updatedBy: actor.userId });
    await recordAudit(tx, actor, {
      tableName: "purchase_trips",
      recordId: id,
      action: "update",
      changes: diffChanges(before, after),
    });
    const lines = await findTripLines(tx, id);
    await publishFromTrip(tx, actor, {
      tripId: id,
      lines,
      saleRate,
      bsRoundingStep: settings.bsRoundingStep,
      now,
    });
  });
  return getTrip(db, actor.storeId, id);
}

/**
 * Adds a line bought at a stall (domain-model §3.2). Defaults: supplier rate = trip's Coche
 * rate, margin = product's last margin. Costs come from @ta/core; the product remembers the
 * shrinkage and margin; the trip totals are recomputed. One transaction, audited.
 * @throws AppError TRIP_NOT_FOUND, TRIP_CLOSED, LINE_PRODUCT_INVALID, SUPPLIER_NOT_FOUND,
 *   INVALID_PURCHASE_LINE
 */
export async function addLine(
  db: Database,
  actor: Actor,
  tripId: string,
  input: PurchaseLineFields,
): Promise<TripWithLines> {
  const trip = await requireOpenTrip(db, actor.storeId, tripId);
  const { product, supplier } = await checkReferences(db, input.productId, input.supplierId);
  const settings = await getStoreSettings(db, actor.storeId);

  const values: LineValues = {
    quotedPriceUsd: input.quotedPriceUsd,
    grossQuantity: input.grossQuantity,
    shrinkage: input.shrinkage,
    supplierRate: input.supplierRate ?? trip.marketRate,
    margin: input.margin ?? product.lastMargin,
  };
  const computed = computeLine(values, trip.bcvRate, settings.usdRoundingStep);

  await db.transaction(async (tx) => {
    const line = await insertLine(tx, {
      tripId,
      productId: product.id,
      purchaseUnit: product.purchaseUnit,
      supplierId: supplier?.id ?? null,
      stallReference: input.stallReference || supplier?.stallReference || null,
      packs: input.packs,
      paymentStatus: input.paymentStatus,
      ...values,
      ...computed,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "purchase_lines",
      recordId: line.id,
      action: "insert",
      changes: line,
    });
    await rememberPurchaseDefaults(tx, actor, product.id, {
      lastShrinkage: values.shrinkage,
      lastMargin: values.margin,
    });
    await claimOpenItem(tx, actor, product.id, line.id);
    await refreshTotals(tx, actor, tripId);
  });
  return getTrip(db, actor.storeId, tripId);
}

/** Corrects a line of an open trip and recomputes it. Same rules and side effects as addLine. */
export async function updateLine(
  db: Database,
  actor: Actor,
  tripId: string,
  lineId: string,
  patch: UpdatePurchaseLine,
): Promise<TripWithLines> {
  const trip = await requireOpenTrip(db, actor.storeId, tripId);
  const before = await findLine(db, tripId, lineId);
  if (!before) throw new AppError(ErrorCode.LINE_NOT_FOUND, "La línea de compra no existe");

  const productId = patch.productId ?? before.productId;
  const supplierId = patch.supplierId !== undefined ? patch.supplierId : before.supplierId;
  const { product, supplier } = await checkReferences(db, productId, supplierId);
  const settings = await getStoreSettings(db, actor.storeId);

  const values: LineValues = {
    quotedPriceUsd: patch.quotedPriceUsd ?? before.quotedPriceUsd,
    grossQuantity: patch.grossQuantity ?? before.grossQuantity,
    shrinkage: patch.shrinkage ?? before.shrinkage,
    supplierRate: patch.supplierRate ?? before.supplierRate,
    margin: patch.margin ?? before.margin,
  };
  const computed = computeLine(values, trip.bcvRate, settings.usdRoundingStep);
  const packs = patch.packs ?? before.packs;
  const update: Partial<LineInsert> = {
    productId: product.id,
    purchaseUnit: product.purchaseUnit,
    supplierId: supplier?.id ?? null,
    stallReference:
      patch.stallReference !== undefined ? patch.stallReference || null : before.stallReference,
    packs,
    paymentStatus: patch.paymentStatus ?? before.paymentStatus,
    ...values,
    ...computed,
    ...receiptAfterEdit(
      before,
      { ...values, ...computed, productId: product.id, packs },
      {
        bcvRate: trip.bcvRate,
        usdRoundingStep: settings.usdRoundingStep,
      },
    ),
    updatedBy: actor.userId,
  };

  await db.transaction(async (tx) => {
    const after = await updateLineById(tx, lineId, update);
    await recordAudit(tx, actor, {
      tableName: "purchase_lines",
      recordId: lineId,
      action: "update",
      changes: diffChanges(before, after),
    });
    await rememberPurchaseDefaults(tx, actor, product.id, {
      lastShrinkage: values.shrinkage,
      lastMargin: values.margin,
    });
    if (product.id !== before.productId) {
      await releaseItemsForLine(tx, actor, lineId);
      await claimOpenItem(tx, actor, product.id, lineId);
    }
    await refreshTotals(tx, actor, tripId);
  });
  return getTrip(db, actor.storeId, tripId);
}

/** Removes a line typed by mistake (open trips only); totals are recomputed. */
export async function deleteLine(
  db: Database,
  actor: Actor,
  tripId: string,
  lineId: string,
): Promise<TripWithLines> {
  await requireOpenTrip(db, actor.storeId, tripId);
  const line: LineRecord | undefined = await findLine(db, tripId, lineId);
  if (!line) throw new AppError(ErrorCode.LINE_NOT_FOUND, "La línea de compra no existe");

  await db.transaction(async (tx) => {
    await releaseItemsForLine(tx, actor, lineId);
    await deleteLineById(tx, lineId);
    await recordAudit(tx, actor, {
      tableName: "purchase_lines",
      recordId: lineId,
      action: "delete",
      changes: line,
    });
    await refreshTotals(tx, actor, tripId);
  });
  return getTrip(db, actor.storeId, tripId);
}

// Truck receipt (domain-model §4) ------------------------------------------------------------------

const NO_RECEIPT = {
  receiptStatus: "pending",
  receivedPacks: null,
  receivedQuantity: null,
  receivedBy: null,
  receivedAt: null,
  receiptNote: null,
  receivedUsableQuantity: null,
  receivedUnitCostUsd: null,
  receivedSalePriceUsd: null,
} as const satisfies Partial<LineInsert>;

type PricingContext = { bcvRate: string; usdRoundingStep: string };

/** Received costs of a partial receipt, or the 422 a receiver can fix (range of the packs). */
function partialCosts(
  line: LineValues & { packs: string },
  receivedPacks: string,
  receivedQuantity: string | undefined,
  context: PricingContext,
) {
  try {
    return pricePartialReceipt({
      ...line,
      ...context,
      packs: line.packs,
      receivedPacks,
      receivedQuantity,
    });
  } catch (error) {
    if (error instanceof InvalidReceiptError) {
      const key =
        error.field === "receivedPacks"
          ? "receipt.receivedPacksRange"
          : "receipt.receivedQuantityRange";
      throw new AppError(ErrorCode.INVALID_RECEIPT, "Revisa lo que llegó", undefined, {
        fieldErrors: { [error.field]: [message(key)] },
      });
    }
    throw error;
  }
}

/**
 * The receipt after the owner edits a line: what was bought changed (product, packs, gross,
 * shrinkage) → it must be checked again (back to pending); only prices changed → a partial
 * receipt is re-costed with the same received packs and weight; otherwise it stays.
 */
function receiptAfterEdit(
  before: LineRecord,
  after: LineValues & { productId: string; packs: string },
  context: PricingContext,
): Partial<LineInsert> {
  if (before.receiptStatus === "pending") return {};
  const boughtChanged =
    after.productId !== before.productId ||
    after.packs !== before.packs ||
    after.grossQuantity !== before.grossQuantity ||
    after.shrinkage !== before.shrinkage;
  if (boughtChanged) return NO_RECEIPT;
  if (before.receiptStatus !== "partial" || !before.receivedPacks) return {};
  const costs = partialCosts(
    after,
    before.receivedPacks,
    before.receivedQuantity ?? undefined,
    context,
  );
  return {
    receivedUsableQuantity: costs.receivedUsableQuantity,
    receivedUnitCostUsd: costs.receivedUnitCostUsd,
    receivedSalePriceUsd: costs.receivedSalePriceUsd,
  };
}

/** Receipt columns for a status chosen at the truck. */
function receiptUpdate(
  line: LineRecord,
  input: SetReceipt,
  actor: Actor,
  now: Date,
  context: PricingContext,
): Partial<LineInsert> {
  if (input.status === "pending") return NO_RECEIPT;
  const marked = {
    ...NO_RECEIPT,
    receiptStatus: input.status,
    receivedBy: actor.userId,
    receivedAt: now,
    receiptNote: input.note || null,
  };
  if (input.status === "received") {
    return { ...marked, receivedPacks: line.packs, receivedQuantity: line.grossQuantity };
  }
  if (input.status === "missing") return { ...marked, receivedPacks: "0", receivedQuantity: "0" };

  const costs = partialCosts(line, input.receivedPacks, input.receivedQuantity, context);
  return {
    ...marked,
    receivedPacks: input.receivedPacks,
    receivedQuantity: costs.receivedQuantity,
    receivedUsableQuantity: costs.receivedUsableQuantity,
    receivedUnitCostUsd: costs.receivedUnitCostUsd,
    receivedSalePriceUsd: costs.receivedSalePriceUsd,
  };
}

/**
 * Marks what arrived at the truck for one line (owner or receiver; open trips only). A partial
 * receipt keeps what was paid and re-costs the line with what arrived (`pricePartialReceipt`);
 * "pending" undoes a mark. Trip totals do not change: they are what was paid.
 * @throws AppError TRIP_NOT_FOUND, TRIP_CLOSED, LINE_NOT_FOUND, INVALID_RECEIPT (422).
 */
export async function setLineReceipt(
  db: Database,
  actor: Actor,
  tripId: string,
  lineId: string,
  input: SetReceipt,
  now: Date,
): Promise<TripWithLines> {
  const trip = await requireOpenTrip(db, actor.storeId, tripId);
  const before = await findLine(db, tripId, lineId);
  if (!before) throw new AppError(ErrorCode.LINE_NOT_FOUND, "La línea de compra no existe");
  const settings = await getStoreSettings(db, actor.storeId);
  const update = receiptUpdate(before, input, actor, now, {
    bcvRate: trip.bcvRate,
    usdRoundingStep: settings.usdRoundingStep,
  });

  await db.transaction(async (tx) => {
    const after = await updateLineById(tx, lineId, { ...update, updatedBy: actor.userId });
    await recordAudit(tx, actor, {
      tableName: "purchase_lines",
      recordId: lineId,
      action: "update",
      changes: diffChanges(before, after),
    });
  });
  return getTrip(db, actor.storeId, tripId);
}

/** The store's open trips with their lines, newest first (the truck receipt screen). */
export async function listOpenTrips(db: Database, storeId: string): Promise<TripWithLines[]> {
  const trips = await findOpenTrips(db, storeId);
  return Promise.all(
    trips.map(async (trip) => ({ ...trip, lines: await findTripLines(db, trip.id) })),
  );
}
