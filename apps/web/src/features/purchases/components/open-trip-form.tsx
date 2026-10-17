"use client";

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
  const { errors } = f.form.formState;
  const hasMissing = f.missingRates.length > 0;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      <h2 className="font-semibold">Abrir jornada</h2>
      {f.formError && !hasMissing && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label="Fecha"
        type="date"
        error={errors.businessDate?.message}
        hint={f.businessDate ? formatBusinessDateLong(f.businessDate) : undefined}
        {...f.form.register("businessDate")}
      />
      {hasMissing ? (
        <Alert tone="warning" title={`Falta la tasa ${f.missingRates.join(" y la tasa ")}`}>
          <p>La jornada copia las tasas del día. Regístralas primero.</p>
          <ButtonLink href="/rates" variant="secondary" size="sm" className="mt-2">
            Ir a Tasas del día
          </ButtonLink>
        </Alert>
      ) : (
        f.rates && (
          <p className="text-sm text-muted">
            BCV {formatDecimal(f.rates.bcv ?? "0", 2)} Bs · Coche{" "}
            {formatDecimal(f.rates.market ?? "0", 2)} Bs
          </p>
        )
      )}
      <TextField
        label="Nota"
        autoComplete="off"
        hint="Opcional."
        error={errors.note?.message}
        {...f.form.register("note")}
      />
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={hasMissing || f.isLoadingRates}
        isLoading={f.isSubmitting}
        loadingText="Abriendo…"
      >
        Abrir jornada
      </Button>
    </form>
  );
}
