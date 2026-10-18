"use client";

import type { PayableDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
      <TextField
        label={t("dueOn")}
        type="date"
        required
        error={errors.dueOn?.message}
        {...f.form.register("dueOn")}
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
