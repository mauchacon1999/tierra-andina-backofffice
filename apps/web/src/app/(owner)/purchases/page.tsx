import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { OpenTripForm } from "@/features/purchases/components/open-trip-form";
import { TripList } from "@/features/purchases/components/trip-list";

export const metadata: Metadata = { title: "Compras · Tierra Andina" };

export default function PurchasesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-text">Compras</h1>
          <p className="mt-1 text-muted">Jornadas de compra en Coche</p>
        </div>
        <ButtonLink href="/rates" variant="secondary" className="shrink-0 whitespace-nowrap">
          Tasas del día
        </ButtonLink>
      </header>
      <Card>
        <OpenTripForm />
      </Card>
      <TripList />
    </div>
  );
}
