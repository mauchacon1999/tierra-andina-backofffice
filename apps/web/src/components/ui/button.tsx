import type { ButtonHTMLAttributes } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";

/** Hierarchy in docs/design-system.md §4: one `primary` per screen or form. */
const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
  secondary: "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
  danger: "bg-danger text-primary-foreground hover:bg-danger-hover",
  ghost: "text-primary-text hover:bg-primary-soft",
} as const;

const SIZES = {
  // 44 px tall: the minimum touch target on phones.
  md: "min-h-11 px-4 py-2 text-base",
  sm: "min-h-9 px-3 py-1.5 text-sm",
  // Big one-tap actions used standing up (truck receipt buttons).
  lg: "min-h-12 px-3 py-3 text-base",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

/** Classes of a button; shared with `ButtonLink` so links that act as buttons look the same. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and announces it as busy. */
  isLoading?: boolean;
  /** Text while loading, e.g. "Guardando…". Defaults to the children. */
  loadingText?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(buttonClasses(variant, size), className)}
      {...props}
    >
      {isLoading && <Spinner />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
