"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  estimateGrossQuantity,
  fractionToPercent,
  normalizeDecimal,
  type PurchaseUnit,
} from "@ta/core";
import {
  purchaseLineFormSchema,
  type Product,
  type PurchaseLine,
  type PurchaseLineFields,
  type PurchaseLineFormValues,
  type TripDetail,
} from "@ta/validators";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import type { SelectOption } from "@/components/ui/select-field";
import { useProducts } from "@/features/products/api/use-products";
import { SALE_UNIT_SUFFIX } from "@/features/products/helpers/unit-labels";
import { useAddLine, useUpdateLine } from "@/features/purchases/api/use-trip-mutations";
import { useSuppliers } from "@/features/purchases/api/use-trips";
import { PACKS_LABELS } from "@/features/purchases/helpers/line-labels";
import { computeLinePreview, type LinePreview } from "@/features/purchases/helpers/line-preview";
import { useSettings } from "@/features/settings/api/use-settings";
import { isApiError } from "@/lib/api";

export type UseLineFormOptions = {
  trip: TripDetail;
  /** Edit this line instead of adding a new one. */
  line?: PurchaseLine;
  /** Called after a successful save (edit mode closes the form). */
  onDone?: () => void;
};

export type UseLineFormResult = {
  form: UseFormReturn<PurchaseLineFormValues, unknown, PurchaseLineFields>;
  isEdit: boolean;
  productOptions: SelectOption[];
  supplierOptions: SelectOption[];
  /** Picks a product and pre-fills its last shrinkage and margin. */
  selectProduct: (productId: string) => void;
  /** "Nuevo producto" finished: select it right away. */
  onProductCreated: (product: Product) => void;
  isCreatingProduct: boolean;
  setIsCreatingProduct: (value: boolean) => void;
  packsLabel: string;
  /** "kg" / "und": gross quantity and shrinkage are in the sale unit. */
  quantitySuffix: string;
  /** Shown in the empty supplier-rate field: the trip's Coche rate is used. */
  supplierRatePlaceholder: string;
  preview: LinePreview | null;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

const PRODUCT_QUERY = { pageSize: 100 } as const;
const FALLBACK_ERROR = "No se pudo guardar la compra. Intenta de nuevo";

const EMPTY: PurchaseLineFormValues = {
  productId: "",
  supplierId: "",
  stallReference: "",
  packs: "",
  grossQuantity: "",
  shrinkage: "0",
  quotedPriceUsd: "",
  supplierRate: "",
  marginPercent: "",
  paymentStatus: "paid",
};

function lineToFormValues(line: PurchaseLine): PurchaseLineFormValues {
  return {
    productId: line.productId,
    supplierId: line.supplierId ?? "",
    stallReference: line.stallReference ?? "",
    packs: normalizeDecimal(line.packs),
    grossQuantity: normalizeDecimal(line.grossQuantity),
    shrinkage: normalizeDecimal(line.shrinkage),
    quotedPriceUsd: normalizeDecimal(line.quotedPriceUsd),
    supplierRate: normalizeDecimal(line.supplierRate),
    marginPercent: fractionToPercent(line.margin),
    paymentStatus: line.paymentStatus,
  };
}

/** API field names → form fields (the margin is typed as a percent). */
function toFormField(apiField: string): keyof PurchaseLineFormValues | null {
  if (apiField === "margin") return "marginPercent";
  return apiField in EMPTY ? (apiField as keyof PurchaseLineFormValues) : null;
}

/**
 * Purchase line form (docs/plan.md phase 1): product, stall, packs, gross quantity, shrinkage,
 * quoted total, supplier rate and margin, with the cost computed live. A new line pre-fills
 * the product's last shrinkage and margin and estimates the gross quantity from the packs.
 */
export function useLineForm({ trip, line, onDone }: UseLineFormOptions): UseLineFormResult {
  const isEdit = line !== undefined;
  const form = useForm<PurchaseLineFormValues, unknown, PurchaseLineFields>({
    resolver: zodResolver(purchaseLineFormSchema),
    defaultValues: line ? lineToFormValues(line) : EMPTY,
  });
  const { settings } = useSettings();
  const { page } = useProducts(PRODUCT_QUERY);
  const { suppliers } = useSuppliers();
  const addLine = useAddLine(trip.id);
  const updateLine = useUpdateLine(trip.id);
  const [created, setCreated] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  const products = useMemo(() => {
    const list = page?.data ?? [];
    return created && !list.some((p) => p.id === created.id) ? [created, ...list] : list;
  }, [page, created]);

  const values = useWatch({ control: form.control }) as PurchaseLineFormValues;
  const product = products.find((p) => p.id === values.productId);
  const purchaseUnit: PurchaseUnit = product?.purchaseUnit ?? line?.purchaseUnit ?? "crate";

  // New lines: gross quantity follows the packs until the user types it (weighed at the stall).
  const estimatedGross = product
    ? estimateGrossQuantity(values.packs, product.purchaseUnit, product.defaultPackQuantity)
    : null;
  useEffect(() => {
    if (isEdit || estimatedGross === null) return;
    if (form.getFieldState("grossQuantity").isDirty) return;
    form.setValue("grossQuantity", estimatedGross);
  }, [isEdit, estimatedGross, form]);

  const selectProduct = (productId: string, from: Product[] = products): void => {
    form.setValue("productId", productId, { shouldDirty: true, shouldValidate: true });
    const picked = from.find((p) => p.id === productId);
    if (!picked || isEdit) return;
    form.setValue("shrinkage", normalizeDecimal(picked.lastShrinkage));
    form.setValue("marginPercent", fractionToPercent(picked.lastMargin));
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
      if (line) {
        await updateLine.run({ lineId: line.id, patch: payload });
      } else {
        await addLine.run(payload);
        // Next line: usually the same stall and payment, a different product.
        form.reset({
          ...EMPTY,
          supplierId: values.supplierId,
          paymentStatus: values.paymentStatus,
        });
      }
      onDone?.();
    } catch (error) {
      showServerError(error);
    }
  });

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));
  if (line && !products.some((p) => p.id === line.productId)) {
    productOptions.unshift({ value: line.productId, label: line.productName });
  }

  return {
    form,
    isEdit,
    productOptions,
    supplierOptions: suppliers.map((s) => ({ value: s.id, label: s.name })),
    selectProduct: (productId) => selectProduct(productId),
    onProductCreated: (newProduct) => {
      setCreated(newProduct);
      setIsCreatingProduct(false);
      selectProduct(newProduct.id, [newProduct]);
    },
    isCreatingProduct,
    setIsCreatingProduct,
    packsLabel: PACKS_LABELS[purchaseUnit],
    quantitySuffix: SALE_UNIT_SUFFIX[product?.saleUnit ?? line?.saleUnit ?? "kg"],
    supplierRatePlaceholder: normalizeDecimal(trip.marketRate),
    preview: computeLinePreview(values, {
      bcvRate: trip.bcvRate,
      marketRate: trip.marketRate,
      usdRoundingStep: settings.usdRoundingStep,
    }),
    onSubmit: () => onSubmit(),
    isSubmitting: addLine.isRunning || updateLine.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
