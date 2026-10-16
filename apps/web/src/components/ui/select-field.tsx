import { useId, type Ref, type SelectHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  /** First, empty option ("Elige una categoría"). */
  placeholder?: string;
  hint?: string | undefined;
  error?: string | undefined;
  ref?: Ref<HTMLSelectElement>;
};

/** Labelled native select (best on phones) with hint and error, like `TextField`. */
export function SelectField({
  label,
  options,
  placeholder,
  hint,
  error,
  required,
  className,
  ref,
  ...props
}: SelectFieldProps): React.JSX.Element {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger-text">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        ref={ref}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "block min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-base text-foreground",
          "focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70",
          error
            ? "border-danger-border focus:ring-danger-border"
            : "border-border-strong focus:ring-focus",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger-text" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
