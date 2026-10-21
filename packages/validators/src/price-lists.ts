import { compareDecimals } from "@ta/core";
import { z } from "zod";

import { decimalSchema } from "./amount";
import { message } from "./messages";
import { purchaseUnitSchema, saleUnitSchema } from "./products";

/*
 * Sale price list published when a purchase trip closes (domain-model §3.4).
 * USD prices come from what arrived; Bs uses the day's sale rate and the store's rounding.
 */

export const priceListLineSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  saleUnit: saleUnitSchema,
  /** Null for a price typed by hand on a product never bought ("Precio manual"). */
  unitCostUsd: z.string().nullable(),
  /** Null for a price typed by hand outside 0–500 % (below cost) or without a cost. */
  margin: z.string().nullable(),
  priceUsd: z.string(),
  priceBs: z.string(),
});

export type PriceListLine = z.infer<typeof priceListLineSchema>;

export const priceListSchema = z.object({
  id: z.uuid(),
  tripId: z.uuid().nullable(),
  saleRate: z.string(),
  publishedAt: z.iso.datetime({ offset: true }),
  lines: z.array(priceListLineSchema),
});

export type PriceList = z.infer<typeof priceListSchema>;

/** One shelf price at today's sale rate, next to the price in force. */
export const priceProposalLineSchema = priceListLineSchema.extend({
  proposedPriceBs: z.string(),
  changed: z.boolean(),
});

export type PriceProposalLine = z.infer<typeof priceProposalLineSchema>;

/**
 * What the owner is asked to approve. `proposedSaleRate` is null when today's sale rate
 * is missing or does not move any rounded bolívar price. `bcvChanged` is only a warning:
 * the BCV rate does not reprice the shelf.
 */
export const priceProposalSchema = z.object({
  currentSaleRate: z.string(),
  proposedSaleRate: z.string().nullable(),
  bcvChanged: z.boolean(),
  lines: z.array(priceProposalLineSchema),
});

export type PriceProposal = z.infer<typeof priceProposalSchema>;

/*
 * "Precio manual": the owner types a product's shelf price in bolívares (domain-model §3.4).
 */

/**
 * What the last purchase cost (@ta/core `purchasePrice`): per crate/bundle ("pack", in the
 * line's purchase unit) or per kilo/unit ("saleUnit").
 */
export const lastPurchasePriceSchema = z.object({
  priceUsd: z.string(),
  per: z.enum(["pack", "saleUnit"]),
  purchaseUnit: purchaseUnitSchema,
});

export type LastPurchasePrice = z.infer<typeof lastPurchasePriceSchema>;

/** One active product with its last purchase and price in force (null: none yet). */
export const manualPriceRowSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  saleUnit: saleUnitSchema,
  lastPurchase: lastPurchasePriceSchema.nullable(),
  priceUsd: z.string().nullable(),
  priceBs: z.string().nullable(),
  shareOnWhatsapp: z.boolean(),
});

export type ManualPriceRow = z.infer<typeof manualPriceRowSchema>;

/**
 * GET /api/v1/price-lists/manual. `saleRate` turns typed bolívares into dollars: the list's in
 * force, else today's; null when there is neither (prices cannot be saved yet).
 */
export const manualPriceListSchema = z.object({
  saleRate: z.string().nullable(),
  data: z.array(manualPriceRowSchema),
});

export type ManualPriceList = z.infer<typeof manualPriceListSchema>;

/** PUT /api/v1/price-lists/manual/:productId — the shelf price in Bs, > 0. */
export const setManualPriceSchema = z.object({
  priceBs: decimalSchema("price").refine((v) => compareDecimals(v, "0") > 0, {
    message: message("decimal.positive", { subject: "price" }),
  }),
});

export type SetManualPrice = z.infer<typeof setManualPriceSchema>;
export type SetManualPriceInput = z.input<typeof setManualPriceSchema>;

/** PATCH /api/v1/products/:id/whatsapp — whether it goes in the list copied for WhatsApp. */
export const productWhatsappSchema = z.object({
  shareOnWhatsapp: z.boolean({ error: message("product.whatsappRequired") }),
});

export type ProductWhatsapp = z.infer<typeof productWhatsappSchema>;
