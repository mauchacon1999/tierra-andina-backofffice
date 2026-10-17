import { dailyCloseTotals } from "@ta/core";
import type { DailyClose, DailyCloseSummary } from "@ta/validators";

import type { CloseWithParts } from "./daily-closes.service";

export function toDailyCloseDto(close: CloseWithParts): DailyClose {
  return {
    id: close.id,
    businessDate: close.businessDate,
    status: close.status,
    cardBatch: close.cardBatch,
    cashDestination: close.cashDestination,
    note: close.note,
    submittedBy: { id: close.submittedBy, name: close.submitterName },
    submittedAt: close.createdAt.toISOString(),
    approvedBy:
      close.approvedBy && close.approverName
        ? { id: close.approvedBy, name: close.approverName }
        : null,
    approvedAt: close.approvedAt?.toISOString() ?? null,
    payments: close.payments.map((p) => ({
      paymentMethodId: p.paymentMethodId,
      code: p.code,
      name: p.name,
      currency: p.currency,
      amount: p.amount,
    })),
    credits: close.credits.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      customerName: c.customerName,
      amount: c.amount,
      currency: c.currency,
    })),
    expenses: close.expenses.map((e) => ({
      id: e.id,
      concept: e.concept,
      amount: e.amount,
      currency: e.currency,
    })),
    totals: dailyCloseTotals({
      payments: close.payments,
      credits: close.credits,
      expenses: close.expenses,
    }),
  };
}

export function toDailyCloseSummaryDto(close: CloseWithParts): DailyCloseSummary {
  const dto = toDailyCloseDto(close);
  return {
    id: dto.id,
    businessDate: dto.businessDate,
    status: dto.status,
    cardBatch: dto.cardBatch,
    submittedBy: dto.submittedBy,
    submittedAt: dto.submittedAt,
    payments: dto.payments,
    totals: dto.totals,
  };
}
