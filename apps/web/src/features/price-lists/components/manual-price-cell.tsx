"use client";

import type { ManualPriceRow } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useManualPriceForm } from "@/features/price-lists/hooks/use-manual-price-form";

export type ManualPriceCellProps = {
  row: ManualPriceRow;
  saleRate: string | null;
};

/** The price field of one product and its "Guardar" button. */
export function ManualPriceCell({ row, saleRate }: ManualPriceCellProps): React.JSX.Element {
  const f = useManualPriceForm(row, saleRate);
  const t = useTranslations("manualPrices");
  const fieldError = f.form.formState.errors.priceBs?.message ?? f.formError;

  return (
    <form
      noValidate
      className="flex items-start justify-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      <div className="w-36 text-left">
        <TextField
          label={t("priceLabel", { product: row.productName })}
          hideLabel
          inputMode="decimal"
          autoComplete="off"
          suffix="Bs"
          error={fieldError}
          disabled={saleRate === null}
          {...f.form.register("priceBs")}
        />
        {!fieldError && f.isSaved && <p className="text-sm text-primary-text">{t("saved")}</p>}
      </div>
      <Button
        type="submit"
        variant="secondary"
        disabled={!f.canSave}
        isLoading={f.isSubmitting}
        loadingText={t("saving")}
      >
        {t("save")}
      </Button>
    </form>
  );
}
