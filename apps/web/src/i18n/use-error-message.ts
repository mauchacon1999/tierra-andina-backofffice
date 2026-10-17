"use client";

import { useTranslations } from "next-intl";

import { isApiError } from "@/lib/api";

/**
 * Text for a failed request: the client's own codes (NETWORK_ERROR, TIMEOUT…) from the
 * `apiErrors` messages, the API's message (already in Spanish) otherwise, and `fallback` for
 * anything that is not an ApiError.
 */
export function useErrorMessage(): (error: unknown, fallback: string) => string {
  const t = useTranslations("apiErrors");
  return (error, fallback) => {
    if (!isApiError(error)) return fallback;
    return t.has(error.code as "NETWORK_ERROR") ? t(error.code as "NETWORK_ERROR") : error.message;
  };
}
