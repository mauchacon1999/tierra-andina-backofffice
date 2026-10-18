import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { requireRole } from "@/middleware/auth";

import { listExpenseCategories, toExpenseCategoryDto } from "./expense-categories.service";

/** /api/v1/expense-categories — what a supply bought on credit is for (owner). */
export function expenseCategoriesRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", requireRole("owner"), async (c) => {
    const rows = await listExpenseCategories(c.get("db"));
    return c.json({ data: rows.map(toExpenseCategoryDto) });
  });
}
