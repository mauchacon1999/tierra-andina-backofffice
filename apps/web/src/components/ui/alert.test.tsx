import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert } from "@/components/ui/alert";

describe("Alert", () => {
  it("announces errors immediately (role=alert)", () => {
    render(<Alert tone="error">Correo o contraseña incorrectos</Alert>);

    expect(screen.getByRole("alert").textContent).toBe("Correo o contraseña incorrectos");
  });

  it.each(["warning", "info", "success"] as const)(
    "announces %s politely (role=status)",
    (tone) => {
      render(<Alert tone={tone}>Mensaje</Alert>);

      expect(screen.getByRole("status").textContent).toBe("Mensaje");
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  it("shows an optional title", () => {
    render(
      <Alert tone="warning" title="La tasa cambió">
        Revisa los precios antes de publicar.
      </Alert>,
    );

    expect(screen.getByText("La tasa cambió")).toBeDefined();
  });
});
