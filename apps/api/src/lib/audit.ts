import { type Executor, schema } from "@ta/db";

import type { Actor } from "@/lib/types";

export type AuditAction = "insert" | "update" | "delete";

export type AuditEntry = {
  tableName: string;
  recordId: string;
  action: AuditAction;
  /** Inserted row, `diffChanges(before, after)` for updates, or the deleted row. */
  changes?: unknown;
};

/**
 * Writes one audit_logs row. Call it with the same transaction as the audited write, so the
 * change and its log commit (or roll back) together.
 */
export async function recordAudit(db: Executor, actor: Actor, entry: AuditEntry): Promise<void> {
  await db.insert(schema.auditLogs).values({
    storeId: actor.storeId,
    userId: actor.userId,
    tableName: entry.tableName,
    recordId: entry.recordId,
    action: entry.action,
    changes: entry.changes ?? null,
  });
}

export type FieldChanges = Record<string, { from: unknown; to: unknown }>;

/** Fields whose value differs between two versions of a row (audit columns are ignored). */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldChanges {
  const ignored = new Set(["updatedAt", "updatedBy", "createdAt", "createdBy"]);
  const changes: FieldChanges = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (ignored.has(key)) continue;
    const from = before[key];
    const to = after[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
  }
  return changes;
}
