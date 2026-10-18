import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  avatarClass,
  personInitial,
  SelectMenu,
  type SelectMenuOption,
} from "@/components/ui/select-menu";

const OPTIONS: SelectMenuOption[] = [
  { value: "pending", label: "Pendiente", dotClassName: "bg-info-text" },
  { value: "in_progress", label: "En curso", dotClassName: "bg-chip-text" },
  { value: "done", label: "Finalizada", dotClassName: "bg-primary-text" },
];

function Harness(): React.JSX.Element {
  const [value, setValue] = useState("pending");
  return (
    <SelectMenu
      label="Estado de la tarea"
      options={OPTIONS}
      value={value}
      onValueChange={setValue}
    />
  );
}

describe("personInitial", () => {
  it("uses the first letter of the name", () => {
    expect(personInitial("  ángel Pérez ")).toBe("Á");
    expect(personInitial("Dueño")).toBe("D");
    expect(avatarClass("Ana")).toBe(avatarClass("Ana"));
  });
});

describe("SelectMenu", () => {
  it("opens a list and keeps the chosen option", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("combobox", { name: "Estado de la tarea" }));
    fireEvent.click(screen.getByRole("option", { name: "En curso" }));

    expect(screen.getByRole("combobox", { name: "Estado de la tarea" }).textContent).toContain(
      "En curso",
    );
    expect(screen.queryByRole("option", { name: "Pendiente" })).toBeNull();
  });

  it("reports the new value", () => {
    const onValueChange = vi.fn();
    render(
      <SelectMenu
        label="Asignada"
        options={OPTIONS}
        value="pending"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Asignada" }));
    fireEvent.click(screen.getByRole("option", { name: "Finalizada" }));

    expect(onValueChange).toHaveBeenCalledWith("done");
  });

  it("shows an initial until the circle is pressed", () => {
    render(
      <SelectMenu
        appearance="avatar"
        label="Asignada de Comprar bolsas"
        options={[
          { value: "u1", label: "Ana" },
          { value: "u2", label: "Luis" },
        ]}
        value="u1"
        onValueChange={vi.fn()}
      />,
    );

    const circle = screen.getByRole("combobox", { name: "Asignada de Comprar bolsas" });
    expect(circle.textContent).toBe("A");
    expect(screen.queryByRole("option", { name: "Luis" })).toBeNull();

    fireEvent.click(circle);
    expect(screen.getByRole("option", { name: "Luis" })).toBeDefined();
  });
});
