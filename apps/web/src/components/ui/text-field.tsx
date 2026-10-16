import { useId, type InputHTMLAttributes, type Ref } from "react";

import { cn } from "@/utils/cn";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  ref?: Ref<HTMLInputElement>;
};

/** Labelled input with its error message, wired for screen readers. */
export function TextField({
  label,
  error,
  className,
  ref,
  ...props
}: TextFieldProps): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-zinc-900",
          "focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-zinc-900 dark:text-zinc-100",
          error ? "border-red-500" : "border-zinc-300 dark:border-zinc-600",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
