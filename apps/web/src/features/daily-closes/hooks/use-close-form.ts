"use client";

import { normalizeDecimal, type DailyCloseTotals } from "@ta/core";
import {
  dailyCloseFormSchema,
  type DailyClose,
  type DailyCloseFormValues,
  type PaymentMethod,
  type UpdateDailyClose,
} from "@ta/validators";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";

import {
  usePaymentMethods,
  useSubmitDailyClose,
  useUpdateDailyClose,
} from "@/features/daily-closes/api/use-daily-closes";
import { liveCloseTotals } from "@/features/daily-closes/helpers/live-totals";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";

export type UseCloseFormOptions =
  | { mode: "submit"; businessDate: string; onDone?: (close: DailyClose) => void }
  | { mode: "edit"; close: DailyClose; onDone?: (close: DailyClose) => void };

type Values = DailyCloseFormValues;

export type UseCloseFormResult = {
  form: UseFormReturn<Values, unknown, UpdateDailyClose>;
  methods: PaymentMethod[];
  credits: UseFieldArrayReturn<Values, "credits">;
  expenses: UseFieldArrayReturn<Values, "expenses">;
  totals: DailyCloseTotals;
  isEdit: boolean;
  /** Valid contents waiting for the manager to confirm, or to go back and fix them. */
  pending: UpdateDailyClose | null;
  onSubmit: () => Promise<void>;
  confirm: () => Promise<void>;
  backToForm: () => void;
  isSubmitting: boolean;
  formError: string | undefined;
};

const text = (value: string) => normalizeDecimal(value);

/** Form values: one payment row per method (in the Excel's order), empty or the close's. */
function initialValues(methods: readonly PaymentMethod[], close?: DailyClose): Values {
  const paid = new Map(close?.payments.map((p) => [p.paymentMethodId, p.amount]));
  return {
    cardBatch: close?.cardBatch ?? "",
    cashDestination: close?.cashDestination ?? "kept",
    note: close?.note ?? "",
    payments: methods.map((m) => {
      const amount = paid.get(m.id);
      return { paymentMethodId: m.id, amount: amount ? text(amount) : "" };
    }),
    credits: (close?.credits ?? []).map((c) => ({
      customerName: c.customerName,
      amount: text(c.amount),
      currency: c.currency,
    })),
    expenses: (close?.expenses ?? []).map((e) => ({
      concept: e.concept,
      amount: text(e.amount),
      currency: e.currency,
    })),
  };
}

/**
 * "Cierre del día" (manager) and "Corregir" (owner): amounts per payment method, card batch,
 * credit sales, expenses and where the cash went, with the totals per currency while typing.
 */
export function useCloseForm(options: UseCloseFormOptions): UseCloseFormResult {
  const t = useTranslations("dailyClose");
  const errorMessage = useErrorMessage();
  const { methods } = usePaymentMethods();
  const close = options.mode === "edit" ? options.close : undefined;
  const form = useForm<Values, unknown, UpdateDailyClose>({
    resolver: useZodResolver(dailyCloseFormSchema),
    defaultValues: initialValues(methods, close),
  });
  const credits = useFieldArray({ control: form.control, name: "credits" });
  const expenses = useFieldArray({ control: form.control, name: "expenses" });
  const submit = useSubmitDailyClose();
  const update = useUpdateDailyClose(close?.id ?? "");
  const [pending, setPending] = useState<UpdateDailyClose | null>(null);
  // The confirmation runs outside handleSubmit: busy until the save and its refresh finish.
  const [isConfirming, setIsConfirming] = useState(false);

  // The methods arrive after the first render: give the form one row per method then.
  const rows = useWatch({ control: form.control, name: "payments" });
  useEffect(() => {
    if (methods.length > 0 && rows.length !== methods.length && !form.formState.isDirty) {
      form.reset(initialValues(methods, close));
    }
  }, [methods, rows.length, close, form]);

  const values = useWatch({ control: form.control }) as Values;

  const onSubmit = form.handleSubmit((contents) => {
    form.clearErrors("root");
    setPending(contents);
  });

  const confirm = async (): Promise<void> => {
    if (!pending) return;
    setIsConfirming(true);
    try {
      const saved =
        options.mode === "submit"
          ? await submit.run({ businessDate: options.businessDate, ...pending })
          : await update.run(pending);
      setPending(null);
      options.onDone?.(saved);
    } catch (error) {
      const fallback = options.mode === "submit" ? t("submitFailed") : t("saveFixFailed");
      form.setError("root", { message: errorMessage(error, fallback) });
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    form,
    methods,
    credits,
    expenses,
    totals: liveCloseTotals(values, methods),
    isEdit: options.mode === "edit",
    pending,
    onSubmit: () => onSubmit(),
    confirm,
    backToForm: () => setPending(null),
    isSubmitting: submit.isRunning || update.isRunning || isConfirming,
    formError: form.formState.errors.root?.message,
  };
}
