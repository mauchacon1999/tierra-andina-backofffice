import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("is a non-submitting button by default", () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole("button", { name: "Guardar" }).getAttribute("type")).toBe("button");
  });

  it("runs onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("while loading: shows the loading text, is disabled and busy, ignores clicks", () => {
    const onClick = vi.fn();
    render(
      <Button isLoading loadingText="Guardando…" onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Guardando…" });

    fireEvent.click(button);

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses the danger tokens for destructive actions", () => {
    render(<Button variant="danger">Eliminar</Button>);

    expect(screen.getByRole("button", { name: "Eliminar" }).className).toContain("bg-danger");
  });
});
