"use client";

import type { ShoppingListItem } from "@ta/validators";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import {
  useDropShoppingItem,
  useShoppingList,
} from "@/features/shopping-list/api/use-shopping-list";

export type UseShoppingListTableResult = ReturnType<typeof useShoppingList> & {
  columns: DataColumn<ShoppingListItem>[];
  rowActions: (item: ShoppingListItem) => RowAction[];
};

/** Pending requests: product, note, and drop. */
export function useShoppingListTable(): UseShoppingListTableResult {
  const list = useShoppingList();
  const drop = useDropShoppingItem();
  const t = useTranslations("shoppingList");

  const columns = useMemo(
    (): DataColumn<ShoppingListItem>[] => [
      {
        id: "product",
        header: t("columns.product"),
        cell: (item) => item.productName,
        isPrimary: true,
      },
      { id: "note", header: t("columns.note"), cell: (item) => item.note ?? "" },
    ],
    [t],
  );

  const rowActions = (item: ShoppingListItem): RowAction[] => [
    {
      id: "drop",
      label: t("drop"),
      icon: Trash2,
      tone: "danger",
      confirm: {
        question: t("dropQuestion", { product: item.productName }),
        confirmLabel: t("drop"),
      },
      onSelect: () => {
        void drop.run(item.id);
      },
    },
  ];

  return { ...list, columns, rowActions };
}
