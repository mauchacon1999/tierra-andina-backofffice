import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ProductDetail } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProduct } from "@/features/products/api/product-requests";
import { ProductForm } from "@/features/products/components/product-form";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const CATEGORY = "01a14314-2825-7000-a1d1-bdf734d05981";

const session = vi.hoisted(() => ({ role: "owner" as "owner" | "manager" }));
vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    activeMembership: { storeId: "store", storeName: "Tierra Andina", role: session.role },
  }),
}));
vi.mock("@/features/settings/api/use-settings", () => ({
  useSettings: () => ({
    settings: {
      usdRoundingStep: "0.05",
      bsRoundingStep: "1",
      saleRateMode: "manual",
      saleRateMarkupPct: "0",
      defaultMargin: "0.6",
      receiverCanSeePrices: false,
    },
    isLoaded: true,
    error: undefined,
  }),
}));
vi.mock("@/features/products/api/product-requests", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  quickCreateProduct: vi.fn(),
  setProductActive: vi.fn(),
  listProducts: vi.fn(),
  getProduct: vi.fn(),
  listProductCategories: vi.fn().mockResolvedValue([
    {
      id: "01a14314-2825-7000-a1d1-bdf734d05981",
      code: "vegetable",
      name: "Hortalizas",
      sortOrder: 2,
    },
  ]),
}));

const type = (label: string | RegExp, value: string) =>
  fireEvent.input(screen.getByLabelText(label), { target: { value } });

describe("ProductForm (create) for the manager", () => {
  it("shows the store's margin read-only", async () => {
    session.role = "manager";
    render(<ProductForm mode="create" />, { wrapper: SwrTestWrapper });

    const margin = screen.getByLabelText("Margen habitual") as HTMLInputElement;
    await waitFor(() => expect(margin.value).toBe("60"));
    expect(margin.readOnly).toBe(true);
    expect(screen.getByText("El margen de la tienda. Solo el dueño lo cambia.")).toBeDefined();
    session.role = "owner";
  });
});

describe("ProductForm (create)", () => {
  beforeEach(() => {
    session.role = "owner";
    vi.mocked(createProduct).mockReset();
    render(<ProductForm mode="create" />, { wrapper: SwrTestWrapper });
  });

  it("submits the correct payload", async () => {
    vi.mocked(createProduct).mockResolvedValue({
      id: "p1",
      name: "Tomate perita",
      categoryId: CATEGORY,
      categoryName: "Hortalizas",
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24.0000",
      lastShrinkage: "2.0000",
      lastMargin: "0.5000",
      isActive: true,
      createdAt: "2026-10-16T00:00:00.000Z",
      updatedAt: "2026-10-16T00:00:00.000Z",
    });
    await screen.findByRole("option", { name: "Hortalizas" });

    type(/Nombre/, "Tomate perita");
    fireEvent.change(screen.getByLabelText(/Categoría/), { target: { value: CATEGORY } });
    type(/Kilos aprox. por cesta/, "24");
    type("Merma habitual", "2");
    type("Margen habitual", "50");
    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() =>
      expect(createProduct).toHaveBeenCalledWith({
        name: "Tomate perita",
        categoryId: CATEGORY,
        purchaseUnit: "crate",
        saleUnit: "kg",
        defaultPackQuantity: "24",
        lastShrinkage: "2",
        lastMargin: "0.5",
      }),
    );
    expect(await screen.findByText("Producto creado")).toBeDefined();
    expect(screen.getByRole("button", { name: "Crear otro" })).toBeDefined();
  });

  it("choosing 'Kilo' hides the pack quantity and disables selling by unit", () => {
    fireEvent.click(screen.getByLabelText("Kilo", { selector: "input[name=purchaseUnit]" }));

    expect(screen.queryByLabelText(/aprox. por/)).toBeNull();
    expect(
      (screen.getByLabelText("Unidad", { selector: "input[name=saleUnit]" }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("shows field errors without calling the API", async () => {
    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("Escribe el nombre")).toBeDefined();
    expect(screen.getByText("Elige una categoría", { selector: "p" })).toBeDefined();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("price example: the tomato reference case shows 1,40", () => {
    type(/Kilos aprox. por cesta/, "24");
    type("Merma habitual", "2");
    type("Margen habitual", "50");
    type("Si la cesta te cuesta", "20");

    expect(
      screen.getByText("Cesta a 20,00 $ → 22 kg útiles → 0,91 $/kg → venta 1,40 $/kg"),
    ).toBeDefined();
  });
});

describe("ProductForm (edit, units locked)", () => {
  it("disables the unit choices and explains why", () => {
    const product: ProductDetail = {
      id: "p1",
      name: "Tomate perita",
      categoryId: CATEGORY,
      categoryName: "Hortalizas",
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24.0000",
      lastShrinkage: "2.0000",
      lastMargin: "0.5000",
      isActive: true,
      createdAt: "2026-10-16T00:00:00.000Z",
      updatedAt: "2026-10-16T00:00:00.000Z",
      isUnitLocked: true,
    };
    render(<ProductForm mode="edit" product={product} />, { wrapper: SwrTestWrapper });

    for (const input of screen.getAllByRole("radio")) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
    expect(
      screen.getAllByText("Bloqueado: el producto ya se usó en compras o listas de precios."),
    ).toHaveLength(2);
    expect((screen.getByLabelText(/Nombre/) as HTMLInputElement).disabled).toBe(false);
  });
});
