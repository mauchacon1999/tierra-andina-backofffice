import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listSuppliers } from "@/features/purchases/api/purchase-requests";
import {
  addAccount,
  deactivateAccount,
  getSupplier,
  updateSupplier,
} from "@/features/suppliers/api/supplier-requests";
import { SupplierDetailScreen } from "@/features/suppliers/components/supplier-detail-screen";
import { SuppliersScreen } from "@/features/suppliers/components/suppliers-screen";
import { setDesktop } from "@/testing/media";
import { BAKERY, BAKERY_DETAIL } from "@/testing/payable-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/purchases/api/purchase-requests", () => ({ listSuppliers: vi.fn() }));
vi.mock("@/features/suppliers/api/supplier-requests", () => ({
  getSupplier: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  addAccount: vi.fn(),
  replaceAccount: vi.fn(),
  deactivateAccount: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: BAKERY.id }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/suppliers",
}));

describe("SuppliersScreen", () => {
  it("lists suppliers with their kind and a link to each one", async () => {
    setDesktop(true);
    vi.mocked(listSuppliers).mockResolvedValue([BAKERY]);
    render(<SuppliersScreen />, { wrapper: SwrTestWrapper });

    const table = await screen.findByRole("table", { name: "Proveedores" });
    const [, row] = within(table).getAllByRole("row");
    expect(within(row!).getByText(BAKERY.name)).toBeDefined();
    expect(within(row!).getByText("Trae a la tienda")).toBeDefined();
  });
});

describe("SupplierDetailScreen", () => {
  beforeEach(() => {
    vi.mocked(getSupplier).mockResolvedValue(BAKERY_DETAIL);
    vi.mocked(addAccount).mockReset();
    vi.mocked(deactivateAccount).mockReset();
    vi.mocked(updateSupplier).mockReset();
  });

  it("shows the accounts with the bank's name", async () => {
    render(<SupplierDetailScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Banco de Venezuela")).toBeDefined();
    expect(screen.getByText("04141234567 · V12345678")).toBeDefined();
  });

  it("adds an account: wrong phone is explained, then it is saved as the banks want it", async () => {
    vi.mocked(addAccount).mockResolvedValue(BAKERY_DETAIL);
    render(<SupplierDetailScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Agregar cuenta" }));
    const dialog = within(screen.getByRole("dialog"));
    // The bank list is searchable by name (accents and case ignored) or code.
    fireEvent.change(dialog.getByRole("combobox", { name: /^Banco/ }), {
      target: { value: "banes" },
    });
    expect(dialog.queryByRole("option", { name: "0102 · Banco de Venezuela" })).toBeNull();
    fireEvent.click(await dialog.findByRole("option", { name: "0134 · Banesco" }));
    fireEvent.change(dialog.getByLabelText(/^Teléfono/), {
      target: { value: "0212-5551234" },
    });
    fireEvent.change(dialog.getByLabelText(/^Cédula o RIF/), { target: { value: "v-8.765.432" } });
    fireEvent.click(dialog.getByRole("button", { name: "Guardar cuenta" }));
    expect(
      await screen.findByText(
        "El teléfono debe tener 11 dígitos y empezar por 0412, 0414, 0416, 0422, 0424 o 0426",
      ),
    ).toBeDefined();

    fireEvent.change(dialog.getByLabelText(/^Teléfono/), {
      target: { value: "0424-555.12.34" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    await waitFor(() =>
      expect(addAccount).toHaveBeenCalledWith(BAKERY.id, {
        bankCode: "0134",
        phone: "04245551234",
        idDocument: "V8765432",
      }),
    );
  });

  it("removes an account after confirming", async () => {
    vi.mocked(deactivateAccount).mockResolvedValue(BAKERY_DETAIL);
    render(<SupplierDetailScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Quitar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(deactivateAccount).toHaveBeenCalledWith(BAKERY.id, BAKERY_DETAIL.accounts[0]!.id),
    );
  });
});
