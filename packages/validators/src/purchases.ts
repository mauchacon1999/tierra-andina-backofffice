import { cleanProductName, compareDecimals, percentToFraction } from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";
import { businessDateSchema, rateValueSchema } from "./exchange-rates";
import { message, type ValidationSubject } from "./messages";
import { paginatedSchema, paginationQuerySchema } from "./pagination";
import { saleUnitSchema, purchaseUnitSchema } from "./products";

/*
 * Purchases (docs/plan.md phase 1, domain-model §3–§4). Money and quantities are decimal
 * strings; the API computes costs with @ta/core `priceLine`. Messages are tokens (messages.ts).
 */

// Suppliers --------------------------------------------------------------------------------------

export const SUPPLIER_KINDS = ["wholesale_stall", "local"] as const;
export const supplierKindSchema = z.enum(SUPPLIER_KINDS);

const supplierNameSchema = z
  .string({ error: message("name.required") })
  .transform(cleanProductName)
  .pipe(
    z
      .string()
      .min(1, { message: message("name.required"), abort: true })
      .min(2, message("name.tooShort", { min: 2 }))
      .max(60, message("name.tooLong", { max: 60 })),
  );

const shortTextSchema = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max, message("text.tooLong", { max })));

export const createSupplierSchema = z.object({
  name: supplierNameSchema,
  kind: supplierKindSchema.default("wholesale_stall"),
  phone: shortTextSchema(30).optional(),
  stallReference: shortTextSchema(60).optional(),
});

export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type CreateSupplier = z.output<typeof createSupplierSchema>;

export const supplierSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: supplierKindSchema,
  phone: z.string().nullable(),
  stallReference: z.string().nullable(),
  isActive: z.boolean(),
});

export type Supplier = z.infer<typeof supplierSchema>;

export const supplierListSchema = z.object({ data: z.array(supplierSchema) });

// Trips ------------------------------------------------------------------------------------------

export const PURCHASE_TRIP_STATUSES = ["open", "closed"] as const;
export const PAYMENT_STATUSES = ["paid", "credit"] as const;
export const RECEIPT_STATUSES = ["pending", "received", "partial", "missing"] as const;

/** POST /api/v1/purchase-trips — rates are copied from the day's rates ("Tasas del día"). */
export const openTripSchema = z.object({
  businessDate: businessDateSchema,
  note: shortTextSchema(200).optional(),
});

export type OpenTrip = z.infer<typeof openTripSchema>;

export const tripListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PURCHASE_TRIP_STATUSES).optional(),
});

export type TripListQueryInput = z.input<typeof tripListQuerySchema>;
export type TripListQuery = z.output<typeof tripListQuerySchema>;

export const tripSchema = z.object({
  id: z.uuid(),
  businessDate: z.string(),
  bcvRate: z.string(),
  marketRate: z.string(),
  status: z.enum(PURCHASE_TRIP_STATUSES),
  /** Σ real_cost_usd of the lines (what the purchase really cost at the BCV rate). */
  totalUsd: z.string(),
  /** Σ amount_bs of the lines (what was paid to the stalls). */
  totalBs: z.string(),
  note: z.string().nullable(),
  lineCount: z.number().int().min(0),
  createdAt: z.iso.datetime({ offset: true }),
});

export type Trip = z.infer<typeof tripSchema>;

export const tripListSchema = paginatedSchema(tripSchema);
export type TripList = z.infer<typeof tripListSchema>;

// Lines ------------------------------------------------------------------------------------------

export const purchaseLineSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  purchaseUnit: purchaseUnitSchema,
  saleUnit: saleUnitSchema,
  supplierId: z.uuid().nullable(),
  supplierName: z.string().nullable(),
  stallReference: z.string().nullable(),
  packs: z.string(),
  grossQuantity: z.string(),
  shrinkage: z.string(),
  usableQuantity: z.string(),
  quotedPriceUsd: z.string(),
  amountBs: z.string(),
  supplierRate: z.string(),
  realCostUsd: z.string(),
  unitCostUsd: z.string(),
  margin: z.string(),
  salePriceUsd: z.string(),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  receiptStatus: z.enum(RECEIPT_STATUSES),
  createdAt: z.iso.datetime({ offset: true }),
});

export type PurchaseLine = z.infer<typeof purchaseLineSchema>;

