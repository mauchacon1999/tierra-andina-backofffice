"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { useTripTable } from "@/features/purchases/hooks/use-trip-table";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDateLong } from "@/utils/format-date";

/** Purchase trips (open ones first); each row opens the trip. */
export function TripList(): React.JSX.Element {
  const table = useTripTable();
  const t = useTranslations("purchases");
  const errorMessage = useErrorMessage();

  return (
    <DataTable
      label={t("trips.label")}
      data={table.page?.data}
      columns={table.columns}
      getRowId={(trip) => trip.id}
      rowName={(trip) => formatBusinessDateLong(trip.businessDate)}
      rowActions={table.rowActions}
      isLoading={table.isLoading}
      error={
        table.error && {
          title: t("list.loadFailed"),
          message: errorMessage(table.error, table.error.message),
          onRetry: table.retry,
        }
      }
      {...(table.pagination ? { pagination: table.pagination } : {})}
      empty={<p className="text-muted">{t("list.empty")}</p>}
    />
  );
}
