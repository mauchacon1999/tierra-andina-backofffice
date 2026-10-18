import { payableLineSubtotal, sumDecimals } from "@ta/core";

export type LiveLine = { quantity?: string; unitPrice?: string };

/** Subtotal of a line being typed, or null while quantity or price are not valid yet. */
export function liveSubtotal(line: LiveLine): string | null {
  try {
    return payableLineSubtotal((line.quantity ?? "").trim(), (line.unitPrice ?? "").trim());
  } catch {
    return null;
  }
}

/** Total of the lines that can already be computed (the others count as 0). */
export function liveTotal(lines: readonly LiveLine[]): string {
  return sumDecimals(lines.map((line) => liveSubtotal(line) ?? "0"));
}
