import { sumDecimals } from "@ta/core";

type Collected = { ves: string; usd: string };

/** Collected sales of the closes on screen, bolívares and dollars kept apart. */
export function sumCollected(closes: readonly Collected[]): Collected {
  return {
    ves: sumDecimals(closes.map((close) => close.ves)),
    usd: sumDecimals(closes.map((close) => close.usd)),
  };
}
