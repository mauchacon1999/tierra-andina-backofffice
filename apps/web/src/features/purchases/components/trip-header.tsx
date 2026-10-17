"use client";

import type { TripDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatBs, formatDecimal, formatUsd } from "@/utils/format-number";

export type TripHeaderProps = {
  trip: TripDetail;
};

/** Day, status, the rates copied into the trip and its totals. */
export function TripHeader({ trip }: TripHeaderProps): React.JSX.Element {
  const t = useTranslations("purchases");
  const isOpen = trip.status === "open";

  return (
    <Card tone={isOpen ? "success" : "default"} className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize">
          {formatBusinessDateLong(trip.businessDate)}
        </h2>
        <Badge tone={isOpen ? "success" : "neutral"}>{t(`status.${trip.status}`)}</Badge>
      </div>
      {trip.note && <p className="text-sm text-muted">{trip.note}</p>}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">{t("trip.bcvRate")}</dt>
        <dd className="text-right">
          {t("trip.rateValue", { rate: formatDecimal(trip.bcvRate, 2) })}
        </dd>
        <dt className="text-muted">{t("trip.marketRate")}</dt>
        <dd className="text-right">
          {t("trip.rateValue", { rate: formatDecimal(trip.marketRate, 2) })}
        </dd>
        <dt className="text-muted">{t("trip.paidToStalls")}</dt>
        <dd className="text-right font-medium">{formatBs(trip.totalBs)}</dd>
        <dt className="text-muted">{t("trip.realCost")}</dt>
        <dd className="text-right font-semibold">{formatUsd(trip.totalUsd)}</dd>
      </dl>
    </Card>
  );
}
