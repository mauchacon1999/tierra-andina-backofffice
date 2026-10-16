/** The shop's time zone (domain-model §8: business days are America/Caracas dates). */
export const BUSINESS_TIME_ZONE = "America/Caracas";

/**
 * Business day ("YYYY-MM-DD") of an instant in a time zone. Pure: the instant is passed in.
 * 2026-10-16T03:30Z is still "2026-10-15" in Caracas (UTC−4).
 */
export function toBusinessDate(instant: Date, timeZone: string = BUSINESS_TIME_ZONE): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date in YYYY-MM-DD form ("2026-02-30" is false). */
export function isBusinessDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
