"use client";

import type { ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";

import { isApiError } from "@/lib/api";

const MAX_RETRIES = 3;

/**
 * Shared SWR behavior. Each hook passes its own request function from features/<f>/api, so
 * there is no global fetcher; errors are always `ApiError` (lib/api.ts).
 */
export const swrConfig: SWRConfiguration = {
  // Retry only what can recover by itself: network errors and 5xx, never 4xx (401, 403, 422…).
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    const isClientError = isApiError(error) && error.status >= 400 && error.status < 500;
    if (isClientError || retryCount >= MAX_RETRIES) return;
    setTimeout(() => void revalidate({ retryCount }), 2 ** retryCount * 1000);
  },
};

export type SwrProviderProps = {
  children: ReactNode;
};

export function SwrProvider({ children }: SwrProviderProps): React.JSX.Element {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
