"use client";

import { normalizeDecimal } from "@ta/core";
import {
  payableInputSchema,
  type ExpenseCategory,
  type PayableDetail,
  type PayableFields,
  type PayableInput,
  type Supplier,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";

import {
  useCreatePayable,
  useExpenseCategories,
  useReplacePayable,
} from "@/features/payables/api/use-payables";
import { liveTotal } from "@/features/payables/helpers/live-total";
import { useSuppliers } from "@/features/purchases/api/use-trips";
import { useFormError } from "@/hooks/use-form-error";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { todayBusinessDate } from "@/utils/format-date";

type Line = PayableInput["lines"][number];

export const EMPTY_LINE: Line = {
  description: "",
  expenseCategoryId: "",
  quantity: "",
  unit: "unit",
  unitPrice: "",
};

export type UsePayableFormResult = {
  form: UseFormReturn<PayableInput, unknown, PayableFields>;
  lines: UseFieldArrayReturn<PayableInput, "lines">;
  suppliers: Supplier[];
  categories: ExpenseCategory[];
  currency: "USD" | "VES";
  /** Σ of the lines that can already be computed, in the invoice's currency. */
  total: string;
  isEdit: boolean;
  /** The quick supplier form is shown instead of the invoice (no nested forms). */
  isAddingSupplier: boolean;
  startQuickSupplier: () => void;
  cancelQuickSupplier: () => void;
  supplierCreated: (supplier: Supplier) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

function initialValues(payable: PayableDetail | undefined): PayableInput {
  if (!payable) {
    return {
      supplierId: "",
      currency: "USD",
      issuedOn: todayBusinessDate(),
      dueOn: "",
      note: "",
      lines: [EMPTY_LINE],
    };
  }
  return {
    supplierId: payable.supplierId,
    currency: payable.currency,
    issuedOn: payable.issuedOn,
    dueOn: payable.dueOn ?? "",
    note: payable.note ?? "",
    lines: payable.lines.map((line) => ({
      description: line.description ?? "",
      expenseCategoryId: line.expenseCategoryId ?? "",
      quantity: line.quantity ? normalizeDecimal(line.quantity) : "",
      unit: line.unit ?? "unit",
      unitPrice: line.unitPrice ? normalizeDecimal(line.unitPrice) : "",
    })),
  };
}

/**
 * A supplies invoice (bags, bread…): supplier (or a quick new one), currency, dates and lines,
 * with the total while typing. `payable` edits an invoice that has no payments yet.
 */
export function usePayableForm(
  payable: PayableDetail | undefined,
  onDone: (payable: PayableDetail) => void,
): UsePayableFormResult {
  const t = useTranslations("payables.form");
  const { suppliers } = useSuppliers();
  const { categories } = useExpenseCategories();
  const create = useCreatePayable();
  const replace = useReplacePayable(payable?.id ?? "");
  const form = useForm<PayableInput, unknown, PayableFields>({
    resolver: useZodResolver(payableInputSchema),
    defaultValues: initialValues(payable),
  });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const [isAddingSupplier, setAddingSupplier] = useState(false);
  const typed = useWatch({ control: form.control, name: "lines" });
  const currency = useWatch({ control: form.control, name: "currency" }) ?? "USD";
  const showError = useFormError(form, t("createFailed"));

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      onDone(payable ? await replace.run(input) : await create.run(input));
    } catch (error) {
      showError(error);
    }
  });

  return {
    form,
    lines,
    suppliers,
    categories,
    currency,
    total: liveTotal(typed ?? []),
    isEdit: payable !== undefined,
    isAddingSupplier,
    startQuickSupplier: () => setAddingSupplier(true),
    cancelQuickSupplier: () => setAddingSupplier(false),
    supplierCreated: (supplier) => {
      setAddingSupplier(false);
      form.setValue("supplierId", supplier.id, { shouldDirty: true, shouldValidate: true });
    },
    onSubmit: () => onSubmit(),
    isSubmitting: create.isRunning || replace.isRunning,
    formError: form.formState.errors.root?.message,
  };
}
