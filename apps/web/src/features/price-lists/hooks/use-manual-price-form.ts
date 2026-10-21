"use client";

import { compareDecimals, normalizeDecimal } from "@ta/core";
import {
  setManualPriceSchema,
  type ManualPriceRow,
  type SetManualPrice,
  type SetManualPriceInput,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useSaveManualPrice } from "@/features/price-lists/api/use-manual-prices";
import { useFormError } from "@/hooks/use-form-error";
import { useZodResolver } from "@/i18n/use-zod-resolver";

export type UseManualPriceFormResult = {
  form: UseFormReturn<SetManualPriceInput, unknown, SetManualPrice>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  /** Something typed that differs from the saved price. */
  canSave: boolean;
  /** Just saved (until the price is typed again). */
  isSaved: boolean;
  formError: string | undefined;
};

const savedValue = (row: ManualPriceRow): string =>
  row.priceBs === null ? "" : normalizeDecimal(row.priceBs);

/** "450.00" is the saved "450"; text that is not a number yet is a change. */
function isSameAmount(typed: string, saved: string): boolean {
  if (saved === "") return false;
  try {
    return compareDecimals(typed, saved) === 0;
  } catch {
    return false;
  }
}

/**
 * One product's shelf price in bolívares on "Precio manual": filled with the price in force,
 * saved on its own row.
 */
export function useManualPriceForm(
  row: ManualPriceRow,
  saleRate: string | null,
): UseManualPriceFormResult {
  const t = useTranslations("manualPrices");
  const save = useSaveManualPrice(row.productId);
  const form = useForm<SetManualPriceInput, unknown, SetManualPrice>({
    resolver: useZodResolver(setManualPriceSchema),
    defaultValues: { priceBs: savedValue(row) },
  });
  const showError = useFormError(form, t("saveFailed"));
  const [isSaved, setIsSaved] = useState(false);
  const priceBs = useWatch({ control: form.control, name: "priceBs" }) ?? "";
  const saved = savedValue(row);

  // A price saved elsewhere (another tab, a closed trip) replaces an untouched field.
  useEffect(() => {
    if (!form.formState.isDirty) form.reset({ priceBs: saved });
  }, [saved, form]);

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      const after = await save.run(input);
      form.reset({ priceBs: savedValue(after) });
      setIsSaved(true);
    } catch (error) {
      showError(error);
    }
  });

  const isChanged = priceBs.trim() !== "" && !isSameAmount(priceBs, saved);
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: save.isRunning || form.formState.isSubmitting,
    canSave: saleRate !== null && isChanged,
    isSaved: isSaved && !isChanged,
    formError: form.formState.errors.root?.message,
  };
}
