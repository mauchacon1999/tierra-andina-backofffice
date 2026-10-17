"use client";

import { useTranslations } from "next-intl";

import type { LinePreview as LinePreviewValues } from "@/features/purchases/helpers/line-preview";
import { formatBs, formatQuantity, formatUsd } from "@/utils/format-number";

export type LinePreviewProps = {
  preview: LinePreviewValues | null;
  quantitySuffix: string;
};

/** Live cost of the line being typed: what is paid, what it really costs, the sale price. */
export function LinePreview({
  preview,
  quantitySuffix: suffix,
}: LinePreviewProps): React.JSX.Element {
  const t = useTranslations("purchases.preview");

  if (!preview) {
    return (
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted" aria-live="polite">
        {t("empty")}
      </p>
    );
  }

  return (
    <dl
      aria-live="polite"
      aria-label={t("label")}
      className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-primary-soft px-3 py-2 text-sm"
    >
      <dt className="text-muted">{t("paid")}</dt>
      <dd className="text-right font-medium">{formatBs(preview.amountBs)}</dd>
      <dt className="text-muted">{t("realCost")}</dt>
      <dd className="text-right font-medium">{formatUsd(preview.realCostUsd)}</dd>
      <dt className="text-muted">{t("usable")}</dt>
      <dd className="text-right font-medium">
        {t("usableValue", { quantity: formatQuantity(preview.usableQuantity), suffix })}
      </dd>
      <dt className="text-muted">{t("unitCost", { suffix })}</dt>
      <dd className="text-right font-medium">{formatUsd(preview.unitCostUsd)}</dd>
      <dt className="font-semibold text-primary-text">{t("salePrice", { suffix })}</dt>
      <dd className="text-right font-semibold text-primary-text">
        {formatUsd(preview.salePriceUsd)}
      </dd>
    </dl>
  );
}
