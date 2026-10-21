import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { purchaseUnit, saleUnit, supplierKind } from "./_enums";
import { auditColumns, id, quantity, ratio, timestamps } from "./_shared";

/**
 * Product groups. `code` is the stable key used by code and the seed ("other" is the default
 * for quick create); `name` is the Spanish label shown in the UI.
 */
export const productCategories = pgTable(
  "product_categories",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [unique("product_categories_code_key").on(t.code)],
);

/**
 * One sellable item with one purchase unit and one sale unit (docs/modules/products.md).
 * Pack quantity and shrinkage are always expressed in the sale unit.
 */
export const products = pgTable(
  "products",
  {
    id: id(),
    name: text("name").notNull(),
    /** Lowercase, no accents, single spaces: "Cebollín" and "cebollin" collide. */
    normalizedName: text("normalized_name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id),
    purchaseUnit: purchaseUnit("purchase_unit").notNull(),
    saleUnit: saleUnit("sale_unit").notNull(),
    /** Approx. sale units per pack; required for crate/bundle, null for kg. */
    defaultPackQuantity: quantity("default_pack_quantity"),
    /** Suggestions for the purchase form, updated by the purchases module. */
    lastShrinkage: quantity("last_shrinkage").notNull().default("0"),
    lastMargin: ratio("last_margin").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    /** Goes in the price list copied for the WhatsApp group ("Precio manual"). */
    shareOnWhatsapp: boolean("share_on_whatsapp").notNull().default(false),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    unique("products_normalized_name_key").on(t.normalizedName),
    index("products_category_id_idx").on(t.categoryId),
    // Bought by kilo and sold by unit is not allowed until the owner confirms the rule.
    check(
      "products_unit_combination_check",
      sql`NOT (${t.purchaseUnit} = 'kg' AND ${t.saleUnit} = 'unit')`,
    ),
    // The explicit IS NOT NULL matters: `NULL > 0` is NULL, and a CHECK that evaluates to NULL
    // passes, so without it a crate/bundle product with no pack quantity would be accepted.
    check(
      "products_default_pack_quantity_check",
      sql`(${t.purchaseUnit} = 'kg' AND ${t.defaultPackQuantity} IS NULL)
        OR (${t.purchaseUnit} <> 'kg' AND ${t.defaultPackQuantity} IS NOT NULL
          AND ${t.defaultPackQuantity} > 0)`,
    ),
    check(
      "products_last_shrinkage_check",
      sql`${t.lastShrinkage} >= 0
        AND (${t.defaultPackQuantity} IS NULL OR ${t.lastShrinkage} < ${t.defaultPackQuantity})`,
    ),
    check("products_last_margin_check", sql`${t.lastMargin} >= 0 AND ${t.lastMargin} <= 5`),
  ],
);

/** Wholesale stalls at Coche and local suppliers (bread, bags, bananas). */
export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  kind: supplierKind("kind").notNull(),
  phone: text("phone"),
  stallReference: text("stall_reference"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
  ...auditColumns,
});

/**
 * A supplier's pago móvil account (docs/modules/payables.md). Stored the way the banks' "Pegar
 * datos" wants it: bank code of @ta/core VE_BANKS, 11-digit mobile phone, cédula/RIF with its
 * letter and no dots. The bank name is not stored: it comes from the code.
 */
export const supplierPaymentAccounts = pgTable(
  "supplier_payment_accounts",
  {
    id: id(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    bankCode: text("bank_code").notNull(),
    phone: text("phone").notNull(),
    idDocument: text("id_document").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...auditColumns,
  },
  (t) => [
    index("supplier_payment_accounts_supplier_id_idx").on(t.supplierId),
    unique("supplier_payment_accounts_supplier_id_bank_code_phone_key").on(
      t.supplierId,
      t.bankCode,
      t.phone,
    ),
    check("supplier_payment_accounts_bank_code_check", sql`${t.bankCode} ~ '^[0-9]{4}$'`),
    check("supplier_payment_accounts_phone_check", sql`${t.phone} ~ '^04[0-9]{9}$'`),
    check(
      "supplier_payment_accounts_id_document_check",
      sql`${t.idDocument} ~ '^[VEJGP][0-9]{5,9}$'`,
    ),
  ],
);

// Relations ------------------------------------------------------------------------------------

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
}));

export const supplierPaymentAccountsRelations = relations(supplierPaymentAccounts, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierPaymentAccounts.supplierId],
    references: [suppliers.id],
  }),
}));
