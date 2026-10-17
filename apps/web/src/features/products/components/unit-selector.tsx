"use client";

import { PURCHASE_UNITS, type PurchaseUnit, type SaleUnit } from "@ta/core";
import { useTranslations } from "next-intl";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";

export type UnitSelectorProps = {
  purchaseUnit: PurchaseUnit;
  saleUnit: SaleUnit;
  onPurchaseUnitChange: (unit: PurchaseUnit) => void;
  onSaleUnitChange: (unit: SaleUnit) => void;
  saleUnitOptions: { value: SaleUnit; label: string; disabled: boolean }[];
  isLocked: boolean;
  saleUnitError?: string | undefined;
};

/** "Se compra por" + "Se vende por"; sale units are filtered by the purchase unit. */
export function UnitSelector({
  purchaseUnit,
  saleUnit,
  onPurchaseUnitChange,
  onSaleUnitChange,
  saleUnitOptions,
  isLocked,
  saleUnitError,
}: UnitSelectorProps): React.JSX.Element {
  const t = useTranslations("products.form");
  const labels = useUnitLabels();
  const lockedHint = isLocked ? t("unitsLocked") : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SegmentedControl
        label={t("purchaseUnit")}
        name="purchaseUnit"
        options={PURCHASE_UNITS.map((unit) => ({ value: unit, label: labels.purchase(unit) }))}
        value={purchaseUnit}
        onChange={onPurchaseUnitChange}
        disabled={isLocked}
        hint={lockedHint}
      />
      <SegmentedControl
        label={t("saleUnit")}
        name="saleUnit"
        options={saleUnitOptions}
        value={saleUnit}
        onChange={onSaleUnitChange}
        disabled={isLocked}
        hint={lockedHint}
        error={saleUnitError}
      />
    </div>
  );
}
