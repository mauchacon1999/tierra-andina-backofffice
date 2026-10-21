"use client";

import type { PurchaseLine, TripDetail } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { ProductQuickForm } from "@/features/products/components/product-quick-form";
import { LinePreview } from "@/features/purchases/components/line-preview";
import { LineProductField } from "@/features/purchases/components/line-product-field";
import { useLineForm, type PriceCurrency } from "@/features/purchases/hooks/use-line-form";
import { formatUsd } from "@/utils/format-number";

export type PurchaseLineFormProps = {
  trip: TripDetail;
  line?: PurchaseLine;
  onDone?: () => void;
  onCancel?: () => void;
  /** From the pending list: selects this product when `pickToken` changes. */
  pickedProductId?: string | null;
  pickToken?: number;
};

/** Add or edit one purchase of the trip, with its cost computed while typing. */
export function PurchaseLineForm({
  trip,
  line,
  onDone,
  onCancel,
  pickedProductId,
  pickToken,
}: PurchaseLineFormProps): React.JSX.Element {
  const f = useLineForm({
    trip,
    ...(line ? { line } : {}),
    ...(onDone ? { onDone } : {}),
    ...(pickedProductId ? { pickedProductId } : {}),
    ...(pickToken ? { pickToken } : {}),
  });
  const t = useTranslations("purchases.line");
  const tc = useTranslations("common");
  const { errors } = f.form.formState;
  const paymentOptions = (["paid", "credit"] as const).map((value) => ({
    value,
    label: t(`paymentStatus.${value}`),
  }));
  const priceOptions = (
    [
      ["USD", "dollars"],
      ["VES", "bolivars"],
    ] as const
  ).map(([value, key]) => ({ value, label: t(key) }));
  const quotedUsd = f.form.watch("quotedPriceUsd");
  const priceLabel = f.isPerKilo ? t("quotedPricePerKilo") : t("quotedPrice");
  const decimal = { inputMode: "decimal", autoComplete: "off" } as const;

  // The quick form is a <form> of its own: it replaces this one instead of nesting.
  if (f.isCreatingProduct) {
    return (
      <Card tone="muted" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{t("newProductTitle")}</h3>
          <Button variant="ghost" size="sm" onClick={() => f.setIsCreatingProduct(false)}>
            {t("backToLine")}
          </Button>
        </div>
        <ProductQuickForm onCreated={f.onProductCreated} />
      </Card>
    );
  }

  return (
    <form
      noValidate
      aria-label={f.isEdit ? t("editLabel") : t("addLabel")}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      {f.formError && <Alert tone="error">{f.formError}</Alert>}
      <LineProductField f={f} />
      <div className="grid grid-cols-2 gap-4">
        {f.showPacks && (
          <TextField
            label={f.packsLabel}
            {...decimal}
            hint={t("packsHint")}
            error={errors.packs?.message}
            {...f.form.register("packs")}
          />
        )}
        <TextField
          label={t("grossQuantity")}
          required
          {...decimal}
          suffix={f.quantitySuffix}
          error={errors.grossQuantity?.message}
          {...f.form.register("grossQuantity")}
        />
        <div className="col-span-2">
          <SegmentedControl
            label={t("priceCurrency")}
            name="priceCurrency"
            options={priceOptions}
            value={f.priceCurrency}
            onChange={(currency: PriceCurrency) => f.choosePriceCurrency(currency)}
          />
        </div>
        {f.priceCurrency === "USD" ? (
          <TextField
            key="price-usd"
            label={priceLabel}
            required
            {...decimal}
            suffix="$"
            hint={t(f.isLocal ? "quotedPriceHintLocal" : "quotedPriceHint", { rate: f.cocheRate })}
            error={errors.quotedPriceUsd?.message}
            {...f.form.register("quotedPriceUsd")}
          />
        ) : (
          <TextField
            key="price-bs"
            label={priceLabel}
            required
            {...decimal}
            suffix="Bs"
            hint={
              quotedUsd
                ? t(f.isLocal ? "quotedPriceBsHintLocal" : "quotedPriceBsHint", {
                    usd: formatUsd(quotedUsd),
                    rate: f.cocheRate,
                  })
                : t(f.isLocal ? "quotedPriceBsEmptyLocal" : "quotedPriceBsEmpty", {
                    rate: f.cocheRate,
                  })
            }
            error={errors.quotedPriceUsd?.message}
            value={f.priceBs}
            onChange={(event) => f.setPriceInBs(event.target.value)}
          />
        )}
        {f.lineTotalUsd && (
          <p className="col-span-2 text-sm text-muted" aria-live="polite">
            {t("perKiloTotal", { total: formatUsd(f.lineTotalUsd) })}
          </p>
        )}
        <TextField
          label={t("margin")}
          required
          {...decimal}
          suffix="%"
          error={errors.marginPercent?.message}
          {...f.form.register("marginPercent")}
        />
      </div>
      <SegmentedControl
        label={t("payment")}
        name="paymentStatus"
        options={paymentOptions}
        value={f.form.watch("paymentStatus")}
        onChange={(value) => f.form.setValue("paymentStatus", value, { shouldDirty: true })}
      />
      {f.showSupplier && (
        <SelectField
          label={t("supplier")}
          required
          placeholder={t("creditSupplierPlaceholder")}
          options={f.supplierOptions}
          hint={t("creditSupplierHint")}
          error={errors.supplierId?.message}
          {...f.form.register("supplierId")}
        />
      )}
      <LinePreview preview={f.preview} quantitySuffix={f.quantitySuffix} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          isLoading={f.isSubmitting}
          loadingText={tc("saving")}
        >
          {f.isEdit ? t("submitEdit") : t("submitAdd")}
        </Button>
        {onCancel && (
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onCancel}>
            {tc("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
