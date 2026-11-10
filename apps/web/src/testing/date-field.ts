import { fireEvent, screen, within } from "@testing-library/react";

import { LOCALE } from "@/i18n/config";

const MONTH = new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "UTC" });

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The trigger of the `DateField` labelled `label` (its name is the label plus the chosen day). */
export function getDateField(label: string): HTMLElement {
  return screen.getByRole("button", { name: new RegExp(`^${escape(label)}( |$)`) });
}

/**
 * Picks `date` ("YYYY-MM-DD") in the `DateField` labelled `label`: opens its calendar, moves to
 * that month with the year and month selects, and presses the day (named like "lunes, 12 de
 * octubre de 2026" by react-day-picker's Spanish locale).
 */
export function pickDate(label: string, date: string): void {
  const [year = "", month = "", day = ""] = date.split("-");
  fireEvent.click(getDateField(label));
  const calendar = screen.getByRole("dialog", { name: label });
  fireEvent.change(within(calendar).getByLabelText("Elegir el año"), {
    target: { value: String(Number(year)) },
  });
  fireEvent.change(within(calendar).getByLabelText("Elegir el mes"), {
    target: { value: String(Number(month) - 1) },
  });
  const monthName = MONTH.format(new Date(`${date}T12:00:00Z`));
  fireEvent.click(
    within(calendar).getByRole("button", {
      name: new RegExp(`(^|, )${Number(day)} de ${monthName} de ${year}`),
    }),
  );
}
