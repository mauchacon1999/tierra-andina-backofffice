"use client";

import { monthContaining } from "@ta/core";
import { useState } from "react";

import {
  closePresetRange,
  matchingClosePreset,
  type ClosePreset,
} from "@/features/daily-closes/helpers/close-range";
import { todayBusinessDate } from "@/utils/format-date";

export type UseClosesRangeResult = {
  from: string;
  to: string;
  preset: ClosePreset | null;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  applyPreset: (preset: ClosePreset) => void;
};

/** Starts on this month. Chips and the date fields edit the same from/to. */
export function useClosesRange(): UseClosesRangeResult {
  const today = todayBusinessDate();
  const [from, setFrom] = useState(() => monthContaining(today).from);
  const [to, setTo] = useState(() => monthContaining(today).to);

  return {
    from,
    to,
    preset: matchingClosePreset(from, to, today),
    setFrom,
    setTo,
    applyPreset: (preset) => {
      const range = closePresetRange(preset, today);
      setFrom(range.from);
      setTo(range.to);
    },
  };
}
