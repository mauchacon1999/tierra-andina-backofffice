"use client";

import { PAYABLE_STATUSES } from "@ta/core";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import {
  usePayablesScreen,
  type PayableFilter,
} from "@/features/payables/hooks/use-payables-screen";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBs, formatUsd } from "@/utils/format-number";

const FILTERS: readonly PayableFilter[] = ["all", ...PAYABLE_STATUSES];

/** Supplier invoices: what is still owed per currency, filter by status, open one. */
export function PayablesScreen(): React.JSX.Element {
  const s = usePayablesScreen();
  const t = useTranslations("payables");
  const errorMessage = useErrorMessage();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-56">
          <SelectField
            label={t("statusFilter")}
            options={FILTERS.map((value) => ({ value, label: t(`filters.${value}`) }))}
            value={s.filter}
            onChange={(event) => s.setFilter(event.target.value as PayableFilter)}
          />
        </div>
        <ButtonLink href="/payables/new">{t("new")}</ButtonLink>
      </div>
      {s.page && (
        <Card className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-sm text-muted">{t("owed")}</span>
          <span className="text-xl font-bold tabular-nums">{formatUsd(s.page.balance.USD)}</span>
          <span className="text-xl font-bold tabular-nums">{formatBs(s.page.balance.VES)}</span>
        </Card>
      )}
      <DataTable
        label={t("label")}
        data={s.page?.data}
        columns={s.columns}
        getRowId={(payable) => payable.id}
        rowName={(payable) => payable.code}
        rowActions={s.rowActions}
        rowClassName={(payable) => (payable.status === "voided" ? "opacity-60" : undefined)}
        pagination={
          s.page && {
            page: s.page.page,
            pageSize: s.page.pageSize,
            total: s.page.total,
            onPageChange: s.setPage,
          }
        }
        isLoading={s.isLoading}
        error={s.error && { message: errorMessage(s.error, s.error.message), onRetry: s.retry }}
        empty={<p className="text-muted">{t("empty")}</p>}
      />
    </div>
  );
}
