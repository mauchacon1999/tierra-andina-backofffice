"use client";

import type { PayableStatus } from "@ta/core";
import type { PayableList, PayableSummary } from "@ta/validators";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { usePayables } from "@/features/payables/api/use-payables";
import type { ApiError } from "@/lib/api";
import { formatBusinessDate } from "@/utils/format-date";
import { formatMoney } from "@/utils/format-number";

const PAGE_SIZE = 20;

/** Badge color per status: overdue is the one that needs attention. */
export const STATUS_TONE: Record<PayableStatus, BadgeTone> = {
  pending: "info",
  partial: "warning",
  overdue: "danger",
  paid: "success",
  voided: "neutral",
};

export type PayableFilter = PayableStatus | "all";

export type UsePayablesScreenResult = {
  page: PayableList | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
  columns: DataColumn<PayableSummary>[];
  rowActions: (payable: PayableSummary) => RowAction[];
  filter: PayableFilter;
  setFilter: (filter: PayableFilter) => void;
  setPage: (page: number) => void;
};

/** The invoices list: status filter, columns, pagination and what is still owed. */
export function usePayablesScreen(): UsePayablesScreenResult {
  const t = useTranslations("payables");
  const [filter, setFilterState] = useState<PayableFilter>("all");
  const [page, setPage] = useState(1);
  const list = usePayables({
    status: filter === "all" ? undefined : filter,
    page,
    pageSize: PAGE_SIZE,
  });

  const columns = useMemo(
    (): DataColumn<PayableSummary>[] => [
      {
        id: "code",
        header: t("columns.code"),
        cell: (p) => <span className="font-medium tabular-nums">{p.code}</span>,
        isPrimary: true,
      },
      { id: "supplier", header: t("columns.supplier"), cell: (p) => p.supplierName },
      {
        id: "issuedOn",
        header: t("columns.issuedOn"),
        cell: (p) => formatBusinessDate(p.issuedOn),
      },
      {
        id: "dueOn",
        header: t("columns.dueOn"),
        cell: (p) => (p.dueOn ? formatBusinessDate(p.dueOn) : t("noDueDate")),
      },
      {
        id: "total",
        header: t("columns.total"),
        align: "end",
        cell: (p) => <span className="tabular-nums">{formatMoney(p.total, p.currency)}</span>,
      },
      {
        id: "balance",
        header: t("columns.balance"),
        align: "end",
        cell: (p) => (
          <span className="font-semibold tabular-nums">{formatMoney(p.balance, p.currency)}</span>
        ),
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: (p) => <Badge tone={STATUS_TONE[p.status]}>{t(`statuses.${p.status}`)}</Badge>,
      },
    ],
    [t],
  );

  return {
    ...list,
    columns,
    rowActions: (payable) => [
      { id: "open", label: t("open"), icon: Eye, href: `/payables/${payable.id}` },
    ],
    filter,
    setFilter: (next) => {
      setFilterState(next);
      setPage(1);
    },
    setPage,
  };
}
