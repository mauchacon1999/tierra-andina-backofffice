import {
  balanceInBs,
  formatMobilePaymentAmount,
  formatPagoMovilClipboard,
  InvalidValueError,
  PAYABLE_PAYMENT_METHOD_CURRENCY,
  payableBalance,
  payableLineSubtotal,
  payableStatus,
  PaymentExceedsBalanceError,
  settlePayment,
  sumDecimals,
  totalsByCurrency,
  type CurrencyTotals,
  type PayableStatus,
} from "@ta/core";
import type { Database, Executor } from "@ta/db";
import type {
  PayableFields,
  PayableListQuery,
  PayablePaymentFields,
  PayableTerms,
} from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";
import { getDailyRates } from "@/modules/exchange-rates/exchange-rates.service";
import { findActiveCategoryIds } from "@/modules/expense-categories/expense-categories.service";
import {
  getSupplier,
  getSupplierDetail,
  type SupplierWithAccounts,
} from "@/modules/suppliers/suppliers.service";

import {
  deleteLines,
  deletePaymentById,
  findLines,
  findPaidTotals,
  findPayable,
  findPayment,
  findPayments,
  findStorePayables,
  findTripPayables,
  hasPurchaseLines,
  insertLines,
  insertPayable,
  insertPayment,
  lockStore,
  nextPayableNumber,
  updatePayableById,
  type LineRow,
  type PayableRow,
  type PaymentRecord,
  type TripPayableRow,
} from "./payables.repository";

/*
 * Payables (docs/modules/payables.md): supplier invoices on credit, in USD or Bs, and their
 * partial payments. Owner only. Manual invoices hold supplies; merchandise invoices come from
 * the purchase form (local purchases, Coche credit lines). The status is always derived.
 */

export type PayableView = PayableRow & { paid: string; balance: string; status: PayableStatus };

export type PayableDetailView = PayableView & { lines: LineRow[]; payments: PaymentRecord[] };

export type PayableListView = {
  data: PayableView[];
  total: number;
  page: number;
  pageSize: number;
  balance: CurrencyTotals;
};

function view(row: PayableRow, paid: string, today: string): PayableView {
  const balance = payableBalance(row.total, [paid]);
  return {
    ...row,
    paid: sumDecimals([paid]),
    balance,
    status: payableStatus({
      total: row.total,
      balance,
      // An invoice without a due date (from a Coche trip, until the owner sets it) is never overdue.
      dueOn: row.dueOn ?? "9999-12-31",
      today,
      isVoided: row.voidedAt !== null,
    }),
  };
}

async function requirePayable(
  db: Executor,
  storeId: string,
  id: string,
  options?: { forUpdate?: boolean },
): Promise<PayableRow> {
  const row = await findPayable(db, storeId, id, options);
  if (!row) throw new AppError(ErrorCode.PAYABLE_NOT_FOUND, "La factura no existe");
  return row;
}

function ensureNotVoided(row: PayableRow): void {
  if (row.voidedAt !== null) {
    throw new AppError(ErrorCode.PAYABLE_VOIDED, "La factura está anulada");
  }
}

/** An active supplier. @throws AppError SUPPLIER_NOT_FOUND (a 422 on the field) */
async function requireSupplier(db: Executor, supplierId: string): Promise<void> {
  const supplier = await getSupplier(db, supplierId);
  if (supplier?.isActive) return;
  throw new AppError(ErrorCode.SUPPLIER_NOT_FOUND, "Elige un proveedor de la lista", undefined, {
    fieldErrors: { supplierId: ["Elige un proveedor de la lista"] },
  });
}

