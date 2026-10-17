import { z } from "zod";

import { saleUnitSchema } from "./products";

/*
 * Sale price list published when a purchase trip closes (domain-model §3.4).
 * USD prices come from what arrived; Bs uses the day's sale rate and the store's rounding.
 */

export const priceListLineSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  saleUnit: saleUnitSchema,
  unitCostUsd: z.string(),
  margin: z.string(),
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
