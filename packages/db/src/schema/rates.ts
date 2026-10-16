import { relations, sql } from "drizzle-orm";
import { check, date, index, pgTable, unique, uuid } from "drizzle-orm/pg-core";

import { exchangeRateKind } from "./_enums";
import { auditColumns, id, rate, timestamps } from "./_shared";
import { stores } from "./organization";

/**
 * Daily rates. The BCV rate is official and global (store_id NULL); the sale rate belongs to a
 * store. `value` is Bs per USD.
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: id(),
    storeId: uuid("store_id").references(() => stores.id),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    kind: exchangeRateKind("kind").notNull(),
    value: rate("value").notNull(),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    // NULLS NOT DISTINCT: without it two global BCV rows (store_id NULL) for the same day
    // would not collide.
    unique("exchange_rates_store_id_business_date_kind_key")
      .on(t.storeId, t.businessDate, t.kind)
      .nullsNotDistinct(),
    index("exchange_rates_business_date_idx").on(t.businessDate),
    check("exchange_rates_value_check", sql`${t.value} > 0`),
    // BCV rows are global; sale rows always belong to a store.
    check("exchange_rates_store_scope_check", sql`(${t.kind} = 'bcv') = (${t.storeId} IS NULL)`),
  ],
);

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  store: one(stores, { fields: [exchangeRates.storeId], references: [stores.id] }),
}));
