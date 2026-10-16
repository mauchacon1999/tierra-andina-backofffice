import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useProductFilters } from "@/features/products/hooks/use-product-filters";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => nav.params,
}));

describe("useProductFilters", () => {
  beforeEach(() => {
    nav.replace.mockReset();
    nav.params = new URLSearchParams();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to active products, page 1", () => {
    const { result } = renderHook(() => useProductFilters());

    expect(result.current.query).toEqual({
      search: undefined,
      categoryId: undefined,
      isActive: "true",
      page: 1,
      pageSize: 20,
    });
  });

  it("reads the filters from the URL", () => {
    nav.params = new URLSearchParams("search=tomate&categoryId=c1&inactive=1&page=3");

    const { result } = renderHook(() => useProductFilters());

    expect(result.current.searchText).toBe("tomate");
    expect(result.current.query).toMatchObject({
      search: "tomate",
      categoryId: "c1",
      isActive: "false",
      page: 3,
    });
  });

  it("ignores an invalid page number", () => {
    nav.params = new URLSearchParams("page=abc");

    expect(renderHook(() => useProductFilters()).result.current.query.page).toBe(1);
  });

  it("writes the search to the URL after a short pause, back on page 1", () => {
    nav.params = new URLSearchParams("page=2");
    const { result } = renderHook(() => useProductFilters());

    act(() => result.current.setSearchText("cilan"));
    expect(nav.replace).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(nav.replace).toHaveBeenCalledWith("/products?search=cilan", { scroll: false });
  });

  it("toggles inactive and category, removing empty values", () => {
    nav.params = new URLSearchParams("categoryId=c1");
    const { result } = renderHook(() => useProductFilters());

    act(() => result.current.setShowInactive(true));
    expect(nav.replace).toHaveBeenLastCalledWith("/products?categoryId=c1&inactive=1", {
      scroll: false,
    });

    act(() => result.current.setCategoryId(""));
    expect(nav.replace).toHaveBeenLastCalledWith("/products", { scroll: false });
  });

  it("changes page without touching the other filters", () => {
    nav.params = new URLSearchParams("search=tomate");
    const { result } = renderHook(() => useProductFilters());

    act(() => result.current.setPage(2));

    expect(nav.replace).toHaveBeenCalledWith("/products?search=tomate&page=2", { scroll: false });
  });
});
