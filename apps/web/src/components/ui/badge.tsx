import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

const TONES = {
  neutral: "bg-surface-muted text-muted",
  success: "bg-primary-soft text-primary-text",
  warning: "bg-warning-soft text-warning-text",
  info: "bg-info-soft text-info-text",
  danger: "bg-danger-soft text-danger-text",
} as const;

export type BadgeTone = keyof typeof TONES;

export type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

/** Short status label ("Inactivo", "Recibido"). Text always carries the meaning. */
export function Badge({ tone = "neutral", children }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
