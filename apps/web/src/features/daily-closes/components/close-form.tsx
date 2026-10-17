"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { CloseCreditRow } from "@/features/daily-closes/components/close-credit-row";
import { CloseExpenseRow } from "@/features/daily-closes/components/close-expense-row";
import { CloseTotals } from "@/features/daily-closes/components/close-totals";
import {
  useCloseForm,
  type UseCloseFormOptions,
} from "@/features/daily-closes/hooks/use-close-form";

export type CloseFormProps = UseCloseFormOptions;

/** The day's close: what came in per payment method, batch, credit sold, expenses, cash. */
export function CloseForm(props: CloseFormProps): React.JSX.Element {
  const f = useCloseForm(props);
  const t = useTranslations("dailyClose");
  const { errors } = f.form.formState;

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
        <h2 className="font-semibold">{t("payments")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {f.methods.map((method, index) => (
            <TextField
              key={method.id}
              label={method.name}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              suffix={t(`currencies.${method.currency}`)}
              error={errors.payments?.[index]?.amount?.message}
              {...f.form.register(`payments.${index}.amount`)}
            />
          ))}
          <TextField
            label={t("cardBatch")}
            autoComplete="off"
            inputMode="numeric"
            hint={t("cardBatchHint")}
            error={errors.cardBatch?.message}
            {...f.form.register("cardBatch")}
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("credits")}</h2>
        {f.credits.fields.length === 0 && <p className="text-sm text-muted">{t("noCredits")}</p>}
        {f.credits.fields.map((field, index) => (
          <CloseCreditRow key={field.id} f={f} index={index} />
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => f.credits.append({ customerName: "", amount: "", currency: "VES" })}
        >
          {t("addCredit")}
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("expenses")}</h2>
        {f.expenses.fields.length === 0 && <p className="text-sm text-muted">{t("noExpenses")}</p>}
        {f.expenses.fields.map((field, index) => (
          <CloseExpenseRow key={field.id} f={f} index={index} />
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => f.expenses.append({ concept: "", amount: "", currency: "USD" })}
        >
          {t("addExpense")}
        </Button>
      </Card>

      <Card className="space-y-4">
        <SegmentedControl
          label={t("cashDestination")}
          name="cashDestination"
          options={(["kept", "deposited"] as const).map((value) => ({
            value,
            label: t(`destinations.${value}`),
          }))}
          value={f.form.watch("cashDestination")}
          onChange={(value) => f.form.setValue("cashDestination", value, { shouldDirty: true })}
        />
        <TextField
          label={t("note")}
          autoComplete="off"
          error={errors.note?.message}
          {...f.form.register("note")}
        />
        <CloseTotals totals={f.totals} />
        <Button
          type="submit"
          className="w-full sm:w-auto"
          isLoading={f.isSubmitting}
          loadingText={t("submitting")}
        >
          {f.isEdit ? t("saveFix") : t("submit")}
        </Button>
      </Card>
    </form>
  );
}
