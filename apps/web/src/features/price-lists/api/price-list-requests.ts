import { priceListSchema, type PriceList } from "@ta/validators";

import { api } from "@/lib/api";

/** The sale prices in force, published when the last trip closed. */
export function getCurrentPriceList(): Promise<PriceList> {
  return api.get("/api/v1/price-lists/current", { schema: priceListSchema });
}
