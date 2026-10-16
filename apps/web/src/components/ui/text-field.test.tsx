import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "@/components/ui/text-field";

describe("TextField", () => {
  it("links the label to the input", () => {
    render(<TextField label="Nombre" />);

    expect(screen.getByLabelText("Nombre").tagName).toBe("INPUT");
  });

  it("shows the hint and describes the input with it", () => {
    render(<TextField label="Merma" hint="En la unidad de venta" />);
    const input = screen.getByLabelText("Merma");

    expect(screen.getByText("En la unidad de venta").id).toBe(
      input.getAttribute("aria-describedby"),
    );
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("replaces the hint with the error and marks the input invalid", () => {
    render(
      <TextField label="Merma" hint="En la unidad de venta" error="Debe ser menor al bulto" />,
    );
    const input = screen.getByLabelText("Merma");

    expect(screen.queryByText("En la unidad de venta")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "Debe ser menor al bulto",
    );
  });

  it("marks required fields with a visual asterisk and the native attribute", () => {
    render(<TextField label="Nombre" required />);

    expect(screen.getByLabelText(/Nombre/).hasAttribute("required")).toBe(true);
    expect(screen.getByText("*")).toBeDefined();
  });

  it("shows the unit suffix", () => {
    render(<TextField label="Peso" suffix="kg" />);

    expect(screen.getByText("kg")).toBeDefined();
  });
});
