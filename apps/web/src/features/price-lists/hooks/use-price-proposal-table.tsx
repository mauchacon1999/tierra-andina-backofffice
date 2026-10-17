"use client";

import type { PriceProposalLine } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const NO_CHANGES: PriceProposalLine[] = [];

import type { DataColumn } from "@/components/shared/data-table/types";
import { usePriceProposal } from "@/features/price-lists/api/use-price-proposal";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { formatBs, formatUsd } from "@/utils/format-number";

export type UsePriceProposalTableResult = ReturnType<typeof usePriceProposal> & {
  columns: DataColumn<PriceProposalLine>[];
  changed: PriceProposalLine[];
};

/** Comparison of the list in force with today's sale rate. Owner only. */
export function usePriceProposalTable(): UsePriceProposalTableResult {
  const proposal = usePriceProposal(true);
  const t = useTranslations("prices");
  const units = useUnitLabels();

  const columns = useMemo(
    (): DataColumn<PriceProposalLine>[] => [
      {
        id: "product",
        header: t("columns.product"),
        cell: (line) => line.productName,
        sortValue: (line) => line.productName,
        isPrimary: true,
      },
      {
        id: "priceUsd",
        header: t("columns.priceUsd"),
        cell: (line) =>
          t("perUnit", { price: formatUsd(line.priceUsd), unit: units.suffix(line.saleUnit) }),
        align: "end",
      },
      {
        id: "priceBs",
        header: t("columns.priceBs"),
        cell: (line) =>
          t("perUnit", { price: formatBs(line.priceBs), unit: units.suffix(line.saleUnit) }),
        align: "end",
      },
      {
        id: "proposed",
        header: t("columns.proposedBs"),
        cell: (line) =>
          t("perUnit", {
            price: formatBs(line.proposedPriceBs),
            unit: units.suffix(line.saleUnit),
          }),
        align: "end",
      },
    ],
    [t, units],
  );

  const changed = useMemo(
    () => proposal.proposal?.lines.filter((line) => line.changed) ?? NO_CHANGES,
    [proposal.proposal?.lines],
  );
  return { ...proposal, columns, changed };
}
