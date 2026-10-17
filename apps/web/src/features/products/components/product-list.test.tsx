import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ProductList as ProductListPage } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProducts, setProductActive } from "@/features/products/api/product-requests";
import { ProductList } from "@/features/products/components/product-list";
import { ApiError } from "@/lib/api";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/products/api/product-requests", () => ({
  listProducts: vi.fn(),
  setProductActive: vi.fn(),
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
    replace.mockReset();
  });

  it("phones: one card per product with its units, pack, shrinkage and margin", async () => {
    vi.mocked(listProducts).mockResolvedValue(PAGE);
    render(<ProductList />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("1 producto")).toBeDefined();
    const card = within(screen.getByRole("list", { name: "Productos" })).getByRole("listitem");
    expect(within(card).getByRole("link", { name: "Tomate perita" }).getAttribute("href")).toBe(
      "/products/p1",
    );
    for (const text of ["Hortalizas", "Cesta → Kilo", "24 kg por cesta", "2 kg", "50 %"]) {
      expect(within(card).getByText(text)).toBeDefined();
    }
    expect(listProducts).toHaveBeenCalledWith({
      search: undefined,
      categoryId: undefined,
      isActive: "true",
      sort: "name",
      page: 1,
      pageSize: 20,
    });
  });

  it("desktop: sorting by a header puts the order in the URL (the API sorts)", async () => {
    setDesktop(true);
    vi.mocked(listProducts).mockResolvedValue(PAGE);
    render(<ProductList />, { wrapper: SwrTestWrapper });

    await screen.findByRole("table", { name: "Productos" });
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    expect(replace).toHaveBeenCalledWith("/products?sort=-name", { scroll: false });

    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Categoría" }));
    expect(replace).toHaveBeenLastCalledWith("/products?sort=category", { scroll: false });
  });

  it("row actions: edit opens the product, deactivate calls the API", async () => {
    setDesktop(true);
    vi.mocked(listProducts).mockResolvedValue(PAGE);
    vi.mocked(setProductActive).mockResolvedValue({ ...PAGE.data[0]!, isActive: false });
    render(<ProductList />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de Tomate perita" }));
    expect(screen.getByRole("menuitem", { name: "Editar" }).getAttribute("href")).toBe(
      "/products/p1",
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Desactivar" }));

    await waitFor(() => expect(setProductActive).toHaveBeenCalledWith("p1", false));
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
