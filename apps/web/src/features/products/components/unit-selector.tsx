"use client";

import { PURCHASE_UNITS, type PurchaseUnit, type SaleUnit } from "@ta/core";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { PURCHASE_UNIT_LABELS } from "@/features/products/helpers/unit-labels";

export type UnitSelectorProps = {
  purchaseUnit: PurchaseUnit;
  saleUnit: SaleUnit;
  onPurchaseUnitChange: (unit: PurchaseUnit) => void;
  onSaleUnitChange: (unit: SaleUnit) => void;
  saleUnitOptions: { value: SaleUnit; label: string; disabled: boolean }[];
  isLocked: boolean;
  saleUnitError?: string | undefined;
};

const LOCKED_HINT = "Bloqueado: el producto ya se usó en compras o listas de precios.";

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
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SegmentedControl
        label="Se compra por"
        name="purchaseUnit"
        options={PURCHASE_UNITS.map((unit) => ({ value: unit, label: PURCHASE_UNIT_LABELS[unit] }))}
        value={purchaseUnit}
        onChange={onPurchaseUnitChange}
        disabled={isLocked}
        hint={isLocked ? LOCKED_HINT : undefined}
      />
      <SegmentedControl
        label="Se vende por"
        name="saleUnit"
        options={saleUnitOptions}
        value={saleUnit}
        onChange={onSaleUnitChange}
        disabled={isLocked}
        hint={isLocked ? LOCKED_HINT : undefined}
        error={saleUnitError}
      />
    </div>
  );
}
