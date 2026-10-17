import type { PurchaseLine, ReceiptLine, ReceiptTrip, Trip, TripDetail } from "@ta/validators";

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
    receivedPacks: row.receivedPacks,
    receivedQuantity: row.receivedQuantity,
    receiptNote: row.receiptNote,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    receivedUsableQuantity: row.receivedUsableQuantity,
    receivedUnitCostUsd: row.receivedUnitCostUsd,
    receivedSalePriceUsd: row.receivedSalePriceUsd,
    createdAt: row.createdAt.toISOString(),
  };
}

/** A line for the truck receipt screen; `showPrices` false hides the price (receivers). */
export function toReceiptLineDto(row: LineRow, showPrices: boolean): ReceiptLine {
  return {
    id: row.id,
    productName: row.productName,
    purchaseUnit: row.purchaseUnit,
    saleUnit: row.saleUnit,
    packs: row.packs,
    grossQuantity: row.grossQuantity,
    supplierName: row.supplierName,
    stallReference: row.stallReference,
    receiptStatus: row.receiptStatus,
    receivedPacks: row.receivedPacks,
    receivedQuantity: row.receivedQuantity,
    receiptNote: row.receiptNote,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    quotedPriceUsd: showPrices ? row.quotedPriceUsd : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toReceiptTripDto(trip: TripWithLines, showPrices: boolean): ReceiptTrip {
  return {
    id: trip.id,
    businessDate: trip.businessDate,
    note: trip.note,
    lines: trip.lines.map((line) => toReceiptLineDto(line, showPrices)),
  };
}

export function toTripDetailDto(trip: TripWithLines): TripDetail {
  return { ...toTripDto(trip), lineCount: trip.lines.length, lines: trip.lines.map(toLineDto) };
}
