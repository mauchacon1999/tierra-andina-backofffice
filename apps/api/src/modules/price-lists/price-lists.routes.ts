import { toBusinessDate } from "@ta/core";
import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { AppError, ErrorCode } from "@/lib/errors";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  getPriceProposal,
  publishSaleRateProposal,
  requireCurrentPriceList,
  toPriceListDto,
} from "./price-lists.service";

/**
 * /api/v1/price-lists — the sale prices in force. Published when a trip closes; the owner and
 * the manager can read them (the manager's user is created later). A sale-rate change proposes
 * a new list that only the owner can publish.
 */
export function priceListsRoutes(): Hono<AppEnv> {
  const readers = requireRole("owner", "manager");
  const owner = requireRole("owner");
  return new Hono<AppEnv>()
    .get("/current", readers, async (c) => {
      const current = await requireCurrentPriceList(c.get("db"), getMembership(c).storeId);
      return c.json(toPriceListDto(current.list, current.lines));
    })
    .get("/proposal", owner, async (c) => {
      const proposal = await getPriceProposal(
        c.get("db"),
        getMembership(c).storeId,
        toBusinessDate(new Date()),
      );
      if (!proposal) {
        throw new AppError(ErrorCode.PRICE_LIST_NOT_FOUND, "Todavía no hay lista de precios");
      }
      return c.json(proposal);
    })
    .post("/proposal", owner, async (c) => {
      const list = await publishSaleRateProposal(
        c.get("db"),
        getActor(c),
        toBusinessDate(new Date()),
      );
      return c.json(list, 201);
    });
}
