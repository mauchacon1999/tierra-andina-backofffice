"use client";

import type { ManualPriceRow } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { DataColumn } from "@/components/shared/data-table/types";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { ManualPriceCell } from "@/features/price-lists/components/manual-price-cell";
import { WhatsappToggle } from "@/features/price-lists/components/whatsapp-toggle";
import { formatUsd } from "@/utils/format-number";

export type UseManualPriceTableOptions = {
  saleRate: string | null;
  onToggleWhatsapp: (row: ManualPriceRow, value: boolean) => void;
};

/** Columns of "Precio manual": product, last purchase cost per crate/kilo, price in Bs, WhatsApp. */
export function useManualPriceTable({
  saleRate,
  onToggleWhatsapp,
}: UseManualPriceTableOptions): DataColumn<ManualPriceRow>[] {
  const t = useTranslations("manualPrices");
  const tc = useTranslations("common");
  const units = useUnitLabels();

  return useMemo((): DataColumn<ManualPriceRow>[] => {
    // "cesta", "cuenta" when the crates were counted; otherwise per kilo or unit.
    const per = ({ lastPurchase, saleUnit }: ManualPriceRow) =>
      lastPurchase?.per === "pack" && lastPurchase.purchaseUnit !== "kg"
        ? t(`packName.${lastPurchase.purchaseUnit}`)
        : units.suffix(saleUnit);
    return [
      {
        id: "product",
        header: t("columns.product"),
        cell: (row) => <span className="font-medium">{row.productName}</span>,
        sortValue: (row) => row.productName,
        isPrimary: true,
      },
      {
        id: "cost",
        header: t("columns.cost"),
        cell: (row) =>
          row.lastPurchase === null
            ? tc("empty")
            : t("costValue", { cost: formatUsd(row.lastPurchase.priceUsd), unit: per(row) }),
        sortValue: (row) => row.lastPurchase?.priceUsd ?? "0",
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "price",
        header: t("columns.price"),
        cell: (row) => <ManualPriceCell row={row} saleRate={saleRate} />,
        sortValue: (row) => row.priceBs ?? "0",
        sortAs: "decimal",
        align: "end",
      },
      {
        id: "whatsapp",
        header: t("columns.whatsapp"),
        cell: (row) => <WhatsappToggle row={row} onToggle={onToggleWhatsapp} />,
        align: "end",
      },
    ];
  }, [t, tc, units, saleRate, onToggleWhatsapp]);
}
