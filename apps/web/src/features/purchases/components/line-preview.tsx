import type { LinePreview as LinePreviewValues } from "@/features/purchases/helpers/line-preview";
import { formatBs, formatQuantity, formatUsd } from "@/utils/format-number";

export type LinePreviewProps = {
  preview: LinePreviewValues | null;
  quantitySuffix: string;
};

/** Live cost of the line being typed: what is paid, what it really costs, the sale price. */
export function LinePreview({ preview, quantitySuffix }: LinePreviewProps): React.JSX.Element {
  if (!preview) {
    return (
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted" aria-live="polite">
        Completa cantidad y precio para ver el costo.
      </p>
    );
  }

  return (
    <dl
      aria-live="polite"
      aria-label="Costo de la compra"
      className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-primary-soft px-3 py-2 text-sm"
    >
      <dt className="text-muted">Pagas</dt>
      <dd className="text-right font-medium">{formatBs(preview.amountBs)}</dd>
      <dt className="text-muted">Costo real</dt>
      <dd className="text-right font-medium">{formatUsd(preview.realCostUsd)}</dd>
      <dt className="text-muted">Útil</dt>
      <dd className="text-right font-medium">
        {formatQuantity(preview.usableQuantity)} {quantitySuffix}
      </dd>
      <dt className="text-muted">Costo por {quantitySuffix}</dt>
      <dd className="text-right font-medium">{formatUsd(preview.unitCostUsd)}</dd>
      <dt className="font-semibold text-primary-text">Venta por {quantitySuffix}</dt>
      <dd className="text-right font-semibold text-primary-text">
        {formatUsd(preview.salePriceUsd)}
      </dd>
    </dl>
  );
}
