"use client";

import type { ReceiptLine, ReceiptStatus, ReceiptToBuy } from "@ta/validators";
import { Check, CircleX, GripVertical, ShoppingCart, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { cn } from "@/utils/cn";
import { formatQuantity } from "@/utils/format-number";

export type PendingRowProps = {
  item: ReceiptToBuy | ReceiptLine;
  isSaving: boolean;
  onMark: (line: ReceiptLine, status: ReceiptStatus) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onGripPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onGripPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onGripPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
};

const isLine = (item: ReceiptToBuy | ReceiptLine): item is ReceiptLine => "receiptStatus" in item;

/** One pending product on a single dense row: status icon, name, and the check when it is on the way. */
export function PendingRow({
  item,
  isSaving,
  onMark,
  onMoveUp,
  onMoveDown,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
}: PendingRowProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const labels = useUnitLabels();
  const line = isLine(item) ? item : null;
  const onTheWay = line?.receiptStatus === "pending";
  const missing = line?.receiptStatus === "missing";
  let StatusIcon = ShoppingCart;
  let statusClass = "text-warning-text";
  let statusLabel = t("toBuy");
  if (missing) {
    StatusIcon = CircleX;
    statusClass = "text-danger-text";
    statusLabel = t("missing");
  } else if (line) {
    StatusIcon = Truck;
    statusClass = "text-info-text";
    statusLabel = t("onTheWay");
  }
  let detail: string | null = null;
  if (isLine(item)) {
    detail = item.packs
      ? labels.packsCount(item.purchaseUnit, item.packs)
      : labels.quantity(formatQuantity(item.grossQuantity), item.saleUnit);
    const stall = [item.supplierName, item.stallReference].filter(Boolean).join(" · ");
    if (stall) detail = `${detail} · ${stall}`;
  } else {
    detail = item.note;
  }

  return (
    <div role="group" aria-label={t("actions", { product: item.productName })} className="py-1">
      <div className="flex items-center gap-1">
        <IconButton
          label={t("move", { product: item.productName })}
          className="cursor-grab touch-none text-muted active:cursor-grabbing"
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={onGripPointerUp}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            if (event.key === "ArrowUp") onMoveUp();
            else onMoveDown();
          }}
        >
          <GripVertical aria-hidden className="size-5" />
        </IconButton>
        <StatusIcon aria-hidden className={cn("size-5 shrink-0", statusClass)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.productName}</p>
          <p className={cn("truncate text-xs font-medium", statusClass)}>
            {detail ? `${statusLabel} · ${detail}` : statusLabel}
          </p>
        </div>
        {line && onTheWay && (
          <IconButton
            label={t("markReceived", { product: item.productName })}
            disabled={isSaving}
            className="text-primary-text"
            onClick={() => onMark(line, "received")}
          >
            <Check aria-hidden className="size-6" />
          </IconButton>
        )}
        {line && missing && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={() => onMark(line, "pending")}
          >
            {t("undo")}
          </Button>
        )}
      </div>
      {line && onTheWay && (
        <div className="flex flex-wrap gap-2 pl-12">
          {line.packs && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isSaving}
              onClick={() => onMark(line, "partial")}
            >
              {t("partial")}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={() => onMark(line, "missing")}
          >
            {t("missing")}
          </Button>
        </div>
      )}
    </div>
  );
}
