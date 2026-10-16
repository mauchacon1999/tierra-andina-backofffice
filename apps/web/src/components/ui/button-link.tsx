import Link from "next/link";
import type { ComponentProps } from "react";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Navigation that looks like a button ("Nuevo producto"). Same variants as `Button`. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps): React.JSX.Element {
  return <Link className={cn(buttonClasses(variant, size), className)} {...props} />;
}
