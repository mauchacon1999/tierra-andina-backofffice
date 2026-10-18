"use client";

import { CURRENCIES } from "@ta/core";
import type { TripDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { useTripClose } from "@/features/purchases/hooks/use-trip-close";
import type { UseTripScreenResult } from "@/features/purchases/hooks/use-trip-screen";

export type TripCloseCardProps = { trip: TripDetail; screen: UseTripScreenResult };

/** "Cerrar jornada" / "Guardar compra": publishes prices and turns credit into invoices. */
export function TripCloseCard({ trip, screen }: TripCloseCardProps): React.JSX.Element {
  const c = useTripClose(trip, screen.closeTrip);
  const t = useTranslations("purchases.trip");
  const tcur = useTranslations("payables.currencies");

  const question = c.isLocal
    ? t("localCloseQuestion")
    : c.pending > 0
      ? t("closeQuestionPending", { count: c.pending })
      : t("closeQuestion");

  return (
    <Card className="space-y-3">
      <p className="text-sm text-muted">{c.isLocal ? t("localCloseHint") : t("closeHint")}</p>
      {!c.isLocal && c.hasCredit && <p className="text-sm text-muted">{t("closeHintCredit")}</p>}
      {c.isLocal && c.hasCredit && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SegmentedControl
            label={t("payableCurrency")}
            name="payableCurrency"
            hint={t("payableCurrencyHint")}
            options={CURRENCIES.slice()
              .reverse()
              .map((value) => ({ value, label: tcur(value) }))}
            value={c.currency}
            onChange={c.setCurrency}
          />
          <TextField
            label={t("payableDueOn")}
            type="date"
            required
            value={c.dueOn}
            error={c.dueOnError}
            onChange={(event) => c.setDueOn(event.target.value)}
          />
        </div>
      )}
      <ConfirmButton
        question={question}
        confirmLabel={c.isLocal ? t("localClose") : t("close")}
        variant="primary"
        onConfirm={c.confirm}
        isLoading={screen.isClosing}
        loadingText={t("closing")}
      >
        {c.isLocal ? t("localClose") : t("close")}
      </ConfirmButton>
    </Card>
  );
}
