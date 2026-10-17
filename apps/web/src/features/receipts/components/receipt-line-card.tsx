"use client";

import type { ReceiptLine, ReceiptStatus } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { formatUsd } from "@/utils/format-number";

export type ReceiptLineCardProps = {
  line: ReceiptLine;
  onMark: (status: ReceiptStatus) => void;
  isSaving: boolean;
};

const BADGE: Record<ReceiptStatus, BadgeTone> = {
  pending: "warning",
  received: "success",
  partial: "warning",
  missing: "danger",
};

const CHOICES = ["received", "partial", "missing"] as const;

/** One purchase to check at the truck: what came, from which stall, and three big buttons. */
export function ReceiptLineCard({
  line,
  onMark,
  isSaving,
}: ReceiptLineCardProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const tl = useTranslations("purchases.line");
  const labels = useUnitLabels();
  const bought = labels.packsCount(line.purchaseUnit, line.packs);
  const stall =
    [line.supplierName, line.stallReference].filter(Boolean).join(" · ") || t("noStall");

  return (
    <Card tone={line.receiptStatus === "pending" ? "default" : "muted"} className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{line.productName}</p>
          <p className="text-sm text-muted">{t("bought", { packs: bought, stall })}</p>
          {line.quotedPriceUsd && (
            <p className="text-sm text-muted">
              {t("price", { price: formatUsd(line.quotedPriceUsd) })}
            </p>
          )}
        </div>
        <Badge tone={BADGE[line.receiptStatus]}>{tl(`receiptStatus.${line.receiptStatus}`)}</Badge>
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
      <div
        role="group"
        aria-label={t("actions", { product: line.productName })}
        className="grid grid-cols-3 gap-2"
      >
        {CHOICES.map((status) => (
          <Button
            key={status}
            variant={line.receiptStatus === status ? "primary" : "secondary"}
            aria-pressed={line.receiptStatus === status}
            size="lg"
            disabled={isSaving}
            onClick={() => onMark(status)}
          >
            {t(status)}
          </Button>
        ))}
      </div>
      {line.receiptStatus !== "pending" && (
        <Button variant="ghost" size="sm" disabled={isSaving} onClick={() => onMark("pending")}>
          {t("undo")}
        </Button>
      )}
    </Card>
  );
}
