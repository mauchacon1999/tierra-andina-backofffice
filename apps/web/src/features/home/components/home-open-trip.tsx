"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useTrips } from "@/features/purchases/api/use-trips";
import { formatBusinessDateLong } from "@/utils/format-date";

/** The store's open purchase trip, so the owner can enter it from home and close it. */
export function HomeOpenTrip(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  if (activeMembership?.role !== "owner") return null;
  return <OpenTripCard />;
}

function OpenTripCard(): React.JSX.Element | null {
  const trips = useTrips({ status: "open", page: 1, pageSize: 10 });
  const t = useTranslations("home.openTrip");
  const open = trips.page?.data ?? [];
  if (open.length === 0) return null;
  const first = open[0];
  if (!first) return null;
  const several = open.length > 1;

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingCart aria-hidden className="size-5 shrink-0 text-primary-text" />
          {several ? t("severalTitle") : t("title")}
        </h2>
        <p className="text-sm text-muted">
          {several
            ? t("severalBody")
            : t("body", { date: formatBusinessDateLong(first.businessDate) })}
        </p>
      </div>
      <ul className="space-y-2">
        {open.map((trip) => (
          <li key={trip.id}>
            <ButtonLink href={`/purchases/${trip.id}`} variant={several ? "secondary" : "primary"}>
              {several ? formatBusinessDateLong(trip.businessDate) : t("enter")}
            </ButtonLink>
          </li>
        ))}
      </ul>
    </Card>
  );
}
