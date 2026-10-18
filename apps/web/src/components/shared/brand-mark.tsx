import Image from "next/image";

import { cn } from "@/utils/cn";

export type BrandMarkProps = {
  className?: string;
};

/**
 * The Tierra Andina isotype: the A drawn as a mountain. Decorative — the parent
 * supplies the accessible name (the app name, or the loading status).
 */
export function BrandMark({ className }: BrandMarkProps): React.JSX.Element {
  return (
    <span className={cn("relative block shrink-0", className)}>
      <Image src="/brand/isotype.png" alt="" fill unoptimized sizes="80px" />
    </span>
  );
}
