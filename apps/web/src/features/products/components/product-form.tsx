"use client";

import type { ProductDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useProductCategories } from "@/features/products/api/use-product-categories";
import { PriceExample } from "@/features/products/components/price-example";
import { UnitSelector } from "@/features/products/components/unit-selector";
import {
  useProductForm,
  type UseProductFormOptions,
} from "@/features/products/hooks/use-product-form";

export type ProductFormProps =
  | { mode: "create" }
  | { mode: "edit"; product: ProductDetail; onSaved?: (product: ProductDetail) => void };

/** Create / edit form (docs/modules/products.md §2). */
export function ProductForm(props: ProductFormProps): React.JSX.Element {
  const options: UseProductFormOptions = props;
  const f = useProductForm(options);
  const t = useTranslations("products.form");
  const tc = useTranslations("common");
  const { categories } = useProductCategories();
  const { errors } = f.form.formState;

  if (f.created) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title={t("created")}>
          {t("createdBody", { name: f.created.name })}
        </Alert>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={f.resetForAnother}>{t("createAnother")}</Button>
          <ButtonLink href="/products" variant="secondary">
            {t("viewProducts")}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      {f.isSaved && <Alert tone="success">{t("saved")}</Alert>}

      <TextField
        label={t("name")}
        required
        autoComplete="off"
        error={errors.name?.message}
        {...f.form.register("name")}
      />
      <SelectField
        label={t("category")}
        required
        placeholder={t("categoryPlaceholder")}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        error={errors.categoryId?.message}
        {...f.form.register("categoryId")}
      />

      <UnitSelector
        purchaseUnit={f.purchaseUnit}
        saleUnit={f.saleUnit}
        onPurchaseUnitChange={f.setPurchaseUnit}
        onSaleUnitChange={f.setSaleUnit}
        saleUnitOptions={f.saleUnitOptions}
        isLocked={f.isUnitLocked}
        saleUnitError={errors.saleUnit?.message}
      />

      {f.showPackQuantity && f.packQuantityLabel && (
        <TextField
          label={f.packQuantityLabel}
          required
          inputMode="decimal"
          autoComplete="off"
          suffix={f.saleUnitSuffix}
          error={errors.defaultPackQuantity?.message}
          {...f.form.register("defaultPackQuantity")}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("shrinkage")}
          inputMode="decimal"
          autoComplete="off"
          suffix={f.saleUnitSuffix}
          hint={t("shrinkageHint")}
          error={errors.lastShrinkage?.message}
          {...f.form.register("lastShrinkage")}
        />
        <TextField
          label={t("margin")}
          inputMode="decimal"
          autoComplete="off"
          suffix="%"
          hint={t("marginHint")}
          error={errors.lastMarginPercent?.message}
          {...f.form.register("lastMarginPercent")}
        />
      </div>

      <PriceExample input={f.priceExampleInput} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink href="/products" variant="secondary">
          {tc("cancel")}
        </ButtonLink>
        <Button type="submit" isLoading={f.isSubmitting} loadingText={tc("saving")}>
          {props.mode === "create" ? t("create") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
