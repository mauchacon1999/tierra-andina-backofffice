"use client";

import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import {
  usePriceExample,
  type PriceExampleInput,
} from "@/features/products/hooks/use-price-example";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";

export type PriceExampleProps = {
  input: PriceExampleInput;
};

/** Live, unsaved example of cost and sale price with the current form values. */
export function PriceExample({ input }: PriceExampleProps): React.JSX.Element {
  const { sampleCost, setSampleCost, example } = usePriceExample(input);
  const t = useTranslations("products.priceExample");
  const unit = useUnitLabels().purchase(input.purchaseUnit).toLowerCase();

  return (
    <Card tone="muted" className="space-y-3">
      <h2 className="font-semibold">{t("title")}</h2>
      <TextField
        label={t("sampleCost", { unit })}
        inputMode="decimal"
        autoComplete="off"
        suffix="$"
        placeholder={t("sampleCostPlaceholder")}
        hint={t("sampleCostHint")}
        value={sampleCost}
        onChange={(event) => setSampleCost(event.target.value)}
      />
      <p aria-live="polite" className="text-sm">
        {example ?? <span className="text-muted">{t("empty")}</span>}
      </p>
    </Card>
  );
}
