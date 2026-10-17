"use client";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";

const SHORTCUTS = [
  { href: "/purchases", title: "Compras", description: "Jornadas en Coche y costo de cada compra" },
  { href: "/rates", title: "Tasas del día", description: "BCV, Coche y tasa de venta" },
  { href: "/products", title: "Productos", description: "Catálogo, unidades, merma y margen" },
] as const;

/** Home entries to the owner screens, shown to owners only. */
export function OwnerShortcuts(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  if (activeMembership?.role !== "owner") return null;

  return (
    <nav aria-label="Accesos" className="space-y-3">
      {SHORTCUTS.map((s) => (
        <Card key={s.href} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{s.title}</p>
            <p className="text-sm text-muted">{s.description}</p>
          </div>
          <ButtonLink href={s.href} variant="secondary">
            Abrir
          </ButtonLink>
        </Card>
      ))}
    </nav>
  );
}
