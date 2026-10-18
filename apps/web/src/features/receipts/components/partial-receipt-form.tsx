"use client";

import type { ReceiptLine } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { usePartialReceiptForm } from "@/features/receipts/hooks/use-partial-receipt-form";

export type PartialReceiptFormProps = {
  tripId: string;
  line: ReceiptLine;
  onDone: () => void;
};

/** How much of a line arrived (inside the "Incompleto" dialog). */
export function PartialReceiptForm({
  tripId,
  line,
  onDone,
}: PartialReceiptFormProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const labels = useUnitLabels();
  const f = usePartialReceiptForm(tripId, line, onDone);
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
      <TextField
        label={t("receivedPacks", { packs: labels.packs(line.purchaseUnit) })}
        required
        inputMode="decimal"
        autoComplete="off"
        hint={
          line.packs
            ? t("receivedPacksHint", {
                bought: labels.packsCount(line.purchaseUnit, line.packs),
              })
            : undefined
        }
        error={errors.receivedPacks?.message}
        {...f.form.register("receivedPacks")}
      />
      <TextField
        label={t("receivedQuantity")}
        inputMode="decimal"
        autoComplete="off"
        suffix={labels.suffix(line.saleUnit)}
        hint={t("receivedQuantityHint")}
        error={errors.receivedQuantity?.message}
        {...f.form.register("receivedQuantity")}
      />
      <TextField
        label={t("note")}
        autoComplete="off"
        error={errors.note?.message}
        {...f.form.register("note")}
      />
      <Button type="submit" className="w-full" isLoading={f.isSubmitting} loadingText={t("saving")}>
        {t("save")}
      </Button>
    </form>
  );
}
