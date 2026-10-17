"use client";

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
      {r.isSaved && <Alert tone="success">Tasas guardadas.</Alert>}

      <TextField
        label="Fecha"
        type="date"
        value={r.date}
        onChange={(event) => event.target.value && r.setDate(event.target.value)}
        hint={formatBusinessDateLong(r.date)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Tasa BCV"
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          hint="Oficial del día."
          readOnly={r.isLoadingDay}
          error={errors.bcv?.message}
          {...r.form.register("bcv")}
        />
        <TextField
          label="Tasa de Coche"
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          hint="La que cobran los puestos."
          readOnly={r.isLoadingDay}
          error={errors.market?.message}
          {...r.form.register("market")}
        />
        <TextField
          label="Tasa de venta"
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          hint="Opcional, para la lista de precios."
          readOnly={r.isLoadingDay}
          error={errors.sale?.message}
          {...r.form.register("sale")}
        />
      </div>
      <Button
        type="submit"
        className="w-full sm:w-auto"
        isLoading={r.isSaving}
        loadingText="Guardando…"
      >
        Guardar tasas
      </Button>
    </form>
  );
}
