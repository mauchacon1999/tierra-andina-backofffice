"use client";

import type { ProductList, ProductListQueryInput } from "@ta/validators";
import useSWR from "swr";

import { listProducts } from "@/features/products/api/product-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseProductsResult = {
  page: ProductList | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** Paginated product list. Keeps the previous page on screen while the next one loads. */
export function useProducts(params: ProductListQueryInput): UseProductsResult {
  const { data, error, isLoading, mutate } = useSWR<ProductList, ApiError>(
    queryKeys.products.list(params),
    () => listProducts(params),
    { keepPreviousData: true },
  );
  return { page: data, isLoading, error, retry: () => void mutate() };
}
