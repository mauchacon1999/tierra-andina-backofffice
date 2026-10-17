"use client";

import type { PurchaseLine, TripDetail } from "@ta/validators";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { ProductQuickForm } from "@/features/products/components/product-quick-form";
import { LinePreview } from "@/features/purchases/components/line-preview";
import { LineProductField } from "@/features/purchases/components/line-product-field";
import { PAYMENT_STATUS_LABELS } from "@/features/purchases/helpers/line-labels";
import { useLineForm } from "@/features/purchases/hooks/use-line-form";

export type PurchaseLineFormProps = {
  trip: TripDetail;
  line?: PurchaseLine;
  onDone?: () => void;
  onCancel?: () => void;
};

const PAYMENT_OPTIONS = (["paid", "credit"] as const).map((value) => ({
  value,
  label: PAYMENT_STATUS_LABELS[value],
}));

/** Add or edit one purchase of the trip, with its cost computed while typing. */
export function PurchaseLineForm({
  trip,
  line,
  onDone,
  onCancel,
}: PurchaseLineFormProps): React.JSX.Element {
  const f = useLineForm({ trip, ...(line ? { line } : {}), ...(onDone ? { onDone } : {}) });
  const { errors } = f.form.formState;
  const decimal = { inputMode: "decimal", autoComplete: "off" } as const;

  // The quick form is a <form> of its own: it replaces this one instead of nesting.
  if (f.isCreatingProduct) {
    return (
      <Card tone="muted" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Nuevo producto</h3>
          <Button variant="ghost" size="sm" onClick={() => f.setIsCreatingProduct(false)}>
            Volver a la compra
          </Button>
        </div>
        <ProductQuickForm onCreated={f.onProductCreated} />
      </Card>
    );
  }

  return (
    <form
      noValidate
      aria-label={f.isEdit ? "Editar compra" : "Agregar compra"}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <LineProductField f={f} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Proveedor"
          placeholder="Sin proveedor registrado"
          options={f.supplierOptions}
          {...f.form.register("supplierId")}
        />
        <TextField
          label="Puesto"
          autoComplete="off"
          hint="Nombre o número del puesto."
          error={errors.stallReference?.message}
          {...f.form.register("stallReference")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TextField
          label={f.packsLabel}
          required
          {...decimal}
          error={errors.packs?.message}
          {...f.form.register("packs")}
        />
        <TextField
          label="Cantidad bruta"
          required
          {...decimal}
          suffix={f.quantitySuffix}
          error={errors.grossQuantity?.message}
          {...f.form.register("grossQuantity")}
        />
        <TextField
          label="Merma"
          {...decimal}
          suffix={f.quantitySuffix}
          error={errors.shrinkage?.message}
          {...f.form.register("shrinkage")}
        />
        <TextField
          label="Precio total"
          required
          {...decimal}
          suffix="$"
          hint="Lo que pide el puesto por todo."
          error={errors.quotedPriceUsd?.message}
          {...f.form.register("quotedPriceUsd")}
        />
        <TextField
          label="Tasa del puesto"
          {...decimal}
          suffix="Bs"
          placeholder={f.supplierRatePlaceholder}
          hint="Vacía: la de Coche."
          error={errors.supplierRate?.message}
          {...f.form.register("supplierRate")}
        />
        <TextField
          label="Margen"
          required
          {...decimal}
          suffix="%"
          error={errors.marginPercent?.message}
          {...f.form.register("marginPercent")}
        />
      </div>
      <SegmentedControl
        label="Pago"
        name="paymentStatus"
        options={PAYMENT_OPTIONS}
        value={f.form.watch("paymentStatus")}
        onChange={(value) => f.form.setValue("paymentStatus", value, { shouldDirty: true })}
      />
      <LinePreview preview={f.preview} quantitySuffix={f.quantitySuffix} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          isLoading={f.isSubmitting}
          loadingText="Guardando…"
        >
          {f.isEdit ? "Guardar cambios" : "Agregar compra"}
        </Button>
        {onCancel && (
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
