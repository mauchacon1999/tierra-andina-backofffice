"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { IconButton } from "@/components/ui/icon-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { UseCloseFormResult } from "@/features/daily-closes/hooks/use-close-form";

export type CloseExpenseRowProps = {
  f: UseCloseFormResult;
  index: number;
};

/** One expense paid that day: concept, amount and currency. */
export function CloseExpenseRow({ f, index }: CloseExpenseRowProps): React.JSX.Element {
  const t = useTranslations("dailyClose");
  const concept = useWatch({ control: f.form.control, name: `expenses.${index}.concept` });
  const errors = f.form.formState.errors.expenses?.[index];

  return (
    <div className="grid grid-cols-[1fr_5.5rem_auto] items-start gap-2 sm:grid-cols-[2fr_1fr_6rem_auto]">
      <div className="col-span-3 sm:col-span-1">
        <TextField
          label={t("concept")}
          autoComplete="off"
          placeholder={t("conceptPlaceholder")}
          error={errors?.concept?.message}
          {...f.form.register(`expenses.${index}.concept`)}
        />
      </div>
      <TextField
        label={t("amount")}
        inputMode="decimal"
        autoComplete="off"
        error={errors?.amount?.message}
        {...f.form.register(`expenses.${index}.amount`)}
      />
      <SelectField
        label={t("currency")}
        options={[
          { value: "USD", label: t("currencies.USD") },
          { value: "VES", label: t("currencies.VES") },
        ]}
        {...f.form.register(`expenses.${index}.currency`)}
      />
      <IconButton
        label={t("removeRow", { what: concept || t("concept") })}
        className="mt-6"
        onClick={() => f.expenses.remove(index)}
      >
        <X aria-hidden className="size-5" />
      </IconButton>
    </div>
  );
}
