import { useId, type InputHTMLAttributes, type Ref } from "react";

import { cn } from "@/utils/cn";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Help text under the input (format, unit…). Hidden while there is an error. */
  hint?: string | undefined;
  /** Validation message (Spanish). Turns the field red and is read by screen readers. */
  error?: string | undefined;
  /** Text after the value inside the field, e.g. "kg", "$", "Bs". */
  suffix?: string | undefined;
  /** Label only for screen readers (a field inside a table row, named by its row). */
  hideLabel?: boolean;
  ref?: Ref<HTMLInputElement>;
};

/** Labelled input with hint, error and optional unit suffix (docs/design-system.md §5). */
export function TextField({
  label,
  hint,
  error,
  suffix,
  hideLabel = false,
  required,
  className,
  ref,
  ...props
}: TextFieldProps): React.JSX.Element {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={cn("block text-sm font-medium text-foreground", hideLabel && "sr-only")}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger-text">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "block min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-base text-foreground",
            "placeholder:text-muted focus:ring-2 focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
            error
              ? "border-danger-border focus:ring-danger-border"
              : "border-border-strong focus:ring-focus",
            suffix && "pr-12",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger-text" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
