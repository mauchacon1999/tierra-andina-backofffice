import { CREDIT_ENTRY_KINDS } from "@ta/core";
import { z } from "zod";

import { currencySchema, customerNameSchema, positiveAmount } from "./daily-closes";
import { businessDateSchema } from "./exchange-rates";
import { message } from "./messages";

/*
 * Customer credit, "fiado" (docs/domain-model.md §6): balances per currency, no rate (owner,
 * 2026-10-18). Owner and manager register payments; only the owner deletes one.
 */

const totalsSchema = z.object({ USD: z.string(), VES: z.string() });

/** GET /api/v1/customers/credit — `owing=true` lists only who owes something. */
export const customerCreditQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
  owing: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type CustomerCreditQueryInput = z.input<typeof customerCreditQuerySchema>;
export type CustomerCreditQuery = z.output<typeof customerCreditQuerySchema>;

export const customerBalanceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  /** Per currency; negative is money in the customer's favor. */
  balance: totalsSchema,
  lastEntryOn: z.string().nullable(),
});

export type CustomerBalance = z.infer<typeof customerBalanceSchema>;
export const customerBalanceListSchema = z.object({
  data: z.array(customerBalanceSchema),
  /** What all the listed customers owe, per currency. */
  total: totalsSchema,
});
export type CustomerBalanceList = z.infer<typeof customerBalanceListSchema>;

export const creditEntrySchema = z.object({
  id: z.uuid(),
  kind: z.enum(CREDIT_ENTRY_KINDS),
  businessDate: z.string(),
  amount: z.string(),
  currency: currencySchema,
  /** Set when it was written in that day's close (those are corrected in the close). */
  dailyCloseId: z.uuid().nullable(),
});

export type CreditEntry = z.infer<typeof creditEntrySchema>;

export const customerCreditDetailSchema = customerBalanceSchema.extend({
  /** Newest first. */
  entries: z.array(creditEntrySchema),
});

export type CustomerCreditDetail = z.infer<typeof customerCreditDetailSchema>;

/** POST /api/v1/customers/:id/payments — the manager may only write today's. */
export const customerPaymentInputSchema = z.object({
  businessDate: businessDateSchema,
  amount: positiveAmount,
  currency: currencySchema,
});

export type CustomerPaymentInput = z.input<typeof customerPaymentInputSchema>;
export type CustomerPayment = z.output<typeof customerPaymentInputSchema>;

/** PATCH /api/v1/customers/:id — name and phone (owner). "" clears the phone. */
export const updateCustomerSchema = z
  .object({
    name: customerNameSchema.optional(),
    phone: z
      .string()
      .transform((v) => v.trim())
      .pipe(z.string().max(30, message("text.tooLong", { max: 30 })))
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined, { message: message("noChanges") });

export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type UpdateCustomer = z.output<typeof updateCustomerSchema>;
