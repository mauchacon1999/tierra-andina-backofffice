"use client";

import type { Product } from "@ta/validators";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { UnitSelector } from "@/features/products/components/unit-selector";
import { useQuickProductForm } from "@/features/products/hooks/use-quick-product-form";

export type ProductQuickFormProps = {
  onCreated: (product: Product) => void;
};

/** Minimal "Nuevo producto" for the purchase screen; category is fixed later from the catalog. */
export function ProductQuickForm({ onCreated }: ProductQuickFormProps): React.JSX.Element {
  const q = useQuickProductForm(onCreated);
  const { errors } = q.form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void q.onSubmit();
      }}
    >
      {q.formError && <Alert tone="error">{q.formError}</Alert>}
      <TextField
        label="Nombre"
        required
        autoComplete="off"
        error={errors.name?.message}
        {...q.form.register("name")}
      />
      <UnitSelector
        purchaseUnit={q.purchaseUnit}
        saleUnit={q.saleUnit}
        onPurchaseUnitChange={q.setPurchaseUnit}
        onSaleUnitChange={q.setSaleUnit}
        saleUnitOptions={q.saleUnitOptions}
        isLocked={false}
        saleUnitError={errors.saleUnit?.message}
      />
      {q.showPackQuantity && q.packQuantityLabel && (
        <TextField
          label={q.packQuantityLabel}
          required
          inputMode="decimal"
          autoComplete="off"
          suffix={q.saleUnitSuffix}
          error={errors.defaultPackQuantity?.message}
          {...q.form.register("defaultPackQuantity")}
        />
      )}
      <Button type="submit" className="w-full" isLoading={q.isSubmitting} loadingText="Creando…">
        Crear producto
      </Button>
    </form>
  );
}
