"use client";

import { VE_BANKS } from "@ta/core";
import type { SupplierPaymentAccount } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useAccountForm } from "@/features/suppliers/hooks/use-supplier-forms";

const BANK_OPTIONS = VE_BANKS.map((bank) => ({
  value: bank.code,
  label: `${bank.code} · ${bank.name}`,
}));

export type AccountFormProps = {
  supplierId: string;
  /** Edits this account; a new one otherwise. */
  account?: SupplierPaymentAccount;
  onDone: () => void;
};

/** A pago móvil account: bank, phone and cédula/RIF, saved the way the banks read them. */
export function AccountForm({ supplierId, account, onDone }: AccountFormProps): React.JSX.Element {
  const t = useTranslations("suppliers.accounts");
  const f = useAccountForm(supplierId, account, onDone);
  const { errors } = f.form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <SelectField
        label={t("bank")}
        required
        placeholder={t("bankPlaceholder")}
        options={BANK_OPTIONS}
        error={errors.bankCode?.message}
        {...f.form.register("bankCode")}
      />
      <TextField
        label={t("phone")}
        required
        type="tel"
        inputMode="tel"
        autoComplete="off"
        hint={t("phoneHint")}
        error={errors.phone?.message}
        {...f.form.register("phone")}
      />
      <TextField
        label={t("idDocument")}
        required
        autoComplete="off"
        autoCapitalize="characters"
        hint={t("idDocumentHint")}
        error={errors.idDocument?.message}
        {...f.form.register("idDocument")}
      />
      <Button type="submit" className="w-full" isLoading={f.isSubmitting} loadingText={t("saving")}>
        {t("save")}
      </Button>
    </form>
  );
}
