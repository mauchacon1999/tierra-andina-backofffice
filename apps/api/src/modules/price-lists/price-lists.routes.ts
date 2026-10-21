import { toBusinessDate } from "@ta/core";
import { setManualPriceSchema } from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { AppError, ErrorCode } from "@/lib/errors";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  getPriceProposal,
  listManualPrices,
  publishSaleRateProposal,
  setManualPrice,
  requireCurrentPriceList,
  toPriceListDto,
} from "./price-lists.service";

/**
 * /api/v1/price-lists — the sale prices in force. Published when a trip closes; the owner and
 * the manager can read them (the manager's user is created later). A sale-rate change proposes
 * a new list that only the owner can publish. "Precio manual" lets the owner type one price.
 */
const productParam = z.object({ productId: z.uuid({ error: "Identificador inválido" }) });

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
    })
    .get("/manual", owner, async (c) => {
      const today = toBusinessDate(new Date());
      return c.json(await listManualPrices(c.get("db"), getMembership(c).storeId, today));
    })
    .put(
      "/manual/:productId",
      owner,
      validate("param", productParam),
      validate("json", setManualPriceSchema),
      async (c) => {
        const now = new Date();
        const row = await setManualPrice(
          c.get("db"),
          getActor(c),
          c.req.valid("param").productId,
          c.req.valid("json").priceBs,
          toBusinessDate(now),
          now,
        );
        return c.json(row);
      },
    );
}
