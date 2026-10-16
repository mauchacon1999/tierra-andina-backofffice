# Module: Products

Catalog of everything the shop buys and sells. Products are the base of purchasing,
costing and price lists, so their units must be right from day one.

- Domain reference: `docs/domain-model.md` §3 and §9.2
- Depends on: `product_categories`, `settings` (`default_margin`)
- Used by: purchases, price lists, shopping list, (phase 5) POS

---

## 1. Business rules

### 1.1 What a product is

A product is one sellable item with **one purchase unit and one sale unit**.
Varieties are separate products: "Tomate perita" and "Tomate manzano" are two products,
because they have different costs, shrinkage and prices.

### 1.2 Units

| Purchase unit | UI label      | Allowed sale units | Pack quantity means                |
| ------------- | ------------- | ------------------ | ---------------------------------- |
| `crate`       | Cesta         | `kg`, `unit`       | Approx. kg (or units) per crate    |
| `bundle`      | Cuenta / rama | `kg`, `unit`       | Approx. kg (or bunches) per bundle |
| `kg`          | Kilo          | `kg`               | Not used (null)                    |

- The **unit of the pack quantity and of the shrinkage is always the sale unit**:
  a cilantro bundle sold by bunch → pack quantity 28 (bunches), shrinkage in bunches.
  Spring onion bundle sold by kg → pack quantity in kg, shrinkage in kg.
- `kg → unit` is not allowed: if something is bought by kilo and sold by unit, the owner
  must confirm the rule first (open question §8).

### 1.3 Defaults that help the purchase form

| Field                   | Set at creation                                   | Updated later by                               |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `default_pack_quantity` | Owner (required for crate/bundle)                 | Owner only                                     |
| `last_shrinkage`        | Owner (optional, default 0)                       | Purchases module, on every purchase line saved |
| `last_margin`           | Owner (default = `settings.default_margin`, 0.50) | Purchases module, on every purchase line saved |

These are **suggestions**: every purchase line still decides its own quantity, shrinkage
and margin. Gross quantity varies per purchase and is always entered at purchase time.

### 1.4 Name

- Required, 2–60 characters, trimmed, inner spaces collapsed.
- Unique ignoring case and accents: "Cebollín" and "cebollin" are the same product.
  Store a `normalized_name` (lowercase, no accents, single spaces) with a unique index.

### 1.5 Lifecycle

- Products are never deleted. They are deactivated (`is_active = false`).
- Inactive products do not appear in the purchase form or new price lists, but keep
  their history and can be reactivated.
- **Units are locked once used.** If a product has any purchase line or price list line,
  `purchase_unit` and `sale_unit` cannot change (it would corrupt history).
  The owner creates a new product instead. Name, category, pack quantity and defaults
  stay editable.

### 1.6 Quick create from the purchase form

At the market there is no time for a full form. The purchase screen offers
"Nuevo producto" with only: name, purchase unit, sale unit, pack quantity.
Category defaults to "other" and can be fixed later from the catalog.

---

## 2. Inputs (form)

UI labels in Spanish; field names in English.

| Field                 | UI label                      | Control                          | Rules                                                            |
| --------------------- | ----------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `name`                | Nombre                        | Text                             | Required, 2–60 chars, unique (§1.4)                              |
| `categoryId`          | Categoría                     | Select                           | Required (quick create: "Otros")                                 |
| `purchaseUnit`        | Se compra por                 | Segmented: Cesta / Cuenta / Kilo | Required; locked if used                                         |
| `saleUnit`            | Se vende por                  | Segmented: Kilo / Unidad         | Required; options filtered by purchase unit; locked if used      |
| `defaultPackQuantity` | Dynamic label (below)         | Decimal input                    | Required and > 0 for crate/bundle; hidden and null for kg        |
| `lastShrinkage`       | Merma habitual (in sale unit) | Decimal input                    | Optional, ≥ 0, < pack quantity when present                      |
| `lastMargin`          | Margen habitual (%)           | Percent input                    | Default from settings; 0–500 %; stored as fraction (50 % → 0.50) |
| `isActive`            | Activo                        | Switch                           | Edit only                                                        |

Dynamic label for pack quantity:

| Purchase unit | Sale unit | Label                     |
| ------------- | --------- | ------------------------- |
| crate         | kg        | Kilos aprox. por cesta    |
| crate         | unit      | Unidades aprox. por cesta |
| bundle        | kg        | Kilos aprox. por cuenta   |
| bundle        | unit      | Rollitos por cuenta       |

Behavior:

- Changing purchase unit to `kg` forces sale unit to `kg` and clears pack quantity.
- Shrinkage and pack quantity show the sale-unit suffix ("kg" or "und").
- **Live example** under the form (not saved): the owner types a sample cost and sees the
  resulting unit cost and sale price using `@ta/core` and current settings.
  Example: "Cesta a 20 $ → 22 kg útiles → 0,91 $/kg → venta 1,40 $/kg".

---

## 3. Logic in `@ta/core` (`products.ts`)

Pure functions with tests:

