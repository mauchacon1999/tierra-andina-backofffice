"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Card } from "@/components/ui/card";
import { ShoppingListForm } from "@/features/shopping-list/components/shopping-list-form";
import { useShoppingListTable } from "@/features/shopping-list/hooks/use-shopping-list-table";
import { useErrorMessage } from "@/i18n/use-error-message";

/** Collect what the shop needs; the Coche trip checks items off as they are bought. */
export function ShoppingListScreen(): React.JSX.Element {
  const table = useShoppingListTable();
  const t = useTranslations("shoppingList");
  const errorMessage = useErrorMessage();

  return (
    <div className="space-y-6">
      <Card>
        <ShoppingListForm />
      </Card>
      <DataTable
        label={t("label")}
        data={table.items}
        columns={table.columns}
        getRowId={(item) => item.id}
        rowName={(item) => item.productName}
        rowActions={table.rowActions}
        isLoading={table.isLoading}
        error={
          table.error && {
            title: t("loadFailed"),
            message: errorMessage(table.error, table.error.message),
            onRetry: table.retry,
          }
        }
        empty={<p className="text-muted">{t("empty")}</p>}
      />
    </div>
  );
}
