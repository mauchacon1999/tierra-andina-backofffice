import type { ProductListQueryInput, TripListQueryInput } from "@ta/validators";

/** SWR keys. Always use this factory: never write keys inline (CLAUDE.md §10). */
export const queryKeys = {
  me: ["me"] as const,
  settings: ["settings"] as const,
  products: {
    all: ["products"] as const,
    list: (params: ProductListQueryInput) => ["products", "list", params] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  },
  productCategories: ["product-categories"] as const,
  exchangeRates: {
    all: ["exchange-rates"] as const,
    day: (date: string) => ["exchange-rates", "day", date] as const,
    range: (from: string, to: string) => ["exchange-rates", "range", from, to] as const,
  },
  suppliers: ["suppliers"] as const,
  receipts: ["receipts"] as const,
  shoppingList: ["shopping-list"] as const,
  priceLists: {
    current: ["price-lists", "current"] as const,
  },
  trips: {
    all: ["trips"] as const,
    list: (params: TripListQueryInput) => ["trips", "list", params] as const,
    detail: (id: string) => ["trips", "detail", id] as const,
  },
};

function startsWith(prefix: readonly string[]) {
  return (key: unknown): boolean => Array.isArray(key) && key[0] === prefix[0];
}

/** Match every key of a group, to revalidate lists and details at once. */
export const isProductsKey = startsWith(queryKeys.products.all);
export const isExchangeRatesKey = startsWith(queryKeys.exchangeRates.all);
export const isTripsKey = startsWith(queryKeys.trips.all);
