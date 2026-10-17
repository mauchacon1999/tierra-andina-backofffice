"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { openTripSchema, type DailyRates, type OpenTrip } from "@ta/validators";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useDailyRates } from "@/features/exchange-rates/api/use-daily-rates";
import { useOpenTrip } from "@/features/purchases/api/use-trip-mutations";
import { isApiError } from "@/lib/api";
import { todayBusinessDate } from "@/utils/format-date";

export type UseOpenTripFormResult = {
  form: UseFormReturn<OpenTrip>;
  businessDate: string;
  /** The selected day's rates, to show what the trip will use. */
  rates: DailyRates | undefined;
  isLoadingRates: boolean;
  /** Rates the trip needs that are not set for the day ("BCV", "Coche"). */
  missingRates: string[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

const RATE_LABELS = { bcv: "BCV", market: "Coche" } as const;

/**
 * "Abrir jornada": a business day (today by default) and an optional note. The trip copies the
 * day's BCV and Coche rates, so it can only be opened once both are set in "Tasas del día".
 */
export function useOpenTripForm(initialDate?: string): UseOpenTripFormResult {
  const router = useRouter();
  const form = useForm<OpenTrip>({
    resolver: zodResolver(openTripSchema),
    defaultValues: { businessDate: initialDate ?? todayBusinessDate(), note: "" },
  });
  const businessDate = useWatch({ control: form.control, name: "businessDate" });
  const { rates, isLoading } = useDailyRates(businessDate);
  const openTrip = useOpenTrip();

  const missingRates = rates
    ? (["bcv", "market"] as const).filter((kind) => rates[kind] === null).map((k) => RATE_LABELS[k])
    : [];

  const onSubmit = form.handleSubmit(async (payload) => {
    try {
      const trip = await openTrip.run(payload);
      router.push(`/purchases/${trip.id}`);
    } catch (error) {
      form.setError("root", {
        message: isApiError(error) ? error.message : "No se pudo abrir la jornada",
      });
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
