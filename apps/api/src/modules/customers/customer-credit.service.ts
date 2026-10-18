import { compareDecimals, customerCreditBalance, type CurrencyTotals } from "@ta/core";
import type { Database, Executor } from "@ta/db";
import type {
  CustomerBalance,
  CustomerCreditDetail,
  CustomerCreditQuery,
  CustomerPayment,
  MembershipRole,
  UpdateCustomer,
} from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";

import {
  deleteEntryById,
  findAllCustomers,
  findCustomer,
  findEntries,
  findEntry,
  findEntryTotals,
  insertEntry,
  updateCustomerById,
  type CustomerRecord,
  type EntryRecord,
  type EntryTotalRow,
} from "./customers.repository";

/*
 * Customer credit, "fiado" (docs/domain-model.md §6): what each customer owes per currency.
 * Credit sales come from the daily close; payments are written here by the owner or the
 * manager (the manager, only today's). No rate: bolívares and dollars are separate balances.
 */

export type CustomerBalanceView = CustomerRecord & {
  balance: CurrencyTotals;
  lastEntryOn: string | null;
};

export type CustomerCreditView = CustomerBalanceView & { entries: EntryRecord[] };

const isZero = (totals: CurrencyTotals): boolean =>
  compareDecimals(totals.USD, "0") === 0 && compareDecimals(totals.VES, "0") === 0;

function balanceOf(
  rows: readonly EntryTotalRow[],
): Omit<CustomerBalanceView, keyof CustomerRecord> {
  return {
    balance: customerCreditBalance(rows),
    lastEntryOn: rows.reduce<string | null>(
      (last, row) => (last === null || row.lastOn > last ? row.lastOn : last),
      null,
    ),
  };
}

async function requireCustomer(db: Executor, storeId: string, id: string): Promise<CustomerRecord> {
  const row = await findCustomer(db, storeId, id);
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, "El cliente no existe");
  return row;
}

export type CustomerBalanceListView = { data: CustomerBalanceView[]; total: CurrencyTotals };

/**
 * The store's customers with what each owes, by name. `owing` keeps only those with a balance
 * other than zero (in favor included). `total` is the listed customers' net balance.
 */
export async function listCustomerBalances(
  db: Executor,
  storeId: string,
  query: CustomerCreditQuery,
): Promise<CustomerBalanceListView> {
  const [customers, totals] = await Promise.all([
    findAllCustomers(db, storeId, query.search),
    findEntryTotals(db, storeId),
  ]);
  const byCustomer = new Map<string, EntryTotalRow[]>();
  for (const row of totals) {
    byCustomer.set(row.customerId, [...(byCustomer.get(row.customerId) ?? []), row]);
  }
  const data = customers
    .map((customer) => ({ ...customer, ...balanceOf(byCustomer.get(customer.id) ?? []) }))
    .filter((customer) => !query.owing || !isZero(customer.balance));
  // Net, like the home briefing: what is owed minus what customers have in favor.
  const listed = new Set(data.map((customer) => customer.id));
  return {
    data,
    total: customerCreditBalance(totals.filter((row) => listed.has(row.customerId))),
  };
}

/** A customer, its balance and its history, newest first. @throws AppError NOT_FOUND */
export async function getCustomerCredit(
  db: Executor,
  storeId: string,
  id: string,
): Promise<CustomerCreditView> {
  const customer = await requireCustomer(db, storeId, id);
  const entries = await findEntries(db, id);
  return {
    ...customer,
    balance: customerCreditBalance(entries),
    lastEntryOn: entries[0]?.businessDate ?? null,
    entries,
  };
}

/**
 * A payment from the customer, in the currency it was paid in. Audited. The manager may only
 * write today's (like the daily close).
 * @throws AppError NOT_FOUND, PAYMENT_DATE_LOCKED
 */
export async function recordCustomerPayment(
  db: Database,
  actor: Actor & { role: MembershipRole },
  id: string,
  input: CustomerPayment,
  today: string,
): Promise<CustomerCreditView> {
  await requireCustomer(db, actor.storeId, id);
  if (actor.role !== "owner" && input.businessDate !== today) {
    throw new AppError(
      ErrorCode.PAYMENT_DATE_LOCKED,
      "Solo puedes anotar abonos de hoy",
      undefined,
      { fieldErrors: { businessDate: ["Solo puedes anotar abonos de hoy"] } },
    );
  }
  await db.transaction(async (tx) => {
    const entry = await insertEntry(tx, {
      customerId: id,
      kind: "payment",
      businessDate: input.businessDate,
      amount: input.amount,
      currency: input.currency,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "customer_credit_entries",
      recordId: entry.id,
      action: "insert",
      changes: entry,
    });
  });
  return getCustomerCredit(db, actor.storeId, id);
}

/**
 * Deletes a payment written by mistake (owner). Credit sales and anything written in a daily
 * close are corrected in the close. Audited.
 * @throws AppError NOT_FOUND, CREDIT_ENTRY_NOT_FOUND, CREDIT_ENTRY_FROM_CLOSE
 */
export async function deleteCustomerPayment(
  db: Database,
  actor: Actor,
  id: string,
  entryId: string,
): Promise<CustomerCreditView> {
  await requireCustomer(db, actor.storeId, id);
  await db.transaction(async (tx) => {
    const entry = await findEntry(tx, id, entryId);
    if (!entry) throw new AppError(ErrorCode.CREDIT_ENTRY_NOT_FOUND, "El movimiento no existe");
    if (entry.kind !== "payment" || entry.dailyCloseId !== null) {
      throw new AppError(
        ErrorCode.CREDIT_ENTRY_FROM_CLOSE,
        "Las ventas a crédito se corrigen en el cierre del día",
      );
    }
    await deleteEntryById(tx, entryId);
    await recordAudit(tx, actor, {
      tableName: "customer_credit_entries",
      recordId: entryId,
      action: "delete",
      changes: entry,
    });
  });
  return getCustomerCredit(db, actor.storeId, id);
}

/** Name and phone of a customer (owner). Audited. @throws AppError NOT_FOUND */
export async function updateCustomer(
  db: Database,
  actor: Actor,
  id: string,
  patch: UpdateCustomer,
): Promise<CustomerCreditView> {
  await db.transaction(async (tx) => {
    const before = await requireCustomer(tx, actor.storeId, id);
    const after = await updateCustomerById(tx, id, {
      name: patch.name,
      phone: patch.phone === undefined ? undefined : patch.phone || null,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "customers",
      recordId: id,
      action: "update",
      changes: diffChanges(before, after),
    });
  });
  return getCustomerCredit(db, actor.storeId, id);
}

export function toCustomerBalanceDto(row: CustomerBalanceView): CustomerBalance {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    balance: row.balance,
    lastEntryOn: row.lastEntryOn,
  };
}

export function toCustomerCreditDto(row: CustomerCreditView): CustomerCreditDetail {
  return {
    ...toCustomerBalanceDto(row),
    entries: row.entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      businessDate: entry.businessDate,
      amount: entry.amount,
      currency: entry.currency,
      dailyCloseId: entry.dailyCloseId,
    })),
  };
}
