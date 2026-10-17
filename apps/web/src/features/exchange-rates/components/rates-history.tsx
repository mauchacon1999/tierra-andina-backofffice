"use client";

import type { DailyRates } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataColumn } from "@/components/shared/data-table/types";
import { Card } from "@/components/ui/card";
import { useRatesHistory } from "@/features/exchange-rates/api/use-daily-rates";
import {
  businessDateMinusDays,
  formatBusinessDateLong,
  todayBusinessDate,
} from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

const DAYS = 14;

/** Rates of the last two weeks, newest first (sortable by any rate). */
export function RatesHistory(): React.JSX.Element {
  const t = useTranslations("rates.history");
  const tc = useTranslations("common");
  const today = todayBusinessDate();
  const { days, isLoading } = useRatesHistory(businessDateMinusDays(today, DAYS - 1), today);

  const columns = useMemo((): DataColumn<DailyRates>[] => {
    const show = (value: string | null) => (value === null ? tc("empty") : formatDecimal(value, 2));
    const rate = (id: "bcv" | "market" | "sale"): DataColumn<DailyRates> => ({
      id,
      header: t(id),
      cell: (day) => show(day[id]),
      sortValue: (day) => day[id] ?? "",
      sortAs: "decimal",
      align: "end",
    });
    return [
      {
        id: "day",
        header: t("day"),
        cell: (day) => (
          <span className="capitalize">{formatBusinessDateLong(day.businessDate)}</span>
        ),
        // ISO dates sort correctly as text.
        sortValue: (day) => day.businessDate,
        isPrimary: true,
      },
      rate("bcv"),
      rate("market"),
      rate("sale"),
    ];
  }, [t, tc]);

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t("title", { days: DAYS })}</h2>
      <DataTable
        label={t("title", { days: DAYS })}
        data={isLoading ? undefined : days}
        columns={columns}
        getRowId={(day) => day.businessDate}
        rowName={(day) => formatBusinessDateLong(day.businessDate)}
        sorting={{ mode: "client", initial: { id: "day", desc: true } }}
        isLoading={isLoading}
        empty={<p className="text-sm text-muted">{t("empty")}</p>}
      />
    </Card>
  );
}
