"use client";

import { PAYABLE_PAYMENT_METHODS } from "@ta/core";
import type { PayableDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { usePaymentForm } from "@/features/payables/hooks/use-payment-form";
import { formatMoney } from "@/utils/format-number";

export type PaymentFormProps = {
  payable: PayableDetail;
  onDone: () => void;
  /** "Marcar como pagada": pays the whole balance; the amount is not typed. */
  settle?: boolean;
};

/** A payment to the invoice, converted at the day's BCV rate. */
export function PaymentForm({
  payable,
  onDone,
  settle = false,
}: PaymentFormProps): React.JSX.Element {
  const f = usePaymentForm(payable, onDone, { settle });
  const t = useTranslations("payables.payment");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("paidOn")}
          type="date"
          required
          error={errors.paidOn?.message}
          {...f.form.register("paidOn")}
        />
        <SelectField
          label={t("method")}
          required
          options={PAYABLE_PAYMENT_METHODS.map((method) => ({
            value: method,
            label: t(`methods.${method}`),
          }))}
          error={errors.method?.message}
          {...f.form.register("method")}
        />
      </div>
      {settle ? (
        <Alert tone="info">
          {f.fullAmount
            ? t("settleAmount", { amount: formatMoney(f.fullAmount, f.currency) })
            : t("settleNeedsRate")}
        </Alert>
      ) : (
        <div className="space-y-1">
          <TextField
            label={t("amount")}
            required
            inputMode="decimal"
            autoComplete="off"
            suffix={f.currency === "USD" ? "$" : "Bs"}
            error={errors.amount?.message}
            {...f.form.register("amount")}
          />
          {f.fullAmount && (
            <Button variant="ghost" size="sm" onClick={f.payAll}>
              {t("payAll", { amount: formatMoney(f.fullAmount, f.currency) })}
            </Button>
          )}
        </div>
      )}
      <TextField
        label={t("rate")}
        required
        inputMode="decimal"
        autoComplete="off"
        hint={f.isRateMissing ? t("rateMissing") : t("rateHint")}
        error={errors.rate?.message}
        {...f.form.register("rate")}
      />
      {f.preview && !settle && (
        <Alert tone={f.preview.isFullPayment ? "success" : "info"}>
          {f.preview.isFullPayment
            ? t("settles")
            : t("applies", { applied: formatMoney(f.preview.applied, payable.currency) })}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("reference")}
          autoComplete="off"
          inputMode="numeric"
          error={errors.reference?.message}
          {...f.form.register("reference")}
        />
        <SelectField
          label={t("account")}
          placeholder={t("accountPlaceholder")}
          options={f.accounts.map((account) => ({
            value: account.id,
            label: `${account.bankName} · ${account.phone}`,
          }))}
          error={errors.accountId?.message}
          {...f.form.register("accountId")}
        />
      </div>
      <TextField
        label={t("note")}
        autoComplete="off"
        error={errors.note?.message}
        {...f.form.register("note")}
      />
      <Button
        type="submit"
        className="w-full"
        isLoading={f.isSubmitting}
        loadingText={t("submitting")}
      >
        {settle ? t("settleSubmit") : t("submit")}
      </Button>
    </form>
  );
}
