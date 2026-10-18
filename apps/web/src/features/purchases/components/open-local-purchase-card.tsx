"use client";

import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useOpenLocalPurchase } from "@/features/purchases/hooks/use-local-purchases";
import { todayBusinessDate } from "@/utils/format-date";

/** "Nueva compra local": supplier, day and note; the day's BCV rate must be set. */
export function OpenLocalPurchaseCard(): React.JSX.Element {
  const f = useOpenLocalPurchase(todayBusinessDate());
  const t = useTranslations("localPurchases.open");
  const { errors } = f.form.formState;
  const supplierId = useWatch({ control: f.form.control, name: "supplierId" });

  return (
    <Card>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void f.onSubmit();
        }}
      >
        <h2 className="font-semibold">{t("title")}</h2>
        {f.formError && <Alert tone="error">{f.formError}</Alert>}
        {f.suppliers.length === 0 && (
          <p className="text-sm text-muted">
            {t("noSuppliers")}{" "}
            <ButtonLink href="/suppliers" variant="ghost" size="sm">
              {t("goToSuppliers")}
            </ButtonLink>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t("supplier")}
            required
            placeholder={t("supplierPlaceholder")}
            options={f.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            value={supplierId}
            error={errors.supplierId?.message}
            {...f.form.register("supplierId")}
          />
          <TextField
            label={t("date")}
            type="date"
            required
            error={errors.businessDate?.message}
            {...f.form.register("businessDate")}
          />
        </div>
        <TextField label={t("note")} autoComplete="off" {...f.form.register("note")} />
        {f.isBcvMissing && (
          <Alert tone="warning">
            <p>{t("missingBcv")}</p>
            <ButtonLink href="/rates" variant="secondary" size="sm" className="mt-2">
              {t("goToRates")}
            </ButtonLink>
          </Alert>
        )}
        <Button type="submit" isLoading={f.isSubmitting} loadingText={t("submitting")}>
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}
