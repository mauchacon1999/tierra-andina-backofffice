"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { usePopover } from "@/hooks/use-popover";
import { cn } from "@/utils/cn";
import {
  businessDateToLocalDate,
  formatBusinessDateLong,
  localDateToBusinessDate,
  todayBusinessDate,
} from "@/utils/format-date";

export type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD", or "" when no day is chosen. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Help text under the field. Hidden while there is an error. */
  hint?: string | undefined;
  /** Validation message (Spanish). Turns the field red and is read by screen readers. */
  error?: string | undefined;
  /** Required fields have no "Borrar". */
  required?: boolean;
  disabled?: boolean;
  /** First and last day that can be chosen ("YYYY-MM-DD"). */
  min?: string | undefined;
  max?: string | undefined;
  name?: string;
  /** Callback ref to the trigger button (React Hook Form's `field.ref` focuses it on an error). */
  ref?: (node: HTMLButtonElement | null) => void;
};

const PANEL = { width: 320, height: 400 };

/**
 * Date field with a calendar in a popover (docs/design-system.md §5): shows the day in words
 * ("lunes 19/10/2026"), opens a month calendar in Spanish, with "Hoy" and, when optional, "Borrar".
 * Values are business days ("YYYY-MM-DD"), like the native date input it replaces.
 */
export function DateField({
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  required,
  disabled,
  min,
  max,
  name,
  ref,
}: DateFieldProps): React.JSX.Element {
  const t = useTranslations("dateField");
  const id = useId();
  const { isOpen, close, toggle, setTrigger, setPanel, panelStyle } = usePopover(PANEL);
  const message = error ?? hint;
  const today = todayBusinessDate();
  const isTodayAllowed = (!min || today >= min) && (!max || today <= max);
  const selected = value ? businessDateToLocalDate(value) : undefined;
  const choose = (next: string): void => {
    onChange(next);
    close();
  };

  const panel = (
    <div
      ref={setPanel}
      role="dialog"
      aria-label={label}
      style={panelStyle}
      className="rounded-2xl border border-border bg-surface p-3 shadow-lg"
    >
      <Calendar
        mode="single"
        autoFocus
        selected={selected}
        defaultMonth={selected ?? businessDateToLocalDate(today)}
        startMonth={businessDateToLocalDate(min ?? "2020-01-01")}
        endMonth={businessDateToLocalDate(max ?? `${Number(today.slice(0, 4)) + 5}-12-31`)}
        disabled={[
          ...(min ? [{ before: businessDateToLocalDate(min) }] : []),
          ...(max ? [{ after: businessDateToLocalDate(max) }] : []),
        ]}
        onSelect={(day) => day && choose(localDateToBusinessDate(day))}
      />
      <div className="mt-2 flex justify-between gap-2 border-t border-border pt-2">
        <Button variant="ghost" size="sm" disabled={!isTodayAllowed} onClick={() => choose(today)}>
          {t("today")}
        </Button>
        {!required && value && (
          <Button variant="ghost" size="sm" onClick={() => choose("")}>
            {t("clear")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger-text">
            *
          </span>
        )}
      </label>
      <button
        id={id}
        ref={(node) => {
          setTrigger(node);
          ref?.(node);
        }}
        type="button"
        name={name}
        disabled={disabled}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={message ? `${id}-message` : undefined}
        onClick={toggle}
        onBlur={onBlur}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-base",
          "focus:ring-2 focus:outline-none",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
          error
            ? "border-danger-border focus:ring-danger-border"
            : "border-border-strong focus:ring-focus",
        )}
      >
        <span
          id={`${id}-value`}
          className={cn(
            "block truncate",
            value ? "text-foreground first-letter:uppercase" : "text-muted",
          )}
        >
          {value ? formatBusinessDateLong(value) : t("placeholder")}
        </span>
        <CalendarDays aria-hidden className="size-5 shrink-0 text-muted" />
      </button>
      {message && (
        <p
          id={`${id}-message`}
          className={cn("text-sm", error ? "text-danger-text" : "text-muted")}
        >
          {message}
        </p>
      )}
      {isOpen && createPortal(panel, document.body)}
    </div>
  );
}
