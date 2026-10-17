"use client";

import type { DailyCloseTotals } from "@ta/core";
import { useTranslations } from "next-intl";

import { formatDecimal } from "@/utils/format-number";

export type CloseTotalsProps = {
  totals: DailyCloseTotals;
};

const ROWS = [
  ["collected", "collected"],
  ["credit", "creditSold"],
  ["expenses", "expensesTotal"],
] as const;

/** Totals per currency (Bs and $ are never added together). */
export function CloseTotals({ totals }: CloseTotalsProps): React.JSX.Element {
  const t = useTranslations("dailyClose");

  return (
    <dl
      aria-label={t("totals")}
      aria-live="polite"
      className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 rounded-lg bg-primary-soft px-3 py-2 text-sm"
    >
      {ROWS.map(([key, label]) => (
        <div key={key} className="contents">
          <dt className={key === "collected" ? "font-semibold text-primary-text" : "text-muted"}>
            {t(label)}
          </dt>
          <dd className="text-right font-medium tabular-nums">
            {t("amountBs", { amount: formatDecimal(totals[key].VES, 2) })}
          </dd>
          <dd className="text-right font-medium tabular-nums">
            {t("amountUsd", { amount: formatDecimal(totals[key].USD, 2) })}
          </dd>
        </div>
      ))}
    </dl>
  );
}