/** Supply lines with their subtotals, after checking their expense categories. */
async function supplyLines(db: Executor, input: PayableFields) {
  const active = await findActiveCategoryIds(
    db,
    input.lines.map((line) => line.expenseCategoryId),
  );
  const missing = input.lines.findIndex((line) => !active.has(line.expenseCategoryId));
  if (missing >= 0) {
    throw new AppError(
      ErrorCode.EXPENSE_CATEGORY_NOT_FOUND,
      "Elige una categoría de la lista",
      undefined,
      {
        fieldErrors: {
          [`lines.${missing}.expenseCategoryId`]: ["Elige una categoría de la lista"],
        },
      },
    );
  }
  return input.lines.map((line) => ({
    ...line,
    subtotal: payableLineSubtotal(line.quantity, line.unitPrice),
  }));
}

/**
 * The store's invoices, newest first, filtered by status and supplier and paginated in memory
 * (the status depends on today and the payments). `balance` adds up what the filtered
 * invoices still owe, per currency.
 */
export async function listPayables(
  db: Executor,
  storeId: string,
  query: PayableListQuery,
  today: string,
): Promise<PayableListView> {
  const rows = await findStorePayables(db, storeId, query.supplierId);
  const paid = await findPaidTotals(
    db,
    rows.map((row) => row.id),
  );
  const all = rows
    .map((row) => view(row, paid.get(row.id) ?? "0", today))
    .filter((row) => query.status === undefined || row.status === query.status);
  const start = (query.page - 1) * query.pageSize;
  return {
    data: all.slice(start, start + query.pageSize),
    total: all.length,
    page: query.page,
    pageSize: query.pageSize,
    balance: totalsByCurrency(
      all
        .filter((row) => row.status !== "voided")
        .map((row) => ({ amount: row.balance, currency: row.currency })),
    ),
  };
}

/** An invoice with its lines and payments. @throws AppError PAYABLE_NOT_FOUND */
export async function getPayable(
  db: Executor,
  storeId: string,
  id: string,
  today: string,
): Promise<PayableDetailView> {
  const row = await requirePayable(db, storeId, id);
  const [lines, payments, paid] = await Promise.all([
    findLines(db, id),
    findPayments(db, id),
    findPaidTotals(db, [id]),
  ]);
  return { ...view(row, paid.get(id) ?? "0", today), lines, payments };
}

/**
 * Registers a supplies invoice with the store's next number (CXP-000123). Audited.
 * @throws AppError SUPPLIER_NOT_FOUND, EXPENSE_CATEGORY_NOT_FOUND
 */
