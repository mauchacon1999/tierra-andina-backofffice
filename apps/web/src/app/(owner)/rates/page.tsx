import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { DailyRatesForm } from "@/features/exchange-rates/components/daily-rates-form";
import { RatesHistory } from "@/features/exchange-rates/components/rates-history";

export const metadata: Metadata = { title: "Tasas del día · Tierra Andina" };

export default function RatesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">Tasas del día</h1>
        <p className="mt-1 text-muted">
          La tasa BCV y la de Coche se copian a la jornada de compra de ese día.
        </p>
      </header>
      <Card>
        <DailyRatesForm />
      </Card>
      <RatesHistory />
    </div>
  );
}
