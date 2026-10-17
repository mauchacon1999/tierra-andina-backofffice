import { customerSearchQuerySchema } from "@ta/validators";
import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getMembership, requireRole } from "@/middleware/auth";

import { searchCustomers, toCustomerDto } from "./customers.service";

/** /api/v1/customers — who buys on credit (the daily close picks or creates them). */
export function customersRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get(
    "/",
    requireRole("owner", "manager"),
    validate("query", customerSearchQuerySchema),
    async (c) => {
      const { search } = c.req.valid("query");
      const rows = await searchCustomers(c.get("db"), getMembership(c).storeId, search);
      return c.json({ data: rows.map(toCustomerDto) });
    },
  );
}
