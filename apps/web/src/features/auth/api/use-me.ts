"use client";

import type { MeResponse } from "@ta/validators";
import useSWR from "swr";

import { getMe } from "@/features/auth/api/auth-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseMeResult = {
  me: MeResponse | undefined;
  isLoading: boolean;
  /** True once the API answered 401: there is no valid session. */
  isUnauthenticated: boolean;
  error: ApiError | undefined;
};

/** The signed-in user and their stores (GET /api/v1/me), shared by every screen via SWR. */
export function useMe(): UseMeResult {
  const { data, error, isLoading, isValidating } = useSWR<MeResponse, ApiError>(
    queryKeys.me,
    getMe,
  );
  return {
    me: data,
    isLoading,
    // Only a settled 401: a cached one being revalidated may be stale (e.g. just signed in).
    isUnauthenticated: error?.status === 401 && !isValidating && !data,
    error,
  };
}
