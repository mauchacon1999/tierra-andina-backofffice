import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

describe("ConfirmButton", () => {
  it("asks before acting and acts only on confirm", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmButton question="¿Eliminar tomate?" confirmLabel="Sí, eliminar" onConfirm={onConfirm}>
        Eliminar
      </ConfirmButton>,
      { wrapper: IntlTestWrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByRole("group", { name: "¿Eliminar tomate?" })).toBeDefined();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(await screen.findByRole("button", { name: "Eliminar" })).toBeDefined();
  });

  it("cancel goes back without acting", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmButton question="¿Cerrar la jornada?" onConfirm={onConfirm}>
        Cerrar jornada
      </ConfirmButton>,
      { wrapper: IntlTestWrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar jornada" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("button", { name: "Cerrar jornada" })).toBeDefined();
  });
});
