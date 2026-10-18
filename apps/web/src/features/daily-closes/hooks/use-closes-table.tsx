"use client";

import type { DailyCloseSummary } from "@ta/validators";
import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { Badge } from "@/components/ui/badge";
import { usePaymentMethods } from "@/features/daily-closes/api/use-daily-closes";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

export type UseClosesTableResult = {
  columns: DataColumn<DailyCloseSummary>[];
  rowActions: (close: DailyCloseSummary) => RowAction[];
};

/**
 * Columns of the owner's list, like the shop's Excel: one per payment method, then the totals
 * per currency (never added together), the card batch and the status.
 */
export function useClosesTable(
  onDelete: (close: DailyCloseSummary) => Promise<void>,
): UseClosesTableResult {
  const t = useTranslations("closes");
  const td = useTranslations("dailyClose");
  const tc = useTranslations("common");
  const { methods } = usePaymentMethods();

  const columns = useMemo((): DataColumn<DailyCloseSummary>[] => {
    const bs = (amount: string) => td("amountBs", { amount: formatDecimal(amount, 2) });
    const usd = (amount: string) => td("amountUsd", { amount: formatDecimal(amount, 2) });
    return [
      {
        id: "date",
        header: t("columns.date"),
        cell: (close) => (
          <Link
            href={`/closes/${close.businessDate}`}
            className="font-medium text-primary-text capitalize hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          >
            {formatBusinessDateLong(close.businessDate)}
          </Link>
        ),
        sortValue: (close) => close.businessDate,
        isPrimary: true,
      },
      ...methods.map((method): DataColumn<DailyCloseSummary> => ({
        id: method.code,
        header: method.name,
        cell: (close) => {
          const amount = close.payments.find((p) => p.paymentMethodId === method.id)?.amount ?? "0";
          return method.currency === "VES" ? bs(amount) : usd(amount);
        },
        align: "end",
        hideInCard: true,
      })),
      {
        id: "totalBs",
        header: t("columns.totalBs"),
        cell: (close) => <span className="font-semibold">{bs(close.totals.collected.VES)}</span>,
        sortValue: (close) => close.totals.collected.VES,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "totalUsd",
        header: t("columns.totalUsd"),
        cell: (close) => <span className="font-semibold">{usd(close.totals.collected.USD)}</span>,
        sortValue: (close) => close.totals.collected.USD,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "batch",
        header: t("columns.batch"),
        cell: (close) => close.cardBatch ?? tc("empty"),
        align: "end",
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: (close) => (
          <Badge tone={close.status === "approved" ? "success" : "warning"}>
            {td(`status.${close.status}`)}
          </Badge>
        ),
        sortValue: (close) => close.status,
      },
    ];
  }, [t, td, tc, methods]);

  return {
    columns,
    rowActions: (close) => [
      { id: "view", label: t("view"), icon: Eye, href: `/closes/${close.businessDate}` },
      {
        id: "delete",
        label: t("delete"),
        icon: Trash2,
        tone: "danger",
        onSelect: () => onDelete(close),
        confirm: {
          question: t("deleteQuestion", { date: formatBusinessDateLong(close.businessDate) }),
          confirmLabel: t("delete"),
        },
      },
    ],
  };
}
