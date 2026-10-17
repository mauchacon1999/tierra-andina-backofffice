"use client";

import type { PriceList, PriceProposal } from "@ta/validators";
import { useSWRConfig } from "swr";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import {
  getPriceProposal,
  publishPriceProposal,
} from "@/features/price-lists/api/price-proposal-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UsePriceProposalResult = {
  proposal: PriceProposal | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  isEmpty: boolean;
  retry: () => void;
};

/** Owner-only. Other roles pass `enabled: false` and never call the endpoint. */
export function usePriceProposal(enabled: boolean): UsePriceProposalResult {
  const { data, error, isLoading, mutate } = useSWR<PriceProposal, ApiError>(
    enabled ? queryKeys.priceLists.proposal : null,
    getPriceProposal,
  );
  const isEmpty = error?.code === "PRICE_LIST_NOT_FOUND";
  return {
    proposal: data,
    isLoading: enabled && isLoading,
    error: isEmpty ? undefined : error,
    isEmpty,
    retry: () => void mutate(),
  };
}

/** Publishes the proposal and refreshes the list in force and the home alerts. */
export function usePublishPriceProposal(): {
  run: () => Promise<PriceList | undefined>;
  isRunning: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<PriceList, ApiError, readonly string[]>(
    ["price-lists", "mutation", "proposal"],
    () => publishPriceProposal(),
  );
  return {
    run: async () => {
      const list = await trigger();
      await mutate(queryKeys.priceLists.current);
      await mutate(queryKeys.priceLists.proposal);
      await mutate(queryKeys.home);
      return list;
    },
    isRunning: isMutating,
  };
}
