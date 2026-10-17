import { compareDecimals, MAX_MARGIN } from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";
import { message, type ValidationSubject } from "./messages";

/*
 * Store settings (domain-model §9.1). The API speaks camelCase; the DB stores snake_case keys
 * with decimals as JSON strings.
 */

export const SALE_RATE_MODES = ["manual", "bcv_plus_pct"] as const;

const positive = (subject: ValidationSubject) =>
  decimalSchema(subject).refine((v) => compareDecimals(v, "0") > 0, {
    message: message("decimal.positive", { subject }),
  });

export const storeSettingsSchema = z.object({
  usdRoundingStep: positive("usdRoundingStep"),
  bsRoundingStep: positive("bsRoundingStep"),
  saleRateMode: z.enum(SALE_RATE_MODES),
  saleRateMarkupPct: decimalSchema("saleRateMarkupPct"),
  defaultMargin: decimalSchema("defaultMargin").refine((v) => compareDecimals(v, MAX_MARGIN) <= 0, {
    message: message("settings.defaultMarginRange"),
  }),
  receiverCanSeePrices: z.boolean(),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

/** PATCH /api/v1/settings — any subset of the settings. */
export const updateStoreSettingsSchema = storeSettingsSchema
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: message("noChanges"),
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
