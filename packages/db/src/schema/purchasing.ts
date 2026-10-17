import { relations, sql } from "drizzle-orm";
import { check, date, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import {
  paymentStatus,
  purchaseTripStatus,
  purchaseUnit,
  receiptStatus,
  shoppingListItemStatus,
  supplierClaimStatus,
} from "./_enums";
import { auditColumns, id, money, quantity, rate, ratio, timestamps } from "./_shared";
import { users } from "./auth";
import { products, suppliers } from "./catalog";
import { stores } from "./organization";

/** One visit to the wholesale market (Monday / Thursday). */
export const purchaseTrips = pgTable(
  "purchase_trips",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    bcvRate: rate("bcv_rate").notNull(),
    /** Coche market rate of the day; default supplier rate of the lines (copied at opening). */
    marketRate: rate("market_rate").notNull(),
    status: purchaseTripStatus("status").notNull().default("open"),
    totalUsd: money("total_usd").notNull().default("0"),
    totalBs: money("total_bs").notNull().default("0"),
    note: text("note"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("purchase_trips_store_id_idx").on(t.storeId),
    index("purchase_trips_business_date_idx").on(t.businessDate),
    check("purchase_trips_bcv_rate_check", sql`${t.bcvRate} > 0`),
    check("purchase_trips_market_rate_check", sql`${t.marketRate} > 0`),
    check("purchase_trips_amounts_check", sql`${t.totalUsd} >= 0 AND ${t.totalBs} >= 0`),
  ],
);

/**
 * One product bought at one stall. Supplier, supplier rate and payment status live here because
 * every line can come from a different stall (domain-model §4).
 *
 * - `quoted_price_usd` is the TOTAL of the line (3 crates at 20 USD → 60).
 * - `amount_bs` is what is paid to the stall: quoted_price_usd × supplier_rate.
 * - `real_cost_usd` = quoted_price_usd × supplier_rate / bcv_rate (computed in @ta/core).
 * - Quantities and shrinkage are in the product's sale unit.
 */
export const purchaseLines = pgTable(
  "purchase_lines",
  {
    id: id(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => purchaseTrips.id),
    /** Nullable: a stall not registered yet is identified by `stall_reference` only. */
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    stallReference: text("stall_reference"),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** Snapshot of the product's unit at purchase time. */
    purchaseUnit: purchaseUnit("purchase_unit").notNull(),
    packs: quantity("packs").notNull(),
    grossQuantity: quantity("gross_quantity").notNull(),
    shrinkage: quantity("shrinkage").notNull().default("0"),
    usableQuantity: quantity("usable_quantity").notNull(),
    quotedPriceUsd: money("quoted_price_usd").notNull(),
    amountBs: money("amount_bs").notNull(),
    supplierRate: rate("supplier_rate").notNull(),
    realCostUsd: money("real_cost_usd").notNull(),
    unitCostUsd: money("unit_cost_usd").notNull(),
    margin: ratio("margin").notNull(),
    salePriceUsd: money("sale_price_usd").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull(),
    receiptStatus: receiptStatus("receipt_status").notNull().default("pending"),
    receivedPacks: quantity("received_packs"),
    receivedQuantity: quantity("received_quantity"),
    receivedBy: uuid("received_by").references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    receiptNote: text("receipt_note"),
    /**
     * Partial receipt only: the cost of what arrived (domain-model §3.2). The purchase-time
     * usable quantity, unit cost and sale price above keep what was bought.
     */
    receivedUsableQuantity: quantity("received_usable_quantity"),
    receivedUnitCostUsd: money("received_unit_cost_usd"),
    receivedSalePriceUsd: money("received_sale_price_usd"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("purchase_lines_trip_id_idx").on(t.tripId),
    index("purchase_lines_supplier_id_idx").on(t.supplierId),
    index("purchase_lines_product_id_idx").on(t.productId),
    index("purchase_lines_received_by_idx").on(t.receivedBy),
    check("purchase_lines_packs_check", sql`${t.packs} > 0`),
    check("purchase_lines_gross_quantity_check", sql`${t.grossQuantity} > 0`),
    check(
      "purchase_lines_shrinkage_check",
      sql`${t.shrinkage} >= 0 AND ${t.shrinkage} < ${t.grossQuantity}`,
    ),
    check(
      "purchase_lines_usable_quantity_check",
      sql`${t.usableQuantity} = ${t.grossQuantity} - ${t.shrinkage}`,
    ),
    check(
      "purchase_lines_amounts_check",
      sql`${t.quotedPriceUsd} >= 0 AND ${t.amountBs} >= 0 AND ${t.realCostUsd} >= 0
        AND ${t.unitCostUsd} >= 0 AND ${t.salePriceUsd} >= 0`,
    ),
    check("purchase_lines_supplier_rate_check", sql`${t.supplierRate} > 0`),
    check("purchase_lines_margin_check", sql`${t.margin} >= 0 AND ${t.margin} <= 5`),
    check(
      "purchase_lines_received_packs_check",
      sql`${t.receivedPacks} IS NULL OR (${t.receivedPacks} >= 0 AND ${t.receivedPacks} <= ${t.packs})`,
    ),
    check(
      "purchase_lines_received_costs_check",
      sql`(${t.receiptStatus} = 'partial'
          AND ${t.receivedUsableQuantity} IS NOT NULL AND ${t.receivedUsableQuantity} > 0
          AND ${t.receivedUnitCostUsd} IS NOT NULL AND ${t.receivedUnitCostUsd} >= 0
          AND ${t.receivedSalePriceUsd} IS NOT NULL AND ${t.receivedSalePriceUsd} >= 0)
        OR (${t.receiptStatus} <> 'partial' AND ${t.receivedUsableQuantity} IS NULL
          AND ${t.receivedUnitCostUsd} IS NULL AND ${t.receivedSalePriceUsd} IS NULL)`,
    ),
    check(
      "purchase_lines_received_quantity_check",
      sql`${t.receivedQuantity} IS NULL
        OR (${t.receivedQuantity} >= 0 AND ${t.receivedQuantity} <= ${t.grossQuantity})`,
    ),
  ],
);

/** Claim to a stall for goods marked partial or missing. At most one per purchase line. */
export const supplierClaims = pgTable(
  "supplier_claims",
  {
    id: id(),
    purchaseLineId: uuid("purchase_line_id")
      .notNull()
      .references(() => purchaseLines.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    missingPacks: quantity("missing_packs").notNull(),
    amountUsd: money("amount_usd").notNull(),
    status: supplierClaimStatus("status").notNull().default("open"),
    resolutionNote: text("resolution_note"),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    unique("supplier_claims_purchase_line_id_key").on(t.purchaseLineId),
    index("supplier_claims_supplier_id_idx").on(t.supplierId),
    check("supplier_claims_amounts_check", sql`${t.missingPacks} >= 0 AND ${t.amountUsd} >= 0`),
  ],
);

/** What the manager reports as missing before the Thursday trip. */
export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    note: text("note"),
    status: shoppingListItemStatus("status").notNull().default("open"),
    purchaseLineId: uuid("purchase_line_id").references(() => purchaseLines.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("shopping_list_items_store_id_idx").on(t.storeId),
    index("shopping_list_items_product_id_idx").on(t.productId),
    index("shopping_list_items_requested_by_idx").on(t.requestedBy),
    index("shopping_list_items_purchase_line_id_idx").on(t.purchaseLineId),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const purchaseTripsRelations = relations(purchaseTrips, ({ one, many }) => ({
  store: one(stores, { fields: [purchaseTrips.storeId], references: [stores.id] }),
  lines: many(purchaseLines),
}));

export const purchaseLinesRelations = relations(purchaseLines, ({ one }) => ({
  trip: one(purchaseTrips, { fields: [purchaseLines.tripId], references: [purchaseTrips.id] }),
  supplier: one(suppliers, { fields: [purchaseLines.supplierId], references: [suppliers.id] }),
  product: one(products, { fields: [purchaseLines.productId], references: [products.id] }),
  receiver: one(users, { fields: [purchaseLines.receivedBy], references: [users.id] }),
  claim: one(supplierClaims),
}));

export const supplierClaimsRelations = relations(supplierClaims, ({ one }) => ({
  purchaseLine: one(purchaseLines, {
    fields: [supplierClaims.purchaseLineId],
    references: [purchaseLines.id],
  }),
  supplier: one(suppliers, { fields: [supplierClaims.supplierId], references: [suppliers.id] }),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  store: one(stores, { fields: [shoppingListItems.storeId], references: [stores.id] }),
  product: one(products, { fields: [shoppingListItems.productId], references: [products.id] }),
  requester: one(users, { fields: [shoppingListItems.requestedBy], references: [users.id] }),
  purchaseLine: one(purchaseLines, {
    fields: [shoppingListItems.purchaseLineId],
    references: [purchaseLines.id],
  }),
}));

export const suppliersPurchasingRelations = relations(suppliers, ({ many }) => ({
  purchaseLines: many(purchaseLines),
  claims: many(supplierClaims),
}));

export const productsPurchasingRelations = relations(products, ({ many }) => ({
  purchaseLines: many(purchaseLines),
  shoppingListItems: many(shoppingListItems),
}));

export const storesPurchasingRelations = relations(stores, ({ many }) => ({
  purchaseTrips: many(purchaseTrips),
  shoppingListItems: many(shoppingListItems),
}));
