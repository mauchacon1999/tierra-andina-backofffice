"use client";

import type { DailyRates, OfficialBcvRateResponse, SetDailyRates } from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  getDailyRates,
  getOfficialBcvRate,
  listDailyRates,
  setDailyRates,
} from "@/features/exchange-rates/api/exchange-rates-requests";
import type { ApiError } from "@/lib/api";
import { isExchangeRatesKey, queryKeys } from "@/lib/query-keys";

export type UseDailyRatesResult = {
  rates: DailyRates | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
};

export type UseOfficialBcvRateResult = {
  rate: OfficialBcvRateResponse | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** The official BCV USD rate, consulted live. It does not read or write the stored day. */
export function useOfficialBcvRate(): UseOfficialBcvRateResult {
  const { data, error, isLoading, mutate } = useSWR<OfficialBcvRateResponse, ApiError>(
    queryKeys.exchangeRates.official,
    getOfficialBcvRate,
  );
  return { rate: data, isLoading, error, retry: () => void mutate() };
}

/** The BCV, Coche and sale rates of one business day (nulls when not set). */
export function useDailyRates(date: string): UseDailyRatesResult {
  const { data, error, isLoading } = useSWR<DailyRates, ApiError>(
    date ? queryKeys.exchangeRates.day(date) : null,
    () => getDailyRates(date),
  );
  return { rates: data, isLoading, error };
}

export type UseRatesHistoryResult = {
  days: DailyRates[];
  isLoading: boolean;
  error: ApiError | undefined;
};

// Stable empty list: tables rebuild their rows when the array changes.
const NO_DAYS: DailyRates[] = [];

/** Days with rates between two dates, newest first. */
export function useRatesHistory(from: string, to: string): UseRatesHistoryResult {
  const { data, error, isLoading } = useSWR<DailyRates[], ApiError>(
    queryKeys.exchangeRates.range(from, to),
    () => listDailyRates(from, to),
  );
  return { days: data ?? NO_DAYS, isLoading, error };
}

export type UseSetDailyRatesResult = {
  save: (date: string, rates: SetDailyRates) => Promise<DailyRates>;
  isSaving: boolean;
};

/** Saves a day's rates and refreshes every rates screen. */
export function useSetDailyRates(): UseSetDailyRatesResult {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<
    DailyRates,
    ApiError,
    readonly string[],
    { date: string; rates: SetDailyRates }
  >(["exchange-rates", "mutation", "set"], (_key, { arg }) => setDailyRates(arg.date, arg.rates));
  return {
    save: async (date, rates) => {
      const saved = await trigger({ date, rates });
      await mutate(isExchangeRatesKey);
      return saved;
    },
    isSaving: isMutating,
  };
}
