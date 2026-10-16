"use client";

import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import {
  usePriceExample,
  type PriceExampleInput,
} from "@/features/products/hooks/use-price-example";
import { PURCHASE_UNIT_LABELS } from "@/features/products/helpers/unit-labels";

export type PriceExampleProps = {
  input: PriceExampleInput;
};

/** Live, unsaved example of cost and sale price with the current form values. */
export function PriceExample({ input }: PriceExampleProps): React.JSX.Element {
  const { sampleCost, setSampleCost, example } = usePriceExample(input);
  const what = PURCHASE_UNIT_LABELS[input.purchaseUnit].toLowerCase();

  return (
    <Card tone="muted" className="space-y-3">
      <h2 className="font-semibold">Ejemplo de precio</h2>
      <TextField
        label={`Si la ${what} te cuesta`}
        inputMode="decimal"
        autoComplete="off"
        suffix="$"
        placeholder="20"
        hint="Solo para probar; no se guarda."
        value={sampleCost}
        onChange={(event) => setSampleCost(event.target.value)}
      />
      <p aria-live="polite" className="text-sm">
        {example ?? (
          <span className="text-muted">Escribe un costo para ver el precio de venta.</span>
        )}
      </p>
    </Card>
  );
}
