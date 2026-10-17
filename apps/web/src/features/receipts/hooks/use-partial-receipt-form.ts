"use client";

import { normalizeDecimal } from "@ta/core";
import {
  partialReceiptFormSchema,
  type PartialReceiptFormValues,
  type ReceiptLine,
  type SetReceipt,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useForm, type UseFormReturn } from "react-hook-form";

import { useMarkReceipt } from "@/features/receipts/api/use-receipts";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { isApiError } from "@/lib/api";

export type UsePartialReceiptFormResult = {
  form: UseFormReturn<PartialReceiptFormValues, unknown, SetReceipt>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

const FIELDS = ["receivedPacks", "receivedQuantity", "note"] as const;

/** "Incompleto": packs that arrived, optional weight and a note; prefilled when correcting. */
export function usePartialReceiptForm(
  tripId: string,
  line: ReceiptLine,
  onDone: () => void,
): UsePartialReceiptFormResult {
  const t = useTranslations("receipts");
  const errorMessage = useErrorMessage();
  const markReceipt = useMarkReceipt();
  const isPartial = line.receiptStatus === "partial";
  const form = useForm<PartialReceiptFormValues, unknown, SetReceipt>({
    resolver: useZodResolver(partialReceiptFormSchema),
    defaultValues: {
      receivedPacks: isPartial && line.receivedPacks ? normalizeDecimal(line.receivedPacks) : "",
      receivedQuantity:
        isPartial && line.receivedQuantity ? normalizeDecimal(line.receivedQuantity) : "",
      note: line.receiptNote ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (receipt) => {
    try {
      await markReceipt.run({ tripId, lineId: line.id, receipt });
      onDone();
    } catch (error) {
      // The API checks the ranges against the line (fewer than bought, at most the gross).
      const fieldErrors = isApiError(error)
        ? (error.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
        : undefined;
      const field = FIELDS.find((name) => fieldErrors?.[name]?.[0]);
      if (field)
        form.setError(field, { message: fieldErrors?.[field]?.[0] }, { shouldFocus: true });
      else form.setError("root", { message: errorMessage(error, t("markFailed")) });
    }
  });

  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: markReceipt.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
