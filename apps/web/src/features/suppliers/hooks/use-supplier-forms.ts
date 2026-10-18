"use client";

import {
  createSupplierSchema,
  supplierPaymentAccountInputSchema,
  updateSupplierSchema,
  type CreateSupplier,
  type CreateSupplierInput,
  type Supplier,
  type SupplierDetail,
  type SupplierPaymentAccount,
  type SupplierPaymentAccountFields,
  type SupplierPaymentAccountInput,
  type UpdateSupplier,
  type UpdateSupplierInput,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form";

import {
  useCreateSupplier,
  useSaveAccount,
  useUpdateSupplier,
} from "@/features/suppliers/api/use-suppliers";
import { useFormError } from "@/hooks/use-form-error";
import { useZodResolver } from "@/i18n/use-zod-resolver";

export type SupplierFormResult<Values extends FieldValues, Output> = {
  form: UseFormReturn<Values, unknown, Output>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

const EMPTY_SUPPLIER: CreateSupplierInput = { name: "", kind: "local", phone: "", notes: "" };

/** "Nuevo proveedor" (also the quick one of the invoice form): name, kind, phone, notes. */
export function useCreateSupplierForm(
  onDone: (supplier: Supplier) => void,
): SupplierFormResult<CreateSupplierInput, CreateSupplier> {
  const t = useTranslations("suppliers");
  const create = useCreateSupplier();
  const form = useForm<CreateSupplierInput, unknown, CreateSupplier>({
    resolver: useZodResolver(createSupplierSchema),
    defaultValues: EMPTY_SUPPLIER,
  });
  const showError = useFormError(form, t("createFailed"));
  const onSubmit = form.handleSubmit(async (input) => {
    try {
      onDone(await create.run(input));
      form.reset(EMPTY_SUPPLIER);
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: create.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}

/** Name, kind, phone, notes and whether the supplier is still in use. */
export function useEditSupplierForm(
  supplier: SupplierDetail,
  onDone: () => void,
): SupplierFormResult<UpdateSupplierInput, UpdateSupplier> {
  const t = useTranslations("suppliers");
  const update = useUpdateSupplier(supplier.id);
  const form = useForm<UpdateSupplierInput, unknown, UpdateSupplier>({
    resolver: useZodResolver(updateSupplierSchema),
    defaultValues: {
      name: supplier.name,
      kind: supplier.kind,
      phone: supplier.phone ?? "",
      notes: supplier.notes ?? "",
      isActive: supplier.isActive,
    },
  });
  const showError = useFormError(form, t("saveFailed"));
  const onSubmit = form.handleSubmit(async (patch) => {
    try {
      await update.run(patch);
      onDone();
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: update.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}

/** Bank, phone and cédula of a pago móvil account; `account` edits an existing one. */
export function useAccountForm(
  supplierId: string,
  account: SupplierPaymentAccount | undefined,
  onDone: () => void,
): SupplierFormResult<SupplierPaymentAccountInput, SupplierPaymentAccountFields> {
  const t = useTranslations("suppliers.accounts");
  const save = useSaveAccount(supplierId);
  const form = useForm<SupplierPaymentAccountInput, unknown, SupplierPaymentAccountFields>({
    resolver: useZodResolver(supplierPaymentAccountInputSchema),
    defaultValues: {
      bankCode: account?.bankCode ?? "",
      phone: account?.phone ?? "",
      idDocument: account?.idDocument ?? "",
    },
  });
  const showError = useFormError(form, t("saveFailed"));
  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await save.run({ accountId: account?.id, input });
      onDone();
    } catch (error) {
      showError(error);
    }
  });
  return {
    form,
    onSubmit: () => onSubmit(),
    isSubmitting: save.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
