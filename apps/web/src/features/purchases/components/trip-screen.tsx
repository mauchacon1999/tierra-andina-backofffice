"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PurchaseLineCard } from "@/features/purchases/components/purchase-line-card";
import { PurchaseLineForm } from "@/features/purchases/components/purchase-line-form";
import { TripHeader } from "@/features/purchases/components/trip-header";
import { useTripScreen } from "@/features/purchases/hooks/use-trip-screen";
import { useErrorMessage } from "@/i18n/use-error-message";

/** A purchase trip: add purchases while it is open, review them, close it. */
export function TripScreen(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const s = useTripScreen(id);
  const t = useTranslations("purchases.trip");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

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

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} />
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      {s.isOpen && s.editingLineId === null && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("addLine")}</h2>
          <PurchaseLineForm trip={trip} />
        </Card>
      )}

      <section className="space-y-3" aria-label={t("linesLabel")}>
        <h2 className="font-semibold">{t("lines", { count: trip.lines.length })}</h2>
        {trip.lines.length === 0 && <p className="text-sm text-muted">{t("noLines")}</p>}
        {trip.lines.map((line) =>
          s.editingLineId === line.id ? (
            <Card key={line.id} tone="muted" className="space-y-3">
              <h3 className="font-semibold">{t("editLine", { product: line.productName })}</h3>
              <PurchaseLineForm
                trip={trip}
                line={line}
                onDone={() => s.setEditingLineId(null)}
                onCancel={() => s.setEditingLineId(null)}
              />
            </Card>
          ) : (
            <PurchaseLineCard
              key={line.id}
              line={line}
              canEdit={s.isOpen && s.editingLineId === null}
              onEdit={() => s.setEditingLineId(line.id)}
              onDelete={() => s.deleteLine(line.id)}
              isDeleting={s.deletingLineId === line.id}
            />
          ),
        )}
      </section>

      {s.isOpen && (
        <Card className="space-y-3">
          <p className="text-sm text-muted">{t("closeHint")}</p>
          <ConfirmButton
            question={t("closeQuestion")}
            confirmLabel={t("close")}
            variant="primary"
            onConfirm={s.closeTrip}
            isLoading={s.isClosing}
            loadingText={t("closing")}
          >
            {t("close")}
          </ConfirmButton>
        </Card>
      )}
    </div>
  );
}
