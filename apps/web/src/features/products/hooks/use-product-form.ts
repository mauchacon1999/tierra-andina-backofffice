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
  productFormSchema,
  type CreateProduct,
  type Product,
  type ProductDetail,
  type ProductFormValues,
} from "@ta/validators";
import { useEffect, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useCreateProduct, useUpdateProduct } from "@/features/products/api/use-product-mutations";
import {
  EMPTY_PRODUCT_FORM,
  emptyProductForm,
  productToFormValues,
  toFormField,
} from "@/features/products/helpers/product-form-values";
import type { PriceExampleInput } from "@/features/products/hooks/use-price-example";
import {
  packQuantityLabel,
  SALE_UNIT_LABELS,
  SALE_UNIT_SUFFIX,
} from "@/features/products/helpers/unit-labels";
import { useSettings } from "@/features/settings/api/use-settings";
import { isApiError } from "@/lib/api";

export type UseProductFormOptions =
  | { mode: "create" }
  | { mode: "edit"; product: ProductDetail; onSaved?: (product: ProductDetail) => void };

export type UseProductFormResult = {
  form: UseFormReturn<ProductFormValues, unknown, CreateProduct>;
  purchaseUnit: PurchaseUnit;
  saleUnit: SaleUnit;
  /** Changing to "kg" forces sale unit "kg" and clears the pack quantity (products.md §2). */
  setPurchaseUnit: (unit: PurchaseUnit) => void;
  setSaleUnit: (unit: SaleUnit) => void;
  saleUnitOptions: { value: SaleUnit; label: string; disabled: boolean }[];
  /** Units cannot change: the product is used by a purchase or price list line. */
  isUnitLocked: boolean;
  showPackQuantity: boolean;
  packQuantityLabel: string | null;
  /** "kg" / "und" after quantities in the sale unit. */
  saleUnitSuffix: string;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
  /** Current values the live price example needs. */
  priceExampleInput: PriceExampleInput;
  /** Edit mode: the last save succeeded and nothing changed since. */
  isSaved: boolean;
  /** Product just created (create mode), to offer "Crear otro". */
  created: Product | null;
  /** Clears the form to create another product, keeping the units and category. */
  resetForAnother: () => void;
};

const FALLBACK_ERROR = "No se pudo guardar el producto. Intenta de nuevo";

/** Product create/edit form logic (docs/modules/products.md §2). */
export function useProductForm(options: UseProductFormOptions): UseProductFormResult {
  const isEdit = options.mode === "edit";
  const form = useForm<ProductFormValues, unknown, CreateProduct>({
    resolver: zodResolver(productFormSchema),
    defaultValues: isEdit ? productToFormValues(options.product) : EMPTY_PRODUCT_FORM,
  });
  const { settings, isLoaded: settingsLoaded } = useSettings();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(isEdit ? options.product.id : "");
  const [created, setCreated] = useState<Product | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  const [purchaseUnit, saleUnit, defaultPackQuantity, lastShrinkage, lastMarginPercent] = useWatch({
    control: form.control,
    name: ["purchaseUnit", "saleUnit", "defaultPackQuantity", "lastShrinkage", "lastMarginPercent"],
  }) as [PurchaseUnit, SaleUnit, string, string, string];
  const allowed = allowedSaleUnits(purchaseUnit);

  // A new product starts at the store default margin once the settings arrive (unless edited).
  const defaultMarginPercent = emptyProductForm(settings.defaultMargin).lastMarginPercent;
  useEffect(() => {
    if (isEdit || !settingsLoaded || form.getFieldState("lastMarginPercent").isDirty) return;
    form.setValue("lastMarginPercent", defaultMarginPercent);
  }, [isEdit, settingsLoaded, defaultMarginPercent, form]);

  const setPurchaseUnit = (unit: PurchaseUnit): void => {
    form.setValue("purchaseUnit", unit, { shouldDirty: true });
    const nextAllowed = allowedSaleUnits(unit);
    if (!nextAllowed.includes(saleUnit)) {
      form.setValue("saleUnit", nextAllowed[0] ?? "kg", { shouldDirty: true });
    }
    if (!requiresPackQuantity(unit)) {
      form.setValue("defaultPackQuantity", "", { shouldDirty: true });
      form.clearErrors("defaultPackQuantity");
    }
  };

  const setSaleUnit = (unit: SaleUnit): void => {
    form.setValue("saleUnit", unit, { shouldDirty: true });
  };

  const showServerError = (error: unknown): void => {
    if (!isApiError(error)) {
      form.setError("root", { message: FALLBACK_ERROR });
      return;
    }
    const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> } | undefined)
      ?.fieldErrors;
    let placed = false;
    for (const [apiField, messages] of Object.entries(fieldErrors ?? {})) {
      const field = toFormField(apiField);
      if (field && messages[0]) {
        form.setError(field, { message: messages[0] }, { shouldFocus: !placed });
        placed = true;
      }
    }
    if (!placed) form.setError("root", { message: error.message });
  };

  const onSubmit = form.handleSubmit(async (payload) => {
    try {
      if (options.mode === "edit") {
        const saved = await updateProduct.run(payload);
        form.reset(productToFormValues(saved));
        setHasSaved(true);
        options.onSaved?.(saved);
      } else {
        setCreated(await createProduct.run(payload));
      }
    } catch (error) {
      showServerError(error);
    }
  });

  return {
    form,
    purchaseUnit,
    saleUnit,
    setPurchaseUnit,
    setSaleUnit,
    saleUnitOptions: SALE_UNITS.map((unit) => ({
      value: unit,
      label: SALE_UNIT_LABELS[unit],
      disabled: !allowed.includes(unit),
    })),
    isUnitLocked: isEdit && options.product.isUnitLocked,
    showPackQuantity: requiresPackQuantity(purchaseUnit),
    packQuantityLabel: packQuantityLabel(purchaseUnit, saleUnit),
    saleUnitSuffix: SALE_UNIT_SUFFIX[saleUnit],
    onSubmit: () => onSubmit(),
    isSubmitting: createProduct.isRunning || updateProduct.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
    priceExampleInput: {
      purchaseUnit,
      saleUnit,
      defaultPackQuantity,
      lastShrinkage,
      lastMarginPercent,
      usdRoundingStep: settings.usdRoundingStep,
    },
    isSaved: hasSaved && !form.formState.isDirty,
    created,
    resetForAnother: () => {
      const { categoryId } = form.getValues();
      form.reset({
        ...emptyProductForm(settings.defaultMargin),
        categoryId,
        purchaseUnit,
        saleUnit,
      });
      setCreated(null);
    },
  };
}
