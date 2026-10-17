"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { useWatch } from "react-hook-form";

import { IconButton } from "@/components/ui/icon-button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useCustomerSearch } from "@/features/daily-closes/api/use-daily-closes";
import type { UseCloseFormResult } from "@/features/daily-closes/hooks/use-close-form";

export type CloseCreditRowProps = {
  f: UseCloseFormResult;
  index: number;
};

/** One credit sale: customer (suggestions from the existing ones), amount and currency. */
export function CloseCreditRow({ f, index }: CloseCreditRowProps): React.JSX.Element {
  const t = useTranslations("dailyClose");
  const listId = useId();
  const name = useWatch({ control: f.form.control, name: `credits.${index}.customerName` });
  const customers = useCustomerSearch(name ?? "");
  const errors = f.form.formState.errors.credits?.[index];

  return (
    <div className="grid grid-cols-[1fr_5.5rem_auto] items-start gap-2 sm:grid-cols-[2fr_1fr_6rem_auto]">
      <div className="col-span-3 sm:col-span-1">
        <TextField
          label={t("customer")}
          autoComplete="off"
          list={listId}
          hint={t("customerHint")}
          error={errors?.customerName?.message}
          {...f.form.register(`credits.${index}.customerName`)}
        />
        <datalist id={listId}>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.name} />
          ))}
        </datalist>
      </div>
      <TextField
        label={t("amount")}
        inputMode="decimal"
        autoComplete="off"
        error={errors?.amount?.message}
        {...f.form.register(`credits.${index}.amount`)}
      />
      <SelectField
        label={t("currency")}
        options={[
          { value: "VES", label: t("currencies.VES") },
          { value: "USD", label: t("currencies.USD") },
        ]}
        {...f.form.register(`credits.${index}.currency`)}
      />
      <IconButton
        label={t("removeRow", { what: name || t("customer") })}
        className="mt-6"
        onClick={() => f.credits.remove(index)}
      >
        <X aria-hidden className="size-5" />
      </IconButton>
    </div>
  );
}
