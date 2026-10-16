import { useId, type InputHTMLAttributes, type Ref } from "react";

import { cn } from "@/utils/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  ref?: Ref<HTMLInputElement>;
};

/** Checkbox with its label; the whole row is a 44 px tap target. */
export function Checkbox({ label, className, ref, ...props }: CheckboxProps): React.JSX.Element {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn("inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm", className)}
    >
      <input
        id={id}
        ref={ref}
        type="checkbox"
        className="size-5 rounded border-border-strong accent-primary focus-visible:ring-2 focus-visible:ring-focus"
        {...props}
      />
      {label}
    </label>
  );
}
