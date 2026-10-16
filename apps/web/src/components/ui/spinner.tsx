import { cn } from "@/utils/cn";

export type SpinnerProps = {
  className?: string;
};

/** Small loading indicator; inherits the text color. Decorative: pair it with visible text. */
export function Spinner({ className }: SpinnerProps): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}
