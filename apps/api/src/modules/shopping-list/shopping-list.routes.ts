import { createShoppingListItemSchema } from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  addShoppingItem,
  dropShoppingItem,
  listOpenItems,
  toShoppingItemDto,
} from "./shopping-list.service";

const itemParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });

/**
 * /api/v1/shopping-list — what the shop needs before Coche. The owner collects it; the manager
 * can too, once that user exists (docs/plan.md §4). Buying checks items off from the trip.
 */
export function shoppingListRoutes(): Hono<AppEnv> {
  const staff = requireRole("owner", "manager");
  return new Hono<AppEnv>()
    .get("/", staff, async (c) => {
      const rows = await listOpenItems(c.get("db"), getMembership(c).storeId);
      return c.json({ data: rows.map(toShoppingItemDto) });
    })
    .post("/", staff, validate("json", createShoppingListItemSchema), async (c) => {
      const row = await addShoppingItem(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toShoppingItemDto(row), 201);
    })
    .post("/:id/drop", staff, validate("param", itemParam), async (c) => {
      const row = await dropShoppingItem(c.get("db"), getActor(c), c.req.valid("param").id);
      return c.json(toShoppingItemDto(row));
    });
}
