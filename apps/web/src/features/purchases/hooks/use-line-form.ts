"use client";

import {
  amountInBs,
  amountInUsd,
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
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import type { SelectOption } from "@/components/ui/select-field";
import { useProducts } from "@/features/products/api/use-products";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { useAddLine, useUpdateLine } from "@/features/purchases/api/use-trip-mutations";
import { computeLinePreview, type LinePreview } from "@/features/purchases/helpers/line-preview";
import { useSettings } from "@/features/settings/api/use-settings";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { isApiError } from "@/lib/api";

export type UseLineFormOptions = {
  trip: TripDetail;
  /** Edit this line instead of adding a new one. */
  line?: PurchaseLine;
  /** Called after a successful save (edit mode closes the form). */
  onDone?: () => void;
  /** Product chosen from the shopping list. Applied when `pickToken` changes. */
  pickedProductId?: string | null;
  pickToken?: number;
};

export type UseLineFormResult = {
  form: UseFormReturn<PurchaseLineFormValues, unknown, PurchaseLineFields>;
  isEdit: boolean;
  productOptions: SelectOption[];
  /** Crate and bundle products can note how many packs; kilos do not. */
  showPacks: boolean;
  /** Trip's Coche rate, shown next to the price. */
  cocheRate: string;
  /** The price is typed in dollars, or in bolívares converted at the Coche rate. */
  priceCurrency: PriceCurrency;
  /** Bolívar amount while `priceCurrency` is VES. The line still stores dollars. */
  priceBs: string;
  choosePriceCurrency: (currency: PriceCurrency) => void;
  setPriceInBs: (bs: string) => void;
  /** Picks a product and pre-fills its last margin. */
  selectProduct: (productId: string) => void;
  /** "Nuevo producto" finished: select it right away. */
  onProductCreated: (product: Product) => void;
  isCreatingProduct: boolean;
  setIsCreatingProduct: (value: boolean) => void;
  packsLabel: string;
  /** "kg" / "und": the quantity is in the sale unit. */
  quantitySuffix: string;
  preview: LinePreview | null;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

export type PriceCurrency = "USD" | "VES";

const PRODUCT_QUERY = { pageSize: 100 } as const;

/** Dollars stored for a bolívar price at the trip rate. "" clears it; null means the text is not a number yet. */
function usdFromBs(bs: string, rate: string): string | null {
  const trimmed = bs.trim();
  if (trimmed === "") return "";
  try {
    return normalizeDecimal(amountInUsd(trimmed, rate));
  } catch {
    return null;
  }
}

/** Bolívares to show when the buyer switches a dollar price over. */
function bsFromUsd(usd: string, rate: string): string {
  const trimmed = usd.trim();
  if (trimmed === "") return "";
  try {
    return normalizeDecimal(amountInBs(trimmed, rate));
  } catch {
    return "";
  }
}

const EMPTY: PurchaseLineFormValues = {
  productId: "",
  packs: "",
  grossQuantity: "",
  quotedPriceUsd: "",
  marginPercent: "",
  paymentStatus: "paid",
};

function lineToFormValues(line: PurchaseLine): PurchaseLineFormValues {
  return {
    productId: line.productId,
    packs: line.packs ? normalizeDecimal(line.packs) : "",
    grossQuantity: normalizeDecimal(line.grossQuantity),
    quotedPriceUsd: normalizeDecimal(line.quotedPriceUsd),
    marginPercent: fractionToPercent(line.margin),
    paymentStatus: line.paymentStatus,
  };
}

/** API field names → form fields (the margin is typed as a percent). */
function toFormField(apiField: string): keyof PurchaseLineFormValues | null {
  if (apiField === "margin") return "marginPercent";
  // Shrinkage is the product's: a range error belongs on the quantity the buyer typed.
  if (apiField === "shrinkage") return "grossQuantity";
  return apiField in EMPTY ? (apiField as keyof PurchaseLineFormValues) : null;
}

/**
 * Purchase line form: one product, optional crates, the quantity and the price.
 * The price is typed in dollars, or in bolívares and stored as dollars at the trip's Coche rate.
 * The shrinkage is the product's.
 * A new line pre-fills the product's margin and, when crates are typed, estimates the
 * quantity. After a save the form stays open for the next product.
 */
export function useLineForm({
  trip,
  line,
  onDone,
  pickedProductId,
  pickToken = 0,
}: UseLineFormOptions): UseLineFormResult {
  const isEdit = line !== undefined;
  const t = useTranslations("purchases.line");
  const labels = useUnitLabels();
  const errorMessage = useErrorMessage();
  const form = useForm<PurchaseLineFormValues, unknown, PurchaseLineFields>({
    resolver: useZodResolver(purchaseLineFormSchema),
    defaultValues: line ? lineToFormValues(line) : EMPTY,
  });
  const { settings } = useSettings();
  const { page } = useProducts(PRODUCT_QUERY);
  const addLine = useAddLine(trip.id);
  const updateLine = useUpdateLine(trip.id);
  const [created, setCreated] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [priceCurrency, setPriceCurrency] = useState<PriceCurrency>("USD");
  const [priceBs, setPriceBs] = useState("");

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

  const selectProduct = useCallback(
    (productId: string, from: Product[] = products): void => {
      form.setValue("productId", productId, { shouldDirty: true, shouldValidate: true });
      const picked = from.find((p) => p.id === productId);
      if (!picked || isEdit) return;
      form.setValue("marginPercent", fractionToPercent(picked.lastMargin));
    },
    [form, isEdit, products],
  );

  const appliedPick = useRef(0);
  useEffect(() => {
    if (!pickedProductId || isEdit || pickToken === 0 || appliedPick.current === pickToken) return;
    // The list may still be loading when Comprar opens the form. Wait for the
    // product so the margin is filled, then ignore later list refreshes.
    if (!products.some((product) => product.id === pickedProductId)) return;
    appliedPick.current = pickToken;
    selectProduct(pickedProductId);
  }, [pickToken, pickedProductId, isEdit, products, selectProduct]);

  const showServerError = (error: unknown): void => {
    if (!isApiError(error)) {
      form.setError("root", { message: t("saveFailed") });
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
    if (!placed) form.setError("root", { message: errorMessage(error, t("saveFailed")) });
  };

  const onSubmit = form.handleSubmit(async (payload) => {
    const shrinkage = product?.lastShrinkage ?? line?.shrinkage;
    const body = {
      ...payload,
      packs: purchaseUnit === "kg" ? null : payload.packs,
      ...(shrinkage ? { shrinkage } : {}),
    };
    try {
      if (line) {
        await updateLine.run({ lineId: line.id, patch: body });
      } else {
        await addLine.run(body);
        // The form stays: the next product is the next item of the same day.
        form.reset({ ...EMPTY, paymentStatus: values.paymentStatus });
        setPriceCurrency("USD");
        setPriceBs("");
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
    selectProduct: (productId) => selectProduct(productId),
    onProductCreated: (newProduct) => {
      setCreated(newProduct);
      setIsCreatingProduct(false);
      selectProduct(newProduct.id, [newProduct]);
    },
    isCreatingProduct,
    setIsCreatingProduct,
    showPacks: purchaseUnit !== "kg",
    cocheRate: normalizeDecimal(trip.marketRate),
    priceCurrency,
    priceBs,
    choosePriceCurrency: (currency) => {
      if (currency === "VES")
        setPriceBs(bsFromUsd(form.getValues("quotedPriceUsd"), trip.marketRate));
      setPriceCurrency(currency);
    },
    setPriceInBs: (bs) => {
      setPriceBs(bs);
      const usd = usdFromBs(bs, trip.marketRate);
      if (usd === null) {
        form.setValue("quotedPriceUsd", "", { shouldDirty: true });
        return;
      }
      form.setValue("quotedPriceUsd", usd, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      });
    },
    packsLabel: labels.packs(purchaseUnit),
    quantitySuffix: labels.suffix(product?.saleUnit ?? line?.saleUnit ?? "kg"),
    preview: computeLinePreview(values, {
      bcvRate: trip.bcvRate,
      marketRate: trip.marketRate,
      usdRoundingStep: settings.usdRoundingStep,
      shrinkage: product?.lastShrinkage ?? line?.shrinkage ?? "",
    }),
    onSubmit: () => onSubmit(),
    isSubmitting: addLine.isRunning || updateLine.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
