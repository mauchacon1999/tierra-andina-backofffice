import type { ReceiptLine, ReceiptTrip } from "@ta/validators";

export type ReceiptBoard = {
  /** Not bought yet. Shown first inside Pendientes. */
  toBuy: ReceiptTrip["toBuy"];
  /** Bought, receipt still pending. */
  onTheWay: ReceiptLine[];
  /** Marked missing: still not in the truck, so it stays with the pending block. */
  missing: ReceiptLine[];
  /** Arrived: incomplete first, then confirmed, each in purchase order. */
  arrived: ReceiptLine[];
};

const byPurchaseOrder = (a: ReceiptLine, b: ReceiptLine): number =>
  a.createdAt.localeCompare(b.createdAt);

/**
 * Splits one trip into the two blocks of the receipt screen: what has not arrived
 * (still to buy, on the way, did not arrive) and what has (incomplete, then received).
 */
export function groupReceipt(trip: ReceiptTrip): ReceiptBoard {
  const onTheWay: ReceiptLine[] = [];
  const missing: ReceiptLine[] = [];
  const arrived: ReceiptLine[] = [];
  for (const line of trip.lines) {
    if (line.receiptStatus === "pending") onTheWay.push(line);
    else if (line.receiptStatus === "missing") missing.push(line);
    else arrived.push(line);
  }
  onTheWay.sort(byPurchaseOrder);
  missing.sort(byPurchaseOrder);
  arrived.sort(
    (a, b) =>
      (a.receiptStatus === "partial" ? 0 : 1) - (b.receiptStatus === "partial" ? 0 : 1) ||
      byPurchaseOrder(a, b),
  );
  return { toBuy: trip.toBuy, onTheWay, missing, arrived };
}
