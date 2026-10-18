"use client";

import type { PayableDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { formatBusinessDate } from "@/utils/format-date";
import { formatDecimal, formatMoney } from "@/utils/format-number";

export type PaymentsCardProps = {
  payable: PayableDetail;
  /** Null when payments can no longer be taken back (a voided invoice). */
  onDelete: ((paymentId: string) => Promise<void>) | null;
};

/** The payments made, each in its currency with what it took off the balance. */
export function PaymentsCard({ payable, onDelete }: PaymentsCardProps): React.JSX.Element {
  const td = useTranslations("payables.detail");
  const tm = useTranslations("payables.payment.methods");

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{td("payments")}</h2>
      {payable.payments.length === 0 && <p className="text-sm text-muted">{td("noPayments")}</p>}
      <ul className="divide-y divide-border">
        {payable.payments.map((payment) => {
          const amount = payment.currency === "USD" ? payment.amountUsd : payment.amountBs;
          return (
            <li key={payment.id} className="flex flex-wrap items-start justify-between gap-3 py-2">
              <div>
                <p className="font-medium">
                  {formatBusinessDate(payment.paidOn)} ·{" "}
                  {td("paymentLine", {
                    amount: formatMoney(amount, payment.currency),
                    method: tm(payment.method),
                  })}
                </p>
                <p className="text-sm text-muted">
                  {td("paymentApplied", {
                    applied: formatMoney(payment.applied, payable.currency),
                    rate: formatDecimal(payment.rate, 2),
                  })}
                  {payment.reference && ` · ${td("reference", { reference: payment.reference })}`}
                </p>
              </div>
              {onDelete && (
                <ConfirmButton
                  size="sm"
                  question={td("deletePaymentQuestion")}
                  onConfirm={() => onDelete(payment.id)}
                >
                  {td("deletePayment")}
                </ConfirmButton>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