| Function                                         | Purpose                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `allowedSaleUnits(purchaseUnit)`                 | Returns the valid sale units                                           |
| `isValidUnitCombination(purchaseUnit, saleUnit)` | Validates the matrix in §1.2                                           |
| `requiresPackQuantity(purchaseUnit)`             | true for crate and bundle                                              |
| `normalizeProductName(name)`                     | Trim, collapse spaces, lowercase, strip accents                        |
| `validateProductDefaults(input)`                 | Pack quantity > 0 when required; shrinkage < pack quantity; margin 0–5 |

---

## 4. Validators (`@ta/validators/products.ts`)

- `createProductSchema` — all form fields, refined with the core functions above.
- `quickCreateProductSchema` — name, purchaseUnit, saleUnit, defaultPackQuantity.
- `updateProductSchema` — partial of create.
- `productListQuerySchema` — search, categoryId, isActive, purchaseUnit, page, pageSize.
- Decimal fields as numeric strings with up to 4 decimals.

---

## 5. API (`apps/api/src/modules/products`)

| Method | Path                              | Role  | Description                                                                      |
| ------ | --------------------------------- | ----- | -------------------------------------------------------------------------------- |
| GET    | `/api/v1/products`                | any   | Paginated list; filters from `productListQuerySchema`; search by normalized name |
| GET    | `/api/v1/products/:id`            | any   | Detail + `isUnitLocked` flag                                                     |
| POST   | `/api/v1/products`                | owner | Create                                                                           |
| POST   | `/api/v1/products/quick`          | owner | Quick create (§1.6)                                                              |
| PATCH  | `/api/v1/products/:id`            | owner | Update; unit changes rejected if locked                                          |
| POST   | `/api/v1/products/:id/deactivate` | owner | Soft delete                                                                      |
| POST   | `/api/v1/products/:id/activate`   | owner | Reactivate                                                                       |
| GET    | `/api/v1/product-categories`      | any   | List categories                                                                  |

Receivers see only `id`, `name`, `saleUnit` (no margins or defaults).

Error codes:

| Code                       | Status | When                                     |
| -------------------------- | ------ | ---------------------------------------- |
| `PRODUCT_NAME_TAKEN`       | 409    | Normalized name already exists           |
| `PRODUCT_UNITS_LOCKED`     | 409    | Changing units of a product already used |
| `INVALID_UNIT_COMBINATION` | 422    | Purchase/sale unit pair not allowed      |
| `INVALID_PRODUCT_DEFAULTS` | 422    | Pack quantity or shrinkage invalid       |
| `CATEGORY_NOT_FOUND`       | 422    | categoryId does not exist                |
| `PRODUCT_NOT_FOUND`        | 404    | Unknown id                               |

Every write goes through the audit middleware.

---

## 6. Frontend (`apps/web/src/features/products`)

```
features/products/
├── components/
│   ├── product-list.tsx          # cards on mobile, table on desktop
│   ├── product-card.tsx
│   ├── product-filters.tsx       # search, category, active
│   ├── product-form.tsx          # create / edit
│   ├── product-quick-form.tsx    # used inside the purchase screen
│   ├── unit-selector.tsx         # purchase + sale unit with filtering
│   └── price-example.tsx         # live example (§2)
├── hooks/
│   ├── use-product-form.ts       # unit dependencies, dynamic labels, defaults
│   ├── use-product-filters.ts    # filters synced with the URL
│   └── use-price-example.ts      # calls @ta/core with sample cost
├── api/
│   ├── use-products.ts
│   ├── use-product.ts
│   ├── use-create-product.ts
│   ├── use-quick-create-product.ts
│   ├── use-update-product.ts
│   └── use-toggle-product-active.ts
└── helpers/
    └── unit-labels.ts            # Spanish labels and suffixes per unit
```

Pages:

- `app/(owner)/products/page.tsx` — list with search and filters
- `app/(owner)/products/new/page.tsx` — create
- `app/(owner)/products/[id]/page.tsx` — edit (locked unit fields show a lock and why)

UX rules:

- Search is the main control: large input at the top, results as you type.
- Inactive products shown greyed, behind an "Inactivos" filter.
- After create, offer "Crear otro" to load the catalog fast.

---

## 7. Tests

| Layer      | Must cover                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ta/core` | Every function in §3: valid/invalid unit pairs, name normalization (accents, case, spaces), defaults validation edge cases                                                                                                                                     |
| Validators | Valid payloads pass; each rule rejects; percent → fraction conversion                                                                                                                                                                                          |
| API        | Create (success, duplicate name with accents, invalid combo, invalid defaults), quick create, list with search and filters, update (success, locked units), deactivate/activate, role checks (manager and receiver cannot write; receiver gets reduced fields) |
| Web        | `use-product-form`: kg forces kg and hides pack quantity; dynamic label; shrinkage validation. `product-form`: submits correct payload. `price-example`: tomato reference case shows 1.40                                                                      |

---

## 8. Open questions

| Question                                                       | Default until answered                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Is anything bought by kilo and sold by unit?                   | Not allowed                                                                  |
| Should products have a short name for the WhatsApp price list? | Not included; add `short_name` later if needed                               |
| Initial catalog                                                | Owner provides the product list from the notebook; loaded with a seed script |
