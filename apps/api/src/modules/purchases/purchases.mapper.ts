import type { PurchaseLine, Trip, TripDetail } from "@ta/validators";

import type { LineRow, TripRow } from "./purchases.repository";
import type { TripWithLines } from "./purchases.service";

export function toTripDto(row: TripRow): Trip {
  return {
    id: row.id,
    businessDate: row.businessDate,
    bcvRate: row.bcvRate,
    marketRate: row.marketRate,
    status: row.status,
    totalUsd: row.totalUsd,
    totalBs: row.totalBs,
    note: row.note,
    lineCount: row.lineCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toLineDto(row: LineRow): PurchaseLine {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    purchaseUnit: row.purchaseUnit,
    saleUnit: row.saleUnit,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    stallReference: row.stallReference,
    packs: row.packs,
    grossQuantity: row.grossQuantity,
    shrinkage: row.shrinkage,
    usableQuantity: row.usableQuantity,
    quotedPriceUsd: row.quotedPriceUsd,
    amountBs: row.amountBs,
    supplierRate: row.supplierRate,
    realCostUsd: row.realCostUsd,
    unitCostUsd: row.unitCostUsd,
    margin: row.margin,
    salePriceUsd: row.salePriceUsd,
    paymentStatus: row.paymentStatus,
    receiptStatus: row.receiptStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toTripDetailDto(trip: TripWithLines): TripDetail {
  return { ...toTripDto(trip), lineCount: trip.lines.length, lines: trip.lines.map(toLineDto) };
}
