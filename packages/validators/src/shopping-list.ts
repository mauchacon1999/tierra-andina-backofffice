import { z } from "zod";

import { message } from "./messages";

/*
 * Shopping list (domain-model §3.5): what the shop needs before a Coche trip.
 * Buying a product checks the oldest open item off; dropping it means it will not be bought.
 */

const noteSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().max(200, message("text.tooLong", { max: 200 })));

export const SHOPPING_LIST_STATUSES = ["open", "bought", "dropped"] as const;

/** POST /api/v1/shopping-list — one product the shop is missing. */
export const createShoppingListItemSchema = z.object({
  productId: z.uuid({ error: message("purchase.productRequired") }),
  note: noteSchema.optional(),
});

export type CreateShoppingListItemInput = z.input<typeof createShoppingListItemSchema>;
export type CreateShoppingListItem = z.output<typeof createShoppingListItemSchema>;

export const shoppingListItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  note: z.string().nullable(),
  status: z.enum(SHOPPING_LIST_STATUSES),
  purchaseLineId: z.uuid().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

/** GET /api/v1/shopping-list — open items, oldest first (what is still to buy). */
export const shoppingListSchema = z.object({ data: z.array(shoppingListItemSchema) });
export type ShoppingList = z.infer<typeof shoppingListSchema>;
