import { useId } from "react";

import { cn } from "@/utils/cn";

export type SegmentedOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

export type SegmentedControlProps<Value extends string> = {
  label: string;
  name: string;
  options: SegmentedOption<Value>[];
  value: Value | undefined;
  onChange: (value: Value) => void;
  /** Disables every option (e.g. units locked once a product is used). */
  disabled?: boolean;
  hint?: string | undefined;
  error?: string | undefined;
};

/**
 * Few mutually exclusive choices shown side by side ("Cesta / Cuenta / Kilo").
 * Native radio inputs, so keyboard and screen readers work out of the box.
 */
export function SegmentedControl<Value extends string>({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  hint,
  error,
}: SegmentedControlProps<Value>): React.JSX.Element {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <fieldset
      className="space-y-1"
      aria-describedby={message ? messageId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-1 block text-sm font-medium text-foreground">{label}</legend>
      <div
        className={cn(
          "grid gap-1 rounded-lg border bg-surface-muted p-1",
          error ? "border-danger-border" : "border-border-strong",
        )}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const isDisabled = disabled || option.disabled === true;
          const isSelected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-surface",
                isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger-text" : "text-muted")}>
          {message}
        </p>
      )}
    </fieldset>
  );
}
