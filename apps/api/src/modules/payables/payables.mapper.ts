import { payableCode } from "@ta/core";
import type {
  MobilePaymentData,
  PayableDetail,
  PayableLine,
  PayableList,
  PayablePayment,
  PayableSummary,
} from "@ta/validators";

import { toAccountDto } from "@/modules/suppliers/suppliers.service";

import type { LineRow, PaymentRecord } from "./payables.repository";
import type {
  MobilePaymentView,
  PayableDetailView,
  PayableListView,
  PayableView,
} from "./payables.service";

export function toPayableSummaryDto(row: PayableView): PayableSummary {
  return {
    id: row.id,
    code: payableCode(row.number),
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    currency: row.currency,
    total: row.total,
    paid: row.paid,
    balance: row.balance,
    issuedOn: row.issuedOn,
    dueOn: row.dueOn,
    status: row.status,
    tripId: row.tripId,
  };
}

export function toPayableListDto(list: PayableListView): PayableList {
  return { ...list, data: list.data.map(toPayableSummaryDto) };
}

function toPurchaseLineDto(line: LineRow): PayableLine["purchaseLine"] {
  const { purchaseLineId, productId, productName, purchaseUnit, grossQuantity } = line;
  if (
    purchaseLineId === null ||
    productId === null ||
    productName === null ||
    purchaseUnit === null ||
    grossQuantity === null
  ) {
    return null;
  }
  return {
    id: purchaseLineId,
    productId,
    productName,
    purchaseUnit,
    packs: line.packs,
    grossQuantity,
  };
}

function toLineDto(line: LineRow): PayableLine {
  return {
    id: line.id,
    subtotal: line.subtotal,
    description: line.description,
    expenseCategoryId: line.expenseCategoryId,
    expenseCategoryName: line.expenseCategoryName,
    quantity: line.quantity,
    unit: line.unit,
    unitPrice: line.unitPrice,
    purchaseLine: toPurchaseLineDto(line),
  };
}

function toPaymentDto(payment: PaymentRecord): PayablePayment {
  return {
    id: payment.id,
    paidOn: payment.paidOn,
    method: payment.method,
    currency: payment.currency,
    amountUsd: payment.amountUsd,
    amountBs: payment.amountBs,
    rate: payment.rate,
    applied: payment.applied,
    reference: payment.reference,
    accountId: payment.accountId,
    note: payment.note,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function toPayableDetailDto(row: PayableDetailView): PayableDetail {
  return {
    ...toPayableSummaryDto(row),
    note: row.note,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    lines: row.lines.map(toLineDto),
    payments: row.payments.map(toPaymentDto),
  };
}

export function toMobilePaymentDto(data: MobilePaymentView): MobilePaymentData {
  return {
    ...data,
    accounts: data.accounts.map((account) => ({
      ...toAccountDto(account),
      clipboard: account.clipboard,
    })),
  };
}
