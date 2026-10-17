import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button-link";
import { TripScreen } from "@/features/purchases/components/trip-screen";

export const metadata: Metadata = { title: "Jornada de compra · Tierra Andina" };

export default function TripPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">Jornada de compra</h1>
        <ButtonLink href="/purchases" variant="secondary" className="shrink-0 whitespace-nowrap">
          Jornadas
        </ButtonLink>
      </header>
      <TripScreen />
    </div>
  );
}
