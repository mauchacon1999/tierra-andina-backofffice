import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { priceListStatus } from "./_enums";
import { auditColumns, id, money, rate, ratio, timestamps } from "./_shared";
import { users } from "./auth";
import { products } from "./catalog";
import { stores } from "./organization";
import { purchaseLines, purchaseTrips } from "./purchasing";

/**
 * Versioned sale price list. Published lists are never overwritten, so the price in force on
 * any date is known (domain-model §3.4).
 */
export const priceLists = pgTable(
  "price_lists",
  {
    id: id(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tripId: uuid("trip_id").references(() => purchaseTrips.id),
    saleRate: rate("sale_rate").notNull(),
    status: priceListStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("price_lists_store_id_idx").on(t.storeId),
    index("price_lists_trip_id_idx").on(t.tripId),
    index("price_lists_published_by_idx").on(t.publishedBy),
    check("price_lists_sale_rate_check", sql`${t.saleRate} > 0`),
    check(
      "price_lists_published_check",
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
  ],
);

/** One product's price in a list, in USD and Bs (Bs = price_usd × the list's sale_rate). */
export const priceListLines = pgTable(
  "price_list_lines",
  {
    id: id(),
    priceListId: uuid("price_list_id")
      .notNull()
      .references(() => priceLists.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    unitCostUsd: money("unit_cost_usd").notNull(),
    margin: ratio("margin").notNull(),
    priceUsd: money("price_usd").notNull(),
    priceBs: money("price_bs").notNull(),
    sourcePurchaseLineId: uuid("source_purchase_line_id").references(() => purchaseLines.id),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    // Also serves lookups by price_list_id (leading column).
    unique("price_list_lines_price_list_id_product_id_key").on(t.priceListId, t.productId),
    index("price_list_lines_product_id_idx").on(t.productId),
    index("price_list_lines_source_purchase_line_id_idx").on(t.sourcePurchaseLineId),
    check(
      "price_list_lines_amounts_check",
      sql`${t.unitCostUsd} >= 0 AND ${t.priceUsd} >= 0 AND ${t.priceBs} >= 0`,
    ),
    check("price_list_lines_margin_check", sql`${t.margin} >= 0 AND ${t.margin} <= 5`),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const priceListsRelations = relations(priceLists, ({ one, many }) => ({
  store: one(stores, { fields: [priceLists.storeId], references: [stores.id] }),
  trip: one(purchaseTrips, { fields: [priceLists.tripId], references: [purchaseTrips.id] }),
  publisher: one(users, { fields: [priceLists.publishedBy], references: [users.id] }),
  lines: many(priceListLines),
}));

export const priceListLinesRelations = relations(priceListLines, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceListLines.priceListId],
    references: [priceLists.id],
  }),
  product: one(products, { fields: [priceListLines.productId], references: [products.id] }),
  sourcePurchaseLine: one(purchaseLines, {
    fields: [priceListLines.sourcePurchaseLineId],
    references: [purchaseLines.id],
  }),
}));

export const productsPricingRelations = relations(products, ({ many }) => ({
  priceListLines: many(priceListLines),
}));

export const storesPricingRelations = relations(stores, ({ many }) => ({
  priceLists: many(priceLists),
}));
