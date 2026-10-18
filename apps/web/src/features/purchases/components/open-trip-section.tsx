"use client";

import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useTrips } from "@/features/purchases/api/use-trips";
import { OpenTripForm } from "@/features/purchases/components/open-trip-form";
import { formatBusinessDateLong } from "@/utils/format-date";

/** Opens a trip, or points at the one already open: a store has only one. */
export function OpenTripSection(): React.JSX.Element {
  const trips = useTrips({ status: "open", page: 1, pageSize: 10 });
  const t = useTranslations("purchases.openTrip");
  const tc = useTranslations("common");
  const open = trips.page?.data ?? [];

  if (trips.isLoading) {
    return (
      <p role="status" className="text-muted">
        {tc("loading")}
      </p>
    );
  }

  const first = open[0];
  if (first) {
    return (
      <Card className="space-y-3">
        <h2 className="font-semibold">{open.length > 1 ? t("severalTitle") : t("alreadyTitle")}</h2>
        <p className="text-sm text-muted">
          {open.length > 1
            ? t("severalBody")
            : t("alreadyBody", { date: formatBusinessDateLong(first.businessDate) })}
        </p>
        <ul className="flex flex-col gap-2">
          {open.map((trip) => (
            <li key={trip.id}>
              <ButtonLink href={`/purchases/${trip.id}`}>
                {open.length > 1 ? formatBusinessDateLong(trip.businessDate) : t("continue")}
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <Card>
      <OpenTripForm />
    </Card>
  );
}
