import {
  shoppingListItemSchema,
  shoppingListSchema,
  type CreateShoppingListItem,
  type ShoppingList,
  type ShoppingListItem,
} from "@ta/validators";

import { api } from "@/lib/api";

/** Open requests, oldest first. */
export function listShoppingItems(): Promise<ShoppingList> {
  return api.get("/api/v1/shopping-list", { schema: shoppingListSchema });
}

export function createShoppingItem(input: CreateShoppingListItem): Promise<ShoppingListItem> {
  return api.post("/api/v1/shopping-list", input, { schema: shoppingListItemSchema });
}

export function dropShoppingItem(id: string): Promise<ShoppingListItem> {
  return api.post(`/api/v1/shopping-list/${id}/drop`, undefined, {
    schema: shoppingListItemSchema,
  });
}
