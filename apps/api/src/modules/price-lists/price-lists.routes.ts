import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { getMembership, requireRole } from "@/middleware/auth";

import { requireCurrentPriceList, toPriceListDto } from "./price-lists.service";

/**
 * /api/v1/price-lists — the sale prices in force. Published when a trip closes; the owner and
 * the manager can read them (the manager's user is created later).
 */
export function priceListsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/current", requireRole("owner", "manager"), async (c) => {
    const current = await requireCurrentPriceList(c.get("db"), getMembership(c).storeId);
    return c.json(toPriceListDto(current.list, current.lines));
  });
}
