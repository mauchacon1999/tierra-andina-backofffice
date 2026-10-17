"use client";

import { DEFAULT_STORE_SETTINGS, storeSettingsSchema, type StoreSettings } from "@ta/validators";
import useSWR from "swr";

import { api, type ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function getSettings(): Promise<StoreSettings> {
  return api.get("/api/v1/settings", { schema: storeSettingsSchema });
}

export type UseSettingsResult = {
  /** The store's settings; the defaults until they load (so screens can render right away). */
  settings: StoreSettings;
  isLoaded: boolean;
  error: ApiError | undefined;
};

/** Store settings (rounding steps, default margin…). Rarely change: no focus revalidation. */
export function useSettings(): UseSettingsResult {
  const { data, error } = useSWR<StoreSettings, ApiError>(queryKeys.settings, getSettings, {
    revalidateOnFocus: false,
  });
  return { settings: data ?? DEFAULT_STORE_SETTINGS, isLoaded: data !== undefined, error };
}
