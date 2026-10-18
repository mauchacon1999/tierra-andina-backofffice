import { InvalidValueError, parseBcvHomePage, type OfficialBcvRate } from "@ta/core";

import { AppError, ErrorCode } from "@/lib/errors";

/** Banco Central de Venezuela homepage, where the official USD rate and fecha valor are published. */
export const OFFICIAL_BCV_RATE_URL = "https://www.bcv.org.ve/";

const UNAVAILABLE = "No se pudo consultar la tasa oficial del BCV.";

/**
 * The BCV certificate chain is incomplete, so a normal TLS check fails before the page loads.
 * Verification is skipped only for this one request.
 */
type BcvRequestInit = RequestInit & { tls?: { rejectUnauthorized?: boolean } };

/**
 * Just the call this module makes. Not `typeof fetch`: Bun's adds properties (`preconnect`) a
 * test double does not have.
 */
export type FetchRate = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Fetches the official USD rate from the Banco Central de Venezuela homepage.
 * The route calls the copy stored on the app context, which tests replace.
 */
export async function readOfficialBcvRate(
  fetchRate: FetchRate = fetch,
  url: string = OFFICIAL_BCV_RATE_URL,
): Promise<OfficialBcvRate> {
  let response: Response;
  try {
    const init: BcvRequestInit = {
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
      tls: { rejectUnauthorized: false },
    };
    response = await fetchRate(url, init as RequestInit);
  } catch {
    throw new AppError(ErrorCode.OFFICIAL_RATE_UNAVAILABLE, UNAVAILABLE);
  }
  if (!response.ok) throw new AppError(ErrorCode.OFFICIAL_RATE_UNAVAILABLE, UNAVAILABLE);

  let html: string;
  try {
    html = await response.text();
  } catch {
    throw new AppError(ErrorCode.OFFICIAL_RATE_UNAVAILABLE, UNAVAILABLE);
  }
  try {
    return parseBcvHomePage(html);
  } catch (error) {
    if (error instanceof InvalidValueError) {
      throw new AppError(ErrorCode.OFFICIAL_RATE_UNAVAILABLE, UNAVAILABLE);
    }
    throw error;
  }
}
