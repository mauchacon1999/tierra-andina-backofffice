"use client";

import type { ProductCategory } from "@ta/validators";
import useSWR from "swr";

import { listProductCategories } from "@/features/products/api/product-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseProductCategoriesResult = {
  categories: ProductCategory[];
  isLoading: boolean;
  error: ApiError | undefined;
};

/** Product categories for selects and filters (rarely change: no focus revalidation). */
export function useProductCategories(): UseProductCategoriesResult {
  const { data, error, isLoading } = useSWR<ProductCategory[], ApiError>(
    queryKeys.productCategories,
    listProductCategories,
    { revalidateOnFocus: false },
  );
  return { categories: data ?? [], isLoading, error };
}
