"use client";

import type { DailyClose } from "@ta/validators";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  useApproveDailyClose,
  useDailyClose,
  useDeleteDailyClose,
} from "@/features/daily-closes/api/use-daily-closes";
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
  remove: () => Promise<void>;
  isDeleting: boolean;
  actionError: string | null;
};

/** The owner's view of one close: correct it (the same form) or approve it. */
export function useCloseDetail(date: string): UseCloseDetailResult {
  const t = useTranslations("closes");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const day = useDailyClose(date);
  const approve = useApproveDailyClose(day.close?.id ?? "");
  const remove = useDeleteDailyClose();
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
    remove: async () => {
      if (!day.close) return;
      setActionError(null);
      try {
        await remove.run(day.close);
        router.push("/closes");
      } catch (error) {
        setActionError(errorMessage(error, t("deleteFailed")));
      }
    },
    isDeleting: remove.isRunning,
    actionError,
  };
}
