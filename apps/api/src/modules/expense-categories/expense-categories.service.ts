import type { Executor } from "@ta/db";
import type { ExpenseCategory } from "@ta/validators";

import {
  findActiveCategories,
  findActiveCategoriesByIds,
  type ExpenseCategoryRecord,
} from "./expense-categories.repository";

export function toExpenseCategoryDto(row: ExpenseCategoryRecord): ExpenseCategory {
  return { id: row.id, code: row.code, name: row.name, kind: row.kind };
}

/** Active expense categories by name (bags, packaging, food…). */
export async function listExpenseCategories(db: Executor): Promise<ExpenseCategoryRecord[]> {
  return findActiveCategories(db);
}

/** Which of these ids are active categories; used to validate invoice lines. */
export async function findActiveCategoryIds(
  db: Executor,
  ids: readonly string[],
): Promise<Set<string>> {
  const rows = await findActiveCategoriesByIds(db, [...new Set(ids)]);
  return new Set(rows.map((row) => row.id));
}
