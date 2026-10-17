import { compareDecimals, isBusinessDate } from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";
import { message } from "./messages";

/** "YYYY-MM-DD", a real calendar day (business days are America/Caracas dates). */
export const businessDateSchema = z
  .string({ error: message("date.required") })
  .refine(isBusinessDate, { message: message("date.invalid") });

/** Bs per USD, > 0, numeric(14,4). */
export const rateValueSchema = decimalSchema("rate").refine((v) => compareDecimals(v, "0") > 0, {
  message: message("decimal.positive", { subject: "rate" }),
});

/** The day's rates for the active store: BCV (global), Coche market and sale. */
export const dailyRatesSchema = z.object({
  businessDate: businessDateSchema,
  bcv: z.string().nullable(),
  market: z.string().nullable(),
  sale: z.string().nullable(),
});

export type DailyRates = z.infer<typeof dailyRatesSchema>;

export const dailyRatesListSchema = z.object({ data: z.array(dailyRatesSchema) });

/** PUT /api/v1/exchange-rates/:date — rates to set; omitted ones are kept. */
export const setDailyRatesSchema = z
  .object({
    bcv: rateValueSchema.optional(),
    market: rateValueSchema.optional(),
    sale: rateValueSchema.optional(),
  })
  .refine((v) => v.bcv !== undefined || v.market !== undefined || v.sale !== undefined, {
    message: message("rates.atLeastOne"),
  });

export type SetDailyRates = z.infer<typeof setDailyRatesSchema>;

export const MAX_RATE_RANGE_DAYS = 62;

/** GET /api/v1/exchange-rates?from=&to= (inclusive, at most 62 days). */
export const dailyRatesRangeQuerySchema = z
  .object({ from: businessDateSchema, to: businessDateSchema })
  .refine((v) => v.from <= v.to, { message: message("date.rangeOrder") })
  .refine(
    (v) =>
      (Date.parse(`${v.to}T00:00:00Z`) - Date.parse(`${v.from}T00:00:00Z`)) / 86_400_000 <
      MAX_RATE_RANGE_DAYS,
    { message: message("date.rangeTooLong", { max: MAX_RATE_RANGE_DAYS }) },
  );

export type DailyRatesRangeQuery = z.infer<typeof dailyRatesRangeQuerySchema>;

/** Rates form (web): empty fields are not sent. */
export const dailyRatesFormSchema = z
  .object({ bcv: z.string(), market: z.string(), sale: z.string() })
  .transform((value, ctx) => {
    const out: SetDailyRates = {};
    for (const key of ["bcv", "market", "sale"] as const) {
      const raw = value[key].trim();
      if (raw === "") continue;
      const parsed = rateValueSchema.safeParse(raw);
      if (parsed.success) out[key] = parsed.data;
      else
        for (const issue of parsed.error.issues)
          ctx.addIssue({ code: "custom", path: [key], message: issue.message });
    }
    if (ctx.issues.length === 0 && Object.keys(out).length === 0) {
      ctx.addIssue({ code: "custom", path: ["bcv"], message: message("rates.atLeastOne") });
    }
    return out;
  });

export type DailyRatesFormValues = z.input<typeof dailyRatesFormSchema>;
