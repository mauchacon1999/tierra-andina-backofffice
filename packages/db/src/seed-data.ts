/*
 * Initial data (docs/domain-model.md §9.10). `code` values are stable keys used by code;
 * `name` values are Spanish labels shown in the UI and can be edited by the owner later.
 */

export const SEED_STORE = {
  name: "Tierra Andina — Mercado AVEPAC, Caricuao",
  timezone: "America/Caracas",
} as const;

/** Store settings (§9.1). Decimals are JSON strings so they never become floats. */
export const SEED_SETTINGS: Record<string, unknown> = {
  usd_rounding_step: "0.05",
  bs_rounding_step: "1",
  sale_rate_mode: "manual",
  sale_rate_markup_pct: "0",
  default_margin: "0.50",
  receiver_can_see_prices: false,
};

export const SEED_PAYMENT_METHODS = [
  // Same order as the columns of the shop's Excel close: Punto, Efectivo, Dólares, Pago móvil.
  { code: "card_terminal", name: "Punto de venta", currency: "VES", sortOrder: 1 },
  { code: "cash_bs", name: "Efectivo Bs", currency: "VES", sortOrder: 2 },
  { code: "cash_usd", name: "Efectivo USD", currency: "USD", sortOrder: 3 },
  { code: "mobile_payment", name: "Pago móvil", currency: "VES", sortOrder: 4 },
] as const;

export const SEED_PRODUCT_CATEGORIES = [
  { code: "fruit", name: "Frutas", sortOrder: 1 },
  { code: "vegetable", name: "Hortalizas", sortOrder: 2 },
  { code: "greens", name: "Hojas y aliños", sortOrder: 3 },
  { code: "tubers", name: "Tubérculos", sortOrder: 4 },
  { code: "other", name: "Otros", sortOrder: 5 },
] as const;

export const SEED_EXPENSE_CATEGORIES = [
  { code: "bags", name: "Bolsas", kind: "variable" },
  { code: "unloading_labor", name: "Descarga", kind: "variable" },
  { code: "drinking_water", name: "Agua potable", kind: "variable" },
  { code: "coffee", name: "Café", kind: "variable" },
  { code: "sugar", name: "Azúcar", kind: "variable" },
  { code: "bleach", name: "Cloro", kind: "variable" },
  // Supplies bought on credit (docs/modules/payables.md).
  { code: "packaging", name: "Empaque", kind: "variable" },
  { code: "food", name: "Alimentación", kind: "variable" },
  { code: "cleaning", name: "Limpieza", kind: "variable" },
] as const;
