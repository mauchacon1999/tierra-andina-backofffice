"use client";

import { useTranslations } from "next-intl";

import { DateField } from "@/components/ui/date-field";
import { CLOSE_PRESETS, type ClosePreset } from "@/features/daily-closes/helpers/close-range";
import { cn } from "@/utils/cn";

export type ClosesFiltersProps = {
  from: string;
  to: string;
  preset: ClosePreset | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPreset: (preset: ClosePreset) => void;
};

/** Chips for the usual periods, plus two dates for any other range. */
export function ClosesFilters({
  from,
  to,
  preset,
  onFromChange,
  onToChange,
  onPreset,
}: ClosesFiltersProps): React.JSX.Element {
  const t = useTranslations("closes");
  const orderError = from !== "" && to !== "" && from > to ? t("rangeOrder") : undefined;

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t("presets")} className="flex flex-wrap gap-2">
        {CLOSE_PRESETS.map((id) => {
          const pressed = preset === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={pressed}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium",
                pressed
                  ? "border-chip-border bg-chip-soft text-chip-text"
                  : "border-border-strong bg-surface text-foreground",
              )}
              onClick={() => onPreset(id)}
            >
              {t(id)}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField label={t("from")} required value={from} onChange={onFromChange} />
        <DateField label={t("to")} required value={to} error={orderError} onChange={onToChange} />
      </div>
    </div>
  );
}
