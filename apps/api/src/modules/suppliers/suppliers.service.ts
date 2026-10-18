import { bankName } from "@ta/core";
import type { Database, Executor } from "@ta/db";
import type {
  CreateSupplier,
  Supplier,
  SupplierDetail,
  SupplierPaymentAccount,
  SupplierPaymentAccountFields,
  UpdateSupplier,
} from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import { isUniqueViolation } from "@/lib/pg-errors";
import type { Actor } from "@/lib/types";

import {
  findAccount,
  findAccounts,
  findActiveSuppliers,
  findSupplierById,
  insertAccount,
  insertSupplier,
  updateAccountById,
  updateSupplierById,
  type AccountRecord,
  type SupplierRecord,
} from "./suppliers.repository";

export function toSupplierDto(row: SupplierRecord): Supplier {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    phone: row.phone,
    stallReference: row.stallReference,
    notes: row.notes,
    isActive: row.isActive,
  };
}

export function toAccountDto(row: AccountRecord): SupplierPaymentAccount {
  return {
    id: row.id,
    bankCode: row.bankCode,
    bankName: bankName(row.bankCode) ?? row.bankCode,
    phone: row.phone,
    idDocument: row.idDocument,
    isActive: row.isActive,
  };
}

export type SupplierWithAccounts = SupplierRecord & { accounts: AccountRecord[] };

export function toSupplierDetailDto(row: SupplierWithAccounts): SupplierDetail {
  return { ...toSupplierDto(row), accounts: row.accounts.map(toAccountDto) };
}

/** "" clears an optional text; undefined keeps it. */
const textOrNull = (value: string | undefined): string | null | undefined =>
  value === undefined ? undefined : value || null;

const accountExists = () =>
  new AppError(
    ErrorCode.ACCOUNT_EXISTS,
    "Ese proveedor ya tiene una cuenta con ese banco y teléfono",
    undefined,
    { fieldErrors: { phone: ["Ya está registrada para este proveedor"] } },
  );

/** Active suppliers by name (stalls and local suppliers). */
export async function listSuppliers(db: Executor): Promise<SupplierRecord[]> {
  return findActiveSuppliers(db);
}

/** A supplier by id, or undefined. Used by other modules (purchases) to validate references. */
export async function getSupplier(db: Executor, id: string): Promise<SupplierRecord | undefined> {
  return findSupplierById(db, id);
}

async function requireSupplier(db: Executor, id: string): Promise<SupplierRecord> {
  const row = await findSupplierById(db, id);
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, "El proveedor no existe");
  return row;
}

/** A supplier with its pago móvil accounts (active first). @throws AppError NOT_FOUND */
export async function getSupplierDetail(db: Executor, id: string): Promise<SupplierWithAccounts> {
  const row = await requireSupplier(db, id);
  return { ...row, accounts: await findAccounts(db, id) };
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
      notes: input.notes || null,
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

/** Changes the fields sent (audited). @throws AppError NOT_FOUND */
export async function updateSupplier(
  db: Database,
  actor: Actor,
  id: string,
  patch: UpdateSupplier,
): Promise<SupplierWithAccounts> {
  await db.transaction(async (tx) => {
    const before = await requireSupplier(tx, id);
    const after = await updateSupplierById(tx, id, {
      name: patch.name,
      kind: patch.kind,
      phone: textOrNull(patch.phone),
      stallReference: textOrNull(patch.stallReference),
      notes: textOrNull(patch.notes),
      isActive: patch.isActive,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "suppliers",
      recordId: id,
      action: "update",
      changes: diffChanges(before, after),
    });
  });
  return getSupplierDetail(db, id);
}

/**
 * Adds a pago móvil account (already normalized by the schema). Audited.
 * @throws AppError NOT_FOUND, ACCOUNT_EXISTS (same bank and phone for this supplier)
 */
export async function addAccount(
  db: Database,
  actor: Actor,
  supplierId: string,
  input: SupplierPaymentAccountFields,
): Promise<SupplierWithAccounts> {
  await requireSupplier(db, supplierId);
  try {
    await db.transaction(async (tx) => {
      const row = await insertAccount(tx, {
        supplierId,
        ...input,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
      await recordAudit(tx, actor, {
        tableName: "supplier_payment_accounts",
        recordId: row.id,
        action: "insert",
        changes: row,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, "supplier_payment_accounts_supplier_id_bank_code_phone_key")) {
      throw accountExists();
    }
    throw error;
  }
  return getSupplierDetail(db, supplierId);
}

/**
 * Replaces an account's data, or deactivates it (`isActive: false`; payments keep pointing at
 * it). Audited. @throws AppError NOT_FOUND, ACCOUNT_NOT_FOUND, ACCOUNT_EXISTS
 */
export async function updateAccount(
  db: Database,
  actor: Actor,
  supplierId: string,
  accountId: string,
  patch: Partial<SupplierPaymentAccountFields> & { isActive?: boolean },
): Promise<SupplierWithAccounts> {
  await requireSupplier(db, supplierId);
  try {
    await db.transaction(async (tx) => {
      const before = await findAccount(tx, supplierId, accountId);
      if (!before) throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, "La cuenta no existe");
      const after = await updateAccountById(tx, accountId, { ...patch, updatedBy: actor.userId });
      await recordAudit(tx, actor, {
        tableName: "supplier_payment_accounts",
        recordId: accountId,
        action: "update",
        changes: diffChanges(before, after),
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, "supplier_payment_accounts_supplier_id_bank_code_phone_key")) {
      throw accountExists();
    }
    throw error;
  }
  return getSupplierDetail(db, supplierId);
}
