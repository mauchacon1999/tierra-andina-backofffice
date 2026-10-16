"use client";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";

/** Home entry to the catalog, shown to owners only. */
export function ProductsShortcut(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  if (activeMembership?.role !== "owner") return null;

  return (
    <Card className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">Productos</p>
        <p className="text-sm text-muted">Catálogo, unidades, merma y margen</p>
      </div>
      <ButtonLink href="/products" variant="secondary">
        Abrir
      </ButtonLink>
    </Card>
  );
}
