"use client";

import { toBusinessDate } from "@ta/core";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { usePriceListTable } from "@/features/price-lists/hooks/use-price-list-table";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

/** Sale prices in force, for the owner now and the manager when that user exists. */
export function PriceListScreen(): React.JSX.Element {
  const table = usePriceListTable();
  const t = useTranslations("prices");
  const errorMessage = useErrorMessage();
  const published = table.list?.publishedAt;

  return (
    <div className="space-y-4">
      {table.list && published && (
        <p className="text-sm text-muted">
          {t("meta", {
            when: formatBusinessDateLong(toBusinessDate(new Date(published))),
            rate: formatDecimal(table.list.saleRate, 2),
          })}
        </p>
      )}
      <DataTable
        label={t("label")}
        data={table.isEmpty ? [] : table.list?.lines}
        columns={table.columns}
        getRowId={(line) => line.id}
        rowName={(line) => line.productName}
        sorting={{ mode: "client", initial: { id: "product", desc: false } }}
        isLoading={table.isLoading}
        error={
          table.error && {
            title: t("loadFailed"),
            message: errorMessage(table.error, table.error.message),
            onRetry: table.retry,
          }
        }
        empty={<p className="text-muted">{t("empty")}</p>}
      />
    </div>
  );
}
