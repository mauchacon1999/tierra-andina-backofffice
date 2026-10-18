"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { isBusinessDate } from "@ta/core";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Alert } from "@/components/ui/alert";
import { useDailyCloses, useDeleteDailyClose } from "@/features/daily-closes/api/use-daily-closes";
import { ClosesFilters } from "@/features/daily-closes/components/closes-filters";
import { ClosesTotals } from "@/features/daily-closes/components/closes-totals";
import { useClosesRange } from "@/features/daily-closes/hooks/use-closes-range";
import { useClosesTable } from "@/features/daily-closes/hooks/use-closes-table";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDate, formatBusinessDateLong } from "@/utils/format-date";

/** The owner's list of closes, newest first, for the dates on screen. */
export function ClosesScreen(): React.JSX.Element {
  const t = useTranslations("closes");
  const errorMessage = useErrorMessage();
  const range = useClosesRange();
  const ready = isBusinessDate(range.from) && isBusinessDate(range.to) && range.from <= range.to;
  const { closes, isLoading, error, retry } = useDailyCloses(range.from, range.to);
  const remove = useDeleteDailyClose();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const table = useClosesTable(async (close) => {
    setDeleteError(null);
    try {
      await remove.run(close);
    } catch (caught) {
      setDeleteError(errorMessage(caught, t("deleteFailed")));
    }
  });

  return (
    <section className="space-y-3" aria-label={t("label")}>
      <ClosesFilters
        from={range.from}
        to={range.to}
        preset={range.preset}
        onFromChange={range.setFrom}
        onToChange={range.setTo}
        onPreset={range.applyPreset}
      />
      {deleteError && <Alert tone="error">{deleteError}</Alert>}
      {ready && (
        <h2 className="font-semibold">
          {t("range", { from: formatBusinessDate(range.from), to: formatBusinessDate(range.to) })}
        </h2>
      )}
      {ready && (
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
      )}
      {ready && closes && !error && <ClosesTotals closes={closes} />}
    </section>
  );
}
