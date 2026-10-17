import {
  priceListSchema,
  priceProposalSchema,
  type PriceList,
  type PriceProposal,
} from "@ta/validators";

import { api } from "@/lib/api";

/** Today's sale-rate proposal next to the list in force. Owner only. */
export function getPriceProposal(): Promise<PriceProposal> {
  return api.get("/api/v1/price-lists/proposal", { schema: priceProposalSchema });
}

/** Publishes that proposal. Dollars stay; bolívares use today's sale rate. */
export function publishPriceProposal(): Promise<PriceList> {
  return api.post("/api/v1/price-lists/proposal", undefined, { schema: priceListSchema });
}
