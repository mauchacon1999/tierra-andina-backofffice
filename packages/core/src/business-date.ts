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

/**
 * The Monday–Sunday week that contains a business day (the shop reviews on Sunday).
 * "2026-10-17" (Saturday) → 12 to 18 October.
 * @throws {TypeError} when the date is not a real YYYY-MM-DD day.
 */
export function weekContaining(businessDate: string): { from: string; to: string } {
  if (!isBusinessDate(businessDate)) {
    throw new TypeError(`weekContaining: "${businessDate}" is not a business date`);
  }
  const noon = new Date(`${businessDate}T12:00:00Z`);
  const sundayBased = noon.getUTCDay();
  const daysSinceMonday = sundayBased === 0 ? 6 : sundayBased - 1;
  const monday = new Date(noon);
  monday.setUTCDate(noon.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { from: isoDay(monday), to: isoDay(sunday) };
}

/**
 * The Monday–Sunday week before the one that contains `businessDate`.
 * "2026-10-17" → 5 to 11 October.
 * @throws {TypeError} when the date is not a real YYYY-MM-DD day.
 */
export function previousWeek(businessDate: string): { from: string; to: string } {
  const current = weekContaining(businessDate);
  return weekContaining(addBusinessDays(current.from, -1));
}

/**
 * The calendar month that contains a business day, first day through last day.
 * "2026-10-17" → 1 to 31 October. February respects leap years.
 * @throws {TypeError} when the date is not a real YYYY-MM-DD day.
 */
export function monthContaining(businessDate: string): { from: string; to: string } {
  if (!isBusinessDate(businessDate)) {
    throw new TypeError(`monthContaining: "${businessDate}" is not a business date`);
  }
  const year = Number(businessDate.slice(0, 4));
  const month = Number(businessDate.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0));
  return { from: `${businessDate.slice(0, 7)}-01`, to: isoDay(last) };
}

/**
 * The calendar month before the one that contains `businessDate`.
 * "2026-03-01" → 1 to 28 February. "2026-01-15" → December 2025.
 * @throws {TypeError} when the date is not a real YYYY-MM-DD day.
 */
export function previousMonth(businessDate: string): { from: string; to: string } {
  const current = monthContaining(businessDate);
  return monthContaining(addBusinessDays(current.from, -1));
}

/** Moves a business day by whole days. Negative goes backward. Noon UTC avoids zone shifts. */
function addBusinessDays(businessDate: string, days: number): string {
  const date = new Date(`${businessDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
