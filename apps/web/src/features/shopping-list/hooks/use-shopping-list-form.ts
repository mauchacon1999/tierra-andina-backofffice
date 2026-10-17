"use client";

import {
  createShoppingListItemSchema,
  type CreateShoppingListItem,
  type CreateShoppingListItemInput,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import type { SelectOption } from "@/components/ui/select-field";
import { useProducts } from "@/features/products/api/use-products";
import { useAddShoppingItem } from "@/features/shopping-list/api/use-shopping-list";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { isApiError } from "@/lib/api";

const PRODUCT_QUERY = { pageSize: 100 } as const;

const EMPTY: CreateShoppingListItemInput = { productId: "", note: "" };

export type UseShoppingListFormResult = {
  form: ReturnType<typeof useForm<CreateShoppingListItemInput, unknown, CreateShoppingListItem>>;
  productOptions: SelectOption[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
};

/** Adds one product the shop is missing. */
export function useShoppingListForm(): UseShoppingListFormResult {
  const t = useTranslations("shoppingList");
  const errorMessage = useErrorMessage();
  const form = useForm<CreateShoppingListItemInput, unknown, CreateShoppingListItem>({
    resolver: useZodResolver(createShoppingListItemSchema),
    defaultValues: EMPTY,
  });
  const { page } = useProducts(PRODUCT_QUERY);
  const add = useAddShoppingItem();

  const productOptions = useMemo(
    () => (page?.data ?? []).map((product) => ({ value: product.id, label: product.name })),
    [page],
  );

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await add.run(input);
      form.reset(EMPTY);
    } catch (error) {
      form.setError("root", {
        message: isApiError(error) ? errorMessage(error, t("saveFailed")) : t("saveFailed"),
      });
    }
  });

  return { form, productOptions, onSubmit, isSubmitting: add.isRunning };
}
