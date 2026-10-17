import type { PurchaseLine } from "@ta/validators";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SALE_UNIT_SUFFIX } from "@/features/products/helpers/unit-labels";
import { PACKS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/purchases/helpers/line-labels";
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
  const unit = SALE_UNIT_SUFFIX[line.saleUnit];
  const stall = [line.supplierName, line.stallReference].filter(Boolean).join(" · ");

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{line.productName}</p>
          {stall && <p className="text-sm text-muted">{stall}</p>}
        </div>
        <Badge tone={line.paymentStatus === "credit" ? "warning" : "neutral"}>
          {PAYMENT_STATUS_LABELS[line.paymentStatus]}
        </Badge>
      </div>
      <p className="text-sm text-muted">
        {formatQuantity(line.packs)} {PACKS_LABELS[line.purchaseUnit].toLowerCase()} ·{" "}
        {formatQuantity(line.grossQuantity)} {unit} − {formatQuantity(line.shrinkage)} merma ={" "}
        {formatQuantity(line.usableQuantity)} {unit} útiles
      </p>
      <p className="text-sm text-muted">
        {formatUsd(line.quotedPriceUsd)} × {formatDecimal(line.supplierRate, 2)} ={" "}
        {formatBs(line.amountBs)} · costo real {formatUsd(line.realCostUsd)}
      </p>
      <p className="text-sm">
        Costo {formatUsd(line.unitCostUsd)}/{unit} ·{" "}
        <span className="font-semibold text-primary-text">
          Venta {formatUsd(line.salePriceUsd)}/{unit}
        </span>
      </p>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <ConfirmButton
            question={`¿Eliminar ${line.productName}?`}
            confirmLabel="Eliminar"
            onConfirm={onDelete}
            isLoading={isDeleting}
            loadingText="Eliminando…"
            size="sm"
          >
            Eliminar
          </ConfirmButton>
        </div>
      )}
    </Card>
  );
}
