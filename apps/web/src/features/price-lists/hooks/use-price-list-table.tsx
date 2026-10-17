"use client";

import type { PriceListLine } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { DataColumn } from "@/components/shared/data-table/types";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { usePriceList } from "@/features/price-lists/api/use-price-list";
import { formatBs, formatPercentFromFraction, formatUsd } from "@/utils/format-number";

export type UsePriceListTableResult = ReturnType<typeof usePriceList> & {
  columns: DataColumn<PriceListLine>[];
};

/** The published list: product, margin and prices in USD and Bs. */
export function usePriceListTable(): UsePriceListTableResult {
  const list = usePriceList();
  const t = useTranslations("prices");
  const units = useUnitLabels();

  const columns = useMemo(
    (): DataColumn<PriceListLine>[] => [
      {
        id: "product",
        header: t("columns.product"),
        cell: (line) => line.productName,
        sortValue: (line) => line.productName,
        isPrimary: true,
      },
      {
        id: "margin",
        header: t("columns.margin"),
        cell: (line) => formatPercentFromFraction(line.margin),
        align: "end",
      },
      {
        id: "priceUsd",
        header: t("columns.priceUsd"),
        cell: (line) =>
          t("perUnit", { price: formatUsd(line.priceUsd), unit: units.suffix(line.saleUnit) }),
        sortValue: (line) => line.priceUsd,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "priceBs",
        header: t("columns.priceBs"),
        cell: (line) =>
          t("perUnit", { price: formatBs(line.priceBs), unit: units.suffix(line.saleUnit) }),
        sortValue: (line) => line.priceBs,
        sortAs: "decimal",
        align: "end",
      },
    ],
    [t, units],
  );

  return { ...list, columns };
}
