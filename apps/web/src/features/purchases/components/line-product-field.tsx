"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ComboboxField } from "@/components/ui/combobox-field";
import type { UseLineFormResult } from "@/features/purchases/hooks/use-line-form";

export type LineProductFieldProps = {
  f: UseLineFormResult;
};

/** Product select of the line, with "Nuevo producto" for one not in the catalog yet. */
export function LineProductField({ f }: LineProductFieldProps): React.JSX.Element {
  const t = useTranslations("purchases.line");
  const tc = useTranslations("common");

  return (
    <div className="space-y-1">
      <ComboboxField
        label={t("product")}
        required
        placeholder={t("productPlaceholder")}
        options={f.productOptions}
        value={f.form.watch("productId")}
        onValueChange={(productId) => {
          if (productId === "") {
            f.form.setValue("productId", "", { shouldDirty: true });
            return;
          }
          f.selectProduct(productId);
        }}
        error={f.form.formState.errors.productId?.message}
        emptyText={tc("noMatches")}
        openLabel={tc("showOptions")}
      />
      {!f.isEdit && (
        <Button variant="ghost" size="sm" onClick={() => f.setIsCreatingProduct(true)}>
          {t("newProduct")}
        </Button>
      )}
    </div>
  );
}
