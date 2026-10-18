"use client";

import { SUPPLIER_KINDS, type Supplier, type SupplierDetail } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import {
  useCreateSupplierForm,
  useEditSupplierForm,
} from "@/features/suppliers/hooks/use-supplier-forms";

const submitOn = (onSubmit: () => Promise<void>) => (event: React.FormEvent) => {
  event.preventDefault();
  void onSubmit();
};

export type CreateSupplierFormProps = { onDone: (supplier: Supplier) => void };

/** "Nuevo proveedor" — also the quick supplier of the invoice form. */
export function CreateSupplierForm({ onDone }: CreateSupplierFormProps): React.JSX.Element {
  const t = useTranslations("suppliers");
  const f = useCreateSupplierForm(onDone);
  const { errors } = f.form.formState;
  const kind = useWatch({ control: f.form.control, name: "kind" });

  return (
    <form noValidate className="space-y-4" onSubmit={submitOn(f.onSubmit)}>
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label={t("name")}
        required
        autoComplete="off"
        error={errors.name?.message}
        {...f.form.register("name")}
      />
      <SegmentedControl
        label={t("kind")}
        name="kind"
        options={SUPPLIER_KINDS.map((value) => ({ value, label: t(`kinds.${value}`) }))}
        value={kind}
        onChange={(value) => f.form.setValue("kind", value, { shouldDirty: true })}
      />
      <TextField
        label={t("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        error={errors.phone?.message}
        {...f.form.register("phone")}
      />
      <TextField
        label={t("notes")}
        autoComplete="off"
        hint={t("notesHint")}
        error={errors.notes?.message}
        {...f.form.register("notes")}
      />
      <Button
        type="submit"
        className="w-full"
        isLoading={f.isSubmitting}
        loadingText={t("creating")}
      >
        {t("create")}
      </Button>
    </form>
  );
}

export type EditSupplierFormProps = { supplier: SupplierDetail; onDone: () => void };

/** Data of an existing supplier, and whether it is still active. */
export function EditSupplierForm({ supplier, onDone }: EditSupplierFormProps): React.JSX.Element {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const f = useEditSupplierForm(supplier, onDone);
  const { errors } = f.form.formState;
  const kind = useWatch({ control: f.form.control, name: "kind" });

  return (
    <form noValidate className="space-y-4" onSubmit={submitOn(f.onSubmit)}>
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <TextField
        label={t("name")}
        required
        autoComplete="off"
        error={errors.name?.message}
        {...f.form.register("name")}
      />
      <SegmentedControl
        label={t("kind")}
        name="kind"
        options={SUPPLIER_KINDS.map((value) => ({ value, label: t(`kinds.${value}`) }))}
        value={kind}
        onChange={(value) => f.form.setValue("kind", value, { shouldDirty: true })}
      />
      <TextField
        label={t("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        error={errors.phone?.message}
        {...f.form.register("phone")}
      />
      <TextField
        label={t("notes")}
        autoComplete="off"
        hint={t("notesHint")}
        error={errors.notes?.message}
        {...f.form.register("notes")}
      />
      <Checkbox label={t("isActive")} {...f.form.register("isActive")} />
      <Button type="submit" isLoading={f.isSubmitting} loadingText={tc("saving")}>
        {tc("save")}
      </Button>
    </form>
  );
}
