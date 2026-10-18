import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ComboboxField } from "@/components/ui/combobox-field";

const OPTIONS = [
  { value: "tomato", label: "Tomate" },
  { value: "chive", label: "Cebollín" },
];

function Harness(): React.JSX.Element {
  const [value, setValue] = useState("");
  return (
    <ComboboxField
      label="Producto"
      options={OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="Elige un producto"
      emptyText="Nada coincide"
      openLabel="Ver opciones"
    />
  );
}

describe("ComboboxField", () => {
  it("filters by name and ignores accents", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Producto" });

    fireEvent.change(input, { target: { value: "tom" } });

    expect(screen.getByRole("option", { name: "Tomate" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "Cebollín" })).toBeNull();

    fireEvent.change(input, { target: { value: "cebollin" } });

    expect(screen.getByRole("option", { name: "Cebollín" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "Tomate" })).toBeNull();
  });

  it("selects the product and says when nothing matches", () => {
    const onValueChange = vi.fn();
    render(
      <ComboboxField
        label="Producto"
        options={OPTIONS}
        value=""
        onValueChange={onValueChange}
        emptyText="Nada coincide"
        openLabel="Ver opciones"
      />,
    );
    const input = screen.getByRole("combobox", { name: "Producto" });

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("Nada coincide")).toBeDefined();

    fireEvent.change(input, { target: { value: "tom" } });
    fireEvent.click(screen.getByRole("option", { name: "Tomate" }));

    expect(onValueChange).toHaveBeenCalledWith("tomato");
  });
});
