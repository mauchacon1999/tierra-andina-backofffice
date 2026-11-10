import { toBusinessDate } from "@ta/core";

import { LOCALE } from "@/i18n/config";

/*
 * Business days are "YYYY-MM-DD" strings in America/Caracas (domain-model §8). They are
 * formatted from the string itself, never through a local Date, so no time zone can shift them.
 */

// Weekday names come from Intl in the app locale; the date is read at noon UTC so no zone shifts it.
const WEEKDAY = new Intl.DateTimeFormat(LOCALE, { weekday: "long", timeZone: "UTC" });

/** Today's business day in Caracas, from the device clock. */
export function todayBusinessDate(now: Date = new Date()): string {
  return toBusinessDate(now);
}

/** "2026-10-19" → "19/10/2026" */
export function formatBusinessDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** "2026-10-19" → "lunes 19/10/2026" */
export function formatBusinessDateLong(date: string): string {
  const weekday = WEEKDAY.format(new Date(`${date}T12:00:00Z`));
  return `${weekday} ${formatBusinessDate(date)}`;
}

/**
 * "2026-10-19" → local midnight of that day. Date pickers work with local dates; reading and
 * writing only the local year, month and day keeps the business day unchanged.
 */
export function businessDateToLocalDate(date: string): Date {
  const [year = "1970", month = "1", day = "1"] = date.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** A local date (from a date picker) → "YYYY-MM-DD" with its local year, month and day. */
export function localDateToBusinessDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The business day `days` before `date` ("2026-10-19", 14 → "2026-10-05"). */
export function businessDateMinusDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
