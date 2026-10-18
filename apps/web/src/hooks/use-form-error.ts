"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { useErrorMessage } from "@/i18n/use-error-message";
import { isApiError } from "@/lib/api";

/**
 * Shows a failed request on the form: the API's first `details.fieldErrors` entry on its field
 * when the form has it ("lines.1.expenseCategoryId" included), anything else at the top
 * (`root`) with the translated fallback.
 */
export function useFormError<Values extends FieldValues>(
  form: UseFormReturn<Values, unknown, unknown>,
  fallback: string,
): (error: unknown) => void {
  const errorMessage = useErrorMessage();
  return (error) => {
    const fieldErrors = isApiError(error)
      ? (error.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
      : undefined;
    const [field, messages] = Object.entries(fieldErrors ?? {})[0] ?? [];
    if (field && messages?.[0] && form.getValues(field as Path<Values>) !== undefined) {
      form.setError(field as Path<Values>, { message: messages[0] }, { shouldFocus: true });
      return;
    }
    form.setError("root", { message: errorMessage(error, fallback) });
  };
}
