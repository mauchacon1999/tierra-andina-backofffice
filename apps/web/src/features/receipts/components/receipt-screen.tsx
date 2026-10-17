"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PartialReceiptForm } from "@/features/receipts/components/partial-receipt-form";
import { ReceiptTripSection } from "@/features/receipts/components/receipt-trip-section";
import { useReceiptScreen } from "@/features/receipts/hooks/use-receipt-screen";
import { useErrorMessage } from "@/i18n/use-error-message";

/** Truck receipt (domain-model §4): the open trips' purchases, marked as they arrive. */
export function ReceiptScreen(): React.JSX.Element {
  const s = useReceiptScreen();
  const t = useTranslations("receipts");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  if (s.error && s.trips.length === 0) {
    return (
      <Alert tone="error" title={t("loadFailed")}>
        <p>{errorMessage(s.error, s.error.message)}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={s.retry}>
          {tc("retry")}
        </Button>
      </Alert>
    );
  }
  if (s.isLoading) {
    return (
      <p role="status" className="text-muted">
        {tc("loading")}
      </p>
    );
  }
  if (s.trips.length === 0) return <p className="text-muted">{t("noTrips")}</p>;

  return (
    <div className="space-y-6">
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}
      {s.trips.map((trip) => (
        <ReceiptTripSection
          key={trip.id}
          trip={trip}
          onMark={(line, status) => s.mark(trip.id, line, status)}
          markingLineId={s.markingLineId}
        />
      ))}
      <Dialog
        isOpen={s.partial !== null}
        onClose={s.closePartial}
        title={
          s.partial ? t("partialTitle", { product: s.partial.line.productName }) : t("partial")
        }
        closeLabel={tc("close")}
      >
        {s.partial && (
          <PartialReceiptForm
            tripId={s.partial.tripId}
            line={s.partial.line}
            onDone={s.closePartial}
          />
        )}
      </Dialog>
    </div>
  );
}
