import { monthContaining, previousMonth, previousWeek, weekContaining } from "@ta/core";

export const CLOSE_PRESETS = ["lastWeek", "thisWeek", "thisMonth", "lastMonth"] as const;

export type ClosePreset = (typeof CLOSE_PRESETS)[number];

/** The from/to a chip applies, for a business day "today". */
export function closePresetRange(preset: ClosePreset, today: string): { from: string; to: string } {
  switch (preset) {
    case "lastWeek":
      return previousWeek(today);
    case "thisWeek":
      return weekContaining(today);
    case "thisMonth":
      return monthContaining(today);
    case "lastMonth":
      return previousMonth(today);
  }
}

/** Which chip matches the dates on screen, if any. */
export function matchingClosePreset(from: string, to: string, today: string): ClosePreset | null {
  return (
    CLOSE_PRESETS.find((preset) => {
      const range = closePresetRange(preset, today);
      return range.from === from && range.to === to;
    }) ?? null
  );
}
