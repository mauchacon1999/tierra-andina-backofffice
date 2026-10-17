import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Required: an icon has no text, so this is what screen readers say (Spanish). */
  label: string;
  children: ReactNode;
};

/** Square 44 px button with only an icon (docs/design-system.md §4). */
export function IconButton({
  label,
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground",
        "hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
