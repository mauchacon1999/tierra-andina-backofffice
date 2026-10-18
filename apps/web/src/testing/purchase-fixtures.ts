import type { Product, PurchaseLine, TripDetail } from "@ta/validators";

/* API-shaped data for purchase tests (decimals padded to 4 places, as the API returns them). */

export const TOMATO_PRODUCT: Product = {
  id: "01a14314-2825-7000-a1d1-bdf734d05981",
  name: "Tomate perita",
  categoryId: "01a14314-2825-7000-a1d1-bdf734d05982",
  categoryName: "Hortalizas",
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "24.0000",
  lastShrinkage: "2.0000",
  lastMargin: "0.5000",
  isActive: true,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
};

export const TOMATO_LINE: PurchaseLine = {
  id: "01a14314-2825-7000-a1d1-bdf734d05990",
  productId: TOMATO_PRODUCT.id,
  productName: TOMATO_PRODUCT.name,
  purchaseUnit: "crate",
  saleUnit: "kg",
  supplierId: null,
  supplierName: null,
  stallReference: "Puesto 14",
  packs: "1.0000",
  grossQuantity: "24.0000",
  shrinkage: "2.0000",
  usableQuantity: "22.0000",
  quotedPriceUsd: "20.0000",
  amountBs: "4020.0000",
  supplierRate: "201.0000",
  realCostUsd: "20.1000",
  unitCostUsd: "0.9136",
  margin: "0.5000",
  salePriceUsd: "1.4000",
  paymentStatus: "paid",
  receiptStatus: "pending",
  receivedPacks: null,
  receivedQuantity: null,
  receiptNote: null,
  receivedAt: null,
  receivedUsableQuantity: null,
  receivedUnitCostUsd: null,
  receivedSalePriceUsd: null,
  createdAt: "2026-10-16T10:00:00.000Z",
};

export const OPEN_TRIP: TripDetail = {
  id: "01a14314-2825-7000-a1d1-bdf734d059a0",
  kind: "market",
  supplierId: null,
  supplierName: null,
  businessDate: "2026-10-16",
  bcvRate: "200.0000",
  marketRate: "201.0000",
  status: "open",
  totalUsd: "0.0000",
  totalBs: "0.0000",
  note: null,
  lineCount: 0,
  createdAt: "2026-10-16T09:00:00.000Z",
  lines: [],
  payables: [],
};

export const SETTINGS_MOCK = {
  useSettings: () => ({
    settings: {
      usdRoundingStep: "0.05",
      bsRoundingStep: "1",
      saleRateMode: "manual",
      saleRateMarkupPct: "0",
      defaultMargin: "0.5",
      receiverCanSeePrices: false,
    },
    isLoaded: true,
    error: undefined,
  }),
};
