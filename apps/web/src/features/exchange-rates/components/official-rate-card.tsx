"use client";

import { Landmark } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useOfficialBcvRate } from "@/features/exchange-rates/api/use-daily-rates";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDate } from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

export type OfficialRateCardProps = {
  /** Writes the consulted rate into the BCV field. Without it, the card links to the rates screen. */
  onUse?: (usd: string) => void;
};

/** The official BCV USD rate, consulted when the screen opens. Saving it is a separate step. */
export function OfficialRateCard({ onUse }: OfficialRateCardProps): React.JSX.Element {
  const { rate, isLoading, error, retry } = useOfficialBcvRate();
  const t = useTranslations("rates");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();

  return (
    <Card tone="info" className="space-y-2">
      <p className="flex items-center gap-2 font-semibold">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
          <Landmark aria-hidden className="size-5" />
        </span>
        {t("official.title")}
      </p>
      {isLoading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          {t("official.loading")}
        </p>
      )}
      {error && (
        <Alert tone="error" title={errorMessage(error, t("official.unavailable"))}>
          <Button type="button" variant="secondary" onClick={retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {rate && (
        <>
          <p className="text-2xl font-bold tracking-tight text-primary-text">
            {t("official.value", { rate: formatDecimal(rate.usd, 4) })}
          </p>
          <p className="text-sm text-muted">
            {t("official.effective", { date: formatBusinessDate(rate.effectiveDate) })}
          </p>
          <p className="text-sm text-muted">{t("official.source")}</p>
          {onUse ? (
            <Button type="button" variant="secondary" onClick={() => onUse(rate.usd)}>
              {t("official.use")}
            </Button>
          ) : (
            <ButtonLink href="/rates" variant="secondary">
              {t("official.open")}
            </ButtonLink>
          )}
        </>
      )}
    </Card>
  );
}
