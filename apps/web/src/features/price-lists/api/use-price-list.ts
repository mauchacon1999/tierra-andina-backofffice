"use client";

import type { PriceList } from "@ta/validators";
import useSWR from "swr";

import { getCurrentPriceList } from "@/features/price-lists/api/price-list-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UsePriceListResult = {
  list: PriceList | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  /** True when the shop has never published a list. */
  isEmpty: boolean;
  retry: () => void;
};

/** The price list the shop sells with. */
export function usePriceList(): UsePriceListResult {
  const { data, error, isLoading, mutate } = useSWR<PriceList, ApiError>(
    queryKeys.priceLists.current,
    getCurrentPriceList,
  );
  const isEmpty = error?.code === "PRICE_LIST_NOT_FOUND";
  return {
    list: data,
    isLoading,
    error: isEmpty ? undefined : error,
    isEmpty,
    retry: () => void mutate(),
  };
}
