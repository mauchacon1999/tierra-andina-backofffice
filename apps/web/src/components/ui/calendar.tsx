"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { DayPicker, type ChevronProps, type DayPickerProps } from "react-day-picker";
import { es } from "react-day-picker/locale";

import { cn } from "@/utils/cn";

export type CalendarProps = DayPickerProps;

const CHEVRONS = { left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown };

function CalendarChevron({ orientation = "left", className }: ChevronProps): React.JSX.Element {
  const Icon = CHEVRONS[orientation];
  return <Icon aria-hidden className={cn("size-4", className)} />;
}

const NAV_BUTTON = cn(
  "absolute top-0 inline-flex size-9 items-center justify-center rounded-lg text-foreground",
  "hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
  "disabled:pointer-events-none disabled:opacity-40",
);

/**
 * Month calendar (react-day-picker) in Spanish, weeks from Monday, styled with the design
 * tokens only (the library's CSS is not loaded). Month and year are native selects laid over
 * the caption, so phones show their own wheel.
 */
export function Calendar({ classNames, ...props }: CalendarProps): React.JSX.Element {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays
      captionLayout="dropdown"
      navLayout="around"
      components={{ Chevron: CalendarChevron }}
      classNames={{
        root: "text-sm text-foreground",
        months: "relative",
        month: "relative space-y-2",
        month_caption: "mx-10 flex h-9 items-center justify-center",
        caption_label:
          "inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold capitalize",
        dropdowns: "flex items-center gap-1",
        dropdown_root: cn(
          "relative inline-flex items-center rounded-md hover:bg-surface-muted",
          "has-focus-visible:ring-2 has-focus-visible:ring-focus",
        ),
        dropdown: "absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0",
        button_previous: cn(NAV_BUTTON, "left-0"),
        button_next: cn(NAV_BUTTON, "right-0"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "flex-1 pb-1 text-center text-xs font-medium text-muted capitalize",
        week: "mt-1 flex",
        day: "flex flex-1 items-center justify-center p-0",
        day_button: cn(
          "inline-flex size-10 items-center justify-center rounded-full tabular-nums",
          "hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        ),
        today: "font-bold text-primary-text",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary-hover",
        outside: "text-muted opacity-60",
        disabled: "pointer-events-none opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
