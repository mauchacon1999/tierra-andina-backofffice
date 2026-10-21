"use client";

import type { PriceListLine } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { DataColumn } from "@/components/shared/data-table/types";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { usePriceList } from "@/features/price-lists/api/use-price-list";
import { formatBs, formatPercentFromFraction, formatUsd } from "@/utils/format-number";
import { filterByName } from "@/utils/search-text";

export type UsePriceListTableResult = ReturnType<typeof usePriceList> & {
  columns: DataColumn<PriceListLine>[];
  search: string;
  setSearch: (text: string) => void;
  /** The list's lines whose product contains the search (accents and case ignored). */
  visibleLines: PriceListLine[] | undefined;
};

/** The published list: product, margin and prices in USD and Bs, searchable by name. */
export function usePriceListTable(): UsePriceListTableResult {
  const list = usePriceList();
  const [search, setSearch] = useState("");
  const lines = list.list?.lines;
  const visibleLines = useMemo(
    () => (lines ? filterByName(lines, search, (line) => line.productName) : undefined),
    [lines, search],
  );
  const t = useTranslations("prices");
  const tc = useTranslations("common");
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
        // A price typed by hand below cost (or with no cost) has no margin.
        cell: (line) =>
          line.margin === null ? tc("empty") : formatPercentFromFraction(line.margin),
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
    [t, tc, units],
  );

  return { ...list, columns, search, setSearch, visibleLines };
}
