"use client";

import type { DailyClose } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CloseTotals } from "@/features/daily-closes/components/close-totals";
import { formatDecimal } from "@/utils/format-number";

export type CloseSummaryProps = {
  close: DailyClose;
};

/** A submitted close as read by the manager and the owner. */
export function CloseSummary({ close }: CloseSummaryProps): React.JSX.Element {
  const t = useTranslations("dailyClose");
  const tc = useTranslations("common");
  const money = (amount: string, currency: "VES" | "USD") =>
    t(currency === "VES" ? "amountBs" : "amountUsd", { amount: formatDecimal(amount, 2) });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={close.status === "approved" ? "success" : "warning"}>
          {t(`status.${close.status}`)}
        </Badge>
        <span className="text-sm text-muted">{t("sentBy", { name: close.submittedBy.name })}</span>
        {close.approvedBy && (
          <span className="text-sm text-muted">
            · {t("approvedBy", { name: close.approvedBy.name })}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {close.payments.map((payment) => (
          <div key={payment.paymentMethodId} className="contents">
            <dt className="text-muted">{payment.name}</dt>
            <dd className="text-right tabular-nums">{money(payment.amount, payment.currency)}</dd>
          </div>
        ))}
        <dt className="text-muted">{t("cardBatch")}</dt>
        <dd className="text-right">{close.cardBatch ?? tc("empty")}</dd>
        <dt className="text-muted">{t("cashDestination")}</dt>
        <dd className="text-right">{t(`destinations.${close.cashDestination}`)}</dd>
      </dl>

      {close.credits.length > 0 && (
        <section className="space-y-1" aria-label={t("credits")}>
          <h3 className="text-sm font-semibold">{t("credits")}</h3>
          <ul className="space-y-0.5 text-sm">
            {close.credits.map((credit) => (
              <li key={credit.id} className="flex justify-between gap-2">
                <span>{credit.customerName}</span>
                <span className="tabular-nums">{money(credit.amount, credit.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {close.expenses.length > 0 && (
        <section className="space-y-1" aria-label={t("expenses")}>
          <h3 className="text-sm font-semibold">{t("expenses")}</h3>
          <ul className="space-y-0.5 text-sm">
            {close.expenses.map((expense) => (
              <li key={expense.id} className="flex justify-between gap-2">
                <span>{expense.concept}</span>
                <span className="tabular-nums">{money(expense.amount, expense.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {close.note && <p className="text-sm text-muted">{close.note}</p>}
      <CloseTotals totals={close.totals} />
    </Card>
  );
}
