import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

/*
 * Colors are chosen by `tone`, never by overriding classes: cn() only concatenates, so a
 * second border/bg class would compete with these and the winner would depend on CSS order.
 */
const TONES = {
  default: "border border-border bg-surface",
  muted: "border-2 border-border-strong bg-surface",
  success: "border-2 border-success-border bg-primary-soft",
  warning: "border-2 border-warning-border bg-warning-soft",
  danger: "border-2 border-danger-border bg-danger-soft",
} as const;

export type CardTone = keyof typeof TONES;

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: CardTone;
};

/** Content container: rounded-2xl, soft shadow, colors by tone (docs/design-system.md §3). */
export function Card({ tone = "default", className, ...props }: CardProps): React.JSX.Element {
  return (
    <section
      className={cn("rounded-2xl p-4 shadow-sm transition-colors", TONES[tone], className)}
      {...props}
    />
  );
}