export async function createPayable(
  db: Database,
  actor: Actor,
  input: PayableFields,
  today: string,
): Promise<PayableDetailView> {
  const id = await db.transaction(async (tx) => {
    await requireSupplier(tx, input.supplierId);
    const lines = await supplyLines(tx, input);
    await lockStore(tx, actor.storeId);
    const row = await insertPayable(tx, {
      storeId: actor.storeId,
      number: await nextPayableNumber(tx, actor.storeId),
      supplierId: input.supplierId,
      currency: input.currency,
      total: sumDecimals(lines.map((line) => line.subtotal)),
      issuedOn: input.issuedOn,
      dueOn: input.dueOn,
      note: input.note ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await insertLines(
      tx,
      lines.map((line) => ({ payableId: row.id, ...line, createdBy: actor.userId })),
    );
    await recordAudit(tx, actor, {
      tableName: "payables",
      recordId: row.id,
      action: "insert",
      changes: { ...row, lines },
    });
    return row.id;
  });
  return getPayable(db, actor.storeId, id, today);
}

/**
 * Replaces a supplies invoice (supplier, currency, dates, note and lines) while it has no
 * payments. Audited. @throws AppError PAYABLE_NOT_FOUND, PAYABLE_VOIDED, PAYABLE_HAS_PAYMENTS,
 * PAYABLE_FROM_PURCHASE, SUPPLIER_NOT_FOUND, EXPENSE_CATEGORY_NOT_FOUND
 */
export async function replacePayable(
  db: Database,
  actor: Actor,
  id: string,
  input: PayableFields,
  today: string,
): Promise<PayableDetailView> {
  await db.transaction(async (tx) => {
    const before = await requirePayable(tx, actor.storeId, id, { forUpdate: true });
    ensureNotVoided(before);
    if ((await findPayments(tx, id)).length > 0) {
      throw new AppError(
        ErrorCode.PAYABLE_HAS_PAYMENTS,
        "La factura ya tiene abonos: solo puedes cambiar su vencimiento y nota",
      );
    }
    if (await hasPurchaseLines(tx, id)) {
      throw new AppError(
        ErrorCode.PAYABLE_FROM_PURCHASE,
        "Esta factura viene de una compra: corrige la compra, no la factura",
      );
    }
    await requireSupplier(tx, input.supplierId);
    const lines = await supplyLines(tx, input);
    const after = await updatePayableById(tx, id, {
      supplierId: input.supplierId,
      currency: input.currency,
      total: sumDecimals(lines.map((line) => line.subtotal)),
      issuedOn: input.issuedOn,
      dueOn: input.dueOn,
      note: input.note ?? null,
      updatedBy: actor.userId,
    });
    await deleteLines(tx, id);
    await insertLines(
      tx,
      lines.map((line) => ({ payableId: id, ...line, createdBy: actor.userId })),
    );
    const { supplierName: _name, ...beforeRow } = before;
    await recordAudit(tx, actor, {
      tableName: "payables",
      recordId: id,
      action: "update",
      changes: { ...diffChanges(beforeRow, after), lines: { to: lines } },
    });
  });
  return getPayable(db, actor.storeId, id, today);
}

/**
 * Sets the due date and note of an invoice that is not voided (payments do not matter).
 * Audited. @throws AppError PAYABLE_NOT_FOUND, PAYABLE_VOIDED, INVALID_DUE_DATE
 */
export async function setPayableTerms(
  db: Database,
  actor: Actor,
  id: string,
  terms: PayableTerms,
  today: string,
): Promise<PayableDetailView> {
  await db.transaction(async (tx) => {
    const before = await requirePayable(tx, actor.storeId, id, { forUpdate: true });
    ensureNotVoided(before);
    if (terms.dueOn < before.issuedOn) {
      throw new AppError(
        ErrorCode.INVALID_DUE_DATE,
        "El vencimiento no puede ser antes de la emisión",
        undefined,
        { fieldErrors: { dueOn: ["El vencimiento no puede ser antes de la emisión"] } },
      );
    }
    const after = await updatePayableById(tx, id, {
      dueOn: terms.dueOn,
      note: terms.note ?? null,
      updatedBy: actor.userId,
    });
    const { supplierName: _name, ...beforeRow } = before;
    await recordAudit(tx, actor, {
      tableName: "payables",
      recordId: id,
      action: "update",
      changes: diffChanges(beforeRow, after),
    });
  });
  return getPayable(db, actor.storeId, id, today);
}

/**
 * Voids an invoice without payments: it stays listed as voided and owes nothing. Audited.
 * @throws AppError PAYABLE_NOT_FOUND, PAYABLE_VOIDED, PAYABLE_HAS_PAYMENTS
 */
export async function voidPayable(
  db: Database,
  actor: Actor,
  id: string,
  now: Date,
  today: string,
): Promise<PayableDetailView> {
  await db.transaction(async (tx) => {
    const before = await requirePayable(tx, actor.storeId, id, { forUpdate: true });
    ensureNotVoided(before);
    if ((await findPayments(tx, id)).length > 0) {
      throw new AppError(
        ErrorCode.PAYABLE_HAS_PAYMENTS,
        "La factura tiene abonos: bórralos antes de anularla",
      );
    }
    await updatePayableById(tx, id, {
      voidedAt: now,
      voidedBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "payables",
      recordId: id,
      action: "update",
      changes: { voidedAt: { from: null, to: now.toISOString() } },
    });
  });
  return getPayable(db, actor.storeId, id, today);
}

function exceedsBalance(error: PaymentExceedsBalanceError): AppError {
  const owed = `${error.balance} ${error.currency === "USD" ? "$" : "Bs"}`;
  return new AppError(
    ErrorCode.PAYMENT_EXCEEDS_BALANCE,
    `El abono es mayor que el saldo (${owed})`,
    undefined,
    {
      balance: error.balance,
      currency: error.currency,
      fieldErrors: { amount: [`El saldo es ${owed}`] },
    },
  );
}

/**
 * Records a payment: its currency comes from the method, the amount is converted at `rate`
 * (BCV of the day) and applied to the balance (@ta/core `settlePayment`). Audited.
 * @throws AppError PAYABLE_NOT_FOUND, PAYABLE_VOIDED, INVALID_PAYMENT_ACCOUNT,
 *   PAYMENT_EXCEEDS_BALANCE, INVALID_PAYMENT_AMOUNT
 */
export async function recordPayment(
  db: Database,
  actor: Actor,
  id: string,
  input: PayablePaymentFields,
  today: string,
): Promise<PayableDetailView> {
  await db.transaction(async (tx) => {
    // Locked so two payments at once cannot both fit in the same balance.
    const row = await requirePayable(tx, actor.storeId, id, { forUpdate: true });
    ensureNotVoided(row);
    if (input.accountId !== undefined) {
      const supplier = await getSupplierDetail(tx, row.supplierId);
      const account = supplier.accounts.find((a) => a.id === input.accountId && a.isActive);
      if (!account) {
        throw new AppError(
          ErrorCode.INVALID_PAYMENT_ACCOUNT,
          "Elige una cuenta del proveedor",
          undefined,
          { fieldErrors: { accountId: ["Elige una cuenta del proveedor"] } },
        );
      }
    }
    const paid = (await findPaidTotals(tx, [id])).get(id) ?? "0";
    const currency = PAYABLE_PAYMENT_METHOD_CURRENCY[input.method];
    let settled;
    try {
      settled = settlePayment({
        payableCurrency: row.currency,
        balance: payableBalance(row.total, [paid]),
        amount: input.amount,
        currency,
        rate: input.rate,
      });
    } catch (error) {
      if (error instanceof PaymentExceedsBalanceError) throw exceedsBalance(error);
      if (error instanceof InvalidValueError) {
        throw new AppError(
          ErrorCode.INVALID_PAYMENT_AMOUNT,
          "El monto es demasiado pequeño",
          undefined,
          { fieldErrors: { amount: ["El monto es demasiado pequeño"] } },
        );
      }
      throw error;
    }
    const payment = await insertPayment(tx, {
      payableId: id,
      paidOn: input.paidOn,
      method: input.method,
      currency,
      amountUsd: settled.amountUsd,
      amountBs: settled.amountBs,
      rate: input.rate,
      applied: settled.applied,
      reference: input.reference ?? null,
      accountId: input.accountId ?? null,
      note: input.note ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "payable_payments",
      recordId: payment.id,
      action: "insert",
      changes: payment,
    });
  });
  return getPayable(db, actor.storeId, id, today);
}

/**
 * Deletes a payment recorded by mistake; the balance goes back up. Audited.
 * @throws AppError PAYABLE_NOT_FOUND, PAYABLE_VOIDED, PAYMENT_NOT_FOUND
 */
export async function deletePayment(
  db: Database,
  actor: Actor,
  id: string,
  paymentId: string,
  today: string,
): Promise<PayableDetailView> {
  await db.transaction(async (tx) => {
    const row = await requirePayable(tx, actor.storeId, id, { forUpdate: true });
    ensureNotVoided(row);
    const payment = await findPayment(tx, id, paymentId);
    if (!payment) throw new AppError(ErrorCode.PAYMENT_NOT_FOUND, "El abono no existe");
    await deletePaymentById(tx, paymentId);
    await recordAudit(tx, actor, {
      tableName: "payable_payments",
      recordId: paymentId,
      action: "delete",
      changes: payment,
    });
  });
  return getPayable(db, actor.storeId, id, today);
}

export type MobilePaymentView = {
  businessDate: string;
  currency: "USD" | "VES";
  balance: string;
  bcvRate: string | null;
  amountBs: string;
  amountText: string;
  accounts: (SupplierWithAccounts["accounts"][number] & { clipboard: string })[];
};

/**
 * What to pay today by pago móvil: the balance in Bs (a USD invoice at today's BCV rate) and
 * the "Pegar datos" text of each active account of the supplier.
 * @throws AppError PAYABLE_NOT_FOUND, PAYABLE_VOIDED, PAYABLE_SETTLED, BCV_RATE_MISSING
 */
export async function getMobilePaymentData(
  db: Executor,
  storeId: string,
  id: string,
  today: string,
): Promise<MobilePaymentView> {
  const payable = await getPayable(db, storeId, id, today);
  ensureNotVoided(payable);
  if (payable.status === "paid") {
    throw new AppError(ErrorCode.PAYABLE_SETTLED, "La factura ya está pagada");
  }
  let bcvRate: string | null = null;
  if (payable.currency === "USD") {
    bcvRate = (await getDailyRates(db, storeId, today)).bcv;
    if (bcvRate === null) {
      throw new AppError(
        ErrorCode.BCV_RATE_MISSING,
        "Registra la tasa BCV de hoy para calcular el monto en bolívares",
      );
    }
  }
  const amountBs = balanceInBs(payable.balance, payable.currency, bcvRate ?? "1");
  const supplier = await getSupplierDetail(db, payable.supplierId);
  return {
    businessDate: today,
    currency: payable.currency,
    balance: payable.balance,
    bcvRate,
    amountBs,
    amountText: formatMobilePaymentAmount(amountBs),
    accounts: supplier.accounts
      .filter((account) => account.isActive)
      .map((account) => ({
        ...account,
        clipboard: formatPagoMovilClipboard({ ...account, amountBs }),
      })),
  };
}

export type TripCreditLine = {
  id: string;
  supplierId: string;
  /** Total of the line in USD (`quoted_price_usd`) and what it costs in Bs (`amount_bs`). */
  quotedPriceUsd: string;
  amountBs: string;
};

export type TripPayablesInput = {
  tripId: string;
  issuedOn: string;
  currency: "USD" | "VES";
  dueOn: string | null;
  lines: readonly TripCreditLine[];
};

/**
 * One invoice per supplier for a closing trip's credit lines (merchandise: each line points to
 * its purchase line; subtotal = its total in USD, or in Bs for a Bs invoice). Runs inside the
 * caller's transaction; audited. Returns the new invoices' ids.
 */
export async function createTripPayables(
  tx: Executor,
  actor: Actor,
  input: TripPayablesInput,
): Promise<string[]> {
  const bySupplier = new Map<string, TripCreditLine[]>();
  for (const line of input.lines) {
    bySupplier.set(line.supplierId, [...(bySupplier.get(line.supplierId) ?? []), line]);
  }
  if (bySupplier.size === 0) return [];
  await lockStore(tx, actor.storeId);
  const ids: string[] = [];
  for (const [supplierId, lines] of bySupplier) {
    const subtotals = lines.map((line) => ({
      purchaseLineId: line.id,
      subtotal: sumDecimals([input.currency === "USD" ? line.quotedPriceUsd : line.amountBs]),
    }));
    const row = await insertPayable(tx, {
      storeId: actor.storeId,
      number: await nextPayableNumber(tx, actor.storeId),
      supplierId,
      currency: input.currency,
      total: sumDecimals(subtotals.map((line) => line.subtotal)),
      issuedOn: input.issuedOn,
      dueOn: input.dueOn,
      tripId: input.tripId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await insertLines(
      tx,
      subtotals.map((line) => ({ payableId: row.id, ...line, createdBy: actor.userId })),
    );
    await recordAudit(tx, actor, {
      tableName: "payables",
      recordId: row.id,
      action: "insert",
      changes: { ...row, lines: subtotals },
    });
    ids.push(row.id);
  }
  return ids;
}

/** The invoices a trip created when it closed (none while open). */
export async function listTripPayables(db: Executor, tripId: string): Promise<TripPayableRow[]> {
  return findTripPayables(db, tripId);
}
