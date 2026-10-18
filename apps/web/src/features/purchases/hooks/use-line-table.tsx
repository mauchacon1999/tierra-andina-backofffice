"use client";

import type { PurchaseLine } from "@ta/validators";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { effectiveCosts } from "@/features/purchases/helpers/line-receipt";
import { formatBs, formatDecimal, formatQuantity, formatUsd } from "@/utils/format-number";

export type UseLineTableOptions = {
  /** Edit and delete only while the trip is open. */
  canEdit: boolean;
  onEdit: (line: PurchaseLine) => void;
  onDelete: (line: PurchaseLine) => Promise<void>;
};

const RECEIPT_TONE = {
  pending: "warning",
  received: "success",
  partial: "warning",
  missing: "danger",
} as const satisfies Record<PurchaseLine["receiptStatus"], BadgeTone>;

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
        cell: (line) =>
          line.packs ? labels.packsCount(line.purchaseUnit, line.packs) : tc("empty"),
        sortValue: (line) => line.packs ?? "0",
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
        cell: (line) => `${formatUsd(effectiveCosts(line).unitCostUsd)}/${suffix(line)}`,
        sortValue: (line) => effectiveCosts(line).unitCostUsd,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "salePrice",
        header: t("columns.salePrice"),
        cell: (line) => (
          <span className="font-semibold text-primary-text">
            {formatUsd(effectiveCosts(line).salePriceUsd)}/{suffix(line)}
          </span>
        ),
        sortValue: (line) => effectiveCosts(line).salePriceUsd,
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "receipt",
        header: t("columns.receipt"),
        cell: (line) => (
          <span className="inline-flex flex-col items-start gap-0.5">
            <Badge tone={RECEIPT_TONE[line.receiptStatus]}>
              {t(`receiptStatus.${line.receiptStatus}`)}
            </Badge>
            {line.receiptStatus === "partial" && line.receivedPacks && (
              <span className="text-xs text-muted">
                {t("receiptPartial", {
                  received: labels.packsCount(line.purchaseUnit, line.receivedPacks),
                })}
              </span>
            )}
          </span>
        ),
        sortValue: (line) => line.receiptStatus,
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
  }, [t, tc, labels]);

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
