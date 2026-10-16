"use client";

import type { ProductDetail } from "@ta/validators";

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
  const { categories } = useProductCategories();
  const { errors } = f.form.formState;

  if (f.created) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Producto creado">
          {f.created.name} ya está en el catálogo.
        </Alert>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={f.resetForAnother}>Crear otro</Button>
          <ButtonLink href="/products" variant="secondary">
            Ver productos
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
      {f.isSaved && <Alert tone="success">Cambios guardados.</Alert>}

      <TextField
        label="Nombre"
        required
        autoComplete="off"
        error={errors.name?.message}
        {...f.form.register("name")}
      />
      <SelectField
        label="Categoría"
        required
        placeholder="Elige una categoría"
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
          label="Merma habitual"
          inputMode="decimal"
          autoComplete="off"
          suffix={f.saleUnitSuffix}
          hint="En la unidad de venta. Se sugiere al comprar."
          error={errors.lastShrinkage?.message}
          {...f.form.register("lastShrinkage")}
        />
        <TextField
          label="Margen habitual"
          inputMode="decimal"
          autoComplete="off"
          suffix="%"
          hint="Entre 0 y 500 %."
          error={errors.lastMarginPercent?.message}
          {...f.form.register("lastMarginPercent")}
        />
      </div>

      <PriceExample input={f.priceExampleInput} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink href="/products" variant="secondary">
          Cancelar
        </ButtonLink>
        <Button type="submit" isLoading={f.isSubmitting} loadingText="Guardando…">
          {props.mode === "create" ? "Crear producto" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
