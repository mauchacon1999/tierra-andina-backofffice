import { CURRENCIES, compareDecimals } from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";
import { businessDateSchema } from "./exchange-rates";
import { message } from "./messages";

/*
 * Daily close (domain-model §5): amounts only, each in its own currency — no rate (owner
 * decision 2026-10-17). Messages are tokens (messages.ts).
 */

export const currencySchema = z.enum(CURRENCIES);
export const CASH_DESTINATIONS = ["kept", "deposited"] as const;
export const DAILY_CLOSE_STATUSES = ["submitted", "approved"] as const;

const shortText = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max, message("text.tooLong", { max })));

export const positiveAmount = decimalSchema("amount").refine((v) => compareDecimals(v, "0") > 0, {
  message: message("decimal.positive", { subject: "amount" }),
});

// Catalogs -----------------------------------------------------------------------------------------

export const paymentMethodSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  currency: currencySchema,
  sortOrder: z.number().int(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export const paymentMethodListSchema = z.object({ data: z.array(paymentMethodSchema) });

export const customerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;
export const customerListSchema = z.object({ data: z.array(customerSchema) });

export const customerSearchQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
});

/** As typed, without extra spaces ("  Sra.   María " → "Sra. María"). */
export const customerNameSchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, message("name.tooShort", { min: 2 }))
      .max(60, message("name.tooLong", { max: 60 })),
  );

// Submit / edit ------------------------------------------------------------------------------------

const closePaymentSchema = z.object({
  paymentMethodId: z.uuid(),
  amount: decimalSchema("amount"),
});

/** A credit sale: an existing customer, or the name of a new one (created with the close). */
const closeCreditSchema = z
  .object({
    customerId: z.uuid().optional(),
    customerName: customerNameSchema.optional(),
    amount: positiveAmount,
    currency: currencySchema,
  })
  .refine((v) => (v.customerId === undefined) !== (v.customerName === undefined), {
    message: message("dailyClose.customerRequired"),
    path: ["customerName"],
  });

const closeExpenseSchema = z.object({
  concept: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(1, message("dailyClose.conceptRequired"))
        .max(80, message("text.tooLong", { max: 80 })),
    ),
  amount: positiveAmount,
  currency: currencySchema,
});

const closeBody = {
  /** Batch ("lote") number of the card terminal's close. */
  cardBatch: shortText(30).optional(),
  cashDestination: z.enum(CASH_DESTINATIONS),
  note: shortText(200).optional(),
  payments: z
    .array(closePaymentSchema)
    .refine((list) => new Set(list.map((p) => p.paymentMethodId)).size === list.length, {
      message: message("dailyClose.duplicatePayment"),
    }),
  credits: z.array(closeCreditSchema).max(50).default([]),
  expenses: z.array(closeExpenseSchema).max(50).default([]),
};

/** POST /api/v1/daily-closes — the manager's close of one business day. */
export const submitDailyCloseSchema = z.object({ businessDate: businessDateSchema, ...closeBody });
export type SubmitDailyCloseInput = z.input<typeof submitDailyCloseSchema>;
export type SubmitDailyClose = z.output<typeof submitDailyCloseSchema>;

/** PATCH /api/v1/daily-closes/:id — the owner corrects a close (replaces its contents). */
export const updateDailyCloseSchema = z.object(closeBody);
export type UpdateDailyClose = z.output<typeof updateDailyCloseSchema>;

export const dailyCloseRangeQuerySchema = z
  .object({ from: businessDateSchema, to: businessDateSchema })
  .refine((v) => v.from <= v.to, { message: message("date.rangeOrder") });

// Responses ----------------------------------------------------------------------------------------

const totalsSchema = z.object({ VES: z.string(), USD: z.string() });

export const dailyCloseTotalsSchema = z.object({
  collected: totalsSchema,
  credit: totalsSchema,
  expenses: totalsSchema,
});

export const dailyCloseSchema = z.object({
  id: z.uuid(),
  businessDate: z.string(),
  status: z.enum(DAILY_CLOSE_STATUSES),
  cardBatch: z.string().nullable(),
  cashDestination: z.enum(CASH_DESTINATIONS),
  note: z.string().nullable(),
  submittedBy: z.object({ id: z.uuid(), name: z.string() }),
  submittedAt: z.iso.datetime({ offset: true }),
  approvedBy: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  approvedAt: z.iso.datetime({ offset: true }).nullable(),
  payments: z.array(
    z.object({
      paymentMethodId: z.uuid(),
      code: z.string(),
      name: z.string(),
      currency: currencySchema,
      amount: z.string(),
    }),
  ),
  credits: z.array(
    z.object({
      id: z.uuid(),
      customerId: z.uuid(),
      customerName: z.string(),
      amount: z.string(),
      currency: currencySchema,
    }),
  ),
  expenses: z.array(
    z.object({ id: z.uuid(), concept: z.string(), amount: z.string(), currency: currencySchema }),
  ),
  totals: dailyCloseTotalsSchema,
});

export type DailyClose = z.infer<typeof dailyCloseSchema>;

/** One row of the owner's list: the day, what came in per method (like the Excel), totals. */
export const dailyCloseSummarySchema = dailyCloseSchema.pick({
  id: true,
  businessDate: true,
  status: true,
  cardBatch: true,
  submittedBy: true,
  submittedAt: true,
  payments: true,
  totals: true,
});

export type DailyCloseSummary = z.infer<typeof dailyCloseSummarySchema>;
export const dailyCloseListSchema = z.object({ data: z.array(dailyCloseSummarySchema) });

export const pendingClosesSchema = z.object({ count: z.number().int().min(0) });

// Web form ------------------------------------------------------------------------------------------

/**
 * "Cierre del día" form: text inputs; an empty payment amount is 0 (nothing collected that
 * way). Credit sales always send the customer's name (the API reuses an existing customer with
 * that name). Outputs the contents of a close (the day is chosen outside the form).
 */
export const dailyCloseFormSchema = z
  .object({
    cardBatch: z.string(),
    cashDestination: z.enum(CASH_DESTINATIONS),
    note: z.string(),
    payments: z.array(z.object({ paymentMethodId: z.string(), amount: z.string() })),
    credits: z.array(
      z.object({ customerName: z.string(), amount: z.string(), currency: currencySchema }),
    ),
    expenses: z.array(
      z.object({ concept: z.string(), amount: z.string(), currency: currencySchema }),
    ),
  })
  .transform((value, ctx) => {
    const parsed = updateDailyCloseSchema.safeParse({
      cardBatch: value.cardBatch.trim() || undefined,
      cashDestination: value.cashDestination,
      note: value.note.trim() || undefined,
      payments: value.payments.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount.trim() || "0",
      })),
      credits: value.credits.map((c) => ({
        customerName: c.customerName,
        amount: c.amount.trim(),
        currency: c.currency,
      })),
      expenses: value.expenses.map((e) => ({ ...e, amount: e.amount.trim() })),
    });
    if (parsed.success) return parsed.data;
    for (const issue of parsed.error.issues) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
    return z.NEVER;
  });

export type DailyCloseFormValues = z.input<typeof dailyCloseFormSchema>;
