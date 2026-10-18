"use client";

import { PAYABLE_UNITS } from "@ta/core";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { IconButton } from "@/components/ui/icon-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { liveSubtotal } from "@/features/payables/helpers/live-total";
import type { UsePayableFormResult } from "@/features/payables/hooks/use-payable-form";
import { formatMoney } from "@/utils/format-number";

export type PayableLineRowProps = { f: UsePayableFormResult; index: number };

/** One supply of the invoice: what, its expense category, quantity × unit price. */
export function PayableLineRow({ f, index }: PayableLineRowProps): React.JSX.Element {
  const t = useTranslations("payables.form");
  const tu = useTranslations("payables.units");
  const errors = f.form.formState.errors.lines?.[index];
  const line = useWatch({ control: f.form.control, name: `lines.${index}` });
  const subtotal = line ? liveSubtotal(line) : null;
  const unitSuffix = f.currency === "USD" ? "$" : "Bs";

  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold">{t("line", { number: index + 1 })}</legend>
        {f.lines.fields.length > 1 && (
          <IconButton label={t("removeLine")} onClick={() => f.lines.remove(index)}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={t("description")}
          required
          autoComplete="off"
          error={errors?.description?.message}
          {...f.form.register(`lines.${index}.description`)}
        />
        <SelectField
          label={t("category")}
          required
          placeholder={t("categoryPlaceholder")}
          options={f.categories.map((category) => ({ value: category.id, label: category.name }))}
          error={errors?.expenseCategoryId?.message}
          {...f.form.register(`lines.${index}.expenseCategoryId`)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label={t("quantity")}
          required
          inputMode="decimal"
          autoComplete="off"
          error={errors?.quantity?.message}
          {...f.form.register(`lines.${index}.quantity`)}
        />
        <SelectField
          label={t("unit")}
          options={PAYABLE_UNITS.map((unit) => ({ value: unit, label: tu(unit) }))}
          error={errors?.unit?.message}
          {...f.form.register(`lines.${index}.unit`)}
        />
        <TextField
          label={t("unitPrice")}
          required
          inputMode="decimal"
          autoComplete="off"
          suffix={unitSuffix}
          error={errors?.unitPrice?.message}
          {...f.form.register(`lines.${index}.unitPrice`)}
        />
      </div>
      <p className="text-right text-sm text-muted">
        {t("subtotal")}:{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {subtotal ? formatMoney(subtotal, f.currency) : "—"}
        </span>
      </p>
    </fieldset>
  );
}
