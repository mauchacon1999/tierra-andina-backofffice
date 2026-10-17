"use client";

import type { DailyClose } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useApproveDailyClose, useDailyClose } from "@/features/daily-closes/api/use-daily-closes";
import { useErrorMessage } from "@/i18n/use-error-message";
import type { ApiError } from "@/lib/api";

export type UseCloseDetailResult = {
  close: DailyClose | undefined;
  isMissing: boolean;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
  isFixing: boolean;
  startFix: () => void;
  stopFix: () => void;
  /** The correction was just saved. */
  isFixed: boolean;
  onFixed: () => void;
  approve: () => Promise<void>;
  isApproving: boolean;
  actionError: string | null;
};

/** The owner's view of one close: correct it (the same form) or approve it. */
export function useCloseDetail(date: string): UseCloseDetailResult {
  const t = useTranslations("closes");
  const errorMessage = useErrorMessage();
  const day = useDailyClose(date);
  const approve = useApproveDailyClose(day.close?.id ?? "");
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  return {
    ...day,
    isFixing,
    startFix: () => {
      setIsFixed(false);
      setIsFixing(true);
    },
    stopFix: () => setIsFixing(false),
    isFixed,
    onFixed: () => {
      setIsFixing(false);
      setIsFixed(true);
    },
    approve: async () => {
      setActionError(null);
      try {
        await approve.run();
      } catch (error) {
        setActionError(errorMessage(error, t("approveFailed")));
      }
    },
    isApproving: approve.isRunning,
    actionError,
  };
}
