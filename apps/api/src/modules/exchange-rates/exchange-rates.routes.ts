import {
  businessDateSchema,
  dailyRatesRangeQuerySchema,
  setDailyRatesSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import { getDailyRates, listDailyRates, setDailyRates } from "./exchange-rates.service";

const dateParamSchema = z.object({ date: businessDateSchema });

/** /api/v1/exchange-rates — the day's BCV, Coche (market) and sale rates, entered by the owner. */
export function exchangeRatesRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .get(
      "/",
      requireRole("owner", "manager"),
      validate("query", dailyRatesRangeQuerySchema),
      async (c) => {
        const { from, to } = c.req.valid("query");
        const data = await listDailyRates(c.get("db"), getMembership(c).storeId, from, to);
        return c.json({ data });
      },
    )
    .get("/:date", requireRole("owner", "manager"), validate("param", dateParamSchema), async (c) =>
      c.json(await getDailyRates(c.get("db"), getMembership(c).storeId, c.req.valid("param").date)),
    )
    .put(
      "/:date",
      requireRole("owner"),
      validate("param", dateParamSchema),
      validate("json", setDailyRatesSchema),
      async (c) =>
        c.json(
          await setDailyRates(
            c.get("db"),
            getActor(c),
            c.req.valid("param").date,
            c.req.valid("json"),
          ),
        ),
    );
}
