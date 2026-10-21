"use client";

import type { ManualPriceList, ManualPriceRow, SetManualPriceInput } from "@ta/validators";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  getManualPrices,
  saveManualPrice,
  saveShareOnWhatsapp,
} from "@/features/price-lists/api/manual-price-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// Stable empty list while loading (TanStack Table v9 wants stable inputs).
const NO_ROWS: ManualPriceRow[] = [];

export type UseManualPricesResult = {
  rows: ManualPriceRow[];
  /** Turns typed bolívares into dollars; null when prices cannot be saved yet. */
  saleRate: string | null;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** "Precio manual": the active products with cost, kilos and price in force. */
export function useManualPrices(): UseManualPricesResult {
  const { data, error, isLoading, mutate } = useSWR<ManualPriceList, ApiError>(
    queryKeys.priceLists.manual,
    getManualPrices,
  );
  return {
    rows: data?.data ?? NO_ROWS,
    saleRate: data?.saleRate ?? null,
    isLoading,
    error,
    retry: () => void mutate(),
  };
}

function replaceRow(
  list: ManualPriceList | undefined,
  row: ManualPriceRow,
): ManualPriceList | undefined {
  if (!list) return list;
  return {
    ...list,
    data: list.data.map((current) => (current.productId === row.productId ? row : current)),
  };
}

export type UseSaveManualPriceResult = {
  run: (input: SetManualPriceInput) => Promise<ManualPriceRow>;
  isRunning: boolean;
};

/** Saves one price; its row is updated in place and the published list is reloaded. */
export function useSaveManualPrice(productId: string): UseSaveManualPriceResult {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<
    ManualPriceRow,
    ApiError,
    readonly string[],
    SetManualPriceInput
  >(["price-lists", "mutation", "manual", productId], (_key, { arg }) =>
    saveManualPrice(productId, arg),
  );
  return {
    run: async (input) => {
      const row = await trigger(input);
      await mutate<ManualPriceList>(queryKeys.priceLists.manual, (list) => replaceRow(list, row), {
        revalidate: false,
      });
      await Promise.all([
        mutate(queryKeys.priceLists.current),
        mutate(queryKeys.priceLists.proposal),
      ]);
      return row;
    },
    isRunning: isMutating,
  };
}

/** Turns a product on or off for the WhatsApp list; the switch moves at once. */
export function useShareOnWhatsapp(): (row: ManualPriceRow, value: boolean) => Promise<void> {
  const { mutate } = useSWRConfig();
  // Stable: the table's columns are memoized on it.
  return useCallback(
    async (row, value) => {
      const changed = { ...row, shareOnWhatsapp: value };
      await mutate<ManualPriceList>(
        queryKeys.priceLists.manual,
        async (list) => {
          await saveShareOnWhatsapp(row.productId, value);
          return replaceRow(list, changed);
        },
        {
          optimisticData: (list) => replaceRow(list, changed) ?? { saleRate: null, data: [] },
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [mutate],
  );
}
