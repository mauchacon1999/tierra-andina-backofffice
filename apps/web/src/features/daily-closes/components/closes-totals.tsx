"use client";

import type { DailyCloseSummary } from "@ta/validators";
import { useTranslations } from "next-intl";

import { sumCollected } from "@/features/daily-closes/helpers/close-totals";
import { formatDecimal } from "@/utils/format-number";

export type ClosesTotalsProps = {
  closes: DailyCloseSummary[];
};

/** Sales of the closes currently listed, one chip per currency. */
export function ClosesTotals({ closes }: ClosesTotalsProps): React.JSX.Element {
  const t = useTranslations("closes");
  const totals = sumCollected(
    closes.map((close) => ({ ves: close.totals.collected.VES, usd: close.totals.collected.USD })),
  );

  return (
    <div role="group" aria-label={t("totals")} className="flex flex-wrap gap-2">
      <span className="inline-flex min-h-11 items-center rounded-full border border-chip-border bg-chip-soft px-4 text-sm font-semibold text-chip-text">
        {t("totalChipBs", { amount: formatDecimal(totals.ves, 2) })}
      </span>
      <span className="inline-flex min-h-11 items-center rounded-full border border-chip-border bg-chip-soft px-4 text-sm font-semibold text-chip-text">
        {t("totalChipUsd", { amount: formatDecimal(totals.usd, 2) })}
      </span>
    </div>
  );
}
