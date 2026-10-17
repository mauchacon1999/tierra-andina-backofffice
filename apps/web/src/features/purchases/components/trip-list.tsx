"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTrips } from "@/features/purchases/api/use-trips";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatBs, formatUsd } from "@/utils/format-number";

const QUERY = { pageSize: 30 } as const;

/** Latest purchase trips, open ones first; each card opens the trip. */
export function TripList(): React.JSX.Element {
  const { page, isLoading, error, retry } = useTrips(QUERY);
  const t = useTranslations("purchases");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  if (error && !page) {
    return (
      <Alert tone="error" title={t("list.loadFailed")}>
        <p>{errorMessage(error, error.message)}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={retry}>
          {tc("retry")}
        </Button>
      </Alert>
    );
  }
  if (isLoading || !page) {
    return (
      <p role="status" className="text-muted">
        {tc("loading")}
      </p>
    );
  }
  if (page.data.length === 0) {
    return <p className="text-muted">{t("list.empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {page.data.map((trip) => (
        <li key={trip.id}>
          <Link
            href={`/purchases/${trip.id}`}
            className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          >
            <Card tone={trip.status === "open" ? "success" : "default"} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold capitalize">
                  {formatBusinessDateLong(trip.businessDate)}
                </p>
                <Badge tone={trip.status === "open" ? "success" : "neutral"}>
                  {t(`status.${trip.status}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted">
                {t("list.summary", {
                  count: trip.lineCount,
                  usd: formatUsd(trip.totalUsd),
                  bs: formatBs(trip.totalBs),
                })}
              </p>
              {trip.note && <p className="text-sm text-muted">{trip.note}</p>}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
