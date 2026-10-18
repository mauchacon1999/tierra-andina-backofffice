"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ComboboxField } from "@/components/ui/combobox-field";
import { TextField } from "@/components/ui/text-field";
import { useShoppingListForm } from "@/features/shopping-list/hooks/use-shopping-list-form";

/** Asks for one product the shop needs before the Coche trip. */
export function ShoppingListForm(): React.JSX.Element {
  const f = useShoppingListForm();
  const t = useTranslations("shoppingList");
  const tc = useTranslations("common");
  const { errors } = f.form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      <h2 className="font-semibold">{t("addTitle")}</h2>
      {errors.root?.message && <Alert tone="error">{errors.root.message}</Alert>}
      <ComboboxField
        label={t("product")}
        options={f.productOptions}
        placeholder={t("productPlaceholder")}
        required
        value={f.form.watch("productId")}
        onValueChange={(productId) =>
          f.form.setValue("productId", productId, {
            shouldDirty: true,
            shouldValidate: productId !== "",
          })
        }
        error={errors.productId?.message}
        emptyText={tc("noMatches")}
        openLabel={tc("showOptions")}
      />
      <TextField
        label={t("note")}
        autoComplete="off"
        hint={tc("optional")}
        error={errors.note?.message}
        {...f.form.register("note")}
      />
      <Button type="submit" isLoading={f.isSubmitting} loadingText={t("saving")}>
        {t("add")}
      </Button>
    </form>
  );
}
