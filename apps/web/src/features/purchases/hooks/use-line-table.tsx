"use client";

import type { PurchaseLine } from "@ta/validators";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { Badge } from "@/components/ui/badge";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { formatBs, formatDecimal, formatQuantity, formatUsd } from "@/utils/format-number";

export type UseLineTableOptions = {
  /** Edit and delete only while the trip is open. */
  canEdit: boolean;
  onEdit: (line: PurchaseLine) => void;
  onDelete: (line: PurchaseLine) => Promise<void>;
};

export type UseLineTableResult = {
  columns: DataColumn<PurchaseLine>[];
  rowActions: ((line: PurchaseLine) => RowAction[]) | undefined;
};

/** Columns (sortable in the browser: the whole trip is loaded) and actions of the trip's lines. */
export function useLineTable({
  canEdit,
  onEdit,
  onDelete,
}: UseLineTableOptions): UseLineTableResult {
  const t = useTranslations("purchases.line");
  const tc = useTranslations("common");
  const labels = useUnitLabels();

  const columns = useMemo((): DataColumn<PurchaseLine>[] => {
    const suffix = (line: PurchaseLine) => labels.suffix(line.saleUnit);
    return [
      {
        id: "product",
        header: t("product"),
        cell: (line) => (
          <span className="block">
            <span className="font-medium">{line.productName}</span>
            {(line.supplierName || line.stallReference) && (
              <span className="block text-xs text-muted">
                {[line.supplierName, line.stallReference].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
        ),
        sortValue: (line) => line.productName,
        isPrimary: true,
      },
      {
        id: "packs",
        header: t("columns.packs"),
        cell: (line) => labels.packsCount(line.purchaseUnit, line.packs),
        sortValue: (line) => line.packs,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "usable",
        header: t("columns.usable"),
        cell: (line) =>
          t("columns.usableValue", {
            gross: formatQuantity(line.grossQuantity),
            usable: formatQuantity(line.usableQuantity),
            suffix: suffix(line),
          }),
        sortValue: (line) => line.usableQuantity,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "quoted",
        header: t("quotedPrice"),
        cell: (line) => formatUsd(line.quotedPriceUsd),
        sortValue: (line) => line.quotedPriceUsd,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "rate",
        header: t("supplierRate"),
        cell: (line) => formatDecimal(line.supplierRate, 2),
        align: "end",
        hideInCard: true,
      },
      {
        id: "amountBs",
        header: t("columns.amountBs"),
        cell: (line) => formatBs(line.amountBs),
        sortValue: (line) => line.amountBs,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "unitCost",
        header: t("columns.unitCost"),
        cell: (line) => `${formatUsd(line.unitCostUsd)}/${suffix(line)}`,
        sortValue: (line) => line.unitCostUsd,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "salePrice",
        header: t("columns.salePrice"),
        cell: (line) => (
          <span className="font-semibold text-primary-text">
            {formatUsd(line.salePriceUsd)}/{suffix(line)}
          </span>
        ),
        sortValue: (line) => line.salePriceUsd,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "payment",
        header: t("payment"),
        cell: (line) => (
          <Badge tone={line.paymentStatus === "credit" ? "warning" : "neutral"}>
            {t(`paymentStatus.${line.paymentStatus}`)}
          </Badge>
        ),
        sortValue: (line) => line.paymentStatus,
      },
    ];
  }, [t, labels]);

  return {
    columns,
    rowActions: canEdit
      ? (line) => [
          { id: "edit", label: tc("edit"), icon: Pencil, onSelect: () => onEdit(line) },
          {
            id: "delete",
            label: tc("delete"),
            icon: Trash2,
            tone: "danger",
            onSelect: () => onDelete(line),
            confirm: {
              question: t("deleteQuestion", { product: line.productName }),
              confirmLabel: tc("delete"),
            },
          },
        ]
      : undefined,
  };
}
