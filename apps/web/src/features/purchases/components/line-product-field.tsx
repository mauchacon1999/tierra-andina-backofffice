"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { UseLineFormResult } from "@/features/purchases/hooks/use-line-form";

export type LineProductFieldProps = {
  f: UseLineFormResult;
};

/** Product select of the line, with "Nuevo producto" for one not in the catalog yet. */
export function LineProductField({ f }: LineProductFieldProps): React.JSX.Element {
  const t = useTranslations("purchases.line");

  return (
    <div className="space-y-1">
      <SelectField
        label={t("product")}
        required
        placeholder={t("productPlaceholder")}
        options={f.productOptions}
        value={f.form.watch("productId")}
        error={f.form.formState.errors.productId?.message}
        onChange={(event) => f.selectProduct(event.target.value)}
      />
      {!f.isEdit && (
        <Button variant="ghost" size="sm" onClick={() => f.setIsCreatingProduct(true)}>
          {t("newProduct")}
        </Button>
      )}
    </div>
  );
}
