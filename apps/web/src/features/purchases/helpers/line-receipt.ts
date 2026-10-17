import type { PurchaseLine, TripDetail } from "@ta/validators";

/** Purchases not yet checked at the truck. */
export function countPendingReceipt(trip: TripDetail): number {
  return trip.lines.filter((line) => line.receiptStatus === "pending").length;
}

/** Unit cost and sale price that apply: of what arrived for a partial receipt, else as bought. */
export function effectiveCosts(line: PurchaseLine): { unitCostUsd: string; salePriceUsd: string } {
  return {
    unitCostUsd: line.receivedUnitCostUsd ?? line.unitCostUsd,
    salePriceUsd: line.receivedSalePriceUsd ?? line.salePriceUsd,
  };
}
