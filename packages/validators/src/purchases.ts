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
  packs: z.string().nullable(),
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
  receivedPacks: z.string().nullable(),
  receivedQuantity: z.string().nullable(),
  receiptNote: z.string().nullable(),
  receivedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Partial receipts only: the cost of what arrived (the purchase values stay as bought). */
  receivedUsableQuantity: z.string().nullable(),
  receivedUnitCostUsd: z.string().nullable(),
  receivedSalePriceUsd: z.string().nullable(),
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
 * the line. Omitted packs → crates were not counted. Omitted shrinkage → the product's
 * last shrinkage (the purchase does not change it). Omitted supplier rate → the trip's
 * Coche rate; omitted margin → the product's last. Cross-field rules (shrinkage < gross)
 * are applied by the API with @ta/core (422).
 */
export const purchaseLineFieldsSchema = z.object({
  productId: z.uuid({ error: message("purchase.productRequired") }),
  supplierId: z.uuid().nullable().optional(),
  stallReference: shortTextSchema(60).optional(),
  packs: positiveQuantity("packs").nullable().optional(),
  grossQuantity: positiveQuantity("grossQuantity"),
  shrinkage: decimalSchema("shrinkage").optional(),
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
    packs: positiveQuantity("packs").nullable().optional(),
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
    packs: z.string(),
    grossQuantity: z.string(),
    quotedPriceUsd: z.string(),
    marginPercent: z.string(),
    paymentStatus: z.enum(PAYMENT_STATUSES),
  })
  .transform((value, ctx) => {
    const fields = {
      productId: value.productId,
      packs: value.packs.trim() || null,
      grossQuantity: value.grossQuantity.trim(),
      quotedPriceUsd: value.quotedPriceUsd.trim(),
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
    if (!marginPercent.success) return z.NEVER;
    return {
      ...parsed.data,
      margin: percentToFraction(marginPercent.data),
    } satisfies PurchaseLineFields;
  });

export type PurchaseLineFormValues = z.input<typeof purchaseLineFormSchema>;

// Truck receipt (domain-model §4) ------------------------------------------------------------------

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

const receiptNoteSchema = shortTextSchema(200).optional();

/**
 * PATCH /api/v1/purchase-trips/:id/lines/:lineId/receipt — what arrived at the truck.
 * "pending" undoes a mark. The ranges of a partial receipt (0 < packs < bought, weight ≤ gross)
 * need the line, so the API checks them with @ta/core (422 INVALID_RECEIPT).
 */
export const setReceiptSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("received"), note: receiptNoteSchema }),
  z.object({ status: z.literal("missing"), note: receiptNoteSchema }),
  z.object({
    status: z.literal("partial"),
    receivedPacks: positiveQuantity("receivedPacks"),
    receivedQuantity: positiveQuantity("receivedQuantity").optional(),
    note: receiptNoteSchema,
  }),
]);

export type SetReceipt = z.infer<typeof setReceiptSchema>;

/** "Llegó incompleto" form (web): text inputs; empty weight → share of the packs. */
export const partialReceiptFormSchema = z
  .object({ receivedPacks: z.string(), receivedQuantity: z.string(), note: z.string() })
  .transform((value, ctx) => {
    const parsed = setReceiptSchema.safeParse({
      status: "partial",
      receivedPacks: value.receivedPacks.trim(),
      receivedQuantity: value.receivedQuantity.trim() || undefined,
      note: value.note.trim() || undefined,
    });
    if (parsed.success) return parsed.data;
    for (const issue of parsed.error.issues) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
    return z.NEVER;
  });

export type PartialReceiptFormValues = z.input<typeof partialReceiptFormSchema>;

/** A line as the receiver sees it: what to check, no costs (prices only if the store allows). */
export const receiptLineSchema = z.object({
  id: z.uuid(),
  productName: z.string(),
  purchaseUnit: purchaseUnitSchema,
  saleUnit: saleUnitSchema,
  packs: z.string().nullable(),
  grossQuantity: z.string(),
  supplierName: z.string().nullable(),
  stallReference: z.string().nullable(),
  receiptStatus: z.enum(RECEIPT_STATUSES),
  receivedPacks: z.string().nullable(),
  receivedQuantity: z.string().nullable(),
  receiptNote: z.string().nullable(),
  receivedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Null unless the store setting `receiverCanSeePrices` is on (always shown to the owner). */
  quotedPriceUsd: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type ReceiptLine = z.infer<typeof receiptLineSchema>;

/** An open shopping-list item shown on the receipt screen: not bought yet, so it cannot be received. */
export const receiptToBuySchema = z.object({
  id: z.uuid(),
  productName: z.string(),
  note: z.string().nullable(),
});

export type ReceiptToBuy = z.infer<typeof receiptToBuySchema>;

export const receiptTripSchema = z.object({
  id: z.uuid(),
  businessDate: z.string(),
  note: z.string().nullable(),
  lines: z.array(receiptLineSchema),
  /** Open shopping-list items. Only the newest open trip carries them; the rest get an empty list. */
  toBuy: z.array(receiptToBuySchema),
});

export type ReceiptTrip = z.infer<typeof receiptTripSchema>;

/** GET /api/v1/receipts — the open trips of the store, newest first. */
export const receiptTripListSchema = z.object({ data: z.array(receiptTripSchema) });
export type ReceiptTripList = z.infer<typeof receiptTripListSchema>;
