"use client";

import {
  payableTermsInputSchema,
  type PayableDetail,
  type PayableTerms,
  type PayableTermsInput,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useForm, type UseFormReturn } from "react-hook-form";

import { useSetPayableTerms } from "@/features/payables/api/use-payables";
import { useFormError } from "@/hooks/use-form-error";
import { useZodResolver } from "@/i18n/use-zod-resolver";

export type UseTermsFormResult = {
  form: UseFormReturn<PayableTermsInput, unknown, PayableTerms>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

/** Due date and note of an invoice (also one created from a Coche trip, which has none). */
export function useTermsForm(payable: PayableDetail, onDone: () => void): UseTermsFormResult {
  const t = useTranslations("payables.terms");
  const save = useSetPayableTerms(payable.id);
  const form = useForm<PayableTermsInput, unknown, PayableTerms>({
    resolver: useZodResolver(payableTermsInputSchema),
    defaultValues: { dueOn: payable.dueOn ?? "", note: payable.note ?? "" },
  });
  const showError = useFormError(form, t("failed"));
  const onSubmit = form.handleSubmit(async (terms) => {
    try {
      await save.run(terms);
      onDone();
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: save.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
