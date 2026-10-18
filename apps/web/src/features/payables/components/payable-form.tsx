"use client";

import { CURRENCIES } from "@ta/core";
import type { PayableDetail } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { PayableLineRow } from "@/features/payables/components/payable-line-row";
import { EMPTY_LINE, usePayableForm } from "@/features/payables/hooks/use-payable-form";
import { CreateSupplierForm } from "@/features/suppliers/components/supplier-forms";
import { formatMoney } from "@/utils/format-number";

export type PayableFormProps = {
  /** Edits this invoice (no payments yet); a new one otherwise. */
  payable?: PayableDetail;
  onDone: (payable: PayableDetail) => void;
};

/** A supplies invoice on credit: supplier, currency, dates and its lines with the total. */
export function PayableForm({ payable, onDone }: PayableFormProps): React.JSX.Element {
  const f = usePayableForm(payable, onDone);
  const t = useTranslations("payables.form");
  const tcur = useTranslations("payables.currencies");
  const { errors } = f.form.formState;
  const supplierId = useWatch({ control: f.form.control, name: "supplierId" });

  if (f.isAddingSupplier) {
    return (
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t("quickSupplierTitle")}</h2>
          <Button variant="ghost" size="sm" onClick={f.cancelQuickSupplier}>
            {t("backToInvoice")}
          </Button>
        </div>
        <CreateSupplierForm onDone={f.supplierCreated} />
      </Card>
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
      <Card className="space-y-4">
        <p className="text-sm text-muted">{t("hint")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <SelectField
              label={t("supplier")}
              required
              placeholder={t("supplierPlaceholder")}
              options={f.suppliers.map((s) => ({ value: s.id, label: s.name }))}
              value={supplierId}
              error={errors.supplierId?.message}
              {...f.form.register("supplierId")}
            />
          </div>
          <Button variant="secondary" onClick={f.startQuickSupplier}>
            {t("quickSupplier")}
          </Button>
        </div>
        <SegmentedControl
          label={t("currency")}
          name="currency"
          hint={t("currencyHint")}
          options={CURRENCIES.slice()
            .reverse()
            .map((value) => ({ value, label: tcur(value) }))}
          value={f.currency}
          onChange={(value) => f.form.setValue("currency", value, { shouldDirty: true })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("issuedOn")}
            type="date"
            required
            error={errors.issuedOn?.message}
            {...f.form.register("issuedOn")}
          />
          <TextField
            label={t("dueOn")}
            type="date"
            required
            error={errors.dueOn?.message}
            {...f.form.register("dueOn")}
          />
        </div>
        <TextField
          label={t("note")}
          autoComplete="off"
          error={errors.note?.message}
          {...f.form.register("note")}
        />
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("lines")}</h2>
        {errors.lines?.message && <Alert tone="error">{errors.lines.message}</Alert>}
        {f.lines.fields.map((field, index) => (
          <PayableLineRow key={field.id} f={f} index={index} />
        ))}
        <Button variant="ghost" size="sm" onClick={() => f.lines.append(EMPTY_LINE)}>
          {t("addLine")}
        </Button>
        <p className="text-right text-lg">
          {t("total")}:{" "}
          <span className="font-bold tabular-nums">{formatMoney(f.total, f.currency)}</span>
        </p>
      </Card>

      <Button
        type="submit"
        className="w-full sm:w-auto"
        isLoading={f.isSubmitting}
        loadingText={t("saving")}
      >
        {f.isEdit ? t("save") : t("create")}
      </Button>
    </form>
  );
}
