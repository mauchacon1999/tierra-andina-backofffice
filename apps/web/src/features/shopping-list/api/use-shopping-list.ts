"use client";

import type { CreateShoppingListItem, ShoppingList, ShoppingListItem } from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  createShoppingItem,
  dropShoppingItem,
  listShoppingItems,
} from "@/features/shopping-list/api/shopping-list-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const NO_ITEMS: ShoppingListItem[] = [];

export type UseShoppingListResult = {
  items: ShoppingListItem[];
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** What is still to buy at Coche. */
export function useShoppingList(): UseShoppingListResult {
  const { data, error, isLoading, mutate } = useSWR<ShoppingList, ApiError>(
    queryKeys.shoppingList,
    listShoppingItems,
  );
  return { items: data?.data ?? NO_ITEMS, isLoading, error, retry: () => void mutate() };
}

export function useAddShoppingItem(): {
  run: (input: CreateShoppingListItem) => Promise<ShoppingListItem>;
  isRunning: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<
    ShoppingListItem,
    ApiError,
    readonly string[],
    CreateShoppingListItem
  >(["shopping-list", "mutation", "add"], (_key, { arg }) => createShoppingItem(arg));
  return {
    run: async (input) => {
      const item = await trigger(input);
      await mutate(queryKeys.shoppingList);
      return item;
    },
    isRunning: isMutating,
  };
}

export function useDropShoppingItem(): {
  run: (id: string) => Promise<ShoppingListItem>;
  isRunning: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<
    ShoppingListItem,
    ApiError,
    readonly string[],
    string
  >(["shopping-list", "mutation", "drop"], (_key, { arg }) => dropShoppingItem(arg));
  return {
    run: async (id) => {
      const item = await trigger(id);
      await mutate(queryKeys.shoppingList);
      return item;
    },
    isRunning: isMutating,
  };
}
