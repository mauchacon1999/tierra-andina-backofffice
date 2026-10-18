"use client";

import type { PayableDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { formatMoney, formatQuantity } from "@/utils/format-number";

export type PayableLinesCardProps = { payable: PayableDetail };

/** The invoice's lines: supplies as typed, merchandise as bought with the purchase form. */
export function PayableLinesCard({ payable }: PayableLinesCardProps): React.JSX.Element {
  const td = useTranslations("payables.detail");
  const tu = useTranslations("payables.units");
  const units = useUnitLabels();

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{td("lines")}</h2>
      <ul className="divide-y divide-border">
        {payable.lines.map((line) => {
          const bought = line.purchaseLine;
          const title = bought
            ? td("merchandise", {
                product: bought.productName,
                quantity: units.packsCount(
                  bought.purchaseUnit,
                  bought.packs ?? bought.grossQuantity,
                ),
              })
            : line.description;
          const detail =
            !bought && line.quantity && line.unit && line.unitPrice
              ? `${formatQuantity(line.quantity)} ${tu(line.unit)} × ${formatMoney(line.unitPrice, payable.currency)}`
              : line.expenseCategoryName;
          return (
            <li key={line.id} className="flex items-start justify-between gap-3 py-2">
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted">
                  {detail}
                  {!bought && line.expenseCategoryName && ` · ${line.expenseCategoryName}`}
                </p>
              </div>
              <span className="font-semibold tabular-nums">
                {formatMoney(line.subtotal, payable.currency)}
              </span>
            </li>
          );
        })}
      </ul>
      {payable.lines.some((line) => line.purchaseLine) && (
        <p className="text-sm text-muted">{td("fromPurchase")}</p>
      )}
    </Card>
  );
}
