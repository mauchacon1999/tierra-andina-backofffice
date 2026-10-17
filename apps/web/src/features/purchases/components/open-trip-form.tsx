"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { TextField } from "@/components/ui/text-field";
import { useOpenTripForm } from "@/features/purchases/hooks/use-open-trip-form";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

/** Opens the purchase trip of a day with that day's BCV and Coche rates. */
export function OpenTripForm(): React.JSX.Element {
  const f = useOpenTripForm();
  const t = useTranslations("purchases.openTrip");
  const tc = useTranslations("common");
  const { errors } = f.form.formState;
  const [first, second] = f.missingRates.map((kind) => t(`rateNames.${kind}`));

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      <h2 className="font-semibold">{t("title")}</h2>
      {f.formError && !first && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label={t("date")}
        type="date"
        error={errors.businessDate?.message}
        hint={f.businessDate ? formatBusinessDateLong(f.businessDate) : undefined}
        {...f.form.register("businessDate")}
      />
      {first ? (
        <Alert
          tone="warning"
          title={t("missingTitle", { count: f.missingRates.length, first, second: second ?? "" })}
        >
          <p>{t("missingBody")}</p>
          <ButtonLink href="/rates" variant="secondary" size="sm" className="mt-2">
            {t("goToRates")}
          </ButtonLink>
        </Alert>
      ) : (
        f.rates?.bcv &&
        f.rates.market && (
          <p className="text-sm text-muted">
            {t("rates", {
              bcv: formatDecimal(f.rates.bcv, 2),
              market: formatDecimal(f.rates.market, 2),
            })}
          </p>
        )
      )}
      <TextField
        label={t("note")}
        autoComplete="off"
        hint={tc("optional")}
        error={errors.note?.message}
        {...f.form.register("note")}
      />
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={Boolean(first) || f.isLoadingRates}
        isLoading={f.isSubmitting}
        loadingText={t("submitting")}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
