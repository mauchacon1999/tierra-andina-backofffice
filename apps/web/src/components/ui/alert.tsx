import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

const TONES = {
  error: "border-danger-border bg-danger-soft text-danger-text",
  warning: "border-warning-border bg-warning-soft text-warning-text",
  info: "border-info-border bg-info-soft text-info-text",
  success: "border-success-border bg-primary-soft text-primary-text",
} as const;

export type AlertTone = keyof typeof TONES;

export type AlertProps = {
  tone: AlertTone;
  /** Short, bold first line. Optional. */
  title?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Inline message box (docs/design-system.md §6). Errors are announced immediately
 * (`role="alert"`); the other tones politely (`role="status"`).
 */
export function Alert({ tone, title, children, className }: AlertProps): React.JSX.Element {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border-l-4 px-3 py-2 text-sm", TONES[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
