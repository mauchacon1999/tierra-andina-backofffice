"use client";

import { toBusinessDate } from "@ta/core";
import type { PayableDetail } from "@ta/validators";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { STATUS_TONE } from "@/features/payables/hooks/use-payables-screen";
import { formatBusinessDate } from "@/utils/format-date";
import { formatMoney } from "@/utils/format-number";

export type PayableSummaryCardProps = { payable: PayableDetail };

/** Code, supplier, status, dates and how much is owed, in the invoice's currency. */
export function PayableSummaryCard({ payable }: PayableSummaryCardProps): React.JSX.Element {
  const t = useTranslations("payables");
  const td = useTranslations("payables.detail");
  const money = (value: string) => formatMoney(value, payable.currency);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight tabular-nums text-primary-text">
          {payable.code}
        </h1>
        <Badge tone={STATUS_TONE[payable.status]}>{t(`statuses.${payable.status}`)}</Badge>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">{td("supplier")}</dt>
          <dd className="font-medium">
            <Link href={`/suppliers/${payable.supplierId}`} className="hover:underline">
              {payable.supplierName}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{td("issuedOn")}</dt>
          <dd>{formatBusinessDate(payable.issuedOn)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{td("dueOn")}</dt>
          <dd>{payable.dueOn ? formatBusinessDate(payable.dueOn) : t("noDueDate")}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{td("total")}</dt>
          <dd className="tabular-nums">{money(payable.total)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{td("paid")}</dt>
          <dd className="tabular-nums">{money(payable.paid)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{td("balance")}</dt>
          <dd className="text-xl font-bold tabular-nums">{money(payable.balance)}</dd>
        </div>
      </dl>
      {payable.note && (
        <p className="text-sm">
          <span className="text-muted">{td("note")}: </span>
          {payable.note}
        </p>
      )}
      {payable.voidedAt && (
        <p className="text-sm text-muted">
          {td("voided", { date: formatBusinessDate(toBusinessDate(new Date(payable.voidedAt))) })}
        </p>
      )}
    </Card>
  );
}
