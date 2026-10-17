/*
 * Display formatting for decimal strings (docs/design-system.md §8). Intl.NumberFormat formats
 * the string itself, so no float is ever involved: never pass a parsed number here.
 */

import { fractionToPercent } from "@ta/core";

import { LOCALE } from "@/i18n/config";

/** "1234.5" → "1.234,50" (with `decimals: 2`). Rounds half-expand like Intl. */
export function formatDecimal(value: string, decimals: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value as `${number}`);
}

/** "1.4" → "1,40 $" */
export function formatUsd(value: string): string {
  return `${formatDecimal(value, 2)} $`;
}

/** "294" → "294,00 Bs" */
export function formatBs(value: string): string {
  return `${formatDecimal(value, 2)} Bs`;
}

/** Quantity without padding zeros, up to 3 decimals: "22.0000" → "22", "0.9091" → "0,909". */
export function formatQuantity(value: string): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 }).format(value as `${number}`);
}

/**
 * Fraction as percent: "0.5" → "50 %", "0.125" → "12,5 %".
 * Not the Intl percent style: engines disagree on the space before "%" ("50%" vs "50 %").
 */
export function formatPercentFromFraction(fraction: string): string {
  const percent = fractionToPercent(fraction) as `${number}`;
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(percent)} %`;
}
