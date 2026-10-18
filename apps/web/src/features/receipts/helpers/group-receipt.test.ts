import type { ReceiptLine, ReceiptTrip } from "@ta/validators";
import { describe, expect, it } from "vitest";

import { groupReceipt } from "@/features/receipts/helpers/group-receipt";

const line = (
  patch: Partial<ReceiptLine> & Pick<ReceiptLine, "id" | "receiptStatus">,
): ReceiptLine => ({
  productName: patch.id,
  purchaseUnit: "crate",
  saleUnit: "kg",
  packs: "1.0000",
  grossQuantity: "24.0000",
  supplierName: null,
  stallReference: null,
  receivedPacks: null,
  receivedQuantity: null,
  receiptNote: null,
  receivedAt: null,
  quotedPriceUsd: null,
  createdAt: "2026-10-16T10:00:00.000Z",
  ...patch,
});

const trip = (lines: ReceiptLine[]): ReceiptTrip => ({
  id: "01a14314-2825-7000-a1d1-bdf734d059a0",
  businessDate: "2026-10-16",
  note: null,
  toBuy: [{ id: "01a14314-2825-7000-a1d1-bdf734d059b0", productName: "Cebolla", note: null }],
  lines,
});

describe("groupReceipt", () => {
  it("puts still-to-buy and on-the-way above what already arrived", () => {
    const board = groupReceipt(
      trip([
        line({ id: "received", receiptStatus: "received", createdAt: "2026-10-16T08:00:00.000Z" }),
        line({ id: "late", receiptStatus: "pending", createdAt: "2026-10-16T12:00:00.000Z" }),
        line({ id: "partial", receiptStatus: "partial", createdAt: "2026-10-16T09:00:00.000Z" }),
        line({ id: "early", receiptStatus: "pending", createdAt: "2026-10-16T07:00:00.000Z" }),
        line({ id: "missing", receiptStatus: "missing", createdAt: "2026-10-16T11:00:00.000Z" }),
      ]),
    );

    expect(board.toBuy.map((item) => item.productName)).toEqual(["Cebolla"]);
    expect(board.onTheWay.map((item) => item.id)).toEqual(["early", "late"]);
    expect(board.missing.map((item) => item.id)).toEqual(["missing"]);
    expect(board.arrived.map((item) => item.id)).toEqual(["partial", "received"]);
  });
});
