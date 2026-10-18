import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPayable, listExpenseCategories } from "@/features/payables/api/payable-requests";
import { PayableForm } from "@/features/payables/components/payable-form";
import { listSuppliers } from "@/features/purchases/api/purchase-requests";
import { createSupplier } from "@/features/suppliers/api/supplier-requests";
import { BAKERY, BREAD_INVOICE, FOOD, PACKAGING } from "@/testing/payable-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/payables/api/payable-requests", () => ({
  createPayable: vi.fn(),
  replacePayable: vi.fn(),
  listExpenseCategories: vi.fn(),
}));
vi.mock("@/features/purchases/api/purchase-requests", () => ({ listSuppliers: vi.fn() }));
vi.mock("@/features/suppliers/api/supplier-requests", () => ({ createSupplier: vi.fn() }));

const fill = (label: RegExp, value: string, index = 0) =>
  fireEvent.change(screen.getAllByLabelText(label)[index]!, { target: { value } });

describe("PayableForm", () => {
  beforeEach(() => {
    vi.mocked(listSuppliers).mockResolvedValue([BAKERY]);
    vi.mocked(listExpenseCategories).mockResolvedValue([PACKAGING, FOOD]);
    vi.mocked(createPayable).mockReset();
    vi.mocked(createSupplier).mockReset();
  });

  it("adds up the lines while typing and sends the invoice", async () => {
    vi.mocked(createPayable).mockResolvedValue(BREAD_INVOICE);
    const onDone = vi.fn();
    render(<PayableForm onDone={onDone} />, { wrapper: SwrTestWrapper });

    await screen.findByRole("option", { name: BAKERY.name });
    fill(/^Proveedor/, BAKERY.id);
    fill(/^Fecha de emisión/, "2026-10-18");
    fill(/^Fecha de vencimiento/, "2026-10-25");
    fill(/^Descripción/, " Bolsas medianas ");
    fill(/^Categoría/, PACKAGING.id);
    fill(/^Cantidad/, "10");
    fill(/^Unidad/, "pack");
    fill(/^Precio unitario/, "1.50");
    fireEvent.click(screen.getByRole("button", { name: "Agregar línea" }));
    fill(/^Descripción/, "Pan campesino", 1);
    fill(/^Categoría/, FOOD.id, 1);
    fill(/^Cantidad/, "20", 1);
    fill(/^Precio unitario/, "0.50", 1);

    expect(screen.getByText("25,00 $")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Guardar factura" }));

    await waitFor(() =>
      expect(createPayable).toHaveBeenCalledWith({
        supplierId: BAKERY.id,
        currency: "USD",
        issuedOn: "2026-10-18",
        dueOn: "2026-10-25",
        lines: [
          {
            description: "Bolsas medianas",
            expenseCategoryId: PACKAGING.id,
            quantity: "10",
            unit: "pack",
            unitPrice: "1.50",
          },
          {
            description: "Pan campesino",
            expenseCategoryId: FOOD.id,
            quantity: "20",
            unit: "unit",
            unitPrice: "0.50",
          },
        ],
      }),
    );
    expect(onDone).toHaveBeenCalledWith(BREAD_INVOICE);
  });

  it("asks for the supplier, the due date and what was bought", async () => {
    render(<PayableForm onDone={vi.fn()} />, { wrapper: SwrTestWrapper });
    fill(/^Fecha de vencimiento/, "");

    fireEvent.click(await screen.findByRole("button", { name: "Guardar factura" }));

    expect(await screen.findByText("Elige el proveedor")).toBeDefined();
    expect(screen.getByText("Indica la fecha")).toBeDefined();
    expect(screen.getByText("Escribe qué se compró")).toBeDefined();
    expect(createPayable).not.toHaveBeenCalled();
  });

  it("creates a quick supplier and comes back with it chosen", async () => {
    const newcomer = {
      ...BAKERY,
      id: "0199f000-0000-7000-8000-0000000000b2",
      name: "Bolsas Don José",
    };
    vi.mocked(createSupplier).mockResolvedValue(newcomer);
    render(<PayableForm onDone={vi.fn()} />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Nuevo proveedor" }));
    vi.mocked(listSuppliers).mockResolvedValue([BAKERY, newcomer]);
    fill(/^Nombre/, "Bolsas Don José");
    fireEvent.click(screen.getByRole("button", { name: "Crear proveedor" }));

    const supplier = (await screen.findByLabelText(/^Proveedor/)) as HTMLSelectElement;
    await waitFor(() => expect(supplier.value).toBe(newcomer.id));
    expect(createSupplier).toHaveBeenCalledWith({
      name: "Bolsas Don José",
      kind: "local",
      phone: "",
      notes: "",
    });
  });
});
