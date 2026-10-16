"use client";

import type { ProductDetail } from "@ta/validators";
import useSWR from "swr";

import { getProduct } from "@/features/products/api/product-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseProductResult = {
  product: ProductDetail | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** One product with `isUnitLocked`. */
export function useProduct(id: string): UseProductResult {
  const { data, error, isLoading, mutate } = useSWR<ProductDetail, ApiError>(
    queryKeys.products.detail(id),
    () => getProduct(id),
  );
  return { product: data, isLoading, error, retry: () => void mutate() };
}
