"use client";

import type { HomeBriefing } from "@ta/validators";
import useSWR from "swr";

import { getHomeBriefing } from "@/features/home/api/home-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseHomeBriefingResult = {
  briefing: HomeBriefing | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** Owner-only. Other roles pass `enabled: false` and never call the endpoint. */
export function useHomeBriefing(enabled: boolean): UseHomeBriefingResult {
  const { data, error, isLoading, mutate } = useSWR<HomeBriefing, ApiError>(
    enabled ? queryKeys.home : null,
    getHomeBriefing,
  );
  return {
    briefing: data,
    isLoading: enabled && isLoading,
    error,
    retry: () => void mutate(),
  };
}