export const tripDetailSchema = tripSchema.extend({ lines: z.array(purchaseLineSchema) });
export type TripDetail = z.infer<typeof tripDetailSchema>;

const positiveQuantity = (subject: ValidationSubject) =>
  decimalSchema(subject).refine((v) => compareDecimals(v, "0") > 0, {
    message: message("decimal.positive", { subject }),
  });

/**
 * POST /api/v1/purchase-trips/:id/lines — field shapes only. `quotedPriceUsd` is the TOTAL of
 * the line. Omitted supplier rate → the trip's Coche rate; omitted margin → product's last.
 * Cross-field rules (shrinkage < gross) are applied by the API with @ta/core (422).
 */
export const purchaseLineFieldsSchema = z.object({
  productId: z.uuid({ error: message("purchase.productRequired") }),
  supplierId: z.uuid().nullable().optional(),
  stallReference: shortTextSchema(60).optional(),
  packs: positiveQuantity("packs"),
  grossQuantity: positiveQuantity("grossQuantity"),
  shrinkage: decimalSchema("shrinkage").default("0"),
  quotedPriceUsd: decimalSchema("price"),
  supplierRate: rateValueSchema.optional(),
  margin: decimalSchema("margin").optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("paid"),
});

export type PurchaseLineInput = z.input<typeof purchaseLineFieldsSchema>;
export type PurchaseLineFields = z.output<typeof purchaseLineFieldsSchema>;

/** PATCH /api/v1/purchase-trips/:id/lines/:lineId — any field; no defaults. */
export const updatePurchaseLineSchema = z
  .object({
    productId: z.uuid().optional(),
    supplierId: z.uuid().nullable().optional(),
    stallReference: shortTextSchema(60).optional(),
    packs: positiveQuantity("packs").optional(),
    grossQuantity: positiveQuantity("grossQuantity").optional(),
    shrinkage: decimalSchema("shrinkage").optional(),
    quotedPriceUsd: decimalSchema("price").optional(),
    supplierRate: rateValueSchema.optional(),
    margin: decimalSchema("margin").optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: message("noChanges"),
  });

export type UpdatePurchaseLine = z.infer<typeof updatePurchaseLineSchema>;

export const SHRINKAGE_BELOW_GROSS_MESSAGE = message("purchase.shrinkageBelowGross");

/** Line form (web): text inputs; margin as percent. Outputs the API payload. */
export const purchaseLineFormSchema = z
  .object({
    productId: z.string(),
    supplierId: z.string(),
    stallReference: z.string(),
    packs: z.string(),
    grossQuantity: z.string(),
    shrinkage: z.string(),
    quotedPriceUsd: z.string(),
    supplierRate: z.string(),
    marginPercent: z.string(),
    paymentStatus: z.enum(PAYMENT_STATUSES),
  })
  .transform((value, ctx) => {
    const fields = {
      productId: value.productId,
      supplierId: value.supplierId === "" ? null : value.supplierId,
      stallReference: value.stallReference.trim() || undefined,
      packs: value.packs.trim(),
      grossQuantity: value.grossQuantity.trim(),
      shrinkage: value.shrinkage.trim() || "0",
      quotedPriceUsd: value.quotedPriceUsd.trim(),
      supplierRate: value.supplierRate.trim() || undefined,
      paymentStatus: value.paymentStatus,
    };
    const marginPercent = decimalSchema("margin", { maxDecimals: 2 }).safeParse(
      value.marginPercent.trim(),
    );
    if (!marginPercent.success) {
      for (const issue of marginPercent.error.issues) {
        ctx.addIssue({ code: "custom", path: ["marginPercent"], message: issue.message });
      }
    }
    const parsed = purchaseLineFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
      return z.NEVER;
    }
    if (compareDecimals(parsed.data.shrinkage, parsed.data.grossQuantity) >= 0) {
      ctx.addIssue({ code: "custom", path: ["shrinkage"], message: SHRINKAGE_BELOW_GROSS_MESSAGE });
    }
    if (!marginPercent.success) return z.NEVER;
    return {
      ...parsed.data,
      margin: percentToFraction(marginPercent.data),
    } satisfies PurchaseLineFields;
  });

export type PurchaseLineFormValues = z.input<typeof purchaseLineFormSchema>;
