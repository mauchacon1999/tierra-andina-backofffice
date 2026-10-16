"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  allowedSaleUnits,
  requiresPackQuantity,
  SALE_UNITS,
  type PurchaseUnit,
  type SaleUnit,
} from "@ta/core";
import {
  quickProductFormSchema,
  type Product,
  type QuickCreateProduct,
  type QuickProductFormValues,
} from "@ta/validators";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useQuickCreateProduct } from "@/features/products/api/use-product-mutations";
import {
  packQuantityLabel,
  SALE_UNIT_LABELS,
  SALE_UNIT_SUFFIX,
} from "@/features/products/helpers/unit-labels";
import { isApiError } from "@/lib/api";

export type UseQuickProductFormResult = {
  form: UseFormReturn<QuickProductFormValues, unknown, QuickCreateProduct>;
  purchaseUnit: PurchaseUnit;
  saleUnit: SaleUnit;
  setPurchaseUnit: (unit: PurchaseUnit) => void;
  setSaleUnit: (unit: SaleUnit) => void;
  saleUnitOptions: { value: SaleUnit; label: string; disabled: boolean }[];
  showPackQuantity: boolean;
  packQuantityLabel: string | null;
  saleUnitSuffix: string;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

const DEFAULTS: QuickProductFormValues = {
  name: "",
  purchaseUnit: "crate",
  saleUnit: "kg",
  defaultPackQuantity: "",
};

/**
 * "Nuevo producto" from the purchase screen (products.md §1.6): name, units and pack quantity
 * only. Calls `onCreated` with the new product so the purchase line can use it right away.
 */
export function useQuickProductForm(
  onCreated: (product: Product) => void,
): UseQuickProductFormResult {
  const form = useForm<QuickProductFormValues, unknown, QuickCreateProduct>({
    resolver: zodResolver(quickProductFormSchema),
    defaultValues: DEFAULTS,
  });
  const quickCreate = useQuickCreateProduct();
  const [purchaseUnit, saleUnit] = useWatch({
    control: form.control,
    name: ["purchaseUnit", "saleUnit"],
  }) as [PurchaseUnit, SaleUnit];
  const allowed = allowedSaleUnits(purchaseUnit);

  const onSubmit = form.handleSubmit(async (payload) => {
    try {
      const product = await quickCreate.run(payload);
      form.reset(DEFAULTS);
      onCreated(product);
    } catch (error) {
      const fieldErrors = isApiError(error)
        ? (error.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
        : undefined;
      const nameError = fieldErrors?.name?.[0];
      if (nameError) form.setError("name", { message: nameError }, { shouldFocus: true });
      else {
        form.setError("root", {
          message: isApiError(error) ? error.message : "No se pudo crear el producto",
        });
      }
    }
  });

  return {
    form,
    purchaseUnit,
    saleUnit,
    setPurchaseUnit: (unit) => {
      form.setValue("purchaseUnit", unit);
      const nextAllowed = allowedSaleUnits(unit);
      if (!nextAllowed.includes(saleUnit)) form.setValue("saleUnit", nextAllowed[0] ?? "kg");
      if (!requiresPackQuantity(unit)) form.setValue("defaultPackQuantity", "");
    },
    setSaleUnit: (unit) => form.setValue("saleUnit", unit),
    saleUnitOptions: SALE_UNITS.map((unit) => ({
      value: unit,
      label: SALE_UNIT_LABELS[unit],
      disabled: !allowed.includes(unit),
    })),
    showPackQuantity: requiresPackQuantity(purchaseUnit),
    packQuantityLabel: packQuantityLabel(purchaseUnit, saleUnit),
    saleUnitSuffix: SALE_UNIT_SUFFIX[saleUnit],
    onSubmit: () => onSubmit(),
    isSubmitting: quickCreate.isRunning,
    formError: form.formState.errors.root?.message,
  };
}
