import { compareDecimals, MAX_MARGIN } from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";

/*
 * Store settings (domain-model §9.1). The API speaks camelCase; the DB stores snake_case keys
 * with decimals as JSON strings.
 */

export const SALE_RATE_MODES = ["manual", "bcv_plus_pct"] as const;

const positive = (subject: string) =>
  decimalSchema(subject).refine((v) => compareDecimals(v, "0") > 0, {
    message: `${subject} debe ser mayor que 0`,
  });

export const storeSettingsSchema = z.object({
  usdRoundingStep: positive("El redondeo en dólares"),
  bsRoundingStep: positive("El redondeo en bolívares"),
  saleRateMode: z.enum(SALE_RATE_MODES),
  saleRateMarkupPct: decimalSchema("El recargo de la tasa de venta"),
  defaultMargin: decimalSchema("El margen por defecto").refine(
    (v) => compareDecimals(v, MAX_MARGIN) <= 0,
    { message: "El margen por defecto debe estar entre 0 % y 500 %" },
  ),
  receiverCanSeePrices: z.boolean(),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

/** PATCH /api/v1/settings — any subset of the settings. */
export const updateStoreSettingsSchema = storeSettingsSchema
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "No hay cambios que guardar",
  });

export type UpdateStoreSettings = z.infer<typeof updateStoreSettingsSchema>;

/** API field → DB key. */
export const SETTING_KEYS = {
  usdRoundingStep: "usd_rounding_step",
  bsRoundingStep: "bs_rounding_step",
  saleRateMode: "sale_rate_mode",
  saleRateMarkupPct: "sale_rate_markup_pct",
  defaultMargin: "default_margin",
  receiverCanSeePrices: "receiver_can_see_prices",
} as const satisfies Record<keyof StoreSettings, string>;

/** Used when a store has no row for a key (same values as the seed). */
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  usdRoundingStep: "0.05",
  bsRoundingStep: "1",
  saleRateMode: "manual",
  saleRateMarkupPct: "0",
  defaultMargin: "0.50",
  receiverCanSeePrices: false,
};
