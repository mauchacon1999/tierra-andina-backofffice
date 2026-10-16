import type { Database, Executor } from "@ta/db";
import type { CreateSupplier, Supplier } from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import type { Actor } from "@/lib/types";

import {
  findActiveSuppliers,
  findSupplierById,
  insertSupplier,
  type SupplierRecord,
} from "./suppliers.repository";

export function toSupplierDto(row: SupplierRecord): Supplier {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    phone: row.phone,
    stallReference: row.stallReference,
    isActive: row.isActive,
  };
}

/** Active suppliers by name (stalls and local suppliers). */
export async function listSuppliers(db: Executor): Promise<SupplierRecord[]> {
  return findActiveSuppliers(db);
}

/** A supplier by id, or undefined. Used by other modules (purchases) to validate references. */
export async function getSupplier(db: Executor, id: string): Promise<SupplierRecord | undefined> {
  return findSupplierById(db, id);
}

/** Registers a stall or local supplier (audited). */
export async function createSupplier(
  db: Database,
  actor: Actor,
  input: CreateSupplier,
): Promise<SupplierRecord> {
  return db.transaction(async (tx) => {
    const row = await insertSupplier(tx, {
      name: input.name,
      kind: input.kind,
      phone: input.phone || null,
      stallReference: input.stallReference || null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "suppliers",
      recordId: row.id,
      action: "insert",
      changes: row,
    });
    return row;
  });
}
