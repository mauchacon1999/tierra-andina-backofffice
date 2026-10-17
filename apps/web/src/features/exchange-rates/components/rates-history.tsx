"use client";

import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { useRatesHistory } from "@/features/exchange-rates/api/use-daily-rates";
import {
  businessDateMinusDays,
  formatBusinessDateLong,
  todayBusinessDate,
} from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

const DAYS = 14;

/** Rates of the last two weeks, newest first. */
export function RatesHistory(): React.JSX.Element {
  const t = useTranslations("rates.history");
  const tc = useTranslations("common");
  const today = todayBusinessDate();
  const { days, isLoading } = useRatesHistory(businessDateMinusDays(today, DAYS - 1), today);
  const show = (value: string | null) => (value === null ? tc("empty") : formatDecimal(value, 2));

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t("title", { days: DAYS })}</h2>
      {isLoading && (
        <p role="status" className="text-sm text-muted">
          {tc("loading")}
        </p>
      )}
      {!isLoading && days.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
      {days.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 font-medium">{t("day")}</th>
              <th className="py-1 text-right font-medium">{t("bcv")}</th>
              <th className="py-1 text-right font-medium">{t("market")}</th>
              <th className="py-1 text-right font-medium">{t("sale")}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.businessDate} className="border-t border-border">
                <td className="py-1.5">{formatBusinessDateLong(day.businessDate)}</td>
                <td className="py-1.5 text-right">{show(day.bcv)}</td>
                <td className="py-1.5 text-right">{show(day.market)}</td>
                <td className="py-1.5 text-right">{show(day.sale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
