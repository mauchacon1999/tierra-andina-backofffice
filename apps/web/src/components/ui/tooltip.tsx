import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export type TooltipProps = {
  label: string;
  /** Hide the tooltip (e.g. the sidebar is expanded and the label is already visible). */
  isDisabled?: boolean;
  children: ReactNode;
};

/**
 * Text shown to the right on hover or keyboard focus, for icon-only controls. Visual only
 * (`aria-hidden`): the control itself must carry the same text as its accessible name.
 */
export function Tooltip({ label, isDisabled = false, children }: TooltipProps): React.JSX.Element {
  return (
    <span className="group/tooltip relative block">
      {children}
      {!isDisabled && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md",
            "bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-sm",
            "transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
