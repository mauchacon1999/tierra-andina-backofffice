import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { getMembership, requireRole } from "@/middleware/auth";
import { toReceiptTripDto } from "@/modules/purchases/purchases.mapper";
import { listOpenTrips, listToBuy } from "@/modules/purchases/purchases.service";
import { canSeePrices } from "@/modules/receipts/receipts.service";

/**
 * /api/v1/receipts — the truck receipt screen: the open trips with what to check (product,
 * packs, stall). Marking a line is PATCH /purchase-trips/:id/lines/:lineId/receipt.
 */
export function receiptsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", requireRole("owner", "receiver"), async (c) => {
    const db = c.get("db");
    const membership = getMembership(c);
    const [trips, showPrices, toBuy] = await Promise.all([
      listOpenTrips(db, membership.storeId),
      canSeePrices(db, membership),
      listToBuy(db, membership.storeId),
    ]);
    // Newest trip first (listOpenTrips). Faltantes ride on that one so they are not repeated.
    return c.json({
      data: trips.map((trip, index) =>
        toReceiptTripDto(trip, showPrices, index === 0 ? toBuy : []),
      ),
    });
  });
}
