import { type Executor, schema } from "@ta/db";
import { and, asc, eq, inArray } from "drizzle-orm";

const { expenseCategories } = schema;

export type ExpenseCategoryRecord = typeof expenseCategories.$inferSelect;

export async function findActiveCategories(db: Executor): Promise<ExpenseCategoryRecord[]> {
  return db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.isActive, true))
    .orderBy(asc(expenseCategories.name));
}

export async function findActiveCategoriesByIds(
  db: Executor,
  ids: readonly string[],
): Promise<ExpenseCategoryRecord[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(expenseCategories)
    .where(and(inArray(expenseCategories.id, [...ids]), eq(expenseCategories.isActive, true)));
}
