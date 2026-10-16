import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Product } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { quickCreateProduct } from "@/features/products/api/product-requests";
import { ProductQuickForm } from "@/features/products/components/product-quick-form";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/products/api/product-requests", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  quickCreateProduct: vi.fn(),
  setProductActive: vi.fn(),
}));

const CREATED: Product = {
  id: "p1",
  name: "Cilantro",
  categoryId: "c-other",
  categoryName: "Otros",
  purchaseUnit: "bundle",
  saleUnit: "unit",
  defaultPackQuantity: "28.0000",
  lastShrinkage: "0.0000",
  lastMargin: "0.5000",
  isActive: true,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
};

describe("ProductQuickForm", () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    onCreated.mockReset();
    vi.mocked(quickCreateProduct).mockReset();
    render(<ProductQuickForm onCreated={onCreated} />, { wrapper: SwrTestWrapper });
  });

  it("creates a bundle sold by bunch and hands the product back", async () => {
    vi.mocked(quickCreateProduct).mockResolvedValue(CREATED);

    fireEvent.input(screen.getByLabelText(/Nombre/), { target: { value: "Cilantro" } });
    fireEvent.click(screen.getByLabelText("Cuenta", { selector: "input[name=purchaseUnit]" }));
    fireEvent.click(screen.getByLabelText("Unidad", { selector: "input[name=saleUnit]" }));
    fireEvent.input(screen.getByLabelText(/Rollitos por cuenta/), { target: { value: "28" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() =>
      expect(quickCreateProduct).toHaveBeenCalledWith({
        name: "Cilantro",
        purchaseUnit: "bundle",
        saleUnit: "unit",
        defaultPackQuantity: "28",
      }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED));
  });

  it("requires the pack quantity for bundles", async () => {
    fireEvent.input(screen.getByLabelText(/Nombre/), { target: { value: "Perejil" } });
    fireEvent.click(screen.getByLabelText("Cuenta", { selector: "input[name=purchaseUnit]" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("Indica cuánto trae cada bulto")).toBeDefined();
    expect(quickCreateProduct).not.toHaveBeenCalled();
  });

  it("shows a taken name on the name field", async () => {
    vi.mocked(quickCreateProduct).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "PRODUCT_NAME_TAKEN",
        message: "Ya existe un producto con ese nombre",
        details: { fieldErrors: { name: ["Ya existe un producto con ese nombre"] } },
      }),
    );

    fireEvent.input(screen.getByLabelText(/Nombre/), { target: { value: "Ocumo" } });
    fireEvent.click(screen.getByLabelText("Kilo", { selector: "input[name=purchaseUnit]" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("Ya existe un producto con ese nombre")).toBeDefined();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
