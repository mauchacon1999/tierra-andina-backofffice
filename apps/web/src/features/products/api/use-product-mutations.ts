"use client";

import type {
  CreateProduct,
  Product,
  ProductDetail,
  QuickCreateProduct,
  UpdateProduct,
} from "@ta/validators";
import { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  createProduct,
  quickCreateProduct,
  setProductActive,
  updateProduct,
} from "@/features/products/api/product-requests";
import type { ApiError } from "@/lib/api";
import { isProductsKey } from "@/lib/query-keys";

/*
 * Product writes. After each one every products key (lists and details) is revalidated, so
 * screens never show stale data. Types are spelled out per hook: SWR cannot infer the trigger
 * signature from a generic argument.
 */

export type MutationResult<Arg, Result> = {
  run: (arg: Arg) => Promise<Result>;
  isRunning: boolean;
};

function useRevalidateProducts(): () => Promise<void> {
  const { mutate } = useSWRConfig();
  return async () => {
    await mutate(isProductsKey);
  };
}

export function useCreateProduct(): MutationResult<CreateProduct, Product> {
  const revalidate = useRevalidateProducts();
  const { trigger, isMutating } = useSWRMutation<
    Product,
    ApiError,
    readonly string[],
    CreateProduct
  >(["products", "mutation", "create"], (_key, { arg }) => createProduct(arg));
  return {
    run: async (arg) => {
      const product = await trigger(arg);
      await revalidate();
      return product;
    },
    isRunning: isMutating,
  };
}

export function useQuickCreateProduct(): MutationResult<QuickCreateProduct, Product> {
  const revalidate = useRevalidateProducts();
  const { trigger, isMutating } = useSWRMutation<
    Product,
    ApiError,
    readonly string[],
    QuickCreateProduct
  >(["products", "mutation", "quick-create"], (_key, { arg }) => quickCreateProduct(arg));
  return {
    run: async (arg) => {
      const product = await trigger(arg);
      await revalidate();
      return product;
    },
    isRunning: isMutating,
  };
}

export function useUpdateProduct(id: string): MutationResult<UpdateProduct, ProductDetail> {
  const revalidate = useRevalidateProducts();
  const { trigger, isMutating } = useSWRMutation<
    ProductDetail,
    ApiError,
    readonly string[],
    UpdateProduct
  >(["products", "mutation", "update", id], (_key, { arg }) => updateProduct(id, arg));
  return {
    run: async (arg) => {
      const product = await trigger(arg);
      await revalidate();
      return product;
    },
    isRunning: isMutating,
  };
}

/** Activates or deactivates any product (from the list or the edit screen). */
export function useToggleProductActive(): MutationResult<
  { id: string; isActive: boolean },
  Product
> {
  const revalidate = useRevalidateProducts();
  const { trigger, isMutating } = useSWRMutation<
    Product,
    ApiError,
    readonly string[],
    { id: string; isActive: boolean }
  >(["products", "mutation", "active"], (_key, { arg }) => setProductActive(arg.id, arg.isActive));
  return {
    run: async (arg) => {
      const product = await trigger(arg);
      await revalidate();
      return product;
    },
    isRunning: isMutating,
  };
}
