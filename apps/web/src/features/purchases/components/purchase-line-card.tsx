"use client";

import type { PurchaseLine } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { formatBs, formatDecimal, formatQuantity, formatUsd } from "@/utils/format-number";

export type PurchaseLineCardProps = {
  line: PurchaseLine;
  /** Edit and delete are offered only while the trip is open. */
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
};

/** One purchase of the trip: quantities, what was paid and the resulting prices. */
export function PurchaseLineCard({
  line,
  canEdit,
  onEdit,
  onDelete,
  isDeleting,
}: PurchaseLineCardProps): React.JSX.Element {
  const t = useTranslations("purchases.line");
  const labels = useUnitLabels();
  const suffix = labels.suffix(line.saleUnit);
  const stall = [line.supplierName, line.stallReference].filter(Boolean).join(" · ");

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{line.productName}</p>
          {stall && <p className="text-sm text-muted">{stall}</p>}
        </div>
        <Badge tone={line.paymentStatus === "credit" ? "warning" : "neutral"}>
          {t(`paymentStatus.${line.paymentStatus}`)}
        </Badge>
      </div>
      <p className="text-sm text-muted">
        {t("quantities", {
          packs: labels.packsCount(line.purchaseUnit, line.packs),
          gross: formatQuantity(line.grossQuantity),
          shrinkage: formatQuantity(line.shrinkage),
          usable: formatQuantity(line.usableQuantity),
          suffix,
        })}
      </p>
      <p className="text-sm text-muted">
        {t("paymentDetail", {
          quoted: formatUsd(line.quotedPriceUsd),
          rate: formatDecimal(line.supplierRate, 2),
          bs: formatBs(line.amountBs),
          realCost: formatUsd(line.realCostUsd),
        })}
      </p>
      <p className="text-sm">
        {t("unitCost", { unitCost: formatUsd(line.unitCostUsd), suffix })} ·{" "}
        <span className="font-semibold text-primary-text">
          {t("salePrice", { sale: formatUsd(line.salePriceUsd), suffix })}
        </span>
      </p>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            {t("edit")}
          </Button>
          <ConfirmButton
            question={t("deleteQuestion", { product: line.productName })}
            confirmLabel={t("delete")}
            onConfirm={onDelete}
            isLoading={isDeleting}
            loadingText={t("deleting")}
            size="sm"
          >
            {t("delete")}
          </ConfirmButton>
        </div>
      )}
    </Card>
  );
}
