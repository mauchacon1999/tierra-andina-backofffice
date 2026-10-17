"use client";

import type { DailyClose } from "@ta/validators";
import { useState } from "react";

import { useDailyClose } from "@/features/daily-closes/api/use-daily-closes";
import type { ApiError } from "@/lib/api";
import { todayBusinessDate } from "@/utils/format-date";

export type UseDailyCloseScreenResult = {
  date: string;
  setDate: (date: string) => void;
  close: DailyClose | undefined;
  /** No close for the day yet: show the form. */
  isMissing: boolean;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
  /** The close of this day was sent just now (to say so instead of "ya fue enviado"). */
  justSent: boolean;
  onSent: (close: DailyClose) => void;
};

/** Today by default; another day can be picked (a close sent the next morning). */
export function useDailyCloseScreen(initialDate?: string): UseDailyCloseScreenResult {
  const [date, setDate] = useState(initialDate ?? todayBusinessDate());
  const [sentDate, setSentDate] = useState<string | null>(null);
  const day = useDailyClose(date);

  return {
    date,
    setDate,
    close: day.close,
    isMissing: day.isMissing,
    isLoading: day.isLoading,
    error: day.error,
    retry: day.retry,
    justSent: sentDate === date,
    onSent: (close) => setSentDate(close.businessDate),
  };
}
