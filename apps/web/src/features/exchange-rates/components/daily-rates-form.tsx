"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useDailyRatesForm } from "@/features/exchange-rates/hooks/use-daily-rates-form";
import { formatBusinessDateLong } from "@/utils/format-date";

export type DailyRatesFormProps = {
  /** Day shown first; today in Caracas by default. */
  initialDate?: string;
};

/** Enter the BCV, Coche and sale rates of a day (Bs per USD). */
export function DailyRatesForm({ initialDate }: DailyRatesFormProps): React.JSX.Element {
  const r = useDailyRatesForm(initialDate);
  const t = useTranslations("rates");
  const tc = useTranslations("common");
  const { errors } = r.form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void r.onSubmit();
      }}
    >
      {r.formError && <Alert tone="error">{r.formError}</Alert>}
      {r.isSaved && <Alert tone="success">{t("saved")}</Alert>}

      <TextField
        label={t("date")}
        type="date"
        value={r.date}
        onChange={(event) => event.target.value && r.setDate(event.target.value)}
        hint={formatBusinessDateLong(r.date)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label={t("bcv")}
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          hint={t("bcvHint")}
          readOnly={r.isLoadingDay}
          error={errors.bcv?.message}
          {...r.form.register("bcv")}
        />
        <TextField
          label={t("market")}
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          hint={t("marketHint")}
          readOnly={r.isLoadingDay}
          error={errors.market?.message}
          {...r.form.register("market")}
        />
        <TextField
          label={t("sale")}
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          hint={t("saleHint")}
          readOnly={r.isLoadingDay}
          error={errors.sale?.message}
          {...r.form.register("sale")}
        />
      </div>
      <Button
        type="submit"
        className="w-full sm:w-auto"
        isLoading={r.isSaving}
        loadingText={tc("saving")}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
