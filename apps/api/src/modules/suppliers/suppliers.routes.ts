import { createSupplierSchema } from "@ta/validators";
import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, requireRole } from "@/middleware/auth";

import { createSupplier, listSuppliers, toSupplierDto } from "./suppliers.service";

/** /api/v1/suppliers — minimal catalog used by purchase lines (owner). */
export function suppliersRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .get("/", requireRole("owner"), async (c) => {
      const rows = await listSuppliers(c.get("db"));
      return c.json({ data: rows.map(toSupplierDto) });
    })
    .post("/", requireRole("owner"), validate("json", createSupplierSchema), async (c) => {
      const row = await createSupplier(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toSupplierDto(row), 201);
    });
}
