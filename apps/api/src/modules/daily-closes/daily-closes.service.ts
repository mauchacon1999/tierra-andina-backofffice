import type { Database, Executor } from "@ta/db";
import type { SubmitDailyClose, UpdateDailyClose } from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";
import { findOrCreateCustomer, findStoreCustomers } from "@/modules/customers/customers.service";
import { findActiveMethods } from "@/modules/payment-methods/payment-methods.service";

import {
  countSubmittedCloses,
  deleteCloseContents,
  findCloseByDate,
  findCloseById,
  findClosesInRange,
  findCredits,
  findExpenses,
  findPayments,
  insertClose,
  insertCredits,
  insertExpenses,
  insertPayments,
  updateCloseById,
  type CloseRecord,
  type CloseRow,
  type CreditRow,
  type ExpenseRecord,
  type PaymentRow,
} from "./daily-closes.repository";

/*
 * Daily close (docs/domain-model.md §5): the manager writes the amounts collected per payment
 * method, credit sold and expenses paid, each in its own currency (no rate). Once submitted,
 * only the owner can change it, and the owner approves it.
 */

export type CloseWithParts = CloseRow & {
  payments: PaymentRow[];
  credits: CreditRow[];
  expenses: ExpenseRecord[];
};

type CloseContents = UpdateDailyClose;

async function withParts(db: Executor, rows: CloseRow[]): Promise<CloseWithParts[]> {
  const ids = rows.map((row) => row.id);
  const [payments, credits, expenses] = await Promise.all([
    findPayments(db, ids),
    findCredits(db, ids),
    findExpenses(db, ids),
  ]);
  return rows.map((row) => ({
    ...row,
    payments: payments.filter((p) => p.dailyCloseId === row.id),
    credits: credits.filter((c) => c.dailyCloseId === row.id),
    expenses: expenses.filter((e) => e.dailyCloseId === row.id),
  }));
}

async function loadClose(db: Executor, storeId: string, id: string): Promise<CloseWithParts> {
  const row = await findCloseById(db, storeId, id);
  if (!row) throw new AppError(ErrorCode.CLOSE_NOT_FOUND, "El cierre no existe");
  const [close] = await withParts(db, [row]);
  if (!close) throw new Error(`close ${id} vanished`);
  return close;
}

/** The close of a business day. @throws AppError CLOSE_NOT_FOUND */
export async function getDailyClose(
  db: Database,
  storeId: string,
  businessDate: string,
): Promise<CloseWithParts> {
  const row = await findCloseByDate(db, storeId, businessDate);
  if (!row) throw new AppError(ErrorCode.CLOSE_NOT_FOUND, "No hay cierre para ese día");
  return loadClose(db, storeId, row.id);
}

/** Closes between two days (inclusive), newest first, with their contents. */
export async function listDailyCloses(
  db: Database,
  storeId: string,
  range: { from: string; to: string },
): Promise<CloseWithParts[]> {
  return withParts(db, await findClosesInRange(db, storeId, range.from, range.to));
}

/** Closes waiting for the owner's review (the in-app notice). */
export function countPendingCloses(db: Database, storeId: string): Promise<number> {
  return countSubmittedCloses(db, storeId);
}

/** Checks the payment methods and existing customers before writing anything. */
async function checkReferences(db: Executor, storeId: string, contents: CloseContents) {
  const methodIds = contents.payments.map((p) => p.paymentMethodId);
  const methods = await findActiveMethods(db, methodIds);
  if (methods.length !== new Set(methodIds).size) {
    throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND, "Una forma de pago no existe");
  }
  const customerIds = contents.credits.flatMap((c) => (c.customerId ? [c.customerId] : []));
  const found = await findStoreCustomers(db, storeId, customerIds);
  if (found.length !== new Set(customerIds).size) {
    throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, "Un cliente no existe");
  }
}

