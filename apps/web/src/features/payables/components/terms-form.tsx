"use client";

import type { PayableDetail } from "@ta/validators";
import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { TextField } from "@/components/ui/text-field";
import { useTermsForm } from "@/features/payables/hooks/use-terms-form";

export type TermsFormProps = { payable: PayableDetail; onDone: () => void };

/** "Cambiar vencimiento": due date and note. */
export function TermsForm({ payable, onDone }: TermsFormProps): React.JSX.Element {
  const f = useTermsForm(payable, onDone);
  const t = useTranslations("payables.terms");
  const { errors } = f.form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <Controller
        control={f.form.control}
        name="dueOn"
        render={({ field }) => (
          <DateField label={t("dueOn")} required error={errors.dueOn?.message} {...field} />
        )}
      />
      <TextField
        label={t("note")}
        autoComplete="off"
        error={errors.note?.message}
        {...f.form.register("note")}
      />
      <Button
        type="submit"
        className="w-full"
        isLoading={f.isSubmitting}
        loadingText={t("submitting")}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
