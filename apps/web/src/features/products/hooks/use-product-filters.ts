"use client";

import { PRODUCT_SORTS, type ProductListQueryInput, type ProductSort } from "@ta/validators";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const PRODUCTS_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export type ProductFilters = {
  search: string;
  categoryId: string;
  showInactive: boolean;
  sort: ProductSort;
  page: number;
};

export type UseProductFiltersResult = {
  filters: ProductFilters;
  /** What the search input shows (updates the URL after a short pause). */
  searchText: string;
  setSearchText: (text: string) => void;
  setCategoryId: (categoryId: string) => void;
  setShowInactive: (showInactive: boolean) => void;
  /** Column order from the table headers ("-name" = name descending). */
  setSort: (sort: ProductSort) => void;
  setPage: (page: number) => void;
  /** The API query for `useProducts`. */
  query: ProductListQueryInput;
};

function readFilters(params: URLSearchParams): ProductFilters {
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    search: params.get("search") ?? "",
    categoryId: params.get("categoryId") ?? "",
    showInactive: params.get("inactive") === "1",
    sort: PRODUCT_SORTS.find((sort) => sort === params.get("sort")) ?? "name",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * Product list filters kept in the URL (?search=&categoryId=&inactive=1&sort=&page=), so a filtered
 * list can be reloaded or shared. Changing a filter goes back to page 1.
 */
export function useProductFilters(): UseProductFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters(new URLSearchParams(searchParams.toString()));
  const [searchText, setSearchText] = useState(filters.search);

  const update = (
    patch: Partial<Record<"search" | "categoryId" | "inactive" | "sort" | "page", string>>,
  ) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (searchText.trim() === filters.search) return;
    const timer = setTimeout(() => update({ search: searchText.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `update` is recreated every render; the effect only cares about the typed text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, filters.search]);

  return {
    filters,
    searchText,
    setSearchText,
    setCategoryId: (categoryId) => update({ categoryId }),
    setShowInactive: (showInactive) => update({ inactive: showInactive ? "1" : "" }),
    setSort: (sort) => update({ sort: sort === "name" ? "" : sort }),
    setPage: (page) => update({ page: page > 1 ? String(page) : "" }),
    query: {
      search: filters.search || undefined,
      categoryId: filters.categoryId || undefined,
      isActive: filters.showInactive ? "false" : "true",
      sort: filters.sort,
      page: filters.page,
      pageSize: PRODUCTS_PAGE_SIZE,
    },
  };
}
