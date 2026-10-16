import { render, screen } from "@testing-library/react";
import type { ProductList as ProductListPage } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProducts } from "@/features/products/api/product-requests";
import { ProductList } from "@/features/products/components/product-list";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/products/api/product-requests", () => ({
  listProducts: vi.fn(),
  listProductCategories: vi.fn().mockResolvedValue([]),
}));

const PAGE: ProductListPage = {
  data: [
    {
      id: "p1",
      name: "Tomate perita",
      categoryId: "c1",
      categoryName: "Hortalizas",
      purchaseUnit: "crate",
      saleUnit: "kg",
      defaultPackQuantity: "24.0000",
      lastShrinkage: "2.0000",
      lastMargin: "0.5000",
      isActive: true,
      createdAt: "2026-10-16T00:00:00.000Z",
      updatedAt: "2026-10-16T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

describe("ProductList", () => {
  beforeEach(() => {
    vi.mocked(listProducts).mockReset();
  });

  it("shows the products with their units, pack, shrinkage and margin", async () => {
    vi.mocked(listProducts).mockResolvedValue(PAGE);
    render(<ProductList />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("1 producto")).toBeDefined();
    // Card (phones) and table row (desktop) both render; CSS shows one of them.
    expect(screen.getAllByText("Tomate perita")).toHaveLength(2);
    expect(screen.getByText("Hortalizas · Cesta → Kilo")).toBeDefined();
    expect(screen.getByText("24 kg por cesta · Merma 2 kg · Margen 50 %")).toBeDefined();
    expect(listProducts).toHaveBeenCalledWith({
      search: undefined,
      categoryId: undefined,
      isActive: "true",
      page: 1,
      pageSize: 20,
    });
  });

  it("shows an empty state with the action that fills it", async () => {
    vi.mocked(listProducts).mockResolvedValue({ ...PAGE, data: [], total: 0 });
    render(<ProductList />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Aún no hay productos.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Crear producto" }).getAttribute("href")).toBe(
      "/products/new",
    );
  });

  it("shows the API error with a retry button", async () => {
    vi.mocked(listProducts).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con la API" }),
    );
    render(<ProductList />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("No se pudieron cargar los productos")).toBeDefined();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
  });
});
