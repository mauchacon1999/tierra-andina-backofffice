import { type Executor, schema } from "@ta/db";
import { and, eq } from "drizzle-orm";

/** Fallback when a store has no `default_margin` setting (domain-model §9.1: 0.50). */
export const DEFAULT_MARGIN = "0.50";

/** Raw jsonb value of a store setting, or undefined when it is not set. */
export async function getStoreSetting(
  db: Executor,
  storeId: string,
  key: string,
): Promise<unknown> {
  const [row] = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(and(eq(schema.settings.storeId, storeId), eq(schema.settings.key, key)))
    .limit(1);
  return row?.value;
}

/** The store's default margin as a fraction string ("0.50"). Decimals are stored as strings. */
export async function getDefaultMargin(db: Executor, storeId: string): Promise<string> {
  const value = await getStoreSetting(db, storeId, "default_margin");
  return typeof value === "string" ? value : DEFAULT_MARGIN;
}