/** Writes payments, credit sold (creating new customers) and expenses of a close. */
async function writeContents(
  tx: Executor,
  actor: Actor,
  close: CloseRecord,
  contents: CloseContents,
): Promise<void> {
  const audit = { createdBy: actor.userId, updatedBy: actor.userId };
  await insertPayments(
    tx,
    contents.payments.map((p) => ({
      dailyCloseId: close.id,
      paymentMethodId: p.paymentMethodId,
      amount: p.amount,
      ...audit,
    })),
  );
  const credits = [];
  for (const credit of contents.credits) {
    const customerId =
      credit.customerId ?? (await findOrCreateCustomer(tx, actor, credit.customerName ?? "")).id;
    credits.push({
      customerId,
      kind: "credit" as const,
      businessDate: close.businessDate,
      amount: credit.amount,
      currency: credit.currency,
      dailyCloseId: close.id,
      ...audit,
    });
  }
  await insertCredits(tx, credits);
  await insertExpenses(
    tx,
    contents.expenses.map((e) => ({
      storeId: actor.storeId,
      concept: e.concept,
      businessDate: close.businessDate,
      amount: e.amount,
      currency: e.currency,
      dailyCloseId: close.id,
      ...audit,
    })),
  );
}

/**
 * The manager's close of a business day (also the owner). One per store and day; the close
 * and its contents are written and audited in one transaction (the audit entry carries the
 * submitted contents).
 * @throws AppError CLOSE_EXISTS, PAYMENT_METHOD_NOT_FOUND, CUSTOMER_NOT_FOUND
 */
export async function submitDailyClose(
  db: Database,
  actor: Actor,
  input: SubmitDailyClose,
): Promise<CloseWithParts> {
  if (await findCloseByDate(db, actor.storeId, input.businessDate)) {
    throw new AppError(
      ErrorCode.CLOSE_EXISTS,
      "Ese día ya tiene cierre. Si hay que corregirlo, lo hace el dueño.",
    );
  }
  await checkReferences(db, actor.storeId, input);

  const id = await db.transaction(async (tx) => {
    const close = await insertClose(tx, {
      storeId: actor.storeId,
      businessDate: input.businessDate,
      submittedBy: actor.userId,
      cardBatch: input.cardBatch || null,
      cashDestination: input.cashDestination,
      note: input.note || null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await writeContents(tx, actor, close, input);
    await recordAudit(tx, actor, {
      tableName: "daily_closes",
      recordId: close.id,
      action: "insert",
      changes: { ...close, contents: input },
    });
    return close.id;
  });
  return loadClose(db, actor.storeId, id);
}

/**
 * The owner corrects a close: its contents are replaced. Approved closes can be corrected too
 * (the owner decides). Audited with before/after contents.
 * @throws AppError CLOSE_NOT_FOUND, PAYMENT_METHOD_NOT_FOUND, CUSTOMER_NOT_FOUND
 */
export async function updateDailyClose(
  db: Database,
  actor: Actor,
  id: string,
  input: UpdateDailyClose,
): Promise<CloseWithParts> {
  const before = await loadClose(db, actor.storeId, id);
  await checkReferences(db, actor.storeId, input);

  await db.transaction(async (tx) => {
    const close = await updateCloseById(tx, id, {
      cardBatch: input.cardBatch || null,
      cashDestination: input.cashDestination,
      note: input.note || null,
      updatedBy: actor.userId,
    });
    await deleteCloseContents(tx, id);
    await writeContents(tx, actor, close, input);
    await recordAudit(tx, actor, {
      tableName: "daily_closes",
      recordId: id,
      action: "update",
      changes: {
        before: {
          cardBatch: before.cardBatch,
          cashDestination: before.cashDestination,
          note: before.note,
          payments: before.payments.map((p) => ({ method: p.code, amount: p.amount })),
          credits: before.credits.map((c) => ({
            customer: c.customerName,
            amount: c.amount,
            currency: c.currency,
          })),
          expenses: before.expenses.map((e) => ({
            concept: e.concept,
            amount: e.amount,
            currency: e.currency,
          })),
        },
        after: input,
      },
    });
  });
  return loadClose(db, actor.storeId, id);
}

/** The owner approves a close. @throws AppError CLOSE_NOT_FOUND, CLOSE_ALREADY_APPROVED */
export async function approveDailyClose(
  db: Database,
  actor: Actor,
  id: string,
  now: Date,
): Promise<CloseWithParts> {
  const before = await loadClose(db, actor.storeId, id);
  if (before.status === "approved") {
    throw new AppError(ErrorCode.CLOSE_ALREADY_APPROVED, "Ese cierre ya está aprobado");
  }
  await db.transaction(async (tx) => {
    await updateCloseById(tx, id, {
      status: "approved",
      approvedBy: actor.userId,
      approvedAt: now,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "daily_closes",
      recordId: id,
      action: "update",
      changes: { status: { from: "submitted", to: "approved" } },
    });
  });
  return loadClose(db, actor.storeId, id);
}
