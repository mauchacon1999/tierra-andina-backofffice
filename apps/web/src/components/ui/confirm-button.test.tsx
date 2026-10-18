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

  it("stays busy until the action finishes, without a second tap", async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <ConfirmButton question="¿Anular la factura?" confirmLabel="Anular" onConfirm={onConfirm}>
        Anular
      </ConfirmButton>,
      { wrapper: IntlTestWrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "Anular" }));
    const confirm = screen.getByRole("button", { name: "Anular" });
    fireEvent.click(confirm);

    await waitFor(() => expect(confirm.getAttribute("aria-busy")).toBe("true"));
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();

    finish();
    expect(await screen.findByRole("button", { name: "Anular" })).toBeDefined();
    expect(screen.queryByRole("group")).toBeNull();
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
