import type { ProductListQueryInput } from "@ta/validators";

/** SWR keys. Always use this factory: never write keys inline (CLAUDE.md §10). */
export const queryKeys = {
  me: ["me"] as const,
  products: {
    all: ["products"] as const,
    list: (params: ProductListQueryInput) => ["products", "list", params] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  },
  productCategories: ["product-categories"] as const,
};

/** True for every key under `queryKeys.products` (to revalidate lists and details at once). */
export function isProductsKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === queryKeys.products.all[0];
}
