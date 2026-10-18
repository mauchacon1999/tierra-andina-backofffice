"use client";

import { openTripSchema, type DailyRates, type OpenTrip, type OpenTripInput } from "@ta/validators";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useDailyRates } from "@/features/exchange-rates/api/use-daily-rates";
import { useOpenTrip } from "@/features/purchases/api/use-trip-mutations";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { todayBusinessDate } from "@/utils/format-date";

export type UseOpenTripFormResult = {
  form: UseFormReturn<OpenTripInput, unknown, OpenTrip>;
  businessDate: string;
  /** The selected day's rates, to show what the trip will use. */
  rates: DailyRates | undefined;
  isLoadingRates: boolean;
  /** Rates the trip needs that are not set for the day. */
  missingRates: ("bcv" | "market")[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

/**
 * "Abrir jornada": a business day (today by default) and an optional note. The trip copies the
 * day's BCV and Coche rates, so it can only be opened once both are set in "Tasas del día".
 */
export function useOpenTripForm(initialDate?: string): UseOpenTripFormResult {
  const router = useRouter();
  const t = useTranslations("purchases.openTrip");
  const errorMessage = useErrorMessage();
  const form = useForm<OpenTripInput, unknown, OpenTrip>({
    resolver: useZodResolver(openTripSchema),
    defaultValues: { businessDate: initialDate ?? todayBusinessDate(), note: "" },
  });
  const businessDate = useWatch({ control: form.control, name: "businessDate" });
  const { rates, isLoading } = useDailyRates(businessDate);
  const openTrip = useOpenTrip();

  const missingRates = rates
    ? (["bcv", "market"] as const).filter((kind) => rates[kind] === null)
    : [];

  const onSubmit = form.handleSubmit(async (payload) => {
    try {
      const trip = await openTrip.run(payload);
      router.push(`/purchases/${trip.id}`);
    } catch (error) {
      form.setError("root", { message: errorMessage(error, t("failed")) });
    }
  });

  return {
    form,
    businessDate,
    rates,
    isLoadingRates: isLoading,
    missingRates,
    onSubmit: () => onSubmit(),
    isSubmitting: openTrip.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
