"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { getDbHealth, getHealth } from "@/features/system-status/api/health";
import type { CheckState } from "@/features/system-status/types";
import { ApiError } from "@/lib/api";

export const DEFAULT_POLL_MS = 5000;

export type UseSystemStatusOptions = {
  pollMs?: number;
};

export type SystemStatus = {
  api: CheckState;
  db: CheckState;
  /** When the last check finished; null until the first one does. */
  checkedAt: Date | null;
  refresh: () => void;
};

async function runCheck<T>(fn: () => Promise<T>, describe: (r: T) => string): Promise<CheckState> {
  const start = performance.now();
  const latency = (): number => Math.round(performance.now() - start);
  try {
    const result = await fn();
    return { status: "ok", detail: describe(result), latencyMs: latency() };
  } catch (error) {
    // Anything that is not an ApiError is still shown as a failed check, never thrown.
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({ status: 0, code: "UNKNOWN", message: String(error) });
    return { status: "error", error: apiError, latencyMs: latency() };
  }
}

/**
 * Polls GET /health and GET /health/db every `pollMs` ms (and on `refresh()`).
 * Never throws: failures become `{ status: "error" }` states so the page keeps working.
 */
export function useSystemStatus({
  pollMs = DEFAULT_POLL_MS,
}: UseSystemStatusOptions = {}): SystemStatus {
  const [api, setApi] = useState<CheckState>({ status: "loading" });
  const [db, setDb] = useState<CheckState>({ status: "loading" });
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const t = useTranslations("systemStatus");

  const check = useCallback(async () => {
    const [apiState, dbState] = await Promise.all([
      runCheck(getHealth, (r) => t("apiDetail", { version: r.version })),
      runCheck(getDbHealth, () => t("dbDetail")),
    ]);
    setApi(apiState);
    setDb(dbState);
    setCheckedAt(new Date());
  }, [t]);

  useEffect(() => {
    // The first check is scheduled (not run synchronously) to avoid cascading renders in the effect.
    const first = setTimeout(() => void check(), 0);
    const interval = setInterval(() => void check(), pollMs);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [check, pollMs]);

  const refresh = useCallback(() => void check(), [check]);

  return { api, db, checkedAt, refresh };
}
