import type { Executor } from "@ta/db";
import type { Customer } from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import type { Actor } from "@/lib/types";

import {
  findCustomerByName,
  findCustomers,
  findCustomersByIds,
  insertCustomer,
  type CustomerRecord,
} from "./customers.repository";

export type { CustomerRecord };

/** Active customers of the store, by name; `search` matches anywhere, ignoring case. */
export function searchCustomers(
  db: Executor,
  storeId: string,
  search: string | undefined,
): Promise<CustomerRecord[]> {
  return findCustomers(db, storeId, search);
}

/** The store's customers among `ids` (others are missing from the result). */
export function findStoreCustomers(
  db: Executor,
  storeId: string,
  ids: readonly string[],
): Promise<CustomerRecord[]> {
  return findCustomersByIds(db, storeId, ids);
}

/**
 * The customer with this name (case-insensitive) or a new one, so writing "maría" in two
 * closes does not create two customers. Runs in the caller's transaction; audited.
 */
export async function findOrCreateCustomer(
  tx: Executor,
  actor: Actor,
  name: string,
): Promise<CustomerRecord> {
  const existing = await findCustomerByName(tx, actor.storeId, name);
  if (existing) return existing;
  const created = await insertCustomer(tx, {
    storeId: actor.storeId,
    name,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await recordAudit(tx, actor, {
    tableName: "customers",
    recordId: created.id,
    action: "insert",
    changes: created,
  });
  return created;
}

export function toCustomerDto(row: CustomerRecord): Customer {
  return { id: row.id, name: row.name, phone: row.phone };
}
