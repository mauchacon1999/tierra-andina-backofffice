"use client";

import { normalizeDecimal } from "@ta/core";
import {
  dailyRatesFormSchema,
  type DailyRates,
  type DailyRatesFormValues,
  type SetDailyRates,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { useDailyRates, useSetDailyRates } from "@/features/exchange-rates/api/use-daily-rates";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { todayBusinessDate } from "@/utils/format-date";

export type UseDailyRatesFormResult = {
  date: string;
  setDate: (date: string) => void;
  form: UseFormReturn<DailyRatesFormValues, unknown, SetDailyRates>;
  isLoadingDay: boolean;
  onSubmit: () => Promise<void>;
  isSaving: boolean;
  formError: string | undefined;
  /** The save just finished and the values were not changed since. */
  isSaved: boolean;
};

const EMPTY: DailyRatesFormValues = { bcv: "", market: "", sale: "" };

function toFormValues(rates: DailyRates): DailyRatesFormValues {
  const text = (value: string | null) => (value === null ? "" : normalizeDecimal(value));
  return { bcv: text(rates.bcv), market: text(rates.market), sale: text(rates.sale) };
}

/**
 * "Tasas del día": pick a day (today in Caracas by default), see and edit its BCV, Coche and
 * sale rates. Empty fields are not sent, so an existing rate is never erased by mistake.
 */
export function useDailyRatesForm(initialDate?: string): UseDailyRatesFormResult {
  const [date, setDate] = useState(initialDate ?? todayBusinessDate());
  const t = useTranslations("rates");
  const errorMessage = useErrorMessage();
  const { rates, isLoading } = useDailyRates(date);
  const { save, isSaving } = useSetDailyRates();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const form = useForm<DailyRatesFormValues, unknown, SetDailyRates>({
    resolver: useZodResolver(dailyRatesFormSchema),
    defaultValues: EMPTY,
  });

  // Show the stored rates of the selected day.
  useEffect(() => {
    if (rates && rates.businessDate === date) form.reset(toFormValues(rates));
  }, [rates, date, form]);

  const onSubmit = form.handleSubmit(async (payload) => {
    try {
      const saved = await save(date, payload);
      form.reset(toFormValues(saved));
      setSavedAt(date);
    } catch (error) {
      form.setError("root", { message: errorMessage(error, t("saveFailed")) });
    }
  });

  return {
    date,
    setDate: (next) => {
      setDate(next);
      setSavedAt(null);
      form.reset(EMPTY);
    },
    form,
    isLoadingDay: isLoading,
    onSubmit: () => onSubmit(),
    isSaving: isSaving || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
    isSaved: savedAt === date && !form.formState.isDirty,
  };
}
