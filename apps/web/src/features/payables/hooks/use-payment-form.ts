"use client";

import { normalizeDecimal, PAYABLE_PAYMENT_METHOD_CURRENCY, type Currency } from "@ta/core";
import {
  payablePaymentInputSchema,
  type PayableDetail,
  type PayablePaymentFields,
  type PayablePaymentInput,
  type SupplierPaymentAccount,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { useDailyRates } from "@/features/exchange-rates/api/use-daily-rates";
import { useRecordPayment } from "@/features/payables/api/use-payables";
import {
  fullPaymentAmount,
  paymentPreview,
  type PaymentPreview,
} from "@/features/payables/helpers/payment-preview";
import { useSupplier } from "@/features/suppliers/api/use-suppliers";
import { useFormError } from "@/hooks/use-form-error";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { todayBusinessDate } from "@/utils/format-date";

export type UsePaymentFormResult = {
  form: UseFormReturn<PayablePaymentInput, unknown, PayablePaymentFields>;
  /** The currency the chosen method pays in. */
  currency: Currency;
  accounts: SupplierPaymentAccount[];
  /** The day has no BCV rate: the owner types it. */
  isRateMissing: boolean;
  preview: PaymentPreview | null;
  /** "Pagar todo": the whole balance in the method's currency, null without a rate. */
  fullAmount: string | null;
  payAll: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | undefined;
};

/**
 * "Registrar abono": date, method (it sets the currency), amount, the day's BCV rate (suggested,
 * editable), reference and destination account, with what it takes off the balance.
 * `settle` ("Marcar como pagada") pays the whole balance: the amount follows the method and the
 * rate instead of being typed.
 */
export function usePaymentForm(
  payable: PayableDetail,
  onDone: () => void,
  { settle = false }: { settle?: boolean } = {},
): UsePaymentFormResult {
  const t = useTranslations("payables.payment");
  const record = useRecordPayment(payable.id);
  const { supplier } = useSupplier(payable.supplierId);
  const form = useForm<PayablePaymentInput, unknown, PayablePaymentFields>({
    resolver: useZodResolver(payablePaymentInputSchema),
    defaultValues: {
      paidOn: todayBusinessDate(),
      method: "mobile_payment",
      amount: "",
      rate: "",
      reference: "",
      accountId: "",
      note: "",
    },
  });
  const [paidOn, method, amount, rate] = useWatch({
    control: form.control,
    name: ["paidOn", "method", "amount", "rate"],
  });
  const { rates, isLoading } = useDailyRates(paidOn);
  const bcv = rates?.bcv ?? null;

  // Suggest the day's BCV rate until the owner types another one.
  useEffect(() => {
    if (bcv && !form.getFieldState("rate").isDirty) form.setValue("rate", normalizeDecimal(bcv));
  }, [bcv, form]);

  const context = {
    balance: payable.balance,
    payableCurrency: payable.currency,
    method,
    rate: rate ?? "",
  };
  const fullAmount = fullPaymentAmount(context);

  // Settling: the amount is always the exact balance in the method's currency.
  useEffect(() => {
    if (settle) form.setValue("amount", fullAmount ? normalizeDecimal(fullAmount) : "");
  }, [settle, fullAmount, form]);
  const showError = useFormError(form, t("failed"));
  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await record.run(input);
      onDone();
    } catch (error) {
      showError(error);
    }
  });

  return {
    form,
    currency: PAYABLE_PAYMENT_METHOD_CURRENCY[method],
    accounts: (supplier?.accounts ?? []).filter((account) => account.isActive),
    isRateMissing: !isLoading && rates !== undefined && bcv === null,
    preview: paymentPreview(context, amount ?? ""),
    fullAmount,
    payAll: () => {
      if (fullAmount) {
        form.setValue("amount", normalizeDecimal(fullAmount), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    onSubmit: () => onSubmit(),
    isSubmitting: record.isRunning || form.formState.isSubmitting,
    formError: form.formState.errors.root?.message,
  };
}
