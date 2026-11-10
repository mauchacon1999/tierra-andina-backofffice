import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DateField, type DateFieldProps } from "@/components/ui/date-field";
import { getDateField, pickDate } from "@/testing/date-field";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

vi.mock("@/utils/format-date", async () => {
  const actual = (await vi.importActual("@/utils/format-date")) as Record<string, unknown>;
  return { ...actual, todayBusinessDate: () => "2026-10-17" };
});

type HarnessProps = Omit<DateFieldProps, "value" | "onChange"> & {
  initial?: string;
  onChange?: (value: string) => void;
};

/** A DateField with its own state, like a form keeps it. */
function Harness({ initial = "", onChange, ...props }: HarnessProps): React.JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <DateField
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const renderField = (props: HarnessProps) =>
  render(<Harness {...props} />, { wrapper: IntlTestWrapper });

describe("DateField", () => {
  it("shows a placeholder until a day is chosen, then the day in words", () => {
    const onChange = vi.fn();
    renderField({ label: "Fecha", onChange });
    expect(getDateField("Fecha").textContent).toContain("Elige una fecha");

    pickDate("Fecha", "2026-10-12");

    expect(onChange).toHaveBeenCalledWith("2026-10-12");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(getDateField("Fecha").textContent).toContain("lunes 12/10/2026");
  });

  it("opens on the chosen month with that day selected, and moves to other months", () => {
    renderField({ label: "Fecha", initial: "2026-03-05" });

    fireEvent.click(getDateField("Fecha"));
    const calendar = screen.getByRole("dialog", { name: "Fecha" });

    expect((within(calendar).getByLabelText("Elegir el mes") as HTMLSelectElement).value).toBe("2");
    expect(
      within(calendar).getByRole("button", { name: /5 de marzo de 2026, seleccionado/ }),
    ).toBeDefined();
    fireEvent.click(within(calendar).getByRole("button", { name: "Ir al mes siguiente" }));
    expect((within(calendar).getByLabelText("Elegir el mes") as HTMLSelectElement).value).toBe("3");
  });

  it("'Hoy' chooses today's business day", () => {
    const onChange = vi.fn();
    renderField({ label: "Fecha", initial: "2026-01-02", onChange });

    fireEvent.click(getDateField("Fecha"));
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(onChange).toHaveBeenCalledWith("2026-10-17");
  });

  it("does not offer days outside min and max, nor 'Hoy' when today is outside", () => {
    renderField({ label: "Fecha", initial: "2026-09-15", min: "2026-09-10", max: "2026-09-20" });

    fireEvent.click(getDateField("Fecha"));
    const calendar = screen.getByRole("dialog", { name: "Fecha" });
    const day = (name: RegExp) =>
      within(calendar).getByRole("button", { name }) as HTMLButtonElement;

    expect(day(/9 de septiembre de 2026/).disabled).toBe(true);
    expect(day(/21 de septiembre de 2026/).disabled).toBe(true);
    expect(day(/10 de septiembre de 2026/).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Hoy" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("an optional field with a day offers 'Borrar'; a required one does not", () => {
    const onChange = vi.fn();
    const { unmount } = renderField({ label: "Hasta", initial: "2026-10-01", onChange });

    fireEvent.click(getDateField("Hasta"));
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(onChange).toHaveBeenCalledWith("");
    unmount();

    renderField({ label: "Hasta", initial: "2026-10-01", required: true });
    fireEvent.click(getDateField("Hasta"));
    expect(screen.queryByRole("button", { name: "Borrar" })).toBeNull();
  });

  it("Esc closes the calendar and gives the focus back; so does a press outside", () => {
    renderField({ label: "Fecha", initial: "2026-10-01" });
    const trigger = getDateField("Fecha");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("describes the field with the hint, or the error instead", () => {
    const { rerender } = renderField({ label: "Vence", hint: "Opcional." });
    expect(
      document.getElementById(getDateField("Vence").getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe("Opcional.");

    rerender(<Harness label="Vence" hint="Opcional." error="Indica la fecha" />);
    expect(screen.queryByText("Opcional.")).toBeNull();
    expect(
      document.getElementById(getDateField("Vence").getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe("Indica la fecha");
  });
});
