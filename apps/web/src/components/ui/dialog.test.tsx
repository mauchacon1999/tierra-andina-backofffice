import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "@/components/ui/dialog";

function Harness({ onClose = vi.fn() }: { onClose?: () => void }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Abrir
      </button>
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          onClose();
        }}
        title="Editar compra"
        closeLabel="Cerrar"
      >
        <p>Formulario</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens as a modal labelled by its title and mounts the content only while open", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    expect(screen.queryByText("Formulario")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));

    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-label")).toBe("Editar compra");
    expect(screen.getByText("Formulario")).toBeDefined();
  });

  it("closes with its close button and on a backdrop click", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(dialog.open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });
});
