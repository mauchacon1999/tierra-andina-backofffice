import {
  businessDateSchema,
  dailyCloseRangeQuerySchema,
  submitDailyCloseSchema,
  updateDailyCloseSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import { toDailyCloseDto, toDailyCloseSummaryDto } from "./daily-closes.mapper";
import {
  approveDailyClose,
  countPendingCloses,
  getDailyClose,
  listDailyCloses,
  submitDailyClose,
  updateDailyClose,
} from "./daily-closes.service";

const idParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });
const dateParam = z.object({ date: businessDateSchema });

/**
 * /api/v1/daily-closes — the manager submits one close per day (amounts only, per currency);
 * the owner reviews, corrects and approves (docs/plan.md phase 2).
 */
export function dailyClosesRoutes(): Hono<AppEnv> {
  const staff = requireRole("owner", "manager");
  const owner = requireRole("owner");
  return new Hono<AppEnv>()
    .get("/", staff, validate("query", dailyCloseRangeQuerySchema), async (c) => {
      const rows = await listDailyCloses(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("query"),
      );
      return c.json({ data: rows.map(toDailyCloseSummaryDto) });
    })
    .get("/pending-count", owner, async (c) =>
      c.json({ count: await countPendingCloses(c.get("db"), getMembership(c).storeId) }),
    )
    .get("/:date", staff, validate("param", dateParam), async (c) => {
      const close = await getDailyClose(
        c.get("db"),
        getMembership(c).storeId,
        c.req.valid("param").date,
      );
      return c.json(toDailyCloseDto(close));
    })
    .post("/", staff, validate("json", submitDailyCloseSchema), async (c) => {
      const close = await submitDailyClose(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toDailyCloseDto(close), 201);
    })
    .patch(
      "/:id",
      owner,
      validate("param", idParam),
      validate("json", updateDailyCloseSchema),
      async (c) => {
        const close = await updateDailyClose(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toDailyCloseDto(close));
      },
    )
    .post("/:id/approve", owner, validate("param", idParam), async (c) => {
      const close = await approveDailyClose(
        c.get("db"),
        getActor(c),
        c.req.valid("param").id,
        new Date(),
      );
      return c.json(toDailyCloseDto(close));
    });
}
