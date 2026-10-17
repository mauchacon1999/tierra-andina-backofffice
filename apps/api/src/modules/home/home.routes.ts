import { toBusinessDate } from "@ta/core";
import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { getMembership, requireRole } from "@/middleware/auth";

import { getHomeBriefing } from "./home.service";

/**
 * /api/v1/home — the owner's briefing. Money stays with the owner (docs/plan.md §4);
 * the manager and the receiver keep their own shortcuts.
 */
export function homeRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", requireRole("owner"), async (c) => {
    const briefing = await getHomeBriefing(
      c.get("db"),
      getMembership(c).storeId,
      toBusinessDate(new Date()),
    );
    return c.json(briefing);
  });
}
