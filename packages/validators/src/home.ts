import { z } from "zod";

/** Conditions the home screen can actually detect. There is no inbox table. */
export const HOME_ALERTS = [
  "closes_pending",
  "rates_missing",
  "shopping_open",
  "receipts_pending",
  "no_price_list",
  "price_proposal",
  "bcv_changed",
] as const;

const moneyPairSchema = z.object({
  usd: z.string(),
  bs: z.string(),
});

export const homeAlertSchema = z.object({
  code: z.enum(HOME_ALERTS),
  count: z.number().int().nonnegative(),
});

/**
 * The owner's briefing. `deposited` and `kept` are cash only (efectivo Bs and USD).
 * There is no bank-account balance in the system.
 */
export const homeBriefingSchema = z.object({
  week: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    closeCount: z.number().int().nonnegative(),
    collected: moneyPairSchema,
    deposited: moneyPairSchema,
    kept: moneyPairSchema,
  }),
  payables: z.object({
    count: z.number().int().nonnegative(),
    remainingUsd: z.string(),
  }),
  credit: moneyPairSchema,
  alerts: z.array(homeAlertSchema),
});

export type HomeBriefing = z.infer<typeof homeBriefingSchema>;
export type HomeAlertCode = (typeof HOME_ALERTS)[number];
