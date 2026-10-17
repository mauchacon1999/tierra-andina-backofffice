import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { requireRole } from "@/middleware/auth";

import { listPaymentMethods, toPaymentMethodDto } from "./payment-methods.service";

/** /api/v1/payment-methods — how the shop gets paid (the daily close form). */
export function paymentMethodsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", requireRole("owner", "manager"), async (c) => {
    const rows = await listPaymentMethods(c.get("db"));
    return c.json({ data: rows.map(toPaymentMethodDto) });
  });
}
