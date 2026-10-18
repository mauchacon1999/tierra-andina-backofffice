"use client";

import type { ReceiptLine, ReceiptStatus } from "@ta/validators";
import { Check, CircleCheck, CircleX, Truck, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { cn } from "@/utils/cn";
import { formatQuantity, formatUsd } from "@/utils/format-number";

export type ReceiptLineCardProps = {
  line: ReceiptLine;
  onMark: (status: ReceiptStatus) => void;
  isSaving: boolean;
};

const STATUS: Record<
  ReceiptStatus,
  { icon: LucideIcon; className: string; label: "onTheWay" | "received" | "partial" | "missing" }
> = {
  pending: { icon: Truck, className: "text-info-text", label: "onTheWay" },
  received: { icon: CircleCheck, className: "text-primary-text", label: "received" },
  partial: { icon: TriangleAlert, className: "text-warning-text", label: "partial" },
  missing: { icon: CircleX, className: "text-danger-text", label: "missing" },
};

/** One purchase at the truck: its status, and a check when it is still on the way. */
export function ReceiptLineCard({
  line,
  onMark,
  isSaving,
}: ReceiptLineCardProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const labels = useUnitLabels();
  const status = STATUS[line.receiptStatus];
  const StatusIcon = status.icon;
  const bought = line.packs
    ? labels.packsCount(line.purchaseUnit, line.packs)
    : labels.quantity(formatQuantity(line.grossQuantity), line.saleUnit);
  const stall = [line.supplierName, line.stallReference].filter(Boolean).join(" · ");
  const onTheWay = line.receiptStatus === "pending";

  return (
    <Card tone={onTheWay ? "default" : "muted"}>
      <div
        role="group"
        aria-label={t("actions", { product: line.productName })}
        className="space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusIcon aria-hidden className={cn("size-5 shrink-0", status.className)} />
              <p className="text-lg font-semibold">{line.productName}</p>
            </div>
            <p className={cn("text-sm font-medium", status.className)}>{t(status.label)}</p>
            <p className="text-sm text-muted">
              {stall ? t("bought", { packs: bought, stall }) : bought}
            </p>
            {line.quotedPriceUsd && (
              <p className="text-sm text-muted">
                {t("price", { price: formatUsd(line.quotedPriceUsd) })}
              </p>
            )}
          </div>
          {onTheWay && (
            <IconButton
              label={t("markReceived", { product: line.productName })}
              disabled={isSaving}
              className="text-primary-text"
              onClick={() => onMark("received")}
            >
              <Check aria-hidden className="size-6" />
            </IconButton>
          )}
        </div>
        {line.receiptStatus === "partial" && line.receivedPacks && (
          <p className="text-sm">
            {t("partialSummary", {
              received: labels.packsCount(line.purchaseUnit, line.receivedPacks),
              bought,
            })}
          </p>
        )}
        {line.receiptNote && <p className="text-sm text-muted">{line.receiptNote}</p>}
        {onTheWay && (
          <div className="flex flex-wrap gap-2">
            {line.packs && (
              <Button
                variant="secondary"
                size="sm"
                disabled={isSaving}
                onClick={() => onMark("partial")}
              >
                {t("partial")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={isSaving}
              onClick={() => onMark("missing")}
            >
              {t("missing")}
            </Button>
          </div>
        )}
        {!onTheWay && (
          <Button variant="ghost" size="sm" disabled={isSaving} onClick={() => onMark("pending")}>
            {t("undo")}
          </Button>
        )}
      </div>
    </Card>
  );
}
