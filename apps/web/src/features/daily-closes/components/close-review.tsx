"use client";

import { dailyCloseTotals } from "@ta/core";
import type { PaymentMethod, UpdateDailyClose } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CloseTotals } from "@/features/daily-closes/components/close-totals";
import { formatDecimal } from "@/utils/format-number";

export type CloseReviewProps = {
  contents: UpdateDailyClose;
  methods: PaymentMethod[];
  isEdit: boolean;
  isSubmitting: boolean;
  error?: string | undefined;
  onConfirm: () => void;
  onBack: () => void;
};

/** What will be saved, so the amounts can be checked and fixed before they are stored. */
export function CloseReview({
  contents,
  methods,
  isEdit,
  isSubmitting,
  error,
  onConfirm,
  onBack,
}: CloseReviewProps): React.JSX.Element {
  const t = useTranslations("dailyClose");
  const tc = useTranslations("common");
  const methodOf = new Map(methods.map((method) => [method.id, method]));
  const money = (amount: string, currency: "VES" | "USD") =>
    t(currency === "VES" ? "amountBs" : "amountUsd", { amount: formatDecimal(amount, 2) });
  const totals = dailyCloseTotals({
    payments: contents.payments.flatMap((payment) => {
      const method = methodOf.get(payment.paymentMethodId);
      return method ? [{ amount: payment.amount, currency: method.currency }] : [];
    }),
    credits: contents.credits,
    expenses: contents.expenses,
  });

  const title = isEdit ? t("reviewFixTitle") : t("reviewTitle");

  return (
    <Card className="space-y-4" aria-label={title}>
      <div className="space-y-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted">{t("reviewHint")}</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {contents.payments.map((payment) => {
          const method = methodOf.get(payment.paymentMethodId);
          if (!method) return null;
          return (
            <div key={payment.paymentMethodId} className="contents">
              <dt className="text-muted">{method.name}</dt>
              <dd className="text-right tabular-nums">{money(payment.amount, method.currency)}</dd>
            </div>
          );
        })}
        <dt className="text-muted">{t("cardBatch")}</dt>
        <dd className="text-right">{contents.cardBatch ?? tc("empty")}</dd>
        <dt className="text-muted">{t("cashDestination")}</dt>
        <dd className="text-right">{t(`destinations.${contents.cashDestination}`)}</dd>
      </dl>

      <section className="space-y-1" aria-label={t("credits")}>
        <h3 className="text-sm font-semibold">{t("credits")}</h3>
        {contents.credits.length === 0 ? (
          <p className="text-sm text-muted">{t("noCredits")}</p>
        ) : (
          <ul className="space-y-0.5 text-sm">
            {contents.credits.map((credit) => (
              <li
                key={`${credit.customerName}-${credit.amount}`}
                className="flex justify-between gap-2"
              >
                <span>{credit.customerName}</span>
                <span className="tabular-nums">{money(credit.amount, credit.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-1" aria-label={t("expenses")}>
        <h3 className="text-sm font-semibold">{t("expenses")}</h3>
        {contents.expenses.length === 0 ? (
          <p className="text-sm text-muted">{t("noExpenses")}</p>
        ) : (
          <ul className="space-y-0.5 text-sm">
            {contents.expenses.map((expense) => (
              <li
                key={`${expense.concept}-${expense.amount}`}
                className="flex justify-between gap-2"
              >
                <span>{expense.concept}</span>
                <span className="tabular-nums">{money(expense.amount, expense.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {contents.note && <p className="text-sm text-muted">{contents.note}</p>}
      <CloseTotals totals={totals} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onBack}>
          {t("backToForm")}
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          isLoading={isSubmitting}
          loadingText={isEdit ? t("savingFix") : t("submitting")}
          onClick={onConfirm}
        >
          {isEdit ? t("saveFix") : t("submit")}
        </Button>
      </div>
    </Card>
  );
}
