import Decimal from "decimal.js";

import { isBusinessDate } from "./business-date";
import { toDbString } from "./decimal";
import { InvalidValueError } from "./errors";

/** Official BCV reference rate: bolívares per 1 USD, and the valor date it applies to. */
export type OfficialBcvRate = {
  /** Plain decimal, half-up to 4 places so it fits `numeric(14,4)`. */
  usd: string;
  /** Fecha valor, `YYYY-MM-DD`. Weekends keep the last business day's publication. */
  effectiveDate: string;
};

/**
 * Reads the USD rate and the fecha valor from the Banco Central de Venezuela homepage.
 * The dollar block is `id="dolar"` and the valor date is the `content` of "Fecha Valor".
 * The rate uses a comma as the decimal separator ("881,06640000"). Does not call the network.
 * @throws {InvalidValueError} when the dollar block, the rate or the valor date is missing or unusable.
 */
export function parseBcvHomePage(html: string): OfficialBcvRate {
  const start = html.indexOf('id="dolar"');
  if (start < 0) throw new InvalidValueError("usd", "the BCV page has no dollar rate");
  const slice = html.slice(start, start + 2_500);
  const rate = slice.match(/<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/i);
  const date = slice.match(/Fecha Valor:[\s\S]{0,500}?content="(\d{4}-\d{2}-\d{2})/i);
  return normalizeOfficialRate(rate?.[1], date?.[1]);
}

function normalizeOfficialRate(
  rawRate: string | undefined,
  rawDate: string | undefined,
): OfficialBcvRate {
  if (rawRate === undefined || rawRate.trim() === "") {
    throw new InvalidValueError("usd", "the BCV page has no dollar rate");
  }
  if (rawDate === undefined || !isBusinessDate(rawDate)) {
    throw new InvalidValueError("effectiveDate", "the BCV page has no valor date");
  }
  const text = rawRate.trim().replace(/\s/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  let decimal: Decimal;
  try {
    decimal = new Decimal(normalized);
  } catch {
    throw new InvalidValueError("usd", "the BCV rate is not a number");
  }
  if (!decimal.isFinite() || decimal.lte(0)) {
    throw new InvalidValueError("usd", "the BCV rate must be greater than 0");
  }
  if (decimal.gte("10000000000")) {
    throw new InvalidValueError("usd", "the BCV rate has too many digits");
  }
  return { usd: toDbString(decimal), effectiveDate: rawDate };
}
