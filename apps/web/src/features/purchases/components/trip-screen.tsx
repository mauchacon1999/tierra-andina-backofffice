"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { PurchaseLineForm } from "@/features/purchases/components/purchase-line-form";
import { TripCloseCard } from "@/features/purchases/components/trip-close-card";
import { TripHeader } from "@/features/purchases/components/trip-header";
import { TripLines } from "@/features/purchases/components/trip-lines";
import { TripNeededList } from "@/features/purchases/components/trip-needed-list";
import { TripPayables } from "@/features/purchases/components/trip-payables";
import { useTripScreen } from "@/features/purchases/hooks/use-trip-screen";
import { useErrorMessage } from "@/i18n/use-error-message";

/** A purchase trip: add purchases while it is open, review them, close it. */
export function TripScreen(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const s = useTripScreen(id);
  const t = useTranslations("purchases.trip");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const [pick, setPick] = useState<{ productId: string; token: number } | null>(null);

  if (s.error && !s.trip) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title={t("loadFailed")}>
          {errorMessage(s.error, s.error.message)}
        </Alert>
        <div className="flex gap-3">
          {s.error.status !== 404 && (
            <Button variant="secondary" onClick={s.retry}>
              {tc("retry")}
            </Button>
          )}
          <ButtonLink href="/purchases" variant="secondary">
            {t("viewTrips")}
          </ButtonLink>
          <ButtonLink href="/local-purchases" variant="secondary">
            {t("viewLocalPurchases")}
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (s.isLoading || !s.trip) {
    return (
      <p role="status" className="text-muted">
        {tc("loading")}
      </p>
    );
  }
  const { trip } = s;
  const isLocal = trip.kind === "local";

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} />
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      <TripPayables trip={trip} />
      {s.isOpen && isLocal && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("addLine")}</h2>
          <p className="text-sm text-muted">{t("addLineHint")}</p>
          <PurchaseLineForm trip={trip} />
        </Card>
      )}
      {s.isOpen && !isLocal && (
        <TripNeededList
          onBuy={(productId) =>
            setPick((current) => ({ productId, token: (current?.token ?? 0) + 1 }))
          }
        />
      )}
      {s.isOpen && !isLocal && pick && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("addLine")}</h2>
          <PurchaseLineForm
            trip={trip}
            pickedProductId={pick.productId}
            pickToken={pick.token}
            onDone={() => setPick(null)}
            onCancel={() => setPick(null)}
          />
        </Card>
      )}

      <TripLines trip={trip} screen={s} />

      {!s.isOpen && (
        <ButtonLink href="/prices" variant="secondary">
          {t("viewPrices")}
        </ButtonLink>
      )}

      {s.isOpen && <TripCloseCard trip={trip} screen={s} />}
    </div>
  );
}
