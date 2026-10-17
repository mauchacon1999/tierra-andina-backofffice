"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { useDailyCloses } from "@/features/daily-closes/api/use-daily-closes";
import { useClosesTable } from "@/features/daily-closes/hooks/use-closes-table";
import { useErrorMessage } from "@/i18n/use-error-message";
import {
  businessDateMinusDays,
  formatBusinessDateLong,
  todayBusinessDate,
} from "@/utils/format-date";

const DAYS = 31;

/** The owner's list of closes of the last month, newest first. */
export function ClosesScreen(): React.JSX.Element {
  const t = useTranslations("closes");
  const errorMessage = useErrorMessage();
  const today = todayBusinessDate();
  const { closes, isLoading, error, retry } = useDailyCloses(
    businessDateMinusDays(today, DAYS - 1),
    today,
  );
  const table = useClosesTable();

  return (
    <section className="space-y-3" aria-label={t("label")}>
      <h2 className="font-semibold">{t("range", { days: DAYS })}</h2>
      <DataTable
        label={t("label")}
        data={closes}
        columns={table.columns}
        getRowId={(close) => close.id}
        rowName={(close) => formatBusinessDateLong(close.businessDate)}
        rowActions={table.rowActions}
        sorting={{ mode: "client", initial: { id: "date", desc: true } }}
        isLoading={isLoading}
        error={
          error && {
            title: t("loadFailed"),
            message: errorMessage(error, error.message),
            onRetry: retry,
          }
        }
        empty={<p className="text-muted">{t("empty")}</p>}
      />
    </section>
  );
}
